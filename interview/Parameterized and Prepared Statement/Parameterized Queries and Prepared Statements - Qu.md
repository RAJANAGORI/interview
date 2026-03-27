# Parameterized Queries and Prepared Statements - Quick Reference

## **Key Concepts**

### **Parameterized Queries**

- SQL query with placeholders (`?`, `%s`, `:name`)
- Values provided separately
- Prevents SQL injection
- Security benefit

### **Prepared Statements**

- Pre-compiled parameterized query
- Parsed once, executed many times
- Prevents SQL injection + performance
- Security + performance benefits

## **Syntax by Database**

| Database | Placeholder | Example |
| --- | --- | --- |
| **SQLite** | `?` | `cursor.execute(query, (value,))` |
| **MySQL (Python)** | `%s` | `cursor.execute(query, (value,))` |
| **PostgreSQL** | `%s` | `cursor.execute(query, (value,))` |
| **Oracle** | `:name` | `cursor.execute(query, {'name': value})` |
| **SQL Server (.NET)** | `@name` | `cmd.Parameters.Add("@name", value)` |

## **Code Patterns**

### **❌ Vulnerable (String Concatenation)**

```python
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

```

### **✅ Secure (Parameterized Query)**

```python
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

```

## **Protection Checklist**

- ✅ Use parameterized queries for all user input
- ✅ Use prepared statements for repeated queries
- ✅ Whitelist table/column names (can't parameterize)
- ✅ Validate input types (additional layer)
- ✅ Use ORMs when possible (automatic parameterization)
- ✅ Follow principle of least privilege
- ✅ Test with SQL injection payloads

## **Common Mistakes**

- ❌ Trying to parameterize table/column names
- ❌ Using string concatenation with user input
- ❌ Relying on input validation alone
- ❌ Escaping manually instead of parameterizing
- ❌ Not using prepared statements for repeated queries

## **When to Use**

### **Use Prepared Statements When:**

- Query executed multiple times
- Performance is critical
- Database supports it well

### **Use Parameterized Queries When:**

- Query executed once
- Simpler implementation preferred
- Database support is limited

## **Limitations**

- Cannot parameterize table/column names (use whitelisting)
- Cannot parameterize SQL keywords (use whitelisting)
- Small overhead for single queries (negligible)
- Different syntax for different databases