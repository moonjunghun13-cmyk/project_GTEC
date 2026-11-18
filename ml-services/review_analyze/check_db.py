
from sqlalchemy import text
from app.core.database import engine


with engine.connect() as conn:

    # 1. 현재 연결된 데이터베이스 확인
    result = conn.execute(
        text("SELECT current_database(), current_schema()")
    )

    print("연결된 DB와 스키마:", result.one())

    # 2. reviews 테이블 존재 여부 확인
    table = conn.execute(
        text("SELECT to_regclass('public.reviews')")
    ).scalar_one_or_none()

    print("reviews 테이블:", table)

    # 3. 실제 reviews 테이블 컬럼 확인
    if table is not None:

        result = conn.execute(
            text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'reviews'
                ORDER BY ordinal_position
            """)
        )

        for column in result:
            print(column)

        # 4. 저장된 리뷰 개수 확인
        count = conn.execute(
            text("SELECT COUNT(*) FROM public.reviews")
        ).scalar_one()

        print("현재 리뷰 개수:", count)
