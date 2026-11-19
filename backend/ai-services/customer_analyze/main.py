"""GTEC 고객 분석 FastAPI.
실행 위치: customer_analyze 폴더
실행 명령: python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
"""
from fastapi import FastAPI
from app.controllers.customer_controller import router as customer_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="GTEC 고객 분석 AI (실습용)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8090",
        "http://127.0.0.1:8090",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(customer_router)
