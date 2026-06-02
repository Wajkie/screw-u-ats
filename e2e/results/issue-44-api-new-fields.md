# Issue #44 E2E Results — API: surface location, work_type, source_url

**12/12 passed** — 2026-06-02T22:38:32.059Z

## Steps

- [x] **POST /candidates with location + work_type_preference persists both fields**
- [x] **GET /candidates/:id returns location + work_type_preference**
- [x] **GET /candidates list includes location + work_type_preference**
- [x] **PATCH /candidates/:id updates location + work_type_preference**
- [x] **POST /candidates with invalid work_type_preference returns 400**
- [x] **POST /candidates omitting new fields still works (all nullable)**
- [x] **POST /openings with location + work_type + source_url persists all three**
- [x] **GET /openings/:id returns location + work_type + source_url**
- [x] **GET /openings list includes location + work_type + source_url**
- [x] **PATCH /openings/:id updates location + work_type + source_url**
- [x] **POST /openings with invalid work_type returns 400**
- [x] **POST /openings omitting new fields still works (all nullable)**