"""Configuration and workspace path management for StoryVault."""

from pathlib import Path
import os
from dotenv import dotenv_values

# Base project directories
BASE_DIR: Path = Path(__file__).resolve().parent.parent
SRC_DIR: Path = BASE_DIR / "src"
DATA_DIR: Path = BASE_DIR / "data"
PROMPTS_DIR: Path = BASE_DIR / "prompts"
OUTPUTS_DIR: Path = BASE_DIR / "outputs"
DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"
DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-2"


def load_environment() -> dict:
    """Read non-secret workspace configuration without loading backend secrets into Python."""
    env_file = BASE_DIR / ".env"
    file_values = dotenv_values(dotenv_path=env_file) if env_file.exists() else {}

    def setting(key: str, default: str) -> str:
        return os.getenv(key) or file_values.get(key) or default

    return {
        "ENVIRONMENT": setting("ENVIRONMENT", "development"),
        "LOG_LEVEL": setting("LOG_LEVEL", "INFO"),
        "GEMINI_MODEL": setting("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
        "GEMINI_EMBEDDING_MODEL": setting(
            "GEMINI_EMBEDDING_MODEL", DEFAULT_GEMINI_EMBEDDING_MODEL
        ),
        "STORYVAULT_API_URL": setting("STORYVAULT_API_URL", "http://localhost:5000"),
        "STORYVAULT_API_TOKEN": setting("STORYVAULT_API_TOKEN", ""),
        "VECTOR_DB_DIR": setting("VECTOR_DB_DIR", str(DATA_DIR / "chromadb")),
        "CHUNK_SIZE": int(setting("CHUNK_SIZE", "1000")),
        "CHUNK_OVERLAP": int(setting("CHUNK_OVERLAP", "200")),
        "TOKEN_ENCODING_NAME": setting("TOKEN_ENCODING_NAME", "cl100k_base"),
        "INPUT_PRICE_PER_1K": float(setting("INPUT_PRICE_PER_1K", "0.00015")),
        "OUTPUT_PRICE_PER_1K": float(setting("OUTPUT_PRICE_PER_1K", "0.00060")),
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
        if key.endswith("_API_KEY"):
            display_val = "(configured)" if value else "(not set)"
        else:
            display_val = value
        print(f"  - {key}: {display_val}")
    print("========================================")
