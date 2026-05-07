# Open Redirect - Interview Questions & Answers

## 60-second answer

**Q: What is an open redirect and how do you fix it?**

**A:** An open redirect lets an attacker supply a **URL**—often via a **`next`**, **`return`**, or **`redirect`** parameter—that the **application** **reflects** into a **`Location`** **header** **without** **proper** **validation**. Users think they’re on a **trusted** **site** but get **sent** to **phishing** or **malware**. The **fix** is **not** **regex** **blacklists** **alone**: **parse** the **URL**, **allowlist** **allowed** **hosts** **or** **use** **path-only** **redirects** **to** **known** **relative** **paths**, and **reject** **protocol-relative** **tricks** like **`//evil.com`**. For **OAuth**, **`redirect_uri`** must **match** **exactly** **per** **framework** **and** **BCP**.

---

## Mechanics

### Q: Why is `//evil.com` dangerous?

**A:** Browsers treat **`//host`** as **scheme-relative**—same **scheme** **as** **current** **page** **but** **attacker** **host**. **Naive** **“starts** **with** **`/`”** **checks** **fail**.

### Q: Relative-only redirects—safe?

**A:** **Safer** if you **enforce** **leading** **`/`**, **reject** **`//`**, **normalize** **path**, and **forbid** **`\`** **and** **encoded** **variants** **per** **your** **framework**.

---

## OAuth

### Q: How does open redirect relate to OAuth?

**A:** **`redirect_uri`** **must** **be** **pre-registered** **and** **compared** **exactly** (no **open** **wildcard** **domains**). **Mishandling** **steals** **authorization** **codes** **or** **implicit** **tokens**.

---

## Severity

### Q: Bug bounty says Low—when do you disagree?

**A:** **OAuth** **in** **path**, **admin** **post-login** **redirect**, **mobile** **app** **deep** **link** **hijack**, or **chain** **to** **SSRF**—**escalate** **with** **evidence**.

---

## Depth: Follow-ups

- **JavaScript** **`location`** **open** **redirect** **vs** **HTTP** **302**  
- **Open** **redirect** **in** **email** **tracking** **links**  
- **CSP** **`navigate-to`** (limited **browser** **support**)

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Define + **one** **impact** |
| Mid | **`//`** **bypass** |
| Senior | **OAuth** **`redirect_uri`** |
| Staff | **Enterprise** **SSO** **standard** |
