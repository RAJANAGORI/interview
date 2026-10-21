## Authorization Review

Authentication tells you who's calling. Authorization decides what they may touch, and that logic is usually smeared across the whole codebase instead of living in one file. Start with the place roles and permissions are defined (a `Role` enum, a permissions table, a policy module), then find the decorators and middleware that enforce them, and only then walk the route table looking for handlers that skip that machinery. In Flask that means `before_request` hooks and custom decorators; in Go, the middleware wrapped around the `ServeMux`; in Express, the `router.use` calls and the order they're registered in.

### Role identification

Every role the app knows about should be defined once, with a clear set of permissions and a record of who granted it. When role names are bare strings compared all over the code, a typo, a capital letter, or a newly added role lands on the wrong side of a check and nobody notices.

> **Where to look:** the role column on the user model, any `roles.py`, `permissions.go`, or `rbac.js`, and the admin screen that assigns roles. Grep for `role ==`, `role !=`, `.role in` (Python), `Role == "` and `Role != "` (Go), and `role === "`, `role !== "`, `roles.includes(` (Node).
>
> **How to think:** Can you list every role, and what each one may do, from the code alone? If you can't, the developers can't either. Is there a hierarchy, and is it written down in one place or implied by a dozen `if` statements? What happens to a role string that no check recognizes: does it get everything or nothing? Who can assign roles, and does each grant and revoke leave an audit record with the actor, the target, and the old and new role?

```python vulnerable
# reports.py
@app.get("/reports")
def reports():
    if current_user.role in ("Admin", "superuser"):  # BUG: the DB stores "admin", and retired "superuser" rows still get in
        return render("reports.html")
    abort(403)


# billing.py
@app.post("/billing/refund")
def refund():
    if current_user.role != "customer":  # BUG: deny-list, so "intern" or a typo like "custmer" can refund
        return issue_refund(request.form["order_id"])
    abort(403)
```

```python fixed
class Role(StrEnum):
    CUSTOMER = "customer"
    SUPPORT = "support"
    MANAGER = "manager"
    ADMIN = "admin"


PERMISSIONS: dict[Role, frozenset[str]] = {  # FIX: one table says which role can do what
    Role.CUSTOMER: frozenset(),
    Role.SUPPORT: frozenset({"refunds:issue"}),
    Role.MANAGER: frozenset({"refunds:issue", "reports:view"}),
    Role.ADMIN: frozenset({"refunds:issue", "reports:view", "users:manage"}),
}


def can(user, permission: str) -> bool:
    try:
        role = Role(user.role)
    except ValueError:  # FIX: a typo or retired role gets nothing
        return False
    return permission in PERMISSIONS[role]


@app.post("/billing/refund")
def refund():
    if not can(current_user, "refunds:issue"):
        abort(403)
    return issue_refund(request.form["order_id"])
```

```go vulnerable
// reports.go
func reports(w http.ResponseWriter, r *http.Request) {
	if role := currentUser(r).Role; role != "Admin" && role != "superuser" { // BUG: DB stores "admin"; retired "superuser" rows still pass
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	renderReports(w)
}

// billing.go
func refund(w http.ResponseWriter, r *http.Request) {
	if currentUser(r).Role == "customer" { // BUG: deny-list, every other string gets through
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	issueRefund(w, r)
}
```

```go fixed
type Role string

const (
	RoleCustomer Role = "customer"
	RoleSupport  Role = "support"
	RoleManager  Role = "manager"
	RoleAdmin    Role = "admin"
)

var permissions = map[Role]map[string]bool{ // FIX: the only place roles map to permissions
	RoleSupport: {"refunds:issue": true},
	RoleManager: {"refunds:issue": true, "reports:view": true},
	RoleAdmin:   {"refunds:issue": true, "reports:view": true, "users:manage": true},
}

func can(u *User, perm string) bool {
	return permissions[Role(u.Role)][perm] // FIX: unknown roles index a nil map and get false
}

func refund(w http.ResponseWriter, r *http.Request) {
	if !can(currentUser(r), "refunds:issue") {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	issueRefund(w, r)
}
```

```javascript vulnerable
// routes/reports.js
router.get("/reports", (req, res) => {
  if (!["Admin", "superuser"].includes(req.user.role)) return res.sendStatus(403); // BUG: DB says "admin"; stale "superuser" rows pass
  res.render("reports");
});

// routes/billing.js
router.post("/billing/refund", async (req, res) => {
  if (req.user.role === "customer") return res.sendStatus(403); // BUG: deny-list, any other string can refund
  await issueRefund(req.body.orderId);
  res.sendStatus(204);
});
```

```javascript fixed
const Role = Object.freeze({ CUSTOMER: "customer", SUPPORT: "support", MANAGER: "manager", ADMIN: "admin" });

const PERMISSIONS = new Map([ // FIX: one table maps roles to permissions
  [Role.CUSTOMER, new Set()],
  [Role.SUPPORT, new Set(["refunds:issue"])],
  [Role.MANAGER, new Set(["refunds:issue", "reports:view"])],
  [Role.ADMIN, new Set(["refunds:issue", "reports:view", "users:manage"])],
]);

function can(user, permission) {
  return PERMISSIONS.get(user.role)?.has(permission) ?? false; // FIX: unknown roles get false, and a Map has no prototype keys
}

router.post("/billing/refund", async (req, res) => {
  if (!can(req.user, "refunds:issue")) return res.sendStatus(403);
  await issueRefund(req.body.orderId);
  res.sendStatus(204);
});
```

### Sensitive and privileged endpoints

Admin panels, money movement, bulk exports, and anything that edits other people's data are where an authorization miss costs the most. Each of those routes needs a guard, and per-route guards get forgotten: the route someone added last sprint is usually the one without it.

> **Where to look:** the route table (`flask routes` prints it), the admin blueprint or router, and anything under `/admin`, `/internal`, `/billing`, or `/export`. Grep for `url_prefix="/admin"`, `@admin_required` (Python), `"/admin/"` and `HandleFunc("GET /admin` (Go), and `"/admin` and `router.use(` (Node).
>
> **How to think:** Build the inventory yourself. Which endpoints move money, change data that isn't the caller's, read sensitive records in bulk, or touch configuration? Then check each one against its guard. When 11 of 12 admin routes carry `@admin_required`, the twelfth is the finding, so count instead of skimming. A group-level guard makes the safe path the default, but still look for admin-flavored routes registered outside the group, like `/api/export-all` or a leftover debug endpoint.

```python vulnerable
admin = Blueprint("admin", __name__, url_prefix="/admin")


@admin.get("/users")
@admin_required
def list_users():
    return render("admin/users.html", users=User.query.all())


@admin.post("/users/<int:user_id>/disable")
@admin_required
def disable_user(user_id):
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@admin.get("/export")  # BUG: added later, and nobody remembered @admin_required
def export_users():
    return send_csv(User.query.all())
```

```python fixed
admin = Blueprint("admin", __name__, url_prefix="/admin")


@admin.before_request
def require_admin():  # FIX: runs before every view on this blueprint, including ones added later
    if not current_user.is_authenticated:
        abort(401)
    if not can(current_user, "admin:access"):
        abort(403)


@admin.get("/users")
def list_users():
    return render("admin/users.html", users=User.query.all())


@admin.post("/users/<int:user_id>/disable")
def disable_user(user_id):
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@admin.get("/export")
def export_users():
    return send_csv(User.query.all())
```

```go vulnerable
func routes(mux *http.ServeMux) {
	mux.Handle("GET /admin/users", requireAdmin(http.HandlerFunc(listUsers)))
	mux.Handle("POST /admin/users/{id}/disable", requireAdmin(http.HandlerFunc(disableUser)))
	mux.Handle("POST /admin/roles", requireAdmin(http.HandlerFunc(setRole)))
	mux.HandleFunc("GET /admin/export", exportUsers) // BUG: added later without requireAdmin
}
```

```go fixed
func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := userFrom(r.Context())
		if !ok || !can(u, "admin:access") {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func routes(mux *http.ServeMux) {
	admin := http.NewServeMux()
	admin.HandleFunc("GET /admin/users", listUsers)
	admin.HandleFunc("POST /admin/users/{id}/disable", disableUser)
	admin.HandleFunc("POST /admin/roles", setRole)
	admin.HandleFunc("GET /admin/export", exportUsers)
	mux.Handle("/admin/", requireAdmin(admin)) // FIX: one guard in front of the whole /admin/ subtree
}
```

```javascript vulnerable
router.get("/admin/users", requireRole("admin"), listUsers);
router.post("/admin/users/:id/disable", requireRole("admin"), disableUser);
router.post("/admin/roles", requireRole("admin"), setRole);
router.get("/admin/export", exportUsers); // BUG: the newest route forgot requireRole

app.use(router);
```

```javascript fixed
const adminRouter = express.Router();
adminRouter.use(requireRole("admin")); // FIX: runs before every route on this router, new ones included

adminRouter.get("/users", listUsers);
adminRouter.post("/users/:id/disable", disableUser);
adminRouter.post("/roles", setRole);
adminRouter.get("/export", exportUsers);

app.use("/admin", adminRouter);
```

### Authorization expectations

Some rules come from the business, and no framework knows them: who may approve a refund, how big a credit support can issue, which actions need two people. The review has to hold the code up against those rules, starting with the classic one, that whoever requested a payout must not be the person who approves it.

> **Where to look:** approval and workflow handlers, anything that moves a record from `pending` to `approved`, and models with `requested_by` and `approved_by` columns. Grep for `approve`, `approved_by` (Python), `Approve`, `status = 'approved'` (Go), and `approve`, `approvedBy` (Node). Also read the spec or ask the product owner, because these rules usually live in a ticket.
>
> **How to think:** Get the business rules first, then check that each one is enforced on the server. Can the requester approve their own request? Can the same person approve twice to satisfy a two-approver rule? Is the amount threshold checked in the handler or only in the UI? For least privilege, look at what the approver role actually holds; if approvers were simply made admins, separation of duties is gone. And two approvals landing at the same moment shouldn't both count as the first, so look for a row lock or a unique constraint.

```python vulnerable
@app.post("/payouts/<int:payout_id>/approve")
@login_required
def approve_payout(payout_id):
    if not can(current_user, "payouts:approve"):
        abort(403)
    payout = db.get_or_404(Payout, payout_id)
    if payout.status != "pending":
        abort(409)
    payout.status = "approved"  # BUG: the requester can approve their own payout
    payout.approved_by = current_user.id  # BUG: one signature releases any amount
    db.session.commit()
    return "", 204
```

```python fixed
DUAL_APPROVAL_OVER = Decimal("10000.00")


@app.post("/payouts/<int:payout_id>/approve")
@login_required
def approve_payout(payout_id):
    if not can(current_user, "payouts:approve"):
        abort(403)
    payout = db.session.get(Payout, payout_id, with_for_update=True)  # row lock, so two approvals can't race
    if payout is None:
        abort(404)
    if payout.status != "pending":
        abort(409)
    approver_ids = {a.user_id for a in payout.approvals}
    if current_user.id == payout.requested_by or current_user.id in approver_ids:  # FIX: no self-approval, no second vote
        abort(403)
    payout.approvals.append(Approval(user_id=current_user.id))
    needed = 2 if payout.amount > DUAL_APPROVAL_OVER else 1  # FIX: big payouts need two different approvers
    if len(approver_ids) + 1 >= needed:
        payout.status = "approved"
    db.session.commit()
    return "", 204
```

```go vulnerable
func approvePayout(ctx context.Context, approver *User, payoutID int64) error {
	if !can(approver, "payouts:approve") {
		return ErrForbidden
	}
	_, err := db.ExecContext(ctx, `UPDATE payouts SET status = 'approved', approved_by = $1
		WHERE id = $2 AND status = 'pending'`, // BUG: the requester can approve, and one approval releases any amount
		approver.ID, payoutID)
	return err
}
```

