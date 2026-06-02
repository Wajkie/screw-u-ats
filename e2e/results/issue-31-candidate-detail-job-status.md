# Issue #31 — candidate detail + job status page with SSE

**Verdict:** PASS

**Run:** 2026-06-02T09:51:48.466Z



## Steps

### ✅ Candidate with no reports yet shows an appropriate empty state (not an error)

![](screenshots/31-01-empty-state.png)

### ✅ Candidate detail shows metadata (username, display name, notes)

![](screenshots/31-02-metadata.png)

### ✅ Re-analyze button posts a new job and navigates to the job status page

![](screenshots/31-03-navigated-to-job-status.png)

### ✅ Job status page connects to SSE and updates the displayed state in real time

![](screenshots/31-04-sse-state-update.png)

### ✅ Page auto-redirects to the report detail page on "done"

![](screenshots/31-05-redirected-to-report.png)

### ✅ Candidate detail shows latest report summary and snapshot history list

![](screenshots/31-06-detail-with-report.png)

### ✅ Failed job shows error message, not a blank screen

![](screenshots/31-07-failed-job.png)

### ✅ useJobStream closes the EventSource on component unmount (no memory leak)

![](screenshots/31-08-unmount-no-errors.png)