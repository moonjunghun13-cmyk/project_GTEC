from datetime import datetime, timezone
import os
from pathlib import Path
import tempfile

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from app.repositories.recommendation_repository import RecommendationRepository
from app.services.recommendation_service import MODEL_PATH, load_recommendation_model


CATEGORIES = [
    "GPU", "CASE", "CPU", "KEYBOARD", "MOUSE", "SSD",
    "SPEAKER", "HDD", "POWER", "RAM", "MONITOR", "MAINBOARD",
]


class RecommendationTrainingService:
    def __init__(self, db: Session):
        self.repository = RecommendationRepository(db)

    def retrain(self, days: int = 365) -> dict:
        if not 30 <= days <= 1095:
            raise ValueError("학습 기간은 30~1095일 사이여야 합니다.")

        rows = self.repository.find_training_purchases(days=days)
        if not rows:
            raise ValueError("해당 기간에 유효한 구매 기록이 없습니다. 기존 모델을 유지합니다.")

        df = pd.DataFrame(rows)
        df["category"] = df["category"].astype(str).str.strip().str.upper()
        df["quantity"] = pd.to_numeric(df["quantity"], errors="raise")

        unknown = set(df["category"]) - set(CATEGORIES)
        if unknown:
            raise ValueError(f"알 수 없는 카테고리: {sorted(unknown)}. 기존 모델을 유지합니다.")
        if df["member_id"].isna().any() or df["quantity"].isna().any() or (df["quantity"] <= 0).any():
            raise ValueError("회원 ID나 구매 수량에 잘못된 값이 있습니다. 기존 모델을 유지합니다.")

        purchase_count = len(df)
        member_count = df["member_id"].nunique()
        present_categories = set(df["category"])
        missing = set(CATEGORIES) - present_categories
        # These are project safeguards, not statistical guarantees of model quality.
        if purchase_count < 100 or member_count < 30 or missing:
            raise ValueError(
                "학습 데이터 부족: "
                f"구매행 {purchase_count}/100, 회원 {member_count}/30, "
                f"누락 카테고리 {sorted(missing)}. 기존 모델을 유지합니다."
            )

        df["purchased"] = 1
        user_category_matrix = df.pivot_table(
            index="member_id", columns="category", values="purchased",
            aggfunc="max", fill_value=0,
        ).reindex(columns=CATEGORIES, fill_value=0)

        similarity = cosine_similarity(user_category_matrix.T)
        np.fill_diagonal(similarity, 0.0)
        category_similarity_df = pd.DataFrame(
            similarity, index=CATEGORIES, columns=CATEGORIES,
        )
        popular_categories = (
            df.groupby("category")["quantity"]
            .sum()
            .reindex(CATEGORIES, fill_value=0)
            .sort_values(ascending=False)
        )

        trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        model = {
            "model_type": "category_cf_v1",
            "category_similarity_df": category_similarity_df,
            "popular_categories": popular_categories,
            "trained_at": trained_at,
            "training_days": days,
            "purchase_rows": purchase_count,
            "member_count": int(member_count),
        }
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        fd, temp_path = tempfile.mkstemp(prefix=".category_cf_", suffix=".pkl", dir=MODEL_PATH.parent)
        os.close(fd)
        try:
            joblib.dump(model, temp_path)
            check = joblib.load(temp_path)
            if check["category_similarity_df"].shape != (12, 12):
                raise RuntimeError("새 모델 검증 실패. 기존 모델을 유지합니다.")
            os.replace(temp_path, MODEL_PATH)  # Swap only after a successful build.
        finally:
            Path(temp_path).unlink(missing_ok=True)

        load_recommendation_model.cache_clear()  # Single-process server only.
        return {
            "status": "UPDATED",
            "trained_at": trained_at,
            "training_days": days,
            "purchase_rows": purchase_count,
            "member_count": int(member_count),
            "categories": len(present_categories),
        }
