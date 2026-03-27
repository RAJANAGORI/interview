# Secure CI CD Pipeline Security - Interview Questions & Answers

## 1) How would you secure GitHub Actions for a high-risk product?
Use ephemeral runners, OIDC-based cloud auth, action pinning by commit SHA, restricted secrets, and environment protection rules.

## 2) What is your approach to balancing speed and security gates?
Risk-tier repositories, run full gates on release branches, lighter checks on feature branches, and enforce exception workflow with expiry.

## 3) What metrics do you report?
Gate bypass rate, false-positive rate, critical findings aging, and signed-artifact verification coverage.
