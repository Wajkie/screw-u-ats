# Issue #28 — Role-fit query API

**Verdict:** PASS

**Run:** 2026-06-02T15:19:37.846Z



## Steps

### ✅ GET /roles/:role/candidates returns candidates sorted by descending fit_score

### ✅ Candidates with no score for the requested role are excluded

### ✅ Returns 400 for a role slug not in ALL_ROLES

### ✅ GET /candidates/:id/fit-history returns reports oldest-first with created_at, fit_score, best_fit

### ✅ GET /candidates/:id/fit-history returns 404 for unknown candidate ID

### ✅ GET /roles/:role/candidates returns empty array gracefully when no data exists

### ✅ 🔍 GET /candidates/:id/fit-history returns empty array when candidate has no reports (second candidate)

### ✅ 🔍 Leaderboard response shape has expected fields