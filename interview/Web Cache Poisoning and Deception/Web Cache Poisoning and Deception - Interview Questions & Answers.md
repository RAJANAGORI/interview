# Web Cache Poisoning and Deception - Interview Questions & Answers

## 60-second answer

**Q: Explain web cache poisoning vs cache deception.**

**A:** **Poisoning** makes a **shared** **cache** **store** a **malicious** **response** because some **unkeyed** **header** or **parameter** **changes** the **body** while the **cache** **key** **stays** the **same**—other users **get** **that** **payload**. **Deception** tricks the **cache** into **treating** a **private** **page** as **cacheable** (path tricks, **extension** confusion, **missing** **cookies** in the **key**) so an **attacker** **retrieves** **cached** **secrets**. **Defenses** are **correct** **cache** **keying**, **`Vary`** **discipline**, **no-store** on **sensitive** **routes**, and **CDN** **normalization**.

---

## Mechanics

### Q: What is an unkeyed input?

**A:** Any **request** **field** the **origin** **uses** to **build** the **response** that the **cache** **does** **not** include in its **lookup** **key**—often **obscure** **headers**.

### Q: Does HTTPS stop cache poisoning?

**A:** **No**—**edge** **TLS** **termination** **still** **caches** **HTTP** **representations**; **bugs** are in **keying**, not **encryption**.

---

## Defense

### Q: Quick policy for authenticated HTML?

**A:** **`Cache-Control: private, no-store`** on **HTML** **that** **varies** by **session**; **only** **cache** **static** **assets** with **immutable** **where** **safe**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Define cache key |
| Mid | Unkeyed header example |
| Senior | CDN key design |
| Staff | Global caching policy |
