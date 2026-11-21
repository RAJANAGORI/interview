(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(14, 4, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Shop", "API"], glyph: "server", tags }, o));
  const store = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "ciphertext", glyph: "lock", tags }, o));
  const kms = (tags = [], o = {}) => block(-15, 6, Object.assign({ s: 3.6, h: 34, label: ["KMS", "HSM"], glyph: "keyhole", color: "purple", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label, o = {}) => both(who, "app", Object.assign({ label, labelAt: 0.4, labelSide: "below" }, o));

  SD.lesson({
    id: "crypto-pitfalls-in-practice",
    title: "Crypto Pitfalls in Practice",
    summary: "The modes, nonces, keys and password hashes that look fine in code review and still fail under a real attacker.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "mode", label: "Crypto choice", icon: "key" },
      { id: "leak", label: "Attacker gets", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker"], ["secret", "key / plaintext"], ["empty", "sealed AEAD"], ["req", "API call"], ["res", "reply"]],
    goals: [
      { text: "Why ECB and static IVs leak structure", step: 1 },
      { text: "GCM nonce reuse catastrophic failure", step: 2 },
      { text: "Password hashing vs SHA-256", step: 4 },
      { text: "Prefer AEAD and KMS-backed keys", step: 6 },
      { text: "Constant-time compares and allowlists", step: 8 },
    ],
    steps: [
      {
        short: "ECB leak",
        chapter: "problem",
        title: "ECB mode: identical blocks stay identical",
        body: [
          "The shop encrypts profile photos and card PANs with AES in <span class=\"term\">ECB</span> mode because \"AES-256\" sounded strong. Each 16-byte block is encrypted alone. Repeated plaintext blocks produce repeated ciphertext blocks.",
          "An attacker who steals the ciphertext can still see shapes: the Linux penguin demo, equal PANs across rows, or identical session blobs. Confidentiality failed even though the algorithm name on the slide was fine.",
        ],
        callout: { kind: "warn", text: "Naming the cipher is not a design. The <b>mode</b> decides whether patterns survive." },
        metrics: { mode: bad("AES-ECB"), leak: bad("block patterns"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([note("same PAN twice", "creditCard")]),
            app: app([red("AES-ECB encrypt", "unlock")]),
            store: store([red("identical ciphertext blocks", "eye")]),
            mallory: mallory([red("reads structure", "eye")]),
            card: card(low(), "ECB failure", ["P1 P2 P1 P2  ->  C1 C2 C1 C2", "! repeated blocks stay visible", "= never ship ECB", "# prefer AES-GCM / ChaCha20-Poly1305"], { icon: "eye" }),
          },
          links: { ua: ask("alice", "PUT /profile"), ad: both("app", "store"), tap: link("store", "mallory", { label: "stolen dump", style: "dashed", tone: "red", labelTone: "red", labelAt: 0.5, labelSide: "below" }) },
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 }), flow("tap", "poison", { rate: 0.6, delay: 0.8 })],
        },
      },
      {
        short: "Nonce reuse",
        chapter: "attack",
        title: "GCM with a reused nonce loses authenticity",
        body: [
          "AES-GCM is an <span class=\"term\">AEAD</span>: it encrypts and authenticates. That only holds when every message under a key gets a unique nonce (IV). A counter that resets, a timestamp truncated to seconds, or a hardcoded zero IV reuses nonces under load.",
          "Two ciphertexts under the same key and nonce let an attacker recover the authentication key and forge tags. Confidentiality can collapse too. The library call looked modern; the nonce policy did not.",
        ],
        callout: { kind: "insight", text: "For GCM, nonce reuse is not a soft degradation. Treat it as key compromise and rotate." },
        changes: ["- Nonce reset under load", "- Tag forgery becomes possible", "+ Unique 96-bit nonce per encrypt"],
        metrics: { mode: bad("GCM, reused IV"), leak: bad("forge + XOR leaks"), defense: bad("broken AEAD") },
        scene: {
          entities: {
            alice: alice([note("two messages, same IV", "message")]),
            app: app([red("iv = 0 forever", "alert")]),
            store: store([red("GHASH key recoverable", "key")]),
            mallory: mallory([red("forges tags", "pen")]),
            card: card(low(), "GCM nonce rule", ["key + nonce must be unique", "! reuse -> authenticity gone", "= 96-bit random or counter", "= rotate key if reuse suspected"], { icon: "alert" }),
          },
          links: { ua: ask("alice", "POST /note"), ad: both("app", "store"), tap: link("mallory", "app", { label: "forged ciphertext", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 }), flow("tap", "poison", { rate: 0.55, delay: 0.7 })],
        },
      },
      {
        short: "Hardcoded key",
        chapter: "attack",
        title: "A key in source is a public key",
        body: [
          "Someone left <code>AES_KEY = \"prod-super-secret-32b!!!!!!!!\"</code> in a config class that shipped to GitHub. The repo was private until a contractor laptop synced it. Now every backup of that commit holds the key forever.",
          "Encryption with a published key is obfuscation. Rotate via KMS or a secrets manager, version the key id next to the ciphertext, and dual-decrypt during migration so old rows still open.",
        ],
        callout: { kind: "tip", text: "Ask in review: where does the key live at rest, who can read it, and how do we rotate without downtime?" },
        changes: ["- Key committed to git", "- Ciphertext decryptable offline", "+ KMS-backed DEK + key id"],
        metrics: { mode: warn("AES-GCM"), leak: bad("all plaintext"), defense: bad("key in repo") },
        scene: {
          entities: {
            alice: alice([gray("thinks data is sealed", "lock")], { dim: 0.5 }),
            app: app([red("AES_KEY in source", "fileCode")]),
            store: store([amber("ciphertext + key id missing", "database")]),
            mallory: mallory([red("clones repo, decrypts", "git")]),
            card: card(low(), "Hardcoded key", ["AES_KEY = \"prod-super-secret...\"", "! git history keeps it", "= envelope: KMS wraps DEK", "= store key_id with ciphertext"], { icon: "fileKey" }),
          },
          links: { ua: ask("alice", "GET /card"), ad: both("app", "store"), tap: link("mallory", "store", { label: "offline decrypt", style: "dashed", tone: "red", labelTone: "red", labelAt: 0.5, labelSide: "below" }) },
          flows: [rt(["ua", "ad"], "mine", { rate: 0.55 }), flow("tap", "secret", { rate: 0.55, delay: 0.7 })],
        },
      },
      {
        short: "SHA password",
        chapter: "attack",
        title: "SHA-256(password) is not password hashing",
        body: [
          "The login table stores <code>SHA256(password)</code>. A dump turns into an offline guessing contest. GPUs try billions of candidates per second against unsalted SHA-family digests, and common passwords fall in minutes.",
          "Password hashing needs a salt per user and a deliberately slow, memory-hard function: <span class=\"term\">Argon2id</span>, or tuned bcrypt/scrypt. Encryption is the wrong tool here too: you verify, you do not decrypt.",
        ],
        callout: { kind: "insight", text: "Fast hashes are for integrity of files. Password storage wants the opposite: expensive to verify at scale for an attacker." },
        changes: ["- Fast unsalted SHA-256", "- GPU cracks the dump", "+ Argon2id + unique salt"],
        metrics: { mode: bad("SHA-256(pw)"), leak: bad("cracked passwords"), defense: bad("fast hash") },
        scene: {
          entities: {
            alice: alice([note("hunter2 reused", "user")]),
            app: app([red("store SHA256(pw)", "hash")]),
            store: store([red("alice: a941... hashes", "table")], { label: "users" }),
            mallory: mallory([red("hashcat wordlist", "terminal")]),
            card: card(low(), "Password storage", ["! SHA256(password)", "! MD5, unsalted SHA1", "= Argon2id / bcrypt / scrypt", "= unique salt per user"], { icon: "hash" }),
          },
          links: { ua: ask("alice", "POST /signup"), ad: both("app", "store"), tap: link("store", "mallory", { label: "db dump", style: "dashed", tone: "red", labelTone: "red", labelAt: 0.5, labelSide: "below" }) },
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 }), flow("tap", "secret", { rate: 0.6, delay: 0.8 })],
        },
      },
      {
        short: "CBC oracle",
        chapter: "attack",
        title: "CBC padding oracles still show up",
        body: [
          "Legacy stacks still use AES-CBC with PKCS#7 padding and then return distinct errors for \"bad padding\" versus \"bad MAC\" (or different timings). That side channel is a classic <span class=\"term\">padding oracle</span>.",
          "An attacker flips ciphertext bytes, watches the error, and decrypts without the key (Vaudenay-style). Authenticate the ciphertext first (Encrypt-then-MAC) or, better, migrate to AEAD so padding is not attacker-visible.",
        ],
        callout: { kind: "warn", text: "Different error strings for decrypt failures are a gift. One generic failure mode, constant-time verify." },
        changes: ["- Distinct padding errors", "- Byte-by-byte decrypt", "+ AEAD or Encrypt-then-MAC"],
        metrics: { mode: bad("CBC + oracle"), leak: bad("plaintext bytes"), defense: bad("error leaks") },
        scene: {
          entities: {
            alice: alice([], { dim: 0.4 }),
            app: app([red("400 BadPadding vs BadMac", "siren")]),
            store: store([note("AES-CBC blobs", "lock")]),
            mallory: mallory([red("flips bytes, reads errors", "crosshair")]),
            card: card(low(), "Padding oracle", ["mutate ciphertext byte", "watch padding vs MAC error", "! recovers plaintext", "= migrate to AES-GCM"], { icon: "crosshair" }),
          },
          links: { tap: link("mallory", "app", { label: "mutated ciphertext", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }), ad: both("app", "store") },
          flows: [rt("tap", "poison", { rate: 0.9, back: "res" }), flow("ad", "secret", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Bad RNG",
        chapter: "problem",
        title: "Predictable randomness breaks everything else",
        body: [
          "Tokens, nonces and keys only work if the bits are unpredictable. <code>Math.random()</code>, <code>rand()</code> without a CSPRNG, or seeding from the clock produce values an attacker can narrow or replay.",
          "Use the platform CSPRNG: <code>secrets</code> / <code>os.urandom</code> in Python, <code>crypto.randomBytes</code> in Node, <code>SecureRandom</code> in Java. Session tokens need enough entropy (128+ bits) so guessing is not cheaper than phishing.",
        ],
        callout: { kind: "tip", text: "If the RNG is weak, strong algorithms still emit guessable outputs. Fix entropy first." },
        changes: ["- Math.random for tokens", "+ CSPRNG APIs only", "+ 128-bit+ session secrets"],
        metrics: { mode: warn("good cipher"), leak: bad("guessable tokens"), defense: bad("weak RNG") },
        scene: {
          entities: {
            alice: alice([note("session cookie", "cookie")]),
            app: app([red("token = Math.random()", "sparkles")]),
            store: store([amber("guessable sessions", "ticket")]),
            mallory: mallory([red("predicts next token", "target")]),
            card: card(low(), "CSPRNG only", ["! Math.random / rand()", "! time-seeded PRNG", "= os.urandom / SecureRandom", "= 128+ bit session tokens"], { icon: "sparkles" }),
          },
          links: { ua: ask("alice", "POST /login"), ad: both("app", "store"), tap: link("mallory", "app", { label: "forged session", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 }), flow("tap", "poison", { rate: 0.55, delay: 0.7 })],
        },
      },
      {
        short: "AEAD + KMS",
        chapter: "solution",
        title: "Safe default: AEAD under a KMS key",
        body: [
          "Prefer <code>AES-GCM</code> or <code>ChaCha20-Poly1305</code>. Generate a fresh data key or nonce per encrypt, store <code>key_id</code> with the blob, and let KMS or an HSM hold the master key. Application code never sees a long-lived raw AES key in a config file.",
          "Rotation becomes a version bump: encrypt new rows with key n+1, keep decrypt for n and n+1 during the dual-decrypt window, then retire n. Crypto lint in CI flags ECB, static IVs and hardcoded key material.",
        ],
        callout: { kind: "insight", text: "Envelope encryption separates \"who can unwrap keys\" from \"who can read rows,\" which is the operational win." },
        changes: ["+ AEAD encrypt", "+ KMS wraps DEK", "+ Dual-decrypt on rotate"],
        metrics: { mode: good("AES-GCM"), leak: good("ciphertext only"), defense: good("KMS + rotation") },
        scene: {
          entities: {
            alice: alice([green("writes sealed card", "creditCard")]),
            app: app([green("AES-GCM + key_id", "shieldCheck")]),
            store: store([green("blob + key_id=v3", "lock")]),
            kms: kms([note("wraps DEK", "keyhole")]),
            card: card(low(), "Envelope encrypt", ["1. DEK = random", "2. AEAD(plaintext, DEK)", "3. KMS.Wrap(DEK)", "4. store blob + key_id", "# rotate: dual-decrypt window"], { icon: "keyhole" }),
          },
          links: { ua: ask("alice", "PUT /card"), ak: both("app", "kms", { label: "Wrap DEK", labelAt: 0.5, labelSide: "below" }), ad: both("app", "store") },
          flows: [flow("ua", "mine", { rate: 0.55 }), rt("ak", "secret", { rate: 0.55, back: "secret", delay: 0.4 }), flow("ad", "empty", { rate: 0.55, delay: 0.9 })],
        },
      },
      {
        short: "Timing",
        chapter: "technique",
        title: "String == on secrets leaks via timing",
        body: [
          "Comparing a MAC, API key or password hash with <code>==</code> / <code>equals</code> can bail out on the first differing byte. Over a fast link that timing difference is measurable and shrinks the search space.",
          "Use constant-time helpers: <code>hmac.compare_digest</code>, <code>crypto.timingSafeEqual</code>, <code>MessageDigest.isEqual</code>. Verify the MAC before looking at plaintext, and never early-return on length mismatches that you advertise differently.",
        ],
        callout: { kind: "tip", text: "Interview phrase: authenticate then decrypt, and compare secrets in constant time." },
        changes: ["- Early-exit == on MAC", "+ timingSafeEqual / compare_digest", "+ Verify tag before use"],
        metrics: { mode: good("HMAC/AEAD"), leak: good("no timing oracle"), defense: good("constant-time") },
        scene: {
          entities: {
            alice: alice([note("webhook HMAC", "webhook")]),
            app: app([green("timingSafeEqual", "checkCircle")]),
            store: store([note("event log", "receipt")]),
            mallory: mallory([gray("timing useless", "timer")], { dim: 0.5 }),
            card: card(low(), "Constant-time compare", ["! if (mac == expected)", "= hmac.compare_digest(a, b)", "= crypto.timingSafeEqual", "# same for API keys"], { icon: "timer" }),
          },
          links: { ua: ask("alice", "POST /hooks/stripe"), ad: both("app", "store") },
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Allowlist alg",
        chapter: "solution",
        title: "Pin algorithms; do not trust the blob",
        body: [
          "JWT <code>alg</code>, CMS algorithm OIDs and custom crypto headers must never let the attacker pick a weak path. Pin an allowlist: RS256 or ES256 for tokens, AES-GCM for sealed fields, Argon2id for passwords.",
          "Disable legacy suites in TLS and in app crypto the same way. Algorithm agility without policy is how \"none\", RC4 and PKCS#1 v1.5 keep coming back.",
        ],
        callout: { kind: "warn", text: "The ciphertext or token must not choose how it is verified." },
        changes: ["+ Explicit algorithm allowlist", "- Client-chosen alg rejected", "~ Crypto lint in CI"],
        metrics: { mode: good("pinned algorithms"), leak: good("nothing"), defense: good("allowlist") },
        scene: {
          entities: {
            alice: alice([green("RS256 token", "ticket")]),
            app: app([green("algorithms: [RS256]", "listChecks")]),
            store: store([green("AES-GCM only", "lock")]),
            mallory: mallory([red("alg: none rejected", "ban")]),
            card: card(low(), "Pin the suite", ["tokens: RS256/ES256 only", "fields: AES-GCM / ChaCha20-Poly1305", "passwords: Argon2id", "! never trust header alg alone"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "GET /orders + Bearer"), tap: link("mallory", "app", { label: "alg:none token", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below", fail: 0.8 }), ad: both("app", "store") },
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 }), flow("tap", "poison", { rate: 0.45, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: modern primitives, careful operations",
        body: [
          `<table class="compare">
            <thead><tr><th>Pitfall</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>ECB / pattern leak</td><td>AEAD (GCM / ChaCha20-Poly1305)</td></tr>
              <tr><td>Nonce or IV reuse</td><td>Unique nonce; rotate on reuse</td></tr>
              <tr><td>Key in git</td><td>KMS envelope + dual-decrypt</td></tr>
              <tr><td>SHA-256(password)</td><td>Argon2id + salt</td></tr>
              <tr><td>Padding / timing oracles</td><td>AEAD + constant-time compare</td></tr>
              <tr><td>Weak RNG / client alg</td><td>CSPRNG + allowlist</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: prefer AEAD, never reuse GCM nonces, keep keys in KMS, hash passwords with Argon2id, compare secrets in constant time, and pin algorithms so the blob cannot pick a weak path.",
        ],
        callout: { kind: "next", text: "Next: <b>Secrets management and key lifecycle</b> - rotation, workload identity and blast radius when a key still leaks." },
        metrics: { mode: good("AEAD + KMS"), leak: good("minimal"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("sealed fields", "shieldCheck")]),
            app: app([green("linted crypto", "shieldCheck")]),
            store: store([green("key_id + AEAD blob", "lock")]),
            kms: kms([green("master keys", "keyhole")]),
          },
          links: { ua: ask("alice", "PUT /card"), ak: both("app", "kms", { label: "unwrap DEK", labelAt: 0.5, labelSide: "below" }), ad: both("app", "store") },
          flows: [flow("ua", "mine", { rate: 0.6 }), rt("ak", "secret", { rate: 0.5, back: "secret", delay: 0.3 }), flow("ad", "empty", { rate: 0.6, delay: 0.8 })],
        },
      },
    ],
  });
})();
