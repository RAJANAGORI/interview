## AAA

Authentication, authorization, and accounting are the questions about the actor. Who is calling, what may they touch, what record exists after. I ask those three before I argue about crypto or input filters, because a billing API named ledger can hash passwords perfectly and still settle a stranger's invoice or let someone edit the refund history.

### Authentication

`POST /internal/settle` runs the settlement with no caller check. The author assumed the private network was the trust boundary, so any host that can open the port can mark an invoice settled. This is service authentication, not a user password.

> **Where to look:** the `POST /internal/settle` handler and any sibling under `/internal` that never reads a caller header. Grep for `/internal/settle` with no `hmac.compare_digest` (Python), `HandleFunc("POST /internal/settle"` with no `ConstantTimeCompare` (Go), and `app.post("/internal/settle"` with no `timingSafeEqual` (Node).
>
> **How to think:** I write the assumption down first: the VPC is enough. Then I open the handler and ask what still settles an invoice if a debug pod, a stolen kubeconfig, or an SSRF from the public app can reach that port while the security group still says internal. The secret comes from the environment and is compared in constant time (`hmac.compare_digest`, `subtle.ConstantTimeCompare` on equal-length slices, `crypto.timingSafeEqual` only after the lengths match), and a missing header is a 401. Credential stuffing and session hijacking are cousins. Both sit on the browser-to-API boundary, where a person guesses a password or replays a stolen cookie. They don't close this hop.

```python vulnerable
@app.post("/internal/settle")  # BUG: no caller check; the private network was the trust boundary
def settle():
    body = request.get_json(silent=True) or {}
    invoice_id = body.get("invoice_id")
    if not invoice_id:
        abort(400)
    db.execute(
        "UPDATE invoices SET status = 'settled' WHERE id = %s",
        (invoice_id,),
    )
    db.commit()
    return {"settled": invoice_id}
```

```python fixed
import hmac
import os

@app.post("/internal/settle")
def settle():
    supplied = request.headers.get("X-Ledger-Secret", "")
    expected = os.environ.get("LEDGER_INTERNAL_SECRET", "")  # FIX: secret from the environment
    if supplied == "" or expected == "" or not hmac.compare_digest(supplied.encode(), expected.encode()):  # FIX: missing header is 401; constant-time compare
        abort(401)
    body = request.get_json(silent=True) or {}
    invoice_id = body.get("invoice_id")
    if not invoice_id:
        abort(400)
    db.execute(
        "UPDATE invoices SET status = 'settled' WHERE id = %s",
        (invoice_id,),
    )
    db.commit()
    return {"settled": invoice_id}
```

```go vulnerable
mux.HandleFunc("POST /internal/settle", func(w http.ResponseWriter, r *http.Request) { // BUG: no caller check; the private network was the trust boundary
	var body struct{ InvoiceID int64 `json:"invoice_id"` }
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.InvoiceID == 0 {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := db.ExecContext(r.Context(),
		"UPDATE invoices SET status = 'settled' WHERE id = $1", body.InvoiceID)
	if err != nil {
		http.Error(w, "settle failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
})
```

```go fixed
mux.HandleFunc("POST /internal/settle", func(w http.ResponseWriter, r *http.Request) {
	got := []byte(r.Header.Get("X-Ledger-Secret"))
	want := []byte(os.Getenv("LEDGER_INTERNAL_SECRET")) // FIX: secret from the environment
	if len(got) == 0 || len(got) != len(want) || subtle.ConstantTimeCompare(got, want) != 1 { // FIX: missing header is 401; equal length, then constant time
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var body struct{ InvoiceID int64 `json:"invoice_id"` }
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.InvoiceID == 0 {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := db.ExecContext(r.Context(), "UPDATE invoices SET status = 'settled' WHERE id = $1", body.InvoiceID)
	if err != nil {
		http.Error(w, "settle failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
})
```

