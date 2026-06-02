# Issue #42 E2E Results — DB: location, work_type, source fields

**9/9 passed** — 2026-06-02T22:00:28.790Z

## Steps
- ✅ openings.location column exists
- ✅ openings.work_type column exists
- ✅ openings.source_url column exists
- ✅ openings.external_id column exists
- ✅ candidates.location column exists
- ✅ candidates.work_type_preference column exists
- ✅ openings.external_id has UNIQUE index
- ✅ INSERT + SELECT opening with new fields round-trips correctly
- ✅ INSERT + SELECT candidate with location + work_type_preference round-trips correctly