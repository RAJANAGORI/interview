# Critical Clarification Server-Side Template Injection Misconceptions

## Misconception 1: "Escaping HTML is enough."
**Clarification:** HTML escaping helps client output safety, not server-side template code execution risks.

## Misconception 2: "Only old template engines are vulnerable."
**Clarification:** Any engine can be risky if used in dynamic/unsafe rendering patterns.

## Misconception 3: "SSTI is just another XSS."
**Clarification:** SSTI is server-side and can impact backend secrets, filesystem access, and process execution.

## Misconception 4: "WAF signatures solve SSTI."
**Clarification:** WAF may catch obvious payloads but does not replace safe template architecture.
