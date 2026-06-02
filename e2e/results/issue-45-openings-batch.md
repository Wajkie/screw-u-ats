# Issue #45 — POST /openings/batch bulk ingest

**Verdict:** PASS

**Run:** 2026-06-02T22:53:24.760Z



## Steps

### ✅ POST /openings/batch creates multiple openings in one request

### ✅ Items with a matching external_id are updated, not duplicated

### ✅ Items without external_id always create new openings

### ✅ Response includes created, updated counts and full openings array

### ✅ Invalid item in batch returns 400 with error detail

### ✅ POST /openings/batch with empty array returns 400