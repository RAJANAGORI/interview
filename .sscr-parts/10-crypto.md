## Cryptographic Review

Most of an application's crypto lives in one small helper module that nobody has opened in years (`utils/crypto.py`, `internal/crypto`, `lib/crypto.js`) and in the code that calls it: token signing, field encryption before a database or S3 write, outbound HTTP clients, and key loading at startup. Find every import of a crypto package first, then read the helpers before the callers. The algorithms themselves are rarely the problem. The parameters are: modes, IVs, key sizes, and where the key came from.

### Cryptographic libraries

Hand-rolled "encryption" (XOR with a fixed key, base64, a clever cipher someone wrote on a Friday) falls to the first person who compares two ciphertexts. Even real primitives go wrong when you wire them together yourself, so the safe choice is a vetted high-level box that picks the cipher, the nonce, and the MAC for you.

> **Where to look:** helper modules with functions named `encrypt`, `obfuscate`, `scramble`, or `encode_secret`, and the dependency manifests. Grep for `b64encode` near "encrypt", `^ KEY`, and `pycrypto` in requirements files (Python), XOR loops over a `key` slice and `crypto/aes` used without `cipher.NewGCM` (Go), and `createCipher(`, `crypto-js`, `node-forge` (Node).
>
> **How to think:** Can I say what this code guarantees in one sentence, the way I can for `Fernet` or `secretbox` ("confidential, tamper-evident, fresh nonce every time")? If the author chose the mode, built the IV, and bolted on a MAC by hand, assume one of those steps is wrong until I've checked it. Then look at the library itself. Is it maintained, and is the pinned version patched? PyCrypto hasn't shipped a release since 2013 and carries a known heap overflow, so move to `cryptography` or PyCryptodome; crypto-js is no longer developed, and its PBKDF2 defaulted to SHA-1 with a single iteration until 4.2.0. I want libraries with a long, boring track record: `cryptography` and PyNaCl, Go's standard library and `golang.org/x/crypto`, Node's built-in `crypto` and libsodium bindings. One wrinkle: Fernet uses AES-128 under its HMAC, so if your standard demands 256-bit keys (see Cipher strength), PyNaCl's `nacl.secret.SecretBox` gives you the same one-call API with a 256-bit key.

```python vulnerable
KEY = b"acme-2019"


def encrypt(data: bytes) -> str:
    out = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(data))  # BUG: repeating-key XOR; one known plaintext reveals the key
    return base64.b64encode(out).decode()


def protect_ssn(ssn: str) -> str:
    return base64.b64encode(ssn.encode()).decode()  # BUG: base64 is an encoding anyone can reverse
```

```python fixed
from cryptography.fernet import Fernet, InvalidToken

box = Fernet(settings.DATA_KEY)  # FIX: vetted recipe (AES-CBC + HMAC-SHA256); key comes from the secret manager


def encrypt(data: bytes) -> str:
    return box.encrypt(data).decode()  # random IV, timestamp, and MAC handled by the library


def protect_ssn(ssn: str) -> str:
    return encrypt(ssn.encode())  # FIX: real encryption instead of an encoding


def decrypt(token: str) -> bytes | None:
    try:
        return box.decrypt(token)
    except InvalidToken:  # FIX: tampered or wrong-key tokens are rejected
        return None
```

```go vulnerable
var xorKey = []byte("acme-2019")

func encrypt(data []byte) string {
	out := make([]byte, len(data))
	for i, b := range data {
		out[i] = b ^ xorKey[i%len(xorKey)] // BUG: repeating-key XOR; one known plaintext reveals the key
	}
	return base64.StdEncoding.EncodeToString(out) // BUG: no nonce and no MAC, so equal inputs match and edits go unnoticed
}
```

