import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes.voice import router as voice_router

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

fastapi_app = FastAPI(title="Voice Search Assistant", version="1.0.0")

fastapi_app.include_router(voice_router)


@fastapi_app.get("/health")
async def health():
    return {"status": "ok"}


app = CORSMiddleware(
    app=fastapi_app,
    allow_origins=settings.allowed_cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
