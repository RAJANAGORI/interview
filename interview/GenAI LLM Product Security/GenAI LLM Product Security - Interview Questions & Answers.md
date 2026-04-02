# GenAI LLM Product Security - Interview Questions & Answers

References: [OWASP LLM Top 10 (2025)](https://genai.owasp.org/llm-top-10/), [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) (for pipeline/supply issues touching ML systems).

---

## Frameworks and vocabulary

### 1) What is the OWASP LLM Top 10 (2025) and why should a product security team care?

It is the OWASP GenAI project’s prioritized list of risks for **LLM applications**—including prompt injection, disclosure, supply chain, poisoning, improper output handling, excessive agency, system prompt leakage, vector/RAG weaknesses, misinformation, and unbounded consumption ([overview](https://genai.owasp.org/llm-top-10/)). Product security uses it to align **threat modeling**, **requirements**, and **release gates** across eng/ML/design—not as a substitute for your own abuse cases.

### 2) How does the 2025 list differ from “v1.1” on the legacy OWASP page?

The **canonical current edition** for interviews should be the **GenAI site’s 2025 Top 10** ([LLM Top 10](https://genai.owasp.org/llm-top-10/)). Older **v1.1** text may still appear on legacy pages—if you cite items, **name the year** and prefer the GenAI resource PDF linked from that page.

---

## Prompting and untrusted content

### 3) What is prompt injection vs indirect injection?

**Direct injection**: user text attempts to override system instructions. **Indirect injection**: untrusted content (web page, ticket, doc) is retrieved or pasted and steers the model/tool chain ([LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)). Mitigations combine **channel separation**, **tool authZ**, **retrieval sandboxing**, and **downstream validation**—not “better prompts” alone.

### 4) Can we eliminate prompt injection?

**No complete elimination** in general-purpose chat—treat it as **managed risk**. Reduce impact with **least-privilege tools**, **human confirmation** for dangerous actions, and **output/input validation** for machine-consumed paths ([LLM05](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/), [LLM06](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)).

---

## Tools, agents, and authorization

### 5) What is “excessive agency”?

Granting an LLM or agent **broad autonomy** to act (API calls, writes, integrations) without tight **authorization**, **scope**, and **confirmation**—[LLM06](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/). Staff answer: **authorize tool calls with application identity**, not model intent; **allowlist**; **rate limit**; **break-glass** patterns.

### 6) How do you secure function-calling or plugins?

Assume **hostile inputs** to plugins. Use **server-side** checks: caller identity, tenant, OAuth scopes, **idempotency**, **read-only vs write** separation, and **audit** ([LLM05](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)). Never trust the model to decide privilege.

---

## Data, RAG, and vectors

### 7) What risks are specific to RAG?

Retrieval can **exfiltrate** data across tenants if ACLs are wrong; embeddings and chunking can be **poisoned** or manipulated; low-quality retrieval fuels **misinformation** ([LLM08](https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/), [LLM04](https://genai.owasp.org/llmrisk/llm042025-data-and-model-poisoning/), [LLM09](https://genai.owasp.org/llmrisk/llm092025-misinformation/)). Answer with **collection-level authZ**, **grounding/citations**, **evals after corpus changes**, and **safe failure** when confidence is low.

### 8) How do you reduce sensitive information disclosure?

Minimize fields in prompts, **redact/classify** upstream, tighten **logging**, review **vendor data handling**, and validate **output** before showing to users or other systems ([LLM02](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/)).

---

## Supply chain and operations

### 9) What is in the “LLM supply chain”?

Models, weights, **datasets**, eval tooling, inference runtimes, containers, and third-party APIs—integrity, provenance, and update discipline matter ([LLM03](https://genai.owasp.org/llmrisk/llm032025-supply-chain/)). Tie to your **dependency**, **build**, and **model release** processes.

### 10) What is unbounded consumption?

Abuse or bugs causing **runaway tokens**, tool loops, or **cost/DoS**—[LLM10](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/). Mitigate with **quotas**, **concurrency caps**, **circuit breakers**, and **monitoring** on token/tool use.

---

## Governance and metrics

### 11) How do you test LLM features for security?

Blend **offline evals** (regression sets, injection suites), **red teaming**, **canary** releases, and **production signals** (blocked tool calls, policy violations, cross-tenant access attempts). Track **drift** when models or corpora change ([LLM04](https://genai.owasp.org/llmrisk/llm042025-data-and-model-poisoning/)).

### 12) How do you partner with ML and product?

Translate OWASP items into **requirements** (“tool calls require OAuth scopes X/Y”, “retrieval must enforce tenant ACLs”), **paved-road libraries**, and **launch reviews**—same as any high-risk feature, with extra **eval** discipline.

### 13) What is system prompt leakage?

Exposure of **system/developer instructions** via model behavior, errors, or logs—[LLM07](https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/). Mitigate with **minimal prompts**, **safe logging**, and **rate limiting** probing.

---

## Curveballs

### 14) Are content filters enough?

Filters help for **safety/abuse** but are not a full security strategy. You still need **authZ**, **output validation**, and **safe tool design** ([LLM05](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/), [LLM06](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)).

### 15) Who owns “LLM security”?

**Shared**: AppSec owns **tooling and threat models**, ML owns **data and evals**, platform owns **infra and quotas**, privacy/legal own **commitments**. Product security often **orchestrates** requirements and metrics.
