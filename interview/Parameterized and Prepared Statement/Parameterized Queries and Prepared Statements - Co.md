# Parameterized Queries and Prepared Statements - Comprehensive Guide

## **Introduction**

Parameterized queries and prepared statements are the **primary defense** against SQL injection vulnerabilities. They separate SQL code from data, ensuring that user input is always treated as data, never as executable SQL code.

### **Why They Matter**

**Security Benefits:**

- ✅ **Prevents SQL injection** - Primary defense mechanism
- ✅ **Separates code from data** - Database treats input as data
- ✅ **Type safety** - Database handles type conversion
- ✅ **No manual escaping needed** - Database handles encoding

**Performance Benefits:**

- ✅ **Query optimization** - Database can cache execution plans
- ✅ **Faster repeated queries** - Parse once, execute many times
- ✅ **Reduced overhead** - Less parsing and compilation

---

## **What are Parameterized Queries**

A **parameterized query** is a SQL query that uses placeholders (parameters) for values that will be provided at runtime, rather than embedding values directly in the SQL string.

### **Key Concept**

**Separate SQL structure from data values:**

- SQL structure: Defined at development time (safe, constant)
- Data values: Provided at runtime (user input, treated as data)

### **Basic Example**

**❌ Vulnerable (String Concatenation):**

```python
username = request.form['username']
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)  # SQL injection possible!

```

**✅ Secure (Parameterized Query):**

```python
username = request.form['username']
query = "SELECT * FROM users WHERE username = ?"  # Placeholder
cursor.execute(query, (username,))  # Safe! Database treats username as data

```

### **How It Works**

1. **Query Structure Defined:**
    
    ```sql
    SELECT * FROM users WHERE username = ?
    
    ```
    
    - `?` is a placeholder (parameter marker)
    - Query structure is constant (no user input)
2. **Values Provided Separately:**
    
    ```python
    cursor.execute(query, (username,))
    
    ```
    
    - Values provided as separate parameter
    - Database substitutes values into placeholders
3. **Database Processing:**
    - Database parses query structure (safe, constant)
    - Database binds parameter values (treated as data, not code)
    - No possibility of SQL injection

---

## **What are Prepared Statements**

A **prepared statement** is a parameterized query that is **pre-compiled** by the database server for better performance.

### **Key Concept**

**Pre-compilation + Parameter Binding:**

- Query parsed and optimized **once** by database
- Execution plan cached for reuse
- Only parameter values change between executions

### **Basic Example**

**Python (sqlite3 - Prepared Statement):**

```python
# Prepare statement (parsed once)
query = "SELECT * FROM users WHERE username = ?"
cursor = connection.cursor()

# Execute with different values (parsed once, executed many times)
cursor.execute(query, ('alice',))
cursor.execute(query, ('bob',))
cursor.execute(query, ('charlie',))

```

**Java (JDBC - Prepared Statement):**

```java
// Prepare statement (sent to database, parsed once)
String sql = "SELECT * FROM users WHERE username = ?";
PreparedStatement stmt = connection.prepareStatement(sql);

// Execute with different values
stmt.setString(1, "alice");
ResultSet rs = stmt.executeQuery();

stmt.setString(1, "bob");
rs = stmt.executeQuery();

```

### **How It Works**

1. **Preparation Phase:**
    - Query sent to database server
    - Database parses and validates query structure
    - Database creates execution plan
    - Execution plan cached
2. **Execution Phase:**
    - Only parameter values sent to database
    - Database uses cached execution plan
    - Values bound to placeholders
    - Query executed
3. **Performance Benefit:**
    - Parse/optimize once, execute many times
    - Faster for repeated queries

---

## **Differences and Similarities**

### **Parameterized Queries vs Prepared Statements**

| Aspect | Parameterized Queries | Prepared Statements |
| --- | --- | --- |
| **Definition** | SQL with placeholders | Pre-compiled parameterized query |
| **Security** | ✅ Prevents SQL injection | ✅ Prevents SQL injection |
| **Performance** | ⚠️ Parsed each time | ✅ Parsed once, cached |
| **Database Support** | ✅ All databases | ✅ Most databases |
| **Use Case** | Single queries | Repeated queries |

