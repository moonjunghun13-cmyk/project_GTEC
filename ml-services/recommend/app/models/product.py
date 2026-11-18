from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Product(Base):

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String
    )

    category: Mapped[str] = mapped_column(
        String
    )

    status: Mapped[str] = mapped_column(
        String
    )

    stock: Mapped[int] = mapped_column(
        BigInteger
    )
