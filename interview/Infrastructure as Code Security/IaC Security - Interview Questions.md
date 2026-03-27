# Infrastructure as Code (IaC) Security - Interview Questions

## **Fundamental Questions**

### **Q1: What are the main security risks in Infrastructure as Code?**

**Answer:**

**Primary Security Risks:**

1. **Hardcoded Secrets:**
   - Credentials in plaintext
   - Committed to version control
   - Accessible to anyone with repo access
   - Risk: Credential exposure

2. **Overly Permissive IAM:**
   - Policies with "*" actions
   - Missing conditions
   - Risk: Unauthorized access, privilege escalation

3. **Public Resources:**
   - S3 buckets publicly accessible
   - Databases exposed to internet
   - Risk: Data exposure

4. **Missing Encryption:**
   - Data stored unencrypted
   - No encryption at rest
   - Risk: Data breach

5. **Insecure Network Configurations:**
   - Security groups allowing 0.0.0.0/0
   - Missing network segmentation
   - Risk: Unauthorized network access

6. **State File Exposure:**
   - State files in version control
   - Unencrypted state
   - Risk: Infrastructure compromise

**Mitigation:**
- Use secret management services
- Follow least privilege for IAM
- Enable encryption by default
- Implement network security
- Secure state management

---

### **Q2: How do you manage secrets in Terraform?**

**Answer:**

**Secrets Management Strategies:**

1. **Environment Variables:**
   ```bash
   export TF_VAR_db_password="secret"
   terraform apply
   ```

