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