### **Relationship**

**Prepared statements are a type of parameterized query:**

- All prepared statements use parameters
- Not all parameterized queries are pre-compiled
- Prepared statements add performance optimization

### **Implementation Differences**

**Different Syntax for Placeholders:**

- **SQLite, MySQLi, ODBC**: `?`
- **MySQL (Python), PostgreSQL**: `%s`
- **Oracle, .NET**: `:name` (named parameters)

**Example (Same Concept, Different Syntax):**

```python
# SQLite (uses ?)
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

# PostgreSQL (uses %s)
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (username,))

# Oracle (uses :name)
query = "SELECT * FROM users WHERE username = :username"
cursor.execute(query, {'username': username})

```

---

## **How They Prevent SQL Injection**

### **SQL Injection Attack**

**Vulnerable Code:**

```python
username = request.form['username']
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

```

**Attack:**

```
Input: admin' OR '1'='1
Resulting Query: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
Result: Returns all users (authentication bypass!)

```

### **How Parameterized Queries Prevent It**

**Secure Code:**

```python
username = request.form['username']
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

```

**Attack Attempt:**

```
Input: admin' OR '1'='1
Database Processing:
  1. Query structure parsed: SELECT * FROM users WHERE username = ?
  2. Parameter value bound: 'admin\' OR \'1\'=\'1' (escaped as data)
  3. Executed query: SELECT * FROM users WHERE username = 'admin\' OR \'1\'=\'1'
Result: No match found (safe!)

```

### **Why It Works**

1. **Query Structure is Constant:**
    - SQL structure defined at development time
    - No user input in SQL structure
    - Cannot be manipulated
2. **Parameters are Treated as Data:**
    - Database escapes parameters automatically
    - Parameters cannot change query structure
    - SQL injection impossible
3. **Type Safety:**
    - Database handles type conversion
    - Prevents type confusion attacks

---

## **Implementation Examples**

### **Python (SQLite)**

**Prepared Statement:**

```python
import sqlite3

connection = sqlite3.connect('database.db')
cursor = connection.cursor()

# Prepared statement
query = "SELECT * FROM users WHERE username = ? AND password = ?"
cursor.execute(query, (username, password))
result = cursor.fetchone()

```

### **Python (PostgreSQL - psycopg2)**

**Parameterized Query:**

```python
import psycopg2

connection = psycopg2.connect(database="mydb")
cursor = connection.cursor()

# Parameterized query (uses %s)
query = "SELECT * FROM users WHERE username = %s AND password = %s"
cursor.execute(query, (username, password))
result = cursor.fetchone()

```

### **Java (JDBC)**

**Prepared Statement:**

```java
String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement stmt = connection.prepareStatement(sql);
stmt.setString(1, username);
stmt.setString(2, password);
ResultSet rs = stmt.executeQuery();

```

### **Node.js (mysql2)**

**Prepared Statement:**

```jsx
const query = "SELECT * FROM users WHERE username = ? AND password = ?";
connection.execute(query, [username, password], (err, results) => {
    // Handle results
});

```

### **PHP (PDO)**

**Prepared Statement:**

```php
$query = "SELECT * FROM users WHERE username = ? AND password = ?";
$stmt = $pdo->prepare($query);
$stmt->execute([$username, $password]);
$result = $stmt->fetch();

```

---

## **Best Practices**

### **1. Always Use Parameterized Queries**

**✅ CORRECT:**

```python
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

```

**❌ WRONG:**

```python
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

```

### **2. Use Prepared Statements for Repeated Queries**

**✅ CORRECT (Repeated Execution):**

```python
query = "INSERT INTO logs (message, timestamp) VALUES (?, ?)"
cursor = connection.cursor()

# Prepare once, execute many times
for log_entry in log_entries:
    cursor.execute(query, (log_entry.message, log_entry.timestamp))

```

