# Critical Clarification HTTP Parameter Pollution Misconceptions

## Misconception 1: "Duplicate params are harmless parser noise."
**Clarification:** They can drive security bypasses when different layers choose different values.

## Misconception 2: "Framework default behavior is good enough."
**Clarification:** Defaults vary across frameworks and versions; explicit platform policy is needed.

## Misconception 3: "WAF catches this class automatically."
**Clarification:** If WAF and backend normalize differently, bypass remains possible.

## Misconception 4: "Only query strings are affected."
**Clarification:** Conflicts can happen across query, form, JSON adapters, and gateway merge logic.
