# Insecure Deserialization - Interview Questions & Answers

## 60-second answer

**Q: What is insecure deserialization?**

**A:** It’s when an application **reconstructs** **objects** from **attacker-controlled** **serialized** **data**—Java **`ObjectInputStream`**, **Python pickle**, **PHP unserialize**, **.NET BinaryFormatter**, etc. The runtime may **invoke** **magic** **methods** that **chain** into **file** **write**, **code** **load**, or **RCE** through **gadget** **libraries** already on the **classpath**. **Fix** by **not** **using** **native** **serialization** for **untrusted** **input**, **prefer** **JSON** + **strict** **schemas**, **signed** **tokens**, **allowlisted** **types**, and **patch** **gadget** **dependencies**. **Detection** includes **SAST** for **dangerous** **APIs** and **behavior** **analytics** for **post-deser** **process** **spawns**.

---

## Mechanism

### Q: What is a gadget chain?

**A:** A **directed** **sequence** of **existing** **class** **methods** **triggered** **during** **deserialization** that **ends** in **harmful** **behavior**—**without** **the** **attacker** **uploading** **new** **code** **to** **disk**.

### Q: Is JSON deserialization always safe?

**A:** **No**—**Jackson** **polymorphic** **typing** **misconfig**, **.NET** **TypeNameHandling**, **JavaScript** **prototype** **pollution** **adjacent** **issues**. **Policy:** **disable** **polymorphism** **unless** **strictly** **needed**; **validate** **DTOs**.

### Q: YAML?

**A:** **`yaml.load`** in **Python** can **construct** **arbitrary** **objects**—use **`safe_load`** or **JSON**.

---

## Defense

### Q: Preferred fix for Java microservices passing objects?

**A:** **Protobuf** / **JSON** **with** **schema**; **JWT** **or** **mTLS** **for** **trust**—**not** **Java** **native** **serialization** **over** **HTTP**.

### Q: How do allowlists work in Java deserialization filters?

**A:** **JEP 290** **filters** / **`ObjectInputFilter`** **restrict** **classes** **allowed** **to** **deserialize**—**defense** **in** **depth** **with** **library** **updates**.

---

## Incident

### Q: Log4j vs deserialization?

**A:** **Log4j** was **JNDI** **lookup** from **log** **data**—**different** **primitive**, **similar** **lesson**: **don’t** **trust** **input** **that** **triggers** **dangerous** **resolution** **paths**.

---

## Depth: Follow-ups

- **PHP** **phar** **metadata** **deserialization** **via** **file** **operations**.  
- **Ruby** **Marshal** in **Rails** **sessions** **(legacy)**.  
- **Kotlin** **serialization** **vs** **Java** **compat**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | **pickle** **risk**. |
| Mid | **Gadget** **definition**. |
| Senior | **Service** **A** **to** **B** **binary** **protocol** **hardening**. |
| Staff | **Enterprise** **ban** **list** **for** **serializers**. |
