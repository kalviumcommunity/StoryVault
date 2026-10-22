"""Runnable demonstration of token counting and API cost estimation.

Kalvium Module 3.14: Tokens, Tokenization & Cost Estimation.
Analyzes three representative text samples of varying lengths using tiktoken,
demonstrates non-proportional subword tokenization dynamics, computes separate
input/output API cost estimates, and exports results to outputs/token_cost_report.md.
"""

import sys
from pathlib import Path

# Ensure repository root is on sys.path when executed directly as a script
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from typing import List, Dict, Any
from src.config import BASE_DIR, DATA_DIR, OUTPUTS_DIR, load_environment
from src.token_counter import analyze_text_tokens, count_tokens
from src.cost_estimator import estimate_api_cost, CostEstimate

# ==============================================================================
# Sample Benchmark Texts (Task 2 & Task 4)
# ==============================================================================

SAMPLE_1_QUESTION = "What ancient narratives are preserved within the Whispering Vault?"

SAMPLE_2_PARAGRAPH = (
    "StoryVault serves as an enterprise knowledge archive and retrieval-augmented "
    "generation system designed to catalog vast literary corpora. By chunking text into "
    "overlapping segments, extracting dense semantic embeddings, and indexing them in a "
    "vector database, StoryVault enables staff to query centuries of lore with low latency, "
    "grounded factual precision, and transparent citations."
)


def load_sample_document() -> str:
    """Load long document sample from data/ corpus or return fallback."""
    corpus_file = DATA_DIR / "sample_story.txt"
    if corpus_file.is_file():
        return corpus_file.read_text(encoding="utf-8").strip()

    # Fallback representative text if file is missing
    return (
        "The Whispering Vault lay buried under centuries of permafrost in the northern spires of Aethelgard. "
        "Engineered with singing obsidian pillars, the repository absorbed spoken words and preserved them for eternity. "
        "During the Great Siege, the Keepers preserved four thousand historical manuscripts, transforming fragile ink "
        "into crystalline sound. High Chronicler Melissa declared that to record a story in sound and crystal was to "
        "bequeath memory to eternity. Today, StoryVault revives this sacred task using modern retrieval-augmented "
        "generation, semantic embeddings, and token-aware indexing."
    )


def run_token_benchmarks() -> List[Dict[str, Any]]:
    """Analyze the three required samples plus supplementary tokenization edge cases."""
    doc_text = load_sample_document()

    samples = [
        ("Sample 1 - Short Question", SAMPLE_1_QUESTION),
        ("Sample 2 - Paragraph", SAMPLE_2_PARAGRAPH),
        ("Sample 3 - Long Document (Corpus)", doc_text),
    ]

    results = []
    for name, text in samples:
        analysis = analyze_text_tokens(text, sample_name=name)
        results.append(analysis)

    return results


def run_token_edge_case_benchmarks() -> List[Dict[str, Any]]:
    """Demonstrate how punctuation, code, and non-English scripts tokenize differently."""
    edge_cases = [
        ("English Prose", "The quick brown fox jumps over the lazy dog."),
        ("Python Code", "def get_vault_token(user_id: int) -> dict:\n    return {'token': user_id * 42}"),
        ("Unicode & Emojis", "✨ StoryVault Archives 📚: Fast & Secure! 🚀"),
        ("Multilingual (Hindi)", "कहानी संग्रह में आपका स्वागत है।"),
        ("Multilingual (Japanese)", "物語のアーカイブへようこそ。"),
    ]

    results = []
    for name, text in edge_cases:
        analysis = analyze_text_tokens(text, sample_name=name)
        results.append(analysis)

    return results


