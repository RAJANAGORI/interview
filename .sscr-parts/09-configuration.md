## Configuration Review

Configuration sits at the edges of the repo: a committed `.env` or `config.yaml`, the Flask `app.config` / Go server setup / Express `app.set` block at startup, the lockfile, and the headers the app or the proxy actually sends. Read those before any feature handler. A debug flag left on, an open `/metrics` route, or a missing CSP will not show up inside a login function. Keys hardcoded in signing code and TLS cipher suites are in the Cryptography section; here I look for `DEBUG=True` leftovers, framework cookie defaults nobody flipped, and versions that stopped getting patches.

### Configuration files

A config file that ships with `DEBUG=True` and a live `sk_live_` key does two jobs for an attacker: it turns on the interactive debugger, and it hands them the production secret. The usual hiding places are a committed `.env`, `config.py`, or `config.yaml` that got copied into the image. Load from the environment or a secret manager, and refuse to start if a required value is missing.

> **Where to look:** settings modules, `.env` and `.env.*`, `config.yaml`, Dockerfiles that `COPY` them, Helm values, and CI variable files. Grep for `DEBUG = True`, `SECRET_KEY =`, `sk_live_`, `AKIA` (Python), `debug: true` and `secret_key:` in YAML (Go), and `secretKey` or `sk_live_` in JSON (Node).
>
> **How to think:** If I clone this repo on a fresh laptop, do I already have production credentials? Does the process start with a silent default when an env var is empty, or does it exit? Is there a `.env.example` with placeholders and a `.gitignore` rule for the real file? One file shared by every environment is how a `DEBUG=True` leftover reaches production even after the secrets have been moved out.

```ini vulnerable python
# .env (committed and copied into the image)
FLASK_ENV=development
DEBUG=True  # BUG: leftover from local testing
SECRET_KEY=changeme-please  # BUG: production secret in git
DATABASE_URL=postgres://admin:hunter2@db/billing
STRIPE_SECRET_KEY=sk_live_51FakeKey  # BUG: live Stripe key committed
LOG_LEVEL=DEBUG
SMTP_HOST=smtp.internal
```

```python fixed
import os


def require(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"missing required config: {name}")  # FIX: refuse to start
    return value


DEBUG = os.environ.get("DEBUG", "0") == "1"  # FIX: off unless explicitly set
SECRET_KEY = require("SECRET_KEY")
DATABASE_URL = require("DATABASE_URL")
STRIPE_SECRET_KEY = require("STRIPE_SECRET_KEY")
```

```yaml vulnerable go
# config.yaml, committed and copied into the image
debug: true                    # BUG: leftover from local testing
secret_key: changeme-please    # BUG: production secret in git
database_url: postgres://admin:hunter2@db/billing
stripe_secret_key: sk_live_51FakeKey  # BUG: live Stripe key committed
smtp_host: smtp.internal
log_level: debug
```

```go fixed
type Config struct {
	SecretKey       string
	DatabaseURL     string
	StripeSecretKey string
	Debug           bool
}

func LoadConfig() (Config, error) {
	c := Config{
		SecretKey:       os.Getenv("SECRET_KEY"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		StripeSecretKey: os.Getenv("STRIPE_SECRET_KEY"),
		Debug:           os.Getenv("DEBUG") == "1",
	}
	if c.SecretKey == "" || c.DatabaseURL == "" || c.StripeSecretKey == "" {
		return Config{}, errors.New("missing required config") // FIX: refuse to start
	}
	return c, nil
}
```

```javascript vulnerable
// config.json, committed and copied into the image
module.exports = {
  debug: true, // BUG: leftover from local testing
  secretKey: "changeme-please", // BUG: production secret in git
  databaseUrl: "postgres://admin:hunter2@db/billing",
  stripeSecretKey: "sk_live_51FakeKey", // BUG: live Stripe key committed
  smtpHost: "smtp.internal",
  logLevel: "debug",
};
```

```javascript fixed
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing required config: ${name}`); // FIX: refuse to start
  return value;
}

const config = {
  debug: process.env.DEBUG === "1", // FIX: off unless explicitly set
  secretKey: requireEnv("SECRET_KEY"),
  databaseUrl: requireEnv("DATABASE_URL"),
  stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
};

