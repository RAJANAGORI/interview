# Threat Modeling - Interview Questions

## **Fundamental Questions**

### **Q1: What is threat modeling and why is it important?**

**Answer:** Threat modeling is a systematic process of identifying, analyzing, and addressing potential security risks in systems or applications. It answers four key questions:

1. **What are we building?** - Understand architecture, components, data flow
2. **What can go wrong?** - Identify threats and vulnerabilities
3. **What are we doing to protect it?** - Define security controls
4. **Did we do a good job?** - Validate mitigations and reassess

**Why it's important:**

- **Proactive security**: Identifies vulnerabilities before exploitation
- **Cost-effective**: Addresses issues early in development
- **Risk prioritization**: Focuses resources on high-risk threats
- **Compliance**: Helps meet regulatory requirements (GDPR, PCI-DSS)
- **Team awareness**: Educates team on security best practices

---

### **Q2: Explain the difference between CIA and AAA frameworks.**

**Answer:**

**CIA Framework** focuses on **security properties**:

- **Confidentiality**: Information accessible only to authorized parties
- **Integrity**: Data and systems remain accurate and unmodified
- **Availability**: Systems and data accessible when needed

**AAA Framework** focuses on **access control mechanisms**:

- **Authentication**: Verifying identity (who you are)
- **Authorization**: Determining permissions (what you can do)
- **Accounting**: Tracking actions (audit trail)

**Key Difference:**

- CIA answers: "What security properties must be protected?"
- AAA answers: "How do we control access to resources?"

**They are complementary:**

- CIA defines **what** needs protection
- AAA defines **how** to protect it
- Use both together for comprehensive security

**Example:**

```
CIA Analysis:
- Confidentiality: User passwords must be protected
- Integrity: Transaction amounts cannot be modified
- Availability: Payment service must be available

AAA Analysis:
- Authentication: MFA for user login
- Authorization: Users can only access own data
- Accounting: All access attempts logged

```

---

### **Q3: When would you use Design by Action vs Design by Component?**

**Answer:**

**Design by Action** - Use when:

- Analyzing **business processes** and workflows
- Focusing on **user journeys** and operations
- Assessing **API security** (REST, GraphQL)
- Compliance requirements (GDPR data export)
- Process-oriented systems

**Example:** Payment processing flow, user registration, order fulfillment

**Design by Component** - Use when:

- Analyzing **system architecture**
- Assessing **infrastructure security**
- Microservices and distributed systems
- Technology stack evaluation
- Deployment architecture

**Example:** Web server security, database security, API gateway security

**Best Practice:** Use **both approaches** for comprehensive analysis:

- Design by Action: Identify threats in business operations
- Design by Component: Identify threats in system architecture
- Cross-reference findings for complete coverage

---

## **CIA Framework Questions**

### **Q4: Explain each component of the CIA triad with examples.**

**Answer:**

**1. Confidentiality**

- **Definition**: Ensuring information is accessible only to authorized parties
- **Threats**: Unauthorized access, data interception, data leakage
- **Mitigations**: Encryption, access control, data classification
- **Example**: Credit card numbers encrypted in database, only authorized payment service can decrypt

**2. Integrity**

- **Definition**: Ensuring data and systems remain accurate and unmodified
- **Threats**: Data tampering, unauthorized modification, man-in-the-middle
- **Mitigations**: Digital signatures, hash functions, access controls
- **Example**: Financial transactions signed digitally, any modification detected

**3. Availability**

- **Definition**: Ensuring systems and data are accessible when needed
- **Threats**: DoS/DDoS attacks, system failures, resource exhaustion
- **Mitigations**: Redundancy, load balancing, DDoS protection
- **Example**: Payment service deployed across multiple regions, auto-scaling during peak load

---

### **Q5: How do you assess CIA requirements for an asset?**

**Answer:**

**Step 1: Classify Asset**

- Determine asset type (data, system, service)
- Assess business criticality
- Identify regulatory requirements

**Step 2: Assess Confidentiality**

