# Cloud Security Architecture - Quick Reference

## **Shared Responsibility Model**

| Layer | AWS Responsibility | Customer Responsibility |
|-------|-------------------|----------------------|
| **Infrastructure** | Physical security, network | Network configuration |
| **Virtualization** | Hypervisor security | OS security (IaaS) |
| **Platform** | Managed services | Application security |
| **Data** | Infrastructure | Data classification, encryption |
| **Access** | IAM service | IAM policies, MFA |

---

## **AWS Security Services**

| Service | Purpose | Use Case |
|---------|---------|----------|
| **IAM** | Identity and access management | User roles, permissions |
| **VPC** | Network isolation | Private networks |
| **Security Groups** | Instance firewall | EC2 access control |
| **KMS** | Key management | Encryption keys |
| **CloudTrail** | Audit logging | Compliance, forensics |
| **GuardDuty** | Threat detection | Anomaly detection |
| **WAF** | Web application firewall | DDoS, OWASP protection |
| **Shield** | DDoS protection | Network layer protection |

---

## **Azure Security Services**

| Service | Purpose | Use Case |
|---------|---------|----------|
| **Azure AD** | Identity management | SSO, MFA |
| **Key Vault** | Secrets management | Keys, certificates |
| **NSG** | Network firewall | VNet traffic control |
| **Azure Firewall** | Managed firewall | Centralized protection |
| **Security Center** | Security posture | Compliance, recommendations |
| **Sentinel** | SIEM | Threat detection, response |
| **DDoS Protection** | DDoS mitigation | Network protection |

---

## **GCP Security Services**

| Service | Purpose | Use Case |
|---------|---------|----------|
| **Cloud IAM** | Access control | Roles, permissions |
| **Cloud KMS** | Key management | Encryption keys |
| **VPC Firewall** | Network rules | Traffic filtering |
| **Cloud Armor** | DDoS/WAF | Application protection |
| **Security Command Center** | Security management | Threat detection |
| **VPC Service Controls** | Service perimeter | Data exfiltration prevention |

---

## **IAM Best Practices**

### **AWS IAM**

```json
// Good: Least privilege policy
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": "arn:aws:s3:::bucket/*",
    "Condition": {
      "IpAddress": {"aws:SourceIp": "203.0.113.0/24"}
    }
  }]
}
```

### **Azure RBAC**

```json
{
  "properties": {
    "roleDefinitionId": "/subscriptions/{id}/providers/Microsoft.Authorization/roleDefinitions/{role-id}",
    "principalId": "{user-id}",
    "scope": "/subscriptions/{id}/resourceGroups/{rg}"
  }
}
```

### **GCP IAM**

```yaml
bindings:
- members:
  - serviceAccount:app@project.iam.gserviceaccount.com
  role: roles/storage.objectViewer
  condition:
    expression: resource.name.startsWith('projects/_/buckets/public-')
```

---

## **Network Security Comparison**

| Feature | AWS | Azure | GCP |
|---------|-----|-------|-----|
| **Virtual Network** | VPC | VNet | VPC |
| **Stateful Firewall** | Security Groups | NSG | Firewall Rules |
| **Stateless Firewall** | NACL | NSG (stateless mode) | Firewall Rules |
| **DDoS Protection** | Shield | DDoS Protection | Cloud Armor |
| **WAF** | WAF | Application Gateway | Cloud Armor |
| **Private Connectivity** | PrivateLink | Private Link | Private Google Access |

---

## **Encryption Services**

| Provider | Key Management | Encryption at Rest | Encryption in Transit |
|----------|---------------|-------------------|---------------------|
| **AWS** | KMS | S3 SSE, EBS, RDS | TLS, VPC endpoints |
| **Azure** | Key Vault | Storage SSE, TDE | TLS, Private Link |
| **GCP** | Cloud KMS | CMEK, Cloud SQL | TLS, Private Access |

---

## **Security Checklist**

### **Identity & Access**
- [ ] MFA enabled for all users
- [ ] IAM policies follow least privilege
- [ ] Regular access reviews
- [ ] No hardcoded credentials
- [ ] Service accounts use workload identity

### **Network Security**
- [ ] VPC/VNet properly configured
- [ ] Security groups/firewalls follow least privilege
- [ ] No public access to databases
- [ ] DDoS protection enabled
- [ ] Network segmentation implemented

### **Data Protection**
- [ ] Encryption at rest enabled
- [ ] TLS 1.2+ for all connections
- [ ] Key management service used
- [ ] Key rotation implemented
- [ ] Data classification completed

