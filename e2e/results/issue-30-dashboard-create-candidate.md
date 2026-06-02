# Issue #30 — Dashboard and create candidate flow

**Verdict:** PASS

**Run:** 2026-06-02T15:37:36.504Z



## Steps

### ✅ / fetches and renders candidate cards; empty state shown when list is empty

![](screenshots/30-01-dashboard.png)

### ✅ /candidates/new validates that github_username is non-empty before submitting

![](screenshots/30-02-validation-empty-username.png)

### ✅ Successful create redirects to /candidates/:id

![](screenshots/30-03-redirect-to-candidate.png)

### ✅ Each card shows username, latest fit_score (or — placeholder), and recommendation badge

![](screenshots/30-04-dashboard-with-candidate.png)

### ✅ Dashboard query is invalidated and refetches after a successful create

![](screenshots/30-05-dashboard-refetched.png)

### ✅ Duplicate username (409) shows a user-facing error message

![](screenshots/30-06-duplicate-username-error.png)

### ✅ 🔍 Create form optional fields (display name, graduation date) are present

![](screenshots/30-07-form-optional-fields.png)

### ✅ 🔍 Candidate card links to /candidates/:id

![](screenshots/30-08-card-links.png)