```javascript vulnerable
app.post("/internal/settle", async (req, res) => { // BUG: no caller check; the private network was the trust boundary
  const invoiceId = req.body?.invoice_id;
  if (!invoiceId) {
    return res.status(400).send("bad request");
  }
  await db.query(
    "UPDATE invoices SET status = 'settled' WHERE id = $1",
    [invoiceId],
  );
  res.json({ settled: invoiceId });
});
```

```javascript fixed
import crypto from "crypto";

app.post("/internal/settle", async (req, res) => {
  const supplied = Buffer.from(req.get("X-Ledger-Secret") ?? "");
  const expected = Buffer.from(process.env.LEDGER_INTERNAL_SECRET ?? ""); // FIX: secret from the environment
  if (supplied.length === 0 || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) { // FIX: missing header is 401; compare only after lengths match
    return res.status(401).send("unauthorized");
  }
  const invoiceId = req.body?.invoice_id;
  if (!invoiceId) {
    return res.status(400).send("bad request");
  }
  await db.query(
    "UPDATE invoices SET status = 'settled' WHERE id = $1",
    [invoiceId],
  );
  res.json({ settled: invoiceId });
});
```

### Authorization

`GET /api/invoices/<id>` returns the invoice to any logged-in user. Login is not ownership. Change the number in the path and you are reading another tenant's row, which is broken object-level access, the usual IDOR.

> **Where to look:** `GET /api/invoices/<id>` and the SELECT under that handler. Grep for `WHERE id = %s` with no `account_id` (Python), `WHERE id = $1` next to `r.PathValue("id")` (Go), and `WHERE id = $1` bound only to `req.params.id` (Node).
>
> **How to think:** The session already picked an account. The query has to carry it, `WHERE id = ? AND account_id = ?`, using that session account id and not an id from the path or the JSON body. No row means 404, including when the invoice exists for somebody else, so the response doesn't confirm the id. Overly broad RBAC sits on this same tenant-to-tenant boundary: a role named billing-admin that can read every account's invoices is the same leak with a permission check in front of it. I want the account predicate in the SQL, where a later refactor can't drop it on a cleanup.

```python vulnerable
@app.get("/api/invoices/<int:invoice_id>")
@login_required
def get_invoice(invoice_id):
    row = db.execute(
        "SELECT id, total_cents, status FROM invoices WHERE id = %s",
        (invoice_id,),
    ).fetchone()  # BUG: any logged-in caller; the query never checks account_id
    if row is None:
        abort(404)
    return {"id": row.id, "total_cents": row.total_cents, "status": row.status}
```

```python fixed
@app.get("/api/invoices/<int:invoice_id>")
@login_required
def get_invoice(invoice_id):
    row = db.execute(
        "SELECT id, total_cents, status FROM invoices WHERE id = %s AND account_id = %s",
        (invoice_id, session["account_id"]),
    ).fetchone()  # FIX: session account id is in the query
    if row is None:
        abort(404)  # FIX: missing and another tenant's invoice look the same
    return {"id": row.id, "total_cents": row.total_cents, "status": row.status}
```

```go vulnerable
mux.HandleFunc("GET /api/invoices/{id}", func(w http.ResponseWriter, r *http.Request) {
	var total int64
	var status string
	err := db.QueryRowContext(r.Context(),
		"SELECT total_cents, status FROM invoices WHERE id = $1", // BUG: any logged-in caller; login is not ownership
		r.PathValue("id"),
	).Scan(&total, &status)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(map[string]any{"total_cents": total, "status": status})
})
```

```go fixed
mux.HandleFunc("GET /api/invoices/{id}", func(w http.ResponseWriter, r *http.Request) {
	var total int64
	var status string
	err := db.QueryRowContext(r.Context(),
		"SELECT total_cents, status FROM invoices WHERE id = $1 AND account_id = $2", // FIX: session account id is in the query
		r.PathValue("id"), session.AccountID(r),
	).Scan(&total, &status)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r) // FIX: do not reveal that the id exists for someone else
		return
	}
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]any{"total_cents": total, "status": status})
})
```

```javascript vulnerable
app.get("/api/invoices/:id", requireLogin, async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, total_cents, status FROM invoices WHERE id = $1",
    [req.params.id],
  ); // BUG: any logged-in user; login is not ownership
  if (rows.length === 0) {
    return res.sendStatus(404);
  }
  res.json(rows[0]);
});
```

