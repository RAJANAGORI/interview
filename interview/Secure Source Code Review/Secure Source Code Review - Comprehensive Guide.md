# Secure Source Code Review - Comprehensive Guide

## At a glance

Secure code review means reading source with an attacker's eye so vulnerabilities and design flaws get caught before release. In practice you combine three things: tooling (SAST, dependency scanners), a working catalogue of bug classes, and manual tracing of trust boundaries and business logic that no scanner understands. Staff-level interviews push on methodology, signal versus noise, and how you partner with the engineers who own the code.

This guide is that catalogue. Every review point comes with vulnerable and fixed code in Python, Go, and Node.js, because "check for IDOR" means very little until you've seen what the bug looks like inside a real handler.

---

## Learning outcomes

- Structure a review: scope, threat model, hotspots, verification.
- Spot each bug class in Python, Go, and Node.js code, and know the idiomatic fix in each.
- Know where in a codebase to look first and which grep strings get you there fast.
- Prioritize high-impact classes for the stack (injection, authorization, deserialization, concurrency) and explain the fix to the team that owns it.

---

## Prerequisites

Comfort with the OWASP Top 10 categories, and enough Python, Go, or JavaScript to read a request handler.

---

## How to read the code labs

Every review point below has the same four parts:

1. A short explanation of what the point means and how it breaks.
2. **Where to look:** the files, handlers, and grep strings that lead you to the bug.
3. **How to think:** the questions a reviewer asks once they're staring at that code.
4. A code lab with Python, Go, and Node.js tabs. Each tab puts the vulnerable version next to the fixed one.

Inside the snippets, `BUG:` comments sit on the exact line that makes the code exploitable, and `FIX:` comments sit on the line that closes the hole. Read the BUG line first, then go find its FIX. Your language choice carries across every lab on the page, so if you're interviewing at a Go shop, click Go once and stay there.

The snippets are trimmed handlers rather than full programs. Unless a point says otherwise, Python uses Flask, Go uses the standard library (`net/http` with Go 1.22 routing, `database/sql` with Postgres placeholders), and Node uses Express. Names like `db`, `audit`, `logger`, `render`, and `current_user` stand in for whatever the real app wires up.

---

## Six habits behind most findings

Nearly every finding in a review traces back to one of these. The sections that follow show each habit in code.

1. **Validate input against an allow list.** Check type, format, length, and range against what you expect. A list of known-bad characters always misses one.
2. **Keep data out of the command channel.** Hand input to SQL, shells, LDAP, and template engines as bound parameters or argument arrays, never as spliced strings.
3. **Bound every read and allocation.** Size limits on bodies, frames, and buffers, and no user input in format strings.
4. **Protect data with vetted crypto.** Slow salted hashes for passwords, authenticated encryption for data at rest, verified TLS in transit, and keys that live in a KMS.
5. **Encode output for its context.** HTML text, attributes, URLs, JavaScript, and CSS each need their own encoder. Let the framework do it whenever it can.
6. **Prefer indirect references.** Map user-supplied IDs to server-side objects so file paths, redirect targets, and records come from a set you control.

---

## Code Review Methodology

A review that starts by grepping for `eval` finds `eval` bugs. One that starts with the architecture finds the authorization bug that costs the company money. I work in four passes:

1. **Preparation.** Learn the architecture and stack, read whatever design docs and security requirements exist, find the critical data flows, and set up the tools (SAST, a local build, a debugger if you can get one).
2. **Discovery.** Map the authentication and authorization flows, list every input entry point, trace data from input to output, and mark where sensitive operations and data live.
3. **Analysis.** Walk each security-relevant component against the points in this guide, test the controls you find, and spend real time on business logic, since that's where tools are blind.
4. **Documentation.** Write findings with file and line references, a proof of concept where you can, a severity, and a fix the owning team can actually ship.

---

## Authentication Review

Authentication code clusters in a few places: login, registration, password reset, MFA, session middleware, and whatever the backend uses to authenticate other services. Find those files before reading anything else. In Flask that's usually an `auth.py` blueprint and the `@login_required` decorator; in Go it's the middleware wrapping your `http.Handler`; in Express it's the `passport` setup or hand-written `req.session` code.

### User login flow

Login is where the password, the user lookup, the audit trail, and session creation all meet. A bug at any one of those steps undoes the others.

> **Where to look:** the login route and everything it calls, from the user lookup through the password check to the line that creates the session. Grep for `/login`, `authenticate`, `check_password` (Python), `CompareHashAndPassword` (Go), and `bcrypt.compare` or `passport.authenticate` (Node).
>
> **How to think:** Follow the password from the request to the comparison. Does it ever sit in a URL, a log line, or a plaintext column? What happens on failure, and is there a record someone could alert on? Is the session created only after every check has passed, including the second factor?

```python vulnerable
@app.get("/login")  # BUG: GET puts the password in the URL, proxy logs, and browser history
def login():
    user = User.query.filter_by(username=request.args["username"]).first()
    if user and user.password == request.args["password"]:  # BUG: plaintext password stored and compared
        session["user_id"] = user.id
        return redirect("/")
    return "Login failed", 401  # BUG: a failure leaves no audit record
```

```python fixed
@app.post("/login")  # FIX: credentials travel only in the POST body
def login():
    username = request.form.get("username", "")
    user = authenticate(username, request.form.get("password", ""))  # hashed, constant-work check (see User enumeration)
    if user is None:
        audit.warning("login_failed", extra={"username": username, "ip": request.remote_addr})  # FIX: log the failure, never the password
        return "Invalid username or password", 401
    session.clear()
    session["user_id"] = user.id
    audit.info("login_ok", extra={"user_id": user.id})
    return redirect("/")
```

```go vulnerable
mux.HandleFunc("GET /login", func(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query() // BUG: credentials arrive in the query string
	var stored string
	err := db.QueryRow("SELECT password FROM users WHERE username = $1", q.Get("username")).Scan(&stored)
	if err != nil || stored != q.Get("password") { // BUG: plaintext compare
		http.Error(w, "login failed", http.StatusUnauthorized) // BUG: no record of the failure
		return
	}
	startSession(w, r, q.Get("username"))
	http.Redirect(w, r, "/", http.StatusSeeOther)
})
```

```go fixed
mux.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) { // FIX: POST body only
	username := r.PostFormValue("username")
	user, ok := authenticate(username, r.PostFormValue("password")) // bcrypt, constant work (see User enumeration)
	if !ok {
		slog.Warn("login_failed", "username", username, "ip", clientIP(r)) // FIX: audit the failure, not the password
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}
	startSession(w, r, user.ID)
	slog.Info("login_ok", "user_id", user.ID)
	http.Redirect(w, r, "/", http.StatusSeeOther)
})
```

```javascript vulnerable
app.get("/login", async (req, res) => { // BUG: credentials in the query string end up in access logs
  const { username, password } = req.query;
  const user = await User.findOne({ where: { username } });
  if (!user || user.password !== password) { // BUG: plaintext compare
    return res.status(401).send("Login failed"); // BUG: no audit record
  }
  req.session.userId = user.id;
  res.redirect("/");
});
```

```javascript fixed
app.post("/login", express.urlencoded({ extended: false }), async (req, res) => { // FIX: POST body only
  const { username = "", password = "" } = req.body;
  const user = await authenticate(username, password); // hashed, constant work (see User enumeration)
  if (!user) {
    logger.warn({ event: "login_failed", username, ip: req.ip }); // FIX: audit without the password
    return res.status(401).send("Invalid username or password");
  }
  req.session.regenerate((err) => {
    if (err) return res.sendStatus(500);
    req.session.userId = user.id;
    logger.info({ event: "login_ok", userId: user.id });
    res.redirect("/");
  });
});
```

### User registration flow

Registration decides who gets an account and which email address it's tied to. The usual bugs are uniqueness checks the database doesn't enforce, accounts that work before anyone proves they own the address, and responses that reveal who already has an account.

> **Where to look:** the signup handler, the `User` model or migration that defines unique constraints, and the email verification flow. Grep for `register`, `signup`, `unique=True` (Python), `UNIQUE` in migrations (Go), and `allowNull` or `unique:` in Sequelize models (Node).
>
> **How to think:** Is uniqueness enforced by a database index, or by a `SELECT` that races a parallel signup? Do `Alice@x.com` and `alice@x.com` become two accounts? Can someone register an address they don't own and squat on it before the real owner shows up (account pre-hijacking)? Does the response differ for new and existing emails? Is there rate limiting or bot protection on this endpoint?

```python vulnerable
@app.post("/register")
def register():
    email = request.form["email"]
    if User.query.filter_by(email=email).first():  # BUG: case-sensitive and racy against a parallel signup
        return "That email is already registered", 400  # BUG: tells anyone which emails have accounts
    user = User(email=email, password_hash=ph.hash(request.form["password"]), active=True)  # BUG: live before the email is proven
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return redirect("/")
```

```python fixed
@app.post("/register")
def register():
    email = request.form["email"].strip().lower()  # FIX: one canonical form per address
    if error := validate_password(request.form["password"], email):
        return error, 400
    user = User(email=email, password_hash=ph.hash(request.form["password"]), active=False)  # FIX: inactive until verified
    db.session.add(user)
    try:
        db.session.commit()  # FIX: the unique index decides, not a pre-check
        send_verification_email(user)
    except IntegrityError:
        db.session.rollback()
        send_already_registered_notice(email)
    return "Check your inbox to finish signing up.", 202  # FIX: same answer either way
```

```go vulnerable
func register(w http.ResponseWriter, r *http.Request) {
	email := r.PostFormValue("email")
	var exists bool
	db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists) // BUG: case-sensitive and racy
	if exists {
		http.Error(w, "email already registered", http.StatusConflict) // BUG: account enumeration
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(r.PostFormValue("password")), 12)
	db.Exec("INSERT INTO users (email, password_hash, active) VALUES ($1, $2, true)", email, hash) // BUG: live with no proof of ownership
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```go fixed
func register(w http.ResponseWriter, r *http.Request) {
	email := strings.ToLower(strings.TrimSpace(r.PostFormValue("email"))) // FIX: canonical form
	password := r.PostFormValue("password")
	if msg := validatePassword(password, email); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		http.Error(w, "invalid password", http.StatusBadRequest)
		return
	}
	_, err = db.Exec("INSERT INTO users (email, password_hash, active) VALUES ($1, $2, false)", email, hash) // FIX: inactive until verified
	var pgErr *pgconn.PgError
	switch {
	case errors.As(err, &pgErr) && pgErr.Code == "23505": // FIX: the unique index decides
		sendAlreadyRegisteredNotice(email)
	case err != nil:
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	default:
		sendVerificationEmail(email)
	}
	w.WriteHeader(http.StatusAccepted)
	fmt.Fprintln(w, "Check your inbox to finish signing up.") // FIX: same response either way
}
```

```javascript vulnerable
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (await User.findOne({ where: { email } })) { // BUG: case-sensitive and racy
    return res.status(409).send("Email already registered"); // BUG: enumeration
  }
  const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12), active: true }); // BUG: no ownership proof
  req.session.userId = user.id;
  res.redirect("/");
});
```

```javascript fixed
app.post("/register", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase(); // FIX: canonical form
  const password = String(req.body.password ?? "");
  const problem = validatePassword(password, email);
  if (problem) return res.status(400).send(problem);
  try {
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12), active: false }); // FIX: inactive until verified
    await sendVerificationEmail(user);
  } catch (err) {
    if (!(err instanceof UniqueConstraintError)) throw err; // FIX: the unique index decides
    await sendAlreadyRegisteredNotice(email);
  }
  res.status(202).send("Check your inbox to finish signing up."); // FIX: same answer either way
});
```

### Forgot password flow

A reset token is a temporary password that arrives by email. It needs the same care as a real one: unpredictable, short-lived, single-use, and stored so that a database leak doesn't hand out live tokens.

> **Where to look:** the forgot and reset handlers, the token generator, and the code that builds the emailed link. Grep for `reset`, `forgot`, `token`, `random`, `request.host` (Python), `math/rand` and `r.Host` (Go), and `Math.random` and `req.headers.host` (Node).
>
> **How to think:** Where do the token's bits come from, and how many are there? Is it stored raw or hashed? When does it expire, and does using it once kill it? Who controls the hostname in the emailed link? Does a successful reset end the sessions an attacker might already hold? And does the forgot endpoint answer the same way for real and unknown addresses?

```python vulnerable
@app.post("/forgot")
def forgot():
    user = User.query.filter_by(email=request.form["email"]).first()
    if not user:
        return "No account with that email", 404  # BUG: enumeration
    token = hashlib.md5(f"{user.email}{int(time.time())}".encode()).hexdigest()  # BUG: guessable from email and clock
    user.reset_token = token  # BUG: stored as-is and never expires
    db.session.commit()
    send_email(user.email, f"https://{request.host}/reset?token={token}")  # BUG: the Host header picks where the link points
    return "Sent"


@app.post("/reset")
def reset():
    user = User.query.filter_by(reset_token=request.form["token"]).first_or_404()
    user.password_hash = ph.hash(request.form["password"])  # BUG: token stays valid for reuse
    db.session.commit()
    return "Password changed"
```

```python fixed
@app.post("/forgot")
def forgot():
    user = User.query.filter_by(email=request.form["email"].strip().lower()).first()
    if user:
        raw = secrets.token_urlsafe(32)  # FIX: 256 bits from the OS CSPRNG
        user.reset_hash = hashlib.sha256(raw.encode()).hexdigest()  # FIX: a DB leak doesn't leak live tokens
        user.reset_expires = datetime.now(UTC) + timedelta(hours=1)
        db.session.commit()
        send_email(user.email, f"{settings.PUBLIC_URL}/reset?token={raw}")  # FIX: base URL from config
    return "If that address has an account, a reset link is on its way."


@app.post("/reset")
def reset():
    digest = hashlib.sha256(request.form["token"].encode()).hexdigest()
    user = User.query.filter_by(reset_hash=digest).first()
    if not user or user.reset_expires < datetime.now(UTC):
        return "This link is invalid or expired", 400
    if error := validate_password(request.form["password"], user.email):
        return error, 400
    user.password_hash = ph.hash(request.form["password"])
    user.reset_hash = None  # FIX: single use
    user.session_version += 1  # FIX: ends any session the attacker already had
    db.session.commit()
    return "Password changed"
```

```go vulnerable
func forgot(w http.ResponseWriter, r *http.Request) {
	email := r.PostFormValue("email")
	code := fmt.Sprintf("%06d", rand.Intn(1_000_000)) // BUG: math/rand, and only a million possible codes
	db.Exec("UPDATE users SET reset_code = $1 WHERE email = $2", code, email) // BUG: plaintext, no expiry
	sendEmail(email, "Your reset code is "+code)
	fmt.Fprintln(w, "sent")
}

func reset(w http.ResponseWriter, r *http.Request) {
	res, _ := db.Exec("UPDATE users SET password_hash = $1 WHERE email = $2 AND reset_code = $3",
		hashPassword(r.PostFormValue("password")), r.PostFormValue("email"), r.PostFormValue("code")) // BUG: unlimited guesses, code never cleared
	if n, _ := res.RowsAffected(); n == 0 {
		http.Error(w, "wrong code", http.StatusBadRequest)
	}
}
```

```go fixed
func forgot(w http.ResponseWriter, r *http.Request) {
	email := strings.ToLower(strings.TrimSpace(r.PostFormValue("email")))
	buf := make([]byte, 32)
	rand.Read(buf) // FIX: crypto/rand, 256 bits
	token := base64.RawURLEncoding.EncodeToString(buf)
	sum := sha256.Sum256([]byte(token))
	res, err := db.Exec(`UPDATE users SET reset_hash = $1, reset_expires = now() + interval '1 hour'
		WHERE email = $2`, sum[:], email) // FIX: store a hash, with an expiry
	if err == nil {
		if n, _ := res.RowsAffected(); n == 1 {
			sendEmail(email, cfg.PublicURL+"/reset?token="+token)
		}
	}
	fmt.Fprintln(w, "If that address has an account, a reset link is on its way.")
}

func reset(w http.ResponseWriter, r *http.Request) {
	sum := sha256.Sum256([]byte(r.PostFormValue("token")))
	res, err := db.Exec(`UPDATE users SET password_hash = $1, reset_hash = NULL,
		session_version = session_version + 1
		WHERE reset_hash = $2 AND reset_expires > now()`, // FIX: single use, expiring, ends old sessions
		hashPassword(r.PostFormValue("password")), sum[:])
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n != 1 {
		http.Error(w, "this link is invalid or expired", http.StatusBadRequest)
	}
}
```

```javascript vulnerable
app.post("/forgot", async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) return res.status(404).send("No such user"); // BUG: enumeration
  user.resetToken = Math.random().toString(36).slice(2); // BUG: Math.random is predictable
  await user.save(); // BUG: plaintext token, no expiry
  await mail(user.email, `https://${req.headers.host}/reset?token=${user.resetToken}`); // BUG: attacker-controlled Host
  res.send("Sent");
});

app.post("/reset", async (req, res) => {
  const user = await User.findOne({ where: { resetToken: req.body.token } }); // BUG: token never expires or clears
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  await user.save();
  res.send("Password changed");
});
```

```javascript fixed
const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

app.post("/forgot", async (req, res) => {
  const user = await User.findOne({ where: { email: String(req.body.email).trim().toLowerCase() } });
  if (user) {
    const token = crypto.randomBytes(32).toString("base64url"); // FIX: CSPRNG, 256 bits
    user.resetHash = sha256(token); // FIX: store only a hash
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await mail(user.email, `${config.publicUrl}/reset?token=${token}`); // FIX: base URL from config
  }
  res.send("If that address has an account, a reset link is on its way.");
});

app.post("/reset", async (req, res) => {
  const user = await User.findOne({
    where: { resetHash: sha256(req.body.token), resetExpires: { [Op.gt]: new Date() } },
  });
  if (!user) return res.status(400).send("This link is invalid or expired");
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.resetHash = null; // FIX: single use
  user.sessionVersion += 1; // FIX: ends sessions the attacker may hold
  await user.save();
  res.send("Password changed");
});
```

### User identification

How an app names its users shows up everywhere: URLs, API responses, logs, emails. Sequential IDs let anyone count and walk your user base, and emails used as identifiers leak into places they shouldn't.

> **Where to look:** primary keys on the user model, public profile and lookup endpoints, and any URL that carries an email address. Grep for `<int:user_id>` or `Integer, primary_key` (Python), `{id}` routes with `strconv.Atoi` (Go), and `/users/:id` or `?email=` (Node).
>
> **How to think:** If I increment the ID in this URL, what do I get? Does the response contain more than a stranger should see? Random identifiers slow enumeration down, but they don't replace an authorization check (see IDOR), so treat this as defense in depth and keep reading.

```python vulnerable
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # BUG: the sequential id doubles as the public handle


@app.get("/api/users/<int:user_id>")
def public_profile(user_id):  # /api/users/1, /2, /3 ... walks every account
    user = User.query.get_or_404(user_id)
    return {"id": user.id, "name": user.name, "email": user.email}  # BUG: email handed to anyone who asks
```

```python fixed
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # internal joins only
    public_id = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))  # FIX: random, unguessable handle


@app.get("/api/users/<public_id>")
def public_profile(public_id):
    user = User.query.filter_by(public_id=public_id).first_or_404()
    return {"id": user.public_id, "name": user.name}  # FIX: only what a stranger may see
```

```go vulnerable
mux.HandleFunc("GET /api/users/{id}", func(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id")) // BUG: sequential and trivially enumerable
	var u User
	db.QueryRow("SELECT id, name, email FROM users WHERE id = $1", id).Scan(&u.ID, &u.Name, &u.Email)
	json.NewEncoder(w).Encode(u) // BUG: email leaks with the profile
})
```

```go fixed
type PublicProfile struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

mux.HandleFunc("GET /api/users/{publicID}", func(w http.ResponseWriter, r *http.Request) {
	pid, err := uuid.Parse(r.PathValue("publicID")) // FIX: random UUIDv4 handle, set at creation
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var p PublicProfile
	if err := db.QueryRow("SELECT public_id, name FROM users WHERE public_id = $1", pid).Scan(&p.ID, &p.Name); err != nil {
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(p) // FIX: a separate type holds only public fields
})
```

```javascript vulnerable
app.get("/api/users/:id", async (req, res) => {
  const user = await User.findByPk(req.params.id); // BUG: auto-increment ids, easy to walk
  res.json(user); // BUG: serializes every column, email and hash included
});
```

```javascript fixed
// migration: publicId UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
app.get("/api/users/:publicId", async (req, res) => {
  const user = await User.findOne({
    where: { publicId: req.params.publicId }, // FIX: random handle
    attributes: ["publicId", "name"], // FIX: explicit public fields only
  });
  if (!user) return res.sendStatus(404);
  res.json({ id: user.publicId, name: user.name });
});
```

### Password policies

A good policy pushes users toward long, unguessable passwords and blocks the ones attackers try first. Composition rules ("one capital, one digit") mostly produce `Password1!`, and short maximum lengths block the passphrases you actually want.

> **Where to look:** the validator that runs on signup, password change, and reset, plus any client-side rules that the server never re-checks. Grep for `validate_password`, `len(password)` (Python), `MatchString` near "password" (Go), and `minLength`, `.length <` (Node).
>
> **How to think:** Is the minimum at least 12 characters (or 8 with a breached-password check, per NIST SP 800-63B)? Is the maximum generous, and does it respect the hash's limits, such as bcrypt's 72 bytes? Are common and breached passwords rejected? Does every path that sets a password run the same check, server-side?

```python vulnerable
def validate_password(pw):
    if len(pw) < 8 or len(pw) > 16:  # BUG: a 16-character cap rules out passphrases
        return False
    return bool(re.search(r"[A-Z]", pw) and re.search(r"\d", pw))  # BUG: "Password1" passes
```

```python fixed
MIN_LEN, MAX_LEN = 12, 256


def validate_password(pw: str, email: str) -> str | None:
    if not MIN_LEN <= len(pw) <= MAX_LEN:  # FIX: long passphrases welcome; the cap only stops hash DoS
        return "Use 12 to 256 characters."
    lowered = pw.lower()
    if lowered in COMMON_PASSWORDS or email.split("@")[0].lower() in lowered:
        return "Pick something less guessable."
    if pwned_count(pw) > 0:  # FIX: k-anonymity range query against Have I Been Pwned
        return "That password appears in a known breach."
    return None
```

```go vulnerable
var passwordRule = regexp.MustCompile(`^[A-Za-z0-9]{8,16}$`) // BUG: caps length at 16 and bans symbols

func validatePassword(pw string) bool {
	return passwordRule.MatchString(pw) // BUG: "Password1" passes, and nothing checks breach lists
}
```

```go fixed
const (
	minLen = 12
	maxLen = 72 // bcrypt only reads the first 72 bytes
)

func validatePassword(pw, email string) string {
	if utf8.RuneCountInString(pw) < minLen || len(pw) > maxLen { // FIX: length over composition
		return "use 12 or more characters (72 bytes max)"
	}
	lower := strings.ToLower(pw)
	if commonPasswords[lower] || strings.Contains(lower, localPart(email)) {
		return "pick something less guessable"
	}
	if breached, err := pwnedCheck(pw); err == nil && breached { // FIX: k-anonymity lookup against known leaks
		return "that password appears in a known breach"
	}
	return ""
}
```

```javascript vulnerable
function validatePassword(pw) {
  return pw.length >= 6 && /[A-Z]/.test(pw) && /[0-9]/.test(pw); // BUG: 6 chars, and "Summer2024" passes
}
```

```javascript fixed
function validatePassword(pw, email) {
  if (pw.length < 12) return "Use 12 or more characters";
  if (Buffer.byteLength(pw) > 72) return "Use 72 bytes or fewer"; // FIX: node bcrypt silently truncates past 72 bytes
  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || lower.includes(email.split("@")[0].toLowerCase())) {
    return "Pick something less guessable"; // FIX: block the passwords attackers try first
  }
  return null;
}
```

### Password hashing

Stored passwords need a slow, salted function built for the job, so a leaked table can't be cracked at GPU speed. Fast hashes like MD5, SHA-1, and plain SHA-256 fail that test even with a salt.

> **Where to look:** signup, password change, reset, and the login verifier. Grep for `hashlib.md5`, `sha1`, `sha256` near "password" (Python), `md5.Sum`, `sha256.Sum256` (Go), and `createHash(` (Node). Also check the column type: a 32- or 40-character hex column is usually MD5 or SHA-1.
>
> **How to think:** Three questions. Is the function slow on purpose (Argon2id, bcrypt, scrypt, or PBKDF2 with 600,000+ iterations)? Is the salt unique per hash and generated by the library? Is the work factor stored alongside the hash so it can be raised later? Then check the migration path: legacy MD5 rows should be wrapped or rehashed at next login, not left in place.

```python vulnerable
SALT = b"s3cr3t-salt"  # BUG: one salt shared by every user


def hash_password(pw: str) -> str:
    return hashlib.sha256(SALT + pw.encode()).hexdigest()  # BUG: fast hash, billions of guesses per second on a GPU


def verify_password(stored: str, pw: str) -> bool:
    return hash_password(pw) == stored
```

```python fixed
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()  # FIX: Argon2id; a random salt and the parameters live inside each hash


def hash_password(pw: str) -> str:
    return ph.hash(pw)


def verify_password(stored: str, pw: str) -> bool:
    try:
        return ph.verify(stored, pw)
    except VerifyMismatchError:
        return False
```

```go vulnerable
func hashPassword(pw string) string {
	sum := md5.Sum([]byte(pw)) // BUG: unsalted MD5, reversed by lookup tables
	return hex.EncodeToString(sum[:])
}
```

```go fixed
const bcryptCost = 12 // FIX: tune so one hash takes about 250ms on production hardware

func hashPassword(pw string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(pw), bcryptCost) // FIX: fresh salt on every call
}

func checkPassword(hash []byte, pw string) bool {
	return bcrypt.CompareHashAndPassword(hash, []byte(pw)) == nil
}
```

```javascript vulnerable
function hashPassword(pw) {
  return crypto.createHash("sha1").update(pw).digest("hex"); // BUG: fast and unsalted
}
```

```javascript fixed
const argon2 = require("argon2");

async function hashPassword(pw) {
  return argon2.hash(pw, { type: argon2.argon2id }); // FIX: memory-hard, salted per hash
}

async function verifyPassword(stored, pw) {
  return argon2.verify(stored, pw);
}
```

### Timing attacks

A normal string comparison stops at the first byte that differs, so it takes slightly longer the more of a secret the attacker has guessed right. Measure that over enough requests and you can recover an API key or signature one byte at a time.

> **Where to look:** every comparison that involves a secret: API keys, HMAC and webhook signatures, reset tokens, CSRF tokens, TOTP codes. Grep for `==` or `!=` next to `key`, `token`, `signature`, or `hmac` in all three languages.
>
> **How to think:** Is this value secret, and is the comparison constant-time? Network jitter makes remote timing attacks hard, but not impossible, and the fix costs nothing. Also look for early returns that skip expensive work, which leak through timing in the same way (see User enumeration).

```python vulnerable
@app.before_request
def check_api_key():
    if request.headers.get("X-API-Key") != settings.API_KEY:  # BUG: != bails at the first differing byte
        abort(401)
```

```python fixed
@app.before_request
def check_api_key():
    supplied = request.headers.get("X-API-Key", "")
    if not hmac.compare_digest(supplied.encode(), settings.API_KEY.encode()):  # FIX: runtime ignores where bytes differ
        abort(401)
```

```go vulnerable
func requireAPIKey(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-API-Key") != apiKey { // BUG: string compare exits early
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```go fixed
func requireAPIKey(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		supplied := []byte(r.Header.Get("X-API-Key"))
		if subtle.ConstantTimeCompare(supplied, []byte(apiKey)) != 1 { // FIX: constant-time compare
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```javascript vulnerable
function requireApiKey(req, res, next) {
  if (req.get("x-api-key") !== process.env.API_KEY) { // BUG: !== exits early
    return res.sendStatus(401);
  }
  next();
}
```

```javascript fixed
const expected = crypto.createHash("sha256").update(process.env.API_KEY).digest();

function requireApiKey(req, res, next) {
  // timingSafeEqual throws on unequal lengths, so compare fixed-size digests
  const supplied = crypto.createHash("sha256").update(req.get("x-api-key") ?? "").digest();
  if (!crypto.timingSafeEqual(supplied, expected)) { // FIX: constant-time compare
    return res.sendStatus(401);
  }
  next();
}
```

### Two-factor authentication (2FA)

The second factor only helps if the app refuses to treat the user as logged in until it's verified. The classic bug sets the full session after the password step and treats the 2FA page as a redirect the attacker can simply skip.

> **Where to look:** the login handler, the 2FA verify handler, and the middleware that decides whether a request is authenticated. Grep for `totp`, `otp`, `2fa`, `mfa`, `pyotp` (Python), `pquerna/otp` (Go), and `otplib` or `speakeasy` (Node).
>
> **How to think:** After the password step, what can this session already reach? Try browsing straight to `/dashboard`. How many guesses does someone get at a 6-digit code? Can a code be replayed inside its 30-second window? How are backup codes generated and stored, and does turning 2FA off require 2FA?

```python vulnerable
@app.post("/login")
def login():
    user = authenticate(request.form["username"], request.form["password"])
    if user is None:
        return "Invalid username or password", 401
    session["user_id"] = user.id  # BUG: fully logged in before the second factor
    if user.totp_secret:
        return redirect("/2fa")  # the 2FA page is a detour; /dashboard already works
    return redirect("/dashboard")


@app.post("/2fa")
def verify_2fa():
    user = db.session.get(User, session["user_id"])
    if pyotp.TOTP(user.totp_secret).verify(request.form["code"]):  # BUG: unlimited guesses at a 6-digit code
        return redirect("/dashboard")
    return "Wrong code", 401
```

```python fixed
@app.post("/login")
def login():
    user = authenticate(request.form["username"], request.form["password"])
    if user is None:
        return "Invalid username or password", 401
    session.clear()
    if user.totp_secret:
        session["mfa_pending"] = user.id  # FIX: half-authenticated state that @login_required rejects
        return redirect("/2fa")
    session["user_id"] = user.id
    return redirect("/dashboard")


@app.post("/2fa")
@limiter.limit("5 per 5 minutes")  # FIX: caps guessing
def verify_2fa():
    pending = session.get("mfa_pending")
    if pending is None:
        abort(401)
    user = db.session.get(User, pending)
    code = request.form["code"]
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1) or code_used_recently(user, code):  # FIX: rejects replays
        return "Wrong code", 401
    session.clear()
    session["user_id"] = user.id  # FIX: promoted only after the second factor
    return redirect("/dashboard")
```

```go vulnerable
func login(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticate(r.PostFormValue("username"), r.PostFormValue("password"))
	if !ok {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}
	sessions.Put(r.Context(), "userID", user.ID) // BUG: full session before the second factor
	if user.TOTPSecret != "" {
		http.Redirect(w, r, "/2fa", http.StatusSeeOther)
		return
	}
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}
```

```go fixed
func login(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticate(r.PostFormValue("username"), r.PostFormValue("password"))
	if !ok {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}
	sessions.RenewToken(r.Context())
	if user.TOTPSecret != "" {
		sessions.Put(r.Context(), "mfaPendingID", user.ID) // FIX: requireUser middleware ignores this key
		http.Redirect(w, r, "/2fa", http.StatusSeeOther)
		return
	}
	sessions.Put(r.Context(), "userID", user.ID)
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

func verify2FA(w http.ResponseWriter, r *http.Request) {
	id := sessions.GetInt64(r.Context(), "mfaPendingID")
	if id == 0 || !mfaLimiter(id).Allow() { // FIX: bounded attempts per account
		http.Error(w, "try again later", http.StatusTooManyRequests)
		return
	}
	code := r.PostFormValue("code")
	if !totp.Validate(code, loadUser(id).TOTPSecret) || codeUsedRecently(id, code) { // FIX: rejects replays
		http.Error(w, "wrong code", http.StatusUnauthorized)
		return
	}
	sessions.RenewToken(r.Context())
	sessions.Remove(r.Context(), "mfaPendingID")
	sessions.Put(r.Context(), "userID", id) // FIX: full session only after both factors
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}
```

```javascript vulnerable
app.post("/login", async (req, res) => {
  const user = await authenticate(req.body.username, req.body.password);
  if (!user) return res.status(401).send("Invalid username or password");
  req.session.userId = user.id; // BUG: full session before the second factor
  res.redirect(user.totpSecret ? "/2fa" : "/dashboard");
});

app.post("/2fa", async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  if (!authenticator.check(req.body.code, user.totpSecret)) { // BUG: no attempt limit
    return res.status(401).send("Wrong code");
  }
  res.redirect("/dashboard");
});
```

```javascript fixed
app.post("/login", async (req, res) => {
  const user = await authenticate(req.body.username, req.body.password);
  if (!user) return res.status(401).send("Invalid username or password");
  req.session.regenerate((err) => {
    if (err) return res.sendStatus(500);
    if (user.totpSecret) req.session.mfaPendingId = user.id; // FIX: requireUser ignores this key
    else req.session.userId = user.id;
    res.redirect(user.totpSecret ? "/2fa" : "/dashboard");
  });
});

