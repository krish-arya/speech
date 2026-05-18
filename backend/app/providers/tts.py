import logging
from typing import AsyncIterator

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def stream_tts(text: str) -> AsyncIterator[bytes]:
    body = {
        "model": "openai/tts-1",
        "input": text,
        "voice": settings.tts_voice,
        "response_format": "opus",
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            async with client.stream(
                "POST",
                f"{settings.openrouter_base_url}/audio/speech",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            ) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes():
                    yield chunk
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise
