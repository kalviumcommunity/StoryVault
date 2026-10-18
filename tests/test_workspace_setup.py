"""Tests for StoryVault workspace setup and environment configuration."""

from pathlib import Path
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
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GEMINI_API_KEY",
        "LLM_MODEL_NAME",
        "EMBEDDING_MODEL_NAME",
        "VECTOR_DB_DIR",
        "CHUNK_SIZE",
        "CHUNK_OVERLAP",
    ]
    for key in expected_placeholders:
        assert key in content, f"{key} placeholder must be present in .env.example"


def test_environment_loader_defaults():
    """Verify config.load_environment loads sensible defaults."""
    env = load_environment()
    assert env["ENVIRONMENT"] == "development"
    assert env["LOG_LEVEL"] == "INFO"
    assert env["LLM_MODEL_NAME"] == "gpt-4o-mini"
    assert env["EMBEDDING_MODEL_NAME"] == "text-embedding-3-small"
    assert "chromadb" in env["VECTOR_DB_DIR"]
    assert env["CHUNK_SIZE"] == 1000
    assert env["CHUNK_OVERLAP"] == 200
