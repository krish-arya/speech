import json
import logging

from app.config import get_settings
from app.models.schemas import SearchResult
from app.providers.openrouter import OpenRouterProvider
from app.services.search import search_web
from app.utils.text import is_question, truncate_context

logger = logging.getLogger(__name__)
settings = get_settings()

SEARCH_DECISION_PROMPT = """You are a search decision engine. Given a user query, decide if web search is needed.

Return ONLY a JSON object:
{"needs_search": true/false, "search_query": "optimized search query or empty string", "reasoning": "one short sentence"}

Rules:
- Needs search if: asking about real-time info, facts you're unsure about, current events, news, specific data, comparisons, prices, or anything after your knowledge cutoff
- Does NOT need search if: simple conversation, opinions, creative writing, coding help (unless about new libraries), math, logic, or generic knowledge"""


async def decide_and_search(query: str) -> tuple[bool, list[SearchResult]]:
    provider = OpenRouterProvider()
    try:
        decision = await provider.chat(
            messages=[{"role": "user", "content": f"{SEARCH_DECISION_PROMPT}\n\nUser query: {query}"}],
            model=settings.fast_llm_model,
            temperature=0,
            max_tokens=256,
        )
        result = json.loads(decision.strip().removeprefix("```json").removesuffix("```").strip())
        needs_search = result.get("needs_search", False)
        search_query = result.get("search_query", query)

        if not needs_search:
            needs_search = is_question(query)

        if needs_search:
            results = await search_web(search_query, max_results=4)
            return True, results
        return False, []
    except Exception as e:
        logger.warning(f"Search decision failed: {e}, using heuristic fallback")
        if is_question(query):
            results = await search_web(query, max_results=3)
            return True, results
        return False, []
    finally:
        await provider.close()
