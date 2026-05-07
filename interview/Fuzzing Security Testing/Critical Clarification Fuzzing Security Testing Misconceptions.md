# Critical Clarification — Fuzzing Security Testing Misconceptions

## 1. "Fuzzing guarantees no bugs remain."

**Reality:** Fuzzing **explores** **stochastic**ally; **logic** **bugs**, **race** **conditions**, and **crypto** **issues** **often** **need** **other** **methods**.

---

## 2. "We can fuzz production APIs directly."

**Reality:** **Unauthorized** **load** **is** **illegal** / **out** **of** **scope**; **fuzz** **staging** **or** **isolated** **services** **with** **approval**.

---

## 3. "No crash means secure."

**Reality:** Silent wrong behavior without a crash (pure logic flaws) may not be caught by crash-only oracles.

---

## 4. "libFuzzer is only for C++."

**Reality:** **Clang** **toolchain** **supports** **C**; **other** **languages** **use** **FFI** **harnesses** or **language-specific** **fuzzers**.

---

## 5. "100% coverage means fuzzed enough."

**Reality:** **Coverage** **≠** **all** **states**; **correlations** **and** **orderings** **matter**.

---

## 6. "Fuzzing replaces pen testing."

**Reality:** **Different** **artifacts**—**fuzz** **finds** **implementation** **bugs**; **pentest** **tests** **whole** **systems** **and** **chains**.

---

## 7. "Sanitizers in production fix security."

**Reality:** **Sanitizers** **are** **for** **test** **builds**—**production** **uses** **hardening** **without** **full** **ASan** **overhead** **typically**.

---

## 8. "One seed is enough."

**Reality:** **Diverse** **small** **seeds** **dramatically** **speed** **reach** **of** **deep** **paths**.
