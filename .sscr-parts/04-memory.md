## Memory Best Practices Review

These bugs are native to C and C++, where a wrong length writes straight into memory the program never meant to touch. Python, Go, and Node are memory-safe until code reaches for `ctypes` or `cffi`, `unsafe` or cgo, `Buffer.allocUnsafe`, or a native addon, so find those boundaries first: grep for `import ctypes`, `import "C"`, `"unsafe"`, `binding.gyp`, and `.node` files. Away from them the same mistakes still show up, as crashes and memory-exhaustion DoS from trusting a size that came off the wire.

### Buffer overflow prevention

A buffer overflow is a copy that doesn't stop at the end of its destination. In C the extra bytes land on whatever sits next to the buffer (other locals, a saved return address, heap metadata), and that's the classic road to code execution. Managed code only gets there through a native boundary, or it hits a cousin of the bug, like Node handing out memory that was never cleared.

> **Where to look:** native bindings and the handlers that feed them. Grep for `ctypes.memmove`, `create_string_buffer`, `cffi`, `ffi.new` (Python), `import "C"`, `C.strcpy`, `C.CString`, `unsafe.Pointer` (Go), and `Buffer.allocUnsafe`, `binding.gyp`, `node-addon-api` (Node). In the C or C++ underneath, grep for the unbounded calls `gets`, `strcpy`, `sprintf`, `scanf("%s"`, and `strcat`, and check that their bounded versions `fgets`, `strncpy` (or `strlcpy`), `snprintf`, and `strncat` are given the real destination size.
>
> **How to think:** Every copy has three numbers: how big the destination is, how many bytes get copied, and who chose that count. When the count comes from the source (`len(data)`, `strlen(src)`, a field in the request) rather than the destination, you've found it. Validate the input size before anything is read into memory, and size the buffer with one named constant instead of a bare `32` repeated around the file. The bounded functions have traps too: `strncpy` leaves no terminator when the source fills the buffer, and `strncat` takes the space left, not the total size. Stack canaries, ASLR, and `_FORTIFY_SOURCE` make exploitation harder. They don't make the copy correct.

```python vulnerable
import ctypes

lib = ctypes.CDLL("./libparse.so")


@app.post("/parse")
def parse():
    data = request.get_data()
    buf = ctypes.create_string_buffer(32)
    ctypes.memmove(buf, data, len(data))  # BUG: copies as many bytes as the client sent into 32
    return {"result": lib.parse_record(buf)}
```

```python fixed
import ctypes

lib = ctypes.CDLL("./libparse.so")
RECORD_MAX = 32


@app.post("/parse")
def parse():
    data = request.get_data()
    if len(data) >= RECORD_MAX:  # FIX: checked against the constant that sizes the buffer, with a byte left for the NUL
        abort(413)
    buf = ctypes.create_string_buffer(data, RECORD_MAX)  # FIX: ctypes raises instead of writing past the end
    return {"result": lib.parse_record(buf)}
```

```go vulnerable
/*
#include <stdlib.h>
#include <string.h>
#include "parse.h"
*/
import "C"

import "unsafe"

func parseRecord(name string) C.int {
	var buf [32]C.char
	cs := C.CString(name)
	defer C.free(unsafe.Pointer(cs))
	C.strcpy(&buf[0], cs) // BUG: strcpy stops at the NUL, not at 32 bytes
	return C.parse_record(&buf[0])
}
```

```go fixed
/*
#include "parse.h"
*/
import "C"

import (
	"errors"
	"unsafe"
)

const recordMax = 32

var errTooLong = errors.New("record too long")

func parseRecord(name string) (C.int, error) {
	if len(name) >= recordMax { // FIX: rejected before any copy, leaving room for the NUL
		return 0, errTooLong
	}
	var buf [recordMax]byte
	copy(buf[:], name) // FIX: copy never writes past len(buf), and the zeroed tail terminates the string
	return C.parse_record((*C.char)(unsafe.Pointer(&buf[0]))), nil
}
```

```javascript vulnerable
app.post("/records", express.json(), (req, res) => {
  const { name, width } = req.body;
  const record = Buffer.allocUnsafe(width); // BUG: the client picks the size, and the memory isn't zeroed
  record.write(name);
  res.type("application/octet-stream").send(record); // BUG: everything past name is stale heap: old bodies, tokens, keys
});
```

```javascript fixed
const MAX_WIDTH = 4096;

app.post("/records", express.json(), (req, res) => {
  const width = Number(req.body.width);
  const name = String(req.body.name ?? "");
  if (!Number.isInteger(width) || width < 1 || width > MAX_WIDTH) { // FIX: a whole number with an upper bound
    return res.status(400).send("width must be 1 to 4096");
  }
  const record = Buffer.alloc(width, " "); // FIX: filled before use, so no stale memory
  record.write(name); // write() stops at the end of the buffer
  res.type("application/octet-stream").send(record);
});
```

```c vulnerable
#include <stdio.h>

int verify_password(const char *pw);

int main(void) {
    char userPass[5];
    printf("Enter the password:\n");
    gets(userPass); // BUG: no length limit; a long line overwrites the stack past userPass
    if (verify_password(userPass)) {
        printf("PASSWORD VERIFIED\n");
    }
    return 0;
}
```

```c fixed
#include <stdio.h>
#include <string.h>

#define PASS_MAX 128

int verify_password(const char *pw);

int main(void) {
    char userPass[PASS_MAX];
    printf("Enter the password:\n");
    if (fgets(userPass, sizeof userPass, stdin) == NULL) { // FIX: writes at most sizeof userPass bytes, NUL included
        return 1;
    }
    userPass[strcspn(userPass, "\n")] = '\0'; // fgets keeps the newline
    if (verify_password(userPass)) {
        printf("PASSWORD VERIFIED\n");
    }
    return 0;
}
```

### Buffer size management

Size bugs come from two numbers that should agree and don't: the size a buffer was allocated with and the size a read assumes, or a length field in the input that the code takes at face value. In a length-prefixed protocol the length is attacker input like any other field. Trust it and one 4-byte header asks the server to allocate 4 GiB.

> **Where to look:** binary protocol parsers, socket servers, file-format readers, anything that reads a length header and then a body. Grep for `struct.unpack`, `int.from_bytes`, `recv(` (Python), `binary.BigEndian.Uint32`, `make([]byte`, `conn.Read(` (Go), and `readUInt32BE`, `Buffer.allocUnsafe`, `.copy(` (Node). In C, look at `malloc(` next to `ntohl`, `memcpy` lengths, and `sizeof` applied to a pointer instead of the array.
>
> **How to think:** Where does each size come from, and is it capped before it's used to allocate? One named constant should size both the buffer and the read so they can't drift apart; the old C example declared `char userPass[5]` and then called `fgets(userPass, 9, stdin)`, which overflows even though `fgets` is the "safe" function. Is the read exact (`io.ReadFull`, a buffered `read(n)` followed by a length check), or does it take whatever one call happened to return? In C, check the arithmetic as well. Does the allocation leave space for the null terminator (`strlen(s) + 1`)? Can `count * size` wrap around before it reaches `malloc`?

```python vulnerable
def read_frame(rfile) -> bytes:  # rfile = sock.makefile("rb")
    (length,) = struct.unpack(">I", rfile.read(4))
    buf = bytearray(length)  # BUG: the peer picks the size, up to 4 GiB per frame
    rfile.readinto(buf)  # BUG: a peer that hangs up early leaves a zero-filled tail nobody checks
    return bytes(buf)
```

```python fixed
MAX_FRAME = 1 << 20  # the largest message the protocol allows


def read_frame(rfile) -> bytes:  # rfile = sock.makefile("rb")
    header = rfile.read(4)
    if len(header) != 4:
        raise ConnectionError("short header")
    (length,) = struct.unpack(">I", header)
    if length > MAX_FRAME:  # FIX: capped before anything is allocated
        raise ValueError("frame too large")
    payload = rfile.read(length)
    if len(payload) != length:  # FIX: exactly length bytes, or the frame is rejected
        raise ConnectionError("short frame")
    return payload
```

```go vulnerable
func readFrame(r io.Reader) ([]byte, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return nil, err
	}
	n := binary.BigEndian.Uint32(hdr[:])
	buf := make([]byte, n) // BUG: the peer picks n, up to 4 GiB per frame
	_, err := r.Read(buf)  // BUG: Read can return fewer bytes with a nil error
	return buf, err
}
```

```go fixed
const maxFrame = 1 << 20 // the largest message the protocol allows

func readFrame(r io.Reader) ([]byte, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return nil, err
	}
	n := binary.BigEndian.Uint32(hdr[:])
	if n > maxFrame { // FIX: capped before allocation
		return nil, fmt.Errorf("frame of %d bytes exceeds %d", n, maxFrame)
	}
	buf := make([]byte, n)
	if _, err := io.ReadFull(r, buf); err != nil { // FIX: exactly n bytes or an error
		return nil, err
	}
	return buf, nil
}
```

```javascript vulnerable
function readFrame(chunk) {
  const len = chunk.readUInt32BE(0);
  const frame = Buffer.allocUnsafe(len); // BUG: sized by the peer, and not zeroed
  chunk.copy(frame, 0, 4); // BUG: copies what has arrived, maybe far less than len; the rest is stale heap
  return frame;
}
```

```javascript fixed
const MAX_FRAME = 1 << 20; // the largest message the protocol allows

function readFrame(chunk) {
  if (chunk.length < 4) return null; // wait for the rest of the header
  const len = chunk.readUInt32BE(0);
  if (len > MAX_FRAME) throw new Error("frame too large"); // FIX: capped before allocation
  if (chunk.length < 4 + len) return null; // wait for the rest of the frame
  const frame = Buffer.alloc(len); // FIX: zero-filled
  chunk.copy(frame, 0, 4, 4 + len); // FIX: copies exactly len bytes
  return frame;
}
```

### Off-by-one errors

An off-by-one is a bounds check or loop that's wrong by exactly one, nearly always `<=` where `<` belongs. In C that writes one byte past the buffer, often the null terminator, and a single byte is enough to corrupt the next variable. Go panics, Python wraps a negative index around to the end of the list, and JavaScript hands back `undefined` that blows up a line later.

> **Where to look:** hand-written index checks in handlers, pagination and slicing helpers, ring buffers, manual loops over arrays. Grep for `<= len(` (Python and Go), `<=` next to `.length` (Node), `- 1]` and `+ 1]` in all three, and in C `<= MAX`, `<= sizeof`, and running totals fed to `strncat`.
>
> **How to think:** Run the boundary values through the check in your head: -1, 0, `len - 1`, `len`, `len + 1`. Valid indexes form the half-open range `0 <= i < len`, so `<=` against a length is almost always wrong, and a check with no lower bound is wrong in Python, where `items[-1]` is perfectly legal. Loops get the same treatment, since `for i := 0; i <= n; i++` runs n + 1 times. The old C example kept a running `total` and appended with `strncat` while `total <= MAX_SIZE`, which allows exactly MAX_SIZE characters and leaves no room for the terminator; `total < MAX_SIZE` fixes it. And a crash is a DoS. Go's `net/http` recovers a panicking handler, but a panic in a goroutine you started kills the process, and in Express 4 a throw inside an async handler becomes an unhandled rejection that takes Node down.

```python vulnerable
@app.get("/carts/<cart_id>/item")
def cart_item(cart_id):
    items = load_cart(cart_id).items  # scoped to current_user (see IDOR)
    idx = request.args.get("i", default=0, type=int)
    if idx <= len(items):  # BUG: idx == len(items) passes, and nothing stops -1
        return items[idx].to_dict()  # IndexError at len; -1 quietly reads from the end
    abort(404)
```

```python fixed
@app.get("/carts/<cart_id>/item")
def cart_item(cart_id):
    items = load_cart(cart_id).items  # scoped to current_user (see IDOR)
    idx = request.args.get("i", default=0, type=int)
    if 0 <= idx < len(items):  # FIX: both ends checked, half-open range
        return items[idx].to_dict()
    abort(404)
```

```go vulnerable
mux.HandleFunc("GET /carts/{id}/item", func(w http.ResponseWriter, r *http.Request) {
	items, err := cartItems(r.Context(), r.PathValue("id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	i, _ := strconv.Atoi(r.URL.Query().Get("i"))
	if i <= len(items) { // BUG: i == len(items) passes, and so does any negative i
		json.NewEncoder(w).Encode(items[i]) // index out of range: panic
		return
	}
	http.NotFound(w, r)
})
```

```go fixed
mux.HandleFunc("GET /carts/{id}/item", func(w http.ResponseWriter, r *http.Request) {
	items, err := cartItems(r.Context(), r.PathValue("id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	i, err := strconv.Atoi(r.URL.Query().Get("i"))
	if err != nil || i < 0 || i >= len(items) { // FIX: both bounds, and len itself is out
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(items[i])
})
```

```javascript vulnerable
app.get("/carts/:id/item", async (req, res) => {
  const items = await cartItems(req.params.id);
  const i = Number(req.query.i);
  if (i <= items.length) { // BUG: lets through items.length, negatives, and fractions
    return res.json({ sku: items[i].sku, qty: items[i].qty }); // items[i] is undefined, so .sku throws
  }
  res.sendStatus(404);
});
```