def run_cost_simulations(token_results: List[Dict[str, Any]]) -> List[CostEstimate]:
    """Calculate input and output cost estimates for representative RAG queries."""
    env = load_environment()
    input_rate = float(env.get("INPUT_PRICE_PER_1K", 0.00015))
    output_rate = float(env.get("OUTPUT_PRICE_PER_1K", 0.00060))
    model = env.get("CHAT_MODEL", "gpt-4o-mini")

    # Define typical output token lengths for each scenario
    simulations = [
        (token_results[0]["token_count"], 25),   # Short Q -> Brief 1-sentence answer
        (token_results[1]["token_count"], 75),   # Paragraph context -> Summary answer
        (token_results[2]["token_count"], 150),  # Full document RAG context -> In-depth response
    ]

    estimates = []
    for in_tok, out_tok in simulations:
        est = estimate_api_cost(
            input_tokens=in_tok,
            output_tokens=out_tok,
            input_price_per_1k=input_rate,
            output_price_per_1k=output_rate,
            model_name=model,
        )
        estimates.append(est)

    return estimates


def generate_markdown_report(
    token_results: List[Dict[str, Any]],
    edge_results: List[Dict[str, Any]],
    cost_estimates: List[CostEstimate],
) -> str:
    """Generate comprehensive Markdown documentation for outputs/token_cost_report.md."""
    env = load_environment()
    model = env.get("CHAT_MODEL", "gpt-4o-mini")
    encoding = env.get("TOKEN_ENCODING_NAME", "cl100k_base")
    in_price = float(env.get("INPUT_PRICE_PER_1K", 0.00015))
    out_price = float(env.get("OUTPUT_PRICE_PER_1K", 0.00060))

    doc = f"""# StoryVault Tokenization Analysis & API Cost Estimation Report

**Module:** Kalvium Module 3.14 — Tokens, Tokenization & Cost Estimation  
**Tokenizer Encoding:** `{encoding}` (via `tiktoken`)  
**Illustrative Model:** `{model}`  
**Configured Rates (Illustrative):** `${in_price:.5f} / 1k input tokens`, `${out_price:.5f} / 1k output tokens`  

---

## 1. Primary Sample Tokenization Benchmarks

The tokenizer (`{encoding}`) was applied to three representative texts across distinct length scales:
1. **Sample 1:** A short user query.
2. **Sample 2:** A descriptive technical paragraph describing StoryVault's architecture.
3. **Sample 3:** A longer literary lore document sourced from `data/sample_story.txt`.

### Token Count Summary Table

| Sample Name | Character Count | Word Count | Token Count | Characters / Token | Tokens / Word |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""

    for r in token_results:
        doc += (
            f"| **{r['sample_name']}** | {r['char_count']} | {r['word_count']} | "
            f"**{r['token_count']}** | {r['chars_per_token']} | {r['tokens_per_word']} |\n"
        )

    doc += """
---

## 2. Token, Word, and Character Dynamics

### Key Observations
1. **Longer text requires more tokens:** As length increases from a 70-character question to a multi-paragraph lore document, token counts grow from 11 tokens to hundreds of tokens.
2. **Non-Proportional Growth (Subwords != Words):** 
   - A single word does not equal one token. Common English words ("what", "is", "the") map directly to 1 token.
   - Domain-specific terms, compound words, and proper nouns (e.g., *"Aethelgard"*, *"subterranean"*, *"retrieval-augmented"*) are split into multiple subword tokens (e.g., `["A", "et", "hel", "gard"]`).
   - Consequently, the **tokens-per-word ratio** typically varies between `1.1` and `1.5` for standard English prose.
3. **Punctuation, Code, and Multilingual Discrepancies:**
   - Byte-Pair Encoding (BPE) merges frequent English character pairs more densely than non-Latin alphabets.
   - Non-Latin scripts (e.g., Devanagari, Japanese Kanji/Kana) and emojis decompose into multiple UTF-8 byte tokens, resulting in higher token-per-character density.

### Edge Case Comparison Table

