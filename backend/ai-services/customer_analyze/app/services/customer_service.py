"""Service: 지난달까지 구매 기록으로 이번 달 재구매를 예측합니다.

입력값 2개 + 로지스틱 회귀 모델을 사용합니다.
합성 데이터 성능은 실제 쇼핑몰 고객 성능을 보장하지 않습니다.
"""

import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd

from app.repositories.customer_repository import (
    find_paid_orders_before,
    count_customer_members,
)

# 학습할 때 사용한 입력 순서와 반드시 같아야 합니다.
FEATURES = ["recency_days", "purchase_count"]
ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "customer_model_active.pkl"
SETTINGS_PATH = ROOT / "customer_model_settings.json"


@lru_cache(maxsize=1)
def load_model():
    """직접 만든 모델과 판정 기준을 서버에서 한 번만 읽습니다."""
    if not MODEL_PATH.is_file() or not SETTINGS_PATH.is_file():
        raise FileNotFoundError(
            "활성 모델(.pkl)과 설정(.json) 파일이 customer_analyze 폴더에 모두 있어야 합니다."
        )

    settings = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    if settings.get("model_file") != MODEL_PATH.name:
        raise ValueError("설정 파일에 기록된 모델 이름이 실제 파일과 다릅니다.")
    if settings.get("features") != FEATURES:
        raise ValueError("설정 파일의 입력 컬럼 또는 컬럼 순서가 다릅니다.")

    threshold = float(settings["threshold"])
    if not 0.0 < threshold < 1.0:
        raise ValueError("재구매 판정 기준이 0과 1 사이가 아닙니다.")

    # joblib은 본인이 생성한 신뢰할 수 있는 모델 파일만 로드하세요.
    model = joblib.load(MODEL_PATH)
    if list(model.feature_names_in_) != FEATURES:
        raise ValueError("실제 모델의 입력 컬럼 또는 컬럼 순서가 다릅니다.")
    if list(model.classes_) != [0, 1]:
        raise ValueError("모델의 정답 클래스가 0/1 형태가 아닙니다.")
    return model, threshold


def predict_repurchase():
    """완료된 지난달까지의 주문으로 이번 달 구매 여부를 예측합니다."""
    # 현재 월 주문은 예측에 넣지 않습니다(미래 정보 혼입 방지).
    cutoff = pd.Timestamp(datetime.now().date().replace(day=1))
    base_month = str((cutoff - pd.Timedelta(days=1)).to_period("M"))
    prediction_month = str(cutoff.to_period("M"))

    orders = find_paid_orders_before(cutoff.to_pydatetime())
    if orders.empty:
        return {
            "base_month": base_month,
            "prediction_month": prediction_month,
            "customer_count": 0,
            "decision_threshold": None,
            "predictions": [],
            "note": "기준월 이전의 분석 대상 구매 기록이 없습니다.",
        }

    orders["ordered_at"] = pd.to_datetime(orders["ordered_at"], errors="coerce")
    orders["item_amount"] = pd.to_numeric(orders["item_amount"], errors="coerce")
    if orders[["ordered_at", "item_amount", "order_id", "member_id"]].isna().any().any():
        raise ValueError("주문 데이터에 누락된 주문 날짜·금액·식별자가 있습니다.")

    group = orders.groupby("member_id")
    customers = pd.DataFrame({
        "purchase_count": group["order_id"].nunique(),
        "total_spent": group["item_amount"].sum(),
        "last_purchase": group["ordered_at"].max(),
    })
    customers["recency_days"] = (cutoff - customers["last_purchase"]).dt.days
    if (customers[FEATURES] < 0).any().any():
        raise ValueError("최근 구매 경과일 또는 주문 횟수가 음수입니다.")

    model, threshold = load_model()
    # 기존의 model.predict()와 다르게 '저장된 판정 기준'을 적용합니다.
    probabilities = model.predict_proba(customers[FEATURES])[:, 1]

    rows = []
    for (member_id, customer), probability in zip(customers.iterrows(), probabilities):
        predicted_buy = bool(float(probability) >= threshold)
        rows.append({
            "member_id": int(member_id),
            "recency_days": int(customer["recency_days"]),
            "purchase_count": int(customer["purchase_count"]),
            # 금액은 관리자 참고용으로 유지하지만 모델 입력에는 사용하지 않습니다.
            "total_spent": int(customer["total_spent"]),
            "predicted_buy": predicted_buy,
            "model_probability": round(float(probability), 4),
            "attention_candidate": not predicted_buy,
        })

    return {
        "base_month": base_month,
        "prediction_month": prediction_month,
        "customer_count": len(rows),
        "decision_threshold": threshold,
        "predictions": rows,
        "note": (
            "가상 구매 패턴으로 학습한 로지스틱 회귀(입력 2개) 실험 모델입니다. "
            "model_probability는 실고객의 검증된 구매 확률이 아닌 모델 점수입니다. "
            "attention_candidate는 이탈 확정이 아닌 검토 후보입니다. "
            "이번 달 주문은 예측 입력에 포함하지 않았습니다."
        ),
    }


