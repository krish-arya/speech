from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    tavily_api_key: str = ""
    serpapi_api_key: str = ""
    search_provider: str = "tavily"  # tavily | serpapi
    default_llm_model: str = "anthropic/claude-3.5-sonnet"
    fast_llm_model: str = "google/gemini-flash-1.5"
    tts_voice: str = "alloy"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