```go fixed
var key [32]byte // FIX: 256-bit key, filled from the secret manager at startup

func encrypt(msg []byte) ([]byte, error) {
	var nonce [24]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return nil, err
	}
	return secretbox.Seal(nonce[:], msg, &nonce, &key), nil // FIX: XSalsa20-Poly1305, random nonce prepended
}

func decrypt(box []byte) ([]byte, error) {
	if len(box) < 24 {
		return nil, errors.New("ciphertext too short")
	}
	var nonce [24]byte
	copy(nonce[:], box[:24])
	msg, ok := secretbox.Open(nil, box[24:], &nonce, &key)
	if !ok { // FIX: any tampering fails authentication
		return nil, errors.New("decryption failed")
	}
	return msg, nil
}
```

```javascript vulnerable
const crypto = require("crypto");

function encrypt(text) {
  const cipher = crypto.createCipher("aes-256-cbc", process.env.APP_SECRET); // BUG: removed in Node 22; key and IV come from one MD5 pass, so the IV never changes
  return cipher.update(text, "utf8", "base64") + cipher.final("base64"); // BUG: no MAC, so flipped bits change the plaintext undetected
}

function decrypt(b64) {
  const decipher = crypto.createDecipher("aes-256-cbc", process.env.APP_SECRET);
  return decipher.update(b64, "base64", "utf8") + decipher.final("utf8");
}
```

```javascript fixed
const nacl = require("tweetnacl");

const key = Buffer.from(process.env.DATA_KEY_B64, "base64"); // FIX: 32 random bytes from the secret manager

function encrypt(text) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(Buffer.from(text, "utf8"), nonce, key); // FIX: XSalsa20-Poly1305 in one call
  return Buffer.concat([nonce, box]).toString("base64");
}

function decrypt(b64) {
  const raw = Buffer.from(b64, "base64");
  const n = nacl.secretbox.nonceLength;
  const msg = nacl.secretbox.open(raw.subarray(n), raw.subarray(0, n), key);
  if (!msg) throw new Error("decryption failed"); // FIX: tampered input never reaches the caller
  return Buffer.from(msg).toString("utf8");
}
```

### Hashing functions

A hash that guards integrity or proves who sent something has to hold up against someone trying to forge it. The classic break is a home-made MAC like `md5(secret + data)`: with MD5, SHA-1, or SHA-256, anyone holding one valid tag can compute another for `data + padding + "&role=admin"` without knowing the secret. Stored passwords need a different tool entirely; see Authentication > Password hashing.

> **Where to look:** anything that signs or checks a token, cookie, download link, or webhook, and any digest that's supposed to prove a file wasn't changed. Grep for `hashlib.md5`, `hashlib.sha1`, and `hexdigest()` over a key plus data (Python), `md5.Sum`, `sha1.New` (Go), and `createHash("md5")` or `createHash("sha1")` near a secret (Node).
>
> **How to think:** First, what is the hash for? A checksum on a download only helps if the checksum arrives over a channel the attacker can't touch; otherwise they swap both. Anything that has to prove who produced the data needs a key, which means HMAC or a real signature, never a bare hash with the secret glued on the front. Then the algorithm. MD5 and SHA-1 are out for anything security-relevant because both have practical collisions (SHA-1's chosen-prefix collision landed in 2020), so signatures and MACs use SHA-256, SHA-384, or SHA-512. Last, check how the tag gets compared, since an early-exit `==` leaks the right answer byte by byte (see Timing attacks).

```python vulnerable
SIGNING_KEY = settings.SIGNING_KEY  # 32 random bytes


def sign(payload: bytes) -> str:
    return hashlib.md5(SIGNING_KEY + payload).hexdigest()  # BUG: md5(key + data) can be extended without the key


def verify(payload: bytes, sig: str) -> bool:
    return sign(payload) == sig  # BUG: early-exit compare
```

```python fixed
SIGNING_KEY = settings.SIGNING_KEY  # 32 random bytes


def sign(payload: bytes) -> str:
    return hmac.new(SIGNING_KEY, payload, hashlib.sha256).hexdigest()  # FIX: HMAC-SHA256 isn't open to length extension


def verify(payload: bytes, sig: str) -> bool:
    return hmac.compare_digest(sign(payload).encode(), sig.encode())  # FIX: constant-time, and safe on non-ASCII input
```

