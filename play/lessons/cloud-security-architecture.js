(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["edge", "WAF"], glyph: "shield", color: "teal", tags }, o));
  const app = (tags = [], o = {}) => block(0, 4, Object.assign({ label: ["app", "tier"], glyph: "server", tags }, o));
  const data = (tags = [], o = {}) => block(0, 14, Object.assign({ label: ["data", "store"], glyph: "database", color: "purple", tags }, o));
  const iam = (tags = [], o = {}) => block(14, -4, Object.assign({ s: 3.6, h: 34, label: ["IAM", "plane"], glyph: "key", color: "yellow", tags, pills: "below" }, o));
  const cloud = (tags = [], o = {}) => block(14, 8, Object.assign({ s: 3.6, h: 34, label: ["cloud", "control"], glyph: "cloud", color: "blue", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 18], "account / VPC", tone);
  const upLeft = (dx = -440, dy = -200) => ({ x: 0, y: -8, dx, dy });

  const path = (extra = {}) =>
    Object.assign(
      {
        ae: both("client", "edge", { label: "HTTPS", labelAt: 0.5, labelSide: "below" }),
        ea: both("edge", "app", { labelAt: 0.55, labelSide: "below" }),
        ad: both("app", "data", { labelAt: 0.6, labelSide: "below" }),
      },
      extra
    );

  SD.lesson({
    id: "cloud-security-architecture",
    title: "Cloud Security Architecture",
    summary: "How a cloud account is really shaped: shared responsibility, identity as the new perimeter, network tiers, and the controls that keep blast radius small.",
    minutes: 16,
    level: "intermediate",
    metrics: [
      { id: "trust", label: "Trust boundary", icon: "layers" },
      { id: "blast", label: "Blast radius", icon: "flame" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker"], ["req", "API / data call"], ["secret", "credentials"], ["empty", "denied / sealed"]],
    goals: [
      { text: "Shared responsibility in one picture", step: 0 },
      { text: "Identity as the real perimeter", step: 2 },
      { text: "Network tiers that actually isolate", step: 4 },
      { text: "Logging and detection as a layer", step: 6 },
      { text: "Defense in depth that interviewers want", step: 8 },
    ],
    steps: [
      {
        short: "Shared duty",
        chapter: "setup",
        title: "Shared responsibility is not a shrug",
        body: [
          "The provider secures the buildings, hypervisors, and the control plane APIs. You secure what you put on top: identities, network paths, encryption keys you manage, application code, and the data itself. \"The cloud is secure\" only means the facility is. Misconfigured buckets, open security groups, and over-broad roles are still your incident.",
          "Interviewers want you to draw the line clearly. IaaS leaves OS patching to you. PaaS shifts that up. SaaS pushes most of it to the vendor, but tenant config, access reviews, and data classification stay with you.",
        ],
        callout: { kind: "insight", text: "Name who owns the control before you name the control. Shared responsibility is a RACI, not a marketing slide." },
        metrics: { trust: warn("split by service model"), blast: "-", defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("uses the SaaS / app", "user")]),
            edge: edge([note("provider edge + your WAF rules", "shield")]),
            app: app([amber("your code + config", "code")]),
            data: data([amber("your data + keys you manage", "key")]),
            cloud: cloud([green("provider: hardware, hypervisor", "cloud")]),
            card: card(upLeft(), "Who owns what", ["provider: physical, hypervisor, base APIs", "you: IAM, network, app, data, keys you hold", "IaaS  you patch OS", "PaaS  you secure app + data", "SaaS  you secure tenant + access", "! misconfig is almost always on you"], { icon: "layers" }),
          },
          links: path(),
          flows: [flow("ae", "mine", { rate: 0.7 }), rt("ea", "req", { rate: 0.6, delay: 0.4 }), rt("ad", "req", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Flat account",
        chapter: "attack",
        title: "One flat account is one big blast radius",
        body: [
          "A common starting point: one cloud account, one VPC, one \"devops\" role that can do everything, security groups that allow 0.0.0.0/0 on SSH \"for now\". The architecture works until one leaked key or one SSRF turns into account-wide access.",
          "Cloud breaches rarely need exotic zero-days. They need a credential that can reach everything, and a network that does not stop the walk. Architecture is what limits how far that walk goes.",
        ],
        callout: { kind: "warn", text: "If any single role can create users, read every bucket, and open security groups, you do not have an architecture. You have a convenience account." },
        changes: ["- One account, one god role", "- Wide security groups", "- No segmentation story"],
        metrics: { trust: bad("one perimeter"), blast: bad("whole account"), defense: bad("hope") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("stolen access key", "key")]),
            edge: edge([amber("open to the world", "unlock")], { color: "red" }),
            app: app([red("AdminAccess attached", "alert")]),
            data: data([red("all buckets readable", "database")], { heat: 0.4 }),
            iam: iam([red("*:* on *", "skull")]),
            card: card(upLeft(), "Flat and wide", ["1 account, 1 VPC, 1 AdminAccess role", "SG: 0.0.0.0/0 :22", "S3: public ACLs \"temporary\"", "! one leak = everything", "# Capital One-style blast radius"], { icon: "flame" }),
          },
          links: path({ ai: both("client", "iam", { label: "AssumeRole / API", labelTone: "red" }) }),
          flows: [flow("ae", "poison", { rate: 0.7 }), flow("ai", "secret", { rate: 0.6, delay: 0.3 }), rt(["ea", "ad"], "poison", { rate: 0.6, delay: 0.7 })],
        },
      },
      {
        short: "Identity edge",
        chapter: "technique",
        title: "Identity is the perimeter now",
        body: [
          "In a public cloud every API call is authenticated. Network ACLs still matter, but the control plane speaks identity: users, roles, service principals, temporary credentials. Attackers who steal a role can often skip your VPC entirely and talk straight to the provider APIs.",
          "Design for least privilege, short-lived credentials, and no long-lived keys in code. Prefer federation (SSO / OIDC) over IAM users with access keys. Put a human approval or break-glass path on the few roles that can create other roles.",
        ],
        callout: { kind: "tip", text: "Senior answer: \"We treat IAM as the primary trust boundary and the network as a second fence, not the only one.\"" },
        changes: ["+ Federation over static keys", "+ Short-lived tokens", "+ Narrow roles per workload"],
        metrics: { trust: good("IAM first"), blast: warn("per role"), defense: good("least privilege") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("SSO / OIDC login", "idCard")]),
            edge: edge([green("mTLS + WAF", "shieldCheck")]),
            app: app([green("task role: s3:GetObject one bucket", "key")]),
            data: data([note("encrypted at rest", "lock")]),
            iam: iam([green("STS temporary creds", "ticket")]),
            card: card(upLeft(-460), "Identity-first design", ["no long-lived access keys in git", "OIDC / SSO for humans", "workload identity for services", "STS: minutes, not months", "= role that creates roles is break-glass"], { icon: "key" }),
          },
          links: path({ ai: both("client", "iam", { label: "STS GetSessionToken" }) }),
          flows: [flow("ai", "secret", { rate: 0.5 }), flow("ae", "mine", { rate: 0.6, delay: 0.4 }), rt(["ea", "ad"], "req", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Accounts",
        chapter: "solution",
        title: "Separate accounts for separate risk",
        body: [
          "Multi-account layouts (landing zones, org units) put prod, non-prod, security tooling, and shared services in different accounts. A compromised CI role in staging cannot rewrite production IAM. SCPs (or equivalent org policies) set hard ceilings no local admin can raise.",
          "You pay some operational cost. You gain a blast-radius wall that security groups alone never give you. Pair it with a security account that owns the audit trail and cannot be muted from prod.",
        ],
        callout: { kind: "insight", text: "Accounts are isolation boundaries. VPCs are network boundaries. Roles are permission boundaries. Use all three." },
        changes: ["+ Prod / non-prod / security accounts", "+ Org SCPs as ceilings", "+ Central audit account"],
        metrics: { trust: good("account walls"), blast: good("one OU"), defense: good("SCP + IAM") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([note("works in prod account", "user")]),
            edge: edge([green("prod only", "shield")]),
            app: app([note("prod workloads", "server")]),
            data: data([green("prod data", "database")]),
            cloud: cloud([green("org SCP: deny LeaveOrg", "ban")], { label: ["org", "policy"] }),
            card: card(upLeft(), "Landing zone idea", ["prod | staging | shared | security", "SCP: deny dangerous APIs org-wide", "security account owns CloudTrail", "! staging admin != prod admin", "# AWS Orgs / Azure MG / GCP folders"], { icon: "building" }),
          },
          links: path(),
          flows: [flow("ae", "mine", { rate: 0.6 }), rt(["ea", "ad"], "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Tiers",
        chapter: "solution",
        title: "Network tiers that match trust",
        body: [
          "Public subnets hold only the things that must face the internet: load balancers, bastions with tight rules, or nothing at all if you use private connectivity. App tiers talk to data tiers on private routes. Default deny between tiers; open only the ports you need.",
          "PrivateLink / private service endpoints keep traffic off the public internet for cloud APIs. Egress should go through a controlled NAT or proxy so you can log and deny unexpected destinations. \"Everything can talk to everything inside the VPC\" is a flat network with cloud branding.",
        ],
        callout: { kind: "tip", text: "Draw three boxes: edge, app, data. Then erase every arrow you cannot justify." },
        changes: ["+ Public / private / data subnets", "+ Default-deny SGs", "+ Private endpoints for cloud APIs"],
        metrics: { trust: good("tiered network"), blast: good("one tier"), defense: good("SG + NACL") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("only hits the edge", "globe")]),
            edge: edge([green("public subnet only", "router")]),
            app: app([green("private subnet", "server")]),
            data: data([green("no public route", "lock")], { color: "purple" }),
            card: card(upLeft(), "Tier sketch", ["internet -> LB / WAF (public)", "LB -> app (private)", "app -> db (data subnet)", "deny app -> internet direct", "= PrivateLink for S3 / KMS / APIs"], { icon: "network" }),
          },
          links: path(),
          flows: [flow("ae", "mine", { rate: 0.7 }), rt("ea", "req", { rate: 0.6, delay: 0.4 }), rt("ad", "req", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Encryption",
        chapter: "technique",
        title: "Encrypt, then mind who holds the keys",
        body: [
          "Turn on encryption at rest for disks, databases, and object storage. Prefer customer-managed keys when compliance needs key policy and rotation under your control. Encrypt in transit with TLS everywhere, including service-to-service inside the VPC.",
          "Encryption without access control is theater. If every role can Decrypt with the same KMS key, a stolen role still reads everything. Bind key policies to the few principals that need them, and separate duties so the person who administers IAM is not the only one who can change key policy.",
        ],
        callout: { kind: "warn", text: "\"Encrypted\" in a checkbox is not the same as \"unreadable to this role.\"" },
        changes: ["+ At-rest encryption on by default", "+ CMK with tight key policy", "+ TLS on internal hops"],
        metrics: { trust: good("crypto + IAM"), blast: warn("per key policy"), defense: good("KMS + TLS") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("TLS to edge", "lock")]),
            edge: edge([green("TLS terminated / re-encrypted", "lock")]),
            app: app([note("uses CMK via role", "key")]),
            data: data([green("SSE-KMS / TDE", "shieldCheck")]),
            iam: iam([green("kms:Decrypt for app role only", "stamp")]),
            card: card(upLeft(-450), "Keys and data", ["at rest: disk, DB, object store", "in transit: TLS end to end", "CMK: key policy = who can Decrypt", "! AdminAccess + Decrypt = still game over", "= separate key admins from data roles"], { icon: "lock" }),
          },
          links: path({ ak: both("app", "iam", { label: "Decrypt via KMS" }) }),
          flows: [flow("ae", "mine", { rate: 0.6 }), rt(["ea", "ad"], "empty", { rate: 0.5, delay: 0.4 }), flow("ak", "secret", { rate: 0.4, delay: 0.8 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Assume breach: log what you cannot prevent",
        body: [
          "Turn on control-plane audit logs in every account and region, ship them to a locked-down security account, and alert on the boring-but-deadly events: Disable* logging, CreateAccessKey, Attach*Policy, AuthorizeSecurityGroupIngress from 0.0.0.0/0, unusual AssumeRole chains.",
          "Detection is an architecture decision: who owns the trail, who can delete it, how fast you page. Without immutable logs, your \"defense in depth\" story ends the moment the attacker becomes admin.",
        ],
        callout: { kind: "tip", text: "Interviewers love: \"logs land in a separate account the workload roles cannot write Delete to.\"" },
        changes: ["+ Org-wide audit trail", "+ Immutable security account", "+ Alerts on IAM and SG changes"],
        metrics: { trust: warn("attacker may enter"), blast: good("seen early"), defense: good("detect + respond") },
        scene: {
          entities: {
            vpc: vpc(),
            client: attacker([red("tries DisableTrail", "terminal")]),
            edge: edge([amber("anomaly at edge", "radar")]),
            app: app([note("workload role", "server")]),
            cloud: cloud([green("trail copy immutable", "scroll")], { label: ["security", "account"], color: "teal" }),
            card: card(upLeft(), "What to watch", ["CreateAccessKey / AttachUserPolicy", "StopLogging / DeleteTrail", "open 0.0.0.0/0 ingress", "unusual AssumeRole chains", "= alerts into a security account"], { icon: "radar" }),
          },
          links: {
            ae: both("client", "edge", { label: "API call", labelTone: "red" }),
            ec: both("edge", "cloud", { label: "audit event" }),
            ac: link("client", "cloud", { label: "deny delete", labelTone: "red", fail: 0.4, style: "dashed" }),
          },
          flows: [flow("ae", "poison", { rate: 0.6 }), flow("ec", "req", { rate: 0.5, delay: 0.4 }), flow("ac", "poison", { rate: 0.5, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Zero trust",
        chapter: "insight",
        title: "Do not trust the VPC badge",
        body: [
          "Classic castle-and-moat assumed \"inside the VPC\" meant friendly. Cloud and remote work killed that. Treat every hop as hostile until authenticated and authorized: service identity, mTLS, explicit allow policies between services, and no reliance on source IP alone.",
          "Zero trust is not a product SKU. It is the design rule that network location is a weak signal. Combine it with the account, IAM, and logging layers above instead of replacing them.",
        ],
        callout: { kind: "insight", text: "Zero trust asks: who is calling, what may they do, and can we prove both on every request?" },
        changes: ["+ Authenticate every internal call", "- No \"trust because private IP\"", "+ Policy between services"],
        metrics: { trust: good("per request"), blast: good("per service"), defense: good("mTLS + authZ") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("service A identity", "fingerprint")]),
            edge: edge([green("mTLS + policy check", "shieldCheck")]),
            app: app([green("service B verifies A", "stamp")]),
            data: data([note("only B's role", "lock")]),
            card: card(upLeft(), "Beyond the VPC", ["authenticate caller identity", "authorize action, not just path", "mTLS or signed tokens between services", "! 10.0.0.0/8 is not a credential", "= network is one signal, not the decision"], { icon: "fingerprint" }),
          },
          links: path(),
          flows: [flow("ae", "mine", { rate: 0.6 }), rt(["ea", "ad"], "empty", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Depth",
        chapter: "solution",
        title: "Stack the layers so one miss is not fatal",
        body: [
          "A workable cloud architecture stacks: org and account isolation, IAM least privilege, network tiers, encryption with tight key policy, and detection that survives admin compromise. Each layer assumes the one above it failed.",
          "When you design a system in an interview, walk those layers out loud. Pick concrete controls (SCP, task role, private subnet, CMK, CloudTrail) instead of saying \"we would secure it.\"",
        ],
        callout: { kind: "tip", text: "Good closing line: \"Identity limits who, network limits where, crypto limits what they can read, logs tell us when that failed.\"" },
        changes: ["+ Layered controls named", "+ Each assumes prior failure", "~ No single chokepoint fantasy"],
        metrics: { trust: good("layered"), blast: good("contained"), defense: good("defense in depth") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("federated user", "userCheck")]),
            edge: edge([green("WAF + TLS", "shieldCheck")]),
            app: app([green("narrow role", "server")]),
            data: data([green("CMK + private", "lock")]),
            iam: iam([green("least privilege", "key")]),
            cloud: cloud([green("immutable trail", "scroll")]),
            card: card(upLeft(-460), "Depth checklist", ["1 accounts + SCP", "2 IAM / federation", "3 network tiers", "4 encryption + key policy", "5 detect in a locked account", "= one miss should not be game over"], { icon: "shieldCheck" }),
          },
          links: path({ ai: both("app", "iam") }),
          flows: [flow("ae", "mine", { rate: 0.6 }), rt(["ea", "ad"], "req", { rate: 0.5, delay: 0.4 }), flow("ai", "secret", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: draw the boundaries first",
        body: [
          `<table class="compare">
            <thead><tr><th>Boundary</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Provider vs you</td><td>Shared responsibility by service model</td></tr>
              <tr><td>Account</td><td>Org units, SCPs, separate prod</td></tr>
              <tr><td>Identity</td><td>Federation, short-lived, least privilege</td></tr>
              <tr><td>Network</td><td>Tiers, default deny, private endpoints</td></tr>
              <tr><td>Data</td><td>Encryption + key policy</td></tr>
              <tr><td>Time</td><td>Immutable logs and alerts</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: start with blast radius, not product names. Say how far a stolen role can walk, then name the walls that stop it.",
        ],
        callout: { kind: "next", text: "Next: <b>Cloud-Native Security Patterns</b> for the recurring design moves (immutability, secrets, mesh) that sit on this architecture." },
        metrics: { trust: good("clear boundaries"), blast: good("limited"), defense: good("layered") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("right-sized access", "shieldCheck")]),
            edge: edge([green("edge hardened", "shield")]),
            app: app([green("least privilege", "server")]),
            data: data([green("locked + logged", "lock")]),
          },
          links: path(),
          flows: [flow("ae", "mine", { rate: 0.6 }), rt(["ea", "ad"], "req", { rate: 0.5, delay: 0.5 })],
        },
      },
    ],
  });
})();
