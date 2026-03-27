# Production Security Incident Response - Interview Questions & Answers

## **Fundamental Questions**

### **Q1: How would you handle a reported security incident in a live production environment?**

**Answer:**

**Initial Response (First 15-30 minutes):**

1. **Validate and Triage**
    - Confirm it's a real security incident (not false alarm)
    - Assess initial severity and impact
    - Classify incident type (data breach, system compromise, DDoS, etc.)
    - Notify incident response team
2. **Contain Immediate Threat**
    - **Contain first, investigate later** - prioritize stopping ongoing damage
    - Isolate affected systems if needed
    - Disable compromised accounts/credentials
    - Block malicious IPs if identified
    - Use least-disruptive containment method when possible
3. **Preserve Evidence**
    - Document everything (logs, screenshots, timeline)
    - Preserve logs and system state
    - Take snapshots if possible
    - Maintain chain of custody
4. **Communication**
    - Notify incident response team
    - Alert key stakeholders (engineering, operations, legal)
    - Set up communication channel (Slack, war room)
    - Begin incident log

**Containment Phase:**

1. **Containment Strategy Selection**
    - **Short-term containment**: Immediate actions to stop attack
    - **Long-term containment**: Temporary fixes while preparing eradication
    - Balance security with business operations
2. **Containment Actions**
    - Isolate affected systems from network
    - Disable compromised accounts, API keys, or tokens
    - Block malicious IPs or domains
    - Quarantine affected data
    - Take affected services offline if necessary (last resort)
3. **Monitor for Continued Activity**
    - Monitor systems for ongoing attack
    - Check for lateral movement
    - Verify containment effectiveness

**Eradication and Recovery:**

1. **Eradication**
    - Remove threat completely (malware, backdoors)
    - Patch vulnerabilities
    - Remove compromised accounts/credentials
    - Close attack vectors
2. **Recovery**
    - Restore systems from clean backups
    - Verify system integrity
    - Restore services gradually
    - Monitor for reinfection

**Post-Incident:**

1. **Root Cause Analysis**
    - Timeline reconstruction
    - Identify vulnerability and attack vector
    - Document what happened and why
2. **Remediation**
    - Fix root cause
    - Improve security controls
    - Update processes
    - Enhance monitoring
3. **Communication**
    - Update stakeholders regularly
    - Customer notification if required (data breach)
    - Post-incident report
4. **Lessons Learned**
    - What went well?
    - What could improve?
    - Process improvements
    - Training needs

**Key Principles:**

- **Contain first, fix root cause later**
- **Document everything**
- **Communicate regularly**
- **Balance security with availability**
- **Learn from every incident**

---

### **Q2: What's your process for handling a production security incident?**

**Answer:**

**Process Overview:**

1. **Preparation** (Before incidents)
    - Documented incident response plan
    - Defined roles and responsibilities
    - Communication channels established
    - Tools and access prepared
    - Regular drills and practice
2. **Detection**
    - Security monitoring alerts
    - User reports
    - External notifications
    - Anomaly detection
3. **Triage**
    - Validate incident
    - Assess severity and impact
    - Classify incident type
    - Assign incident response team
4. **Containment**
    - Immediate containment actions
    - Monitor effectiveness
    - Adjust containment if needed
5. **Investigation**
    - Gather evidence
    - Analyze attack vector
    - Determine scope and impact
    - Timeline reconstruction
6. **Eradication**
    - Remove threat
    - Patch vulnerabilities
    - Close attack vectors
7. **Recovery**
    - Restore services
    - Verify integrity
    - Monitor for issues
8. **Post-Incident**
    - Root cause analysis
    - Remediation
    - Lessons learned
    - Process improvements

---

## **Incident Response Process**

### **Q3: How do you balance containment speed with investigation needs?**

**Answer:**

**Approach:**

1. **Containment Takes Priority**
    - Stop ongoing damage first
    - Investigation can happen during/after containment
    - Balance: Contain quickly but preserve evidence
2. **Preserve Evidence During Containment**
    - Document actions taken
    - Take snapshots/logs before isolation
    - Maintain audit trail
    - Use non-destructive containment when possible
3. **Parallel Activities**
    - Contain while investigating
    - Multiple team members: some contain, others investigate
    - Share findings as investigation progresses
4. **Iterative Approach**
    - Initial containment: Quick, broad actions
    - Refined containment: More targeted based on investigation
    - Continuous monitoring and adjustment

**Key Balance:**

- Speed of containment vs. evidence preservation
- Broad containment vs. targeted containment
- Security vs. availability (business operations)

---

## **Scenario-Based Questions**

### **Q4: You receive an alert that a production database has been compromised. Walk me through your response.**

**Answer:**

**Immediate Actions (0-15 minutes):**

1. **Validate Alert**
    - Verify it's a real compromise (check logs, monitoring)
    - Determine severity and scope
    - Notify incident response team
2. **Initial Containment**
    - Isolate database from application servers
    - Disable database access credentials
    - Block suspicious IPs if identified
    - Preserve logs and snapshots
3. **Assess Scope**
    - What data is in the database?
    - Is data being exfiltrated?
    - Are there backdoors or persistence mechanisms?
    - Check for lateral movement

**Containment Phase (15-60 minutes):**

1. **Enhanced Containment**
    - Disable all database access temporarily
    - Take database offline if necessary (evaluate business impact)
    - Monitor for continued access attempts
    - Check for backups compromise
2. **Investigation**
    - Review database access logs
    - Identify attack vector (SQL injection, credential compromise, etc.)
    - Determine data accessed/exfiltrated
    - Timeline reconstruction

**Eradication and Recovery:**

1. **Eradication**
    - Remove any backdoors or persistence
    - Patch vulnerabilities
    - Rotate all database credentials
    - Close attack vectors
2. **Recovery**
    - Restore from clean backup (if needed)
    - Verify database integrity
    - Restore access gradually with new credentials
    - Monitor for reinfection

**Post-Incident:**

1. **Data Breach Assessment**
    - Determine what data was accessed
    - Legal/compliance notification requirements
    - Customer notification if required
2. **Remediation**
    - Fix root cause (vulnerability, misconfiguration)
    - Improve database security controls
    - Enhance monitoring
3. **Lessons Learned**
    - How did this happen?
    - How can we prevent this?
    - Process improvements

---

**Note:** This is a template. Expand with more detailed procedures, checklists, and real-world examples as needed.