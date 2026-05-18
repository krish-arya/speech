import logging
from io import BytesIO

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def transcribe_audio(audio_data: bytes, mime_type: str = "audio/webm") -> str:
    """Transcribe audio using OpenRouter's Whisper-compatible endpoint.

    Falls back to sending audio to the LLM with a transcription prompt
    if no dedicated STT endpoint is configured.
    """
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            resp = await client.post(
                f"{settings.openrouter_base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                files={"file": ("audio.webm", BytesIO(audio_data), mime_type)},
                data={"model": "openai/whisper-large-v3"},
            )
            if resp.status_code == 200:
                return resp.json().get("text", "")
            if resp.status_code == 404:
                logger.warning("STT endpoint not available, using fallback")
                return await _transcribe_via_llm(audio_data, mime_type)
            resp.raise_for_status()
            return resp.json().get("text", "")
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return await _transcribe_via_llm(audio_data, mime_type)


async def _transcribe_via_llm(audio_data: bytes, mime_type: str) -> str:
    """Fallback: send audio as base64 to a vision-capable model for transcription."""
    import base64

    audio_b64 = base64.b64encode(audio_data).decode("utf-8")
    from app.providers.openrouter import OpenRouterProvider

    provider = OpenRouterProvider()
    try:
        result = await provider.chat(
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Transcribe this audio recording accurately. Return ONLY the transcribed text, nothing else.",
                    },
                    {
                        "type": "input_audio",
                        "input_audio": {"data": audio_b64, "format": "webm"},
                    },
                ],
            }],
            model=settings.fast_llm_model,
            temperature=0,
            max_tokens=1024,
        )
        return result.strip()
    finally:
        await provider.close()