# --- 관리자 고객 통계 ---

def _statistics_orders():
    """현재까지의 정상 구매 주문을 읽어 공통으로 사용합니다."""
    orders = find_paid_orders_before(datetime.now())
    if orders.empty:
        return orders

    orders = orders.copy()
    orders["ordered_at"] = pd.to_datetime(orders["ordered_at"], errors="coerce")
    for col in ("item_amount", "total_amount"):
        orders[col] = pd.to_numeric(orders[col], errors="coerce")

    needed = ["order_id", "member_id", "ordered_at", "item_amount", "total_amount"]
    if orders[needed].isna().any().any():
        raise ValueError("구매 주문에 날짜, 금액 또는 식별자가 누락되어 있습니다.")
    return orders


def get_customer_summary():
    """일반 회원 수, 구매 고객 수, 전체 주문/매출 현황을 반환합니다."""
    orders = _statistics_orders()
    member_count = count_customer_members()
    buyer_count = int(orders["member_id"].nunique()) if not orders.empty else 0
    order_count = int(orders["order_id"].nunique()) if not orders.empty else 0
    total_sales = int(orders["total_amount"].sum()) if not orders.empty else 0

    return {
        "as_of": datetime.now().strftime("%Y-%m-%d"),
        "registered_user_count": member_count,
        "purchasing_customer_count": buyer_count,
        "non_purchasing_customer_count": max(member_count - buyer_count, 0),
        "order_count": order_count,
        "total_order_amount": total_sales,
        "average_order_amount": round(total_sales / order_count) if order_count else 0,
        "average_spent_per_buyer": round(total_sales / buyer_count) if buyer_count else 0,
        "note": (
            "현재 USER 회원과 정상 결제 상태 주문을 집계했습니다. "
            "total_order_amount는 주문 최종 금액(배송비/할인 반영) 합계입니다. "
            "부분 환불 금액은 아직 차감하지 않았습니다."
        ),
    }


def get_repurchase_summary():
    """1회 구매 고객과 2회 이상 구매 고객의 비율을 계산합니다."""
    orders = _statistics_orders()
    if orders.empty:
        buyer_count, once, repeat, order_count = 0, 0, 0, 0
    else:
        counts = orders.groupby("member_id")["order_id"].nunique()
        buyer_count = len(counts)
        once = int((counts == 1).sum())
        repeat = int((counts >= 2).sum())
        order_count = int(orders["order_id"].nunique())

    return {
        "as_of": datetime.now().strftime("%Y-%m-%d"),
        "purchasing_customer_count": buyer_count,
        "one_time_customer_count": once,
        "repeat_customer_count": repeat,
        "repurchase_rate_percent": round(repeat / buyer_count * 100, 2) if buyer_count else None,
        "average_orders_per_buyer": round(order_count / buyer_count, 2) if buyer_count else None,
        "definition": "재구매율 = 2회 이상 정상 구매한 고객 수 / 전체 구매 고객 수 × 100",
        "note": "현재 유효 주문 기준입니다. 1회 구매자는 이탈 고객으로 확정하지 않습니다.",
    }


def get_monthly_retention():
    """직전 달 구매 고객 중 해당 월에도 구매한 고객의 비율입니다."""
    orders = _statistics_orders()
    this_month = pd.Period(datetime.now().strftime("%Y-%m"), freq="M")
    if orders.empty:
        return {
            "as_of": datetime.now().strftime("%Y-%m-%d"),
            "months": [],
            "definition": "유지율 = 지난달과 이번 달 모두 구매한 고객 수 / 지난달 구매 고객 수 × 100",
            "note": "분석할 유효 주문이 없습니다.",
        }

    orders["month"] = orders["ordered_at"].dt.to_period("M")
    customer_sets = {
        month: set(group["member_id"].tolist())
        for month, group in orders.groupby("month")
    }
    first_month = orders["month"].min()
    result = []
    # 최근 월뿐 아니라 주문 기록에 있는 첫 월부터 현재 월까지(빈 달 포함).
    for month in pd.period_range(first_month + 1, this_month, freq="M"):
        previous = customer_sets.get(month - 1, set())
        current = customer_sets.get(month, set())
        retained = len(previous & current)
        result.append({
            "month": str(month),
            "previous_month_customers": len(previous),
            "current_month_customers": len(current),
            "retained_customers": retained,
            "retention_rate_percent": round(retained / len(previous) * 100, 2) if previous else None,
            "is_partial_month": month == this_month,
        })

    return {
        "as_of": datetime.now().strftime("%Y-%m-%d"),
        "months": result,
        "definition": "유지율 = 지난달과 이번 달 모두 구매한 고객 수 / 지난달 구매 고객 수 × 100",
        "note": (
            "현재 진행 중인 달은 아직 월말이 아니므로 유지율이 낮아 보일 수 있습니다. "
            "결제일이 없으면 주문 생성일을 사용하며, 과거 주문 상태 변경/부분 환불 이력은 소급 복원하지 않습니다."
        ),
    }

# --- DB 기반 재학습 준비도 및 수동 후보 학습 ---
# 현재 서비스 모델은 바꾸지 않으며 새 학습 후보만 별도 저장합니다.

def _make_db_training_rows():
    """완료된 달만 정답으로 사용합니다. 진행 중인 이번 달은 포함하지 않습니다."""
    import pandas as pd

    now = datetime.now()
    this_month = pd.Period(now.strftime("%Y-%m"), freq="M")
    latest_base_month = this_month - 2  # 다음 달 구매 여부까지 확정된 기준월
    orders = find_paid_orders_before(now)
    columns = ["member_id", "base_month", "recency_days", "purchase_count", "bought_next_month"]
    if orders.empty:
        return pd.DataFrame(columns=columns)

    orders = orders.copy()
    orders["ordered_at"] = pd.to_datetime(orders["ordered_at"], errors="coerce")
    if orders[["ordered_at", "member_id", "order_id"]].isna().any().any():
        raise ValueError("주문 날짜 또는 회원/주문 ID가 비어 있습니다.")

    first_month = orders["ordered_at"].min().to_period("M")
    result = []
    if first_month > latest_base_month:
        return pd.DataFrame(columns=columns)

    for base in pd.period_range(first_month, latest_base_month, freq="M"):
        next_start = (base + 1).start_time
        next_end = (base + 2).start_time
        past = orders[orders["ordered_at"] < next_start]
        if past.empty:
            continue

        grouped = past.groupby("member_id")
        customers = pd.DataFrame({
            "purchase_count": grouped["order_id"].nunique(),
            "last_purchase": grouped["ordered_at"].max(),
        })
        customers["recency_days"] = (next_start - customers["last_purchase"]).dt.days
        buyers_next_month = set(orders.loc[
            (orders["ordered_at"] >= next_start) & (orders["ordered_at"] < next_end),
            "member_id",
        ])
        customers["bought_next_month"] = customers.index.isin(buyers_next_month).astype(int)
        customers["base_month"] = str(base)
        result.append(customers.reset_index()[columns])

    if not result:
        return pd.DataFrame(columns=columns)
    return pd.concat(result, ignore_index=True)


