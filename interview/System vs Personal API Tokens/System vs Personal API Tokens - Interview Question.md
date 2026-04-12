# System vs Personal API Tokens - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamental questions

### Q1: What is the difference between a “system” API token and a “personal” one?

**Answer:** A **personal** token is minted for a **human user** and, unless the platform adds fine-grained limits, generally inherits that user’s permissions. Audit entries often show **the user’s identity**, which is useful until the same token is pasted into a **shared** runner or server—then “Alice” in the log may not mean Alice’s laptop. A **system** token is intended for **automation**: service accounts, GitHub App installation tokens, OAuth **client credentials**, workload IAM roles, and similar. It should be **owned by a team or workload**, stored in a **secret manager**, rotated on a **schedule or automatically** (short TTL), and scoped to **what the job needs**, not what a full engineer account can do. Neither type is automatically safer; a broad system secret in a pod spec can be worse than a narrowly scoped personal token on one machine.

---

### Q2: When would you choose a service account or workload identity instead of a developer’s PAT?

**Answer:** Use **service principals** when the actor is **software** that must keep running independent of any one employee: microservices, schedulers, CI publishing artifacts, or integrations owned by a team. PATs couple automation to **HR lifecycle**—when someone leaves or their account is suspended, jobs break or, worse, teams **share** a PAT to avoid that pain. Workload identity and OIDC federation from CI to cloud replace long-lived secrets with **short-lived credentials** tied to the **repository and environment**. PATs remain reasonable for **individual** scripting on a laptop when they are **fine-grained**, **expiring**, and **not** placed in shared infrastructure.

---

### Q3: How does OAuth client credentials differ from an authorization code flow from a security perspective?

**Answer:** The **authorization code** flow (ideally with **PKCE** for public clients) is for **user delegation**: the resource owner signs in and **consents**; tokens represent **limited** access on their behalf. Logs and consent records support **who approved what**. **Client credentials** is **machine-to-machine**: the client authenticates with its own secret or assertion and receives tokens **without a user in the loop**. There is **no end-user subject** unless you add custom claims or enforce policy elsewhere. Client secrets must be **confidential** (server-side only), **rotated**, and **scoped** minimally. Refresh tokens from user flows are especially sensitive—**long-lived bearer secrets** that must be **encrypted**, **revocable**, and **monitored**.

---

### Q4: What are the main risks of personal access tokens (PATs) in production systems?

**Answer:** PATs often inherit **broad user power**, are **static bearer strings** easy to exfiltrate from logs or tickets, and encourage **reuse** across hosts so audit trails lie. **Offboarding** disables the user but teams may have copied the token into vaults or scripts nobody updates. In **CI**, a PAT on a shared runner is effectively a **shared root** if it can push to main or read secrets. Mitigations include **fine-grained** PATs, **mandatory expiry**, **org policies** restricting classic tokens, **SSO-backed** authorization where available, and replacing PAT-based automation with **app installations** or **OIDC**-based cloud roles.

---

### Q5: How would you design least privilege for API tokens at scale?

**Answer:** Start from **API operations and resources**, not from role names. Split tokens by **function** (read metrics vs deploy vs admin) and by **environment**. Prefer **resource-scoped** credentials (single repo, single project) over org-wide access. Enforce **authorization** on every request: tenant ID, project ID, or repo slug must match the token’s scope even if the token is valid. Use **time-bound** elevation for rare operations. Measure **scope creep**: periodic review of which tokens still need each permission. At the platform level, push **defaults** toward short TTL and narrow scopes so developers do not have to fight the tool to do the right thing.

---

### Q6: What does a solid token rotation program look like for system secrets?

**Answer:** Maintain an **inventory**: owner team, consumers, scope, creation date, and next rotation. For **opaque** secrets, support **overlap**: new token valid while old still works for a defined window, then revoke old. Automate **rotation** via the secret manager or provider API; alert **before** expiry. For **JWT-signing keys**, use **key IDs** in headers so verifiers can roll without simultaneous global downtime. Document **runbooks** for failure modes (missed rotation, partial deploy). After rotation, verify **logs** show success on all critical paths. Avoid “one org admin PAT” that never rotates—split and shorten instead.

