# Advanced Threat Modeling - Comprehensive Guide

## At a glance

Threat modeling is how you decide which threats deserve a control before the code hardens around the wrong assumption. You draw the system, mark where trust changes, name the threats on each crossing, and tie each one to a control someone owns.

This guide does that on one billing API, then shows the vulnerable handler next to the mitigation in Python, Go, and Node.js. The Secure Source Code Review guide is the longer catalog of the same bug classes. Here the question is which class you would have written down from the diagram, and where you go in the code to see if the control is real.

---

## Learning outcomes

- Run a model: assets, data flow, trust boundaries, threats, rank, and what you still accept.
- Use STRIDE, CIA, and AAA as three questions about the same flow.
- Walk one business action and one component boundary and leave with a threat you can verify in a handler.
- Record the result as a ticket or an Open Threat Modeling entry, with an owner and a way to check the mitigation.

---

## Prerequisites

Enough Python, Go, or JavaScript to read a request handler. Auth, data flows, and the OWASP-style bug classes in the rest of this repo.

---

## How to read the code labs

Every threat below has the same four parts:

1. What the threat means on this system, in plain language.
2. **Where to look:** the boundary on the diagram, then the handlers and grep strings.
3. **How to think:** the questions you ask in the modeling session, and again when you review the PR that claims to fix it.
4. A code lab with Python, Go, and Node.js tabs. Each tab puts the vulnerable version next to the fixed one.

`BUG:` marks the line that makes the threat real. `FIX:` marks the line that closes it. Your language choice carries across every lab on the page.

The snippets are trimmed handlers. Python is Flask, Go is the standard library (`net/http` with Go 1.22 routing, `database/sql` with Postgres placeholders), and Node is Express. Names like `db`, `audit`, `logger`, and `current_user` stand in for whatever the real app wires up.

---

## The system

Call it ledger. A browser sends orders, invoices, and refunds to one API. The API stores them in Postgres and charges a card processor. A worker reads a queue for slow jobs. Customers are tenants: one account must never see another's invoices.

Four trust boundaries matter more than the box diagram:

1. Browser to API. Anything in a header, query string, or JSON body is hostile data, including a user id the client swears is its own.
2. API to the card processor. The processor is outside your trust. Its webhook is a stranger until the signature checks out.
3. Queue to worker. A message is data. A URL inside it is not an instruction to fetch.
4. Tenant to tenant. A logged-in session proves an account, not the right to every row that shares the table.

Assets worth naming before you list threats: card data and tokens (confidentiality), order price and refund amount (integrity), the charge path itself (availability), and the audit row that says who moved money (accounting).

---

## How I run a session

I do this in one sitting for a feature, not as a quarterly workshop that produces a spreadsheet nobody opens.

1. Sketch the flow for the change: who calls whom, what crosses each boundary, where the data sits.
2. Mark the four boundaries above, plus any new one this feature adds (a new webhook, a new admin tool, a partner API).
3. On each boundary, ask STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege. Then ask CIA of the data on that hop, and AAA of the actor: who are they, what may they do, what record exists afterward.
4. Rank with the assumption written down. "The browser is hostile" is an assumption. "The VPC is a trust boundary" is also an assumption, and it is the one that usually fails.
5. Every mitigation gets an owner and a verification step. The labs in this guide are that verification: if the fixed handler is not what you find in the PR, the threat is still open.

The old version of this page listed the same threats as bullets under CIA and again under AAA. Those bullets collapsed into the labs below. A second name for the same bug does not need a second writeup. Sibling threats are called out in **How to think** so you still know where credential stuffing, IDOR, and log tampering sit.

---

## STRIDE

STRIDE is six questions you ask at each trust boundary. These six labs are those questions on ledger, one bug each. I take them in order on the handler the diagram already named, and I stop when I can point a teammate at the line that makes the threat true.

### Spoofing

`GET /api/orders` treats `X-User-Id` as the account. Anyone who can reach the API can name another tenant. Their orders come back.

> **Where to look:** `GET /api/orders`, the line that picks the account, and the query on `orders`. Grep for `X-User-Id` and `session["user_id"]` (Python), `r.Header.Get` and `sessionUserID` (Go), `req.get("x-user-id")` and `req.session.userId` (Node). A JSON user id on this same route is the same mistake.
>
> **How to think:** When I review this I edit `X-User-Id` in the browser tools and reload. If the orders change, the handler is spoofable. The id on the query has to be the one the server stored in the session at login. Session hijacking is the cousin on this same browser-to-API boundary. There you are looking at a cookie the server actually issued, and at how that session is bound and how it dies.

```python vulnerable
@app.get("/api/orders")
def list_orders():
    user_id = request.headers["X-User-Id"]  # BUG: the browser picks the account
    rows = db.execute(
        "SELECT id, total FROM orders WHERE user_id = %s",
        (user_id,),
    ).fetchall()
    return jsonify([{"id": row.id, "total": row.total} for row in rows])
```

```python fixed
@app.get("/api/orders")
def list_orders():
    user_id = session.get("user_id")  # FIX: account id comes only from the server session
    if not user_id:
        return "login required", 401
    rows = db.execute(
        "SELECT id, total FROM orders WHERE user_id = %s",
        (user_id,),
    ).fetchall()
    return jsonify([{"id": row.id, "total": row.total} for row in rows])
```

```go vulnerable
mux.HandleFunc("GET /api/orders", func(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-Id") // BUG: the browser picks the account
	rows, err := db.Query("SELECT id, total FROM orders WHERE user_id = $1", userID)
	if err != nil {
		http.Error(w, "orders unavailable", http.StatusBadGateway)
		return
	}
	defer rows.Close()
	writeOrders(w, rows)
})
```

```go fixed
mux.HandleFunc("GET /api/orders", func(w http.ResponseWriter, r *http.Request) {
	userID := sessionUserID(r) // FIX: the account id is the one the server stored
	if userID == "" {
		http.Error(w, "login required", http.StatusUnauthorized)
		return
	}
	rows, err := db.Query("SELECT id, total FROM orders WHERE user_id = $1", userID)
	if err != nil {
		http.Error(w, "orders unavailable", http.StatusBadGateway)
		return
	}
	defer rows.Close()
	writeOrders(w, rows)
})
```

```javascript vulnerable
app.get("/api/orders", async (req, res) => {
  const userId = req.get("x-user-id"); // BUG: the browser picks the account
  const rows = await db.query(
    "SELECT id, total FROM orders WHERE user_id = $1",
    [userId],
  );
  res.json(rows.rows);
});
```

```javascript fixed
app.get("/api/orders", async (req, res) => {
  const userId = req.session.userId; // FIX: account id is the one the server stored
  if (!userId) return res.status(401).send("login required");
  const rows = await db.query(
    "SELECT id, total FROM orders WHERE user_id = $1",
    [userId],
  );
  res.json(rows.rows);
});
```

### Tampering

`POST /webhooks/processor` copies `amount` and `status` out of the JSON and updates the charge. Nothing about that handler asks whether the processor signed those bytes, so a forged POST can mark a charge paid or change what ledger thinks it collected.

> **Where to look:** `POST /webhooks/processor`, on the lines before `amount` is read. Grep for `hmac.compare_digest` and `PROCESSOR_WEBHOOK_SECRET` (Python), `hmac.Equal` and `os.Getenv` (Go), `timingSafeEqual` and `express.raw` (Node).
>
> **How to think:** Change `amount`, drop the signature header, and send the POST. If the charge row moves, the webhook is trusting a stranger. A real fix answers 401 for a missing signature and for a wrong one, and it does that before `json.loads`, `json.Unmarshal`, or `JSON.parse`. The MAC is HMAC-SHA256 over the raw body, the key comes from the environment, and that key stays out of every log line. MitM on the hop from the processor is the same boundary. Both questions are whether these bytes actually came from the processor.

