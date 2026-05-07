# Serverless Security - Interview Questions & Answers

## 60-second answer

**Q: What fails most often in serverless security?**

**A:** Over-scoped execution roles, weak event-source trust validation, leaked secrets in environment/logs, and dependency-chain issues.

---

### Q: How do you secure webhook-triggered functions?
**A:** Verify signatures, enforce timestamp windows, and reject replayed events.

### Q: Are environment variables acceptable for secrets?
**A:** Prefer secret manager retrieval and strict redaction; avoid long-lived plaintext secrets.

### Q: Is serverless "secure by default"?
**A:** Safer in some infra dimensions, but identity and application logic risks remain.