---

### Q7: What should audit logs capture for token-based API access?

**Answer:** Log **who or what** authenticated: user id, service principal id, OAuth **client id**, or GitHub **installation id**—not only “API key valid.” Include **authentication method**, **token fingerprint or key id** (never the secret), **scopes or roles** used for the decision, **resource** acted on, **allow/deny**, and **correlation id** across services. For security operations, also log **token minting**, **refresh**, **failed validation**, and **revocation**. Personal tokens used from **shared IPs** should trigger **review**; purely technical fields help **incident** scoping without storing bearer material.

---

### Q8: Compare GitHub fine-grained PATs, GitHub Apps, and OAuth Apps in an interview-friendly way.

**Answer:** **Fine-grained PATs** are still **user** credentials but can be limited to **specific repos** and **explicit** permissions—better blast radius than classic PATs when configured well. **GitHub Apps** are **installation-based**: admins approve permissions per org/repo; **installation access tokens** are **short-lived**, which is ideal for **automation** and reduces long-lived user-equivalent secrets. **OAuth Apps** implement **user** delegation flows; access (and sometimes refresh) tokens represent **user grants**—right for “connect GitHub to our product,” with emphasis on **redirect URI** validation and **secret** protection. For org automation, prefer **GitHub Apps**; for user-centric SaaS, **OAuth Apps**; for ad-hoc scripts, **fine-grained PATs** with expiry—not classic org-wide PATs in CI.

---

### Q9: Why is storing a PAT in CI secrets considered an anti-pattern, and what do you use instead?

**Answer:** CI is **multi-tenant shared compute**: logs, caches, fork workflows, and compromised dependencies can expose secrets. A PAT often equals **full user** power over repos. Prefer **OIDC** so the job proves **which repo and ref** it is, then receives **short-lived** cloud or provider credentials. On GitHub specifically, prefer **GitHub Actions** permissions with **GITHUB_TOKEN** where sufficient, or **GitHub Apps** for cross-repo operations. If a static secret is unavoidable, isolate it in **protected environments**, require **manual approval** for production, **never** expose it to **fork** PR workflows, and **rotate** aggressively.

---

### Q10: How does enterprise SSO interact with PAT and API security?

**Answer:** **SSO** strengthens **interactive** login (MFA, conditional access, centralized session end). It does **not** automatically invalidate **PATs** or **OAuth refresh tokens** minted earlier; those remain **bearer secrets** until **revoked** or **expired**. Strong programs combine SSO with **org policies**: restrict PAT creation, require **SSO** for certain token operations, enforce **maximum lifetimes**, and hook **HR offboarding** to **bulk revocation** of grants. Educate that “we use SAML” is not the same as “we have no long-lived API secrets.”

---

### Q11: What is the blast-radius difference between org-wide and resource-scoped tokens?

**Answer:** **Org-wide** (or classic broad PAT) compromise may allow access to **every** repository, package registry, or project the user or service can reach—attackers pivot fast. **Resource-scoped** tokens limit damage to **one** repo, project, or narrow permission set. In interviews, tie this to **lateral movement**: stolen CI credentials are often used to **modify** build definitions or **steal** other secrets. Smaller scopes reduce **what** can be touched and simplify **revocation** (disable one installation instead of invalidating all automation).

---

### Q12: How do JWT access tokens change your revocation and logging story?

**Answer:** JWTs are often validated **locally** using a **JWKS** without calling the issuer per request, so **standard revocation** before expiry may require **short TTLs**, **denylists**, or **session version** claims. Logging must record **claims** that matter (`sub`, `client_id`, `scope`, `jti` if present) and **key id** used to verify. **Rotation** of signing keys must be **backward-compatible** during rollout. Stress in interviews that **signed** does not mean **safe**—bearer theft still works until expiry unless you add **binding** (mTLS, DPoP) or **very** short lifetimes.

---

### Q13: What operational metrics would you use to govern API tokens?

