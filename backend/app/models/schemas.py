from pydantic import BaseModel
from typing import Optional


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    content: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    search_decision: str  # "search" | "direct"


class VoiceQueryRequest(BaseModel):
    transcribed_text: str


class StreamEvent(BaseModel):
    type: str  # status | token | source | search_result | done | error
    data: str | dict | None = None


class OrchestrationResult(BaseModel):
    needed_search: bool
    answer: str
    sources: list[SearchResult] = []