- Data sensitivity level (Public, Internal, Confidential, Restricted)
- Regulatory requirements (GDPR, HIPAA, PCI-DSS)
- Business impact of disclosure

**Step 3: Assess Integrity**

- Impact of data modification
- Business impact of tampering
- Trust and reputation impact

**Step 4: Assess Availability**

- Required uptime (SLA requirements)
- Business impact of downtime
- User impact

**Example Assessment:**

```
Asset: Payment Transaction Database

Confidentiality: CRITICAL
- Contains PII and payment data
- PCI-DSS requirement
- High business impact if breached

Integrity: CRITICAL
- Transaction amounts must be accurate
- Financial impact of tampering
- Regulatory compliance

Availability: HIGH
- 99.9% uptime required
- Revenue impact of downtime
- Customer trust impact

```

---

### **Q6: How do you map STRIDE threats to CIA properties?**

**Answer:**

**Mapping STRIDE to CIA:**

| STRIDE Threat | Primary CIA Impact | Secondary Impact |
| --- | --- | --- |
| Spoofing | Confidentiality | Integrity |
| Tampering | Integrity | Confidentiality |
| Repudiation | Integrity | Confidentiality |
| Information Disclosure | Confidentiality | - |
| Denial of Service | Availability | - |
| Elevation of Privilege | Confidentiality, Integrity | Availability |

**Example Mapping:**

```
Threat: SQL Injection

STRIDE: Tampering, Information Disclosure
CIA Impact:
- Integrity: Can modify data
- Confidentiality: Can read sensitive data
- Availability: Can cause DoS via resource exhaustion

Mitigation Strategy:
- Confidentiality: Encryption, access control
- Integrity: Input validation, parameterized queries
- Availability: Rate limiting, resource quotas

```

---

## **AAA Framework Questions**

### **Q7: Explain the three components of AAA with examples.**

**Answer:**

**1. Authentication**

- **Definition**: Verifying identity of users, services, or systems
- **Methods**: Passwords, MFA, certificates, biometrics
- **Example**: User logs in with username/password + TOTP code

**2. Authorization**

- **Definition**: Determining what actions authenticated entities can perform
- **Models**: RBAC, ABAC, DAC, MAC
- **Example**: User authenticated, but can only access own data (authorization check)

**3. Accounting (Auditing)**

- **Definition**: Tracking and logging security-relevant events
- **Purpose**: Accountability, compliance, forensic analysis
- **Example**: All login attempts, data access, and modifications logged

**Real-World Example:**

```
E-commerce Platform:

Authentication:
- User logs in with email/password
- MFA required for sensitive operations
- API uses OAuth 2.0 tokens

Authorization:
- Users can only view/edit own orders
- Admins can view all orders
- Payment service can access payment data

Accounting:
- All login attempts logged
- All order modifications logged
- All payment transactions logged
- Logs stored in SIEM for analysis

```

---

### **Q8: How do you design authorization for a microservices architecture?**

**Answer:**

**Approach:**

**1. Service-Level Authorization**

- Each service enforces its own authorization
- Service-to-service authentication (mTLS)
- API gateway handles initial authorization

**2. Centralized Authorization Service**

- Single source of truth for permissions
- Services query authorization service
- Caching for performance

**3. Token-Based Authorization**

- JWT tokens with embedded permissions
- OAuth 2.0 scopes
- Token validation at each service

**4. Policy-Based Authorization**

- ABAC (Attribute-Based Access Control)
- Policies defined centrally
- Dynamic authorization decisions

**Example Implementation:**

```
Architecture:
User → API Gateway → Authorization Service
                    ↓
                    Microservices (validate tokens)

Authorization Flow:
1. User authenticates, receives JWT token
2. Token contains user ID and scopes
3. API Gateway validates token
4. Each microservice checks token scopes
5. Service queries authorization service for fine-grained permissions
6. All authorization decisions logged

```

---

### **Q9: What are the threats to AAA and how do you mitigate them?**

**Answer:**

**Authentication Threats:**

