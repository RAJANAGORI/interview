# Advanced Threat Modeling - Comprehensive Guide

## **Introduction**

### **What is Advanced Threat Modeling?**

Advanced threat modeling goes beyond basic STRIDE analysis to provide comprehensive security assessment using multiple frameworks, design approaches, and standardized formats. It enables:

- **Systematic risk assessment** using CIA and AAA frameworks
- **Structured analysis** through design-by-action and design-by-component approaches
- **Automation and integration** via OTM format
- **Comprehensive coverage** of security properties and access control mechanisms

### **Why Multiple Frameworks?**

Different frameworks answer different questions:

- **CIA**: What security properties must be protected?
- **AAA**: How do we control access?
- **STRIDE**: How can the system be attacked?
- **Design Approaches**: How do we structure the analysis?

Using multiple frameworks provides **comprehensive coverage** and **defense in depth**.

---

## **CIA Framework (Confidentiality, Integrity, Availability)**

### **Overview**

The CIA triad is the foundation of information security, representing three core security properties that must be protected.

### **Confidentiality**

**Definition:** Ensuring that information is accessible only to authorized users, systems, or processes.

**Threats to Confidentiality:**

- Unauthorized access to data
- Data interception (network sniffing, MitM)
- Data leakage (logs, error messages, backups)
- Insufficient access controls
- Weak encryption

**Mitigations:**

- Encryption (at rest and in transit)
- Access control (RBAC, ABAC)
- Data classification and labeling
- Secure communication channels (TLS/SSL)
- Data loss prevention (DLP)
- Secure storage and disposal

**Example - E-commerce Payment System:**

```
Confidentiality Requirements:
- Credit card numbers must be encrypted (PCI-DSS)
- Customer PII must be protected (GDPR)
- Payment tokens must not be exposed in logs
- API keys must be stored securely

Threats:
- SQL Injection exposing credit card data
- Unencrypted database backups
- API keys in source code
- Sensitive data in error messages

Mitigations:
- AES-256 encryption for data at rest
- TLS 1.3 for data in transit
- Tokenization for credit card numbers
- Secure key management (HSM, Key Vault)

```

### **Integrity**

**Definition:** Ensuring that data and systems remain accurate, complete, and unmodified by unauthorized parties.

**Threats to Integrity:**

- Unauthorized data modification
- Data corruption
- Tampering with system configurations
- Man-in-the-middle attacks
- Insecure data transmission

**Mitigations:**

- Digital signatures
- Hash functions (SHA-256, SHA-512)
- Checksums and integrity checks
- Access controls and audit trails
- Secure communication protocols
- Version control and change management

**Example - Financial Transaction System:**

```
Integrity Requirements:
- Transaction amounts cannot be modified
- Account balances must be accurate
- Audit logs must be tamper-proof
- System configurations must be protected

Threats:
- SQL Injection modifying transaction amounts
- Man-in-the-middle altering payment data
- Unauthorized configuration changes
- Log tampering to hide fraudulent activity

Mitigations:
- Database constraints and triggers
- Digital signatures on transactions
- Immutable audit logs
- Configuration management tools
- Hash-based integrity verification

```

### **Availability**

**Definition:** Ensuring that systems and data are accessible and usable when needed by authorized users.

**Threats to Availability:**

- Denial of Service (DoS) attacks
- Distributed Denial of Service (DDoS)
- System failures and outages
- Resource exhaustion
- Natural disasters

**Mitigations:**

- Redundancy and failover
- Load balancing
- Rate limiting and throttling
- DDoS protection (CloudFlare, AWS Shield)
- Backup and disaster recovery
- High availability architectures
- Monitoring and alerting

**Example - Cloud-Based SaaS Application:**

```
Availability Requirements:
- 99.9% uptime SLA (8.76 hours downtime/year)
- Sub-second response times
- Graceful degradation during peak load
- Disaster recovery within 4 hours

Threats:
- DDoS attacks overwhelming servers
- Database connection pool exhaustion
- Single point of failure in architecture
- Cloud provider outages

Mitigations:
- Multi-region deployment
- Auto-scaling based on load
- CDN for static content
- Database replication and failover
- Circuit breakers and rate limiting
- DDoS protection services

```

### **CIA Threat Modeling Process**

**Step 1: Identify Assets**

```
Data Assets:
- Customer PII (Confidentiality)
- Financial transactions (Integrity)
- System configurations (Integrity)
- API keys and secrets (Confidentiality)

System Assets:
- Web servers (Availability)
- Databases (Confidentiality, Integrity, Availability)
- APIs (All three)
- Authentication services (Confidentiality, Availability)

```

**Step 2: Assess CIA Requirements**

```
For each asset, determine:
- Confidentiality Level: Public, Internal, Confidential, Restricted
- Integrity Level: Low, Medium, High, Critical
- Availability Level: Standard, High, Critical

Example:
- Credit Card Data:
  Confidentiality: Restricted (encrypted, access-controlled)
  Integrity: Critical (cannot be modified)
  Availability: High (must be accessible for transactions)

```