```javascript fixed
app.get("/api/invoices/:id", requireLogin, async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, total_cents, status FROM invoices WHERE id = $1 AND account_id = $2",
    [req.params.id, req.session.accountId],
  ); // FIX: account id comes from the session
  if (rows.length === 0) {
    return res.sendStatus(404); // FIX: same 404 if the id is missing or belongs to someone else
  }
  res.json(rows[0]);
});
```

### Accounting

`PATCH /api/audit/<id>` rewrites an audit row with `UPDATE audit_log SET message = ...`, so the record of who refunded is editable after the money moved. I treat that as an accounting failure: the history and the action share one code path. The handler fix is to refuse the update.

> **Where to look:** `PATCH /api/audit/<id>` and every statement that writes `audit_log`. Grep for `UPDATE audit_log` (Python), `UPDATE audit_log` (Go), and `UPDATE audit_log` (Node).
>
> **How to think:** There is no update route. The only write is an insert helper, and the handler on that path returns 405. A comment on the insert should say the database role ought to be INSERT-only. The code fix is the missing update. Do not log passwords in that insert. Log deletion is the cousin, and it sits on the same accounting boundary: if the row can be erased or the message rewritten, you can't tell who refunded a charge from last March.

```python vulnerable
@app.patch("/api/audit/<int:audit_id>")
def rewrite_audit(audit_id):
    message = (request.json or {}).get("message", "")
    db.execute(
        "UPDATE audit_log SET message = %s WHERE id = %s",
        (message, audit_id),
    )  # BUG: the record of who refunded can be rewritten
    db.commit()
    return {"updated": audit_id}
```

```python fixed
def insert_audit(account_id, action, message):
    # DB role should be INSERT-only on audit_log. The code fix is the missing update.
    db.execute(
        "INSERT INTO audit_log (account_id, action, message) VALUES (%s, %s, %s)",
        (account_id, action, message),
    )  # FIX: append-only insert; do not log passwords
    db.commit()

@app.patch("/api/audit/<int:audit_id>")
def rewrite_audit(audit_id):
    abort(405)  # FIX: no update route
```

```go vulnerable
mux.HandleFunc("PATCH /api/audit/{id}", func(w http.ResponseWriter, r *http.Request) {
	var body struct{ Message string `json:"message"` }
	if json.NewDecoder(r.Body).Decode(&body) != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := db.ExecContext(r.Context(),
		"UPDATE audit_log SET message = $1 WHERE id = $2", // BUG: rewrites the record of who refunded
		body.Message, r.PathValue("id"),
	)
	if err != nil {
		http.Error(w, "update failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
})
```

```go fixed
func insertAudit(accountID int64, action, message string) error {
	// DB role should be INSERT-only on audit_log. The code fix is the missing update.
	_, err := db.Exec(
		"INSERT INTO audit_log (account_id, action, message) VALUES ($1, $2, $3)",
		accountID, action, message,
	) // FIX: append-only insert; do not log passwords
	return err
}

func registerAudit(mux *http.ServeMux) {
	mux.HandleFunc("PATCH /api/audit/{id}", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed) // FIX: no update route
	})
}
```

```javascript vulnerable
app.patch("/api/audit/:id", async (req, res) => {
  const message = req.body?.message ?? "";
  await db.query(
    "UPDATE audit_log SET message = $1 WHERE id = $2",
    [message, req.params.id],
  ); // BUG: rewrites the record of who refunded
  res.json({ updated: req.params.id });
});
```

```javascript fixed
async function insertAudit(accountId, action, message) {
  // DB role should be INSERT-only on audit_log. The code fix is the missing update.
  await db.query(
    "INSERT INTO audit_log (account_id, action, message) VALUES ($1, $2, $3)",
    [accountId, action, message],
  ); // FIX: append-only insert; do not log passwords
}

app.patch("/api/audit/:id", (req, res) => {
  res.sendStatus(405); // FIX: no update route
});
```

---