1. **Credential Theft**
    - **Threat**: Phishing, keyloggers, credential stuffing
    - **Mitigation**: MFA, password managers, account lockout
2. **Weak Authentication**
    - **Threat**: Weak passwords, no MFA
    - **Mitigation**: Strong password policies, MFA enforcement
3. **Session Hijacking**
    - **Threat**: Stolen session tokens
    - **Mitigation**: Secure session management, HTTPS, HttpOnly cookies

**Authorization Threats:**

1. **Privilege Escalation**
    - **Threat**: Gaining unauthorized higher permissions
    - **Mitigation**: Principle of least privilege, regular access reviews
2. **Missing Authorization Checks**
    - **Threat**: Bypassing authorization
    - **Mitigation**: Authorization middleware, defense in depth
3. **IDOR (Insecure Direct Object Reference)**
    - **Threat**: Accessing other users' resources
    - **Mitigation**: Resource-level authorization checks

**Accounting Threats:**

1. **Log Tampering**
    - **Threat**: Modifying or deleting logs
    - **Mitigation**: Immutable logs, centralized logging, integrity checks
2. **Insufficient Logging**
    - **Threat**: Missing security events
    - **Mitigation**: Comprehensive logging policy, automated logging

---

## **Design Approach Questions**

### **Q10: Walk me through a Design by Action threat modeling session.**

**Answer:**

**Step 1: Identify Critical Actions**

```
E-commerce Platform Actions:
1. User Registration
2. User Login
3. Add to Cart
4. Checkout
5. Payment Processing
6. Order Fulfillment

```

**Step 2: Map Action Flow**

```
Action: Payment Processing

Flow:
1. User initiates payment (input: amount, payment method)
2. System validates payment method
3. System processes payment (external API call)
4. System updates order status (database)
5. System sends confirmation (email/SMS)

```

**Step 3: Identify Threats per Step**

```
Step 1: User Input
- Threat: Amount tampering
- CIA Impact: Integrity
- AAA Gap: Missing server-side validation

Step 2: Payment Validation
- Threat: Validation bypass
- CIA Impact: Integrity
- AAA Gap: Weak authorization

Step 3: External API Call
- Threat: Man-in-the-middle, API key theft
- CIA Impact: Confidentiality, Integrity
- AAA Gap: Weak authentication

Step 4: Database Update
- Threat: SQL Injection, unauthorized modification
- CIA Impact: Integrity
- AAA Gap: Missing authorization

Step 5: Notification
- Threat: Information disclosure
- CIA Impact: Confidentiality
- AAA Gap: Insufficient data protection

```

**Step 4: Design Mitigations**

```
Mitigations:
1. Server-side validation (amount, payment method)
2. TLS 1.3 for API calls, certificate pinning
3. Parameterized queries, input sanitization
4. Encryption for sensitive data in notifications
5. Comprehensive audit logging

```

---

### **Q11: How do you perform Design by Component threat modeling?**

**Answer:**

**Step 1: Identify Components**

```
Microservices Architecture:
1. API Gateway
2. Authentication Service
3. User Service
4. Payment Service
5. Order Service
6. Database
7. Message Queue
8. Cache

```

**Step 2: Map Component Interactions**

```
User → API Gateway → Authentication Service
                    ↓
                    User Service → Database
                    ↓
                    Payment Service → External Gateway
                    ↓
                    Order Service → Database

```

**Step 3: Identify Trust Boundaries**

```
External (Untrusted):
- Internet users
- External APIs

DMZ (Semi-Trusted):
- API Gateway
- Load Balancer

Internal (Trusted):
- Microservices
- Internal databases

Highly Trusted:
- Authentication service
- Key management

```

**Step 4: Assess Threats per Component**

```
Component: Payment Service

Threats:
- Payment data theft (Confidentiality)
- Transaction tampering (Integrity)
- Service unavailability (Availability)
- Weak authentication (Authentication)
- Missing authorization (Authorization)
- Insufficient logging (Accounting)

CIA Requirements:
- Confidentiality: High (payment data)
- Integrity: Critical (transactions)
- Availability: High (payment processing)

AAA Requirements:
- Authentication: mTLS for service-to-service
- Authorization: Role-based access
- Accounting: All transactions logged

```

