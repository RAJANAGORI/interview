# Cloud Security Architecture - Interview Questions

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: Explain the shared responsibility model in cloud security.**

**Answer:**

The shared responsibility model defines which security tasks are handled by the cloud provider and which are the customer's responsibility.

**Cloud Provider Responsibilities:**
- Physical infrastructure security (data centers, hardware)
- Network infrastructure security
- Hypervisor and virtualization layer
- Cloud services security (compute, storage, networking)

**Customer Responsibilities:**
- Data classification and protection
- Identity and access management (IAM)
- Application security
- Network security configuration (firewalls, security groups)
- Client-side encryption
- Operating system security (for IaaS)
- Platform and application management

**Key Principle:** The division of responsibility varies by service model:
- **IaaS:** Customer responsible for OS, applications, data
- **PaaS:** Customer responsible for applications and data
- **SaaS:** Customer responsible primarily for data and access

**Example:**
```
AWS EC2 (IaaS):
- AWS: Physical infrastructure, hypervisor
- Customer: OS patching, application security, IAM

AWS RDS (PaaS):
- AWS: Database engine, infrastructure
- Customer: Database configuration, access control

AWS S3 (Storage Service):
- AWS: Infrastructure, encryption at rest (if enabled)
- Customer: Access policies, encryption keys, data classification
```

---

### **Q2: How do you implement least privilege in cloud IAM?**

**Answer:**

Least privilege means granting only the minimum permissions necessary to perform required tasks.

**Implementation Strategies:**

1. **Start with Deny All:**
   - Default deny all permissions
   - Explicitly grant only what's needed

2. **Use Specific Actions:**
   ```json
   // Good: Specific actions
   {
     "Effect": "Allow",
     "Action": [
       "s3:GetObject",
       "s3:PutObject"
     ],
     "Resource": "arn:aws:s3:::my-bucket/*"
   }
   
   // Bad: Overly broad
   {
     "Effect": "Allow",
     "Action": ["s3:*"],
     "Resource": "*"
   }
   ```

3. **Resource-Level Permissions:**
   - Restrict to specific resources
   - Use resource ARNs instead of wildcards

4. **Condition-Based Access:**
   - Add conditions (IP, time, MFA)
   - Further restrict access context

5. **Regular Access Reviews:**
   - Quarterly access certifications
   - Remove unused permissions
   - Monitor for privilege escalation

**Best Practices:**
- Use IAM roles instead of users for applications
- Implement temporary credentials
- Enable MFA for privileged operations
- Use service accounts with minimal permissions
- Separate read and write permissions

---

### **Q3: Compare security groups and network ACLs in AWS.**

**Answer:**

**Security Groups:**
- **Type:** Stateful firewall
- **Scope:** Applied at instance level
- **Evaluation:** All rules evaluated, allow if any match
- **Default:** Deny all inbound, allow all outbound
- **Return Traffic:** Automatically allowed (stateful)
- **Use Case:** Instance-level security

**Network ACLs (NACLs):**
- **Type:** Stateless firewall
- **Scope:** Applied at subnet level
- **Evaluation:** Rules evaluated in order, first match applies
- **Default:** Allow all traffic
- **Return Traffic:** Must be explicitly allowed (stateless)
- **Use Case:** Subnet-level security

**Key Differences:**

| Feature | Security Groups | Network ACLs |
|---------|----------------|--------------|
| Stateful | Yes | No |
| Scope | Instance | Subnet |
| Rule Order | All evaluated | First match |
| Default | Deny inbound | Allow all |
| Return Traffic | Automatic | Manual |

**Best Practice:** Use both in layers:
- Security Groups: Primary defense (instance level)
- NACLs: Additional layer (subnet level)

---

### **Q4: How do you secure data at rest and in transit in cloud?**

**Answer:**

**Data at Rest Encryption:**

1. **AWS:**
   - S3: SSE-S3, SSE-KMS, SSE-C
   - EBS: Encryption with KMS
   - RDS: Encryption at rest with KMS
   - DynamoDB: Encryption with KMS

2. **Azure:**
   - Storage: Storage Service Encryption (SSE)
   - SQL: Transparent Data Encryption (TDE)
   - Disks: Azure Disk Encryption
   - Cosmos DB: Encryption at rest

3. **GCP:**
   - Cloud Storage: Customer-managed encryption keys (CMEK)
   - Cloud SQL: Encryption at rest
   - Compute Engine: Encrypted persistent disks
   - BigQuery: Encryption at rest

**Data in Transit Encryption:**

1. **TLS/SSL:**
   - Use TLS 1.2+ for all connections
   - Disable older protocols (SSL 3.0, TLS 1.0, 1.1)
   - Use strong cipher suites

