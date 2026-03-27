# Infrastructure as Code (IaC) Security - Comprehensive Guide

## **Introduction**

### **What is Infrastructure as Code Security?**

Infrastructure as Code (IaC) security involves securing the code, tools, and processes used to define, provision, and manage cloud infrastructure. It encompasses secure coding practices, policy enforcement, automated scanning, and secure secret management for infrastructure definitions.

### **Why IaC Security Matters**

- **Scale:** Infrastructure is defined in code, vulnerabilities scale quickly
- **Automation:** Misconfigurations are automatically deployed
- **Compliance:** Infrastructure must meet security and compliance requirements
- **Visibility:** Code provides visibility into infrastructure security posture

**Key Principle:** Infrastructure code should be treated with the same security rigor as application code.

---

## **Common IaC Tools**

### **Terraform**

- Open-source infrastructure provisioning
- Multi-cloud support
- State management
- Module ecosystem

### **AWS CloudFormation**

- AWS-native IaC
- JSON/YAML templates
- Stack management
- Change sets

### **Azure Resource Manager (ARM)**

- Azure-native IaC
- JSON templates
- Resource groups
- Deployment scripts

### **Google Cloud Deployment Manager**

- GCP-native IaC
- YAML templates
- Composite types
- Deployment configurations

### **Pulumi**

- Multi-language support
- Real programming languages
- State management
- Policy as code

### **Ansible**

- Configuration management
- Playbooks
- Idempotent operations
- Agentless

---

## **Common IaC Security Issues**

### **1. Hardcoded Secrets**

**Problem:**
- Secrets stored in plaintext in code
- Committed to version control
- Accessible to anyone with repo access

**Example - Bad:**
```hcl
# Terraform - Bad
resource "aws_db_instance" "database" {
  password = "MySecretPassword123!"
}
```

**Solution:**
```hcl
# Terraform - Good
resource "aws_db_instance" "database" {
  password = var.db_password  # From environment or secret store
}

# Use AWS Secrets Manager
data "aws_secretsmanager_secret" "db_password" {
  name = "database/password"
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}

resource "aws_db_instance" "database" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

### **2. Overly Permissive IAM Policies**

**Problem:**
- IAM policies with "*" actions
- Resources accessible to everyone
- Missing conditions

**Example - Bad:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "*",
    "Resource": "*"
  }]
}
```

**Solution:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:PutObject"
    ],
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "IpAddress": {
        "aws:SourceIp": "203.0.113.0/24"
      }
    }
  }]
}
```

### **3. Public Resources**

**Problem:**
- S3 buckets publicly accessible
- Databases exposed to internet
- Storage accounts with public access

**Example - Bad:**
```hcl
# Terraform - Bad
resource "aws_s3_bucket" "data" {
  bucket = "my-public-bucket"
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id
  # Missing block_public_acls = true
}
```

**Solution:**
```hcl
# Terraform - Good
resource "aws_s3_bucket" "data" {
  bucket = "my-private-bucket"
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### **4. Missing Encryption**

**Problem:**
- Data stored unencrypted
- No encryption at rest
- Missing TLS configuration

**Example - Bad:**
```hcl
# Terraform - Bad
resource "aws_db_instance" "database" {
  # Missing storage_encrypted = true
}
```

**Solution:**
```hcl
# Terraform - Good
resource "aws_db_instance" "database" {
  storage_encrypted = true
  kms_key_id       = aws_kms_key.database.arn
}
```

### **5. Insecure Network Configurations**

**Problem:**
- Security groups allowing 0.0.0.0/0
- Missing network segmentation
- Databases accessible from internet

**Example - Bad:**
```hcl
# Terraform - Bad
resource "aws_security_group" "web" {
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**Solution:**
```hcl
# Terraform - Good
resource "aws_security_group" "web" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/24"]
  }
}
```

---

## **IaC Security Best Practices**

### **1. Secrets Management**

**Never Hardcode Secrets:**
- Use environment variables
- Use secret management services
- Use IaC secret management features

**Terraform Example:**
```hcl
# Use variables
variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database password"
}

