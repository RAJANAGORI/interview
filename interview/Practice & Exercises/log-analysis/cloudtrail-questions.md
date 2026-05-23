# Drill 3 — CloudTrail AssumeRole chain

## Questions

1. Narrate the privilege escalation timeline.
2. What configuration mistake likely enabled step 2?
3. What is the attacker trying to establish with `backup-admin`?
4. List three detective controls that would fire.

---

## Answer key

1. **ci-deploy-bot** assumes **prod-deploy** (expected CI) → same session assumes **org-admin** (unexpected) → creates **backup-admin** → attaches **AdministratorAccess**.
2. **prod-deploy role trust/policy** allowed **sts:AssumeRole** on **org-admin** (chaining) or org-admin trust was too broad; missing **permission boundary** on deploy role.
3. **Persistent backdoor** IAM user outside normal CI rotation.
4. **CloudTrail alert** on AssumeRole to high-privilege role from CI principal; **CreateUser** by non-human role; **AttachUserPolicy AdministratorAccess**; **GuardDuty** IAM anomaly.
