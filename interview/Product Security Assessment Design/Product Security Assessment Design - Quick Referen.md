# Product Security Assessment Design - Quick Reference

## **Assessment Types**

| Type | Description | When to Use |
| --- | --- | --- |
| **Penetration Testing** | Simulated attack | Identify exploitable vulnerabilities |
| **Code Review** | Source code analysis | Find code-level vulnerabilities |
| **Architecture Review** | Design assessment | Identify design flaws |
| **Compliance Review** | Policy/procedure review | Meet compliance requirements |

## **Assessment Planning Checklist**

- ✅ Define objectives and scope
- ✅ Threat modeling
- ✅ Select assessment types
- ✅ Choose methodology (OWASP, PTES, NIST)
- ✅ Define rules of engagement
- ✅ Risk-based prioritization
- ✅ Tool selection
- ✅ Reporting framework

## **Testing Methodologies**

| Methodology | Focus | Use Case |
| --- | --- | --- |
| **OWASP Testing Guide** | Web applications | Comprehensive web app testing |
| **PTES** | Penetration testing | Structured penetration testing |
| **NIST** | Risk-based | Risk assessment approach |

## **Risk Prioritization**

| Priority | Description | Fix Timeline |
| --- | --- | --- |
| **Critical** | Active exploitation possible | Immediate |
| **High** | Significant impact | Current sprint |
| **Medium** | Moderate impact | Next sprint |
| **Low** | Low impact | Backlog |

## **Testing Focus Areas (OWASP Top 10)**

1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Software/Data Integrity Failures
9. Security Logging Failures
10. SSRF

## **Key Principles**

- Risk-based approach
- Combine automated and manual testing
- Continuous assessments (not one-time)
- Holistic evaluation (people, process, technology)
- Actionable reporting