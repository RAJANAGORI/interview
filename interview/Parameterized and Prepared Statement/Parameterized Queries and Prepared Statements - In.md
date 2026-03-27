# Parameterized Queries and Prepared Statements - Interview Questions & Answers

## **Fundamental Questions**

### **Q1: What are parameterized queries and how do they prevent SQL injection?**

**Answer:**

Parameterized queries use placeholders (parameters) for values that will be provided at runtime, separating SQL code from data.

**How They Work:**

1. **Query Structure Defined:**
    
    ```sql
    SELECT * FROM users WHERE username = ?
    
    ```
    
    - `?` is a placeholder (constant, safe)
    - Query structure is defined at development time
2. **Values Provided Separately:**
    
    ```python
    cursor.execute(query, (username,))
    
    ```
    
    - Values provided as separate parameters
    - Database binds values to placeholders
3. **Database Processing:**
    - Database treats parameters as data, not SQL code
    - Parameters are escaped automatically
    - SQL injection impossible

**Example:**

```python
# Vulnerable (string concatenation)
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)  # SQL injection possible!

# Secure (parameterized query)
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))  # Safe! Database treats username as data

```

**Key Point:** Parameterized queries prevent SQL injection by separating SQL structure (constant) from data values (user input), ensuring the database treats input as data, never as code.

---

### **Q2: What is the difference between parameterized queries and prepared statements?**

**Answer:**

**Parameterized Queries:**

- SQL query with placeholders for values
- Values provided at runtime
- May be parsed each time (depending on implementation)
- Primary focus: Security (preventing SQL injection)

**Prepared Statements:**

- Parameterized query that is **pre-compiled** by database
- Query parsed and optimized **once**
- Execution plan cached for reuse
- Primary focus: Security + Performance

**Relationship:**

- All prepared statements use parameters
- Not all parameterized queries are pre-compiled
- Prepared statements = parameterized queries + performance optimization

**Example:**

```python
# Parameterized query (may parse each time)
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

# Prepared statement (parsed once, cached)
stmt = connection.prepare("SELECT * FROM users WHERE username = ?")
stmt.execute(username)  # Uses cached execution plan

```

---

### **Q3: Can you parameterize table names or column names?**

**Answer:**

**No, you cannot parameterize table names or column names.** These are part of the SQL structure, not data values.

**Why It Doesn't Work:**

```python
# ❌ WRONG: Can't parameterize table name
table_name = request.args.get('table')
query = "SELECT * FROM ?"  # Syntax error!
cursor.execute(query, (table_name,))

```

**Correct Approach (Whitelisting):**

```python
# ✅ CORRECT: Whitelist table names
allowed_tables = ['users', 'products', 'orders']
table_name = request.args.get('table')
if table_name not in allowed_tables:
    raise ValueError("Invalid table")
query = f"SELECT * FROM {table_name}"  # Safe with whitelist

```

**Key Point:** Only data values can be parameterized. SQL structure elements (table names, column names, SQL keywords) must use whitelisting.

---

## **Implementation Questions**

### **Q4: Show examples of parameterized queries in different languages/frameworks.**

**Answer:**

**Python (SQLite):**

```python
import sqlite3

connection = sqlite3.connect('database.db')
cursor = connection.cursor()

query = "SELECT * FROM users WHERE username = ? AND password = ?"
cursor.execute(query, (username, password))
result = cursor.fetchone()

```

**Python (PostgreSQL - psycopg2):**

```python
import psycopg2

connection = psycopg2.connect(database="mydb")
cursor = connection.cursor()

query = "SELECT * FROM users WHERE username = %s AND password = %s"
cursor.execute(query, (username, password))
result = cursor.fetchone()

```

**Java (JDBC):**

```java
String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement stmt = connection.prepareStatement(sql);
stmt.setString(1, username);
stmt.setString(2, password);
ResultSet rs = stmt.executeQuery();

```

**Node.js (mysql2):**

```jsx
const query = "SELECT * FROM users WHERE username = ? AND password = ?";
connection.execute(query, [username, password], (err, results) => {
    // Handle results
});

```

**PHP (PDO):**

```php
$query = "SELECT * FROM users WHERE username = ? AND password = ?";
$stmt = $pdo->prepare($query);
$stmt->execute([$username, $password]);
$result = $stmt->fetch();

```

**Note:** Syntax varies (`?`, `%s`, `:name`), but the concept is the same - separate SQL structure from data values.

---

