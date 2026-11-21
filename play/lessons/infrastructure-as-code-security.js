(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const git = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["IaC", "repo"], glyph: "git", tags }, o));
  const plan = (tags = [], o = {}) => block(0, 2, Object.assign({ label: ["plan /", "pipeline"], glyph: "workflow", color: "blue", tags }, o));
  const cloud = (tags = [], o = {}) => block(0, 14, Object.assign({ label: ["cloud", "resources"], glyph: "cloud", color: "teal", tags }, o));
  const state = (tags = [], o = {}) => block(12, 2, Object.assign({ s: 3.6, h: 34, label: ["state", "file"], glyph: "file", color: "yellow", tags, pills: "below" }, o));
  const policy = (tags = [], o = {}) => block(12, 12, Object.assign({ s: 3.6, h: 34, label: ["policy", "as code"], glyph: "scale", color: "purple", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 18], "IaC delivery path", tone);
  const upLeft = (dx = -440, dy = -200) => ({ x: 0, y: -8, dx, dy });

  SD.lesson({
    id: "infrastructure-as-code-security",
    title: "Infrastructure as Code Security",
    summary: "Terraform, CloudFormation, Pulumi, and friends: how misconfigs, secret-laden state, and unchecked plans become production holes - and how policy-as-code stops them.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "code", label: "IaC posture", icon: "git" },
      { id: "apply", label: "Apply risk", icon: "cloud" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "engineer"], ["poison", "attacker / bad PR"], ["secret", "creds in state"], ["req", "plan / apply"], ["empty", "policy deny"]],
    goals: [
      { text: "IaC as the real production change path", step: 0 },
      { text: "Classic misconfigs in templates", step: 1 },
      { text: "State files and secret leakage", step: 3 },
      { text: "Policy as code in the pipeline", step: 5 },
      { text: "Drift, identity, and safe applies", step: 7 },
    ],
    steps: [
      {
        short: "Path",
        chapter: "setup",
        title: "Production changes should come from code",
        body: [
          "IaC means the intended cloud state lives in git: networks, IAM, buckets, clusters. A merge + apply is the change window. That is good for review and disaster recovery, and dangerous when the templates encode insecure defaults at scale.",
          "If engineers still click in the console beside Terraform, you get drift and a false sense of review. Pick a path: code is the source of truth, or admit the console is.",
        ],
        callout: { kind: "insight", text: "Securing IaC is securing the highest-privilege merge on your team." },
        metrics: { code: warn("templates unreviewed"), apply: "-", defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("PR to infra repo", "git")]),
            git: git([note("*.tf / templates", "fileCode")]),
            plan: plan([note("CI plan", "workflow")]),
            cloud: cloud([note("resources appear", "cloud")]),
            card: card(upLeft(), "Code to cloud", ["git holds desired state", "CI runs plan", "apply after review", "! console click = drift", "= one path, reviewed"], { icon: "git" }),
          },
          links: {
            cg: both("client", "git"),
            gp: both("git", "plan"),
            pc: both("plan", "cloud", { label: "apply" }),
          },
          flows: [flow(["cg", "gp"], "mine", { rate: 0.55 }), rt("pc", "req", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Misconfig",
        chapter: "attack",
        title: "Insecure defaults copy-pasted everywhere",
        body: [
          "Public S3 ACLs, 0.0.0.0/0 security groups, disabled encryption, admin IAM policies, and open RDS are often one module parameter away. Once merged, every environment that calls the module inherits the hole.",
          "Attackers do not need to \"hack Terraform.\" They scan for the resources the templates created. Your IaC became a mass-misconfiguration factory.",
        ],
        callout: { kind: "warn", text: "A bad default in a shared module is an org-wide vulnerability." },
        changes: ["- Public bucket / open SG in module", "- Merged without policy check", "- Cloud resources exposed"],
        metrics: { code: bad("insecure module"), apply: bad("shipped wide open"), defense: bad("no gate") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("find open bucket", "search")]),
            git: git([red("acl = public-read", "alert")], { heat: 0.35 }),
            plan: plan([amber("plan looks \"green\"", "check")]),
            cloud: cloud([red("internet can read", "unlock")], { heat: 0.45 }),
            card: card(upLeft(), "Factory of holes", ["aws_s3_bucket_acl public", "ingress 0.0.0.0/0 :22", "encryption = false", "policy Action * Resource *", "! module reused in 40 stacks"], { icon: "alert" }),
          },
          links: {
            gp: both("git", "plan"),
            pc: both("plan", "cloud", { label: "apply", labelTone: "red" }),
            ac: both("client", "cloud", { label: "exploit resource", labelTone: "red" }),
          },
          flows: [flow(["gp", "pc"], "poison", { rate: 0.55 }), flow("ac", "poison", { rate: 0.55, delay: 0.7 })],
        },
      },
      {
        short: "Review miss",
        chapter: "problem",
        title: "Human review does not scale for JSON diffs",
        body: [
          "Terraform plans are long. Reviewers miss a single <code>cidr_blocks = [\"0.0.0.0/0\"]</code> in a 2,000-line plan. PR screenshots of \"plan succeeded\" prove nothing about security.",
          "You need machine-enforceable rules on the plan or the code: deny public, require encryption, ban * IAM, require tags. People still review intent; bots review invariants.",
        ],
        callout: { kind: "tip", text: "Separate \"does this feature make sense?\" from \"did we open the world?\"" },
        changes: ["- Plan too large to eyeball", "- Invariant missed", "+ Need automated policy"],
        metrics: { code: warn("human only"), apply: bad("missed open SG"), defense: warn("PR theater") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: alice([amber("LGTM on huge plan", "eye")]),
            git: git([note("+ open SG buried", "file")]),
            plan: plan([red("2000 lines", "list")], { heat: 0.3 }),
            policy: policy([gray("no checks yet", "ban")], { dim: 0.6 }),
            card: card(upLeft(-440), "Review limits", ["plan spam hides cidr 0.0.0.0/0", "\"terraform plan ok\" != safe", "reviewers check intent", "bots check invariants", "= policy-as-code on plan"], { icon: "eye" }),
          },
          links: {
            cg: both("client", "git"),
            gp: both("git", "plan"),
          },
          flows: [flow(["cg", "gp"], "mine", { rate: 0.55 })],
        },
      },
      {
        short: "State",
        chapter: "attack",
        title: "State files are treasure maps with passwords",
        body: [
          "Remote state often contains resource IDs, attributes, and sometimes secrets that flowed through resources or provisioners. An open state bucket, or world-readable Azure blob, gives attackers a blueprint and sometimes credentials.",
          "Encrypt state at rest, lock down who can read the backend, enable versioning, and never commit state to git. Prefer writing secrets to a vault and referencing them, not storing them as plain Terraform attributes.",
        ],
        callout: { kind: "warn", text: "State access is near-production access. Treat the backend like a secrets store." },
        changes: ["- State world-readable", "- Secrets in tfstate JSON", "+ Encrypt + tight IAM on backend"],
        metrics: { code: warn("ok"), apply: bad("state leaked"), defense: bad("open backend") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("aws s3 cp state.json", "download")]),
            state: state([red("db password in attrs", "key")], { heat: 0.5 }),
            cloud: cloud([amber("map of every resource", "map")]),
            git: git([], { dim: 0.5 }),
            card: card(upLeft(), "tfstate goldmine", ["resource addresses", "private IPs, ARNs", "sometimes passwords", "open backend bucket", "= KMS + IAM + no git commit"], { icon: "fileKey" }),
          },
          links: {
            cs: both("client", "state", { labelTone: "red" }),
            sc: both("state", "cloud", { label: "blueprint" }),
          },
          flows: [flow("cs", "secret", { rate: 0.7 }), flow("sc", "poison", { rate: 0.45, delay: 0.5 })],
        },
      },
      {
        short: "Poison PR",
        chapter: "attack",
        title: "A malicious PR is an apply away from admin",
        body: [
          "Contributors (or compromised developer accounts) can propose IAM changes that grant their user admin, add backdoor keys, or open exfil paths. If apply uses a powerful CI role and auto-applies on merge, the PR is the exploit.",
          "Protect the main branch, require reviews from infra owners, bind OIDC deploy roles tightly, and run policy checks before apply. Untrusted forks should never receive the production plan credentials.",
        ],
        callout: { kind: "insight", text: "CI that can apply Terraform is a control-plane admin. Guard it like one." },
        changes: ["- Evil IAM in PR", "- Auto-apply with god role", "+ Owners + policy + OIDC scope"],
        metrics: { code: bad("malicious PR"), apply: bad("god CI role"), defense: bad("auto-merge") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("PR: add my IAM user admin", "pen")]),
            git: git([red("merged to main", "git")], { heat: 0.35 }),
            plan: plan([red("apply with Admin", "skull")], { heat: 0.4 }),
            cloud: cloud([red("backdoor created", "userX")]),
            card: card(upLeft(-450), "PR as exploit", ["add access_key for attacker", "attach AdministratorAccess", "CI OIDC role too wide", "auto-apply on merge", "= CODEOWNERS + policy + manual approve"], { icon: "git" }),
          },
          links: {
            cg: both("client", "git", { labelTone: "red" }),
            gp: both("git", "plan"),
            pc: both("plan", "cloud", { label: "apply", labelTone: "red" }),
          },
          flows: [flow(["cg", "gp", "pc"], "poison", { rate: 0.6 })],
        },
      },
      {
        short: "Policy",
        chapter: "solution",
        title: "Policy as code gates the plan",
        body: [
          "Tools like OPA/Conftest, Sentinel, Checkov, tfsec, and cloud native policy engines evaluate Terraform plans or code against rules: no public ACL, encryption required, MFA delete, banned wildcards. Fail CI on violations.",
          "Write rules for your real footguns, not a generic thousand-check noise list. Start with deny-critical, then expand. Policy that everyone skip-flags is theater.",
        ],
        callout: { kind: "tip", text: "Run policy on the plan JSON when possible so you evaluate what would actually apply." },
        changes: ["+ Automated policy on plan", "+ Fail merge on critical", "~ Exceptions documented"],
        metrics: { code: good("linted"), apply: good("gated"), defense: good("policy-as-code") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("opens PR", "git")]),
            git: git([note("module change", "fileCode")]),
            plan: plan([note("terraform plan", "workflow")]),
            policy: policy([green("deny public + * IAM", "scale")]),
            cloud: cloud([gray("apply blocked", "ban")], { dim: 0.55 }),
            card: card(upLeft(), "Policy gates", ["checkov / tfsec / OPA", "deny 0.0.0.0/0 ssh", "require encryption + tags", "ban Action *", "CI fails before apply"], { icon: "scale" }),
          },
          links: {
            cg: both("client", "git"),
            gp: both("git", "plan"),
            pp: both("plan", "policy", { label: "evaluate" }),
            pc: both("policy", "cloud", { fail: 0.5, label: "deny apply" }),
          },
          flows: [flow(["cg", "gp"], "mine", { rate: 0.55 }), flow("pp", "req", { rate: 0.5, delay: 0.4 }), flow("pc", "empty", { rate: 0.45, delay: 0.9, blocked: true })],
        },
      },
      {
        short: "Modules",
        chapter: "solution",
        title: "Secure building blocks beat one-off fixes",
        body: [
          "Publish blessed modules with safe defaults: private by default, encryption on, logging on, least-privilege IAM fragments. Teams compose modules instead of freestyling resources. Version and sign module sources.",
          "Breaking changes to tighten security need a migration story. Silent default flips without communication cause shadow console workarounds.",
        ],
        callout: { kind: "insight", text: "Safe defaults in modules scale better than yelling about reviews." },
        changes: ["+ Hardened shared modules", "+ Version pins", "+ Private by default"],
        metrics: { code: good("safe modules"), apply: good("inherit safe"), defense: good("defaults") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("module \"s3_private\"", "box")]),
            git: git([green("v3.2.1 pinned", "package")]),
            plan: plan([green("encryption + block public", "check")]),
            cloud: cloud([green("private bucket", "lock")]),
            card: card(upLeft(-430), "Blessed modules", ["private / encrypt / log defaults", "semver + changelog", "pin module source", "no raw aws_s3 in apps", "= central fix, many stacks"], { icon: "boxes" }),
          },
          links: {
            cg: both("client", "git"),
            gp: both("git", "plan"),
            pc: both("plan", "cloud"),
          },
          flows: [flow(["cg", "gp"], "mine", { rate: 0.55 }), rt("pc", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Identity",
        chapter: "technique",
        title: "Who may plan and who may apply",
        body: [
          "Split identities: readers can plan, a smaller set can apply to prod, and human break-glass is separate. Use OIDC from GitHub/GitLab to cloud roles with branch and repo conditions so a random workflow cannot assume the prod apply role.",
          "Store no long-lived AKIA keys in CI. State locking and apply queues prevent two pipelines from fighting and leaving half-applied holes.",
        ],
        callout: { kind: "tip", text: "Production apply should need a protected environment approval, not just a green unit test." },
        changes: ["+ OIDC-scoped apply roles", "+ Plan vs apply separation", "+ Environment approvals"],
        metrics: { code: good("reviewed"), apply: good("least priv CI"), defense: good("OIDC + approve") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("prod approval", "userCheck")]),
            plan: plan([green("OIDC role: apply-prod", "fingerprint")]),
            state: state([green("locked + encrypted", "lock")]),
            cloud: cloud([green("apply after approve", "cloud")]),
            card: card(upLeft(), "Apply identity", ["OIDC: repo + ref conditions", "plan-only role vs apply role", "protected env approval", "state lock", "! no static keys in CI"], { icon: "fingerprint" }),
          },
          links: {
            cp: both("client", "plan", { label: "approve" }),
            ps: both("plan", "state", { label: "lock" }),
            pc: both("plan", "cloud", { label: "apply" }),
          },
          flows: [flow("cp", "mine", { rate: 0.5 }), flow("ps", "secret", { rate: 0.4, delay: 0.4 }), rt("pc", "req", { rate: 0.45, delay: 0.8 })],
        },
      },
      {
        short: "Drift",
        chapter: "technique",
        title: "Detect drift and close the console loophole",
        body: [
          "Scheduled plans or drift detectors flag resources changed outside IaC. Alert on unexpected IAM, SG, and public access changes even if Terraform did not do them. Feed findings back into code or IR.",
          "SCPs and permissions boundaries can deny console users from creating the most dangerous resources except through the break-glass role, nudging everyone back onto the IaC path.",
        ],
        callout: { kind: "insight", text: "Drift is either an incident or a process failure. Treat unexplained drift as both until proven otherwise." },
        changes: ["+ Drift detection", "+ Alert on out-of-band IAM/SG", "+ SCP nudges to IaC"],
        metrics: { code: good("source of truth"), apply: warn("drift watched"), defense: good("detect") },
        scene: {
          entities: {
            vpc: vpc(),
            client: attacker([red("console: open SG", "pen")]),
            cloud: cloud([amber("drift detected", "radar")], { heat: 0.25 }),
            plan: plan([green("scheduled plan diff", "search")]),
            policy: policy([green("alert security", "bell")]),
            card: card(upLeft(), "Drift loop", ["nightly plan vs state", "alert on IAM/SG/public", "ticket -> fix in code", "SCP blocks casual console", "= no silent out-of-band"], { icon: "radar" }),
          },
          links: {
            ac: both("client", "cloud", { labelTone: "red" }),
            cp: both("cloud", "plan", { label: "diff" }),
            pp: both("plan", "policy", { label: "alert" }),
          },
          flows: [flow("ac", "poison", { rate: 0.5 }), flow("cp", "req", { rate: 0.5, delay: 0.4 }), flow("pp", "mine", { rate: 0.4, delay: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: secure the templates and the apply path",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Insecure modules</td><td>Safe defaults + version pins</td></tr>
              <tr><td>Missed plan details</td><td>Policy-as-code on plan</td></tr>
              <tr><td>State leakage</td><td>Encrypted, private backend</td></tr>
              <tr><td>Malicious PR</td><td>CODEOWNERS, approvals, scoped OIDC</td></tr>
              <tr><td>Console drift</td><td>Detect + SCP guardrails</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: IaC multiplies mistakes and reviews. Put invariants in policy, secrets out of state, and god-mode apply behind OIDC plus approval.",
        ],
        callout: { kind: "next", text: "Next: <b>Secure CI/CD Pipeline Security</b> for the broader pipeline that runs these applies." },
        metrics: { code: good("hardened"), apply: good("gated"), defense: good("policy + identity") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("reviewed PR", "userCheck")]),
            git: git([green("safe modules", "git")]),
            plan: plan([green("policy pass", "shieldCheck")]),
            cloud: cloud([green("intended state", "cloud")]),
            state: state([green("locked", "lock")]),
          },
          links: {
            cg: both("client", "git"),
            gp: both("git", "plan"),
            pc: both("plan", "cloud"),
            ps: both("plan", "state"),
          },
          flows: [flow(["cg", "gp"], "mine", { rate: 0.5 }), rt("pc", "req", { rate: 0.45, delay: 0.5 }), flow("ps", "secret", { rate: 0.35, delay: 0.9 })],
        },
      },
    ],
  });
})();
