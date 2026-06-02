# Issue #43 E2E Results — MCP: activity signal computation

**11/11 passed** — 2026-06-02T22:06:09.478Z

## Steps

- [x] **empty list → last_pushed_at=""**
- [x] **empty list → all zeros**
- [x] **empty list → is_recently_active=false**
- [x] **all 6 fields present**
- [x] **repos_last_90d = 1**
- [x] **repos_last_180d = 2**
- [x] **is_recently_active = true**
- [x] **total_original_repos excludes forks**
- [x] **all forks → total_original_repos=0**
- [x] **last_pushed_at = most recent**
- [x] **account_age_months ≈ 23 for 730 days**
