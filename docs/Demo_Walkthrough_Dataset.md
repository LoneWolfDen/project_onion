# Demo Walkthrough: 5-Minute Live Script

Dataset: `hackathon-demo-v1` (all records are defined in [HACKATHON_DEMO_DATA.md](HACKATHON_DEMO_DATA.md), Appendix A).
Story: **Scenario S2, Lost Decision Rationale**, with S1 Handover and Client 360 folded in.
Presenter persona: **Brené** · Project: **Beacon-201** (Halden Mutual Insurance, fictional).
Target time: **4:30–5:00**, with a 30-second optional step you can drop.

| Capability | Where it appears |
|---|---|
| RAW inputs | Step 3: original Teams chat and RAID log rows |
| AI summary | Step 3 (stored) and step 4 (generated live from the pasted email) |
| Similarity detection | Step 4: "Strong match: both mention AP-4410" |
| Smart Append | Steps 4–5: the draft update lands on the existing card, not a new one |
| Evidence strength and provenance | Steps 3 and 5: 74% Medium → 85% High, with three named sources |
| Team memory | Step 2 (Ask Assistant) and step 6 (Walter sees the update; his own note stays his) |
| Handover | Step 7: pack with the decision now under Closed |

---

## Before judges arrive (pre-flight, about 2 minutes)

| # | Action | Check |
|---|---|---|
| P-1 | Stop the vector service on `:8006`, or leave it stopped. | This keeps behaviour deterministic. Card footers may show "Vector: ☁️"; that's expected. |
| P-2 | Decide on the AI engine. **With** an OpenRouter key (⚙️ in the Harvester), the summary is generated live. **Without** one, the offline engine is used and labelled as such. | Both paths are scripted below. |
| P-3 | Harvester ⚙️ → **↺ Reset Demo Dataset** → click again to confirm. The page reloads. | Persona **Brené** · project **Beacon-201** selected · privacy filter **Both** |
| P-4 | Click **Beacon-201** once in the left project list. | Needed until fix C-3 is in; it makes Client 360 open on Halden. |
| P-5 | Open a text editor beside the browser with the **W1 input** below. | **Never type it live.** |
| P-6 | Browser zoom 110–125% for the room. Close DevTools. | |

If a rehearsal has already used the dataset, **reset again** (P-3). Each input must be pasted only once per reset.

---

## The records you will show (in order)

| Order | Record | What's on screen |
|---|---|---|
| 1 | Beacon-201 Key Moments | Top 5: `AP-4410 Decision: nightly batch sync…`, `AP-4452 ADR-007…`, `R-72 Risk…`, `PO-448120…`, `Beacon-201 release 2 status…`. Routine: steering group moved, timesheet portal. |
| 2 | Ask Assistant result | One source card: `demo-bcn-ap4410` |
| 3 | Card `demo-bcn-ap4410` | RAW · Teams Chat · Walter · 150 days ago → AI → RAW · RAID Log Excel · Malcolm · 148 days ago → AI · evidence **74% Medium** |
| 4 | Harvester review item | W1 input, AI summary, **Strong match: both mention AP-4410** |
| 5 | Card `demo-bcn-ap4410` after sharing | New title, 3rd RAW update (Brené, today), evidence **85% High** |
| 6 | *(optional)* Walter's view | "Only me": `Note to self: dead-letter alert threshold feels low`; the Team view includes Brené's update |
| 7 | Handover Pack, Beacon-201 tab | 10 items: **8 Open / 2 Closed**, 1 risk (R-72). AP-4410 now listed under Closed. |
| 8 | Client 360, Halden Mutual Insurance | 3 projects · 5 contacts (Ingrid Vale **on 3 projects**) · #Legacy_Batch_Window ×3 |

### W1 input (copy exactly; type "Email")

```
AP-4410 approved again: nightly batch sync stays for claim status in release 2. Priya Okafor (Halden architecture) confirmed today that the core policy system still caps reads at 200 requests a minute and the vendor API upgrade has moved to next year, so the why behind AP-4410 still holds. Last night's load test finished the batch in 2h 10m inside the 3h window. No new risk to the release 2 plan.
```

