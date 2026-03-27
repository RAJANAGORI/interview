# SSRF - Interview Questions & Answers

## **Fundamental Questions**

### **Q1: What is SSRF and how does it work?**

**Answer:**

SSRF (Server-Side Request Forgery) is a vulnerability that allows attackers to make unauthorized requests from a vulnerable server to other internal or external resources.

**How it works:**

1. **Attacker identifies vulnerable function:**
    - Finds endpoint making network requests
    - Identifies user input controlling destination
2. **Attacker crafts malicious request:**
    
    ```
    GET /fetch?url=http://internal-server:8080/admin
    
    ```
    
3. **Server processes request:**
    - Application receives user input
    - Makes HTTP request to provided URL
    - Request originates from server IP (not attacker IP)
4. **Target resource receives request:**
    - Sees request from trusted server
    - Grants access to internal resources
    - Returns sensitive data

**Key Point:** SSRF allows attackers to make requests from the server, bypassing network security controls and accessing internal resources.

---

### **Q2: What are the different types of SSRF attacks?**

**Answer:**

**1. Internal SSRF:**

- Targets resources accessible only from internal network
- Examples: `http://127.0.0.1:8080/admin`, `http://169.254.169.254/`

**2. External SSRF:**

- Targets external resources using server IP to bypass restrictions
- Uses server IP to access services restricted to specific IPs

**3. Blind SSRF:**

- Attacker cannot see response but can infer success
- Uses timing, DNS lookups, or out-of-band channels

---

## **Attack Mechanisms**

### **Q3: How can SSRF be used to access cloud metadata?**

**Answer:**

**Cloud Metadata Services:**

- AWS: `http://169.254.169.254/latest/meta-data/`
- Azure: `http://169.254.169.254/metadata/`
- GCP: `http://169.254.169.254/computeMetadata/v1/`

**Attack:**

```python
# Vulnerable code
url = request.args.get('url')
response = requests.get(url)  # SSRF!

# Attack payload
# GET /fetch?url=http://169.254.169.254/latest/meta-data/

```

**Impact:**

- Extract cloud credentials
- Access instance metadata
- Retrieve security keys
- Compromise cloud account

**Mitigation:**

- Block private IP ranges
- Whitelist allowed URLs
- Network segmentation

---

## **Mitigation Questions**

### **Q4: How do you prevent SSRF attacks?**

**Answer:**

**Primary Defense: Whitelisting**

```python
ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com']

def validate_url(url):
    parsed = urlparse(url)
    if parsed.netloc not in ALLOWED_DOMAINS:
        raise ValueError("Domain not allowed")
    return url

```

**Additional Defenses:**

1. **Block Private IP Ranges:**

```python
PRIVATE_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
]

```

1. **Network Segmentation:**
- Isolate application servers
- Restrict outbound connections
- Firewall rules
1. **Disable URL Schemes:**
- Only allow http:// and https://
- Block file://, gopher://, etc.

**Key Point:** Whitelisting is the primary defense. Blacklisting is easily bypassed.

---

## **Security Questions**

### **Q5: What is the impact of SSRF vulnerabilities?**

**Answer:**

**1. Internal Network Access:**

- Access to internal services
- Bypass network segmentation
- Access services not exposed to internet

**2. Cloud Metadata Access:**

- Extract credentials, tokens, keys
- Access instance metadata
- Compromise cloud account

**3. File System Access:**

- Read files from server filesystem
- Access configuration files
- Extract sensitive data

**4. Port Scanning:**

- Scan internal network ports
- Identify internal services
- Map internal network topology

**Business Impact:**

- Complete system compromise
- Data breach
- Regulatory violations
- Financial loss

---

## **Scenario-Based Questions**

### **Q6: You discover SSRF in an image processing endpoint. How would you fix it?**

**Answer:**

**Vulnerable Code:**

```python
@app.route('/thumbnail')
def get_thumbnail():
    image_url = request.args.get('url')
    image_data = requests.get(image_url).content  # SSRF!
    return generate_thumbnail(image_data)

```

**Fix:**

```python
ALLOWED_DOMAINS = ['cdn.example.com', 'images.example.com']

def validate_url(url):
    parsed = urlparse(url)
    if parsed.netloc not in ALLOWED_DOMAINS:
        raise ValueError("Domain not allowed")

    # Block private IPs
    ip = socket.gethostbyname(parsed.hostname)
    # Validate IP against private ranges...

    return url

@app.route('/thumbnail')
def get_thumbnail():
    image_url = validate_url(request.args.get('url'))
    image_data = requests.get(image_url, timeout=5).content
    return generate_thumbnail(image_data)

```

---

## **Advanced Questions**

### **Q7: How can IP encoding be used to bypass SSRF protections?**

**Answer:**

**IP Encoding Techniques:**

**1. Decimal Encoding:**

```
http://2130706433/  # 127.0.0.1

```

**2. Hex Encoding:**

```
http://0x7f.0x00.0x00.0x01/  # 127.0.0.1

```

**3. Octal Encoding:**

```
http://0177.0.0.1/  # 127.0.0.1

```

**4. IPv6:**

```
http://[::1]/  # localhost
http://[::ffff:127.0.0.1]/  # 127.0.0.1

```

**Mitigation:**

- Always resolve hostnames to IPs
- Validate resolved IPs, not hostnames
- Block all private IP ranges regardless of encoding

---

### **Q8: What is DNS rebinding and how does it relate to SSRF?**

**Answer:**

**DNS Rebinding Attack:**

1. Attacker controls DNS server
2. First DNS lookup resolves to allowed IP (e.g., public IP)
3. Application validates allowed IP
4. Subsequent requests resolve to private IP (e.g., 127.0.0.1)
5. Bypasses validation

**Mitigation:**

- Resolve hostname once and cache IP
- Validate resolved IP, not hostname
- Block private IPs regardless of hostname

---

## **Summary**

SSRF is a critical vulnerability allowing attackers to make requests from the server. Key points:

1. **Always use whitelisting** - Primary defense against SSRF
2. **Block private IP ranges** - Prevent internal network access
3. **Validate and resolve IPs** - Check resolved IPs, not hostnames
4. **Use network segmentation** - Isolate application servers
5. **Understand bypass techniques** - IP encoding, DNS rebinding, etc.

Remember: **SSRF is prevented by whitelisting allowed URLs and blocking private IP ranges, not by blacklisting!**