```javascript fixed
app.get("/carts/:id/item", async (req, res) => {
  const items = await cartItems(req.params.id);
  const i = Number(req.query.i);
  if (Number.isInteger(i) && i >= 0 && i < items.length) { // FIX: a whole number in [0, length)
    return res.json({ sku: items[i].sku, qty: items[i].qty });
  }
  res.sendStatus(404);
});
```

### Format string injection

A format string tells the formatter how to read its arguments. Hand that string to a user and they decide what gets read: in C, `%x` walks the stack and `%n` writes to memory; in Python, `str.format` follows attribute and index lookups wherever the template points; in Go and Node, the user picks how the arguments get rendered.

> **Where to look:** any formatter call whose first argument isn't a literal: tenant-editable email or notification templates, error-message helpers, log wrappers. Grep for `.format(` and `format_map(` on request or database values (Python), `Printf(`, `Sprintf(`, `Fprintf(` with a variable first argument (Go), and `util.format(` or `console.log(` with a variable first argument (Node). In C, look for `printf(`, `fprintf(`, and `syslog(` called with a single non-literal argument.
>
> **How to think:** Is the format a constant a developer wrote? If a user or tenant controls it, what can it reach? C's `printf(user_input)` is the original, so the fix there is `printf("%s", user_input)`, or a generic `printf("Invalid credentials.")` that echoes nothing, as in the old login example. Python's `str.format` can't write memory, but `{user.__init__.__globals__}` walks into module globals and `{user.name:>999999999}` allocates a gigabyte. Go can't corrupt memory this way either. The honest impact is garbled output like `%!d(MISSING)`, forged log lines, and, when a struct is among the arguments, a full field dump through `%#v`, which ignores the type's `String` method. Since Go 1.24, `go vet` flags a non-constant format with no other arguments; one built by concatenation with arguments after it slips past. Node's `util.format` lets the template choose `%j` or `%o` for an object argument, and a template with no specifier at all appends the object anyway. When user text belongs in the output, pass it as an argument (`fmt.Sprintf("%s", msg)`, `util.format("%s", msg)`) or as a structured log field.

```python vulnerable
@dataclass
class Recipient:
    name: str
    email: str


@app.post("/admin/greeting/preview")
@admin_required
def preview_greeting():
    template = request.form["template"]  # e.g. "Hi {user.name}!"
    user = Recipient(current_user.name, current_user.email)
    return {"preview": template.format(user=user)}  # BUG: "{user.__init__.__globals__[app].config[SECRET_KEY]}" reaches the Flask config
```

```python fixed
@app.post("/admin/greeting/preview")
@admin_required
def preview_greeting():
    template = request.form["template"]  # e.g. "Hi $name!"
    values = {"name": current_user.name, "email": current_user.email}  # FIX: plain strings, nothing to traverse
    return {"preview": string.Template(template).safe_substitute(values)}  # FIX: $name lookups only, no attributes or indexes
```

```go vulnerable
mux.HandleFunc("POST /client-errors", func(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	msg := r.PostFormValue("message")
	log.Printf("client error, user %d: "+msg, currentUser(r).ID) // BUG: verbs in msg print %!v(MISSING) junk, and a \n starts a fake line
	fmt.Fprintf(w, "Logged: "+msg)                               // BUG: user text is the format string
})
```

```go fixed
mux.HandleFunc("POST /client-errors", func(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	msg := r.PostFormValue("message")
	slog.Warn("client_error", "user_id", currentUser(r).ID, "message", msg) // FIX: user text travels as a value
	fmt.Fprint(w, "Logged.")                                                // FIX: constant reply, nothing echoed
})
```

```javascript vulnerable
// req.user is a User whose toString() returns the display name
app.post("/admin/greeting/preview", requireAdmin, (req, res) => {
  const template = String(req.body.template ?? ""); // e.g. "Hi %s!"
  if (template.length > 500) return res.status(400).send("template too long");
  res.json({ preview: util.format(template, req.user) }); // BUG: "%j" or "%o" dumps every field of req.user, passwordHash included
});
```

```javascript fixed
// req.user is a User whose toString() returns the display name
app.post("/admin/greeting/preview", requireAdmin, (req, res) => {
  const template = String(req.body.template ?? ""); // e.g. "Hi %s!"
  if (template.length > 500) return res.status(400).send("template too long");
  res.json({ preview: util.format(template, String(req.user.name)) }); // FIX: the only argument is a plain string
});
```

### Memory management

C makes you free memory by hand, which brings leaks, use-after-free, and double free. Garbage-collected languages free whatever's unreachable, so their leaks are things that stay reachable forever, and the one an attacker can drive is a long-lived map or cache keyed by a value they choose. Send enough distinct keys and the process gets OOM-killed.

> **Where to look:** module-level dicts, maps, and arrays that request handlers write to, home-grown caches, and memoization. Grep for `= {}` at module scope, `@functools.cache`, `lru_cache(maxsize=None)` (Python), package-level `map[` and `sync.Map` (Go), and module-level `new Map()` or `new Set()`, plus `.on(` inside request handlers (Node).
>
> **How to think:** For every long-lived collection, ask what the key is, who controls it, and what ever removes an entry. If nothing removes entries and the client picks the key, one script looping over random values eats the heap. Cap the entry count, add a TTL so stale data ages out, and remember that `functools.cache` is `lru_cache(maxsize=None)`, which never evicts. Other GC-language leaks are quieter. A goroutine blocked forever on a channel nobody reads, or on an outbound call with no timeout, keeps its stack and everything it references. A Node handler that calls `emitter.on(...)` per request adds a listener that never goes away; Node starts warning past 10. Go nil dereferences mostly come from ignored errors: `u, _ := findUser(id)` followed by `u.Name` panics the moment the lookup fails. Use-after-free and double free live in C, C++, native addons, and code that frees C memory by hand through cgo or ctypes. There, check every `malloc` result for NULL, give each allocation a single owner, free it exactly once (`defer C.free(...)` right after `C.CString`), null the pointer afterwards, and run the native tests under AddressSanitizer or Valgrind.

```python vulnerable
_cards: dict[str, dict | None] = {}


def user_card(username: str) -> dict | None:
    if username not in _cards:
        user = User.query.filter_by(username=username).first()
        _cards[username] = {"name": user.name, "bio": user.bio} if user else None  # BUG: every name ever asked for stays, misses included
    return _cards[username]


@app.get("/users/<username>/card")
def card(username):
    return user_card(username) or abort(404)
```

```python fixed
from cachetools import TTLCache, cached

_cards = TTLCache(maxsize=10_000, ttl=600)  # FIX: 10,000 entries at most, each gone after 10 minutes


@cached(cache=_cards, lock=threading.Lock())  # cachetools caches need a lock under threaded servers
def user_card(username: str) -> dict | None:
    user = User.query.filter_by(username=username).first()
    return {"name": user.name, "bio": user.bio} if user else None


@app.get("/users/<username>/card")
def card(username):
    return user_card(username) or abort(404)
```

```go vulnerable
var (
	mu    sync.Mutex
	cards = map[string]*Card{} // BUG: no size cap and no eviction
)

func userCard(ctx context.Context, username string) (*Card, error) {
	mu.Lock()
	c, ok := cards[username]
	mu.Unlock()
	if ok {
		return c, nil
	}
	c, err := loadCard(ctx, username)
	if err != nil {
		return nil, err
	}
	mu.Lock()
	cards[username] = c // BUG: one entry per distinct name an attacker sends
	mu.Unlock()
	return c, nil
}
```

```go fixed
import lru "github.com/hashicorp/golang-lru/v2"

var cards *lru.Cache[string, *Card]

func init() {
	c, err := lru.New[string, *Card](10_000) // FIX: at most 10,000 entries, least recently used evicted first
	if err != nil {
		panic(err) // only fails for a size <= 0
	}
	cards = c
}

func userCard(ctx context.Context, username string) (*Card, error) {
	if c, ok := cards.Get(username); ok { // the cache does its own locking
		return c, nil
	}
	c, err := loadCard(ctx, username)
	if err != nil {
		return nil, err
	}
	cards.Add(username, c) // FIX: a flood of random names only churns the oldest entries
	return c, nil
}
```

```javascript vulnerable
const cards = new Map(); // BUG: nothing ever evicts

app.get("/users/:username/card", async (req, res) => {
  const { username } = req.params;
  if (!cards.has(username)) {
    cards.set(username, await loadCard(username)); // BUG: one entry per distinct name, misses included
  }
  const card = cards.get(username);
  if (!card) return res.sendStatus(404);
  res.json(card);
});
```

```javascript fixed
const { LRUCache } = require("lru-cache");

const cards = new LRUCache({ max: 10_000, ttl: 600_000 }); // FIX: 10,000 entries at most, each gone after 10 minutes

app.get("/users/:username/card", async (req, res) => {
  let card = cards.get(req.params.username);
  if (!card) {
    card = await loadCard(req.params.username);
    if (!card) return res.sendStatus(404);
    cards.set(req.params.username, card); // FIX: bounded, so random names only push out the oldest entries
  }
  res.json(card);
});
```

---