app.post("/2fa", mfaLimiter, async (req, res) => { // FIX: rate-limited per account
  const id = req.session.mfaPendingId;
  if (!id) return res.sendStatus(401);
  const user = await User.findByPk(id);
  const code = String(req.body.code);
  if (!authenticator.check(code, user.totpSecret) || (await codeUsedRecently(id, code))) { // FIX: rejects replays
    return res.status(401).send("Wrong code");
  }
  req.session.regenerate((err) => {
    if (err) return res.sendStatus(500);
    req.session.userId = id; // FIX: promoted only after both factors
    res.redirect("/dashboard");
  });
});
```

### User enumeration

If login, signup, or reset answers differently for real and unknown accounts, an attacker can build a list of valid usernames and then spray passwords at just those. The difference can be in the message, the status code, or just how long the response takes.

> **Where to look:** every endpoint that takes a username or email from an anonymous caller: login, registration, forgot password, "check availability" APIs. Grep for strings like `not found`, `does not exist`, `already registered`, and early `return` statements before the password hash runs.
>
> **How to think:** Send a real and a fake username and diff everything: body, status, headers, and timing. If the fake one returns 200ms faster because no hash was computed, the message text doesn't matter. Sometimes the business wants "username taken" on signup; then rate-limit that endpoint and accept the trade-off in writing.

```python vulnerable
def authenticate(username, password):
    user = User.query.filter_by(username=username).first()
    if not user:
        raise AuthError("No account with that username")  # BUG: tells the caller the name is free, and returns fast
    if not verify_password(user.password_hash, password):
        raise AuthError("Wrong password")  # BUG: confirms the name exists
    return user
```

```python fixed
DUMMY_HASH = ph.hash("placeholder-password-for-timing")  # computed once at startup


def authenticate(username, password):
    user = User.query.filter_by(username=username).first()
    ok = verify_password(user.password_hash if user else DUMMY_HASH, password)  # FIX: same hashing cost either way
    if not user or not ok:
        raise AuthError("Invalid username or password")  # FIX: one message for every failure
    return user
```

```go vulnerable
func authenticate(username, password string) (*User, error) {
	u, err := findUser(username)
	if err != nil {
		return nil, errors.New("no such user") // BUG: distinct error, and no bcrypt work
	}
	if bcrypt.CompareHashAndPassword(u.Hash, []byte(password)) != nil {
		return nil, errors.New("wrong password") // BUG: confirms the account exists
	}
	return u, nil
}
```

```go fixed
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("placeholder-password-for-timing"), bcryptCost)

var errBadLogin = errors.New("invalid username or password")

func authenticate(username, password string) (*User, error) {
	u, err := findUser(username)
	hash := dummyHash
	if err == nil {
		hash = u.Hash
	}
	match := bcrypt.CompareHashAndPassword(hash, []byte(password)) == nil // FIX: bcrypt runs either way
	if err != nil || !match {
		return nil, errBadLogin // FIX: one error for every failure
	}
	return u, nil
}
```

```javascript vulnerable
async function authenticate(username, password) {
  const user = await User.findOne({ where: { username } });
  if (!user) throw new AuthError("Unknown user"); // BUG: distinct message, fast path
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new AuthError("Wrong password"); // BUG: confirms the account
  return user;
}
```

```javascript fixed
const DUMMY_HASH = bcrypt.hashSync("placeholder-password-for-timing", 12);

async function authenticate(username, password) {
  const user = await User.findOne({ where: { username } });
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH); // FIX: same cost either way
  if (!user || !ok) throw new AuthError("Invalid username or password"); // FIX: one message
  return user;
}
```

### Brute force protection

Rate limits and lockouts turn "guess forever" into "guess a handful of times." They're easy to add and just as easy to key on something the attacker controls, such as a spoofed `X-Forwarded-For` header.

> **Where to look:** the limiter config on login, 2FA, reset, and any token-checking endpoint, plus the proxy trust settings that decide what the client IP is. Grep for `Limiter`, `X-Forwarded-For`, `ProxyFix` (Python), `rate.NewLimiter`, `RemoteAddr` (Go), and `rateLimit`, `trust proxy` (Node).
>
> **How to think:** What is the limiter keyed on, and can the client change it? Is there a per-account limit as well as a per-IP one, so a botnet spraying from thousands of IPs still hits a wall? Can an attacker lock a real user out on purpose? Prefer backoff and CAPTCHA over permanent lockout.

```python vulnerable
limiter = Limiter(key_func=lambda: request.headers.get("X-Forwarded-For", request.remote_addr), app=app)  # BUG: the client picks its own key


@app.post("/login")
@limiter.limit("10 per minute")
def login():
    ...
```

```python fixed
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)  # FIX: trust exactly one proxy hop, so remote_addr is real
limiter = Limiter(key_func=get_remote_address, app=app)


@app.post("/login")
@limiter.limit("10 per minute")
def login():
    username = request.form.get("username", "").lower()
    key = f"login-fail:{username}"
    if int(redis.get(key) or 0) >= 5:  # FIX: a per-account cap catches IP-rotating attackers
        return "Too many attempts. Try again later.", 429
    user = authenticate(username, request.form.get("password", ""))
    if user is None:
        redis.incr(key)
        redis.expire(key, 900)
        return "Invalid username or password", 401
    redis.delete(key)
    ...
```

```go vulnerable
func loginLimiter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("X-Forwarded-For") // BUG: the attacker sends a new value per request
		if !limiterFor(key).Allow() {
			http.Error(w, "slow down", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```go fixed
func loginLimiter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r) // FIX: RemoteAddr, or the hop your own proxy appended
		user := strings.ToLower(r.PostFormValue("username"))
		if !limiterFor("ip:"+ip).Allow() || !limiterFor("user:"+user).Allow() { // FIX: caps per IP and per account
			http.Error(w, "too many attempts, try again later", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```javascript vulnerable
app.set("trust proxy", true); // BUG: trusts every X-Forwarded-For hop, so req.ip is whatever the client says

app.post("/login", rateLimit({ windowMs: 60_000, limit: 10 }), loginHandler);
```

```javascript fixed
app.set("trust proxy", 1); // FIX: trust only the one load balancer in front of the app

const perIp = rateLimit({ windowMs: 60_000, limit: 10 });
const perAccount = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  keyGenerator: (req) => `user:${String(req.body.username).toLowerCase()}`, // FIX: also cap guesses per account
  skipSuccessfulRequests: true,
});

app.post("/login", express.urlencoded({ extended: false }), perIp, perAccount, loginHandler);
```

### Session fixation

If the session ID a visitor had before login is still valid after login, an attacker who planted that ID (through a shared machine, a subdomain cookie, or a URL parameter) is now logged in as the victim. The fix is a new ID at every privilege change.

> **Where to look:** the exact line where login writes the user into the session, plus privilege changes like sudo mode or role switches. Grep for `session["user_id"] =` and `cycle_key` (Python/Django), `sessions.Put` without `RenewToken` (Go), and `req.session.userId =` without `regenerate` (Node).
>
> **How to think:** Note the session cookie before login, log in, and compare. Same value means fixation. Also check that session IDs are never accepted from the URL or a form field.

```python vulnerable
# Django
def login_view(request):
    user = authenticate(request, username=request.POST["username"], password=request.POST["password"])
    if user is None:
        return HttpResponse("Invalid username or password", status=401)
    request.session["user_id"] = user.pk  # BUG: keeps the session key the visitor arrived with
    return redirect("/dashboard")
```

```python fixed
# Django
from django.contrib.auth import login


def login_view(request):
    user = authenticate(request, username=request.POST["username"], password=request.POST["password"])
    if user is None:
        return HttpResponse("Invalid username or password", status=401)
    login(request, user)  # FIX: cycles the session key; custom code calls request.session.cycle_key()
    return redirect("/dashboard")
```

```go vulnerable
func startSession(w http.ResponseWriter, r *http.Request, userID int64) {
	sessions.Put(r.Context(), "userID", userID) // BUG: same token before and after login
}
```

```go fixed
func startSession(w http.ResponseWriter, r *http.Request, userID int64) error {
	if err := sessions.RenewToken(r.Context()); err != nil { // FIX: new token, old one discarded
		return err
	}
	sessions.Put(r.Context(), "userID", userID)
	return nil
}
```

```javascript vulnerable
function startSession(req, res, user) {
  req.session.userId = user.id; // BUG: reuses the pre-login session ID
  res.redirect("/dashboard");
}
```

```javascript fixed
function startSession(req, res, user) {
  req.session.regenerate((err) => { // FIX: new ID, old session dropped from the store
    if (err) return res.sendStatus(500);
    req.session.userId = user.id;
    res.redirect("/dashboard");
  });
}
```

### Session destruction

Logout has to kill the session on the server. Deleting the cookie in the browser only stops honest clients; anyone who copied the cookie or token can keep using it.

> **Where to look:** the logout handler and the session or token store behind it. Grep for `logout`, `session.clear` (Python), `MaxAge: -1` (Go), and `clearCookie` (Node). With JWTs, check whether anything server-side can reject a token before it expires.
>
> **How to think:** Copy the session cookie, log out, then replay the copy. Does it still work? With Flask's default signed-cookie sessions or stateless JWTs, the honest answer is usually yes, so look for a server-side store, a session version, or a revocation list. Password changes and "log out everywhere" should invalidate every session, not just the current one.

```python vulnerable
@app.post("/logout")
def logout():
    session.clear()  # BUG: Flask's default session is a signed cookie, so a copied cookie still works after this
    return redirect("/")
```

```python fixed
@app.post("/logout")
def logout():
    if uid := session.get("user_id"):
        user = db.session.get(User, uid)
        user.session_version += 1  # FIX: every cookie minted before now fails the check below
        db.session.commit()
    session.clear()
    return redirect("/")


@app.before_request
def load_user():
    uid = session.get("user_id")
    g.user = db.session.get(User, uid) if uid else None
    if g.user and session.get("ver") != g.user.session_version:  # login stores "ver" next to "user_id"
        session.clear()
        g.user = None
```

```go vulnerable
func logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: "session", Value: "", MaxAge: -1}) // BUG: the browser forgets the token, the store doesn't
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```go fixed
func logout(w http.ResponseWriter, r *http.Request) {
	if err := sessions.Destroy(r.Context()); err != nil { // FIX: deletes the server-side record and expires the cookie
		http.Error(w, "logout failed", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```javascript vulnerable
app.post("/logout", (req, res) => {
  res.clearCookie("token"); // BUG: the JWT itself stays valid for its full 7 days
  res.redirect("/");
});
```

```javascript fixed
app.post("/logout", requireAuth, async (req, res) => {
  const ttl = req.auth.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) await redis.set(`revoked:${req.auth.jti}`, "1", { EX: ttl }); // FIX: deny this token until it would expire anyway
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "lax" });
  res.redirect("/");
});

async function requireAuth(req, res, next) {
  try {
    req.auth = jwt.verify(req.cookies.token, publicKey, { algorithms: ["ES256"] });
  } catch {
    return res.sendStatus(401);
  }
  if (await redis.exists(`revoked:${req.auth.jti}`)) return res.sendStatus(401); // FIX: checked on every request
  next();
}
```

### Session length

Every session needs two clocks: an idle timeout that ends it after inactivity, and an absolute timeout that ends it no matter what. With only a sliding expiry, a stolen cookie that keeps getting used never dies.

> **Where to look:** session config at app startup and any middleware that refreshes expiry. Grep for `PERMANENT_SESSION_LIFETIME`, `SESSION_COOKIE_AGE` (Python), `Lifetime`, `IdleTimeout` (Go), and `maxAge`, `rolling` (Node).
>
> **How to think:** What's the longest a single stolen cookie can stay useful? For most apps, 15 to 30 minutes idle and 8 to 12 hours absolute is reasonable; banking goes shorter. Are both limits enforced on the server, or only in the cookie's `Expires`, which the client controls?

```python vulnerable
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)  # BUG: a stolen cookie works for a month
app.config["SESSION_REFRESH_EACH_REQUEST"] = True  # BUG: each request pushes the expiry out again, with no absolute cap
```

```python fixed
IDLE = timedelta(minutes=30)
ABSOLUTE = timedelta(hours=8)


@app.before_request
def enforce_session_age():
    if "user_id" not in session:
        return None
    now = datetime.now(UTC)
    started = datetime.fromisoformat(session["started_at"])
    last_seen = datetime.fromisoformat(session["last_seen"])
    if now - last_seen > IDLE or now - started > ABSOLUTE:  # FIX: both limits, checked server-side
        session.clear()
        return redirect("/login?expired=1")
    session["last_seen"] = now.isoformat()
    return None
```

```go vulnerable
sessions = scs.New()
sessions.Lifetime = 30 * 24 * time.Hour // BUG: one month, and no idle timeout at all
```

```go fixed
sessions = scs.New()
sessions.Lifetime = 8 * time.Hour        // FIX: absolute cap
sessions.IdleTimeout = 30 * time.Minute  // FIX: idle cap, enforced in the server-side store
```

```javascript vulnerable
app.use(session({
  store,
  secret: process.env.SESSION_SECRET,
  rolling: true,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // BUG: rolling 30-day expiry with no absolute limit
}));
```

```javascript fixed
app.use(session({
  store,
  secret: process.env.SESSION_SECRET,
  rolling: true,
  cookie: { maxAge: 30 * 60 * 1000, httpOnly: true, secure: true, sameSite: "lax" }, // FIX: 30-minute idle window
}));

app.use((req, res, next) => {
  if (!req.session.userId) return next();
  req.session.startedAt ??= Date.now();
  if (Date.now() - req.session.startedAt > 8 * 60 * 60 * 1000) { // FIX: 8-hour absolute cap
    return req.session.destroy(() => res.redirect("/login?expired=1"));
  }
  next();
});
```

### Session security

The session ID is a bearer credential, so it needs enough randomness that nobody can guess it, and the cookie needs flags that keep it off plain HTTP, away from JavaScript, and out of cross-site requests.

> **Where to look:** anything that generates a session ID or sets an auth cookie by hand, plus framework session config. Grep for `set_cookie`, `random.` (Python), `math/rand`, `http.Cookie{` (Go), and `Math.random`, `res.cookie(` (Node).
>
> **How to think:** Where do the ID's bits come from? Anything other than the OS CSPRNG is a finding. Check `Secure`, `HttpOnly`, and `SameSite` on every auth cookie. If sessions live client-side (signed cookies, JWTs), remember the payload is readable even when it can't be forged, so no secrets go in it.

```python vulnerable
def create_session(resp, user_id):
    sid = hashlib.md5(f"{user_id}{time.time()}".encode()).hexdigest()  # BUG: built from guessable inputs
    SESSIONS[sid] = user_id
    resp.set_cookie("sid", sid)  # BUG: no Secure, HttpOnly, or SameSite
```

```python fixed
def create_session(resp, user_id):
    sid = secrets.token_urlsafe(32)  # FIX: 256 random bits
    store.set(f"sess:{sid}", user_id, ex=8 * 3600)
    resp.set_cookie("__Host-sid", sid, secure=True, httponly=True, samesite="Lax", path="/")  # FIX: HTTPS only, hidden from JS, no cross-site sends
```

```go vulnerable
func createSession(w http.ResponseWriter, userID int64) {
	sid := strconv.FormatInt(rand.Int63(), 36) // BUG: math/rand is seeded and predictable
	store.Set(sid, userID)
	http.SetCookie(w, &http.Cookie{Name: "sid", Value: sid}) // BUG: no Secure, HttpOnly, or SameSite
}
```

```go fixed
func createSession(w http.ResponseWriter, userID int64) error {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil { // FIX: crypto/rand
		return err
	}
	sid := base64.RawURLEncoding.EncodeToString(b)
	store.Set(sid, userID, 8*time.Hour)
	http.SetCookie(w, &http.Cookie{
		Name: "__Host-sid", Value: sid, Path: "/",
		Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode, // FIX: all three flags
	})
	return nil
}
```

```javascript vulnerable
function createSession(res, userId) {
  const sid = Math.random().toString(36).slice(2); // BUG: Math.random is not a CSPRNG
  sessions.set(sid, userId);
  res.cookie("sid", sid); // BUG: no Secure, HttpOnly, or SameSite
}
```

```javascript fixed
function createSession(res, userId) {
  const sid = crypto.randomBytes(32).toString("base64url"); // FIX: 256 random bits
  sessions.set(sid, userId);
  res.cookie("__Host-sid", sid, { path: "/", secure: true, httpOnly: true, sameSite: "lax" }); // FIX: all three flags
}
```

### Service-to-service authentication

Webhooks and internal APIs often authenticate with a shared secret and an HMAC signature. The common mistakes are a weak hash, a comparison that leaks timing, no timestamp (so a captured request replays forever), and a secret sitting in the source code.

> **Where to look:** webhook receivers, internal API middleware, and outbound clients that sign requests. Grep for `hmac.new`, `X-Signature`, `verify=False` (Python), `hmac.New`, `InsecureSkipVerify` (Go), and `createHmac`, `rejectUnauthorized` (Node).
>
> **How to think:** What exactly is signed: body only, or method, path, and timestamp too? How old can a request be before it's rejected, and does that window allow for clock skew? Is TLS verification left on for outbound calls? Then look for tests that prove rejection when the signature, nonce, or timestamp is missing, mismatched, or expired. If those tests don't exist, the check has probably never failed in anger.

```python vulnerable
SHARED_SECRET = b"9f8e7d6c"  # BUG: hardcoded and committed


def verify_webhook(req):
    expected = hmac.new(SHARED_SECRET, req.get_data(), hashlib.sha1).hexdigest()  # BUG: SHA-1 over the body only
    return expected == req.headers.get("X-Signature")  # BUG: early-exit compare; no timestamp, so replays work forever
```

```python fixed
SHARED_SECRET = os.environ["WEBHOOK_SECRET"].encode()  # FIX: injected from the secret store
MAX_SKEW = 300  # seconds of clock drift tolerated


def verify_webhook(req) -> bool:
    ts = req.headers.get("X-Timestamp", "")
    sig = req.headers.get("X-Signature", "")
    if not ts.isdigit() or abs(time.time() - int(ts)) > MAX_SKEW:  # FIX: stale or missing timestamp fails
        return False
    msg = b".".join([ts.encode(), req.method.encode(), req.path.encode(), req.get_data()])
    expected = hmac.new(SHARED_SECRET, msg, hashlib.sha256).hexdigest()  # FIX: SHA-256 over time, method, path, and body
    return hmac.compare_digest(expected, sig)  # FIX: constant-time
```

```go vulnerable
var sharedSecret = []byte("9f8e7d6c") // BUG: hardcoded

func verifyWebhook(r *http.Request, body []byte) bool {
	mac := hmac.New(sha1.New, sharedSecret) // BUG: SHA-1, body only, no timestamp
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil)) == r.Header.Get("X-Signature") // BUG: early-exit compare
}
```

```go fixed
var sharedSecret = []byte(os.Getenv("WEBHOOK_SECRET")) // FIX: injected at deploy time

const maxSkew = 5 * time.Minute

func verifyWebhook(r *http.Request, body []byte) bool {
	ts, err := strconv.ParseInt(r.Header.Get("X-Timestamp"), 10, 64)
	if err != nil || time.Since(time.Unix(ts, 0)).Abs() > maxSkew { // FIX: rejects stale or missing timestamps
		return false
	}
	mac := hmac.New(sha256.New, sharedSecret)
	fmt.Fprintf(mac, "%d.%s.%s.", ts, r.Method, r.URL.Path) // FIX: signs time, method, and path too
	mac.Write(body)
	got, err := hex.DecodeString(r.Header.Get("X-Signature"))
	return err == nil && hmac.Equal(got, mac.Sum(nil)) // FIX: constant-time
}
```

```javascript vulnerable
const SHARED_SECRET = "9f8e7d6c"; // BUG: hardcoded

function verifyWebhook(req) {
  const expected = crypto.createHmac("sha1", SHARED_SECRET).update(req.rawBody).digest("hex"); // BUG: SHA-1, body only
  return expected === req.get("x-signature"); // BUG: early-exit compare, replayable forever
}
```

```javascript fixed
const SHARED_SECRET = process.env.WEBHOOK_SECRET; // FIX: from the secret store
const MAX_SKEW_MS = 5 * 60 * 1000;

