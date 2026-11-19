from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product

class RecommendationRepository:
    def __init__(self, db: Session):
        self.db = db

    # 1. 회원별 구매 기록 조회
    def find_purchase_history(self):
        rows = (
            self.db.query(
                Order.member_id,
                OrderItem.product_id,
                OrderItem.quantity
            )
            .join(
                OrderItem,
                Order.id == OrderItem.order_id
            )
            .filter(
                Order.status.in_([
                    "PAID",
                    "PREPARING",
                    "SHIPPED",
                    "DELIVERED",
                    "COMPLETED"
                ])
            )
            .all()
        )
        return [
            {
                "member_id": row.member_id,
                "product_id": row.product_id,
                "quantity": row.quantity
            }
            for row in rows
        ]

    # 2. 현재 판매 가능한 상품 조회
    def find_available_products(self):
        rows = (
            self.db.query(
                Product.id,
                Product.name,
                Product.category
            )
            .filter(
                Product.status == "ACTIVE",
                Product.stock > 0
            )
            .all()
        )

        return [
            {
                "product_id": row.id,
                "name": row.name,
                "category": row.category
            }
            for row in rows
        ]

    
    # 특정 회원이 구매한 상품의 카테고리 조회
    def find_member_categories(self, member_id: int):

        rows = (
            self.db.query(Product.category)
            .join(
                OrderItem,
                Product.id == OrderItem.product_id
            )
            .join(
                Order,
                OrderItem.order_id == Order.id
            )
            .filter(
                Order.member_id == member_id,
                Order.status.in_([
                    "PAID",
                    "PREPARING",
                    "SHIPPED",
                    "DELIVERED",
                    "COMPLETED"
                ])
            )
            .distinct()
            .all()
        )

        return [row.category for row in rows]

    
    # 최근 구매 기록을 모델 갱신용으로 조회
    def find_training_purchases(self, days: int = 365):
        cutoff = datetime.now() - timedelta(days=days)

        rows = (
            self.db.query(
                Order.member_id,
                Product.category,
                OrderItem.quantity
            )
            .select_from(Order)
            .join(
                OrderItem,
                Order.id == OrderItem.order_id
            )
            .join(
                Product,
                Product.id == OrderItem.product_id
            )
            .filter(
                Order.status.in_([
                    "PAID",
                    "PREPARING",
                    "SHIPPED",
                    "DELIVERED",
                    "COMPLETED"
                ]),
                Order.created_at >= cutoff,
                OrderItem.quantity > 0
            )
            .all()
        )

        return [
            {
                "member_id": row.member_id,
                "category": row.category,
                "quantity": row.quantity
            }
            for row in rows
        ]
