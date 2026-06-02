# Issue #32 — Report Detail Page

**Verdict:** PASS

**Run:** 2026-06-02T10:14:12.108Z



## Steps

### ✅ Full AllRolesResult is rendered across all sections

![](screenshots/32-01-report-page-loaded.png)

### ✅ Header: candidate username linked to GitHub

![](screenshots/32-02-header-github-link.png)

### ✅ Header: report date displayed in human-readable format

![](screenshots/32-03-header-date.png)

### ✅ Header: best_fit role shown

![](screenshots/32-04-header-best-fit.png)

### ✅ Header: recommendation badge visible

![](screenshots/32-05-header-badge.png)

### ✅ Track cards show all available role tiers with score bars and badges

![](screenshots/32-06-track-cards.png)

### ✅ Best-fit role is visually highlighted

![](screenshots/32-07-best-fit-highlighted.png)

### ✅ Trajectory curve renders correctly

![](screenshots/32-08-trajectory.png)

### ✅ Lighthouse panel renders if data is present; hidden if absent

![](screenshots/32-09-lighthouse.png)

### ✅ matched_concepts component handles both string[] and {concept, occurrences}[] without errors

![](screenshots/32-10-concepts-in-role-row.png)

### ✅ Concepts section — matched and missing for best-fit role

![](screenshots/32-11-concepts-section.png)

### ✅ Back link navigates to candidate page

![](screenshots/32-12-back-to-candidate.png)

### ✅ 🔍 Deep-link to report URL works without navigating from candidate

![](screenshots/32-13-deep-link.png)

### ✅ 🔍 Non-existent report ID shows error state

![](screenshots/32-14-bad-report-id.png)