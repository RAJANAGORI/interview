(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const dc = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Domain", "Controller"], glyph: "building", tags }, o));
  const id = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["Identity", "tier"], glyph: "users", color: "blue", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "Kerberos/NTLM") => both(who, "dc", { label, labelAt: 0.35, labelSide: "below" });

  SD.lesson({
    id: "active-directory-attacks",
    title: "Active Directory Attacks",
    summary: "Kerberos/NTLM abuse patterns named for interviews - Kerberoast, AS-REP, relay, DCSync, AD CS - with defensive countermeasures.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "pattern", label: "Abuse pattern", icon: "key" },
      { id: "need", label: "Prerequisite", icon: "unlock" },
      { id: "defense", label: "Control", icon: "shield" },
    ],
    legend: [["mine", "user"], ["poison", "abuse"], ["secret", "domain admin"], ["req", "auth"], ["ping", "audit"], ["empty", "blocked"]],
    goals: [
      { text: "Why AD is the prize", step: 0 },
      { text: "Named abuse patterns", step: 2 },
      { text: "Relay and DCSync", step: 5 },
      { text: "Tiering and detection", step: 7 },
    ],
    steps: [
      {
        short: "Prize",
        chapter: "setup",
        title: "Why AD is the enterprise prize",
        body: [
          "Active Directory is the identity and authorization backbone for most Windows estates. Compromise of privileged identities yields email, file servers, endpoints, and often cloud sync trusts.",
          "Interviews expect you to connect protocol mechanics (Kerberos, NTLM) to named abuse patterns and to controls - not a tool shopping list alone.",
        ],
        callout: { kind: "insight", text: "AD attacks are identity attacks. Containment means credentials and trusts." },
        metrics: { pattern: "identity", need: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("domain user", "user")]),
            dc: dc([amber("Kerberos + LDAP", "building")]),
            id: id([note("tier 0 assets", "key")], { dim: 0.4 }),
            card: card(low(), "Why AD", ["central authz", "ticket model", "legacy NTLM", "sync to cloud", "blast radius huge"], { icon: "building" }),
          },
          links: { ua: ask("alice", "TGT request") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Map",
        chapter: "technique",
        title: "Attack pattern map (name to prerequisite)",
        body: [
          "Learn the map: password spray (no lockout hygiene), AS-REP roasting (no preauth), Kerberoasting (SPN + weak service password), NTLM relay (no signing/EPA), constrained/unconstrained delegation abuse, DCSync (replicating rights), AD CS misconfig (ESC1-style stories).",
          "Each row: prerequisite -> abuse -> impact -> control. That table is the interview artifact.",
        ],
        callout: { kind: "tip", text: "Memorize prerequisites more than tool flags." },
        metrics: { pattern: warn("catalog"), need: warn("varies"), defense: warn("per row") },
        scene: {
          entities: {
            alice: alice([note("pattern table", "table")], { label: "candidate", labelIcon: "clipboard", screen: "blue" }),
            dc: dc([amber("protocol surface", "network")]),
            id: id([amber("priv paths", "route")], { color: "orange" }),
            card: card(low(), "Rows", ["AS-REP / Kerberoast", "NTLM relay", "delegation", "DCSync", "AD CS ESC*"], { icon: "table" }),
          },
          links: { ua: ask("alice", "study"), sh: both("dc", "id", { label: "paths" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Roast",
        chapter: "attack",
        title: "AS-REP and Kerberoasting (conceptual)",
        body: [
          "AS-REP roasting targets accounts without Kerberos pre-authentication: the AS-REP can be cracked offline if the password is weak. Kerberoasting requests service tickets for SPNs and cracks weak service account passwords offline.",
          "Defenses: require preauth, long random gMSA/service passwords, AES, detect unusual TGS requests, and reduce SPNs on user accounts.",
        ],
        callout: { kind: "warn", text: "Offline cracking means prevention is password + account hygiene, not network IDS alone." },
        changes: ["- No preauth / weak SPN pw", "- Offline crack", "+ gMSA + preauth + detect"],
        metrics: { pattern: bad("roast"), need: bad("weak crypto material"), defense: warn("gMSA + monitor") },
        scene: {
          entities: {
            client: mallory([red("request tickets", "ticket")]),
            dc: dc([amber("AS-REP / TGS", "key")], { heat: 0.25 }),
            id: id([red("service hash cracked", "unlock")], { heat: 0.25, color: "red", label: ["svc", "acct"] }),
            card: card(low(), "Roast", ["no preauth => AS-REP", "SPN + weak pw => TGS", "offline crack", "gMSA + alerts"], { icon: "ticket" }),
          },
          links: {
            ua: ask("client", "AS/TGS"),
            sh: both("dc", "id", { label: "weak svc", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.5, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "Relay",
        chapter: "attack",
        title: "NTLM relay and coercion classes",
        body: [
          "NTLM authentication can be relayed to another service if signing/EPA/channel binding are absent and the target accepts NTLM. Coercion tricks a host into authenticating to an attacker listener.",
          "Controls: SMB/LDAP signing, EPA for HTTP, disable NTLM where possible, protect printers/coercion paths, and monitor sudden machine account authentications.",
        ],
        callout: { kind: "insight", text: "Relay is a protocol integrity failure, not \"weak password\"." },
        metrics: { pattern: bad("NTLM relay"), need: bad("no signing/EPA"), defense: good("signing + EPA") },
        scene: {
          entities: {
            client: mallory([red("coerce + relay", "route")]),
            dc: dc([amber("NTLM accept", "plug")], { heat: 0.2 }),
            id: id([amber("auth as victim host", "idCard")], { color: "orange" }),
            card: card(low(), "Relay", ["capture/coerce auth", "forward to target", "needs no signing", "= signing/EPA/disable NTLM"], { icon: "route" }),
          },
          links: { ua: ask("client", "NTLM"), sh: both("dc", "id", { label: "relayed auth", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "secret", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Deleg",
        chapter: "technique",
        title: "Delegation pitfalls",
        body: [
          "Unconstrained delegation historically let a server receive forwardable tickets that could be abused; constrained and resource-based constrained delegation (RBCD) need careful ACL review.",
          "Interview: explain the trust - a service allowed to impersonate users to other services - and how mis-ACL'd computer objects enable takeover stories.",
        ],
        callout: { kind: "tip", text: "Hunt unconstrained delegation and RBCD ACL changes." },
        metrics: { pattern: warn("delegation"), need: warn("misconfig"), defense: warn("audit ACLs") },
        scene: {
          entities: {
            alice: alice([note("ACL review", "search")], { label: "AD admin", labelIcon: "shield", screen: "blue" }),
            dc: dc([amber("delegation flags", "flag")]),
            id: id([amber("impersonate path", "users")], { color: "orange" }),
            card: card(low(), "Delegation", ["unconstrained legacy", "constrained", "RBCD ACLs", "monitor changes"], { icon: "flag" }),
          },
          links: { ua: ask("alice", "LDAP"), sh: both("dc", "id", { label: "trust" }) },
          flows: [flow("ua", "mine", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "DCSync",
        chapter: "attack",
        title: "DCSync and domain dominance",
        body: [
          "DCSync abuses directory replication rights (e.g. replicating directory changes) to pull password data as if the principal were a DC. Usually late-stage after privilege accumulation.",
          "Detect replication from non-DC hosts, protect tier 0 groups, and treat DCSync alerts as domain compromise until proven otherwise.",
        ],
        callout: { kind: "warn", text: "DCSync success => assume KRBTGT and beyond need IR care." },
        changes: ["- Replication rights on user", "- Pull secrets", "+ Tier 0 + detect"],
        metrics: { pattern: bad("DCSync"), need: bad("repl rights"), defense: warn("tier0 + audit") },
        scene: {
          entities: {
            client: mallory([red("DS-Replication rights", "database")]),
            dc: dc([red("replicates to attacker", "alert")], { heat: 0.4 }),
            id: id([red("hashes out", "key")], { heat: 0.35, color: "red", label: ["domain", "dominance"] }),
            card: card(low(), "DCSync", ["needs repl rights", "non-DC source = bad", "tier 0 hygiene", "IR: KRBTGT care"], { icon: "database" }),
          },
          links: {
            ua: ask("client", "DRSUAPI"),
            sh: both("dc", "id", { label: "secrets", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.5 }), rt("sh", "poison", { rate: 0.55, back: "secret", delay: 0.6 })],
        },
      },
      {
        short: "ADCS",
        chapter: "technique",
        title: "AD CS misconfigurations (interview level)",
        body: [
          "Active Directory Certificate Services can mint powerful certificates if templates allow low-priv enrollment with client auth and overly broad EKUs/enrollment rights (popular ESC* discussions).",
          "Controls: audit templates, restrict enrollment, manager approval where needed, and monitor certificate enrollments for unusual principals.",
        ],
        callout: { kind: "insight", text: "Certificates are identity. Treat CA templates like domain admin ACLs." },
        metrics: { pattern: warn("AD CS"), need: warn("bad template"), defense: warn("template audit") },
        scene: {
          entities: {
            client: mallory([amber("enroll abuse", "stamp")]),
            dc: dc([amber("CA / templates", "fileKey")]),
            id: id([amber("client auth cert", "idCard")], { color: "orange" }),
            card: card(low(), "AD CS", ["template rights", "EKU / SAN control", "enrollment who", "monitor + harden"], { icon: "stamp" }),
          },
          links: { ua: ask("client", "enroll"), sh: both("dc", "id", { label: "cert auth" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Defend",
        chapter: "solution",
        title: "Tiering, PAM, and protocol hardening",
        body: [
          "Tiered administration separates tier 0 (DCs/identity) from workstation admin. Privileged Access Workstations, just-in-time admin, LAPS/gMSA, signing/EPA, and MFA for privileged ops raise cost.",
          "Legacy: reduce NTLM, remove unconstrained delegation, patch DCs aggressively.",
        ],
        callout: { kind: "tip", text: "Architecture (tiering) beats one more detection rule alone." },
        changes: ["+ Tier 0 model", "+ Signing/EPA", "+ gMSA / LAPS"],
        metrics: { pattern: good("hardened"), need: good("fewer prereqs"), defense: good("tier+protocol") },
        scene: {
          entities: {
            alice: alice([note("PAW + JIT", "lock")], { label: "IAM", labelIcon: "shield", screen: "blue" }),
            dc: dc([green("signing on", "shieldCheck")]),
            id: id([green("tier 0 clean", "users")], { color: "blue" }),
            card: card(low(), "Controls", ["tiered admin", "PAW / JIT", "SMB/LDAP signing", "gMSA / LAPS", "less NTLM"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("alice", "admin"), sh: both("dc", "id", { label: "tier 0" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detection and logging essentials",
        body: [
          "Critical logs: Kerberos anomalies, directory service access/replication, account lockouts/sprays, certificate enrollment, and GPO/ACL changes on sensitive objects.",
          "WEF/Sentinel/Splunk pipelines should prioritize tier 0 object changes. Alert on DCSync-like replication and sudden SPN/ACL edits.",
        ],
        callout: { kind: "insight", text: "If you cannot see ACL changes on domain admins, you are flying blind." },
        metrics: { pattern: warn("under watch"), need: warn("logged"), defense: good("identity SIEM") },
        scene: {
          entities: {
            alice: alice([note("SIEM use cases", "bell")], { label: "SOC", labelIcon: "radar", screen: "blue" }),
            dc: dc([amber("4769 / 4662 / ...", "scroll")]),
            id: id([green("tier0 change alert", "siren")], { color: "blue" }),
            card: card(low(), "Logs", ["TGS anomalies", "replication", "ACL/GPO changes", "cert enroll", "spray patterns"], { icon: "scroll" }),
          },
          links: { ua: ask("alice", "query"), sh: both("dc", "id", { label: "audit" }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("sh", "ping", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: prerequisites, abuse, control",
        body: [
          `<table class="compare">
            <thead><tr><th>Pattern</th><th>First control</th></tr></thead>
            <tbody>
              <tr><td>Kerberoast / AS-REP</td><td>gMSA + preauth</td></tr>
              <tr><td>NTLM relay</td><td>Signing / EPA</td></tr>
              <tr><td>DCSync</td><td>Tier 0 + repl audit</td></tr>
              <tr><td>AD CS</td><td>Template hardening</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: pick two patterns, state prerequisite, impact, detection, and architectural control.",
        ],
        callout: { kind: "next", text: "Connect to <b>ATT&CK</b> credential access / lateral movement tactics." },
        metrics: { pattern: good("named"), need: good("clear"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([note("AD review done", "checkCircle")], { label: "AppSec/IAM", labelIcon: "shield", screen: "blue" }),
            dc: dc([green("hardened", "shieldCheck")]),
            id: id([green("tiered", "lock")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "login") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
