# StoryVault Tokenization Analysis & API Cost Estimation Report

**Module:** Kalvium Module 3.14 — Tokens, Tokenization & Cost Estimation  
**Tokenizer Encoding:** `cl100k_base` (via `tiktoken`)  
**Illustrative Model:** `gpt-4o-mini`  
**Configured Rates (Illustrative):** `$0.00015 / 1k input tokens`, `$0.00060 / 1k output tokens`  

---

## 1. Primary Sample Tokenization Benchmarks

The tokenizer (`cl100k_base`) was applied to three representative texts across distinct length scales:
1. **Sample 1:** A short user query.
2. **Sample 2:** A descriptive technical paragraph describing StoryVault's architecture.
3. **Sample 3:** A longer literary lore document sourced from `data/sample_story.txt`.

### Token Count Summary Table

| Sample Name | Character Count | Word Count | Token Count | Characters / Token | Tokens / Word |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Sample 1 - Short Question** | 66 | 9 | **11** | 6.0 | 1.222 |
| **Sample 2 - Paragraph** | 384 | 51 | **65** | 5.908 | 1.275 |
| **Sample 3 - Long Document (Corpus)** | 1932 | 271 | **366** | 5.279 | 1.351 |

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
| English Prose | 44 | 9 | **10** | 4.4 | 1.111 |
| Python Code | 77 | 10 | **24** | 3.208 | 2.4 |
| Unicode & Emojis | 41 | 8 | **16** | 2.562 | 2.0 |
| Multilingual (Hindi) | 32 | 6 | **30** | 1.067 | 5.0 |
| Multilingual (Japanese) | 14 | 1 | **16** | 0.875 | 16.0 |

---

## 3. Configurable API Cost Estimation

Costs are calculated separately for input (prompt/context) tokens and output (generated completion) tokens using the standard formula:

$$\text{Estimated Cost} = \left(\frac{\text{Input Tokens}}{1000} \times \text{Input Price per 1k}\right) + \left(\frac{\text{Output Tokens}}{1000} \times \text{Output Price per 1k}\right)$$

### Cost Projections Table (gpt-4o-mini)

| Scenario / Context | Input Tokens | Output Tokens | Total Tokens | Input Cost (USD) | Output Cost (USD) | Total Estimated Cost (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Input: 11 tok / Out: 25 tok** | 11 | 25 | 36 | $0.000002 | $0.000015 | **$0.000017** |
| **Input: 65 tok / Out: 75 tok** | 65 | 75 | 140 | $0.000010 | $0.000045 | **$0.000055** |
| **Input: 366 tok / Out: 150 tok** | 366 | 150 | 516 | $0.000055 | $0.000090 | **$0.000145** |

### Cost Estimation Disclaimers & Billing Distinctions
- **Illustrative Nature:** Rates utilized ($0.00015/1k input, $0.00060/1k output) are illustrative baselines configured via environment variables and do not represent guaranteed provider pricing.
- **Excluded Surcharges:** These estimates exclude prompt caching credits, batch processing volume discounts, provider-specific sales taxes, minimum commitment thresholds, and network egress bandwidth fees.
- **Estimated vs. Billed Cost:** Actual billed costs are tracked and finalized by the API provider based on final server-side token accounting.