2. **Certificate Management:**
   - AWS: Certificate Manager (ACM)
   - Azure: Key Vault certificates
   - GCP: Certificate Manager

3. **Private Connectivity:**
   - AWS: VPC endpoints, PrivateLink
   - Azure: Private Link, ExpressRoute
   - GCP: Private Google Access, VPC peering

**Example - End-to-End Encryption:**

```python
# Client-side encryption before upload
from cryptography.fernet import Fernet
import boto3

# Generate key (store in KMS in production)
key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt data
data = b"Sensitive data"
encrypted_data = cipher.encrypt(data)

# Upload to S3 with additional encryption
s3 = boto3.client('s3')
s3.put_object(
    Bucket='my-bucket',
    Key='encrypted-file',
    Body=encrypted_data,
    ServerSideEncryption='aws:kms'
)
```

---

### **Q5: How do you implement network segmentation in cloud?**

**Answer:**

Network segmentation isolates different parts of the network to limit lateral movement.

**AWS VPC Segmentation:**

1. **Subnet Design:**
   ```
   Public Subnets:
   - Load balancers
   - NAT gateways
   - Bastion hosts
   
   Private Subnets:
   - Application servers
   - Databases
   - Internal services
   ```

2. **Security Groups:**
   - Different security groups per tier
   - Allow only necessary communication
   - Deny by default

3. **Network ACLs:**
   - Additional subnet-level filtering
   - Control traffic between subnets

**Azure VNet Segmentation:**

1. **Hub-Spoke Topology:**
   - Hub VNet: Shared services (firewall, DNS)
   - Spoke VNets: Workloads isolated
   - VNet peering for connectivity

2. **Network Security Groups:**
   - Applied to subnets or NICs
   - Control traffic flow

**GCP VPC Segmentation:**

1. **Shared VPC:**
   - Centralized network management
   - Projects as network consumers
   - Isolated workloads

2. **Firewall Rules:**
   - Network-level filtering
   - Tag-based rules
   - Priority-based evaluation

**Best Practices:**
- Separate environments (dev, staging, prod)
- Use private subnets for applications
- Implement network policies
- Monitor network traffic
- Regular network audits

---

## **AWS-Specific Questions**

### **Q6: How do you secure an S3 bucket?**

**Answer:**

**Security Measures:**

1. **Block Public Access:**
   ```python
   s3.put_public_access_block(
       Bucket='my-bucket',
       PublicAccessBlockConfiguration={
           'BlockPublicAcls': True,
           'IgnorePublicAcls': True,
           'BlockPublicPolicy': True,
           'RestrictPublicBuckets': True
       }
   )
   ```

