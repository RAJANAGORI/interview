# Infrastructure as Code (IaC) Security - Quick Reference

## **Common Security Issues**

| Issue | Risk | Mitigation |
|-------|------|-----------|
| **Hardcoded secrets** | Credential exposure | Secret management services |
| **Overly permissive IAM** | Unauthorized access | Least privilege policies |
| **Public resources** | Data exposure | Block public access |
| **Missing encryption** | Data breach | Enable encryption by default |
| **Insecure networks** | Network attacks | Restrictive security groups |
| **State file exposure** | Infrastructure compromise | Remote encrypted state |

---

## **Secrets Management**

### **Terraform**
```hcl
# AWS Secrets Manager
data "aws_secretsmanager_secret" "db_password" {
  name = "database/password"
}

# HashiCorp Vault
data "vault_generic_secret" "db_password" {
  path = "secret/database"
}

# Sensitive variable
variable "db_password" {
  type      = string
  sensitive = true
}
```

### **CloudFormation**
```yaml
Parameters:
  DatabasePassword:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /database/password
```

---

## **IAM Least Privilege**

```json
// Good: Specific actions
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::bucket/*",
  "Condition": {
    "IpAddress": {"aws:SourceIp": "203.0.113.0/24"}
  }
}

// Bad: Overly broad
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}
```

---

## **Security Scanning Tools**

| Tool | Type | Use Case |
|------|------|----------|
| **Checkov** | Static analysis | Multi-cloud scanning |
| **Terrascan** | Static analysis | Policy enforcement |
| **TFLint** | Linter | Terraform validation |
| **cfn-lint** | Linter | CloudFormation validation |
| **OPA** | Policy engine | Policy as code |

---

## **Security Checklist**

### **Secrets**
- [ ] No hardcoded secrets
- [ ] Use secret management
- [ ] Secrets marked sensitive
- [ ] Secret rotation implemented

### **IAM**
- [ ] Least privilege policies
- [ ] No "*" actions
- [ ] Conditions added
- [ ] Regular reviews

### **Network**
- [ ] Private subnets
- [ ] Restrictive security groups
- [ ] No 0.0.0.0/0
- [ ] Network segmentation

### **Data Protection**
- [ ] Encryption at rest
- [ ] TLS in transit
- [ ] Key management
- [ ] Backup encryption

### **Code Quality**
- [ ] Code reviewed
- [ ] Automated scanning
- [ ] Policies enforced
- [ ] Version control

---

## **Terraform State Security**

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "production/terraform.tfstate"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:..."
    dynamodb_table = "terraform-lock"
  }
}
```

---

## **Policy as Code Examples**

### **OPA**
```rego
deny[msg] {
    resource.type == "aws_s3_bucket"
    not resource.server_side_encryption_configuration
    msg := "S3 buckets must have encryption"
}
```

### **Sentinel**
```javascript
main = rule {
    all tfplan.resource_changes as _, rc {
        rc.type is not "aws_s3_bucket" or
        rc.change.after.server_side_encryption_configuration
    }
}
```

---

## **CI/CD Integration**

```yaml
# GitHub Actions
- name: Checkov
  uses: bridgecrewio/checkov-action@master
  with:
    directory: .
    framework: terraform

# Pre-commit
repos:
  - repo: https://github.com/bridgecrewio/checkov
    hooks:
      - id: checkov
```

---

## **Common Misconfigurations**

### **AWS**
- ❌ Public S3 buckets
- ❌ Security groups with 0.0.0.0/0
- ❌ IAM policies with "*"
- ❌ Unencrypted EBS

### **Azure**
- ❌ Public storage accounts
- ❌ NSG rules too permissive
- ❌ Missing encryption

### **GCP**
- ❌ Public Cloud Storage
- ❌ Firewall rules with 0.0.0.0/0
- ❌ Missing IAM conditions

---

## **Quick Commands**

```bash
# Checkov scan
checkov -d terraform/

# TFLint
tflint

# Terraform validate
terraform validate

# Terraform fmt check
terraform fmt -check
```

---

## **Key Takeaways**

1. **Never hardcode secrets** - Use secret management
2. **Least privilege** - Minimum necessary permissions
3. **Encryption by default** - Encrypt all data
4. **Network security** - Restrictive rules
5. **Automated scanning** - CI/CD integration
6. **Policy as code** - Automated enforcement
7. **Secure state** - Encrypted remote state