**Answer:** Track **count** of active long-lived tokens, **median age**, **percentage with expiry**, **tokens without owner** or last-used in 90 days, and **CI jobs** still using static PATs vs OIDC. For incidents, measure **time to revoke** after termination. Executive-facing: **trend** of reduced broad PATs and **coverage** of secret scanning on repos. Tie metrics to **remediation** workflows (auto-nag owners, auto-disable stale tokens) not only dashboards.

---

### Q14: Walk through your response if a production API token is found in a public GitHub repository.

**Answer:** **Revoke** the credential immediately at the issuer. Pull **audit logs** for that principal from **before** publication time to estimated discovery. **Rotate** any downstream secrets the token could read (e.g., deployment keys, cloud roles). **Hunt** for the same pattern in other repos and **gists**. **Root-cause**: accidental commit, bad `.gitignore`, fork workflow leaking env, or developer using repo for config. Fix with **push protection**, **pre-commit** scanning, and **OIDC** to remove the secret class. **Communicate** per policy if customer data was accessible. Document **lessons** in the incident record.

---

### Q15: When is it acceptable for a third-party integration to use a user’s PAT instead of OAuth?

**Answer:** Generally **discourage** PAT handover to vendors: users cannot easily **scope** time or permission, and vendors store a **high-value** static secret. Prefer **OAuth** with **scoped** grants, **refresh** rotation, and **revocation** in the vendor dashboard. If a legacy tool only accepts PATs, require **minimum** scope, **expiry**, **contractual** data-handling terms, and **monitoring** for abuse; migrate to **OAuth** or **service** integration on a roadmap. From a product security lens, **never** ask users to paste PATs into **untrusted** surfaces without strong justification.

---

### Q16: How do you prevent “shared bot accounts” from undermining accountability?

**Answer:** **Shared** credentials destroy **non-repudiation** and complicate **rotation** (“who still has the password?”). Replace with **named service accounts** per system or **GitHub App** installations where **audit** shows the app and **actor** context. If a shared account is unavoidable temporarily, enforce **vault-only** access, **break-glass** procedures, **MFA** for human use, and **aggressive** rotation with **documented** owners. Long term, map automation to **identity providers** that support **per-pipeline** or **per-workload** principals.

---

### Q17: What is token binding (e.g., mTLS, DPoP) and when does it matter?

**Answer:** **Bearer** tokens mean **anyone who holds the string** can use them. **Binding** ties the token to a **client key** or **channel** (mTLS client certificate, DPoP proof key) so replay from a different TLS context fails. It matters for **high-risk** APIs, **mobile** clients where storage is weaker, or when **passive** network attackers are in threat model. Tradeoffs: **complexity**, **library** support, and **latency**. In interviews, mention it as **defense in depth** after **TLS**, **short TTL**, and **scope** minimization—not as a first-line excuse to skip those.

---

### Q18: How would you explain the tradeoff between opaque API tokens and JWTs to an engineering lead?

**Answer:** **Opaque** tokens are simple: server looks up **state** and can **revoke** instantly by deleting the row, but **lookup** cost and **central** bottlenecks grow with scale. **JWTs** scale reads: services verify **signatures** locally and trust **claims**, enabling **federated** architectures, but **revocation** is weaker unless TTLs are **short** or you add **introspection** or **denylists**. Product security input: pick **TTL** and **key rotation** policies that match **risk**, **force** audience and issuer checks, and **never** put **sensitive** data in JWT claims without encryption—**confidentiality** is not the primary JWT property for access tokens.

---

## Depth: Interview follow-ups — System vs Personal API Tokens

**Authoritative references:** Provider docs (GitHub, Azure DevOps, etc.) for **fine-grained PATs** vs **GitHub Apps/OAuth apps** patterns—cite generically in interview; [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749) for delegation model.

**Follow-ups:**

- **Non-repudiation / audit:** personal tokens tie actions to humans; system tokens need service identity + rotation.
- **Blast radius:** org-wide PAT vs repo-scoped token.
- **Rotation & offboarding** — what breaks when someone leaves?

**Production verification:** Token inventory, expiry, scoped permissions, audit logs for high-risk operations.

**Cross-read:** OAuth, IAM at Scale, Secrets Management.

<!-- verified-depth-merged:v1 ids=system-vs-personal-api-tokens -->