```go vulnerable
var signingKey = loadKey("signing") // 32 random bytes

func sign(payload []byte) string {
	h := sha1.New()
	h.Write(signingKey) // BUG: sha1(key + data) is open to length extension
	h.Write(payload)
	return hex.EncodeToString(h.Sum(nil))
}

func verify(payload []byte, sig string) bool {
	return sign(payload) == sig // BUG: early-exit compare
}
```

```go fixed
var signingKey = loadKey("signing") // 32 random bytes

func sign(payload []byte) []byte {
	mac := hmac.New(sha256.New, signingKey) // FIX: HMAC-SHA256
	mac.Write(payload)
	return mac.Sum(nil)
}

func verify(payload []byte, sigHex string) bool {
	sig, err := hex.DecodeString(sigHex)
	return err == nil && hmac.Equal(sig, sign(payload)) // FIX: constant-time compare
}
```

```javascript vulnerable
const SIGNING_KEY = Buffer.from(process.env.SIGNING_KEY_B64, "base64");

function sign(payload) {
  return crypto.createHash("md5").update(SIGNING_KEY).update(payload).digest("hex"); // BUG: md5(key + data), extendable without the key
}

function verify(payload, sig) {
  return sign(payload) === sig; // BUG: early-exit compare
}
```

```javascript fixed
const SIGNING_KEY = Buffer.from(process.env.SIGNING_KEY_B64, "base64");

function sign(payload) {
  return crypto.createHmac("sha256", SIGNING_KEY).update(payload).digest(); // FIX: HMAC-SHA256
}

function verify(payload, sigHex) {
  const expected = sign(payload);
  const got = Buffer.from(String(sigHex), "hex");
  return got.length === expected.length && crypto.timingSafeEqual(got, expected); // FIX: length check, then constant-time
}
```

### Encryption functions

Data at rest needs authenticated encryption, meaning a mode that refuses to decrypt anything that was altered. CBC or ECB with a fixed IV shows which records are equal and lets an attacker flip bits without detection. GCM with a repeated nonce is worse: it leaks plaintext and hands out the key needed to forge tags.

> **Where to look:** code that writes sensitive fields to a database, object store, cache, or queue, and the matching read path. Grep for `modes.CBC`, `modes.ECB`, `AES.new(` (Python), `NewCBCEncrypter` and every `gcm.Seal` along with where its nonce comes from (Go), and `createCipheriv(` with `-cbc` or `-ecb`, `Buffer.alloc(16)` (Node).
>
> **How to think:** Start by asking whether the data needs storing at all. A billing job that writes full card numbers to S3, like the one below, usually needs only the last four digits; tokenize through the payment processor or drop the PAN, and your PCI scope shrinks with it. If something must be encrypted, I look for an AEAD mode (AES-256-GCM or ChaCha20-Poly1305), a fresh nonce from a CSPRNG for every message, stored next to the ciphertext, and a key fetched from KMS or a secret manager. Is the record's ID bound in as associated data, so a blob copied onto another customer's row fails to decrypt? With random 96-bit GCM nonces, rotate the key well before 2^32 messages. And know what bucket-level encryption buys you: S3 server-side encryption covers stolen disks, but anyone with `s3:GetObject` still reads plaintext. Data in transit is a separate problem that TLS handles (see SSL/TLS configuration).

```python vulnerable
KEY = bytes.fromhex(os.environ["CARD_KEY_HEX"])
IV = bytes(16)  # BUG: the same all-zero IV for every record


def store_card(txn_id: str, pan: str) -> None:
    padder = padding.PKCS7(128).padder()
    data = padder.update(pan.encode()) + padder.finalize()
    enc = Cipher(algorithms.AES(KEY), modes.CBC(IV)).encryptor()
    blob = enc.update(data) + enc.finalize()  # BUG: no MAC, so altered blobs decrypt without complaint
    s3.put_object(Bucket="acme-billing", Key=f"txn/{txn_id}", Body=blob)
```

