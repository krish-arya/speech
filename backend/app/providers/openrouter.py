import json
import logging
from typing import AsyncIterator

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MODEL_ALIASES = {
    "google/gemini-flash-2.5": "google/gemini-2.5-flash",
    "google/gemini-flash-1.5": "google/gemini-2.5-flash-lite",
    "google/gemini-1.5-flash": "google/gemini-2.5-flash-lite",
}


class OpenRouterProvider:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.openrouter_base_url,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Voice Search Assistant",
            },
            timeout=httpx.Timeout(60.0, connect=10.0),
        )

    async def stream_chat(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        model = _normalize_model(model or settings.default_llm_model)
        body = {
            "model": model,
            "messages": messages,
            "stream": True,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            async with self.client.stream("POST", "/chat/completions", json=body) as resp:
                if resp.status_code >= 400:
                    body_text = _decode_response_body(await resp.aread())
                    logger.error(
                        "OpenRouter stream HTTP error for model %s: %s %s",
                        model,
                        resp.status_code,
                        body_text,
                    )
                    resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except httpx.HTTPStatusError as e:
            raise
        except Exception as e:
            logger.error(f"OpenRouter stream error: {e}")
            raise

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        model = _normalize_model(model or settings.default_llm_model)
        body = {
            "model": model,
            "messages": messages,
            "stream": False,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            resp = await self.client.post("/chat/completions", json=body)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            logger.error(
                "OpenRouter chat HTTP error for model %s: %s %s",
                model,
                e.response.status_code,
                e.response.text,
            )
            raise
        except Exception as e:
            logger.error(f"OpenRouter chat error: {e}")
            raise

    async def close(self):
        await self.client.aclose()


def _normalize_model(model: str) -> str:
    return MODEL_ALIASES.get(model.strip(), model.strip())


def _decode_response_body(body: bytes) -> str:
    return body.decode("utf-8", errors="replace")
