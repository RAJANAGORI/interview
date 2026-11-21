(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const mirror = (tags = [], o = {}) => block(0, -3, Object.assign({ label: ["download", "mirror"], glyph: "download", tags }, o));
  const acme = (tags = [], o = {}) => block(0, 11, Object.assign({ label: ["Acme", "release"], glyph: "package", color: "green", tags }, o));
  const attacker = (tags = [], o = {}) => device(15, 7, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const ca = (tags = [], o = {}) => block(-15, -6, Object.assign({ s: 3.6, h: 34, label: ["code signing", "CA"], glyph: "stamp", color: "purple", tags }, o));
  const side = (label, glyph, color, tags = [], o = {}) => block(-16, 8, Object.assign({ s: 3.6, h: 34, label, glyph, color, tags }, o));
  const low = (dx = -95, dy = 100) => ({ x: 0, y: -3, dx, dy });
  const upLeft = (dx = -440, dy = -190) => ({ x: 0, y: -3, dx, dy });

  const L = {
    am: (o = {}) => both("alice", "mirror", Object.assign({ label: "GET acme-cli-2.4.1.tar.gz", labelAt: 0.5, labelSide: "below" }, o)),
    pm: (o = {}) => link("acme", "mirror", Object.assign({ label: "uploads release", labelAt: 0.5, labelSide: "below" }, o)),
    xm: (o = {}) => link("attacker", "mirror", Object.assign({ label: "overwrites files", labelAt: 0.5, labelTone: "red", tone: "red", style: "dashed" }, o)),
  };
  const genuine = [flow("pm", "res", { rate: 0.6 }), rt("am", "mine", { rate: 0.7, back: "res", delay: 0.6 })];

  SD.lesson({
    id: "digital-signatures",
    title: "Digital Signatures",
    summary: "How a download proves it came from its publisher when a hash alone can't, and the nonce, verifier and key-trust bugs that break signatures in practice.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "confirms", label: "Verifier confirms", icon: "checkCircle" },
      { id: "fakes", label: "Attacker can fake", icon: "skull" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["res", "genuine release"], ["poison", "attacker's file"], ["secret", "key / signature"], ["ping", "status check"]],
    goals: [
      { text: "Why a hash from the same server proves nothing", step: 1 },
      { text: "Sign with the private key, verify with the public key", step: 2 },
      { text: "Signatures vs HMAC, and non-repudiation", step: 3 },
      { text: "ECDSA nonce reuse and the PS3 signing key", step: 5 },
      { text: "Verifier bugs and SAML signature wrapping", step: 6 },
      { text: "Trusting the key: PKI, pinning, Sigstore, timestamps", step: 8 },
    ],
    steps: [
      {
        short: "Download",
        chapter: "setup",
        title: "Alice downloads a release and checks the hash",
        body: [
          "Alice needs <code>acme-cli</code>, an open-source command-line tool. She downloads <code>acme-cli-2.4.1.tar.gz</code> from a mirror, grabs the <code>SHA256SUMS</code> file from the same page, and runs <code>sha256sum -c SHA256SUMS</code>. It prints <code>acme-cli-2.4.1.tar.gz: OK</code>.",
          "That check proves one thing: the bytes on her disk hash to the value she was given. It catches a truncated download or a corrupted mirror. It says nothing about <b>who</b> produced the file, and both files came from the same server.",
        ],
        callout: { kind: "insight", text: "A checksum answers \"did these bytes change?\" It only answers \"are these Acme's bytes?\" if the hash came from somewhere the attacker can't touch." },
        metrics: { confirms: warn("file matches the hash"), fakes: "-", defense: warn("checksum, same site") },
        scene: {
          entities: {
            alice: alice([note("sha256sum -c: OK", "hash")]),
            mirror: mirror([note("tar.gz + SHA256SUMS", "file")]),
            acme: acme([note("builds v2.4.1", "package")]),
            card: card(low(), "What the checksum checks", ["$ sha256sum -c SHA256SUMS", "acme-cli-2.4.1.tar.gz: OK", "= catches corruption in transit", "! file and hash came from one server"], { icon: "hash" }),
          },
          links: { am: L.am(), pm: L.pm() },
          flows: genuine,
        },
      },
      {
        short: "Swap both",
        chapter: "attack",
        title: "The attacker replaces the file and the hash",
        body: [
          "The attacker gets write access to the mirror: a phished admin password, an unpatched CMS plugin, or simply a volunteer mirror they run themselves. They upload a backdoored tarball under the same name and regenerate <code>SHA256SUMS</code> from it. Alice runs the same check and gets <code>OK</code>, because the hash really does match the file she received.",
          "Linux Mint went through a version of this in February 2016, when attackers broke into the project's website and pointed the download link at a backdoored ISO. A hash is only as trustworthy as the channel that delivered it, and here it rode the same compromised channel as the file.",
        ],
        callout: { kind: "warn", text: "There's no secret in SHA-256. Anyone can compute a matching hash for any file, so a hash can show integrity but never authenticity." },
        changes: ["- Mirror compromised", "- Backdoored tarball uploaded", "- SHA256SUMS regenerated to match"],
        metrics: { confirms: bad("matches a forged hash"), fakes: bad("file and hash"), defense: bad("checksum only") },
        scene: {
          entities: {
            alice: alice([red("OK, but it's backdoored", "hash")]),
            mirror: mirror([red("both files replaced", "alert")], { heat: 0.5 }),
            acme: acme([gray("never built this file", "package")], { dim: 0.4 }),
            attacker: attacker([red("evil tar.gz + new hash", "upload")]),
            card: card(low(), "Same tool, attacker's input", ["# attacker, on the mirror:", "$ sha256sum acme-cli-2.4.1.tar.gz > SHA256SUMS", "# Alice, at home:", "acme-cli-2.4.1.tar.gz: OK", "! no secret needed to make a hash"], { icon: "hash" }),
          },
          links: { am: L.am({ labelTone: "red" }), pm: L.pm({ label: "", style: "dashed" }), xm: L.xm() },
          flows: [flow("xm", "poison", { rate: 0.6 }), rt("am", "mine", { rate: 0.6, back: "poison", delay: 0.8 })],
        },
      },
      {
        short: "Sign it",
        chapter: "solution",
        title: "Sign the release with a key only Acme holds",
        body: [
          "Acme's release machine hashes the tarball and signs that digest with its <span class=\"term\">private key</span>, which lives in an HSM or a hardware token and never touches the mirror. The signature ships next to the file as <code>acme-cli-2.4.1.tar.gz.sig</code>. Anyone holding Acme's <span class=\"term\">public key</span> can check it with <code>openssl dgst -sha256 -verify acme.pub -signature ...</code>, which prints <code>Verified OK</code>.",
          "Now it doesn't matter who controls the mirror. The attacker can still replace the tarball and the <code>.sig</code>, but making a signature that verifies under Acme's public key takes Acme's private key. Alice got that public key earlier, by another route, so the swap shows up as <code>Verification failure</code> and her script refuses to install.",
        ],
        callout: { kind: "insight", text: "Signing moves trust off the download server and onto a key. The mirror turns into plain storage, and it's allowed to be hostile." },
        changes: ["+ Acme signs the hash with its private key", "+ Alice verifies with Acme's public key", "~ Swapped tarball fails verification"],
        metrics: { confirms: good("Acme signed these bytes"), fakes: warn("files, not a signature"), defense: good("signature") },
        scene: {
          entities: {
            alice: alice([green("Verification failure: refused", "shieldCheck")]),
            mirror: mirror([amber("still compromised", "alert")]),
            acme: acme([note("private key in an HSM", "key")]),
            attacker: attacker([amber("can't sign as Acme", "ban")]),
            card: card(low(), "Sign once, verify anywhere", ["sign:   openssl dgst -sha256 -sign acme.key", "verify: openssl dgst -sha256 -verify acme.pub", "= genuine release: Verified OK", "! swapped tarball: Verification failure", "# the private key never leaves Acme"], { icon: "signature" }),
          },
          links: { am: L.am({ label: "tar.gz + .sig" }), pm: L.pm({ label: "release + .sig" }), xm: L.xm({ label: "swaps tar.gz + .sig" }) },
          flows: [flow("pm", "res", { rate: 0.5 }), flow("pm", "secret", { rate: 0.5, delay: 0.5 }), flow("xm", "poison", { rate: 0.6, delay: 0.3 }), flow("am", "poison", { rate: 0.6, reverse: true, blocked: true, delay: 1 })],
        },
      },
      {
        short: "vs HMAC",
        chapter: "insight",
        title: "Why not HMAC? Every verifier could also forge",
        body: [
          "The webhook in the Encryption, Hashing &amp; Signatures lesson used HMAC: both sides share one secret, and the key that checks a tag is the same key that makes one. That's fine between two companies. For a public release it falls apart. Acme's updater would carry the HMAC key in every copy, and one <code>strings acme-cli | grep -i hmac</code> later the attacker can mint \"genuine\" releases.",
          "A signature splits the roles: the private key signs, the public key only verifies, so giving it to a million users costs nothing. That split is also where <span class=\"term\">non-repudiation</span> comes from. Only Acme's key could have produced the signature, so an auditor or a court can tie the release to Acme. An HMAC tag could have come from either key holder.",
        ],
        callout: { kind: "tip", text: "Non-repudiation only holds while one party controls the key. A signing key shared by five engineers, or pasted into a CI variable, proves \"someone with access\" and nothing more." },
        changes: ["- HMAC key ships inside every client", "- Extracted key forges valid tags", "+ Public key verifies but can't sign"],
        metrics: { confirms: warn("HMAC: some key holder"), fakes: bad("tags, with the leaked key"), defense: good("switch to signatures") },
        scene: {
          entities: {
            alice: alice([amber("updater embeds the HMAC key", "key")]),
            mirror: mirror(),
            acme: acme([note("same key makes the tags", "key")]),
            attacker: attacker([red("forges tags with it", "pen")]),
            card: card(upLeft(), "Who can do what", ["HMAC: one key signs and verifies", "! ship the key = ship the power to sign", "signature: private signs, public verifies", "= the public key can go to everyone", "= only Acme's key makes Acme's signature"], { icon: "scale" }),
          },
          links: {
            am: L.am({ label: "tar.gz + HMAC tag" }),
            pm: L.pm({ label: "release + tag" }),
            xa: link("alice", "attacker", { label: "key pulled from the binary", labelAt: 0.62, labelSide: "below", labelTone: "red", tone: "red", style: "dashed" }),
            xm: L.xm({ label: "", style: "dashed" }),
          },
          flows: [flow("xa", "secret", { rate: 0.5 }), flow("xm", "poison", { rate: 0.5, delay: 1 }), flow("am", "poison", { rate: 0.5, reverse: true, delay: 1.6 })],
        },
      },
      {
        short: "Algorithms",
        chapter: "tradeoff",
        title: "RSA-PSS, PKCS#1 v1.5, ECDSA or Ed25519?",
        body: [
          "RSA has two signature paddings. <code>PKCS#1 v1.5</code> is deterministic and still everywhere: JWT's <code>RS256</code>, most RSA certificates. The scheme holds up, but loose verifiers don't: in 2006 Bleichenbacher forged signatures for <code>e=3</code> keys against parsers that didn't check the padding all the way to the end. <code>RSA-PSS</code> (<code>PS256</code>) adds a random salt and has a tighter security proof, so prefer it whenever you need RSA.",
          "ECDSA on P-256 (<code>ES256</code>) matches RSA-3072's strength with 64-byte signatures, but every signature needs a fresh, secret, random nonce. Ed25519 keeps the small keys and 64-byte signatures, derives the nonce from the key and the message, and leaves almost nothing to configure. It's the sensible default for new work, and OpenSSH, signify, minisign and Sparkle all use it.",
        ],
        callout: { kind: "tip", text: "Interview default: Ed25519 for new systems, ECDSA P-256 when an HSM or protocol only offers that, RSA-PSS with 3072-bit keys when you're stuck with RSA. Never MD5 or SHA-1 as the hash underneath." },
        changes: ["~ PKCS#1 v1.5: safe only if parsed strictly", "+ RSA-PSS: salted padding", "~ ECDSA: needs a perfect random nonce", "+ Ed25519: deterministic, 64-byte sigs"],
        metrics: { confirms: good("Acme signed these bytes"), fakes: warn("with a lax RSA parser"), defense: good("Ed25519 by default") },
        scene: {
          entities: {
            alice: alice([green("Verified OK", "checkCircle")]),
            mirror: mirror([note("64-byte .sig", "file")]),
            acme: acme([note("signs with Ed25519", "signature")]),
            attacker: attacker([gray("no key, no forgery", "ban")], { dim: 0.4 }),
            card: card(low(-110), "Signature size and nonce", ["RSA PKCS#1 v1.5   deterministic", "RSA-PSS           random salt", "ECDSA P-256       random k, fatal if reused", "Ed25519           k = hash(key, message)"], {
              icon: "scale",
              bars: [
                { label: "RSA-3072", to: 1, tone: "amber", note: "384 B" },
                { label: "RSA-2048", to: 0.67, tone: "amber", note: "256 B" },
                { label: "ECDSA P-256", to: 0.17, tone: "blue", note: "64 B" },
                { label: "Ed25519", to: 0.17, tone: "green", note: "64 B", bold: true },
              ],
            }),
          },
          links: { am: L.am({ label: "tar.gz + .sig" }), pm: L.pm({ label: "release + .sig" }) },
          flows: genuine,
        },
      },
      {
        short: "Nonce reuse",
        chapter: "attack",
        title: "Reuse an ECDSA nonce once and the key falls out",
        body: [
          "An ECDSA signature is a pair <code>(r, s)</code>. <code>r</code> comes from a one-time nonce <code>k</code>, and <code>s = k^-1 (H(m) + r*d) mod n</code>, where <code>d</code> is the private key. Sign two different messages with the same <code>k</code> and both signatures carry the same <code>r</code>. Subtract one <code>s</code> from the other and the <code>d</code> terms cancel, leaving <code>k</code>; plug <code>k</code> back in and you have <code>d</code>.",
          "Sony made exactly this mistake on the PlayStation 3, signing every update with the same <code>k</code>. fail0verflow showed it at the 27C3 congress in December 2010, and the signing key was public within weeks, so anyone could sign code the console would run. In 2013 a flaw in Android's <code>SecureRandom</code> repeated nonces in Bitcoin wallets, and coins were stolen using signatures already sitting on the blockchain. The fix is to stop drawing <code>k</code> at random: RFC 6979 derives it from the private key and the message hash, and Ed25519 does the same by design.",
        ],
        callout: { kind: "warn", text: "It doesn't take an exact repeat. Slightly biased nonces leak the key across enough signatures through lattice attacks, so \"mostly random\" is a bug." },
        changes: ["- Same k used for two signatures", "- Private key solved from public data", "+ RFC 6979 or Ed25519: nonce derived, not drawn"],
        metrics: { confirms: bad("anything signed with d"), fakes: bad("any release, any time"), defense: warn("RFC 6979 / Ed25519") },
        scene: {
          entities: {
            alice: alice([red("forged update: Verified OK", "checkCircle")]),
            mirror: mirror([note("v2.4.0.sig, v2.4.1.sig", "file")]),
            acme: acme([red("same k for every release", "alert")], { heat: 0.4 }),
            attacker: attacker([red("solves for Acme's key", "key")]),
            card: card(low(-110), "Two signatures, same k", ["sig1 = (r, s1)   sig2 = (r, s2)   same r", "k = (H1 - H2) / (s1 - s2)       mod n", "d = (s1 * k - H1) / r           mod n", "! d is Acme's private key", "= RFC 6979: k derived from d and H(m)", "# PS3, 2010: one k for every update"], { icon: "key" }),
          },
          links: { am: L.am({ label: "forged tar.gz + .sig", labelTone: "red" }), pm: L.pm({ label: "release + .sig" }), xm: L.xm({ label: "reads two public .sig files" }) },
          flows: [flow("pm", "secret", { rate: 0.5 }), flow("xm", "secret", { rate: 0.6, reverse: true, delay: 0.4 }), flow("am", "poison", { rate: 0.5, reverse: true, delay: 1.6 })],
        },
      },
      {
        short: "Verify bugs",
        chapter: "attack",
        title: "Verifiers that don't really verify",
        body: [
          "Most real signature breaks live in the verifying code, not the math, and the simplest is ignoring what verify actually returned. OpenSSL's <code>EVP_VerifyFinal</code> returns 1 for valid, 0 for invalid and -1 for an error, so <code>if (rc)</code> treats an error as a pass, and OpenSSL's own callers shipped exactly that bug (CVE-2008-5077). Apple's \"goto fail\" (CVE-2014-1266) was a duplicated line that jumped past the TLS signature check with the error code still 0.",
          "The other classic lets the signed object choose how it gets checked. You saw it in the JWT lesson: a header of <code>\"alg\": \"none\"</code> skips verification in a lax library, and switching <code>RS256</code> to <code>HS256</code> makes the server use its RSA public key, which everyone has, as an HMAC secret. The verifier should pick the algorithm and the key from its own configuration, never from the message.",
        ],
        callout: { kind: "warn", text: "Pin one algorithm per key, as in <code>jwt.verify(token, pubKey, { algorithms: ['RS256'] })</code>, and fail closed on anything that isn't an explicit success." },
        changes: ["- Error return treated as valid", "- Token header picks the algorithm", "+ rc == 1 only; algorithm fixed per key"],
        metrics: { confirms: bad("nothing, check skipped"), fakes: bad("any signature"), defense: warn("strict result + alg pin") },
        scene: {
          entities: {
            alice: alice([red("verify() error read as true", "bug")]),
            mirror: mirror(),
            acme: acme([], { dim: 0.4 }),
            attacker: attacker([red("crafts a malformed .sig", "bug")]),
            card: card(low(-110), "Checking without checking", ["rc = EVP_VerifyFinal(ctx, sig, len, pub);", "if (rc) install();     // -1 is truthy", "= if (rc == 1) install();", "! {\"alg\":\"none\"}  or  RS256 -> HS256", "= algorithm fixed per key, not per token", "# CVE-2008-5077, goto fail (CVE-2014-1266)"], { icon: "bug" }),
          },
          links: { am: L.am({ label: "tar.gz + broken .sig", labelTone: "red" }), pm: L.pm({ label: "", style: "dashed" }), xm: L.xm({ label: "uploads junk signature" }) },
          flows: [flow("xm", "poison", { rate: 0.6 }), flow("am", "poison", { rate: 0.6, reverse: true, delay: 1 })],
        },
      },
      {
        short: "Wrapping",
        chapter: "attack",
        title: "Case: signature wrapping in SAML",
        body: [
          "SAML logins carry a signed XML assertion, and the signature names what it covers by ID: <code>&lt;Reference URI=\"#a1\"&gt;</code>. In <span class=\"term\">signature wrapping</span>, the attacker logs in as themselves and keeps their genuinely signed assertion, but tucks it inside an element nobody reads, such as <code>&lt;Extensions&gt;</code>. Where the app looks, they put a new, unsigned assertion for <code>admin@corp</code>.",
          "The XML signature library finds <code>#a1</code>, checks it, and reports success. The login code then reads the first assertion in the document, which is the forged one. The 2012 paper \"On Breaking SAML\" found this in 11 of 14 SAML frameworks. The fix is to have verification return the exact nodes it checked and make the app use only those, with schema validation and duplicate-ID rejection on top.",
        ],
        callout: { kind: "tip", text: "Same bug in code signing: Android's 2013 \"Master Key\" flaw (CVE-2013-4787). An APK with two entries of the same name was verified against one and installed from the other." },
        changes: ["- Signed assertion moved, still valid", "- App reads an unsigned twin", "+ Use only the nodes the verifier returns"],
        metrics: { confirms: warn("#a1 is signed"), fakes: bad("who logged in"), defense: warn("use verified nodes only") },
        scene: {
          entities: {
            browser: device(0, -18, { label: "attacker", labelIcon: "skull", screen: "red", tags: [red("moves the signed assertion", "code")] }),
            sp: block(0, -3, { label: ["SAML", "app"], glyph: "server", tags: [red("signature ok, reads x9", "alert")] }),
            users: db(0, 11, { label: "accounts", glyph: "users", tags: [red("session as admin@corp", "userX")] }),
            idp: block(-15, -6, { s: 3.6, h: 34, label: ["corp", "IdP"], glyph: "idCard", color: "purple", tags: [note("signs mallory's assertion", "signature")] }),
            card: card(low(-110), "Wrapped SAML response", ["<Response>", "  <Assertion ID=\"x9\"> admin@corp    no sig", "  <Extensions>", "    <Assertion ID=\"a1\"> mallory   signed", "      <Signature> URI=\"#a1\"", "= verifier: #a1 checks out", "! app: first Assertion -> admin@corp"], { icon: "code" }),
          },
          links: {
            bi: both("browser", "idp", { label: "logs in as mallory", labelAt: 0.5 }),
            bs: both("browser", "sp", { label: "POST /acs wrapped XML", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            su: both("sp", "users"),
          },
          flows: [rt("bi", "poison", { rate: 0.5, back: "secret" }), flow(["bs", "su"], "poison", { rate: 0.5, delay: 1.2 })],
        },
      },
      {
        short: "Which key?",
        chapter: "technique",
        title: "Where did Alice get Acme's public key?",
        body: [
          "Verification is only as good as the public key you check against. If Alice downloads <code>acme.pub</code> from the same mirror, the attacker swaps it too: they sign the backdoor with their own key, ship their own public key, and everything prints <code>Verified OK</code>. That's the swap from step 2 again, one level up.",
          "So the key has to arrive by a separate, earlier path. Debian ships its archive keys in the OS image under <code>/usr/share/keyrings/</code>. Sparkle, the macOS update framework, pins the key in the app's <code>Info.plist</code> as <code>SUPublicEDKey</code>. Windows Authenticode and Apple's Developer ID use <span class=\"term\">certificates</span>: a CA signs a statement binding \"Acme Corp\" to Acme's public key, and the OS already trusts the CA's root.",
        ],
        callout: { kind: "insight", text: "A signature doesn't remove the trust problem. It moves it onto one public key, which you have to get right once, through a channel the attacker doesn't control." },
        changes: ["- acme.pub fetched from the mirror", "+ Key pinned in the app or the OS", "+ Or chained to a CA the OS trusts"],
        metrics: { confirms: good("Acme's key, trusted path"), fakes: warn("a key, on the mirror only"), defense: good("pinned key / PKI") },
        scene: {
          entities: {
            alice: alice([green("pinned key: fake sig rejected", "keyhole")]),
            mirror: mirror([red("serves a fake acme.pub", "key")]),
            acme: acme([note("cert: CN=Acme Corp", "idCard")]),
            attacker: attacker([red("signs with own key", "pen")]),
            ca: ca([note("binds Acme Corp to its key", "stamp")]),
            card: card(low(-110), "Getting the public key right", ["! acme.pub from the mirror: attacker's key", "= in the OS image: apt keyrings", "= in the app: Sparkle SUPublicEDKey", "= via a CA: Authenticode, Developer ID", "# pin a backup key, or rotation bricks updates"], { icon: "keyhole" }),
          },
          links: {
            am: L.am({ label: "acme.pub + tar.gz + .sig", labelTone: "red" }),
            pm: L.pm({ label: "", style: "dashed" }),
            xm: L.xm({ label: "own key + own sig" }),
            ta: link("ca", "alice", { label: "root preinstalled", labelAt: 0.5 }),
          },
          flows: [flow("xm", "poison", { rate: 0.6 }), flow("am", "poison", { rate: 0.6, reverse: true, blocked: true, delay: 1 }), flow("ta", "secret", { rate: 0.3, delay: 0.5 })],
        },
      },
      {
        short: "Sigstore",
        chapter: "solution",
        title: "Keyless signing with Sigstore and a transparency log",
        body: [
          "Long-lived signing keys get leaked, lost, or left on someone's laptop. <span class=\"term\">Sigstore</span> skips them. In CI, <code>cosign</code> makes a throwaway key pair, proves the job's identity to the Fulcio CA with the workflow's OIDC token, and gets a certificate valid for ten minutes that binds the key to <code>github.com/acme/cli/.github/workflows/release.yml</code>. It signs, records the signature and certificate in Rekor, a public append-only log, and throws the private key away.",
          "Alice now verifies an identity, not a key file: \"signed by Acme's release workflow, as vouched for by GitHub's OIDC issuer\". The log does for signatures what Certificate Transparency does for TLS certificates. Acme can watch Rekor for any signature under its identity that it didn't make, so nothing gets signed quietly. npm's provenance attestations run on this same stack.",
        ],
        callout: { kind: "insight", text: "A signature proves who signed, not that the build was clean. SolarWinds' trojanized Orion update in 2020 carried a valid SolarWinds signature because the backdoor went in before signing. Harden the build too." },
        changes: ["+ Throwaway key, 10-minute cert from Fulcio", "+ Every signature lands in Rekor", "~ Verify the CI identity, not a key file"],
        metrics: { confirms: good("Acme's release workflow"), fakes: warn("only via Acme's CI, logged"), defense: good("Sigstore + Rekor") },
        scene: {
          entities: {
            alice: alice([green("identity + log entry ok", "shieldCheck")]),
            mirror: mirror([gray("just storage", "archive")]),
            acme: acme([note("cosign, keyless", "signature")], { label: ["release", "CI"], glyph: "workflow" }),
            fulcio: side(["Fulcio", "CA"], "stamp", "purple", [note("cert valid 10 minutes", "timer")]),
            rekor: block(12, -4, { s: 3.6, h: 34, label: ["Rekor", "log"], glyph: "scroll", color: "yellow", tags: [note("append-only, public", "list")] }),
            card: card(upLeft(-510, -200), "Verify an identity, not a key", ["$ cosign verify-blob acme-cli-2.4.1.tar.gz", "  --bundle acme-cli.sigstore.json", "  --certificate-identity", "    .../workflows/release.yml@refs/tags/v2.4.1", "  --certificate-oidc-issuer", "    https://token.actions.githubusercontent.com", "= Verified OK"], { icon: "scroll" }),
          },
          links: {
            am: L.am({ label: "tar.gz + sigstore bundle" }),
            pm: L.pm({ label: "release + bundle" }),
            pf: both("acme", "fulcio", { label: "OIDC token for a cert", labelAt: 0.55, labelSide: "below" }),
            pr: link("acme", "rekor", { label: "sig + cert logged", labelAt: 0.5, labelSide: "below" }),
            ar: link("rekor", "alice", { label: "inclusion proof", labelAt: 0.5, style: "dashed" }),
          },
          flows: [rt("pf", "secret", { rate: 0.5, back: "secret" }), flow("pr", "secret", { rate: 0.5, delay: 0.8 }), flow("pm", "res", { rate: 0.5, delay: 0.4 }), rt("am", "mine", { rate: 0.6, back: "res", delay: 1 }), flow("ar", "ping", { rate: 0.8, delay: 1.4 })],
        },
      },
      {
        short: "Key leak",
        chapter: "solution",
        title: "When the key leaks: revoke it, keep old signatures valid",
        body: [
          "Now suppose Acme's signing key is stolen. It happens to big vendors: in 2022 the Lapsus$ group leaked NVIDIA code signing certificates, and malware signed with them turned up within days. Acme's CA revokes the certificate, and verifiers that check CRLs or OCSP start refusing it. But a blunt revocation also kills every genuine release Acme ever signed with that key.",
          "<span class=\"term\">Trusted timestamps</span> fix that. When Acme signs, it sends the signature's hash to a timestamp authority (RFC 3161), which signs back \"this existed at 2026-02-10 09:14 UTC\". The CA revokes as of the compromise date, so verifiers keep accepting releases timestamped before it and reject everything after. The thief can get a timestamp too, but it will say March, after the cutoff.",
        ],
        callout: { kind: "insight", text: "With Sigstore there's no long-lived key to steal or revoke. Rekor's recorded time stands in for the timestamp, and what you protect instead is the CI identity." },
        changes: ["- Signing key stolen", "+ Cert revoked as of the leak date", "+ RFC 3161 timestamps keep older releases valid"],
        metrics: { confirms: good("signed before the leak"), fakes: warn("where revocation isn't checked"), defense: good("revoke + timestamps") },
        scene: {
          entities: {
            alice: alice([green("old ok, post-leak rejected", "shieldCheck")]),
            mirror: mirror(),
            acme: acme([red("signing key stolen", "key")], { heat: 0.4 }),
            attacker: attacker([red("signs evil.tar.gz", "pen")]),
            ca: ca([note("CRL: revoked 2026-03-14", "ban")]),
            tsa: side(["timestamp", "authority"], "clock", "yellow", [note("signs hash + time", "clock")]),
            card: card(low(-110), "Revocation with timestamps", ["= v2.4.1  signed 2026-02-10 + TSA: valid", "! key stolen 2026-03-14: cert revoked", "! evil    signed 2026-03-20: rejected", "$ signtool sign /fd SHA256 /tr <tsa> /td SHA256", "# RFC 3161 tokens outlive the certificate"], { icon: "clock" }),
          },
          links: {
            am: L.am({ label: "tar.gz + .sig + timestamp" }),
            pm: L.pm({ label: "", style: "dashed" }),
            xm: L.xm({ label: "valid sig, after revocation" }),
            pt: both("acme", "tsa", { label: "sig hash for a token", labelAt: 0.55, labelSide: "below" }),
            ta: link("ca", "alice", { label: "CRL / OCSP", labelAt: 0.5 }),
          },
          flows: [rt("pt", "secret", { rate: 0.4, back: "secret" }), flow("xm", "poison", { rate: 0.6, delay: 0.4 }), flow("am", "poison", { rate: 0.6, reverse: true, blocked: true, delay: 1.2 }), rt("ta", "ping", { rate: 0.8, back: "ping", delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: what a signature proves and how it breaks",
        body: [
          `<table class="compare">
            <thead><tr><th>Failure</th><th>Why it works</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>File and hash swapped</td><td>Hashes need no secret</td><td>Sign with an offline private key</td></tr>
              <tr><td>HMAC key in the client</td><td>Verify key can also sign</td><td>Public key verifies only</td></tr>
              <tr><td>ECDSA nonce reuse</td><td>Two sigs reveal the key</td><td>RFC 6979 or Ed25519</td></tr>
              <tr><td>Result ignored, alg from token</td><td>Nothing really checked</td><td>rc == 1; one algorithm per key</td></tr>
              <tr><td>Signature wrapping</td><td>Verified node isn't the used node</td><td>Use only verified nodes</td></tr>
              <tr><td>Fake public key</td><td>Key came with the download</td><td>Pinned key or CA chain</td></tr>
              <tr><td>Stolen signing key</td><td>Thief signs as you</td><td>Revoke + RFC 3161 timestamps, or Sigstore</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: a hash proves the bytes didn't change, a signature proves who made them, and anyone with the public key can check it. Contrast it with HMAC (shared key, no non-repudiation), recommend Ed25519, then spend your time on how it fails in practice: nonce reuse, unchecked results, algorithm confusion, signature wrapping, untrusted public keys, and leaked keys without timestamps.",
        ],
        callout: { kind: "next", text: "Next: <b>XXE</b>. Same XML stack that SAML runs on, different bug: a parser that resolves external entities will read <code>/etc/passwd</code> or fetch internal URLs for the attacker." },
        metrics: { confirms: good("Acme, these exact bytes"), fakes: good("nothing that verifies"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("verified: Acme, Ed25519", "shieldCheck")]),
            mirror: mirror([gray("untrusted storage", "archive")]),
            acme: acme([green("signs in CI, logged", "signature")]),
            attacker: attacker([gray("nothing verifies", "ban")], { dim: 0.4 }),
          },
          links: { am: L.am({ label: "tar.gz + .sig" }), pm: L.pm({ label: "release + .sig" }) },
          flows: genuine,
        },
      },
    ],
  });
})();
