# StoryVault Team Development & GitHub Workflow

This document establishes the collaboration standards, Git branching models, commit message conventions, issue tracking protocols, and Pull Request (PR) review processes for the **StoryVault** engineering team.

---

## 1. Branching Strategy

We follow a structured GitHub Flow branching model to maintain stability, prevent branch drift, and ensure production readiness.

### Core Principles
* **`main` Branch**: Contains stable, tested, and releasable code. Direct commits and pushes to `main` are strictly prohibited. All changes must arrive via reviewed and approved Pull Requests.
* **Short-Lived Branches**: All work must occur on dedicated, short-lived feature, fix, or documentation branches branched directly from the latest `main`.
* **Branch Cleanup**: To prevent repository clutter and stale branches, feature branches must be deleted immediately after their Pull Request is merged.

### Branch Naming Conventions

All branch names must be lowercase, use hyphens (`-`) for word separation, and follow these prefixes:

| Branch Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feature/<short-description>` | Implementing new features or pipeline components | `feature/document-ingestion-pipeline` |
| `fix/<short-description>` | Resolving bugs, defects, or runtime exceptions | `fix/chromadb-connection-timeout` |
| `docs/<short-description>` | Documentation updates, architecture guides, workflows | `docs/rag-architecture-guide` |
| `refactor/<short-description>` | Code restructuring without altering external behavior | `refactor/modularize-chunking-logic` |
| `test/<short-description>` | Adding or refactoring test suites and verification scripts | `test/add-embedding-unit-tests` |

---

## 2. Commit Message Conventions

We adhere to the [Conventional Commits specification](https://www.conventionalcommits.org/) to maintain an informative, bisectable, and automated changelog-ready Git history.

### Commit Format
```text
<type>: <description>

[optional body explaining context, rationale, and technical decisions]

[optional footer(s), e.g., references to issues]
```

### Supported Commit Types

* **`feat`**: A new feature, module, or user-facing functionality (e.g., `feat: implement recursive document chunker`).
* **`fix`**: A bug fix or patch (e.g., `fix: resolve character encoding error in utf-8 reader`).
* **`docs`**: Documentation changes only (e.g., `docs: document RAG architecture and ingestion flow`).
* **`refactor`**: Code changes that neither fix a bug nor add a feature (e.g., `refactor: simplify environment variable loader`).
* **`test`**: Adding missing tests, updating test suites, or fixing existing tests (e.g., `test: add integration test for vector indexing`).
* **`chore`**: Maintenance tasks, dependency updates, tooling, and repository configuration (e.g., `chore: update pydantic version constraints`).

### Why Meaningful Commits Matter
1. **Auditing & Troubleshooting**: Clear commit messages make `git log` and `git blame` invaluable when debugging regressions or diagnosing when a bug was introduced.
2. **Review Efficiency**: Reviewers can review commits individually to follow the developer's logical train of thought.
3. **Reproducibility**: Granular commits allow safe cherry-picking, bisecting (`git bisect`), and reverting isolated changes without undoing unrelated work.

---

## 3. Issue Tracking Protocol

Effective issue tracking ensures complete traceability from requirement to implementation.

### Standards for Issues
1. **Issue First**: Every non-trivial feature, task, or bug fix must begin with a logged GitHub Issue before writing code.
2. **Structure & Description**: Every issue must have:
   * A concise, descriptive title prefixed by conventional type (e.g., `feat: define document chunking strategy`).
   * A detailed description outlining the objective, technical requirements, input/output contracts, and acceptance criteria.
3. **Labels**: Every issue must be assigned at least one relevant label (e.g., `feature`, `documentation`, `data-pipeline`, `bug`).
4. **Assignee**: An active developer must be designated as the assignee responsible for delivering the issue.
5. **Issue Lifecycle**: Issues remain open while work is in progress and are automatically closed when their associated Pull Request merges into `main`.

---

## 4. Pull Request (PR) & Review Process

All code integrated into `main` must pass through the Pull Request lifecycle.

### Pull Request Requirements
* **Descriptive Title**: Matches conventional commit format summarizing the PR's intent.
* **Context & Summary**: Explain *what* was changed and *why* the architectural or implementation choices were made.
* **Issue Linking**: Explicitly link the corresponding issue in the PR description using GitHub closing keywords, e.g.:
  ```markdown
  Closes #2
  ```
  This ensures the issue is automatically closed when the PR merges.
* **Testing & Verification Evidence**: Provide reproducible verification steps and actual command outputs (e.g., `pytest` test suite execution, CLI verification outputs).
* **Review Approval**: Every PR requires at least one peer review approval before merging.
* **CI / Check Passing**: All automated checks and linting must pass before merge.

> [!IMPORTANT]
> **Module 3.11 Assignment Constraint**:
> For the Kalvium Module 3.11 assignment, **leave the Pull Request OPEN and UNMERGED** for grading and review. Do not merge the PR into `main`.

---

## 5. Repository Workflow & PR Checklist

Before submitting a Pull Request for review, every developer must verify:

### Local Development Checklist
- [ ] Working branch was created from the latest `main` (`git checkout -b <prefix>/<description>`).
- [ ] Virtual environment is active and all dependencies are installed (`pip install -r requirements.txt`).
- [ ] No secrets, real `.env` files, or local cache directories are staged (`git status`).
- [ ] Code formatting and conventional commits were applied for every commit.
- [ ] Automated test suite runs cleanly (`pytest -v`).
- [ ] Workspace setup verification command passes (`python -m src.config`).

### Pull Request Submission Checklist
- [ ] PR title follows `<type>: <description>` naming format.
- [ ] PR description includes context, list of changes, and test verification output.
- [ ] At least one relevant issue is linked (`Closes #<issue-number>`).
- [ ] Peer reviewer(s) and assignees are designated.
- [ ] Feature branch push target is verified against the designated personal repository remote.
