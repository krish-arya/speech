import asyncio
import json
import logging
from io import BytesIO

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from app.providers.speech import transcribe_audio
from app.providers.tts import stream_tts
from app.services.orchestrator import orchestrate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["voice"])


@router.post("/query")
async def voice_query(audio: UploadFile = File(...)):
    audio_data = await audio.read()
    mime = audio.content_type or "audio/webm"

    try:
        transcribed = await transcribe_audio(audio_data, mime)
    except Exception:
        logger.exception("Transcription failed")
        return StreamingResponse(
            _error_stream("Could not transcribe audio. Check backend logs and API keys."),
            media_type="text/event-stream",
            headers=_stream_headers(),
        )

    if not transcribed.strip():
        return StreamingResponse(
            _error_stream("Could not transcribe audio"),
            media_type="text/event-stream",
            headers=_stream_headers(),
        )

    return StreamingResponse(
        _stream_response(transcribed),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@router.post("/query-text")
async def text_query(text: str = Form(...)):
    return StreamingResponse(
        _stream_response(text),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@router.get("/tts")
async def tts_stream(text: str):
    return StreamingResponse(
        stream_tts(text),
        media_type="audio/opus",
        headers={"Cache-Control": "no-cache"},
    )


async def _stream_response(transcribed: str):
    yield f"data: {json.dumps({'type': 'transcript', 'data': transcribed})}\n\n"
    await asyncio.sleep(0.05)

    try:
        async for event in orchestrate(transcribed):
            yield f"data: {json.dumps(event)}\n\n"
    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"


async def _error_stream(message: str):
    yield f"data: {json.dumps({'type': 'error', 'data': message})}\n\n"


def _stream_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
