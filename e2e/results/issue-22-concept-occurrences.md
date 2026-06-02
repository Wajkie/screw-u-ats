# Issue #22 — Concept occurrence counts in UI and API

**Verdict:** PASS

**Run:** 2026-06-02T15:20:43.439Z



## Steps

### ✅ API is reachable and returns candidate list

![](screenshots/22-01-dashboard.png)

### ✅ Create candidate and trigger analysis

### ✅ Report was created with new concept shape (occurrences as objects)

### ✅ Report detail page loads and shows matched concepts section

![](screenshots/22-02-report-detail.png)

### ✅ Occurrence badges are visible on matched concepts (best-fit section)

![](screenshots/22-03-expanded-role-with-badges.png)

### ✅ Occurrence badge values are positive integers

![](screenshots/22-04-badge-values.png)

### ✅ Best-fit concepts section at bottom also shows occurrence badges

![](screenshots/22-05-bottom-concepts-section.png)

### ✅ 🔍 At least one concept has occurrences > 1 (multi-repo signal)

![](screenshots/22-06-probe-multi-repo.png)