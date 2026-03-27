# GenAI LLM Product Security - Comprehensive Guide

## Risk areas
- Prompt injection and tool misuse
- Sensitive data leakage (training, retrieval, logging)
- Insecure plugin or function-calling permissions
- Model output abuse (fraud, policy bypass, unsafe actions)

## Security controls
- Strict tool authorization and user intent confirmation.
- Data classification and redaction before model submission.
- Output validation, policy filters, and action allowlists.
- End-to-end auditability of prompts, tools, and outcomes.

## Staff-level framing
Treat LLM features as a new trust boundary and design guardrails as product requirements, not post-release patches.