**Step 3: Identify Threats**

```
Use CIA-specific threat categories:

Confidentiality Threats:
- Unauthorized access
- Data leakage
- Eavesdropping
- Insufficient encryption

Integrity Threats:
- Data tampering
- Unauthorized modification
- Man-in-the-middle
- Configuration drift

Availability Threats:
- DoS/DDoS
- Resource exhaustion
- System failures
- Network outages

```

**Step 4: Map Threats to Assets**

```markdown
Create threat-asset matrix:

| Asset | Confidentiality Threat | Integrity Threat | Availability Threat |
|-------|----------------------|-----------------|-------------------|
| User Database | SQL Injection | Data tampering | Connection exhaustion |
| Payment API | API key theft | Transaction modification | Rate limit bypass |
| Config Files | Secret exposure | Unauthorized changes | File system failure |

```

**Step 5: Assess Risk**

```
Risk = Impact × Likelihood

Impact based on CIA:
- Confidentiality: Data sensitivity, regulatory impact
- Integrity: Business impact, trust impact
- Availability: Revenue impact, user impact

Likelihood:
- Attack complexity
- Existing controls
- Threat actor capability
- Exposure level

```

**Step 6: Design Mitigations**

```
Prioritize based on risk:
- High Risk: Immediate mitigation
- Medium Risk: Planned mitigation
- Low Risk: Accept or monitor

Example Mitigation Strategy:
- Confidentiality: Encryption + Access Control
- Integrity: Digital Signatures + Audit Logs
- Availability: Redundancy + DDoS Protection

```

### **CIA Risk Assessment Matrix**

| CIA Property | Impact Level | Likelihood | Risk Level | Mitigation Priority |
| --- | --- | --- | --- | --- |
| Confidentiality (PII) | High | High | **CRITICAL** | Immediate |
| Integrity (Transactions) | High | Medium | **HIGH** | High Priority |
| Availability (API) | Medium | High | **HIGH** | High Priority |
| Confidentiality (Logs) | Medium | Low | **MEDIUM** | Planned |
| Integrity (Config) | Low | Medium | **MEDIUM** | Planned |
| Availability (Static) | Low | Low | **LOW** | Monitor |

---

## **AAA Framework (Authentication, Authorization, Accounting)**

### **Overview**

AAA provides a framework for access control, ensuring that only authorized entities can access resources and that all access is tracked.

### **Authentication**

**Definition:** Verifying the identity of users, services, or systems attempting to access resources.

**Authentication Methods:**

- **Something you know**: Passwords, PINs, security questions
- **Something you have**: Tokens, smart cards, mobile devices
- **Something you are**: Biometrics (fingerprint, face, iris)
- **Something you do**: Behavioral biometrics

**Multi-Factor Authentication (MFA):**

- Requires two or more authentication factors
- Significantly reduces risk of credential compromise
- Common combinations: Password + SMS, Password + TOTP, Password + Biometric

**Threats to Authentication:**

- Credential theft (phishing, keyloggers)
- Weak passwords
- Password reuse
- Session hijacking
- Brute force attacks
- Social engineering

**Mitigations:**

- Strong password policies
- Multi-factor authentication
- Password managers
- Account lockout after failed attempts
- CAPTCHA for automated attacks
- Secure session management
- Biometric authentication

**Example - Enterprise SSO System:**

```
Authentication Requirements:
- Support multiple identity providers (SAML, OAuth, LDAP)
- MFA for sensitive operations
- Session timeout after inactivity
- Password complexity requirements

Threats:
- Credential stuffing attacks
- Session fixation
- Man-in-the-middle during authentication
- Weak identity provider configuration

Mitigations:
- OAuth 2.0 with PKCE
- SAML with proper signature validation
- MFA enforcement
- Session ID regeneration after login
- Certificate pinning

```

### **Authorization**

**Definition:** Determining what actions an authenticated entity is permitted to perform on specific resources.

**Authorization Models:**

**1. Role-Based Access Control (RBAC):**

```
Roles: Admin, Manager, User, Guest
Permissions assigned to roles
Users assigned to roles

Example:
- Admin: Full access
- Manager: Read/Write to assigned resources
- User: Read own data, Write own data
- Guest: Read public data only

```

**2. Attribute-Based Access Control (ABAC):**

```
Access decisions based on:
- User attributes (department, clearance level)
- Resource attributes (classification, owner)
- Environmental attributes (time, location)
- Action attributes (read, write, delete)

Example:
- User from Finance department
- Accessing Financial data
- During business hours
- From corporate network
→ Allow read access

```

**3. Discretionary Access Control (DAC):**

```
Resource owners control access
Common in file systems

Example:
- File owner sets permissions
- Owner can grant/revoke access
- Used in Unix/Linux file systems

```

**4. Mandatory Access Control (MAC):**

```
System-enforced access control
Based on security labels
Common in military/government systems

Example:
- Top Secret, Secret, Confidential labels
- Users have clearance levels
- System enforces access rules

```

**Threats to Authorization:**

- Privilege escalation
- Insecure direct object references (IDOR)
- Missing authorization checks
- Broken access control
- Overly permissive policies

**Mitigations:**

- Principle of least privilege
- Regular access reviews
- Authorization checks at every layer
- Centralized authorization service
- Regular policy audits
- Separation of duties

**Example - API Authorization:**

```
Authorization Requirements:
- API endpoints require proper scopes
- Users can only access their own data
- Admins have additional permissions
- Rate limiting based on user role

Threats:
- Missing authorization checks
- Token scope escalation
- IDOR vulnerabilities
- Privilege escalation via API

Mitigations:
- OAuth 2.0 scopes
- Resource-level authorization checks
- Input validation and sanitization
- Regular security testing
- API gateway with authorization policies

```

### **Accounting (Auditing)**

**Definition:** Tracking and logging all security-relevant events for accountability, compliance, and forensic analysis.

**What to Log:**

- Authentication events (success, failure)
- Authorization decisions (granted, denied)
- Data access (read, write, delete)
- Configuration changes
- Administrative actions
- Security events (attacks, anomalies)

**Log Requirements:**

- **Completeness**: All security events logged
- **Integrity**: Logs cannot be tampered with
- **Retention**: Appropriate retention period
- **Access Control**: Only authorized personnel can access logs
- **Performance**: Logging doesn't impact system performance

**Threats to Accounting:**

- Log tampering
- Insufficient logging
- Log deletion
- Unauthorized log access
- Performance impact from excessive logging

**Mitigations:**

- Immutable logs (write-once storage)
- Centralized logging (SIEM)
- Log integrity verification (hashes, signatures)
- Secure log storage
- Regular log reviews
- Automated log analysis

**Example - Compliance Logging:**

```
Accounting Requirements (GDPR, PCI-DSS):
- Log all access to PII
- Log all authentication attempts
- Log all data modifications
- Retain logs for 7 years
- Tamper-proof logs

Implementation:
- Structured logging (JSON format)
- Centralized SIEM (Splunk, ELK)
- Log encryption at rest
- Regular integrity checks
- Automated alerting on anomalies

```

### **AAA Threat Modeling Process**

**Step 1: Identify Authentication Points**

```
System Entry Points:
- User login (web, mobile)
- API authentication
- Service-to-service authentication
- Administrative access

Authentication Mechanisms:
- Username/password
- OAuth 2.0
- API keys
- mTLS certificates

```

**Step 2: Map Authorization Requirements**

```
For each resource/action:
- Who can access?
- What can they do?
- Under what conditions?

Example:
- Payment API:
  Who: Authenticated users
  What: Create payment, view own payments
  Conditions: Valid payment method, sufficient balance

```

**Step 3: Define Accounting Requirements**

```
What events to log:
- Authentication: All login attempts
- Authorization: All access denials
- Data access: Sensitive data access
- Changes: All modifications

Compliance requirements:
- GDPR: PII access logging
- PCI-DSS: Payment data access
- SOX: Financial data changes

```

**Step 4: Identify AAA Threats**

```
Authentication Threats:
- Weak authentication
- Credential theft
- Session hijacking
- MFA bypass

Authorization Threats:
- Missing authorization checks
- Privilege escalation
- IDOR vulnerabilities
- Overly permissive policies

Accounting Threats:
- Insufficient logging
- Log tampering
- Unauthorized log access

```

**Step 5: Design AAA Controls**

```
Authentication Controls:
- Strong password policies
- MFA enforcement
- Secure session management
- Account lockout

Authorization Controls:
- RBAC/ABAC implementation
- Principle of least privilege
- Regular access reviews
- Authorization middleware

Accounting Controls:
- Comprehensive logging
- Immutable log storage
- Log integrity verification
- SIEM integration

```

### **AAA Risk Assessment**

| AAA Component | Threat | Impact | Likelihood | Risk | Mitigation |
| --- | --- | --- | --- | --- | --- |
| Authentication | Credential theft | High | High | **CRITICAL** | MFA, Strong passwords |
| Authentication | Session hijacking | High | Medium | **HIGH** | Secure sessions, HTTPS |
| Authorization | Privilege escalation | High | Medium | **HIGH** | Least privilege, Regular reviews |
| Authorization | Missing checks | High | High | **CRITICAL** | Authorization middleware |
| Accounting | Log tampering | Medium | Low | **MEDIUM** | Immutable logs |
| Accounting | Insufficient logging | High | Medium | **HIGH** | Comprehensive logging |

---

## **Design by Action Approach**

### **Overview**

Design by Action focuses on **business operations and workflows** rather than system components. It analyzes threats based on what the system **does** rather than what it **is**.

### **When to Use Design by Action**

