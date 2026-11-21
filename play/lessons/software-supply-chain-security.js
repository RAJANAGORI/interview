(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const git = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["source"], glyph: "git", tags }, o));
  const pkg = (tags = [], o = {}) => block(0, 2, Object.assign({ label: ["package", "ecosystem"], glyph: "package", color: "blue", tags }, o));
  const build = (tags = [], o = {}) => block(12, 2, Object.assign({ s: 3.6, h: 34, label: ["build"], glyph: "cog", color: "gray", tags, pills: "below" }, o));
  const artifact = (tags = [], o = {}) => block(0, 14, Object.assign({ label: ["signed", "artifact"], glyph: "stamp", color: "teal", tags }, o));
  const runtime = (tags = [], o = {}) => block(12, 12, Object.assign({ s: 3.6, h: 34, label: ["runtime"], glyph: "server", color: "purple", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 18], "supply chain", tone);
  const upLeft = (dx = -440, dy = -200) => ({ x: 0, y: -8, dx, dy });

  SD.lesson({
    id: "software-supply-chain-security",
    title: "Software Supply Chain Security",
    summary: "From typosquats to build provenance: how trust moves through source, dependencies, builds, and artifacts - and the controls (SBOM, signing, pinning) that keep malware out of production.",
    minutes: 16,
    level: "advanced",
    metrics: [
      { id: "trust", label: "Trust step", icon: "link" },
      { id: "threat", label: "Chain abuse", icon: "bug" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "legit path"], ["poison", "attacker"], ["secret", "signing key"], ["req", "fetch / build"], ["empty", "verify fail"]],
    goals: [
      { text: "Map the chain end to end", step: 0 },
      { text: "Dependency confusion and typosquats", step: 1 },
      { text: "Compromised maintainers and builds", step: 3 },
      { text: "SBOM, pinning, and signatures", step: 5 },
      { text: "SLSA-style provenance", step: 7 },
    ],
    steps: [
      {
        short: "Map",
        chapter: "setup",
        title: "Trust travels farther than your repo",
        body: [
          "Your product is not only your code. It is base images, OS packages, language libraries, CI tasks, build tools, and the registries that host them. An attacker who wins any earlier hop can ride your signature of trust into production.",
          "Draw the chain: developer laptop -> source control -> dependencies -> build system -> artifact registry -> runtime. Security controls belong on the edges between those boxes.",
        ],
        callout: { kind: "insight", text: "Supply chain security is edge control on a trust graph, not a single scanner product." },
        metrics: { trust: warn("many hops"), threat: "-", defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("commits code", "user")]),
            git: git([note("source of truth?", "git")]),
            pkg: pkg([note("deps pulled", "download")]),
            build: build([note("CI compiles", "cog")]),
            artifact: artifact([note("image / binary", "package")], { dim: 0.7 }),
            card: card(upLeft(), "The chain", ["laptop -> git", "git -> package registries", "CI builds artifact", "registry -> runtime", "! weakest hop wins"], { icon: "route" }),
          },
          links: {
            cg: both("client", "git"),
            gp: both("git", "pkg"),
            pb: both("pkg", "build"),
            ba: both("build", "artifact", { label: "publish" }),
          },
          flows: [flow(["cg", "gp"], "mine", { rate: 0.5 }), flow(["pb", "ba"], "req", { rate: 0.45, delay: 0.55 })],
        },
      },
      {
        short: "Typosquat",
        chapter: "attack",
        title: "Typosquats and dependency confusion",
        body: [
          "Attackers publish <code>lodahs</code> next to <code>lodash</code>, or a private package name on a public registry so installs prefer the public evil copy (dependency confusion). Install scripts and import-time code run with your build identity.",
          "Internal package namespaces, registry allow lists, and installing only from a verified proxy stop the resolver from wandering. Pin versions and verify integrity hashes from lockfiles.",
        ],
        callout: { kind: "warn", text: "Dependency confusion is a resolver trust bug. Fix the resolver policy, not just awareness training." },
        changes: ["- Public package shadows internal name", "- Install runs malware", "+ Namespace + allowlist registry"],
        metrics: { trust: bad("resolver lied"), threat: bad("malware installed"), defense: bad("open registry") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: alice([note("npm i @acme/utils", "terminal")], { label: "dev" }),
            pkg: pkg([red("public @acme/utils trojan", "skull")], { heat: 0.45 }),
            build: build([red("postinstall exfil", "upload")]),
            git: git([], { dim: 0.5 }),
            card: card(upLeft(), "Resolver tricks", ["typosquat lodahs", "confusion: public beats private", "postinstall scripts", "runs as CI / developer", "= scoped registry + lock + hash"], { icon: "package" }),
          },
          links: {
            cp: both("client", "pkg", { label: "resolve", labelTone: "red" }),
            pb: both("pkg", "build", { label: "install", labelTone: "red" }),
          },
          flows: [flow(["cp", "pb"], "poison", { rate: 0.65 })],
        },
      },
      {
        short: "Maintainer",
        chapter: "attack",
        title: "Compromised maintainer, clean version bump",
        body: [
          "When a popular package owner's account is phished, a \"routine\" minor release can contain a backdoor. Your CI dutifully bumps the lockfile after tests that never exercise the malicious path. This is how event-stream and similar incidents felt from the inside: boring until it was not.",
          "Protect against this with minimum-change review on dependency updates, automated behavioral signals, pinning plus staged rollout, and a culture that does not auto-merge every Dependabot PR to prod the same day.",
        ],
        callout: { kind: "insight", text: "A green CI on a dependency bump is necessary, not sufficient." },
        changes: ["- Maintainer account taken", "- Malicious release published", "~ Auto-merge ships it"],
        metrics: { trust: bad("publisher owned"), threat: bad("backdoor in minor"), defense: warn("tests missed it") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("phish maintainer", "skull")]),
            pkg: pkg([red("v1.2.4 backdoored", "bug")], { heat: 0.4 }),
            git: git([amber("Dependabot PR merged", "git")]),
            build: build([amber("tests green", "check")]),
            card: card(upLeft(-450), "Trusted update", ["maintainer MFA missing", "new version on registry", "bot PR bumps lockfile", "CI green, path not hit", "= staged rollout + review"], { icon: "userX" }),
          },
          links: {
            cp: both("client", "pkg", { labelTone: "red" }),
            pg: both("pkg", "git", { label: "bump PR" }),
            gb: both("git", "build"),
          },
          flows: [flow("cp", "poison", { rate: 0.55 }), flow(["pg", "gb"], "poison", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Build",
        chapter: "attack",
        title: "Poison the build, keep the source \"clean\"",
        body: [
          "If the build system is compromised, source can look fine in git while the published artifact contains extra code. Attackers inject at compile, steal signing keys, or replace artifacts in the registry after CI uploads.",
          "That is why provenance matters: prove which build system produced this digest from which commit, in a non-forgeable way. Verifying only a hash you got from the same attacker does nothing.",
        ],
        callout: { kind: "warn", text: "Checksums from the attacker's mirror are not integrity. Signatures from your keys (or transparency logs) are." },
        changes: ["- CI or registry mutated artifact", "- Source still looks clean", "+ Need provenance + signing"],
        metrics: { trust: bad("build hop owned"), threat: bad("evil artifact"), defense: bad("hash theater") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("inject in CI", "pen")]),
            git: git([green("source clean", "check")]),
            build: build([red("extra object file", "bug")], { heat: 0.45 }),
            artifact: artifact([red("trojan digest", "alert")], { color: "red", heat: 0.4 }),
            card: card(upLeft(), "Clean git, dirty bits", ["source review passes", "CI inserts payload", "or registry swap post-push", "tag latest moves", "= sign + provenance attest"], { icon: "cog" }),
          },
          links: {
            cg: both("client", "git", { style: "dashed" }),
            gb: both("git", "build"),
            ba: both("build", "artifact", { label: "publish", labelTone: "red" }),
          },
          flows: [flow("gb", "mine", { rate: 0.45 }), flow("ba", "poison", { rate: 0.6, delay: 0.45 })],
        },
      },
      {
        short: "Pin",
        chapter: "solution",
        title: "Pin, lock, and verify integrity",
        body: [
          "Lockfiles (<code>package-lock.json</code>, <code>go.sum</code>, <code>Pipfile.lock</code>) record versions and hashes. Commit them. Enable verification so installs fail on mismatch. Prefer digests for containers (<code>@sha256:</code>) over mutable tags.",
          "Mirror critical dependencies inward. When the public registry is down or hostile, your build still uses known bits. Combine with vulnerability scanning on the locked set, not on whatever \"latest\" resolves to today.",
        ],
        callout: { kind: "tip", text: "Floating ranges without a lockfile are an open invitation to tomorrow's malicious publish." },
        changes: ["+ Lockfiles committed", "+ Hash verification on", "+ Internal mirror / proxy"],
        metrics: { trust: good("pinned bits"), threat: good("swap detected"), defense: good("lock + hash") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("ci npm ci", "terminal")]),
            pkg: pkg([green("lock + integrity", "listChecks")]),
            build: build([green("hash match", "check")]),
            artifact: artifact([green("digest pinned", "hash")]),
            card: card(upLeft(-430), "Pin the world", ["commit lockfiles", "npm ci / go mod verify", "image@sha256:...", "internal pull-through cache", "SCA on the locked set"], { icon: "listChecks" }),
          },
          links: {
            cp: both("client", "pkg"),
            pb: both("pkg", "build"),
            ba: both("build", "artifact"),
          },
          flows: [flow(["cp", "pb"], "mine", { rate: 0.55 }), rt("ba", "req", { rate: 0.45, delay: 0.55 })],
        },
      },
      {
        short: "SBOM",
        chapter: "technique",
        title: "SBOM: know what you shipped",
        body: [
          "A Software Bill of Materials lists the components inside an artifact. Generate SBOMs at build time (SPDX or CycloneDX), store them with the digest, and use them when the next CVE drops to answer \"are we affected?\" in hours, not weeks.",
          "SBOMs do not stop malware by themselves. They make response and policy (\"no GPL here,\" \"no log4j 2.14\") enforceable. Pair with continuous vuln correlation.",
        ],
        callout: { kind: "insight", text: "Interviewers like: SBOM for inventory, signatures for integrity, provenance for trust of origin." },
        changes: ["+ SBOM per digest", "+ CVE correlation", "~ Policy on components"],
        metrics: { trust: good("inventory"), threat: warn("known CVE tracked"), defense: good("SBOM + scan") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("CVE alert fires", "bell")]),
            artifact: artifact([green("SBOM attached", "clipboard")]),
            pkg: pkg([amber("lib X 1.2 listed", "search")]),
            runtime: runtime([note("where digest runs", "map")]),
            card: card(upLeft(), "SBOM loop", ["build emits SPDX/CycloneDX", "store next to digest", "CVE -> query SBOM", "patch + redeploy", "! SBOM != signature"], { icon: "clipboard" }),
          },
          links: {
            ca: both("client", "artifact", { label: "query" }),
            ap: both("artifact", "pkg", { label: "contains?" }),
            ar: both("artifact", "runtime", { label: "deployed where" }),
          },
          flows: [flow("ca", "mine", { rate: 0.5 }), flow("ap", "req", { rate: 0.45, delay: 0.4 }), flow("ar", "req", { rate: 0.4, delay: 0.8 })],
        },
      },
      {
        short: "Sign",
        chapter: "solution",
        title: "Sign artifacts and verify before run",
        body: [
          "Sign container images and binaries with Sigstore/cosign, Notary, or your PKI. Admission controllers and deploy jobs verify the signature against your identity (key or Fulcio identity) before anything runs.",
          "Protect signing keys like production. Keyless/OIDC signing ties the signature to the CI identity that built the digest, which closes \"stolen local key signs malware\" if CI is the only trusted signer.",
        ],
        callout: { kind: "tip", text: "Verify at deploy and at runtime admission. Signing without verify is a sticker." },
        changes: ["+ Sign every release digest", "+ Verify on admit/deploy", "+ Prefer CI-bound keyless"],
        metrics: { trust: good("signed"), threat: good("unsigned rejected"), defense: good("cosign/Notary") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: attacker([red("push unsigned image", "upload")]),
            artifact: artifact([green("cosign verify fails", "shieldX")]),
            runtime: runtime([green("admission deny", "ban")]),
            build: build([green("OIDC keyless sign", "stamp")], { dim: 0.7 }),
            card: card(upLeft(), "Sign + verify", ["CI signs digest", "policy: only team identity", "kubectl/deploy verifies", "unsigned -> deny", "# Sigstore / Notary / PGP"], { icon: "stamp" }),
          },
          links: {
            ca: both("client", "artifact", { labelTone: "red" }),
            ar: both("artifact", "runtime", { fail: 0.5, label: "denied" }),
          },
          flows: [flow("ca", "poison", { rate: 0.55 }), flow("ar", "poison", { rate: 0.5, delay: 0.45, blocked: true })],
        },
      },
      {
        short: "Provenance",
        chapter: "solution",
        title: "Provenance: prove how it was built",
        body: [
          "SLSA-style provenance attestations record the commit SHA, workflow, builder identity, and materials. Admission can require \"built by our GitHub org workflow on main,\" not merely \"signed by some key we once trusted.\"",
          "Level up gradually: reproducible builds where feasible, hardened builders, and separation so the environment that signs cannot be trivially rewritten by the same PR that provides the source.",
        ],
        callout: { kind: "insight", text: "Signature answers who blessed it. Provenance answers how it was made." },
        changes: ["+ Attestations on digests", "+ Policy on builder identity", "+ Harden the builder"],
        metrics: { trust: good("proven build"), threat: good("foreign builder denied"), defense: good("SLSA-ish") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("policy engine", "scale")]),
            build: build([green("builder id = org CI", "fingerprint")]),
            artifact: artifact([green("provenance.json", "file")]),
            runtime: runtime([green("accept only main+CI", "shieldCheck")]),
            card: card(upLeft(-450), "Provenance checks", ["commit SHA matches git", "built by our workflow", "materials = lockfile digests", "deny laptop-signed prod", "= SLSA ideas, practical policy"], { icon: "fingerprint" }),
          },
          links: {
            cb: both("client", "build", { label: "inspect attest" }),
            ba: both("build", "artifact"),
            ar: both("artifact", "runtime", { label: "admit" }),
          },
          flows: [flow(["cb", "ba"], "mine", { rate: 0.5 }), rt("ar", "empty", { rate: 0.45, delay: 0.55 })],
        },
      },
      {
        short: "Runtime",
        chapter: "technique",
        title: "Close the loop at runtime",
        body: [
          "Only pull from registries you control. Enforce signature and provenance on admit. Continuously re-scan running digests as new CVEs appear. Quarantine and redeploy when a component turns bad.",
          "Outbound controls and least privilege still matter: a missed malicious dep with a tiny role does less damage than one with AdminAccess. Supply chain and cloud IAM meet at blast radius.",
        ],
        callout: { kind: "tip", text: "Defense in depth: prevent bad ingress, limit power if something slips." },
        changes: ["+ Private registry only", "+ Continuous re-scan", "+ Tiny runtime roles"],
        metrics: { trust: good("runtime gated"), threat: warn("residual"), defense: good("admit + IAM") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("cluster policy", "stamp")]),
            artifact: artifact([green("verified digest", "stamp")]),
            runtime: runtime([green("running + watched", "radar")]),
            pkg: pkg([amber("CVE feed correlating", "bell")]),
            card: card(upLeft(), "Runtime loop", ["pull from private registry", "admit: sig + provenance", "re-scan digests daily", "revoke + redeploy on hit", "IAM keeps blast small"], { icon: "shield" }),
          },
          links: {
            ca: both("client", "artifact"),
            ar: both("artifact", "runtime"),
            rp: both("runtime", "pkg", { label: "SBOM match" }),
          },
          flows: [flow(["ca", "ar"], "mine", { rate: 0.5 }), flow("rp", "req", { rate: 0.4, delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: control every edge of the chain",
        body: [
          `<table class="compare">
            <thead><tr><th>Hop</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Resolve deps</td><td>Namespaces, allowlist, lock + hash</td></tr>
              <tr><td>Updates</td><td>Review, stage, do not blind auto-merge</td></tr>
              <tr><td>Build</td><td>Hardened CI, no silent inject</td></tr>
              <tr><td>Artifact</td><td>Sign + SBOM + provenance</td></tr>
              <tr><td>Deploy</td><td>Verify before run</td></tr>
              <tr><td>Operate</td><td>Re-scan, tiny roles, private registry</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: name confusion/typosquat, maintainer compromise, and build poison as three stories, then answer with pin, sign, provenance, verify.",
        ],
        callout: { kind: "next", text: "Related: <b>Secure CI/CD</b> for pipeline hardening and <b>Container Security</b> for image runtime controls." },
        metrics: { trust: good("edged"), threat: good("mapped"), defense: good("layered") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("trusted path", "shieldCheck")]),
            git: git([green("reviewed", "git")]),
            pkg: pkg([green("locked", "package")]),
            build: build([green("attested", "cog")]),
            artifact: artifact([green("signed", "stamp")]),
            runtime: runtime([green("verified", "server")]),
          },
          links: {
            cg: both("client", "git"),
            gp: both("git", "pkg"),
            pb: both("pkg", "build"),
            ba: both("build", "artifact"),
            ar: both("artifact", "runtime"),
          },
          flows: [flow(["cg", "gp", "pb"], "mine", { rate: 0.45 }), rt(["ba", "ar"], "empty", { rate: 0.4, delay: 0.55 })],
        },
      },
    ],
  });
})();
