# StoryVault Prompt Comparison & Evaluation

**Module:** Kalvium Module 3.13 — Prompt Construction and System/User Message Roles  
**Execution Status:** ⚠️ Live API Unverified (No API Key Configured)  
**Note:** Live API execution unverified: API credentials or network endpoint not configured in environment. Model outputs were NOT fabricated.

---

## 1. Controlled Test Input

- **Context:**
  > "The standard refund window is 14 days after purchase."
- **Target Question:**
  > "What is our refund window?"

---

## 2. Prompt Variations & Role Payloads

### Prompt A: Ambiguous & Open-Ended

#### System Message
```text
You are a helpful assistant.
```

#### User Message
```text
Context:
The standard refund window is 14 days after purchase.

Request:
Explain our refund policy.
```

#### Actual Model Output
```text
[Live model call unverified - no API key configured]
```

---

### Prompt B: Specific, Grounded & Constrained (Selected)

#### System Message
```text
You are a concise, factual staff support assistant for StoryVault.

Your operating rules are:
1. Role: Act as a professional, helpful, and factual staff support assistant.
2. Scope: Answer questions using only the information explicitly provided in the supplied context.
3. Constraints: Do not invent policies, dates, figures, procedures, or facts under any circumstances.
4. Fallback: If the context does not contain the answer, explicitly say: "I don't know from the provided context."
5. Tone & Format: Keep responses concise, objective, and strictly adhere to any specified length limits.
```

#### User Message
```text
Context:
The standard refund window is 14 days after purchase.

Question:
What is our refund window?

Instructions:
Using only the provided context, answer the question in one sentence. State the refund window in days. If the context does not contain the answer, say: 'I don't know from the provided context.' Do not invent information.
```

#### Actual Model Output
```text
[Live model call unverified - no API key configured]
```

#### Out-of-Context Fallback Test Output
```text
[Live model call unverified - no API key configured]
```

---

## 3. Comparison & Rationale

| Evaluation Dimension | Prompt A (Ambiguous) | Prompt B (Specific & Constrained) |
| :--- | :--- | :--- |
| **System Role Definition** | Generic (`You are a helpful assistant.`) with zero organizational boundaries. | Specific (`concise, factual staff support assistant for StoryVault`) establishing domain, tone, and rigor. |
| **Permitted Information Source** | Unspecified. Model relies on internal pre-training and risks hallucinating external refund terms. | Strictly bounded: `"Using only the provided context"`. |
| **Exact Task Specification** | Vague (`Explain our refund policy.`). | Explicit (`State the refund window in days.`). |
| **Length & Format Guardrails** | Unconstrained, leading to potential verbosity and rambling paragraphs. | Explicitly constrained: `"answer the question in one sentence"`. |
| **Missing Information Fallback** | None. Model attempts to extrapolate or guess when data is absent. | Mandatory verbatim fallback: `"I don't know from the provided context."` |

### Why Prompt B is the Superior Choice

Prompt B is markedly superior for an enterprise staff-support and RAG workflow for four core reasons:
1. **Permitted Source of Information:** By enforcing `"Using only the provided context"`, the model is prevented from fabricating general return windows, restocking fees, or warranty conditions not established by StoryVault.
2. **Exact Task Clarity:** Specifying `"State the refund window in days"` directs the model to extract the exact quantity (`14 days`) rather than generating extraneous commentary.
3. **Deterministic Response Length:** Restricting output to `"one sentence"` guarantees concise answers suitable for staff tooling, chat interfaces, and automated RAG pipelines.
4. **Mandatory Fallback Policy:** The requirement to return `"I don't know from the provided context."` eliminates hallucination risk when answering out-of-scope queries.

---

## 4. Verification Evidence & Secrets Auditing

- **Secrets Hygiene:** No credentials, keys, or endpoints are embedded in source files, prompts, or output reports.
- **Role Separation:** Verified via automated unit tests (`tests/test_prompts.py`).