```python fixed
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

aead = AESGCM(kms_data_key("card-data"))  # FIX: 256-bit key from KMS, cached in memory, never in source or env


def store_card(txn_id: str, pan: str) -> None:
    nonce = os.urandom(12)  # FIX: fresh 96-bit nonce per message
    blob = nonce + aead.encrypt(nonce, pan.encode(), txn_id.encode())  # FIX: GCM tag, bound to this record ID
    s3.put_object(Bucket="acme-billing", Key=f"txn/{txn_id}", Body=blob)


def load_card(txn_id: str) -> str:
    blob = s3.get_object(Bucket="acme-billing", Key=f"txn/{txn_id}")["Body"].read()
    return aead.decrypt(blob[:12], blob[12:], txn_id.encode()).decode()  # raises InvalidTag if altered or moved
```

```go vulnerable
var (
	cardKey    = []byte(os.Getenv("CARD_KEY"))
	fixedNonce = make([]byte, 12) // BUG: one nonce reused for every record
)

func storeCard(ctx context.Context, txnID, pan string) error {
	block, err := aes.NewCipher(cardKey)
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	blob := gcm.Seal(nil, fixedNonce, []byte(pan), nil) // BUG: repeated nonce leaks plaintext and lets tags be forged
	return putObject(ctx, "acme-billing", "txn/"+txnID, blob)
}
```

```go fixed
var cardKey = loadDataKey("card-data") // FIX: 32-byte key from KMS, so aes.NewCipher selects AES-256

func storeCard(ctx context.Context, txnID, pan string) error {
	block, err := aes.NewCipher(cardKey)
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil { // FIX: fresh 96-bit nonce per message
		return err
	}
	blob := gcm.Seal(nonce, nonce, []byte(pan), []byte(txnID)) // FIX: nonce prepended, record ID as associated data
	return putObject(ctx, "acme-billing", "txn/"+txnID, blob)
}
```

```javascript vulnerable
const KEY = Buffer.from(process.env.CARD_KEY_HEX, "hex");

async function storeCard(txnId, pan) {
  const cipher = crypto.createCipheriv("aes-256-ecb", KEY, null); // BUG: ECB, so the same PAN always produces the same bytes
  const blob = Buffer.concat([cipher.update(pan, "utf8"), cipher.final()]); // BUG: no auth tag; blobs can be altered or swapped between records
  await s3.send(new PutObjectCommand({ Bucket: "acme-billing", Key: `txn/${txnId}`, Body: blob }));
}
```

```javascript fixed
async function storeCard(txnId, pan) {
  const key = await dataKey("card-data"); // FIX: 32-byte key from KMS, cached in memory
  const iv = crypto.randomBytes(12); // FIX: fresh 96-bit nonce per message
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(txnId)); // FIX: the blob only decrypts under its own record ID
  const enc = Buffer.concat([cipher.update(pan, "utf8"), cipher.final()]);
  const blob = Buffer.concat([iv, cipher.getAuthTag(), enc]);
  await s3.send(new PutObjectCommand({ Bucket: "acme-billing", Key: `txn/${txnId}`, Body: blob }));
}
```

### Cipher strength

Key size and algorithm decide how much work brute force or factoring takes. A 1024-bit RSA key, DES, 3DES, or RC4 was acceptable once and isn't now, and these tend to survive in key-generation scripts and "legacy" partner integrations long after everyone forgot they exist.