2. **Bucket Policy:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "DenyPublicAccess",
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::my-bucket/*",
         "Condition": {
           "StringNotEquals": {
             "aws:SourceIp": "203.0.113.0/24"
           }
         }
       }
     ]
   }
   ```

3. **Encryption:**
   - Enable server-side encryption
   - Use KMS for key management
   - Enable versioning

4. **Access Control:**
   - Use IAM policies
   - Enable access logging
   - Use presigned URLs for temporary access

5. **Monitoring:**
   - Enable CloudTrail
   - Set up S3 access logging
   - Configure alerts

---

### **Q7: Explain AWS IAM roles vs users.**

**Answer:**

**IAM Users:**
- Long-term credentials (access keys)
- Associated with a person
- Credentials stored in IAM
- Best for: Human access

**IAM Roles:**
- Temporary credentials (assumed)
- Associated with a service or application
- No credentials stored
- Best for: Service-to-service access

**When to Use Roles:**

```python
# Good: Application using IAM role
import boto3

# Credentials automatically assumed from EC2 instance role
s3 = boto3.client('s3')
s3.list_buckets()

# Bad: Hardcoded credentials
s3 = boto3.client(
    's3',
    aws_access_key_id='AKIA...',
    aws_secret_access_key='...'
)
```

**Best Practices:**
- Use roles for applications
- Use users only for human access
- Enable MFA for users
- Rotate access keys regularly
- Use cross-account roles for multi-account access

---

## **Azure-Specific Questions**

### **Q8: How do you implement conditional access in Azure AD?**

**Answer:**

Conditional access policies enforce access controls based on conditions.

**Policy Components:**

1. **Assignments:**
   - Users and groups
   - Cloud apps
   - Conditions (location, device, risk)

2. **Access Controls:**
   - Grant (require MFA, compliant device)
   - Block

**Example Policy:**

```json
{
  "displayName": "Require MFA for Admin Roles",
  "state": "enabled",
  "conditions": {
    "users": {
      "includeRoles": ["Global Administrator"]
    },
    "applications": {
      "includeApplications": ["All"]
    },
    "locations": {
      "includeLocations": ["All"],
      "excludeLocations": ["Trusted IPs"]
    }
  },
  "grantControls": {
    "operator": "AND",
    "builtInControls": ["mfa", "compliantDevice"]
  }
}
```

**Common Scenarios:**
- Require MFA for privileged roles
- Block access from untrusted locations
- Require compliant devices
- Block legacy authentication

---

### **Q9: How do you secure Azure Key Vault?**

**Answer:**

**Security Measures:**

1. **Access Policies:**
   - RBAC for key vault access
   - Specific permissions (get, list, set, delete)
   - Principle of least privilege

2. **Network Access:**
   - Private endpoints
   - VNet service endpoints
   - Firewall rules

3. **Monitoring:**
   - Diagnostic logs
   - Azure Monitor integration
   - Alert on access attempts

4. **Key Management:**
   - Use HSM-backed keys
   - Enable key rotation
   - Set expiration dates

**Example:**

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Use managed identity (no credentials in code)
credential = DefaultAzureCredential()
client = SecretClient(
    vault_url="https://my-vault.vault.azure.net/",
    credential=credential
)

# Access secret
secret = client.get_secret("database-password")
```

---

## **GCP-Specific Questions**

### **Q10: How do you secure GCP service accounts?**

**Answer:**

**Best Practices:**

1. **Use Workload Identity:**
   - Avoid service account keys
   - Use workload identity federation
   - Temporary credentials

2. **Least Privilege:**
   - Grant minimum necessary permissions
   - Use custom roles
   - Separate service accounts per application

3. **Key Management:**
   - Rotate keys regularly
   - Use key expiration
   - Monitor key usage

4. **Access Control:**
   - Use IAM bindings
   - Implement conditions
   - Regular access reviews

**Example - Workload Identity:**

```yaml
# Kubernetes service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  annotations:
    iam.gke.io/gcp-service-account: my-app@project.iam.gserviceaccount.com
```

---

## **Cross-Cloud Questions**

### **Q11: How do you detect and respond to security incidents in cloud?**

**Answer:**

**Detection:**

1. **Logging:**
   - Enable audit logs (CloudTrail, Activity Log, Cloud Audit)
   - Centralize logs
   - Retain per compliance requirements

2. **Monitoring:**
   - AWS: GuardDuty, Security Hub
   - Azure: Security Center, Sentinel
   - GCP: Security Command Center, Event Threat Detection

3. **Alerts:**
   - Unusual access patterns
   - Failed authentication attempts
   - Configuration changes
   - Privilege escalations

**Response:**

1. **Incident Response Plan:**
   - Define roles and responsibilities
   - Establish communication channels
   - Document procedures

2. **Containment:**
   - Isolate affected resources
   - Revoke compromised credentials
   - Block malicious IPs

3. **Investigation:**
   - Analyze logs
   - Identify root cause
   - Determine scope

4. **Remediation:**
   - Fix vulnerabilities
   - Restore from backups
   - Update security controls

---

### **Q12: How do you ensure compliance in cloud environments?**

**Answer:**

**Compliance Framework:**

1. **Identify Requirements:**
   - Regulatory (GDPR, HIPAA, PCI-DSS)
   - Industry standards (ISO 27001, SOC 2)
   - Internal policies

2. **Map Controls:**
   - Map requirements to cloud controls
   - Use compliance frameworks
   - Document controls

3. **Implement Controls:**
   - Encryption
   - Access controls
   - Monitoring
   - Data retention

4. **Continuous Compliance:**
   - Regular assessments
   - Automated compliance checks
   - Compliance dashboards
   - Remediation workflows

**Tools:**
- AWS: Security Hub, Config
- Azure: Security Center, Policy
- GCP: Security Command Center, Asset Inventory

---

## **Scenario-Based Questions**

### **Q13: You discover a public S3 bucket with sensitive data. What do you do?**

**Answer:**

**Immediate Actions:**

1. **Containment:**
   - Remove public access immediately
   - Enable Block Public Access
   - Review bucket policy

2. **Assessment:**
   - Determine what data was exposed
   - Check access logs (if enabled)
   - Identify who had access

3. **Notification:**
   - Notify security team
   - Inform affected parties (if required)
   - Consider legal/regulatory notification

4. **Remediation:**
   - Encrypt bucket contents
   - Implement proper access controls
   - Enable versioning and logging
   - Set up monitoring alerts

5. **Prevention:**
   - Review all buckets
   - Implement automated scanning
   - Add security checks to CI/CD
   - Train team on best practices

---

### **Q14: How would you design a secure multi-account AWS architecture?**

**Answer:**

**Architecture Design:**

1. **Account Structure:**
   ```
   Organization Account (Master)
   ├── Security Account (logging, security tools)
   ├── Shared Services Account (DNS, shared resources)
   ├── Development Account
   ├── Staging Account
   └── Production Account
   ```

2. **Security Controls:**
   - AWS Organizations for management
   - Service Control Policies (SCPs)
   - Centralized logging (Security Account)
   - Cross-account roles with least privilege

3. **Network Design:**
   - VPC per account
   - VPC peering or Transit Gateway
   - Centralized firewall (if needed)

4. **Access Management:**
   - SSO for user access
   - IAM roles for cross-account access
   - Separate service accounts per environment

5. **Monitoring:**
   - Centralized CloudTrail
   - Security Hub across accounts
   - GuardDuty in each account

---

### **Q15: How do you secure a containerized application in cloud?**

**Answer:**

**Multi-Layer Security:**

1. **Image Security:**
   - Use minimal base images
   - Scan for vulnerabilities
   - Sign images
   - Use trusted registries

2. **Runtime Security:**
   - Run as non-root user
   - Implement resource limits
   - Use security contexts
   - Enable seccomp, AppArmor

3. **Network Security:**
   - Network policies (Kubernetes)
   - Security groups (ECS/EKS)
   - Service mesh for mTLS

4. **Secrets Management:**
   - Use cloud secret managers
   - Avoid secrets in images
   - Rotate secrets regularly

5. **Monitoring:**
   - Container runtime monitoring
   - Log aggregation
   - Threat detection

**Cloud-Specific:**
- **AWS:** ECS task roles, EKS pod identity
- **Azure:** Managed identities, AKS pod identity
- **GCP:** Workload identity, GKE pod identity

---

## **Advanced Questions**

### **Q16: Explain zero trust architecture in cloud context.**

**Answer:**

Zero trust assumes no entity is trusted by default, regardless of location.

**Principles:**

1. **Verify Explicitly:**
   - Authenticate and authorize every access
   - Use identity as the perimeter

2. **Use Least Privilege:**
   - Grant minimum access
   - Just-in-time access
   - Risk-based access

3. **Assume Breach:**
   - Segment access
   - Encrypt end-to-end
   - Monitor continuously

**Implementation:**

1. **Identity:**
   - Strong authentication (MFA)
   - Device compliance
   - Conditional access

2. **Network:**
   - Micro-segmentation
   - Private endpoints
   - No implicit trust

3. **Data:**
   - Classification
   - Encryption
   - Access controls

**Cloud Services:**
- AWS: IAM, VPC, PrivateLink
- Azure: Conditional Access, Private Link
- GCP: VPC Service Controls, IAM Conditions

---

### **Q17: How do you implement defense in depth in cloud?**

**Answer:**

Defense in depth uses multiple security layers.

**Layers:**

1. **Identity:**
   - MFA
   - Strong passwords
   - Access reviews
   - Privileged access management

2. **Network:**
   - VPC/VNet isolation
   - Security groups/firewalls
   - DDoS protection
   - WAF

3. **Compute:**
   - OS hardening
   - Patch management
   - Host-based firewalls
   - Endpoint protection

4. **Data:**
   - Encryption at rest
   - Encryption in transit
   - Data classification
   - Backup encryption

5. **Application:**
   - Secure coding
   - Vulnerability scanning
   - WAF
   - API security

6. **Monitoring:**
   - Logging
   - SIEM
   - Threat detection
   - Incident response

**Example:**

```
User → MFA → VPN → WAF → Load Balancer → 
Security Group → Application → Database
     ↓              ↓            ↓
  CloudTrail    GuardDuty    Encryption
```

---

## **Conclusion**

Cloud security architecture requires understanding provider-specific services, implementing defense in depth, and maintaining continuous monitoring. Key areas include identity management, network security, data protection, and incident response.

---

## Depth: Interview follow-ups — Cloud Security Architecture

**Authoritative references:** [CSA CCM](https://cloudsecurityalliance.org/research/working-groups/cloud-controls-matrix) (controls matrix—high level); [AWS/Azure/GCP Well-Architected](https://docs.aws.amazon.com/wellarchitected/) **security pillars** (pick the provider you discuss); [NIST SP 800-144](https://csrc.nist.gov/publications/detail/sp/800-144/final) (general cloud guidance—older but foundational concepts).

**Follow-ups:**
- **Share responsibility model** — where your org’s obligation starts/ends.
- **Data plane vs control plane** attacks—IAM as the perimeter.
- **Landing zone / guardrails** — org-level policies vs team autonomy.

**Production verification:** Org-wide SCPs/policies; centralized logging; network segmentation diagrams current.

**Cross-read:** IAM, Zero Trust, Container Security, Secrets Management.

<!-- verified-depth-merged:v1 ids=cloud-security-architecture -->
