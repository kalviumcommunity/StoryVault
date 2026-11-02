# StoryVault — AI-Powered Media Archive Search & Context Retrieval Platform

[![Platform](https://img.shields.io/badge/Platform-StoryVault-0284c7.svg)](http://localhost:3000)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20TypeScript-1C2541.svg)](http://localhost:5000/api/docs)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2018%20%7C%20Prisma%20ORM-336791.svg)](http://localhost:5000/api/health)
[![Tests](https://img.shields.io/badge/Tests-17%2F17%20Passing%20(Vitest)-059669.svg)](file:///backend/src/tests/api.test.ts)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Strictly%20Grounded%20RAG-d97706.svg)](http://localhost:3000/assistant)

StoryVault is a production-grade, AI-powered media archive intelligence platform engineered for newsrooms, investigative reporters, and academic historians. It enables journalists to search decades of historical records using natural language, discover verified entity connections across past stories, and generate structured investigative research briefs with transparent, passage-level source citations.

Unlike generic conversational chatbots that hallucinate facts and fabricate quotes, StoryVault adheres to **strict newsroom evidentiary standards**: every factual claim is corroborated by preserved archive records, uncertainty and knowledge gaps are explicitly flagged, and citations link directly to verifiable source passages.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Frontend [Client Tier — React + Vite + TypeScript]
        UI[Editorial Workspace UI]
        Router[React Router v6]
        TanStack[TanStack Query v5]
        Charts[Recharts Visualization]
        Evidence[Citation Evidence Drawer]
    end

    subgraph Backend [API & Logic Tier — Node.js + Express + TypeScript]
        REST[REST API Endpoints]
        RBAC[Role-Based Authorization Middleware]
        Zod[Zod Request Validation]
        Audit[Audit Logging Engine]
        RAG[Evidence Grounded RAG Pipeline]
        Citation[Attribution & Citation Engine]
        Ingest[Ingestion Engine & SHA-256 Deduplication]
        Gemini[Google Gemini API]
    end

    subgraph Storage [Data Tier — PostgreSQL 18 + Prisma ORM]
        DB[(PostgreSQL 18 Database)]
        FTS[Full-Text Search Engine: GIN Index + tsvector]
        VectorStore[Semantic Vectors: Cosine Similarity Matrix]
    end

    UI --> Router
    Router --> TanStack
    TanStack --> REST
    REST --> RBAC
    RBAC --> Zod
    Zod --> RAG
    RAG --> Citation
    RAG --> Gemini
    RAG --> Ingest
    Ingest --> Gemini
    Citation --> DB
    Ingest --> DB
    DB --> FTS
    DB --> VectorStore
    Evidence -.-> UI
```

---

## 2. Core User Roles & Security Clearance (RBAC)

StoryVault enforces strict role-based access control (RBAC) on the backend and frontend:

| Role | Security Clearance | Authorized Actions |
| :--- | :--- | :--- |
| **Journalist** | `PUBLIC`, `INTERNAL` | Search archives, ask AI assistant, generate & edit research briefs, save documents to collections, bookmark queries. |
| **Editor** | `PUBLIC`, `INTERNAL`, `RESTRICTED` | Review and approve briefs, inspect citations, collaborate on collections, audit provenance across teams. |
| **Archivist** | `PUBLIC`, `INTERNAL`, `RESTRICTED` | Ingest new files (.txt, .md, .csv, .pdf), validate metadata, inspect chunking, manage duplicate records, retry failed jobs. |
| **Administrator** | `PUBLIC`, `INTERNAL`, `RESTRICTED`, `CLASSIFIED` | Full system governance, inspect immutable audit logs, modify user clearance roles, inspect PostgreSQL health & latency. |

> Public archive browsing does not require an account. Authenticated roles remain necessary for private workspace data and administrative operations; role changes are restricted to administrators.

---

## 3. Key Implemented Modules & Required Pages

### A. Landing Page (`/`)
- Newsroom editorial hero explaining the media archive challenge.
- Evidence-grounded research integrity guarantees.
- Interactive live search bar with direct archive routing.
- Direct access to public archive search, the research assistant, and timeline without signing in.

### B. Public Access & Protected Workspace
- Public visitors can browse and search public records, open document details, use the research assistant, view the timeline, and read published briefs and public collections without credentials.
- Legacy `/login` and `/register` URLs redirect to the landing page; no login or registration UI is required.
- Existing JWT authentication and role checks remain in place for private workspace data, ingestion, and administrative actions.

### C. Research Dashboard (`/dashboard`)
- Metrics computed directly from actual stored PostgreSQL records:
  - Total Indexed Documents
  - Searchable Vector Passages
  - Seeded Authors & Correspondents
  - Active Press Publications
  - Saved Research Briefs
  - Investigative Collections
- **Document Type Distribution** (Recharts interactive Pie Chart).
- **Archive Access Clearance Coverage** (Recharts Bar Chart).
- Recently preserved documents feed with source provenance.

### D. Universal Archive Search (`/search`)
- Prominent natural language search bar with real-time typeahead suggestions.
- **Three-mode retrieval pipeline toggle**:
  1. **Hybrid Mode**: Combines Full-Text Search and Vector Cosine Similarity using **Reciprocal Rank Fusion (RRF)**:
     $$\text{RRF Score} = \frac{1}{60 + \text{Rank}_{\text{keyword}}} + \frac{1}{60 + \text{Rank}_{\text{semantic}}}$$
  2. **Keyword Mode**: Native PostgreSQL Full-Text Search using `to_tsvector` and `plainto_tsquery` backed by a GIN index.
  3. **Semantic Mode**: Gemini `gemini-embedding-2` vectors and cosine similarity.
- Advanced filtering: Date Range, Document Classification (`ARTICLE`, `INTERVIEW_TRANSCRIPT`, `LEAK_MEMO`, `FOOTAGE_NOTE`, `HISTORICAL_REPORT`), Authors, Topics, and Security Clearance.
- Result cards featuring highlighted snippet matches, relevance scores, and relevant passage chunks.

### E. Document Detail Page (`/documents/:id`)
- Verbatim document text with highlighted search query terms.
- Provenance box (e.g., Microfilm Roll ID, declassified box identifier, original content hash).
- Indexed semantic chunks inspector displaying token counts and chunk boundaries.
- Related cross-referenced archive documents.
- Action to **Copy Newsroom Citation** (APA / Chicago style) and **Add to Collection**.

### F. AI Research Assistant (`/assistant`)
- Evidence-grounded natural language query engine.
- Interactive **inline citation pills** (`[1]`, `[2]`).
- Clicking any citation opens the sliding **Evidence Drawer** showing:
  - Exact verbatim quoted passage.
  - Document Title, Author, Publication, Date, and Original URL.
  - Corroboration confidence indicator.
- Transparent **Knowledge Gap Banner** when the archive lacks sufficient documentary evidence (strictly zero hallucinations).
- Export response to Markdown and clipboard copy.

### G. Structured Research Brief Builder (`/briefs`, `/briefs/:id`)
- Visitors can read published briefs; creating and editing briefs remains restricted to authenticated workspace users.
- 1-Click Brief Generator synthesizing 8 structured investigative sections:
  1. **Executive Summary**
  2. **Historical Chronological Timeline**
  3. **Key People & Organizations**
  4. **Relevant Precursor Events & Context**
  5. **Supporting Archival Evidence & Corroboration**
  6. **Conflicting or Inconsistent Accounts** (e.g., internal disclosures vs. official press statements)
  7. **Knowledge Gaps & Open Investigative Questions**
  8. **Preserved Source Attributions**
- Live inline editor allowing journalists to revise content while preserving underlying source references.
- **Export Markdown** (`.md`) and **Print to PDF** (`window.print()`).

### H. Timeline & Entity Relationship Explorer (`/timeline`)
- **Chronological Timeline View**: Chronological vertical timeline spanning 1974 to 2024 with 100% verified factual badges.
- **Entity Network Graph**: Interconnected nodes for People, Organizations, Locations, Technologies, and Events with co-occurrence document lists.

### I. Saved Research & Collections (`/collections`)
- Visitors can browse public collections; private collections, saved searches, and collection changes remain restricted.
- Create and organize dossiers for developing stories.
- Add investigator annotations/notes to bookmarked documents.
- Saved Search Queries presets with 1-click re-run.

### J. Archive Ingestion Center (`/ingestion`)
- Multi-format file intake: `.txt`, `.md`, `.csv`, `.pdf`.
- **SHA-256 Deduplication**: Identical byte content is detected and rejected with `409 Conflict`.
- Recursive text chunking (800-character segments with 150-character overlap).
- 1-Click **Import Sample Newsroom Archives Batch CSV**.
- Ingestion jobs table with status (`COMPLETED`, `FAILED`, `PROCESSING`), total chunks created, and retry capability.

### K. Administration & Governance (`/admin`)
- User & role management table with live role updates.
- Real-time audit trail logging (`USER_LOGIN`, `USER_REGISTER`, `INGEST_FILE`, `RESEARCH_QUERY`, `CREATE_DOCUMENT`, `UPDATE_USER_ROLE`).
- System health monitor tracking PostgreSQL 18 latency, AI mode, and indexing status.

---

## 4. Seed Dataset & Demo Accounts

The database is seeded with realistic fictional historical archive records spanning five decades:

- **1974**: *The Silvergate Tapes: Classified Audio Logs Reveal Coordinated Surveillance* (`LEAK_MEMO`, `RESTRICTED`)
- **1986**: *Apex Petrochemical Deep-Well Injection Scandal: Internal Memos Show Aquifer Leaching* (`ARTICLE`, `PUBLIC`)
- **1988**: *Archival Footage Dispatch: Project Helios Orbital Relay Launch Failure and Valve Telemetry Abort* (`FOOTAGE_NOTE`, `PUBLIC`)
- **1997**: *Federal Trade Commission Antitrust Inquiry into Continental Telecom Consortium Price-Fixing* (`ARTICLE`, `PUBLIC`)
- **2004**: *Interview Transcript: Dr. Aris Vance on Sub-Surface Well Failures and Corporate Pressure* (`INTERVIEW_TRANSCRIPT`, `PUBLIC`)
- **2010**: *Algorithmic Arbitrage Flash Crash: How High-Frequency Trading Quants Induced the Flash Abort* (`ARTICLE`, `PUBLIC`)
- **2022**: *Classified Whistleblower Dossier: Autonomous Fleet Sensor Drift Retraction and Safety Audits* (`LEAK_MEMO`, `CLASSIFIED`)
- **2024**: *The Vault of Whispering Stones: Archaeological Preservation and Acoustic Resonant Archives* (`HISTORICAL_REPORT`, `PUBLIC`)

### Pre-Seeded Evaluation Accounts (Password for all: `Password123!`)

| Email | Role | Recommended Evaluation Focus |
| :--- | :--- | :--- |
| `journalist@storyvault.news` | **JOURNALIST** | Universal search, AI assistant questions, brief generation, collections. |
| `editor@storyvault.news` | **EDITOR** | Reviewing briefs, citation inspection, restricted record access. |
| `archivist@storyvault.news` | **ARCHIVIST** | Ingestion center, file upload, CSV batch import, duplicate prevention. |
| `admin@storyvault.news` | **ADMIN** | User role administration, system health latency check, audit log inspection. |

---

## 5. Local Setup & Running the Application

### Prerequisites
- **Node.js**: v18+ (Tested on v22.11.0)
- **npm**: v9+ (Tested on v10.9.0)
- **PostgreSQL**: v14+ (Installed on local port 5433 or 5432)

### Step 1: Install Dependencies
```bash
# Install root orchestration packages
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Step 2: Configure Environment
Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```
Ensure `DATABASE_URL` matches your local PostgreSQL connection:
```env
DATABASE_URL="postgresql://postgres@127.0.0.1:5433/storyvault?schema=public"
JWT_SECRET="replace-with-a-random-secret-at-least-8-characters"
GEMINI_API_KEY="your-existing-gemini-api-key"
GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
```
The Gemini key is read only by the backend and must never be added to frontend
environment files. AI chat, archive search embeddings, research briefs, and
document metadata analysis all use this single Gemini configuration.
Standalone Python prompt utilities send requests to the authenticated
`/api/ai/completion` backend endpoint; set `STORYVAULT_API_TOKEN` to a valid
StoryVault JWT only when using those utilities. Python does not read or use the
Gemini API key.

### Step 3: Initialize Database Schema & Seed Data
```bash
# Push schema to PostgreSQL
npm --prefix backend run db:push

# Populate realistic archival records and test accounts
npm --prefix backend run db:seed
```
When migrating a database that already contains vectors from an older embedding
provider, reindex its stored passages with Gemini before using semantic search:
```bash
npm --prefix backend run embeddings:reindex
```
Hybrid search continues to return keyword results until reindexing is complete;
semantic-only search reports an actionable error.

### Step 4: Run the Full-Stack Application
```bash
# Concurrently start backend API and frontend Vite server
npm run dev
```
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Interactive OpenAPI / Swagger Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 6. Automated Testing Suite

StoryVault includes automated integration and unit tests covering all critical security and retrieval requirements:

```bash
# Run backend test suite
npm --prefix backend test
```

### Test Coverage Breakdown (17 Passing Tests)
1. **Health & Discovery**:
   - `GET /api/health` verifies PostgreSQL 18 connection and liveness.
   - `GET /api/docs-json` verifies valid OpenAPI 3.0 specification.
2. **Authentication & RBAC**:
   - `GET /api/auth/me` returns authenticated profile.
   - Journalist role attempting to access admin endpoints is rejected with `403 Forbidden`.
   - Admin role accesses user governance with `200 OK`.
3. **Documents & Security Clearance**:
   - `GET /api/documents` returns allowed indexed records.
   - `GET /api/documents/:id` verifies chunk structure and metadata.
   - Security classification enforcement: unauthorized role inspecting `CLASSIFIED` record is rejected with `403 Access Restricted`.
4. **Universal Search Pipeline**:
   - Keyword search verifies exact terms via PostgreSQL full-text search.
   - Semantic search retrieves conceptually related passages via vector cosine similarity.
   - Hybrid search verifies Reciprocal Rank Fusion (RRF) scoring.
   - Typeahead suggestions return matching documents, topics, authors, and entities.
5. **AI Research Assistant & Citations**:
   - Grounded queries return answers with verified inline citations and document IDs.
   - Uncorroborated queries (e.g., Martian events) return honest limitation notices without hallucinations.
6. **Ingestion & Duplicate Prevention**:
   - Duplicate file uploads with identical SHA-256 hashes are rejected with `409 Conflict`.
7. **Briefs & Collections**:
   - Automated 8-section structured brief generator verifies all required sections.
   - Collection creation, document bookmarking, and custom notes verification.

---

## 7. Production Deployment Instructions

### Option A: Docker Deployment
A production `Dockerfile` or `docker-compose.yml` can orchestrate the platform:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: production_password
      POSTGRES_DB: storyvault
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: "postgresql://postgres:production_password@postgres:5432/storyvault?schema=public"
      JWT_SECRET: "strong_production_secret"
      NODE_ENV: "production"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

### Option B: Cloud Deployment (Vercel / Render / Supabase / Neon)
1. **Database**: Provision a managed PostgreSQL instance on **Supabase** or **Neon**. Run `npx prisma db push && npx tsx prisma/seed.ts`.
2. **Backend**: Deploy `backend/` to **Render**, **Railway**, or **AWS ECS**. Configure environment variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`).
3. **Frontend**: Build production bundle via `npm --prefix frontend run build` and deploy `frontend/dist` to **Vercel** or **Netlify**. Set the API proxy rewrite rule `/api/:path*` -> `https://your-backend.onrender.com/api/:path*`.

---

## 8. Preserved Python Workspace Modules

In accordance with workspace preservation requirements, all pre-existing educational Python modules in `src/`, `data/`, `prompts/`, `scripts/`, and `tests/` have been preserved:
- `src/token_counter.py`: Tiktoken subword counting.
- `src/cost_estimator.py`: Token pricing and cost calculations.
- `src/prompts.py`: Role-separated system prompt governance.
- `src/prompt_comparison.py`: Prompt variation comparative benchmarks.
- `data/sample_story.txt`: Historical lore public document corpus sample.

To run existing Python tests:
```bash
pytest
```
