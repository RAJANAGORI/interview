(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const image = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["container", "image"], glyph: "container", tags }, o));
  const runtime = (tags = [], o = {}) => block(0, 6, Object.assign({ label: ["runtime", "host"], glyph: "server", color: "gray", tags }, o));
  const registry = (tags = [], o = {}) => block(12, -6, Object.assign({ s: 3.6, h: 34, label: ["image", "registry"], glyph: "package", color: "blue", tags, pills: "below" }, o));
  const secret = (tags = [], o = {}) => block(12, 8, Object.assign({ s: 3.6, h: 34, label: ["secrets"], glyph: "key", color: "yellow", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 14], "node / cluster", tone);
  const upLeft = (dx = -440, dy = -190) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "container-security",
    title: "Container Security",
    summary: "From vulnerable base images to privileged breakouts: how containers fail, and the build-time plus runtime controls that keep a foothold inside the box.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "image", label: "Image posture", icon: "container" },
      { id: "runtime", label: "Runtime risk", icon: "server" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "legit deploy"], ["poison", "attacker"], ["secret", "credentials"], ["req", "pull / run"], ["empty", "blocked"]],
    goals: [
      { text: "Why base images are the supply chain", step: 0 },
      { text: "Secrets and root in the container", step: 2 },
      { text: "Privileged and breakout paths", step: 4 },
      { text: "Harden build and run", step: 6 },
      { text: "Admit only what you trust", step: 8 },
    ],
    steps: [
      {
        short: "Base image",
        chapter: "setup",
        title: "Your app is only as safe as the base layers",
        body: [
          "A container image is a stack of layers: OS packages, language runtimes, your app. Pulling <code>ubuntu:latest</code> or a random Docker Hub image imports years of CVEs and sometimes malware. The build pipeline is a supply-chain trust decision, not just a packaging step.",
          "Start from minimal, pinned digests from a registry you control. Rebuild often so patches land. Scan on every build and block deploys when critical CVEs have fixes available.",
        ],
        callout: { kind: "insight", text: "Containers do not remove patching. They move it into the image build." },
        metrics: { image: warn("fat latest tag"), runtime: "-", defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("FROM ubuntu:latest", "code")]),
            registry: registry([amber("public Hub", "globe")]),
            image: image([amber("300+ packages", "package")]),
            runtime: runtime([], { dim: 0.6 }),
            card: card(upLeft(), "Layers you inherit", ["FROM ubuntu:latest  (floating)", "apt packages with CVEs", "leftover build tools in final", "! Hub trust is uneven", "= pin digest, minimal base, scan"], { icon: "layers" }),
          },
          links: {
            cr: both("client", "registry", { label: "docker pull" }),
            ri: both("registry", "image", { label: "layers" }),
          },
          flows: [flow("cr", "mine", { rate: 0.6 }), rt("ri", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "CVE chain",
        chapter: "attack",
        title: "Unpatched image to remote code",
        body: [
          "An internet-facing container with an old OpenSSL or web framework CVE is a remote entry point. Attackers scan for known versions, exploit, and land a shell inside the container namespace.",
          "From there they look for the next mistake: running as root, a mounted docker.sock, cloud credentials in env, or a kernel escape. The image CVE was only the door.",
        ],
        callout: { kind: "warn", text: "\"We are in containers\" does not mean \"we are isolated from CVEs.\"" },
        changes: ["- Known CVE in base or app layer", "- RCE inside the container", "~ Next step: escape or steal creds"],
        metrics: { image: bad("critical CVE"), runtime: bad("shell as root"), defense: bad("unscanned") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("exploit CVE-20xx-...", "bug")]),
            image: image([red("vulnerable package", "alert")], { heat: 0.4 }),
            runtime: runtime([amber("process running", "terminal")]),
            registry: registry([], { dim: 0.5 }),
            card: card(upLeft(), "From CVE to shell", ["scanner finds old lib", "exploit -> reverse shell", "uid 0 inside the box", "read env, probe mounts", "! image age is attack surface"], { icon: "bug" }),
          },
          links: {
            ci: both("client", "image", { label: "RCE", labelTone: "red" }),
            ir: both("image", "runtime", { label: "shell" }),
          },
          flows: [flow("ci", "poison", { rate: 0.7 }), flow("ir", "poison", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Secrets",
        chapter: "attack",
        title: "Credentials travel with the container",
        body: [
          "ENV vars, files baked into layers, and Kubernetes Secrets mounted as plain files are easy wins after RCE. <code>printenv</code> and <code>cat /run/secrets/*</code> often yield cloud keys, database passwords, and API tokens.",
          "Worse: build args and multi-stage mistakes leave secrets in intermediate layers still present in the registry. Assume anything that ever entered a Dockerfile layer can be recovered.",
        ],
        callout: { kind: "warn", text: "If the secret is in the image, every pull replica owns it." },
        changes: ["- Keys in ENV / layers", "- Attacker dumps them", "+ Need runtime injection"],
        metrics: { image: bad("secret in layers"), runtime: bad("env readable"), defense: bad("none") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("printenv / docker history", "terminal")]),
            image: image([red("ENV DB_PASSWORD=", "key")], { heat: 0.4 }),
            secret: secret([red("same value in clear", "unlock")]),
            runtime: runtime([amber("mounts plaintext files", "file")]),
            card: card(upLeft(-450), "Where keys hide", ["ENV and ARG in Dockerfile", "COPY .env .", "K8s Secret volume (base64)", "build cache / history", "= runtime fetch + tmpfs"], { icon: "key" }),
          },
          links: {
            ci: both("client", "image", { labelTone: "red" }),
            is: both("image", "secret", { label: "extracted", labelTone: "red" }),
            ir: both("image", "runtime"),
          },
          flows: [flow("ci", "poison", { rate: 0.6 }), flow("is", "secret", { rate: 0.55, delay: 0.4 }), flow("ir", "req", { rate: 0.4, delay: 0.8 })],
        },
      },
      {
        short: "Root",
        chapter: "problem",
        title: "Running as root makes every bug worse",
        body: [
          "Many images still default to UID 0. Inside the container that means full control of the mount namespace you have. Combined with weak seccomp/AppArmor profiles or added capabilities (<code>SYS_ADMIN</code>), breakout tools get much easier.",
          "Drop to a non-root user in the Dockerfile, set <code>USER</code>, and enforce it at the orchestrator so a bad image cannot quietly run as root. Root in a container is not \"safe root.\"",
        ],
        callout: { kind: "tip", text: "Interview phrase: \"non-root, read-only rootfs, dropped caps, no privileged.\"" },
        changes: ["- Process uid 0", "- Extra capabilities", "~ Breakout tools happier"],
        metrics: { image: warn("USER root"), runtime: bad("uid 0"), defense: bad("defaults") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("id -> uid=0(root)", "terminal")]),
            image: image([amber("no USER directive", "alert")]),
            runtime: runtime([red("caps: SYS_ADMIN", "unlock")], { heat: 0.35 }),
            card: card(upLeft(), "Root by default", ["Dockerfile missing USER", "K8s: runAsNonRoot unset", "capadd SYS_ADMIN", "writable root filesystem", "! RCE becomes host-shaped"], { icon: "unlock" }),
          },
          links: {
            ci: both("client", "image", { labelTone: "red" }),
            ir: both("image", "runtime", { label: "same uid power" }),
          },
          flows: [flow(["ci", "ir"], "poison", { rate: 0.65 })],
        },
      },
      {
        short: "Breakout",
        chapter: "attack",
        title: "Privileged containers and docker.sock",
        body: [
          "A container started with <code>--privileged</code>, or with <code>/var/run/docker.sock</code> mounted, can control the host's Docker daemon and launch a sibling container that mounts the host filesystem. That is not a clever escape; it is handing over the keys.",
          "HostPath mounts of <code>/</code>, writable kernel modules, and shared PID namespaces have similar outcomes. Treat privileged and socket mounts as production emergencies, not debug conveniences left on.",
        ],
        callout: { kind: "warn", text: "docker.sock inside a container = root on the host for anyone who RCE that container." },
        changes: ["- Privileged or docker.sock", "- Sibling container mounts host /", "- Cluster node owned"],
        metrics: { image: bad("any"), runtime: bad("host owned"), defense: bad("privileged") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("docker -H unix:///var/run/docker.sock", "skull")]),
            image: image([red("sock mounted", "plug")], { heat: 0.45 }),
            runtime: runtime([red("host FS mounted", "server")], { heat: 0.5 }),
            card: card(upLeft(-460), "Instant host", ["--privileged", "mount docker.sock", "HostPath: /", "run -v /:/host", "= own the node, then the cloud role"], { icon: "server" }),
          },
          links: {
            ci: both("client", "image", { labelTone: "red" }),
            ir: both("image", "runtime", { label: "breakout", labelTone: "red" }),
          },
          flows: [flow("ci", "poison", { rate: 0.7 }), flow("ir", "poison", { rate: 0.6, delay: 0.45 })],
        },
      },
      {
        short: "Build harden",
        chapter: "solution",
        title: "Harden the image at build time",
        body: [
          "Use minimal distroless or alpine-like bases when they fit, multi-stage builds so compilers never ship, pin digests, run SCA scanners, and sign the resulting digest. Fail the pipeline on critical findings with available fixes.",
          "Add a non-root <code>USER</code>, remove setuid bits you do not need, and keep a software bill of materials for later incident response. The goal is a thin, known, signed artifact.",
        ],
        callout: { kind: "tip", text: "Build once, scan once, promote the digest. Do not rebuild differently per environment." },
        changes: ["+ Minimal pinned base", "+ Multi-stage + non-root USER", "+ Scan and sign digest"],
        metrics: { image: good("signed + scanned"), runtime: warn("still need run flags"), defense: good("CI gates") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("CI build", "git")]),
            registry: registry([green("private + signed", "stamp")]),
            image: image([green("distroless, USER 65532", "shieldCheck")]),
            runtime: runtime([], { dim: 0.55 }),
            card: card(upLeft(), "Build checklist", ["pin base @sha256", "multi-stage; no gcc in final", "USER non-root", "scan + SBOM + sign", "block critical CVE deploys"], { icon: "package" }),
          },
          links: {
            cr: both("client", "registry", { label: "push digest" }),
            ri: both("registry", "image", { label: "signed" }),
          },
          flows: [flow("cr", "mine", { rate: 0.6 }), rt("ri", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Run harden",
        chapter: "solution",
        title: "Lock down what the process can do at run",
        body: [
          "At runtime: no privileged, no docker.sock, read-only root filesystem with explicit writable tmp volumes, drop all capabilities and add back only what you need, apply seccomp and AppArmor/SELinux profiles, and hide the host network namespace unless required.",
          "Resource limits (CPU, memory, PIDs) blunt noisy neighbor and some fork bombs. Combine with non-root so a bug stays a container bug longer.",
        ],
        callout: { kind: "insight", text: "Runtime flags are policy. If the orchestrator does not enforce them, developers will bypass them." },
        changes: ["+ readOnlyRootFilesystem", "+ drop ALL caps", "+ seccomp / no privileged"],
        metrics: { image: good("clean"), runtime: good("restricted"), defense: good("runtime policy") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("orchestrator policy", "clipboard")]),
            image: image([green("non-root image", "user")]),
            runtime: runtime([green("ro root, seccomp, no sock", "shieldCheck")]),
            secret: secret([green("tmpfs inject only", "keyhole")]),
            card: card(upLeft(-440), "Run flags", ["privileged: false", "readOnlyRootFilesystem: true", "capabilities.drop: [ALL]", "seccompProfile: RuntimeDefault", "no docker.sock / hostPath /"], { icon: "shield" }),
          },
          links: {
            ai: both("client", "image"),
            ir: both("image", "runtime"),
            rs: both("runtime", "secret", { label: "runtime secret" }),
          },
          flows: [flow("ai", "mine", { rate: 0.5 }), rt("ir", "req", { rate: 0.5, delay: 0.4 }), flow("rs", "secret", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Admit",
        chapter: "solution",
        title: "Admit only signed, policy-clean workloads",
        body: [
          "Admission controllers / policy engines reject pods that ask for privileged, hostPath, or runAsRoot. Image signature verification rejects digests that were not built by your pipeline. Together they stop \"just for debug\" YAML from reaching the node.",
          "This is the enforcement layer that makes build and run checklists real. Without it, security is a wiki page.",
        ],
        callout: { kind: "tip", text: "Name Kyverno, OPA/Gatekeeper, or cloud equivalents as the enforcement point, then describe the rules." },
        changes: ["+ Signature verify on admit", "+ Deny privileged / root", "+ Audit then enforce"],
        metrics: { image: good("signed only"), runtime: good("policy enforced"), defense: good("admission") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: attacker([red("kubectl apply privileged", "terminal")]),
            image: image([amber("unsigned tag:latest", "alert")]),
            runtime: runtime([green("admission deny", "ban")]),
            registry: registry([green("cosign verify ok only", "stamp")]),
            card: card(upLeft(), "Admission gates", ["verify cosign / notation sig", "deny privileged + hostPath", "require runAsNonRoot", "deny :latest", "= audit mode, then enforce"], { icon: "stamp" }),
          },
          links: {
            ci: both("client", "image", { labelTone: "red" }),
            ir: both("image", "runtime", { label: "denied", labelTone: "red", fail: 0.5 }),
          },
          flows: [flow("ci", "poison", { rate: 0.6 }), flow("ir", "poison", { rate: 0.55, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Runtime detection for what policy missed",
        body: [
          "Even with good baselines, watch for unexpected process trees, outbound beacons, crypto miners, and writes to sensitive paths. eBPF-based sensors and Falco-style rules catch behavior that static admission cannot see.",
          "Feed alerts with image digest and service identity so IR can quarantine the right workload and revoke the right cloud role.",
        ],
        callout: { kind: "insight", text: "Prevention narrows the window. Detection covers the rest." },
        changes: ["+ Behavioral rules", "+ Alert with digest + identity", "+ Quarantine playbook"],
        metrics: { image: good("known"), runtime: warn("anomaly possible"), defense: good("detect + respond") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("SOC / on-call", "bell")]),
            image: image([note("digest abc", "container")]),
            runtime: runtime([amber("unexpected shell / miner", "radar")], { heat: 0.25 }),
            secret: secret([green("role revoked in IR", "ban")], { label: ["IR", "revoke"] }),
            card: card(upLeft(), "Runtime signals", ["unexpected shell in app image", "outbound to mining pool", "write to /proc or docker.sock", "= alert includes digest + SA", "# quarantine + revoke cloud role"], { icon: "radar" }),
          },
          links: {
            ir: both("image", "runtime"),
            rc: both("runtime", "client", { label: "alert" }),
            rs: both("runtime", "secret", { label: "revoke" }),
          },
          flows: [flow("ir", "poison", { rate: 0.45 }), flow("rc", "req", { rate: 0.5, delay: 0.4 }), flow("rs", "empty", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: secure the box and the way it runs",
        body: [
          `<table class="compare">
            <thead><tr><th>Layer</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Base</td><td>Minimal, pinned, scanned, signed</td></tr>
              <tr><td>Secrets</td><td>Never in layers; runtime inject</td></tr>
              <tr><td>User</td><td>Non-root, drop caps, ro rootfs</td></tr>
              <tr><td>Danger</td><td>No privileged, no docker.sock</td></tr>
              <tr><td>Enforce</td><td>Admission + signature verify</td></tr>
              <tr><td>Detect</td><td>Runtime behavior + IR revoke</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: attack story (CVE -> root -> sock -> host) then the four-word harden list: non-root, read-only, drop-caps, admit-signed.",
        ],
        callout: { kind: "next", text: "Next: <b>Kubernetes Security Hardening</b> for cluster RBAC, network policy, and pod security at scale." },
        metrics: { image: good("trusted digest"), runtime: good("restricted"), defense: good("layered") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("policy deploy", "check")]),
            image: image([green("signed non-root", "shieldCheck")]),
            runtime: runtime([green("locked down", "lock")]),
            registry: registry([green("private", "package")]),
          },
          links: {
            cr: both("client", "registry"),
            ri: both("registry", "image"),
            ir: both("image", "runtime"),
          },
          flows: [flow(["cr", "ri"], "mine", { rate: 0.5 }), rt("ir", "req", { rate: 0.45, delay: 0.5 })],
        },
      },
    ],
  });
})();
