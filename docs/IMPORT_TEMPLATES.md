# Import templates: GDP export and RAID log

Source: column lists supplied by the product owner on 5 Oct 2026, with the type/format hints from the sample row. These are the agreed headers for IMP-03 (RAID) and IMP-04 (GDP). Headers are matched by exact name (case and whitespace insensitive); nothing is inferred from keywords. Empty cells stay empty and are shown as "Not found".

## GDP export (42 columns)

| # | Header | Hint from sample | Role in Continuum |
|---|---|---|---|
| 1 | Engagement Name | text | Display name; project match fallback only |
| 2 | Account Name | text | Client match |
| 3 | GDP ID | number | **Project join key** |
| 4 | Project ID | number | **Project join key** (compare with leading zeros stripped, as in `schema.js`) |
| 5 | PeopleSoft Engagement ID | text | Reference |
| 6 | Delivery Model | e.g. Co-Managed | Attribute |
| 7 | Practice | e.g. Co-Managed (CM) | Attribute |
| 8 | Location of Delivery | e.g. Client Site | Attribute |
| 9 | Opportunity ID | e.g. O-2131213 | **Project join key** |
| 10 | SMP Link | SharePoint URL | Source link |
| 11 | Business Unit / BSV | text | Attribute |
| 12 | Service Type | text | Attribute |
| 13 | GDD | text (person) | Stakeholder |
| 14 | GDM | text (person) | Stakeholder |
| 15 | PrgM | text (person) | Stakeholder |
| 16 | EM / DL | text (person) | Stakeholder |
| 17 | BDM / AM / SAM | text (person) | Stakeholder |
| 18 | National Account Owner | text (person) | Stakeholder |
| 19 | OSG POA | text | Attribute |
| 20 | OSG BOA | text | Attribute |
| 21 | Sales Organization | text | Attribute |
| 22 | Start Date | DD/MM/YYYY | Milestone |
| 23 | End Date | DD/MM/YYYY | Milestone |
| 24 | Phase | e.g. Closed | Current status |
| 25 | Status Date | DD/MM/YYYY | **Drives freshness / as-of date** |
| 26 | Summary | free text | Status statement |
| 27 | Schedule | Green / Yellow / Red | RAG |
| 28 | Schedule Comments | free text | Status statement |
| 29 | CSAT | RAG | RAG |
| 30 | CSAT Comments | free text | Status statement |
| 31 | Budget | RAG | RAG |
| 32 | Budget Comments | free text | Status statement |
| 33 | Engagement Risk | RAG | RAG |
| 34 | Engagement Risk Comments | free text | Status statement |
| 35 | Resources | RAG | RAG |
| 36 | Resources Comments | free text | Status statement |
| 37 | Status Indicator | RAG | Overall RAG |
| 38 | Risk Profile | e.g. Low / High | Attribute |
| 39 | Risk Survey Date | DD/MM/YYYY | Attribute |
| 40 | Security Profile Date | DD/MM/YYYY | Attribute |
| 41 | Engagement Status | e.g. Engagement | Attribute |
| 42 | Target Technology Platform | e.g. Application Modernization (AM) | Attribute |

Rules (from IMP-04): rows join to a project only through GDP ID, Project ID or Opportunity ID; unmatched rows and rows for other projects are listed with counts, never dropped silently; Status Date is the as-of date; every approved status card cites file, sheet, row and as-of date.

## RAID log (11 columns)

| # | Header | Hint from sample | Role |
|---|---|---|---|
| 1 | Date Raised | DD-MM-YYYY | Raised date |
| 2 | RAID Type | Risk / Assumption / Issue / Dependency | **Type comes from this column only** |
| 3 | Description | text | Statement |
| 4 | Probability | decimal 0-1.00 | Score |
| 5 | Impact | decimal 0-1.00 | Score |
| 6 | Overall Impact | decimal <= 1 | Score |
| 7 | Status / Comments / Mitigation Steps | text | Latest note |
| 8 | Assigned To | text | Owner |
| 9 | Status | text | Status |
| 10 | Due Date | DD-MM-YYYY | Due date |
| 11 | Closed Date | DD-MM-YYYY | Closed date |

Note the date formats differ between the two files (GDP uses `/`, RAID uses `-`); both are day-first. Parsers must reject ambiguous or non-matching dates rather than guess.

## Gaps found in the templates (need a decision before IMP-03/04 are finished)

1. **RAID has no row ID and no project column.** IMP-03 requires re-importing a changed row to append a timeline node to the *same* RAID item, and the file does not say which project it belongs to. Proposed: the user picks the project at import time, and a row's identity is Date Raised + RAID Type + the first 80 characters of Description (normalised). Edited descriptions would then appear as a new item; the alternative is to ask the team to add a RAID ID column.
2. **RAID has no raised-by column.** Only Assigned To (owner) exists.
3. **People columns in GDP** (GDD, GDM, PrgM, EM / DL, BDM / AM / SAM, National Account Owner) hold names. They are treated as stakeholders. Per the product decision emails are kept; names are not redacted, so these need the "private until approved" review like any imported content.
4. **Probability, Impact and Overall Impact** are 0-1 scores with no stated formula. They are imported as given and never recalculated or relabelled (no invented significance).
5. **One GDP row per project per week** is assumed (Status Date drives freshness). If a file holds several dates for one project, every row is staged and the latest Status Date is shown as current.