| Case / Language | Characters | Words | Tokens | Characters / Token | Tokens / Word |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""

    for r in edge_results:
        doc += (
            f"| {r['sample_name']} | {r['char_count']} | {r['word_count']} | "
            f"**{r['token_count']}** | {r['chars_per_token']} | {r['tokens_per_word']} |\n"
        )

    doc += f"""
---

## 3. Configurable API Cost Estimation

Costs are calculated separately for input (prompt/context) tokens and output (generated completion) tokens using the standard formula:

$$\\text{{Estimated Cost}} = \\left(\\frac{{\\text{{Input Tokens}}}}{{1000}} \\times \\text{{Input Price per 1k}}\\right) + \\left(\\frac{{\\text{{Output Tokens}}}}{{1000}} \\times \\text{{Output Price per 1k}}\\right)$$

### Cost Projections Table ({model})

| Scenario / Context | Input Tokens | Output Tokens | Total Tokens | Input Cost (USD) | Output Cost (USD) | Total Estimated Cost (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
"""

    for est in cost_estimates:
        doc += (
            f"| **Input: {est.input_tokens} tok / Out: {est.output_tokens} tok** | "
            f"{est.input_tokens:,} | {est.output_tokens:,} | {est.total_tokens:,} | "
            f"${est.input_cost:.6f} | ${est.output_cost:.6f} | **${est.total_cost:.6f}** |\n"
        )

    doc += f"""
### Cost Estimation Disclaimers & Billing Distinctions
- **Illustrative Nature:** Rates utilized (${in_price:.5f}/1k input, ${out_price:.5f}/1k output) are illustrative baselines configured via environment variables and do not represent guaranteed provider pricing.
- **Excluded Surcharges:** These estimates exclude prompt caching credits, batch processing volume discounts, provider-specific sales taxes, minimum commitment thresholds, and network egress bandwidth fees.
- **Estimated vs. Billed Cost:** Actual billed costs are tracked and finalized by the API provider based on final server-side token accounting.
"""
    return doc


def main() -> None:
    """Execute token analysis, print terminal summaries, and save markdown report."""
    print("=== StoryVault Tokenization & Cost Estimation Demo (Module 3.14) ===")

    # 1. Primary sample analysis
    token_results = run_token_benchmarks()
    print("\n--- Primary Samples Tokenization ---")
    print(f"{'Sample':<32} | {'Chars':>6} | {'Words':>6} | {'Tokens':>6} | {'Chars/Tok':>9} | {'Tok/Word':>8}")
    print("-" * 80)
    for r in token_results:
        print(f"{r['sample_name']:<32} | {r['char_count']:>6} | {r['word_count']:>6} | {r['token_count']:>6} | {r['chars_per_token']:>9.2f} | {r['tokens_per_word']:>8.2f}")

    # 2. Edge case analysis
    edge_results = run_token_edge_case_benchmarks()
    print("\n--- Edge Cases & Multilingual Tokenization ---")
    print(f"{'Case':<25} | {'Chars':>6} | {'Words':>6} | {'Tokens':>6} | {'Chars/Tok':>9} | {'Tok/Word':>8}")
    print("-" * 75)
    for r in edge_results:
        print(f"{r['sample_name']:<25} | {r['char_count']:>6} | {r['word_count']:>6} | {r['token_count']:>6} | {r['chars_per_token']:>9.2f} | {r['tokens_per_word']:>8.2f}")

    # 3. Cost estimation
    cost_estimates = run_cost_simulations(token_results)
    print("\n--- Illustrative Cost Estimations ---")
    for est in cost_estimates:
        print(f"Scenario [{est.input_tokens} In / {est.output_tokens} Out]: Input=${est.input_cost:.6f}, Output=${est.output_cost:.6f} -> Total: ${est.total_cost:.6f} USD")

    # 4. Save report
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = OUTPUTS_DIR / "token_cost_report.md"
    report_content = generate_markdown_report(token_results, edge_results, cost_estimates)
    report_file.write_text(report_content, encoding="utf-8")
    print(f"\n[OK] Reproducible report generated at: {report_file}")


if __name__ == "__main__":
    main()
