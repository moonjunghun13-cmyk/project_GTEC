
from sqlalchemy.orm import Session

from app.repositories.review_repository import (
    ReviewRepository
)

from app.services.sentiment_service import (
    get_sentiment_analyzer
)

from datetime import datetime
from decimal import Decimal


class ReviewService:

    def __init__(self, db: Session):

        self.repository = ReviewRepository(db)

    def analyze_review(self, review_id: int):

        # 1. DB에서 기존 리뷰 조회
        review = self.repository.find_by_id(review_id)

        if review is None:
            raise ValueError("존재하지 않는 리뷰입니다.")

        # 2. 기존 리뷰 내용 분석
        result = get_sentiment_analyzer().predict(review.content)

        # 3. Sentiment Enum 값으로 변환
        sentiment_map= {
            "긍정": "POSITIVE",
            "부정": "NEGATIVE"
        }
        
        # 4. 분석 결과를 기존 리뷰에 반영
        review.sentiment = sentiment_map[result["sentiment"]]

        review.sentiment_score = Decimal(
            str(result["sentiment_score"])
        ).quantize(Decimal("0.0001"))

        review.sentiment_analyzed_at = datetime.now()

        # 5. 데이터베이스 저장
        saved_review = self.repository.save(review)

        # 6. 결과 반환
        return {
            "id": saved_review.id,
            "content": saved_review.content,
            "sentiment": saved_review.sentiment,
            "sentiment_score": float(
                saved_review.sentiment_score
            ),
            "sentiment_analyzed_at": saved_review.sentiment_analyzed_at,
            "created_at": saved_review.created_at,
            "updated_at": saved_review.updated_at
        }

    def get_history(self):

        return self.repository.find_all()

    def get_statistics(self):

        return self.repository.get_statistics()

    
    def analyze_batch(self, force=False):

        # 1. 분석 대상 리뷰 ID 조회
        review_ids = self.repository.find_ids_for_analysis(
            force=force
        )

        success_count = 0
        failed_ids = []

        # 2. 리뷰를 하나씩 분석
        for review_id in review_ids:

            try:
                self.analyze_review(review_id)
                success_count += 1

            except Exception as e:
                self.repository.db.rollback()
                failed_ids.append(review_id)
                print(f"리뷰 {review_id} 분석 실패: {e}")

        # 3. 분석 결과 반환
        return {
            "total": len(review_ids),
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids
        }