```go fixed
func approvePayout(ctx context.Context, approver *User, payoutID int64) error {
	if !can(approver, "payouts:approve") {
		return ErrForbidden
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var requestedBy int64
	err = tx.QueryRowContext(ctx, `SELECT requested_by FROM payouts
		WHERE id = $1 AND status = 'pending' FOR UPDATE`, payoutID).Scan(&requestedBy)
	if err != nil {
		return err
	}
	if requestedBy == approver.ID { // FIX: the requester never approves
		return ErrSelfApproval
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO payout_approvals (payout_id, user_id) VALUES ($1, $2)`,
		payoutID, approver.ID); err != nil { // unique (payout_id, user_id): one vote per person
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE payouts SET status = 'approved' WHERE id = $1
		AND (SELECT count(*) FROM payout_approvals WHERE payout_id = $1)
		>= CASE WHEN amount_cents > 1000000 THEN 2 ELSE 1 END`, payoutID); err != nil { // FIX: over $10,000 needs a second approver
		return err
	}
	return tx.Commit()
}
```

```javascript vulnerable
app.post("/payouts/:id/approve", requirePermission("payouts:approve"), async (req, res) => {
  const payout = await Payout.findByPk(req.params.id);
  if (!payout) return res.sendStatus(404);
  if (payout.status !== "pending") return res.sendStatus(409);
  payout.status = "approved"; // BUG: nothing stops the requester approving their own payout
  payout.approvedBy = req.user.id; // BUG: one approval, whatever the amount
  await payout.save();
  res.sendStatus(204);
});
```

```javascript fixed
const DUAL_APPROVAL_OVER_CENTS = 1_000_000;

app.post("/payouts/:id/approve", requirePermission("payouts:approve"), async (req, res) => {
  const status = await sequelize.transaction(async (transaction) => {
    const payout = await Payout.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payout) return 404;
    if (payout.status !== "pending") return 409;
    if (payout.requestedBy === req.user.id) return 403; // FIX: the requester never approves
    const [, created] = await PayoutApproval.findOrCreate({
      where: { payoutId: payout.id, userId: req.user.id },
      transaction,
    });
    if (!created) return 409;
    const approvals = await PayoutApproval.count({ where: { payoutId: payout.id }, transaction });
    if (approvals >= (payout.amountCents > DUAL_APPROVAL_OVER_CENTS ? 2 : 1)) { // FIX: a second approver above the threshold
      payout.status = "approved";
      await payout.save({ transaction });
    }
    return 204;
  });
  res.sendStatus(status);
});
```

### Access control questions

A short list of questions catches most account-management bugs. Can a normal user view other accounts, add accounts, or change accounts that aren't theirs, and can anyone create an account with more access than they hold? That last one hides in delegated admin screens, where a team admin's "invite user" form posts the new role straight through to the database.

> **Where to look:** invite, create-user, edit-user, and role-change endpoints, especially the ones open to team admins or org owners rather than your own staff. Grep for `request.json["role"]`, `role=data` (Python), `req.Role` and `OrgID` fields in decoded request structs (Go), and `req.body.role`, `req.body.orgId` (Node).
>
> **How to think:** Ask the questions out loud for each account endpoint. Can a non-privileged user view other accounts (public fields only, if at all)? Add accounts? Alter accounts other than their own? Hand out a role above their own? Then check scope: is the new account forced into the caller's org, or does `org_id` come from the body too? Separation of duties shows up here as well. Whoever creates an account shouldn't be the only person who can approve its elevation.

```python vulnerable
@app.post("/team/users")
@require_permission("team:manage_users")
def create_team_user():
    data = request.get_json()
    user = User(
        email=data["email"],
        role=data["role"],  # BUG: a team admin can mint an "owner"
        org_id=data["org_id"],  # BUG: or drop the new account into someone else's org
    )
    db.session.add(user)
    db.session.commit()
    send_invite(user)
    return {"id": user.public_id}, 201
```

```python fixed
ROLE_RANK = {Role.MEMBER: 10, Role.TEAM_ADMIN: 20, Role.OWNER: 30}


@app.post("/team/users")
@require_permission("team:manage_users")
def create_team_user():
    data = request.get_json()
    try:
        role = Role(data.get("role", "member"))
    except ValueError:
        abort(400)
    if ROLE_RANK[role] > ROLE_RANK[Role(current_user.role)]:  # FIX: never grant more than you hold
        abort(403)
    user = User(email=data["email"], role=role, org_id=current_user.org_id)  # FIX: the caller's org, never the body's
    db.session.add(user)
    db.session.commit()
    audit.info("user_created", extra={"by": current_user.id, "user_id": user.id, "role": role})
    send_invite(user)
    return {"id": user.public_id}, 201
```

```go vulnerable
type newUserReq struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	OrgID int64  `json:"org_id"`
}

func createTeamUser(w http.ResponseWriter, r *http.Request) {
	var req newUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_, err := db.ExecContext(r.Context(), "INSERT INTO users (email, role, org_id) VALUES ($1, $2, $3)",
		req.Email, req.Role, req.OrgID) // BUG: role and org straight from the body, so "owner" in any org works
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}
```

```go fixed
var roleRank = map[string]int{"member": 10, "team_admin": 20, "owner": 30}

type newUserReq struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func createTeamUser(w http.ResponseWriter, r *http.Request) {
	caller := currentUser(r)
	var req newUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	want, known := roleRank[req.Role]
	if !known || want > roleRank[caller.Role] { // FIX: unknown roles and anything above the caller are refused
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	_, err := db.ExecContext(r.Context(), "INSERT INTO users (email, role, org_id) VALUES ($1, $2, $3)",
		req.Email, req.Role, caller.OrgID) // FIX: always the caller's own org
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}
```

```javascript vulnerable
app.post("/team/users", requirePermission("team:manage_users"), async (req, res) => {
  const { email, role, orgId } = req.body;
  const user = await User.create({ email, role, orgId }); // BUG: role and orgId come from the request, "owner" included
  await sendInvite(user);
  res.status(201).json({ id: user.publicId });
});
```

```javascript fixed
const ROLE_RANK = new Map([["member", 10], ["team_admin", 20], ["owner", 30]]);

app.post("/team/users", requirePermission("team:manage_users"), async (req, res) => {
  const role = String(req.body.role ?? "member");
  const wanted = ROLE_RANK.get(role);
  if (wanted === undefined || wanted > (ROLE_RANK.get(req.user.role) ?? 0)) { // FIX: can't grant above your own rank
    return res.sendStatus(403);
  }
  const user = await User.create({ email: req.body.email, role, orgId: req.user.orgId }); // FIX: org from the session
  audit.info({ event: "user_created", by: req.user.id, userId: user.id, role });
  await sendInvite(user);
  res.status(201).json({ id: user.publicId });
});
```

### Authorization functions and filters

Authorization belongs in a few named functions that every route passes through, so you can review them once and trust them everywhere. Inline `role != "admin"` checks pasted into handlers drift apart, and sooner or later one handler doesn't get a copy.

> **Where to look:** decorators, middleware, and policy classes first, then every handler that doesn't use them. Grep for `def require_`, `current_user.role` inside view bodies (Python), `func require`, `.Role ==` inside handlers (Go), and `requireRole`, `req.user.role` inside route bodies (Node).
>
> **How to think:** Find the authorization functions and read them closely. Where does the identity come from: a server-side session, a verified token, or a cookie the client could edit? Is the check made on every request, or only when the page first loads? Then flip it around and list the handlers that never call those functions. You should be able to tell what permission a route needs from its definition alone. If you have to read the body to find out, the next developer adding a route will miss it.

```python vulnerable
@app.post("/users/<int:user_id>/disable")
@login_required
def disable_user(user_id):
    if current_user.role != "admin":  # pasted into each admin view
        abort(403)
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@app.post("/users/<int:user_id>/reset-mfa")
@login_required
def reset_mfa(user_id):  # BUG: the paste never made it here, so any user can strip anyone's 2FA
    db.get_or_404(User, user_id).totp_secret = None
    db.session.commit()
    return "", 204
```

```python fixed
def require_permission(permission):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not current_user.is_authenticated:
                abort(401)
            if not can(current_user, permission):  # FIX: one implementation, reviewed once
                abort(403)
            return view(*args, **kwargs)
        return wrapped
    return decorator


@app.post("/users/<int:user_id>/disable")
@require_permission("users:disable")
def disable_user(user_id):
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204


@app.post("/users/<int:user_id>/reset-mfa")
@require_permission("users:reset_mfa")  # FIX: the requirement is visible on the route
def reset_mfa(user_id):
    db.get_or_404(User, user_id).totp_secret = None
    db.session.commit()
    return "", 204
```

```go vulnerable
func disableUser(w http.ResponseWriter, r *http.Request) {
	if currentUser(r).Role != "admin" { // pasted into each admin handler
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	updateUser(w, r, "UPDATE users SET active = false WHERE id = $1")
}

func resetMFA(w http.ResponseWriter, r *http.Request) { // BUG: never got the paste, so anyone can clear anyone's 2FA
	updateUser(w, r, "UPDATE users SET totp_secret = NULL WHERE id = $1")
}

func routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /users/{id}/disable", disableUser)
	mux.HandleFunc("POST /users/{id}/reset-mfa", resetMFA)
}
```

```go fixed
func requirePermission(perm string, next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := userFrom(r.Context())
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if !can(u, perm) { // FIX: one check, written and reviewed once
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next(w, r)
	})
}

func disableUser(w http.ResponseWriter, r *http.Request) {
	updateUser(w, r, "UPDATE users SET active = false WHERE id = $1")
}

func resetMFA(w http.ResponseWriter, r *http.Request) {
	updateUser(w, r, "UPDATE users SET totp_secret = NULL WHERE id = $1")
}

func routes(mux *http.ServeMux) {
	mux.Handle("POST /users/{id}/disable", requirePermission("users:disable", disableUser))
	mux.Handle("POST /users/{id}/reset-mfa", requirePermission("users:reset_mfa", resetMFA)) // FIX: the permission sits on the route
}
```

```javascript vulnerable
app.post("/users/:id/disable", requireLogin, async (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403); // pasted into each admin route
  await User.update({ active: false }, { where: { id: req.params.id } });
  res.sendStatus(204);
});

app.post("/users/:id/reset-mfa", requireLogin, async (req, res) => { // BUG: no paste here, any user can clear anyone's 2FA
  await User.update({ totpSecret: null }, { where: { id: req.params.id } });
  res.sendStatus(204);
});
```

```javascript fixed
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.sendStatus(401);
    if (!can(req.user, permission)) return res.sendStatus(403); // FIX: one implementation for every route
    next();
  };
}

app.post("/users/:id/disable", requirePermission("users:disable"), async (req, res) => {
  await User.update({ active: false }, { where: { id: req.params.id } });
  res.sendStatus(204);
});

app.post("/users/:id/reset-mfa", requirePermission("users:reset_mfa"), async (req, res) => { // FIX: declared on the route
  await User.update({ totpSecret: null }, { where: { id: req.params.id } });
  res.sendStatus(204);
});
```

### Broken access control

Broken access control is the umbrella term. Horizontal escalation lets user A act on user B's data; vertical escalation lets a normal user reach admin functions. Both get easy when the server asks the client who it is, by trusting an unverified JWT, an `isAdmin` cookie, or a hidden form field.

> **Where to look:** wherever the app works out identity and role per request: auth middleware, JWT parsing, cookie reads. Grep for `verify_signature`, `request.cookies.get("role")`, `is_admin` in forms (Python), `ParseUnverified`, `r.Cookie("role")` (Go), and `jwt.decode(`, `req.cookies.isAdmin`, `req.body.role` (Node).
>
> **How to think:** For every input that feeds an authorization decision, ask who wrote it. If the answer is the browser, treat it as attacker-controlled until a server-side check proves otherwise. With JWTs, check that the signature is verified, the algorithm is pinned (no `none`, no RS256/HS256 confusion), and the role used for the decision comes from the database or a server-side session rather than a long-lived claim. Then test both directions: change the ID in each request for horizontal escalation (see IDOR), and replay admin requests with a normal user's session for vertical (see Missing function level access control).

```python vulnerable
def current_identity():
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    claims = jwt.decode(token, options={"verify_signature": False})  # BUG: anyone can mint {"role": "admin"}
    return claims["sub"], claims["role"]


@app.post("/admin/users/<int:user_id>/disable")
def disable_user(user_id):
    _, role = current_identity()
    if role != "admin" and request.form.get("is_admin") != "1":  # BUG: a hidden form field the client can flip
        abort(403)
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204
```

```python fixed
def current_user_from_token():
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    try:
        claims = jwt.decode(token, PUBLIC_KEY, algorithms=["ES256"], options={"require": ["exp", "sub"]})  # FIX: verified, algorithm pinned
    except jwt.InvalidTokenError:
        abort(401)
    user = User.query.filter_by(public_id=claims["sub"], active=True).first()
    if user is None:
        abort(401)
    return user  # FIX: the role comes from this row, not from a claim


@app.post("/admin/users/<int:user_id>/disable")
def disable_user(user_id):
    user = current_user_from_token()
    if not can(user, "users:disable"):  # FIX: nothing the client sent decides this
        abort(403)
    db.get_or_404(User, user_id).active = False
    db.session.commit()
    return "", 204
```

```go vulnerable
func roleFromRequest(r *http.Request) string {
	raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	claims := jwt.MapClaims{}
	if _, _, err := jwt.NewParser().ParseUnverified(raw, claims); err != nil { // BUG: the signature is never checked
		return ""
	}
	role, _ := claims["role"].(string) // BUG: the client chose this value
	return role
}

func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if roleFromRequest(r) != "admin" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```go fixed
func userFromRequest(r *http.Request) (*User, error) {
	raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) {
		return publicKey, nil
	}, jwt.WithValidMethods([]string{"ES256"}), jwt.WithExpirationRequired()) // FIX: signature verified, algorithm pinned
	if err != nil {
		return nil, err
	}
	return loadActiveUser(r.Context(), claims.Subject) // FIX: the role comes from the users table
}