# Or use AWS Secrets Manager
data "aws_secretsmanager_secret" "db_password" {
  name = "database/password"
}
```

**CloudFormation Example:**
```yaml
Parameters:
  DatabasePassword:
    Type: String
    NoEcho: true
    Description: Database password

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      MasterUserPassword: !Ref DatabasePassword
```

### **2. Least Privilege IAM**

**Principle:**
- Grant minimum necessary permissions
- Use specific actions
- Add conditions
- Regular reviews

**Terraform Example:**
```hcl
resource "aws_iam_policy" "s3_access" {
  name = "s3-read-only"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }]
  })
}
```

### **3. Encryption by Default**

**Enable Encryption:**
- Encrypt data at rest
- Use TLS for data in transit
- Use managed keys (KMS, Key Vault, Cloud KMS)

**Terraform Example:**
```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}
```

### **4. Network Security**

**Best Practices:**
- Use private subnets
- Restrict security group rules
- Implement network segmentation
- Use VPC endpoints for private connectivity

**Terraform Example:**
```hcl
resource "aws_security_group" "database" {
  name = "database-sg"
  
  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### **5. Code Review**

**Process:**
- Peer review for all IaC changes
- Security-focused reviews
- Automated scanning
- Approval workflows

**Checklist:**
- [ ] No hardcoded secrets
- [ ] IAM policies follow least privilege
- [ ] Encryption enabled
- [ ] Network security configured
- [ ] Resources not publicly accessible
- [ ] Resource limits set
- [ ] Monitoring enabled

### **6. Version Control**

**Best Practices:**
- Store all IaC in version control
- Use meaningful commit messages
- Tag releases
- Branch protection rules
- Require reviews

**GitHub Example:**
```yaml
# .github/workflows/terraform.yml
name: Terraform Security Scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Checkov
      uses: bridgecrewio/checkov-action@master
      with:
        directory: .
        framework: terraform
```

### **7. State Management**

**Security:**
- Encrypt state files
- Use remote state backends
- Enable state locking
- Restrict state access
- Enable versioning

**Terraform Example:**
```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-west-2:123456789012:key/12345678"
    dynamodb_table = "terraform-state-lock"
  }
}
```

---

## **IaC Security Scanning Tools**

### **Checkov**

- Open-source static analysis
- Multi-cloud support
- Policy as code
- CI/CD integration

**Usage:**
```bash
# Install
pip install checkov

# Scan Terraform
checkov -d terraform/

# Scan CloudFormation
checkov -f template.yaml --framework cloudformation

# Custom policies
checkov -d . --external-checks-dir ./custom-policies
```

### **Terrascan**

- Static code analysis
- Multi-IaC support
- Policy library
- CI/CD integration

**Usage:**
```bash
# Install
brew install terrascan

# Scan
terrascan scan

# Scan specific IaC
terrascan scan -t terraform
```

### **TFLint**

- Terraform linter
- Plugin system
- Rule configuration
- Fast scanning

**Usage:**
```bash
# Install
brew install tflint

# Scan
tflint

# Initialize with rules
tflint --init
```

### **cfn-lint**

- CloudFormation linter
- AWS best practices
- Custom rules
- IDE integration

**Usage:**
```bash
# Install
pip install cfn-lint

# Scan
cfn-lint template.yaml

# Check specific rules
cfn-lint template.yaml -i E3002
```

### **OPA (Open Policy Agent)**

- Policy engine
- Rego language
- Multi-tool support
- Policy as code

**Example Policy:**
```rego
package terraform

deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    not resource.change.after.server_side_encryption_configuration
    msg := "S3 buckets must have encryption enabled"
}
```

---

## **Policy as Code**

### **OPA Gatekeeper (Kubernetes)**

- Kubernetes admission controller
- Rego policies
- Constraint templates
- Audit functionality

**Example:**
```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          required := input.parameters.labels
          provided := input.review.object.metadata.labels
          missing := required[_]
          not provided[missing]
          msg := sprintf("Missing required label: %v", [missing])
        }
```

### **Sentinel (HashiCorp)**

- Policy as code for HashiCorp tools
- Terraform Enterprise/Cloud
- Vault policies
- Consul policies

**Example:**
```javascript
import "tfplan"

main = rule {
    all tfplan.resource_changes as _, rc {
        rc.type is not "aws_s3_bucket" or
        rc.change.after.server_side_encryption_configuration is not null
    }
}
```

### **Pulumi Policy Pack**

- Policy as code for Pulumi
- TypeScript/JavaScript
- Enforcement modes
- Policy library

**Example:**
```typescript
import * as policy from "@pulumi/policy";

new policy.PolicyPack("aws-security", {
    policies: [
        {
            name: "s3-encryption",
            description: "S3 buckets must have encryption enabled",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                if (args.type === "aws:s3/bucket:Bucket" && 
                    !args.props.serverSideEncryptionConfiguration) {
                    reportViolation("S3 buckets must have encryption enabled");
                }
            },
        },
    ],
});
```

---

## **CI/CD Integration**

### **Pre-Commit Hooks**

**Example:**
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.81.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
  - repo: https://github.com/bridgecrewio/checkov
    rev: 2.3.313
    hooks:
      - id: checkov
        args: ['--framework', 'terraform']
```

### **GitHub Actions**

**Example:**
```yaml
name: IaC Security Scan
on: [pull_request]
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Checkov
      uses: bridgecrewio/checkov-action@master
      with:
        directory: .
        framework: terraform
        soft_fail: true
    - name: Run TFLint
      uses: terraform-linters/setup-tflint@v3
      with:
        tflint_version: latest
    - name: TFLint
      run: tflint --init && tflint
```

### **GitLab CI**

**Example:**
```yaml
# .gitlab-ci.yml
stages:
  - validate
  - security

terraform-validate:
  stage: validate
  image: hashicorp/terraform:latest
  script:
    - terraform init
    - terraform validate
    - terraform fmt -check

security-scan:
  stage: security
  image: bridgecrew/checkov:latest
  script:
    - checkov -d . --framework terraform
```

---

## **Secrets Management in IaC**

### **Terraform**

**Environment Variables:**
```bash
export TF_VAR_db_password="secret"
terraform apply
```

**AWS Secrets Manager:**
```hcl
data "aws_secretsmanager_secret" "db_password" {
  name = "database/password"
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}
```

**HashiCorp Vault:**
```hcl
data "vault_generic_secret" "db_password" {
  path = "secret/database"
}

resource "aws_db_instance" "database" {
  password = data.vault_generic_secret.db_password.data["password"]
}
```

### **CloudFormation**

**Systems Manager Parameter Store:**
```yaml
Parameters:
  DatabasePassword:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /database/password

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      MasterUserPassword: !Ref DatabasePassword
```

**Secrets Manager:**
```yaml
Resources:
  DatabaseSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: database/password
      SecretString: !Sub |
        {
          "username": "admin",
          "password": "{{resolve:secretsmanager:database/password:SecretString:password}}"
        }
```

---

## **Security Checklist**

### **Secrets Management**
- [ ] No hardcoded secrets in code
- [ ] Use secret management services
- [ ] Secrets marked as sensitive
- [ ] Secret rotation implemented
- [ ] Access to secrets restricted

### **IAM Security**
- [ ] IAM policies follow least privilege
- [ ] No "*" actions in policies
- [ ] Conditions added where appropriate
- [ ] Regular IAM reviews
- [ ] MFA required for privileged operations

### **Network Security**
- [ ] Private subnets used
- [ ] Security groups restrictive
- [ ] No 0.0.0.0/0 in rules
- [ ] Network segmentation implemented
- [ ] VPC endpoints for private connectivity

### **Data Protection**
- [ ] Encryption at rest enabled
- [ ] TLS for data in transit
- [ ] Key management service used
- [ ] Backup encryption enabled
- [ ] Data classification completed

### **Resource Security**
- [ ] Public access blocked
- [ ] Resource limits set
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Compliance requirements met

### **Code Quality**
- [ ] Code reviewed
- [ ] Automated scanning enabled
- [ ] Policies enforced
- [ ] Version control used
- [ ] State encrypted

---

## **Common Misconfigurations**

### **AWS**

1. **Public S3 Buckets**
   - Missing Block Public Access
   - Public bucket policies
   - Fix: Enable Block Public Access

2. **Overly Permissive Security Groups**
   - 0.0.0.0/0 allowed
   - Missing conditions
   - Fix: Use specific CIDR blocks

3. **Unencrypted EBS Volumes**
   - Encryption not enabled
   - Missing KMS keys
   - Fix: Enable encryption

### **Azure**

1. **Public Storage Accounts**
   - Public access enabled
   - Missing network rules
   - Fix: Use private endpoints

2. **NSG Rules Too Permissive**
   - Allow all traffic
   - Missing source restrictions
   - Fix: Use specific rules

### **GCP**

1. **Public Cloud Storage**
   - Buckets publicly readable
   - Missing IAM policies
   - Fix: Remove public access

2. **Firewall Rules Too Open**
   - 0.0.0.0/0 allowed
   - Missing source tags
   - Fix: Use specific source IPs

---

## **Conclusion**

IaC security requires secure coding practices, automated scanning, policy enforcement, and proper secrets management. Treating infrastructure code with the same security rigor as application code ensures secure cloud deployments.

**Key Takeaways:**

1. Never hardcode secrets
2. Follow least privilege for IAM
3. Enable encryption by default
4. Implement network security
5. Use automated scanning tools
6. Enforce policies as code
7. Regular security reviews

