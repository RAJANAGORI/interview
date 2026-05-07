# Fuzzing Security Testing - Interview Questions & Answers

## 60-second answer

**Q: What is fuzzing and how is it used in security testing?**

**A:** Fuzzing automatically **generates** and **mutates** inputs against an API or parser to **find** **crashes** and **undefined** behavior. **Coverage-guided** engines like **AFL++** and **libFuzzer** **keep** inputs that **explore** **new** **code** paths, which is far more effective than **pure** **random** bytes. We pair fuzzing with **AddressSanitizer** to **turn** **subtle** **memory** bugs into **clear** **failures**. **Outputs** go through **crash** **triage** to decide **security** **severity**. Fuzzing is **complementary** to **SAST**, **reviews**, and **formal** tests—not a **replacement**.

---

## Mechanics

### Q: Dumb vs coverage-guided?

**A:** **Dumb** fuzzing **doesn’t** **learn** from **execution**—cheap but **shallow**. **Coverage-guided** uses **instrumentation** to **prefer** **mutations** that **hit** **new** **edges**—**much** **deeper** **bug** **discovery** **per** **CPU** **hour**.

### Q: What makes a bad fuzz harness?

**A:** **Too** **large** **surface** per **iteration**, **shared** **mutable** **state** **without** **reset**, **network** **I/O** **inside** **the** **loop**, or **timeouts** **too** **short** **so** **legit** **paths** **never** **complete**.

---

## Operations

### Q: Where should fuzzing run?

**A:** **Dedicated** **workers** or **nightly** **CI**—not **every** **PR** **if** **runtime** **is** **hours**; **gate** **releases** on **no** **new** **high** **severity** **crashes** **in** **main** **branch** **campaigns**.

### Q: OSS-Fuzz—what is it?

**A:** **Google**-operated **service** **pattern** for **open** **source**: **maintainers** **submit** **projects** with **harnesses**; **continuous** **fuzzing** **finds** **bugs** **early**.

---

## Depth: Follow-ups

- **Grammar-based** vs **mutation** for **structured** **inputs**  
- **Differential** fuzzing (compare **two** **implementations**)  
- **Fuzzing** **WebAssembly** or **JIT** **edges** (advanced)

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Define **coverage** **feedback** |
| Mid | **ASan** + **fuzz** **why** |
| Senior | **CI** **integration** **trade-offs** |
| Staff | **Portfolio** **risk** **coverage** **metrics** |
