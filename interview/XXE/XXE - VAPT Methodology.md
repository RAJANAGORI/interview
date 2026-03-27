# XXE (XML External Entity) – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing with explicit permission. XXE testing can involve parsing crafted XML; always use test systems and avoid accessing real internal resources.**

---

## 1. Scope & XML Usage Overview

- **Identify where XML is used:**
  - API endpoints accepting XML payloads (SOAP, REST, legacy integrations).
  - File upload formats (XML configuration files, data imports, SAML, etc.).
  - Third‑party integrations that rely on XML under the hood.
- **Determine XML parsers & libraries:**
  - Programming language and framework.
  - Default parser configurations (external entity resolution, DTD support).
- **Trust boundaries:**
  - Which XML inputs are from untrusted vs trusted sources.
  - Whether XML from untrusted sources is ever passed to privileged components.

---

## 2. Mapping XML Entry Points

Using a proxy and/or code review, map:

- **Endpoints / features that consume XML:**
  - SOAP or REST endpoints with `Content-Type: application/xml` or similar.
  - Uploads of XML‑based configuration or data files.
  - Authentication or SSO flows using XML‑based tokens (e.g., SAML) – with extra care.
- **Downstream usage:**
  - Where parsed XML data goes:
    - Data storage.
    - Configuration processing.
    - Calls to other services.

Document each XML entry point with:

- Path, method, and content type.
- Authentication/authorization requirements.
- Expected XML structure (if documented).

---

## 3. Parser Configuration Analysis (White‑/Gray‑Box)

Where code or configuration is accessible, review:

- **Parser settings:**
  - Whether external entity resolution (XXE) is enabled or disabled.
  - Whether DTDs are allowed.
  - Limits on entity expansion, recursion, and resource consumption.
- **Library defaults:**
  - Some older libraries are vulnerable by default.
  - Modern libraries/frameworks often have safer defaults but can be misconfigured.
- **Global vs per‑call settings:**
  - Are secure parser settings consistently applied everywhere?
  - Any legacy paths still using insecure parser configurations?

This analysis often reveals XXE risk without needing aggressive dynamic testing.

---

## 4. Dynamic Testing – High‑Level Approach

In a dedicated test environment where permitted:

- **Craft benign XML variations:**
  - Include or omit DTD declarations.
  - Use internal entities and observe parser behavior.
  - Intentionally malformed XML to see error handling.
- **Observe responses:**
  - Whether the application:
    - Accepts or rejects XML with DTDs.
    - Shows errors indicating entity expansion or DTD processing.
    - Logs or exposes parsing details in responses.

Do **not** attempt to access real sensitive files or internal resources; instead:

- Use **synthetic paths and test files** under your control.
- Coordinate with system owners if testing interaction with local or network resources.

---

## 5. Common XXE Risk Patterns

Indicators of higher risk include:

- Parsers configured with:
  - External entity resolution enabled.
  - DTDs allowed with no further restrictions.
- Application behavior such as:
  - Accepting arbitrary user‑supplied XML without schema validation.
  - Parsing XML from untrusted sources and passing it to sensitive components.
  - Deserializing XML into complex object graphs without hardening.

High‑risk scenarios:

- XML inputs that can influence:
  - File system access by the parser.
  - Network calls made during entity resolution.
  - Memory or CPU consumption via excessive entity expansion (billion‑laughs‑like conditions).

---

## 6. Tooling & Aids

- **Proxy tooling:**
  - Capture and replay XML requests with controlled, benign modifications.
  - Inspect server responses and error messages.
- **XML editing tools:**
  - Editors that help you construct valid/invalid XML variants.
- **Static analysis & configuration review:**
  - Search for parser instantiation points and their settings.
  - Check framework or container configuration files for XML parsing options.

---

## 7. Verifying Exploitability Safely

To demonstrate XXE risk in a safe way:

- **In a test environment under coordination:**
  - Show that the parser:
    - Processes DTDs or external entities when it should not.
    - Attempts to access a harmless, test‑only local or network resource explicitly set up for this purpose.
  - Observe logs or controlled output confirming that entity resolution occurred.
- **Without directly accessing sensitive resources:**
  - Focus on proving that the configuration allows potentially dangerous behavior.
  - Keep payloads and targets restricted to non‑sensitive test assets.

You can frequently rely on configuration and error behavior to show risk, rather than pushing to maximum impact.

---

## 8. Reporting & Risk Assessment

For each XXE‑related issue, record:

- XML entry point and purpose.
- Parser/library in use and its configuration.
- Conditions under which entities or DTDs are processed.
- Observed behaviors indicating:
  - External entity resolution.
  - Resource exhaustion risk.
  - Unexpected file or network access attempts (in test).
- Potential impact in production:
  - Exposure of local files.
  - Access to internal services via SSRF‑like behavior.
  - Denial of service via entity expansion.

Assess severity based on:

- Sensitivity of resources potentially exposed.
- Likelihood that untrusted XML can be supplied.
- Presence of mitigating controls (e.g., strict schema validation, sandboxing).

---

## 9. Remediation Guidance

Recommend that developers and platform teams:

- **Harden XML parsers:**
  - Disable external entity resolution.
  - Disable DTD processing unless strictly required and safely controlled.
  - Set reasonable limits on input size, entity expansion, and recursion.
- **Use safe data formats where possible:**
  - Prefer JSON or other simpler formats for untrusted input when feasible.
- **Apply schema validation:**
  - Validate XML against strict schemas where necessary, rejecting unexpected constructs.
- **Isolate XML processing:**
  - Run XML parsing in constrained, sandboxed components with minimal privileges.
- **Keep dependencies updated:**
  - Use up‑to‑date parser libraries with secure defaults and documented hardening guides.

---

## 10. Re‑Testing Checklist

After fixes:

- [ ] Confirm that XML entry points:
  - [ ] Reject or safely ignore DTDs and external entity declarations where unnecessary.
  - [ ] Enforce size and complexity limits.
- [ ] Validate parser configuration:
  - [ ] External entity processing and DTD support are disabled or tightly constrained.
  - [ ] Configuration is consistent across all XML parsing paths.
- [ ] Repeat benign XML variation tests to verify:
  - [ ] No unexpected entity resolution occurs.
  - [ ] Errors and logs do not leak sensitive parser internals.
- [ ] Update:
  - [ ] Secure coding guidelines for XML handling.
  - [ ] Architecture docs describing safe XML parsing patterns.

