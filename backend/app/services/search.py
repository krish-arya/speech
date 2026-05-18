import logging
from typing import Optional

import httpx

from app.config import get_settings
from app.models.schemas import SearchResult

logger = logging.getLogger(__name__)
settings = get_settings()


async def search_web(query: str, max_results: int = 5) -> list[SearchResult]:
    if settings.search_provider == "serpapi" and settings.serpapi_api_key:
        return await _serpapi_search(query, max_results)
    return await _tavily_search(query, max_results)


async def _tavily_search(query: str, max_results: int) -> list[SearchResult]:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.tavily_api_key,
                    "query": query,
                    "max_results": max_results,
                    "search_depth": "advanced",
                    "include_domains": [],
                    "exclude_domains": [],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return [
                SearchResult(
                    title=r.get("title", ""),
                    url=r.get("url", ""),
                    snippet=r.get("content", r.get("snippet", "")),
                    content=r.get("raw_content"),
                )
                for r in data.get("results", [])
            ]
    except Exception as e:
        logger.error(f"Tavily search error: {e}")
        return []


async def _serpapi_search(query: str, max_results: int) -> list[SearchResult]:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "api_key": settings.serpapi_api_key,
                    "q": query,
                    "num": max_results,
                    "engine": "google",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for r in data.get("organic_results", [])[:max_results]:
                results.append(
                    SearchResult(
                        title=r.get("title", ""),
                        url=r.get("link", ""),
                        snippet=r.get("snippet", ""),
                    )
                )
            return results
    except Exception as e:
        logger.error(f"SerpAPI search error: {e}")
        return []