**Step 5: Design Component-Level Mitigations**

```
Mitigations:
1. Encryption (TLS 1.3, AES-256)
2. mTLS for service authentication
3. RBAC for service functions
4. Comprehensive logging
5. Redundancy and failover

```

---

## **OTM Format Questions**

### **Q12: What is OTM and why is it important?**

**Answer:**

**OTM (Open Threat Modeling Format)** is a platform-independent, machine-readable format for defining threat models.

**Key Benefits:**

1. **Machine-Readable**
    - Enables automation
    - Tool integration (SAST, DAST, SIEM)
    - Automated risk calculation
2. **Platform-Independent**
    - Works with any threat modeling tool
    - Standardized format
    - Vendor-agnostic
3. **Version Control**
    - Threat models in Git
    - Track changes over time
    - Collaboration
4. **Integration**
    - CI/CD pipelines
    - Security toolchains
    - Risk dashboards

**Example Use Case:**

```
OTM File → CI/CD Pipeline → Validate → Generate Report
                              ↓
                         SAST Integration
                              ↓
                         Risk Dashboard

```

---

### **Q13: How do you structure a threat model in OTM format?**

**Answer:**

**OTM Structure:**

```yaml
otmVersion: "0.2.0"

# Project Information
project:
  name: "E-commerce Platform"
  id: "ecommerce-v1"
  description: "Online shopping platform"

# System Representation
representations:
  - name: "System Architecture"
    id: "arch-1"
    type: "diagram"

# Assets (Components)
assets:
  - name: "Payment Service"
    id: "asset-payment"
    type: "process"
    description: "Payment processing service"

# Threats
threats:
  - name: "Payment Amount Tampering"
    id: "threat-tamper-1"
    description: "Attacker modifies payment amount"
    categories: ["Tampering"]
    cwes: ["CWE-345"]
    risk:
      likelihood: 50
      impact: 100
    attributes:
      cia_impact: "Integrity"
      aaa_gap: "Authorization"

# Mitigations
mitigations:
  - name: "Input Validation"
    id: "mitigation-validate-1"
    description: "Validate payment amounts server-side"
    riskReduction: 80
    attributes:
      addresses_cia: "Integrity"
      addresses_aaa: "Authorization"

# Threat Instances (Mapping)
threats:
  - threat: "threat-tamper-1"
    state: "mitigated"
    mitigations:
      - mitigation: "mitigation-validate-1"
        state: "implemented"

```

---

### **Q14: How do you integrate OTM into a CI/CD pipeline?**

**Answer:**

**Integration Steps:**

**1. Store OTM in Repository**

```
repository/
  ├── threat-models/
  │   ├── payment-service.otm.yaml
  │   ├── user-service.otm.yaml
  │   └── api-gateway.otm.yaml

```

