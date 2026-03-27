# IDOR (Insecure Direct Object Reference) – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing with explicit written permission. IDOR testing must respect data privacy – always use test accounts and non‑sensitive data where possible.**

---

## 1. Scope & Access Control Model

- **Understand how the app models access:**
  - Tenants, organizations, projects, accounts, users.
  - Roles and permissions (admin, manager, user, support).
- **Identify object types that should be access‑controlled:**
  - User profiles, orders, invoices, tickets, documents, messages.
  - Configuration objects (API keys, webhooks, policies).
  - Cross‑tenant or cross‑customer data.
- **Clarify test identities:**
  - At least two normal users in the same tenant.
  - Users in different tenants/customers.
  - Admin or support accounts (if applicable).

---

## 2. Mapping Object References

Use a proxy while exploring the application as different users and record:

- **Where object identifiers appear:**
  - Path parameters: `/users/123`, `/org/456/projects/789`.
  - Query parameters: `?userId=123`, `?account=abc`.
  - Request bodies and JSON fields containing IDs.
  - Indirect identifiers (UUIDs, slugs, tokens).
- **How references are used:**
  - View, update, delete operations.
  - Relationship operations (sharing, assigning, transferring).
  - Bulk operations (batch updates, reports, exports).

Build a mapping of:

- Object type → endpoints that act on that object → ID/identifier fields involved.

---

## 3. Assessment Strategy (Multi‑User Testing)

IDOR assessment requires **comparing behavior across multiple users**.

- **Create at least two test accounts per role:**
  - Users in the same tenant (e.g., same organization).
  - Users in different tenants/customers.
- **Populate them with distinct data:**
  - Each user creates separate resources (tickets, orders, documents, etc.).
  - Label data clearly so you can distinguish ownership in responses.

For each object‑handling endpoint:

- Observe the request made by **User A** to act on **User A’s** resource.
- Attempt conceptually equivalent operations where:
  - **User B** uses identifiers belonging to **User A**.
  - **User A** uses identifiers belonging to **User B**.
  - Where applicable, a lower‑privileged role uses IDs of higher‑privileged resources.

---

## 4. Dynamic Testing – What to Look For

When modifying identifiers in requests:

- **Positive expectations:**
  - The server enforces authorization based on the authenticated user and context.
  - Attempts to access or modify another user’s resource are rejected (e.g., 403 / access denied).
  - Error messages reveal minimal information about other users’ data.
- **IDOR indicators:**
  - Being able to:
    - View details of another user’s resource.
    - Modify or delete another user’s resource.
    - Perform actions on behalf of other users (e.g., approve, cancel, transfer).
  - Responses that include:
    - Data clearly belonging to another account/customer.
    - Aggregated or cross‑tenant data not intended for the current user.

Focus on:

- Path, query, and body parameters controlling **which object** is targeted.
- Cases where multiple identifiers are present and only some are validated.

---

## 5. High‑Risk Scenarios

Prioritize:

- **Multi‑tenant boundaries:**
  - Any place where IDs contain or imply tenant/customer information.
  - Admin/support tools that can act on resources across tenants.
- **Financial / sensitive records:**
  - Invoices, payment methods, bank details, personal records.
- **Workflow / approval actions:**
  - Approve/reject tickets, change order status, modify permissions.
- **File and document access:**
  - Download endpoints (`/files/{id}/download`, `/reports/{id}`).
  - Pre‑signed URLs or tokens for document access.

---

## 6. Tooling & Techniques

- **Proxy tooling (ZAP/Burp):**
  - Record baseline requests for each operation as different users.
  - Use features like “parameterized replays” or manual modification to swap identifiers.
  - Cluster endpoints by path pattern to ensure coverage.
- **Automation (conceptual, not production‑level):**
  - In a test environment, scripts may:
    - Reuse captured requests and systematically replace IDs with those belonging to other users.
    - Compare responses to check for unauthorized access.

Always coordinate automated testing to avoid overwhelming shared environments.

---

## 7. Verifying Exploitability Safely

To confirm an IDOR:

- Show that a low‑privileged test user can:
  - See details of resources they do not own.
  - Update or delete resources belonging to another test user or tenant.
- Use only **test accounts and synthetic data**:
  - Avoid real customer data or production secrets.
  - Mask or anonymize data in reports and screenshots.

Document:

- Exact requests (method, path, parameters) used by the unauthorized user.
- Clear evidence that the resource belongs to another identity.

You do not need to perform harmful actions in production (like deleting real records) to prove IDOR – demonstrating unauthorized read or harmless state change in a test environment is sufficient.

---

## 8. Reporting & Risk Assessment

For each IDOR issue, capture:

- Affected endpoint(s) and HTTP methods.
- Object types involved (e.g., order, ticket, document).
- Roles and tenants of:
  - The unauthorized actor (e.g., normal user).
  - The victim/resource owner (e.g., another customer, admin).
- Scope:
  - Single resource vs broad enumeration risk.
  - Whether bulk operations or listings leak cross‑tenant data.
- Impact:
  - Read access to confidential data.
  - Ability to modify/delete other users’ resources.
  - Potential escalation to full‑tenant compromise.

Assign severity based on:

- Sensitivity of data or operations.
- Ease of discovering and exploiting the issue.
- Number of users/resources potentially affected.

---

## 9. Remediation Guidance

Recommend that developers:

- **Enforce server‑side authorization for every object access:**
  - Check ownership or access rights based on the authenticated user and context.
  - Never rely solely on client‑side logic to hide or filter data.
- **Use indirect references where appropriate:**
  - Replace raw database IDs with opaque references (e.g., securely generated tokens).
  - Ensure that opaque IDs are still validated against the current user’s permissions.
- **Normalize access control patterns:**
  - Centralize authorization checks in well‑tested middleware or access control layers.
  - Use consistent helper functions instead of ad‑hoc checks scattered across code.
- **Reduce information leakage:**
  - Avoid verbose error messages revealing whether a resource exists for other tenants.
- **Logging and monitoring:**
  - Log access control failures and unusual cross‑tenant access attempts.

---

## 10. Re‑Testing Checklist

After fixes:

- [ ] Re‑test previously vulnerable endpoints:
  - [ ] Confirm unauthorized users are rejected with clear access‑denied behavior.
  - [ ] Ensure legitimate access still works for authorized users.
- [ ] Attempt cross‑tenant and cross‑user ID swaps again.
- [ ] Review new or refactored endpoints for consistent use of access control helpers.
- [ ] Update:
  - [ ] Threat models to reflect corrected access control assumptions.
  - [ ] Secure coding & review checklists with IDOR‑specific guidance.