> **Where to look:** key and certificate generation in app code, Makefiles, Terraform, and Dockerfiles, plus JWT and SAML signing config and the cipher choices in old integrations. Grep for `key_size=`, `TripleDES`, `ARC4` (Python), `rsa.GenerateKey`, `crypto/des`, `crypto/rc4` (Go), `modulusLength`, `des-ede3`, `rc4` (Node), and `openssl genrsa` or `rsa:1024` in scripts.
>
> **How to think:** Hold every key to written minimums. For new systems that's 256-bit symmetric keys (AES-256 or ChaCha20), 2048-bit RSA as the floor with 3072 preferred (NIST only approves 2048 through 2030), 256-bit ECC such as P-256 or Curve25519, and no certificate anywhere in the chain below those numbers. RC4, DES, and 3DES are out everywhere. Where does the size come from: a constant, a config value, or a library default nobody checked? Long-lived keys matter most, because a signing key generated in 2015 may still be in production. For new signing keys Ed25519 is the easy default. Small keys, fast, and no padding or hash choice to get wrong.

```python vulnerable
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa


def new_signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=1024)  # BUG: 1024-bit RSA is below every current minimum


def sign_license(key, blob: bytes) -> bytes:
    return key.sign(blob, padding.PKCS1v15(), hashes.SHA256())
```

```python fixed
from cryptography.hazmat.primitives.asymmetric import ed25519


def new_signing_key():
    return ed25519.Ed25519PrivateKey.generate()  # FIX: Ed25519; if a verifier needs RSA, use key_size=3072


def sign_license(key, blob: bytes) -> bytes:
    return key.sign(blob)  # FIX: no padding or hash choice to get wrong
```

```go vulnerable
func newSigningKey() (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, 1024) // BUG: 1024-bit RSA is below every current minimum
}

func signLicense(key *rsa.PrivateKey, blob []byte) ([]byte, error) {
	sum := sha256.Sum256(blob)
	return rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, sum[:])
}
```

```go fixed
func newSigningKey() (ed25519.PrivateKey, error) {
	_, priv, err := ed25519.GenerateKey(rand.Reader) // FIX: Ed25519 instead of short RSA
	return priv, err
}

func signLicense(key ed25519.PrivateKey, blob []byte) []byte {
	return ed25519.Sign(key, blob) // FIX: no hash or padding to pick
}
```

```javascript vulnerable
function newSigningKey() {
  return crypto.generateKeyPairSync("rsa", { modulusLength: 1024 }); // BUG: 1024-bit RSA is below every current minimum
}

function signLicense(privateKey, blob) {
  return crypto.sign("sha256", blob, privateKey);
}
```

```javascript fixed
function newSigningKey() {
  return crypto.generateKeyPairSync("ed25519"); // FIX: Ed25519 instead of short RSA
}

function signLicense(privateKey, blob) {
  return crypto.sign(null, blob, privateKey); // FIX: Ed25519 hashes internally, so the algorithm is null
}
```

### SSL/TLS configuration

TLS only protects a connection if the client checks the certificate and both ends refuse old protocol versions. Turning verification off, usually "for now" to get past a self-signed internal cert, lets anyone on the network path read and change the traffic.

> **Where to look:** HTTP client setup, calls to internal services, TLS options on SMTP, database, Redis, and queue connections, and the server or load balancer TLS policy. Grep for `verify=False`, `CERT_NONE`, `_create_unverified_context` (Python), `InsecureSkipVerify`, `MinVersion` (Go), `rejectUnauthorized`, `NODE_TLS_REJECT_UNAUTHORIZED`, `minVersion` (Node), and `http://` in config files.
>
> **How to think:** Is every outbound connection encrypted and verified, internal ones included? A pattern I still find in legacy clients builds `http://my-service.cloud.biz/Login?usr=...&pwd=...` and sends it as a GET, which puts the password in plaintext on the wire and in every proxy log along the way. The fix is HTTPS plus credentials in a POST body or an `Authorization` header. For internal services signed by a private CA, the answer is a CA bundle, never `verify=False`. Then the protocol floor: TLS 1.2 minimum, TLS 1.3 preferred, TLS 1.0, 1.1, and every SSL version off. Cipher suites should be AEAD with forward secrecy (ECDHE with AES-GCM or ChaCha20-Poly1305). Current Go, OpenSSL 3, and Node defaults already do that, so a hand-written cipher list is a reason to look closer. Certificate pinning fits mobile apps and links where you control both ends; pin the public key, keep a backup pin, and have a rotation plan, or one certificate renewal takes the app down.

