# StoryVault

StoryVault is an AI-powered story knowledge exploration, archiving, and retrieval-augmented generation (RAG) platform.

This workspace configuration was initialized under **Kalvium Module 3.10 — Development Environment & Project Workspace Setup**, establishing the project layout, dependency management, environment isolation, security baselines, and verification tooling.

---

## 1. Prerequisites

Before setting up the project, ensure you have the following installed on your system:

- **Python**: Version 3.10, 3.11, or 3.12 (Recommended: `Python 3.12.x`)
- **Git**: Version 2.x or higher
- **PowerShell** (Windows) or **Bash** (macOS/Linux)
- **pip**: Latest version recommended (`python -m pip install --upgrade pip`)

---

## 2. Directory Structure

```text
StoryVault/
├── .github/
│   └── pull_request_template.md # GitHub PR template with review checklist
├── .env.example          # Template for environment variables (tracked)
├── .gitignore             # Git exclusion rules for venv, secrets, outputs, caches
├── README.md              # Project documentation and setup guide
├── WORKFLOW.md            # Team branching, commit, and PR review conventions
├── requirements.txt       # Version-constrained dependencies
├── data/                  # Local source documents and raw datasets
│   └── .gitkeep
├── prompts/               # Reusable prompt templates and chains
│   └── .gitkeep
├── outputs/               # Generated evaluation results, logs, and artifacts
│   └── .gitkeep
├── src/                   # Core application source code
│   ├── __init__.py
│   ├── config.py          # Workspace path definitions & environment loader
│   └── llm_client.py      # OpenAI-compatible API client & completion caller
└── tests/                 # Automated unit and integration tests
    ├── test_workspace_setup.py
    └── test_llm_client.py
```

### Directory Roles
- **`data/`**: Stores raw text files, story documents, or domain files for indexing. Ignored by git (except `.gitkeep`) to prevent leaking private documents.
- **`prompts/`**: Stores version-controlled system prompts, few-shot templates, and prompt engineering components.
- **`outputs/`**: Holds generated test outputs, evaluation metrics, and local runs. Ignored by git (except `.gitkeep`) to prevent polluting history.
- **`src/`**: Houses all application source modules, future RAG pipelines, data ingestors, and API clients.
- **`tests/`**: Contains automated tests to validate application components, configuration, and environment integrity.

---

## 3. Environment Setup & Installation

### Step 1: Create a Local Virtual Environment

Create an isolated virtual environment named `.venv` in the root directory:

```bash
# Windows (PowerShell or Command Prompt)
python -m venv .venv

# macOS / Linux
python3 -m venv .venv
```

### Step 2: Activate the Virtual Environment

```powershell
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.\.venv\Scripts\activate.bat

# macOS / Linux (Bash / Zsh)
source .venv/bin/activate
```

> **Note for PowerShell execution policy**: If script execution is restricted, run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Step 3: Install Dependencies

Install the project dependencies using `pip`:

```bash
pip install -r requirements.txt
```

---

## 4. Environment Variables Configuration

Copy `.env.example` to create your local `.env` file:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

### Environment Variable Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime environment mode | `development` |
| `LOG_LEVEL` | Application logging verbosity | `INFO` |
| `OPENAI_API_KEY` | OpenAI API access credential | `your_openai_api_key_here` |
| `ANTHROPIC_API_KEY` | Anthropic API access credential | `your_anthropic_api_key_here` |
| `GEMINI_API_KEY` | Google Gemini API access credential | `your_gemini_api_key_here` |
| `LLM_MODEL_NAME` | Default language model identifier | `gpt-4o-mini` |
| `EMBEDDING_MODEL_NAME` | Default embedding model identifier | `text-embedding-3-small` |
| `VECTOR_DB_DIR` | Path to persistent vector database | `./data/chromadb` |
| `CHUNK_SIZE` | Target chunk size in characters/tokens | `1000` |
| `CHUNK_OVERLAP` | Overlap between adjacent chunks | `200` |

> **Security Warning**: Never commit `.env` or real API keys to Git. The `.gitignore` is pre-configured to exclude `.env` files.

---

## 5. Setup Verification & Testing

### Reproducible Setup Verification Command

Run the workspace configuration module directly to verify directory paths and environment loading:

```bash
python -m src.config
```

Expected output:
```text
=== StoryVault Workspace Verification ===
Base Directory: ...\StoryVault
Directory Status:
  - data/: [OK]
  - src/: [OK]
  - prompts/: [OK]
  - outputs/: [OK]
Configuration Loaded:
  - ENVIRONMENT: development
  - LOG_LEVEL: INFO
  - OPENAI_API_KEY: (not set)
  - ANTHROPIC_API_KEY: (not set)
  - GEMINI_API_KEY: (not set)
  - LLM_MODEL_NAME: gpt-4o-mini
  - EMBEDDING_MODEL_NAME: text-embedding-3-small
  - VECTOR_DB_DIR: ...\data\chromadb
  - CHUNK_SIZE: 1000
  - CHUNK_OVERLAP: 200
========================================
```

### LLM Client Completion Call Verification (Module 3.12)

Run the LLM client module to test sending your first chat completion request, inspect request/response payloads, and verify error handling:

```bash
python -m src.llm_client
```

### Running Automated Tests

Run the test suite using `pytest`:

```bash
pytest -v
```

All workspace verification and LLM client tests should pass (9 tests total).

---

## 6. Team Development & Collaboration Workflow

StoryVault enforces strict GitHub collaboration standards initialized under **Kalvium Module 3.11 — GitHub Repository & Team Workflow Setup**:

- **Branching Model**: All work occurs on short-lived branches (`feature/*`, `fix/*`, `docs/*`) created from `main`. Direct commits to `main` are disallowed.
- **Commit Standards**: Every commit must follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **Issue Traceability**: All changes link to an existing GitHub Issue using `Closes #<issue-number>`.
- **Review & Merging**: Pull Requests require testing evidence and peer approval prior to merge.

For complete branching policies, commit examples, and PR review checklists, refer to [WORKFLOW.md](WORKFLOW.md).
