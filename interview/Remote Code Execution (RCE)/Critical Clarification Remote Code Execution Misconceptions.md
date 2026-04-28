# Critical Clarification Remote Code Execution Misconceptions

## Misconception 1: "RCE always means immediate root compromise."
**Clarification:** Impact varies by runtime privileges and isolation, but still tends to be high/critical because attackers can often escalate or pivot.

## Misconception 2: "WAF blocks command injection so RCE risk is solved."
**Clarification:** WAF is bypassable and does not cover all RCE vectors (deserialization, plugin CVEs, template escapes).

## Misconception 3: "Patch once and close incident."
**Clarification:** You also need forensic scoping, secret rotation, persistence checks, and regression controls.

## Misconception 4: "RCE is only an application bug."
**Clarification:** Runtime posture, IAM, network controls, and observability strongly influence real-world impact.