2. **AWS Secrets Manager:**
   ```hcl
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

3. **HashiCorp Vault:**
   ```hcl
   data "vault_generic_secret" "db_password" {
     path = "secret/database"
   }
   
   resource "aws_db_instance" "database" {
     password = data.vault_generic_secret.db_password.data["password"]
   }
   ```

4. **Variables with Sensitive Flag:**
   ```hcl
   variable "db_password" {
     type        = string
     sensitive   = true
     description = "Database password"
   }
   ```

**Best Practices:**
- Never hardcode secrets
- Use secret management services
- Mark variables as sensitive
- Rotate secrets regularly
- Restrict access to secrets

---

### **Q3: How do you implement least privilege in IaC IAM policies?**

**Answer:**

**Least Privilege Implementation:**

1. **Specific Actions:**
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

2. **Resource-Level Permissions:**
   - Restrict to specific resources
   - Use resource ARNs
   - Avoid wildcards

3. **Conditions:**
   ```json
   {
     "Effect": "Allow",
     "Action": ["s3:GetObject"],
     "Resource": "arn:aws:s3:::my-bucket/*",
     "Condition": {
       "IpAddress": {
         "aws:SourceIp": "203.0.113.0/24"
       },
       "StringEquals": {
         "aws:MultiFactorAuthPresent": "true"
       }
     }
   }
   ```

4. **Terraform Example:**
   ```hcl
   resource "aws_iam_policy" "s3_access" {
     name = "s3-read-only"
     policy = jsonencode({
       Version = "2012-10-17"
       Statement = [{
         Effect = "Allow"
         Action = ["s3:GetObject", "s3:ListBucket"]
         Resource = [
           "arn:aws:s3:::my-bucket",
           "arn:aws:s3:::my-bucket/*"
         ]
       }]
     })
   }
   ```

**Best Practices:**
- Start with deny all
- Grant minimum necessary permissions
- Use conditions
- Regular access reviews
- Separate read and write permissions

---

### **Q4: What tools do you use for IaC security scanning?**

**Answer:**

**Security Scanning Tools:**

1. **Checkov:**
   - Open-source static analysis
   - Multi-cloud support
   - Policy as code
   - CI/CD integration
   
   ```bash
   checkov -d terraform/
   checkov -f template.yaml --framework cloudformation
   ```

2. **Terrascan:**
   - Static code analysis
   - Multi-IaC support
   - Policy library
   
   ```bash
   terrascan scan -t terraform
   ```

3. **TFLint:**
   - Terraform linter
   - Plugin system
   - Fast scanning
   
   ```bash
   tflint
   ```

4. **cfn-lint:**
   - CloudFormation linter
   - AWS best practices
   - Custom rules
   
   ```bash
   cfn-lint template.yaml
   ```

5. **OPA (Open Policy Agent):**
   - Policy engine
   - Rego language
   - Multi-tool support

**Integration:**
- Pre-commit hooks
- CI/CD pipelines
- IDE plugins
- Automated scanning

---

### **Q5: How do you secure Terraform state files?**

**Answer:**

**State File Security:**

1. **Remote State Backend:**
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

2. **Encryption:**
   - Enable encryption at rest
   - Use KMS for key management
   - Encrypt in transit

3. **Access Control:**
   - Restrict state file access
   - Use IAM policies
   - Enable versioning

4. **State Locking:**
   - Use DynamoDB for locking
   - Prevent concurrent modifications
   - Avoid state corruption

5. **Best Practices:**
   - Never commit state to version control
   - Use remote backends
   - Enable versioning
   - Regular backups
   - Separate state per environment

---

## **Tool-Specific Questions**

### **Q6: How do you prevent public S3 buckets in Terraform?**

**Answer:**

**Prevention Methods:**

1. **Block Public Access:**
   ```hcl
   resource "aws_s3_bucket" "data" {
     bucket = "my-bucket"
   }
   
   resource "aws_s3_bucket_public_access_block" "data" {
     bucket = aws_s3_bucket.data.id
     
     block_public_acls       = true
     block_public_policy     = true
     ignore_public_acls      = true
     restrict_public_buckets = true
   }
   ```

2. **Bucket Policy:**
   ```hcl
   resource "aws_s3_bucket_policy" "data" {
     bucket = aws_s3_bucket.data.id
     
     policy = jsonencode({
       Version = "2012-10-17"
       Statement = [{
         Effect = "Deny"
         Principal = "*"
         Action = "s3:*"
         Resource = [
           aws_s3_bucket.data.arn,
           "${aws_s3_bucket.data.arn}/*"
         ]
         Condition = {
           Bool = {
             "aws:PublicAccess" = "true"
           }
         }
       }]
     })
   }
   ```

3. **Policy as Code:**
   - Use Checkov or Terrascan
   - Enforce in CI/CD
   - Block deployment if public

---

### **Q7: How do you implement policy as code for IaC?**

**Answer:**

**Policy as Code Approaches:**

1. **OPA (Open Policy Agent):**
   ```rego
   package terraform
   
   deny[msg] {
       resource := input.resource_changes[_]
       resource.type == "aws_s3_bucket"
       not resource.change.after.server_side_encryption_configuration
       msg := "S3 buckets must have encryption enabled"
   }
   ```

2. **Sentinel (HashiCorp):**
   ```javascript
   import "tfplan"
   
   main = rule {
       all tfplan.resource_changes as _, rc {
           rc.type is not "aws_s3_bucket" or
           rc.change.after.server_side_encryption_configuration is not null
       }
   }
   ```

3. **Checkov Custom Policies:**
   ```python
   from checkov.common.models.enums import CheckResult
   from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
   
   class S3EncryptionCheck(BaseResourceCheck):
       def scan_resource_conf(self, conf):
           if 'server_side_encryption_configuration' not in conf:
               return CheckResult.FAILED
           return CheckResult.PASSED
   ```

4. **Pulumi Policy Pack:**
   ```typescript
   new policy.PolicyPack("aws-security", {
       policies: [{
           name: "s3-encryption",
           enforcementLevel: "mandatory",
           validateResource: (args, reportViolation) => {
               if (args.type === "aws:s3/bucket:Bucket" && 
                   !args.props.serverSideEncryptionConfiguration) {
                   reportViolation("S3 buckets must have encryption enabled");
               }
           },
       }],
   });
   ```

---

## **CI/CD Integration Questions**

### **Q8: How do you integrate IaC security scanning into CI/CD?**

**Answer:**

**CI/CD Integration:**

1. **GitHub Actions:**
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
       - name: Run TFLint
         uses: terraform-linters/setup-tflint@v3
       - name: TFLint
         run: tflint
   ```

2. **Pre-Commit Hooks:**
   ```yaml
   # .pre-commit-config.yaml
   repos:
     - repo: https://github.com/bridgecrewio/checkov
       rev: 2.3.313
       hooks:
         - id: checkov
           args: ['--framework', 'terraform']
   ```

