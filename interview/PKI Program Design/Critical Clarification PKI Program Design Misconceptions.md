# Critical Clarification — PKI Program Design Misconceptions

## 1. "Let's Encrypt handles PKI so we don't need a program."
**Wrong.** Public ACME solves **public DV TLS** only—not **mTLS**, **code signing**, **internal service identity**, or **inventory/discipline** for non-ACME certs.

## 2. "Longer certificate lifetime reduces operational risk."
**Wrong.** Long lifetimes **delay rotation skill** and **extend compromise window**. Industry moves to **90-day or shorter** with automation.

## 3. "Wildcard certs simplify security."
**Wrong.** Wildcards **expand blast radius**—one private key protects all subdomains; strict **issuance policy** and **monitoring** required.

## 4. "Revocation always saves you."
**Wrong.** Clients **soft-fail OCSP**; **revocation is slow**. **Short-lived certs + automation** are primary; revocation is **incident response**.

## 5. "Copying the same cert to all load balancers is fine."
**Wrong.** **Key proliferation** increases leak risk; prefer **centralized issuance** or **per-node short-lived** certs via automation.

## 6. "Private CA means we don't need to monitor expiry."
**Wrong.** Internal certs cause **major outages** when forgotten—often worse visibility than public CAs.

## 7. "mTLS replaces application authorization."
**Wrong.** mTLS proves **service identity** at transport layer; **authZ** for data/actions still required.

## 8. "CT logs are only for public CAs."
**Mostly public**, but the **mis-issuance detection** mindset applies—audit **internal CA logs** similarly.
