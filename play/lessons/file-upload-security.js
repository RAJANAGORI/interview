(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Upload", "API"], glyph: "upload", tags }, o));
  const disk = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["object", "store"], glyph: "archive", color: "green", tags }, o));
  const webroot = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["/var/www", "uploads"], glyph: "folder", color: "red", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "POST /upload") => both(who, "app", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "file-upload-security",
    title: "File Upload Security",
    summary: "Unrestricted uploads become webshells, XSS and path traversal. Allowlist, magic bytes, re-encode, store offline, serve safely.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "accepts", label: "Server accepts", icon: "upload" },
      { id: "runs", label: "Attacker gets", icon: "terminal" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "malicious file"], ["secret", "shell / XSS"], ["req", "upload"], ["res", "OK"], ["empty", "rejected"]],
    goals: [
      { text: "Webshell via upload to webroot", step: 1 },
      { text: "Content-Type lies; check magic bytes", step: 2 },
      { text: "SVG XSS and polyglots", step: 4 },
      { text: "Store outside webroot with random names", step: 6 },
    ],
    steps: [
      {
        short: "Avatar",
        chapter: "setup",
        title: "A feature that stores whatever you send",
        body: [
          "Alice uploads an avatar. The API takes the multipart file, keeps the original name, and writes it under <code>/var/www/html/uploads/</code>. The profile page links to <code>/uploads/alice.png</code>.",
          "That path is web-accessible and executable if the server treats some extensions as code. The feature looks like an image form. The storage layout decides whether it becomes RCE.",
        ],
        callout: { kind: "insight", text: "Upload bugs are usually storage and serving policy bugs, not \"multipart is unsafe\"." },
        metrics: { accepts: warn("any file"), runs: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("avatar.png", "image")]),
            app: app([amber("saves original filename", "upload")]),
            web: webroot([note("web-accessible", "folder")]),
            card: card(low(), "Naive handler", ["file = request.files[\"avatar\"]", "path = \"uploads/\" + file.filename", "file.save(path)", "# under the web root"], { icon: "upload" }),
          },
          links: { ua: ask("alice"), aw: both("app", "web", { label: "write alice.png", labelAt: 0.55 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("aw", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
      {
        short: "Webshell",
        chapter: "attack",
        title: "Upload a shell, then request it",
        body: [
          "The attacker uploads <code>shell.php</code> (or <code>.jsp</code>, <code>.aspx</code>). If the uploads directory executes server-side code, <code>GET /uploads/shell.php?cmd=id</code> is remote code execution as the web user.",
          "Extension filters that only block <code>.php</code> lose to <code>.php.png</code>, <code>.phtml</code>, trailing dots, and null-byte classics on old stacks. Assume the attacker knows your framework.",
        ],
        callout: { kind: "warn", text: "If uploaded bytes can ever be interpreted as code on that host, treat unrestricted upload as RCE." },
        changes: ["- shell.php stored in webroot", "- GET executes it", "- RCE as www-data"],
        metrics: { accepts: bad("shell.php"), runs: bad("RCE"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("shell.php", "fileCode")]),
            app: app([red("saved under /uploads", "alert")]),
            web: webroot([red("GET executes PHP", "terminal")], { heat: 0.4 }),
            card: card(low(), "Webshell", ["POST /upload shell.php", "GET /uploads/shell.php?cmd=id", "! uploads dir executes code", "= never exec user files"], { icon: "terminal" }),
          },
          links: {
            ua: ask("client", "POST /upload"),
            aw: both("app", "web", { label: "write shell.php", labelTone: "red", labelAt: 0.6, labelSide: "below" }),
            hit: link("client", "web", { label: "GET shell.php?cmd=id", labelTone: "red", style: "dashed", labelAt: 0.7, labelSide: "below" }),
          },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("aw", "poison", { rate: 0.6, delay: 0.5 }), flow("hit", "secret", { rate: 0.5, delay: 1.1 })],
        },
      },
      {
        short: "Magic",
        chapter: "problem",
        title: "Content-Type is attacker-controlled",
        body: [
          "Browsers send <code>Content-Type: image/png</code> from the client. Attackers set it to anything. Checking only that header, or only the extension, is not validation.",
          "Read magic bytes (<code>file</code>, libmagic, language bindings). Then prefer re-encoding images with a safe library so polyglot payloads die in transcoding.",
        ],
        callout: { kind: "tip", text: "Allowlist extensions after you know the real type, not before." },
        changes: ["- Trust Content-Type / extension", "+ Magic-byte sniff", "+ Re-encode images"],
        metrics: { accepts: bad("lies about type"), runs: warn("polyglot risk"), defense: bad("header check") },
        scene: {
          entities: {
            client: mallory([red("Content-Type: image/png", "image")]),
            app: app([red("trusted the header", "alert")]),
            web: webroot([amber("bytes are still PHP", "fileCode")]),
            card: card(low(), "Lie about the type", ["filename: avatar.png", "Content-Type: image/png", "body: <?php system($_GET[\"c\"]); ?>", "! header != contents", "= magic bytes + re-encode"], { icon: "scan" }),
          },
          links: { ua: ask("client", "POST avatar.png"), aw: both("app", "web") },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("aw", "poison", { rate: 0.6, delay: 0.5 })],
        },
      },
      {
        short: "Traversal",
        chapter: "attack",
        title: "Filename path traversal and zip-slip",
        body: [
          "If you keep <code>file.filename</code>, try <code>../../etc/cron.d/evil</code> or archive entries with <code>../</code> paths (zip-slip). Writers that join names without canonicalizing can escape the upload directory.",
          "Fix: ignore client names. Generate a random object key. For archives, canonicalize each entry and ensure it stays under the extract root.",
        ],
        callout: { kind: "warn", text: "Zip-slip is the same bug inside a loop over archive members." },
        changes: ["- Client filename used on disk", "- ../ escapes the folder", "+ Random keys + canonical prefix check"],
        metrics: { accepts: bad("traversal name"), runs: bad("write outside dir"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("filename=../../cron.d/x", "folder")]),
            app: app([red("joins path blindly", "alert")]),
            web: webroot([red("escaped uploads/", "ban")], { label: ["escaped", "path"], glyph: "folder" }),
            card: card(low(), "Path traversal", ["uploads/ + ../../etc/cron.d/x", "! lands outside the folder", "zip-slip: same inside .zip", "= random key; canonicalize"], { icon: "folder" }),
          },
          links: { ua: ask("client"), aw: both("app", "web", { label: "write outside", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("aw", "poison", { rate: 0.7, delay: 0.5 })],
        },
      },
      {
        short: "SVG XSS",
        chapter: "attack",
        title: "SVG and HTML uploads as XSS",
        body: [
          "SVG is XML and can carry <code>&lt;script&gt;</code>. Served from your origin as <code>image/svg+xml</code>, it executes as your site. HTML uploads do the same.",
          "Rasterize SVG to PNG on upload, or serve user content from a separate cookie-less domain with strict CSP and <code>Content-Disposition: attachment</code> where possible.",
        ],
        callout: { kind: "insight", text: "Same-origin avatars that are SVG are an XSS dropper." },
        changes: ["- SVG with script stored", "- Served on app origin", "+ Rasterize or isolate origin"],
        metrics: { accepts: bad("SVG+script"), runs: bad("XSS"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("avatar.svg with <script>", "file")]),
            app: app([red("served as image/svg+xml", "alert")]),
            alice: device(14, 6, { label: "victim", tags: [red("script runs", "code")], screen: "red" }),
            card: card(low(), "SVG XSS", ["<svg onload=...>", "! executed on app origin", "= rasterize to PNG", "= or CDN domain + CSP"], { icon: "image" }),
          },
          links: {
            ua: ask("client", "POST avatar.svg"),
            view: link("alice", "app", { label: "GET /uploads/avatar.svg", labelTone: "red", labelAt: 0.45 }),
          },
          flows: [flow("ua", "poison", { rate: 0.6 }), rt("view", "poison", { rate: 0.6, back: "secret", delay: 0.8 })],
        },
      },
      {
        short: "Allowlist",
        chapter: "solution",
        title: "Allowlist types, then verify bytes",
        body: [
          "Decide which types you need (jpeg, png, pdf). Reject everything else. After sniffing magic bytes, map to an extension you choose. Strip metadata if it is not required.",
          "For images, decode and re-encode. For PDFs, prefer a sanitizing pipeline or sandbox. Do not run ImageMagick with default policy on untrusted files.",
        ],
        callout: { kind: "tip", text: "Deny-by-default file types beat ever-growing blocklists." },
        changes: ["+ Allowlist MIME/extension", "+ Magic-byte match", "+ Re-encode images"],
        metrics: { accepts: good("png/jpeg only"), runs: good("no exec"), defense: good("allowlist") },
        scene: {
          entities: {
            client: mallory([red("shell.php", "fileCode")]),
            app: app([green("allowlist + magic check", "shieldCheck")]),
            disk: disk([green("rejected before write", "ban")]),
            card: card(low(), "Validation order", ["1. size cap", "2. magic bytes", "3. allowlist map", "4. re-encode", "5. store random key", "! never trust filename"], { icon: "listChecks" }),
          },
          links: { ua: ask("client"), ad: both("app", "disk", { fail: 0.4 }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("ad", "poison", { rate: 0.6, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "Store",
        chapter: "solution",
        title: "Object storage outside the web root",
        body: [
          "Write to S3/GCS/Azure Blob or a disk path the app server will never execute. Use random object keys. Serve via signed URLs or a separate media domain with <code>nosniff</code> and a tight CSP.",
          "Processors (thumbnails, antivirus, ffmpeg) run in sandboxes with no URL-fetch features you do not need, so an upload cannot SSRF through the transcoder.",
        ],
        callout: { kind: "insight", text: "Architecture fix: user bytes never land on an executable path." },
        changes: ["+ Object store + random keys", "+ Separate serve origin", "+ Sandboxed processors"],
        metrics: { accepts: good("safe types"), runs: good("nothing executes"), defense: good("offline store") },
        scene: {
          entities: {
            alice: alice([note("photo.jpg", "image")]),
            app: app([green("random key -> S3", "archive")]),
            disk: disk([green("no exec, signed GET", "lock")]),
            web: webroot([], { dim: 0.3 }),
            card: card(low(), "Safe storage", ["key = uuid().jpg", "bucket: private", "serve: signed URL / media CDN", "nosniff + CSP", "# processors sandboxed"], { icon: "archive" }),
          },
          links: { ua: ask("alice"), ad: both("app", "disk", { label: "PutObject", labelAt: 0.55 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
      {
        short: "Scan",
        chapter: "technique",
        title: "Malware scanning and size limits",
        body: [
          "Cap size before buffering into memory. Scan with AV asynchronously when the threat model needs it, but do not treat AV as a type check. Quarantine until clean if you accept risky formats.",
          "Rate-limit uploads per user to slow abuse. Log original filename and final key for forensics without using the original name on disk.",
        ],
        callout: { kind: "tip", text: "AV is complementary. Allowlist + offline storage carry most of the security." },
        metrics: { accepts: good("capped + scanned"), runs: good("quarantine path"), defense: good("limits + AV") },
        scene: {
          entities: {
            alice: alice([note("report.pdf", "file")]),
            app: app([green("size cap + queue scan", "filter")]),
            disk: disk([amber("quarantine -> clean", "timer")]),
            card: card(low(), "Operational controls", ["max bytes before read", "async AV / sandbox", "per-user rate limit", "log: original name + key"], { icon: "filter" }),
          },
          links: { ua: ask("alice", "POST /upload"), ad: both("app", "disk") },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.6, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: allowlist, verify, isolate, serve carefully",
        body: [
          `<table class="compare">
            <thead><tr><th>Control</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>Allowlist + magic</td><td>Client type lies</td></tr>
              <tr><td>Re-encode</td><td>Kills polyglots</td></tr>
              <tr><td>Random key, no webroot</td><td>No webshell path</td></tr>
              <tr><td>Separate origin</td><td>Contains XSS</td></tr>
              <tr><td>Sandbox processors</td><td>No SSRF/RCE via ffmpeg</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: unrestricted upload to an executable path is RCE. Fix with allowlist, magic bytes, re-encode, object storage, and careful serving.",
        ],
        callout: { kind: "next", text: "Related: <b>XSS</b> (SVG), <b>XXE</b> (Office/XML docs), <b>SSRF</b> (URL-fetching processors)." },
        metrics: { accepts: good("allowlisted"), runs: good("none"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([note("photo.jpg", "image")]),
            app: app([green("validated + re-encoded", "shieldCheck")]),
            disk: disk([green("object store", "lock")]),
          },
          links: { ua: ask("alice"), ad: both("app", "disk") },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
    ],
  });
})();
