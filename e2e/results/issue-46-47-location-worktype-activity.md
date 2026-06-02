# Issue #46 + #47: location/work_type fields + activity panel

**Verdict:** PASS

**Run:** 2026-06-02T23:08:12.951Z



## Steps

### ✅ NewCandidate form submits location and work_type_preference when filled in

![](screenshots/46-01-new-candidate-form.png)

### ✅ NewCandidate form — submit and verify API stores location + work_type_preference

### ✅ CandidateDetail shows location and work_type_preference when present

![](screenshots/46-02-candidate-detail-location.png)

### ✅ CandidateDetail hides gracefully when location/work_type_preference absent

![](screenshots/46-03-candidate-detail-no-location.png)

### ✅ NewOpening form submits location and work_type

### ✅ OpeningDetail shows location and work_type in the header

![](screenshots/46-04-opening-detail-location.png)

### ✅ NewOpening form UI renders location + work_type fields

![](screenshots/46-05-new-opening-form.png)

### ✅ E2E: create opening with location + work_type, verify both appear on detail page

![](screenshots/46-06-opening-detail-verify.png)

### ✅ Activity panel renders on report detail when data.activity is present

### ✅ Activity panel is hidden when data.activity is undefined

![](screenshots/47-02-no-activity-hidden.png)

### ✅ Analyze Wajkie candidate and verify activity panel on report

![](screenshots/47-03-activity-panel-live.png)

### ✅ All six activity signal fields are displayed

![](screenshots/47-04-all-fields.png)