- **Process-oriented systems**: Workflows, business processes
- **API security**: REST APIs, GraphQL endpoints
- **User journeys**: Authentication flows, payment processes
- **Business operations**: Order processing, data export
- **Compliance requirements**: GDPR data export, audit trails

### **Design by Action Process**

**Step 1: Identify Critical Actions**

List all business-critical operations:

```
Example - E-commerce Platform:
1. User Registration
2. User Authentication
3. Product Browsing
4. Add to Cart
5. Checkout
6. Payment Processing
7. Order Fulfillment
8. Order Cancellation
9. User Profile Update
10. Password Reset

```

**Step 2: Map Action Flow**

For each action, document the flow:

```
Example - Payment Processing Action:

1. User initiates payment
   → Input: Payment method, amount, order ID

2. System validates payment method
   → Check: Card validity, sufficient funds

3. System processes payment
   → External: Payment gateway API call

4. System updates order status
   → Database: Update order record

5. System sends confirmation
   → Notification: Email, SMS

```

**Step 3: Identify Threats per Action**

For each step in the action flow, identify threats:

```
Payment Processing - Threat Analysis:

Step 1: User Input
- Threat: Input manipulation (amount tampering)
- CIA Impact: Integrity
- AAA Gap: Missing input validation

Step 2: Payment Validation
- Threat: Bypass validation (race condition)
- CIA Impact: Integrity, Confidentiality
- AAA Gap: Insufficient authorization

Step 3: External API Call
- Threat: Man-in-the-middle, API key theft
- CIA Impact: Confidentiality, Integrity
- AAA Gap: Weak authentication

Step 4: Database Update
- Threat: SQL Injection, unauthorized modification
- CIA Impact: Integrity
- AAA Gap: Missing authorization check

Step 5: Notification
- Threat: Information disclosure, email interception
- CIA Impact: Confidentiality
- AAA Gap: Insufficient data protection

```

**Step 4: Map CIA/AAA to Actions**

```
Action: Payment Processing

CIA Analysis:
- Confidentiality: Payment data must be encrypted
- Integrity: Transaction amounts cannot be modified
- Availability: Payment service must be accessible

AAA Analysis:
- Authentication: User must be authenticated
- Authorization: User can only pay for own orders
- Accounting: All payment attempts must be logged

```

**Step 5: Design Mitigations**

```
Action: Payment Processing

Mitigations:
1. Input Validation
   - Validate amount against order total
   - Sanitize all inputs
   - Use parameterized queries

2. Secure Communication
   - TLS 1.3 for API calls
   - Certificate pinning
   - API key rotation

3. Authorization Checks
   - Verify user owns the order
   - Check payment permissions
   - Enforce rate limits

4. Audit Logging
   - Log all payment attempts
   - Include user ID, amount, timestamp
   - Store in immutable log system

```

### **Design by Action Template**

```markdown
## Action: [Action Name]

### Description
[What this action does]

### Flow
1. [Step 1]
2. [Step 2]
3. [Step 3]

### CIA Requirements
- Confidentiality: [Requirements]
- Integrity: [Requirements]
- Availability: [Requirements]

### AAA Requirements
- Authentication: [Requirements]
- Authorization: [Requirements]
- Accounting: [Requirements]

### Threats
| Step | Threat | CIA Impact | AAA Gap | Risk |
|------|--------|------------|---------|------|
| 1 | [Threat] | [Impact] | [Gap] | [Risk] |

### Mitigations
- [Mitigation 1]
- [Mitigation 2]
- [Mitigation 3]

```

### **Real-World Example: User Registration Action**

```markdown
## Action: User Registration

### Description
New user creates an account in the system.

### Flow
1. User submits registration form (email, password, name)
2. System validates input (email format, password strength)
3. System checks if email exists
4. System creates user account
5. System sends verification email
6. User clicks verification link
7. System activates account

### CIA Requirements
- Confidentiality: Password must be hashed, email protected
- Integrity: User data must be accurate, verification link must be valid
- Availability: Registration service must be accessible

### AAA Requirements
- Authentication: Email verification required
- Authorization: New users have limited permissions
- Accounting: All registration attempts logged

### Threats
| Step | Threat | CIA Impact | AAA Gap | Risk |
|------|--------|------------|---------|------|
| 1 | Input injection (XSS, SQLi) | Integrity | Missing validation | HIGH |
| 2 | Validation bypass | Integrity | Weak validation | MEDIUM |
| 3 | Email enumeration | Confidentiality | Information disclosure | MEDIUM |
| 4 | Account creation race condition | Integrity | Missing transaction | MEDIUM |
| 5 | Email interception | Confidentiality | Unencrypted email | LOW |
| 6 | Verification link tampering | Integrity | Weak token | HIGH |
| 7 | Account activation bypass | Integrity | Missing verification | HIGH |

### Mitigations
- Input validation and sanitization
- Strong password requirements
- Rate limiting to prevent enumeration
- Secure token generation for verification
- HTTPS for all communication
- Comprehensive logging

```

