from collections import Counter
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from sqlalchemy.orm import Session

from app.repositories.recommendation_repository import RecommendationRepository


MODEL_PATH = (
    Path(__file__).resolve().parents[2]
    / "models"
    / "category_cf_model_pc12.pkl"
)


@lru_cache(maxsize=1)
def load_recommendation_model():
    model = joblib.load(MODEL_PATH)
    if model.get("model_type") != "category_cf_v1":
        raise ValueError("카테고리 기반 추천 모델 파일이 아닙니다.")
    return model


class RecommendationService:
    def __init__(self, db: Session):
        self.repository = RecommendationRepository(db)
        
    def recommend(self, member_id: int, top_n: int = 5):
        model = load_recommendation_model()

        similarity = model["category_similarity_df"]
        popular = model["popular_categories"]

        # 회원이 실제로 구매한 카테고리
        purchased_categories = {
            str(category).strip().upper()
            for category in self.repository.find_member_categories(member_id)
        }

        unknown = purchased_categories - set(similarity.index)
        if unknown:
            raise ValueError(
                f"모델에 없는 카테고리: {sorted(unknown)}"
            )

        # 기존 회원의 개인화 추천 점수
        if purchased_categories:
            scores = similarity[list(purchased_categories)].sum(axis=1)
            scores = scores[scores > 0]
            recommend_type = "PERSONALIZED"
        else:
            scores = pd.Series(dtype=float)
            recommend_type = "POPULAR"

        # 신규 회원 또는 추천 점수가 없는 경우
        if scores.empty:
            scores = popular.astype(float)
            recommend_type = "POPULAR"

        scores = scores / scores.max()

        # 실제 DB 판매량 집계
        purchases = self.repository.find_purchase_history()
        sales_count = Counter()

        for row in purchases:
            sales_count[row["product_id"]] += row["quantity"]

        # 실제 판매 가능한 상품만 후보로 사용
        candidates = []

        for product in self.repository.find_available_products():
            category = str(product["category"]).strip().upper()

            if category not in scores.index:
                continue

            candidates.append({
                "product_id": product["product_id"],
                "name": product["name"],
                "category": category,
                "recommend_score": round(float(scores[category]), 4),
                "sales_count": sales_count[product["product_id"]]
            })

        # 카테고리 추천 점수 → 실제 판매량 순으로 정렬
        candidates.sort(
            key=lambda item: (
                -item["recommend_score"],
                -item["sales_count"],
                item["product_id"]
            )
        )

        # Preserve the existing ranking while selecting at most one product per category.
        recommendations = []
        category_counts = Counter()
        for candidate in candidates:
            category = candidate["category"]
            if category_counts[category] >= 1:
                continue
            recommendations.append(candidate)
            category_counts[category] += 1
            if len(recommendations) >= top_n:
                break

        return {
            "member_id": member_id,
            "recommend_type": recommend_type,
            "purchased_categories": sorted(purchased_categories),
            "recommendations": recommendations
        }
