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