**2. Create CI/CD Pipeline**

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
          otm-validator threat-models/*.otm.yaml

      - name: Check Risk Threshold
        run: |
          otm-risk-check threat-models/*.otm.yaml --max-risk 70

      - name: Generate Report
        run: |
          otm-report threat-models/*.otm.yaml --format html
          # Upload report as artifact

```

**3. Automated Risk Assessment**

```python
# risk_check.py
import yaml

def check_risk(otm_file):
    with open(otm_file) as f:
        otm = yaml.safe_load(f)

    for threat in otm['threats']:
        risk = threat['risk']
        score = (risk['likelihood'] * risk['impact']) / 100

        # Apply mitigations
        for mitigation in threat.get('mitigations', []):
            reduction = mitigation['riskReduction']
            score *= (1 - reduction / 100)

        if score > 70:
            raise Exception(f"High risk threat: {threat['name']}")

```

---

## **Advanced Questions**

### **Q15: How do you combine CIA, AAA, STRIDE, and design approaches?**

**Answer:**

**Integrated Approach:**

**Step 1: Choose Design Approach**

- Design by Action: For business processes
- Design by Component: For architecture
- Both: For comprehensive analysis

**Step 2: Apply CIA Framework**

- Assess Confidentiality requirements
- Assess Integrity requirements
- Assess Availability requirements

**Step 3: Apply AAA Framework**

- Design Authentication mechanisms
- Design Authorization policies
- Design Accounting (logging) strategy

**Step 4: Use STRIDE for Threat Identification**

- Map STRIDE threats to CIA properties
- Identify AAA gaps
- Prioritize based on risk

**Step 5: Document in OTM**

- Structure findings in OTM format
- Include CIA/AAA mappings
- Enable automation and integration

**Example:**

```
Action: Payment Processing (Design by Action)

CIA Analysis:
- Confidentiality: Payment data encrypted
- Integrity: Transaction amounts protected
- Availability: Service must be available

AAA Analysis:
- Authentication: User authenticated
- Authorization: User can only pay for own orders
- Accounting: All payments logged

STRIDE Threats:
- Tampering: Amount modification
- Information Disclosure: Payment data theft

OTM Documentation:
- Threats with CIA/AAA attributes
- Mitigations addressing CIA/AAA
- Risk scores calculated

```

---

### **Q16: How do you assess risk in threat modeling?**

**Answer:**

**Risk Assessment Formula:**

```
Risk = Impact × Likelihood

```

**Impact Assessment (CIA-based):**

**Confidentiality Impact:**

- Low: Public information
- Medium: Internal information
- High: Confidential information
- Critical: Restricted information (PII, payment data)

**Integrity Impact:**

- Low: Non-critical data
- Medium: Important data
- High: Critical data
- Critical: Financial transactions, legal documents

**Availability Impact:**

- Low: Non-critical services
- Medium: Important services
- High: Critical services
- Critical: Revenue-generating services

**Likelihood Assessment:**

- Low (0-25): Rare, requires sophisticated attack
- Medium (26-50): Possible, moderate complexity
- High (51-75): Likely, common vulnerability
- Critical (76-100): Very likely, easy to exploit

**Risk Calculation:**

```
Example:
Threat: SQL Injection

Impact: 90 (High - Data breach)
Likelihood: 70 (High - Common vulnerability)

Risk Score = (90 × 70) / 100 = 63

With Mitigation (80% risk reduction):
Risk Score = 63 × (1 - 0.80) = 12.6

```

**Risk Matrix:**

| Impact | Likelihood | Risk Level | Priority |
| --- | --- | --- | --- |
| Critical | High | **CRITICAL** | Immediate |
| High | High | **HIGH** | High Priority |
| Medium | High | **MEDIUM** | Planned |
| Low | Low | **LOW** | Monitor |

---

## **Scenario-Based Questions**

### **Q17: Perform threat modeling for a payment API using Design by Action and CIA/AAA.**

**Answer:**

**Action: Process Payment API**

**Flow:**

1. Client sends payment request (POST /api/payments)
2. API validates request (amount, payment method)
3. API authenticates user (JWT token)
4. API authorizes user (check permissions)
5. API processes payment (external gateway)
6. API updates database (transaction record)
7. API sends confirmation (webhook/email)

**CIA Analysis:**

**Confidentiality:**

- Payment data must be encrypted
- API keys must be protected
- User data must not be exposed

**Threats:**

- Payment data interception
- API key theft
- Information disclosure in logs

**Mitigations:**

- TLS 1.3 for all communication
- Encryption at rest (AES-256)
- Secure key management
- Log sanitization

**Integrity:**

- Payment amounts cannot be modified
- Transaction records must be accurate
- API responses must be tamper-proof

**Threats:**

- Amount tampering
- Transaction modification
- Man-in-the-middle attacks

**Mitigations:**

- Server-side validation
- Digital signatures
- Parameterized queries
- Input sanitization

**Availability:**

- Payment API must be accessible
- 99.9% uptime required
- Graceful degradation

**Threats:**

- DDoS attacks
- Resource exhaustion
- Service failures

**Mitigations:**

- Rate limiting
- Auto-scaling
- Redundancy
- DDoS protection

**AAA Analysis:**

**Authentication:**

- Users must be authenticated
- JWT tokens validated
- MFA for sensitive operations

**Threats:**

- Token theft
- Token forgery
- Authentication bypass

**Mitigations:**

- Strong token signing (RS256)
- Short token expiration
- HttpOnly, Secure cookies
- Token rotation

**Authorization:**

- Users can only pay for own orders
- Role-based access control
- Scope-based permissions

**Threats:**

- Privilege escalation
- IDOR vulnerabilities
- Missing authorization checks

**Mitigations:**

- Resource-level authorization
- Principle of least privilege
- Authorization middleware
- Regular access reviews

**Accounting:**

- All payment attempts logged
- Audit trail for compliance
- Tamper-proof logs

**Threats:**

- Log tampering
- Insufficient logging
- Unauthorized log access

**Mitigations:**

- Immutable logs
- Comprehensive logging
- Centralized SIEM
- Log integrity verification

**OTM Structure:**

```yaml
threats:
  - name: "Payment Amount Tampering"
    categories: ["Tampering"]
    risk:
      likelihood: 50
      impact: 100
    attributes:
      cia_impact: "Integrity"
      aaa_gap: "Authorization"

  - name: "Payment Data Theft"
    categories: ["Information Disclosure"]
    risk:
      likelihood: 40
      impact: 95
    attributes:
      cia_impact: "Confidentiality"
      aaa_gap: "Authentication"

```

---

### **Q18: Threat model a microservices architecture using Design by Component and OTM.**

**Answer:**

**Architecture:**

- API Gateway
- Authentication Service
- User Service
- Payment Service
- Order Service
- Database (PostgreSQL)
- Cache (Redis)
- Message Queue (RabbitMQ)

**Component Analysis:**

**1. API Gateway**

```
CIA:
- Confidentiality: Medium (tokens, API keys)
- Integrity: High (request validation)
- Availability: High (entry point)

AAA:
- Authentication: Token validation
- Authorization: Initial authorization
- Accounting: All requests logged

Threats:
- DDoS attacks
- API key theft
- Request tampering

Mitigations:
- Rate limiting
- WAF (Web Application Firewall)
- API key rotation
- Request validation

```

**2. Payment Service**

```
CIA:
- Confidentiality: Critical (payment data)
- Integrity: Critical (transactions)
- Availability: High (payment processing)

AAA:
- Authentication: mTLS for service-to-service
- Authorization: Role-based access
- Accounting: All transactions logged

Threats:
- Payment data theft
- Transaction tampering
- Service unavailability

Mitigations:
- Encryption (TLS, AES-256)
- Input validation
- Redundancy
- Comprehensive logging

```

**OTM Documentation:**

```yaml
otmVersion: "0.2.0"
project:
  name: "E-commerce Microservices"
  id: "ecommerce-microservices-v1"

assets:
  - name: "API Gateway"
    id: "asset-gateway"
    type: "process"

  - name: "Payment Service"
    id: "asset-payment"
    type: "process"

threats:
  - name: "Payment Data Theft"
    id: "threat-payment-theft"
    categories: ["Information Disclosure"]
    risk:
      likelihood: 40
      impact: 95
    attributes:
      component: "asset-payment"
      cia_impact: "Confidentiality"
      aaa_gap: "Authentication"

mitigations:
  - name: "Encryption"
    id: "mitigation-encrypt"
    riskReduction: 90
    attributes:
      addresses_cia: "Confidentiality"
      addresses_aaa: "Authentication"

```

---

## **Summary**

These questions cover:

- Fundamental threat modeling concepts
- CIA and AAA frameworks
- Design by Action and Design by Component approaches
- OTM format and integration
- Advanced techniques and real-world scenarios

**Key Points to Remember:**

- Use multiple frameworks together
- CIA and AAA are complementary
- Design approaches can be combined
- OTM enables automation and integration
- Risk assessment is critical for prioritization