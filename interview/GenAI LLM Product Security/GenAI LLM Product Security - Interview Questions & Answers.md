# GenAI LLM Product Security — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab (a tool you secured, a RAG ACL bug you found, or a red-team finding).
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** notes for this topic in the same folder.

**References:** [OWASP LLM Top 10 (2025)](https://genai.owasp.org/llm-top-10/); [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) for program-level framing; your org’s privacy and vendor risk processes for deployment detail.

---

## 1) Why is an LLM feature a different kind of product security problem than a typical REST API?

A REST API has **structured inputs**, predictable parsing, and clear **authZ** hooks. An LLM path accepts **free text and documents** that become **one narrative context** for the model. Attackers (or innocently poisoned content) can blend **instructions and data**, so you cannot rely on the model to honor a “system prompt” as a security boundary. Security has to live in **tool authorization**, **retrieval entitlements**, **output validation**, and **UX** that limits irreversible actions—mapped to OWASP items such as **LLM01**, **LLM05**, **LLM06**, and **LLM08**.

---

## 2) What is prompt injection, and how does indirect injection differ from direct injection?

**Direct injection** is the user typing attempts to override developer intent (“disregard prior rules”). **Indirect injection** is when **untrusted content** enters context—malicious text in a PDF, a web page fetched by an agent, a support ticket, or a retrieved chunk—and steers the model or tool chain without the end user typing an attack string. The same retrieved paragraph can simultaneously be **data the user asked about** and **instructions the model obeys**, which is why delimiter tricks alone fail at scale. Mitigations are **not** limited to better prompts: you need **least-privilege tools**, **server-side authZ**, **safe retrieval**, and **validation** of anything the model outputs to other systems (**LLM01** plus **LLM05**/**LLM06**).

---

## 3) Can we eliminate prompt injection entirely?

**No** for general-purpose assistants that accept arbitrary text. You **manage** risk: narrow **tool** surfaces, **confirm** high-impact actions, **validate** machine-consumed outputs, **monitor** abuse, and **assume** context can be hostile. The goal is **contained impact**, not perfect separation of instructions and data inside the model (**LLM01**, **LLM06**).

---

## 4) What data leakage risks are most common in shipped LLM products?

**Leaking secrets or PII** in completions after they appeared in context; **logging** full prompts and responses into SIEM or support tools; **cross-tenant RAG** returning another customer’s chunks; **over-retention** of chat in analytics; **client-side** thread storage without encryption; and **vendor** subprocessors or regions that do not match customer contracts. **Export**, **share link**, and **copilot-in-email** features often widen blast radius because users treat the assistant as a **notepad**. Controls: **minimize** fields in prompts, **redact**, **query-time ACLs** on retrieval, **short retention** and **access-controlled** logs, **review** sharing UX, and **contract** alignment (**LLM02**, **LLM03**, **LLM08**).

---

## 5) How should we handle PII in prompts and logs?

**Minimize** before model calls: drop or mask columns, aggregate where possible, and block categories that violate policy. Use **deterministic redaction** plus classifiers where needed. For **logs**, prefer **structured** events (which tool, which tenant, outcome) over **verbatim** prompts; if full prompts are stored for debugging, enforce **strict** RBAC, **encryption**, and **retention** limits. Tell users not to paste **regulated** data when the product cannot guarantee handling (**LLM02**).

---

## 6) What risks are specific to RAG, beyond “the model hallucinates”?

**Authorization failures** on chunks (wrong tenant or overshared workspace). **Poisoning** of the corpus or crawled web content so malicious passages rank highly. **Stale or wrong** documents producing **confident** wrong answers (**LLM09**). **Embedding** or **chunk-boundary** tricks that hide hostile instructions. Mitigations: **query-time filters** tied to source-system ACLs, **ingestion** integrity and **ACL reconciliation**, **citations**, **golden** regression tests after corpus changes, and **monitoring** of retrieval health (**LLM04**, **LLM08**).

---

## 7) How do you enforce tenant isolation in a vector database?

Treat vectors like **any other datastore**: every upsert carries **stable metadata** (tenant ID, resource ID, labels) from the **authoritative** identity and document store. At query time, the application **must** apply **mandatory** filters; **fail closed** if metadata is missing. **Reindex** or **patch** when source ACLs change. **Test** negative cases in CI: two tenants, overlapping vocabulary, prove **no** cross-leak. **Audit** admin APIs that can search across tenants (**LLM08**, **LLM02**).

---

## 8) What does “excessive agency” mean, and how do you design against it?

**Excessive agency** is when the assistant can **act** (API calls, writes, integrations) with **too much** power or **too few** checks relative to the risk (**LLM06**). Design **narrow** tools (specific operations, not “run arbitrary SQL”), **per-user** delegated credentials, **allowlists** for destinations, **rate limits**, **idempotency** for writes, and **human confirmation** for irreversible actions. **Never** substitute a clever prompt for **OAuth scopes** and **server-side** policy checks.

---

## 9) How do you secure function calling or plugins end to end?

Assume **hostile** arguments and **hostile** sequencing. The **runtime**, not the model, enforces **who** is calling (identity, tenant), **what** tool is allowed for that persona, and **whether** parameters are valid. Use **schemas**, **type checks**, **reference** lookups (“does this ID belong to this user?”), **idempotency** keys, and **audit** trails. Block **open** URL fetchers or **generic** code execution unless heavily sandboxed and justified (**LLM05**, **LLM06**, **LLM10**).

---

## 10) What is improper output handling in LLM systems?

Treating model output as **safe** for **HTML**, **SQL**, **shell**, or **downstream** JSON without the same defenses you use for untrusted user input—leading to **XSS**, **injection**, or **unsafe** tool payloads (**LLM05**). **Mitigate** with encoding, **CSP**, **parameterized** queries, **schema validation** for structured outputs, and **no** “paste assistant output into admin console” shortcuts.

---

## 11) How do you test LLM features for security before and after launch?

Combine **offline** suites (injection strings, indirect injection fixtures, privilege escalation attempts), **RAG** regression tests after **corpus** or **embedder** changes, **red-team** exercises with documented scope, and **production** signals (tool **denials**, policy blocks, anomaly detection on **tokens** and **cost**). **Canary** new models or prompts and compare **security** metrics, not only **quality** scores (**LLM04**, **LLM10**).

---

## 12) What belongs in a red-team engagement against an agent?

Realistic **goals** (exfiltrate another tenant’s doc, send email externally, escalate IAM, burn budget). **Indirect** vectors (poisoned attachment, malicious page). **Tool-chaining** abuse and **retry** loops. **Safe** execution rules (no production customer data without approval). Deliver **severity-rated** findings tied to **controls** (authZ gap vs model weakness) and **retest** criteria.

---

## 13) What is the “LLM supply chain,” and what do you actually review?

Models, **fine-tunes**, **datasets**, **evaluation** harnesses, inference **libraries**, **containers**, **GPU** stacks, and third-party **APIs**—plus the **CI** that builds and deploys them (**LLM03**). Review **version pinning**, **artifact integrity**, **licenses**, **subprocessors** and **regions**, **secret** scanning in repos, and **change control** when swapping weights or default **temperature** and **policy** prompts.

---

## 14) How does governance differ for GenAI versus traditional features?

Same **ownership** lines in principle—AppSec for **threat models** and **patterns**, ML for **data and evals**, platform for **infra and quotas**, legal/privacy for **commitments**—but GenAI adds **non-determinism**, **vendor** dependence, and **data paths** that are easy to **misconfigure** (RAG ACLs, logging). You need **DPIAs**, **model/corpus** inventory, **incident** runbooks for **data spill** and **model degradation**, and **launch** reviews that include **offline** security evals.

---

## 15) What are safe UX patterns for high-risk answers and actions?

Show **citations** and **sources** for grounded answers; surface **uncertainty** instead of false precision. Use **explicit confirmations** with an **immutable** summary for email, payments, deletes, and IAM changes. **Progressive** permission: default **narrow** tools, **step-up** for broader scope. Render assistant output as **untrusted** HTML with **sanitization** and **CSP**. Provide a clear **human escalation** path and **feedback** tied to **trace IDs** (**LLM05**, **LLM06**, **LLM09**).

---

## 16) What is system prompt leakage, and how do you reduce it?

**System prompt leakage** is when **developer** or **system** instructions are exposed through model replies, verbose errors, **debug** endpoints, or **logs** (**LLM07**). Reduce by **minimizing** secret sauce in prompts (policy belongs in **code** where possible), **rate limiting** probing, **safe error** messages, and **log** redaction. Treat leaked instructions as a **defense-in-depth** issue: impact should stay low if **tools** are properly **authorized**.

---

## 17) What is unbounded consumption, and what mitigations matter at scale?

**Unbounded consumption** is runaway **tokens**, **tool loops**, parallel **sessions**, or abuse that drives **cost** and **availability** harm (**LLM10**). Mitigate with **per-user** and **per-tenant** budgets, **concurrency** caps, **timeouts**, **circuit breakers**, **detection** of anomalous **spend**, and **backpressure** on queues. Product and **finance** should align on **alerts** and **throttling** behavior.

---

## 18) Are content safety filters enough for “LLM security”?

**No.** Filters address **abuse** and some **safety** categories but do not replace **authorization**, **tenant isolation**, **output validation**, or **safe tool** design. A polite model can still **call** a tool if the **backend** allows it; a filtered answer can still be **wrong** or **grounded** on **poisoned** docs. Interview answer: **layer** policy—filters plus **authZ** plus **architecture** (**LLM05**, **LLM06**).

---

## 19) A customer asks whether their prompts are used to train your foundation model. What do you verify before answering?

Confirm the **exact SKU** or contract line: **enterprise** vs **consumer**, **zero-retention** claims, **fine-tuning** that uses customer data, and **evaluation** or **human review** programs that might copy transcripts. Read **DPA**, **AI addendum**, **subprocessor** list, and **region** commitments. If marketing says “we don’t train,” ensure that covers **your** integration path (batch vs streaming, attachments, **logging** to third-party observability). Answer customers with **precise** scope: what is **excluded**, what is **logged**, retention, and **who** can access logs (**LLM02**, **LLM03**).

---

## 20) After a red-team, how do you decide whether to fix the model, the prompt, or the application?

**Default bias toward application and tool fixes** when the issue is **privilege**, **data access**, or **unsafe execution**—those should not depend on model niceness. **Prompt and model** changes help with **behavioral** refusals and **quality** but are **brittle** under attack. Prioritize **deterministic** controls: **authZ** bugs first, then **retrieval** ACLs, then **output** validation, then **prompt** hardening, then **model** swaps or **fine-tunes**. Track **regression tests** so “fixes” do not reopen prior **injection** or **leakage** paths (**LLM01**, **LLM06**).

---

<!-- verified-depth-merged:v1 ids=genai-llm-product-security -->
