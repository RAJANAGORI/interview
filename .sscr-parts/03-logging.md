## Auditing and Logging Review

Error handling and logging code is spread thin: one global error handler, a logger configured at startup, and audit calls scattered through login, payment, and admin routes. Read the startup config and the catch-all error handler first, because they decide what every other line of code leaks or records. In Flask that's `@app.errorhandler` and the `logging` setup; in Go, the `slog` handler built in `main` plus any `recover()` middleware; in Express, the four-argument error middleware and the `pino` or `winston` instance.

### Exception handling

Failing secure means that when something throws halfway through, the code lands in the safe state: access denied, money not moved, partial writes undone. The bug is a catch block that swallows the error and lets the request carry on as if the check had passed, or a multi-step write where the first step commits on its own.

> **Where to look:** `try`/`catch` blocks around authorization checks, balance and payment code, and anything that writes more than one row. Grep for `except Exception`, `except:`, `pass` (Python), `if err != nil` branches that return `true` or keep going, `BeginTx`, `recover()` (Go), and empty `catch {}`, `.catch(() =>`, `sequelize.transaction` (Node).
>
> **How to think:** For each catch block, ask what state the program is in afterwards. If the permission check never finished, the answer has to be no. If the debit ran and the credit didn't, something must undo the debit, which means both writes share one transaction that rolls back on any error. Then check that the error path releases what the happy path releases: file handles, locks, DB connections, temp files. `with`, `defer`, and `finally` do that; a `close()` at the bottom of a `try` never runs when an earlier line throws. And the swallowed error should still reach a log someone reads.

```python vulnerable
def can_view(user, doc):
    allowed = False
    try:
        allowed = policy.check(user, "view", doc)
    except Exception:
        allowed = True  # BUG: a policy-service outage opens every document
    return allowed


def transfer(src_id, dst_id, amount: Decimal):
    src = db.session.get(Account, src_id)
    src.balance -= amount
    db.session.commit()  # BUG: the debit commits on its own
    dst = db.session.get(Account, dst_id)
    dst.balance += amount  # AttributeError on a bad dst_id, after the money already left
    db.session.commit()
```

```python fixed
def can_view(user, doc):
    try:
        return policy.check(user, "view", doc)
    except Exception:
        logger.exception("policy check failed", extra={"user_id": user.id, "doc_id": doc.id})
        return False  # FIX: a check that didn't finish is a no


def transfer(src_id, dst_id, amount: Decimal):
    try:
        src = db.session.get(Account, src_id, with_for_update=True)
        dst = db.session.get(Account, dst_id, with_for_update=True)
        if amount <= 0 or src is None or dst is None or src.balance < amount:
            raise TransferRejected()
        src.balance -= amount
        dst.balance += amount
        db.session.commit()  # FIX: one commit covers both rows
    except Exception:
        db.session.rollback()  # FIX: any failure undoes the partial work
        raise
```

```go vulnerable
func canView(ctx context.Context, userID, docID int64) bool {
	ok, err := policy.Check(ctx, userID, "view", docID)
	if err != nil {
		return true // BUG: a policy-service outage opens every document
	}
	return ok
}

func transfer(ctx context.Context, from, to, amount int64) error {
	if _, err := db.ExecContext(ctx, "UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, from); err != nil {
		return err
	}
	_, err := db.ExecContext(ctx, "UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, to) // BUG: if this fails, the debit above is already committed
	return err
}
```

```go fixed
func canView(ctx context.Context, userID, docID int64) bool {
	ok, err := policy.Check(ctx, userID, "view", docID)
	if err != nil {
		slog.ErrorContext(ctx, "policy check failed", "err", err, "user_id", userID, "doc_id", docID)
		return false // FIX: a check that didn't finish is a no
	}
	return ok
}

func transfer(ctx context.Context, from, to, amount int64) error {
	if amount <= 0 {
		return errBadAmount
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // FIX: undoes the debit on every early return; a no-op after Commit
	var id int64
	if err := tx.QueryRowContext(ctx, "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING id", amount, from).Scan(&id); err != nil {
		return err // sql.ErrNoRows: no such account, or not enough money
	}
	if err := tx.QueryRowContext(ctx, "UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING id", amount, to).Scan(&id); err != nil {
		return err
	}
	return tx.Commit() // FIX: both rows change together or not at all
}
```