### **Q5: How do prepared statements improve performance?**

**Answer:**

**Performance Benefits:**

1. **Query Parsing (Once):**
    - Query parsed and validated once
    - Execution plan created once
    - Plan cached for reuse
2. **Query Optimization (Once):**
    - Database optimizes query once
    - Optimization cached
    - Faster subsequent executions
3. **Repeated Execution:**
    - Only parameter values sent to database
    - Uses cached execution plan
    - Much faster for repeated queries

**Example:**

```python
# Regular query (parsed every time)
for username in usernames:
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)  # Parsed every time - SLOW

# Prepared statement (parsed once)
query = "SELECT * FROM users WHERE username = ?"
stmt = connection.prepare(query)  # Parsed once
for username in usernames:
    stmt.execute(username)  # Uses cached plan - FAST

```

**Performance Impact:**

- Single query: Small overhead (negligible)
- Repeated queries: Significant performance gain (10x+ faster)

---

## **Security Questions**

### **Q6: Why is input validation not enough to prevent SQL injection?**

**Answer:**

**Input validation limitations:**

1. **Context Mismatch:**
    - Input might be valid but dangerous in SQL context
    - Validation doesn't know how input will be used
2. **Bypass Techniques:**
    - Encoding can bypass validation
    - Multiple encoding layers
    - Alternative payload formats
3. **No Actual Protection:**
    - Validation doesn't separate code from data
    - Input still embedded in SQL string
    - SQL injection still possible

**Example:**

```python
# ❌ WRONG: Input validation alone
def validate_username(username):
    if "'" in username or ";" in username:
        raise ValueError("Invalid characters")
    return username

username = validate_username("admin123")
query = f"SELECT * FROM users WHERE username = '{username}'"
# Still vulnerable! What if username = "admin' OR '1'='1"?
# After validation removal: "admin OR 1=1" (still works!)

```

**Correct Approach:**

```python
# ✅ CORRECT: Parameterized queries
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))
# Always safe, regardless of input content!

```

**Key Point:** Input validation helps but doesn't prevent SQL injection. Parameterized queries are the primary defense.

---

### **Q7: Can you explain how parameterized queries prevent advanced SQL injection techniques?**

**Answer:**

**Advanced Techniques Prevented:**

**1. Union-Based Injection:**

```python
# Attack attempt
username = "admin' UNION SELECT * FROM passwords--"

# With parameterized query
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))
# Result: Searches for literal username "admin' UNION SELECT * FROM passwords--"
# No UNION executed! Parameter treated as data.

```

**2. Boolean-Based Blind Injection:**

```python
# Attack attempt
username = "admin' AND 1=1--"

# With parameterized query
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))
# Result: Searches for literal username "admin' AND 1=1--"
# No boolean logic executed!

```

**3. Time-Based Blind Injection:**

```python
# Attack attempt
username = "admin'; WAITFOR DELAY '00:00:05'--"

# With parameterized query
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))
# Result: Searches for literal username, no delay executed!

```

**Why It Works:**

- Query structure is constant (no user input)
- Parameters are treated as data (not code)
- Database escapes parameters automatically
- No way to inject SQL code

---

## **Performance Questions**

### **Q8: When should you use prepared statements vs regular parameterized queries?**

**Answer:**

**Use Prepared Statements When:**

- ✅ Query executed multiple times (loops, repeated calls)
- ✅ Performance is critical
- ✅ Database supports prepared statements
- ✅ Connection pooling is used

**Use Regular Parameterized Queries When:**

- ✅ Query executed once (single use)
- ✅ Performance not critical
- ✅ Simpler implementation preferred
- ✅ Database driver doesn't support prepared statements well

**Example (Prepared Statement for Repeated Queries):**

```python
# ✅ CORRECT: Prepared statement for repeated execution
query = "INSERT INTO logs (message, timestamp) VALUES (?, ?)"
stmt = connection.prepare(query)

for log_entry in log_entries:  # Many iterations
    stmt.execute(log_entry.message, log_entry.timestamp)
    # Uses cached execution plan - FAST

```

**Example (Regular Parameterized Query for Single Use):**

```python
# ✅ CORRECT: Regular parameterized query for single execution
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))  # Executed once
result = cursor.fetchone()

```

---

## **Scenario-Based Questions**

### **Q9: You discover SQL injection in a login function. How would you fix it?**

**Answer:**

**Vulnerable Code:**

```python
def login(username, password):
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    result = cursor.fetchone()
    return result is not None

```

