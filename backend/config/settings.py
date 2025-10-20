"""Application settings and configuration."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"

    # MongoDB Configuration
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "qbank"

    # File Storage Paths
    upload_dir: str = "./uploads"
    extracted_text_dir: str = "./extracted_text"
    generated_questions_dir: str = "./generated_questions"

    # LLM Configuration
    llm_provider: str = "mlx"
    model_name: str = "mlx-community/Meta-Llama-3-8B-Instruct-4bit"
    model_cache_dir: str = "./models"

    # MLX Specific
    mlx_max_tokens: int = 2048
    mlx_temperature: float = 0.7

    # OpenAI (optional)
    openai_api_key: str = ""

    # Ollama (optional)
    ollama_base_url: str = "http://localhost:11434"

    # Text Extraction
    max_chunk_size: int = 2000
    chunk_overlap: int = 200

    # Question Generation
    default_questions_per_chunk: int = 5
    min_difficulty: str = "easy"
    max_difficulty: str = "hard"

    # CORS Settings
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Vector DB
    chroma_persist_dir: str = "./chroma_db"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()
