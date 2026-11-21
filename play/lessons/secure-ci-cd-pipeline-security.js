(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const git = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["source", "repo"], glyph: "git", tags }, o));
  const ci = (tags = [], o = {}) => block(0, 2, Object.assign({ label: ["CI", "runner"], glyph: "workflow", color: "blue", tags }, o));
  const registry = (tags = [], o = {}) => block(12, 2, Object.assign({ s: 3.6, h: 34, label: ["artifact", "registry"], glyph: "package", color: "teal", tags, pills: "below" }, o));
  const prod = (tags = [], o = {}) => block(0, 14, Object.assign({ label: ["prod", "runtime"], glyph: "cloud", color: "purple", tags }, o));
  const vault = (tags = [], o = {}) => block(12, 12, Object.assign({ s: 3.6, h: 34, label: ["secrets"], glyph: "keyhole", color: "yellow", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 18], "delivery pipeline", tone);
  const upLeft = (dx = -440, dy = -200) => ({ x: 0, y: -8, dx, dy });

  SD.lesson({
    id: "secure-ci-cd-pipeline-security",
    title: "Secure CI/CD Pipeline Security",
    summary: "The pipeline is a privileged path to production: poisoned builds, secret theft from runners, unsafe third-party actions, and how to harden from commit to deploy.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "pipe", label: "Pipeline trust", icon: "workflow" },
      { id: "reach", label: "What CI can touch", icon: "key" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "legit change"], ["poison", "attacker"], ["secret", "CI secrets"], ["req", "build / deploy"], ["empty", "blocked"]],
    goals: [
      { text: "Why CI is a high-value target", step: 0 },
      { text: "Poisoned pipeline execution", step: 1 },
      { text: "Secret exposure on runners", step: 3 },
      { text: "OIDC, isolation, and signed deploys", step: 5 },
      { text: "Guardrails that stick", step: 8 },
    ],
    steps: [
      {
        short: "Why CI",
        chapter: "setup",
        title: "CI/CD is production's privileged path",
        body: [
          "The pipeline checks out code, runs tests, builds artifacts, holds cloud credentials, and often deploys straight to prod. Owning CI is frequently easier than owning prod, and it yields the same outcome.",
          "Threat model it as a crown jewel: who can change workflows, which secrets are mounted, which runners are shared, and whether a PR from a fork can touch production credentials.",
        ],
        callout: { kind: "insight", text: "If CI can deploy, CI is in your production trust boundary." },
        metrics: { pipe: warn("powerful by design"), reach: warn("secrets + prod"), defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("git push", "upload")]),
            git: git([note("app + workflows", "git")]),
            ci: ci([note("build + test + deploy", "cog")]),
            prod: prod([note("runtime updated", "cloud")]),
            vault: vault([note("CI secrets", "key")], { dim: 0.7 }),
            card: card(upLeft(), "Privileged path", ["checkout code", "compile / test", "hold cloud keys", "push images / apply IaC", "! attacker loves this hop"], { icon: "workflow" }),
          },
          links: {
            cg: both("client", "git"),
            gc: both("git", "ci"),
            cp: both("ci", "prod", { label: "deploy" }),
          },
          flows: [flow(["cg", "gc"], "mine", { rate: 0.55 }), rt("cp", "req", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Poison",
        chapter: "attack",
        title: "Poison the pipeline, ship your payload",
        body: [
          "Classic move: change a workflow or build script so CI runs attacker code with CI's privileges. Examples include rewriting a Makefile target, adding a malicious GitHub Action, or abusing pull_request_target on a public repo so fork PRs run with secrets.",
          "SolarWinds taught the industry that a trusted build system is a nation-scale amplifier. Your scale may be smaller; the pattern is identical.",
        ],
        callout: { kind: "warn", text: "pull_request_target + checkout of PR code + secrets = remote code execution as CI." },
        changes: ["- Malicious workflow / build step", "- Runs on privileged CI", "- Artifact or deploy poisoned"],
        metrics: { pipe: bad("attacker code runs"), reach: bad("CI identity"), defense: bad("weak workflow auth") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("PR: evil workflow step", "pen")]),
            git: git([red("build.sh curls malware", "bug")], { heat: 0.4 }),
            ci: ci([red("executes as deploy role", "skull")], { heat: 0.45 }),
            prod: prod([red("backdoored release", "alert")]),
            card: card(upLeft(), "Pipeline poison", ["edit Makefile / Action", "pull_request_target footgun", "CI runs attacker script", "push trojan artifact", "# SolarWinds-shaped pattern"], { icon: "bug" }),
          },
          links: {
            cg: both("client", "git", { labelTone: "red" }),
            gc: both("git", "ci", { label: "run", labelTone: "red" }),
            cp: both("ci", "prod", { label: "deploy evil", labelTone: "red" }),
          },
          flows: [flow(["cg", "gc", "cp"], "poison", { rate: 0.6 })],
        },
      },
      {
        short: "Actions",
        chapter: "attack",
        title: "Third-party Actions and tasks are code execution",
        body: [
          "Reusable Actions, Orbs, and marketplace tasks run inside your job. Pinning to a mutable tag like <code>@v1</code> or <code>@main</code> means the publisher can change what you run tomorrow. A compromised publisher runs in every consumer pipeline.",
          "Pin by commit SHA, prefer official or internally mirrored actions, review permissions requested (<code>write</code> tokens), and avoid <code>curl | bash</code> installers in jobs.",
        ],
        callout: { kind: "tip", text: "Interview answer: pin Actions by SHA, not by floating tag." },
        changes: ["- Floating Action tag", "- Publisher compromise", "+ Pin SHA + review perms"],
        metrics: { pipe: bad("unpinned Action"), reach: bad("job token abused"), defense: bad("supply chain") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: alice([note("uses actions/x@v1", "package")], { label: "dev" }),
            git: git([amber("workflow.yml", "file")]),
            ci: ci([red("Action payload runs", "zap")], { heat: 0.4 }),
            vault: vault([red("secrets() visible to step", "key")]),
            card: card(upLeft(-450), "Mutable tasks", ["uses: pub/action@v1", "tag moves to malware", "GITHUB_TOKEN write", "secrets in env of step", "= pin SHA, mirror, least perms"], { icon: "package" }),
          },
          links: {
            cg: both("client", "git"),
            gc: both("git", "ci"),
            cv: both("ci", "vault", { label: "secrets()", labelTone: "red" }),
          },
          flows: [flow(["cg", "gc"], "mine", { rate: 0.5 }), flow("cv", "secret", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Secrets",
        chapter: "attack",
        title: "Runners leak whatever you mount",
        body: [
          "Jobs that print env, dump memory, or run untrusted tests can exfiltrate CI secrets. Shared self-hosted runners across untrusted repos let one job snoop on another. Long-lived cloud keys in CI variables are a single log line away from a breach.",
          "Prefer OIDC federation for cloud access, short-lived tokens, secret masking, and isolated runners per trust tier. Never reuse a privileged self-hosted runner for public fork PRs.",
        ],
        callout: { kind: "warn", text: "Self-hosted + public forks is a common critical finding." },
        changes: ["- Secrets in job env", "- Shared runner contamination", "+ OIDC + isolation"],
        metrics: { pipe: bad("leaky runner"), reach: bad("cloud keys stolen"), defense: bad("static secrets") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("exfil from job log / memory", "download")]),
            ci: ci([red("shared self-hosted", "server")], { heat: 0.4 }),
            vault: vault([red("AKIA... in variables", "key")], { heat: 0.45 }),
            prod: prod([amber("reachable with stolen key", "cloud")]),
            card: card(upLeft(), "Secret theft", ["echo + unmasked secret", "malware test steals env", "shared runner disk residue", "static cloud keys in CI", "= OIDC, ephemeral, tiered runners"], { icon: "keyhole" }),
          },
          links: {
            cv: both("client", "ci", { labelTone: "red" }),
            vv: both("ci", "vault", { label: "read secrets", labelTone: "red" }),
            vp: both("vault", "prod", { label: "use keys" }),
          },
          flows: [flow(["cv", "vv"], "secret", { rate: 0.65 }), flow("vp", "poison", { rate: 0.45, delay: 0.6 })],
        },
      },
      {
        short: "Branch",
        chapter: "technique",
        title: "Branch protection is pipeline security",
        body: [
          "Protected main, required reviews, signed commits where practical, and restricted who can edit <code>.github/workflows</code> stop silent pipeline changes. Environment protection rules require human approval before prod secrets are exposed to a job.",
          "Separate the \"build on PR\" pipeline (no prod secrets) from the \"deploy from main\" pipeline (OIDC to prod). Context confusion collapses those two.",
        ],
        callout: { kind: "tip", text: "Draw two pipelines on the whiteboard: untrusted PR vs trusted release." },
        changes: ["+ Protected branches", "+ Env approvals for prod", "+ No prod secrets on fork PRs"],
        metrics: { pipe: good("split trust"), reach: good("prod gated"), defense: good("branch rules") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("PR build only", "git")]),
            git: git([green("main protected", "lock")]),
            ci: ci([green("PR: no prod secrets", "shield")]),
            prod: prod([gray("needs approval job", "ban")], { dim: 0.55 }),
            card: card(upLeft(-430), "Two pipelines", ["PR CI: test, no prod creds", "main CI: OIDC deploy", "CODEOWNERS on workflows/", "env: required reviewers", "! never mix fork + secrets"], { icon: "split" }),
          },
          links: {
            cg: both("client", "git"),
            gc: both("git", "ci"),
            cp: both("ci", "prod", { fail: 0.45, label: "blocked" }),
          },
          flows: [flow(["cg", "gc"], "mine", { rate: 0.55 }), flow("cp", "empty", { rate: 0.45, delay: 0.7, blocked: true })],
        },
      },
      {
        short: "OIDC",
        chapter: "solution",
        title: "Federate CI identity instead of storing keys",
        body: [
          "GitHub Actions, GitLab, and others can mint OIDC tokens. Cloud roles trust those tokens only when <code>sub</code> matches your repo and ref. No long-lived AKIA in secrets. Compromising a different repo does not get your role.",
          "Scope roles to the minimum deploy actions. Use separate roles for staging and prod. Audit AssumeRoleWithWebIdentity the same way you audit human SSO.",
        ],
        callout: { kind: "insight", text: "OIDC turns \"secret in CI\" into \"identity of this workflow run.\"" },
        changes: ["+ OIDC cloud roles", "+ sub/ref conditions", "- Static deploy keys"],
        metrics: { pipe: good("federated"), reach: good("scoped role"), defense: good("OIDC") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("merge to main", "check")]),
            ci: ci([green("OIDC token mint", "ticket")]),
            vault: vault([green("STS temp creds", "fingerprint")], { label: ["cloud", "STS"] }),
            prod: prod([green("apply / deploy", "cloud")]),
            card: card(upLeft(), "OIDC deploy", ["workflow requests JWT", "cloud trusts repo+ref", "STS credentials minutes-lived", "role: deploy only", "! no AKIA in secrets store"], { icon: "fingerprint" }),
          },
          links: {
            cc: both("client", "ci"),
            cv: both("ci", "vault", { label: "AssumeRoleWithWebIdentity" }),
            vp: both("vault", "prod", { label: "temp creds" }),
          },
          flows: [flow("cc", "mine", { rate: 0.5 }), flow("cv", "secret", { rate: 0.5, delay: 0.4 }), rt("vp", "req", { rate: 0.45, delay: 0.9 })],
        },
      },
      {
        short: "Hermetic",
        chapter: "solution",
        title: "Hermetic, reproducible, signed builds",
        body: [
          "Builds should not phone home to arbitrary package mirrors without pin and integrity checks. Use lockfiles, private caches, and verified checksums. Produce a signed artifact (Sigstore/cosign, Notary) and deploy only that digest.",
          "Record provenance: who kicked the build, which commit, which workflow digest. That attestation is what admission controllers verify later.",
        ],
        callout: { kind: "tip", text: "\"We deploy only signed digests from this pipeline\" is a complete senior sentence." },
        changes: ["+ Lockfiles + private caches", "+ Sign artifacts", "+ Provenance attestation"],
        metrics: { pipe: good("hermetic"), reach: good("signed only"), defense: good("attest") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("trusted main build", "stamp")]),
            ci: ci([green("reproducible build", "cog")]),
            registry: registry([green("cosign sign digest", "stamp")]),
            prod: prod([green("verify then run", "shieldCheck")]),
            card: card(upLeft(-440), "Signed path", ["lockfile + pinned deps", "build on trusted runner", "sign digest + provenance", "prod admits only signed", "= no :latest floating deploys"], { icon: "stamp" }),
          },
          links: {
            cc: both("client", "ci"),
            cr: both("ci", "registry", { label: "push+sign" }),
            rp: both("registry", "prod", { label: "verify" }),
          },
          flows: [flow("cc", "mine", { rate: 0.5 }), flow("cr", "req", { rate: 0.5, delay: 0.4 }), rt("rp", "empty", { rate: 0.45, delay: 0.85 })],
        },
      },
      {
        short: "Isolate",
        chapter: "solution",
        title: "Isolate runners and minimize job permissions",
        body: [
          "Ephemeral runners (or strongly isolated VMs) per job beat long-lived shared hosts. Default <code>GITHUB_TOKEN</code> / job tokens to read-only; raise permissions only on the deploy job. Network-egress allow lists stop surprise exfil from build steps.",
          "Split high-risk builds (Android, Docker-in-Docker) onto dedicated pools. Contaminated caches are a stealth persistence path; wipe or namespace them.",
        ],
        callout: { kind: "warn", text: "A writable job token on every PR job is free lateral movement inside git." },
        changes: ["+ Ephemeral runners", "+ Least token perms", "+ Egress controls"],
        metrics: { pipe: good("isolated"), reach: good("minimal token"), defense: good("runner hygiene") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: attacker([red("PR job", "skull")]),
            ci: ci([green("ephemeral + read-only token", "shield")]),
            vault: vault([gray("prod secrets not mounted", "ban")], { dim: 0.55 }),
            prod: prod([gray("unreachable", "ban")], { dim: 0.55 }),
            card: card(upLeft(), "Runner hygiene", ["ephemeral VM/container", "token: contents read", "no prod env on PR", "egress allow list", "cache per trust tier"], { icon: "server" }),
          },
          links: {
            cc: both("client", "ci", { labelTone: "red" }),
            cv: both("ci", "vault", { fail: 0.5, label: "denied" }),
            cp: both("ci", "prod", { fail: 0.5, label: "denied" }),
          },
          flows: [flow("cc", "poison", { rate: 0.55 }), flow("cv", "poison", { rate: 0.45, delay: 0.4, blocked: true }), flow("cp", "poison", { rate: 0.4, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Watch the pipeline like a production system",
        body: [
          "Alert on workflow file changes, new self-hosted runners, unexpected OIDC AssumeRole, secret access outside deploy windows, and deploys not tied to a signed digests. Retain job logs in immutable storage.",
          "Tabletop \"CI compromised\": revoke OIDC trust or role, rotate anything the job could read, invalidate artifacts since time T, and rebuild from known-good commits.",
        ],
        callout: { kind: "tip", text: "CI IR is cloud IR plus artifact invalidation." },
        changes: ["+ Alerts on workflow + OIDC", "+ Immutable logs", "+ Revoke + rebuild playbook"],
        metrics: { pipe: warn("monitored"), reach: good("revocable"), defense: good("detect + IR") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("SEC on-call", "siren")]),
            ci: ci([amber("odd AssumeRole at 3am", "bell")]),
            registry: registry([amber("unexpected tag push", "radar")]),
            prod: prod([green("rollback to signed", "history")]),
            card: card(upLeft(), "Pipeline SOC", ["workflow file diffs", "OIDC role anomalies", "secret read alerts", "artifact invalidation", "rebuild from known commit"], { icon: "radar" }),
          },
          links: {
            cc: both("client", "ci", { label: "investigate" }),
            cr: both("ci", "registry"),
            rp: both("registry", "prod", { label: "rollback" }),
          },
          flows: [flow("cc", "mine", { rate: 0.5 }), flow("cr", "req", { rate: 0.45, delay: 0.4 }), rt("rp", "empty", { rate: 0.4, delay: 0.85 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: harden commit to deploy",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Poisoned workflow</td><td>Protect workflows/, split PR vs deploy</td></tr>
              <tr><td>Mutable Actions</td><td>Pin SHA, mirror, review</td></tr>
              <tr><td>Secret theft</td><td>OIDC, ephemeral runners, masking</td></tr>
              <tr><td>Overpowered token</td><td>Least job permissions</td></tr>
              <tr><td>Bad artifact</td><td>Sign + verify on deploy</td></tr>
              <tr><td>Silent abuse</td><td>Monitor OIDC, workflows, pushes</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: CI is prod. Separate untrusted builds from trusted deploys, federate identity, sign what you ship.",
        ],
        callout: { kind: "next", text: "Next: <b>Software Supply Chain Security</b> for dependencies, SBOMs, and provenance beyond the pipeline itself." },
        metrics: { pipe: good("trusted path"), reach: good("least privilege"), defense: good("layered") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("protected main", "userCheck")]),
            git: git([green("owners on workflows", "lock")]),
            ci: ci([green("OIDC + ephemeral", "shieldCheck")]),
            registry: registry([green("signed digest", "stamp")]),
            prod: prod([green("verified deploy", "cloud")]),
          },
          links: {
            cg: both("client", "git"),
            gc: both("git", "ci"),
            cr: both("ci", "registry"),
            rp: both("registry", "prod"),
          },
          flows: [flow(["cg", "gc"], "mine", { rate: 0.5 }), rt(["cr", "rp"], "req", { rate: 0.45, delay: 0.55 })],
        },
      },
    ],
  });
})();
