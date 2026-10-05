# Evidence Strength (KNW-04)

Shown on each timeline card as "Evidence strength". It is a count of what a reviewer can check, not a model output.

**What counts:** the card's own source plus RAW updates already approved onto the card. Several entries from the same origin (for example two Emails) count as one independent source.

**What does not count:** draft (staged) updates, AI summaries and hashtags.

**Score:** 55 base + 8 per independent source (max 32) + 3 per extra approved entry (max 9), capped at 97. The card shows each term under "How is this calculated?".

**Tier:**

| Tier | Needs |
|---|---|
| Low | One independent source (not corroborated, whatever the score) |
| Medium | Two or more independent sources |
| High | Three or more independent sources and a score of 85 or more |

Reachability: one source scores 63 (Low). Two sources score 71 (Medium). Three sources score 82 (Medium) and need one more approved entry to reach 85 (High). Four sources score 93 (High).

# Statement kinds (KNW-01)

Every statement in the handover has one kind: Fact, Decision, Risk or issue, Assumption, Action, AI suggestion. A Fact must carry a source id, otherwise it is shown as an Assumption. Text written by the mock or fallback AI is always an AI suggestion. A Decision exists only when a person recorded it (KNW-02). Kind comes from structured fields (card kind, RAID type, tags), never from the wording.

# Knowledge compounding and reuse (KNW-03, RAD-02)

The loop: **capture, validate, reuse, new evidence, stronger knowledge.**

- Capture: material enters as a private Draft. It counts for nothing yet.
- Validate: a person approves it. Only then does it count as a contribution and as evidence.
- Reuse: "Reuse in another project" creates a new private Draft in the other project through the normal review step. The original card is never changed. The copy keeps the original contributors, source ids and the strength it had (`reusedFrom`).
- New evidence: approved updates on the original strengthen it (Smart Append matches new material to the existing card instead of making a duplicate). The card panel shows how many entries were added to the original since each reuse.
- Stronger knowledge: Evidence Strength rises only through independent approved sources, as defined above.

What the card panel shows: approved contributors (AI and drafts are not contributors), independent sources, reuse count split into approved and draft, the decisions recorded from it, and the confirmed handovers that included it (ids, who and when only).

Metrics: **contributions** (approved evidence entries) and **verified reuse** (reuses whose copy has been approved) are reported as two separate numbers. There is no combined score and no ranking of people.
