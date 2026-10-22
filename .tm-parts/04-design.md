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