```python vulnerable
@app.post("/webhooks/processor")
def processor_webhook():
    data = request.get_json()  # BUG: amount and status are trusted with no signature
    db.execute(
        "UPDATE charges SET status = %s, amount = %s WHERE processor_id = %s",
        (data["status"], data["amount"], data["id"]),
    )
    db.commit()
    return "", 200
```

```python fixed
@app.post("/webhooks/processor")
def processor_webhook():
    raw = request.get_data()
    secret = os.environ.get("PROCESSOR_WEBHOOK_SECRET", "").encode()  # FIX: secret from the environment
    expected = hmac.new(secret, raw, hashlib.sha256).hexdigest()  # FIX: HMAC-SHA256 over the raw body
    supplied = request.headers.get("X-Processor-Signature", "").strip().lower()
    if secret == b"" or not hmac.compare_digest(expected, supplied):  # FIX: 401 before amount is parsed
        return "unauthorized", 401
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return "bad request", 400
    db.execute(
        "UPDATE charges SET status = %s, amount = %s WHERE processor_id = %s",
        (data["status"], data["amount"], data["id"]),
    )
    db.commit()
    return "", 200
```

```go vulnerable
mux.HandleFunc("POST /webhooks/processor", func(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if json.NewDecoder(r.Body).Decode(&payload) != nil { // BUG: amount and status are trusted with no signature
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := db.Exec(
		"UPDATE charges SET status = $1, amount = $2 WHERE processor_id = $3",
		payload["status"], payload["amount"], payload["id"],
	)
	if err != nil {
		http.Error(w, "update failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
})
```

```go fixed
mux.HandleFunc("POST /webhooks/processor", func(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	secret := os.Getenv("PROCESSOR_WEBHOOK_SECRET") // FIX: secret from the environment
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body) // FIX: HMAC-SHA256 over the raw body
	sig, decErr := hex.DecodeString(r.Header.Get("X-Processor-Signature"))
	if secret == "" || decErr != nil || !hmac.Equal(sig, mac.Sum(nil)) { // FIX: 401 before amount is parsed
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var payload map[string]any
	if json.Unmarshal(body, &payload) != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	_, err = db.Exec("UPDATE charges SET status = $1, amount = $2 WHERE processor_id = $3", payload["status"], payload["amount"], payload["id"])
	if err != nil { http.Error(w, "update failed", http.StatusInternalServerError); return }
	w.WriteHeader(http.StatusOK)
})
```

```javascript vulnerable
app.post("/webhooks/processor", express.json(), async (req, res) => {
  const { id, amount, status } = req.body; // BUG: amount and status are trusted with no signature
  await db.query(
    "UPDATE charges SET status = $1, amount = $2 WHERE processor_id = $3",
    [status, amount, id],
  );
  res.sendStatus(200);
});
```

```javascript fixed
app.post("/webhooks/processor", express.raw({ type: "*/*" }), async (req, res) => {
  const secret = process.env.PROCESSOR_WEBHOOK_SECRET || ""; // FIX: secret from the environment
  const expected = crypto.createHmac("sha256", secret).update(req.body).digest(); // FIX: HMAC-SHA256 over the raw body
  const supplied = Buffer.from(req.get("x-processor-signature") || "", "hex");
  if (!secret || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).send("unauthorized"); // FIX: missing or bad signature, before amount is parsed
  }
  let data;
  try {
    data = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).send("bad request");
  }
  await db.query(
    "UPDATE charges SET status = $1, amount = $2 WHERE processor_id = $3",
    [data.status, data.amount, data.id],
  );
  res.sendStatus(200);
});
```

### Repudiation

`POST /api/refunds` inserts a refund and returns 200. No audit row is written, so the actor can say the refund never happened.

> **Where to look:** `POST /api/refunds` and the transaction around the insert. Grep for `audit_log` and `db.commit` (Python), `db.Begin` and `tx.Commit` (Go), `BEGIN` and `req.session.userId` (Node).
>
> **How to think:** After a refund, can you name the actor, the action, the amount, and the request id from the database alone? The actor id has to be the session value. The audit insert has to commit in the same transaction as the money movement, and the row has no card number and no processor secret. Log tampering is the cousin on this same trail. That one shows up when the row was written and someone can edit it afterward.

```python vulnerable
@app.post("/api/refunds")
def refund():
    data = request.get_json()
    db.execute(
        "INSERT INTO refunds (order_id, amount) VALUES (%s, %s)",
        (data["order_id"], data["amount"]),
    )  # BUG: the refund is saved with no audit row
    db.commit()
    return "", 200  # BUG: 200, and the actor can deny the refund
```

```python fixed
@app.post("/api/refunds")
def refund():
    data = request.get_json()
    db.execute("BEGIN")
    try:
        db.execute(
            "INSERT INTO refunds (order_id, amount) VALUES (%s, %s)",
            (data["order_id"], data["amount"]),
        )
        db.execute(
            "INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES (%s, %s, %s, %s)",
            (session["user_id"], "refund", data["amount"], request.headers.get("X-Request-Id", "")),
        )  # FIX: same transaction; actor from the session; no secrets
        db.commit()  # FIX: the audit row commits with the refund
    except Exception:
        db.rollback()
        return "refund failed", 500
    return "", 200
```

```go vulnerable
mux.HandleFunc("POST /api/refunds", func(w http.ResponseWriter, r *http.Request) {
	in, err := readRefund(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err = db.Exec("INSERT INTO refunds (order_id, amount) VALUES ($1, $2)", in.OrderID, in.Amount) // BUG: money moves and no audit row is written
	if err != nil {
		http.Error(w, "refund failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK) // BUG: 200, and the actor can deny the refund
})
```

```go fixed
mux.HandleFunc("POST /api/refunds", func(w http.ResponseWriter, r *http.Request) {
	in, err := readRefund(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	tx, err := db.Begin()
	if err != nil { http.Error(w, "refund failed", http.StatusInternalServerError); return }
	defer tx.Rollback()
	_, err = tx.Exec("INSERT INTO refunds (order_id, amount) VALUES ($1, $2)", in.OrderID, in.Amount)
	if err == nil {
		_, err = tx.Exec("INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES ($1, 'refund', $2, $3)", sessionUserID(r), in.Amount, r.Header.Get("X-Request-Id")) // FIX: same transaction, session actor, no secrets
	}
	if err != nil || tx.Commit() != nil { // FIX: commit only after the audit insert succeeded
		http.Error(w, "refund failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
})
```

```javascript vulnerable
app.post("/api/refunds", express.json(), async (req, res) => {
  const { order_id, amount } = req.body;
  await db.query(
    "INSERT INTO refunds (order_id, amount) VALUES ($1, $2)",
    [order_id, amount],
  ); // BUG: money moves and the response is 200 with no audit row
  res.sendStatus(200);
});
```

```javascript fixed
app.post("/api/refunds", express.json(), async (req, res) => {
  const { order_id, amount } = req.body;
  const actor = req.session.userId;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO refunds (order_id, amount) VALUES ($1, $2)", [order_id, amount]);
    await client.query(
      "INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES ($1, 'refund', $2, $3)",
      [actor, amount, req.id],
    ); // FIX: same transaction, session actor, no secrets
    await client.query("COMMIT"); // FIX: the audit row commits with the refund
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).send("refund failed");
  } finally {
    client.release();
  }
  res.sendStatus(200);
});
```

### Information disclosure

A failed charge returns the exception text. That string is where the SQL, or the processor body, leaves the server.