def _training_readiness(rows):
    """과소한 DB 데이터로 운영 모델을 덮어쓰지 않도록 안전 조건을 확인합니다."""
    if rows.empty:
        return {
            "eligible": False,
            "customer_count": 0, "training_case_count": 0, "month_count": 0,
            "latest_base_month": None, "positive_cases": 0, "negative_cases": 0,
            "reasons": ["다음 달 구매 정답이 확정된 월별 학습 사례가 없습니다."],
        }

    last_month = rows["base_month"].max()
    train = rows[rows["base_month"] < last_month]
    valid = rows[rows["base_month"] == last_month]
    pos = int(rows["bought_next_month"].sum())
    neg = len(rows) - pos
    conditions = [
        (rows["base_month"].nunique() >= 6, "완료된 기준월이 6개월 미만입니다."),
        (len(rows) >= 500, "학습 사례가 500건 미만입니다."),
        (rows["member_id"].nunique() >= 100, "고유 구매 고객이 100명 미만입니다."),
        (int(train["bought_next_month"].sum()) >= 30, "과거 학습 자료의 재구매 정답이 30건 미만입니다."),
        (int((train["bought_next_month"] == 0).sum()) >= 30, "과거 학습 자료의 미구매 정답이 30건 미만입니다."),
        (int(valid["bought_next_month"].sum()) >= 10, "마지막 검증월의 재구매 정답이 10건 미만입니다."),
        (int((valid["bought_next_month"] == 0).sum()) >= 10, "마지막 검증월의 미구매 정답이 10건 미만입니다."),
    ]
    reasons = [message for passed, message in conditions if not passed]
    return {
        "eligible": not reasons,
        "customer_count": int(rows["member_id"].nunique()),
        "training_case_count": len(rows),
        "month_count": int(rows["base_month"].nunique()),
        "latest_base_month": last_month,
        "positive_cases": pos, "negative_cases": neg,
        "reasons": reasons,
    }


def get_model_training_status():
    """서버가 실제 DB 자료로 모델을 다시 학습할 준비가 되었는지 확인합니다."""
    status = _training_readiness(_make_db_training_rows())
    status["active_model_changed"] = False
    # Windows 작업 스케줄러가 마지막으로 실행한 결과를 함께 보여줍니다.
    last_run_path = ROOT / "customer_weekly_refresh_last.json"
    if last_run_path.is_file():
        try:
            status["weekly_refresh_last"] = json.loads(
                last_run_path.read_text(encoding="utf-8")
            )
        except (OSError, ValueError):
            status["weekly_refresh_last"] = {"status": "unreadable_record"}
    else:
        status["weekly_refresh_last"] = None
    status["note"] = (
        "완료된 다음 달 구매 이력만 정답에 사용합니다. "
        "수치는 쇼핑몰 DB 데이터이며 실제 고객 예측 성능을 보증하지 않습니다. "
        "조건은 안전을 위한 최소 기준이지 충분한 성능 검증 기준이 아닙니다."
    )
    return status


def refresh_model_candidate():
    """실DB로 후보 재학습. 충분한 자료와 검증 개선이 없으면 저장하지 않습니다."""
    import json
    import os
    import tempfile
    from pathlib import Path
    import joblib
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import f1_score, roc_auc_score
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import FunctionTransformer, StandardScaler

    rows = _make_db_training_rows()
    readiness = _training_readiness(rows)
    if not readiness["eligible"]:
        return {
            "status": "skipped_insufficient_data",
            "active_model_changed": False,
            "new_candidate_saved": False,
            "readiness": readiness,
            "note": "학습 조건을 충족하지 않아 기존 모델을 유지합니다.",
        }

    feature_names = ["recency_days", "purchase_count"]
    last_month = readiness["latest_base_month"]
    train = rows[rows["base_month"] < last_month]
    valid = rows[rows["base_month"] == last_month]

    # 현재 모델과 신규 모델을 동일한 실제 DB 검증월에서 비교합니다.
    current, threshold = load_model()
    existing_prob = current.predict_proba(valid[feature_names])[:, 1]
    existing_auc = float(roc_auc_score(valid["bought_next_month"], existing_prob))
    existing_f1 = float(f1_score(valid["bought_next_month"], existing_prob >= threshold))

    def new_model():
        return Pipeline([
            ("log", FunctionTransformer(np.log1p)),
            ("scale", StandardScaler()),
            ("classifier", LogisticRegression(solver="liblinear", max_iter=1000, random_state=42)),
        ])

    model = new_model()
    model.fit(train[feature_names], train["bought_next_month"])
    candidate_prob = model.predict_proba(valid[feature_names])[:, 1]
    candidate_auc = float(roc_auc_score(valid["bought_next_month"], candidate_prob))
    candidate_f1 = float(f1_score(valid["bought_next_month"], candidate_prob >= threshold))
    comparison = {
        "validation_base_month": last_month,
        "current_model_auc": round(existing_auc, 4),
        "candidate_model_auc": round(candidate_auc, 4),
        "current_model_f1": round(existing_f1, 4),
        "candidate_model_f1": round(candidate_f1, 4),
        "decision_threshold": threshold,
    }

    # 1개월의 검증 성능으로 자동 운영 교체하지 않습니다.
    if candidate_auc < existing_auc + 0.01 or candidate_f1 < existing_f1 - 0.01:
        return {
            "status": "skipped_no_improvement", "active_model_changed": False,
            "new_candidate_saved": False, "readiness": readiness,
            "comparison": comparison,
            "note": "새 후보가 같은 검증월에서 기존 모델보다 충분히 개선되지 않았습니다.",
        }

    # 합격하더라도 '별도 후보'만 저장합니다. 실제 API 모델 자동 교체는 하지 않습니다.
    model = new_model()
    model.fit(rows[feature_names], rows["bought_next_month"])
    root = Path(__file__).resolve().parents[2]
    candidate_path = root / "customer_pattern_real_candidate.pkl"
    settings_path = root / "customer_pattern_real_settings.json"
    settings = {
        "model_file": candidate_path.name, "features": feature_names,
        "threshold": threshold,
        "training_base_months": f"{rows['base_month'].min()}~{last_month}",
        "data_type": "PostgreSQL 정상 주문(결제/배송 상태)",
        "validation": comparison,
        "status": "실DB 학습 후보 / 운영 자동 교체 금지",
    }
    # 저장 중 오류가 발생해도 기존 FastAPI 모델 파일은 영향을 받지 않습니다.
    with tempfile.NamedTemporaryFile(dir=root, suffix=".pkl.tmp", delete=False) as handle:
        temp_model = Path(handle.name)
    with tempfile.NamedTemporaryFile(dir=root, suffix=".json.tmp", delete=False) as handle:
        temp_settings = Path(handle.name)
    try:
        joblib.dump(model, temp_model)
        temp_settings.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(temp_model, candidate_path)
        os.replace(temp_settings, settings_path)
    finally:
        temp_model.unlink(missing_ok=True)
        temp_settings.unlink(missing_ok=True)

    return {
        "status": "candidate_saved", "active_model_changed": False,
        "new_candidate_saved": True,
        "candidate_model_file": candidate_path.name,
        "readiness": readiness, "comparison": comparison,
        "note": "새 후보만 저장했습니다. 운영 모델 교체는 별도의 검토가 필요합니다.",
    }