---

## **Design by Component Approach**

### **Overview**

Design by Component focuses on **system architecture and components** rather than business operations. It analyzes threats based on what the system **is** rather than what it **does**.

### **When to Use Design by Component**

- **Architecture analysis**: Microservices, distributed systems
- **Infrastructure security**: Cloud services, network components
- **System design**: Component interactions, data flow
- **Technology stack**: Specific technologies and frameworks
- **Deployment architecture**: Containers, serverless, hybrid

### **Design by Component Process**

**Step 1: Identify Components**

List all system components:

```
Example - Microservices Architecture:

1. API Gateway
2. Authentication Service
3. User Service
4. Payment Service
5. Order Service
6. Notification Service
7. Database (PostgreSQL)
8. Cache (Redis)
9. Message Queue (RabbitMQ)
10. Load Balancer
11. CDN
12. Monitoring Service

```

**Step 2: Map Component Interactions**

Document how components interact:

```
Example - Component Interaction:

User → API Gateway → Authentication Service
                    ↓
                    User Service → Database
                    ↓
                    Payment Service → External Payment Gateway
                    ↓
                    Order Service → Database
                    ↓
                    Notification Service → Email/SMS Gateway

```

**Step 3: Identify Trust Boundaries**

Define trust boundaries between components:

```
Trust Boundaries:

External (Untrusted):
- Internet users
- External APIs
- Third-party services

DMZ (Semi-Trusted):
- API Gateway
- Load Balancer
- CDN

Internal (Trusted):
- Microservices
- Internal databases
- Message queues

Highly Trusted:
- Authentication service
- Key management service

```

**Step 4: Identify Threats per Component**

For each component, identify threats:

```
Component: API Gateway

Threats:
- DDoS attacks (Availability)
- API key theft (Confidentiality)
- Request tampering (Integrity)
- Rate limit bypass (Availability)
- Authentication bypass (Authorization)

CIA Impact:
- Confidentiality: Medium (API keys, tokens)
- Integrity: High (Request manipulation)
- Availability: High (DoS attacks)

AAA Gaps:
- Authentication: Weak API key management
- Authorization: Missing request validation
- Accounting: Insufficient logging

```

**Step 5: Map CIA/AAA to Components**

```
Component: Payment Service

CIA Analysis:
- Confidentiality: High (Payment data encryption)
- Integrity: Critical (Transaction integrity)
- Availability: High (Payment processing must be available)

AAA Analysis:
- Authentication: Service-to-service authentication (mTLS)
- Authorization: Role-based access to payment functions
- Accounting: All payment operations logged

```

**Step 6: Design Component-Level Mitigations**

```
Component: Payment Service

Mitigations:
1. Encryption
   - TLS 1.3 for all communications
   - AES-256 for data at rest
   - Key management via HSM

2. Authentication
   - mTLS for service-to-service
   - OAuth 2.0 for user authentication
   - API key rotation

3. Authorization
   - RBAC for service functions
   - Transaction-level authorization
   - Principle of least privilege

4. Monitoring
   - Comprehensive logging
   - Real-time monitoring
   - Anomaly detection

```

### **Design by Component Template**

```markdown
## Component: [Component Name]

### Description
[What this component does]

### Technology Stack
- [Technology 1]
- [Technology 2]

### Trust Boundary
[External/DMZ/Internal/Highly Trusted]

### Interactions
- Receives from: [Components]
- Sends to: [Components]

### CIA Requirements
- Confidentiality: [Requirements]
- Integrity: [Requirements]
- Availability: [Requirements]

### AAA Requirements
- Authentication: [Requirements]
- Authorization: [Requirements]
- Accounting: [Requirements]

### Threats
| Threat | CIA Impact | AAA Gap | Risk |
|--------|------------|---------|------|
| [Threat] | [Impact] | [Gap] | [Risk] |

### Mitigations
- [Mitigation 1]
- [Mitigation 2]

```

### **Real-World Example: Authentication Service Component**

```markdown
## Component: Authentication Service

### Description
Handles user authentication, token generation, and session management.

### Technology Stack
- Node.js/Express
- JWT for tokens
- Redis for session storage
- PostgreSQL for user data

### Trust Boundary
Internal (Trusted)

### Interactions
- Receives from: API Gateway, User Service
- Sends to: User Service, Notification Service

### CIA Requirements
- Confidentiality: High (Passwords, tokens must be protected)
- Integrity: High (Token signatures must be valid)
- Availability: High (Authentication must be available)

### AAA Requirements
- Authentication: Multi-factor authentication support
- Authorization: Token-based authorization
- Accounting: All authentication events logged

### Threats
| Threat | CIA Impact | AAA Gap | Risk |
|--------|------------|---------|------|
| Password brute force | Confidentiality | Weak password policy | HIGH |
| Token theft | Confidentiality | Insecure token storage | HIGH |
| Session hijacking | Confidentiality | Weak session management | HIGH |
| Token forgery | Integrity | Weak token signing | CRITICAL |
| DoS attack | Availability | No rate limiting | MEDIUM |

### Mitigations
- Strong password requirements + MFA
- HttpOnly, Secure cookies for tokens
- Short token expiration + refresh tokens
- Strong JWT signing (RS256)
- Rate limiting and CAPTCHA
- Comprehensive audit logging

```