function verifyWebhook(req) {
  const ts = Number(req.get("x-timestamp"));
  if (!Number.isInteger(ts) || Math.abs(Date.now() - ts * 1000) > MAX_SKEW_MS) return false; // FIX: replay window
  const expected = crypto
    .createHmac("sha256", SHARED_SECRET)
    .update(`${ts}.${req.method}.${req.path}.`)
    .update(req.rawBody) // FIX: SHA-256 over time, method, path, and body
    .digest();
  const got = Buffer.from(req.get("x-signature") ?? "", "hex");
  return got.length === expected.length && crypto.timingSafeEqual(got, expected); // FIX: constant-time
}
```

---

## Authorization Review

Authentication tells you who's calling. Authorization decides what they may touch, and that logic is usually smeared across the whole codebase instead of living in one file. Start with the place roles and permissions are defined (a `Role` enum, a permissions table, a policy module), then find the decorators and middleware that enforce them, and only then walk the route table looking for handlers that skip that machinery. In Flask that means `before_request` hooks and custom decorators; in Go, the middleware wrapped around the `ServeMux`; in Express, the `router.use` calls and the order they're registered in.

### Role identification

Every role the app knows about should be defined once, with a clear set of permissions and a record of who granted it. When role names are bare strings compared all over the code, a typo, a capital letter, or a newly added role lands on the wrong side of a check and nobody notices.

> **Where to look:** the role column on the user model, any `roles.py`, `permissions.go`, or `rbac.js`, and the admin screen that assigns roles. Grep for `role ==`, `role !=`, `.role in` (Python), `Role == "` and `Role != "` (Go), and `role === "`, `role !== "`, `roles.includes(` (Node).
>
> **How to think:** Can you list every role, and what each one may do, from the code alone? If you can't, the developers can't either. Is there a hierarchy, and is it written down in one place or implied by a dozen `if` statements? What happens to a role string that no check recognizes: does it get everything or nothing? Who can assign roles, and does each grant and revoke leave an audit record with the actor, the target, and the old and new role?

```python vulnerable
# reports.py
@app.get("/reports")
def reports():
    if current_user.role in ("Admin", "superuser"):  # BUG: the DB stores "admin", and retired "superuser" rows still get in
        return render("reports.html")
    abort(403)


# billing.py
@app.post("/billing/refund")
def refund():
    if current_user.role != "customer":  # BUG: deny-list, so "intern" or a typo like "custmer" can refund
        return issue_refund(request.form["order_id"])
    abort(403)
```

```python fixed
class Role(StrEnum):
    CUSTOMER = "customer"
    SUPPORT = "support"
    MANAGER = "manager"
    ADMIN = "admin"


PERMISSIONS: dict[Role, frozenset[str]] = {  # FIX: one table says which role can do what
    Role.CUSTOMER: frozenset(),
    Role.SUPPORT: frozenset({"refunds:issue"}),
    Role.MANAGER: frozenset({"refunds:issue", "reports:view"}),
    Role.ADMIN: frozenset({"refunds:issue", "reports:view", "users:manage"}),
}


def can(user, permission: str) -> bool:
    try:
        role = Role(user.role)
    except ValueError:  # FIX: a typo or retired role gets nothing
        return False
    return permission in PERMISSIONS[role]


@app.post("/billing/refund")
def refund():
    if not can(current_user, "refunds:issue"):
        abort(403)
    return issue_refund(request.form["order_id"])
```

```go vulnerable
// reports.go
func reports(w http.ResponseWriter, r *http.Request) {
	if role := currentUser(r).Role; role != "Admin" && role != "superuser" { // BUG: DB stores "admin"; retired "superuser" rows still pass
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	renderReports(w)
}

// billing.go
func refund(w http.ResponseWriter, r *http.Request) {
	if currentUser(r).Role == "customer" { // BUG: deny-list, every other string gets through
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	issueRefund(w, r)
}
```

```go fixed
type Role string

const (
	RoleCustomer Role = "customer"
	RoleSupport  Role = "support"
	RoleManager  Role = "manager"
	RoleAdmin    Role = "admin"
)

var permissions = map[Role]map[string]bool{ // FIX: the only place roles map to permissions
	RoleSupport: {"refunds:issue": true},
	RoleManager: {"refunds:issue": true, "reports:view": true},
	RoleAdmin:   {"refunds:issue": true, "reports:view": true, "users:manage": true},
}

func can(u *User, perm string) bool {
	return permissions[Role(u.Role)][perm] // FIX: unknown roles index a nil map and get false
}

func refund(w http.ResponseWriter, r *http.Request) {
	if !can(currentUser(r), "refunds:issue") {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	issueRefund(w, r)
}
```

```javascript vulnerable
// routes/reports.js
router.get("/reports", (req, res) => {
  if (!["Admin", "superuser"].includes(req.user.role)) return res.sendStatus(403); // BUG: DB says "admin"; stale "superuser" rows pass
  res.render("reports");
});

// routes/billing.js
router.post("/billing/refund", async (req, res) => {
  if (req.user.role === "customer") return res.sendStatus(403); // BUG: deny-list, any other string can refund
  await issueRefund(req.body.orderId);
  res.sendStatus(204);
});
```

```javascript fixed
const Role = Object.freeze({ CUSTOMER: "customer", SUPPORT: "support", MANAGER: "manager", ADMIN: "admin" });

const PERMISSIONS = new Map([ // FIX: one table maps roles to permissions
  [Role.CUSTOMER, new Set()],
  [Role.SUPPORT, new Set(["refunds:issue"])],
  [Role.MANAGER, new Set(["refunds:issue", "reports:view"])],
  [Role.ADMIN, new Set(["refunds:issue", "reports:view", "users:manage"])],
]);

function can(user, permission) {
  return PERMISSIONS.get(user.role)?.has(permission) ?? false; // FIX: unknown roles get false, and a Map has no prototype keys
}

router.post("/billing/refund", async (req, res) => {
  if (!can(req.user, "refunds:issue")) return res.sendStatus(403);
  await issueRefund(req.body.orderId);
  res.sendStatus(204);
});
```

### Sensitive and privileged endpoints

Admin panels, money movement, bulk exports, and anything that edits other people's data are where an authorization miss costs the most. Each of those routes needs a guard, and per-route guards get forgotten: the route someone added last sprint is usually the one without it.

> **Where to look:** the route table (`flask routes` prints it), the admin blueprint or router, and anything under `/admin`, `/internal`, `/billing`, or `/export`. Grep for `url_prefix="/admin"`, `@admin_required` (Python), `"/admin/"` and `HandleFunc("GET /admin` (Go), and `"/admin` and `router.use(` (Node).
>
> **How to think:** Build the inventory yourself. Which endpoints move money, change data that isn't the caller's, read sensitive records in bulk, or touch configuration? Then check each one against its guard. When 11 of 12 admin routes carry `@admin_required`, the twelfth is the finding, so count instead of skimming. A group-level guard makes the safe path the default, but still look for admin-flavored routes registered outside the group, like `/api/export-all` or a leftover debug endpoint.

```python vulnerable
admin = Blueprint("admin", __name__, url_prefix="/admin")


@admin.get("/users")
@admin_required
def list_users():
    return render("admin/users.html", users=User.query.all())


@admin.post("/users/<int:user_id>/disable")
@admin_required
def disable_user(user_id):
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@admin.get("/export")  # BUG: added later, and nobody remembered @admin_required
def export_users():
    return send_csv(User.query.all())
```

```python fixed
admin = Blueprint("admin", __name__, url_prefix="/admin")


@admin.before_request
def require_admin():  # FIX: runs before every view on this blueprint, including ones added later
    if not current_user.is_authenticated:
        abort(401)
    if not can(current_user, "admin:access"):
        abort(403)


@admin.get("/users")
def list_users():
    return render("admin/users.html", users=User.query.all())


@admin.post("/users/<int:user_id>/disable")
def disable_user(user_id):
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@admin.get("/export")
def export_users():
    return send_csv(User.query.all())
```

```go vulnerable
func routes(mux *http.ServeMux) {
	mux.Handle("GET /admin/users", requireAdmin(http.HandlerFunc(listUsers)))
	mux.Handle("POST /admin/users/{id}/disable", requireAdmin(http.HandlerFunc(disableUser)))
	mux.Handle("POST /admin/roles", requireAdmin(http.HandlerFunc(setRole)))
	mux.HandleFunc("GET /admin/export", exportUsers) // BUG: added later without requireAdmin
}
```

```go fixed
func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := userFrom(r.Context())
		if !ok || !can(u, "admin:access") {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func routes(mux *http.ServeMux) {
	admin := http.NewServeMux()
	admin.HandleFunc("GET /admin/users", listUsers)
	admin.HandleFunc("POST /admin/users/{id}/disable", disableUser)
	admin.HandleFunc("POST /admin/roles", setRole)
	admin.HandleFunc("GET /admin/export", exportUsers)
	mux.Handle("/admin/", requireAdmin(admin)) // FIX: one guard in front of the whole /admin/ subtree
}
```

```javascript vulnerable
router.get("/admin/users", requireRole("admin"), listUsers);
router.post("/admin/users/:id/disable", requireRole("admin"), disableUser);
router.post("/admin/roles", requireRole("admin"), setRole);
router.get("/admin/export", exportUsers); // BUG: the newest route forgot requireRole

app.use(router);
```

```javascript fixed
const adminRouter = express.Router();
adminRouter.use(requireRole("admin")); // FIX: runs before every route on this router, new ones included

adminRouter.get("/users", listUsers);
adminRouter.post("/users/:id/disable", disableUser);
adminRouter.post("/roles", setRole);
adminRouter.get("/export", exportUsers);

app.use("/admin", adminRouter);
```

### Authorization expectations

Some rules come from the business, and no framework knows them: who may approve a refund, how big a credit support can issue, which actions need two people. The review has to hold the code up against those rules, starting with the classic one, that whoever requested a payout must not be the person who approves it.

> **Where to look:** approval and workflow handlers, anything that moves a record from `pending` to `approved`, and models with `requested_by` and `approved_by` columns. Grep for `approve`, `approved_by` (Python), `Approve`, `status = 'approved'` (Go), and `approve`, `approvedBy` (Node). Also read the spec or ask the product owner, because these rules usually live in a ticket.
>
> **How to think:** Get the business rules first, then check that each one is enforced on the server. Can the requester approve their own request? Can the same person approve twice to satisfy a two-approver rule? Is the amount threshold checked in the handler or only in the UI? For least privilege, look at what the approver role actually holds; if approvers were simply made admins, separation of duties is gone. And two approvals landing at the same moment shouldn't both count as the first, so look for a row lock or a unique constraint.

```python vulnerable
@app.post("/payouts/<int:payout_id>/approve")
@login_required
def approve_payout(payout_id):
    if not can(current_user, "payouts:approve"):
        abort(403)
    payout = db.get_or_404(Payout, payout_id)
    if payout.status != "pending":
        abort(409)
    payout.status = "approved"  # BUG: the requester can approve their own payout
    payout.approved_by = current_user.id  # BUG: one signature releases any amount
    db.session.commit()
    return "", 204
```

```python fixed
DUAL_APPROVAL_OVER = Decimal("10000.00")


@app.post("/payouts/<int:payout_id>/approve")
@login_required
def approve_payout(payout_id):
    if not can(current_user, "payouts:approve"):
        abort(403)
    payout = db.session.get(Payout, payout_id, with_for_update=True)  # row lock, so two approvals can't race
    if payout is None:
        abort(404)
    if payout.status != "pending":
        abort(409)
    approver_ids = {a.user_id for a in payout.approvals}
    if current_user.id == payout.requested_by or current_user.id in approver_ids:  # FIX: no self-approval, no second vote
        abort(403)
    payout.approvals.append(Approval(user_id=current_user.id))
    needed = 2 if payout.amount > DUAL_APPROVAL_OVER else 1  # FIX: big payouts need two different approvers
    if len(approver_ids) + 1 >= needed:
        payout.status = "approved"
    db.session.commit()
    return "", 204
```

```go vulnerable
func approvePayout(ctx context.Context, approver *User, payoutID int64) error {
	if !can(approver, "payouts:approve") {
		return ErrForbidden
	}
	_, err := db.ExecContext(ctx, `UPDATE payouts SET status = 'approved', approved_by = $1
		WHERE id = $2 AND status = 'pending'`, // BUG: the requester can approve, and one approval releases any amount
		approver.ID, payoutID)
	return err
}
```

```go fixed
func approvePayout(ctx context.Context, approver *User, payoutID int64) error {
	if !can(approver, "payouts:approve") {
		return ErrForbidden
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var requestedBy int64
	err = tx.QueryRowContext(ctx, `SELECT requested_by FROM payouts
		WHERE id = $1 AND status = 'pending' FOR UPDATE`, payoutID).Scan(&requestedBy)
	if err != nil {
		return err
	}
	if requestedBy == approver.ID { // FIX: the requester never approves
		return ErrSelfApproval
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO payout_approvals (payout_id, user_id) VALUES ($1, $2)`,
		payoutID, approver.ID); err != nil { // unique (payout_id, user_id): one vote per person
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE payouts SET status = 'approved' WHERE id = $1
		AND (SELECT count(*) FROM payout_approvals WHERE payout_id = $1)
		>= CASE WHEN amount_cents > 1000000 THEN 2 ELSE 1 END`, payoutID); err != nil { // FIX: over $10,000 needs a second approver
		return err
	}
	return tx.Commit()
}
```

```javascript vulnerable
app.post("/payouts/:id/approve", requirePermission("payouts:approve"), async (req, res) => {
  const payout = await Payout.findByPk(req.params.id);
  if (!payout) return res.sendStatus(404);
  if (payout.status !== "pending") return res.sendStatus(409);
  payout.status = "approved"; // BUG: nothing stops the requester approving their own payout
  payout.approvedBy = req.user.id; // BUG: one approval, whatever the amount
  await payout.save();
  res.sendStatus(204);
});
```

```javascript fixed
const DUAL_APPROVAL_OVER_CENTS = 1_000_000;

app.post("/payouts/:id/approve", requirePermission("payouts:approve"), async (req, res) => {
  const status = await sequelize.transaction(async (transaction) => {
    const payout = await Payout.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payout) return 404;
    if (payout.status !== "pending") return 409;
    if (payout.requestedBy === req.user.id) return 403; // FIX: the requester never approves
    const [, created] = await PayoutApproval.findOrCreate({
      where: { payoutId: payout.id, userId: req.user.id },
      transaction,
    });
    if (!created) return 409;
    const approvals = await PayoutApproval.count({ where: { payoutId: payout.id }, transaction });
    if (approvals >= (payout.amountCents > DUAL_APPROVAL_OVER_CENTS ? 2 : 1)) { // FIX: a second approver above the threshold
      payout.status = "approved";
      await payout.save({ transaction });
    }
    return 204;
  });
  res.sendStatus(status);
});
```

### Access control questions

A short list of questions catches most account-management bugs. Can a normal user view other accounts, add accounts, or change accounts that aren't theirs, and can anyone create an account with more access than they hold? That last one hides in delegated admin screens, where a team admin's "invite user" form posts the new role straight through to the database.

> **Where to look:** invite, create-user, edit-user, and role-change endpoints, especially the ones open to team admins or org owners rather than your own staff. Grep for `request.json["role"]`, `role=data` (Python), `req.Role` and `OrgID` fields in decoded request structs (Go), and `req.body.role`, `req.body.orgId` (Node).
>
> **How to think:** Ask the questions out loud for each account endpoint. Can a non-privileged user view other accounts (public fields only, if at all)? Add accounts? Alter accounts other than their own? Hand out a role above their own? Then check scope: is the new account forced into the caller's org, or does `org_id` come from the body too? Separation of duties shows up here as well. Whoever creates an account shouldn't be the only person who can approve its elevation.

```python vulnerable
@app.post("/team/users")
@require_permission("team:manage_users")
def create_team_user():
    data = request.get_json()
    user = User(
        email=data["email"],
        role=data["role"],  # BUG: a team admin can mint an "owner"
        org_id=data["org_id"],  # BUG: or drop the new account into someone else's org
    )
    db.session.add(user)
    db.session.commit()
    send_invite(user)
    return {"id": user.public_id}, 201
```

```python fixed
ROLE_RANK = {Role.MEMBER: 10, Role.TEAM_ADMIN: 20, Role.OWNER: 30}


@app.post("/team/users")
@require_permission("team:manage_users")
def create_team_user():
    data = request.get_json()
    try:
        role = Role(data.get("role", "member"))
    except ValueError:
        abort(400)
    if ROLE_RANK[role] > ROLE_RANK[Role(current_user.role)]:  # FIX: never grant more than you hold
        abort(403)
    user = User(email=data["email"], role=role, org_id=current_user.org_id)  # FIX: the caller's org, never the body's
    db.session.add(user)
    db.session.commit()
    audit.info("user_created", extra={"by": current_user.id, "user_id": user.id, "role": role})
    send_invite(user)
    return {"id": user.public_id}, 201
```

```go vulnerable
type newUserReq struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	OrgID int64  `json:"org_id"`
}

func createTeamUser(w http.ResponseWriter, r *http.Request) {
	var req newUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := db.ExecContext(r.Context(), "INSERT INTO users (email, role, org_id) VALUES ($1, $2, $3)",
		req.Email, req.Role, req.OrgID) // BUG: role and org straight from the body, so "owner" in any org works
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}
```

```go fixed
var roleRank = map[string]int{"member": 10, "team_admin": 20, "owner": 30}

type newUserReq struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func createTeamUser(w http.ResponseWriter, r *http.Request) {
	caller := currentUser(r)
	var req newUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	want, known := roleRank[req.Role]
	if !known || want > roleRank[caller.Role] { // FIX: unknown roles and anything above the caller are refused
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	_, err := db.ExecContext(r.Context(), "INSERT INTO users (email, role, org_id) VALUES ($1, $2, $3)",
		req.Email, req.Role, caller.OrgID) // FIX: always the caller's own org
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}
```

```javascript vulnerable
app.post("/team/users", requirePermission("team:manage_users"), async (req, res) => {
  const { email, role, orgId } = req.body;
  const user = await User.create({ email, role, orgId }); // BUG: role and orgId come from the request, "owner" included
  await sendInvite(user);
  res.status(201).json({ id: user.publicId });
});
```

```javascript fixed
const ROLE_RANK = new Map([["member", 10], ["team_admin", 20], ["owner", 30]]);

app.post("/team/users", requirePermission("team:manage_users"), async (req, res) => {
  const role = String(req.body.role ?? "member");
  const wanted = ROLE_RANK.get(role);
  if (wanted === undefined || wanted > (ROLE_RANK.get(req.user.role) ?? 0)) { // FIX: can't grant above your own rank
    return res.sendStatus(403);
  }
  const user = await User.create({ email: req.body.email, role, orgId: req.user.orgId }); // FIX: org from the session
  audit.info({ event: "user_created", by: req.user.id, userId: user.id, role });
  await sendInvite(user);
  res.status(201).json({ id: user.publicId });
});
```

### Authorization functions and filters

Authorization belongs in a few named functions that every route passes through, so you can review them once and trust them everywhere. Inline `role != "admin"` checks pasted into handlers drift apart, and sooner or later one handler doesn't get a copy.

> **Where to look:** decorators, middleware, and policy classes first, then every handler that doesn't use them. Grep for `def require_`, `current_user.role` inside view bodies (Python), `func require`, `.Role ==` inside handlers (Go), and `requireRole`, `req.user.role` inside route bodies (Node).
>
> **How to think:** Find the authorization functions and read them closely. Where does the identity come from: a server-side session, a verified token, or a cookie the client could edit? Is the check made on every request, or only when the page first loads? Then flip it around and list the handlers that never call those functions. You should be able to tell what permission a route needs from its definition alone. If you have to read the body to find out, the next developer adding a route will miss it.

```python vulnerable
@app.post("/users/<int:user_id>/disable")
@login_required
def disable_user(user_id):
    if current_user.role != "admin":  # pasted into each admin view
        abort(403)
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@app.post("/users/<int:user_id>/reset-mfa")
@login_required
def reset_mfa(user_id):  # BUG: the paste never made it here, so any user can strip anyone's 2FA
    db.get_or_404(User, user_id).totp_secret = None
    db.session.commit()
    return "", 204
```

```python fixed
def require_permission(permission):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not current_user.is_authenticated:
                abort(401)
            if not can(current_user, permission):  # FIX: one implementation, reviewed once
                abort(403)
            return view(*args, **kwargs)
        return wrapped
    return decorator


@app.post("/users/<int:user_id>/disable")
@require_permission("users:disable")
def disable_user(user_id):
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@app.post("/users/<int:user_id>/reset-mfa")
@require_permission("users:reset_mfa")  # FIX: the requirement is visible on the route
def reset_mfa(user_id):
    db.get_or_404(User, user_id).totp_secret = None
    db.session.commit()
    return "", 204
```

```go vulnerable
func disableUser(w http.ResponseWriter, r *http.Request) {
	if currentUser(r).Role != "admin" { // pasted into each admin handler
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	updateUser(w, r, "UPDATE users SET active = false WHERE id = $1")
}

func resetMFA(w http.ResponseWriter, r *http.Request) { // BUG: never got the paste, so anyone can clear anyone's 2FA
	updateUser(w, r, "UPDATE users SET totp_secret = NULL WHERE id = $1")
}

func routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /users/{id}/disable", disableUser)
	mux.HandleFunc("POST /users/{id}/reset-mfa", resetMFA)
}
```

```go fixed
func requirePermission(perm string, next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := userFrom(r.Context())
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if !can(u, perm) { // FIX: one check, written and reviewed once
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next(w, r)
	})
}

func disableUser(w http.ResponseWriter, r *http.Request) {
	updateUser(w, r, "UPDATE users SET active = false WHERE id = $1")
}

func resetMFA(w http.ResponseWriter, r *http.Request) {
	updateUser(w, r, "UPDATE users SET totp_secret = NULL WHERE id = $1")
}

func routes(mux *http.ServeMux) {
	mux.Handle("POST /users/{id}/disable", requirePermission("users:disable", disableUser))
	mux.Handle("POST /users/{id}/reset-mfa", requirePermission("users:reset_mfa", resetMFA)) // FIX: the permission sits on the route
}
```

```javascript vulnerable
app.post("/users/:id/disable", requireLogin, async (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403); // pasted into each admin route
  await User.update({ active: false }, { where: { id: req.params.id } });
  res.sendStatus(204);
});

app.post("/users/:id/reset-mfa", requireLogin, async (req, res) => { // BUG: no paste here, any user can clear anyone's 2FA
  await User.update({ totpSecret: null }, { where: { id: req.params.id } });
  res.sendStatus(204);
});
```

```javascript fixed
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.sendStatus(401);
    if (!can(req.user, permission)) return res.sendStatus(403); // FIX: one implementation for every route
    next();
  };
}

app.post("/users/:id/disable", requirePermission("users:disable"), async (req, res) => {
  await User.update({ active: false }, { where: { id: req.params.id } });
  res.sendStatus(204);
});

app.post("/users/:id/reset-mfa", requirePermission("users:reset_mfa"), async (req, res) => { // FIX: declared on the route
  await User.update({ totpSecret: null }, { where: { id: req.params.id } });
  res.sendStatus(204);
});
```

### Broken access control

Broken access control is the umbrella term. Horizontal escalation lets user A act on user B's data; vertical escalation lets a normal user reach admin functions. Both get easy when the server asks the client who it is, by trusting an unverified JWT, an `isAdmin` cookie, or a hidden form field.

> **Where to look:** wherever the app works out identity and role per request: auth middleware, JWT parsing, cookie reads. Grep for `verify_signature`, `request.cookies.get("role")`, `is_admin` in forms (Python), `ParseUnverified`, `r.Cookie("role")` (Go), and `jwt.decode(`, `req.cookies.isAdmin`, `req.body.role` (Node).
>
> **How to think:** For every input that feeds an authorization decision, ask who wrote it. If the answer is the browser, treat it as attacker-controlled until a server-side check proves otherwise. With JWTs, check that the signature is verified, the algorithm is pinned (no `none`, no RS256/HS256 confusion), and the role used for the decision comes from the database or a server-side session rather than a long-lived claim. Then test both directions: change the ID in each request for horizontal escalation (see IDOR), and replay admin requests with a normal user's session for vertical (see Missing function level access control).

```python vulnerable
def current_identity():
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    claims = jwt.decode(token, options={"verify_signature": False})  # BUG: anyone can mint {"role": "admin"}
    return claims["sub"], claims["role"]


@app.post("/admin/users/<int:user_id>/disable")
def disable_user(user_id):
    _, role = current_identity()
    if role != "admin" and request.form.get("is_admin") != "1":  # BUG: a hidden form field the client can flip
        abort(403)
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204
```

```python fixed
def current_user_from_token():
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    try:
        claims = jwt.decode(token, PUBLIC_KEY, algorithms=["ES256"], options={"require": ["exp", "sub"]})  # FIX: verified, algorithm pinned
    except jwt.InvalidTokenError:
        abort(401)
    user = User.query.filter_by(public_id=claims["sub"], active=True).first()
    if user is None:
        abort(401)
    return user  # FIX: the role comes from this row, not from a claim


@app.post("/admin/users/<int:user_id>/disable")
def disable_user(user_id):
    user = current_user_from_token()
    if not can(user, "users:disable"):  # FIX: nothing the client sent decides this
        abort(403)
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204
```

```go vulnerable
func roleFromRequest(r *http.Request) string {
	raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	claims := jwt.MapClaims{}
	if _, _, err := jwt.NewParser().ParseUnverified(raw, claims); err != nil { // BUG: the signature is never checked
		return ""
	}
	role, _ := claims["role"].(string) // BUG: the client chose this value
	return role
}

func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if roleFromRequest(r) != "admin" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```go fixed
func userFromRequest(r *http.Request) (*User, error) {
	raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) {
		return publicKey, nil
	}, jwt.WithValidMethods([]string{"ES256"}), jwt.WithExpirationRequired()) // FIX: signature verified, algorithm pinned
	if err != nil {
		return nil, err
	}
	return loadActiveUser(r.Context(), claims.Subject) // FIX: the role comes from the users table
}

func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, err := userFromRequest(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if !can(u, "admin:access") {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```javascript vulnerable
function requireAdmin(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const claims = jwt.decode(token); // BUG: decode() never checks the signature
  if (claims?.role === "admin" || req.cookies.isAdmin === "true") return next(); // BUG: the client sets this cookie
  res.sendStatus(403);
}
```

```javascript fixed
async function requireAdmin(req, res, next) {
  let claims;
  try {
    const token = req.get("authorization")?.replace(/^Bearer /, "") ?? "";
    claims = jwt.verify(token, publicKey, { algorithms: ["ES256"] }); // FIX: signature checked, algorithm pinned
  } catch {
    return res.sendStatus(401);
  }
  const user = await User.findOne({ where: { publicId: claims.sub, active: true } }); // FIX: role read from the database
  if (!user || !can(user, "admin:access")) return res.sendStatus(403);
  req.user = user;
  next();
}
```

### Insecure direct object reference (IDOR)

An IDOR is a handler that takes an object ID from the request and loads it without asking whether this caller may see it. Change `/invoices/1041` to `/invoices/1042` and you're reading another customer's invoice.

> **Where to look:** every route with an ID in the path, query string, or body, and the data access right after it. Grep for `.get(id)`, `get_or_404(`, `filter_by(id=` (Python), `WHERE id = $1` with no second condition (Go), and `findByPk`, `findOne({ id })`, `findById` (Node). In Rails-style code the same smell is `find_by(id)` or `find(id)`. Also check list endpoints like `findAll()` or `.all()` that forget the owner or tenant filter.
>
> **How to think:** For each lookup, ask what ties this object to the caller. The answer should sit in the query (`AND owner_id = ...`), not in a check three calls later that a refactor can drop. "The UI never shows that ID" doesn't count, and neither does a hidden form field. Return 404 for objects the caller can't see, so the response doesn't confirm the ID exists. Random IDs slow guessing down (see User identification), and indirect references go further: a per-user index or mapping, where `/me/invoices/3` means "my third invoice", leaves no global ID to tamper with. Writes hurt more than reads, so try `PUT` and `DELETE` with someone else's ID too.

```python vulnerable
@app.get("/invoices/<int:invoice_id>")
@login_required
def get_invoice(invoice_id):
    invoice = db.get_or_404(Invoice, invoice_id)  # BUG: fetched by id alone
    return invoice.to_dict()


@app.delete("/invoices/<int:invoice_id>")
@login_required
def delete_invoice(invoice_id):
    db.session.delete(db.get_or_404(Invoice, invoice_id))  # BUG: deletes anyone's invoice
    db.session.commit()
    return "", 204
```

```python fixed
def owned_invoice_or_404(invoice_id):
    return Invoice.query.filter_by(id=invoice_id, owner_id=current_user.id).first_or_404()  # FIX: owner in the query, 404 for everyone else


@app.get("/invoices/<int:invoice_id>")
@login_required
def get_invoice(invoice_id):
    return owned_invoice_or_404(invoice_id).to_dict()


@app.delete("/invoices/<int:invoice_id>")
@login_required
def delete_invoice(invoice_id):
    db.session.delete(owned_invoice_or_404(invoice_id))  # FIX: writes go through the same scoped lookup
    db.session.commit()
    return "", 204
```

```go vulnerable
mux.HandleFunc("GET /invoices/{id}", func(w http.ResponseWriter, r *http.Request) {
	var inv Invoice
	err := db.QueryRowContext(r.Context(),
		"SELECT id, number, total_cents FROM invoices WHERE id = $1", // BUG: any id, any owner
		r.PathValue("id"),
	).Scan(&inv.ID, &inv.Number, &inv.TotalCents)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(inv)
})
```

```go fixed
mux.HandleFunc("GET /invoices/{id}", func(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var inv Invoice
	err = db.QueryRowContext(r.Context(),
		"SELECT id, number, total_cents FROM invoices WHERE id = $1 AND owner_id = $2", // FIX: ownership is part of the query
		id, currentUser(r).ID,
	).Scan(&inv.ID, &inv.Number, &inv.TotalCents)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r) // FIX: "not yours" and "doesn't exist" look the same
		return
	}
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(inv)
})
```

```javascript vulnerable
app.get("/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id); // BUG: no owner check
  if (!invoice) return res.sendStatus(404);
  res.json(invoice);
});

app.delete("/invoices/:id", requireLogin, async (req, res) => {
  await Invoice.destroy({ where: { id: req.params.id } }); // BUG: deletes anyone's invoice
  res.sendStatus(204);
});
```

```javascript fixed
app.get("/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await Invoice.findOne({ where: { id: req.params.id, ownerId: req.user.id } }); // FIX: owner in the query
  if (!invoice) return res.sendStatus(404); // FIX: same answer for "not yours" and "doesn't exist"
  res.json(invoice);
});

app.delete("/invoices/:id", requireLogin, async (req, res) => {
  const deleted = await Invoice.destroy({ where: { id: req.params.id, ownerId: req.user.id } }); // FIX: scoped delete
  res.sendStatus(deleted ? 204 : 404);
});
```

### Missing function level access control

Hiding a button in the UI does nothing to the API behind it. If the React app shows "Delete user" only to admins but `DELETE /api/users/{id}` checks nothing beyond a valid session, any user with curl or the browser console can call it.

> **Where to look:** the frontend's role checks (`isAdmin &&` in JSX, `v-if="isAdmin"`, `{% if current_user.is_admin %}`) and the API routes those screens call. Grep for API routes that carry only `@login_required` (Python), handlers mounted behind nothing but `requireLogin` (Go), and Express routes guarded only by `requireLogin` or `authenticate` (Node). Don't skip GraphQL mutations, mobile-only endpoints, and old `/api/v1/` routes that still answer.
>
> **How to think:** Take a normal user's session and replay every admin request you can capture. Each one should fail on the server. In code, for every state-changing or admin-only endpoint, point at the line that checks the permission; if that line only exists in a template or the JS bundle, the endpoint is open. Sensitive reads count too, since an admin-only page almost always fetches an admin-only API.

```python vulnerable
@api.get("/api/me")
@login_required
def me():
    return {"name": current_user.name, "is_admin": current_user.role == "admin"}  # the SPA hides admin buttons when false


@api.delete("/api/users/<int:user_id>")
@login_required  # BUG: logged in is the only requirement; the hidden button was the real "check"
def delete_user(user_id):
    db.session.delete(db.get_or_404(User, user_id))
    db.session.commit()
    return "", 204
```

```python fixed
@api.get("/api/me")
@login_required
def me():
    return {"name": current_user.name, "can_delete_users": can(current_user, "users:delete")}  # a UI hint, nothing more


@api.delete("/api/users/<int:user_id>")
@require_permission("users:delete")  # FIX: the API enforces it, whatever the UI shows
def delete_user(user_id):
    db.session.delete(db.get_or_404(User, user_id))
    db.session.commit()
    return "", 204
```

```go vulnerable
func routes(mux *http.ServeMux) {
	api := http.NewServeMux()
	api.HandleFunc("GET /api/me", me)                    // the SPA draws admin buttons only when this says isAdmin
	api.HandleFunc("DELETE /api/users/{id}", deleteUser) // BUG: hidden button, open endpoint
	api.HandleFunc("GET /api/audit-log", auditLog)       // BUG: same for the admin-only page
	mux.Handle("/api/", requireLogin(api))
}
```

```go fixed
func routes(mux *http.ServeMux) {
	api := http.NewServeMux()
	api.HandleFunc("GET /api/me", me)
	api.Handle("DELETE /api/users/{id}", requirePermission("users:delete", deleteUser)) // FIX: enforced on the route itself
	api.Handle("GET /api/audit-log", requirePermission("audit:read", auditLog))         // FIX: sensitive reads too
	mux.Handle("/api/", requireLogin(api))
}
```

```javascript vulnerable
// client: {me.isAdmin && <DeleteUserButton id={u.id} />} is the only role check anywhere

app.delete("/api/users/:id", requireLogin, async (req, res) => { // BUG: any session can delete any user
  await User.destroy({ where: { id: req.params.id } });
  res.sendStatus(204);
});

app.get("/api/audit-log", requireLogin, async (req, res) => { // BUG: the admin page is hidden, its API isn't
  res.json(await AuditLog.findAll({ order: [["createdAt", "DESC"]], limit: 100 }));
});
```

```javascript fixed
// client can keep hiding the button; the API no longer depends on it

app.delete("/api/users/:id", requirePermission("users:delete"), async (req, res) => { // FIX: the API enforces it
  await User.destroy({ where: { id: req.params.id } });
  res.sendStatus(204);
});

app.get("/api/audit-log", requirePermission("audit:read"), async (req, res) => { // FIX: sensitive reads too
  res.json(await AuditLog.findAll({ order: [["createdAt", "DESC"]], limit: 100 }));
});
```

### Authorization filter verification

A filter only protects the requests it actually runs on. It has to cover every route, run before the handler, and deny by default. Prefix checks, case and slash differences between the filter and the router, and middleware registered in the wrong order are the usual ways past it.

> **Where to look:** global middleware registration, `before_request` hooks, and any code that matches on the request path. Grep for `request.path.startswith` (Python), `strings.HasPrefix(r.URL.Path` and per-route `requireAuth(` wrappers (Go), and `req.path.startsWith`, `req.url.startsWith`, plus the order of `app.use(` calls (Node). Check router options too: Express ignores case and a trailing slash unless `caseSensitive` and `strict` are turned on.
>
> **How to think:** Is the filter allow-by-default with a list of protected paths, or deny-by-default with a list of public ones? Only the second stays safe when someone adds a route next month. Does the filter read the request the same way the router does? If one compares raw strings while the other ignores case, trailing slashes, or encoding, there's a gap, so try `/ADMIN/users`, `/admin/users/`, and `//admin/users` against each guard. Order matters as well: Express runs middleware in registration order, so a guard added after the routes protects nothing. Matching on what the router resolved (a Flask endpoint name, the Go mux pattern, a mounted router) sidesteps the string games entirely.

```python vulnerable
PROTECTED_PREFIXES = ("/admin", "/account", "/billing")


@app.before_request
def require_login():
    if request.path.startswith(PROTECTED_PREFIXES) and not current_user.is_authenticated:  # BUG: default allow; unlisted paths are public
        return redirect(url_for("auth.login"))
    return None


app.register_blueprint(reports_bp, url_prefix="/reports")  # BUG: added later and never listed, so it's public
```

```python fixed
PUBLIC_ENDPOINTS = {"auth.login", "auth.forgot", "auth.reset", "health", "static"}


@app.before_request
def require_login():
    if request.endpoint in PUBLIC_ENDPOINTS:  # FIX: default deny; public views opt out by endpoint name
        return None
    if not current_user.is_authenticated:
        return redirect(url_for("auth.login"))
    return None


app.register_blueprint(reports_bp, url_prefix="/reports")  # FIX: covered the moment it's registered
```

```go vulnerable
func routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /login", loginPage)
	mux.HandleFunc("POST /login", login)
	mux.Handle("GET /account", requireAuth(http.HandlerFunc(account)))
	mux.Handle("POST /account/email", requireAuth(http.HandlerFunc(changeEmail)))
	mux.HandleFunc("GET /reports/{id}", report) // BUG: wrapped one by one, and this one was missed
}

func main() {
	mux := http.NewServeMux()
	routes(mux)
	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(withUser(mux))))
}
```

```go fixed
var public = map[string]bool{
	"GET /login":   true,
	"POST /login":  true,
	"GET /healthz": true,
}

func defaultDeny(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, pattern := mux.Handler(r)
		if _, ok := userFrom(r.Context()); !ok && !public[pattern] { // FIX: default deny, public routes listed by pattern
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()
	routes(mux)
	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(withUser(defaultDeny(mux))))) // FIX: one wrapper around everything
}
```

```javascript vulnerable
app.use((req, res, next) => {
  if (req.path.startsWith("/admin")) return requireAdmin(req, res, next); // BUG: /ADMIN/users skips this, yet Express still routes it
  next();
});

app.get("/admin/users", listUsers);
app.post("/admin/users/:id/disable", disableUser);
app.get("/reports/:id", showReport); // BUG: default allow, so a new route is public unless someone remembers
```

```javascript fixed
const PUBLIC = new Set(["GET /", "GET /login", "POST /login", "GET /healthz"]);

app.use((req, res, next) => {
  if (req.user || PUBLIC.has(`${req.method} ${req.path}`)) return next(); // FIX: default deny, public routes listed
  res.sendStatus(401);
});

const adminRouter = express.Router();
adminRouter.use(requireAdmin); // FIX: runs for every request the router handles, /ADMIN/users included
adminRouter.get("/users", listUsers);
adminRouter.post("/users/:id/disable", disableUser);
app.use("/admin", adminRouter);

app.get("/reports/:id", showReport);
```

### Generic authorization flaws

Some authorization bugs come from when and how a check runs rather than whether it exists. The check sits below the write. The decision was cached at login. Or two requests race between the check and the use.

> **Where to look:** handlers where a `commit()`, `save()`, `destroy()`, or `Exec` comes before the permission check; login code that copies the role into the session or a token; and balance or quota checks followed by a separate update. Grep for `session["role"]` (Python), `sessions.Put(` with a role or permissions key (Go), and `req.session.role` (Node), then for a `SELECT` followed by an `UPDATE` of the same row without `FOR UPDATE`.
>
> **How to think:** Read each handler top to bottom and mark the first side effect. Every authorization check has to sit above that line, because a 403 returned afterwards doesn't undo the write, the email that already went out, or the webhook that already fired. Next, how fresh is the decision? A role copied into the session at login means a demoted or fired admin keeps admin until the session dies, so re-read it per request or bump a version when roles change. Look for TOCTOU races: "check the balance, then debit" as two statements lets ten parallel requests spend the same money, so put the condition in the `UPDATE` or hold a row lock. And watch for parameter manipulation, meaning any `user_id`, `account_id`, `price`, or `role` in the request that the server should have taken from the session.

```python vulnerable
@app.post("/accounts/<int:account_id>/transfer")
@login_required
def transfer(account_id):
    amount = Decimal(request.form["amount"])
    source = db.get_or_404(Account, account_id)
    dest = db.get_or_404(Account, int(request.form["to"]))
    source.balance -= amount
    dest.balance += amount
    db.session.commit()  # BUG: the money has moved before anyone checked who asked
    if source.owner_id != current_user.id:
        abort(403)  # BUG: the 403 arrives after the write
    return "", 204
```

```python fixed
@app.post("/accounts/<int:account_id>/transfer")
@login_required
def transfer(account_id):
    amount = Decimal(request.form["amount"])
    if amount <= 0:
        abort(400)
    source = db.session.execute(
        select(Account).where(Account.id == account_id, Account.owner_id == current_user.id).with_for_update()
    ).scalar_one_or_none()
    if source is None:  # FIX: ownership checked before anything changes
        abort(404)
    if source.balance < amount:  # the row lock stops a parallel request spending the same funds
        abort(409)
    dest = db.session.get(Account, int(request.form["to"]), with_for_update=True)
    if dest is None:
        abort(404)
    source.balance -= amount
    dest.balance += amount
    db.session.commit()  # FIX: one transaction, after every check
    return "", 204
```

```go vulnerable
func setVisibility(w http.ResponseWriter, r *http.Request) {
	var ownerID int64
	err := db.QueryRowContext(r.Context(),
		"UPDATE projects SET visibility = $1 WHERE id = $2 RETURNING owner_id", // BUG: the write runs for any caller
		r.PostFormValue("visibility"), r.PathValue("id")).Scan(&ownerID)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if ownerID != currentUser(r).ID { // BUG: too late, the project is already public
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

```go fixed
func setVisibility(w http.ResponseWriter, r *http.Request) {
	visibility := r.PostFormValue("visibility")
	if visibility != "private" && visibility != "public" {
		http.Error(w, "bad visibility", http.StatusBadRequest)
		return
	}
	res, err := db.ExecContext(r.Context(),
		"UPDATE projects SET visibility = $1 WHERE id = $2 AND owner_id = $3", // FIX: check and write are one statement
		visibility, r.PathValue("id"), currentUser(r).ID)
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	if n, err := res.RowsAffected(); err != nil || n == 0 {
		http.NotFound(w, r) // FIX: a non-owner changed nothing and learns nothing
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

```javascript vulnerable
app.delete("/projects/:id", requireLogin, async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  if (!project) return res.sendStatus(404);
  await project.destroy(); // BUG: the delete runs before the permission check
  await AuditLog.create({ action: "project.delete", projectId: project.id, by: req.user.id });
  if (project.ownerId !== req.user.id && !can(req.user, "projects:delete_any")) {
    return res.sendStatus(403); // BUG: the caller sees 403, but the project is already gone
  }
  res.sendStatus(204);
});
```

```javascript fixed
app.delete("/projects/:id", requireLogin, async (req, res) => {
  const status = await sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!project) return 404;
    if (project.ownerId !== req.user.id && !can(req.user, "projects:delete_any")) return 403; // FIX: decide before touching anything
    await project.destroy({ transaction }); // FIX: runs only after the check, in the same transaction
    await AuditLog.create({ action: "project.delete", projectId: project.id, by: req.user.id }, { transaction });
    return 204;
  });
  res.sendStatus(status);
});
```

### CSRF protection

With cookie sessions, the browser attaches the cookie to requests that other sites trigger, so a hidden form on an attacker's page can post to your app as the victim. Every state-changing request needs proof that it came from your own pages, such as a per-session token or an Origin check, with `SameSite` cookies as a second layer.

> **Where to look:** app setup (is any CSRF middleware registered at all?), every POST, PUT, PATCH, and DELETE route that relies on cookies, the exemption list, and any GET route that changes state. Grep for `CSRFProtect`, `csrf.exempt`, `WTF_CSRF_ENABLED` (Python), `CrossOriginProtection`, `csrf.Protect`, `AddInsecureBypassPattern` (Go), and `csurf`, `_csrf`, `sameSite` (Node).
>
> **How to think:** Which requests carry credentials the browser adds on its own? Cookies and HTTP auth do. A bearer token your JavaScript puts in the `Authorization` header doesn't, so pure token APIs need less here. Is the CSRF token tied to the session, checked on the server for every unsafe method, and compared in constant time? Any GET that changes state (`/logout`, `/unsubscribe`, `/leave`) dodges most defenses, and `SameSite=Lax` still sends cookies on top-level GET navigations. Exemptions should be signed webhooks, never "the mobile API" that shares the browser cookie. If the app hand-rolls a Referer check, a missing header must not count as a pass, since the attacker's page can suppress it with a referrer policy. And if you see `csurf`, flag it: the package is deprecated.

```python vulnerable
app.config.update(SESSION_COOKIE_SAMESITE="None", SESSION_COOKIE_SECURE=True)  # BUG: the cookie rides along on cross-site requests


@app.post("/projects/<int:project_id>/members")
@login_required
def add_member(project_id):  # BUG: no CSRF token, so a form on any site can add the attacker as a member
    project = owned_project_or_404(project_id)
    project.members.append(User.query.filter_by(email=request.form["email"]).first_or_404())
    db.session.commit()
    return redirect(url_for("show_project", project_id=project_id))


@app.get("/projects/<int:project_id>/leave")  # BUG: state change on GET; a link or an <img> on another site fires it
@login_required
def leave_project(project_id):
    member_project_or_404(project_id).members.remove(current_user)
    db.session.commit()
    return redirect("/projects")
```

```python fixed
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=True)  # FIX: no cookie on cross-site POSTs or subrequests
csrf = CSRFProtect(app)  # FIX: POST, PUT, PATCH, and DELETE all need a valid per-session token


@app.post("/projects/<int:project_id>/members")
@login_required
def add_member(project_id):  # forms render {{ csrf_token() }}; fetch() sends it as X-CSRFToken
    project = owned_project_or_404(project_id)
    project.members.append(User.query.filter_by(email=request.form["email"]).first_or_404())
    db.session.commit()
    return redirect(url_for("show_project", project_id=project_id))


@app.post("/projects/<int:project_id>/leave")  # FIX: state changes only on unsafe methods
@login_required
def leave_project(project_id):
    member_project_or_404(project_id).members.remove(current_user)
    db.session.commit()
    return redirect("/projects")
```

```go vulnerable
func main() {
	sessions.Cookie.SameSite = http.SameSiteNoneMode // BUG: the session cookie rides along on cross-site requests
	sessions.Cookie.Secure = true

	mux := http.NewServeMux()
	mux.HandleFunc("POST /projects/{id}/members", addMember) // BUG: nothing checks where the request came from
	mux.HandleFunc("GET /projects/{id}/leave", leaveProject) // BUG: state change on GET

	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(mux)))
}
```

```go fixed
func main() {
	sessions.Cookie.SameSite = http.SameSiteLaxMode
	sessions.Cookie.Secure = true

	mux := http.NewServeMux()
	mux.HandleFunc("POST /projects/{id}/members", addMember)
	mux.HandleFunc("POST /projects/{id}/leave", leaveProject) // FIX: state changes only on unsafe methods

	// http.CrossOriginProtection needs Go 1.25+
	csrf := http.NewCrossOriginProtection()
	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(csrf.Handler(mux)))) // FIX: rejects cross-origin POST, PUT, PATCH, DELETE
}
```

```javascript vulnerable
app.use(session({
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: "none" }, // BUG: the cookie rides along on cross-site requests
}));

app.post("/projects/:id/members", requireLogin, addMember); // BUG: no CSRF token checked
app.get("/projects/:id/leave", requireLogin, leaveProject); // BUG: state change on GET
```

```javascript fixed
app.use(session({
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" }, // FIX: no cookie on cross-site POSTs or subrequests
}));

function csrfToken(req) {
  req.session.csrf ??= crypto.randomBytes(32).toString("base64url");
  return req.session.csrf; // render into forms as <input type="hidden" name="_csrf">
}

function verifyCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const expected = Buffer.from(req.session.csrf ?? "");
  const supplied = Buffer.from(String(req.get("x-csrf-token") ?? req.body?._csrf ?? ""));
  if (expected.length === 0 || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.sendStatus(403); // FIX: per-session token, length checked, constant-time compare
  }
  next();
}

app.use(express.urlencoded({ extended: false }), verifyCsrf);
app.post("/projects/:id/members", requireLogin, addMember);
app.post("/projects/:id/leave", requireLogin, leaveProject); // FIX: POST, so the token check applies
```

### Critical operations re-authentication

A stolen session cookie or a laptop left signed in at someone's desk shouldn't be enough to take an account over for good. Changing the password or email, deleting the account, and moving money should all ask for fresh proof that the owner is at the keyboard.

> **Where to look:** change-password, change-email, delete-account, payout and transfer handlers, plus 2FA settings and API key creation. Grep for `change_password`, `update_email`, `delete_account` (Python), `ChangePassword`, `deleteAccount` (Go), and `/account/password`, `/account/email` (Node). Then grep for `current_password`, `reauth_at`, or `authTime`; if none of them show up, there's no re-auth.
>
> **How to think:** For each critical action, ask what someone holding only the session cookie could do with it. A password change without the current password locks the owner out. An email change that isn't confirmed by the new address, and isn't reported to the old one, hands the attacker the reset flow forever. Account deletion should want the password (or a re-auth from the last few minutes) plus an explicit confirmation. Financial transactions and high-privilege actions, like granting admin, creating API keys, or turning off 2FA, should require a 2FA step-up or re-auth. The re-auth timestamp has to live where the client can't edit it: the server-side session, or at least a signed one.

```python vulnerable
@app.post("/account/email")
@login_required
def change_email():
    current_user.email = request.form["email"]  # BUG: a stolen session can point password resets at the attacker's inbox
    db.session.commit()
    return redirect("/account")


@app.post("/account/password")
@login_required
def change_password():
    current_user.password_hash = ph.hash(request.form["new_password"])  # BUG: no current password required
    db.session.commit()
    return redirect("/account")
```

```python fixed
REAUTH_WINDOW = timedelta(minutes=5)


def reauthenticated_recently():
    at = session.get("reauth_at")  # set by /reauth after a password or 2FA check
    return at is not None and datetime.now(UTC) - datetime.fromisoformat(at) < REAUTH_WINDOW


@app.post("/account/email")
@login_required
def change_email():
    if not reauthenticated_recently():  # FIX: a live session alone isn't enough
        return redirect(url_for("reauth"))
    new_email = request.form["email"].strip().lower()
    send_email_change_links(current_user, new_email)  # FIX: confirm link to the new address, notice to the old one
    return "Check your new inbox to confirm the change.", 202


@app.post("/account/password")
@login_required
@limiter.limit("5 per 15 minutes")
def change_password():
    if not verify_password(current_user.password_hash, request.form["current_password"]):  # FIX: proves the owner is here
        return "Current password is wrong", 403
    if error := validate_password(request.form["new_password"], current_user.email):
        return error, 400
    current_user.password_hash = ph.hash(request.form["new_password"])
    db.session.commit()
    return redirect("/account")
```

```go vulnerable
func deleteAccount(w http.ResponseWriter, r *http.Request) {
	u := currentUser(r)
	if _, err := db.ExecContext(r.Context(), "DELETE FROM users WHERE id = $1", u.ID); err != nil { // BUG: a live session is the only requirement
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	sessions.Destroy(r.Context())
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```go fixed
const reauthWindow = 5 * time.Minute

func deleteAccount(w http.ResponseWriter, r *http.Request) {
	u := currentUser(r)
	if time.Since(sessions.GetTime(r.Context(), "reauthAt")) > reauthWindow { // FIX: needs a password or 2FA check from the last 5 minutes
		http.Redirect(w, r, "/reauth", http.StatusSeeOther)
		return
	}
	if r.PostFormValue("confirm") != u.Email { // FIX: an explicit, typed confirmation
		http.Error(w, "type your email address to confirm", http.StatusBadRequest)
		return
	}
	if _, err := db.ExecContext(r.Context(), "DELETE FROM users WHERE id = $1", u.ID); err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	sendEmail(u.Email, "Your account was deleted. If this wasn't you, contact support.") // FIX: the owner hears about it
	if err := sessions.Destroy(r.Context()); err != nil {
		slog.Error("session destroy failed", "user_id", u.ID, "err", err)
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```javascript vulnerable
app.post("/account/password", requireLogin, async (req, res) => {
  req.user.passwordHash = await argon2.hash(req.body.newPassword); // BUG: no current password needed
  await req.user.save();
  res.redirect("/account");
});

app.post("/account/email", requireLogin, async (req, res) => {
  req.user.email = req.body.email; // BUG: switched instantly, never verified, and the old address isn't told
  await req.user.save();
  res.redirect("/account");
});
```

```javascript fixed
const REAUTH_MS = 5 * 60 * 1000;
const requireRecentReauth = (req, res, next) =>
  Date.now() - (req.session.reauthAt ?? 0) < REAUTH_MS ? next() : res.redirect("/reauth");

app.post("/account/password", requireLogin, reauthLimiter, async (req, res) => {
  const currentPassword = String(req.body.currentPassword ?? "");
  const newPassword = String(req.body.newPassword ?? "");
  if (!(await argon2.verify(req.user.passwordHash, currentPassword))) { // FIX: current password required
    return res.status(403).send("Current password is wrong");
  }
  const problem = validatePassword(newPassword, req.user.email);
  if (problem) return res.status(400).send(problem);
  req.user.passwordHash = await argon2.hash(newPassword);
  await req.user.save();
  res.redirect("/account");
});

app.post("/account/email", requireLogin, requireRecentReauth, async (req, res) => { // FIX: fresh password or 2FA check
  const newEmail = String(req.body.email ?? "").trim().toLowerCase();
  await sendEmailChangeLinks(req.user, newEmail); // FIX: confirm link to the new address, notice to the old one
  res.status(202).send("Check your new inbox to confirm the change.");
});
```

---

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

## Memory Best Practices Review

These bugs are native to C and C++, where a wrong length writes straight into memory the program never meant to touch. Python, Go, and Node are memory-safe until code reaches for `ctypes` or `cffi`, `unsafe` or cgo, `Buffer.allocUnsafe`, or a native addon, so find those boundaries first: grep for `import ctypes`, `import "C"`, `"unsafe"`, `binding.gyp`, and `.node` files. Away from them the same mistakes still show up, as crashes and memory-exhaustion DoS from trusting a size that came off the wire.

### Buffer overflow prevention

A buffer overflow is a copy that doesn't stop at the end of its destination. In C the extra bytes land on whatever sits next to the buffer (other locals, a saved return address, heap metadata), and that's the classic road to code execution. Managed code only gets there through a native boundary, or it hits a cousin of the bug, like Node handing out memory that was never cleared.

> **Where to look:** native bindings and the handlers that feed them. Grep for `ctypes.memmove`, `create_string_buffer`, `cffi`, `ffi.new` (Python), `import "C"`, `C.strcpy`, `C.CString`, `unsafe.Pointer` (Go), and `Buffer.allocUnsafe`, `binding.gyp`, `node-addon-api` (Node). In the C or C++ underneath, grep for the unbounded calls `gets`, `strcpy`, `sprintf`, `scanf("%s"`, and `strcat`, and check that their bounded versions `fgets`, `strncpy` (or `strlcpy`), `snprintf`, and `strncat` are given the real destination size.
>
> **How to think:** Every copy has three numbers: how big the destination is, how many bytes get copied, and who chose that count. When the count comes from the source (`len(data)`, `strlen(src)`, a field in the request) rather than the destination, you've found it. Validate the input size before anything is read into memory, and size the buffer with one named constant instead of a bare `32` repeated around the file. The bounded functions have traps too: `strncpy` leaves no terminator when the source fills the buffer, and `strncat` takes the space left, not the total size. Stack canaries, ASLR, and `_FORTIFY_SOURCE` make exploitation harder. They don't make the copy correct.

```python vulnerable
import ctypes

lib = ctypes.CDLL("./libparse.so")


@app.post("/parse")
def parse():
    data = request.get_data()
    buf = ctypes.create_string_buffer(32)
    ctypes.memmove(buf, data, len(data))  # BUG: copies as many bytes as the client sent into 32
    return {"result": lib.parse_record(buf)}
```

```python fixed
import ctypes

lib = ctypes.CDLL("./libparse.so")
RECORD_MAX = 32


@app.post("/parse")
def parse():
    data = request.get_data()
    if len(data) >= RECORD_MAX:  # FIX: checked against the constant that sizes the buffer, with a byte left for the NUL
        abort(413)
    buf = ctypes.create_string_buffer(data, RECORD_MAX)  # FIX: ctypes raises instead of writing past the end
    return {"result": lib.parse_record(buf)}
```

```go vulnerable
/*
#include <stdlib.h>
#include <string.h>
#include "parse.h"
*/
import "C"

import "unsafe"

func parseRecord(name string) C.int {
	var buf [32]C.char
	cs := C.CString(name)
	defer C.free(unsafe.Pointer(cs))
	C.strcpy(&buf[0], cs) // BUG: strcpy stops at the NUL, not at 32 bytes
	return C.parse_record(&buf[0])
}
```

```go fixed
/*
#include "parse.h"
*/
import "C"

import (
	"errors"
	"unsafe"
)

const recordMax = 32

var errTooLong = errors.New("record too long")

func parseRecord(name string) (C.int, error) {
	if len(name) >= recordMax { // FIX: rejected before any copy, leaving room for the NUL
		return 0, errTooLong
	}
	var buf [recordMax]byte
	copy(buf[:], name) // FIX: copy never writes past len(buf), and the zeroed tail terminates the string
	return C.parse_record((*C.char)(unsafe.Pointer(&buf[0]))), nil
}
```

```javascript vulnerable
app.post("/records", express.json(), (req, res) => {
  const { name, width } = req.body;
  const record = Buffer.allocUnsafe(width); // BUG: the client picks the size, and the memory isn't zeroed
  record.write(name);
  res.type("application/octet-stream").send(record); // BUG: everything past name is stale heap: old bodies, tokens, keys
});
```

```javascript fixed
const MAX_WIDTH = 4096;

app.post("/records", express.json(), (req, res) => {
  const width = Number(req.body.width);
  const name = String(req.body.name ?? "");
  if (!Number.isInteger(width) || width < 1 || width > MAX_WIDTH) { // FIX: a whole number with an upper bound
    return res.status(400).send("width must be 1 to 4096");
  }
  const record = Buffer.alloc(width, " "); // FIX: filled before use, so no stale memory
  record.write(name); // write() stops at the end of the buffer
  res.type("application/octet-stream").send(record);
});
```

```c vulnerable
#include <stdio.h>

int verify_password(const char *pw);

int main(void) {
    char userPass[5];
    printf("Enter the password:\n");
    gets(userPass); // BUG: no length limit; a long line overwrites the stack past userPass
    if (verify_password(userPass)) {
        printf("PASSWORD VERIFIED\n");
    }
    return 0;
}
```

```c fixed
#include <stdio.h>
#include <string.h>

#define PASS_MAX 128

int verify_password(const char *pw);

int main(void) {
    char userPass[PASS_MAX];
    printf("Enter the password:\n");
    if (fgets(userPass, sizeof userPass, stdin) == NULL) { // FIX: writes at most sizeof userPass bytes, NUL included
        return 1;
    }
    userPass[strcspn(userPass, "\n")] = '\0'; // fgets keeps the newline
    if (verify_password(userPass)) {
        printf("PASSWORD VERIFIED\n");
    }
    return 0;
}
```

### Buffer size management

Size bugs come from two numbers that should agree and don't: the size a buffer was allocated with and the size a read assumes, or a length field in the input that the code takes at face value. In a length-prefixed protocol the length is attacker input like any other field. Trust it and one 4-byte header asks the server to allocate 4 GiB.

> **Where to look:** binary protocol parsers, socket servers, file-format readers, anything that reads a length header and then a body. Grep for `struct.unpack`, `int.from_bytes`, `recv(` (Python), `binary.BigEndian.Uint32`, `make([]byte`, `conn.Read(` (Go), and `readUInt32BE`, `Buffer.allocUnsafe`, `.copy(` (Node). In C, look at `malloc(` next to `ntohl`, `memcpy` lengths, and `sizeof` applied to a pointer instead of the array.
>
> **How to think:** Where does each size come from, and is it capped before it's used to allocate? One named constant should size both the buffer and the read so they can't drift apart; the old C example declared `char userPass[5]` and then called `fgets(userPass, 9, stdin)`, which overflows even though `fgets` is the "safe" function. Is the read exact (`io.ReadFull`, a buffered `read(n)` followed by a length check), or does it take whatever one call happened to return? In C, check the arithmetic as well. Does the allocation leave space for the null terminator (`strlen(s) + 1`)? Can `count * size` wrap around before it reaches `malloc`?

```python vulnerable
def read_frame(rfile) -> bytes:  # rfile = sock.makefile("rb")
    (length,) = struct.unpack(">I", rfile.read(4))
    buf = bytearray(length)  # BUG: the peer picks the size, up to 4 GiB per frame
    rfile.readinto(buf)  # BUG: a peer that hangs up early leaves a zero-filled tail nobody checks
    return bytes(buf)
```

```python fixed
MAX_FRAME = 1 << 20  # the largest message the protocol allows


def read_frame(rfile) -> bytes:  # rfile = sock.makefile("rb")
    header = rfile.read(4)
    if len(header) != 4:
        raise ConnectionError("short header")
    (length,) = struct.unpack(">I", header)
    if length > MAX_FRAME:  # FIX: capped before anything is allocated
        raise ValueError("frame too large")
    payload = rfile.read(length)
    if len(payload) != length:  # FIX: exactly length bytes, or the frame is rejected
        raise ConnectionError("short frame")
    return payload
```

```go vulnerable
func readFrame(r io.Reader) ([]byte, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return nil, err
	}
	n := binary.BigEndian.Uint32(hdr[:])
	buf := make([]byte, n) // BUG: the peer picks n, up to 4 GiB per frame
	_, err := r.Read(buf)  // BUG: Read can return fewer bytes with a nil error
	return buf, err
}
```

```go fixed
const maxFrame = 1 << 20 // the largest message the protocol allows

func readFrame(r io.Reader) ([]byte, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return nil, err
	}
	n := binary.BigEndian.Uint32(hdr[:])
	if n > maxFrame { // FIX: capped before allocation
		return nil, fmt.Errorf("frame of %d bytes exceeds %d", n, maxFrame)
	}
	buf := make([]byte, n)
	if _, err := io.ReadFull(r, buf); err != nil { // FIX: exactly n bytes or an error
		return nil, err
	}
	return buf, nil
}
```

```javascript vulnerable
function readFrame(chunk) {
  const len = chunk.readUInt32BE(0);
  const frame = Buffer.allocUnsafe(len); // BUG: sized by the peer, and not zeroed
  chunk.copy(frame, 0, 4); // BUG: copies what has arrived, maybe far less than len; the rest is stale heap
  return frame;
}
```

```javascript fixed
const MAX_FRAME = 1 << 20; // the largest message the protocol allows

function readFrame(chunk) {
  if (chunk.length < 4) return null; // wait for the rest of the header
  const len = chunk.readUInt32BE(0);
  if (len > MAX_FRAME) throw new Error("frame too large"); // FIX: capped before allocation
  if (chunk.length < 4 + len) return null; // wait for the rest of the frame
  const frame = Buffer.alloc(len); // FIX: zero-filled
  chunk.copy(frame, 0, 4, 4 + len); // FIX: copies exactly len bytes
  return frame;
}
```

### Off-by-one errors

An off-by-one is a bounds check or loop that's wrong by exactly one, nearly always `<=` where `<` belongs. In C that writes one byte past the buffer, often the null terminator, and a single byte is enough to corrupt the next variable. Go panics, Python wraps a negative index around to the end of the list, and JavaScript hands back `undefined` that blows up a line later.

> **Where to look:** hand-written index checks in handlers, pagination and slicing helpers, ring buffers, manual loops over arrays. Grep for `<= len(` (Python and Go), `<=` next to `.length` (Node), `- 1]` and `+ 1]` in all three, and in C `<= MAX`, `<= sizeof`, and running totals fed to `strncat`.
>
> **How to think:** Run the boundary values through the check in your head: -1, 0, `len - 1`, `len`, `len + 1`. Valid indexes form the half-open range `0 <= i < len`, so `<=` against a length is almost always wrong, and a check with no lower bound is wrong in Python, where `items[-1]` is perfectly legal. Loops get the same treatment, since `for i := 0; i <= n; i++` runs n + 1 times. The old C example kept a running `total` and appended with `strncat` while `total <= MAX_SIZE`, which allows exactly MAX_SIZE characters and leaves no room for the terminator; `total < MAX_SIZE` fixes it. And a crash is a DoS. Go's `net/http` recovers a panicking handler, but a panic in a goroutine you started kills the process, and in Express 4 a throw inside an async handler becomes an unhandled rejection that takes Node down.

```python vulnerable
@app.get("/carts/<cart_id>/item")
def cart_item(cart_id):
    items = load_cart(cart_id).items  # scoped to current_user (see IDOR)
    idx = request.args.get("i", default=0, type=int)
    if idx <= len(items):  # BUG: idx == len(items) passes, and nothing stops -1
        return items[idx].to_dict()  # IndexError at len; -1 quietly reads from the end
    abort(404)
```

```python fixed
@app.get("/carts/<cart_id>/item")
def cart_item(cart_id):
    items = load_cart(cart_id).items  # scoped to current_user (see IDOR)
    idx = request.args.get("i", default=0, type=int)
    if 0 <= idx < len(items):  # FIX: both ends checked, half-open range
        return items[idx].to_dict()
    abort(404)
```

```go vulnerable
mux.HandleFunc("GET /carts/{id}/item", func(w http.ResponseWriter, r *http.Request) {
	items, err := cartItems(r.Context(), r.PathValue("id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	i, _ := strconv.Atoi(r.URL.Query().Get("i"))
	if i <= len(items) { // BUG: i == len(items) passes, and so does any negative i
		json.NewEncoder(w).Encode(items[i]) // index out of range: panic
		return
	}
	http.NotFound(w, r)
})
```

```go fixed
mux.HandleFunc("GET /carts/{id}/item", func(w http.ResponseWriter, r *http.Request) {
	items, err := cartItems(r.Context(), r.PathValue("id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	i, err := strconv.Atoi(r.URL.Query().Get("i"))
	if err != nil || i < 0 || i >= len(items) { // FIX: both bounds, and len itself is out
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(items[i])
})
```

```javascript vulnerable
app.get("/carts/:id/item", async (req, res) => {
  const items = await cartItems(req.params.id);
  const i = Number(req.query.i);
  if (i <= items.length) { // BUG: lets through items.length, negatives, and fractions
    return res.json({ sku: items[i].sku, qty: items[i].qty }); // items[i] is undefined, so .sku throws
  }
  res.sendStatus(404);
});
```

```javascript fixed
app.get("/carts/:id/item", async (req, res) => {
  const items = await cartItems(req.params.id);
  const i = Number(req.query.i);
  if (Number.isInteger(i) && i >= 0 && i < items.length) { // FIX: a whole number in [0, length)
    return res.json({ sku: items[i].sku, qty: items[i].qty });
  }
  res.sendStatus(404);
});
```

### Format string injection

A format string tells the formatter how to read its arguments. Hand that string to a user and they decide what gets read: in C, `%x` walks the stack and `%n` writes to memory; in Python, `str.format` follows attribute and index lookups wherever the template points; in Go and Node, the user picks how the arguments get rendered.

> **Where to look:** any formatter call whose first argument isn't a literal: tenant-editable email or notification templates, error-message helpers, log wrappers. Grep for `.format(` and `format_map(` on request or database values (Python), `Printf(`, `Sprintf(`, `Fprintf(` with a variable first argument (Go), and `util.format(` or `console.log(` with a variable first argument (Node). In C, look for `printf(`, `fprintf(`, and `syslog(` called with a single non-literal argument.
>
> **How to think:** Is the format a constant a developer wrote? If a user or tenant controls it, what can it reach? C's `printf(user_input)` is the original, so the fix there is `printf("%s", user_input)`, or a generic `printf("Invalid credentials.")` that echoes nothing, as in the old login example. Python's `str.format` can't write memory, but `{user.__init__.__globals__}` walks into module globals and `{user.name:>999999999}` allocates a gigabyte. Go can't corrupt memory this way either. The honest impact is garbled output like `%!d(MISSING)`, forged log lines, and, when a struct is among the arguments, a full field dump through `%#v`, which ignores the type's `String` method. Since Go 1.24, `go vet` flags a non-constant format with no other arguments; one built by concatenation with arguments after it slips past. Node's `util.format` lets the template choose `%j` or `%o` for an object argument, and a template with no specifier at all appends the object anyway. When user text belongs in the output, pass it as an argument (`fmt.Sprintf("%s", msg)`, `util.format("%s", msg)`) or as a structured log field.

```python vulnerable
@dataclass
class Recipient:
    name: str
    email: str


@app.post("/admin/greeting/preview")
@admin_required
def preview_greeting():
    template = request.form["template"]  # e.g. "Hi {user.name}!"
    user = Recipient(current_user.name, current_user.email)
    return {"preview": template.format(user=user)}  # BUG: "{user.__init__.__globals__[app].config[SECRET_KEY]}" reaches the Flask config
```

```python fixed
@app.post("/admin/greeting/preview")
@admin_required
def preview_greeting():
    template = request.form["template"]  # e.g. "Hi $name!"
    values = {"name": current_user.name, "email": current_user.email}  # FIX: plain strings, nothing to traverse
    return {"preview": string.Template(template).safe_substitute(values)}  # FIX: $name lookups only, no attributes or indexes
```

```go vulnerable
mux.HandleFunc("POST /client-errors", func(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	msg := r.PostFormValue("message")
	log.Printf("client error, user %d: "+msg, currentUser(r).ID) // BUG: verbs in msg print %!v(MISSING) junk, and a \n starts a fake line
	fmt.Fprintf(w, "Logged: "+msg)                               // BUG: user text is the format string
})
```

```go fixed
mux.HandleFunc("POST /client-errors", func(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	msg := r.PostFormValue("message")
	slog.Warn("client_error", "user_id", currentUser(r).ID, "message", msg) // FIX: user text travels as a value
	fmt.Fprint(w, "Logged.")                                                // FIX: constant reply, nothing echoed
})
```

```javascript vulnerable
// req.user is a User whose toString() returns the display name
app.post("/admin/greeting/preview", requireAdmin, (req, res) => {
  const template = String(req.body.template ?? ""); // e.g. "Hi %s!"
  if (template.length > 500) return res.status(400).send("template too long");
  res.json({ preview: util.format(template, req.user) }); // BUG: "%j" or "%o" dumps every field of req.user, passwordHash included
});
```

```javascript fixed
// req.user is a User whose toString() returns the display name
app.post("/admin/greeting/preview", requireAdmin, (req, res) => {
  const template = String(req.body.template ?? ""); // e.g. "Hi %s!"
  if (template.length > 500) return res.status(400).send("template too long");
  res.json({ preview: util.format(template, String(req.user.name)) }); // FIX: the only argument is a plain string
});
```

### Memory management

C makes you free memory by hand, which brings leaks, use-after-free, and double free. Garbage-collected languages free whatever's unreachable, so their leaks are things that stay reachable forever, and the one an attacker can drive is a long-lived map or cache keyed by a value they choose. Send enough distinct keys and the process gets OOM-killed.

> **Where to look:** module-level dicts, maps, and arrays that request handlers write to, home-grown caches, and memoization. Grep for `= {}` at module scope, `@functools.cache`, `lru_cache(maxsize=None)` (Python), package-level `map[` and `sync.Map` (Go), and module-level `new Map()` or `new Set()`, plus `.on(` inside request handlers (Node).
>
> **How to think:** For every long-lived collection, ask what the key is, who controls it, and what ever removes an entry. If nothing removes entries and the client picks the key, one script looping over random values eats the heap. Cap the entry count, add a TTL so stale data ages out, and remember that `functools.cache` is `lru_cache(maxsize=None)`, which never evicts. Other GC-language leaks are quieter. A goroutine blocked forever on a channel nobody reads, or on an outbound call with no timeout, keeps its stack and everything it references. A Node handler that calls `emitter.on(...)` per request adds a listener that never goes away; Node starts warning past 10. Go nil dereferences mostly come from ignored errors: `u, _ := findUser(id)` followed by `u.Name` panics the moment the lookup fails. Use-after-free and double free live in C, C++, native addons, and code that frees C memory by hand through cgo or ctypes. There, check every `malloc` result for NULL, give each allocation a single owner, free it exactly once (`defer C.free(...)` right after `C.CString`), null the pointer afterwards, and run the native tests under AddressSanitizer or Valgrind.

```python vulnerable
_cards: dict[str, dict | None] = {}


def user_card(username: str) -> dict | None:
    if username not in _cards:
        user = User.query.filter_by(username=username).first()
        _cards[username] = {"name": user.name, "bio": user.bio} if user else None  # BUG: every name ever asked for stays, misses included
    return _cards[username]


@app.get("/users/<username>/card")
def card(username):
    return user_card(username) or abort(404)
```

```python fixed
from cachetools import TTLCache, cached

_cards = TTLCache(maxsize=10_000, ttl=600)  # FIX: 10,000 entries at most, each gone after 10 minutes


@cached(cache=_cards, lock=threading.Lock())  # cachetools caches need a lock under threaded servers
def user_card(username: str) -> dict | None:
    user = User.query.filter_by(username=username).first()
    return {"name": user.name, "bio": user.bio} if user else None


@app.get("/users/<username>/card")
def card(username):
    return user_card(username) or abort(404)
```

```go vulnerable
var (
	mu    sync.Mutex
	cards = map[string]*Card{} // BUG: no size cap and no eviction
)

func userCard(ctx context.Context, username string) (*Card, error) {
	mu.Lock()
	c, ok := cards[username]
	mu.Unlock()
	if ok {
		return c, nil
	}
	c, err := loadCard(ctx, username)
	if err != nil {
		return nil, err
	}
	mu.Lock()
	cards[username] = c // BUG: one entry per distinct name an attacker sends
	mu.Unlock()
	return c, nil
}
```

```go fixed
import lru "github.com/hashicorp/golang-lru/v2"

var cards *lru.Cache[string, *Card]

func init() {
	c, err := lru.New[string, *Card](10_000) // FIX: at most 10,000 entries, least recently used evicted first
	if err != nil {
		panic(err) // only fails for a size <= 0
	}
	cards = c
}

func userCard(ctx context.Context, username string) (*Card, error) {
	if c, ok := cards.Get(username); ok { // the cache does its own locking
		return c, nil
	}
	c, err := loadCard(ctx, username)
	if err != nil {
		return nil, err
	}
	cards.Add(username, c) // FIX: a flood of random names only churns the oldest entries
	return c, nil
}
```

```javascript vulnerable
const cards = new Map(); // BUG: nothing ever evicts

app.get("/users/:username/card", async (req, res) => {
  const { username } = req.params;
  if (!cards.has(username)) {
    cards.set(username, await loadCard(username)); // BUG: one entry per distinct name, misses included
  }
  const card = cards.get(username);
  if (!card) return res.sendStatus(404);
  res.json(card);
});
```

```javascript fixed
const { LRUCache } = require("lru-cache");

const cards = new LRUCache({ max: 10_000, ttl: 600_000 }); // FIX: 10,000 entries at most, each gone after 10 minutes

app.get("/users/:username/card", async (req, res) => {
  let card = cards.get(req.params.username);
  if (!card) {
    card = await loadCard(req.params.username);
    if (!card) return res.sendStatus(404);
    cards.set(req.params.username, card); // FIX: bounded, so random names only push out the oldest entries
  }
  res.json(card);
});
```

---

## File Handling Review

File handling bugs sit wherever a request touches the filesystem: upload endpoints, download routes, static file mounts, report and export generators, and any loader that picks a module or template by name. Find where uploaded bytes land on disk and how they get back out first. Then search for every file open, send, or import whose path includes something from the request.

### File upload security

Unless the code says otherwise, an upload handler writes a stranger's bytes to your disk under a name the stranger picked. Trust the client's filename and Content-Type, skip the size cap, save into a folder the web server serves, and you get stored XSS from an `.html` or `.svg` file, users overwriting each other's files, a full disk, and on PHP-style stacks a web shell.

> **Where to look:** upload routes, the helper that writes to disk or object storage, and the app's body-size config. Grep for `request.files`, `.save(`, `secure_filename`, `MAX_CONTENT_LENGTH` (Python), `FormFile`, `ParseMultipartForm`, `MaxBytesReader` (Go), and `multer(`, `diskStorage`, `originalname`, `mimetype` (Node).
>
> **How to think:** Sort every value the handler uses into "the client said so" and "we measured it." The filename, the extension, and the part's Content-Type are claims; the byte count and the leading magic bytes are facts. Is there a hard size cap that stops reading before the body fills memory or disk, and does the proxy (nginx `client_max_body_size`) enforce one too? Is the type check an allowlist of real signatures, and does the server generate the stored name? Keep the original name only as metadata for display, passed through `secure_filename` or escaped on output. Magic bytes can be faked with a polyglot, say a valid PNG header with HTML or PHP behind it, so for images re-encode with Pillow, Go's `image/png`, or sharp, which also strips EXIF data. Then find the malware scanning hook: a ClamAV (clamd) call or an async scan queue should run before the file is marked available, with a quarantine state in between. Last question: can a browser reach the saved file by its path? If so, keep reading.

```python vulnerable
UPLOAD_DIR = "static/uploads"  # Flask serves this folder at /static/uploads


@app.post("/avatar")
@login_required
def upload_avatar():
    f = request.files["file"]
    if f.mimetype not in ("image/png", "image/jpeg"):  # BUG: mimetype is whatever Content-Type the client sent
        return "PNG or JPEG only", 400
    f.save(os.path.join(UPLOAD_DIR, f.filename))  # BUG: client's name (even ../app.py) in a public folder, no size cap
    return {"url": f"/static/uploads/{f.filename}"}
```

```python fixed
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # FIX: Flask answers 413 past 5 MB
UPLOAD_DIR = Path("/srv/app-data/uploads")  # outside the web root (see File storage)
SIGNATURES = {b"\x89PNG\r\n\x1a\n": ("png", "image/png"), b"\xff\xd8\xff": ("jpg", "image/jpeg")}


@app.post("/avatar")
@login_required
def upload_avatar():
    data = request.files["file"].read()
    kind = next((v for magic, v in SIGNATURES.items() if data.startswith(magic)), None)  # FIX: trust the bytes, not the headers
    if kind is None:
        return "PNG or JPEG only", 400
    ext, content_type = kind
    stored_name = f"{uuid.uuid4().hex}.{ext}"  # FIX: server-chosen name, nothing from the client
    (UPLOAD_DIR / stored_name).write_bytes(data)
    upload = Upload(owner_id=current_user.id, stored_name=stored_name, content_type=content_type)
    db.session.add(upload)
    db.session.commit()
    return {"id": upload.id}, 201
```

```go vulnerable
func uploadAvatar(w http.ResponseWriter, r *http.Request) {
	file, header, err := r.FormFile("file") // BUG: no cap on the body; big parts spill to temp files
	if err != nil {
		http.Error(w, "bad upload", http.StatusBadRequest)
		return
	}
	defer file.Close()
	if ct := header.Header.Get("Content-Type"); ct != "image/png" && ct != "image/jpeg" { // BUG: the client wrote this header
		http.Error(w, "PNG or JPEG only", http.StatusUnsupportedMediaType)
		return
	}
	dst, err := os.Create(filepath.Join("static/uploads", header.Filename)) // BUG: client's name and extension, in a public folder
	if err != nil {
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	io.Copy(dst, file)
	fmt.Fprintf(w, "/static/uploads/%s\n", header.Filename)
}
```

```go fixed
var allowedTypes = map[string]string{"image/png": ".png", "image/jpeg": ".jpg"}

func uploadAvatar(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20) // FIX: reads past 5 MB fail
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "bad or oversized upload", http.StatusBadRequest)
		return
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	ctype := http.DetectContentType(data) // FIX: sniff the bytes, ignore the client's header
	ext, ok := allowedTypes[ctype]
	if err != nil || !ok {
		http.Error(w, "PNG or JPEG only", http.StatusUnsupportedMediaType)
		return
	}
	name := uuid.NewString() + ext // FIX: server-chosen name
	if err := os.WriteFile(filepath.Join(uploadDir, name), data, 0o640); err != nil { // uploadDir sits outside the web root
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	if err := recordUpload(r.Context(), currentUser(r).ID, name, ctype); err != nil {
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}
```

```javascript vulnerable
const upload = multer({ // BUG: no limits, so any size is accepted
  storage: multer.diskStorage({
    destination: "public/uploads",
    filename: (req, file, cb) => cb(null, file.originalname), // BUG: client's name, in a folder express.static serves
  }),
});

app.post("/avatar", requireUser, upload.single("file"), (req, res) => {
  if (!["image/png", "image/jpeg"].includes(req.file.mimetype)) { // BUG: client's Content-Type, checked after the file is on disk
    return res.status(400).send("PNG or JPEG only");
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});
```

```javascript fixed
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // FIX: multer aborts past 5 MB
});

const SIGNATURES = [
  { magic: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ext: "png", type: "image/png" },
  { magic: Buffer.from([0xff, 0xd8, 0xff]), ext: "jpg", type: "image/jpeg" },
];

app.post("/avatar", requireUser, upload.single("file"), async (req, res) => {
  const sig = req.file && SIGNATURES.find((s) => req.file.buffer.subarray(0, s.magic.length).equals(s.magic)); // FIX: check the real leading bytes
  if (!sig) return res.status(415).send("PNG or JPEG only");
  const storedName = `${crypto.randomUUID()}.${sig.ext}`; // FIX: server-chosen name
  await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), req.file.buffer); // UPLOAD_DIR is outside public/
  const rec = await Upload.create({ ownerId: req.user.id, storedName, contentType: sig.type });
  res.status(201).json({ id: rec.id });
});
```

### File storage

A perfectly validated upload is still a problem if the folder it lands in is served as static files. Anyone with the URL can fetch it, no login or ownership check ever runs, and the server picks the Content-Type from the extension, so HTML and SVG render inline on your origin.

> **Where to look:** static file mounts, web server config, and the routes that hand files back. Grep for `static_folder`, `send_from_directory`, `send_file` (Python), `http.FileServer`, `http.Dir`, `ServeFile` (Go), and `express.static`, `res.sendFile`, `res.download` (Node). Outside the code, check nginx `location` blocks and bucket policies for anything public.
>
> **How to think:** Could I fetch someone else's file by guessing, sharing, or leaking its URL? Every download should go through a handler that checks login and ownership (or an explicit grant) on each request and builds the path from the database record, never from the request. Then read the response headers. The Content-Type should be the one recorded at upload; `Content-Disposition: attachment` stops inline rendering; `X-Content-Type-Options: nosniff` stops the browser from sniffing HTML out of a "PNG." For object storage, keep buckets private and hand out short-lived signed URLs after the same check. If users really must view files inline, serve them from a separate cookieless domain so a script inside one can't reach your session.

```python vulnerable
app = Flask(__name__, static_folder="uploads", static_url_path="/files")  # BUG: every stored file is public at /files/<name>


@app.post("/documents")
@login_required
def upload_document():
    stored_name = save_upload(request.files["file"])  # see File upload security
    db.session.add(Document(owner_id=current_user.id, stored_name=stored_name))
    db.session.commit()
    return {"url": f"/files/{stored_name}"}  # BUG: knowing the URL is the only check, and the browser renders it inline
```

```python fixed
UPLOAD_DIR = "/srv/app-data/uploads"  # not under any static folder


@app.get("/files/<int:doc_id>")
@login_required
def download(doc_id):
    doc = db.get_or_404(Document, doc_id)
    if doc.owner_id != current_user.id and not current_user.can_read(doc):  # FIX: owner or explicit grant, on every request
        abort(404)
    resp = send_from_directory(UPLOAD_DIR, doc.stored_name, mimetype=doc.content_type, as_attachment=True)  # FIX: stored type, forced download
    resp.headers["X-Content-Type-Options"] = "nosniff"  # FIX: the browser can't second-guess the type
    return resp
```

```go vulnerable
mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads")))) // BUG: no login or owner check, and /uploads/ lists every file

mux.HandleFunc("POST /documents", func(w http.ResponseWriter, r *http.Request) {
	name, err := saveUpload(r) // see File upload security
	if err != nil {
		http.Error(w, "bad upload", http.StatusBadRequest)
		return
	}
	fmt.Fprintf(w, "/uploads/%s\n", name) // BUG: FileServer guesses the type from the extension and serves it inline
})
```

```go fixed
mux.HandleFunc("GET /files/{id}", func(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r) // nil when the request is anonymous
	var doc Document
	err := db.QueryRowContext(r.Context(), "SELECT owner_id, stored_name, content_type FROM documents WHERE id = $1",
		r.PathValue("id")).Scan(&doc.OwnerID, &doc.StoredName, &doc.ContentType)
	if user == nil || err != nil || (doc.OwnerID != user.ID && !canRead(user, doc)) { // FIX: owner or explicit grant, every request
		http.NotFound(w, r)
		return
	}
	f, err := os.Open(filepath.Join(uploadDir, doc.StoredName)) // name from the DB, never the request
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	h := w.Header()
	h.Set("Content-Type", doc.ContentType) // FIX: the type recorded at upload, not a guess
	h.Set("Content-Disposition", "attachment")
	h.Set("X-Content-Type-Options", "nosniff") // FIX: no inline rendering, no sniffing
	io.Copy(w, f)
})
```

```javascript vulnerable
app.use("/uploads", express.static("uploads")); // BUG: no login or owner check; .html and .svg render inline

app.post("/documents", requireUser, upload.single("file"), async (req, res) => {
  const doc = await Document.create({ ownerId: req.user.id, storedName: req.file.filename });
  res.json({ url: `/uploads/${doc.storedName}` }); // BUG: the URL is the whole access control
});
```

```javascript fixed
app.get("/files/:id", requireUser, async (req, res) => {
  const doc = await Document.findByPk(req.params.id);
  if (!doc || (doc.ownerId !== req.user.id && !(await canRead(req.user, doc)))) { // FIX: owner or explicit grant, every request
    return res.sendStatus(404);
  }
  res.set({
    "Content-Type": doc.contentType, // FIX: the type recorded at upload
    "Content-Disposition": "attachment",
    "X-Content-Type-Options": "nosniff", // FIX: no inline rendering, no sniffing
  });
  res.sendFile(doc.storedName, { root: UPLOAD_DIR }); // UPLOAD_DIR is never mounted with express.static
});
```

### Path traversal

Join a filename from the request onto a base directory and `../` sequences, or a plain absolute path, walk right out of it. `?name=../../../etc/passwd` reads system files, and on the write side the same bug overwrites code or config.

> **Where to look:** every file open, send, delete, or write whose path includes request data. Grep for `open(`, `send_file`, `os.path.join`, `Path(` (Python), `filepath.Join`, `os.Open`, `ServeFile` (Go), and `path.join`, `fs.readFile`, `createReadStream`, `res.sendFile` (Node).
>
> **How to think:** The strongest fix keeps user input out of paths entirely: store files under generated names and look them up by ID, the way the old Java example mapped `fileId` to an entry in `availableFiles`. When a name has to come from the request, canonicalize it and then check containment, in that order, on the fully decoded value. Expect `%2e%2e%2f`, double encoding, `..\` aimed at Windows hosts, and absolute paths: `os.path.join(base, "/etc/passwd")` and pathlib's `/` both throw the base away, and so does Node's `path.resolve`. A prefix check needs the trailing separator, or `/srv/app/reports-old` passes as inside `/srv/app/reports`. Node's `path.resolve` doesn't follow symlinks, so call `fs.realpath` first if anything can create links in that directory. Archives count too. Zip slip is this exact bug with entry names like `../../app/config.py`, so every entry needs the same check before extraction (`tarfile`'s `filter="data"` does it in Python 3.12+). Framework helpers such as Flask's `send_from_directory` and Express's `res.sendFile(name, { root })` already check containment, and they beat a hand-built join.

```python vulnerable
BASE = "/srv/app/reports"


@app.get("/reports")
@login_required
def get_report():
    name = request.args["name"]
    return send_file(os.path.join(BASE, name))  # BUG: "../../../etc/passwd" or "/etc/passwd" escapes BASE
```

```python fixed
BASE = Path("/srv/app/reports").resolve()  # resolved once, so symlinks in the base path compare correctly


@app.get("/reports")
@login_required
def get_report():
    target = BASE.joinpath(request.args.get("name", "")).resolve()  # FIX: collapses "..", follows symlinks
    if not target.is_relative_to(BASE) or not target.is_file():  # FIX: must still sit under BASE
        abort(404)
    return send_file(target)
```

```go vulnerable
const reportDir = "/srv/app/reports"

func getReport(w http.ResponseWriter, r *http.Request) {
	f, err := os.Open(filepath.Join(reportDir, r.URL.Query().Get("name"))) // BUG: Join cleans "../../../etc/passwd" down to /etc/passwd
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	io.Copy(w, f)
}
```

```go fixed
var reportRoot = mustOpenRoot("/srv/app/reports")

func mustOpenRoot(dir string) *os.Root {
	root, err := os.OpenRoot(dir) // FIX: Go 1.24+; on older Go, reject names that fail filepath.IsLocal
	if err != nil {
		log.Fatal(err)
	}
	return root
}

func getReport(w http.ResponseWriter, r *http.Request) {
	f, err := reportRoot.Open(r.URL.Query().Get("name")) // FIX: absolute paths, ".." escapes, and symlinks out of the root all fail
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	io.Copy(w, f)
}
```

```javascript vulnerable
const BASE = "/srv/app/reports";

app.get("/reports", requireUser, (req, res) => {
  const file = path.join(BASE, String(req.query.name ?? "")); // BUG: join turns "../../../etc/passwd" into /etc/passwd
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.sendStatus(404);
  });
});
```

```javascript fixed
const BASE = path.resolve("/srv/app/reports");

app.get("/reports", requireUser, (req, res) => {
  const file = path.resolve(BASE, String(req.query.name ?? "")); // FIX: absolute path with ".." collapsed
  if (!file.startsWith(BASE + path.sep)) return res.sendStatus(404); // FIX: the separator keeps "/srv/app/reports-old" out
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.sendStatus(404);
  });
});
```

### Local and remote file inclusion

File inclusion means the request decides which code or template the server loads. Point the name at `../`, at a file you managed to upload, or at a module with side effects, and the server reads it, renders it, or runs it.

> **Where to look:** plugin loaders, theme and template pickers, export-format switches, and anything that renders a template whose name isn't a string literal. Grep for `importlib.import_module`, `__import__`, `render_template(` with a variable, `exec(` (Python), `template.ParseFiles`, `ParseGlob`, `plugin.Open` (Go), and `require(` with a template literal, `import(`, `res.render(req.`, `vm.run` (Node).
>
> **How to think:** Can any request value change which file gets loaded, parsed, or executed? If yes, the set of possible files has to be closed and decided at deploy time (a dict, a map, a switch), with paths that come from configuration as absolute paths. Watch the indirect routes in too: a template name an admin saved in the database, a theme setting, an upload that lands inside `views/` or on `sys.path`. With Go templates, an uploaded file full of `{{ }}` actions runs against whatever data you pass in. Classic RFI is a PHP thing, `include($_GET['page'])` with `allow_url_include` switched on, and Python, Go, and Node can't import a URL directly. Their version is code that fetches and then runs: `exec(requests.get(url).text)`, `vm.runInNewContext(await (await fetch(url)).text())` (and Node's `vm` isn't a security boundary), `pip install` or `npm install` at runtime, or `plugin.Open` on a downloaded `.so`. If remote code really has to run, pin it by hash and review it like any other dependency.

```python vulnerable
@app.get("/widgets")
@login_required
def widget():
    plugin = request.args["plugin"]
    module = importlib.import_module(plugin)  # BUG: the caller picks any module on sys.path, and its top-level code runs
    return module.render(current_user)
```

```python fixed
from widgets import activity, billing, usage

WIDGETS = {"activity": activity, "billing": billing, "usage": usage}  # FIX: every loadable widget, fixed at deploy time


@app.get("/widgets")
@login_required
def widget():
    module = WIDGETS.get(request.args.get("plugin", ""))  # FIX: unknown names never reach an importer
    if module is None:
        abort(404)
    return module.render(current_user)
```

```go vulnerable
func help(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("views/help/" + r.URL.Query().Get("page")) // BUG: "../../../etc/passwd" gets parsed and printed as a template
	if err != nil {
		http.NotFound(w, r)
		return
	}
	tmpl.Execute(w, currentUser(r))
}
```

```go fixed
var helpPages = template.Must(template.ParseGlob("views/help/*.html")) // parsed once at startup

var helpTopics = map[string]string{ // FIX: topic name to template, and nothing else loads
	"billing": "billing.html",
	"privacy": "privacy.html",
	"api":     "api.html",
}

func help(w http.ResponseWriter, r *http.Request) {
	name, ok := helpTopics[r.URL.Query().Get("page")] // FIX: unknown topics stop here
	if !ok {
		http.NotFound(w, r)
		return
	}
	if err := helpPages.ExecuteTemplate(w, name, currentUser(r)); err != nil {
		slog.Error("render help page", "page", name, "err", err)
	}
}
```

```javascript vulnerable
app.get("/widgets", requireUser, async (req, res) => {
  const plugin = require(`./plugins/${req.query.name}`); // BUG: "../" reaches any .js or .json file, and require runs it
  res.json(await plugin.render(req.user));
});

app.get("/pages", (req, res) => {
  res.render(req.query.view); // BUG: Express resolves the view name as a path, so "../" walks out of views/
});
```

```javascript fixed
const PLUGINS = new Map([ // FIX: every loadable plugin, required at startup
  ["activity", require("./plugins/activity")],
  ["usage", require("./plugins/usage")],
]);
const PAGES = new Set(["about", "pricing", "terms"]);

app.get("/widgets", requireUser, async (req, res) => {
  const plugin = PLUGINS.get(String(req.query.name)); // FIX: Map lookup, so "__proto__" and "../x" both miss
  if (!plugin) return res.sendStatus(404);
  res.json(await plugin.render(req.user));
});

app.get("/pages", (req, res) => {
  const view = String(req.query.view);
  if (!PAGES.has(view)) return res.sendStatus(404); // FIX: allowlisted view names only
  res.render(view);
});
```

---

## Input Validation Review

Input validation lives at the edge of the app: request handlers, schema modules, middleware, and anything that reads a header, cookie, query string, or webhook body. Find every path a stranger's bytes take before they become a query argument, a filename, a redirect target, or HTML. A validator package in `requirements.txt` does not mean the check ran on this field, in this handler, on the value that is about to be used.

### Comprehensive input validation

Every value that crosses the trust boundary needs a type, a length, a range, and a format check, including the boring ones. Teams validate `email` and then pass `title`, `priority`, and a query-string `queue` straight through. One skipped field is enough.

> **Where to look:** create and update handlers, webhook receivers, batch import jobs, and the schema layer (`pydantic` models, Go request structs, `zod` / `joi` schemas). Grep for `request.get_json()`, `request.args`, `request.headers` (Python), `r.URL.Query()`, `json.NewDecoder` (Go), and `req.body`, `req.query`, `req.headers` (Node). Then list the fields the handler actually reads and ask which of them have a check.
>
> **How to think:** Make a table: source (body, query, path, header, cookie, file) against each field the code uses. Anything in the used column with no rule is a finding. Did the check run on the value after the framework's one decode, not on a copy that gets transformed later? Output Encoding covers the decode-then-check order. Extra keys written onto a model are Mass assignment in that same section. Here the question is simpler. Did every field you use get a real check?

```python vulnerable
@app.post("/api/tickets")
@login_required
def create_ticket():
    data = request.get_json()
    if "@" not in data.get("email", ""):  # BUG: one ad-hoc check; title, priority, and the query string are free
        return {"error": "bad email"}, 400
    ticket = Ticket(
        title=data["title"],
        priority=data.get("priority", "low"),
        reporter=data["email"],
        queue=request.args.get("queue", "general"),  # BUG: query string never validated
        assignee_id=data.get("assignee_id", current_user.id),  # BUG: client picks the owner
    )
    db.session.add(ticket)
    db.session.commit()
    return {"id": ticket.id}, 201
```

```python fixed
class TicketIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    priority: Literal["low", "normal", "high"]
    email: str = Field(max_length=254, pattern=r"^[^@]+@[^@]+\.[^@]+$")


QUEUES = frozenset({"general", "billing", "abuse"})


@app.post("/api/tickets")
@login_required
def create_ticket():
    try:
        body = TicketIn.model_validate(request.get_json())  # FIX: type, length, format on every body field
    except ValidationError:
        return {"error": "invalid ticket"}, 422
    queue = request.args.get("queue", "general")
    if queue not in QUEUES:  # FIX: the query param has a rule too
        return {"error": "invalid queue"}, 422
    ticket = Ticket(
        title=body.title, priority=body.priority, reporter=body.email,
        queue=queue, assignee_id=current_user.id,  # FIX: server sets the owner
    )
    db.session.add(ticket)
    db.session.commit()
    return {"id": ticket.id}, 201
```

```go vulnerable
type ticketIn struct {
	Title      string `json:"title"`
	Priority   string `json:"priority"`
	Email      string `json:"email"`
	AssigneeID int64  `json:"assignee_id"`
}

func createTicket(w http.ResponseWriter, r *http.Request) {
	var in ticketIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if !strings.Contains(in.Email, "@") { // BUG: one check; title, priority, queue, and owner are free
		http.Error(w, "bad email", http.StatusBadRequest)
		return
	}
	id, _ := insertTicket(r.Context(), in.Title, in.Priority, in.Email, r.URL.Query().Get("queue"), in.AssigneeID) // BUG: query and owner unchecked
	fmt.Fprintf(w, `{"id":%d}`, id)
}
```

```go fixed
type ticketIn struct {
	Title    string `json:"title"`
	Priority string `json:"priority"`
	Email    string `json:"email"`
}

var ticketEmail = regexp.MustCompile(`^[^@]+@[^@]+\.[^@]+$`)

func createTicket(w http.ResponseWriter, r *http.Request) {
	var in ticketIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	titleLen := utf8.RuneCountInString(in.Title)
	if titleLen < 1 || titleLen > 120 || !ticketEmail.MatchString(in.Email) { // FIX: length and format on the fields we use
		http.Error(w, "invalid ticket", http.StatusUnprocessableEntity)
		return
	}
	switch in.Priority {
	case "low", "normal", "high":
	default:
		http.Error(w, "invalid ticket", http.StatusUnprocessableEntity)
		return
	}
	queue := r.URL.Query().Get("queue")
	if queue == "" {
		queue = "general"
	}
	switch queue {
	case "general", "billing", "abuse": // FIX: query param allowlist
	default:
		http.Error(w, "invalid queue", http.StatusUnprocessableEntity)
		return
	}
	id, err := insertTicket(r.Context(), in.Title, in.Priority, in.Email, queue, currentUser(r).ID) // FIX: server sets the owner
	if err != nil {
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, `{"id":%d}`, id)
}
```

```javascript vulnerable
app.post("/api/tickets", requireUser, express.json(), async (req, res) => {
  if (!String(req.body.email ?? "").includes("@")) { // BUG: one check; the rest of the body and the query string skate through
    return res.status(400).json({ error: "bad email" });
  }
  const ticket = await Ticket.create({
    title: req.body.title,
    priority: req.body.priority ?? "low",
    reporter: req.body.email,
    queue: req.query.queue ?? "general", // BUG: query string never validated
    assigneeId: req.body.assigneeId ?? req.user.id, // BUG: client picks the owner
  });
  res.status(201).json({ id: ticket.id });
});
```

```javascript fixed
const TicketIn = z.object({
  title: z.string().min(1).max(120),
  priority: z.enum(["low", "normal", "high"]),
  email: z.string().email().max(254),
});
const Queue = z.enum(["general", "billing", "abuse"]);

app.post("/api/tickets", requireUser, express.json(), async (req, res) => {
  const body = TicketIn.safeParse(req.body); // FIX: type, length, format on every body field
  if (!body.success) return res.status(422).json({ error: "invalid ticket" });
  const queue = Queue.safeParse(req.query.queue ?? "general"); // FIX: the query param has a rule too
  if (!queue.success) return res.status(422).json({ error: "invalid queue" });
  const ticket = await Ticket.create({
    ...body.data,
    reporter: body.data.email,
    queue: queue.data,
    assigneeId: req.user.id, // FIX: server sets the owner
  });
  res.status(201).json({ id: ticket.id });
});
```

### Validation approaches

A blocklist of characters you dislike (`<`, `>`, `..`, `;`) looks busy and still loses. The next encoding, a fullwidth slash, or a character you forgot slips through. An allowlist names the exact charset, length, and values that are legal, and rejects everything else. Prefer reject over strip: deleting `'` from `admin'` can collide with a real `admin`.

> **Where to look:** helpers named `clean`, `sanitize`, `strip`, or `normalize`, plus the username, slug, and coupon-code validators. Grep for `.replace("<"`, `bad in` (Python), `strings.ReplaceAll`, `bytes.Replace` (Go), and `.replace(/[<>` or `.replaceAll(` (Node).
>
> **How to think:** Is this an allowlist of what may appear, or a list of things the author thought of last Tuesday? If it's a blocklist, I already have a finding, even when the list is long. Canonicalize first (trim, lower, Unicode NFKC) and then match the allowlist, so a fullwidth digit doesn't sneak past. Sanitizing by stripping characters is a different job from validating, and mixing them produces values the rest of the code never expected.

```python vulnerable
def clean_username(raw: str) -> str:
    for bad in ("<", ">", "..", "/", "\\", ";", "'", " "):  # BUG: blocklist; %2e%2e, fullwidth ／, and admin' -> admin
        raw = raw.replace(bad, "")
    return raw
```

```python fixed
USERNAME = re.compile(r"^[a-z0-9_]{3,20}$")


def clean_username(raw: str) -> str | None:
    name = raw.strip().lower()
    return name if USERNAME.fullmatch(name) else None  # FIX: allowlist; reject, don't strip
```

```go vulnerable
func cleanUsername(raw string) string {
	for _, bad := range []string{"<", ">", "..", "/", "\\", ";", "'", " "} { // BUG: blocklist; the next encoding wins
		raw = strings.ReplaceAll(raw, bad, "")
	}
	return raw
}
```

```go fixed
var usernameRe = regexp.MustCompile(`^[a-z0-9_]{3,20}$`)

func cleanUsername(raw string) (string, bool) {
	name := strings.ToLower(strings.TrimSpace(raw))
	return name, usernameRe.MatchString(name) // FIX: allowlist; reject, don't strip
}
```

```javascript vulnerable
function cleanUsername(raw) {
  return String(raw)
    .replace(/[<>./\\;'\s]/g, "")
    .replaceAll("..", ""); // BUG: blocklist; admin' becomes admin, and %2e%2e is still there
}
```

```javascript fixed
function cleanUsername(raw) {
  const name = String(raw).trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(name) ? name : null; // FIX: allowlist; reject, don't strip
}
```

### Client-side vs server-side validation

HTML `required`, `type="email"`, and `min`/`max` help honest users. They do nothing against `curl`. If the only copy of the rule lives in the template or in a React form, a raw POST walks past it.

> **Where to look:** signup, profile edit, checkout, and any form that advertises constraints the handler never repeats. Grep for `required`, `minlength`, `type="email"` in templates, then the matching POST handler. On the server, grep for `request.form[` with no follow-up check (Python), `PostFormValue` with no `Atoi` error check (Go), and `req.body.` used on the next line (Node).
>
> **How to think:** I read the form, then I read the handler. Every rule the browser promised has to run again on the server, on the parsed value, with the same bounds. Client-side checks are a UX feature. Treat them as untrusted comments. Hidden fields (`role`, `price`, `user_id`) are a favorite, because the page never even pretends to lock them.

```python vulnerable
# signup.html: <input name="email" type="email" required>
# signup.html: <input name="age" type="number" min="13" max="120">


@app.post("/signup")
def signup():
    email = request.form["email"]
    age = int(request.form["age"])  # BUG: only the browser enforced 13-120; curl posts age=-1
    db.session.add(User(email=email, age=age))
    db.session.commit()
    return redirect("/")
```

```python fixed
EMAIL = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


@app.post("/signup")
def signup():
    email = request.form.get("email", "").strip().lower()
    if EMAIL.fullmatch(email) is None:  # FIX: same rule the form advertised, enforced here
        return "Invalid email", 400
    try:
        age = int(request.form["age"])
    except (KeyError, ValueError):
        return "Invalid age", 400
    if not 13 <= age <= 120:  # FIX: range lives on the server
        return "Invalid age", 400
    db.session.add(User(email=email, age=age))
    db.session.commit()
    return redirect("/")
```

```go vulnerable
func signup(w http.ResponseWriter, r *http.Request) {
	email := r.PostFormValue("email")
	age, _ := strconv.Atoi(r.PostFormValue("age")) // BUG: the HTML min/max never run for a raw POST
	_, _ = db.Exec("INSERT INTO users (email, age) VALUES ($1, $2)", email, age)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```go fixed
var signupEmail = regexp.MustCompile(`^[^@]+@[^@]+\.[^@]+$`)

func signup(w http.ResponseWriter, r *http.Request) {
	email := strings.ToLower(strings.TrimSpace(r.PostFormValue("email")))
	if !signupEmail.MatchString(email) { // FIX: same rule the form advertised
		http.Error(w, "invalid email", http.StatusBadRequest)
		return
	}
	age, err := strconv.Atoi(r.PostFormValue("age"))
	if err != nil || age < 13 || age > 120 { // FIX: range lives on the server
		http.Error(w, "invalid age", http.StatusBadRequest)
		return
	}
	if _, err := db.Exec("INSERT INTO users (email, age) VALUES ($1, $2)", email, age); err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```javascript vulnerable
app.post("/signup", express.urlencoded({ extended: false }), async (req, res) => {
  const user = await User.create({
    email: req.body.email,
    age: parseInt(req.body.age, 10), // BUG: the React form's min={13} is gone the moment this is curl
  });
  res.redirect("/");
});
```

```javascript fixed
const SIGNUP_EMAIL = /^[^@]+@[^@]+\.[^@]+$/;

app.post("/signup", express.urlencoded({ extended: false }), async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  if (!SIGNUP_EMAIL.test(email)) return res.status(400).send("Invalid email"); // FIX: same rule the form advertised
  const age = Number(req.body.age);
  if (!Number.isInteger(age) || age < 13 || age > 120) { // FIX: range lives on the server
    return res.status(400).send("Invalid age");
  }
  await User.create({ email, age });
  res.redirect("/");
});
```

### Regular expression security

Two failure modes show up in reviews. An evil pattern with nested quantifiers (`(a+)+$`) goes exponential on `aaa...a!` and pins a worker (ReDoS). A pattern that is fine but unanchored, or that uses Python's `$` instead of `fullmatch`, accepts a value that only contains a legal substring, or that ends with a newline.

> **Where to look:** compiled regexes next to slugs, emails, phone numbers, and "safe" filename checks. Grep for `re.compile`, `re.match`, `re.search` (Python), `regexp.MustCompile`, `MatchString` (Go), and `new RegExp`, `.test(`, `.match(` (Node). Pay extra attention to any regex built from request input.
>
> **How to think:** Read the pattern the way a backtracking engine will. Nested `+` or `*` on the same characters, or a `.*` next to another greedy loop, is ReDoS until someone proves otherwise. Then check anchors. Python's `match` only pins the start, and `$` also matches before a trailing newline, so use `fullmatch` or `\Z`. Go's `regexp` is RE2 and runs in linear time, so ReDoS is the wrong finding there; `MatchString` is still a substring search unless you write `^` and `$`. JavaScript's `test` is the same, and a `/g` regex keeps `lastIndex` across calls, so the second test can lie. If the pattern itself comes from the user (`new RegExp(req.query.q)`), that's a finding on its own.

```python vulnerable
SLUG = re.compile(r"^([a-z0-9]+-?)+$")  # BUG: nested quantifiers; a long "aaa...a!" hangs the worker


def valid_slug(s: str) -> bool:
    return bool(SLUG.match(s))  # BUG: $ treats "slug\n" as a match
```

```python fixed
SLUG = re.compile(r"[a-z0-9]{1,48}(?:-[a-z0-9]{1,48}){0,8}")  # FIX: bounded repeats, no nested +


def valid_slug(s: str) -> bool:
    return SLUG.fullmatch(s) is not None  # FIX: the whole string, and a trailing newline fails
```

```go vulnerable
var slugRe = regexp.MustCompile(`[a-z0-9-]+`) // BUG: no anchors; MatchString is a substring search

func validSlug(s string) bool {
	return slugRe.MatchString(s) // BUG: "../admin" passes because of "admin"
}
```

```go fixed
var slugRe = regexp.MustCompile(`^[a-z0-9]{1,48}(?:-[a-z0-9]{1,48}){0,8}$`) // FIX: anchored; RE2 is linear, so the bug was the match

func validSlug(s string) bool {
	return slugRe.MatchString(s)
}
```

```javascript vulnerable
const SLUG = /([a-z0-9]+-?)+/; // BUG: nested + and no anchors; "aaa...a!" and "../admin" both hurt

function validSlug(s) {
  return SLUG.test(s);
}
```

```javascript fixed
const SLUG = /^[a-z0-9]{1,48}(?:-[a-z0-9]{1,48}){0,8}$/; // FIX: anchored and bounded

function validSlug(s) {
  return SLUG.test(s);
}
```

### Numeric input validation

`int()`, `Atoi`, and `parseInt` succeed on values the rest of the code cannot survive: negatives, zero, values past a column or a stock count, `1e308`, `NaN`, `Infinity`. In Node, `parseInt("10e9", 10)` is `10`, and `parseInt([5], 10)` is `5`. Parse, then check the range on the parsed number, and reject anything that isn't a finite integer in bounds.

> **Where to look:** cart, quantity, price, page size, IDs taken from the path, and anything that does arithmetic on request data. Grep for `int(request.`, `float(` (Python), `strconv.Atoi`, `ParseInt`, `ParseFloat` (Go), and `parseInt`, `parseFloat`, `Number(` (Node).
>
> **How to think:** After the parse, what is the smallest and largest value this field may legally have? Write those bounds down and look for them in the code. Check the error path too: ignored `Atoi` errors leave `0`, and `int("n/a")` throws 500 instead of 400. JSON makes this worse, because the field may arrive as a boolean, an array, or a string. `Number.isInteger` rejects those; `parseInt` does not. Money belongs in integer cents, not a float.

```python vulnerable
@app.post("/cart/add")
@login_required
def add_to_cart():
    qty = int(request.form["qty"])  # BUG: -1 credits stock; 10**18 blows memory
    item_id = int(request.form["item_id"])
    cart.add(current_user.id, item_id, qty)
    return {"ok": True}
```

```python fixed
@app.post("/cart/add")
@login_required
def add_to_cart():
    try:
        qty = int(request.form["qty"])
        item_id = int(request.form["item_id"])
    except (KeyError, ValueError, TypeError):
        return "bad input", 400
    if not 1 <= qty <= 99:  # FIX: range after a successful parse
        return "qty must be 1 to 99", 400
    if item_id < 1:
        return "bad item", 400
    cart.add(current_user.id, item_id, qty)
    return {"ok": True}
```

```go vulnerable
func addToCart(w http.ResponseWriter, r *http.Request) {
	qty, _ := strconv.Atoi(r.PostFormValue("qty")) // BUG: error ignored; qty is 0 on "nope", negatives pass
	itemID, _ := strconv.Atoi(r.PostFormValue("item_id"))
	cart.Add(currentUser(r).ID, itemID, qty)
	w.WriteHeader(http.StatusNoContent)
}
```

```go fixed
func addToCart(w http.ResponseWriter, r *http.Request) {
	qty, err := strconv.Atoi(r.PostFormValue("qty"))
	if err != nil || qty < 1 || qty > 99 { // FIX: parse error and range both fail closed
		http.Error(w, "qty must be 1 to 99", http.StatusBadRequest)
		return
	}
	itemID, err := strconv.Atoi(r.PostFormValue("item_id"))
	if err != nil || itemID < 1 {
		http.Error(w, "bad item", http.StatusBadRequest)
		return
	}
	if err := cart.Add(r.Context(), currentUser(r).ID, itemID, qty); err != nil {
		http.Error(w, "unavailable", http.StatusConflict)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

```javascript vulnerable
app.post("/cart/add", requireUser, express.urlencoded({ extended: false }), (req, res) => {
  const qty = parseInt(req.body.qty, 10); // BUG: parseInt("10e9", 10) is 10; parseInt("-3", 10) is -3
  cart.add(req.user.id, Number(req.body.item_id), qty);
  res.sendStatus(204);
});
```

```javascript fixed
app.post("/cart/add", requireUser, express.urlencoded({ extended: false }), async (req, res) => {
  const qty = Number(req.body.qty);
  const itemId = Number(req.body.item_id);
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) { // FIX: rejects NaN, Infinity, 1.5, and "10e9"
    return res.status(400).send("qty must be 1 to 99");
  }
  if (!Number.isInteger(itemId) || itemId < 1) {
    return res.status(400).send("bad item");
  }
  await cart.add(req.user.id, itemId, qty);
  res.sendStatus(204);
});
```

### Input length validation

An unbounded string is a cheap denial of service. It fills RAM, blows a `VARCHAR`, bloats an index, and gives every regex and log line more work than they were written for. Cap the request body at the framework, then cap each field.

> **Where to look:** comment, bio, search, and support-ticket handlers, plus the app-wide body limit. Grep for `MAX_CONTENT_LENGTH`, `request.get_data`, `request.form[` (Python), `MaxBytesReader`, `ParseForm`, `io.ReadAll(r.Body)` (Go), and `express.json(`, `limit:`, `req.body` (Node).
>
> **How to think:** What's the largest value this field is allowed to be, in the database and in the product? That number belongs in the handler, counted in the unit you mean (bytes vs runes vs graphemes). A 64 KB request cap is a backstop, not a field rule: a JSON body can still carry one 60 KB comment. Missing both is how a single POST takes a worker down. File uploads have their own size story in File Handling.

```python vulnerable
@app.post("/comments")
@login_required
def add_comment():
    body = request.form["body"]  # BUG: no field cap and no request cap; a 20 MB body is stored and indexed
    comment = Comment(author_id=current_user.id, body=body)
    db.session.add(comment)
    db.session.commit()
    return {"id": comment.id}
```

```python fixed
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024  # FIX: Flask answers 413 before the body fills RAM


@app.post("/comments")
@login_required
def add_comment():
    body = request.form.get("body", "")
    if not 1 <= len(body) <= 2000:  # FIX: field cap; the request limit is only a backstop
        return "Comment must be 1 to 2000 characters", 400
    comment = Comment(author_id=current_user.id, body=body)
    db.session.add(comment)
    db.session.commit()
    return {"id": comment.id}
```

```go vulnerable
func addComment(w http.ResponseWriter, r *http.Request) {
	body := r.PostFormValue("body") // BUG: no cap on the field or the request
	id, _ := insertComment(r.Context(), currentUser(r).ID, body)
	fmt.Fprintf(w, `{"id":%d}`, id)
}
```

```go fixed
func addComment(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10) // FIX: 64 KB request cap
	if err := r.ParseForm(); err != nil {
		http.Error(w, "payload too large", http.StatusRequestEntityTooLarge)
		return
	}
	body := r.PostFormValue("body")
	if n := utf8.RuneCountInString(body); n < 1 || n > 2000 { // FIX: field cap in runes
		http.Error(w, "comment must be 1 to 2000 characters", http.StatusBadRequest)
		return
	}
	id, err := insertComment(r.Context(), currentUser(r).ID, body)
	if err != nil {
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, `{"id":%d}`, id)
}
```

```javascript vulnerable
app.post("/comments", requireUser, express.urlencoded({ extended: false }), async (req, res) => {
  const comment = await Comment.create({ authorId: req.user.id, body: req.body.body }); // BUG: no field cap, default body parser is 100kb and that's the comment
  res.json({ id: comment.id });
});
```

```javascript fixed
app.use(express.urlencoded({ extended: false, limit: "64kb" })); // FIX: body-parser cap

app.post("/comments", requireUser, async (req, res) => {
  const body = String(req.body.body ?? "");
  if (body.length < 1 || body.length > 2000) { // FIX: field cap; the parser limit is only a backstop
    return res.status(400).send("Comment must be 1 to 2000 characters");
  }
  const comment = await Comment.create({ authorId: req.user.id, body });
  res.json({ id: comment.id });
});
```

### Data and command separation

User input is data. A shell command, a SQL string, an LDAP filter, and a template are code. Splice the two together and the interpreter you spawned will parse the input. Pass the value as a separate argument (an argv list, a query parameter, a bound variable) and it stays data. The snippet is the pattern. SQL, NoSQL, LDAP, XML, OS commands, and templates each have their own lab in Injection.

> **Where to look:** any call that starts a process, opens a query, or renders a template with a string the handler built. Grep for `os.system`, `shell=True`, `f"SELECT` (Python), `exec.Command("sh"`, `fmt.Sprintf("SELECT` (Go), and `exec(`, `execSync(`, `` query(`${ `` (Node).
>
> **How to think:** For each sink, ask whether the untrusted value travels in the same string as the command. If yes, that's the bug, even when the value "already passed validation." Validation is the wrong fix here; a legal filename can still contain `;`. The fix is a list of arguments, a placeholder, or a library call that never invokes a parser. Don't stop at the first `os.system` you find. Walk the other interpreters too, then jump to Injection.

```python vulnerable
def make_thumb(src: str) -> None:
    if not src:
        raise ValueError("missing path")
    dest = "/tmp/thumb.png"
    os.system(f"convert {src} -resize 128x128 {dest}")  # BUG: src is spliced into a shell command
```

```python fixed
def make_thumb(src: str) -> None:
    if not src:
        raise ValueError("missing path")
    dest = "/tmp/thumb.png"
    subprocess.run(["convert", src, "-resize", "128x128", dest], check=True)  # FIX: argv list, no shell
```

```go vulnerable
func makeThumb(src string) error {
	if src == "" {
		return errors.New("missing path")
	}
	out := "/tmp/thumb.png"
	return exec.Command("sh", "-c", "convert "+src+" -resize 128x128 "+out).Run() // BUG: src is spliced into a shell string
}
```

```go fixed
func makeThumb(src string) error {
	if src == "" {
		return errors.New("missing path")
	}
	out := "/tmp/thumb.png"
	return exec.Command("convert", src, "-resize", "128x128", out).Run() // FIX: argv list, no shell
}
```

```javascript vulnerable
const { exec } = require("child_process");

function makeThumb(src) {
  if (!src) throw new Error("missing path");
  exec(`convert ${src} -resize 128x128 /tmp/thumb.png`); // BUG: src is spliced into a shell command
}
```

```javascript fixed
const { execFile } = require("child_process");

function makeThumb(src) {
  if (!src) throw new Error("missing path");
  execFile("convert", [src, "-resize", "128x128", "/tmp/thumb.png"]); // FIX: argv list, no shell
}
```

### Data and client-side script separation

The same split applies when the interpreter is the browser's JavaScript engine. Drop a user string into a `<script>` block or an inline handler and it becomes source. JSON-encode it, or put it on a `data-*` attribute and read it from the DOM, and it stays data. Encoding contexts and library choice live in Output Encoding. This point is only the separation.

> **Where to look:** handlers that return HTML with a `<script>` block, and templates that interpolate into JS. Grep for `f"<script"`, `|safe` inside `<script>` (Python), `fmt.Fprintf(w, "<script` (Go), and `res.send(` with a template literal that contains `<script>` (Node). Then look at every `onclick=`, `onerror=`, and `javascript:` URL.
>
> **How to think:** Find the line where a request value first sits inside JavaScript source. A quote, a backslash, or `</script>` is enough to break out. `JSON.stringify` / `tojson` / `json.Marshal` emit a quoted literal and (in the Python and Go stdlib) turn `<` into `\u003c`, so the script block can't be closed. A `data-*` attribute plus `dataset` does the same job if the attribute is HTML-escaped. Inline `onclick="..."` is the worst of both worlds; drop it.

```python vulnerable
@app.get("/hello")
def hello():
    name = request.args.get("name", "friend")
    return f"<script>greet('{name}');</script>"  # BUG: ';alert(1);// becomes JavaScript source
```

```python fixed
@app.get("/hello")
def hello():
    name = request.args.get("name", "friend")
    return render_template_string(
        "<script>greet({{ name | tojson }});</script>",  # FIX: tojson emits a quoted JS literal; < becomes \u003c
        name=name,
    )
```

```go vulnerable
func hello(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "friend"
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, "<script>greet('%s');</script>", name) // BUG: a quote in name becomes JavaScript source
}
```

```go fixed
func hello(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "friend"
	}
	payload, err := json.Marshal(name) // FIX: quoted JSON string; encoding/json writes < as \u003c
	if err != nil {
		http.Error(w, "encode failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, "<script>greet(%s);</script>", payload)
}
```

```javascript vulnerable
app.get("/hello", (req, res) => {
  const name = String(req.query.name ?? "friend");
  res.send(`<script>greet('${name}');</script>`); // BUG: ';alert(1);// becomes JavaScript source
});
```

```javascript fixed
const escapeHtml = require("escape-html");

app.get("/hello", (req, res) => {
  const name = String(req.query.name ?? "friend");
  res.send(
    `<div id="hello" data-name="${escapeHtml(name)}"></div>` +
      "<script>greet(document.getElementById('hello').dataset.name);</script>",
  ); // FIX: value in a data attribute, HTML-escaped; the script source stays constant
});
```

### HTTP header validation

Headers are strings with a rigid grammar. CR, LF, or a colon in a value you copy into `Location`, `Set-Cookie`, or `Content-Disposition` splits the response and lets the attacker add headers or a body. Incoming headers are just as untrusted: `Host` and `X-Forwarded-Host` pick the URL you generate, `Origin` picks who may read the response, and `User-Agent` is attacker-controlled text.

> **Where to look:** any `headers[` / `Header().Set` / `setHeader` whose value includes request data, plus CORS middleware and code that builds absolute URLs from `request.host` or `r.Host`. Grep for `Content-Disposition`, `Location`, `Access-Control-Allow-Origin`, `Set-Cookie` (all three), `request.host` (Python), `r.Host`, `X-Forwarded-Host` (Go), and `req.headers.host`, `req.get("origin")` (Node).
>
> **How to think:** For each outgoing header, name the characters that would break it, then see whether the value was allowlisted before it was set. Modern frameworks drop or reject raw CR/LF, so a successful set is not proof the value is safe: a quote in `filename="..."` still escapes the parameter. For incoming headers, ask what decision they drive. Reflecting `Origin` is an open CORS policy. Building a password-reset link from `Host` is already a finding in Authentication. `X-Forwarded-For` as a rate-limit key is one in Brute force protection. Don't re-check those here; do check every other header the handler treats as fact.

```python vulnerable
@app.get("/export")
@login_required
def export_csv():
    name = request.args.get("name", "report.csv")
    resp = make_response(build_csv())
    resp.headers["Content-Disposition"] = f'attachment; filename="{name}"'  # BUG: CR/LF in name splits the response
    resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")  # BUG: any origin may read the file
    return resp
```

```python fixed
FILENAME = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
ALLOWED_ORIGINS = frozenset({"https://app.example"})


@app.get("/export")
@login_required
def export_csv():
    name = request.args.get("name", "report.csv")
    if FILENAME.fullmatch(name) is None:  # FIX: allowlist; no CR, LF, quotes, or paths
        return "bad filename", 400
    resp = make_response(build_csv())
    resp.headers["Content-Disposition"] = f'attachment; filename="{name}"'
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:  # FIX: reflect only known origins
        resp.headers["Access-Control-Allow-Origin"] = origin
    return resp
```

```go vulnerable
func exportCSV(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "report.csv"
	}
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`) // BUG: CR/LF or a quote in name breaks the header
	w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))     // BUG: any origin may read the file
	w.Write(buildCSV())
}
```

```go fixed
var fileName = regexp.MustCompile(`^[A-Za-z0-9._-]{1,64}$`)

var allowedOrigins = map[string]struct{}{"https://app.example": {}}

func exportCSV(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "report.csv"
	}
	if !fileName.MatchString(name) { // FIX: allowlist; no CR, LF, quotes, or paths
		http.Error(w, "bad filename", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	if origin := r.Header.Get("Origin"); origin != "" {
		if _, ok := allowedOrigins[origin]; ok { // FIX: reflect only known origins
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
	}
	w.Write(buildCSV())
}
```

```javascript vulnerable
app.get("/export", requireUser, (req, res) => {
  const name = String(req.query.name ?? "report.csv");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`); // BUG: CR/LF or a quote in name breaks the header
  res.setHeader("Access-Control-Allow-Origin", req.get("origin") ?? "*"); // BUG: any origin may read the file
  res.send(buildCsv());
});
```

```javascript fixed
const FILENAME = /^[A-Za-z0-9._-]{1,64}$/;
const ALLOWED_ORIGINS = new Set(["https://app.example"]);

app.get("/export", requireUser, (req, res) => {
  const name = String(req.query.name ?? "report.csv");
  if (!FILENAME.test(name)) return res.status(400).send("bad filename"); // FIX: allowlist; no CR, LF, quotes, or paths
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  const origin = req.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin); // FIX: known origins only
  res.send(buildCsv());
});
```

### Open redirects

`redirect(request.args["next"])` sends the browser wherever the caller points. `https://evil.test`, `//evil.test`, and `/\evil.test` (backslash becomes slash in the browser) all leave your origin. Phishing pages love a real login URL in the address bar that then hops to them.

> **Where to look:** login, logout, OAuth callbacks, "continue" / "next" / "return_to" / "redirect_uri" parameters, and any helper that turns a request value into a `Location` header. Grep for `redirect(request.`, `url_for` with a user value (Python), `http.Redirect`, `r.URL.Query().Get("next")` (Go), and `res.redirect(req.` (Node).
>
> **How to think:** I try four payloads on every redirect target: a full URL, a protocol-relative `//host`, a backslash variant, and `https:host` with no slashes. An allowlist of named destinations (`inbox` -> `/inbox`) is the cleanest fix, because the client never supplies a path. If you must accept a path, require a single leading `/`, reject `//` and `\`, and parse so `scheme` and `host` stay empty. Don't compare against `request.host`; the attacker set that header too. And a same-origin absolute URL still needs an allowlist if you don't want `https://yoursite.tld/logout` as a `next`.

```python vulnerable
@app.get("/next")
def next_page():
    return redirect(request.args.get("next", "/"))  # BUG: https://evil.test, //evil.test, and /\evil.test all leave
```

```python fixed
def safe_next(raw: str) -> str:
    if not raw.startswith("/") or raw.startswith("//") or "\\" in raw or "\r" in raw or "\n" in raw:
        return "/"
    parts = urlsplit(raw)
    if parts.scheme or parts.netloc:  # FIX: rejects https://evil, //evil, and https:evil
        return "/"
    return raw


@app.get("/next")
def next_page():
    return redirect(safe_next(request.args.get("next", "/")))
```

```go vulnerable
func nextPage(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, r.URL.Query().Get("next"), http.StatusFound) // BUG: whatever the caller put in ?next= becomes Location
}
```

```go fixed
func safeNext(raw string) string {
	if !strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, "//") || strings.ContainsAny(raw, "\\\r\n") {
		return "/"
	}
	u, err := url.Parse(raw)
	if err != nil || u.IsAbs() || u.Host != "" { // FIX: rejects https://evil, //evil, and https:evil
		return "/"
	}
	return raw
}

func nextPage(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, safeNext(r.URL.Query().Get("next")), http.StatusFound)
}
```

```javascript vulnerable
app.get("/next", (req, res) => {
  res.redirect(String(req.query.next ?? "/")); // BUG: https://evil.test, //evil.test, and /\evil.test all leave
});
```

```javascript fixed
function safeNext(raw) {
  const s = String(raw ?? "");
  if (!s.startsWith("/") || s.startsWith("//") || /[\\\r\n]/.test(s)) return "/";
  try {
    const u = new URL(s, "https://app.example");
    if (u.origin !== "https://app.example") return "/"; // FIX: //evil.test and https://evil.test change origin
    return `${u.pathname}${u.search}`;
  } catch {
    return "/";
  }
}

app.get("/next", (req, res) => {
  res.redirect(safeNext(req.query.next));
});
```

---

## Output Encoding Review

This section is about keeping data as data when it leaves your code for another interpreter: the database, the ORM, your own model objects, and the browser. Start with the data access layer and find every query built from strings. Then read the create and update handlers that copy request bodies into models, and finally every place HTML gets produced, whether that's a template or a handler gluing strings together.

### Parameterized queries

A parameterized query sends the SQL text and the values separately, so the database never parses user input as SQL. Build the string yourself with an f-string, `Sprintf`, or a template literal, and a single quote in the input closes the string literal and starts new SQL.

> **Where to look:** the data access layer, repository or DAO modules, reporting queries, and admin search screens. Grep for `execute(f"`, `.format(` and `% (` near SQL (Python), `fmt.Sprintf("SELECT` and `Query(` calls containing `+` (Go), and `query(` with a template literal or `+ req.` (Node).
>
> **How to think:** For each query, list its dynamic parts. Values go through placeholders every time, even when they "can't" contain a quote because they came from your own database or passed an earlier check; that's how second-order injection happens. Identifiers are different. Table names, column names, and `ORDER BY` direction can't be bound, so they need an allowlist, which the SQL injection point in the Injection section covers. Know the placeholder style of the driver you're reading: `%s` for psycopg and PyMySQL, `?` for sqlite3 and Go's MySQL driver, `$1` for Postgres in Go and node-postgres. A `%s` inside an f-string, or a query run through `%` formatting before `execute`, looks parameterized and isn't. Plain ORM calls like `User.query.filter_by(username=name)` bind for you; the next point covers the places they don't.

```python vulnerable
@app.get("/api/users/<username>")
@login_required
def get_user(username):
    with conn.cursor() as cur:
        cur.execute(f"SELECT id, username, display_name FROM users WHERE username = '{username}'")  # BUG: a quote in the name ends the string; the rest runs as SQL
        row = cur.fetchone()
    if row is None:
        abort(404)
    return {"id": row[0], "username": row[1], "name": row[2]}
```

```python fixed
@app.get("/api/users/<username>")
@login_required
def get_user(username):
    with conn.cursor() as cur:
        cur.execute("SELECT id, username, display_name FROM users WHERE username = %s", (username,))  # FIX: the value travels separately from the SQL
        row = cur.fetchone()
    if row is None:
        abort(404)
    return {"id": row[0], "username": row[1], "name": row[2]}
```

```go vulnerable
mux.HandleFunc("GET /api/users/{username}", func(w http.ResponseWriter, r *http.Request) {
	q := fmt.Sprintf("SELECT id, username, display_name FROM users WHERE username = '%s'", r.PathValue("username")) // BUG: the input becomes SQL text
	var p Profile
	if err := db.QueryRowContext(r.Context(), q).Scan(&p.ID, &p.Username, &p.Name); err != nil {
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(p)
})
```

```go fixed
mux.HandleFunc("GET /api/users/{username}", func(w http.ResponseWriter, r *http.Request) {
	const q = "SELECT id, username, display_name FROM users WHERE username = $1" // FIX: placeholder in a constant query
	var p Profile
	if err := db.QueryRowContext(r.Context(), q, r.PathValue("username")).Scan(&p.ID, &p.Username, &p.Name); err != nil { // FIX: value bound by the driver
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(p)
})
```

```javascript vulnerable
app.get("/api/users/:username", requireUser, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, display_name FROM users WHERE username = '${req.params.username}'`, // BUG: the input becomes SQL text
  );
  if (rows.length === 0) return res.sendStatus(404);
  res.json(rows[0]);
});
```

```javascript fixed
app.get("/api/users/:username", requireUser, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, username, display_name FROM users WHERE username = $1", // FIX: placeholder, not interpolation
    [req.params.username], // FIX: pg sends the value separately
  );
  if (rows.length === 0) return res.sendStatus(404);
  res.json(rows[0]);
});
```

### ORM security

ORMs bind values for you right up until someone reaches for the raw-SQL escape hatch. `text()`, `.raw()`, `Where` with a formatted string, and `sequelize.query` with a template literal all take SQL text, so an app can "use an ORM" and still be injectable.

> **Where to look:** models, repositories, and any search or reporting code that goes through the ORM. Grep for `text(f"`, `.raw(`, `.extra(`, `RawSQL(` (Python), `.Raw(`, `.Exec(`, `Where(fmt.Sprintf`, `.Order(` (Go), and `sequelize.query(`, `Sequelize.literal(`, `$queryRawUnsafe` (Node).
>
> **How to think:** List every ORM call that accepts a string of SQL, then check each one for interpolation. The escape hatches are SQLAlchemy `text()`, Django `.raw()` and the deprecated `.extra()`, GORM `Where`, `Raw`, and `Order` with a formatted string, Sequelize `query()` and `literal()`, and Prisma's `$queryRawUnsafe`. Most of them accept parameters if you ask: Django's `.raw(sql, [params])`, GORM's `?`, Sequelize's `replacements` or `bind`, Prisma's tagged `$queryRaw` template. Then check the opposite direction. Filters built straight from the request, such as `User.objects.filter(**request.GET.dict())` in Django, let a caller query columns you never meant to expose, like `password__startswith`, one character at a time. And `%` or `_` inside a bound LIKE value still act as wildcards; that's a correctness and performance problem rather than injection.

```python vulnerable
@app.get("/api/products")
def search_products():
    name = request.args.get("name", "")
    rows = db.session.execute(
        text(f"SELECT id, name, price FROM products WHERE name LIKE '%{name}%'")  # BUG: text() runs the f-string as raw SQL
    ).all()
    return [dict(row._mapping) for row in rows]
```

```python fixed
@app.get("/api/products")
def search_products():
    name = request.args.get("name", "")
    rows = db.session.execute(
        text("SELECT id, name, price FROM products WHERE name LIKE :pattern")  # FIX: named placeholder in the SQL text
        .bindparams(pattern=f"%{name}%")  # FIX: the value is bound, never spliced in
    ).all()
    return [dict(row._mapping) for row in rows]
```

```go vulnerable
func searchProducts(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	var products []Product
	err := db.WithContext(r.Context()).Where(fmt.Sprintf("name LIKE '%%%s%%'", name)).Find(&products).Error // BUG: Where takes the formatted string as raw SQL
	if err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(products)
}
```

```go fixed
func searchProducts(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	var products []Product
	err := db.WithContext(r.Context()).Where("name LIKE ?", "%"+name+"%").Find(&products).Error // FIX: ? placeholder, value bound separately
	if err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(products)
}
```

```javascript vulnerable
app.get("/api/products", async (req, res) => {
  const products = await sequelize.query(
    `SELECT id, name, price FROM products WHERE name LIKE '%${req.query.name}%'`, // BUG: raw SQL built from the query string
    { type: QueryTypes.SELECT },
  );
  res.json(products);
});
```

```javascript fixed
app.get("/api/products", async (req, res) => {
  const products = await sequelize.query("SELECT id, name, price FROM products WHERE name LIKE :pattern", {
    replacements: { pattern: `%${String(req.query.name ?? "")}%` }, // FIX: Sequelize escapes and quotes the value
    type: QueryTypes.SELECT,
  });
  res.json(products);
});
```

### Mass assignment

Mass assignment happens when a handler copies the whole request body onto a model. The form shows name and bio. The attacker adds `"is_admin": true` to the JSON, and the code saves it along with everything else.

> **Where to look:** create and update handlers, especially profile edit and signup. Grep for `**request.json`, `**request.get_json()`, `setattr(`, `fields = "__all__"` (Python), `Decode(&` into a model type, `db.Save(`, `.Updates(` (Go), and `create(req.body`, `update(req.body`, `Object.assign(`, `...req.body` (Node).
>
> **How to think:** Put the model's columns next to the fields the form or API is supposed to accept. Anything in the first list but not the second is a target: `role`, `is_admin`, `email_verified`, `org_id`, `owner_id`, `balance`, `price`, `password_hash`, and the primary key itself. Then check how the handler copies input. An allowlist (an input schema, a separate struct, a `fields` option) stays safe when someone adds a column next year, while a blocklist like `del data["is_admin"]` quietly goes stale. Look at the less obvious paths as well: nested writes that create related records, DRF serializers with `fields = "__all__"`, and admin-only fields reused in a user-facing form.

```python vulnerable
@app.patch("/api/me")
@login_required
def update_profile():
    for key, value in request.get_json().items():
        setattr(current_user, key, value)  # BUG: {"is_admin": true} is just one more key
    db.session.commit()
    return {"ok": True}
```

```python fixed
class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")  # FIX: unknown keys fail validation instead of being written
    display_name: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=500)


@app.patch("/api/me")
@login_required
def update_profile():
    try:
        changes = ProfileUpdate.model_validate(request.get_json())
    except ValidationError:
        return {"error": "unexpected or invalid fields"}, 422
    for key, value in changes.model_dump(exclude_unset=True, exclude_none=True).items():  # FIX: only declared fields reach the model
        setattr(current_user, key, value)
    db.session.commit()
    return {"ok": True}
```

```go vulnerable
type User struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Bio         string `json:"bio"`
	IsAdmin     bool   `json:"is_admin"`
}

func updateProfile(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if err := json.NewDecoder(r.Body).Decode(user); err != nil { // BUG: decodes into the DB model, IsAdmin and ID included
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if err := db.Save(user).Error; err != nil { // BUG: writes every column, whatever the client sent
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

```go fixed
type ProfileUpdate struct { // FIX: only the fields a user may change
	DisplayName string `json:"display_name"`
	Bio         string `json:"bio"`
}

func updateProfile(w http.ResponseWriter, r *http.Request) {
	var in ProfileUpdate
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields() // FIX: {"is_admin": true} is a 400, not a silent write
	if err := dec.Decode(&in); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	user := currentUser(r)
	if err := db.Model(user).Updates(User{DisplayName: in.DisplayName, Bio: in.Bio}).Error; err != nil { // FIX: only these two columns can change
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

```javascript vulnerable
app.patch("/api/me", requireUser, express.json(), async (req, res) => {
  const user = await User.findByPk(req.user.id);
  Object.assign(user, req.body); // BUG: copies role, isAdmin, or id along with the name
  await user.save();
  res.json({ id: user.id, displayName: user.displayName, bio: user.bio });
});
```

```javascript fixed
const EDITABLE = ["displayName", "bio"]; // FIX: the full list of user-editable columns

app.patch("/api/me", requireUser, express.json(), async (req, res) => {
  const user = await User.findByPk(req.user.id);
  await user.update(req.body, { fields: EDITABLE }); // FIX: Sequelize sets and saves these columns only
  res.json({ id: user.id, displayName: user.displayName, bio: user.bio });
});
```

### Output encoding contexts

Where a value lands in the page decides how it has to be encoded. HTML escaping is right for body text and quoted attributes. It does nothing for a `javascript:` URL, which has no special characters to escape, and inside an `onclick` attribute the browser decodes your entities back into quotes before the JavaScript runs.

> **Where to look:** handlers that return HTML strings, and the templates themselves. Grep for `|safe`, `Markup(`, `mark_safe`, `autoescape false`, `f"<` (Python), `text/template`, `template.HTML(`, `fmt.Fprintf(w, "<` (Go), and `res.send(` with a template literal, `<%-` (EJS), `{{{` (Handlebars), `innerHTML` (Node). Then look at every `href`, `src`, `on*=`, `style=`, and `<script>` block that contains a template expression.
>
> **How to think:** For every value that reaches HTML, name the context it lands in and check that the encoding matches. Body text and quoted attributes need HTML escaping. A full URL in `href` or `src` also needs a scheme allowlist (http, https, maybe mailto), while a single path or query component needs `quote()`, `url.QueryEscape`, or `encodeURIComponent`. JavaScript needs JS encoding. Inside `<script>`, that means JSON (`tojson`, `html/template`, or `JSON.stringify` with `<` replaced by `\u003c`), because raw `JSON.stringify` still lets `</script>` close the block, which is the hole in the old JSP "best" pattern. Inside an event handler attribute, JS-encode first and HTML-encode second, or better, drop the inline handler. CSS and XML have rules of their own: allowlist CSS values (a hex color regex) instead of escaping them, and build XML with a library rather than strings. Go's `html/template` works out the context for you; Jinja and most Node engines only know HTML.

```python vulnerable
@app.get("/u/<username>")
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    return (
        f"<h1>{user.display_name}</h1>"  # BUG: no escaping, so <img src=x onerror=alert(1)> runs
        f"<a href='{html.escape(user.website)}'>Website</a>"  # BUG: escaping leaves javascript:alert(1) intact
        f"<button onclick=\"wave('{html.escape(user.display_name)}')\">Wave</button>"  # BUG: the browser turns &#x27; back into ' before the JS runs
    )
```

```python fixed
# tojson output is safe inside <script> and single-quoted attributes, not double-quoted ones
PROFILE = """
<h1>{{ user.display_name }}</h1>
<a href="{{ website }}">Website</a>
<button onclick='wave({{ user.display_name | tojson }})'>Wave</button>
"""


def safe_url(url: str) -> str:
    return url if urlsplit(url).scheme in ("http", "https") else "#"  # FIX: scheme allowlist; HTML escaping can't stop javascript:


@app.get("/u/<username>")
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    return render_template_string(PROFILE, user=user, website=safe_url(user.website))  # FIX: Jinja HTML-escapes every {{ }}
```

```go vulnerable
import "text/template" // BUG: text/template escapes nothing

var profileTmpl = template.Must(template.New("profile").Parse(`
<h1>{{.DisplayName}}</h1>
<a href="{{.Website}}">Website</a>
<button onclick="wave('{{.DisplayName}}')">Wave</button>
`))

func profile(w http.ResponseWriter, r *http.Request) {
	user, err := findUser(r.Context(), r.PathValue("username"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := profileTmpl.Execute(w, user); err != nil {
		slog.Error("render profile", "err", err)
	}
}
```

```go fixed
import "html/template" // FIX: escapes per context: HTML text, attributes, URLs (javascript: becomes #ZgotmplZ), and JS

var profileTmpl = template.Must(template.New("profile").Parse(`
<h1>{{.DisplayName}}</h1>
<a href="{{.Website}}">Website</a>
<button onclick="wave('{{.DisplayName}}')">Wave</button>
`))

func profile(w http.ResponseWriter, r *http.Request) {
	user, err := findUser(r.Context(), r.PathValue("username"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := profileTmpl.Execute(w, user); err != nil {
		slog.Error("render profile", "err", err)
	}
}
```

```javascript vulnerable
const escapeHtml = require("escape-html");

app.get("/u/:username", async (req, res) => {
  const user = await User.findOne({ where: { username: req.params.username } });
  if (!user) return res.sendStatus(404);
  res.send(
    `<h1>${user.displayName}</h1>` + // BUG: raw HTML from the user
    `<a href="${escapeHtml(user.website)}">Website</a>` + // BUG: escaping leaves javascript:alert(1) intact
    `<button onclick="wave('${escapeHtml(user.displayName)}')">Wave</button>`, // BUG: &#39; is decoded back to ' before the JS runs
  );
});
```

```javascript fixed
const escapeHtml = require("escape-html");

function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#"; // FIX: scheme allowlist
  } catch {
    return "#";
  }
}

app.get("/u/:username", async (req, res) => {
  const user = await User.findOne({ where: { username: req.params.username } });
  if (!user) return res.sendStatus(404);
  res.send(
    `<h1>${escapeHtml(user.displayName)}</h1>` + // FIX: HTML-escaped body text
    `<a href="${escapeHtml(safeUrl(user.website))}">Website</a>` +
    `<button onclick="wave(${escapeHtml(JSON.stringify(user.displayName))})">Wave</button>`, // FIX: JS-encode, then HTML-encode for the attribute
  );
});
```

### Output encoding libraries

A hand-rolled escaper usually covers the characters its author was thinking about that afternoon. One that only replaces `<` and `>` works in body text and fails the moment its output goes inside a quoted attribute, where a single `"` is all an attacker needs.

> **Where to look:** utility modules named `utils`, `helpers`, or `sanitize`, template filters, and any function with "escape" in its name. Grep for `.replace("<"`, `def escape`, `markupsafe`, `bleach` (Python), `strings.NewReplacer("<"`, `html.EscapeString` (Go), and `.replace(/</g`, `escape-html`, `dangerouslySetInnerHTML`, `DOMPurify` (Node). Check `requirements.txt`, `go.mod`, and `package.json` for the versions in use.
>
> **How to think:** Is any of this hand-rolled? A homemade escaper is a finding even when it looks complete, because the next person will reuse it in a context it wasn't written for. Compare the characters it covers against where its output goes: `html.escape`, `html.EscapeString`, and `escape-html` are right for HTML text and quoted attributes and wrong for JS, URLs, and CSS (see Output encoding contexts). Prefer the framework's autoescaping to manual calls, so one forgotten call doesn't become an XSS. Escaping and sanitizing are separate jobs. When users really need to submit HTML (rich text, rendered Markdown), run it through a sanitizer such as nh3 (Python), bluemonday (Go), or DOMPurify, and in React a sanitized string is the only thing that should ever reach `dangerouslySetInnerHTML`. Finally, check versions. Encoders and sanitizers get bypasses and patches like any other dependency: Jinja shipped `xmlattr` filter fixes in 2024, and DOMPurify releases fix mutation-XSS bypasses regularly, so keep them in your dependency scanning.

```python vulnerable
def escape(s: str) -> str:
    return s.replace("<", "&lt;").replace(">", "&gt;")  # BUG: leaves &, ", and ' alone


@app.get("/search")
def search():
    q = request.args.get("q", "")
    return f'<input name="q" value="{escape(q)}"><p>Results for {escape(q)}</p>'  # BUG: q=" autofocus onfocus="alert(1) escapes the value attribute
```

```python fixed
def escape(s: str) -> str:
    return html.escape(s, quote=True)  # FIX: stdlib escaper covers & < > " and '


@app.get("/search")
def search():
    q = request.args.get("q", "")
    return f'<input name="q" value="{escape(q)}"><p>Results for {escape(q)}</p>'
```

```go vulnerable
var naive = strings.NewReplacer("<", "&lt;", ">", "&gt;") // BUG: quotes and & pass straight through

func search(w http.ResponseWriter, r *http.Request) {
	q := naive.Replace(r.URL.Query().Get("q"))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<input name="q" value="%s"><p>Results for %s</p>`, q, q) // BUG: a " in q ends the attribute
}
```

```go fixed
import "html"

func search(w http.ResponseWriter, r *http.Request) {
	q := html.EscapeString(r.URL.Query().Get("q")) // FIX: escapes < > & ' and "
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<input name="q" value="%s"><p>Results for %s</p>`, q, q)
}
```

```javascript vulnerable
function escape(s) {
  return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); // BUG: quotes and & pass straight through
}

app.get("/search", (req, res) => {
  const q = escape(req.query.q ?? "");
  res.send(`<input name="q" value="${q}"><p>Results for ${q}</p>`); // BUG: a " in q ends the attribute
});
```

```javascript fixed
const escape = require("escape-html"); // FIX: escapes & < > " and '

app.get("/search", (req, res) => {
  const q = escape(String(req.query.q ?? ""));
  res.send(`<input name="q" value="${q}"><p>Results for ${q}</p>`);
});
```

### Encoding routine weaknesses

Validation has to run on the exact string the code is about to use. Check for `../` first and decode afterwards, and `%2e%2e%2f` slips past as harmless text and turns into `../` one line later. If the framework already decoded once, a second decode lets `%252e%252e%252f` do the same trick.

> **Where to look:** input filters, path and URL handlers, WAF-style middleware, and custom sanitizers. Grep for `unquote`, `unquote_plus`, `unicodedata.normalize` (Python), `url.PathUnescape`, `url.QueryUnescape` (Go), and `decodeURIComponent`, `decodeURI`, `.normalize(` (Node), then read what ran right before each one.
>
> **How to think:** Write down the order the code follows: decode, normalize, validate, use. Any decode or normalization step after the validation reopens the hole, and so does a second decode anywhere in the stack, whether it's a proxy, the framework, or a helper that "cleans" input. Rejecting a leftover `%` after the one legitimate decode is a cheap tripwire for double encoding. Then read the validator itself, because regex blind spots are common. Python's `$` also matches before a trailing newline, so use `fullmatch` or `\Z`. Go's `MatchString` and JavaScript's `test` aren't anchored unless you write `^` and `$`. A blocklist for `<script` misses `<ScRiPt>`, `<img onerror=...>`, and `<svg onload=...>`. Unicode normalization (NFKC) folds fullwidth dots and slashes into `.` and `/`, so normalize before you check. And an encoder has to cover every character that matters in its context: `&`, `<`, `>`, `"`, and `'` for HTML; backslash, quotes, and line terminators for JS strings; CR and LF in headers. Covering four out of five is still a bug.

```python vulnerable
DOCS_DIR = "/srv/app/docs"


@app.get("/docs")
def doc():
    name = request.args.get("name", "")
    if "../" in name or name.startswith("/"):  # BUG: checks a value that gets decoded again below
        abort(400)
    name = unquote(name)  # BUG: %252e%252e%252f arrived as %2e%2e%2f, passed, and is ../ now
    return send_file(os.path.join(DOCS_DIR, name))
```

```python fixed
DOCS_DIR = Path("/srv/app/docs").resolve()


@app.get("/docs")
def doc():
    name = request.args.get("name", "")  # FIX: Werkzeug decoded it once; nothing decodes it again
    if "%" in name:  # FIX: a % left after that decode means double encoding
        abort(400)
    target = DOCS_DIR.joinpath(name).resolve()
    if not target.is_relative_to(DOCS_DIR) or not target.is_file():  # FIX: validate the final form (see Path traversal)
        abort(404)
    return send_file(target)
```

```go vulnerable
const docsDir = "/srv/app/docs"

func doc(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if strings.Contains(name, "../") || strings.HasPrefix(name, "/") { // BUG: checks a value that gets decoded again below
		http.Error(w, "bad name", http.StatusBadRequest)
		return
	}
	name, err := url.PathUnescape(name) // BUG: %252e%252e%252f passed as %2e%2e%2f and is ../ now
	if err != nil {
		http.Error(w, "bad name", http.StatusBadRequest)
		return
	}
	http.ServeFile(w, r, filepath.Join(docsDir, name))
}
```

```go fixed
const docsDir = "/srv/app/docs"

func doc(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name") // FIX: net/url decoded it once; nothing decodes it again
	if strings.Contains(name, "%") || !filepath.IsLocal(name) { // FIX: leftover % means double encoding; then check the final form
		http.Error(w, "bad name", http.StatusBadRequest)
		return
	}
	http.ServeFile(w, r, filepath.Join(docsDir, name))
}
```

```javascript vulnerable
const DOCS_DIR = "/srv/app/docs";

app.get("/docs", (req, res) => {
  const name = String(req.query.name ?? "");
  if (name.includes("../") || name.startsWith("/")) return res.sendStatus(400); // BUG: checks a value that gets decoded again below
  const decoded = decodeURIComponent(name); // BUG: %252e%252e%252f passed as %2e%2e%2f and is ../ now
  res.sendFile(path.join(DOCS_DIR, decoded));
});
```

```javascript fixed
const DOCS_DIR = path.resolve("/srv/app/docs");

app.get("/docs", (req, res) => {
  const name = String(req.query.name ?? ""); // FIX: Express decoded it once; nothing decodes it again
  if (name.includes("%")) return res.sendStatus(400); // FIX: a leftover % means double encoding
  const file = path.resolve(DOCS_DIR, name);
  if (!file.startsWith(DOCS_DIR + path.sep)) return res.sendStatus(404); // FIX: validate the final form (see Path traversal)
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.sendStatus(404);
  });
});
```

---

## Injection Review

Injection is what happens when request data stops being data and starts being syntax for SQL, Mongo, LDAP, XML, a shell, or a template engine. The code sits next to the Output Encoding and Input Validation work: repositories, search handlers, import endpoints, diagnostics, and anything that renders a string as a template. Grep for formatting next to a query, a filter, a command, or a template. Then ask whether a quote, an operator, or a `{{` in that value would change the sentence the interpreter runs.

### SQL injection

Parameterized queries (see Output Encoding) keep values out of SQL. They do not help with identifiers. Table names, column names, and `ASC`/`DESC` get interpolated, and a sort key that is not on your list is still SQL the database will parse.

> **Where to look:** reporting endpoints, admin search, export jobs, and any query that takes a sort column, table name, or direction from the request. Grep for `ORDER BY` next to an f-string or `.format(` (Python), `fmt.Sprintf` containing `ORDER BY` (Go), and template literals with `ORDER BY` (Node). Value-binding bugs already live under Parameterized queries.
>
> **How to think:** Split every dynamic piece into value or identifier. Values go through placeholders every time, even when they came from your own database last week; that is second-order injection. Identifiers cannot be bound, so they need an allowlist of real column names and `asc`/`desc`. If the rest of the query is parameterized and the `ORDER BY` is not, treat it as injection. Know the driver's placeholders (`%s`, `$1`, `?`) so a formatted "parameter" does not fool you.

```python vulnerable
@app.get("/api/reports")
@login_required
def reports():
    sort = request.args.get("sort", "created_at")
    direction = request.args.get("dir", "desc")
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, title, created_at FROM reports WHERE owner_id = %s ORDER BY {sort} {direction}",  # BUG: identifiers interpolated; placeholders cannot bind them
            (current_user.id,),
        )
        rows = cur.fetchall()
    return [{"id": r[0], "title": r[1], "created_at": r[2]} for r in rows]
```

```python fixed
SORTABLE = {"created_at", "title", "status"}
DIRECTIONS = {"asc", "desc"}


@app.get("/api/reports")
@login_required
def reports():
    sort = request.args.get("sort", "created_at")
    direction = request.args.get("dir", "desc")
    if sort not in SORTABLE or direction not in DIRECTIONS:  # FIX: only real columns and directions reach the SQL
        abort(400)
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, title, created_at FROM reports WHERE owner_id = %s ORDER BY {sort} {direction}",
            (current_user.id,),
        )
        rows = cur.fetchall()
    return [{"id": r[0], "title": r[1], "created_at": r[2]} for r in rows]
```

```go vulnerable
func reports(w http.ResponseWriter, r *http.Request) {
	sort := r.URL.Query().Get("sort")
	dir := r.URL.Query().Get("dir")
	q := fmt.Sprintf("SELECT id, title, created_at FROM reports WHERE owner_id = $1 ORDER BY %s %s", sort, dir) // BUG: identifiers interpolated
	rows, err := db.QueryContext(r.Context(), q, currentUser(r).ID)
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	writeReportRows(w, rows)
}
```

```go fixed
var sortable = map[string]string{"created_at": "created_at", "title": "title", "status": "status"}
var directions = map[string]string{"asc": "ASC", "desc": "DESC"}

func reports(w http.ResponseWriter, r *http.Request) {
	sort, okSort := sortable[r.URL.Query().Get("sort")]
	dir, okDir := directions[r.URL.Query().Get("dir")]
	if !okSort || !okDir { // FIX: unknown names never reach the SQL
		http.Error(w, "bad sort", http.StatusBadRequest)
		return
	}
	q := fmt.Sprintf("SELECT id, title, created_at FROM reports WHERE owner_id = $1 ORDER BY %s %s", sort, dir)
	rows, err := db.QueryContext(r.Context(), q, currentUser(r).ID)
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	writeReportRows(w, rows)
}
```

```javascript vulnerable
app.get("/api/reports", requireUser, async (req, res) => {
  const sort = String(req.query.sort ?? "created_at");
  const dir = String(req.query.dir ?? "desc");
  const { rows } = await pool.query(
    `SELECT id, title, created_at FROM reports WHERE owner_id = $1 ORDER BY ${sort} ${dir}`, // BUG: identifiers interpolated
    [req.user.id],
  );
  res.json(rows);
});
```

```javascript fixed
const SORTABLE = new Set(["created_at", "title", "status"]);
const DIRECTIONS = new Set(["asc", "desc"]);

app.get("/api/reports", requireUser, async (req, res) => {
  const sort = String(req.query.sort ?? "created_at");
  const dir = String(req.query.dir ?? "desc");
  if (!SORTABLE.has(sort) || !DIRECTIONS.has(dir)) return res.sendStatus(400); // FIX: only real columns and directions
  const { rows } = await pool.query(
    `SELECT id, title, created_at FROM reports WHERE owner_id = $1 ORDER BY ${sort} ${dir}`,
    [req.user.id],
  );
  res.json(rows);
});
```

### NoSQL injection

Mongo queries are documents, not strings. Pass the request JSON through as the filter and the caller can send operators where you expected a string, which changes what the query matches. `$where` is worse: it runs JavaScript on the server.

> **Where to look:** login, search, and admin filters that talk to Mongo, Couch, or similar. Grep for `find(`, `find_one(`, `__raw__` (Python), `Find(`, `FindOne(`, `bson.M` decoded from the body (Go), and `find(req.body`, `findOne(req.body`, `$where` (Node).
>
> **How to think:** What type did this field have in your head, and what type did the JSON actually carry? A string stays a string. An object is an operator. Express query strings can produce the same shape (`?status[$ne]=active`), so this is not only a JSON-body bug. `sanitizeFilter` helps and has had bypasses, so do not make it the only check. Decode into a typed struct or schema, then build the filter from those fields. And if you still see `$where` or a concatenated query string, that is injection even when every value looks boring.

```python vulnerable
@app.post("/api/accounts/search")
@login_required
def search_accounts():
    filt = request.get_json(force=True) or {}
    return dumps(list(db.accounts.find(filt)))  # BUG: operators in the JSON become query operators
```

```python fixed
class AccountQuery(BaseModel):
    email: str | None = None
    status: Literal["active", "suspended"] | None = None


@app.post("/api/accounts/search")
@login_required
def search_accounts():
    q = AccountQuery.model_validate(request.get_json(force=True) or {})
    filt = q.model_dump(exclude_none=True)  # FIX: only declared string fields, never $ operators
    return dumps(list(db.accounts.find(filt)))
```

```go vulnerable
func searchAccounts(w http.ResponseWriter, r *http.Request) {
	var filter bson.M
	if err := json.NewDecoder(r.Body).Decode(&filter); err != nil { // BUG: the body is the Mongo filter
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	cur, err := accounts.Find(r.Context(), filter)
	if err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	defer cur.Close(r.Context())
	var out []bson.M
	if err := cur.All(r.Context(), &out); err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(out)
}
```

```go fixed
type accountQuery struct {
	Email  string `json:"email"`
	Status string `json:"status"`
}

func searchAccounts(w http.ResponseWriter, r *http.Request) {
	var in accountQuery
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	filter := bson.M{}
	if in.Email != "" {
		filter["email"] = in.Email
	}
	if in.Status == "active" || in.Status == "suspended" { // FIX: typed fields only; objects never reach Find
		filter["status"] = in.Status
	}
	cur, err := accounts.Find(r.Context(), filter)
	if err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	defer cur.Close(r.Context())
	var out []bson.M
	if err := cur.All(r.Context(), &out); err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(out)
}
```

```javascript vulnerable
app.post("/api/accounts/search", requireUser, express.json(), async (req, res) => {
  const rows = await Account.find(req.body); // BUG: operators in the body become query operators
  res.json(rows.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status,
  })));
});
```

```javascript fixed
const STATUSES = new Set(["active", "suspended"]);

app.post("/api/accounts/search", requireUser, express.json(), async (req, res) => {
  const { email, status } = req.body;
  if (email !== undefined && typeof email !== "string") return res.sendStatus(400); // FIX: reject operator objects
  if (status !== undefined && !STATUSES.has(status)) return res.sendStatus(400);
  const filter = {};
  if (typeof email === "string") filter.email = email;
  if (STATUSES.has(status)) filter.status = status;
  res.json(await Account.find(filter));
});
```

### LDAP injection

LDAP filters treat `*`, `(`, `)`, and `\` as syntax. Splice a uid into `(uid=%s)` and a `*` matches every account, or an extra clause ORs in entries you never asked for. The directory then answers a wider question than the handler meant to ask.

> **Where to look:** SSO, directory search, and group-membership checks. Grep for `ldap3`, `escape_filter_chars`, `search_filter` (Python), `go-ldap`, `EscapeFilter`, `NewSearchRequest` (Go), and `ldapjs`, `client.search`, `` filter: `(uid=${ `` (Node).
>
> **How to think:** Read the filter as a tiny language. Did the request value stay inside one assertion, or can it close a paren and add another? Escape the value with the library helper (`escape_filter_chars`, `ldap.EscapeFilter`) or a small RFC 4515 function; do not escape the whole filter. DNs have different rules (`escape_rdn`), so a uid-safe helper is wrong for `cn=...,ou=...`. Then check bind vs search: a filter that returns more than one entry, or a bind that ignores an empty password, is a finding even when the filter itself is escaped.

```python vulnerable
@app.get("/api/directory")
@login_required
def directory():
    uid = request.args.get("uid", "")
    conn.search(
        "ou=people,dc=example,dc=com",
        f"(uid={uid})",  # BUG: *, (, ) change the filter
        attributes=["cn", "mail"],
    )
    return [e.entry_attributes_as_dict for e in conn.entries]
```

```python fixed
from ldap3.utils.conv import escape_filter_chars


@app.get("/api/directory")
@login_required
def directory():
    uid = request.args.get("uid", "")
    conn.search(
        "ou=people,dc=example,dc=com",
        f"(uid={escape_filter_chars(uid)})",  # FIX: RFC 4515 escape of the value only
        attributes=["cn", "mail"],
    )
    return [e.entry_attributes_as_dict for e in conn.entries]
```

```go vulnerable
func directory(w http.ResponseWriter, r *http.Request) {
	req := ldap.NewSearchRequest(
		"ou=people,dc=example,dc=com",
		ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
		fmt.Sprintf("(uid=%s)", r.URL.Query().Get("uid")), // BUG: filter syntax taken from the query string
		[]string{"cn", "mail"},
		nil,
	)
	sr, err := conn.Search(req)
	if err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(sr.Entries)
}
```

```go fixed
func directory(w http.ResponseWriter, r *http.Request) {
	req := ldap.NewSearchRequest(
		"ou=people,dc=example,dc=com",
		ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
		fmt.Sprintf("(uid=%s)", ldap.EscapeFilter(r.URL.Query().Get("uid"))), // FIX: escape the value, not the whole filter
		[]string{"cn", "mail"},
		nil,
	)
	sr, err := conn.Search(req)
	if err != nil {
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(sr.Entries)
}
```

```javascript vulnerable
app.get("/api/directory", requireUser, (req, res) => {
  const uid = String(req.query.uid ?? "");
  client.search("ou=people,dc=example,dc=com", {
    filter: `(uid=${uid})`, // BUG: *, (, ) change the filter
    scope: "sub",
    attributes: ["cn", "mail"],
  }, (err, search) => {
    if (err) return res.sendStatus(500);
    const entries = [];
    search.on("searchEntry", (entry) => entries.push(entry.pojo));
    search.on("end", () => res.json(entries));
  });
});
```

```javascript fixed
function escapeLdapFilter(value) {
  return String(value)
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00"); // FIX: RFC 4515, value only
}

app.get("/api/directory", requireUser, (req, res) => {
  const uid = escapeLdapFilter(String(req.query.uid ?? ""));
  client.search("ou=people,dc=example,dc=com", {
    filter: `(uid=${uid})`,
    scope: "sub",
    attributes: ["cn", "mail"],
  }, (err, search) => {
    if (err) return res.sendStatus(500);
    const entries = [];
    search.on("searchEntry", (entry) => entries.push(entry.pojo));
    search.on("end", () => res.json(entries));
  });
});
```

### XML injection and XXE

Two bugs share this heading. XML injection is the concatenation story: user text closes a tag and opens another. XXE is the parser expanding an external entity and reading a file or hitting a URL. They are not the file-inclusion bugs in File Handling; the app never chose a path, the parser did.

> **Where to look:** SOAP and SAML, XML uploads, RSS/Atom imports, office-document unzip-and-parse paths. Grep for `lxml`, `etree.fromstring`, `defusedxml` (Python), `encoding/xml`, `libxml2`, `xml.Unmarshal` (Go), and `libxmljs2`, `parseXml`, `noent`, `fast-xml-parser`, `processEntities` (Node). Also grep for `f"<` or `Sprintf("<` that build XML by hand.
>
> **How to think:** First, is any XML built with string formatting? If yes, switch to a serializer (`ElementTree`, `encoding/xml`, an object-to-XML library). Then read the parser flags. lxml resolves entities by default; turn `resolve_entities` off or use `defusedxml`. Go's `encoding/xml` does not expand external entities, so a stdlib-only decoder is not an XXE hole; XXE in Go means a libxml2 wrapper (or someone turning `XMLParseNoEnt` on). libxmljs2 defaults `noent` to false; the hole is a teammate setting `noent: true` because the name reads like "no entities." `fast-xml-parser` needs `processEntities: false`. This is not LFI. The request never named `/etc/passwd`; the DTD did.

```python vulnerable
from lxml import etree


@app.post("/api/contacts/import")
@login_required
def import_contacts():
    root = etree.fromstring(request.get_data())  # BUG: default parser resolves external entities
    names = [el.text for el in root.findall("contact/name")]
    return {"imported": names}
```

```python fixed
from lxml import etree


@app.post("/api/contacts/import")
@login_required
def import_contacts():
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False)  # FIX: no entity expansion; defusedxml.ElementTree.fromstring is the other safe option
    root = etree.fromstring(request.get_data(), parser)
    names = [el.text for el in root.findall("contact/name")]
    return {"imported": names}
```

```go vulnerable
import (
	"github.com/lestrrat-go/libxml2"
	"github.com/lestrrat-go/libxml2/parser"
	"github.com/lestrrat-go/libxml2/xpath"
)

func importContacts(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	// encoding/xml does not expand entities. This handler reached for libxml2 for XPath.
	doc, err := libxml2.Parse(body, parser.XMLParseNoEnt) // BUG: NOENT substitutes entities, including file://
	if err != nil {
		http.Error(w, "bad xml", http.StatusBadRequest)
		return
	}
	defer doc.Free()
	fmt.Fprintln(w, xpath.String(doc.Find("//contact/name/text()")))
}
```

```go fixed
type ContactList struct {
	XMLName  xml.Name  `xml:"contacts"`
	Contacts []Contact `xml:"contact"`
}

type Contact struct {
	Name  string `xml:"name"`
	Email string `xml:"email"`
}

func importContacts(w http.ResponseWriter, r *http.Request) {
	// FIX: encoding/xml never expands DTD entities. Use it for untrusted input; skip libxml2 unless you need XPath, and never pass XMLParseNoEnt.
	dec := xml.NewDecoder(io.LimitReader(r.Body, 1<<20))
	var list ContactList
	if err := dec.Decode(&list); err != nil {
		http.Error(w, "bad xml", http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(list)
}
```

```javascript vulnerable
const libxmljs = require("libxmljs2");

app.post("/api/contacts/import", requireUser, express.text({ type: "application/xml" }), (req, res) => {
  const doc = libxmljs.parseXml(req.body, { noent: true }); // BUG: noent substitutes entities, including file://
  const names = doc.find("//contact/name").map((n) => n.text());
  res.json({ imported: names });
});
```

```javascript fixed
const libxmljs = require("libxmljs2");

app.post("/api/contacts/import", requireUser, express.text({ type: "application/xml" }), (req, res) => {
  const doc = libxmljs.parseXml(req.body, { noent: false, dtdload: false }); // FIX: no entity substitution (fast-xml-parser: processEntities: false)
  const names = doc.find("//contact/name").map((n) => n.text());
  res.json({ imported: names });
});
```

### Command injection

The shell is the interpreter. Build a command string with `os.system`, `sh -c`, or `exec()` and the shell will treat metacharacters in the value as more commands. An argument vector with no shell closes that hole. A tight check on the value (allowlist, or an IP parse) stops the leftover cases such as option flags.

> **Where to look:** diagnostics, image and PDF converters, backup jobs, anything that shells out to `ping`, `convert`, `ffmpeg`, `tar`, or `git`. Grep for `os.system`, `shell=True`, `subprocess` (Python), `exec.Command("sh"`, `exec.Command("bash"` (Go), and `exec(`, `execSync(`, child_process template literals (Node).
>
> **How to think:** Can any request value reach a shell? If the process is started with a string, the answer is yes. The fix is `subprocess.run([prog, arg, ...])`, `exec.Command(prog, args...)`, or `execFile`, plus `--` before the value so it cannot become a flag. `shlex.quote` plus `shell=True` is still a shell. After that, ask where the process can talk: a safe argv that pings an internal IP is a different bug. This is not LFI. The interpreter is the shell, not a file loader.

```python vulnerable
@app.post("/diag/ping")
@login_required
def ping_host():
    host = request.form["host"]
    os.system(f"ping -c 1 {host}")  # BUG: the shell parses host
    return "ok"
```

```python fixed
@app.post("/diag/ping")
@login_required
def ping_host():
    host = request.form.get("host", "")
    try:
        ipaddress.ip_address(host)  # FIX: only a literal IP
    except ValueError:
        return "IP address required", 400
    subprocess.run(["ping", "-c", "1", "--", host], check=True, timeout=5)  # FIX: argv, no shell
    return "ok"
```

```go vulnerable
func pingHost(w http.ResponseWriter, r *http.Request) {
	host := r.PostFormValue("host")
	out, err := exec.Command("sh", "-c", "ping -c 1 "+host).CombinedOutput() // BUG: sh parses host
	if err != nil {
		http.Error(w, "ping failed", http.StatusBadRequest)
		return
	}
	w.Write(out)
}
```

```go fixed
func pingHost(w http.ResponseWriter, r *http.Request) {
	host := r.PostFormValue("host")
	if net.ParseIP(host) == nil { // FIX: only a literal IP
		http.Error(w, "IP address required", http.StatusBadRequest)
		return
	}
	out, err := exec.CommandContext(r.Context(), "ping", "-c", "1", "--", host).CombinedOutput() // FIX: argv, no shell
	if err != nil {
		http.Error(w, "ping failed", http.StatusBadRequest)
		return
	}
	w.Write(out)
}
```

```javascript vulnerable
const { exec } = require("child_process");

app.post("/diag/ping", requireUser, express.urlencoded({ extended: false }), (req, res) => {
  exec(`ping -c 1 ${req.body.host}`, (err, stdout) => { // BUG: the shell parses host
    if (err) return res.status(400).send("ping failed");
    res.type("text/plain").send(stdout);
  });
});
```

```javascript fixed
const { execFile } = require("child_process");
const net = require("net");

app.post("/diag/ping", requireUser, express.urlencoded({ extended: false }), (req, res) => {
  const host = String(req.body.host ?? "");
  if (!net.isIP(host)) return res.status(400).send("IP address required"); // FIX: only a literal IP
  execFile("ping", ["-c", "1", "--", host], { timeout: 5000 }, (err, stdout) => { // FIX: argv, no shell
    if (err) return res.status(400).send("ping failed");
    res.type("text/plain").send(stdout);
  });
});
```

### Template injection

If the request supplies the template source, the engine runs it. That is a different bug from picking a template file by name (see Local and remote file inclusion). Flask `render_template_string` with user text, Go `template.Parse` on a form field, and `ejs.render` on a request string are the usual spots.

> **Where to look:** preview endpoints, notification builders, report-title renderers, and any call whose first argument is not a string literal or a file parsed at startup. Grep for `render_template_string`, `from_string`, `Environment` (Python), `template.Parse(`, `text/template` (Go), and `ejs.render(`, `Handlebars.compile(`, `_.template(` (Node).
>
> **How to think:** Who wrote the template? If the answer is the request, that is injection, even when you pass a safe context afterwards. `render_template("greet.html", name=name)` keeps the template on disk and the request as data. Go needs `html/template` when the output is HTML; `text/template` will not escape, and `Parse` of user text still runs actions in either package. EJS, Handlebars, and lodash templates are the same story: compile a file you shipped, put request values in the data object, never in the source string.

```python vulnerable
@app.get("/greet")
def greet():
    name = request.args.get("name", "world")
    html = render_template_string(f"<h1>Hello {name}</h1>")  # BUG: {{ }} in name runs as Jinja
    resp = make_response(html)
    resp.mimetype = "text/html"
    return resp
```

```python fixed
@app.get("/greet")
def greet():
    name = request.args.get("name", "world")
    html = render_template("greet.html", name=name)  # FIX: file on disk; name is data
    resp = make_response(html)
    resp.mimetype = "text/html"
    return resp
```

```go vulnerable
import "text/template"

func greet(w http.ResponseWriter, r *http.Request) {
	src := "<h1>Hello " + r.FormValue("name") + "</h1>"
	tmpl, err := template.New("greet").Parse(src) // BUG: request text becomes template actions; text/template also skips HTML escaping
	if err != nil {
		http.Error(w, "bad template", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmpl.Execute(w, nil)
}
```

```go fixed
import "html/template"

var greetTmpl = template.Must(template.ParseFiles("templates/greet.html")) // FIX: file on disk; html/template escapes HTML

func greet(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := greetTmpl.Execute(w, map[string]string{"Name": r.FormValue("name")}); err != nil { // FIX: name is data
		slog.Error("render greet", "err", err)
	}
}
```

```javascript vulnerable
const ejs = require("ejs");

app.get("/greet", (req, res) => {
  const name = String(req.query.name ?? "world");
  const html = ejs.render(`<h1>Hello ${name}</h1>`); // BUG: ejs compiles the request text
  res.type("html").send(html);
});
```

```javascript fixed
app.get("/greet", (req, res) => {
  const name = String(req.query.name ?? "world");
  res.type("html");
  res.render("greet", { name }); // FIX: view file on disk; name is data
});
```

---

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

## Cryptographic Review

Most of an application's crypto lives in one small helper module that nobody has opened in years (`utils/crypto.py`, `internal/crypto`, `lib/crypto.js`) and in the code that calls it: token signing, field encryption before a database or S3 write, outbound HTTP clients, and key loading at startup. Find every import of a crypto package first, then read the helpers before the callers. The algorithms themselves are rarely the problem. The parameters are: modes, IVs, key sizes, and where the key came from.

### Cryptographic libraries

Hand-rolled "encryption" (XOR with a fixed key, base64, a clever cipher someone wrote on a Friday) falls to the first person who compares two ciphertexts. Even real primitives go wrong when you wire them together yourself, so the safe choice is a vetted high-level box that picks the cipher, the nonce, and the MAC for you.

> **Where to look:** helper modules with functions named `encrypt`, `obfuscate`, `scramble`, or `encode_secret`, and the dependency manifests. Grep for `b64encode` near "encrypt", `^ KEY`, and `pycrypto` in requirements files (Python), XOR loops over a `key` slice and `crypto/aes` used without `cipher.NewGCM` (Go), and `createCipher(`, `crypto-js`, `node-forge` (Node).
>
> **How to think:** Can I say what this code guarantees in one sentence, the way I can for `Fernet` or `secretbox` ("confidential, tamper-evident, fresh nonce every time")? If the author chose the mode, built the IV, and bolted on a MAC by hand, assume one of those steps is wrong until I've checked it. Then look at the library itself. Is it maintained, and is the pinned version patched? PyCrypto hasn't shipped a release since 2013 and carries a known heap overflow, so move to `cryptography` or PyCryptodome; crypto-js is no longer developed, and its PBKDF2 defaulted to SHA-1 with a single iteration until 4.2.0. I want libraries with a long, boring track record: `cryptography` and PyNaCl, Go's standard library and `golang.org/x/crypto`, Node's built-in `crypto` and libsodium bindings. One wrinkle: Fernet uses AES-128 under its HMAC, so if your standard demands 256-bit keys (see Cipher strength), PyNaCl's `nacl.secret.SecretBox` gives you the same one-call API with a 256-bit key.

```python vulnerable
KEY = b"acme-2019"


def encrypt(data: bytes) -> str:
    out = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(data))  # BUG: repeating-key XOR; one known plaintext reveals the key
    return base64.b64encode(out).decode()


def protect_ssn(ssn: str) -> str:
    return base64.b64encode(ssn.encode()).decode()  # BUG: base64 is an encoding anyone can reverse
```

```python fixed
from cryptography.fernet import Fernet, InvalidToken

box = Fernet(settings.DATA_KEY)  # FIX: vetted recipe (AES-CBC + HMAC-SHA256); key comes from the secret manager


def encrypt(data: bytes) -> str:
    return box.encrypt(data).decode()  # random IV, timestamp, and MAC handled by the library


def protect_ssn(ssn: str) -> str:
    return encrypt(ssn.encode())  # FIX: real encryption instead of an encoding


def decrypt(token: str) -> bytes | None:
    try:
        return box.decrypt(token)
    except InvalidToken:  # FIX: tampered or wrong-key tokens are rejected
        return None
```

```go vulnerable
var xorKey = []byte("acme-2019")

func encrypt(data []byte) string {
	out := make([]byte, len(data))
	for i, b := range data {
		out[i] = b ^ xorKey[i%len(xorKey)] // BUG: repeating-key XOR; one known plaintext reveals the key
	}
	return base64.StdEncoding.EncodeToString(out) // BUG: no nonce and no MAC, so equal inputs match and edits go unnoticed
}
```

```go fixed
var key [32]byte // FIX: 256-bit key, filled from the secret manager at startup

func encrypt(msg []byte) ([]byte, error) {
	var nonce [24]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return nil, err
	}
	return secretbox.Seal(nonce[:], msg, &nonce, &key), nil // FIX: XSalsa20-Poly1305, random nonce prepended
}

func decrypt(box []byte) ([]byte, error) {
	if len(box) < 24 {
		return nil, errors.New("ciphertext too short")
	}
	var nonce [24]byte
	copy(nonce[:], box[:24])
	msg, ok := secretbox.Open(nil, box[24:], &nonce, &key)
	if !ok { // FIX: any tampering fails authentication
		return nil, errors.New("decryption failed")
	}
	return msg, nil
}
```

```javascript vulnerable
const crypto = require("crypto");

function encrypt(text) {
  const cipher = crypto.createCipher("aes-256-cbc", process.env.APP_SECRET); // BUG: removed in Node 22; key and IV come from one MD5 pass, so the IV never changes
  return cipher.update(text, "utf8", "base64") + cipher.final("base64"); // BUG: no MAC, so flipped bits change the plaintext undetected
}

function decrypt(b64) {
  const decipher = crypto.createDecipher("aes-256-cbc", process.env.APP_SECRET);
  return decipher.update(b64, "base64", "utf8") + decipher.final("utf8");
}
```

```javascript fixed
const nacl = require("tweetnacl");

const key = Buffer.from(process.env.DATA_KEY_B64, "base64"); // FIX: 32 random bytes from the secret manager

function encrypt(text) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(Buffer.from(text, "utf8"), nonce, key); // FIX: XSalsa20-Poly1305 in one call
  return Buffer.concat([nonce, box]).toString("base64");
}

function decrypt(b64) {
  const raw = Buffer.from(b64, "base64");
  const n = nacl.secretbox.nonceLength;
  const msg = nacl.secretbox.open(raw.subarray(n), raw.subarray(0, n), key);
  if (!msg) throw new Error("decryption failed"); // FIX: tampered input never reaches the caller
  return Buffer.from(msg).toString("utf8");
}
```

### Hashing functions

A hash that guards integrity or proves who sent something has to hold up against someone trying to forge it. The classic break is a home-made MAC like `md5(secret + data)`: with MD5, SHA-1, or SHA-256, anyone holding one valid tag can compute another for `data + padding + "&role=admin"` without knowing the secret. Stored passwords need a different tool entirely; see Authentication > Password hashing.

> **Where to look:** anything that signs or checks a token, cookie, download link, or webhook, and any digest that's supposed to prove a file wasn't changed. Grep for `hashlib.md5`, `hashlib.sha1`, and `hexdigest()` over a key plus data (Python), `md5.Sum`, `sha1.New` (Go), and `createHash("md5")` or `createHash("sha1")` near a secret (Node).
>
> **How to think:** First, what is the hash for? A checksum on a download only helps if the checksum arrives over a channel the attacker can't touch; otherwise they swap both. Anything that has to prove who produced the data needs a key, which means HMAC or a real signature, never a bare hash with the secret glued on the front. Then the algorithm. MD5 and SHA-1 are out for anything security-relevant because both have practical collisions (SHA-1's chosen-prefix collision landed in 2020), so signatures and MACs use SHA-256, SHA-384, or SHA-512. Last, check how the tag gets compared, since an early-exit `==` leaks the right answer byte by byte (see Timing attacks).

```python vulnerable
SIGNING_KEY = settings.SIGNING_KEY  # 32 random bytes


def sign(payload: bytes) -> str:
    return hashlib.md5(SIGNING_KEY + payload).hexdigest()  # BUG: md5(key + data) can be extended without the key


def verify(payload: bytes, sig: str) -> bool:
    return sign(payload) == sig  # BUG: early-exit compare
```

```python fixed
SIGNING_KEY = settings.SIGNING_KEY  # 32 random bytes


def sign(payload: bytes) -> str:
    return hmac.new(SIGNING_KEY, payload, hashlib.sha256).hexdigest()  # FIX: HMAC-SHA256 isn't open to length extension


def verify(payload: bytes, sig: str) -> bool:
    return hmac.compare_digest(sign(payload).encode(), sig.encode())  # FIX: constant-time, and safe on non-ASCII input
```

```go vulnerable
var signingKey = loadKey("signing") // 32 random bytes

func sign(payload []byte) string {
	h := sha1.New()
	h.Write(signingKey) // BUG: sha1(key + data) is open to length extension
	h.Write(payload)
	return hex.EncodeToString(h.Sum(nil))
}

func verify(payload []byte, sig string) bool {
	return sign(payload) == sig // BUG: early-exit compare
}
```

```go fixed
var signingKey = loadKey("signing") // 32 random bytes

func sign(payload []byte) []byte {
	mac := hmac.New(sha256.New, signingKey) // FIX: HMAC-SHA256
	mac.Write(payload)
	return mac.Sum(nil)
}

func verify(payload []byte, sigHex string) bool {
	sig, err := hex.DecodeString(sigHex)
	return err == nil && hmac.Equal(sig, sign(payload)) // FIX: constant-time compare
}
```

```javascript vulnerable
const SIGNING_KEY = Buffer.from(process.env.SIGNING_KEY_B64, "base64");

function sign(payload) {
  return crypto.createHash("md5").update(SIGNING_KEY).update(payload).digest("hex"); // BUG: md5(key + data), extendable without the key
}

function verify(payload, sig) {
  return sign(payload) === sig; // BUG: early-exit compare
}
```

```javascript fixed
const SIGNING_KEY = Buffer.from(process.env.SIGNING_KEY_B64, "base64");

function sign(payload) {
  return crypto.createHmac("sha256", SIGNING_KEY).update(payload).digest(); // FIX: HMAC-SHA256
}

function verify(payload, sigHex) {
  const expected = sign(payload);
  const got = Buffer.from(String(sigHex), "hex");
  return got.length === expected.length && crypto.timingSafeEqual(got, expected); // FIX: length check, then constant-time
}
```

### Encryption functions

Data at rest needs authenticated encryption, meaning a mode that refuses to decrypt anything that was altered. CBC or ECB with a fixed IV shows which records are equal and lets an attacker flip bits without detection. GCM with a repeated nonce is worse: it leaks plaintext and hands out the key needed to forge tags.

> **Where to look:** code that writes sensitive fields to a database, object store, cache, or queue, and the matching read path. Grep for `modes.CBC`, `modes.ECB`, `AES.new(` (Python), `NewCBCEncrypter` and every `gcm.Seal` along with where its nonce comes from (Go), and `createCipheriv(` with `-cbc` or `-ecb`, `Buffer.alloc(16)` (Node).
>
> **How to think:** Start by asking whether the data needs storing at all. A billing job that writes full card numbers to S3, like the one below, usually needs only the last four digits; tokenize through the payment processor or drop the PAN, and your PCI scope shrinks with it. If something must be encrypted, I look for an AEAD mode (AES-256-GCM or ChaCha20-Poly1305), a fresh nonce from a CSPRNG for every message, stored next to the ciphertext, and a key fetched from KMS or a secret manager. Is the record's ID bound in as associated data, so a blob copied onto another customer's row fails to decrypt? With random 96-bit GCM nonces, rotate the key well before 2^32 messages. And know what bucket-level encryption buys you: S3 server-side encryption covers stolen disks, but anyone with `s3:GetObject` still reads plaintext. Data in transit is a separate problem that TLS handles (see SSL/TLS configuration).

```python vulnerable
KEY = bytes.fromhex(os.environ["CARD_KEY_HEX"])
IV = bytes(16)  # BUG: the same all-zero IV for every record


def store_card(txn_id: str, pan: str) -> None:
    padder = padding.PKCS7(128).padder()
    data = padder.update(pan.encode()) + padder.finalize()
    enc = Cipher(algorithms.AES(KEY), modes.CBC(IV)).encryptor()
    blob = enc.update(data) + enc.finalize()  # BUG: no MAC, so altered blobs decrypt without complaint
    s3.put_object(Bucket="acme-billing", Key=f"txn/{txn_id}", Body=blob)
```

```python fixed
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

aead = AESGCM(kms_data_key("card-data"))  # FIX: 256-bit key from KMS, cached in memory, never in source or env


def store_card(txn_id: str, pan: str) -> None:
    nonce = os.urandom(12)  # FIX: fresh 96-bit nonce per message
    blob = nonce + aead.encrypt(nonce, pan.encode(), txn_id.encode())  # FIX: GCM tag, bound to this record ID
    s3.put_object(Bucket="acme-billing", Key=f"txn/{txn_id}", Body=blob)


def load_card(txn_id: str) -> str:
    blob = s3.get_object(Bucket="acme-billing", Key=f"txn/{txn_id}")["Body"].read()
    return aead.decrypt(blob[:12], blob[12:], txn_id.encode()).decode()  # raises InvalidTag if altered or moved
```

```go vulnerable
var (
	cardKey    = []byte(os.Getenv("CARD_KEY"))
	fixedNonce = make([]byte, 12) // BUG: one nonce reused for every record
)

func storeCard(ctx context.Context, txnID, pan string) error {
	block, err := aes.NewCipher(cardKey)
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	blob := gcm.Seal(nil, fixedNonce, []byte(pan), nil) // BUG: repeated nonce leaks plaintext and lets tags be forged
	return putObject(ctx, "acme-billing", "txn/"+txnID, blob)
}
```

```go fixed
var cardKey = loadDataKey("card-data") // FIX: 32-byte key from KMS, so aes.NewCipher selects AES-256

func storeCard(ctx context.Context, txnID, pan string) error {
	block, err := aes.NewCipher(cardKey)
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil { // FIX: fresh 96-bit nonce per message
		return err
	}
	blob := gcm.Seal(nonce, nonce, []byte(pan), []byte(txnID)) // FIX: nonce prepended, record ID as associated data
	return putObject(ctx, "acme-billing", "txn/"+txnID, blob)
}
```

```javascript vulnerable
const KEY = Buffer.from(process.env.CARD_KEY_HEX, "hex");

async function storeCard(txnId, pan) {
  const cipher = crypto.createCipheriv("aes-256-ecb", KEY, null); // BUG: ECB, so the same PAN always produces the same bytes
  const blob = Buffer.concat([cipher.update(pan, "utf8"), cipher.final()]); // BUG: no auth tag; blobs can be altered or swapped between records
  await s3.send(new PutObjectCommand({ Bucket: "acme-billing", Key: `txn/${txnId}`, Body: blob }));
}
```

```javascript fixed
async function storeCard(txnId, pan) {
  const key = await dataKey("card-data"); // FIX: 32-byte key from KMS, cached in memory
  const iv = crypto.randomBytes(12); // FIX: fresh 96-bit nonce per message
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(txnId)); // FIX: the blob only decrypts under its own record ID
  const enc = Buffer.concat([cipher.update(pan, "utf8"), cipher.final()]);
  const blob = Buffer.concat([iv, cipher.getAuthTag(), enc]);
  await s3.send(new PutObjectCommand({ Bucket: "acme-billing", Key: `txn/${txnId}`, Body: blob }));
}
```

### Cipher strength

Key size and algorithm decide how much work brute force or factoring takes. A 1024-bit RSA key, DES, 3DES, or RC4 was acceptable once and isn't now, and these tend to survive in key-generation scripts and "legacy" partner integrations long after everyone forgot they exist.

> **Where to look:** key and certificate generation in app code, Makefiles, Terraform, and Dockerfiles, plus JWT and SAML signing config and the cipher choices in old integrations. Grep for `key_size=`, `TripleDES`, `ARC4` (Python), `rsa.GenerateKey`, `crypto/des`, `crypto/rc4` (Go), `modulusLength`, `des-ede3`, `rc4` (Node), and `openssl genrsa` or `rsa:1024` in scripts.
>
> **How to think:** Hold every key to written minimums. For new systems that's 256-bit symmetric keys (AES-256 or ChaCha20), 2048-bit RSA as the floor with 3072 preferred (NIST only approves 2048 through 2030), 256-bit ECC such as P-256 or Curve25519, and no certificate anywhere in the chain below those numbers. RC4, DES, and 3DES are out everywhere. Where does the size come from: a constant, a config value, or a library default nobody checked? Long-lived keys matter most, because a signing key generated in 2015 may still be in production. For new signing keys Ed25519 is the easy default. Small keys, fast, and no padding or hash choice to get wrong.

```python vulnerable
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa


def new_signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=1024)  # BUG: 1024-bit RSA is below every current minimum


def sign_license(key, blob: bytes) -> bytes:
    return key.sign(blob, padding.PKCS1v15(), hashes.SHA256())
```

```python fixed
from cryptography.hazmat.primitives.asymmetric import ed25519


def new_signing_key():
    return ed25519.Ed25519PrivateKey.generate()  # FIX: Ed25519; if a verifier needs RSA, use key_size=3072


def sign_license(key, blob: bytes) -> bytes:
    return key.sign(blob)  # FIX: no padding or hash choice to get wrong
```

```go vulnerable
func newSigningKey() (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, 1024) // BUG: 1024-bit RSA is below every current minimum
}

func signLicense(key *rsa.PrivateKey, blob []byte) ([]byte, error) {
	sum := sha256.Sum256(blob)
	return rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, sum[:])
}
```

```go fixed
func newSigningKey() (ed25519.PrivateKey, error) {
	_, priv, err := ed25519.GenerateKey(rand.Reader) // FIX: Ed25519 instead of short RSA
	return priv, err
}

func signLicense(key ed25519.PrivateKey, blob []byte) []byte {
	return ed25519.Sign(key, blob) // FIX: no hash or padding to pick
}
```

```javascript vulnerable
function newSigningKey() {
  return crypto.generateKeyPairSync("rsa", { modulusLength: 1024 }); // BUG: 1024-bit RSA is below every current minimum
}

function signLicense(privateKey, blob) {
  return crypto.sign("sha256", blob, privateKey);
}
```

```javascript fixed
function newSigningKey() {
  return crypto.generateKeyPairSync("ed25519"); // FIX: Ed25519 instead of short RSA
}

function signLicense(privateKey, blob) {
  return crypto.sign(null, blob, privateKey); // FIX: Ed25519 hashes internally, so the algorithm is null
}
```

### SSL/TLS configuration

TLS only protects a connection if the client checks the certificate and both ends refuse old protocol versions. Turning verification off, usually "for now" to get past a self-signed internal cert, lets anyone on the network path read and change the traffic.

> **Where to look:** HTTP client setup, calls to internal services, TLS options on SMTP, database, Redis, and queue connections, and the server or load balancer TLS policy. Grep for `verify=False`, `CERT_NONE`, `_create_unverified_context` (Python), `InsecureSkipVerify`, `MinVersion` (Go), `rejectUnauthorized`, `NODE_TLS_REJECT_UNAUTHORIZED`, `minVersion` (Node), and `http://` in config files.
>
> **How to think:** Is every outbound connection encrypted and verified, internal ones included? A pattern I still find in legacy clients builds `http://my-service.cloud.biz/Login?usr=...&pwd=...` and sends it as a GET, which puts the password in plaintext on the wire and in every proxy log along the way. The fix is HTTPS plus credentials in a POST body or an `Authorization` header. For internal services signed by a private CA, the answer is a CA bundle, never `verify=False`. Then the protocol floor: TLS 1.2 minimum, TLS 1.3 preferred, TLS 1.0, 1.1, and every SSL version off. Cipher suites should be AEAD with forward secrecy (ECDHE with AES-GCM or ChaCha20-Poly1305). Current Go, OpenSSL 3, and Node defaults already do that, so a hand-written cipher list is a reason to look closer. Certificate pinning fits mobile apps and links where you control both ends; pin the public key, keep a backup pin, and have a rotation plan, or one certificate renewal takes the app down.

```python vulnerable
def fetch_invoices(customer_id: str) -> dict:
    resp = requests.get(
        f"https://billing.internal/api/invoices/{customer_id}",
        headers={"Authorization": f"Bearer {settings.BILLING_TOKEN}"},
        verify=False,  # BUG: any certificate passes, so the bearer token goes to whoever answers
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def send_receipt(msg) -> None:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # BUG: the SMTP hop skips verification too
    ctx.minimum_version = ssl.TLSVersion.TLSv1  # BUG: TLS 1.0 still negotiable
    with smtplib.SMTP("mail.internal", 587) as smtp:
        smtp.starttls(context=ctx)
        smtp.send_message(msg)
```

```python fixed
INTERNAL_CA = "/etc/ssl/internal-ca.pem"


def fetch_invoices(customer_id: str) -> dict:
    resp = requests.get(
        f"https://billing.internal/api/invoices/{customer_id}",
        headers={"Authorization": f"Bearer {settings.BILLING_TOKEN}"},
        verify=INTERNAL_CA,  # FIX: trust the private CA; chain and hostname are still checked
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def send_receipt(msg) -> None:
    ctx = ssl.create_default_context(cafile=INTERNAL_CA)  # FIX: CERT_REQUIRED and hostname checking on
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2  # FIX: nothing older than TLS 1.2
    with smtplib.SMTP("mail.internal", 587) as smtp:
        smtp.starttls(context=ctx)
        smtp.send_message(msg)
```

```go vulnerable
func newBillingClient() *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,             // BUG: any certificate, any hostname
				MinVersion:         tls.VersionTLS10, // BUG: TLS 1.0 still negotiable
			},
		},
	}
}
```

```go fixed
func newBillingClient() (*http.Client, error) {
	caPEM, err := os.ReadFile("/etc/ssl/internal-ca.pem")
	if err != nil {
		return nil, err
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(caPEM) {
		return nil, errors.New("no certificates in internal CA bundle")
	}
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				RootCAs:    pool,             // FIX: verify against the private CA
				MinVersion: tls.VersionTLS12, // FIX: TLS 1.2 or newer
			},
		},
	}, nil
}
```

```javascript vulnerable
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false, // BUG: any certificate is accepted
  minVersion: "TLSv1", // BUG: TLS 1.0 still negotiable
});

async function fetchInvoices(customerId) {
  const res = await axios.get(`https://billing.internal/api/invoices/${customerId}`, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${process.env.BILLING_TOKEN}` },
  });
  return res.data;
}
```

```javascript fixed
const fs = require("fs");
const https = require("https");

const agent = new https.Agent({
  ca: fs.readFileSync("/etc/ssl/internal-ca.pem"), // FIX: trust the private CA; verification stays on
  minVersion: "TLSv1.2", // FIX: TLS 1.2 or newer
});

async function fetchInvoices(customerId) {
  const res = await axios.get(`https://billing.internal/api/invoices/${customerId}`, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${process.env.BILLING_TOKEN}` },
  });
  return res.data;
}
```

### Key and secret protection

Encryption and signing are only as strong as the secrecy of the key. A key in source code lives in every clone, CI log, and container image forever, and a key that never rotates turns one leak into permanent access.

> **Where to look:** settings modules, committed `.env` files, Dockerfiles and Helm values, CI config, and the JWT setup. Grep for `SECRET_KEY =`, `jwt.encode(` (Python), `[]byte("` near `SignedString` (Go), `jwt.sign(` with a string literal (Node), and `BEGIN PRIVATE KEY`, `sk_live_`, or `AKIA` across the whole repo and its history.
>
> **How to think:** Where does the key come from, and who else can read it? Source, config files, and images all count as published. Plain environment variables beat that, but in production they're a weaker store than a secret manager: they show up in `docker inspect`, `/proc/<pid>/environ`, crash dumps, and debug pages, and every child process inherits them. Can the key rotate without logging everyone out? A `kid` in the token header lets you sign with the new key while still verifying the old one until its tokens expire, then retire it. Is key access logged (KMS events in CloudTrail, Vault audit logs), with an alert on unusual reads? For private keys, ask whether the app needs the raw key at all, since KMS can sign on its behalf. And if a key ever reached git, deleting the line doesn't help. The history still has it, so rotate.

```python vulnerable
JWT_SECRET = "super-secret-jwt-key-2019"  # BUG: committed to git, shared by every environment, never rotated


def issue_token(user_id: int) -> str:
    claims = {"sub": str(user_id), "exp": datetime.now(UTC) + timedelta(hours=1)}
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


def read_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
```

```python fixed
KEYRING = secret_manager.get_json("jwt-signing-keys")  # FIX: {"current": kid, "keys": {kid: secret}}, loaded at startup


def issue_token(user_id: int) -> str:
    kid = KEYRING["current"]
    claims = {"sub": str(user_id), "exp": datetime.now(UTC) + timedelta(hours=1)}
    return jwt.encode(claims, KEYRING["keys"][kid], algorithm="HS256", headers={"kid": kid})  # FIX: kid names the signing key


def read_token(token: str) -> dict:
    kid = jwt.get_unverified_header(token).get("kid")
    if not isinstance(kid, str) or kid not in KEYRING["keys"]:  # FIX: unknown or retired kid fails closed
        raise jwt.InvalidTokenError("unknown kid")
    return jwt.decode(token, KEYRING["keys"][kid], algorithms=["HS256"])  # algorithm pinned, never read from the token
```

```go vulnerable
var jwtSecret = []byte("super-secret-jwt-key-2019") // BUG: in the repo, in every build, never rotated

func issueToken(userID string) (string, error) {
	claims := jwt.RegisteredClaims{Subject: userID, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}

func parseToken(raw string) (*jwt.Token, error) {
	return jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		return jwtSecret, nil
	})
}
```

```go fixed
type keyring struct {
	current string            // kid used for new tokens
	keys    map[string][]byte // every active kid, loaded from the secret manager at startup
}

func (k *keyring) issueToken(userID string) (string, error) {
	claims := jwt.RegisteredClaims{Subject: userID, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tok.Header["kid"] = k.current // FIX: kid tells the verifier which key signed it
	return tok.SignedString(k.keys[k.current])
}

func (k *keyring) parseToken(raw string) (*jwt.Token, error) {
	return jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		key, ok := k.keys[kid]
		if !ok { // FIX: unknown or retired kid fails closed
			return nil, fmt.Errorf("unknown kid %q", kid)
		}
		return key, nil
	}, jwt.WithValidMethods([]string{"HS256"})) // FIX: algorithm pinned
}
```

```javascript vulnerable
const jwt = require("jsonwebtoken");

const JWT_SECRET = "super-secret-jwt-key-2019"; // BUG: hardcoded, same in every environment, never rotated

function issueToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

function readToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
```

```javascript fixed
const jwt = require("jsonwebtoken");

let keyring; // { current: kid, keys: { [kid]: secret } }

async function loadKeyring() {
  keyring = await secrets.getJson("jwt-signing-keys"); // FIX: fetched from the secret manager at startup
}

function issueToken(userId) {
  const kid = keyring.current;
  return jwt.sign({ sub: String(userId) }, keyring.keys[kid], { algorithm: "HS256", expiresIn: "1h", keyid: kid }); // FIX: kid in the header
}

function readToken(token) {
  const kid = jwt.decode(token, { complete: true })?.header.kid;
  if (typeof kid !== "string" || !Object.hasOwn(keyring.keys, kid)) { // FIX: unknown kid fails closed
    throw new jwt.JsonWebTokenError("unknown kid");
  }
  return jwt.verify(token, keyring.keys[kid], { algorithms: ["HS256"] });
}
```

---

## SAST Tools and Automation

Static analysis reads source code without running it and flags patterns like the ones in this guide: `shell=True`, `verify=False`, `InsecureSkipVerify: true`, a signing key sitting in a string literal. It's very good at finding the same mistake in 300 places. It's very bad at knowing that `/admin/export` should require an admin. Treat its output as a list of leads for review, and treat a clean scan as "no known patterns found," never as "secure."

### Where SAST fits in CI

Run it on every pull request, diff-aware where the tool supports it, so authors see only the findings their change introduced while the code is still fresh in their heads. A full scan of the main branch nightly or weekly catches what new rules find in old code. Fail the build only on high-confidence, high-severity rules, such as a hardcoded cloud key or TLS verification turned off. A gate that blocks on every medium finding gets disabled within a month.

Everything else lands in a queue that someone owns. Review each finding, decide whether attacker input can actually reach the sink, and prioritize by exploitability and exposure rather than the tool's severity label. False positives get documented and suppressed in the code, with a reason: `# nosec B602` for Bandit, `// #nosec G402 -- test-only client` for gosec, `# nosemgrep: rule-id` for Semgrep. The suppression then goes through code review like any other change, and grepping for `nosec` gives you an audit list. Keep the tools and rule packs current, too. Pin versions in CI so builds are reproducible, then bump them on a schedule, since new rules are how you catch new APIs and new bug classes.

### Manual review vs automated tools

Tools win on known patterns: dangerous functions, missing flags, weak algorithms, and tainted data reaching a sink inside the call graph they can follow. People win on business logic. Think of an IDOR where the query is parameterized but never checks ownership, a refund endpoint that pays out twice when called concurrently, a multi-step flow where step three trusts whatever step one stored, or a crypto helper whose "random" IV turns out to be a constant defined two files away. Data that crosses a queue or another service usually drops out of a scanner's view as well.

So use both, in that order. Let the tools clear the obvious findings so reviewer time goes to authorization, state, and trust boundaries. Then close the loop: when manual review finds a bug with a recognizable shape, write a rule for it so the same bug can't come back quietly.

### Tools by language

| Language | Tools |
| --- | --- |
| Python | Bandit, Semgrep |
| Go | gosec, govulncheck, staticcheck |
| Node.js | eslint-plugin-security, njsscan, Semgrep |
| Ruby | Brakeman |
| Any | CodeQL, SonarQube, Checkmarx, Veracode |

Bandit and gosec are the quickest wins. Bandit flags `shell=True` (B602) and `verify=False` (B501); gosec flags hardcoded credentials (G101) and weak TLS settings (G402). govulncheck works differently from the rest: it checks your dependencies against the Go vulnerability database and reports a CVE only when your code actually reaches the vulnerable function, which cuts a lot of the noise you get from plain dependency scanners. staticcheck is a correctness linter more than a security tool, but it catches the ignored errors and dead branches where bugs like to hide. On the Node side, eslint-plugin-security runs inside the linter developers already have open, and njsscan adds checks aimed at Express apps. Brakeman is built for Rails. CodeQL, SonarQube, Checkmarx, and Veracode cover many languages and trace dataflow across files, at the cost of slower scans and more tuning.

### Writing a custom rule

Semgrep rules look like the code they match, which makes them the fastest way to encode a bug you found by hand. This one flags the pattern from Command injection: a `subprocess` call with `shell=True`.

```yaml
rules:
  - id: python-subprocess-shell-true
    languages: [python]
    severity: ERROR
    message: >-
      subprocess called with shell=True. If any part of the command comes from
      user input, this is command injection. Pass an argument list and drop
      shell=True (see Command injection).
    pattern-either:
      - pattern: subprocess.run(..., shell=True, ...)
      - pattern: subprocess.call(..., shell=True, ...)
      - pattern: subprocess.check_call(..., shell=True, ...)
      - pattern: subprocess.check_output(..., shell=True, ...)
      - pattern: subprocess.Popen(..., shell=True, ...)
```

Commit rules like this to the repo (a `.semgrep/` directory works) and run them with `semgrep --config .semgrep/` locally and in the same CI job as the stock rule packs. It'll also match commands built entirely from constants. If that gets noisy, wrap it in a `patterns:` block with a `pattern-not` for string literals, and what's left is worth reading.

---

## Interview clusters

- Fundamentals: "Manual vs SAST?" "What do you look for first in a PR?"
- Senior: "How do you scope a review for a large change?" "Business logic, how do you find it?"
- Staff: "Build a review program with SLAs without blocking every ship."

---

## Cross-links

OWASP categories, SQL Injection, XSS, IDOR, deserialization topics, Product Security Real-World Scenarios.
