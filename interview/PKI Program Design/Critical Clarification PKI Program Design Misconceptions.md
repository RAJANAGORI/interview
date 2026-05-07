# Critical Clarification — PKI Program Design Misconceptions

## 1. "PKI is just buying certificates."
**Reality:** It is an identity trust and lifecycle operations program.

## 2. "Revocation always works instantly."
**Reality:** Client behavior and cache effects can delay effective revocation.

## 3. "One internal CA is simpler and safer."
**Reality:** Segmentation by environment/use case reduces blast radius.

## 4. "Short cert validity eliminates governance needs."
**Reality:** Automation and inventory discipline are still required.

## 5. "If TLS works, PKI is healthy."
**Reality:** Hidden expiry and issuance policy drift can still be severe.

## 6. "Private key theft is rare."
**Reality:** Key exposure incidents happen through CI, logs, and host compromise.

## 7. "Manual renewal is manageable."
**Reality:** At scale it is outage-prone and error-prone.

## 8. "PKI is only security team scope."
**Reality:** Platform, SRE, and application owners must co-own rollout.

