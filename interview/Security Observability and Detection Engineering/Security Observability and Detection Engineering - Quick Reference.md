# Security Observability and Detection Engineering — Quick Reference

## Pipeline mental model

**Generate** telemetry → **normalize** (ECS/OTel) → **retain** by tier → **detect** (rules/ML) → **respond** (SOAR/runbooks) → **learn** (postmortems → new content)

---

## Event fields that pay rent (examples)

`actor.user.id` · `src.ip` / `http.request_id` · `process.executable` · `cloud.region` · `auth.mfa` **bool** · **normalized** **outcome** (`allow`/`deny`)

---

## Detection priorities (order of thinking)

1. **Crown-jewel** **paths** (admin, **money**, **data** **export**, **secret** **read**)  
2. **Identity** **abuse** (impossible travel, **new** **device**, **OAuth** **consent** **spam**)  
3. **Host** **persistence** and **lateral** **movement** **primitives**  
4. **App-layer** **abuse** (rate **spikes**, **coupon** **abuse** **signals**)  

---

## Metrics to quote in interviews

**MTTD** / **MTTR** · **true** **positive** **rate** · **rule** **coverage** vs **ATT&CK** **techniques** (honest gaps) · **backlog** **age** for **tuning** tickets

---

## Tooling buckets (examples)

**SIEM** (Splunk, Chronicle, Sentinel) · **EDR** telemetry · **NDR** · **cloud** **audit** (CloudTrail/AAD/GCP audit logs) · **detection-as-code** (Sigma, KQL, SPL)

---

## Quality bar for a new rule

**Test** with **red** **atomics** / **replay** · **estimate** **FP** **rate** · **owner** · **version** · **deprecation** **date** if **seasonal**

---

## Cross-read

`Risk Prioritization and Security Metrics` · `Windows Security Boundaries` (for host signals) · `IAM and Least Privilege at Scale`

---

## One-liner

“**Signal** over **noise**: **schema-first** logs, **prioritized** **detections**, **continuous** **purple** **validation**.”
