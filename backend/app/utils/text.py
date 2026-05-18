import re


def truncate_context(sources: dict[str, str], max_total: int = 8000) -> str:
    """Build a context string from sources, keeping within token budget."""
    parts = []
    total = 0

    for url, content in sources.items():
        if total >= max_total:
            break
        remaining = max_total - total
        snippet = content[:remaining]
        parts.append(f"Source: {url}\n{snippet}\n")
        total += len(snippet)

    return "\n---\n".join(parts)


def format_sources_for_display(sources: list) -> list[dict]:
    return [
        {
            "title": s.title if hasattr(s, "title") else s.get("title", ""),
            "url": s.url if hasattr(s, "url") else s.get("url", ""),
            "snippet": (s.snippet if hasattr(s, "snippet") else s.get("snippet", ""))[:200],
        }
        for s in sources
    ]


def is_question(text: str) -> bool:
    """Quick heuristic to determine if input is a question needing search."""
    text = text.strip().lower()
    question_words = ("what", "who", "where", "when", "why", "how", "is", "are", "do", "does", "can", "could", "should", "would", "will")
    search_triggers = ("latest", "news", "today", "current", "recent", "weather", "stock", "price", "vs")
    return any(text.startswith(w) for w in question_words) or any(t in text for t in search_triggers)
