# CVE Walk-Throughs - Interview Questions & Answers

## 60-second answer

**Q: How should you present a CVE in an interview?**

**A:** I explain the affected surface, root cause, exploit primitive, business impact, detection opportunities, and what a durable fix looks like beyond emergency patching.

---

### Q: Why do interviewers ask about old CVEs like Heartbleed?
**A:** They test security fundamentals: memory safety, patch response, and secret lifecycle handling.

### Q: What’s the biggest mistake in CVE response?
**A:** Treating patching as complete without credential/cert/token rotation and telemetry validation.

### Q: How do you prioritize many CVEs quickly?
**A:** Combine exposure, exploit evidence (KEV/EPSS), asset criticality, and compensating controls.

### Q: Is a single WAF rule an acceptable fix?
**A:** Temporary containment only; root cause and affected dependency versions must be addressed.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Pick one CVE and explain |
| Mid | How did exploitation work? |
| Senior | Incident response sequencing |
| Staff | Programmatic prevention |

