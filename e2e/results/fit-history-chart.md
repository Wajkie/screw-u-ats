# Fit History Chart

**Verdict:** PASS

**Run:** 2026-06-02T15:03:43.242Z



## Steps

### ✅ Find existing candidate with >= 2 reports

### ✅ GET /candidates/:id/fit-history returns >= 2 ordered entries

### ✅ Candidate detail page shows "Score over time" section

![](screenshots/fit-history-chart-section.png)

### ✅ SVG chart renders polyline and >= 2 dots

![](screenshots/fit-history-chart-svg.png)

### ✅ Chart section is absent for a candidate with 0 reports (probe)

![](screenshots/fit-history-chart-hidden.png)