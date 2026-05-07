# Critical Clarification — Secrets Management and Key Lifecycle Misconceptions

## 1. “Deploying Vault/AWS Secrets Manager solves secrets.”

**Reality:** **Rotation**, **IAM** **to** **the** **vault**, **break-glass**, **audit** **review**, and **client** **library** **discipline** **still** **fail** **without** **process**.

---

## 2. “Long-lived API keys are fine for internal services.”

**Reality:** **Insider** threats, **repo** **leaks**, and **lateral** **movement** **love** **static** **keys**—prefer **OIDC** **workload** **identity** and **short-lived** **tokens**.

---

## 3. “Annual rotation is enough.”

**Reality:** **Rotation** **cadence** should **match** **blast** **radius** and **exposure** (public **edge**, **admin** **scopes** → **weeks** or **event-driven**).

---

## 4. “Encryption at rest in KMS means secrets are safe in logs.”

**Reality:** **Logs** often **capture** **plaintext** **by** **mistake**; **KMS** **protects** **storage**, not **developer** **errors**.

---

## 5. “Developers can keep .env files locally—prod is locked down.”

**Reality:** **Laptops** **are** **targets**; **prod** **parity** **secrets** on **disk** **enable** **supply** **chain** and **theft**—**use** **ephemeral** **dev** **credentials**.

---

## 6. “One HSM/KMS key for everything simplifies security.”

**Reality:** **Blast** **radius** **balloons**; **separate** **keys** **by** **tenant**, **environment**, or **data** **class** with **clear** **rotation** **plans**.

---

## 7. “Git secret scanning replaces vault discipline.”

**Reality:** **Scanners** **miss** **encoded** **secrets** and **non-Git** **paths**; **prevent** **commit** **hooks** + **vault** **patterns** **together**.

---

## 8. “Third-party SaaS API keys aren’t crown jewels.”

**Reality:** **Keys** **often** **equal** **full** **tenant** **admin**—**tier** them like **production** **database** **creds**.

---

## 9. “Key rotation without app support is security’s job alone.”

**Reality:** **Dual-sign** **keys**, **blue/green** **consumers**, and **coordination** **windows** need **engineering** **ownership**—**ops** **runbooks** **required**.

---

## 10. “BYOK absolves the cloud provider of liability.”

**Reality:** **Compliance** **posture** may **improve**, but **your** **key** **usage** **policy** and **access** **logging** **remain** **your** **problem**.
