# SSRF - Quick Reference

## **SSRF Attack Types**

### **Internal SSRF**

```
http://127.0.0.1:8080/admin
http://169.254.169.254/latest/meta-data/
http://192.168.1.1/admin
file:///etc/passwd

```

### **External SSRF**

```
http://external-api.com/admin
# Uses server IP to bypass restrictions

```

### **Blind SSRF**

```
# Monitor DNS lookups or timing
# Use out-of-band channels

```

## **Common Vulnerable Functions**

- HTTP client libraries (requests, urllib, http)
- Image processing
- Webhooks and callbacks
- Import/export functions
- RSS/feed readers

## **SSRF Protection Checklist**

- ✅ Whitelist allowed URLs (primary defense)
- ✅ Block private IP ranges
- ✅ Validate and resolve IPs
- ✅ Disable dangerous URL schemes (file://, gopher://)
- ✅ Use network segmentation
- ✅ Implement request timeouts
- ✅ Follow redirects and validate each hop

## **IP Encoding Bypasses**

- Decimal: `http://2130706433/` (127.0.0.1)
- Hex: `http://0x7f.0x00.0x00.0x01/`
- Octal: `http://0177.0.0.1/`
- IPv6: `http://[::1]/`

## **Cloud Metadata Services**

- AWS: `169.254.169.254`
- Azure: `169.254.169.254`
- GCP: `169.254.169.254`

## **Risk Levels**

| Vulnerability | Risk Level |
| --- | --- |
| SSRF to Internal Network | Critical |
| SSRF to Cloud Metadata | Critical |
| SSRF to File System | High |
| Blind SSRF | High |