**Fix (Parameterized Query):**

```python
def login(username, password):
    query = "SELECT * FROM users WHERE username = ? AND password = ?"
    cursor.execute(query, (username, password))
    result = cursor.fetchone()
    return result is not None

```

**Additional Improvements:**

```python
def login(username, password):
    # Input validation (additional layer)
    if not username or not password:
        return False
    if len(username) > 50:
        return False

    # Parameterized query (primary defense)
    query = "SELECT * FROM users WHERE username = ? AND password = ?"
    cursor.execute(query, (username, password))
    result = cursor.fetchone()

    # Additional: Use password hashing, not plaintext comparison
    if result and verify_password(password, result['password_hash']):
        return True
    return False

```

---

### **Q10: How would you handle dynamic table names in a secure way?**

**Answer:**

**Problem:** Table names cannot be parameterized.

**Solution (Whitelisting):**

```python
def get_table_data(table_name, filters):
    # Whitelist allowed tables
    allowed_tables = ['users', 'products', 'orders']
    if table_name not in allowed_tables:
        raise ValueError(f"Invalid table: {table_name}")

    # Table name is now safe (whitelisted)
    # Parameterize the filters (user input)
    query = f"SELECT * FROM {table_name} WHERE id = ?"
    cursor.execute(query, (filters['id'],))
    return cursor.fetchall()

```

**Alternative (Mapping):**

```python
def get_table_data(table_id, filters):
    # Map IDs to table names
    table_mapping = {
        '1': 'users',
        '2': 'products',
        '3': 'orders'
    }

    if table_id not in table_mapping:
        raise ValueError("Invalid table ID")

    table_name = table_mapping[table_id]  # Safe (mapped)
    query = f"SELECT * FROM {table_name} WHERE id = ?"
    cursor.execute(query, (filters['id'],))
    return cursor.fetchall()

```

**Key Point:** Use whitelisting or mapping for SQL structure elements. Only parameterize data values.

---

## **Advanced Questions**

### **Q11: What are the limitations of parameterized queries?**

**Answer:**

**Limitations:**

1. **Table/Column Names:**
    - Cannot be parameterized
    - Must use whitelisting
2. **SQL Keywords:**
    - Cannot parameterize ORDER BY, GROUP BY, etc.
    - Must use whitelisting
3. **Dynamic SQL Structure:**
    - Cannot dynamically change SQL structure
    - Must use whitelisting for structure elements
4. **Performance Overhead (Single Query):**
    - Small overhead for single queries
    - Negligible in most cases
5. **Database Support:**
    - Different syntax for different databases
    - Some databases have limited support

**Workarounds:**

- Use whitelisting for structure elements
- Use ORMs when possible
- Use prepared statements for repeated queries

---

### **Q12: How do ORMs use parameterized queries?**

**Answer:**

**ORMs automatically use parameterized queries:**

**Django (Python):**

```python
# ORM automatically uses parameterized queries
User.objects.filter(username=username, password=password)
# Generated SQL: SELECT * FROM users WHERE username = ? AND password = ?

```

**SQLAlchemy (Python):**

```python
# ORM automatically uses parameterized queries
session.query(User).filter(User.username == username).first()
# Generated SQL: SELECT * FROM users WHERE username = ?

```

**Hibernate (Java):**

```java
// ORM automatically uses parameterized queries
String hql = "FROM User WHERE username = :username";
Query query = session.createQuery(hql);
query.setParameter("username", username);
// Generated SQL: SELECT * FROM users WHERE username = ?

```

**Benefits:**

- ✅ Automatic parameterization
- ✅ Database agnostic
- ✅ Type safety
- ✅ Less boilerplate code

**Key Point:** ORMs provide a safe abstraction that automatically uses parameterized queries, making it harder to introduce SQL injection vulnerabilities.

---

## **Summary**

Parameterized queries and prepared statements are the primary defense against SQL injection. Key points:

1. **Always use parameterized queries** - Primary defense against SQL injection
2. **Use prepared statements for repeated queries** - Performance + security
3. **Don't parameterize table/column names** - Use whitelisting instead
4. **Input validation is not enough** - Use parameterized queries
5. **ORMs automatically use parameterized queries** - Consider using ORMs
6. **Different databases use different syntax** - But concept is the same

Remember: **Parameterized queries (prepared statements) prevent SQL injection by separating SQL structure from data values, ensuring the database treats input as data, never as code!**