# Vector store and tags: assessment and plan

Date: 6 October 2026. Scope: how hashtags are created in the PWA, and how the Chroma vector
store is built and queried. Written after reading the live code, not the older design notes.

Companion documents: [phase3_assessment_plan.md](../phase3_assessment_plan.md) (what Phase 3 is
for), [TESTING.md](TESTING.md) (how to run the checks), [INDEX.md](INDEX.md).

---

## 1. Tags

### 1.1 Why the words looked odd

A tag in this app is meant to be a structured field: `core/handover.js` maps thirteen tag keys to
the handover categories, so a tag decides which section a card lands in. Five separate things were
putting words into that field that meant nothing to it.

| Where | What it added | Why it read as noise |
| --- | --- | --- |
| `AiClient.mockResult` | `#Mock_Tagged` on every offline card | A marker for the engine, stored as if it described the content. `aiEngine` already records this. |
| `AiClient.parseAiJson` | `#Auto_Tagged` whenever a model omitted tags | Same: it describes the pipeline, not the card. |
| Both provider catch blocks | `#Mock_Fallback` | A third engine marker, on cards whose provider call failed. |
| `AiClient.mockResult` | `#Furlough_Flag` | A hackathon-era rule with no category and no consumer. |
| The two system prompts | "tags (array of hashtag strings)" | A model invited to invent any string duly invented strings, which then filed nothing. |
| `AppRight.uniqueTagsFromContext` | every `#word` found in card title, detail, content or synthesized text | This is the big one: any hashtag-looking word in pasted content (a Teams message, an email signature, a ticket reference) became a Filter Aid chip, so the chips were mostly words that filtered nothing. |

### 1.2 What changed in this release

- **`core/tags.js` (new)** is the single closed vocabulary: the thirteen tags, `tagKey` (so
  `#Risk_Watch`, `risk watch` and ` #risk-watch ` are one tag), `displayTag`, `normalizeTags`
  (splits anything into known tags plus leftovers), `tagsFromText` (deterministic whole-word
  rules) and `TAG_PROMPT_LIST`.
- **`AiClient.js`** tags offline cards from `tagsFromText` only. No engine markers are stored as
  tags. Both prompts now name the vocabulary and say not to invent tags. A model's extra tags are
  kept as `tagSuggestions`, an unconfirmed suggestion, never as a tag that files a card.
- **`handover.js`** imports the shared `tagKey` instead of keeping its own, so the two cannot drift.
- **`AppRight.js`** builds Filter Aid chips from the tags cards actually carry, normalised to the
  vocabulary. Hashtag-looking words inside card text are no longer tags.
- **`tests/tags.test.mjs` (new)** asserts the spellings collapse, that leftovers stay out, that
  whole-word matching keeps "report", "support" and "opportunity" out of purchase orders, and that
  every vocabulary tag maps to a handover category and vice versa. That last assertion is the guard
  that stops a new tag being added in one file and forgotten in the other.

### 1.3 What is left, in order

1. **Show `tagSuggestions` in the review queue** as "suggested, not applied", with one tap to
   accept into the vocabulary or dismiss. Until this ships the extra tags are stored and ignored.
   Small, UI only.
2. **Let the vocabulary be extended from the UI** (add a tag, pick its category) with the pair
   written together, so the category map can never be missing an entry. Medium.
3. **Back-fill existing cards**: a one-off pass that rewrites stored tags through `normalizeTags`,
   so old cards stop carrying `#Mock_Tagged`. Needs a confirm step, since it edits the vault.
4. **Retire the keyword fallback in Filter Aid.** When no card carries a tag, the panel still falls
   back to project keywords prefixed with `#`. They read like tags but are search terms. Better: a
   different chip style and the label "search terms".

---

## 2. Chroma and the vector search

### 2.1 What was wrong

1. **The distance function was never declared.** `get_or_create_collection` was called with no
   metadata, so Chroma used its default, squared L2. The PWA converted the number with
   `1 - distance / 2`, which is the cosine formula. It happened to behave because the default
   MiniLM embeddings are normalised, but nothing said so and nothing checked it. Swap the model and
   every merge suggestion silently changes.
