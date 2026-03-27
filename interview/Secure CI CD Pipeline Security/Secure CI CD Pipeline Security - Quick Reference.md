# Secure CI CD Pipeline Security - Quick Reference

## Checklist
- Use ephemeral runners
- Use OIDC, avoid static cloud keys
- Pin third-party actions and build plugins
- Sign artifacts and verify before deploy
- Enforce branch protection and CODEOWNERS
- Record and expire all gate exceptions
