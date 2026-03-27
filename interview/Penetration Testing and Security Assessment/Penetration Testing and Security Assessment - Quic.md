# Penetration Testing and Security Assessment - Quick Reference

## **Testing Types**

| Type | Knowledge Level | Use Case |
| --- | --- | --- |
| **Black-Box** | No internal knowledge | External attacker simulation |
| **White-Box** | Full internal knowledge | Most thorough assessment |
| **Gray-Box** | Limited knowledge | Practical balance |

## **Testing Methodologies**

| Methodology | Focus | Phases |
| --- | --- | --- |
| **PTES** | Penetration testing | 7 phases (pre-engagement to reporting) |
| **OWASP Testing Guide** | Web applications | Comprehensive web app testing |
| **NIST** | Risk-based | Planning, discovery, attack, reporting |

## **Testing Phases (PTES)**

1. Pre-engagement interactions
2. Intelligence gathering
3. Threat modeling
4. Vulnerability analysis
5. Exploitation
6. Post-exploitation
7. Reporting

## **Common Tools**

| Category | Tools |
| --- | --- |
| **Reconnaissance** | Nmap, Masscan, Shodan |
| **Web Testing** | Burp Suite, OWASP ZAP, SQLMap |
| **Network** | Metasploit, Wireshark |
| **Code Analysis** | SonarQube, Checkmarx, Snyk |

## **Risk Prioritization**

| Severity | Description | Fix Timeline |
| --- | --- | --- |
| **Critical** | Active exploitation | Immediate |
| **High** | Significant impact | Current sprint |
| **Medium** | Moderate impact | Next sprint |
| **Low** | Low impact | Backlog |

## **Reporting Elements**

- Executive summary
- Methodology
- Findings with risk ratings
- Proof of concepts
- Recommendations
- Remediation guidance

## **Key Principles**

- Structured methodology
- Risk-based approach
- Combine automated and manual testing
- Clear and actionable reporting
- Follow-up and verification