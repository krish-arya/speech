import logging
from typing import AsyncIterator

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def stream_tts(text: str) -> AsyncIterator[bytes]:
    body = {
        "model": settings.tts_model,
        "input": text,
        "voice": settings.tts_voice,
        "response_format": "mp3",
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
                if resp.status_code >= 400:
                    body_text = (await resp.aread()).decode("utf-8", errors="replace")
                    logger.error(
                        "OpenRouter TTS error for model %s: %s %s",
                        settings.tts_model,
                        resp.status_code,
                        body_text,
                    )
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes():
                    yield chunk
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise
