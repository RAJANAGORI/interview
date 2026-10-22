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
