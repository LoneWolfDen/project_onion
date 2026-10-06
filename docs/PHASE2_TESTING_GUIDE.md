# Continuum Phase 2: manual testing guide

For Releases 0 to 3 (PRs #37 to #61). Allow about 60 to 90 minutes for everything; each section stands alone, so you can test one feature at a time.

Sample files are in `docs/phase2-test-samples/` in this repo:

| File | Use |
|---|---|
| `raid-sample-v1.csv` | RAID import (4 rows, canonical headers) |
| `raid-sample-v2-reimport.csv` | Re-import diff: 1 changed, 2 unchanged, 1 new |
| `raid-sample-old-template.csv` | Old template with different headers, tests column matching |
| `gdp-sample.csv` | GDP import: 1 row for project 8399, 1 row for another project |
| `sample-email.eml` | Email import, with a Decision, an Action, a phone number and an attachment |
| `sample-meeting.vtt` | Transcript import with a Decision and an Action |

Where a menu name below is my best reading of the code rather than something I saw on screen, I mark it *(look for)*. If the label differs, tell me and I will fix the guide.

---

## 0. Run the app

```bash
git clone https://github.com/LoneWolfDen/project_onion && cd project_onion   # or git pull origin main
node scripts/check-repo.mjs                  # hygiene check, expect pass
for t in modules/experience-pwa/tests/*.test.mjs; do node "$t" || echo "FAIL $t"; done   # unit tests
python3 modules/experience-pwa/service.py    # serves http://localhost:8002/app
```

Open **http://localhost:8002/app** in Chrome or Edge. Use a fresh profile or an Incognito window for a clean first run (DevTools, Application tab, Clear site data resets between runs).

Optional services (anchor 8000, cards 8001, vector 8006) are only needed for the vector and AI features; the sections below work without them.

Quick sanity: the project list loads on the left, the top bar shows Persona, Radar, Present and Guide.

---

## 1. Import wizard: RAID (IMP-01/02/03)

1. Pick (or register) a project on the left. Open the Harvester drawer (**harvester-open-btn**, the button that opens the right-hand control panel).
2. In **Drop Project RAID Log Spreadsheet**, choose `raid-sample-v1.csv`.
3. Wizard opens. Expect: step "Check the column mapping" with all 11 columns matched, a preview of 4 rows, no errors, no duplicate warning.
4. Confirm. Rows appear in the staging list as drafts for the active project.
5. Approve one row. Expect it on the project timeline as a card with category Risk/Issue/etc, not Uncategorised, with its source (file, row) shown.
6. Dates: the wizard should show `01-09-2026` as 1 September (day first). Scores (0.6, 0.8, 0.48) appear exactly as in the file.

**Smart matching:** import `raid-sample-old-template.csv`. Expect headers like `Raised`, `Prob`, `Owner` to be suggested for the canonical fields, listed for you to confirm, with a "Not imported" list for anything unmatched. Try **Apply suggestions**. The optional "Ask an assistant to match the rest" should do nothing unless an AI key is configured.

**Duplicate file:** import `raid-sample-v1.csv` again. Expect a duplicate warning (same file hash).

**Re-import diff (IMP-03):** after approving rows from v1, import `raid-sample-v2-reimport.csv`. Expect counts: 1 changed, 2 unchanged, 1 new. The changed row is staged as an update on its existing card, not a new card.

Edge cases worth a try: a CSV with a required header renamed (should be reported before anything is staged); a date like `31-31-2026` (should show as text with a warning).

## 2. Import wizard: GDP (IMP-04)

1. Make sure the active project has GDP ID 8399, Project ID 12345 (leading zero ignored) or Opportunity ID O-5030460. The sample's first row uses all three. Edit the project via Edit Project Details if needed.
2. Drop `gdp-sample.csv` into **Drop Weekly GDP Tracker Spreadsheet**.
3. Expect: 1 row matched to the active project, 1 row listed as "other project / not matched" with counts (never silently dropped).
4. Approve the matched row. Expect status cards with RAG colours (Budget Yellow, Status Indicator Yellow), status date 28/09/2026 as the as-of date, and file/sheet/row cited in provenance.
5. Missing header test: delete the `Status Date` column from a copy and import it. Expect a clear message before anything is staged.

## 3. Email and transcript import (IMP-06)

1. Harvester drawer, **Import an email (.eml) or meeting transcript (.vtt)**, choose `sample-email.eml`.
2. Preview dialog shows Message ID, Sent, Subject, File hash, and the attachment listed but not imported. Nothing is saved until you confirm.
3. Expect the "Decision:" and "Action:" lines to become **Draft proposals**, never recorded decisions. The phone number should be flagged by privacy screening.
4. Repeat with `sample-meeting.vtt`. Expect speaker names and cue timestamps kept, and the two marked lines as drafts.
5. A plain sentence with no "Decision:" prefix must not be turned into a decision.

## 4. Bookmarklet (IMP-05)

1. In the Harvester drawer, click **Copy bookmarklet**, then create a browser bookmark and paste the copied text as its URL.
2. Capture is off until a source host is approved: in the drawer enter a host (for example `en.wikipedia.org`) and click **Approve source**.
3. Open that site, select a paragraph, click the bookmark. Expect an alert saying "Selected text", character count, "Copied".
4. Back in Continuum click **Stage clipboard**. Expect a preview, and the item staged as a draft only.
5. Try the same on a host that is not approved: the item should be refused.
6. No network calls: DevTools Network tab stays silent while the bookmarklet runs.

## 5. Privacy screening and protected originals (PRV-01/02/05)

1. Harvester drawer, **Privacy screening**. Add an extra word to filter (for example `Project Zebra`) and a pattern such as `ticket=\d+`; click **Try it** with sample text, then **Save screening settings**.
2. Stage a clipboard note containing a phone number, `ticket=123` and `Project Zebra`. Expect redactions marked in the preview and a redaction count.
3. Approve it. Open **Protected originals** → **Show originals**: the unredacted text should be there, available only on this device. Check **Delete this original** and **Delete all** (both should ask for confirmation).
4. Typed notes also keep their original (fixed in Release 2).
5. No-AI default: with no key set, nothing should call an AI service (DevTools Network). Keys must not appear in localStorage (Application tab).

## 6. Handover review and zip export (HND-01 to 04)

1. Left sidebar, **Handover Pack [Generate]**.
2. Select the project(s). Expect only **approved** statements to be included; drafts and private items are listed as excluded or flagged in the review summary.
3. Tick/untick `ho-include-unconfirmed` and confirm the counts change. Click the confirmation control (`ho-confirm`). Expect a timestamp (`ho-confirmed-at`).
4. Export is blocked until the review is confirmed.
5. Generate **Interactive HTML Report**: open the file offline; it should be standalone.
6. Generate the package (`ho-package`): a `.zip` downloads. Unzip it. Expect markdown, html, json, `sources.csv` and a manifest with SHA-256 hashes. Verify one: `sha256sum handover.md` should match the manifest.
7. **Save Handover to Project Memory** adds a note; it then shows under "Handovers" in the knowledge panel of the cards used.

## 7. Decisions, knowledge panel and reuse (KNW-01 to 04, HUI-02)

1. On any timeline card, click **Record as decision**. A prompt asks why; answer and confirm. Expect a decision badge showing who recorded it. Click again to clear it.
2. Check that only a person can do this: AI-generated drafts must not offer or create decisions.
3. Open the card's **Knowledge panel**. Expect: Contributors (approved only), independent source count, Evidence strength (see `docs/EVIDENCE_STRENGTH.md`), Decisions, Handovers.
4. Click **Reuse in another project…**, pick a project, then **Create draft**. Expect a Draft in the target project, labelled "Reused from", and the original showing "Reused in". It becomes "verified" only after you approve the copy.

## 8. Presentation mode and Radar (HUI-02, RAD-01)

1. Top bar **Present**. Expect a banner "Presentation Mode", private and draft cards hidden (with a count), editing controls hidden, nothing deleted. **Exit** or **Exit presentation** returns. Reload the page: it must not stay in presentation mode (session only).
2. **Radar** button. Expect a panel listing continuity risks by rule, or "No continuity risks found". To trigger one: a project with a single contributor, or a stale high-risk item. **How levels are decided** explains each rule. Confirm there is no scoring of individuals.

## 9. Backup and restore (DAT-01/02/03/05)

1. Harvester drawer, **Backup and restore**, **Export backup**: a JSON file downloads.
2. Make a visible change (add a note or delete a card; destructive actions should ask for confirmation and offer undo).
3. **Choose backup file** with the exported file, pick **Merge (keep what I have)** and then separately **Replace everything**, then **Restore**. Expect the data to match the backup, and Replace to warn before overwriting.
4. A tampered file (edit the JSON by hand) or a non-backup file should be rejected with a message, not partially applied.
5. Storage: Application tab, Storage should show data persisted (DAT-04 requests persistent storage). If the browser denies it, a **Storage problem** banner with **Download recovery file** appears.
6. First run after upgrading from older data: the one-time migration to IndexedDB (DAT-03) should leave counts unchanged. Compare card counts before and after.

## 10. Offline, install and update (PWA-01/02)

Use `localhost`, which browsers treat as secure.

1. Load the app, wait a few seconds, then DevTools, Application, Service Workers: `sw.js` should be activated; Cache Storage should list a versioned precache.
2. Tick **Offline** in DevTools (or stop `service.py`) and reload. The app must still start and show your data.
3. Install: the address bar install icon (Chrome/Edge) should offer **Install**. Launch the installed app; it should open standalone with the Continuum icon.
4. Update prompt: with `service.py` running, edit any file under `static/` (add a comment to `static/css/tokens.css`), restart the service, reload twice. Expect the **Update available** banner with **Update now** / **Later**. Click **Update now** and confirm the page reloads on the new version.

## 11. Diagnostics and display options (OPS-01/02, HUI-03)

1. Harvester drawer, **Diagnostics**: **Preview log** shows exactly what would be exported; **Download log** saves it; **Clear log** empties it. Check the log contains no note text, emails or keys.
2. Tick **New card layout (clearer title, quieter details)**: cards should show a clearer hierarchy; untick to revert.
3. Typography (HUI-01): text should be readable at 100% zoom, with no tiny grey-on-white captions.

## 12. Local-only services (PRV-03/04), only if you run the optional services

```bash
curl -i http://127.0.0.1:8002/            # works
curl -i -H "Origin: https://evil.example" -X DELETE http://127.0.0.1:8000/anchors/clear   # expect 403
curl -i -H "Host: attacker.example" http://127.0.0.1:8000/     # expect 400
```

Services must listen on 127.0.0.1 only: `ss -ltn | grep -E ':(8000|8001|8002|8006)'` shows `127.0.0.1`, never `0.0.0.0`.

## 13. Second device on your network (still unverified)

Important: browsers only allow service workers and Install on HTTPS or `localhost`. Over plain `http://192.168.x.x:8002` the app will load and work, but it will not install and will not work offline. That is a browser rule, not a bug. Test the two things separately.

**13a. Does it load and work from another device?** (deliberate, temporary loosening: do this on a trusted home or office network only.)

```bash
export ONION_ALLOW_REMOTE=1
export ONION_BIND_HOST=192.168.1.20      # your computer's LAN address (ipconfig / ip addr)
python3 modules/experience-pwa/service.py
```

On the phone or second laptop, on the same Wi-Fi, open `http://192.168.1.20:8002/app`.

- Expect: the app loads, projects show, you can add a note and stage a file. Data is stored on that device, separate from your first browser.
- Expect: calls to optional services on `localhost` fail on the second device (they point at itself). That is normal with the loopback-only default.
- If the page stays on "Loading…", copy any DevTools console error and send it to me; a firewall prompt on your computer for Python is the most common cause.
- Stop the service when done and unset the variables (`unset ONION_ALLOW_REMOTE ONION_BIND_HOST`).

**13b. Does install and offline work on a phone?** Needs HTTPS. Easiest safe route: Chrome on Android, `chrome://flags`, "Insecure origins treated as secure", add `http://192.168.1.20:8002`, relaunch, then retest section 10 there. On iPhone, Safari needs real HTTPS; skip unless you have a trusted tunnel.

---

## What to report back

For each section: pass, fail or not tried, and for failures the exact step, what you saw, and a screenshot or console error. I can then raise fixes as one PR.

## Known limits (not bugs)

- Decision and action extraction needs explicit "Decision:" or "Action:" markers.
- Radar scans approved cards only, not items still in staging; levels are fixed rules.
- The handover `.zip` is stored uncompressed.
- `ONION_PERSONA` is unset by default, so the persona drop-down is a test aid, not security.
- Safari is not covered by automated checks; test in Chrome or Edge first.
- Still open for you in GitHub: mark the `critical-tests` check as required in the branch rules.
