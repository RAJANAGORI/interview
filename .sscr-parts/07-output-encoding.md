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
