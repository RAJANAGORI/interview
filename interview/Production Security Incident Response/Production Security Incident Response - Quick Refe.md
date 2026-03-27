# Production Security Incident Response - Quick Reference

## **Incident Response Lifecycle**

1. **Preparation** - Policies, procedures, tools
2. **Detection** - Identify incidents
3. **Containment** - Limit scope and impact
4. **Eradication** - Remove threat
5. **Recovery** - Restore operations
6. **Post-Incident** - Lessons learned

## **Response Priority Order**

1. **Contain** - Stop ongoing damage (FIRST)
2. **Investigate** - Understand what happened
3. **Eradicate** - Remove threat completely
4. **Recover** - Restore normal operations
5. **Remediate** - Fix root cause (after containment)

## **Containment Strategies (Least to Most Disruptive)**

| Strategy | Disruption | When to Use |
| --- | --- | --- |
| Isolate affected systems | Low | Specific systems compromised |
| Disable compromised accounts | Low | Account-level compromise |
| Block malicious IPs | Low | Known attacker IPs |
| Quarantine data | Medium | Data-level compromise |
| Take services offline | High | Widespread compromise |
| Full system shutdown | Very High | Last resort |

## **Incident Classification**

| Severity | Description | Response Time |
| --- | --- | --- |
| **Critical** | Active exploitation, data breach | Immediate |
| **High** | Successful attack, potential exposure | < 1 hour |
| **Medium** | Attack attempt, potential impact | < 4 hours |
| **Low** | Suspicious activity | < 24 hours |

## **Communication Checklist**

- ✅ Notify incident response team immediately
- ✅ Regular status updates (every 1-2 hours)
- ✅ Stakeholder communication (appropriate level)
- ✅ Document everything
- ✅ Don't speculate, communicate facts

## **Post-Incident Activities**

- Root cause analysis
- Timeline reconstruction
- Remediation of root cause
- Process improvements
- Lessons learned documentation
- Follow-up security assessment

## **Key Principles**

- Contain first, fix root cause later
- Document everything
- Communicate regularly
- Balance security with availability
- Learn from every incident