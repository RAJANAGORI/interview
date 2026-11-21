(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const api = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["kube", "apiserver"], glyph: "server", color: "blue", tags }, o));
  const pod = (tags = [], o = {}) => block(0, 8, Object.assign({ label: ["workload", "pod"], glyph: "container", tags }, o));
  const etcd = (tags = [], o = {}) => block(12, -6, Object.assign({ s: 3.6, h: 34, label: "etcd", glyph: "database", color: "purple", tags, pills: "below" }, o));
  const admit = (tags = [], o = {}) => block(12, 6, Object.assign({ s: 3.6, h: 34, label: ["admission", "policy"], glyph: "stamp", color: "teal", tags, pills: "below" }, o));
  const net = (tags = [], o = {}) => block(-12, 6, Object.assign({ s: 3.6, h: 34, label: ["network", "policy"], glyph: "network", color: "gray", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 14], "Kubernetes cluster", tone);
  const upLeft = (dx = -440, dy = -190) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "kubernetes-security-hardening",
    title: "Kubernetes Security Hardening",
    summary: "Cluster attack surface in practice: RBAC, etcd, pod security, network policies, secrets, and admission controls that keep one bad pod from owning the cluster.",
    minutes: 16,
    level: "advanced",
    metrics: [
      { id: "control", label: "Control plane", icon: "server" },
      { id: "workload", label: "Workload risk", icon: "container" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "admin / CI"], ["poison", "attacker"], ["secret", "token / secret"], ["req", "API call"], ["empty", "denied"]],
    goals: [
      { text: "API server and RBAC as the crown", step: 0 },
      { text: "Service account token theft", step: 2 },
      { text: "Pod security and network isolation", step: 4 },
      { text: "etcd and secrets hardening", step: 6 },
      { text: "Admission as the last gate", step: 7 },
    ],
    steps: [
      {
        short: "API crown",
        chapter: "setup",
        title: "The API server is the cluster's crown jewel",
        body: [
          "Everything in Kubernetes goes through the API server: schedule a pod, read a secret, create a ClusterRoleBinding. If that API is reachable with a powerful credential, the cluster is yours. Nodes and pods are workers; the control plane is the castle.",
          "Expose it only on private networks or through an authenticated bastion / VPN. Turn on audit logs. Treat <code>cluster-admin</code> like domain admin: rare, MFA'd, and monitored.",
        ],
        callout: { kind: "insight", text: "K8s security interviews often start here: who can talk to the apiserver, and as what?" },
        metrics: { control: warn("API exposed wide"), workload: "-", defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("kubectl / CI", "terminal")]),
            api: api([note("all cluster state changes", "server")]),
            etcd: etcd([note("state store", "database")]),
            pod: pod([], { dim: 0.55 }),
            card: card(upLeft(), "Crown jewel", ["apiserver: every mutate / read", "etcd: durable cluster state", "cluster-admin = domain admin", "! public apiserver + weak auth", "= private + audit + rare admin"], { icon: "server" }),
          },
          links: {
            ca: both("client", "api", { label: "HTTPS + auth" }),
            ae: both("api", "etcd", { label: "persist" }),
          },
          flows: [flow("ca", "mine", { rate: 0.65 }), rt("ae", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "RBAC hole",
        chapter: "attack",
        title: "Over-broad RBAC is privilege escalation waiting",
        body: [
          "Binding <code>cluster-admin</code> to a human group, a CI service account, or <code>system:anonymous</code> mistakes still happen. Wildcards like <code>verbs: [\"*\"]</code> on secrets or pods/exec give attackers everything after one foothold.",
          "Especially dangerous: create pods, create deployments, bind roles, escalate via <code>impersonate</code>, or get secrets cluster-wide. Audit RoleBindings the way you audit IAM.",
        ],
        callout: { kind: "warn", text: "pods/exec and secrets get in a Role are often enough to own namespaces." },
        changes: ["- Wildcard ClusterRole", "- CI has cluster-admin", "- Attacker binds more power"],
        metrics: { control: bad("RBAC wide open"), workload: bad("any SA useful"), defense: bad("none") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("bind cluster-admin to me", "skull")]),
            api: api([red("ClusterRole *.*", "unlock")], { heat: 0.4 }),
            pod: pod([amber("can exec + get secrets", "terminal")]),
            etcd: etcd([], { dim: 0.5 }),
            card: card(upLeft(), "RBAC footguns", ["ClusterRoleBinding to CI SA", "verbs: [\"*\"] resources: [\"*\"]", "get/list/watch secrets", "create pods + bind roles", "! escalate without leaving K8s"], { icon: "unlock" }),
          },
          links: {
            ca: both("client", "api", { labelTone: "red" }),
            ap: both("api", "pod", { label: "authZ allows all" }),
          },
          flows: [flow("ca", "poison", { rate: 0.7 }), flow("ap", "poison", { rate: 0.5, delay: 0.45 })],
        },
      },
      {
        short: "SA token",
        chapter: "attack",
        title: "Stolen service account tokens leave the pod",
        body: [
          "Every pod used to auto-mount a long-lived service account JWT. Compromise the pod, curl the apiserver with that bearer token, and act as that SA. If the SA can create pods or read secrets, the cluster fold starts.",
          "Modern clusters disable automount by default for many workloads, use projected short-lived tokens, and bind each workload to a dedicated SA with almost no rights. Never share a fat SA across apps \"for convenience.\"",
        ],
        callout: { kind: "tip", text: "automountServiceAccountToken: false unless the pod truly talks to the API." },
        changes: ["- Token mounted + powerful SA", "- Attacker calls apiserver as SA", "+ Short-lived projected tokens"],
        metrics: { control: bad("SA = cluster key"), workload: bad("RCE -> API"), defense: bad("automount") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("cat /var/run/.../token", "key")]),
            pod: pod([red("SA token mounted", "fileKey")], { heat: 0.4 }),
            api: api([amber("accepts bearer SA", "logIn")]),
            etcd: etcd([note("secrets readable?", "key")], { dim: 0.6 }),
            card: card(upLeft(-450), "Token theft", ["RCE in pod", "read SA JWT", "curl apiserver as SA", "list secrets / create pods", "= dedicated SA, no automount"], { icon: "fileKey" }),
          },
          links: {
            cp: both("client", "pod", { labelTone: "red" }),
            pa: both("pod", "api", { label: "Bearer SA", labelTone: "red" }),
          },
          flows: [flow("cp", "poison", { rate: 0.65 }), rt("pa", "secret", { rate: 0.55, delay: 0.45 })],
        },
      },
      {
        short: "Flat net",
        chapter: "problem",
        title: "Flat cluster networking trusts too much",
        body: [
          "Default: every pod can talk to every pod and often to the metadata service or node network. One compromised frontend reaches Redis, sidecar admin ports, and cloud IMDS.",
          "NetworkPolicies (or service mesh authZ) default-deny namespace traffic, then allow only the paths you need. Combine with private nodes and careful egress. Kubernetes networking is powerful and, by default, friendly to attackers.",
        ],
        callout: { kind: "insight", text: "RBAC does not stop east-west TCP. NetworkPolicy does." },
        changes: ["- Any pod to any pod", "- Metadata reachable", "+ Need default-deny NetPol"],
        metrics: { control: warn("API ok"), workload: bad("flat CNI"), defense: bad("no NetPol") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("pivot from front pod", "route")]),
            pod: pod([red("frontend compromised", "bug")]),
            net: net([red("allow all", "unlock")], { color: "red" }),
            api: api([], { dim: 0.45 }),
            card: card(upLeft(), "East-west open", ["front -> redis:6379", "front -> 169.254.169.254", "front -> node ports", "! RBAC never sees this", "= default-deny NetworkPolicy"], { icon: "network" }),
          },
          links: {
            cp: both("client", "pod", { labelTone: "red" }),
            pn: both("pod", "net", { label: "any egress" }),
          },
          flows: [flow(["cp", "pn"], "poison", { rate: 0.65 })],
        },
      },
      {
        short: "Pod secu",
        chapter: "solution",
        title: "Pod Security Standards and hardening",
        body: [
          "Enforce Pod Security Standards (baseline / restricted) at the namespace: no privileged, no host namespaces, non-root, drop caps, read-only root where possible. Restricted is the target for most app namespaces.",
          "Pair with resource quotas and limit ranges so a bad deploy cannot eat the node. Pod security is container hardening, but applied as cluster policy instead of a hope in a Dockerfile.",
        ],
        callout: { kind: "tip", text: "Say \"restricted PSS on app namespaces, privileged only in a locked system NS.\"" },
        changes: ["+ PSS restricted", "+ No hostPath / privileged", "+ Quotas on namespaces"],
        metrics: { control: good("policy"), workload: good("restricted pods"), defense: good("PSS") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("apply restricted NS", "clipboard")]),
            admit: admit([green("PSS restricted", "stamp")]),
            pod: pod([green("non-root, ro rootfs", "shieldCheck")]),
            api: api([note("rejects bad pod spec", "ban")]),
            card: card(upLeft(), "PSS restricted", ["runAsNonRoot", "drop ALL capabilities", "no privileged / hostNetwork", "seccomp RuntimeDefault", "quotas + limit ranges"], { icon: "shieldCheck" }),
          },
          links: {
            ca: both("client", "api"),
            aa: both("api", "admit", { label: "validate" }),
            ap: both("admit", "pod", { label: "admit ok" }),
          },
          flows: [flow("ca", "mine", { rate: 0.55 }), flow("aa", "req", { rate: 0.5, delay: 0.35 }), rt("ap", "req", { rate: 0.45, delay: 0.8 })],
        },
      },
      {
        short: "NetPol",
        chapter: "solution",
        title: "Default-deny NetworkPolicies",
        body: [
          "Start each namespace with deny-all ingress and egress, then open front -> API, API -> DB, and DNS. Label pods consistently so policies select the right workloads. Test with a probe pod; policies that never match are silent failures.",
          "For cloud metadata, block link-local from pods that do not need it, or use IMDSv2 hop limits on the nodes. NetworkPolicy plus metadata hardening closes a classic SSRF-from-pod path.",
        ],
        callout: { kind: "warn", text: "A NetworkPolicy only works if your CNI enforces it. Check that before you claim isolation." },
        changes: ["+ Deny-all then allow", "+ Label-based selection", "+ Block metadata where unused"],
        metrics: { control: good("stable"), workload: good("isolated"), defense: good("NetPol") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("front pod", "globe")]),
            pod: pod([green("api pod", "container")]),
            net: net([green("allow front->api only", "filter")]),
            api: api([], { dim: 0.5 }),
            card: card(upLeft(-430), "NetPol sketch", ["default deny ingress+egress", "allow: front -> api:8080", "allow: api -> db:5432", "allow: DNS", "deny: 169.254.169.254"], { icon: "filter" }),
          },
          links: {
            cn: both("client", "net"),
            np: both("net", "pod", { label: "allowed" }),
            bad: link("client", "pod", { label: "direct deny", fail: 0.45, style: "dashed", labelTone: "red" }),
          },
          flows: [flow(["cn", "np"], "mine", { rate: 0.55 }), flow("bad", "poison", { rate: 0.45, delay: 0.7, blocked: true })],
        },
      },
      {
        short: "etcd",
        chapter: "technique",
        title: "Protect etcd and Kubernetes Secrets",
        body: [
          "etcd holds every Secret and ConfigMap. Encrypt Secrets at rest with an encryptionConfiguration, restrict etcd to control-plane nodes with mTLS, and never expose etcd ports to the workload network.",
          "Remember: etcd encryption and KMS help at rest; any SA that can <code>get secrets</code> still reads plaintext via the API. RBAC and admission remain part of the secrets story.",
        ],
        callout: { kind: "insight", text: "Encrypt at rest without tight RBAC is necessary but not sufficient." },
        changes: ["+ etcd mTLS + private", "+ EncryptionConfiguration + KMS", "+ RBAC on secrets"],
        metrics: { control: good("etcd locked"), workload: warn("API still gates reads"), defense: good("crypto + RBAC") },
        scene: {
          entities: {
            vpc: vpc(),
            client: attacker([red("reach etcd:2379?", "crosshair")]),
            api: api([green("only path to state", "shield")]),
            etcd: etcd([green("mTLS + at-rest encrypt", "lock")]),
            pod: pod([amber("needs get secret RBAC", "key")]),
            card: card(upLeft(), "Secrets reality", ["etcd private + mTLS", "EncryptionConfiguration", "KMS provider for DEK", "! API get secrets still works", "= RBAC + short-lived tokens"], { icon: "database" }),
          },
          links: {
            ca: both("client", "api", { fail: 0.4, label: "no etcd path" }),
            ae: both("api", "etcd", { label: "mTLS" }),
            ce: link("client", "etcd", { fail: 0.55, label: "blocked", style: "dashed", labelTone: "red" }),
          },
          flows: [flow("ce", "poison", { rate: 0.5, blocked: true }), flow("ca", "poison", { rate: 0.45, delay: 0.4, blocked: true }), rt("ae", "empty", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Admit",
        chapter: "solution",
        title: "Admission controllers enforce the rules",
        body: [
          "Mutating and validating webhooks (OPA Gatekeeper, Kyverno, built-in PSS) reject privileged pods, unsigned images, hostPath, and wild RBAC manifests at apply time. Audit mode first, then enforce, so you do not brick the cluster.",
          "Also gate image registries: only your artifact store, only signed digests. Admission is where Dockerfile dreams meet cluster reality.",
        ],
        callout: { kind: "tip", text: "Break-glass namespace with stricter monitoring beats disabling admission globally." },
        changes: ["+ Validate privileged / registry", "+ Image signature check", "+ Audit then enforce"],
        metrics: { control: good("gated"), workload: good("clean specs"), defense: good("admission") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: attacker([red("apply privileged.yaml", "file")]),
            api: api([note("sends to webhook", "server")]),
            admit: admit([green("deny privileged", "shieldX")]),
            pod: pod([gray("never scheduled", "ban")], { dim: 0.5 }),
            card: card(upLeft(), "Admission rules", ["deny privileged + hostPath", "require signed digest", "require non-root", "block :latest", "audit -> enforce"], { icon: "stamp" }),
          },
          links: {
            ca: both("client", "api", { labelTone: "red" }),
            aa: both("api", "admit"),
            ap: both("admit", "pod", { fail: 0.5, label: "rejected" }),
          },
          flows: [flow("ca", "poison", { rate: 0.6 }), flow("aa", "req", { rate: 0.5, delay: 0.35 }), flow("ap", "poison", { rate: 0.5, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Supply",
        chapter: "technique",
        title: "Supply chain into the cluster",
        body: [
          "Clusters pull images continuously. A poisoned tag, a compromised registry credential, or a mutated manifest can land malware without touching the apiserver auth. Pin digests, verify signatures at admission, and use private registries with short-lived pull credentials.",
          "CI that can deploy to prod is part of the cluster trust boundary. Protect those pipeline identities with the same care as cluster-admin.",
        ],
        callout: { kind: "warn", text: "Your deploy SA is cluster-admin by another name if it can apply anything." },
        changes: ["+ Digest pin + cosign", "+ Private registry", "+ Harden deploy SA"],
        metrics: { control: good("deploy gated"), workload: good("trusted images"), defense: good("supply chain") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("CI deploy SA", "git")]),
            api: api([green("apply allowed set only", "listChecks")]),
            admit: admit([green("sig verify", "stamp")]),
            pod: pod([green("digest pinned", "container")]),
            card: card(upLeft(-440), "Into the cluster", ["CI OIDC -> deploy SA", "apply only signed digests", "no floating latest", "registry private", "! protect deploy SA like admin"], { icon: "package" }),
          },
          links: {
            ca: both("client", "api"),
            aa: both("api", "admit"),
            ap: both("admit", "pod"),
          },
          flows: [flow(["ca", "aa"], "mine", { rate: 0.55 }), rt("ap", "req", { rate: 0.45, delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: harden control plane and workloads",
        body: [
          `<table class="compare">
            <thead><tr><th>Surface</th><th>Harden</th></tr></thead>
            <tbody>
              <tr><td>API server</td><td>Private, audited, rare cluster-admin</td></tr>
              <tr><td>RBAC / SA</td><td>Least privilege, no automount, short tokens</td></tr>
              <tr><td>Pods</td><td>PSS restricted, quotas</td></tr>
              <tr><td>Network</td><td>Default-deny NetworkPolicy</td></tr>
              <tr><td>etcd / Secrets</td><td>mTLS, encrypt at rest, tight get</td></tr>
              <tr><td>Admission</td><td>Deny privileged, verify signatures</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: \"steal SA token -> abuse RBAC -> flat net\" as the attack story, then name PSS, NetPol, and admission as the fixes.",
        ],
        callout: { kind: "next", text: "Next: <b>Serverless Security</b> for functions where the unit of isolation is the invocation, not the pod." },
        metrics: { control: good("hardened"), workload: good("restricted"), defense: good("layered") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("least-priv kubectl", "userCheck")]),
            api: api([green("audited", "shield")]),
            pod: pod([green("restricted", "shieldCheck")]),
            net: net([green("default deny", "filter")]),
            admit: admit([green("enforcing", "stamp")]),
          },
          links: {
            ca: both("client", "api"),
            ap: both("api", "pod"),
            pn: both("pod", "net"),
          },
          flows: [flow("ca", "mine", { rate: 0.5 }), rt("ap", "req", { rate: 0.45, delay: 0.4 }), flow("pn", "empty", { rate: 0.4, delay: 0.8 })],
        },
      },
    ],
  });
})();
