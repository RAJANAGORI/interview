## SAST Tools and Automation

Static analysis reads source code without running it and flags patterns like the ones in this guide: `shell=True`, `verify=False`, `InsecureSkipVerify: true`, a signing key sitting in a string literal. It's very good at finding the same mistake in 300 places. It's very bad at knowing that `/admin/export` should require an admin. Treat its output as a list of leads for review, and treat a clean scan as "no known patterns found," never as "secure."

### Where SAST fits in CI

Run it on every pull request, diff-aware where the tool supports it, so authors see only the findings their change introduced while the code is still fresh in their heads. A full scan of the main branch nightly or weekly catches what new rules find in old code. Fail the build only on high-confidence, high-severity rules, such as a hardcoded cloud key or TLS verification turned off. A gate that blocks on every medium finding gets disabled within a month.

Everything else lands in a queue that someone owns. Review each finding, decide whether attacker input can actually reach the sink, and prioritize by exploitability and exposure rather than the tool's severity label. False positives get documented and suppressed in the code, with a reason: `# nosec B602` for Bandit, `// #nosec G402 -- test-only client` for gosec, `# nosemgrep: rule-id` for Semgrep. The suppression then goes through code review like any other change, and grepping for `nosec` gives you an audit list. Keep the tools and rule packs current, too. Pin versions in CI so builds are reproducible, then bump them on a schedule, since new rules are how you catch new APIs and new bug classes.

### Manual review vs automated tools

Tools win on known patterns: dangerous functions, missing flags, weak algorithms, and tainted data reaching a sink inside the call graph they can follow. People win on business logic. Think of an IDOR where the query is parameterized but never checks ownership, a refund endpoint that pays out twice when called concurrently, a multi-step flow where step three trusts whatever step one stored, or a crypto helper whose "random" IV turns out to be a constant defined two files away. Data that crosses a queue or another service usually drops out of a scanner's view as well.

So use both, in that order. Let the tools clear the obvious findings so reviewer time goes to authorization, state, and trust boundaries. Then close the loop: when manual review finds a bug with a recognizable shape, write a rule for it so the same bug can't come back quietly.

### Tools by language

| Language | Tools |
| --- | --- |
| Python | Bandit, Semgrep |
| Go | gosec, govulncheck, staticcheck |
| Node.js | eslint-plugin-security, njsscan, Semgrep |
| Ruby | Brakeman |
| Any | CodeQL, SonarQube, Checkmarx, Veracode |

Bandit and gosec are the quickest wins. Bandit flags `shell=True` (B602) and `verify=False` (B501); gosec flags hardcoded credentials (G101) and weak TLS settings (G402). govulncheck works differently from the rest: it checks your dependencies against the Go vulnerability database and reports a CVE only when your code actually reaches the vulnerable function, which cuts a lot of the noise you get from plain dependency scanners. staticcheck is a correctness linter more than a security tool, but it catches the ignored errors and dead branches where bugs like to hide. On the Node side, eslint-plugin-security runs inside the linter developers already have open, and njsscan adds checks aimed at Express apps. Brakeman is built for Rails. CodeQL, SonarQube, Checkmarx, and Veracode cover many languages and trace dataflow across files, at the cost of slower scans and more tuning.

### Writing a custom rule

Semgrep rules look like the code they match, which makes them the fastest way to encode a bug you found by hand. This one flags the pattern from Command injection: a `subprocess` call with `shell=True`.

```yaml
rules:
  - id: python-subprocess-shell-true
    languages: [python]
    severity: ERROR
    message: >-
      subprocess called with shell=True. If any part of the command comes from
      user input, this is command injection. Pass an argument list and drop
      shell=True (see Command injection).
    pattern-either:
      - pattern: subprocess.run(..., shell=True, ...)
      - pattern: subprocess.call(..., shell=True, ...)
      - pattern: subprocess.check_call(..., shell=True, ...)
      - pattern: subprocess.check_output(..., shell=True, ...)
      - pattern: subprocess.Popen(..., shell=True, ...)
```

Commit rules like this to the repo (a `.semgrep/` directory works) and run them with `semgrep --config .semgrep/` locally and in the same CI job as the stock rule packs. It'll also match commands built entirely from constants. If that gets noisy, wrap it in a `patterns:` block with a `pattern-not` for string literals, and what's left is worth reading.

---
