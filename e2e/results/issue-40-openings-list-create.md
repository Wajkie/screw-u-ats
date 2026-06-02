# Issue 40 — Openings list + create UI

**Verdict:** PASS

**Run:** 2026-06-02T15:20:47.923Z



## Steps

### ✅ "Openings" appears in the main nav

![](screenshots/40-01-nav-openings-link.png)

### ✅ /openings lists all openings fetched from the API

![](screenshots/40-02-openings-list.png)

### ✅ Empty state shown when no openings exist

![](screenshots/40-03-empty-state.png)

### ✅ /openings/new form renders with title, description, role dropdown

![](screenshots/40-04-new-opening-form.png)

### ✅ /openings/new form submits and redirects to the new opening's detail page

![](screenshots/40-05-redirect-to-detail.png)

### ✅ /openings lists the created opening with title, role, status, candidate count

![](screenshots/40-06-opening-in-list.png)

### ✅ 🔍 /openings/new with empty title shows validation error (does not submit)

![](screenshots/40-07-probe-empty-title.png)