```javascript vulnerable
async function canView(user, doc) {
  let allowed = true;
  try {
    allowed = await policy.check(user, "view", doc);
  } catch {} // BUG: the error is swallowed and the "allow" default stands
  return allowed;
}

async function transfer(fromId, toId, amount) {
  await Account.decrement("balance", { by: amount, where: { id: fromId } }); // BUG: commits on its own
  await Account.increment("balance", { by: amount, where: { id: toId } }); // a throw here keeps the debit
}
```

```javascript fixed
async function canView(user, doc) {
  try {
    return await policy.check(user, "view", doc);
  } catch (err) {
    logger.error({ err, userId: user.id, docId: doc.id }, "policy check failed");
    return false; // FIX: a check that didn't finish is a no
  }
}

async function transfer(fromId, toId, amount) {
  if (!Number.isInteger(amount) || amount <= 0) throw new TransferRejected("bad amount");
  await sequelize.transaction(async (t) => { // FIX: commits when the callback resolves, rolls back when it throws
    const from = await Account.findByPk(fromId, { transaction: t, lock: t.LOCK.UPDATE });
    const to = await Account.findByPk(toId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!from || !to || from.balance < amount) throw new TransferRejected("transfer rejected");
    await from.decrement("balance", { by: amount, transaction: t });
    await to.increment("balance", { by: amount, transaction: t });
  });
}
```

### Error messages

An error response goes to an untrusted client, so it should say that something failed and nothing about why. Raw exception text is a gift to an attacker: SQL fragments, table and column names, file paths, library versions, sometimes the very value that broke the query.

> **Where to look:** the global error handler, plus every `except`, `catch`, or `if err != nil` branch that writes a response. Grep for `str(e)`, `traceback.format_exc`, `debug=True`, `DEBUG = True` (Python), `err.Error()` passed to `http.Error` or `fmt.Fprint(w`, `debug.Stack` (Go), and `err.message`, `err.stack`, `res.send(err` (Node).
>
> **How to think:** Break things on purpose. Send a quote in a parameter, a string where a number belongs, a missing field, a 10 MB body, and read what comes back. Stack traces in production usually come from a debug switch left on: Flask's debug mode serves the Werkzeug debugger with an interactive console, Django's `DEBUG = True` dumps settings and SQL, and Express's built-in handler prints `err.stack` unless `NODE_ENV=production`. Framework and component errors count too; a database driver or template engine message is just as revealing as your own. What the user should get is a generic message with a reference ID, while the full detail, stack trace included, goes to the server-side log under that same ID.

```python vulnerable
@app.errorhandler(Exception)
def handle_error(e):
    return {"error": str(e), "trace": traceback.format_exc()}, 500  # BUG: SQL, file paths, and library versions reach the client


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)  # BUG: the Werkzeug debugger serves source and a Python console
```

```python fixed
@app.before_request
def assign_request_id():
    g.request_id = uuid.uuid4().hex


@app.errorhandler(Exception)
def handle_error(e):
    if isinstance(e, HTTPException):
        return e  # 404, 405, and friends already have safe pages
    logger.exception("unhandled error", extra={"request_id": g.get("request_id"), "path": request.path})  # FIX: the trace stays server-side
    return {"error": "Something went wrong.", "request_id": g.get("request_id")}, 500  # FIX: generic text plus an ID to quote


if __name__ == "__main__":
    app.run()  # FIX: debug stays off; production runs under gunicorn anyway
```

```go vulnerable
type appHandler func(http.ResponseWriter, *http.Request) error

func (h appHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if v := recover(); v != nil {
			http.Error(w, fmt.Sprintf("panic: %v\n%s", v, debug.Stack()), http.StatusInternalServerError) // BUG: stack trace with file paths and module versions
		}
	}()
	if err := h(w, r); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError) // BUG: driver errors name tables, columns, and constraints
	}
}
```

```go fixed
type appHandler func(http.ResponseWriter, *http.Request) error

func (h appHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if v := recover(); v != nil {
			fail(w, r, fmt.Errorf("panic: %v\n%s", v, debug.Stack()))
		}
	}()
	if err := h(w, r); err != nil {
		fail(w, r, err)
	}
}

func fail(w http.ResponseWriter, r *http.Request, err error) {
	reqID := uuid.NewString()
	slog.ErrorContext(r.Context(), "request failed", "request_id", reqID, "path", r.URL.Path, "err", err) // FIX: the detail stays in the log
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(map[string]string{"error": "something went wrong", "request_id": reqID}) // FIX: generic text plus an ID to quote
}
```

