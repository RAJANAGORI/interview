# Critical Clarification — Rate Limiting and Abuse Prevention

## Misconception 1: “Rate limiting stops all bots”

**Truth:** Sophisticated actors stay **below** thresholds across many IPs/accounts. You need **behavioral** signals, **device** context, and **business** rules—not only request counts.

---

## Misconception 2: “429 errors mean we’re secure”

**Truth:** Clients may **retry** aggressively; attackers may **tune** to your limits. Measure **outcomes**: fraud rate, scraping volume, service health—not only HTTP status codes.

---

## Misconception 3: “Same limit for every endpoint”

**Truth:** **Expensive** operations (exports, searches, admin) deserve **tighter** or **token-cost** based limits than cheap reads.