The first 80 characters, `AP-4410 approved again: nightly batch sync stays for claim status in release 2.`, become the card title. They contain the reference ID that makes the match certain.

---

## The script

### Step 1 · The problem (0:00–0:30)

**Do:** nothing. Beacon-201 is already on screen, and the Key Moments panel is visible.

**Say:** "Halden's claims team keeps asking why claim status isn't real-time. The engineer who made that call is moving projects, and a new delivery lead joins in two weeks. Continuum keeps the top five moments of this project, and routine noise like 'steering group moved' sits below them."

**Expected:** 5 Timeline Events, with 2 Routine updates underneath.

### Step 2 · Team memory: ask the question (0:30–1:00)

**Do:** in the Smart Assistant panel, type `why nightly batch` and click **Ask Assistant**.

**Expected:**
- *With a key:* a short answer citing card `demo-bcn-ap4410`. The policy system read cap is 200 requests a minute, so the team chose nightly batch plus a morning delta.
- *Offline:* the fallback answer, with the same single card listed as the source.

**Say:** "The answer is five months old, and it's still here: in the team's words, from the source."

### Step 3 · RAW inputs, AI summary, evidence (1:00–1:40)

**Do:** open the card **AP-4410 Decision: nightly batch sync for claim status, not real-time**.
1. Click the first **RAW** pill. The viewer title reads "RAW · original text from Teams Chat", and the author is Walter, 150 days ago. Close it.
2. Point at the **AI** pill next to it. That's the summary; the RAW pill is what was actually said. The legend under the strip says this.
3. Point at the evidence box: **"Evidence strength: Medium (74%) — based on 2 independent sources: RAID Log Excel, Teams Chat · 2 source entries."** Open "How is this calculated?" to show 55 base + 16 + 3 = 74%.

**Say:** "Every summary sits next to its original text. The confidence number isn't a model's opinion: it's a count of independent sources a reviewer can check."

### Step 4 · A new email arrives: similarity and Smart Append (1:40–2:50)

**Do:**
1. Open the **Harvester / Data Park** panel. Set the type to **Email**. Paste **W1**.
2. Click **Stage to Data Park**, then **Run AI Processing Engine**. Offline this takes about 1 second; live, 2–5 seconds.
3. In the review item, point to:
   - the engine badge (live model name, or "Offline mock");
   - **Impact: Key moment (0.90)**;
   - **Strong match: both mention AP-4410**. Hover it to show the rule: "Shared reference ID".
4. Click **✅ Approve & Add to Project (1)**.

**Expected on the card:**
- A new **🔒 draft** pill.
- The banner "🔗 1 draft update added to this card — visible only to you until shared".
- The title is now "AP-4410 approved again: nightly batch sync stays for claim status in release 2."
- The evidence **stays at 74%**, with the draft shown as not counted.

**Say:** "Continuum recognised this email belongs to the existing decision because both mention AP-4410, so it didn't create a duplicate card. It's still a draft only I can see, and the draft doesn't raise the confidence number."

> **Do not switch persona between this step and step 5.** The new title is visible to others before sharing; that's a known limit.

### Step 5 · Share with the team (2:50–3:30)

**Do:** on the card, click **Share update with team** once.

**Expected:**
- The draft pill becomes a normal RAW pill.
- Evidence reads **"Evidence strength: High (85%) — based on 3 independent sources: RAID Log Excel, Teams Chat, Data Park Dropzone · 3 source entries."**
- Open the newest RAW pill. The author is Brené, and it's dated today.

**Say:** "When I share it, it becomes team memory. The same decision now has three people, three sources and five months of history, and the confidence went up because a human added evidence."