# --- Windows 작업 스케줄러의 주간 점검 실행 ---
# FastAPI 서버가 켜져 있지 않아도 PostgreSQL이 사용 가능하면 직접 점검할 수 있습니다.
# 이미 존재하는 재학습 함수(refresh_model_candidate)를 그대로 재사용합니다.

def run_weekly_refresh():
    """안전 조건을 점검하고 마지막 실행 결과 JSON 1개만 갱신합니다."""
    import os
    import tempfile

    ran_at = datetime.now().astimezone().isoformat(timespec="seconds")
    try:
        result = refresh_model_candidate()
        record = {
            "ran_at": ran_at,
            "status": result["status"],
            "active_model_changed": result["active_model_changed"],
            "new_candidate_saved": result["new_candidate_saved"],
            "readiness": result.get("readiness"),
            "comparison": result.get("comparison"),
            "note": result.get("note", ""),
        }
        exit_code = 0
    except Exception as exc:
        # 비밀번호나 SQL 등 상세 예외 메시지를 상태 기록에 저장하지 않습니다.
        record = {
            "ran_at": ran_at,
            "status": "error",
            "active_model_changed": False,
            "new_candidate_saved": False,
            "error_type": type(exc).__name__,
            "note": "자동 점검 중 오류가 발생했습니다. DB 연결과 실행 환경을 확인하세요.",
        }
        exit_code = 1

    destination = ROOT / "customer_weekly_refresh_last.json"
    # 쓰는 도중 중단되더라도 기존 상태 파일이 깨지지 않도록 임시 파일로 저장합니다.
    with tempfile.NamedTemporaryFile(dir=ROOT, suffix=".json.tmp", delete=False) as handle:
        temporary_path = Path(handle.name)
    try:
        temporary_path.write_text(
            json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        os.replace(temporary_path, destination)
    finally:
        temporary_path.unlink(missing_ok=True)

    print(json.dumps(record, ensure_ascii=False, indent=2))
    return exit_code


if __name__ == "__main__":
    import sys
    if sys.argv[1:] != ["--weekly-refresh"]:
        print("사용법: python -m app.services.customer_service --weekly-refresh")
        raise SystemExit(2)
    raise SystemExit(run_weekly_refresh())
