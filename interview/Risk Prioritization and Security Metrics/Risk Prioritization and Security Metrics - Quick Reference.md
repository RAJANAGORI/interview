# Risk Prioritization and Security Metrics - Quick Reference

## Prioritization inputs (stack rank mentally)

1. **Asset tier** (tier-0 crown jewels first)  
2. **Exposure** (internet, partner, internal)  
3. **Exploitability** (pre-auth, public exploit, **KEV**)  
4. **Blast radius** (single tenant vs multi-tenant; data class)  
5. **Active signals** (abuse, incidents, bounty trend)  

**Risk ≈ impact × likelihood** — likelihood includes **exploit probability** and **attacker reach**.

## External prioritization references (validated)

- **EPSS** — exploit **probability** ([FIRST EPSS](https://www.first.org/epss/))  
- **CISA KEV** — **known exploited** CVEs ([KEV catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog))  
- **SSVC** — stakeholder-specific prioritization ([CISA SSVC](https://www.cisa.gov/ssvc))  

## Outcome metrics (good)

- Tier-0 **risk burn-down**  
- **Incident** trend and severity  
- **Mean time to remediate** criticals / KEV items  
- **Exception** debt (count + age + expiry compliance)  
- **Control coverage** (signed artifacts, MFA, JIT, etc.)  

## Throughput metrics (health)

- SLA adherence by **tier**  
- Backlog **aging**  
- **False-positive** rate / analyst capacity  

## Pitfalls

CVSS-only · scan counts · closure rate without tier awareness · dashboards that drive no action  

## One-liner

**Prioritize like an investor: tier, exposure, exploit activity, and blast radius—not just CVSS.**
