# App handover contract (World of Continuum)

How Continuum, the Finance Engine and the Pre-Sales (Delivery) Accelerator open each other on the same project. Version 1, 6 Oct 2026. Reference code: `modules/experience-pwa/static/js/core/appLink.js` (tests in `tests/appLink.test.mjs`).

## 1. Which ID identifies a project

| ID | Who creates it | When it exists | Use across apps |
|---|---|---|---|
| `Project_ReferenceID` (Continuum ref), for example `Beacon-O-730201-010326090000` | Continuum only, once, at registration | From registration | Exact match when the other app has stored it. Opaque: never parse it, never generate it elsewhere. |
| Project ID, for example `7302010` (Finance: `Project ID`, `projectID`, first part of `PO_Team_Identifier`) | Finance or PMO system | Once delivery starts; a project can have several | Main join key for Finance. Compare with leading zeros ignored. |
| Opportunity number, for example `O-730201` | CRM | From pre-sales; an extension adds a new one | Main join key for Pre-Sales. Case-insensitive exact match. |
| GDP ID, for example `7302` | GDP | Once GDP tracks it | Fallback. |
| Project name and client | People | Always | Shown to the user only. **Never used to match**: names change and repeat. |

Recommendation: keep `Project_ReferenceID` as it is (immutable, minted by Continuum, the "brain"). Do not change its format: existing data, exports and backups use it, and nothing should depend on its parts. Join across apps on the business IDs that each app already holds, in a fixed order, and let each app remember the Continuum ref the first time a link matches so later links match exactly even after IDs change.

## 2. The link

```
<app address>#ctx=<base64url(JSON)>
```

The fragment (`#...`) is never sent to a server and never appears in server logs. JSON fields (all strings or string arrays, all optional except `v` and `from`):

```json
{ "v": 1, "from": "continuum", "ref": "Beacon-O-730201-010326090000", "name": "Beacon-201",
  "client": "Halden Mutual Insurance", "opp": ["O-730201"], "pid": ["7302010"], "gdp": "7302",
  "at": "2026-10-06T07:00:00.000Z" }
```

- `from`: `continuum`, `finance` or `presales`.
- Limits: whole encoded value at most 2048 characters, at most 10 items per list, strings trimmed and cut (name and client 80, IDs 40).
- Never in the link: cards, notes, decisions, amounts, rates, people, emails, files or anything else that is content.
- A context with no `ref`, `opp`, `pid` or `gdp` is invalid and ignored. Unknown fields are dropped; `v` other than 1 is ignored.
- `?ctx=` in the query string is also read, for tools that drop fragments, but apps always send the fragment form.

## 3. Receiving a link

1. Read `ctx` on load and on `hashchange`, then remove it from the address bar (`history.replaceState`) so a reload does not repeat it.
2. Resolve in this order, stopping at the first tier with any match: `ref` (exact, or a stored link to it) → `pid` (leading zeros ignored) → `opp` (case-insensitive) → `gdp`.
3. Exactly one match: open it, already filtered, and show "Opened from <app>: showing <project>, matched by <tier>."
4. More than one match in a tier: select nothing, list them and let the user pick.
5. No match: select nothing, say which IDs were asked for, offer to register or pick a project with those IDs prefilled. Never fall back to a name match or to the first project.
6. Each app may store the received `ref` against the matched project (Continuum's ref) so the next link matches on tier 1.

## 4. Sending a link

The footer (or a "Open in ..." button) builds the link from the active project. Each device can override an app's address (Continuum: Harvester → Linked apps), because Codespaces and local ports change. Only `http:` and `https:` addresses are accepted.

## 5. Tests every app keeps

- Round trip encode and decode, including non-ASCII names.
- Invalid input ignored: bad base64, wrong version, no IDs, over-long value, `javascript:` address.
- Resolve order and leading-zero rule; name-only context resolves to nothing; ambiguous IDs select nothing.
- Link contains identifiers only (check the exact key list).
- Browser test: open the app with a link, the right project is shown and filtered, the banner names the source app, the fragment is gone.
