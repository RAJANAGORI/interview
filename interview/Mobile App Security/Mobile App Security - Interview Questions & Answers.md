# Mobile App Security - Interview Questions & Answers

## 60-second answer

**Q: What are the highest-risk mobile security mistakes?**

**A:** Trusting client logic for authorization, storing tokens insecurely, weak certificate validation, and assuming jailbreak/root detection is a complete defense.

---

### Q: Is SSL pinning always recommended?
**A:** Useful in some threat models, but it adds operational fragility; pair with robust backend controls and rotation strategy.

### Q: Where should sensitive credentials live?
**A:** Platform secure storage (Keychain/Keystore), with short-lived tokens and server-side revocation.

### Q: Can mobile obfuscation replace backend security?
**A:** No. Obfuscation only raises reverse-engineering cost.

