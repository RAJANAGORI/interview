# GenAI LLM Product Security - Interview Questions & Answers

## 1) How do you mitigate prompt injection?
Isolate system/tool instructions, enforce tool-level authorization, and require explicit confirmation for destructive actions.

## 2) How do you reduce data leakage?
Classify and redact inputs, restrict retrieval scopes, avoid storing raw sensitive prompts, and apply retention controls.

## 3) What would you measure in production?
Unsafe-output rate, blocked high-risk tool calls, data exposure incidents, and policy drift over model updates.
