# GenAI LLM Product Security - Comprehensive Guide

## At a glance

**LLM features** introduce a new trust boundary: **untrusted input** (prompts, documents, images) flows through **models** and **tools** that may touch **customer data**, **IAM**, and **regulated** outputs. Product security here means **explicit authorization for tools**, **tenant-safe retrieval**, **safe downstream handling** of model output, and **continuous evaluation** when models and prompts change every release.

---

## Learning outcomes

- Map risks to **OWASP LLM Top 10** (cite **2025** vs older editions when comparing).
- Design **tool** and **RAG** controls that do **not** depend on the model “being nice.”
- Explain **failure modes**: excessive agency, cross-tenant retrieval, prompt injection leading to **action**, logging **PII** in prompts.
- Define **metrics** for safety, security, cost, and governance—not only model quality.

---

## Prerequisites

Application security fundamentals, OAuth/API authorization concepts, Data classification, Security Observability (this repo).

---

## What interviewers want to hear (senior / staff product security)

They want evidence that you treat **LLM features as a new trust boundary**: not “smarter autocomplete,” but **untrusted input → high-privilege tools → customer data → regulated outputs**. You should connect **controls** to **product requirements**, **observability**, and **safe failure modes** when models or tools misbehave.

Authoritative risk taxonomy: **[OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/)** (also published as a downloadable resource from the [OWASP GenAI Security Project](https://genai.owasp.org/)). The 2023/24 edition remains documented for comparison at [LLM Top 10 2023/24](https://genai.owasp.org/llm-top-10-2023-24/)—in interviews, state which version you are referencing if you compare items.

---

## OWASP LLM Top 10 (2025) — study anchors

Use the official pages under [genai.owasp.org/llm-top-10](https://genai.owasp.org/llm-top-10/) for definitions and mitigations. The 2025 list emphasizes **agentic systems**, **RAG/vectors**, and **operational abuse** in addition to classic prompt attacks:

| ID | Risk (2025) | What to say in an interview |
|----|----------------|------------------------------|
| **LLM01** | **Prompt Injection** | User or untrusted content overrides developer intent; includes indirect injection via retrieved docs, tools, or multimodal inputs. |
| **LLM02** | **Sensitive Information Disclosure** | Secrets/PII in prompts, retrieval corpora, logs, or model outputs; training-data memorization concerns for hosted models. |
| **LLM03** | **Supply Chain** | Models, datasets, eval harnesses, inference libraries, and vendor APIs—integrity and provenance matter. |
| **LLM04** | **Data and Model Poisoning** | Bad fine-tune/embedding/RAG data shifts behavior (backdoors, bias, exfiltration helpers). |
| **LLM05** | **Improper Output Handling** | Treating model output as safe for HTML/SQL/shell/tool APIs without validation → XSS, injection, unsafe actions. |
| **LLM06** | **Excessive Agency** | Tools/actions are too broad; insufficient confirmation for irreversible or high-risk operations. |
| **LLM07** | **System Prompt Leakage** | System/developer instructions exposed—often overlaps with injection and logging redaction failures. |
| **LLM08** | **Vector and Embedding Weaknesses** | RAG retrieval manipulation, access control gaps across tenants/collections, poisoning of embeddings. |
| **LLM09** | **Misinformation** | Hallucinations driving bad security/business decisions; unsafe reliance in regulated workflows. |
| **LLM10** | **Unbounded Consumption** | Cost/DoS via token abuse, runaway agent loops, uncontrolled tool calls. |

**Interview tip:** Map your experience to **IDs** (“we designed tool authZ specifically around LLM06/LLM05”)—it signals you read primary sources, not blog summaries alone.

---

## Threat model (product-shaped)

- **Input path**: malicious prompts, poisoned attachments, hostile web content pulled into retrieval, **indirect** injection via support tickets or user-uploaded docs.
- **Tool path**: APIs that send email, change IAM, move money, mutate data—**authorization must not depend on the model “being nice.”**
- **Data path**: cross-tenant retrieval, overly broad file search, logging of prompts with PII, insecure **output** passed to downstream systems.
- **Ops path**: quota bypass, model/version drift, vendor incident response, eval gaps after fine-tuning.

---

## Controls that scale (by layer)

### 1) Architecture and trust boundaries

- Separate **system/developer instructions** from **untrusted content** structurally where possible (clear channels, not one concatenated blob without parsing discipline).
- Treat **retrieved documents** as untrusted; do not let retrieval text silently become “instructions” with privilege.
- For **agents**, enforce **least-privilege tool sets** per user/tenant/session; separate **planning** from **execution** with human-in-the-loop for irreversible actions when appropriate (aligns with **LLM06**).

### 2) Authorization for tools (non-negotiable)

- **Every tool call** must be authorized **outside** the model: identity, tenant, scopes, step-up, and rate limits.
- **Allowlists** for destinations (URLs, ARNs, repos), **idempotency** keys, and **confirmation** UX for destructive operations.
- Never “one OAuth token for the whole assistant” without per-user delegation and audit.

### 3) RAG and embeddings (**LLM08**)

- **Collection-level ACLs** aligned to product entitlements; verify tenant isolation in vector stores.
- **Grounding**: cite sources; detect when retrieval is empty or low-confidence; avoid silent fabrication for high-risk domains (**LLM09**).
- **Poisoning controls**: vet ingestion pipelines; monitor drift; regression tests on golden Q&A after data updates (**LLM04**).

### 4) Output and downstream handling (**LLM05**)

- **Content safety** and **policy filters** appropriate to your domain (not only blocklists).
- When output drives code, SQL, shell, or HTML: apply the **same validation** you would apply without an LLM (parameterized queries, sandboxing, CSP, etc.).
- **Structured outputs** with schema validation when machine-consumed.

### 5) Data minimization, logging, and retention (**LLM02**)

- **Redact/classify** before sending to models; minimize fields in prompts.
- **Log safely**: separate security events from raw prompts where feasible; retention aligned to privacy commitments.
- Contract review for **third-party inference** (data use, subprocessors, geographic boundaries) (**LLM03**).

### 6) Resilience and abuse (**LLM10**)

- Per-user and per-tenant **budgets**, concurrency caps, and backoff; detect agent **tool loops**.
- **Canary** releases for model/version changes; offline eval suites; shadow traffic for risky prompts.

---

## How to measure success

- **Safety**: rate of blocked policy/tool violations; severity of near-misses in red teaming; regression suite pass rate across model updates.
- **Security**: incidents of cross-tenant leakage, prompt injection leading to action, or unsafe outputs executed downstream.
- **Reliability/cost**: p95 latency, token consumption per successful task, abuse-driven cost spikes.
- **Governance**: data classification coverage; audit completeness for high-risk tools; exception inventory with expiry.

---

## Failure modes (credible in interviews)

- **“We added guardrails”** but tools still run with service-level god privileges (**LLM06**).
- **RAG without authZ** on chunks (**LLM08**) or **logging** full prompts with secrets (**LLM02**).
- **Prompt injection** framed only as a model bug—without **tool-tier** controls (**LLM01** + **LLM06**).
- **Evaluations** that track helpfulness but not **security regressions** after fine-tuning (**LLM04**).

---

## Interview clusters

- **Fundamentals:** “What is prompt injection vs XSS?” “Why is LLM06 (Excessive Agency) a product security issue?”
- **Senior:** “How do you authorize every tool call without trusting the model?” “How do you isolate tenants in a vector store?”
- **Staff:** “Red-team an agent that can read email and file tickets—what breaks first?” “How do you govern third-party model subprocessors?”

---

## Staff-level positioning

**GenAI product security** is **application security plus distributed systems plus data governance**, with **non-deterministic** components: design for **explicit authorization**, **safe composability** of tools, and **continuous evaluation** when the “stack” changes every release.