3. **GitLab CI:**
   ```yaml
   security-scan:
     stage: security
     image: bridgecrew/checkov:latest
     script:
       - checkov -d . --framework terraform
     rules:
       - if: $CI_PIPELINE_SOURCE == "merge_request_event"
   ```

4. **Jenkins:**
   ```groovy
   stage('Security Scan') {
       steps {
           sh 'checkov -d . --framework terraform'
       }
   }
   ```

**Best Practices:**
- Scan on every PR
- Block merge on failures
- Generate reports
- Integrate with security tools

---

## **Scenario-Based Questions**

### **Q9: You discover hardcoded credentials in Terraform code. What do you do?**

**Answer:**

**Immediate Actions:**

1. **Assess Risk:**
   - Determine if credentials are exposed
   - Check git history
   - Identify who had access

2. **Rotate Credentials:**
   - Immediately rotate exposed credentials
   - Update all systems using credentials
   - Revoke old credentials

3. **Remove from Code:**
   - Remove hardcoded credentials
   - Use secret management
   - Update all references

4. **Clean Git History:**
   - Use git-filter-repo or BFG
   - Remove from all commits
   - Force push (coordinate with team)

5. **Prevention:**
   - Implement pre-commit hooks
   - Add scanning to CI/CD
   - Use secret detection tools
   - Train team on best practices

**Example Fix:**
```hcl
# Before
resource "aws_db_instance" "database" {
  password = "MySecretPassword123!"
}

# After
data "aws_secretsmanager_secret" "db_password" {
  name = "database/password"
}

resource "aws_db_instance" "database" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

---

### **Q10: How would you design a secure IaC workflow?**

**Answer:**

**Secure IaC Workflow:**

1. **Development:**
   - Local development with Terraform
   - Pre-commit hooks for validation
   - Secret detection
   - Code formatting

2. **Version Control:**
   - Store code in Git
   - Branch protection rules
   - Require reviews
   - No secrets in code

3. **CI/CD Pipeline:**
   - Validate Terraform
   - Security scanning (Checkov, Terrascan)
   - Policy enforcement
   - Generate plan

4. **Review:**
   - Peer review required
   - Security review
   - Plan review
   - Approval workflow

5. **Deployment:**
   - Apply in staging first
   - Validate changes
   - Monitor deployment
   - Rollback plan

6. **Post-Deployment:**
   - Verify security controls
   - Monitor infrastructure
   - Audit logs
   - Regular reviews

**Tools:**
- Pre-commit hooks
- Checkov/Terrascan
- Terraform Cloud/Enterprise
- Policy as code
- Secret management

---

## **Advanced Questions**

### **Q11: How do you handle secrets rotation in IaC?**

**Answer:**

**Secrets Rotation:**

1. **Automated Rotation:**
   - Use AWS Secrets Manager rotation
   - Lambda functions for rotation
   - Update applications automatically

2. **Terraform State:**
   - Update secret references
   - Apply changes
   - No downtime

3. **Multi-Environment:**
   - Rotate per environment
   - Staged rollout
   - Validation after rotation

**Example:**
```hcl
resource "aws_secretsmanager_secret" "db_password" {
  name = "database/password"
  
  rotation_rules {
    automatically_after_days = 30
  }
}

resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  
  rotation_lambda_arn = aws_lambda_function.rotation.arn
  
  rotation_rules {
    automatically_after_days = 30
  }
}
```

---

### **Q12: How do you ensure compliance in IaC?**

**Answer:**

**Compliance in IaC:**

1. **Policy as Code:**
   - Define compliance policies
   - Enforce automatically
   - Use OPA, Sentinel, Checkov

2. **Automated Scanning:**
   - Scan for compliance violations
   - Block non-compliant deployments
   - Generate compliance reports

3. **Documentation:**
   - Document compliance requirements
   - Map to controls
   - Regular audits

4. **Monitoring:**
   - Continuous compliance monitoring
   - Alert on violations
   - Regular assessments

**Example - Compliance Policy:**
```rego
package compliance

# PCI-DSS: Encryption required
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    not resource.change.after.storage_encrypted
    msg := "PCI-DSS: Databases must have encryption enabled"
}
```

---

## **Conclusion**

IaC security requires secure coding practices, automated scanning, policy enforcement, and proper secrets management. Key areas include never hardcoding secrets, implementing least privilege, enabling encryption, and integrating security into CI/CD pipelines.

