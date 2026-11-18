
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


db_url = make_url(settings.DATABASE_URL).set(
    username=settings.USER_NAME,
    password=settings.PASSWORD
)

engine = create_engine(
    db_url,
    echo=settings.DEBUG
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


class Base(DeclarativeBase):
    pass


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()