```javascript vulnerable
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message, // BUG: Sequelize messages quote SQL, tables, and constraint names
    stack: err.stack, // BUG: file paths and package versions
  });
});
```

```javascript fixed
app.use((err, req, res, next) => {
  const requestId = crypto.randomUUID();
  logger.error({ err, requestId, path: req.path }, "request failed"); // FIX: full detail stays server-side
  if (res.headersSent) return next(err);
  const status = err.expose ? err.status : 500; // http-errors sets expose only on 4xx errors meant for the client
  res.status(status).json({ error: err.expose ? err.message : "Something went wrong.", requestId }); // FIX: generic text plus an ID
});
```

### Logging practices

Good logs answer who did what, when, from where, and whether it worked. They go wrong in two directions: too much, so passwords and card numbers end up in a system with wider access and longer retention than the database, and too little, so a denied request leaves nothing to investigate.

> **Where to look:** request-logging middleware, audit helpers, debug lines that dump whole objects, and the failure branch of every authorization check. Grep for `request.get_json()`, `request.headers`, or `request.form` inside log calls (Python), `httputil.DumpRequest`, `r.Header` in `slog` calls (Go), and `req.body`, `req.headers` in `logger` or `console.log` calls (Node).
>
> **How to think:** For each log call, would you be fine with everyone who can read the logs seeing that field? Passwords, session tokens, API keys and secrets, `Authorization` headers, full card numbers, CVVs, Social Security numbers, and other PII don't belong there; PCI DSS forbids storing a CVV after authorization at all. An allowlist of loggable fields beats a redaction blocklist, since the blocklist misses the `ssn` field someone adds next quarter. Then flip it around. If this account was taken over yesterday, could you rebuild the story from logs alone? That takes logins and failed logins, authorization denials, password and MFA changes, admin actions, data exports, and unexpected errors, each with user ID, action, outcome, source IP, request ID, and a UTC timestamp from a synced clock.

```python vulnerable
@app.post("/payments")
def pay():
    data = request.get_json()
    logger.info(f"payment {data} headers={dict(request.headers)}")  # BUG: card number, CVV, and the bearer token in plain text
    order = Order.query.get_or_404(data["order_id"])
    if order.user_id != current_user.id:
        abort(403)  # BUG: a probe at someone else's order leaves no trace
    charge(order, data["card"])
    return {"status": "ok"}
```

```python fixed
LOGGABLE = {"order_id", "amount", "currency"}  # FIX: allowlist; card data and headers never qualify


def security_event(action, outcome, **fields):
    audit.info(action, extra={"user_id": current_user.id, "action": action, "outcome": outcome,
                              "ip": request.remote_addr, "request_id": g.request_id, **fields})


@app.post("/payments")
def pay():
    data = request.get_json()
    summary = {k: data[k] for k in LOGGABLE if k in data}
    order = Order.query.get_or_404(data["order_id"])
    if order.user_id != current_user.id:
        security_event("payment", "denied", **summary)  # FIX: authorization failures leave a record
        abort(403)
    charge(order, data["card"])
    security_event("payment", "ok", card_last4=data["card"]["number"][-4:], **summary)  # FIX: card shown as last 4 only
    return {"status": "ok"}
```

```go vulnerable
func pay(w http.ResponseWriter, r *http.Request) {
	dump, _ := httputil.DumpRequest(r, true)
	slog.Info("payment request", "raw", string(dump)) // BUG: card number, CVV, and Authorization header, verbatim
	var req PaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	order, err := loadOrder(r.Context(), req.OrderID)
	if err != nil || order.UserID != currentUser(r).ID {
		http.Error(w, "not found", http.StatusNotFound) // BUG: the probe leaves no record
		return
	}
	if err := charge(r.Context(), order, req.Card); err != nil {
		http.Error(w, "payment failed", http.StatusBadGateway)
		return
	}
}
```

