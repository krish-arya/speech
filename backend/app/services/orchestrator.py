import asyncio
import logging
from typing import AsyncIterator

from app.agents.search_agent import decide_and_search
from app.config import get_settings
from app.models.schemas import SearchResult
from app.providers.openrouter import OpenRouterProvider
from app.services.scraper import scrape_urls, chunk_text
from app.utils.text import format_sources_for_display, truncate_context

logger = logging.getLogger(__name__)
settings = get_settings()

RESPONSE_SYSTEM_PROMPT = """You are a helpful, concise voice assistant. You answer questions naturally as if speaking to someone.

Rules:
- Be direct and conversational
- Keep answers concise (2-4 paragraphs unless asked for detail)
- When citing sources, mention them naturally ("According to...")
- If you don't know something, say so clearly
- No markdown formatting - this will be spoken aloud
- Use natural speech patterns"""

GROUNDED_RESPONSE_PROMPT = """You are a helpful, concise voice assistant. Answer the user's question using the provided search results.

Rules:
- Use the search results to ground your answer
- Cite sources naturally when referencing specific facts
- Be direct and conversational
- Keep answers concise (2-4 paragraphs unless asked for detail)
- If the search results don't fully answer the question, acknowledge that
- No markdown - this will be spoken aloud

Search results:

{context}"""


async def orchestrate(transcribed_text: str) -> AsyncIterator[dict]:
    """Main orchestration pipeline. Yields streaming events."""
    yield {"type": "status", "data": "Analyzing..."}
    await asyncio.sleep(0.1)

    needs_search, search_results = await decide_and_search(transcribed_text)

    sources_display = format_sources_for_display(search_results)

    if needs_search and search_results:
        yield {"type": "status", "data": "Searching the web..."}
        yield {"type": "search_results", "data": sources_display}
        await asyncio.sleep(0.1)

        yield {"type": "status", "data": "Reading sources..."}
        urls = [r.url for r in search_results if r.url]
        scraped = {}
        if urls:
            scraped = await scrape_urls(urls)
        await asyncio.sleep(0.1)

        yield {"type": "status", "data": "Generating answer..."}
        context = truncate_context(scraped)
        system_prompt = GROUNDED_RESPONSE_PROMPT.format(context=context)
    else:
        yield {"type": "status", "data": "Thinking..."}
        system_prompt = RESPONSE_SYSTEM_PROMPT
        sources_display = []

    provider = OpenRouterProvider()
    try:
        full_response = ""
        async for token in provider.stream_chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcribed_text},
            ],
            model=settings.default_llm_model,
        ):
            full_response += token
            yield {"type": "token", "data": token}

        yield {"type": "done", "data": {"text": full_response, "sources": sources_display}}
    finally:
        await provider.close()
