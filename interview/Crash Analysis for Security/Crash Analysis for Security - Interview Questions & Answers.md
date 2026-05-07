# Crash Analysis for Security - Interview Questions & Answers

## 60-second answer

**Q: How do you analyze crashes for security impact?**

**A:** I **reproduce** on a **symbolicated** **build**, **minimize** the **input** or **steps**, and read the **fault** **type**—**heap** **overflow**, **UAF**, **etc.**—from **sanitizer** or **debugger** **output**. I assess whether the **attacker** **controls** the **faulting** **data** and **whether** **mitigations** **like** **ASLR** **change** **practical** **exploitability**. I **dedupe** against **known** **issues**, **assign** **severity** **conservatively**, and **hand** **off** with **clear** **root** **cause** and **fix** **hints**. I **avoid** **calling** **everything** **RCE** **without** **evidence**.

---

## Triage

### Q: What is crash minimization?

**A:** **Shrinking** **input** or **steps** to the **smallest** **case** that **still** **crashes**—**faster** **debugging**, **clearer** **root** **cause**, **better** **regression** **tests**.

### Q: How do you dedupe fuzzer findings?

**A:** **Group** by **stack** **signature** **+** **fault** **class** **+** **component**; **verify** **same** **code** **path** with **minimized** **samples**; **merge** **tickets** **to** **one** **owner**.

---

## Exploitability

### Q: When is a heap buffer overflow not Critical?

**A:** When **overflow** **size** **is** **fixed**, **content** **not** **controlled**, **not** **user** **reachable**, or **strong** **sandbox** **contains** **impact**—**document** **assumptions**.

### Q: What tools help prove exploitability?

**A:** **gdb**/**lldb**, **WinDbg**, **sanitizers**, sometimes **PoC** **hardening** in **VM**—**policy** **dependent**.

---

## Process

### Q: Who owns crash triage in a large org?

**A:** Often **product** **engineering** **first** **pass**; **security** **champions** **or** **PSIRT** **for** **security** **classification**; **clear** **SLA** **avoids** **dropped** **bugs**.

---

## Depth: Follow-ups

- **Production** **crash** **rate** **vs** **security** **sampling**.  
- **False** **positive** **ASan** in **optimized** **builds**?  
- **Symbolic** **execution** **in** **triage** (when **worth** **it**).

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | **ASan** **purpose** |
| Mid | **UAF** **vs** **double** **free** **signal** |
| Senior | **Exploitability** **rubric** **for** **releases** |
| Staff | **Fuzz** **→** **fix** **→** **regression** **metrics** |
