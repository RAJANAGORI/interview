# Product Security Real-World Scenarios - Comprehensive Guide

## Introduction

This guide contains real-world scenario-based interview questions commonly asked in product-based companies. Each scenario includes:

- **Question**: Realistic scenario you might encounter
- **Difficulty Level**: Beginner, Intermediate, or Advanced
- **Detailed Answer**: Comprehensive, fool-proof explanation
- **Data Flow Diagrams (DFD)**: Where applicable
- **Key Takeaways**: Important points to remember

These scenarios are designed for professionals with 6.5+ years of experience and reflect actual challenges faced in product security roles.

---

## Table of Contents

### Beginner Level Scenarios
1. [Vulnerable Third-Party Library in Mobile App](#scenario-1-vulnerable-third-party-library-in-mobile-app)
2. [Web Application Input Validation & XSS/SQL Injection](#scenario-2-web-application-input-validation--xsssql-injection)
3. [Failed Login Attempts & Brute Force Detection](#scenario-3-failed-login-attempts--brute-force-detection)
4. [Public S3 Bucket Exposure](#scenario-4-public-s3-bucket-exposure)

### Intermediate Level Scenarios
5. [Threat Modeling for Cloud-Native Microservices](#scenario-5-threat-modeling-for-cloud-native-microservices)
6. [Vendor Risk Assessment After Data Breach](#scenario-6-vendor-risk-assessment-after-data-breach)
7. [Secure Account Recovery Flow Design](#scenario-7-secure-account-recovery-flow-design)
8. [API Rate Limiting Evasion Attack](#scenario-8-api-rate-limiting-evasion-attack)
9. [Multi-Tenant SaaS Key Management](#scenario-9-multi-tenant-saas-key-management)

### Advanced Level Scenarios
10. [SSRF Attack & Incident Response](#scenario-10-ssrf-attack--incident-response)
11. [Secure Feature Launch with Tight Deadline](#scenario-11-secure-feature-launch-with-tight-deadline)
12. [Zero Trust Architecture Implementation](#scenario-12-zero-trust-architecture-implementation)
13. [Supply Chain Attack Response](#scenario-13-supply-chain-attack-response)
14. [Secure Microservices Communication Design](#scenario-14-secure-microservices-communication-design)
15. [PCI-DSS Compliant Payment Processing](#scenario-15-pci-dss-compliant-payment-processing)

---

## Beginner Level Scenarios

### Scenario 1: Vulnerable Third-Party Library in Mobile App

**Difficulty**: Beginner  
**Context**: You're part of a team developing a mobile app that uses a third-party SDK which has just been reported to have a critical TCP buffer overflow vulnerability (CVE-2024-XXXXX).

**Question**: What steps do you take from discovery to resolution?

---

#### Detailed Answer

**1. Immediate Assessment (First Hour)**

**Identify Impact:**
- Determine which version of the SDK your app uses
- Check if the vulnerable version is in production
- Identify which features/functionality use the vulnerable component
- Assess what data or processes could be compromised:
  - User input handling?
  - Network communication?
  - Local storage access?
  - Privileged operations?

**Checklist:**
```
□ Review dependency manifest (package.json, Podfile, build.gradle)
□ Check all app versions (dev, staging, production)
□ Identify affected user base
□ Review CVE details and CVSS score
□ Check if exploit is publicly available
```

**2. Containment (First 4 Hours)**

**Immediate Actions:**
- If possible, disable or avoid code paths invoking the vulnerable component
- If feasible, roll back to a previous safe version (if available)
- Consider temporarily removing the SDK if it's not critical
- Implement network-level protections (WAF rules, if applicable)

**Risk Assessment:**
- **Critical**: SDK is in production, handles sensitive data, exploit is public
- **High**: SDK is in production, limited sensitive data exposure
- **Medium**: SDK is in staging/dev only
- **Low**: SDK is deprecated or unused

**3. Remediation (Day 1-3)**

**Update Strategy:**
- Check if vendor has released a patched version
- Review changelog for breaking changes
- Test the patched version in development environment
- If no patch available:
  - Apply temporary workarounds (input validation, bounds checking)
  - Consider alternative libraries
  - Contact vendor for timeline

**Implementation Steps:**
```
1. Update SDK to patched version in dev
2. Run full regression test suite
3. Perform security testing (fuzzing, static analysis)
4. Deploy to staging for validation
5. Monitor for issues
6. Deploy to production with rollback plan
```

**4. Testing & Validation**

**Security Testing:**
- Fuzz testing around buffer inputs
- Static analysis (SAST) of updated code
- Dynamic analysis (DAST) if applicable
- Penetration testing of affected functionality

**Functional Testing:**
- Regression testing to ensure no breaking changes
- Integration testing with other components
- Performance testing (buffer overflow fixes may impact performance)
- User acceptance testing

**5. Release & Monitoring**

**Deployment:**
- Push hotfix or update to app stores
- Coordinate with app store review processes
- Consider forced updates for critical vulnerabilities
- Communicate with users if necessary

**Monitoring:**
- Monitor crash reports and error logs
- Track security logs for exploitation attempts
- Monitor app store reviews for user issues
- Set up alerts for unusual activity

**6. Lessons Learned & Prevention**

**Process Improvements:**
- Maintain Software Bill of Materials (SBOM) for all dependencies
- Implement automated vulnerability scanning:
  - Dependabot (GitHub)
  - Snyk
  - OWASP Dependency-Check
  - WhiteSource/Mend
- Set up alerts for new CVEs in dependencies
- Regular dependency audits (monthly/quarterly)
- Establish vendor communication channels

**Policy Updates:**
- Define acceptable risk levels for dependencies
- Establish SLAs for vulnerability response
- Create playbook for dependency vulnerabilities
- Document decision-making process

---

#### Key Takeaways

1. **Speed matters**: Critical vulnerabilities need immediate response
2. **Know your dependencies**: Maintain accurate inventory
3. **Automate scanning**: Don't rely on manual checks
4. **Test thoroughly**: Security fixes can break functionality
5. **Communicate clearly**: Keep stakeholders informed
6. **Learn and improve**: Document lessons for future incidents

---

### Scenario 2: Web Application Input Validation & XSS/SQL Injection

**Difficulty**: Beginner  
**Context**: During security testing of a customer-facing web application, you discover that a search input field does not properly sanitize user input. You suspect risks of both XSS (Cross-Site Scripting) and SQL Injection.

**Question**: Walk through how you'd confirm, safely exploit, remediate, and prevent this vulnerability.

---

#### Detailed Answer

**1. Confirmation & Safe Exploitation**

**Initial Testing:**

**SQL Injection Testing:**
```sql
-- Basic test vectors
' OR 1=1 --
' OR '1'='1
' UNION SELECT NULL--
'; DROP TABLE users--
1' AND '1'='1
```

**XSS Testing:**
```html
<!-- Reflected XSS -->
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>

<!-- Stored XSS -->
<script>document.cookie</script>
<iframe src="javascript:alert('XSS')"></iframe>

<!-- DOM-based XSS -->
#<img src=x onerror=alert('XSS')>
```

**Tools & Methodology:**
- **Burp Suite / OWASP ZAP**: Intercept and modify requests
- **SQLMap**: Automated SQL injection testing
- **Manual testing**: Understand the application flow
- **Code review**: Examine server-side code paths

**Testing Process:**
1. Identify all input points (forms, URL parameters, headers, cookies)
2. Test each input with various payloads
3. Monitor server responses and error messages
4. Check for reflected input in HTML output
5. Review server logs for SQL errors
6. Test in different contexts (different user roles, browsers)

**2. Vulnerability Confirmation**

**SQL Injection Indicators:**
- SQL error messages in responses
- Unexpected query results
- Time delays in responses
- Out-of-band data exfiltration
- Boolean-based blind SQL injection responses

**XSS Indicators:**
- Script execution in browser
- Reflected input in HTML without encoding
- DOM manipulation
- Cookie theft (in real attacks)

**3. Remediation**

**SQL Injection Fixes:**

**Use Parameterized Queries:**
```python
# BAD - Vulnerable
query = "SELECT * FROM users WHERE id = " + user_id
cursor.execute(query)

# GOOD - Parameterized
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

**Use ORM (Object-Relational Mapping):**
```python
# Using SQLAlchemy (Python)
user = session.query(User).filter(User.id == user_id).first()

# Using Hibernate (Java)
User user = session.get(User.class, userId);
```

**Input Validation:**
- Whitelist allowed characters
- Validate data types
- Enforce length limits
- Reject suspicious patterns

**XSS Fixes:**

**Output Encoding:**
```python
# Python - Use framework's auto-escaping
from markupsafe import escape
output = escape(user_input)

# JavaScript - Use DOMPurify
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

**Content Security Policy (CSP):**
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

**Framework Best Practices:**
- Use templating engines with auto-escaping (Jinja2, Handlebars, etc.)
- Never use `innerHTML` with user input
- Use `textContent` instead of `innerHTML`
- Validate and sanitize on both client and server side

**4. Prevention Strategy**

**Secure Development Practices:**
- Security code reviews (mandatory for security-sensitive code)
- Secure coding guidelines and training
- Threat modeling for new features
- Security champions program

**Automated Security Testing:**
- **SAST (Static Application Security Testing)**:
  - SonarQube
  - Checkmarx
  - Veracode
  - Bandit (Python)
- **DAST (Dynamic Application Security Testing)**:
  - OWASP ZAP
  - Burp Suite
  - Acunetix
- **IAST (Interactive Application Security Testing)**:
  - Contrast Security
  - Synopsys Seeker

**CI/CD Integration:**
```yaml
# Example GitHub Actions workflow
- name: SAST Scan
  uses: github/super-linter@v4
  
- name: Dependency Check
  uses: dependency-check/Dependency-Check_Action@main
  
- name: DAST Scan
  uses: zaproxy/action-full-scan@v0.10.0
```

**5. Stakeholder Communication**

**Severity Assessment:**
- **Critical**: Publicly exploitable, sensitive data exposure, authentication bypass
- **High**: Data exposure, privilege escalation
- **Medium**: Limited impact, requires specific conditions
- **Low**: Minimal impact, difficult to exploit

**Communication Plan:**
1. Document findings with proof-of-concept
2. Assess business impact
3. Present to product/engineering leads
4. Agree on remediation timeline
5. Coordinate fix deployment
6. Verify fix effectiveness

---

#### Data Flow Diagram (DFD)

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ User Input (Search Query)
       │
       ▼
┌─────────────────────────────────┐
│      Web Application            │
│  ┌──────────────────────────┐   │
│  │  Input Validation Layer  │   │ ← Missing/Weak
│  └──────────┬───────────────┘   │
│             │                    │
│  ┌──────────▼──────────────┐   │
│  │   Application Logic      │   │
│  └──────────┬───────────────┘   │
│             │                    │
│  ┌──────────▼──────────────┐   │
│  │   Database Query         │   │ ← SQL Injection Risk
│  └──────────┬───────────────┘   │
│             │                    │
│  ┌──────────▼──────────────┐   │
│  │   Response Generation    │   │ ← XSS Risk (Output)
│  └──────────┬───────────────┘   │
└─────────────┼────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│      Database               │
│  (Sensitive Data)           │
└─────────────────────────────┘

Trust Boundaries:
- User Browser ↔ Web Application (untrusted input)
- Application ↔ Database (trusted, but vulnerable to injection)
```

---

#### Key Takeaways

1. **Never trust user input**: Always validate and sanitize
2. **Use parameterized queries**: Never concatenate SQL
3. **Encode output**: Always encode user data in HTML
4. **Defense in depth**: Multiple layers of protection
5. **Automate testing**: Catch issues early in development
6. **Security by design**: Build security in, don't bolt it on

---

### Scenario 3: Failed Login Attempts & Brute Force Detection

**Difficulty**: Beginner  
**Context**: You notice in security logs that a privileged internal server has had 100+ failed SSH login attempts from a single IP address over 10 minutes, followed by a successful login.

**Question**: How do you respond immediately, and how do you prevent this from happening again?

---

#### Detailed Answer

**1. Immediate Response (First 15 Minutes)**

**Investigation Steps:**
1. **Review Logs:**
   ```
   - Source IP address and geolocation
   - Timestamps of all attempts
   - Username(s) targeted
   - Successful login timestamp
   - Commands executed after login
   - Network connections established
   ```

2. **Assess Compromise:**
   - Check if the successful login was legitimate or unauthorized
   - Review what actions were taken after login
   - Check for lateral movement (SSH agent forwarding, connections to other systems)
   - Look for modified files, new processes, or backdoors

3. **Containment Actions:**
   ```
   □ Immediately block the IP at firewall/network level
   □ Reset password for the compromised account
   □ Revoke/rotate SSH keys if public key authentication was used
   □ Disable the compromised user account temporarily
   □ Isolate the server from network if severe compromise suspected
   ```

**2. Forensic Investigation (First 4 Hours)**

**Log Analysis:**
```bash
# Check SSH auth logs
grep "Failed password" /var/log/auth.log
grep "Accepted" /var/log/auth.log

# Check for suspicious activity
last -f /var/log/wtmp
lastlog

# Check command history
history | grep -i suspicious

# Check network connections
netstat -anp | grep ESTABLISHED
ss -tulpn
```

**System Integrity Checks:**
- Review modified files (tripwire, AIDE, or similar)
- Check for new user accounts
- Review cron jobs and scheduled tasks
- Check for rootkits or backdoors
- Review system logs for anomalies

**3. Remediation**

**Immediate Fixes:**
1. **Change Credentials:**
   - Reset password for compromised account
   - Rotate all SSH keys
   - Review and rotate other credentials on the system

2. **Network Controls:**
   - Block the attacker's IP address
   - Consider blocking the entire IP range if it's a known bad actor
   - Implement geo-blocking if the IP is from unexpected location

3. **Access Controls:**
   - Disable password authentication, use key-based only
   - Implement IP whitelisting for SSH access
   - Use VPN or bastion host for access

**4. Prevention Measures**

**Authentication Hardening:**

**1. Multi-Factor Authentication (MFA):**
```bash
# Install Google Authenticator PAM module
apt-get install libpam-google-authenticator

# Configure SSH to require MFA
# In /etc/ssh/sshd_config:
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication yes
AuthenticationMethods publickey,keyboard-interactive
```

**2. Rate Limiting:**
```bash
# Using fail2ban
apt-get install fail2ban

# Configure /etc/fail2ban/jail.local:
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

**3. SSH Hardening:**
```bash
# /etc/ssh/sshd_config recommendations:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers specific_user1 specific_user2
```

**4. Monitoring & Alerting:**

**SIEM Integration:**
- Set up alerts for multiple failed login attempts
- Alert on successful logins from new IPs
- Alert on logins outside business hours
- Alert on privilege escalations

**Example Alert Rules:**
```
- 5+ failed login attempts in 5 minutes → Warning
- 10+ failed login attempts in 10 minutes → Critical Alert
- Successful login from new IP → Info Alert
- Successful login from new country → Warning
```

**5. Network Segmentation:**
- Use bastion hosts/jump servers
- Implement network segmentation
- Use VPN for remote access
- Implement zero-trust network access

**6. Least Privilege:**
- Users should only have necessary access
- Use sudo for privilege escalation
- Implement role-based access control (RBAC)
- Regular access reviews

**5. Long-Term Improvements**

**Security Posture:**
- Regular security assessments
- Penetration testing
- Security awareness training
- Incident response drills

**Compliance:**
- Document security controls
- Regular audits
- Compliance with security frameworks (ISO 27001, NIST, etc.)

---

#### Key Takeaways

1. **Time is critical**: Respond immediately to contain the threat
2. **Logs are your friend**: Comprehensive logging enables investigation
3. **Defense in depth**: Multiple layers of security controls
4. **Monitor continuously**: Real-time monitoring and alerting
5. **Least privilege**: Users should have minimum necessary access
6. **Assume breach**: Design systems assuming they will be compromised

---

### Scenario 4: Public S3 Bucket Exposure

**Difficulty**: Beginner  
**Context**: An internal security audit reveals that one of your AWS S3 buckets is publicly accessible. The bucket stores customer PII (Personally Identifiable Information). There's no evidence of compromise yet.

**Question**: How do you analyze the risk, contain it, detect possible exposure, and put processes in place to avoid recurrence?

---

#### Detailed Answer

**1. Risk Analysis (First Hour)**

**Immediate Assessment:**
```
□ Identify the bucket name and region
□ Determine what data is stored (PII types, volume)
□ Check bucket policy and ACLs
□ Review when the bucket became public
□ Check if access logs are enabled
□ Assess compliance implications (GDPR, CCPA, HIPAA)
```

**Risk Quantification:**
- **Data Sensitivity**: PII, PHI, financial data, etc.
- **Volume**: Number of records exposed
- **Exposure Duration**: How long has it been public?
- **Accessibility**: How easy is it to discover and access?
- **Compliance Impact**: Regulatory requirements and penalties

**2. Immediate Containment (First 15 Minutes)**

**Remove Public Access:**
```bash
# Using AWS CLI
aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Remove public read policy
aws s3api delete-bucket-policy --bucket my-bucket

# Update bucket ACL
aws s2api put-bucket-acl --bucket my-bucket --acl private
```

**Enable Block Public Access:**
- Enable all four Block Public Access settings
- This prevents accidental public exposure in the future

**3. Detection of Exposure**

**Access Log Analysis:**
```bash
# Enable server access logging if not already enabled
aws s3api put-bucket-logging \
    --bucket my-bucket \
    --bucket-logging-status file://logging.json

# Analyze CloudTrail logs
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=ResourceName,AttributeValue=my-bucket

# Use AWS Macie to detect sensitive data access
aws macie2 create-classification-job \
    --job-type ONE_TIME \
    --s3-job-definition file://job-definition.json
```

**Forensic Investigation:**
1. **CloudTrail Analysis:**
   - Review all API calls to the bucket
   - Identify unusual access patterns
   - Check for data exfiltration

2. **S3 Access Logs:**
   - Review server access logs (if enabled)
   - Identify IP addresses that accessed the bucket
   - Check for bulk downloads

3. **VPC Flow Logs:**
   - If bucket is accessed via VPC endpoint
   - Review network traffic patterns

4. **Third-Party Tools:**
   - Use AWS GuardDuty for threat detection
   - Use AWS Macie for sensitive data discovery
   - Use third-party security tools (CloudSploit, Prowler)

**4. Communication & Compliance**

**Internal Communication:**
- Notify security team immediately
- Inform legal and compliance teams
- Brief executive leadership
- Document the incident

**External Communication:**
- **If data breach confirmed:**
  - Notify affected customers (within 72 hours for GDPR)
  - Report to regulatory authorities if required
  - Prepare public statement if necessary

**Compliance Considerations:**
- **GDPR**: 72-hour notification requirement
- **CCPA**: Notification to California residents
- **HIPAA**: Breach notification to HHS and affected individuals
- **PCI-DSS**: If payment card data involved

**5. Long-Term Prevention**

**Infrastructure as Code (IaC) Security:**
```hcl
# Terraform example - Secure S3 bucket
resource "aws_s3_bucket" "secure_bucket" {
  bucket = "my-secure-bucket"
}

resource "aws_s3_bucket_public_access_block" "secure_bucket" {
  bucket = aws_s3_bucket.secure_bucket.id

  block_public_acls       = true
  block_public_policy      = true
  ignore_public_acls       = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "secure_bucket" {
  bucket = aws_s3_bucket.secure_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.secure_bucket.arn,
          "${aws_s3_bucket.secure_bucket.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
```

**Automated Scanning:**
```python
# Example: Automated S3 bucket security scan
import boto3
from botocore.exceptions import ClientError

def check_bucket_security(bucket_name):
    s3 = boto3.client('s3')
    
    # Check public access block
    try:
        response = s3.get_public_access_block(Bucket=bucket_name)
        # Verify all settings are enabled
    except ClientError:
        # Public access block not configured - security issue
        pass
    
    # Check bucket policy
    try:
        policy = s3.get_bucket_policy(Bucket=bucket_name)
        # Analyze policy for public access
    except ClientError:
        pass
    
    # Check bucket ACL
    acl = s3.get_bucket_acl(Bucket=bucket_name)
    # Check for public grants
```

**Security Policies:**
- **Default Deny**: All buckets should be private by default
- **Policy Enforcement**: Use AWS Config rules to enforce policies
- **Regular Audits**: Monthly security audits of all S3 buckets
- **Access Reviews**: Quarterly review of bucket permissions

**Tools & Automation:**
- **AWS Config**: Continuous compliance monitoring
- **CloudSploit**: Security scanning
- **Prowler**: AWS security assessment tool
- **Terraform/CloudFormation**: Infrastructure as code with security guardrails

**Team Training:**
- Security awareness training
- Secure cloud practices
- Regular security reviews
- Incident response drills

---

#### Data Flow Diagram (DFD)

```
┌─────────────────┐
│  Public Internet│
│  (Untrusted)    │
└────────┬────────┘
         │
         │ HTTP/HTTPS Request
         │ (GET /bucket-name/object-key)
         │
         ▼
┌─────────────────────────────────────┐
│      AWS S3 Bucket                  │
│  ┌──────────────────────────────┐  │
│  │  Bucket Policy               │  │ ← Misconfigured (Public Read)
│  │  - Public Access: ALLOWED     │  │
│  └───────────┬──────────────────┘  │
│              │                       │
│  ┌───────────▼──────────────────┐  │
│  │  Access Control List (ACL)   │  │ ← Public Read Permission
│  └───────────┬──────────────────┘  │
│              │                       │
│  ┌───────────▼──────────────────┐  │
│  │  Customer PII Data            │  │
│  │  - Names, Emails, SSNs, etc. │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         │ Data Exfiltration
         │
         ▼
┌─────────────────┐
│   Attacker      │
│  (Unauthorized)  │
└─────────────────┘

Trust Boundaries:
- Public Internet ↔ S3 Bucket (should be blocked)
- S3 Bucket ↔ Authorized Services (should be allowed)
```

**Secure Architecture:**
```
┌─────────────────┐
│  Authorized     │
│  Application    │
└────────┬────────┘
         │
         │ IAM Role/User
         │ (Authenticated)
         │
         ▼
┌─────────────────────────────────────┐
│      AWS S3 Bucket                  │
│  ┌──────────────────────────────┐  │
│  │  Block Public Access: ENABLED  │  │
│  └───────────┬──────────────────┘  │
│              │                       │
│  ┌───────────▼──────────────────┐  │
│  │  Bucket Policy                │  │
│  │  - Deny Public Access         │  │
│  │  - Allow Only IAM Roles        │  │
│  └───────────┬──────────────────┘  │
│              │                       │
│  ┌───────────▼──────────────────┐  │
│  │  Encrypted Customer PII        │  │
│  │  (KMS Encrypted)               │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

#### Key Takeaways

1. **Default to private**: All S3 buckets should be private by default
2. **Enable Block Public Access**: Use AWS Block Public Access settings
3. **Monitor access**: Enable logging and monitoring
4. **Automate security**: Use IaC and automated scanning
5. **Regular audits**: Continuously review bucket configurations
6. **Compliance awareness**: Understand regulatory requirements

---

## Intermediate Level Scenarios

### Scenario 5: Threat Modeling for Cloud-Native Microservices

**Difficulty**: Intermediate  
**Context**: You're designing a threat model for a cloud-native microservices-based service handling sensitive user health data (HIPAA-regulated). The system consists of:
- API Gateway (Kong/AWS API Gateway)
- Authentication Service (OAuth 2.0)
- User Service (manages user profiles)
- Health Data Service (processes health records)
- Analytics Service (aggregates data)
- Database (PostgreSQL with encryption)
- Message Queue (RabbitMQ/Kafka)
- Logging & Monitoring (ELK Stack)

**Question**: How would you represent this using a DFD, what threats do you identify using STRIDE, and what mitigations do you propose?

---

#### Detailed Answer

**1. Data Flow Diagram (DFD)**

```
┌─────────────────┐
│   User Device   │
│  (Mobile/Web)   │
└────────┬────────┘
         │ HTTPS Request
         │ (User Credentials)
         │
         ▼
┌─────────────────────────────────────┐
│      API Gateway                    │
│  (Kong / AWS API Gateway)           │
│  ┌──────────────────────────────┐  │
│  │  Rate Limiting               │  │
│  │  SSL Termination             │  │
│  │  Request Routing             │  │
│  └───────────┬──────────────────┘  │
└─────────────┼──────────────────────┘
              │
              │ Authenticated Request
              │ (JWT Token)
              │
              ▼
┌─────────────────────────────────────┐
│   Authentication Service             │
│  ┌──────────────────────────────┐   │
│  │  OAuth 2.0 Provider          │   │
│  │  Token Generation            │   │
│  │  User Validation             │   │
│  └───────────┬──────────────────┘   │
└─────────────┼───────────────────────┘
              │
              │ Valid Token
              │
              ▼
┌─────────────────────────────────────┐
│      User Service                    │
│  ┌──────────────────────────────┐   │
│  │  User Profile Management     │   │
│  │  Authorization Checks        │   │
│  └───────────┬──────────────────┘   │
└─────────────┼───────────────────────┘
              │
              │ Authorized Request
              │
              ▼
┌─────────────────────────────────────┐
│   Health Data Service               │
│  ┌──────────────────────────────┐   │
│  │  Health Record Processing    │   │
│  │  Data Validation            │   │
│  │  Business Logic              │   │
│  └───────────┬──────────────────┘   │
└─────────────┼───────────────────────┘
              │
              │ Encrypted Data
              │
              ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database                │
│  ┌──────────────────────────────┐   │
│  │  Encrypted at Rest (TDE)      │   │
│  │  Health Records (PHI)         │   │
│  │  User Profiles               │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘

Parallel Flows:
┌─────────────────────────────────────┐
│   Message Queue (RabbitMQ/Kafka)    │
│  ┌──────────────────────────────┐   │
│  │  Event Publishing            │   │
│  │  Service Communication       │   │
│  └───────────┬──────────────────┘   │
└─────────────┼───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   Analytics Service                 │
│  ┌──────────────────────────────┐   │
│  │  Data Aggregation             │   │
│  │  Statistical Analysis         │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Logging & Monitoring (ELK)         │
│  ┌──────────────────────────────┐   │
│  │  Application Logs            │   │
│  │  Security Events             │   │
│  │  Performance Metrics         │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘

Trust Boundaries:
- Internet ↔ API Gateway (untrusted)
- API Gateway ↔ Services (authenticated)
- Services ↔ Database (encrypted, authenticated)
- Services ↔ Message Queue (authenticated)
- Services ↔ Logging (potentially sensitive)
```

**2. STRIDE Threat Analysis**

**S - Spoofing (Identity Spoofing)**

**Threats:**
1. **Fake User Tokens**: Attacker creates or steals JWT tokens
2. **Service Impersonation**: One service impersonates another
3. **API Key Theft**: Stolen API keys used for unauthorized access

**Mitigations:**
- **Strong Authentication**: OAuth 2.0 with PKCE, MFA
- **Token Security**: Short-lived tokens, refresh token rotation
- **Service Identity**: mTLS between services, service mesh (Istio/Linkerd)
- **API Key Management**: Secure storage, rotation, least privilege
- **Token Validation**: Verify signatures, check expiration, validate audience

**T - Tampering (Data Tampering)**

**Threats:**
1. **Data in Transit**: Man-in-the-middle attacks
2. **Data at Rest**: Unauthorized database modifications
3. **Message Queue**: Tampered messages between services
4. **Log Tampering**: Altered audit logs

**Mitigations:**
- **Encryption in Transit**: TLS 1.3 for all communications
- **Encryption at Rest**: Database encryption (TDE), encrypted volumes
- **Message Integrity**: Digital signatures for messages, message authentication
- **Immutable Logs**: Write-only logging, blockchain-based audit logs
- **Data Validation**: Input validation, output encoding
- **Database Security**: Row-level security, audit triggers

**R - Repudiation (Non-Repudiation)**

**Threats:**
1. **Action Denial**: Users deny performing actions
2. **Service Denial**: Services deny processing requests
3. **Audit Gaps**: Missing or incomplete audit trails

**Mitigations:**
- **Comprehensive Logging**: All actions logged with timestamps
- **User Attribution**: Every action tied to authenticated user
- **Service Attribution**: Service identity in all logs
- **Immutable Audit Trail**: Tamper-proof logging
- **Digital Signatures**: Cryptographic proof of actions
- **Log Retention**: Long-term storage, compliance requirements

**I - Information Disclosure**

**Threats:**
1. **Sensitive Data in Logs**: PHI/PII in application logs
2. **Database Exposure**: Unauthorized database access
3. **API Response Leakage**: Sensitive data in API responses
4. **Error Messages**: Information disclosure in error messages
5. **Message Queue**: Sensitive data in messages

**Mitigations:**
- **Data Masking**: Mask PII/PHI in logs and responses
- **Access Controls**: Database access controls, row-level security
- **Encryption**: Encrypt sensitive data fields
- **Error Handling**: Generic error messages, no stack traces in production
- **API Security**: Field-level access control, data filtering
- **Log Sanitization**: Automated log sanitization
- **Data Classification**: Tag sensitive data, enforce policies

**D - Denial of Service (DoS)**

**Threats:**
1. **API Gateway Overload**: DDoS attacks on API gateway
2. **Service Exhaustion**: Resource exhaustion attacks
3. **Database Overload**: Query-based DoS
4. **Message Queue Flood**: Message queue saturation

**Mitigations:**
- **Rate Limiting**: Per-user, per-IP, per-API key rate limits
- **Circuit Breakers**: Prevent cascade failures
- **Resource Limits**: CPU, memory, connection limits
- **Auto-scaling**: Scale resources based on demand
- **DDoS Protection**: Cloud DDoS protection (AWS Shield, Cloudflare)
- **Query Optimization**: Database query limits, connection pooling
- **Throttling**: Progressive throttling, backoff strategies

**E - Elevation of Privilege**

**Threats:**
1. **Token Escalation**: Regular user tokens with admin privileges
2. **Service Privilege Escalation**: Service accessing unauthorized resources
3. **Database Privilege Escalation**: Database user with excessive permissions
4. **Container Escape**: Container accessing host resources

**Mitigations:**
- **Least Privilege**: Minimum necessary permissions
- **Role-Based Access Control (RBAC)**: Fine-grained permissions
- **Token Scopes**: Limited token scopes, principle of least privilege
- **Service Accounts**: Separate service accounts with minimal permissions
- **Database Security**: Database user with minimal permissions
- **Container Security**: Non-root containers, read-only filesystems
- **Regular Audits**: Periodic permission reviews

**3. Additional HIPAA-Specific Threats**

**HIPAA Requirements:**
- **Administrative Safeguards**: Security management, workforce training
- **Physical Safeguards**: Facility access controls, workstation security
- **Technical Safeguards**: Access control, audit controls, integrity, transmission security

**Additional Mitigations:**
- **Business Associate Agreements (BAA)**: With cloud providers
- **Encryption**: End-to-end encryption for PHI
- **Access Controls**: Role-based access, user authentication
- **Audit Logs**: Comprehensive audit trails for PHI access
- **Backup & Recovery**: Secure backup procedures
- **Incident Response**: Breach notification procedures

**4. Risk Prioritization (DREAD Model)**

**High Priority Threats:**
1. **Information Disclosure** (PHI exposure) - Damage: 10, Reproducibility: 9, Exploitability: 7, Affected Users: 10, Discoverability: 8
2. **Spoofing** (Token theft) - Damage: 9, Reproducibility: 8, Exploitability: 6, Affected Users: 9, Discoverability: 7
3. **Tampering** (Data modification) - Damage: 9, Reproducibility: 7, Exploitability: 6, Affected Users: 8, Discoverability: 6

**Medium Priority Threats:**
4. **Denial of Service** - Damage: 6, Reproducibility: 9, Exploitability: 8, Affected Users: 7, Discoverability: 9
5. **Elevation of Privilege** - Damage: 8, Reproducibility: 6, Exploitability: 5, Affected Users: 6, Discoverability: 5

**Low Priority Threats:**
6. **Repudiation** - Damage: 5, Reproducibility: 7, Exploitability: 4, Affected Users: 5, Discoverability: 6

**5. Implementation Roadmap**

**Phase 1: Foundation (Weeks 1-4)**
- Implement mTLS between services
- Set up comprehensive logging
- Enable encryption at rest
- Implement basic rate limiting

**Phase 2: Access Control (Weeks 5-8)**
- Implement RBAC
- Token scope restrictions
- Service account management
- Database access controls

**Phase 3: Monitoring & Detection (Weeks 9-12)**
- SIEM integration
- Anomaly detection
- Security monitoring
- Incident response procedures

**Phase 4: Advanced Security (Weeks 13-16)**
- Service mesh implementation
- Advanced threat detection
- Automated security testing
- Compliance validation

---

#### Key Takeaways

1. **Threat modeling is iterative**: Update as system evolves
2. **STRIDE is comprehensive**: Covers all major threat categories
3. **DFD helps visualization**: Understand data flows and trust boundaries
4. **Prioritize by risk**: Focus on high-impact, high-likelihood threats
5. **Compliance matters**: HIPAA, GDPR, etc. add specific requirements
6. **Defense in depth**: Multiple layers of security controls

---

### Scenario 6: Vendor Risk Assessment After Data Breach

**Difficulty**: Intermediate  
**Context**: Your company plans to use a third-party cloud-based CRM vendor that handles sensitive customer data. You discover:
- The vendor suffered a data breach 6 months ago
- Several security practices don't align with your company's standards
- The business team insists on moving forward due to operational benefits
- The vendor is the market leader with no viable alternatives

**Question**: How do you approach this vendor risk assessment and decision-making process?

---

#### Detailed Answer

**1. Vendor Security Evaluation**

**Post-Breach Analysis:**
```
□ Review vendor's public breach disclosure
□ Analyze root cause of the breach
□ Assess remediation actions taken
□ Review third-party security audits
□ Check for recurring security incidents
□ Evaluate vendor's security maturity
```

**Security Assessment Framework:**

**1.1. Review Breach Details:**
- **What was breached?**: Data types, volume, sensitivity
- **How did it happen?**: Attack vector, root cause
- **Who was affected?**: Customers, employees, partners
- **Response timeline**: Detection time, containment time, notification time
- **Remediation actions**: Technical fixes, process improvements, training

**1.2. Request Documentation:**
- SOC 2 Type II reports
- ISO 27001 certification
- Penetration test reports
- Security incident reports
- Security policies and procedures
- Business continuity plans
- Data processing agreements

**1.3. Technical Assessment:**
- Security architecture review
- Encryption standards (at rest, in transit)
- Access controls and authentication
- Network security
- Application security
- Data backup and recovery
- Security monitoring and logging

**2. Gap Analysis**

**Compare Against Your Standards:**

**Security Control Matrix:**
```
Your Requirement          Vendor Capability    Gap        Risk
─────────────────────────────────────────────────────────────────
Encryption at Rest        ✅ AES-256          None       Low
Encryption in Transit     ✅ TLS 1.3          None       Low
MFA for Admin Access      ⚠️  Optional        Medium     Medium
Audit Logging             ✅ 90 days          None       Low
Data Residency            ❌ US only          High       High
Breach Notification        ⚠️  72 hours        Medium     Medium
Penetration Testing       ✅ Annual           None       Low
Vulnerability Management  ⚠️  Quarterly       Medium     Medium
```

**Risk Quantification:**

**Data Sensitivity Assessment:**
- **High Sensitivity**: PII, PHI, financial data, intellectual property
- **Medium Sensitivity**: Business data, analytics
- **Low Sensitivity**: Public information, marketing data

**Impact Assessment:**
- **Financial Impact**: Regulatory fines, legal costs, business disruption
- **Reputational Impact**: Customer trust, brand damage
- **Operational Impact**: Service disruption, data loss

**Likelihood Assessment:**
- **High Likelihood**: Known vulnerabilities, weak controls, history of breaches
- **Medium Likelihood**: Some controls in place, occasional incidents
- **Low Likelihood**: Strong controls, no recent incidents

**3. Compensating Controls**

**If Proceeding with Vendor:**

**Technical Controls:**
1. **Client-Side Encryption**: Encrypt data before sending to vendor
   ```python
   # Example: Encrypt PII before sending to CRM
   from cryptography.fertilizer import Fernet
   
   key = load_key_from_kms()
   f = Fernet(key)
   encrypted_pii = f.encrypt(pii_data.encode())
   # Send encrypted_pii to vendor
   ```

2. **Data Minimization**: Only send necessary data
3. **Data Masking**: Mask sensitive fields where possible
4. **Access Controls**: Implement strict access controls on your side
5. **Monitoring**: Monitor all data transfers to vendor

**Contractual Controls:**
1. **Data Processing Agreement (DPA)**:
   - Data handling requirements
   - Security standards
   - Breach notification timelines (24-48 hours)
   - Right to audit
   - Data deletion requirements
   - Liability and indemnification

2. **Service Level Agreements (SLA)**:
   - Uptime requirements
   - Security incident response time
   - Data availability guarantees
   - Performance metrics

3. **Insurance Requirements**:
   - Cyber liability insurance
   - Minimum coverage amounts
   - Proof of insurance

**Operational Controls:**
1. **Regular Audits**: Quarterly security reviews
2. **Incident Response Plan**: Joint incident response procedures
3. **Security Training**: Vendor staff security awareness
4. **Vendor Management Program**: Ongoing vendor oversight

**4. Decision Framework**

**Risk Acceptance Criteria:**

**Proceed if:**
- Residual risk is within acceptable tolerance
- Compensating controls adequately mitigate risks
- Business benefit outweighs residual risk
- Vendor demonstrates commitment to security improvement
- Contractual protections are in place

**Do Not Proceed if:**
- Residual risk exceeds tolerance
- Critical security gaps cannot be mitigated
- Vendor is uncooperative or non-transparent
- Regulatory compliance cannot be achieved
- Business impact of breach would be catastrophic

**Alternative Options:**
1. **Build In-House**: Develop custom CRM solution
2. **Alternative Vendors**: Find vendors with better security posture
3. **Hybrid Approach**: Use vendor for non-sensitive data, in-house for sensitive
4. **Phased Rollout**: Start with low-risk data, expand gradually

**5. Stakeholder Communication**

**Executive Presentation:**

**Structure:**
1. **Executive Summary**: Decision recommendation and rationale
2. **Risk Assessment**: Detailed risk analysis
3. **Gap Analysis**: Security gaps and mitigations
4. **Options Analysis**: Alternatives and trade-offs
5. **Recommendation**: Clear recommendation with justification
6. **Next Steps**: Implementation plan if proceeding

**Key Messages:**
- **Transparency**: Full disclosure of risks and gaps
- **Risk Management**: Comprehensive mitigation strategy
- **Business Alignment**: Balance security and business needs
- **Ongoing Oversight**: Continuous vendor management

**6. Implementation Plan (If Proceeding)**

**Phase 1: Contract Negotiation (Weeks 1-4)**
- Negotiate DPA and SLA
- Define security requirements
- Establish audit rights
- Set up insurance requirements

**Phase 2: Technical Implementation (Weeks 5-12)**
- Implement client-side encryption
- Set up data minimization processes
- Configure access controls
- Implement monitoring

**Phase 3: Operational Setup (Weeks 13-16)**
- Establish vendor management processes
- Set up regular audit schedule
- Create incident response procedures
- Train staff on vendor usage

**Phase 4: Ongoing Management (Ongoing)**
- Quarterly security reviews
- Annual penetration testing
- Continuous monitoring
- Regular risk assessments

---

#### Key Takeaways

1. **Thorough assessment**: Don't skip vendor security evaluation
2. **Post-breach analysis**: Understand what happened and what changed
3. **Gap analysis**: Compare vendor capabilities to your requirements
4. **Compensating controls**: Mitigate risks you can't eliminate
5. **Contractual protection**: Strong contracts are essential
6. **Ongoing oversight**: Vendor management is continuous
7. **Risk-based decisions**: Balance security and business needs

---

### Scenario 7: Secure Account Recovery Flow Design

**Difficulty**: Intermediate  
**Context**: You're designing a secure "Forgot Password" / "Account Recovery" flow for a consumer web application handling financial transactions. The application must prevent abuse, impersonation, social engineering, and fraud while maintaining usability.

**Question**: Design a comprehensive account recovery flow that balances security and user experience.

---

#### Detailed Answer

**1. Threat Analysis**

**Threats to Consider:**
1. **Account Takeover**: Attacker resets password and gains access
2. **Social Engineering**: Attacker convinces support to reset account
3. **Email/SMS Hijacking**: Attacker intercepts recovery codes
4. **Credential Stuffing**: Automated attacks using breached credentials
5. **Account Enumeration**: Attacker discovers valid email addresses
6. **Replay Attacks**: Reusing old recovery tokens
7. **Brute Force**: Guessing recovery codes

**2. Secure Recovery Flow Design**

**Phase 1: Recovery Request**

**User Initiates Recovery:**
```
1. User enters email/username (don't reveal if account exists)
2. System checks if account exists (silently)
3. If account exists:
   - Generate secure recovery token (cryptographically random, 128+ bits)
   - Store token hash in database (not plaintext)
   - Set expiration (15-30 minutes)
   - Rate limit: Max 3 requests per email per hour
   - Send recovery email with token
4. If account doesn't exist:
   - Show same message (prevent enumeration)
   - Don't send email
```

**Security Controls:**
- **Token Generation**: Use cryptographically secure random number generator
- **Token Storage**: Store hash (SHA-256) not plaintext
- **Rate Limiting**: Prevent abuse, slow down attackers
- **Account Enumeration Prevention**: Same response for valid/invalid accounts

**Phase 2: Multi-Channel Verification**

**Multi-Factor Recovery:**
```
1. Primary Channel (Email):
   - Send recovery link with token
   - Include device/browser information
   - Show last login location

2. Secondary Channel (SMS/App):
   - Send 6-digit code to registered phone
   - Or push notification to mobile app
   - Code expires in 10 minutes

3. Security Questions (Optional):
   - Only for high-value accounts
   - Use questions user set up during registration
   - Limit to 3 attempts
```

**Phase 3: Risk Assessment**

**Adaptive Authentication:**
```python
def assess_recovery_risk(request):
    risk_score = 0
    
    # IP-based checks
    if is_new_ip(request.ip):
        risk_score += 20
    if is_suspicious_location(request.ip, user.last_location):
        risk_score += 30
    if is_tor_or_vpn(request.ip):
        risk_score += 15
    
    # Device-based checks
    if is_new_device(request.user_agent, user.devices):
        risk_score += 25
    if device_fingerprint_mismatch(request):
        risk_score += 20
    
    # Behavioral checks
    if account_recently_accessed(user):
        risk_score -= 10
    if multiple_recovery_attempts(user):
        risk_score += 30
    
    # Account value
    if is_high_value_account(user):
        risk_score += 20
    
    return risk_score

# Risk-based actions
if risk_score < 30:
    # Low risk: Standard recovery
    allow_recovery()
elif risk_score < 60:
    # Medium risk: Additional verification
    require_additional_verification()
else:
    # High risk: Manual review or account lock
    require_manual_review()
    notify_security_team()
```

**Phase 4: Password Reset**

**Secure Password Reset:**
```
1. User clicks recovery link (validates token)
2. User enters recovery code (from SMS/app)
3. System validates:
   - Token is valid and not expired
   - Token hasn't been used
   - Code matches
   - Rate limits not exceeded
4. User sets new password:
   - Enforce strong password policy
   - Check against password history (prevent reuse)
   - Check against breached password databases
5. Invalidate all existing sessions
6. Send confirmation to all registered channels
7. Log security event
```

**3. Implementation Details**

**Token Management:**
```python
import secrets
import hashlib
from datetime import datetime, timedelta

class RecoveryTokenManager:
    def generate_token(self):
        # Generate cryptographically secure token
        token = secrets.token_urlsafe(32)  # 256 bits
        return token
    
    def store_token(self, user_id, token):
        # Store hash, not plaintext
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = datetime.utcnow() + timedelta(minutes=30)
        
        db.store_recovery_token(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )
    
    def validate_token(self, user_id, token):
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        stored_token = db.get_recovery_token(user_id, token_hash)
        
        if not stored_token:
            return False
        if stored_token.used:
            return False  # Token already used
        if stored_token.expires_at < datetime.utcnow():
            return False  # Token expired
        
        # Mark as used
        db.mark_token_used(token_hash)
        return True
```

**Rate Limiting:**
```python
from redis import Redis
import time

redis_client = Redis()

def check_rate_limit(email, action='recovery_request'):
    key = f"rate_limit:{action}:{email}"
    current = redis_client.incr(key)
    
    if current == 1:
        # First request, set expiration
        redis_client.expire(key, 3600)  # 1 hour
    
    if current > 3:
        return False  # Rate limit exceeded
    
    return True
```

**4. User Communication**

**Recovery Email Template:**
```
Subject: Password Reset Request for Your Account

Hello [User],

We received a request to reset your password for your account.

If you made this request:
- Click here to reset: [Recovery Link] (expires in 30 minutes)
- Or enter this code: [6-digit code]

Device: [Browser/Device Info]
Location: [City, Country]
Time: [Timestamp]

If you didn't request this:
- Ignore this email (the link will expire)
- Secure your account: [Security Settings Link]
- Contact support if you're concerned

For security, this link can only be used once.
```

**Security Notifications:**
- Send notification to all registered channels when password is reset
- Include device, location, and timestamp
- Provide "This wasn't me" option to lock account

**5. Additional Security Measures**

**Account Lockout:**
- Lock account after 5 failed recovery attempts
- Require manual unlock or extended verification
- Notify user of account lock

**Session Management:**
- Invalidate all existing sessions on password reset
- Force re-authentication on all devices
- Clear "remember me" tokens

**Audit Logging:**
```python
def log_recovery_event(user_id, event_type, details):
    log_entry = {
        'user_id': user_id,
        'event_type': event_type,  # 'recovery_requested', 'recovery_completed', etc.
        'ip_address': request.remote_addr,
        'user_agent': request.user_agent,
        'timestamp': datetime.utcnow(),
        'details': details
    }
    security_logger.info(log_entry)
```

**6. Usability Considerations**

**Balance Security and UX:**
- **Low-risk users**: Streamlined process (email + SMS)
- **Medium-risk users**: Additional verification (security questions)
- **High-risk users**: Manual review or account lock

**User Experience:**
- Clear instructions at each step
- Progress indicators
- Helpful error messages (without revealing security details)
- Support contact information

---

#### Data Flow Diagram (DFD)

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Request Recovery
       │    (Email/Username)
       │
       ▼
┌─────────────────────────────────────┐
│   Recovery Service                  │
│  ┌──────────────────────────────┐  │
│  │  Account Lookup              │  │
│  │  (Prevent Enumeration)      │  │
│  └───────────┬──────────────────┘  │
│              │                       │
│  ┌───────────▼──────────────────┐  │
│  │  Risk Assessment             │  │
│  │  - IP Analysis               │  │
│  │  - Device Fingerprinting     │  │
│  │  - Behavioral Analysis      │  │
│  └───────────┬──────────────────┘  │
│              │                       │
│  ┌───────────▼──────────────────┐  │
│  │  Token Generation            │  │
│  │  - Cryptographically Random  │  │
│  │  - Hash Storage             │  │
│  └───────────┬──────────────────┘  │
└──────────────┼──────────────────────┘
               │
               │ 2. Multi-Channel Delivery
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────┐    ┌──────────┐
│  Email   │    │   SMS    │
│  Service │    │  Service │
└────┬──────┘    └────┬─────┘
     │                │
     │ 3. User Receives Codes
     │
     ▼
┌─────────────────────────────────────┐
│   User Validates                    │
│  - Token Validation                 │
│  - Code Verification              │
│  - Rate Limit Check                 │
└───────────┬─────────────────────────┘
            │
            │ 4. Password Reset
            │
            ▼
┌─────────────────────────────────────┐
│   Password Service                  │
│  - Password Policy Enforcement      │
│  - Password History Check          │
│  - Breach Database Check            │
│  - Session Invalidation             │
└───────────┬─────────────────────────┘
            │
            │ 5. Confirmation
            │
            ▼
┌─────────────────────────────────────┐
│   Notification Service              │
│  - Email Confirmation               │
│  - SMS Confirmation                 │
│  - Security Alert                   │
└─────────────────────────────────────┘

Trust Boundaries:
- User ↔ Recovery Service (untrusted input)
- Recovery Service ↔ Email/SMS (secure channels)
- Recovery Service ↔ Database (authenticated, encrypted)
```

---

#### Key Takeaways

1. **Multi-channel verification**: Use email + SMS/app for recovery
2. **Risk-based authentication**: Adapt security based on risk level
3. **Prevent enumeration**: Don't reveal if account exists
4. **Rate limiting**: Prevent abuse and brute force
5. **Token security**: Use cryptographically secure tokens, store hashes
6. **User communication**: Clear, helpful, and secure messaging
7. **Session management**: Invalidate all sessions on password reset
8. **Audit logging**: Comprehensive logging for security events

---

## Advanced Level Scenarios

### Scenario 10: SSRF Attack & Incident Response

**Difficulty**: Advanced  
**Context**: Your production web application is under attack. An attacker exploited a Server-Side Request Forgery (SSRF) vulnerability in a public-facing API to access internal cloud metadata endpoints (AWS IMDS, Azure IMDS, GCP metadata server). They used the obtained temporary cloud credentials to read sensitive customer data from other services.

**Question**: Walk through detection, response, forensic investigation, and how you redesign to prevent recurrence.

---

#### Detailed Answer

**1. Detection**

**Initial Indicators:**
```
□ Unusual outbound requests from API servers to metadata endpoints
□ Cloud API calls from unexpected sources/IPs
□ Unusual credential usage patterns
□ Anomalous data access patterns
□ SIEM alerts for metadata endpoint access
□ WAF/API Gateway alerts for suspicious requests
```

**Detection Mechanisms:**

**1.1. Log Analysis:**
```bash
# Check application logs for SSRF patterns
grep -i "metadata" /var/log/app.log
grep -i "169.254.169.254" /var/log/app.log  # AWS IMDS
grep -i "metadata.google.internal" /var/log/app.log  # GCP

# Check CloudTrail for unusual API calls
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=GetSessionToken \
    --start-time 2024-01-01T00:00:00Z
```

**1.2. SIEM Alerts:**
- Alert on API server → metadata endpoint connections
- Alert on credential usage from new IPs
- Alert on unusual data access patterns
- Alert on privilege escalation attempts

**1.3. Network Monitoring:**
- Monitor outbound connections from API servers
- Detect connections to internal metadata endpoints
- Track unusual network patterns

**2. Immediate Response (First 15 Minutes)**

**Containment Actions:**
```bash
# 1. Patch SSRF vulnerability immediately
# Disable vulnerable endpoint or apply fix

# 2. Revoke compromised credentials
aws iam list-roles --query 'Roles[?RoleName==`api-server-role`]'
aws iam update-assume-role-policy --role-name api-server-role --policy-document file://new-policy.json

# 3. Rotate all temporary credentials
# Revoke all active sessions
aws sts get-caller-identity  # Check current credentials
# Revoke via IAM console or CLI

# 4. Restrict metadata endpoint access
# AWS: Enable IMDSv2, restrict access
aws ec2 modify-instance-metadata-options \
    --instance-id i-1234567890abcdef0 \
    --http-tokens required \
    --http-put-response-hop-limit 1

# 5. Block attacker IPs
# Update security groups, WAF rules
aws wafv2 update-ip-set \
    --scope REGIONAL \
    --id <ip-set-id> \
    --addresses <attacker-ip>/32
```

**3. Forensic Investigation (First 4 Hours)**

**Timeline Reconstruction:**
```
1. Identify SSRF vulnerability location
2. Trace attacker's actions:
   - Initial SSRF request
   - Metadata endpoint access
   - Credential extraction
   - Subsequent API calls
   - Data access patterns
3. Determine scope of compromise
4. Identify what data was accessed
```

**Investigation Steps:**

**3.1. SSRF Vulnerability Analysis:**
```python
# Vulnerable code example
@app.route('/api/fetch-url', methods=['POST'])
def fetch_url():
    url = request.json.get('url')
    # VULNERABLE: No validation
    response = requests.get(url)  # SSRF here
    return response.text

# Attacker payload
{
    "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name"
}
```

**3.2. Metadata Access Analysis:**
```bash
# Check CloudTrail for metadata API calls
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=ResourceName,AttributeValue=metadata

# Check for credential access
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=GetSessionToken
```

**3.3. Data Access Analysis:**
```bash
# Check S3 access logs
aws s3api list-objects-v2 --bucket sensitive-data-bucket

# Check database access logs
# Review application logs for data queries
# Check API Gateway logs for data access
```

**3.4. Attacker Attribution:**
- Source IP addresses
- User agents
- Request patterns
- Time of attack
- Geographic location

**4. Communication & Legal**

**Internal Communication:**
- Notify security team immediately
- Brief executive leadership
- Inform legal and compliance teams
- Document incident timeline

**External Communication:**
- **If data breach confirmed:**
  - Notify affected customers (within 72 hours for GDPR)
  - Report to regulatory authorities if required
  - Prepare public statement if necessary
  - Coordinate with legal for breach notifications

**Compliance Considerations:**
- GDPR: 72-hour notification requirement
- CCPA: Notification to California residents
- HIPAA: Breach notification to HHS
- PCI-DSS: If payment card data involved

**5. Remediation & Redesign**

**5.1. SSRF Prevention:**

**Input Validation:**
```python
import ipaddress
from urllib.parse import urlparse

def validate_url(url):
    parsed = urlparse(url)
    
    # Block private IP ranges
    private_ranges = [
        ipaddress.IPv4Network('10.0.0.0/8'),
        ipaddress.IPv4Network('172.16.0.0/12'),
        ipaddress.IPv4Network('192.168.0.0/16'),
        ipaddress.IPv4Network('127.0.0.0/8'),
    ]
    
    # Block metadata endpoints
    blocked_hosts = [
        '169.254.169.254',  # AWS IMDS
        'metadata.google.internal',  # GCP
        '169.254.169.254',  # Azure IMDS
        'localhost',
        '127.0.0.1',
    ]
    
    host = parsed.hostname
    if host in blocked_hosts:
        raise ValueError("Blocked host")
    
    # Resolve and check IP
    ip = ipaddress.ip_address(host)
    for private_range in private_ranges:
        if ip in private_range:
            raise ValueError("Private IP not allowed")
    
    # Whitelist approach (better)
    allowed_domains = ['api.example.com', 'cdn.example.com']
    if host not in allowed_domains:
        raise ValueError("Domain not in whitelist")
    
    return url
```

**Network-Level Protections:**
- Use outbound proxy with URL filtering
- Block metadata endpoints at network level
- Implement network segmentation
- Use service mesh for service-to-service communication

**5.2. Metadata Endpoint Hardening:**

**AWS IMDS:**
```bash
# Enable IMDSv2 (session-based)
aws ec2 modify-instance-metadata-options \
    --instance-id i-1234567890abcdef0 \
    --http-tokens required \
    --http-put-response-hop-limit 1

# Restrict metadata access via IAM
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Deny",
            "Action": "*",
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "ec2:MetadataHttpEndpoint": "enabled"
                }
            }
        }
    ]
}
```

**5.3. Credential Management:**

**Least Privilege:**
- IAM roles with minimum necessary permissions
- Regular permission audits
- Use service-specific roles
- Implement permission boundaries

**Credential Rotation:**
- Automatic credential rotation
- Short-lived credentials (1 hour max)
- Monitor credential usage
- Alert on unusual credential access

**5.4. Monitoring & Detection:**

**Enhanced Monitoring:**
```python
# Monitor for SSRF patterns
def detect_ssrf_attempt(request):
    url = request.json.get('url', '')
    
    # Check for metadata endpoints
    metadata_indicators = [
        '169.254.169.254',
        'metadata.google.internal',
        'metadata.azure.com',
    ]
    
    for indicator in metadata_indicators:
        if indicator in url:
            alert_security_team({
                'type': 'SSRF_ATTEMPT',
                'url': url,
                'ip': request.remote_addr,
                'timestamp': datetime.utcnow()
            })
            return False
    
    return True
```

**6. Post-Incident Improvements**

**Process Improvements:**
- Security code reviews mandatory
- Automated SSRF testing in CI/CD
- Threat modeling for new features
- Security training for developers

**Technical Improvements:**
- Implement WAF rules for SSRF
- Network-level protections
- Enhanced logging and monitoring
- Regular security assessments

**Documentation:**
- Incident response playbook
- SSRF prevention guidelines
- Security architecture documentation
- Lessons learned document

---

#### Data Flow Diagram (DFD) - Attack Flow

```
┌─────────────┐
│  Attacker   │
│  (Internet) │
└──────┬──────┘
       │
       │ 1. SSRF Request
       │ POST /api/fetch-url
       │ {"url": "http://169.254.169.254/..."}
       │
       ▼
┌─────────────────────────────────────┐
│   Public API Server                 │
│  ┌──────────────────────────────┐  │
│  │  Vulnerable Endpoint          │  │
│  │  - No URL Validation          │  │
│  │  - Direct requests.get()     │  │
│  └───────────┬──────────────────┘  │
└──────────────┼──────────────────────┘
               │
               │ 2. Server Makes Request
               │ (From API Server)
               │
               ▼
┌─────────────────────────────────────┐
│   Cloud Metadata Service            │
│  (169.254.169.254)                  │
│  ┌──────────────────────────────┐  │
│  │  IAM Credentials              │  │
│  │  Temporary Access Tokens      │  │
│  └───────────┬──────────────────┘  │
└──────────────┼──────────────────────┘
               │
               │ 3. Credentials Returned
               │
               ▼
┌─────────────────────────────────────┐
│   Attacker Receives Credentials     │
│  (Via SSRF Response)                │
└───────────┬─────────────────────────┘
            │
            │ 4. Use Credentials
            │
            ▼
┌─────────────────────────────────────┐
│   Cloud Services                    │
│  - S3 Buckets (Customer Data)       │
│  - Databases (PII)                  │
│  - Other Services                   │
└─────────────────────────────────────┘

Trust Boundaries (Broken):
- Attacker ↔ API Server (should be blocked)
- API Server ↔ Metadata Service (should be restricted)
- Metadata Service ↔ Cloud Services (should use least privilege)
```

**Secure Architecture:**
```
┌─────────────┐
│  Attacker   │
└──────┬──────┘
       │
       │ SSRF Attempt
       │
       ▼
┌─────────────────────────────────────┐
│   Public API Server                 │
│  ┌──────────────────────────────┐  │
│  │  URL Validation               │  │
│  │  - Whitelist Domains          │  │
│  │  - Block Private IPs         │  │
│  │  - Block Metadata Endpoints   │  │
│  └───────────┬──────────────────┘  │
│              │                       │
│  ┌───────────▼──────────────────┐  │
│  │  Outbound Proxy               │  │
│  │  - URL Filtering              │  │
│  │  - Network Segmentation       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │ Blocked Request
              │
              ▼
┌─────────────────────────────────────┐
│   Metadata Service                  │
│  ┌──────────────────────────────┐  │
│  │  IMDSv2 (Session-Based)      │  │
│  │  - Restricted Access         │  │
│  │  - IAM Policies              │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘

Additional Protections:
- Network segmentation
- Service-specific IAM roles
- Least privilege permissions
- Comprehensive monitoring
```

---

#### Key Takeaways

1. **SSRF is dangerous**: Can lead to cloud credential theft
2. **Input validation is critical**: Always validate and sanitize URLs
3. **Network segmentation**: Isolate services, block metadata access
4. **Least privilege**: IAM roles with minimum permissions
5. **Monitor metadata access**: Alert on any metadata endpoint access
6. **Incident response**: Have playbook ready for SSRF incidents
7. **Defense in depth**: Multiple layers of protection

---

*[Additional Advanced Scenarios continue in Part 2...]*