### **3. Don't Try to Parameterize Table/Column Names**

**❌ WRONG:**

```python
# Can't parameterize table names
table_name = request.args.get('table')
query = f"SELECT * FROM {table_name}"  # Still vulnerable!

```

**✅ CORRECT (Whitelist Approach):**

```python
allowed_tables = ['users', 'products', 'orders']
table_name = request.args.get('table')
if table_name not in allowed_tables:
    raise ValueError("Invalid table")
query = f"SELECT * FROM {table_name}"  # Safe with whitelist

```

### **4. Use ORM When Possible**

**✅ CORRECT (ORM - Django):**

```python
from django.db import models

# ORM handles parameterization automatically
User.objects.filter(username=username, password=password)

```

### **5. Validate Input Types**

**✅ CORRECT:**

```python
# Validate input type
user_id = request.args.get('id')
try:
    user_id = int(user_id)  # Ensure it's an integer
except ValueError:
    raise ValueError("Invalid user ID")

query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))

```

---

## **Advanced Exploitation Prevention**

### **Why Parameterized Queries Prevent Advanced Attacks**

**Advanced SQL Injection Techniques Prevented:**

1. **Union-Based Injection:**
    
    ```python
    # Attack attempt
    username = "admin' UNION SELECT * FROM passwords--"
    
    # With parameterized query
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (username,))
    # Result: Searches for literal username "admin' UNION SELECT * FROM passwords--"
    # No UNION executed!
    
    ```
    
2. **Boolean-Based Blind Injection:**
    
    ```python
    # Attack attempt
    username = "admin' AND 1=1--"
    
    # With parameterized query
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (username,))
    # Result: Searches for literal username "admin' AND 1=1--"
    # No boolean logic executed!
    
    ```
    
3. **Time-Based Blind Injection:**
    
    ```python
    # Attack attempt
    username = "admin'; WAITFOR DELAY '00:00:05'--"
    
    # With parameterized query
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (username,))
    # Result: Searches for literal username, no delay executed!
    
    ```
    

### **Why Escaping Is Not Enough**

**Manual Escaping (Vulnerable):**

```python
# ❌ WRONG: Manual escaping can fail
def escape_sql(value):
    return value.replace("'", "''")

username = escape_sql(user_input)
query = f"SELECT * FROM users WHERE username = '{username}'"
# Still vulnerable to: admin' OR '1'='1 (escaped incorrectly)

```

**Parameterized Queries (Secure):**

```python
# ✅ CORRECT: Database handles escaping correctly
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))
# Always safe!

```

---

## **Penetration Testing Methodology**

### **Testing for SQL Injection Protection**

**1. Identify Database Queries:**

- Find all database interactions
- Identify user input points
- Map input to SQL queries

**2. Test for Parameterized Queries:**

- Check if queries use placeholders
- Verify parameters bound correctly
- Test with SQL injection payloads

**3. Verify Protection:**

```python
# Test payloads that should be blocked
test_payloads = [
    "admin' OR '1'='1",
    "admin' UNION SELECT * FROM users--",
    "admin'; DROP TABLE users--",
    "admin' AND 1=1--",
    "admin' AND SLEEP(5)--"
]

# All should be treated as literal values, not SQL code

```

**4. Check Code Patterns:**

**Vulnerable Patterns:**

- String concatenation: `f"SELECT * FROM users WHERE username = '{username}'"`
- String formatting: `"SELECT * FROM users WHERE username = '%s'" % username`
- String replacement: `query.replace('{username}', username)`

**Secure Patterns:**

- Placeholders: `"SELECT * FROM users WHERE username = ?"`
- Parameter binding: `cursor.execute(query, (username,))`
- ORM usage: `User.objects.filter(username=username)`

---

## **Threat Modeling (STRIDE Framework)**

### **Spoofing**

**Threat:** Attacker spoofs legitimate user via SQL injection.

**Attack Vectors:**

- Authentication bypass via SQL injection
- Impersonation through manipulated queries

**Mitigation:**

