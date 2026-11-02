"""Tests for StoryVault workspace setup and environment configuration."""

from pathlib import Path
from unittest.mock import patch
import pytest
from src.config import (
    BASE_DIR,
    DATA_DIR,
    SRC_DIR,
    PROMPTS_DIR,
    OUTPUTS_DIR,
    verify_workspace_structure,
    load_environment,
)


def test_required_directories_exist():
    """Verify that all required project directories are created."""
    structure = verify_workspace_structure()
    assert structure["data"] is True, "data/ directory should exist"
    assert structure["src"] is True, "src/ directory should exist"
    assert structure["prompts"] is True, "prompts/ directory should exist"
    assert structure["outputs"] is True, "outputs/ directory should exist"


def test_required_configuration_files_exist():
    """Verify core workspace configuration files exist."""
    assert (BASE_DIR / ".gitignore").is_file(), ".gitignore file must exist"
    assert (BASE_DIR / ".env.example").is_file(), ".env.example file must exist"
    assert (BASE_DIR / "requirements.txt").is_file(), "requirements.txt must exist"
    assert (BASE_DIR / "README.md").is_file(), "README.md must exist"


def test_env_example_contains_expected_keys():
    """Verify .env.example defines necessary placeholders without exposing real secrets."""
    content = (BASE_DIR / ".env.example").read_text(encoding="utf-8")
    expected_placeholders = [
        "ENVIRONMENT",
        "LOG_LEVEL",
        "GEMINI_API_KEY",
        "GEMINI_MODEL",
        "GEMINI_EMBEDDING_MODEL",
        "STORYVAULT_API_URL",
        "STORYVAULT_API_TOKEN",
        "VECTOR_DB_DIR",
        "CHUNK_SIZE",
        "CHUNK_OVERLAP",
    ]
    for key in expected_placeholders:
        assert key in content, f"{key} placeholder must be present in .env.example"


def test_environment_loader_defaults():
    """Verify config.load_environment loads sensible defaults."""
    with patch.dict("os.environ", {}, clear=True), patch("src.config.dotenv_values", return_value={}):
        env = load_environment()
    assert env["ENVIRONMENT"] == "development"
    assert env["LOG_LEVEL"] == "INFO"
    assert env["GEMINI_MODEL"] == "gemini-3.8-flash"
    assert env["GEMINI_EMBEDDING_MODEL"] == "gemini-embedding-2"
    assert "GEMINI_API_KEY" not in env
    assert "chromadb" in env["VECTOR_DB_DIR"]
    assert env["CHUNK_SIZE"] == 1000
    assert env["CHUNK_OVERLAP"] == 200