### **Monitoring**
- [ ] Audit logging enabled
- [ ] Logs centralized
- [ ] Security alerts configured
- [ ] Incident response plan
- [ ] Regular security assessments

---

## **Common Misconfigurations**

### **AWS**
- ❌ Public S3 buckets
- ❌ Security groups with 0.0.0.0/0
- ❌ IAM policies with "*"
- ❌ Missing MFA
- ❌ Unencrypted EBS volumes

### **Azure**
- ❌ Public storage accounts
- ❌ NSG rules too permissive
- ❌ Missing MFA
- ❌ Unencrypted disks
- ❌ Exposed Key Vault

### **GCP**
- ❌ Public Cloud Storage buckets
- ❌ Firewall rules with 0.0.0.0/0
- ❌ Service account keys in code
- ❌ Missing organization policies
- ❌ Unencrypted persistent disks

---

## **Security Tools Matrix**

| Tool Type | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **SIEM** | Security Hub | Sentinel | Security Command Center |
| **Threat Detection** | GuardDuty | Security Center | Event Threat Detection |
| **Compliance** | Config | Policy | Asset Inventory |
| **Vulnerability** | Inspector | Defender | Container Analysis |
| **WAF** | WAF | Application Gateway | Cloud Armor |

---

## **Network Segmentation Patterns**

### **AWS VPC**
```
Public Subnet (10.0.1.0/24)
├── Load Balancer
└── NAT Gateway

Private Subnet (10.0.2.0/24)
├── Application Servers
└── Internal Services

Database Subnet (10.0.3.0/24)
└── RDS Instances
```

### **Azure VNet**
```
Hub VNet
├── Azure Firewall
└── Shared Services

Spoke VNet 1 (Dev)
└── Development Workloads

Spoke VNet 2 (Prod)
└── Production Workloads
```

### **GCP VPC**
```
Shared VPC (Host Project)
├── Network Admin
└── Shared Services

Service Project 1
└── Development Workloads

Service Project 2
└── Production Workloads
```

---

## **Quick Commands**

### **AWS**
```bash
# Check S3 bucket public access
aws s3api get-public-access-block --bucket my-bucket

# List IAM users with MFA
aws iam list-users --query 'Users[?PasswordLastUsed!=null]'

# Enable CloudTrail
aws cloudtrail create-trail --name my-trail --s3-bucket-name my-bucket
```

### **Azure**
```bash
# Check storage account public access
az storage account show --name mystorage --resource-group myrg --query allowBlobPublicAccess

# List users without MFA
az ad user list --query "[?mfaEnabled==false]"

# Enable diagnostic logs
az monitor diagnostic-settings create --name mydiag --resource myresource
```

### **GCP**
```bash
# Check bucket public access
gsutil iam get gs://my-bucket

# List service accounts
gcloud iam service-accounts list

# Enable audit logs
gcloud logging sinks create my-sink bigquery.googleapis.com/projects/my-project/datasets/my-dataset
```

---

## **Security Metrics**

| Metric | Target | Monitoring |
|--------|--------|-----------|
| **MFA Adoption** | 100% | IAM dashboard |
| **Public Resources** | 0 | Security Hub/Command Center |
| **Unencrypted Data** | 0% | Config/Asset Inventory |
| **Failed Logins** | < 1% | CloudTrail/Activity Log |
| **Privilege Escalations** | 0 | GuardDuty/Security Center |

---

## **Incident Response Steps**

1. **Detect** - Identify security event
2. **Contain** - Isolate affected resources
3. **Investigate** - Analyze logs and evidence
4. **Remediate** - Fix vulnerabilities
5. **Recover** - Restore services
6. **Lessons Learned** - Document and improve

---

## **Compliance Frameworks**

| Framework | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **SOC 2** | ✅ | ✅ | ✅ |
| **ISO 27001** | ✅ | ✅ | ✅ |
| **PCI-DSS** | ✅ | ✅ | ✅ |
| **HIPAA** | ✅ | ✅ | ✅ |
| **GDPR** | ✅ | ✅ | ✅ |

---

## **Key Takeaways**

1. **Shared Responsibility** - Understand provider vs customer responsibilities
2. **Least Privilege** - Grant minimum necessary permissions
3. **Defense in Depth** - Multiple security layers
4. **Encryption** - Encrypt data at rest and in transit
5. **Monitoring** - Continuous security monitoring
6. **Compliance** - Regular compliance assessments
7. **Automation** - Automate security controls