```go fixed
func securityEvent(r *http.Request, action, outcome string, attrs ...any) {
	attrs = append(attrs, "user_id", currentUser(r).ID, "action", action, "outcome", outcome,
		"ip", clientIP(r), "request_id", requestID(r.Context()))
	audit.InfoContext(r.Context(), action, attrs...)
}

func pay(w http.ResponseWriter, r *http.Request) {
	var req PaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	order, err := loadOrder(r.Context(), req.OrderID)
	if err != nil || order.UserID != currentUser(r).ID {
		securityEvent(r, "payment", "denied", "order_id", req.OrderID) // FIX: the probe is on record
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err := charge(r.Context(), order, req.Card); err != nil {
		securityEvent(r, "payment", "failed", "order_id", order.ID)
		http.Error(w, "payment failed", http.StatusBadGateway)
		return
	}
	securityEvent(r, "payment", "ok", "order_id", order.ID, "card_last4", req.Card.Last4()) // FIX: named fields only, card as last 4
}
```

```javascript vulnerable
app.post("/payments", async (req, res) => {
  logger.info({ headers: req.headers, body: req.body }, "payment request"); // BUG: bearer token, card number, and CVV in the log
  const order = await Order.findByPk(req.body.orderId);
  if (!order || order.userId !== req.user.id) {
    return res.sendStatus(404); // BUG: the probe leaves no record
  }
  await charge(order, req.body.card);
  res.json({ status: "ok" });
});
```

```javascript fixed
const LOGGABLE = ["orderId", "amount", "currency"]; // FIX: allowlist; card fields and headers never qualify

function securityEvent(req, action, outcome, fields = {}) {
  audit.info({ userId: req.user.id, action, outcome, ip: req.ip, requestId: req.id, ...fields });
}

app.post("/payments", async (req, res) => {
  const summary = Object.fromEntries(LOGGABLE.filter((k) => k in req.body).map((k) => [k, req.body[k]]));
  const order = await Order.findByPk(req.body.orderId);
  if (!order || order.userId !== req.user.id) {
    securityEvent(req, "payment", "denied", summary); // FIX: authorization failures leave a record
    return res.sendStatus(404);
  }
  await charge(order, req.body.card);
  securityEvent(req, "payment", "ok", { ...summary, cardLast4: String(req.body.card.number).slice(-4) }); // FIX: last 4 only
  res.json({ status: "ok" });
});
```

### Log injection

Most log files are one entry per line. If a username goes into the line unescaped, a CR or LF in it ends the real entry and starts a fake one, so an attacker can forge "login ok for admin" or bury their tracks in noise. Log viewers that render HTML or terminal escape codes turn the same input into an attack on whoever reads the logs.

