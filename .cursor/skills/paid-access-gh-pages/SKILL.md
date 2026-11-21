---
name: paid-access-gh-pages
description: >-
  Designs and implements monetization for this GitHub Pages interview site using
  Indian UPI QR (or Razorpay Payment Link) without a self-hosted backend. Use when
  the user asks for paid access, UPI QR unlock, buy page, license delivery, or
  GitHub Pages paywall.
---

# Paid access on GitHub Pages

## Security axiom

**Do not** treat client-side unlocks as the security boundary. Anything in the public `/play` or `/interview` bundle can be copied. Paid value is delivered **outside** the public static tree (private repo invite, emailed private release, short-lived link).

## Canonical flow

1. **Storefront** on Pages: free preview + `/buy/` (or section) with price, inclusions, refund terms, UPI QR / Razorpay link
2. **Pay**: UPI QR (manual) or Razorpay Payment Link/Page (hosted checkout)
3. **Claim**: Tally/Google Form → email + UTR / payment id (no card fields on our HTML)
4. **Verify**: human checks UPI app or Razorpay dashboard (match amount + time)
5. **Fulfill**: private GitHub collaborator invite and/or emailed artifact; optional cosmetic license in `localStorage` only for UX

## Implement on this repo

- Keep marketing on public Pages; do **not** move crown-jewel lesson sources behind `if (localStorage.license)`
- Buy page: match `site-theme` tokens; early `sd-theme` boot; no phishing UX (never ask for UPI PIN)
- Log buyers in a **private** sheet/Notion; never commit PII to the public repo
- Prefer one-time INR price; watermark emailed files with buyer email when practical

## Anti-patterns

- Public JSON allowlist of emails/keys in the repo
- Forever-shared Drive links for all buyers
- Claiming "encrypted lessons" with the key embedded in JS
- Collecting PAN/CVV on static HTML

## When automating later

First real upgrade: a tiny Worker/webhook that verifies Razorpay signatures and emails a signed download URL. Until then, manual verify is safer than fake auto-unlock.