- ✅ Parameterized queries prevent SQL injection
- ✅ Proper authentication mechanisms
- ✅ Input validation (additional layer)

**Risk Rating:** High

---

### **Tampering**

**Threat:** Attacker modifies data via SQL injection.

**Attack Vectors:**

- UPDATE/DELETE statements via SQL injection
- Data manipulation through injected queries

**Mitigation:**

- ✅ Parameterized queries prevent SQL injection
- ✅ Principle of least privilege
- ✅ Input validation

**Risk Rating:** Critical

---

### **Repudiation**

**Threat:** Actions via SQL injection cannot be attributed.

**Attack Vectors:**

- Malicious queries appear as legitimate
- No audit trail for injected queries

**Mitigation:**

- ✅ Parameterized queries prevent SQL injection
- ✅ Comprehensive logging
- ✅ Audit trails

**Risk Rating:** Medium

---

### **Information Disclosure**

**Threat:** Attacker accesses sensitive data via SQL injection.

**Attack Vectors:**

- SELECT statements via SQL injection
- Data extraction through injected queries

**Mitigation:**

- ✅ Parameterized queries prevent SQL injection
- ✅ Principle of least privilege
- ✅ Data encryption

**Risk Rating:** Critical

---

### **Denial of Service**

**Threat:** Attacker causes DoS via SQL injection.

**Attack Vectors:**

- Resource exhaustion via complex queries
- Database overload through injected queries

**Mitigation:**

- ✅ Parameterized queries prevent SQL injection
- ✅ Query timeout limits
- ✅ Resource limits

**Risk Rating:** High

---

### **Elevation of Privilege**

**Threat:** Attacker gains elevated privileges via SQL injection.

**Attack Vectors:**

- Privilege escalation through injected queries
- Administrative access via SQL injection

**Mitigation:**

- ✅ Parameterized queries prevent SQL injection
- ✅ Principle of least privilege
- ✅ Proper access controls

**Risk Rating:** Critical

---

## **Real-World Case Studies**

### **Case Study 1: Authentication Bypass**

**Background:** During penetration test, discovered SQL injection in login functionality.

**Vulnerable Code:**

```python
username = request.form['username']
password = request.form['password']
query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
cursor.execute(query)
result = cursor.fetchone()
if result:
    return "Login successful"

```

**Exploitation:**

```
Username: admin' OR '1'='1
Password: anything
Resulting Query: SELECT * FROM users WHERE username = 'admin' OR '1'='1' AND password = 'anything'
Result: Returns first user (authentication bypass!)

```

**Impact:**

- **Confidentiality**: Critical - Unauthorized access
- **Integrity**: High - Could modify data
- **Business Impact**: Critical - Complete authentication bypass

**Remediation:**

```python
username = request.form['username']
password = request.form['password']
query = "SELECT * FROM users WHERE username = ? AND password = ?"
cursor.execute(query, (username, password))
result = cursor.fetchone()
if result:
    return "Login successful"

```

---

### **Case Study 2: Data Extraction**

**Background:** Security assessment revealed SQL injection in search functionality.

**Vulnerable Code:**

```python
search_term = request.args.get('q')
query = f"SELECT * FROM products WHERE name LIKE '%{search_term}%'"
cursor.execute(query)
results = cursor.fetchall()

```

**Exploitation:**

```
Search: ' UNION SELECT username, password FROM users--
Resulting Query: SELECT * FROM products WHERE name LIKE '%' UNION SELECT username, password FROM users--%'
Result: Extracts all usernames and passwords!

```

**Impact:**

- **Confidentiality**: Critical - Data breach
- **Integrity**: High - Could modify data
- **Business Impact**: Critical - Complete data compromise

**Remediation:**

```python
search_term = request.args.get('q')
query = "SELECT * FROM products WHERE name LIKE ?"
search_pattern = f"%{search_term}%"
cursor.execute(query, (search_pattern,))
results = cursor.fetchall()

```

---

## **Advanced Mitigations**

### **Defense in Depth Strategy**