2. **Demo values were stored as facts.** An unnamed client was stored as "Acme Corp" and an
   unnamed author as "Walter", in the same metadata the privacy filter reads: a card with no author
   would have been readable as Walter's.
3. **`top_k` was fixed at 4**, so on a project with hundreds of cards the answer was drawn from
   four of them regardless.
4. **`/ask` said "Found N relevant results"** when it composes nothing. It retrieves.
5. **No way to see the store's state** from the app: no count, no space, no warning that the data
   on disk was built under the old default.

### 2.2 What changed in this release

- `store.py` declares `DISTANCE_SPACE = "cosine"` on the collection, reads back the space the
  collection was actually created with, and logs a warning when they differ (an existing store
  keeps its own space: `get_or_create` does not migrate it).
- `store.stats()` and `/health` now report collection, count, space, whether the space is the
  expected one, and the effective `top_k`.
- The "Acme Corp" and "Walter" fallbacks are gone from `store.py`, `main.py` and
  `VectorSync.toVectorPayload`. A card with no author is refused by the scope rules rather than
  mirrored under someone else's name.
- `top_k` is `ONION_VECTOR_TOP_K`, default 6, clamped to 1..20.
- `/ask` returns the space it measured with, and says plainly that it retrieved and composed nothing.
- `VectorSync.similarityForDistance(distance, space)` converts according to the space the service
  reports (cosine 0..2, squared L2 over normalised vectors 0..4); the 0.85 gate and the merge score
  both go through it, and the reason text now states the similarity, the space and the distance.

### 2.3 What is left, in order

1. **Rebuild the store once.** Any `chroma_data` created before this change is still L2. Stop the
   service, delete the `chroma_data` directory, start it and let the PWA re-mirror. `/health` will
   then say `"space_ok": true`. One minute's work, and until it is done the scores are the old ones.
2. **Chunk long cards.** A card is stored as one blob of `Title / Content / Provenance`. A long
   handover note averages into a vector that matches nothing in particular. Split on paragraph at
   roughly 800 characters with a small overlap, store `parent_id` in the metadata, and de-duplicate
   hits by `parent_id` after the query. This is the single biggest quality win available.
3. **Pin the embedding model and make it offline.** The default embedding function downloads an
   ONNX MiniLM on first use, which contradicts offline-first and means two machines can silently
   hold different vectors. Name the model explicitly, record it in the collection metadata, refuse
   to query when the recorded model and the running one differ, and document the one-time download
   (or vendor the model file).
4. **Add `/rebuild` and `/compact`.** Re-ingest every card from the PWA's own vault and drop
   orphans (cards deleted while the service was down). Needs a confirm step in the UI; the privacy
   rules apply unchanged.
5. **Show the store's state in the capability panel.** Count, space, model, last mirror, and the
   "rebuild needed" warning, next to the existing probes. Then step 1 is self-evident instead of
   needing this document.
6. **Decide whether `/ask` should ever answer.** Today it retrieves and the PWA composes the
   wording, which is the honest arrangement and keeps content on the device. If a local model is
   ever added (the spike in the Phase 3 plan), it belongs behind the same provider interface as the
   remote ones, defaulting to off.

### 2.4 Not recommended

- **A second vector store, or a hosted one.** The local-first rule is the point of the design.
- **Raising the 0.85 merge gate to catch more merges.** The gate is not the weak link; one
  unchunked blob per card is. Fix the chunking first, then measure.

---

## 3. How to verify

```
node --test modules/experience-pwa/tests/*.test.mjs          # unit, includes tags.test.mjs
cd modules/vector-service && python3 -m unittest discover -s tests
node modules/experience-pwa/tests/smoke.mjs                   # Chromium
node scripts/check-repo.mjs && node scripts/css-usage.mjs --check
```

For the vector service itself: start it, then `curl localhost:8006/health` and check
`store.space_ok` is true. If it is false, do step 2.3.1.
