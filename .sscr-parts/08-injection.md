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
