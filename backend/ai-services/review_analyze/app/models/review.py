
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Integer,
    String,
    Text,
    Float,
    Numeric,
    DateTime
)

from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Review(Base):

    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        index=True
    )

    product_id: Mapped[int] = mapped_column(
            BigInteger,
            index=True
        )
    
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    sentiment: Mapped[str] = mapped_column(
        String(20),
        nullable=True
    )

    sentiment_score: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4),
        nullable=True
    )

    sentiment_analyzed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )