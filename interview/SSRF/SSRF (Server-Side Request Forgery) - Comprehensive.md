# SSRF (Server-Side Request Forgery) - Comprehensive Guide

## **Introduction**

SSRF (Server-Side Request Forgery) is a vulnerability that allows attackers to make unauthorized requests from a vulnerable server to other internal or external resources. It ranks #10 in OWASP Top 10 2021 and is a critical web application security risk.

### **What SSRF is Used For**

Attackers use SSRF to:

- **Access internal services** not exposed to the internet
- **Read files** from the server filesystem
- **Access cloud metadata** APIs
- **Perform port scanning** of internal networks
- **Bypass network security controls** (firewalls, WAFs)
- **Exfiltrate data** from internal systems

### **Why SSRF is Dangerous**

**Severity:**

- ✅ **Critical Impact**: Can lead to internal network access
- ✅ **Bypasses Security**: Request originates from trusted server
- ✅ **Hard to Detect**: Appears as legitimate server request
- ✅ **Widespread Impact**: Can access entire internal network
- ✅ **Complex Mitigation**: Requires multiple layers of defense

---

## **What is SSRF**

SSRF (Server-Side Request Forgery) occurs when an application makes network requests based on user-supplied input without proper validation, allowing attackers to make requests to arbitrary destinations from the server.

### **Basic Example**

**Vulnerable Application:**

```python
@app.route('/fetch')
def fetch_url():
    url = request.args.get('url')
    response = requests.get(url)  # SSRF vulnerability!
    return response.text

```

**Attack:**

```
GET /fetch?url=http://169.254.169.254/latest/meta-data/

```

**Result:** Server makes HTTP request to cloud metadata API (AWS instance metadata)

---

## **How SSRF Works**

### **Attack Flow**

**1. Attacker Identifies Vulnerable Function:**

- Finds endpoint that makes network requests
- Identifies user input controlling request destination

**2. Attacker Crafts Malicious Request:**

```
GET /fetch?url=http://internal-server:8080/admin

```

**3. Server Processes Request:**

- Application receives user input
- Makes HTTP request to provided URL
- Request originates from server IP (not attacker IP)

**4. Target Resource Receives Request:**

- Sees request from trusted server
- Grants access to internal resources
- Returns sensitive data

**5. Attacker Receives Response:**

- Server returns response to attacker
- Attacker extracts sensitive information

---

## **Types of SSRF Attacks**

### **1. Internal SSRF**

**Description:** Attacker targets resources accessible only from internal network.

**Targets:**

- Internal APIs (`http://localhost:8080/admin`)
- Internal services (`http://192.168.1.1:3306`)
- Cloud metadata APIs (`http://169.254.169.254`)
- Internal file system (`file:///etc/passwd`)

**Example:**

```python
# Vulnerable code
url = request.args.get('url')
response = requests.get(url)

# Attack
# GET /fetch?url=http://169.254.169.254/latest/meta-data/

```

---

### **2. External SSRF**

**Description:** Attacker targets external resources using server IP to bypass restrictions.

**Use Cases:**

- Bypass IP-based whitelisting
- Access services restricted to specific IPs
- Perform attacks with trusted server IP

**Example:**

```python
# Attack uses server IP to bypass restrictions
url = "http://external-api.com/admin"
# Request appears to come from trusted server IP

```

---

### **3. Blind SSRF**

**Description:** Attacker cannot see response but can infer success from timing or behavior.

**Detection Methods:**

- Time delays
- DNS lookups
- Error messages
- Out-of-band channels

**Example:**

```python
# Blind SSRF - no direct response
url = "http://internal-server:8080/admin"
response = requests.get(url, timeout=1)
# Attacker monitors DNS lookups or timing to detect success

```

---

## **Impact of SSRF**

### **1. Internal Network Access**

**Impact:**

- Access to internal services
- Bypass network segmentation
- Access services not exposed to internet

**Examples:**

- Internal APIs
- Database servers
- Admin panels
- Internal file shares

---

### **2. Cloud Metadata Access**

**Impact:**

- Access to cloud metadata APIs
- Extract credentials, tokens, keys
- Access instance metadata

**Examples:**

- AWS: `169.254.169.254`
- Azure: `169.254.169.254`
- GCP: `169.254.169.254`

---

### **3. File System Access**

**Impact:**

- Read files from server filesystem
- Access configuration files
- Extract sensitive data

**Examples:**

- `file:///etc/passwd`
- `file:///var/www/config.php`
- `file:///proc/self/environ`

---

### **4. Port Scanning**

**Impact:**

- Scan internal network ports
- Identify internal services
- Map internal network topology

**Example:**

```python
# Port scanning via SSRF
for port in range(1, 65536):
    url = f"http://127.0.0.1:{port}"
    # Test if port is open

```

---

## **Common Vulnerable Functions**

### **1. HTTP Client Libraries**

**Vulnerable:**

```python
# Python requests
response = requests.get(user_url)

# Python urllib
response = urllib.request.urlopen(user_url)

# Node.js http
http.get(user_url, callback)

# PHP file_get_contents
file_get_contents(user_url)

```

---

### **2. Image Processing**

**Vulnerable:**

```python
@app.route('/thumbnail')
def get_thumbnail():
    image_url = request.args.get('url')
    image_data = requests.get(image_url).content  # SSRF!
    return generate_thumbnail(image_data)

```

---

### **3. Webhooks and Callbacks**

**Vulnerable:**

```python
@app.route('/webhook')
def handle_webhook():
    callback_url = request.json.get('callback_url')
    requests.post(callback_url, data=data)  # SSRF!

```

---

### **4. Import/Export Functions**

**Vulnerable:**

```python
@app.route('/import')
def import_data():
    source_url = request.args.get('source')
    data = requests.get(source_url).json()  # SSRF!
    import_data(data)

```

---

## **Mitigation Strategies**

### **1. Whitelist Allowed URLs (Primary Defense)**

**✅ CORRECT:**

```python
ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com']

def validate_url(url):
    parsed = urlparse(url)
    if parsed.netloc not in ALLOWED_DOMAINS:
        raise ValueError("Domain not allowed")
    return url

url = validate_url(user_url)
response = requests.get(url)

```

---

### **2. Block Private IP Ranges**

**✅ CORRECT:**

```python
import ipaddress

PRIVATE_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
]

def validate_url(url):
    parsed = urlparse(url)
    hostname = parsed.hostname

    try:
        ip = ipaddress.ip_address(hostname)
        for private_range in PRIVATE_RANGES:
            if ip in private_range:
                raise ValueError("Private IP not allowed")
    except ValueError:
        # Hostname, resolve it
        ip = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip)
        for private_range in PRIVATE_RANGES:
            if ip in private_range:
                raise ValueError("Private IP not allowed")

    return url

```

---

### **3. Use URL Parsing and Validation**

**✅ CORRECT:**

```python
from urllib.parse import urlparse

def validate_url(url):
    parsed = urlparse(url)

    # Block file:// protocol
    if parsed.scheme not in ['http', 'https']:
        raise ValueError("Only HTTP/HTTPS allowed")

    # Block localhost
    if parsed.hostname in ['localhost', '127.0.0.1', '0.0.0.0']:
        raise ValueError("Localhost not allowed")

    # Block private IPs (use function above)
    # ...

    return url

```

---

### **4. Network Segmentation**

**✅ CORRECT:**

- Isolate application servers from internal network
- Use separate network for application servers
- Restrict outbound connections
- Implement firewall rules

---

### **5. Disable URL Schemes**

**✅ CORRECT:**

```python
# Only allow http:// and https://
ALLOWED_SCHEMES = ['http', 'https']

def validate_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError("Scheme not allowed")
    return url

```

---

## **Best Practices**

### **1. Always Use Whitelisting**

**✅ CORRECT:**

```python
ALLOWED_DOMAINS = ['api.example.com']
# Validate against whitelist

```

**❌ WRONG:**

```python
# Blacklisting is easily bypassed
BLOCKED_DOMAINS = ['localhost', '127.0.0.1']

```

---

### **2. Validate and Resolve IPs**

**✅ CORRECT:**

```python
def validate_url(url):
    parsed = urlparse(url)
    hostname = parsed.hostname

    # Resolve hostname to IP
    ip = socket.gethostbyname(hostname)

    # Check against private ranges
    # Block private IPs

    return url

```

---

### **3. Use Application-Level Firewalls**

**✅ CORRECT:**

- Network-level firewalls
- Application-level filtering
- Request validation middleware

---

### **4. Implement Request Timeouts**

**✅ CORRECT:**

```python
response = requests.get(url, timeout=5)  # 5 second timeout

```

---

## **Advanced Exploitation Techniques**

### **1. IP Encoding Bypasses**

**Techniques:**

- Decimal encoding: `http://2130706433/` (127.0.0.1)
- Hex encoding: `http://0x7f.0x00.0x00.0x01/`
- Octal encoding: `http://0177.0.0.1/`
- IPv6: `http://[::1]/` or `http://[::ffff:127.0.0.1]/`

**Mitigation:**

- Always resolve hostnames and validate IPs
- Block all private IP ranges regardless of encoding

---

### **2. DNS Rebinding**

**Technique:**

- Attacker controls DNS server
- First request resolves to allowed IP
- Subsequent requests resolve to private IP
- Bypasses validation

**Mitigation:**

- Resolve hostname once and cache IP
- Validate resolved IP, not hostname

---

### **3. URL Redirection**

**Technique:**

- Provide URL that redirects to internal resource
- First request validates external URL
- Redirect points to internal resource

**Mitigation:**

- Follow redirects and validate each hop
- Block redirects to private IPs

---

### **4. Protocol Bypass**

**Techniques:**

- Use alternative protocols (gopher://, dict://, ldap://)
- Protocol-relative URLs
- URL encoding

**Mitigation:**

- Whitelist allowed protocols (http, https only)
- Strict URL parsing

---

## **Penetration Testing Methodology**

### **SSRF Testing Checklist**

**1. Identify Request Functions:**

- Find endpoints making network requests
- Identify user input controlling destination
- Map all input points

**2. Test Basic SSRF:**

```python
# Test internal IPs
url = "http://127.0.0.1:8080/admin"
url = "http://localhost/admin"

# Test cloud metadata
url = "http://169.254.169.254/latest/meta-data/"

# Test private IPs
url = "http://192.168.1.1/admin"

```

**3. Test Protocol Bypasses:**

```python
# file:// protocol
url = "file:///etc/passwd"

# gopher:// protocol
url = "gopher://internal-server:8080/"

# dict:// protocol
url = "dict://internal-server:8080/"

```

**4. Test IP Encoding:**

```python
# Decimal
url = "http://2130706433/"

# Hex
url = "http://0x7f.0x00.0x00.0x01/"

# Octal
url = "http://0177.0.0.1/"

```

**5. Test DNS Rebinding:**

- Control DNS server
- First resolves to allowed IP
- Subsequent resolves to private IP

**6. Test Blind SSRF:**

- Monitor DNS lookups
- Use time delays
- Use out-of-band channels

---

## **Threat Modeling (STRIDE Framework)**

### **Spoofing**

**Threat:** Attacker spoofs internal network requests via SSRF.

**Mitigation:**

- Whitelist allowed URLs
- Block private IP ranges
- Network segmentation

**Risk Rating:** Critical

---

### **Tampering**

**Threat:** Attacker modifies request destination via SSRF.

**Mitigation:**

- Input validation
- Whitelisting
- URL parsing

**Risk Rating:** High

---

### **Repudiation**

**Threat:** SSRF requests cannot be attributed to attacker.

**Mitigation:**

- Comprehensive logging
- Request correlation
- Audit trails

**Risk Rating:** Medium

---

### **Information Disclosure**

**Threat:** Attacker accesses internal resources via SSRF.

**Mitigation:**

- Block private IPs
- Network segmentation
- Whitelisting

**Risk Rating:** Critical

---

### **Denial of Service**

**Threat:** Attacker causes DoS via SSRF.

**Mitigation:**

- Request timeouts
- Rate limiting
- Resource limits

**Risk Rating:** High

---

### **Elevation of Privilege**

**Threat:** Attacker gains access to internal resources via SSRF.

**Mitigation:**

- Network segmentation
- Least privilege
- Access controls

**Risk Rating:** Critical

---

## **Real-World Case Studies**

### **Case Study 1: Cloud Metadata Access**

**Background:** Penetration test discovered SSRF in image processing endpoint.

**Vulnerable Code:**

```python
@app.route('/thumbnail')
def get_thumbnail():
    image_url = request.args.get('url')
    image_data = requests.get(image_url).content  # SSRF!
    return generate_thumbnail(image_data)

```

**Exploitation:**

```
GET /thumbnail?url=http://169.254.169.254/latest/meta-data/

```

**Impact:**

- **Confidentiality**: Critical - Cloud credentials extracted
- **Integrity**: High - Could modify cloud resources
- **Business Impact**: Critical - Complete cloud account compromise

**Remediation:**

```python
ALLOWED_DOMAINS = ['cdn.example.com', 'images.example.com']

def validate_url(url):
    parsed = urlparse(url)
    if parsed.netloc not in ALLOWED_DOMAINS:
        raise ValueError("Domain not allowed")

    # Block private IPs
    ip = socket.gethostbyname(parsed.hostname)
    # Validate IP...

    return url

@app.route('/thumbnail')
def get_thumbnail():
    image_url = validate_url(request.args.get('url'))
    image_data = requests.get(image_url, timeout=5).content
    return generate_thumbnail(image_data)

```

---

## **Advanced Mitigations**

### **Defense in Depth Strategy**

**Layer 1: Whitelisting (Primary Defense)**

```python
ALLOWED_DOMAINS = ['api.example.com']

```

**Layer 2: IP Validation**

```python
# Block private IP ranges
# Validate resolved IPs

```

**Layer 3: Network Segmentation**

- Isolate application servers
- Restrict outbound connections
- Firewall rules

**Layer 4: Request Filtering**

- Application-level firewalls
- Request validation middleware
- Timeout limits

---

## **SAST/DAST Detection**

### **SAST (Static Application Security Testing)**

**Vulnerable Code Patterns:**

**1. Unsafe HTTP Client:**

```python
# ❌ VULNERABLE
url = request.args.get('url')
response = requests.get(url)

# SAST Detection:
# - Pattern: User input in HTTP request
# - Severity: Critical
# - CWE: CWE-918 (Server-Side Request Forgery)

```

---

### **DAST (Dynamic Application Security Testing)**

**Testing Methodology:**

**1. Identify Request Functions:**

- Find endpoints making network requests
- Test all user input points

**2. Submit SSRF Payloads:**

```python
test_payloads = [
    "http://127.0.0.1:8080/admin",
    "http://169.254.169.254/latest/meta-data/",
    "file:///etc/passwd",
    "http://192.168.1.1/admin"
]

```

**3. Monitor Responses:**

- Check for internal data in responses
- Monitor DNS lookups
- Check timing differences

---

## **Risk Assessment**

### **Risk Matrix**

| Vulnerability | Likelihood | Impact | Risk Level | Business Impact |
| --- | --- | --- | --- | --- |
| **SSRF to Internal Network** | Medium | Critical | **Critical** | Internal network compromise |
| **SSRF to Cloud Metadata** | Medium | Critical | **Critical** | Cloud account compromise |
| **SSRF to File System** | Low | High | **High** | File system access |
| **Blind SSRF** | Medium | High | **High** | Information disclosure |

### **Risk Calculation**

**Example: SSRF in Image Processing**

**Likelihood:** Medium (0.6)

- Requires network request functionality
- Common vulnerability pattern

**Impact:** Critical (1.0)

- Internal network access
- Cloud metadata access
- Complete system compromise

**Risk Score:** 0.6 × 1.0 = **0.6 (Critical Risk)**

**Business Impact:**

- **Financial**: Data breach, cloud resource abuse
- **Reputation**: Loss of customer trust
- **Legal**: Regulatory violations, liability
- **Operational**: System compromise, data loss

---

## **Summary**

SSRF is a critical vulnerability allowing attackers to make requests from the server. Key points:

1. **Always use whitelisting** - Primary defense against SSRF
2. **Block private IP ranges** - Prevent internal network access
3. **Validate and resolve IPs** - Check resolved IPs, not hostnames
4. **Use network segmentation** - Isolate application servers
5. **Follow defense in depth** - Multiple layers of protection
6. **Test thoroughly** - Code reviews, SAST/DAST scanning

Remember: **SSRF is prevented by whitelisting allowed URLs and blocking private IP ranges, not by blacklisting or URL validation alone!**