module.exports = config;
```

### Endpoint protection

Debug consoles, admin UIs, pprof, and metrics scrapers are real application endpoints. Leave them on the public mux without a login and anyone can dump heap profiles, list users, or read query timings. In production they should be compiled out, bound to localhost, or gated with the same auth the rest of the app uses.

> **Where to look:** the route table and every `register_blueprint` / `mux.Handle` / `app.use` that mounts a third-party UI. Grep for `/admin`, `/debug`, `/console`, `DebugToolbar`, `app.run(debug=True)` (Python), `net/http/pprof`, `:6060`, `promhttp` (Go), and `express-status-monitor`, `errorhandler`, `/metrics` (Node).
>
> **How to think:** Hit `/admin`, `/debug`, `/metrics`, `/actuator`, and `/_profiler` as an anonymous user, then as a normal account. What comes back? A health check should say `ok`, not dump versions, config, or env. The Werkzeug debugger and Go's pprof belong on a local port or off. If Prometheus needs to keep scraping, that route wants a scrape token or a private network, not an open URL.

```python vulnerable
from flask_debugtoolbar import DebugToolbarExtension

app.config["DEBUG"] = True  # BUG: Werkzeug debugger and PIN stay on in production
DebugToolbarExtension(app)


@app.get("/admin")
def admin_panel():
    return render("admin.html", users=User.query.all())  # BUG: no login


@app.get("/metrics")
def metrics():
    return generate_latest()  # BUG: process and query stats for anyone
```

```python fixed
app.config["DEBUG"] = False  # FIX: debugger compiled out of the production image


@app.get("/admin")
@login_required
@require_role("admin")  # FIX: staff only
def admin_panel():
    return render("admin.html", users=User.query.all())


@app.get("/metrics")
@require_internal  # FIX: scrape token or private network
def metrics():
    return generate_latest()
```

```go vulnerable
func routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /admin", adminPanel)       // BUG: no auth
	mux.Handle("GET /metrics", promhttp.Handler()) // BUG: no auth
	go http.ListenAndServe("0.0.0.0:6060", nil)    // BUG: pprof on every interface
	return mux
}
```

```go fixed
func routes() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /admin", requireRole("admin")(http.HandlerFunc(adminPanel))) // FIX: staff only
	mux.Handle("GET /metrics", requireInternal(promhttp.Handler()))              // FIX: scrape token or private network
	if os.Getenv("PPROF") == "1" {
		go http.ListenAndServe("127.0.0.1:6060", nil) // FIX: localhost, off unless set
	}
	return mux
}
```

```javascript vulnerable
const errorhandler = require("errorhandler");

