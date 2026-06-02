# Issue 41 — Opening detail + sourcing progress UI

**Verdict:** PASS

**Run:** 2026-06-02T13:56:45.172Z



## Steps

### ✅ /openings/:id renders the opening's details and ranked candidate table

![](screenshots/41-01-opening-detail.png)

### ✅ "Start Sourcing" button triggers sourcing and navigates to the progress page

![](screenshots/41-02-sourcing-progress-page.png)

### ✅ Progress page streams live updates via SSE until job reaches terminal status

![](screenshots/41-03-sourcing-live.png)

### ✅ Navigating back to /openings/:id after sourcing shows the ranked results

![](screenshots/41-04-detail-after-sourcing.png)

### ✅ 🔍 Returning to a completed progress page shows terminal state (SSE onerror fallback works)

![](screenshots/41-05-probe-return-to-terminal-job.png)