# Secure CI CD Pipeline Security - Comprehensive Guide

## Why it matters
Build systems are production control planes. A pipeline compromise can ship malicious artifacts at scale.

## Core controls
- Ephemeral runners, minimal IAM, and network egress controls.
- Branch protection, signed commits/tags, and mandatory reviews.
- Secretless build patterns (OIDC federation to cloud instead of long-lived keys).
- Artifact signing and verification before deploy.
- Policy gates for SAST, SCA, IaC, and container scans.

## Staff-level talking points
- Define threat model for source, build, artifact, and deploy stages.
- Choose fail-open vs fail-closed by risk tier and environment.
- Track MTTR for broken security gates and false-positive budgets.