```python vulnerable
def fetch_invoices(customer_id: str) -> dict:
    resp = requests.get(
        f"https://billing.internal/api/invoices/{customer_id}",
        headers={"Authorization": f"Bearer {settings.BILLING_TOKEN}"},
        verify=False,  # BUG: any certificate passes, so the bearer token goes to whoever answers
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def send_receipt(msg) -> None:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # BUG: the SMTP hop skips verification too
    ctx.minimum_version = ssl.TLSVersion.TLSv1  # BUG: TLS 1.0 still negotiable
    with smtplib.SMTP("mail.internal", 587) as smtp:
        smtp.starttls(context=ctx)
        smtp.send_message(msg)
```

```python fixed
INTERNAL_CA = "/etc/ssl/internal-ca.pem"


def fetch_invoices(customer_id: str) -> dict:
    resp = requests.get(
        f"https://billing.internal/api/invoices/{customer_id}",
        headers={"Authorization": f"Bearer {settings.BILLING_TOKEN}"},
        verify=INTERNAL_CA,  # FIX: trust the private CA; chain and hostname are still checked
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def send_receipt(msg) -> None:
    ctx = ssl.create_default_context(cafile=INTERNAL_CA)  # FIX: CERT_REQUIRED and hostname checking on
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2  # FIX: nothing older than TLS 1.2
    with smtplib.SMTP("mail.internal", 587) as smtp:
        smtp.starttls(context=ctx)
        smtp.send_message(msg)
```

```go vulnerable
func newBillingClient() *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,             // BUG: any certificate, any hostname
				MinVersion:         tls.VersionTLS10, // BUG: TLS 1.0 still negotiable
			},
		},
	}
}
```

```go fixed
func newBillingClient() (*http.Client, error) {
	caPEM, err := os.ReadFile("/etc/ssl/internal-ca.pem")
	if err != nil {
		return nil, err
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(caPEM) {
		return nil, errors.New("no certificates in internal CA bundle")
	}
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				RootCAs:    pool,             // FIX: verify against the private CA
				MinVersion: tls.VersionTLS12, // FIX: TLS 1.2 or newer
			},
		},
	}, nil
}
```

```javascript vulnerable
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false, // BUG: any certificate is accepted
  minVersion: "TLSv1", // BUG: TLS 1.0 still negotiable
});

async function fetchInvoices(customerId) {
  const res = await axios.get(`https://billing.internal/api/invoices/${customerId}`, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${process.env.BILLING_TOKEN}` },
  });
  return res.data;
}
```

```javascript fixed
const fs = require("fs");
const https = require("https");

const agent = new https.Agent({
  ca: fs.readFileSync("/etc/ssl/internal-ca.pem"), // FIX: trust the private CA; verification stays on
  minVersion: "TLSv1.2", // FIX: TLS 1.2 or newer
});