func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, err := userFromRequest(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if !can(u, "admin:access") {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```javascript vulnerable
function requireAdmin(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const claims = jwt.decode(token); // BUG: decode() never checks the signature
  if (claims?.role === "admin" || req.cookies.isAdmin === "true") return next(); // BUG: the client sets this cookie
  res.sendStatus(403);
}
```

```javascript fixed
async function requireAdmin(req, res, next) {
  let claims;
  try {
    const token = req.get("authorization")?.replace(/^Bearer /, "") ?? "";
    claims = jwt.verify(token, publicKey, { algorithms: ["ES256"] }); // FIX: signature checked, algorithm pinned
  } catch {
    return res.sendStatus(401);
  }
  const user = await User.findOne({ where: { publicId: claims.sub, active: true } }); // FIX: role read from the database
  if (!user || !can(user, "admin:access")) return res.sendStatus(403);
  req.user = user;
  next();
}
```

### Insecure direct object reference (IDOR)

An IDOR is a handler that takes an object ID from the request and loads it without asking whether this caller may see it. Change `/invoices/1041` to `/invoices/1042` and you're reading another customer's invoice.

> **Where to look:** every route with an ID in the path, query string, or body, and the data access right after it. Grep for `.get(id)`, `get_or_404(`, `filter_by(id=` (Python), `WHERE id = $1` with no second condition (Go), and `findByPk`, `findOne({ id })`, `findById` (Node). In Rails-style code the same smell is `find_by(id)` or `find(id)`. Also check list endpoints like `findAll()` or `.all()` that forget the owner or tenant filter.
>
> **How to think:** For each lookup, ask what ties this object to the caller. The answer should sit in the query (`AND owner_id = ...`), not in a check three calls later that a refactor can drop. "The UI never shows that ID" doesn't count, and neither does a hidden form field. Return 404 for objects the caller can't see, so the response doesn't confirm the ID exists. Random IDs slow guessing down (see User identification), and indirect references go further: a per-user index or mapping, where `/me/invoices/3` means "my third invoice", leaves no global ID to tamper with. Writes hurt more than reads, so try `PUT` and `DELETE` with someone else's ID too.

```python vulnerable
@app.get("/invoices/<int:invoice_id>")
@login_required
def get_invoice(invoice_id):
    invoice = db.get_or_404(Invoice, invoice_id)  # BUG: fetched by id alone
    return invoice.to_dict()


@app.delete("/invoices/<int:invoice_id>")
@login_required
def delete_invoice(invoice_id):
    db.session.delete(db.get_or_404(Invoice, invoice_id))  # BUG: deletes anyone's invoice
    db.session.commit()
    return "", 204
```

```python fixed
def owned_invoice_or_404(invoice_id):
    return Invoice.query.filter_by(id=invoice_id, owner_id=current_user.id).first_or_404()  # FIX: owner in the query, 404 for everyone else


@app.get("/invoices/<int:invoice_id>")
@login_required
def get_invoice(invoice_id):
    return owned_invoice_or_404(invoice_id).to_dict()


@app.delete("/invoices/<int:invoice_id>")
@login_required
def delete_invoice(invoice_id):
    db.session.delete(owned_invoice_or_404(invoice_id))  # FIX: writes go through the same scoped lookup
    db.session.commit()
    return "", 204
```

```go vulnerable
mux.HandleFunc("GET /invoices/{id}", func(w http.ResponseWriter, r *http.Request) {
	var inv Invoice
	err := db.QueryRowContext(r.Context(),
		"SELECT id, number, total_cents FROM invoices WHERE id = $1", // BUG: any id, any owner
		r.PathValue("id"),
	).Scan(&inv.ID, &inv.Number, &inv.TotalCents)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	json.NewEncoder(w).Encode(inv)
})
```

```go fixed
mux.HandleFunc("GET /invoices/{id}", func(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var inv Invoice
	err = db.QueryRowContext(r.Context(),
		"SELECT id, number, total_cents FROM invoices WHERE id = $1 AND owner_id = $2", // FIX: ownership is part of the query
		id, currentUser(r).ID,
	).Scan(&inv.ID, &inv.Number, &inv.TotalCents)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r) // FIX: "not yours" and "doesn't exist" look the same
		return
	}
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(inv)
})
```

```javascript vulnerable
app.get("/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id); // BUG: no owner check
  if (!invoice) return res.sendStatus(404);
  res.json(invoice);
});

app.delete("/invoices/:id", requireLogin, async (req, res) => {
  await Invoice.destroy({ where: { id: req.params.id } }); // BUG: deletes anyone's invoice
  res.sendStatus(204);
});
```

```javascript fixed
app.get("/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await Invoice.findOne({ where: { id: req.params.id, ownerId: req.user.id } }); // FIX: owner in the query
  if (!invoice) return res.sendStatus(404); // FIX: same answer for "not yours" and "doesn't exist"
  res.json(invoice);
});

app.delete("/invoices/:id", requireLogin, async (req, res) => {
  const deleted = await Invoice.destroy({ where: { id: req.params.id, ownerId: req.user.id } }); // FIX: scoped delete
  res.sendStatus(deleted ? 204 : 404);
});
```

### Missing function level access control

Hiding a button in the UI does nothing to the API behind it. If the React app shows "Delete user" only to admins but `DELETE /api/users/{id}` checks nothing beyond a valid session, any user with curl or the browser console can call it.

> **Where to look:** the frontend's role checks (`isAdmin &&` in JSX, `v-if="isAdmin"`, `{% if current_user.is_admin %}`) and the API routes those screens call. Grep for API routes that carry only `@login_required` (Python), handlers mounted behind nothing but `requireLogin` (Go), and Express routes guarded only by `requireLogin` or `authenticate` (Node). Don't skip GraphQL mutations, mobile-only endpoints, and old `/api/v1/` routes that still answer.
>
> **How to think:** Take a normal user's session and replay every admin request you can capture. Each one should fail on the server. In code, for every state-changing or admin-only endpoint, point at the line that checks the permission; if that line only exists in a template or the JS bundle, the endpoint is open. Sensitive reads count too, since an admin-only page almost always fetches an admin-only API.

```python vulnerable
@api.get("/api/me")
@login_required
def me():
    return {"name": current_user.name, "is_admin": current_user.role == "admin"}  # the SPA hides admin buttons when false


@api.delete("/api/users/<int:user_id>")
@login_required  # BUG: logged in is the only requirement; the hidden button was the real "check"
def delete_user(user_id):
    db.session.delete(db.get_or_404(User, user_id))
    db.session.commit()
    return "", 204
```

```python fixed
@api.get("/api/me")
@login_required
def me():
    return {"name": current_user.name, "can_delete_users": can(current_user, "users:delete")}  # a UI hint, nothing more


@api.delete("/api/users/<int:user_id>")
@require_permission("users:delete")  # FIX: the API enforces it, whatever the UI shows
def delete_user(user_id):
    db.session.delete(db.get_or_404(User, user_id))
    db.session.commit()
    return "", 204
```

```go vulnerable
func routes(mux *http.ServeMux) {
	api := http.NewServeMux()
	api.HandleFunc("GET /api/me", me)                    // the SPA draws admin buttons only when this says isAdmin
	api.HandleFunc("DELETE /api/users/{id}", deleteUser) // BUG: hidden button, open endpoint
	api.HandleFunc("GET /api/audit-log", auditLog)       // BUG: same for the admin-only page
	mux.Handle("/api/", requireLogin(api))
}
```

```go fixed
func routes(mux *http.ServeMux) {
	api := http.NewServeMux()
	api.HandleFunc("GET /api/me", me)
	api.Handle("DELETE /api/users/{id}", requirePermission("users:delete", deleteUser)) // FIX: enforced on the route itself
	api.Handle("GET /api/audit-log", requirePermission("audit:read", auditLog))         // FIX: sensitive reads too
	mux.Handle("/api/", requireLogin(api))
}
```

```javascript vulnerable
// client: {me.isAdmin && <DeleteUserButton id={u.id} />} is the only role check anywhere

app.delete("/api/users/:id", requireLogin, async (req, res) => { // BUG: any session can delete any user
  await User.destroy({ where: { id: req.params.id } });
  res.sendStatus(204);
});

app.get("/api/audit-log", requireLogin, async (req, res) => { // BUG: the admin page is hidden, its API isn't
  res.json(await AuditLog.findAll({ order: [["createdAt", "DESC"]], limit: 100 }));
});
```

```javascript fixed
// client can keep hiding the button; the API no longer depends on it

app.delete("/api/users/:id", requirePermission("users:delete"), async (req, res) => { // FIX: the API enforces it
  await User.destroy({ where: { id: req.params.id } });
  res.sendStatus(204);
});

app.get("/api/audit-log", requirePermission("audit:read"), async (req, res) => { // FIX: sensitive reads too
  res.json(await AuditLog.findAll({ order: [["createdAt", "DESC"]], limit: 100 }));
});
```

### Authorization filter verification

A filter only protects the requests it actually runs on. It has to cover every route, run before the handler, and deny by default. Prefix checks, case and slash differences between the filter and the router, and middleware registered in the wrong order are the usual ways past it.

> **Where to look:** global middleware registration, `before_request` hooks, and any code that matches on the request path. Grep for `request.path.startswith` (Python), `strings.HasPrefix(r.URL.Path` and per-route `requireAuth(` wrappers (Go), and `req.path.startsWith`, `req.url.startsWith`, plus the order of `app.use(` calls (Node). Check router options too: Express ignores case and a trailing slash unless `caseSensitive` and `strict` are turned on.
>
> **How to think:** Is the filter allow-by-default with a list of protected paths, or deny-by-default with a list of public ones? Only the second stays safe when someone adds a route next month. Does the filter read the request the same way the router does? If one compares raw strings while the other ignores case, trailing slashes, or encoding, there's a gap, so try `/ADMIN/users`, `/admin/users/`, and `//admin/users` against each guard. Order matters as well: Express runs middleware in registration order, so a guard added after the routes protects nothing. Matching on what the router resolved (a Flask endpoint name, the Go mux pattern, a mounted router) sidesteps the string games entirely.

```python vulnerable
PROTECTED_PREFIXES = ("/admin", "/account", "/billing")


@app.before_request
def require_login():
    if request.path.startswith(PROTECTED_PREFIXES) and not current_user.is_authenticated:  # BUG: default allow; unlisted paths are public
        return redirect(url_for("auth.login"))
    return None


app.register_blueprint(reports_bp, url_prefix="/reports")  # BUG: added later and never listed, so it's public
```

```python fixed
PUBLIC_ENDPOINTS = {"auth.login", "auth.forgot", "auth.reset", "health", "static"}


@app.before_request
def require_login():
    if request.endpoint in PUBLIC_ENDPOINTS:  # FIX: default deny; public views opt out by endpoint name
        return None
    if not current_user.is_authenticated:
        return redirect(url_for("auth.login"))
    return None


app.register_blueprint(reports_bp, url_prefix="/reports")  # FIX: covered the moment it's registered
```

```go vulnerable
func routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /login", loginPage)
	mux.HandleFunc("POST /login", login)
	mux.Handle("GET /account", requireAuth(http.HandlerFunc(account)))
	mux.Handle("POST /account/email", requireAuth(http.HandlerFunc(changeEmail)))
	mux.HandleFunc("GET /reports/{id}", report) // BUG: wrapped one by one, and this one was missed
}

func main() {
	mux := http.NewServeMux()
	routes(mux)
	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(withUser(mux))))
}
```

```go fixed
var public = map[string]bool{
	"GET /login":   true,
	"POST /login":  true,
	"GET /healthz": true,
}

func defaultDeny(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, pattern := mux.Handler(r)
		if _, ok := userFrom(r.Context()); !ok && !public[pattern] { // FIX: default deny, public routes listed by pattern
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()
	routes(mux)
	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(withUser(defaultDeny(mux))))) // FIX: one wrapper around everything
}
```

```javascript vulnerable
app.use((req, res, next) => {
  if (req.path.startsWith("/admin")) return requireAdmin(req, res, next); // BUG: /ADMIN/users skips this, yet Express still routes it
  next();
});

app.get("/admin/users", listUsers);
app.post("/admin/users/:id/disable", disableUser);
app.get("/reports/:id", showReport); // BUG: default allow, so a new route is public unless someone remembers
```

```javascript fixed
const PUBLIC = new Set(["GET /", "GET /login", "POST /login", "GET /healthz"]);

app.use((req, res, next) => {
  if (req.user || PUBLIC.has(`${req.method} ${req.path}`)) return next(); // FIX: default deny, public routes listed
  res.sendStatus(401);
});

const adminRouter = express.Router();
adminRouter.use(requireAdmin); // FIX: runs for every request the router handles, /ADMIN/users included
adminRouter.get("/users", listUsers);
adminRouter.post("/users/:id/disable", disableUser);
app.use("/admin", adminRouter);

app.get("/reports/:id", showReport);
```

### Generic authorization flaws

Some authorization bugs come from when and how a check runs rather than whether it exists. The check sits below the write. The decision was cached at login. Or two requests race between the check and the use.

> **Where to look:** handlers where a `commit()`, `save()`, `destroy()`, or `Exec` comes before the permission check; login code that copies the role into the session or a token; and balance or quota checks followed by a separate update. Grep for `session["role"]` (Python), `sessions.Put(` with a role or permissions key (Go), and `req.session.role` (Node), then for a `SELECT` followed by an `UPDATE` of the same row without `FOR UPDATE`.
>
> **How to think:** Read each handler top to bottom and mark the first side effect. Every authorization check has to sit above that line, because a 403 returned afterwards doesn't undo the write, the email that already went out, or the webhook that already fired. Next, how fresh is the decision? A role copied into the session at login means a demoted or fired admin keeps admin until the session dies, so re-read it per request or bump a version when roles change. Look for TOCTOU races: "check the balance, then debit" as two statements lets ten parallel requests spend the same money, so put the condition in the `UPDATE` or hold a row lock. And watch for parameter manipulation, meaning any `user_id`, `account_id`, `price`, or `role` in the request that the server should have taken from the session.

```python vulnerable
@app.post("/accounts/<int:account_id>/transfer")
@login_required
def transfer(account_id):
    amount = Decimal(request.form["amount"])
    source = db.get_or_404(Account, account_id)
    dest = db.get_or_404(Account, int(request.form["to"]))
    source.balance -= amount
    dest.balance += amount
    db.session.commit()  # BUG: the money has moved before anyone checked who asked
    if source.owner_id != current_user.id:
        abort(403)  # BUG: the 403 arrives after the write
    return "", 204
```

```python fixed
@app.post("/accounts/<int:account_id>/transfer")
@login_required
def transfer(account_id):
    amount = Decimal(request.form["amount"])
    if amount <= 0:
        abort(400)
    source = db.session.execute(
        select(Account).where(Account.id == account_id, Account.owner_id == current_user.id).with_for_update()
    ).scalar_one_or_none()
    if source is None:  # FIX: ownership checked before anything changes
        abort(404)
    if source.balance < amount:  # the row lock stops a parallel request spending the same funds
        abort(409)
    dest = db.session.get(Account, int(request.form["to"]), with_for_update=True)
    if dest is None:
        abort(404)
    source.balance -= amount
    dest.balance += amount
    db.session.commit()  # FIX: one transaction, after every check
    return "", 204
```

```go vulnerable
func setVisibility(w http.ResponseWriter, r *http.Request) {
	var ownerID int64
	err := db.QueryRowContext(r.Context(),
		"UPDATE projects SET visibility = $1 WHERE id = $2 RETURNING owner_id", // BUG: the write runs for any caller
		r.PostFormValue("visibility"), r.PathValue("id")).Scan(&ownerID)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if ownerID != currentUser(r).ID { // BUG: too late, the project is already public
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

```go fixed
func setVisibility(w http.ResponseWriter, r *http.Request) {
	visibility := r.PostFormValue("visibility")
	if visibility != "private" && visibility != "public" {
		http.Error(w, "bad visibility", http.StatusBadRequest)
		return
	}
	res, err := db.ExecContext(r.Context(),
		"UPDATE projects SET visibility = $1 WHERE id = $2 AND owner_id = $3", // FIX: check and write are one statement
		visibility, r.PathValue("id"), currentUser(r).ID)
	if err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	if n, err := res.RowsAffected(); err != nil || n == 0 {
		http.NotFound(w, r) // FIX: a non-owner changed nothing and learns nothing
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

```javascript vulnerable
app.delete("/projects/:id", requireLogin, async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  if (!project) return res.sendStatus(404);
  await project.destroy(); // BUG: the delete runs before the permission check
  await AuditLog.create({ action: "project.delete", projectId: project.id, by: req.user.id });
  if (project.ownerId !== req.user.id && !can(req.user, "projects:delete_any")) {
    return res.sendStatus(403); // BUG: the caller sees 403, but the project is already gone
  }
  res.sendStatus(204);
});
```

```javascript fixed
app.delete("/projects/:id", requireLogin, async (req, res) => {
  const status = await sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!project) return 404;
    if (project.ownerId !== req.user.id && !can(req.user, "projects:delete_any")) return 403; // FIX: decide before touching anything
    await project.destroy({ transaction }); // FIX: runs only after the check, in the same transaction
    await AuditLog.create({ action: "project.delete", projectId: project.id, by: req.user.id }, { transaction });
    return 204;
  });
  res.sendStatus(status);
});
```

### CSRF protection

With cookie sessions, the browser attaches the cookie to requests that other sites trigger, so a hidden form on an attacker's page can post to your app as the victim. Every state-changing request needs proof that it came from your own pages, such as a per-session token or an Origin check, with `SameSite` cookies as a second layer.

> **Where to look:** app setup (is any CSRF middleware registered at all?), every POST, PUT, PATCH, and DELETE route that relies on cookies, the exemption list, and any GET route that changes state. Grep for `CSRFProtect`, `csrf.exempt`, `WTF_CSRF_ENABLED` (Python), `CrossOriginProtection`, `csrf.Protect`, `AddInsecureBypassPattern` (Go), and `csurf`, `_csrf`, `sameSite` (Node).
>
> **How to think:** Which requests carry credentials the browser adds on its own? Cookies and HTTP auth do. A bearer token your JavaScript puts in the `Authorization` header doesn't, so pure token APIs need less here. Is the CSRF token tied to the session, checked on the server for every unsafe method, and compared in constant time? Any GET that changes state (`/logout`, `/unsubscribe`, `/leave`) dodges most defenses, and `SameSite=Lax` still sends cookies on top-level GET navigations. Exemptions should be signed webhooks, never "the mobile API" that shares the browser cookie. If the app hand-rolls a Referer check, a missing header must not count as a pass, since the attacker's page can suppress it with a referrer policy. And if you see `csurf`, flag it: the package is deprecated.

```python vulnerable
app.config.update(SESSION_COOKIE_SAMESITE="None", SESSION_COOKIE_SECURE=True)  # BUG: the cookie rides along on cross-site requests


@app.post("/projects/<int:project_id>/members")
@login_required
def add_member(project_id):  # BUG: no CSRF token, so a form on any site can add the attacker as a member
    project = owned_project_or_404(project_id)
    project.members.append(User.query.filter_by(email=request.form["email"]).first_or_404())
    db.session.commit()
    return redirect(url_for("show_project", project_id=project_id))


@app.get("/projects/<int:project_id>/leave")  # BUG: state change on GET; a link or an <img> on another site fires it
@login_required
def leave_project(project_id):
    member_project_or_404(project_id).members.remove(current_user)
    db.session.commit()
    return redirect("/projects")
```

```python fixed
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=True)  # FIX: no cookie on cross-site POSTs or subrequests
csrf = CSRFProtect(app)  # FIX: POST, PUT, PATCH, and DELETE all need a valid per-session token


@app.post("/projects/<int:project_id>/members")
@login_required
def add_member(project_id):  # forms render {{ csrf_token() }}; fetch() sends it as X-CSRFToken
    project = owned_project_or_404(project_id)
    project.members.append(User.query.filter_by(email=request.form["email"]).first_or_404())
    db.session.commit()
    return redirect(url_for("show_project", project_id=project_id))


@app.post("/projects/<int:project_id>/leave")  # FIX: state changes only on unsafe methods
@login_required
def leave_project(project_id):
    member_project_or_404(project_id).members.remove(current_user)
    db.session.commit()
    return redirect("/projects")
```

```go vulnerable
func main() {
	sessions.Cookie.SameSite = http.SameSiteNoneMode // BUG: the session cookie rides along on cross-site requests
	sessions.Cookie.Secure = true

	mux := http.NewServeMux()
	mux.HandleFunc("POST /projects/{id}/members", addMember) // BUG: nothing checks where the request came from
	mux.HandleFunc("GET /projects/{id}/leave", leaveProject) // BUG: state change on GET

	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(mux)))
}
```

```go fixed
func main() {
	sessions.Cookie.SameSite = http.SameSiteLaxMode
	sessions.Cookie.Secure = true

	mux := http.NewServeMux()
	mux.HandleFunc("POST /projects/{id}/members", addMember)
	mux.HandleFunc("POST /projects/{id}/leave", leaveProject) // FIX: state changes only on unsafe methods

	// http.CrossOriginProtection needs Go 1.25+
	csrf := http.NewCrossOriginProtection()
	log.Fatal(http.ListenAndServe(":8080", sessions.LoadAndSave(csrf.Handler(mux)))) // FIX: rejects cross-origin POST, PUT, PATCH, DELETE
}
```

```javascript vulnerable
app.use(session({
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: "none" }, // BUG: the cookie rides along on cross-site requests
}));

app.post("/projects/:id/members", requireLogin, addMember); // BUG: no CSRF token checked
app.get("/projects/:id/leave", requireLogin, leaveProject); // BUG: state change on GET
```

```javascript fixed
app.use(session({
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" }, // FIX: no cookie on cross-site POSTs or subrequests
}));

function csrfToken(req) {
  req.session.csrf ??= crypto.randomBytes(32).toString("base64url");
  return req.session.csrf; // render into forms as <input type="hidden" name="_csrf">
}

function verifyCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const expected = Buffer.from(req.session.csrf ?? "");
  const supplied = Buffer.from(String(req.get("x-csrf-token") ?? req.body?._csrf ?? ""));
  if (expected.length === 0 || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.sendStatus(403); // FIX: per-session token, length checked, constant-time compare
  }
  next();
}

app.use(express.urlencoded({ extended: false }), verifyCsrf);
app.post("/projects/:id/members", requireLogin, addMember);
app.post("/projects/:id/leave", requireLogin, leaveProject); // FIX: POST, so the token check applies
```

### Critical operations re-authentication

A stolen session cookie or a laptop left signed in at someone's desk shouldn't be enough to take an account over for good. Changing the password or email, deleting the account, and moving money should all ask for fresh proof that the owner is at the keyboard.

> **Where to look:** change-password, change-email, delete-account, payout and transfer handlers, plus 2FA settings and API key creation. Grep for `change_password`, `update_email`, `delete_account` (Python), `ChangePassword`, `deleteAccount` (Go), and `/account/password`, `/account/email` (Node). Then grep for `current_password`, `reauth_at`, or `authTime`; if none of them show up, there's no re-auth.
>
> **How to think:** For each critical action, ask what someone holding only the session cookie could do with it. A password change without the current password locks the owner out. An email change that isn't confirmed by the new address, and isn't reported to the old one, hands the attacker the reset flow forever. Account deletion should want the password (or a re-auth from the last few minutes) plus an explicit confirmation. Financial transactions and high-privilege actions, like granting admin, creating API keys, or turning off 2FA, should require a 2FA step-up or re-auth. The re-auth timestamp has to live where the client can't edit it: the server-side session, or at least a signed one.

```python vulnerable
@app.post("/account/email")
@login_required
def change_email():
    current_user.email = request.form["email"]  # BUG: a stolen session can point password resets at the attacker's inbox
    db.session.commit()
    return redirect("/account")


@app.post("/account/password")
@login_required
def change_password():
    current_user.password_hash = ph.hash(request.form["new_password"])  # BUG: no current password required
    db.session.commit()
    return redirect("/account")
```

```python fixed
REAUTH_WINDOW = timedelta(minutes=5)


def reauthenticated_recently():
    at = session.get("reauth_at")  # set by /reauth after a password or 2FA check
    return at is not None and datetime.now(UTC) - datetime.fromisoformat(at) < REAUTH_WINDOW


@app.post("/account/email")
@login_required
def change_email():
    if not reauthenticated_recently():  # FIX: a live session alone isn't enough
        return redirect(url_for("reauth"))
    new_email = request.form["email"].strip().lower()
    send_email_change_links(current_user, new_email)  # FIX: confirm link to the new address, notice to the old one
    return "Check your new inbox to confirm the change.", 202


@app.post("/account/password")
@login_required
@limiter.limit("5 per 15 minutes")
def change_password():
    if not verify_password(current_user.password_hash, request.form["current_password"]):  # FIX: proves the owner is here
        return "Current password is wrong", 403
    if error := validate_password(request.form["new_password"], current_user.email):
        return error, 400
    current_user.password_hash = ph.hash(request.form["new_password"])
    db.session.commit()
    return redirect("/account")
```

```go vulnerable
func deleteAccount(w http.ResponseWriter, r *http.Request) {
	u := currentUser(r)
	if _, err := db.ExecContext(r.Context(), "DELETE FROM users WHERE id = $1", u.ID); err != nil { // BUG: a live session is the only requirement
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	sessions.Destroy(r.Context())
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```go fixed
const reauthWindow = 5 * time.Minute

func deleteAccount(w http.ResponseWriter, r *http.Request) {
	u := currentUser(r)
	if time.Since(sessions.GetTime(r.Context(), "reauthAt")) > reauthWindow { // FIX: needs a password or 2FA check from the last 5 minutes
		http.Redirect(w, r, "/reauth", http.StatusSeeOther)
		return
	}
	if r.PostFormValue("confirm") != u.Email { // FIX: an explicit, typed confirmation
		http.Error(w, "type your email address to confirm", http.StatusBadRequest)
		return
	}
	if _, err := db.ExecContext(r.Context(), "DELETE FROM users WHERE id = $1", u.ID); err != nil {
		http.Error(w, "try again later", http.StatusInternalServerError)
		return
	}
	sendEmail(u.Email, "Your account was deleted. If this wasn't you, contact support.") // FIX: the owner hears about it
	if err := sessions.Destroy(r.Context()); err != nil {
		slog.Error("session destroy failed", "user_id", u.ID, "err", err)
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
```

```javascript vulnerable
app.post("/account/password", requireLogin, async (req, res) => {
  req.user.passwordHash = await argon2.hash(req.body.newPassword); // BUG: no current password needed
  await req.user.save();
  res.redirect("/account");
});

app.post("/account/email", requireLogin, async (req, res) => {
  req.user.email = req.body.email; // BUG: switched instantly, never verified, and the old address isn't told
  await req.user.save();
  res.redirect("/account");
});
```

```javascript fixed
const REAUTH_MS = 5 * 60 * 1000;
const requireRecentReauth = (req, res, next) =>
  Date.now() - (req.session.reauthAt ?? 0) < REAUTH_MS ? next() : res.redirect("/reauth");

app.post("/account/password", requireLogin, reauthLimiter, async (req, res) => {
  const currentPassword = String(req.body.currentPassword ?? "");
  const newPassword = String(req.body.newPassword ?? "");
  if (!(await argon2.verify(req.user.passwordHash, currentPassword))) { // FIX: current password required
    return res.status(403).send("Current password is wrong");
  }
  const problem = validatePassword(newPassword, req.user.email);
  if (problem) return res.status(400).send(problem);
  req.user.passwordHash = await argon2.hash(newPassword);
  await req.user.save();
  res.redirect("/account");
});

app.post("/account/email", requireLogin, requireRecentReauth, async (req, res) => { // FIX: fresh password or 2FA check
  const newEmail = String(req.body.email ?? "").trim().toLowerCase();
  await sendEmailChangeLinks(req.user, newEmail); // FIX: confirm link to the new address, notice to the old one
  res.status(202).send("Check your new inbox to confirm the change.");
});
```

---
