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
