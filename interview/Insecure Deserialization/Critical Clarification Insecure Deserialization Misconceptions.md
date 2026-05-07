# Critical Clarification — Insecure Deserialization Misconceptions

## 1. "We use HTTPS, so serialized data is trusted."

**Reality:** **TLS** **protects** **transit**—**not** **endpoint** **compromise** or **malicious** **clients**. **Authenticate** **and** **validate** **payloads**.

---

## 2. "JSON is always safe."

**Reality:** **Type** **gadgets** and **parser** **bugs** **exist**. **Schema** **validation** and **safe** **parser** **settings** **matter**.

---

## 3. "We deserialize only our own cookies."

**Reality:** **Clients** **forge** **cookies**—**treat** **as** **untrusted** **unless** **signed** **and** **verified** **with** **strong** **keys**.

---

## 4. "Updating one library fixed deserialization."

**Reality:** **Multiple** **gadget** **packages** **may** **exist**—**SBOM** **and** **recurring** **scans**.

---

## 5. "WAF blocks deserialization attacks."

**Reality:** **Encoded** **payloads** and **nested** **structures** **evade** **signatures**—**fix** **code** **path**.

---

## 6. "Internal RPC is trusted."

**Reality:** **Lateral** **movement** **and** **compromised** **workloads** **send** **malicious** **RPC**—**zero** **trust** **boundaries**.

---

## 7. "Protobuf prevents all object injection."

**Reality:** **Protobuf** **reduces** **graph** **deserialization** **risks** but **implementation** **bugs** and **code** **generation** **issues** **still** **exist**—**not** **magic**.

---

## 8. "Only Java has this problem."

**Reality:** **Every** **ecosystem** with **rich** **native** **serialization** **has** **had** **incidents**—**Python**, **PHP**, **.NET**, **Ruby**.
