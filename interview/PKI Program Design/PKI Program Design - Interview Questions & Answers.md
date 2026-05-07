# PKI Program Design - Interview Questions & Answers

## 60-second answer

**Q: What makes PKI hard in real organizations?**

**A:** Scale and lifecycle discipline. The challenge is maintaining trustworthy issuance and rotation across many services while preventing expiry/revocation incidents.

---

### Q: Why separate root and intermediates?
**A:** It limits blast radius and enables operational issuance without exposing the highest-trust key.

### Q: What is the #1 operational KPI?
**A:** Unknown/expiring certificate count and mean time to renew.

### Q: Is revocation enough after key compromise?
**A:** No. You also need key rotation, re-issuance, and dependency validation.

