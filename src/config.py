"""Configuration and workspace path management for StoryVault."""

from pathlib import Path
import os
from dotenv import load_dotenv

# Base project directories
BASE_DIR: Path = Path(__file__).resolve().parent.parent
SRC_DIR: Path = BASE_DIR / "src"
DATA_DIR: Path = BASE_DIR / "data"
PROMPTS_DIR: Path = BASE_DIR / "prompts"
OUTPUTS_DIR: Path = BASE_DIR / "outputs"


def load_environment() -> dict:
    """Loads environment variables from .env file if present and returns key configurations."""
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
    else:
        # Fallback to current environment without crashing
        load_dotenv()

    return {
        "ENVIRONMENT": os.getenv("ENVIRONMENT", "development"),
        "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
        "OPENAI_BASE_URL": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", ""),
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY", ""),
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", ""),
        "CHAT_MODEL": os.getenv("CHAT_MODEL", "gpt-4o-mini"),
        "LLM_MODEL_NAME": os.getenv("LLM_MODEL_NAME", "gpt-4o-mini"),
        "EMBEDDING_MODEL_NAME": os.getenv("EMBEDDING_MODEL_NAME", "text-embedding-3-small"),
        "VECTOR_DB_DIR": os.getenv("VECTOR_DB_DIR", str(DATA_DIR / "chromadb")),
        "CHUNK_SIZE": int(os.getenv("CHUNK_SIZE", "1000")),
        "CHUNK_OVERLAP": int(os.getenv("CHUNK_OVERLAP", "200")),
        "TOKEN_ENCODING_NAME": os.getenv("TOKEN_ENCODING_NAME", "cl100k_base"),
        "INPUT_PRICE_PER_1K": float(os.getenv("INPUT_PRICE_PER_1K", "0.00015")),
        "OUTPUT_PRICE_PER_1K": float(os.getenv("OUTPUT_PRICE_PER_1K", "0.00060")),
    }


def verify_workspace_structure() -> dict[str, bool]:
    """Verifies existence of required project directories."""
    required_dirs = {
        "data": DATA_DIR.is_dir(),
        "src": SRC_DIR.is_dir(),
        "prompts": PROMPTS_DIR.is_dir(),
        "outputs": OUTPUTS_DIR.is_dir(),
    }
    return required_dirs


if __name__ == "__main__":
    print("=== StoryVault Workspace Verification ===")
    print(f"Base Directory: {BASE_DIR}")
    print("Directory Status:")
    for name, exists in verify_workspace_structure().items():
        print(f"  - {name}/: {'[OK]' if exists else '[MISSING]'}")

    env_config = load_environment()
    print("Configuration Loaded:")
    for key, value in env_config.items():
        if "KEY" in key:
            display_val = f"{value[:3]}...{value[-3:]}" if value and len(str(value)) > 6 else ("***" if value else "(not set)")
        else:
            display_val = value
        print(f"  - {key}: {display_val}")
    print("========================================")