*(The button stays visible after sharing. Don't click it again.)*

### Step 6 · Privacy, optional (3:30–4:00)

**Do:**
1. Switch persona to **Walter**. Set the filter to **Only me**: 1 card, "Note to self: dead-letter alert threshold feels low".
2. Set the filter to **Team**: the AP-4410 card shows Brené's update.
3. Switch back to **Brené**, with the filter on **Both**.

**Say:** "Walter's own thinking stays his. What Brené shared, he sees right away."

**Skip this step if you're past 3:30.**

### Step 7 · Handover (4:00–4:40)

**Do:**
1. Left panel → **Handover Pack [Generate]**. Choose the **Beacon-201** tab and **Full Lifecycle**.
2. Point to the categories: Delivery 6 · Operations 1 · Finances 1 · Client Feedback 1 · Internal 1. Then **Open 8 / Closed 2**, and the single risk, R-72.
3. Open **Closed**. "AP-4410 approved again…" is there, dated today, next to ADR-007.
4. *(If time allows)* Untick every project except Beacon-201. Type into Beacon's per-project remark: `Start with the two decision records. R-72 is the one risk to watch; the release 2 invoice depends on it.` Click **Handover to Project Memory**.

**Say:** "The new lead gets the decision, the reason behind it and the evidence, not a slide that says 'batch, for reasons'."

**Optional aside:** switch to **Last 3 Months**, and AP-4410 disappears, because it was made 148 days ago. "That's how decisions get lost in the usual quarterly handover."

### Step 8 · Client 360 and close (4:40–5:00)

**Do:** left panel → **Client 360 [View]**.

**Expected:** Halden Mutual Insurance shows:
- **3 projects** (Beacon, Lantern, Tidewater, with Tidewater archived);
- **5 contacts**, including **Ingrid Vale, on 3 projects**;
- themes led by **#Legacy_Batch_Window ×3**.

**Say:** "And it doesn't stop at the project. What one Halden team learns is available to the next one, even after a project closes. Continuum keeps the reason with the project, not with the person."

---

## If something goes wrong

| Symptom | Cause | Fix on stage |
|---|---|---|
| "Duplicate content detected — skipped." | W1 was already staged since the last reset | Say "already captured". Reset after the demo. |
| No "Strong match" line | The pasted text doesn't start with `AP-4410` (partial copy) | Clear the box and paste again from the editor |
| **Share update with team** is missing | The persona isn't Brené | Switch to Brené. Only the card owner can share a draft update. |
| Evidence still 74% after Approve | This is expected: drafts don't count | Continue to step 5 |
| Client 360 shows an empty "Acme Corp" page | Pre-flight P-4 was skipped (the fix isn't in yet) | Back → click Beacon-201 → Client 360 again |
| The live AI call hangs for more than 5 seconds | Venue network | Wait: the engine falls back to offline and says so on the badge |
| The page looks like the old Acme data | Wrong dataset, or a cached page | ⚙️ → Reset Demo Dataset (double click) → reload twice |

---

## Encore: if a judge asks for another example

Each encore needs **the persona and project switched first**, and the input pasted as **Email**. All of them are exact-ID appends, computed in HACKATHON_DEMO_DATA.md.

| Encore | Persona · project | Paste | Expected |
|---|---|---|---|
| Customer issue closed (S8) | Daniel · Meridian-420 | `AP-3108 resolved: hotfix 4.2.1 is live in 12 pilot stores, no duplicate refunds. All 37 duplicates were reversed. Colm Hartley feedback: store teams are happy with the fix and the CSAT score for the pilot is back to 4.4. No open risk remains on AP-3108.` | Strong match on AP-3108 · evidence 85% → 96% High · Handover: Client Feedback, Open → Closed |
| Money (S4) | Daniel · Meridian-420 | `PO-551870 milestone 2 split agreed in principle: 20% invoiced for 14 live stores. Ada Fenwick will add a contract note; the remaining 15% stays tied to 20 stores live for 10 trading days. Revised PO line expected next week.` | Strong match on PO-551870 · 74% Medium → 85% High · Finances, stays Open |
| Lesson reused (S10) | Brené · Beacon-201 | `R-72 mitigated for release 2 with Tidewater-150 lesson 2: all 9 testers booked. Tomas Reyes released 5 more claims handlers by name, three weeks before the UAT window, exactly as the Tidewater-150 lessons log advised. Risk rating moves from amber to green.` | Strong match on R-72 · 74% Medium → 85% High |
| Cross-team discovery (S9) | Walter · Lantern-202 | *Nothing to paste.* Client 360 → Tidewater-150 → "Tidewater-150 fix: legacy extract times converted to UTC at source" | Read-only discovery, 74% Medium |

After any encore, **reset before the next judging slot**.
