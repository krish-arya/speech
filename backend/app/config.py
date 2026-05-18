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
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    cors_origin_regex: str = r"https://.*\.vercel\.app"

    @property
    def allowed_cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
