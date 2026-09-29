# Minimum Hackathon Dataset Plan

Priority: **tomorrow's demo**. This plan cuts [HACKATHON_DEMO_DATA.md](HACKATHON_DEMO_DATA.md) down to what the demo needs.
Status: plan only. No code has been changed.

## Decisions (confirmed)

| # | Decision | Effect on the plan |
|---|---|---|
| 1 | First-time visitors get the demo data | The app boots into the demo dataset. The Acme/Apollo seed stays in the code, for tests only. |
| 2 | Wi-Fi is available; the offline engine is the fallback | No extra AI work. Live summaries are used, and offline results carry the "Offline mock" badge. |
| 3 | Client 360 covers every project for the client | This already works through `client_name`. No Client 360 changes tomorrow (see NH-4). |

## Goal for tomorrow

| Need | Covered by |
|---|---|
| Demo dataset with safe, fictional projects | M-1 |
| Reset to demo data, plus demo data on first boot | M-2, M-3 |
| Predictable scenario order | M-1 (fixed IDs and order), M-4 (Client 360 opens on the right client) |
| All key capabilities shown | The dataset already in the design doc, plus the walkthrough |

---

## Must Have (tomorrow)

Estimated total: **about 1 hour**, plus one manual run-through.

| # | Task | Files | Est. | Notes |
|---|---|---|---|---|
| **M-1** | **Create the demo dataset module.** `DEMO_DATASET_VERSION = 'hackathon-demo-v1'`, the clients, projects, cards and notes, and `buildDemoState(now)`, which converts `ageDays` to real dates and fills the standard fields (Appendix B of the design doc). | **Create** `static/js/data/demoDataset.js` | 20 min | The content is final and already checked. It can be generated straight from the checked data file (`dataset.json`), so nothing is retyped by hand. It uses only existing field names. |
| **M-2** | **Add the demo reset and the first-boot switch.** Add `resetToDemoDataset()`: remove `onion_db_state`, the legacy keys, `onion_projects`, `onion_review_queue`, `onion_review_draft_*` and `onion_vector_queue`; write `buildDemoState()`; set `activePersona = 'Brené'`. Keep the API key and model settings. On first boot (empty storage), load the demo state instead of `mockSeed`. | Modify `static/js/core/FailoverDB.js` | 15 min | `resetToSeedData()` and `mockSeed.js` are **unchanged**, so the existing harness steps still work. The demo state includes all five collections, so no Acme data can be merged back in. |
| **M-3** | **Rename and rewire the reset button.** The label becomes **"↺ Reset Demo Dataset"** and it calls `resetToDemoDataset()`. The message reads "Demo dataset restored ✅", then the page reloads so the selected project, persona, filters and review queue all start clean. | Modify `static/js/components/HarvesterPanel.js` (`onResetSeed`, button at line 741) | 10 min | The reload is what makes every reset identical. |
| **M-4** | **Remove the hard-coded "Acme Corp" defaults.** Client 360 should follow the active project's client, and the new-project account should start empty. | Modify `static/js/components/App.js` (lines 61 and 84) | 5 min | Without this, Client 360 opens an empty "Acme Corp" page with the new data. This is a bug fix, not an enhancement. |
| **M-5** | **Bump the cache version** so browsers fetch the new modules. | Modify `static/index.html` | 2 min | The service worker serves cached copies first; bumping avoids the "reload twice" surprise. |
| **M-6** | **Do one manual run-through** of [Demo_Walkthrough_Dataset.md](Demo_Walkthrough_Dataset.md) steps 1–8, then reset. | None | 15 min | This is a rehearsal, not automated testing. Check three things: the match on AP-4410, evidence going from 74% to 85%, and Handover showing 8 Open / 2 Closed. |

**Files touched tomorrow:** 1 new (`demoDataset.js`) and 4 modified (`FailoverDB.js`, `HarvesterPanel.js`, `App.js`, `index.html`).
**Not touched:** Smart Append, similarity, Chroma, confidence, approval, `TimelineCard.js`, `HandoverModal.js`, `mockSeed.js`, the vector service.

### Scenario order (fixed by the data)

| Order | What | Why it's predictable |
|---|---|---|
| 1 | Boots on **Beacon-201** as **Brené** | Beacon has the newest project `created_at`, and the reset sets the persona |
| 2 | Walkthrough S2 (AP-4410), then Handover, then Client 360 | Every pasted update has one unique reference ID, so the match can't vary |
| 3 | Encores: S8, S4 (Daniel, Meridian-420), S10 (Brené, Beacon-201) | Same exact-ID rule. Reset between judging slots. |

---

## Nice to Have (only if time remains tonight)

| # | Task | Files | Est. | Why it's optional |
|---|---|---|---|---|
| NH-1 | Rename the organisation names in judge-visible docs: "McKinsey / Contoso" and the Acme / `acme.com` examples. | `static/docs/guide-app/GuideData.js`, `static/docs/relationship-v5/components/MapView.js` (line 34), `data/story.js`, `data/runtimeModel.js`, `data/domainModel.js` | 15 min | **Do this if the guide or the Relationship Model page will be shown.** It's text only. Otherwise the app itself is already clean after M-1 and M-2. |
| NH-2 | Two-step confirm on the reset button ("Click again to reset"). | `HarvesterPanel.js` | 5 min | Only guards against accidental clicks; the reset itself is safe to repeat. |
| NH-3 | Replace the `'Acme Corp'` / `'Apollo-123'` fallbacks in vector record metadata with `''`. | `static/js/core/VectorSync.js` (lines 41–44) | 2 min | Only matters if the vector service runs, and the plan is to run without it. |

---

## Post-hackathon (explicitly not tomorrow)

| # | Task |
|---|---|
| PH-1 | Client 360 "Know-how" built from each project's existing SharePoint links (decision 3), replacing the hard-coded sample items |
| NH-4 → PH-2 | Clickable Client 360 theme chips that list the matching cards across projects |
| PH-3 | Automated harness step for every scenario (validation, regression) |
| PH-4 | Dataset consistency checker (unique IDs, wording rules, expected numbers) |
| PH-5 | Clearing the old Apollo/NovaTech records from Chroma |
| PH-6 | Staged title from the first line of the input (it touches Smart Append input) |
| PH-7 | Handover: leave out "Only me" cards by default; hide "Share update with team" after sharing (SA-4) |
| PH-8 | Rename the remaining docs (`Continuum-V4-Final.html`, the data-model HTML pages, `bookmarklet.js`, `integrity.js`) |

---

## Demo-day checklist

1. Leave the vector service (`:8006`) off.
2. Set the API key in ⚙️. If the network drops, the offline engine takes over and the badge says so.
3. Click ⚙️ → **↺ Reset Demo Dataset**. The page reloads on Beacon-201 as Brené.
4. Keep the walkthrough input in a text editor and copy-paste it; never type it live.
5. Paste each input once. **Don't switch persona between Approve and Share.**
6. Reset between judging slots.
