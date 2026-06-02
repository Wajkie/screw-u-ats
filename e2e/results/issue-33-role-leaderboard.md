# Issue #33 — Role Leaderboard Page

**Verdict:** PASS

**Run:** 2026-06-02T10:42:37.588Z



## Steps

### ✅ Empty state shown when no candidates have been analyzed for a role

![](screenshots/33-01-empty-state.png)

### ✅ Invalid role slug shows error state rather than crashing

![](screenshots/33-02-invalid-role.png)

### ✅ /roles/:role renders a ranked table sourced from GET /roles/:role/candidates

![](screenshots/33-03-ranked-table.png)

### ✅ Each row shows fit_score and recommendation badge

![](screenshots/33-04-score-and-badge.png)

### ✅ Each row shows a score bar

![](screenshots/33-05-score-bar.png)

### ✅ Username links to /candidates/:id

![](screenshots/33-06-candidate-link.png)

### ✅ Role selector updates the URL param and triggers a new fetch

![](screenshots/33-07-role-selector-switch.png)

### ✅ 🔍 Role selector is pre-selected to the current :role param

![](screenshots/33-08-selector-preselected.png)

### ✅ 🔍 Direct deep-link to a role URL renders correctly

![](screenshots/33-09-deep-link-mid-fullstack.png)