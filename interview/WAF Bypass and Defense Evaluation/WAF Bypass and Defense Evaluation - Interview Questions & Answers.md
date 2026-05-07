# WAF Bypass and Defense Evaluation - Interview Questions & Answers

## 60-second answer

**Q: How do attackers bypass WAFs, and how do you evaluate whether yours works?**

**A:** Bypasses usually exploit **parser or encoding differentials**—the WAF normalizes or matches literals differently than the application. I evaluate with **baseline** attacks on **staging** that mirror prod routes, then **systematic mutations** (encoding layers, JSON tricks, duplicated parameters, alternate content types). I measure **false positives** on real traffic samples and review **logs** for **silent** misses. The **primary** fix stays in the **application**; the WAF is **temporary** containment or **additional** friction.

---

## Mechanics

### Q: WAF inline vs reverse proxy—what changes for bypass?

**A:** **TLS termination** point changes what you can inspect and **which headers** you trust. **Path** and **host** routing may differ between **CDN** and **origin**, creating **alternate** entry paths that **skip** intended rules.

### Q: Give three bypass classes without naming vendor bugs.

**A:** **Double encoding**, **JSON Unicode escapes / duplicate keys**, **HTTP parameter pollution** where WAF and app disagree on concatenation order.

---

## Evaluation

### Q: What’s in your pre-production WAF test plan?

**A:** **Coverage** of all **external** routes, **positive** traffic **FP** sampling, **blocked** vs **logged** policy checks, **latency** budget, and **rollback** if **error rate** spikes.

### Q: How do you handle APIs that break under aggressive WAF rules?

**A:** **Tune** per-route; prefer **schema validation** and **authN/Z** at the gateway; use **positive** **allow-lists** for machine clients instead of **generic** **L7** **regex** storms.

---

## Senior / staff

### Q: When would you recommend removing WAF reliance?

**A:** When **mTLS + strict schema + narrow** **surface** provide **stronger** guarantees with **lower** **operational** **toil**, or when WAF **FP** **destabilizes** revenue paths and teams **chronically** **disable** rules.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | WAF vs firewall |
| Mid | Encoding bypass example |
| Senior | Evaluation methodology |
| Staff | Strategic reliance vs elimination |