> **Where to look:** log calls whose message is built from request data with f-strings, `%`, `+`, or template literals. Grep for `logger.info(f"`, `logging.warning("%s" %` (Python), `log.Printf`, `fmt.Sprintf` inside log calls (Go), and `` console.log(` `` or `logger.info(` with `${req.` (Node).
>
> **How to think:** List the logged values that come from the client: usernames, paths, query strings, `User-Agent`, `Referer`, any header. Does the logger encode them, the way JSON escapes a newline as `\n`, or paste them raw into a line-oriented file? Structured logging fixes this at the source. Where a plain-text format is mandatory, escape CR, LF, and other control characters (Python `repr()`, Go `strconv.Quote`, Node `JSON.stringify`) rather than silently stripping them, so the evidence of the attempt survives. Then check where the logs get displayed; a dashboard that renders logged HTML is a stored XSS aimed at your admins.

```python vulnerable
logging.basicConfig(filename="app.log", format="%(asctime)s %(levelname)s %(message)s")


@app.post("/login")
def login():
    username = request.form["username"]
    if authenticate(username, request.form["password"]) is None:
        logger.warning(f"login failed for {username}")  # BUG: "bob\n<timestamp> INFO login ok for admin" forges a second line
        return "Invalid username or password", 401
    ...
```

```python fixed
structlog.configure(processors=[
    structlog.processors.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
    structlog.processors.JSONRenderer(),  # FIX: json.dumps escapes CR and LF inside values
])
log = structlog.get_logger()


@app.post("/login")
def login():
    username = request.form["username"]
    if authenticate(username, request.form["password"]) is None:
        log.warning("login_failed", username=username)  # FIX: the name is a field, never part of the line structure
        return "Invalid username or password", 401
    ...
```

```go vulnerable
func login(w http.ResponseWriter, r *http.Request) {
	username := r.PostFormValue("username")
	if _, ok := authenticate(username, r.PostFormValue("password")); !ok {
		log.Printf("login failed for %s", username) // BUG: the log package writes a \n in username as a real newline
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}
	// ...
}
```

```go fixed
var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil)) // FIX: every value is JSON-escaped

func login(w http.ResponseWriter, r *http.Request) {
	username := r.PostFormValue("username")
	if _, ok := authenticate(username, r.PostFormValue("password")); !ok {
		logger.Warn("login_failed", "username", username) // FIX: CR and LF stay escaped inside one record
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}
	// ...
}
```

```javascript vulnerable
app.post("/login", async (req, res) => {
  const { username = "", password = "" } = req.body;
  if (!(await authenticate(username, password))) {
    console.log(`${new Date().toISOString()} WARN login failed for ${username}`); // BUG: a CR or LF in username forges entries
    return res.status(401).send("Invalid username or password");
  }
  // ...
});
```

```javascript fixed
const pino = require("pino");
const logger = pino(); // FIX: one JSON object per line, CR and LF escaped

app.post("/login", async (req, res) => {
  const { username = "", password = "" } = req.body;
  if (!(await authenticate(username, password))) {
    logger.warn({ event: "login_failed", username }, "login failed"); // FIX: user data goes in a field
    return res.status(401).send("Invalid username or password");
  }
  // ...
});
```

### Logging configuration

The logging setup decides how much gets written, where it lands, and how long it stays. A hardcoded DEBUG level spills request bodies and SQL into production. A log file under the web root can be downloaded by URL, and one that never rotates fills the disk until the app falls over or quietly stops recording.

> **Where to look:** app startup and config modules, plus the deploy files that run the app (Dockerfile, Kubernetes manifests, systemd units, logrotate config). Grep for `basicConfig`, `dictConfig`, `LOGGING =` (Python), `slog.New`, `HandlerOptions`, `os.OpenFile` near "log" (Go), and `pino(`, `winston.createLogger`, `level:` (Node).
>
> **How to think:** Can ops change the level, format, and destination without a code change, through an env var or a config file such as a `dictConfig` YAML? What's the default when the variable is missing? It should be INFO, not DEBUG. Where do files land, and who can read them? Anything under `static/` or `public/` is one guessable URL away. Is there rotation, and is retention written down with an owner? PCI DSS asks for a year of audit logs with the last three months on hand; privacy law pushes the other way for PII. In containers, write to stdout and let the platform rotate, ship, and expire logs, which also gets them off the host before an attacker with a shell can edit them.

```python vulnerable
import logging

logging.basicConfig(
    level=logging.DEBUG,  # BUG: hardcoded, so production logs SQL, bodies, and tokens
    filename="static/logs/app.log",  # BUG: under the web root, one file that never rotates
    format="%(asctime)s %(levelname)s %(message)s",
)
```

```python fixed
import logging
import os
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler("/var/log/shop/app.log", maxBytes=50_000_000, backupCount=10)  # FIX: outside the web root, capped near 500 MB
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),  # FIX: set per environment, INFO by default
    handlers=[handler],
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
```

```go vulnerable
func setupLogging() {
	f, _ := os.OpenFile("./public/app.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644) // BUG: served by the static file handler, never rotated
	opts := &slog.HandlerOptions{Level: slog.LevelDebug}                                // BUG: debug in every environment
	slog.SetDefault(slog.New(slog.NewTextHandler(f, opts)))
}
```

```go fixed
func setupLogging() {
	var level slog.Level
	if err := level.UnmarshalText([]byte(os.Getenv("LOG_LEVEL"))); err != nil { // FIX: level set per environment
		level = slog.LevelInfo
	}
	// stdout: journald, Docker, or Kubernetes rotates it and ships it off the host
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))) // FIX: no file in the web root
}
```

```javascript vulnerable
const pino = require("pino");

const logger = pino(
  { level: "debug" }, // BUG: hardcoded debug in production
  pino.destination("./public/logs/app.log"), // BUG: express.static serves it, and nothing rotates it
);
app.use(express.static("public"));
```

```javascript fixed
const pino = require("pino");

const logger = pino({ // FIX: no destination means stdout; the platform rotates, ships, and expires it
  level: process.env.LOG_LEVEL ?? "info", // FIX: set per environment, info by default
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
app.use(express.static("public"));
```

---
