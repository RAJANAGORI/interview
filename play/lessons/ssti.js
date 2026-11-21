(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Hello", "App"], glyph: "code", tags }, o));
  const engine = (tags = [], o = {}) => block(0, 8, Object.assign({ label: ["Jinja2", "engine"], glyph: "cog", color: "purple", tags }, o));
  const shell = (tags = [], o = {}) => block(12, -2, Object.assign({ s: 3.6, h: 34, label: ["OS", "shell"], glyph: "terminal", color: "red", tags, pills: "below" }, o));
  const upLeft = (dx = -420, dy = -190) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "GET /hello?name=") => both(who, "app", { label, labelAt: 0.5, labelSide: "below" });
  const render = (label = "Template(source).render()", o = {}) => both("app", "engine", Object.assign({ label, labelAt: 0.55, labelSide: "below" }, o));
  const exec = (o = {}) => both("engine", "shell", Object.assign({ label: "subprocess / os.popen", labelTone: "red", labelAt: 0.5 }, o));

  SD.lesson({
    id: "server-side-template-injection-ssti",
    title: "Server-Side Template Injection (SSTI)",
    summary: "User input concatenated into template source becomes server-side code: how to probe it, reach RCE, and why context variables are the fix.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "input", label: "User input treated as", icon: "code" },
      { id: "impact", label: "Attacker gets", icon: "terminal" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "template expression"], ["secret", "RCE / data"], ["req", "render"], ["res", "HTML"], ["empty", "blocked"]],
    goals: [
      { text: "Template source vs template context", step: 0 },
      { text: "Probe payloads like {{7*7}}", step: 1 },
      { text: "RCE through the object graph", step: 2 },
      { text: "Why SSTI is not XSS", step: 4 },
      { text: "Pass variables; never build source", step: 5 },
      { text: "Sandbox limits and debug endpoints", step: 6 },
    ],
    steps: [
      {
        short: "Concat",
        chapter: "setup",
        title: "Building the template from the query string",
        body: [
          "A greeting endpoint does the obvious thing: <code>Template(\"Hello \" + name).render()</code>. Alice visits <code>/hello?name=Ada</code> and sees <code>Hello Ada</code>. Jinja2, Twig, Freemarker, Velocity, ERB and Razor all have the same footgun when developers treat templates like string formatters.",
          "Two channels exist. The <span class=\"term\">context</span> is data the engine substitutes safely (<code>render(name=name)</code>). The <span class=\"term\">source</span> is code the engine compiles. Concatenating user input into the source means the attacker writes template code, not a name.",
        ],
        callout: { kind: "insight", text: "One-liner for interviews: user data is data, not template code. Bind variables; do not compose source." },
        metrics: { input: warn("concatenated into source"), impact: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("?name=Ada", "user")]),
            app: app([amber("Template(\"Hello \" + name)", "code")]),
            engine: engine([note("compiles then renders", "cog")]),
            shell: shell([], { dim: 0.5 }),
            card: card(upLeft(), "Vulnerable pattern", ["name = request.args[\"name\"]", "Template(\"Hello \" + name).render()", "! name is inside the source string", "= Template(\"Hello {{ name }}\")", "=   .render(name=name)"], { icon: "code" }),
          },
          links: { ua: ask("alice", "GET /hello?name=Ada"), re: render() },
          flows: [flow("ua", "mine", { rate: 0.7 }), rt("re", "req", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Probe",
        chapter: "attack",
        title: "Probe: does the server evaluate expressions?",
        body: [
          "Authorized testing starts with math. Send <code>{{7*7}}</code> (Jinja/Twig), <code>${7*7}</code> (Freemarker/Velocity), <code>&lt;%= 7*7 %&gt;</code> (ERB) or <code>@(7*7)</code> (Razor). If the response contains <code>49</code> where the name should be, the engine evaluated the expression on the server.",
          "Engine fingerprinting follows: error messages, preferred delimiters and object names (<code>config</code>, <code>self</code>, <code>_context</code>). Blind cases still work with time delays or out-of-band callbacks once you know the dialect.",
        ],
        callout: { kind: "tip", text: "A reflected 49 is SSTI. A reflected <code>{{7*7}}</code> unchanged is usually XSS territory or plain reflection, not template evaluation." },
        changes: ["- Payload {{7*7}} in name", "- Response shows 49", "~ Engine dialect identified"],
        metrics: { input: bad("evaluated as code"), impact: warn("expression exec"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("?name={{7*7}}", "terminal")]),
            app: app([red("builds Template(source)", "alert")]),
            engine: engine([red("renders 49", "zap")]),
            shell: shell([], { dim: 0.5 }),
            card: card(upLeft(), "Probe cheatsheet", ["Jinja/Twig     {{7*7}}", "Freemarker     ${7*7}", "ERB           <%= 7*7 %>", "Razor         @(7*7)", "= 49 in the body => SSTI"], { icon: "search" }),
          },
          links: { ua: ask("client", "GET /hello?name={{7*7}}"), re: render("evaluates 7*7") },
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("re", "poison", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "RCE",
        chapter: "attack",
        title: "From expression to a shell",
        body: [
          "Template engines expose objects for real apps: config, request, lipsum, cycler. Through Python's MRO you can often reach <code>__builtins__</code> and <code>os.popen</code> or <code>subprocess.Popen</code>. Freemarker and Velocity have Execute/object constructors. The greeting endpoint becomes remote code execution as the web user.",
          "Impact is classic RCE: read secrets, pivot inside the VPC, drop a reverse shell. Sandboxes slow this down; they rarely stop a determined chain if the engine version is known.",
        ],
        callout: { kind: "warn", text: "Treat confirmed SSTI as RCE for severity, even before you land a shell. The path is well documented." },
        changes: ["- Object graph walked to os/subprocess", "- Command runs on the server", "- Full RCE as the app user"],
        metrics: { input: bad("template source"), impact: bad("RCE"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("{{ cycler.__init__.__globals__... }}", "terminal")]),
            app: app([red("passes hostile source", "alert")]),
            engine: engine([red("calls os.popen", "cog")], { heat: 0.4 }),
            shell: shell([red("id; cat /etc/passwd", "terminal")], { heat: 0.4 }),
            card: card(upLeft(-440), "RCE sketch (Jinja)", ["{{ self.__init__.__globals__", "    .__builtins__.__import__", "    ('os').popen('id').read() }}", "! engine-specific, but well known", "# severity: treat as RCE"], { icon: "terminal" }),
          },
          links: { ua: ask("client", "GET /hello?name={{...}}"), re: render("hostile source"), sh: exec() },
          flows: [flow("ua", "poison", { rate: 0.6 }), rt("re", "poison", { rate: 0.6, delay: 0.4 }), rt("sh", "poison", { rate: 0.6, back: "secret", delay: 0.9 })],
        },
      },
      {
        short: "Engines",
        chapter: "technique",
        title: "Know the engine names in interviews",
        body: [
          "Interviewers expect the common list: Jinja2 (Python/Flask), Twig (PHP), Freemarker and Velocity (Java), ERB (Ruby), Razor (ASP.NET), Liquid (Shopify), Smarty. Each has different delimiters and escape hatches, but the root bug is identical.",
          "Framework defaults sometimes protect you (Flask's <code>render_template(file, **ctx)</code> keeps source on disk). The bug appears when someone reaches for <code>render_template_string</code>, <code>Template(user)</code>, or a \"custom email subject\" feature that compiles a string.",
        ],
        callout: { kind: "tip", text: "Code review grep: Template(, render_template_string, Freemarker Configuration, Velocity.evaluate, Razor.Parse." },
        changes: ["~ Engine varies by stack", "- Same bug: user input in source", "+ Grep for compile-from-string APIs"],
        metrics: { input: warn("depends on API used"), impact: warn("RCE if source"), defense: warn("review those APIs") },
        scene: {
          entities: {
            alice: alice([note("normal request", "user")]),
            app: app([note("Flask / Spring / Rails / .NET", "layers")]),
            engine: engine([amber("Jinja Twig Freemarker ERB...", "list")]),
            card: card(upLeft(-430), "Where it shows up", ["render_template_string(user)", "new Template(userInput)", "email subject templates", "PDF/HTML report builders", "\"theme\" editors for power users"], { icon: "list" }),
          },
          links: { ua: ask("alice", "GET /hello?name=Ada"), re: render("file-based template OK") },
          flows: [flow("ua", "mine", { rate: 0.7 }), rt("re", "req", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Not XSS",
        chapter: "insight",
        title: "SSTI is server execution, not browser script",
        body: [
          "XSS runs in the victim's browser under your origin. SSTI runs on the server while building the response. The probe can look similar (<code>{{...}}</code> appears in both worlds), which is why candidates mix them up.",
          "Distinction: if <code>{{7*7}}</code> becomes <code>49</code> in the HTML before it reaches the browser's JS engine, that evaluation happened server-side. XSS would leave the braces alone unless a client template library evaluates them later (which is a different bug).",
        ],
        callout: { kind: "insight", text: "Same characters, different machine. Name which process evaluated the expression." },
        changes: ["~ XSS: browser executes", "~ SSTI: server executes", "= Probe math tells them apart"],
        metrics: { input: bad("server-side code"), impact: bad("server RCE"), defense: warn("don't confuse with XSS") },
        scene: {
          entities: {
            client: mallory([red("{{7*7}} payload", "code")]),
            app: app([red("server returns 49", "server")]),
            engine: engine([note("evaluated here", "cog")]),
            card: card(upLeft(-420), "SSTI vs XSS", ["SSTI  server process runs it", "XSS   browser runs script", "probe {{7*7}} -> 49  => SSTI", "probe stays literal      => not SSTI", "# client-side templating is another case"], { icon: "split" }),
          },
          links: { ua: ask("client", "GET /hello?name={{7*7}}"), re: render("49 baked into HTML") },
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("re", "poison", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Fix",
        chapter: "solution",
        title: "Pass context variables, never build source",
        body: [
          "The fix matches the vulnerable one-liner in reverse: <code>Template(\"Hello {{ name }}\").render(name=name)</code> or, better, a file on disk via <code>render_template(\"hello.html\", name=name)</code>. The engine substitutes <code>name</code> as data. Characters like <code>{</code> never become syntax.",
          "Autoescaping helps XSS inside the value; it does not fix SSTI, because SSTI happens earlier at compile time. If a product truly needs user-designed templates, run a locked-down subset in a separate sandbox process with no secrets and no network.",
        ],
        callout: { kind: "tip", text: "Show both the bad and good Python in interviews. It takes ten seconds and proves you have fixed it." },
        changes: ["+ Fixed source with {{ name }}", "+ name passed as context", "~ User braces are inert data"],
        metrics: { input: good("context data only"), impact: good("no code exec"), defense: good("bind variables") },
        scene: {
          entities: {
            client: mallory([red("?name={{7*7}}", "terminal")]),
            app: app([green("render(..., name=name)", "shieldCheck")]),
            engine: engine([green("prints literal {{7*7}}", "check")]),
            shell: shell([green("never called", "ban")], { dim: 0.4 }),
            card: card(upLeft(-430), "Fixed pattern", ["Template(\"Hello {{ name }}\")", "  .render(name=name)", "# or render_template(\"hello.html\", ...)", "= {{7*7}} is just text now", "! autoescape != SSTI fix"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("client", "GET /hello?name={{7*7}}"), re: render("safe context render") },
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("re", "req", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Sandbox",
        chapter: "tradeoff",
        title: "Sandboxes help; they are not the primary fix",
        body: [
          "Jinja2's <code>SandboxedEnvironment</code> blocks many attribute accesses. Freemarker has a similar sandbox. Escapes keep appearing as researchers find new chains, especially on older versions. Use sandboxes as defense in depth after you stop compiling untrusted source.",
          "Also delete debug features: template playgrounds, \"preview this email\", staging routes that render arbitrary strings. Those exist specifically to compile source from input and are SSTI as a service.",
        ],
        callout: { kind: "warn", text: "A sandbox around Template(user_input) is still the wrong architecture. Prefer never compiling user input." },
        changes: ["+ Sandbox as a second layer", "- Escapes still published", "+ Remove debug render endpoints"],
        metrics: { input: warn("still source, sandboxed"), impact: warn("escape risk"), defense: warn("sandbox only") },
        scene: {
          entities: {
            client: mallory([red("sandbox escape chain", "bug")]),
            app: app([amber("SandboxedEnvironment", "filter")]),
            engine: engine([amber("mostly blocked", "shield")]),
            shell: shell([green("blocked today", "ban")]),
            card: card(upLeft(-430), "Defense in depth", ["1. never Template(user)", "2. then sandbox if you must", "3. remove /debug/render routes", "! sandbox escapes are routine", "= primary fix is architecture"], { icon: "filter" }),
          },
          links: { ua: ask("client"), re: render("sandboxed compile"), sh: exec({ fail: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.6 }), rt("re", "poison", { rate: 0.6, delay: 0.4 }), flow("sh", "poison", { rate: 0.5, delay: 0.9, blocked: true })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Find it in code review and CI",
        body: [
          "SAST rules and semgrep patterns catch <code>Template(</code>, <code>render_template_string</code>, and their cousins. Code review questions: \"Is this string ever compiled as a template?\" and \"Can any caller influence it?\"",
          "Dynamic tests send the math probes to every reflective parameter and to email/PDF features. tplmap is dated but the methodology is not: identify the engine, then confirm impact in an authorized lab.",
        ],
        callout: { kind: "tip", text: "Add a CI regression: a request with <code>{{7*7}}</code> must not return 49." },
        changes: ["+ Semgrep / SAST on template APIs", "+ Probe reflective parameters", "+ CI asserts no evaluation"],
        metrics: { input: good("reviewed"), impact: good("caught in CI"), defense: good("SAST + tests") },
        scene: {
          entities: {
            alice: alice([note("PR adds a greeting", "git")]),
            app: app([green("SAST clean", "listChecks")]),
            engine: engine([note("file-based templates only", "file")]),
            card: card(upLeft(-420), "Review checklist", ["grep Template( / render_template_string", "email/PDF preview features", "CI: {{7*7}} must not become 49", "no anonymous /debug/render", "# authorized probes in staging"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "GET /hello?name=Ada"), re: render("disk template") },
          flows: [flow("ua", "mine", { rate: 0.7 }), rt("re", "req", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: data in, source closed",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Bug</td><td>User input concatenated into template source</td></tr>
              <tr><td>Probe</td><td>{{7*7}} / ${7*7} returns 49</td></tr>
              <tr><td>Impact</td><td>Server-side RCE via object graph</td></tr>
              <tr><td>Not XSS</td><td>Different process evaluates the expression</td></tr>
              <tr><td>Fix</td><td>Context variables or file templates only</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: show the vulnerable Template(user) line, the {{7*7}} probe, RCE severity, then the render(name=name) fix. Mention sandboxes as secondary.",
        ],
        callout: { kind: "next", text: "Pair with <b>XXE</b> and <b>SQL injection</b>: all three are \"attacker data becomes code\" with different interpreters." },
        metrics: { input: good("context only"), impact: good("none"), defense: good("safe render") },
        scene: {
          entities: {
            alice: alice([note("?name=Ada", "user")]),
            app: app([green("context render only", "shieldCheck")]),
            engine: engine([green("no user source", "check")]),
            shell: shell([green("quiet", "ban")], { dim: 0.4 }),
          },
          links: { ua: ask("alice", "GET /hello?name=Ada"), re: render("Hello {{ name }}") },
          flows: [flow("ua", "mine", { rate: 0.7 }), rt("re", "req", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
    ],
  });
})();
