# Secrets Management and Key Lifecycle - Interview Questions & Answers

## 1) How do you stop plaintext secrets in repos?
Pre-commit and CI scanning, immediate revoke/rotate workflow, and mandatory migration to centralized secret retrieval.

## 2) What is your key rotation strategy?
Risk-tiered policy with automated rotation, dual-key rollover windows, and runtime compatibility testing.

## 3) What metrics matter?
Mean secret age, leaked-secret MTTR, rotation success rate, and percentage of workloads using short-lived credentials.