async function fetchInvoices(customerId) {
  const res = await axios.get(`https://billing.internal/api/invoices/${customerId}`, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${process.env.BILLING_TOKEN}` },
  });
  return res.data;
}
```

### Key and secret protection

Encryption and signing are only as strong as the secrecy of the key. A key in source code lives in every clone, CI log, and container image forever, and a key that never rotates turns one leak into permanent access.

> **Where to look:** settings modules, committed `.env` files, Dockerfiles and Helm values, CI config, and the JWT setup. Grep for `SECRET_KEY =`, `jwt.encode(` (Python), `[]byte("` near `SignedString` (Go), `jwt.sign(` with a string literal (Node), and `BEGIN PRIVATE KEY`, `sk_live_`, or `AKIA` across the whole repo and its history.
>
> **How to think:** Where does the key come from, and who else can read it? Source, config files, and images all count as published. Plain environment variables beat that, but in production they're a weaker store than a secret manager: they show up in `docker inspect`, `/proc/<pid>/environ`, crash dumps, and debug pages, and every child process inherits them. Can the key rotate without logging everyone out? A `kid` in the token header lets you sign with the new key while still verifying the old one until its tokens expire, then retire it. Is key access logged (KMS events in CloudTrail, Vault audit logs), with an alert on unusual reads? For private keys, ask whether the app needs the raw key at all, since KMS can sign on its behalf. And if a key ever reached git, deleting the line doesn't help. The history still has it, so rotate.

```python vulnerable
JWT_SECRET = "super-secret-jwt-key-2019"  # BUG: committed to git, shared by every environment, never rotated


def issue_token(user_id: int) -> str:
    claims = {"sub": str(user_id), "exp": datetime.now(UTC) + timedelta(hours=1)}
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


def read_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
```

```python fixed
KEYRING = secret_manager.get_json("jwt-signing-keys")  # FIX: {"current": kid, "keys": {kid: secret}}, loaded at startup


def issue_token(user_id: int) -> str:
    kid = KEYRING["current"]
    claims = {"sub": str(user_id), "exp": datetime.now(UTC) + timedelta(hours=1)}
    return jwt.encode(claims, KEYRING["keys"][kid], algorithm="HS256", headers={"kid": kid})  # FIX: kid names the signing key


def read_token(token: str) -> dict:
    kid = jwt.get_unverified_header(token).get("kid")
    if not isinstance(kid, str) or kid not in KEYRING["keys"]:  # FIX: unknown or retired kid fails closed
        raise jwt.InvalidTokenError("unknown kid")
    return jwt.decode(token, KEYRING["keys"][kid], algorithms=["HS256"])  # algorithm pinned, never read from the token
```

```go vulnerable
var jwtSecret = []byte("super-secret-jwt-key-2019") // BUG: in the repo, in every build, never rotated

func issueToken(userID string) (string, error) {
	claims := jwt.RegisteredClaims{Subject: userID, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}

func parseToken(raw string) (*jwt.Token, error) {
	return jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		return jwtSecret, nil
	})
}
```

```go fixed
type keyring struct {
	current string            // kid used for new tokens
	keys    map[string][]byte // every active kid, loaded from the secret manager at startup
}

func (k *keyring) issueToken(userID string) (string, error) {
	claims := jwt.RegisteredClaims{Subject: userID, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tok.Header["kid"] = k.current // FIX: kid tells the verifier which key signed it
	return tok.SignedString(k.keys[k.current])
}

func (k *keyring) parseToken(raw string) (*jwt.Token, error) {
	return jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		key, ok := k.keys[kid]
		if !ok { // FIX: unknown or retired kid fails closed
			return nil, fmt.Errorf("unknown kid %q", kid)
		}
		return key, nil
	}, jwt.WithValidMethods([]string{"HS256"})) // FIX: algorithm pinned
}
```

```javascript vulnerable
const jwt = require("jsonwebtoken");

const JWT_SECRET = "super-secret-jwt-key-2019"; // BUG: hardcoded, same in every environment, never rotated

function issueToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

function readToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
```

```javascript fixed
const jwt = require("jsonwebtoken");

let keyring; // { current: kid, keys: { [kid]: secret } }

async function loadKeyring() {
  keyring = await secrets.getJson("jwt-signing-keys"); // FIX: fetched from the secret manager at startup
}

function issueToken(userId) {
  const kid = keyring.current;
  return jwt.sign({ sub: String(userId) }, keyring.keys[kid], { algorithm: "HS256", expiresIn: "1h", keyid: kid }); // FIX: kid in the header
}

function readToken(token) {
  const kid = jwt.decode(token, { complete: true })?.header.kid;
  if (typeof kid !== "string" || !Object.hasOwn(keyring.keys, kid)) { // FIX: unknown kid fails closed
    throw new jwt.JsonWebTokenError("unknown kid");
  }
  return jwt.verify(token, keyring.keys[kid], { algorithms: ["HS256"] });
}
```

---
