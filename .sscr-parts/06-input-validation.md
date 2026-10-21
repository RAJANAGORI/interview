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