app.use(errorhandler()); // BUG: stack traces and request dumps in production
app.get("/admin", async (req, res) => {
  res.render("admin", { users: await User.findAll() }); // BUG: no login
});
app.get("/metrics", metricsHandler); // BUG: process and query stats for anyone
```

```javascript fixed
if (process.env.NODE_ENV !== "production") {
  app.use(require("errorhandler")()); // FIX: debug middleware stays off in prod
}
app.get("/admin", requireAuth, requireRole("admin"), async (req, res) => {
  res.render("admin", { users: await User.findAll() }); // FIX: staff only
});
app.get("/metrics", requireInternal, metricsHandler); // FIX: scrape token or private network
```

### Framework security configuration

Frameworks ship cookie and proxy defaults that were chosen for local HTTP. Flask will send the session cookie over cleartext unless `SESSION_COOKIE_SECURE` is on; Express advertises itself with `X-Powered-By` and will trust every `X-Forwarded-*` hop if `trust proxy` is `true`. None of that fails a feature test, so it survives into production.

> **Where to look:** app startup and the session library setup. Grep for `SESSION_COOKIE_`, `app.config[` (Python), `scs.New`, `Cookie.Secure`, `http.Cookie{` (Go), and `cookieSession`, `cookie-session`, `trust proxy`, `x-powered-by` (Node).
>
> **How to think:** Read every cookie the framework sets, not only the ones you wrote by hand (those are under Session security). Are `Secure`, `HttpOnly`, and `SameSite` on? Behind a load balancer, is `trust proxy` set to the number of hops you actually have, so the app knows the request arrived on HTTPS and will still set `Secure` cookies? CSRF is an Authorization review; here I want the framework switches that were never flipped.

```python vulnerable
app.secret_key = os.environ.get("SECRET_KEY", "dev")
app.config["SESSION_COOKIE_NAME"] = "session"
app.config["SESSION_COOKIE_PATH"] = "/"
app.config["SESSION_COOKIE_SECURE"] = False  # BUG: leftover from local HTTP testing
app.config["SESSION_COOKIE_HTTPONLY"] = False  # BUG: JS can read the session
app.config["SESSION_COOKIE_SAMESITE"] = None  # BUG: sent on every cross-site request
app.config["PREFERRED_URL_SCHEME"] = "http"
```

```python fixed
app.secret_key = os.environ["SECRET_KEY"]
app.config["SESSION_COOKIE_NAME"] = "__Host-session"
app.config["SESSION_COOKIE_PATH"] = "/"
app.config["SESSION_COOKIE_SECURE"] = True  # FIX: HTTPS only
app.config["SESSION_COOKIE_HTTPONLY"] = True  # FIX: hidden from JS
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["PREFERRED_URL_SCHEME"] = "https"
```

```go vulnerable
func newSessions() *scs.SessionManager {
	s := scs.New()
	s.Cookie.Name = "session"
	s.Cookie.Path = "/"
	s.Cookie.Secure = false                     // BUG: leftover from local HTTP testing
	s.Cookie.HttpOnly = false                   // BUG: JS can read the session
	s.Cookie.SameSite = http.SameSiteNoneMode   // BUG: sent on every cross-site request
	return s
}
```

```go fixed
func newSessions() *scs.SessionManager {
	s := scs.New()
	s.Cookie.Name = "__Host-session"
	s.Cookie.Path = "/"
	s.Cookie.Secure = true                  // FIX: HTTPS only
	s.Cookie.HttpOnly = true                // FIX: hidden from JS
	s.Cookie.SameSite = http.SameSiteLaxMode
	return s
}
```

```javascript vulnerable
const cookieSession = require("cookie-session");

app.set("trust proxy", true); // BUG: every X-Forwarded-* hop is trusted
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET],
    secure: false, // BUG: leftover from local HTTP testing
    httpOnly: false, // BUG: JS can read the session
    sameSite: "none",
  }),
);
```

```javascript fixed
const cookieSession = require("cookie-session");

app.set("trust proxy", 1); // FIX: only the load balancer in front
app.disable("x-powered-by"); // FIX: stop advertising Express
app.use(
  cookieSession({
    name: "__Host-session",
    keys: [process.env.SESSION_SECRET],
    secure: true, // FIX: HTTPS only
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  }),
);
```

### Language and framework versions

A pin to Flask 2.2.2 or Express 4.17.1 is a known CVE sitting in the lockfile. Reviewers skip the manifest because it looks like build glue, and that's where the old versions hide. Pin a current patched release and have CI run a scanner, because a pin that never moves is how last year's CVE ships in this year's deploy.

> **Where to look:** `requirements.txt`, `Pipfile.lock`, `poetry.lock` (Python), `go.mod` and `go.sum` (Go), `package.json` and `package-lock.json` (Node). Grep for unpinned `*` or `>=` ranges, and for language versions that have already gone end-of-life.
>
> **How to think:** Start with the language, then the framework, then everything else in the lockfile. I run `pip-audit`, `govulncheck`, or `npm audit` and treat a finding in a transitive dependency the same as one I pinned myself. A bare `>=` with no upper bound is how a hostile package version lands on the next install. If the runtime is EOL, the rest of the pins do not matter; the stdlib itself is unpatched.

```ini vulnerable python
# requirements.txt
Flask==2.2.2  # BUG: CVE-2023-30861 session cookie sent to every subdomain
Jinja2==3.1.2  # BUG: CVE-2024-22195 XSS in the xmlattr filter
Werkzeug==2.2.2  # BUG: CVE-2023-25577 multipart DoS
itsdangerous==2.1.2
click==8.1.3
gunicorn==20.1.0
```

```ini fixed python
# requirements.txt
Flask==3.0.3  # FIX: patched past CVE-2023-30861
Jinja2==3.1.4  # FIX: patched past CVE-2024-22195
Werkzeug==3.0.3  # FIX: patched past CVE-2023-25577
itsdangerous==2.2.0
click==8.1.7
gunicorn==22.0.0
# CI runs `pip-audit`
```

```plaintext vulnerable go
module github.com/acme/billing

go 1.20 // BUG: Go 1.20 is EOL; later stdlib CVEs stay unpatched

