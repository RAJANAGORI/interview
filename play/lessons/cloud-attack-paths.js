(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["public", "app"], glyph: "globe", tags }, o));
  const role = (tags = [], o = {}) => block(0, 2, Object.assign({ label: ["instance", "role"], glyph: "key", color: "yellow", tags }, o));
  const admin = (tags = [], o = {}) => block(12, 2, Object.assign({ label: ["admin", "role"], glyph: "unlock", color: "red", tags }, o));
  const bucket = (tags = [], o = {}) => block(0, 14, Object.assign({ label: ["data", "lake"], glyph: "database", color: "purple", tags }, o));
  const trail = (tags = [], o = {}) => block(12, 14, Object.assign({ s: 3.6, h: 34, label: ["audit", "trail"], glyph: "scroll", color: "teal", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 18], "cloud account", tone);
  const upLeft = (dx = -440, dy = -200) => ({ x: 0, y: -8, dx, dy });

  SD.lesson({
    id: "cloud-attack-paths",
    title: "Cloud Attack Paths",
    summary: "How real cloud compromises chain: initial access, credential theft, privilege escalation, lateral movement, data theft, and persistence on the control plane.",
    minutes: 16,
    level: "advanced",
    metrics: [
      { id: "stage", label: "Kill-chain stage", icon: "route" },
      { id: "access", label: "Attacker holds", icon: "key" },
      { id: "defense", label: "Break the chain", icon: "shield" },
    ],
    legend: [["poison", "attacker path"], ["secret", "credentials"], ["mine", "legit user"], ["req", "API call"], ["empty", "blocked"]],
    goals: [
      { text: "Initial access without a zero-day", step: 0 },
      { text: "Credential and metadata theft", step: 1 },
      { text: "Privilege escalation via IAM", step: 3 },
      { text: "Lateral movement and data exfil", step: 5 },
      { text: "Where to cut the chain", step: 7 },
    ],
    steps: [
      {
        short: "Initial",
        chapter: "attack",
        title: "Initial access is usually boring",
        body: [
          "Most cloud breaches start with something ordinary: a phishing kit that steals SSO cookies, a leaked access key in a public GitHub repo, an exposed Jenkins with a cloud role, or an SSRF into the instance metadata service. Exotic hypervisor escapes make headlines; stolen keys make incident queues.",
          "Map your attack surface as \"places a credential can appear,\" not only \"open ports.\" CI variables, laptop .aws/credentials, third-party integrations with wide OAuth scopes, and forgotten access keys are all front doors.",
        ],
        callout: { kind: "insight", text: "Ask \"how does a stranger get a principal?\" before \"how do they exploit the app?\"" },
        metrics: { stage: bad("initial access"), access: bad("user or key"), defense: bad("none yet") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("phish / leaked AKIA / SSRF", "skull")]),
            edge: edge([amber("public entry", "globe")]),
            role: role([note("workload identity nearby", "key")], { dim: 0.7 }),
            bucket: bucket([], { dim: 0.6 }),
            card: card(upLeft(), "Common front doors", ["SSO session cookie theft", "AKIA key in git history", "CI OIDC role over-scoped", "SSRF -> 169.254.169.254", "! no 0-day required"], { icon: "door" }),
          },
          links: {
            ae: both("client", "edge", { label: "steal session / key", labelTone: "red" }),
          },
          flows: [flow("ae", "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Creds",
        chapter: "attack",
        title: "Turn a foothold into cloud credentials",
        body: [
          "From a compromised app or CI job, the attacker harvests whatever the environment offers: environment variables, mounted service-account tokens, instance metadata credentials, or a poorly protected secrets manager entry.",
          "Temporary credentials are still credentials. A one-hour STS token with <code>AdministratorAccess</code> is enough to empty buckets and create durable backdoors. Duration and permission both set the blast radius.",
        ],
        callout: { kind: "warn", text: "IMDSv1, world-readable CI secrets, and long-lived access keys are the classic accelerants." },
        changes: ["- Env / metadata / CI secrets read", "- Attacker holds cloud principal", "~ TTL may still be hours"],
        metrics: { stage: bad("credential access"), access: bad("cloud role"), defense: bad("over-privileged") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("holds STS token", "key")]),
            edge: edge([red("app SSRF / RCE", "bug")]),
            role: role([red("returns AccessKeyId", "key")], { heat: 0.45 }),
            bucket: bucket([], { dim: 0.5 }),
            card: card(upLeft(), "Credential harvest", ["GET 169.254.169.254/.../role", "printenv | grep SECRET", "cat /var/run/.../token", "CI: echo $AWS_SECRET", "! temp + AdminAccess still hurts"], { icon: "key" }),
          },
          links: {
            ae: both("client", "edge", { labelTone: "red" }),
            er: both("edge", "role", { label: "metadata / env", labelTone: "red" }),
          },
          flows: [flow("ae", "poison", { rate: 0.6 }), rt("er", "poison", { rate: 0.6, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Recon",
        chapter: "technique",
        title: "Enumerate what the principal can do",
        body: [
          "With any role in hand, attackers run the cloud equivalent of <code>whoami</code>: list attached policies, try common actions, and map resources. Tools automate <code>GetCallerIdentity</code>, policy simulation, and bucket listing.",
          "Defenders should assume this happens in minutes. Detection on unusual <code>List*</code> / <code>Get*</code> spikes from a workload role that normally only writes metrics is a high-value alert.",
        ],
        callout: { kind: "tip", text: "If ListBuckets succeeds for an app role, your least-privilege story already failed." },
        changes: ["- Policy and resource enumeration", "~ Quiet if logging is off", "+ Alert on unusual List*"],
        metrics: { stage: warn("discovery"), access: bad("role mapped"), defense: warn("need detection") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("sts:GetCallerIdentity", "search")]),
            role: role([amber("policies listed", "list")]),
            bucket: bucket([amber("ListBuckets ok", "database")]),
            trail: trail([note("API calls land here", "scroll")]),
            card: card(upLeft(), "Cloud whoami", ["GetCallerIdentity", "ListAttachedRolePolicies", "ListBuckets / DescribeInstances", "simulate policy edge cases", "= alert on weird List* from app roles"], { icon: "search" }),
          },
          links: {
            ar: both("client", "role", { label: "enumerate", labelTone: "red" }),
            rb: both("role", "bucket", { label: "List*" }),
            rt: both("role", "trail", { label: "logged" }),
          },
          flows: [flow("ar", "poison", { rate: 0.6 }), flow("rb", "ping", { rate: 0.8, delay: 0.4 }), flow("rt", "req", { rate: 0.4, delay: 0.7 })],
        },
      },
      {
        short: "Escalate",
        chapter: "attack",
        title: "Privilege escalation through IAM edges",
        body: [
          "Escalation paths are policy graph problems: a role that can <code>iam:PassRole</code> plus <code>ec2:RunInstances</code>, or <code>lambda:CreateFunction</code> with a privileged role, or edit its own inline policy. One weak edge turns \"read logs\" into \"create admin user.\"",
          "Attackers also abuse resource-based policies: add themselves to a bucket policy, a trust policy, or a KMS key policy. Graph your IAM the way you would graph Active Directory.",
        ],
        callout: { kind: "warn", text: "PassRole is as sensitive as the roles you can pass. Treat it like sudo." },
        changes: ["- PassRole / Create* with fat role", "- Trust or key policy edited", "+ Attacker gains admin-equivalent"],
        metrics: { stage: bad("privilege escalation"), access: bad("admin role"), defense: bad("IAM graph hole") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("PassRole + RunInstances", "zap")]),
            role: role([amber("limited app role", "key")]),
            admin: admin([red("new instance assumes me", "unlock")], { heat: 0.5 }),
            bucket: bucket([], { dim: 0.5 }),
            card: card(upLeft(-450), "Escalation edges", ["iam:PassRole + launch compute", "lambda:CreateFunction + admin role", "iam:CreateAccessKey on others", "edit trust / bucket / KMS policy", "! graph these like AD paths"], { icon: "zap" }),
          },
          links: {
            ar: both("client", "role", { labelTone: "red" }),
            ra: both("role", "admin", { label: "PassRole path", labelTone: "red" }),
          },
          flows: [flow("ar", "poison", { rate: 0.6 }), flow("ra", "secret", { rate: 0.6, delay: 0.5 })],
        },
      },
      {
        short: "Persist",
        chapter: "attack",
        title: "Persistence on the control plane",
        body: [
          "After escalation, attackers plant durability: new IAM users with access keys, extra trust on a role for an external account, federation IdPs they control, scheduled Lambdas, or golden AMIs with backdoors.",
          "Disabling or diverting logging is part of the same step. If they can <code>StopLogging</code> or delete the trail bucket, your forensics window shrinks fast. Guardrails that deny those actions org-wide are not optional nice-to-haves.",
        ],
        callout: { kind: "insight", text: "Cloud persistence lives in IAM and automation, not only on a disk image." },
        changes: ["- Backdoor user / trust policy", "- Logging muted", "~ Scheduled evil automation"],
        metrics: { stage: bad("persistence"), access: bad("durable admin"), defense: bad("trail at risk") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("CreateUser + keys", "userX")]),
            admin: admin([red("trust: attacker account", "skull")]),
            trail: trail([red("StopLogging attempted", "ban")], { color: "red", heat: 0.4 }),
            bucket: bucket([amber("exfil staging", "upload")]),
            card: card(upLeft(), "Stay after reboot", ["IAM user + AKIA keys", "role trust to external account", "evil IdP / federation", "StopLogging / delete trail", "= SCP deny on those APIs"], { icon: "history" }),
          },
          links: {
            aa: both("client", "admin", { labelTone: "red" }),
            at: both("client", "trail", { label: "mute logs", labelTone: "red" }),
            ab: both("admin", "bucket", { label: "ready exfil" }),
          },
          flows: [flow("aa", "poison", { rate: 0.6 }), flow("at", "poison", { rate: 0.5, delay: 0.4 }), flow("ab", "secret", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Exfil",
        chapter: "attack",
        title: "Lateral movement and data out",
        body: [
          "With admin-equivalent rights, reading production data is API calls: S3 sync, RDS snapshots shared to another account, disk snapshots copied out, Secrets Manager bulk reads. Network exfil controls help for workloads, but control-plane APIs often bypass your VPC egress filters.",
          "Watch for unusual cross-account shares, large GetObject volumes from new principals, and snapshot / image copy events. Data loss prevention in cloud is as much IAM and API monitoring as it is DLP appliances.",
        ],
        callout: { kind: "warn", text: "Sharing a snapshot to an attacker-controlled account is exfiltration that never crosses your NAT." },
        changes: ["- Bulk object / secret reads", "- Snapshot share cross-account", "~ VPC egress may not see it"],
        metrics: { stage: bad("exfiltration"), access: bad("data copied"), defense: bad("late") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("aws s3 sync", "download")]),
            admin: admin([red("admin principal", "unlock")]),
            bucket: bucket([red("objects leaving", "database")], { heat: 0.5 }),
            trail: trail([amber("GetObject spike", "bell")]),
            card: card(upLeft(), "Data out paths", ["S3 GetObject at scale", "RDS / EBS snapshot share", "Secrets Manager batch read", "image copy to other account", "! often pure control-plane"], { icon: "download" }),
          },
          links: {
            ca: both("client", "admin", { labelTone: "red" }),
            ab: both("admin", "bucket", { label: "read + copy", labelTone: "red" }),
            bt: both("bucket", "trail", { label: "volume alerts" }),
          },
          flows: [flow(["ca", "ab"], "poison", { rate: 0.65 }), flow("ab", "secret", { rate: 0.5, delay: 0.4, reverse: true }), flow("bt", "req", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Detect path",
        chapter: "technique",
        title: "Detect the chain, not one IOC",
        body: [
          "Single alerts are noisy. Correlation wins: new access key created, then AssumeRole into prod, then ListBuckets, then mass GetObject. Build detections as mini attack paths with the same stage names you use in IR.",
          "Keep the trail in a separate account with SCP denies on delete. Without that, step four of the path is \"turn off the cameras.\"",
        ],
        callout: { kind: "tip", text: "Interview gold: narrate one path and the alert that should fire at each hop." },
        changes: ["+ Correlated detections", "+ Immutable trail account", "+ Stage-named runbooks"],
        metrics: { stage: warn("detection"), access: warn("seen mid-path"), defense: good("correlated alerts") },
        scene: {
          entities: {
            vpc: vpc(),
            client: attacker([amber("mid-chain", "crosshair")]),
            role: role([amber("odd AssumeRole", "bell")]),
            bucket: bucket([note("not yet emptied", "database")]),
            trail: trail([green("immutable copy", "shieldCheck")]),
            card: card(upLeft(), "Path detections", ["1 CreateAccessKey", "2 AssumeRole prod", "3 ListBuckets", "4 mass GetObject", "= page on 1->2->3 chain"], { icon: "radar" }),
          },
          links: {
            cr: both("client", "role", { labelTone: "red" }),
            rt: both("role", "trail", { label: "events" }),
            rb: both("role", "bucket", { fail: 0.35, label: "blocked next hop" }),
          },
          flows: [flow("cr", "poison", { rate: 0.55 }), flow("rt", "req", { rate: 0.5, delay: 0.4 }), flow("rb", "poison", { rate: 0.45, delay: 0.9, blocked: true })],
        },
      },
      {
        short: "Cut",
        chapter: "solution",
        title: "Break the chain at the cheapest hop",
        body: [
          "Prevention maps cleanly onto the path: no long-lived keys (blocks many initial accesses), IMDSv2 and narrow roles (blocks credential harvest payoff), IAM graph hygiene and SCPs (blocks escalation and persistence), private data + deny snapshot share (blocks quiet exfil).",
          "You will not close every door. Prioritize hops that are cheap for you and expensive for them: remove AdminAccess from workloads, deny <code>StopLogging</code> via SCP, require MFA for user-key creation.",
        ],
        callout: { kind: "insight", text: "Security architecture is choosing which hop of this path dies first." },
        changes: ["+ Narrow roles + IMDSv2", "+ SCP on logging / IAM bombs", "+ MFA and no static keys"],
        metrics: { stage: good("path broken"), access: good("limited"), defense: good("layered cuts") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: attacker([gray("path dies early", "ban")]),
            edge: edge([green("no SSRF payoff", "shield")]),
            role: role([green("tiny permissions", "listChecks")]),
            admin: admin([gray("PassRole denied", "ban")], { color: "gray", dim: 0.5 }),
            trail: trail([green("SCP protects trail", "lock")]),
            card: card(upLeft(-450), "Cheap cuts", ["no AKIA for humans", "IMDSv2 + hop limit 1", "deny PassRole to admin roles", "SCP: deny StopLogging", "MFA delete / key create"], { icon: "shieldCheck" }),
          },
          links: {
            ae: both("client", "edge", { labelTone: "red", fail: 0.4 }),
            er: both("edge", "role", { fail: 0.4 }),
            ra: both("role", "admin", { fail: 0.5, label: "denied" }),
          },
          flows: [flow("ae", "poison", { rate: 0.5, blocked: true }), flow("er", "poison", { rate: 0.4, delay: 0.4, blocked: true }), flow("ra", "poison", { rate: 0.4, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "IR",
        chapter: "technique",
        title: "Respond along the same path",
        body: [
          "Incident response mirrors the chain in reverse: revoke sessions and keys, detach policies, quarantine roles with a deny-all boundary, rotate secrets the role could read, and review trail for persistence artifacts (extra trusts, users, Lambdas).",
          "Practice with tabletop paths. \"Key leaked from CI\" should have a known playbook: which role, which resources, which keys to rotate, which customers to notify.",
        ],
        callout: { kind: "tip", text: "Containment first: deny-all on the compromised principal beats polite investigation while they exfil." },
        changes: ["+ Revoke + deny-all boundary", "+ Rotate reachable secrets", "+ Hunt persistence in IAM"],
        metrics: { stage: good("response"), access: good("revoked"), defense: good("playbook") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([green("IR lead", "siren")]),
            role: role([green("deny-all attached", "ban")]),
            admin: admin([gray("backdoor user deleted", "userX")], { color: "gray" }),
            trail: trail([green("forensics copy", "search")]),
            bucket: bucket([amber("access reviewed", "eye")]),
            card: card(upLeft(), "IR along the path", ["1 revoke keys / sessions", "2 deny-all boundary on role", "3 rotate secrets it could read", "4 hunt users, trusts, jobs", "5 customer + timeline notes"], { icon: "siren" }),
          },
          links: {
            ar: both("client", "role", { label: "contain" }),
            at: both("client", "trail", { label: "investigate" }),
            aa: both("client", "admin", { label: "purge persistence" }),
          },
          flows: [flow("ar", "mine", { rate: 0.55 }), flow("at", "req", { rate: 0.45, delay: 0.4 }), flow("aa", "empty", { rate: 0.45, delay: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: narrate the path, then cut it",
        body: [
          `<table class="compare">
            <thead><tr><th>Stage</th><th>Typical move</th><th>Cut</th></tr></thead>
            <tbody>
              <tr><td>Initial</td><td>Phish, leaked key, CI, SSRF</td><td>Federation, no static keys</td></tr>
              <tr><td>Creds</td><td>Metadata / env / secrets</td><td>IMDSv2, vault, narrow role</td></tr>
              <tr><td>Escalate</td><td>PassRole, policy edits</td><td>IAM graph + SCP</td></tr>
              <tr><td>Persist</td><td>Users, trusts, mute logs</td><td>Deny dangerous APIs</td></tr>
              <tr><td>Exfil</td><td>API copy / snapshot share</td><td>Data IAM + alerts</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: walk one concrete path in 60 seconds, then name the cheapest control that breaks it.",
        ],
        callout: { kind: "next", text: "Next: <b>Container Security</b> for the workload layer where many of these footholds start." },
        metrics: { stage: good("understood"), access: good("limited by design"), defense: good("cuts mapped") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("path mapped", "map")]),
            role: role([green("least privilege", "key")]),
            bucket: bucket([green("tight policy", "lock")]),
            trail: trail([green("watching", "radar")]),
          },
          links: {
            ar: both("client", "role"),
            rb: both("role", "bucket"),
            rt: both("role", "trail"),
          },
          flows: [flow("ar", "mine", { rate: 0.5 }), rt("rb", "req", { rate: 0.45, delay: 0.4 }), flow("rt", "req", { rate: 0.4, delay: 0.8 })],
        },
      },
    ],
  });
})();