> **Where to look:** `POST /api/charges` and the failure branch on that path. Grep for `str(e)` and `logger.exception` (Python), `err.Error()` and `slog.Error` (Go), `err.message` (Node).
>
> **How to think:** Force a charge the processor will reject, then read the HTTP response. You want status 502, a generic sentence, and a request id. The SQL and the processor body belong on one server log line that carries that same id, so on-call can find the failure from the id the client was given.

```python vulnerable
@app.post("/api/charges")
def create_charge():
    data = request.get_json()
    try:
        processor.charge(current_user.id, data["order_id"], data["token"])
    except Exception as e:
        return {"error": str(e)}, 502  # BUG: SQL or the processor body is sent to the client
    return {"status": "charged"}, 201
```

```python fixed
@app.post("/api/charges")
def create_charge():
    data = request.get_json()
    try:
        processor.charge(current_user.id, data["order_id"], data["token"])
    except Exception:
        req_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
        logger.exception("charge failed", extra={"request_id": req_id})  # FIX: detail stays in the server log
        return {"error": "charge failed", "request_id": req_id}, 502  # FIX: generic message plus the request id
    return {"status": "charged"}, 201
```

```go vulnerable
mux.HandleFunc("POST /api/charges", func(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrderID string `json:"order_id"`
		Token   string `json:"token"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if err := processor.Charge(r.Context(), currentUser(r).ID, body.OrderID, body.Token); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway) // BUG: SQL or the processor body is the response
		return
	}
	w.WriteHeader(http.StatusCreated)
})
```

```go fixed
mux.HandleFunc("POST /api/charges", func(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrderID string `json:"order_id"`
		Token   string `json:"token"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	err := processor.Charge(r.Context(), currentUser(r).ID, body.OrderID, body.Token)
	if err != nil {
		reqID := r.Header.Get("X-Request-Id")
		slog.Error("charge failed", "request_id", reqID, "err", err) // FIX: detail stays in the server log
		http.Error(w, "charge failed; request "+reqID, http.StatusBadGateway) // FIX: generic message plus the request id
		return
	}
	w.WriteHeader(http.StatusCreated)
})
```

```javascript vulnerable
app.post("/api/charges", express.json(), async (req, res) => {
  try {
    await processor.charge(req.session.userId, req.body.order_id, req.body.token);
    res.status(201).json({ status: "charged" });
  } catch (err) {
    res.status(502).send(err.message); // BUG: SQL or the processor body is sent to the client
  }
});
```

```javascript fixed
app.post("/api/charges", express.json(), async (req, res) => {
  try {
    await processor.charge(req.session.userId, req.body.order_id, req.body.token);
    res.status(201).json({ status: "charged" });
  } catch (err) {
    const requestId = req.get("x-request-id") || crypto.randomUUID();
    logger.error({ err, requestId }, "charge failed"); // FIX: detail stays in the server log
    res.status(502).json({ error: "charge failed", requestId }); // FIX: generic message plus the request id
  }
});
```

### Denial of service

`POST /api/reports/import` reads the whole body, then inserts every row. A fat document burns memory. A long list keeps the database in a loop.

> **Where to look:** `POST /api/reports/import`, the body parser, and the loop. Grep for `MAX_CONTENT_LENGTH` and `get_json` (Python), `MaxBytesReader` (Go), `express.json` and `limit` (Node).
>
> **How to think:** What refuses the bytes, and what refuses the row count? Both have to trip before the inserts start. I have watched a 64 KB cap still walk a thousand tiny rows. The loop needs its own ceiling before any insert. Brute force is the availability cousin on a different boundary, the login route, where the control is a rate limit.

```python vulnerable
@app.post("/api/reports/import")
def import_report():
    rows = request.get_json()  # BUG: the whole body is read, with no size cap
    for row in rows:  # BUG: every row is inserted, with no maximum
        db.execute(
            "INSERT INTO report_rows (sku, qty) VALUES (%s, %s)",
            (row["sku"], row["qty"]),
        )
    db.commit()
    return {"imported": len(rows)}, 200
```

```python fixed
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024  # FIX: Flask rejects a body over 64 KB


@app.post("/api/reports/import")
def import_report():
    rows = request.get_json()
    if not isinstance(rows, list) or len(rows) > 100:  # FIX: refuse the batch before doing work
        return {"error": "at most 100 rows"}, 413
    for row in rows:
        db.execute(
            "INSERT INTO report_rows (sku, qty) VALUES (%s, %s)",
            (row["sku"], row["qty"]),
        )
    db.commit()
    return {"imported": len(rows)}, 200
```

```go vulnerable
mux.HandleFunc("POST /api/reports/import", func(w http.ResponseWriter, r *http.Request) {
	var rows []reportRow
	if json.NewDecoder(r.Body).Decode(&rows) != nil { // BUG: the body is read with no size cap
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	for _, row := range rows { // BUG: every row is inserted, with no maximum
		db.Exec("INSERT INTO report_rows (sku, qty) VALUES ($1, $2)", row.SKU, row.Qty)
	}
	fmt.Fprintf(w, "imported %d\n", len(rows))
})
```

```go fixed
mux.HandleFunc("POST /api/reports/import", func(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10) // FIX: the read fails past 64 KB
	var rows []reportRow
	if err := json.NewDecoder(r.Body).Decode(&rows); err != nil {
		http.Error(w, "bad or oversized body", http.StatusBadRequest)
		return
	}
	if len(rows) > 100 { // FIX: refuse the batch before the inserts
		http.Error(w, "at most 100 rows", http.StatusRequestEntityTooLarge)
		return
	}
	for _, row := range rows {
		if _, err := db.Exec("INSERT INTO report_rows (sku, qty) VALUES ($1, $2)", row.SKU, row.Qty); err != nil {
			http.Error(w, "import failed", http.StatusInternalServerError)
			return
		}
	}
	fmt.Fprintf(w, "imported %d\n", len(rows))
})
```

```javascript vulnerable
app.post("/api/reports/import", async (req, res) => {
  const chunks = [];
  for await (const chunk of req) { // BUG: the whole body is buffered, with no size cap
    chunks.push(chunk);
  }
  const rows = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  for (const row of rows) { // BUG: every row is inserted, with no maximum
    await db.query("INSERT INTO report_rows (sku, qty) VALUES ($1, $2)", [row.sku, row.qty]);
  }
  res.json({ imported: rows.length });
});
```

```javascript fixed
app.post("/api/reports/import", express.json({ limit: "64kb" }), async (req, res) => { // FIX: body over 64 KB is rejected
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length > 100) { // FIX: refuse the batch before doing work
    return res.status(413).json({ error: "at most 100 rows" });
  }
  for (const row of rows) {
    await db.query("INSERT INTO report_rows (sku, qty) VALUES ($1, $2)", [row.sku, row.qty]);
  }
  res.json({ imported: rows.length });
});
```

### Elevation of privilege

`POST /api/refunds` checks that a session exists, then reads `role` from the JSON. Send `"role": "admin"` and the refund goes through.

> **Where to look:** `POST /api/refunds`, next to the session load. Grep for `data["role"]` and `current_user.role` (Python), `body["role"]` and `user.Role` (Go), `req.body.role` and `req.session.role` (Node).
>
> **How to think:** Take a normal customer's session and send `role` as `admin`. You want 403, and you want no new refund row. The role has to be the one on the server principal, stored when the session was created. Keep the audit insert from the repudiation lab in that same transaction. Invoice IDOR is the cousin on a different boundary, tenant to tenant: a real session, and a swapped invoice id.

```python vulnerable
@app.post("/api/refunds")
@login_required
def refund():
    data = request.get_json()
    if data["role"] == "admin":  # BUG: role is taken from the JSON body
        with db.begin():
            db.execute(
                "INSERT INTO refunds (order_id, amount) VALUES (%s, %s)",
                (data["order_id"], data["amount"]),
            )
            db.execute(
                "INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES (%s, %s, %s, %s)",
                (session["user_id"], "refund", data["amount"], request.headers.get("X-Request-Id", "")),
            )
        return "", 200
    return "forbidden", 403
```

```python fixed
@app.post("/api/refunds")
@login_required
def refund():
    if current_user.role != "admin":  # FIX: role comes from the server principal
        return "forbidden", 403
    data = request.get_json()
    with db.begin():
        db.execute(
            "INSERT INTO refunds (order_id, amount) VALUES (%s, %s)",
            (data["order_id"], data["amount"]),
        )
        db.execute(
            "INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES (%s, %s, %s, %s)",
            (session["user_id"], "refund", data["amount"], request.headers.get("X-Request-Id", "")),
        )  # audit row stays in this transaction (see Repudiation)
    return "", 200
```

```go vulnerable
mux.HandleFunc("POST /api/refunds", func(w http.ResponseWriter, r *http.Request) {
	if sessionUserID(r) == "" { http.Error(w, "login required", http.StatusUnauthorized); return }
	var body map[string]any
	if json.NewDecoder(r.Body).Decode(&body) != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	if body["role"] != "admin" { // BUG: role is taken from the JSON body
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	tx, err := db.Begin()
	if err != nil { http.Error(w, "refund failed", http.StatusInternalServerError); return }
	defer tx.Rollback()
	_, err = tx.Exec("INSERT INTO refunds (order_id, amount) VALUES ($1, $2)", body["order_id"], body["amount"])
	if err == nil {
		_, err = tx.Exec("INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES ($1, 'refund', $2, $3)", sessionUserID(r), body["amount"], r.Header.Get("X-Request-Id"))
	}
	if err != nil || tx.Commit() != nil { http.Error(w, "refund failed", http.StatusInternalServerError); return }
	w.WriteHeader(http.StatusOK)
})
```

```go fixed
mux.HandleFunc("POST /api/refunds", func(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if user.ID == "" { http.Error(w, "login required", http.StatusUnauthorized); return }
	if user.Role != "admin" { // FIX: role comes from the server principal
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	in, err := readRefund(r)
	if err != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	tx, err := db.Begin()
	if err != nil { http.Error(w, "refund failed", http.StatusInternalServerError); return }
	defer tx.Rollback()
	_, err = tx.Exec("INSERT INTO refunds (order_id, amount) VALUES ($1, $2)", in.OrderID, in.Amount)
	if err == nil { // audit row stays in this transaction (see Repudiation)
		_, err = tx.Exec("INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES ($1, 'refund', $2, $3)", user.ID, in.Amount, r.Header.Get("X-Request-Id"))
	}
	if err != nil || tx.Commit() != nil { http.Error(w, "refund failed", http.StatusInternalServerError); return }
	w.WriteHeader(http.StatusOK)
})
```

```javascript vulnerable
app.post("/api/refunds", express.json(), async (req, res) => {
  if (!req.session.userId) return res.status(401).send("login required");
  if (req.body.role !== "admin") return res.status(403).send("forbidden"); // BUG: role is taken from the JSON body
  const { order_id, amount } = req.body;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO refunds (order_id, amount) VALUES ($1, $2)", [order_id, amount]);
    await client.query("INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES ($1, 'refund', $2, $3)", [req.session.userId, amount, req.id]);
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).send("refund failed");
  } finally {
    client.release();
  }
  res.sendStatus(200);
});
```

```javascript fixed
app.post("/api/refunds", express.json(), async (req, res) => {
  if (!req.session.userId) return res.status(401).send("login required");
  if (req.session.role !== "admin") return res.status(403).send("forbidden"); // FIX: role comes from the session
  const { order_id, amount } = req.body;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO refunds (order_id, amount) VALUES ($1, $2)", [order_id, amount]);
    await client.query("INSERT INTO audit_log (actor_id, action, amount, request_id) VALUES ($1, 'refund', $2, $3)", [req.session.userId, amount, req.id]); // audit row stays in this transaction (see Repudiation)
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).send("refund failed");
  } finally {
    client.release();
  }
  res.sendStatus(200);
});
```

---

## CIA

Confidentiality, integrity, and availability are properties of the data and the service, asked after you know the flow. On ledger I use them on the card, the price, and the charge call. These three labs are the properties STRIDE does not already cover in the sibling file.

### Confidentiality

Checkout logs the full card number and the CVV. That line is the card. Never log or store the CVV, and if you log the card at all, log last4.

> **Where to look:** the checkout handler, and the log call before the processor returns. Grep `logger.info` and `cvv` (Python), `slog.Info` (Go), and `logger.info` (Node).
>
> **How to think:** I read from the JSON decode to the first logger call, then to the INSERT. PAN or CVV in either argument means the threat is open. Last4 is enough for support. Eavesdropping on the browser hop is the TLS boundary. Backup leakage is this boundary again, the same bytes in a bucket a week later. Base64 of the PAN is the PAN with extra steps, so I'd still call that line a leak.

```python vulnerable
@app.post("/api/checkout")
def checkout():
    card = request.get_json(force=True)
    logger.info(
        "checkout pan=%s cvv=%s", card["number"], card["cvv"]
    )  # BUG: full PAN and CVV land in the log
    token = processor.charge(card["number"], card["exp"], card["cvv"])
    db.execute(
        "INSERT INTO payments (pan, cvv, token) VALUES ($1, $2, $3)",
        (card["number"], card["cvv"], token),
    )  # BUG: CVV is stored after the charge
    return {"ok": True}
```

```python fixed
@app.post("/api/checkout")
def checkout():
    card = request.get_json(silent=True) or {}
    number = "".join(ch for ch in str(card.get("number", "")) if ch.isdigit())
    last4 = number[-4:] if len(number) >= 13 else ""
    logger.info("checkout last4=%s", last4)  # FIX: last4 only; CVV is never logged
    token = processor.charge(number, card.get("exp"), card.get("cvv"))
    db.execute(
        "INSERT INTO payments (last4, token) VALUES ($1, $2)",
        (last4, token),
    )  # FIX: CVV is not written to the database
    return {"ok": True}
```

```go vulnerable
mux.HandleFunc("POST /api/checkout", func(w http.ResponseWriter, r *http.Request) {
	var card struct{ Number, Exp, CVV string }
	if json.NewDecoder(r.Body).Decode(&card) != nil {
		http.Error(w, "bad card", http.StatusBadRequest)
		return
	}
	slog.Info("checkout", "pan", card.Number, "cvv", card.CVV) // BUG: full PAN and CVV in the log
	token, err := processor.Charge(card.Number, card.Exp, card.CVV)
	if err != nil {
		http.Error(w, "charge failed", http.StatusBadGateway)
		return
	}
	_, err = db.Exec("INSERT INTO payments (pan, cvv, token) VALUES ($1, $2, $3)", card.Number, card.CVV, token) // BUG: CVV is stored
	if err != nil {
		http.Error(w, "store failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
})
```

```go fixed
mux.HandleFunc("POST /api/checkout", func(w http.ResponseWriter, r *http.Request) {
	var card struct{ Number, Exp, CVV string }
	if json.NewDecoder(r.Body).Decode(&card) != nil {
		http.Error(w, "bad card", http.StatusBadRequest)
		return
	}
	last4 := ""
	if n := len(card.Number); n >= 13 {
		last4 = card.Number[n-4:]
	}
	slog.Info("checkout", "last4", last4) // FIX: last4 only; CVV is never logged
	token, err := processor.Charge(card.Number, card.Exp, card.CVV)
	if err != nil {
		http.Error(w, "charge failed", http.StatusBadGateway)
		return
	}
	if _, err = db.Exec("INSERT INTO payments (last4, token) VALUES ($1, $2)", last4, token); err != nil { // FIX: CVV is not stored
		http.Error(w, "store failed", http.StatusInternalServerError)
	}
})
```

```javascript vulnerable
app.post("/api/checkout", async (req, res) => {
  const card = req.body || {};
  logger.info({ pan: card.number, cvv: card.cvv }, "checkout"); // BUG: full PAN and CVV in the log
  const token = await processor.charge(card.number, card.exp, card.cvv);
  await db.query(
    "INSERT INTO payments (pan, cvv, token) VALUES ($1, $2, $3)",
    [card.number, card.cvv, token],
  ); // BUG: CVV is stored
  res.json({ ok: true });
});
```

```javascript fixed
app.post("/api/checkout", async (req, res) => {
  const card = req.body || {};
  const digits = String(card.number || "").replace(/\D/g, "");
  const last4 = digits.length >= 13 ? digits.slice(-4) : "";
  logger.info({ last4 }, "checkout"); // FIX: last4 only; CVV is never logged
  const token = await processor.charge(digits, card.exp, card.cvv);
  await db.query(
    "INSERT INTO payments (last4, token) VALUES ($1, $2)",
    [last4, token],
  ); // FIX: CVV is not written
  res.json({ ok: true });
});
```

### Integrity

`POST /api/orders` charges `unit_price` taken from the JSON body, so the client sets the price. Whatever they type is what we charge and what we store. Look the price up by `sku`, reject an unknown sku, and ignore a client price if one is sent.

> **Where to look:** the order handler, `POST /api/orders`. Grep `unit_price` (Python), `UnitPrice` (Go), and `unit_price` (Node).
>
> **How to think:** Which integer is multiplied into the charge? If it came out of the body, the buyer wrote it. The products row for that sku is the price, and no row means 400 before any charge. Config tampering sits on a different boundary, where a writer on the products table can change the catalog and this handler will charge whatever that row says, which is a grant on the database account, and the lab here is the order body the buyer can edit.

```python vulnerable
@app.post("/api/orders")
def create_order():
    body = request.get_json(force=True)
    sku = body["sku"]
    qty = int(body.get("qty", 1))
    unit_price = int(body["unit_price"])  # BUG: the client sets the price
    total = unit_price * qty
    db.execute(
        "INSERT INTO orders (sku, qty, total_cents) VALUES ($1, $2, $3)",
        (sku, qty, total),
    )
    processor.charge(total)
    return {"total": total}, 201
```

```python fixed
@app.post("/api/orders")
def create_order():
    body = request.get_json(silent=True) or {}
    sku = str(body.get("sku", ""))
    qty = body.get("qty", 1)
    if not sku or isinstance(qty, bool) or not isinstance(qty, int) or qty < 1 or qty > 100:
        return {"error": "bad order"}, 400
    row = db.execute("SELECT unit_price FROM products WHERE sku = $1", (sku,)).fetchone()
    if row is None:
        return {"error": "unknown sku"}, 400  # FIX: unknown sku is rejected
    total = row[0] * qty  # FIX: catalog price; client unit_price is ignored
    db.execute(
        "INSERT INTO orders (sku, qty, total_cents) VALUES ($1, $2, $3)",
        (sku, qty, total),
    )
    processor.charge(total)
    return {"total": total}, 201
```

```go vulnerable
mux.HandleFunc("POST /api/orders", func(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SKU       string `json:"sku"`
		Qty       int    `json:"qty"`
		UnitPrice int    `json:"unit_price"`
	}
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.Qty < 1 {
		http.Error(w, "bad order", http.StatusBadRequest)
		return
	}
	total := body.UnitPrice * body.Qty // BUG: unit_price comes from the client
	_, err := db.Exec("INSERT INTO orders (sku, qty, total_cents) VALUES ($1, $2, $3)", body.SKU, body.Qty, total)
	if err != nil {
		http.Error(w, "store failed", http.StatusInternalServerError)
		return
	}
	if err = processor.Charge(total); err != nil {
		http.Error(w, "charge failed", http.StatusBadGateway)
	}
})
```

```go fixed
mux.HandleFunc("POST /api/orders", func(w http.ResponseWriter, r *http.Request) {
	var body struct{ SKU string `json:"sku"`; Qty int `json:"qty"` }
	if json.NewDecoder(r.Body).Decode(&body) != nil || body.SKU == "" || body.Qty < 1 || body.Qty > 100 {
		http.Error(w, "bad order", http.StatusBadRequest)
		return
	}
	var price int
	if err := db.QueryRow("SELECT unit_price FROM products WHERE sku = $1", body.SKU).Scan(&price); err != nil {
		http.Error(w, "unknown sku", http.StatusBadRequest) // FIX: unknown sku is rejected
		return
	}
	total := price * body.Qty // FIX: catalog price; client unit_price is ignored
	if _, err := db.Exec("INSERT INTO orders (sku, qty, total_cents) VALUES ($1, $2, $3)", body.SKU, body.Qty, total); err != nil {
		http.Error(w, "store failed", http.StatusInternalServerError)
		return
	}
	if err := processor.Charge(total); err != nil {
		http.Error(w, "charge failed", http.StatusBadGateway)
	}
})
```

```javascript vulnerable
app.post("/api/orders", express.json(), async (req, res) => {
  const sku = String(req.body?.sku || "");
  const qty = Number(req.body?.qty ?? 1);
  const unitPrice = Number(req.body?.unit_price); // BUG: the client sets the price
  if (!sku || !Number.isInteger(qty) || qty < 1) {
    res.status(400).json({ error: "bad order" });
    return;
  }
  const total = unitPrice * qty;
  await db.query(
    "INSERT INTO orders (sku, qty, total_cents) VALUES ($1, $2, $3)",
    [sku, qty, total],
  );
  await processor.charge(total);
  res.status(201).json({ total });
});
```

```javascript fixed
app.post("/api/orders", express.json(), async (req, res) => {
  const sku = String(req.body?.sku || "");
  const qty = Number(req.body?.qty ?? 1);
  if (!sku || !Number.isInteger(qty) || qty < 1 || qty > 100) {
    return res.status(400).json({ error: "bad order" });
  }
  const found = await db.query("SELECT unit_price FROM products WHERE sku = $1", [sku]);
  if (found.rowCount !== 1) {
    return res.status(400).json({ error: "unknown sku" }); // FIX: unknown sku is rejected
  }
  const total = found.rows[0].unit_price * qty; // FIX: catalog price; client unit_price is ignored
  await db.query(
    "INSERT INTO orders (sku, qty, total_cents) VALUES ($1, $2, $3)",
    [sku, qty, total],
  );
  await processor.charge(total);
  res.status(201).json({ total });
});
```

### Availability

The charge handler calls the card processor with no timeout. A hung processor holds the worker until the pool is full. Cap it at 2 seconds, return 504, and drop the socket.

> **Where to look:** the charge handler that dials the processor. Grep `requests.post` (Python), `http.Client` (Go), and `fetch` (Node).
>
> **How to think:** Find the outbound call. No deadline, and one quiet processor owns a worker until the TCP session dies. Two seconds, then 504. DDoS at the public edge is another boundary, volume on the balancer, and this lab is the single dependency that accepts the TCP connection and then sends nothing. On timeout I want a 504 and a closed socket so the pool can take the next order.

```python vulnerable
@app.post("/api/orders/<order_id>/charge")
def charge_order(order_id):
    order = db.execute(
        "SELECT total_cents FROM orders WHERE id = $1 AND account_id = $2",
        (order_id, current_user.account_id),
    ).fetchone()
    if order is None:
        return {"error": "not found"}, 404
    resp = requests.post(
        PROCESSOR_URL,
        json={"order_id": order_id, "amount": order[0]},
    )  # BUG: no timeout; a hung processor holds this worker
    return {"status": resp.status_code}, 200
```

```python fixed
@app.post("/api/orders/<order_id>/charge")
def charge_order(order_id):
    order = db.execute(
        "SELECT total_cents FROM orders WHERE id = $1 AND account_id = $2",
        (order_id, current_user.account_id),
    ).fetchone()
    if order is None:
        return {"error": "not found"}, 404
    try:
        resp = requests.post(
            PROCESSOR_URL,
            json={"order_id": order_id, "amount": order[0]},
            timeout=2,  # FIX: the worker is released after 2 seconds
        )
    except requests.exceptions.Timeout:
        return {"error": "processor timeout"}, 504  # FIX: 504, the socket is not held
    code = resp.status_code
    resp.close()
    return {"status": code}, 200
```

```go vulnerable
mux.HandleFunc("POST /api/orders/{id}/charge", func(w http.ResponseWriter, r *http.Request) {
	var amount int
	err := db.QueryRow("SELECT total_cents FROM orders WHERE id = $1 AND account_id = $2", r.PathValue("id"), currentUserID(r)).Scan(&amount)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	payload := bytes.NewBufferString(fmt.Sprintf(`{"amount":%d}`, amount))
	resp, err := http.Post(processorURL, "application/json", payload) // BUG: no timeout; a hung processor holds this worker
	if err != nil {
		http.Error(w, "processor error", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	w.WriteHeader(resp.StatusCode)
})
```

```go fixed
mux.HandleFunc("POST /api/orders/{id}/charge", func(w http.ResponseWriter, r *http.Request) {
	var amount int
	if err := db.QueryRow("SELECT total_cents FROM orders WHERE id = $1 AND account_id = $2", r.PathValue("id"), currentUserID(r)).Scan(&amount); err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	client := &http.Client{Timeout: 2 * time.Second} // FIX: bound the processor call
	payload := bytes.NewBufferString(fmt.Sprintf(`{"amount":%d}`, amount))
	resp, err := client.Post(processorURL, "application/json", payload)
	if ne, ok := err.(net.Error); ok && ne.Timeout() {
		http.Error(w, "processor timeout", http.StatusGatewayTimeout) // FIX: 504, do not keep the socket
		return
	}
	if err != nil {
		http.Error(w, "processor error", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	w.WriteHeader(resp.StatusCode)
})
```

```javascript vulnerable
app.post("/api/orders/:id/charge", async (req, res) => {
  const found = await db.query(
    "SELECT total_cents FROM orders WHERE id = $1 AND account_id = $2",
    [req.params.id, req.session.accountId],
  );
  if (found.rowCount !== 1) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const resp = await fetch(process.env.PROCESSOR_URL, { // BUG: no signal; a hung processor pins this worker
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: found.rows[0].total_cents }),
  });
  res.status(resp.status).send(await resp.text());
});
```

```javascript fixed
app.post("/api/orders/:id/charge", async (req, res) => {
  const found = await db.query("SELECT total_cents FROM orders WHERE id = $1 AND account_id = $2", [req.params.id, req.session.accountId]);
  if (found.rowCount !== 1) {
    return res.status(404).json({ error: "not found" });
  }
  try {
    const resp = await fetch(process.env.PROCESSOR_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: found.rows[0].total_cents }),
      signal: AbortSignal.timeout(2000), // FIX: abort the processor at 2 seconds
    });
    res.status(resp.status).type("application/json").send(await resp.text());
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({ error: "processor timeout" }); // FIX: 504, the socket is dropped
    }
    res.status(502).json({ error: "processor error" });
  }
});
```

---

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

## Design by action and by component

Design by action walks one business operation, register or checkout, and asks what can go wrong at each step. Design by component stays on one box and the line where trust changes. STRIDE, CIA, and AAA labs live in other files. On ledger I walk registration, then checkout, then the worker that reads the queue.

### Registration action

POST /api/register creates the user with active=True before anyone proves they own the email. Nobody has opened the inbox. An attacker registers the victim's address, picks the password, and sits on the account.

> **Where to look:** the register action on the diagram, from `POST /api/register` through the insert and the verify step after it. Grep for `active=True` (Python), `verify_token` (Go), and `verify_token` (Node).
>
> **How to think:** I walk the register action from the parsed body to the commit and stop on the statement that makes the account usable. What proof of the inbox exists before that line: a hash checked later by POST /api/verify, or only a mail send, and if active is already true the person who registered first owns the password they chose while the real owner hears that the email is taken. I also look for the raw token in a column, a log line, or a verify link's query string, because those copies stick around after the email is gone.

```python vulnerable
@app.post("/api/register")
def register():
    body = request.get_json(force=True)
    token = secrets.token_urlsafe(32)
    user = User(email=body["email"], password_hash=hash_password(body["password"]), active=True)  # BUG: live account before anyone proves the inbox
    user.verify_token = token  # BUG: raw token stored on a row that can already log in
    db.session.add(user)
    db.session.commit()
    logger.info("register %s token %s", body["email"], token)  # BUG: raw token in the log
    send_email(body["email"], token)
    return {"id": user.id}, 201
```

```python fixed
@app.post("/api/register")
def register():
    body = request.get_json(force=True)
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode()).hexdigest()
    db.session.execute(text("INSERT INTO users (email, password_hash, active, token_hash, token_exp) VALUES (:e, :p, false, :h, now() + interval '1 hour')"), {"e": body["email"], "p": hash_password(body["password"]), "h": digest})  # FIX: inactive, hash only
    db.session.commit()
    send_email(body["email"], token)
    return {}, 201

@app.post("/api/verify")
def verify():
    digest = hashlib.sha256(request.get_json(force=True)["token"].encode()).hexdigest()
    row = db.session.execute(text("UPDATE users SET active = true, token_hash = NULL WHERE token_hash = :h AND token_exp > now() AND active = false RETURNING id"), {"h": digest}).first()  # FIX: active only when the hash matches and the token is unexpired
    if row is None:
        return {"error": "invalid token"}, 400
    db.session.commit()
    return {"ok": True}
```

```go vulnerable
mux.HandleFunc("POST /api/register", func(w http.ResponseWriter, r *http.Request) {
	var body struct{ Email, Password string }
	if json.NewDecoder(r.Body).Decode(&body) != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil { http.Error(w, "register failed", http.StatusInternalServerError); return }
	raw := base64.RawURLEncoding.EncodeToString(buf)
	_, err := db.Exec(`INSERT INTO users (email, password_hash, active, verify_token) VALUES ($1, $2, true, $3)`, body.Email, hashPassword(body.Password), raw) // BUG: active before the inbox is proven, raw token stored
	if err != nil { http.Error(w, "register failed", http.StatusInternalServerError); return }
	log.Printf("register %s token %s", body.Email, raw) // BUG: raw token in the log
	sendEmail(body.Email, raw)
	w.WriteHeader(http.StatusCreated)
})
```

```go fixed
mux.HandleFunc("POST /api/register", func(w http.ResponseWriter, r *http.Request) {
	var body struct{ Email, Password string }
	if json.NewDecoder(r.Body).Decode(&body) != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil { http.Error(w, "register failed", http.StatusInternalServerError); return }
	raw := base64.RawURLEncoding.EncodeToString(buf)
	sum := sha256.Sum256([]byte(raw))
	_, err := db.Exec(`INSERT INTO users (email, password_hash, active, token_hash, token_exp) VALUES ($1, $2, false, $3, now() + interval '1 hour')`, body.Email, hashPassword(body.Password), hex.EncodeToString(sum[:])) // FIX: inactive, hash only
	if err != nil { http.Error(w, "register failed", http.StatusInternalServerError); return }
	sendEmail(body.Email, raw); w.WriteHeader(http.StatusCreated)
})
mux.HandleFunc("POST /api/verify", func(w http.ResponseWriter, r *http.Request) {
	var body struct{ Token string }
	if json.NewDecoder(r.Body).Decode(&body) != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	sum := sha256.Sum256([]byte(body.Token))
	res, err := db.Exec(`UPDATE users SET active = true, token_hash = NULL WHERE token_hash = $1 AND token_exp > now() AND active = false`, hex.EncodeToString(sum[:])) // FIX: active only when the hash matches and the token is unexpired
	if err != nil { http.Error(w, "verify failed", http.StatusInternalServerError); return }
	if n, _ := res.RowsAffected(); n != 1 { http.Error(w, "invalid token", http.StatusBadRequest); return }
	w.WriteHeader(http.StatusNoContent)
})
```

```javascript vulnerable
import crypto from "node:crypto";

app.post("/api/register", async (req, res) => {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.query(
    "INSERT INTO users (email, password_hash, active, verify_token) VALUES ($1, $2, true, $3)", // BUG: active before the inbox is proven, raw token stored
    [req.body.email, await hashPassword(req.body.password), token],
  );
  logger.info({ email: req.body.email, token }, "register"); // BUG: raw token in the log
  await sendEmail(req.body.email, token);
  res.status(201).json({ ok: true });
});
```

```javascript fixed
import crypto from "node:crypto";
app.post("/api/register", async (req, res) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const digest = crypto.createHash("sha256").update(token).digest("hex");
  await db.query(
    "INSERT INTO users (email, password_hash, active, token_hash, token_exp) VALUES ($1, $2, false, $3, now() + interval '1 hour')",
    [req.body.email, await hashPassword(req.body.password), digest],
  ); // FIX: inactive, hash only
  await sendEmail(req.body.email, token);
  res.status(201).json({ ok: true });
});
app.post("/api/verify", async (req, res) => {
  const digest = crypto.createHash("sha256").update(String(req.body.token ?? "")).digest("hex");
  const result = await db.query(
    "UPDATE users SET active = true, token_hash = NULL WHERE token_hash = $1 AND token_exp > now() AND active = false RETURNING id",
    [digest],
  ); // FIX: active only when the hash matches and the token is unexpired
  if (result.rowCount !== 1) return res.status(400).json({ error: "invalid token" });
  res.status(204).end();
});
```

### Checkout action

POST /api/checkout applies discount_cents from the JSON body, so the client picks the discount. A huge value bills nothing. The coupon row is never read.

> **Where to look:** the checkout action on the diagram, from the cart total to the amount handed to the processor. Grep for `discount_cents` (Python), `DiscountCents` (Go), and `discount_cents` (Node).
>
> **How to think:** Follow one checkout from the cart total the server computed to the integer passed into the card charge, and ask which fields along that path may shrink the number. The coupon code is something the customer can type. The cents off are a row you load by that code, still unexpired, belonging to this account or marked global, and not yet used, then subtract on the server. If discount_cents is still in the JSON and still in the arithmetic, the browser set the price.

```python vulnerable
@app.post("/api/checkout")
def checkout():
    body = request.get_json(force=True)
    account_id = session["account_id"]
    subtotal = cart_subtotal(account_id)
    discount = int(body["discount_cents"])  # BUG: the client picks the discount
    total = max(0, subtotal - discount)  # BUG: a large discount_cents bills nothing
    order = db.session.execute(text("INSERT INTO orders (account_id, total_cents) VALUES (:a, :t) RETURNING id"), {"a": account_id, "t": total}).first()
    db.session.commit()
    charge_card(account_id, total, order[0])
    return {"order_id": order[0], "charged_cents": total}, 201
```

```python fixed
@app.post("/api/checkout")
def checkout():
    body = request.get_json(force=True)
    account_id = session["account_id"]
    subtotal = cart_subtotal(account_id)
    code = str(body.get("coupon_code") or "").strip()
    discount = 0
    if code:
        row = db.session.execute(text("UPDATE coupons SET used_at = now() WHERE code = :c AND expires_at > now() AND (account_id = :a OR account_id IS NULL) AND used_at IS NULL AND discount_cents <= :s RETURNING discount_cents"), {"c": code, "a": account_id, "s": subtotal}).first()  # FIX: server coupon; ignore any client discount amount
        if row is None:
            db.session.rollback()
            return {"error": "invalid coupon"}, 400
        discount = int(row[0])
    order = db.session.execute(text("INSERT INTO orders (account_id, total_cents) VALUES (:a, :t) RETURNING id"), {"a": account_id, "t": subtotal - discount}).first()
    db.session.commit()
    charge_card(account_id, subtotal - discount, order[0])
    return {"order_id": order[0], "charged_cents": subtotal - discount}, 201
```

```go vulnerable
mux.HandleFunc("POST /api/checkout", func(w http.ResponseWriter, r *http.Request) {
	var body struct{ DiscountCents int `json:"discount_cents"` }
	if json.NewDecoder(r.Body).Decode(&body) != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	accountID := sessionAccount(r)
	subtotal := cartSubtotal(accountID)
	total := subtotal - body.DiscountCents // BUG: the client picks the discount
	if total < 0 { total = 0 } // BUG: a large discount_cents bills nothing
	orderID, err := insertOrder(accountID, total)
	if err != nil { http.Error(w, "checkout failed", http.StatusInternalServerError); return }
	if err = chargeCard(accountID, total, orderID); err != nil { http.Error(w, "checkout failed", http.StatusInternalServerError); return }
	json.NewEncoder(w).Encode(map[string]any{"order_id": orderID, "charged_cents": total})
})
```

```go fixed
mux.HandleFunc("POST /api/checkout", func(w http.ResponseWriter, r *http.Request) {
	var body struct{ CouponCode string `json:"coupon_code"` }
	if json.NewDecoder(r.Body).Decode(&body) != nil { http.Error(w, "bad request", http.StatusBadRequest); return }
	accountID := sessionAccount(r)
	subtotal := int64(cartSubtotal(accountID))
	code, discount := strings.TrimSpace(body.CouponCode), int64(0)
	tx, err := db.Begin()
	if err != nil { http.Error(w, "checkout failed", http.StatusInternalServerError); return }
	defer tx.Rollback()
	if code != "" {
		err = tx.QueryRow(`UPDATE coupons SET used_at = now() WHERE code = $1 AND expires_at > now() AND (account_id = $2 OR account_id IS NULL) AND used_at IS NULL AND discount_cents <= $3 RETURNING discount_cents`, code, accountID, subtotal).Scan(&discount) // FIX: server coupon; ignore any client discount amount
		if errors.Is(err, sql.ErrNoRows) { http.Error(w, "invalid coupon", http.StatusBadRequest); return }
		if err != nil { http.Error(w, "checkout failed", http.StatusInternalServerError); return }
	}
	var orderID int64
	if err = tx.QueryRow(`INSERT INTO orders (account_id, total_cents) VALUES ($1, $2) RETURNING id`, accountID, subtotal-discount).Scan(&orderID); err != nil { http.Error(w, "checkout failed", http.StatusInternalServerError); return }
	if err = tx.Commit(); err != nil { http.Error(w, "checkout failed", http.StatusInternalServerError); return }
	if err = chargeCard(accountID, subtotal-discount, orderID); err != nil { http.Error(w, "checkout failed", http.StatusInternalServerError); return }
	json.NewEncoder(w).Encode(map[string]any{"order_id": orderID, "charged_cents": subtotal - discount})
})
```

```javascript vulnerable
app.post("/api/checkout", async (req, res) => {
  const accountId = req.session.accountId;
  const subtotal = await cartSubtotal(accountId);
  const discount = Number(req.body.discount_cents) || 0; // BUG: the client picks the discount
  const total = Math.max(0, subtotal - discount); // BUG: a large discount_cents bills nothing
  const order = await db.query(
    "INSERT INTO orders (account_id, total_cents) VALUES ($1, $2) RETURNING id",
    [accountId, total],
  );
  await chargeCard(accountId, total, order.rows[0].id);
  res.status(201).json({ order_id: order.rows[0].id, charged_cents: total });
});
```

```javascript fixed
app.post("/api/checkout", async (req, res) => {
  const accountId = req.session.accountId;
  const subtotal = await cartSubtotal(accountId);
  const code = String(req.body.coupon_code ?? "").trim();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const applied = code ? await client.query("UPDATE coupons SET used_at = now() WHERE code = $1 AND expires_at > now() AND (account_id = $2 OR account_id IS NULL) AND used_at IS NULL AND discount_cents <= $3 RETURNING discount_cents", [code, accountId, subtotal]) : { rowCount: 1, rows: [{ discount_cents: 0 }] };
    if (applied.rowCount !== 1) { await client.query("ROLLBACK"); return res.status(400).json({ error: "invalid coupon" }); } // FIX: server coupon; ignore any client discount amount
    const total = subtotal - Number(applied.rows[0].discount_cents);
    const order = await client.query("INSERT INTO orders (account_id, total_cents) VALUES ($1, $2) RETURNING id", [accountId, total]);
    await client.query("COMMIT");
    await chargeCard(accountId, total, order.rows[0].id);
    res.status(201).json({ order_id: order.rows[0].id, charged_cents: total });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    if (!res.headersSent) res.status(500).json({ error: "checkout failed" });
  } finally { client.release(); }
});
```

### Trust boundary

The worker fetches callback_url with requests.get, http.Get, or fetch because the queue is called internal. That is SSRF. The queue is a component boundary, not a trust boundary.

> **Where to look:** the worker on the diagram, on the far side of the queue. Grep for `requests.get` (Python), `http.Get` (Go), and `fetch(` (Node).
>
> **How to think:** Stand on the worker, read one job, and ask what that message is allowed to make the process do. If a field is a URL and the next call fetches it, who picked the host, and which addresses can this process reach that the browser never could? Why would "the queue is internal" count as a control when a buggy producer or a poisoned message can publish? A kind of receipt or dunning, dispatched to a function already in the binary, leaves no URL on the job and no string for a later prefix check to get wrong.

```python vulnerable
def handle_job(job):
    resp = requests.get(job["callback_url"], timeout=5)  # BUG: SSRF; the queue is a component boundary, not a trust boundary
    resp.raise_for_status()
    if job.get("kind") == "receipt":
        db.session.execute(text("UPDATE orders SET receipt_sent = true WHERE id = :id"), {"id": job["order_id"]})
    elif job.get("kind") == "dunning":
        db.session.execute(text("UPDATE invoices SET dunned_at = now() WHERE id = :id"), {"id": job["invoice_id"]})
    else:
        raise ValueError("unknown kind")
    db.session.commit()
    return resp.status_code
```

```python fixed
def handle_job(job):
    kind = job["kind"]
    order_id = int(job["order_id"])
    if kind == "receipt":
        send_receipt(order_id)  # FIX: fixed internal function, no URL in the job
    elif kind == "dunning":
        send_dunning(order_id)  # FIX: kind is a closed enum the worker already implements
    else:
        raise ValueError("unknown kind")
    db.session.execute(text("INSERT INTO job_runs (kind, order_id) VALUES (:k, :id)"), {"k": kind, "id": order_id})
    db.session.commit()
```

```go vulnerable
func handleJob(job Job) error {
	resp, err := http.Get(job.CallbackURL) // BUG: SSRF; the queue is a component boundary, not a trust boundary
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	switch job.Kind {
	case "receipt":
		_, err = db.Exec(`UPDATE orders SET receipt_sent = true WHERE id = $1`, job.OrderID)
	case "dunning":
		_, err = db.Exec(`UPDATE invoices SET dunned_at = now() WHERE id = $1`, job.InvoiceID)
	default:
		return fmt.Errorf("unknown kind %q", job.Kind)
	}
	return err
}
```

```go fixed
func handleJob(job Job) error {
	var err error
	switch job.Kind { // FIX: kind is receipt or dunning; the job has no URL
	case "receipt":
		err = sendReceipt(job.OrderID) // FIX: fixed internal function
	case "dunning":
		err = sendDunning(job.OrderID)
	default:
		return fmt.Errorf("unknown kind %q", job.Kind)
	}
	if err != nil {
		return err
	}
	_, err = db.Exec(`INSERT INTO job_runs (kind, order_id) VALUES ($1, $2)`, job.Kind, job.OrderID)
	return err
}
```

```javascript vulnerable
async function handleJob(job) {
  const resp = await fetch(job.callbackUrl); // BUG: SSRF; the queue is a component boundary, not a trust boundary
  if (!resp.ok) throw new Error(`callback ${resp.status}`);
  if (job.kind === "receipt") {
    await db.query("UPDATE orders SET receipt_sent = true WHERE id = $1", [job.orderId]);
  } else if (job.kind === "dunning") {
    await db.query("UPDATE invoices SET dunned_at = now() WHERE id = $1", [job.invoiceId]);
  } else {
    throw new Error("unknown kind");
  }
  await db.query("INSERT INTO job_runs (url, status) VALUES ($1, $2)", [job.callbackUrl, resp.status]);
}
```

```javascript fixed
async function handleJob(job) {
  switch (job.kind) { // FIX: kind enum; the job has no URL
    case "receipt":
      await sendReceipt(job.orderId); // FIX: fixed internal function
      break;
    case "dunning":
      await sendDunning(job.orderId);
      break;
    default:
      throw new Error("unknown kind");
  }
  await db.query("INSERT INTO job_runs (kind, order_id) VALUES ($1, $2)", [job.kind, job.orderId]);
}
```

---

## Recording the model

A model that lives only in a meeting is a meeting. I write one entry per threat I am not willing to drop, in a ticket or in a small YAML file the repo can diff. Open Threat Modeling (OTM) is one schema for that file. The fields matter more than the brand: id, the boundary, the assumption, the mitigation, how you will verify it, what risk you still accept, and who owns it.

This is the spoofing threat from the first lab, written so a reviewer six months later can find the handler:

```yaml
threats:
  - id: TM-014
    title: Client supplies the user id
    stride: spoofing
    cia: confidentiality
    aaa: authentication
    component: ledger-api
    boundary: browser to API
    assumption: The browser is hostile. A header is data, not an identity.
    mitigation: The account id comes from the server-side session. X-User-Id is ignored.
    verify: Read the order handler. Add a test that sends another account's id and expects 403 or its own orders only.
    residual: A stolen session cookie still acts as the victim. Track that separately as session theft.
    owner: billing-api
    status: mitigated
```

Status is one of open, mitigated, or accepted. Accepted needs the residual sentence and a name. "We'll fix it later" with no owner is open, whatever the ticket says.

I don't generate SAST rules from this file and call the model done. The YAML points at a handler. The handler is the control. When the flow changes (a new webhook, a new worker, a partner who posts orders), update the entry in the same PR as the route. A threat model that drifts from the code is how the next session starts from scratch and misses the boundary you already paid to find.

Tools (Threat Dragon, the Microsoft Threat Modeling Tool, a Miro board) are fine for the diagram. They don't replace the entry above, and they don't replace opening the handler.

---

## Interview clusters

- Fundamentals: "Walk STRIDE on a checkout API." "What is a trust boundary, and where do you draw one?"
- Senior: "The service is internal, so we skipped auth. What assumption did they make, and how do you test it?"
- Staff: "How do you keep threat models current without a workshop every sprint? What do you accept, and who signs?"

---

## Cross-links

Secure Source Code Review, Authorization and Authentication, SQL Injection, XSS, SSRF, Security Headers, Product Security Real-World Scenarios.
