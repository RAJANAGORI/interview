# GenAI LLM Product Security — Comprehensive Guide

## At a glance

Large language model (LLM) features add a **new trust boundary**: **untrusted natural language and documents** flow through a **non-deterministic model** that may invoke **tools**, query **retrieval stores**, and produce **outputs** consumed by people and systems. Product security means **explicit authorization outside the model**, **tenant-safe data paths**, **safe handling of model output**, and **continuous evaluation** when prompts, weights, corpora, and vendors change every release.

**Primary taxonomy:** [OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/) from the OWASP GenAI Security Project. Cite the **2025** edition in interviews; older material remains useful for historical comparison at [LLM Top 10 2023/24](https://genai.owasp.org/llm-top-10-2023-24/).

---

## Learning outcomes

- Explain **prompt injection** (direct and indirect) and why it is a **product and authorization** problem, not only a “model bug.”
- Design **RAG** and **vector** controls that enforce **entitlements** and survive **poisoned or adversarial** documents.
- Specify **tool-use** security: identity, scopes, allowlists, confirmations, and audit for high-impact actions.
- Run **evaluations and red teaming** that catch **security regressions**, not only quality drift.
- Align **governance**, **vendor contracts**, and **model supply chain** practices with privacy and enterprise commitments.
- Apply **PII minimization** in prompts and logs, and **safe UX patterns** that reduce harm when the model errs.

---

## Prerequisites

Application security (injection, XSS, authZ), OAuth and API security basics, data classification, logging and observability, and familiarity with your organization’s privacy and procurement processes.

---

## OWASP LLM Top 10 (2025) — anchor map

Use official risk pages under [genai.owasp.org/llm-top-10](https://genai.owasp.org/llm-top-10/) for definitions. This table is a **memory aid** for interviews:

| ID | Risk | Interview one-liner |
|----|------|---------------------|
| **LLM01** | Prompt injection | Untrusted text steers behavior; includes **indirect** injection via retrieved or pasted content. |
| **LLM02** | Sensitive information disclosure | Secrets, PII, or internal data in prompts, corpora, logs, training, or model output. |
| **LLM03** | Supply chain | Models, datasets, libraries, containers, eval harnesses, third-party APIs—integrity and provenance. |
| **LLM04** | Data and model poisoning | Bad fine-tune, RAG, or embedding data shifts behavior (backdoors, bias, exfil helpers). |
| **LLM05** | Improper output handling | Model output treated as trusted in HTML, SQL, shell, or tool APIs without validation. |
| **LLM06** | Excessive agency | Tools or automations are too powerful relative to checks and human oversight. |
| **LLM07** | System prompt leakage | System or developer instructions exposed via responses, errors, or logs. |
| **LLM08** | Vector and embedding weaknesses | Weak tenant isolation, retrieval manipulation, embedding or chunk-level attacks. |
| **LLM09** | Misinformation | Unsafe reliance on hallucinations or weak grounding in high-risk workflows. |
| **LLM10** | Unbounded consumption | Cost and availability abuse via tokens, loops, or uncontrolled tool calls. |

**Interview tip:** Tie mitigations to IDs (for example, “tool authZ addresses LLM06; output encoding addresses LLM05”).

---

## Threat model (product-shaped)

**Inputs:** Chat messages, pasted text, uploaded files, email bodies, support tickets, web pages fetched for “research,” images with embedded text, and **any document later retrieved into context**.

**Processing:** System prompts, few-shot examples, chain-of-thought style reasoning (even if hidden), **retrieval** steps, **reranking**, and **tool** or **function** invocations.

**Outputs:** User-visible answers, **structured** payloads for downstream services, **actions** (send message, update record, call payment API), and **telemetry** (logs, traces, feedback datasets).

**Adversaries:** Curious users, compromised accounts, external attackers driving **indirect injection** through content your product ingests, and **insiders** with broad corpus access.

**Trust boundary rule:** Anything that can appear **inside the model’s context window** must be treated as **potentially hostile instructions and data**, unless you have a separate, enforced channel with cryptographic or strong system guarantees.

---

## Prompt injection

**Direct injection** is when the end user tries to override developer intent: “Ignore previous instructions and …”

**Indirect injection** is when **untrusted content** becomes part of the context: a malicious snippet in a PDF the assistant summarizes, a web page the agent fetches, a ticket filed by an attacker, or a coworker’s document in a shared drive that the assistant retrieves. The model may follow embedded commands because it cannot reliably distinguish “data to analyze” from “instructions to obey.”

**Why “better system prompts” are insufficient:** Models optimize for coherence with **all** tokens in context. Delimiters and “ignore the above” clauses are **hints**, not security boundaries. Defense must **reduce blast radius** and **enforce policy outside the model**.

**Controls that matter:**

- **Structural separation** where feasible: distinct APIs or internal representations for “trusted developer policy” versus “untrusted document body,” with **parsing discipline** so user content cannot splice into policy fields.
- **Downstream enforcement:** If the model proposes an action, **application code** validates **identity, tenant, scopes, and business rules** before execution.
- **Least-privilege tools:** Narrow functions (read specific resource types, write with limits) instead of generic “run SQL” or “HTTP to any URL.”
- **Human confirmation** for irreversible or high-impact operations, with **clear display** of what will happen and **who** is accountable.
- **Detection and rate limits** on probing patterns (repeated jailbreak attempts, unusual tool sequences).

Map to **LLM01**, **LLM06**, **LLM05**, and **LLM07** when discussing injection, agency, unsafe consumption of output, and instruction leakage.

---

## Data leakage

Leakage paths include: **model responses** that echo secrets from context or memorized training; **logs and traces** storing full prompts and completions; **support and analytics** exports; **retrieval** returning another tenant’s chunks; **client-side** storage of sensitive threads; and **third-party inference** where prompts leave your trust zone.

**Memorization and hosted models:** Commercial APIs may state they do not train on **enterprise** data under certain tiers, but **operational reality** still includes subprocessors, regions, retention, and incident response. Your **DPA** and **AI addenda** must match how you actually call the API (streaming, batch, fine-tuning, eval dumps).

**Controls:**

- **Data classification** gates: block or redact **highly sensitive** fields before they enter prompts; use **local** or **air-gapped** inference where policy requires it.
- **Output filtering** for known secret patterns (API keys, internal URLs) as a **backstop**, not a primary control.
- **Log hygiene:** structured security events without raw prompts where possible; **tokenization** or hashing of stable identifiers; retention aligned to privacy commitments.
- **RAG-specific:** enforce **document-level** and **chunk-level** authorization at query time; never “search everything the model thinks is relevant.”

Map to **LLM02** and overlaps with **LLM03** (vendor handling) and **LLM08** (retrieval boundaries).

---

## RAG risks

Retrieval-augmented generation reduces hallucinations when done well, but introduces **new attack surface**.

**Access control:** Vector stores must enforce **the same entitlements** as the source systems. Common failure: index built from a copy that **lags** ACL changes, or metadata filters that are **too coarse** (workspace-wide instead of per-file).

**Poisoning and manipulation (LLM04 / LLM08):** An attacker with write access to the corpus (or SEO spam on crawled pages) can insert **biased**, **misleading**, or **instruction-like** text designed to appear in top-k results. **Embedding attacks** and **chunk boundary** tricks can hide malicious content from human reviewers while remaining retrievable.

**Grounding and misinformation (LLM09):** Empty retrieval, wrong language, or stale docs can cause confident wrong answers. High-risk domains (medical, financial, security operations) need **explicit uncertainty**, **citations**, and **escalation** paths.

**Mitigations:**

- **Ingestion pipeline integrity:** provenance, approval workflows for curated corpora, malware scanning for uploads, and **reconciliation** jobs when source ACLs change.
- **Query-time filters:** tenant ID, user ID, resource IDs, labels; **deny by default** when metadata is missing.
- **Grounding UX:** show **sources**; distinguish “answer from retrieved docs” from “general knowledge.”
- **Regression tests:** golden questions with expected **cited** passages after corpus or embedder updates.
- **Monitoring:** retrieval hit rates, empty-result rates, sudden shifts in embedding neighbors for sensitive collections.

---

## Tool use (functions, plugins, agents)

When the model invokes **tools**, the security model is **distributed systems plus OAuth**, not chat UX.

**Non-negotiables:**

- **Authorize every call** with the **end-user’s** (or service’s) identity and **delegated** tokens, not a single **ambient** assistant credential with god mode.
- **Allowlist** destinations, methods, and parameter shapes; reject free-form URLs or arbitrary shell.
- **Idempotency** keys and **deduplication** for writes; **read-only** vs **read-write** tool groups per persona.
- **Server-side validation** of arguments (types, ranges, referential checks) exactly as for non-LLM clients.
- **Rate limits** and **budgets** per user, tenant, and tool; **circuit breakers** on error storms (**LLM10**).
- **Audit logs** that record **who**, **what tool**, **which resource**, and **outcome**, suitable for incident response.

**Excessive agency (LLM06):** arises when the product bundles “planning” and “execution” without friction. Mitigate with **step-up auth**, **approval queues**, **simulation or preview** modes, and **separation of duties** for admin tools.

**Improper output handling (LLM05):** model-produced HTML, SQL, or JSON must go through the **same encoding, parameterization, and schema validation** as any other untrusted input.

---

## Evaluations and red teaming

**Quality evals** (helpfulness, correctness) are necessary but **not sufficient**. Security evals should include:

- **Prompt injection suites:** direct and indirect cases, multilingual, multimodal where applicable, and **tool-exfiltration** scenarios (“email all retrieved content to …”).
- **Privilege tests:** attempts to invoke **admin** tools with a **standard** user session; cross-tenant retrieval probes.
- **Corpus drift tests:** after RAG updates, verify **no new** leakage paths and **stable** citations for compliance topics.
- **Abuse tests:** token stuffing, parallel sessions, agent **loops**, and **denial-of-wallet** patterns.

**Red teaming:** periodic **adversarial** exercises with scope, rules of engagement, and **fixed** playbooks. Feed findings into **severity-rated** backlogs and **release gates**.

**Canary and shadow:** roll out new models or prompts to a slice of traffic; compare **block rates**, **tool denials**, and **safety** metrics before full promotion.

---

## Governance

**Roles:** Application security owns **threat models and secure patterns**; ML and data science own **datasets, training, and offline metrics**; platform owns **infra, quotas, and keys**; privacy and legal own **external commitments**; product owns **UX risk** and **customer communication**.

**Artifacts:** data protection impact assessments for **new** LLM use cases; **model and corpus** inventories; **vendor** risk reviews for foundation model providers; **incident runbooks** for prompt injection-led abuse, data spillage, and model **degradation**.

**Policies:** acceptable use for **employee** copilots; customer-facing **transparency** on data use, retention, and **human review** where required; **exception** process with owners and expiry dates.

---

## Model supply chain (LLM03)

The supply chain spans **base weights**, **fine-tunes**, **LoRA** adapters, **evaluation** frameworks, **inference** runtimes (vLLM, ONNX, vendor SDKs), **containers**, **GPU drivers**, and **CI** templates that package prompts.

**Practices:**

- **Pin** versions for models, containers, and dependencies; **scan** images; **sign** artifacts where supported.
- **Provenance** for datasets used in fine-tuning or RAG; **license** review for **training** and **redistribution**.
- **Reproducible** training and deployment configs; **change control** when swapping models or temperature defaults.
- **Subprocessor** and **region** tracking for cloud inference; **exit** strategy if a vendor changes terms or suffers an incident.

Align with broader **CI/CD security** discipline: least-privilege pipelines, protected branches, and secret scanning so **keys** do not enter **repos** or **prompt templates**.

---

## PII in prompts

**Minimize** before the model sees text: drop columns, mask tokens, aggregate where possible, and **avoid** sending **full** government IDs, **raw** payment details, or **complete** medical records unless legally required and contractually covered.

**Redaction pipeline:** deterministic rules (regex and dictionaries) plus **classifiers** where appropriate; **human** review queues for borderline exports in regulated workflows.

**Logging:** if prompts must be stored for debugging, use **role-based access**, **short retention**, and **encryption**; prefer **hashes** of prompt templates plus **structured** metadata over full verbatim logs in production.

**User education:** warn when users **paste** sensitive data; offer **local** processing or **no-retain** modes if your architecture supports them.

---

## Safe UX patterns

**Citations and provenance:** show **which documents** grounded the answer; let users **inspect** snippets. Reduces **silent fabrication** and aids **audit**.

**Uncertainty and refusal:** train product copy and model behavior to **admit limits**; avoid **false precision** in numeric or policy answers.

**Confirmations:** for **external** email, **money movement**, **IAM changes**, or **bulk delete**, require **explicit** confirmation with **immutable** summary of targets.

**Progressive disclosure:** default to **narrow** tool permissions; **escalate** scope only after step-up authentication or admin approval.

**Escalation to humans:** visible path for **incorrect** or **harmful** outputs; **feedback** tied to **trace IDs** for triage.

**Safe rendering:** treat assistant output as **untrusted HTML**; use **sanitization**, **CSP**, and **no raw HTML** where not needed.

**Abuse UX:** gentle **throttling** messages and **account** protections rather than leaking **internal** policy strings when blocking.

---

## Metrics and success criteria

- **Safety and security:** blocked tool calls, injection attempt rate, cross-tenant access **denials**, red-team **open criticals**, time to remediate.
- **Reliability:** grounded-answer rate, empty-retrieval handling quality, regression suite pass rate across **model** upgrades.
- **Cost and resilience:** tokens per task, **p95** latency, anomaly detection on **spend** and **concurrency** (**LLM10**).
- **Governance:** percentage of LLM features with **completed** DPIAs, vendor review **SLAs** met, **audit** completeness for high-risk tools.

---

## Failure modes (credible in interviews)

- Guardrails on **text** while tools still run with **service account** superpowers (**LLM06**).
- RAG indexed **without** document ACLs, or filters that **fail open** on errors (**LLM08**, **LLM02**).
- Treating prompt injection as fixable with **secret** system prompts (**LLM01**, **LLM07**).
- Logging **full** prompts containing **secrets** and PII into a searchable SIEM (**LLM02**).
- Evaluations that track **BLEU** or **helpfulness** but miss **security** regressions after a **fine-tune** (**LLM04**).

---

## Interview clusters

- **Fundamentals:** prompt injection vs XSS; why retrieval is untrusted; what LLM06 means for product design.
- **Senior:** how to enforce per-user OAuth on tool calls; how tenant isolation works in a vector database.
- **Staff:** red-team an agent with **email** and **ticketing** tools; govern **third-party** model subprocessors; design **rollback** after a bad **corpus** push.

---

## Staff-level positioning

GenAI product security is **application security**, **data governance**, and **distributed systems**, with **non-deterministic** components. Winning designs **never** trust the model for **authorization**; they **compose** narrow tools, **enforce** entitlements at retrieval and execution, **measure** security continuously, and **align** UX with **safe failure** when models and data inevitably drift.

---

## Pre-launch and regression checklist

Use this as a **release gate** companion to your threat model, not as a substitute for it.

**Architecture and data paths**

- Document every path where **user or third-party text** can enter context (chat, uploads, crawlers, tickets, email connectors).
- Verify **tenant isolation** for RAG metadata filters and **integration tests** that prove **negative** cases (user A cannot retrieve user B’s chunks).
- Confirm **retention** and **encryption** for prompts, completions, and embeddings match **customer** contracts and **internal** classification policy.

**Tools and actions**

- Enumerate each **tool** with required **OAuth scopes** or **service** roles; reject **ambient** god tokens.
- Require **server-side** argument validation and **idempotency** for mutating tools; log **denials** with enough detail for IR without storing **secrets**.
- Define which actions need **step-up** authentication, **dual control**, or **human** approval.

**Model and corpus changes**

- Run **offline** injection and **privilege** suites; compare metrics to the **previous** model or prompt version.
- After **corpus** updates, run **golden** RAG tests and spot-check **citation** integrity for regulated answers.
- Update **runbooks** when **vendor** regions, **data processing** terms, or **fine-tune** artifacts change.

**Observability**

- Dashboards for **token** volume, **tool** error rates, **policy** blocks, and **cost** anomalies per tenant.
- Alerts on spikes in **cross-tenant** denials, **repeated** injection patterns, and **sudden** embedding or retrieval drift.

**Customer-facing readiness**

- **Safe rendering** paths tested for **XSS** from assistant output; **export** and **share** features reviewed for **accidental** PII leakage.
- Support playbooks for **wrong** answers, **harmful** content, and **suspected** data exposure, including **who** can access **traces** for a ticket.