require (
	github.com/gorilla/websocket v1.4.0 // BUG: CVE-2020-27813 integer overflow DoS
	github.com/lib/pq v1.10.7
	golang.org/x/crypto v0.9.0
	golang.org/x/net v0.10.0 // BUG: CVE-2023-39325 HTTP/2 rapid reset, fixed in v0.17.0
)
```

```plaintext fixed go
module github.com/acme/billing

go 1.22

require (
	github.com/gorilla/websocket v1.5.3 // FIX: current patched release
	github.com/lib/pq v1.10.9
	golang.org/x/crypto v0.28.0
	golang.org/x/net v0.30.0 // FIX: includes the HTTP/2 reset fix
)

// FIX: CI runs `govulncheck ./...` on every build
```

```javascript vulnerable
// package.json
module.exports = {
  engines: { node: "16.20.0" }, // BUG: Node 16 is EOL; stdlib CVEs stay unpatched
  dependencies: {
    express: "4.17.1", // BUG: CVE-2024-43796 XSS in res.redirect, fixed in 4.21.1
    qs: "6.5.2", // BUG: CVE-2022-24999 prototype pollution, fixed in 6.5.3
    cookie: "0.4.0",
  },
};
```

```javascript fixed
// package.json
module.exports = {
  engines: { node: "20.18.0" }, // FIX: current LTS
  dependencies: {
    express: "4.21.1", // FIX: patched past CVE-2024-43796
    qs: "6.13.0",
    cookie: "0.7.2", // FIX: patched past CVE-2024-47764
  },
};
// CI runs `npm audit --audit-level=high`
```

### Security headers

Browsers will refuse a bad response if you tell them to: no unexpected script (CSP), no HTTP downgrade (HSTS), no MIME sniffing, no framing. Those headers have to go out on every HTML response, error pages included. I want them set in one place, Talisman or `after_request` in Flask, middleware in Go, `helmet` in Express, or the reverse proxy, and I want a curl of `/` and of a 404 to prove they actually appear.

> **Where to look:** `after_request`, `Talisman(`, nginx / Caddy / CloudFront headers, and the global middleware list. Grep for `Content-Security-Policy`, `Strict-Transport-Security`, `Talisman` (Python), `X-Content-Type-Options`, `X-Frame-Options` (Go), and `helmet` (Node).
>
> **How to think:** curl a page and an error page and read the headers. Is there a CSP, and is it more than `default-src *`? HSTS only helps on the HTTPS response, with a long `max-age` and `includeSubDomains` once you are sure every subdomain can do HTTPS. `X-Frame-Options` and CSP `frame-ancestors` both stop clickjacking; I want at least one. `X-Content-Type-Options: nosniff` is a one-liner that stops the browser from treating a downloaded CSV as HTML. If the app does not use the camera or GPS, Permissions-Policy should say so. Then check the CDN and the app do not overwrite each other.

```python vulnerable
@app.get("/")
def index():
    return render("index.html")


@app.after_request
def headers(resp):
    resp.headers["Server"] = "Flask/2.2"  # BUG: advertises the stack; CSP, HSTS, nosniff, frame options never set
    return resp
```

```python fixed
from flask_talisman import Talisman

Talisman(
    app,
    force_https=True,
    frame_options="DENY",
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,  # FIX: HSTS
    content_security_policy={
        "default-src": "'self'",
        "object-src": "'none'",
        "base-uri": "'self'",
        "frame-ancestors": "'none'",
    },  # FIX: CSP
    referrer_policy="strict-origin-when-cross-origin",
    x_content_type_options=True,  # FIX: nosniff
)
```

```go vulnerable
func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Server", "Go")
		w.Header().Set("X-Powered-By", "billing/2.4") // BUG: advertises the stack
		next.ServeHTTP(w, r)                          // BUG: CSP, HSTS, nosniff, frame options never set
	})
}
```

```go fixed
func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'") // FIX: CSP
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")                                          // FIX: HSTS
		w.Header().Set("X-Content-Type-Options", "nosniff")                                                                         // FIX: no MIME sniffing
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}
```

```javascript vulnerable
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Express"); // BUG: advertises the stack
  next(); // BUG: no CSP, HSTS, nosniff, or frame options
});

app.get("/", (req, res) => {
  res.send(homePage);
});
```

```javascript fixed
const helmet = require("helmet");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    }, // FIX: CSP
    hsts: { maxAge: 31536000, includeSubDomains: true }, // FIX: HSTS
    frameguard: { action: "deny" },
  }),
); // FIX: nosniff is on by default
```

---