**Layer 1: Parameterized Queries (Primary Defense)**

```python
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

```

**Layer 2: Input Validation (Additional Layer)**

```python
def validate_username(username):
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Invalid username")
    if len(username) > 50:
        raise ValueError("Username too long")
    return username

username = validate_username(request.form['username'])
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

```

**Layer 3: Principle of Least Privilege**

```sql
-- Database user has minimal privileges
GRANT SELECT ON users TO app_user;
-- Cannot execute DROP, DELETE, etc.

```

**Layer 4: ORM Usage (When Possible)**

```python
# ORM automatically uses parameterized queries
User.objects.filter(username=username)

```

---

## **SAST/DAST Detection**

### **SAST (Static Application Security Testing)**

**Vulnerable Code Patterns:**

**1. String Concatenation:**

```python
# ❌ VULNERABLE
query = f"SELECT * FROM users WHERE username = '{username}'"

# SAST Detection:
# - Pattern: String concatenation in SQL query
# - Severity: Critical
# - CWE: CWE-89 (SQL Injection)

```

**2. String Formatting:**

```python
# ❌ VULNERABLE
query = "SELECT * FROM users WHERE username = '%s'" % username

# SAST Detection:
# - Pattern: String formatting in SQL query
# - Severity: Critical
# - CWE: CWE-89

```

**3. Missing Parameter Binding:**

```python
# ❌ VULNERABLE
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query)  # Missing parameter!

# SAST Detection:
# - Pattern: Placeholder without parameter binding
# - Severity: High
# - CWE: CWE-89

```

---

### **DAST (Dynamic Application Security Testing)**

**Testing Methodology:**

**1. Identify Input Points:**

- Test all form inputs
- Test URL parameters
- Test headers and cookies

**2. Submit SQL Injection Payloads:**

```python
test_payloads = [
    "admin' OR '1'='1",
    "admin' UNION SELECT * FROM users--",
    "admin'; DROP TABLE users--",
    "admin' AND 1=1--",
    "admin' AND SLEEP(5)--"
]

```

**3. Analyze Responses:**

- Check for SQL errors
- Check for unexpected behavior
- Check for data extraction

**4. Verify Protection:**

- Payloads should be treated as literal values
- No SQL errors should occur
- No data should be extracted

---

## **Risk Assessment**

### **Risk Matrix**

| Vulnerability | Likelihood | Impact | Risk Level | Business Impact |
| --- | --- | --- | --- | --- |
| **SQL Injection (No Protection)** | High | Critical | **Critical** | Complete system compromise |
| **Weak Parameterization** | Medium | High | **High** | Partial data access |
| **Missing Input Validation** | High | Medium | **High** | Data integrity issues |
| **No Prepared Statements** | Medium | Medium | **Medium** | Performance degradation |

### **Risk Calculation**

**Example: SQL Injection in Authentication**

**Likelihood:** High (0.9)

- Common vulnerability
- Easy to exploit
- Widespread impact

**Impact:** Critical (1.0)

- Complete authentication bypass
- Unauthorized access
- Data breach potential

**Risk Score:** 0.9 × 1.0 = **0.9 (Critical Risk)**

**Business Impact:**

- **Financial**: Unauthorized access, fraud
- **Reputation**: Loss of customer trust
- **Legal**: Data breach notifications, liability
- **Operational**: System compromise, downtime

---

## **Summary**

Parameterized queries and prepared statements are the **primary defense** against SQL injection. Key points:

1. **Always use parameterized queries** - Primary defense against SQL injection
2. **Use prepared statements for repeated queries** - Performance + security
3. **Don't parameterize table/column names** - Use whitelisting instead
4. **Use ORM when possible** - Automatic parameterization
5. **Validate input types** - Additional layer of defense
6. **Follow defense in depth** - Multiple layers of protection
7. **Test thoroughly** - Code reviews, SAST/DAST scanning

Remember: **Parameterized queries (prepared statements) are the primary defense against SQL injection, not input validation or escaping alone!**