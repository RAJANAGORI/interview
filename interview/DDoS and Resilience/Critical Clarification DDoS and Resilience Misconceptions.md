# Critical Clarification — DDoS and Resilience

## Misconception 1: “Our autoscaler fixes DDoS”

**Truth:** Autoscaling can **amplify cost** and **destabilize** dependencies. You need **edge controls**, **quotas**, and **financial** guardrails—not only more instances.

---

## Misconception 2: “DDoS is only volumetric”

**Truth:** **Application-layer** and **economic** DoS (expensive queries, account creation floods) can hurt without huge packet volume.

---

## Misconception 3: “TLS stops DDoS”

**Truth:** TLS protects **confidentiality/integrity** of data in transit—not **availability** against floods of legitimate-looking TLS handshakes or L7 requests.
