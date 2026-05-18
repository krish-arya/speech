import base64
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def transcribe_audio(audio_data: bytes, mime_type: str = "audio/webm") -> str:
    """Transcribe audio using OpenRouter's STT endpoint."""
    audio_format = _audio_format_from_mime(mime_type)
    body = {
        "model": settings.stt_model,
        "input_audio": {
            "data": base64.b64encode(audio_data).decode("utf-8"),
            "format": audio_format,
        },
    }
    if settings.stt_language:
        body["language"] = settings.stt_language

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            resp = await client.post(
                f"{settings.openrouter_base_url}/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            if resp.status_code == 200:
                return resp.json().get("text", "")
            if resp.status_code == 404:
                logger.warning("STT endpoint not available, using fallback")
                return await _transcribe_via_llm(audio_data, mime_type)
            if resp.status_code >= 400:
                logger.error(
                    "OpenRouter transcription error: %s %s",
                    resp.status_code,
                    resp.text,
                )
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


def _audio_format_from_mime(mime_type: str) -> str:
    media_type = mime_type.split(";", 1)[0].lower().strip()
    if media_type in {"audio/mpeg", "audio/mp3"}:
        return "mp3"
    if media_type in {"audio/mp4", "audio/x-m4a"}:
        return "m4a"
    if media_type in {"audio/wave", "audio/x-wav"}:
        return "wav"
    if "/" in media_type:
        return media_type.rsplit("/", 1)[1]
    return "webm"
