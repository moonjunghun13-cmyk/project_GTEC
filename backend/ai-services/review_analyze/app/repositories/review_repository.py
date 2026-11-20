from sqlalchemy import desc, or_
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.review import Review


class ReviewRepository:

    def __init__(self, db: Session):

        self.db = db

    def save(self, review: Review):

        self.db.add(review)

        self.db.commit()

        self.db.refresh(review)

        return review

    def find_all(self):

        return (
            self.db.query(Review)
            .order_by(desc(Review.created_at))
            .all()
        )

    def find_by_id(self, review_id: int):

        return (
            self.db.query(Review)
            .filter(Review.id == review_id)
            .first()
        )

    def get_statistics(self):

        total = self.db.query(Review).count()

        positive = (
            self.db.query(Review)
            .filter(Review.sentiment == "POSITIVE")
            .count()
        )

        negative = (
            self.db.query(Review)
            .filter(Review.sentiment == "NEGATIVE")
            .count()
        )

        return {
            "total": total,
            "positive": positive,
            "negative": negative
        }

    
    def find_ids_for_analysis(self, force=False):

        query = self.db.query(Review.id)

        # 자동 분석: 분석하지 않았거나 수정된 리뷰만
        if not force:
            query = query.filter(
                or_(
                    Review.sentiment.is_(None),
                    Review.sentiment_analyzed_at.is_(None),
                    Review.updated_at > Review.sentiment_analyzed_at
                )
            )

        return [
            review_id
            for (review_id,) in query.order_by(Review.id).all()
        ]

    # 전체 재분석 여부
    def analyze_batch(self, force=False):

        review_ids = self.repository.find_ids_for_analysis(
            force=force
        )

        success_count = 0
        failed_ids = []

        for review_id in review_ids:

            try:
                self.analyze_review(review_id)
                success_count += 1

            except Exception as e:
                self.repository.db.rollback()
                failed_ids.append(review_id)
                print(f"리뷰 {review_id} 분석 실패: {e}")

        return {
            "total": len(review_ids),
            "success": success_count,
            "failed": len(failed_ids),
            "failed_ids": failed_ids
        }