---

## **Open Threat Modeling Format (OTM)**

### **Overview**

OTM (Open Threat Modeling Format) is a **platform-independent, machine-readable format** for defining threat models. It enables automation, integration, and standardization of threat modeling.

**Key Benefits:**

- **Machine-readable**: Enables automation and tool integration
- **Platform-independent**: Works with any threat modeling tool
- **Version control**: Threat models can be versioned like code
- **Collaboration**: Standardized format for team collaboration
- **Integration**: Connects to SAST, DAST, SIEM tools

### **OTM Structure**

Based on the [OTM specification](https://github.com/iriusrisk/OpenThreatModel), an OTM document contains:

```yaml
otmVersion: "0.2.0"
project:
  name: "E-commerce Platform"
  id: "ecommerce-platform-v1"

representations:
  - name: "System Architecture"
    id: "arch-diagram-1"
    type: "diagram"
    # Diagram data

assets:
  - name: "User Database"
    id: "asset-db-1"
    type: "data-store"
    # Asset properties

threats:
  - name: "SQL Injection"
    id: "threat-sqli-1"
    categories: ["Tampering"]
    risk:
      likelihood: 70
      impact: 90
    # Threat details

mitigations:
  - name: "Parameterized Queries"
    id: "mitigation-1"
    riskReduction: 80
    # Mitigation details

```

### **OTM Core Elements**

**1. Project**

```yaml
project:
  name: "Project Name"
  id: "unique-project-id"
  description: "Project description"

```

**2. Representations (Diagrams)**

```yaml
representations:
  - name: "Data Flow Diagram"
    id: "dfd-1"
    type: "diagram"
    size:
      width: 800
      height: 600

```

**3. Assets**

```yaml
assets:
  - name: "Web Server"
    id: "asset-web-1"
    type: "process"
    description: "Main web application server"
    attributes:
      technology: "Node.js"
      environment: "Production"

```

**4. Threats**

```yaml
threats:
  - name: "Cross-Site Scripting (XSS)"
    id: "threat-xss-1"
    description: "Attacker injects malicious scripts"
    categories:
      - "Tampering"
      - "Information Disclosure"
    cwes:
      - "CWE-79"
    risk:
      likelihood: 60
      likelihoodComment: "Common vulnerability in web apps"
      impact: 80
      impactComment: "Can steal user sessions and data"
    tags:
      - "web"
      - "injection"

```

**5. Mitigations**

```yaml
mitigations:
  - name: "Input Sanitization"
    id: "mitigation-1"
    description: "Sanitize all user inputs"
    riskReduction: 75
    attributes:
      standard: "OWASP-ASVS"
      implementation: "Content Security Policy"

```

**6. Threat Instances**

```yaml
threats:
  - threat: "threat-xss-1"
    state: "mitigated"
    mitigations:
      - mitigation: "mitigation-1"
        state: "implemented"

```

### **Creating OTM from Threat Model**

**Step 1: Define Project**

```yaml
otmVersion: "0.2.0"
project:
  name: "Payment Processing System"
  id: "payment-system-v2"
  description: "Secure payment processing microservice"

```

**Step 2: Define Assets**

```yaml
assets:
  - name: "Payment API"
    id: "asset-payment-api"
    type: "process"
    description: "REST API for payment processing"

  - name: "Payment Database"
    id: "asset-payment-db"
    type: "data-store"
    description: "Stores payment transactions"

  - name: "Payment Gateway"
    id: "asset-gateway"
    type: "external"
    description: "External payment gateway service"

```

**Step 3: Define Threats**

```yaml
threats:
  - name: "Payment Amount Tampering"
    id: "threat-tamper-1"
    description: "Attacker modifies payment amount"
    categories:
      - "Tampering"
    cwes:
      - "CWE-345"
    risk:
      likelihood: 50
      impact: 100
      impactComment: "Financial loss and fraud"

  - name: "Payment Data Theft"
    id: "threat-theft-1"
    description: "Attacker steals payment card data"
    categories:
      - "Information Disclosure"
    cwes:
      - "CWE-200"
    risk:
      likelihood: 40
      impact: 95
      impactComment: "PCI-DSS violation, customer trust loss"

```

**Step 4: Define Mitigations**

```yaml
mitigations:
  - name: "Input Validation"
    id: "mitigation-validate-1"
    description: "Validate payment amounts server-side"
    riskReduction: 80

  - name: "Encryption"
    id: "mitigation-encrypt-1"
    description: "Encrypt payment data at rest and in transit"
    riskReduction: 90

```

**Step 5: Map Threats to Assets**

```yaml
# In threat instance
threats:
  - threat: "threat-tamper-1"
    state: "mitigated"
    mitigations:
      - mitigation: "mitigation-validate-1"
        state: "implemented"

```

### **OTM Integration Examples**

**1. CI/CD Integration**

```yaml
# .github/workflows/threat-model.yml
name: Threat Model Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate OTM
        run: |
          otm-validator threat-model.otm.yaml
      - name: Generate Report
        run: |
          otm-report threat-model.otm.yaml --format html

```

**2. SAST Integration**

```python
# Parse OTM and generate SAST rules
import yaml

with open('threat-model.otm.yaml') as f:
    otm = yaml.safe_load(f)

for threat in otm['threats']:
    if 'CWE-79' in threat.get('cwes', []):
        # Generate XSS detection rule
        generate_sast_rule('xss', threat)

```

**3. Risk Dashboard**

```python
# Calculate risk scores from OTM
def calculate_risk(otm):
    risks = []
    for threat in otm['threats']:
        risk = threat['risk']
        score = (risk['likelihood'] * risk['impact']) / 100

        # Apply mitigations
        for mitigation in threat.get('mitigations', []):
            reduction = mitigation['riskReduction']
            score *= (1 - reduction / 100)

        risks.append({
            'threat': threat['name'],
            'risk_score': score
        })
    return risks

```

### **OTM Best Practices**

1. **Version Control**: Store OTM files in Git
2. **Validation**: Validate OTM structure before committing
3. **Automation**: Integrate OTM into CI/CD pipelines
4. **Documentation**: Include detailed descriptions
5. **Regular Updates**: Update OTM as system changes
6. **Tool Integration**: Use OTM with threat modeling tools

---

## **Combining Frameworks and Approaches**

### **Integrated Threat Modeling Process**

**Step 1: Start with Design Approach**

Choose primary approach based on system type:

- **Design by Action**: For process-oriented systems
- **Design by Component**: For architecture-oriented systems
- **Both**: For comprehensive analysis

**Step 2: Apply CIA Framework**

For each action/component, assess CIA requirements:

```
Action: Payment Processing

CIA Assessment:
- Confidentiality: Payment data must be encrypted
- Integrity: Transaction amounts cannot be modified
- Availability: Payment service must be available 99.9%

```

**Step 3: Apply AAA Framework**

For each action/component, assess AAA requirements:

```
Action: Payment Processing

AAA Assessment:
- Authentication: User must be authenticated
- Authorization: User can only pay for own orders
- Accounting: All payment attempts logged

```

**Step 4: Use STRIDE for Threat Identification**

Map STRIDE threats to CIA/AAA:

```
Threat: Payment Amount Tampering

STRIDE: Tampering
CIA Impact: Integrity
AAA Gap: Missing authorization check

```

**Step 5: Document in OTM Format**

Structure findings in OTM:

```yaml
threats:
  - name: "Payment Amount Tampering"
    categories: ["Tampering"]
    risk:
      likelihood: 50
      impact: 100
    # CIA/AAA mapping in attributes
    attributes:
      cia_impact: "Integrity"
      aaa_gap: "Authorization"

```

### **Comprehensive Example: E-commerce Platform**

**Design by Action + Design by Component + CIA + AAA + OTM**

```yaml
# OTM Document
otmVersion: "0.2.0"
project:
  name: "E-commerce Platform"
  id: "ecommerce-v1"

# Components (Design by Component)
assets:
  - name: "Payment Service"
    id: "asset-payment-service"
    type: "process"

  - name: "Payment Database"
    id: "asset-payment-db"
    type: "data-store"

# Actions (Design by Action)
# Represented as processes in OTM

# Threats with CIA/AAA mapping
threats:
  - name: "Payment Amount Tampering"
    id: "threat-payment-tamper"
    categories: ["Tampering"]
    risk:
      likelihood: 50
      impact: 100
    attributes:
      # CIA mapping
      confidentiality_impact: "None"
      integrity_impact: "Critical"
      availability_impact: "None"
      # AAA mapping
      authentication_required: "Yes"
      authorization_gap: "Missing server-side validation"
      accounting_required: "Yes"
    cwes:
      - "CWE-345"

  - name: "Payment Data Theft"
    id: "threat-payment-theft"
    categories: ["Information Disclosure"]
    risk:
      likelihood: 40
      impact: 95
    attributes:
      confidentiality_impact: "Critical"
      integrity_impact: "None"
      availability_impact: "None"
      authentication_required: "Yes"
      authorization_gap: "None"
      accounting_required: "Yes"
    cwes:
      - "CWE-200"

# Mitigations
mitigations:
  - name: "Input Validation"
    id: "mitigation-validate"
    riskReduction: 80
    attributes:
      addresses_cia: "Integrity"
      addresses_aaa: "Authorization"

  - name: "Encryption"
    id: "mitigation-encrypt"
    riskReduction: 90
    attributes:
      addresses_cia: "Confidentiality"

```

---

## **Advanced Threat Modeling Techniques**

### **Threat Modeling for Microservices**

**Challenges:**

- Multiple services and interactions
- Service-to-service authentication
- Distributed data
- Network communication

**Approach:**

1. Model each service as a component
2. Map service interactions
3. Identify trust boundaries
4. Assess CIA/AAA per service
5. Document in OTM format

### **Threat Modeling for APIs**

**Focus Areas:**

- Authentication (OAuth, API keys)
- Authorization (Scopes, permissions)
- Input validation
- Rate limiting
- Error handling

**Design by Action for APIs:**

```
Action: GET /api/users/{id}

CIA:
- Confidentiality: User data must be protected
- Integrity: Response must be accurate
- Availability: API must be accessible

AAA:
- Authentication: Valid API key/token
- Authorization: User can only access own data
- Accounting: All API calls logged

```

### **Threat Modeling for Cloud Services**

**Considerations:**

- Shared responsibility model
- Cloud provider security
- Configuration management
- Identity and access management (IAM)
- Network security groups

**Components to Model:**

- Cloud resources (VMs, containers, serverless)
- Storage (S3, databases)
- Networking (VPC, load balancers)
- Identity (IAM, SSO)

### **Threat Modeling for Mobile Applications**

**Focus Areas:**

- Device security
- App store security
- Data storage (local, cloud)
- Network communication
- Authentication and authorization

**Design by Action:**

```
Action: Mobile App Login

CIA:
- Confidentiality: Credentials protected
- Integrity: Authentication tokens valid
- Availability: Login service accessible

AAA:
- Authentication: MFA support
- Authorization: Role-based access
- Accounting: Login attempts logged

```

---

## **Real-World Case Studies**

### **Case Study 1: Payment Processing System**

**Scenario:** E-commerce platform processing credit card payments.

**Threat Modeling Approach:**

- Design by Action (Payment processing flow)
- CIA Framework (Confidentiality, Integrity critical)
- AAA Framework (Strong authentication, authorization)
- OTM Documentation

**Key Findings:**

- Payment amount tampering (Integrity threat)
- Payment data theft (Confidentiality threat)
- Missing server-side validation (Authorization gap)

**Mitigations Implemented:**

- Input validation and sanitization
- Encryption (TLS 1.3, AES-256)
- Strong authentication (MFA)
- Comprehensive logging

### **Case Study 2: Microservices Architecture**

**Scenario:** Distributed system with multiple microservices.

**Threat Modeling Approach:**

- Design by Component (Each service as component)
- CIA Framework (Per-service assessment)
- AAA Framework (Service-to-service authentication)
- OTM Documentation

**Key Findings:**

- Weak service-to-service authentication
- Insufficient network segmentation
- Missing authorization checks between services

**Mitigations Implemented:**

- mTLS for service-to-service communication
- Network policies and segmentation
- Service mesh with authorization policies
- Centralized logging and monitoring

---

## **Best Practices and Recommendations**

### **Threat Modeling Best Practices**

1. **Start Early**: Begin threat modeling in design phase
2. **Iterate**: Update threat model as system evolves
3. **Use Multiple Frameworks**: Combine CIA, AAA, STRIDE
4. **Document in OTM**: Use standardized format
5. **Involve Stakeholders**: Include developers, architects, security
6. **Prioritize**: Focus on high-risk threats first
7. **Validate**: Test mitigations and verify effectiveness

### **Framework Selection Guide**

| Scenario | Primary Framework | Secondary Framework | Design Approach |
| --- | --- | --- | --- |
| Data Protection | CIA | AAA | Design by Component |
| Access Control | AAA | CIA | Design by Action |
| API Security | AAA | CIA | Design by Action |
| Infrastructure | CIA | AAA | Design by Component |
| Business Process | CIA + AAA | STRIDE | Design by Action |
| Architecture | CIA + AAA | STRIDE | Design by Component |

### **OTM Integration Strategy**

1. **Version Control**: Store OTM files in Git
2. **CI/CD Integration**: Validate OTM in pipelines
3. **Tool Integration**: Connect to SAST/DAST tools
4. **Reporting**: Generate risk dashboards from OTM
5. **Automation**: Automate threat model updates

---

## **Summary**

Advanced threat modeling combines multiple frameworks and approaches:

- **CIA Framework**: Protects security properties (Confidentiality, Integrity, Availability)
- **AAA Framework**: Controls access (Authentication, Authorization, Accounting)
- **Design by Action**: Analyzes business operations and workflows
- **Design by Component**: Analyzes system architecture and components
- **OTM Format**: Standardizes threat model documentation

**Best Practice**: Use all frameworks and approaches together for comprehensive security analysis!

---

**References:**

- [Open Threat Modeling Format (OTM)](https://github.com/iriusrisk/OpenThreatModel)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [Microsoft Threat Modeling](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)