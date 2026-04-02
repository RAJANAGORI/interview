# GenAI LLM Product Security - Quick Reference

## Canonical taxonomy

**[OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/)** — use this for interviews; prior editions: [2023/24](https://genai.owasp.org/llm-top-10-2023-24/).

## 2025 Top 10 (memorize IDs)

| ID | Risk |
|----|------|
| LLM01 | Prompt Injection |
| LLM02 | Sensitive Information Disclosure |
| LLM03 | Supply Chain |
| LLM04 | Data and Model Poisoning |
| LLM05 | Improper Output Handling |
| LLM06 | Excessive Agency |
| LLM07 | System Prompt Leakage |
| LLM08 | Vector and Embedding Weaknesses |
| LLM09 | Misinformation |
| LLM10 | Unbounded Consumption |

## Non-negotiables (product security)

- **Tool authZ outside the model** (identity, tenant, scopes, allowlists) — **LLM06**
- **Validate model output** before SQL/HTML/shell/downstream APIs — **LLM05**
- **Tenant ACLs on retrieval/embeddings**; cite sources; handle low-confidence — **LLM08 / LLM09**
- **Minimize + redact prompts/logs**; vendor DPA/subprocessors — **LLM02**
- **Quotas + loop detection** on tokens/tools — **LLM10**
- **Eval + regression** after data/model changes — **LLM04**

## Phrases for interviews

- “**Untrusted input, high-privilege tools**—authorization cannot live in the prompt.”
- “**Indirect injection** is a retrieval and UX problem, not only a chat problem.”
- “**Grounding** reduces wrong answers; **ACLs** stop wrong data.”

## Quick metrics

Blocked high-risk tool calls · cross-tenant retrieval attempts · injection suite regression pass rate · token abuse anomalies · cost per successful task
