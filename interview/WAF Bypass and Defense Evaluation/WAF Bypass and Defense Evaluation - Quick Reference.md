# WAF Bypass and Defense Evaluation — Quick Reference

## Model

Edge **inspection** → (optional TLS terminate) → **origin** (**authoritative** security)

---

## Bypass classes

Encoding nest · parser diff (JSON/XML) · **HPP** · multipart tricks · **smuggling-adjacent** normalization · **path** variants

---

## Eval recipe

Baseline attacks · **mutation** matrix · **FP** on prod-like traffic · **log** proof · **latency** / **error** budget

---

## Mitigation stack

**Fix app** → strict edge **normalization** → tuned **virtual patch** → **schema**/mTLS for APIs → **monitor** canaries

---

## Tools

Burp · nuclei · ModSecurity/CRS · cloud WAF logs (AWS/CF/Akamai patterns)

---

## Cross-read

`HTTP Request Smuggling` · `HTTP Parameter Pollution` · `SSRF`

---

## One-liner

“Treat WAF as **parser differential** territory: **measure** FN/FP on **your** routes, **fix** the **app**, use WAF as **depth**.”
