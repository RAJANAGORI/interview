(function () {
  const { block, device, phone, db, card, link, both, flow, rt, red, green, amber, note, bad, good, warn } = SD;

  const alice = (tags = []) => device(0, -20, { label: "Alice", tags });
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Shop", "App"], glyph: "store", tags }, o));
  const users = (tags = []) => db(0, 8, { label: "users table", glyph: "users", tags });
  const thief = (tags = [], o = {}) => device(13, 12, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const pwLinks = (extra = {}) =>
    Object.assign(
      {
        au: both("alice", "app", { label: "POST /signup", labelAt: 0.5, labelSide: "below" }),
        ad: both("app", "db"),
      },
      extra
    );
  const dump = link("db", "thief", { style: "dashed", tone: "red", label: "db dump", labelTone: "red" });
  const signup = rt(["au", "ad"], "mine", { rate: 0.8 });

  const chatAlice = (tags = []) => phone(0, -16, { label: "Alice", tags });
  const server = (tags = []) => block(0, -2, { label: ["Chat", "Server"], glyph: "message", tags });
  const bob = (tags = []) => phone(0, 12, { label: "Bob", tags });
  const mallory = (tags = []) => device(-15, -7, { label: "Mallory", labelIcon: "skull", screen: "red", tags });
  const chatLinks = (extra = {}) =>
    Object.assign(
      {
        as: link("alice", "server"),
        sb: link("server", "bob"),
        sm: link("server", "mallory", { style: "dashed", tone: "red", label: "copies traffic", labelTone: "red", labelAt: 0.62 }),
      },
      extra
    );

  SD.lesson({
    id: "encryption-vs-hashing",
    title: "Encryption, Hashing & Signatures",
    summary: "Which tool keeps a secret, which only checks one, and whose key does what.",
    minutes: 14,
    level: "beginner",
    metrics: [
      { id: "tool", label: "Tool in use", icon: "key" },
      { id: "reads", label: "Attacker can read", icon: "eye" },
      { id: "proof", label: "Sender proven", icon: "signature" },
    ],
    legend: [["mine", "Alice"], "res", ["poison", "attacker / readable"], ["empty", "encrypted"], ["write", "webhook"]],
    goals: [
      { text: "Why passwords are hashed, not encrypted", step: 2 },
      { text: "Salts and deliberately slow hashes", step: 4 },
      { text: "When encryption is the right tool", step: 5 },
      { text: "Whose key encrypts and whose key signs", step: 9 },
      { text: "HMAC for webhooks", step: 10 },
    ],
    steps: [
      {
        short: "Plain text",
        chapter: "problem",
        title: "Passwords stored as plain text",
        body: [
          "Alice signs up at a shop. The app writes her email and password straight into the <code>users</code> table: <code>alice@mail.com, hunter2</code>.",
          "Then an attacker gets a copy of the database, through a leaked backup, a SQL injection or an old admin account. Every password is sitting there, readable. People reuse passwords, so the attacker tries them on email and bank sites next.",
        ],
        callout: { kind: "warn", text: "A leaked password table is never only your problem. Reuse turns it into everyone's problem: <b>credential stuffing</b>." },
        metrics: { tool: bad("none"), reads: bad("every password"), proof: "-" },
        scene: {
          entities: {
            alice: alice([note("password: hunter2", "user")]),
            app: app(),
            db: users([red("alice: hunter2", "eye")]),
            thief: thief([red("reads every password", "eye")]),
          },
          links: pwLinks({ dt: dump }),
          flows: [signup, flow("dt", "poison", { rate: 0.8 })],
        },
      },
      {
        short: "Encrypt?",
        chapter: "problem",
        title: "Encrypt them? The key lives next door",
        body: [
          "First instinct: encrypt the passwords with AES. But encryption is built to be <b>reversed</b>. To check a login the app has to decrypt, so the key sits on the app server, in a config file or an environment variable.",
          "Whoever reaches the database usually reaches the app server or its backups too. One stolen key and every password decrypts at once. A support engineer with access could read them as well.",
        ],
        callout: { kind: "insight", text: "Ask what you need back. You never need to read a password again. You only need to check that a new attempt matches." },
        changes: ["+ Passwords encrypted with AES", "- Key stored on the app server", "- Stolen key decrypts everything"],
        metrics: { tool: warn("AES, key on server"), reads: bad("everything, via the key"), proof: "-" },
        scene: {
          entities: {
            alice: alice(),
            app: app([amber("AES key in config", "key")]),
            db: users([amber("alice: 9f3ac1... (AES)", "lock")]),
            thief: thief([red("has db + key", "key")]),
          },
          links: pwLinks({ dt: dump, kt: link("app", "thief", { via: [["thief", "app"]], style: "dashed", tone: "red", label: "key copied", labelTone: "red", labelAt: 0.3 }) }),
          flows: [signup, flow("dt", "poison", { rate: 0.6 }), flow("kt", "secret", { rate: 0.5 })],
        },
      },
      {
        short: "Hash",
        chapter: "technique",
        title: "Hashing: a one-way fingerprint",
        body: [
          "A <span class=\"term\">hash function</span> turns any input into a fixed-size fingerprint. <code>SHA-256(\"hunter2\")</code> always gives the same 64 hex characters. There is no key, and no way to run it backwards.",
          "So store the hash, not the password. At login, hash what Alice typed and compare it with the stored value. The database no longer holds anything that can be decrypted.",
        ],
        callout: { kind: "tip", text: "Same input, same output. Change one character and the whole hash changes." },
        changes: ["- AES and its key", "+ Store SHA-256(password)", "~ Login compares hashes"],
        metrics: { tool: warn("SHA-256"), reads: warn("nothing to decrypt"), proof: "-" },
        scene: {
          entities: {
            alice: alice(),
            app: app([note("hash(attempt) == stored?", "hash")]),
            db: users([green("alice: f52fbd32...", "hash")]),
            thief: thief([amber("nothing to decrypt", "lock")]),
            card: card({ x: 0, y: -6, dx: -370, dy: -150 }, "One-way", ["hunter2 -> SHA-256 -> f52fbd32...", "hunter3 -> SHA-256 -> 8a2c0e71...", "= no key, nothing to decrypt", "# login: hash the attempt, compare"], { icon: "hash" }),
          },
          links: pwLinks({ dt: dump }),
          flows: [signup, flow("dt", "empty", { rate: 0.6 })],
        },
      },
      {
        short: "Guessing",
        chapter: "problem",
        title: "Case: fast hashes fall to guessing",
        body: [
          "The attacker can't reverse SHA-256, but they can guess. One gaming GPU computes around <b>10 billion</b> SHA-256 hashes a second. Every dictionary word, every leaked password list and every short combination gets hashed and compared within hours.",
          "Identical passwords also give identical hashes. Three users with <code>f52fbd32...</code> picked the same password, and precomputed lookup tables (rainbow tables) crack common hashes instantly.",
        ],
        callout: { kind: "warn", text: "SHA-256 is fast on purpose. For passwords, fast is exactly the problem." },
        changes: ["- 10 billion guesses a second", "- Same password, same hash"],
        metrics: { tool: warn("SHA-256"), reads: bad("~60% cracked"), proof: "-" },
        scene: {
          entities: {
            alice: alice(),
            app: app(),
            db: users([red("3 users share f52fbd32...", "users")]),
            thief: thief([red("GPU: 10 B guesses/s", "cpu")], { heat: 0.7 }),
            card: card({ x: 13, y: 12, dx: 100, dy: 6 }, "Offline guessing", ["top 1M passwords    < 1 second", "every 8-char word   minutes", "! shared hash = shared password", "# no rate limit offline"], { icon: "cpu" }),
          },
          links: pwLinks({ dt: dump }),
          flows: [signup, flow("dt", "poison", { rate: 1.4 })],
        },
      },
      {
        short: "Salt + slow",
        chapter: "solution",
        title: "Salt it, then make every guess expensive",
        body: [
          "Give every user a random <span class=\"term\">salt</span>, stored next to the hash. Alice's and Bob's identical passwords now hash differently, and precomputed tables are useless: every guess has to be made per user.",
          "Then use a hash that is slow on purpose: <b>Argon2id</b>, <b>scrypt</b> or <b>bcrypt</b>, tuned so one check takes about 100 ms and a lot of memory. Logins barely notice. The attacker's 10 billion guesses a second drop to a few thousand.",
        ],
        callout: { kind: "tip", text: "The algorithm and cost live inside the stored string (<code>$argon2id$...</code>), so you can raise the cost later and rehash on each user's next login." },
        changes: ["+ Random salt per user", "~ SHA-256 -> Argon2id (100 ms, 64 MB)", "~ Guess rate: 10 B/s -> thousands/s"],
        metrics: { tool: good("Argon2id + salt"), reads: good("only weak passwords"), proof: "-" },
        scene: {
          entities: {
            alice: alice(),
            app: app([green("argon2id: 100 ms", "timer")]),
            db: users([green("salt + hash per user", "lock")]),
            thief: thief([amber("thousands of guesses/s", "cpu")]),
            card: card({ x: 0, y: -6, dx: -350, dy: -150 }, "Stored hash", ["$argon2id$v=19$m=65536,t=3,p=4$", "  c2FsdC1hbGljZQ$Jm9Yb3dX...", "= unique salt per user", "= ~100 ms and 64 MB per guess", "# rehash when the cost goes up"], { icon: "lock" }),
          },
          links: pwLinks({ dt: dump }),
          flows: [signup, flow("dt", "empty", { rate: 0.6 })],
        },
      },
      {
        short: "Read back",
        chapter: "technique",
        title: "Data you need back: encrypt it",
        body: [
          "Some data you do need again: a delivery address, a tax ID, a partner's API key. That is what encryption is for. <b>AES-256-GCM</b> uses one secret key to lock and unlock, and GCM also detects tampering.",
          "Keep that key away from the data. A <span class=\"term\">key management service</span> (KMS) holds the master key and never hands it out. The app asks it to unwrap a small data key per record (envelope encryption), and every unwrap is logged.",
        ],
        callout: { kind: "insight", text: "Hash when you only need to check. Encrypt when you need it back." },
        changes: ["+ Addresses encrypted with AES-256-GCM", "+ KMS holds the master key", "~ Stolen db: ciphertext only"],
        metrics: { tool: good("AES-GCM + KMS"), reads: good("ciphertext only"), proof: "-" },
        scene: {
          entities: {
            alice: alice(),
            app: app(),
            db: users([green("address: AES-GCM", "lock")]),
            thief: thief([green("only ciphertext", "eyeOff")]),
            kms: block(-12, -6, { color: "yellow", glyph: "key", label: ["KMS"], sub: "key service" }),
            card: card({ x: 0, y: -6, dx: 30, dy: 80 }, "Envelope encryption", ["address  --AES-GCM-->  ciphertext", "data key --wrapped by--> master key", "= steal the disk: no usable key", "# every unwrap logged, revocable"], { icon: "key" }),
          },
          links: pwLinks({ dt: dump, ak: both("app", "kms", { label: "unwrap data key" }) }),
          flows: [signup, flow("dt", "empty", { rate: 0.6 }), rt("ak", "secret", { rate: 0.5, back: "secret" })],
        },
      },
      {
        short: "Strangers",
        chapter: "problem",
        title: "Two strangers, no shared key",
        body: [
          "New problem. Alice wants to send Bob a private message through a chat server. AES needs both of them to hold the same key, but they have never met. Sending the key through the same server hands it to anyone who can watch.",
          "Mallory can read the server's traffic. She sees the key go past, and then every message encrypted with it.",
        ],
        callout: { kind: "warn", text: "Symmetric encryption is fast but has a key-sharing problem. Public-key cryptography exists to solve exactly that." },
        changes: ["- Key sent through the server", "- Mallory copies it in transit", "- Every later message readable"],
        metrics: { tool: warn("shared AES key"), reads: bad("key + every message"), proof: bad("no") },
        scene: {
          entities: {
            alice: chatAlice([note("key: k3y-42", "key")]),
            server: server(),
            bob: bob(),
            mallory: mallory([red("reads: k3y-42", "eye")]),
          },
          links: chatLinks(),
          flows: [flow(["as", "sb"], "mine", { rate: 0.9 }), flow("sm", "poison", { rate: 0.9 })],
        },
      },
      {
        short: "Public key",
        chapter: "solution",
        title: "Public-key encryption: lock with Bob's public key",
        body: [
          "Bob generates a key pair. The <b>public key</b> he can post anywhere. The <b>private key</b> never leaves his phone. Whatever is locked with the public key can only be unlocked with the private one.",
          "Alice encrypts her message with Bob's public key. Mallory sees it pass and even holds the same public key, yet can't read a thing.",
        ],
        callout: { kind: "tip", text: "In practice the public key only protects a fresh symmetric session key. TLS and Signal both work this way, because RSA and elliptic-curve operations are slow for bulk data." },
        changes: ["+ Bob's key pair", "~ Alice encrypts with Bob's public key", "~ Mallory sees ciphertext"],
        metrics: { tool: good("public key"), reads: good("nothing"), proof: bad("no") },
        scene: {
          entities: {
            alice: chatAlice([note("encrypt: Bob's public key", "lock")]),
            server: server([green("relays ciphertext", "eyeOff")]),
            bob: bob([green("decrypt: own private key", "key")]),
            mallory: mallory([green("sees random bytes", "eyeOff")]),
            card: card({ x: 0, y: -2, dx: 60, dy: 70 }, "Whose key?", ["encrypt:  Bob's PUBLIC key  (anyone)", "decrypt:  Bob's PRIVATE key (only Bob)", "= Mallory sees ciphertext only"], { icon: "key" }),
          },
          links: chatLinks(),
          flows: [flow(["as", "sb"], "empty", { rate: 0.9 }), flow("sm", "empty", { rate: 0.9 })],
        },
      },
      {
        short: "Who sent it?",
        chapter: "problem",
        title: "But who actually sent it?",
        body: [
          "Bob's public key is public. That's the point, and it also means Mallory can encrypt a message to Bob: <i>\"It's Alice. Please pay invoice 7731 to this account.\"</i> It decrypts perfectly with Bob's private key.",
          "Encryption gave <b>confidentiality</b>. It says nothing about <b>who</b> wrote the message, or whether it changed on the way.",
        ],
        callout: { kind: "warn", text: "Confidentiality and authenticity are different properties. Plenty of real attacks on encrypted systems live in that gap." },
        changes: ["- Mallory encrypts a fake message to Bob", "- Bob can't tell it isn't Alice"],
        metrics: { tool: warn("public key only"), reads: good("nothing"), proof: bad("no") },
        scene: {
          entities: {
            alice: chatAlice(),
            server: server(),
            bob: bob([red("\"pay invoice 7731\"?", "alert")]),
            mallory: mallory([red("signs as \"Alice\"", "pen")]),
          },
          links: chatLinks({ sm: link("mallory", "server", { style: "dashed", tone: "red", label: "fake \"from Alice\"", labelTone: "red" }) }),
          flows: [flow(["as", "sb"], "empty", { rate: 0.6 }), flow(["sm", "sb"], "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Signature",
        chapter: "solution",
        title: "Signatures: sign with Alice's private key",
        body: [
          "Alice hashes the message and signs that hash with <b>her own private key</b>, then sends message and signature together. Bob checks it with <b>Alice's public key</b>. If one byte changed, or anyone else signed, verification fails.",
          "Mallory can't produce Alice's signature without Alice's private key, so the fake invoice is rejected. Encrypt to Bob, sign as Alice: you get both properties.",
        ],
        callout: { kind: "insight", text: "Encryption uses the <b>receiver's</b> keys. Signing uses the <b>sender's</b> keys. Mixing them up is the classic interview slip." },
        changes: ["+ Alice signs with her private key", "+ Bob verifies with Alice's public key", "~ Forged message rejected"],
        metrics: { tool: good("sign + encrypt"), reads: good("nothing"), proof: good("yes") },
        scene: {
          entities: {
            alice: chatAlice([note("sign: own private key", "signature")]),
            server: server(),
            bob: bob([green("valid: signed by Alice", "signature"), red("fake rejected", "xCircle")]),
            mallory: mallory([amber("can't forge a signature", "ban")]),
            card: card({ x: 0, y: -2, dx: 60, dy: 70 }, "Sign, then verify", ["sign:    Alice's PRIVATE key", "verify:  Alice's PUBLIC key", "= any change -> verification fails", "! a signature alone hides nothing"], { icon: "signature" }),
          },
          links: chatLinks({ sm: link("mallory", "server", { style: "dashed", tone: "red", label: "forged", labelTone: "red" }) }),
          flows: [flow(["as", "sb"], "empty", { rate: 0.7 }), flow(["sm", "sb"], "poison", { rate: 0.6, blocked: true })],
        },
      },
      {
        short: "HMAC",
        chapter: "technique",
        title: "Case: a webhook with a shared secret",
        body: [
          "A payment provider calls your webhook: <code>POST /hooks/paid {\"order\": 1042}</code>. Anyone on the internet can send that same request, so how do you know it's real?",
          "You and the provider share a secret. Every call carries <code>X-Signature: HMAC-SHA256(secret, body)</code>. You recompute it and compare in constant time; a forged call without the secret fails. Because both sides hold the key, HMAC proves the call came from a key holder, not which one.",
        ],
        callout: { kind: "tip", text: "Sign a timestamp along with the body and reject anything older than a few minutes, or a captured webhook can be replayed forever." },
        changes: ["+ Shared webhook secret", "+ HMAC checked on every call", "~ Forged calls rejected"],
        metrics: { tool: good("HMAC-SHA256"), reads: "-", proof: good("yes, shared key") },
        scene: {
          entities: {
            psp: block(0, -16, { color: "purple", glyph: "creditCard", label: ["Payment", "Provider"], tags: [note("signs with shared secret", "key")] }),
            shop: block(0, 2, { label: ["Shop", "App"], glyph: "store", tags: [green("HMAC valid", "check")] }),
            attacker: device(-12, 2, { label: "attacker", labelIcon: "skull", screen: "red", tags: [red("forged webhook", "alert")] }),
            card: card({ x: 0, y: 2, dx: 50, dy: 40 }, "Webhook check", ["sig = HMAC(secret, timestamp + body)", "= constant-time compare", "! reject timestamps older than 5 min", "# shared key: proves a holder, not which"], { icon: "webhook" }),
          },
          links: {
            ps: link("psp", "shop", { label: "POST /hooks/paid", labelSide: "below" }),
            xs: link("attacker", "shop", { style: "dashed", tone: "red", label: "no valid signature", labelTone: "red" }),
          },
          flows: [flow("ps", "write", { rate: 0.8 }), flow("xs", "poison", { rate: 0.7, blocked: true })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: pick the tool by the question",
        body: [
          `<table class="compare">
            <thead><tr><th>You need to</th><th>Use</th><th>Key</th></tr></thead>
            <tbody>
              <tr><td>Check a password</td><td>Argon2id / bcrypt, salted</td><td>No key</td></tr>
              <tr><td>Read data back</td><td>AES-256-GCM</td><td>Secret key in a KMS</td></tr>
              <tr><td>Send to a stranger</td><td>Public-key encryption</td><td>Their public key</td></tr>
              <tr><td>Prove who sent it</td><td>Digital signature</td><td>Your private key</td></tr>
              <tr><td>Prove a partner sent it</td><td>HMAC</td><td>Shared secret</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: say what you need (check, read back, keep secret from the server, prove origin), then name the tool and say who holds which key.",
        ],
        callout: { kind: "next", text: "Next: <b>TLS</b> combines all of these on every HTTPS request: certificates are signatures, the handshake is public-key crypto, and the traffic is AES." },
        metrics: { tool: good("right tool per job"), reads: good("nothing useful"), proof: good("yes") },
        scene: {
          entities: {
            alice: chatAlice([note("encrypt to Bob + sign", "lock")]),
            server: server([green("ciphertext only", "eyeOff")]),
            bob: bob([green("decrypt + verify", "signature")]),
          },
          links: { as: link("alice", "server"), sb: link("server", "bob") },
          flows: [flow(["as", "sb"], "empty", { rate: 0.9 })],
        },
      },
    ],
  });
})();
