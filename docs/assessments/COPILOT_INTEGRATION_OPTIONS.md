# Continuum and Microsoft 365 Copilot: Integration Options

Status: options analysis only. Nothing is implemented. The repository contains **no** Copilot code (`static/js` has no Copilot reference; commit `6d08877` mentions "copilot citations", but no such code remains).

**About the Microsoft statements here.** They come from Microsoft's public positioning as generally understood at the time of writing. They were **not verified against your tenant**. Licence entitlements, preview status and admin policies change frequently and vary by tenant. Every item marked *(verify)* must be confirmed with your M365 tenant administrator before it is relied on.

## 0. Ground rules

1. **Continuum will not call your Microsoft 365 Copilot chat session as an API.** There is no supported interface for a local web page to drive a user's Copilot Chat session. Browser automation of Copilot (scripted typing, DOM scraping, injected scripts, extensions) is **out of scope and must not be built**.
2. **Copilot cannot reach Continuum.** Continuum runs on `127.0.0.1`, and Microsoft cloud services cannot call a service on your laptop. Any pattern in which Copilot or an agent "calls Continuum" needs a hosted endpoint, which breaks the local-only constraint.
3. **The interface between the two is a file the user moves on purpose.** Continuum produces a grounded, approved package. The user decides whether it enters the M365 boundary.
4. Moving content into M365 keeps it inside the corporate tenant. It is still a **change of data boundary** (from device-only to tenant) and must be a deliberate user action per export.

---

## A. Out-of-the-box Copilot workflow (recommended first)

**Flow**
1. Continuum generates the handover from approved items only, as a package: `handover.md` (readable), `handover.json` (statements with `kind`, `sourceRefs` and IDs), `sources.csv`, and `handover.html` [HND-05].
2. The user opens Microsoft 365 Copilot (Copilot Chat, or Copilot in Word after opening the .md/.docx) and uploads or attaches the package.
3. The user runs a prompt from Continuum's prompt set (pattern V2, [COP-02]). Examples: "List statements marked Needs confirmation and what evidence would resolve them"; "Find contradictions between sections"; "Rewrite the overview for an incoming delivery manager without adding facts; keep [S-123] IDs".
4. The user brings results back **explicitly**, by pasting Copilot's answer into Continuum's "Import external review" box. Continuum matches statement IDs and creates **Draft** suggestions, which the user accepts or rejects.

| Question | Answer |
|---|---|
| What the existing M365 Copilot licence enables | Copilot Chat grounded in work data the user can access, file upload or reference in chat, Copilot in Word for rewriting and summarising *(verify that file upload in Copilot Chat is enabled in your tenant)* |
| Tenant configuration needed | None beyond what is already enabled for you *(verify the upload policy and whether web grounding is on; web grounding may send derived queries to Bing, so consider turning it off for these sessions if your tenant allows)* |
| Administrator consent needed | None |
| Application registration needed | None |
| Hosting needed | None |
| Could violate local-only? | Only by the user's explicit choice to upload. Continuum itself transmits nothing. |
| Changes the data boundary? | **Yes, per upload** (device → tenant). Continuum should show a reminder at export: "This package contains client content. Upload only to approved Microsoft 365 services." |
| Works immediately with no development? | **Partly, today.** The current HTML handover export can already be uploaded. It is not grounded enough (see the architecture doc §3), so do this only after [HND-01..05]. |
| Should remain future work | Automatic return of Copilot output. Any unattended round trip. |

**Safeguards**
- Copilot output re-enters Continuum as **Recommendation** or **Draft** only. It never becomes a **Fact** unless the user links it to a cited source.
- The package states at the top: "Statements are labelled Fact / Inference / Recommendation / Not found / Needs confirmation / Conflicting. Do not add facts not present in the sources."
- Hashes in `handover.json` allow later verification that an uploaded package was not altered.

---

## B. Microsoft-native knowledge grounding

**Idea.** Approved Continuum outputs (handover packages, decision registers) are saved by the user to a permitted M365 location, such as their OneDrive or a project SharePoint library. Copilot then uses them with the user's existing permissions, alongside the user's mail, meetings and files.

| Route | How | Licence | Tenant config | Admin consent | App registration | Hosting | Local-only impact | Immediate? |
|---|---|---|---|---|---|---|---|---|
| B1. Save to OneDrive (manual) | The user saves `handover.md`/`.docx` into a OneDrive folder; Copilot can reference it *(verify that indexing of new files can lag)* | Existing | None | None | None | None | Boundary change per save (user action) | **Yes** |
| B2. Save to a project SharePoint library (manual) | Same, in the team site, so colleagues' Copilot can also use it with their permissions | Existing | Site permissions | None | None | None | Wider audience: the content is now shared | **Yes**, but governance matters (who can read it) |
| B3. Continuum writes to OneDrive via Graph | Continuum uses MSAL + Graph `Files.ReadWrite` to upload the package | Existing | Entra app registration | Possibly (tenant user-consent policy) | **Yes** | None | Continuum gains outbound tenant access | No (P3) |
| B4. Copilot "Notebooks" / Pages with uploaded package | The user creates a Copilot workspace that references the package files *(verify the feature name and availability)* | Existing *(verify)* | None | None | None | None | Same as B1 | Probably |

**Recommendation.** B1 is the default. B2 applies only when the handover is meant for the team. B3 is future work (P3).

---

## C. Agent or extensibility routes

| Route | What it is | Licence implication | Tenant config | Admin consent | App registration | Hosting | Breaks local-only? | Changes data boundary? | Immediate? | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| C1. Declarative agent via Agent Builder (in Copilot) | A no-code agent with instructions plus knowledge sources (for example a SharePoint/OneDrive folder of approved Continuum exports) | Generally available to Copilot-licensed users *(verify; admins can restrict who may create or share agents)* | Agent creation/sharing policy | No Graph consent; admin policy may require approval to share | No | No | No: Continuum is not called | Yes: exports must be stored in M365 (route B) | **Possibly**, if the tenant permits | **P2 pilot**: a "Continuum Handover Reviewer" agent with fixed instructions (no new facts, cite statement IDs) over a OneDrive folder |
| C2. Copilot Studio agent | A low-code agent with knowledge, topics, actions and connectors | May require Copilot Studio capacity/licensing beyond the M365 Copilot seat for some features *(verify)* | A Power Platform environment, DLP policies | Likely, for connectors and actions | For custom connectors | Microsoft-hosted (agent); actions need endpoints | Yes, **if** it calls Continuum (impossible on localhost) | Yes | No | P3, only with governance |
| C3. Microsoft 365 Copilot connector (formerly Graph connector) | Ingests external content into the tenant's index so Copilot can search it | Tenant feature | Search & Intelligence admin | **Yes** | **Yes** | Requires a running connector service (custom connectors need hosting or a connector agent) | **Yes**: needs a service outside the browser | Yes: bulk ingestion | No | P3; not suited to a single-user local tool |
| C4. Microsoft Graph (delegated) from Continuum | Continuum reads or writes M365 data directly (mail, files, transcripts) | Existing | Entra app registration (SPA, localhost redirect) | Often yes | **Yes** | No | No hosting, but adds an outbound authenticated channel | Yes (inbound content, optional outbound writes) | No | P3 (see the integration register G3) |
| C5. Copilot APIs (for example retrieval or chat APIs exposed via Graph) | Programmatic access to Copilot capabilities grounded in tenant data | Requires a Copilot licence for the user *(verify)*; some APIs are preview *(verify)* | App registration and permissions | Likely | **Yes** | No (delegated from the SPA), subject to API CORS support *(verify)* | Sends prompts and context to the tenant | Yes | No | P3 watch item: do not design around preview APIs |
| C6. "Work IQ" / Copilot work-context services | Microsoft's announced intelligence layer that exposes work context to agents *(verify the current name, availability and terms)* | Unknown | Unknown | Unknown | Likely | Unknown | Unknown | Yes | No | Future watch only |
| C7. API plugin / action for an agent | The agent calls an HTTP API described by OpenAPI | As C1/C2 | Yes | Yes | Yes | **Yes: the API must be reachable from Microsoft's cloud** | **Yes** | Yes | No | Not compatible with the release constraints |
| C8. Remote MCP server for an agent | The agent calls tools on an MCP server *(verify support level)* | As C2 | Yes | Yes | Yes | **Yes: public or tenant-reachable server** | **Yes** | Yes | No | Not compatible. A local MCP server on the laptop is unreachable from Copilot. |

---

## D. Summary matrix

| | Works now, no development | Needs tenant config | Needs admin consent | Needs app registration | Needs hosting | Violates local-only | Status |
|---|---|---|---|---|---|---|---|
| A. Upload package to Copilot | ✔ (after the export package exists) | – | – | – | – | Only by user choice | **P1** |
| A+V2. Prompt package | ✔ | – | – | – | – | Same | **P2** |
| B1. Save to OneDrive | ✔ | – | – | – | – | Same | **P1** (documented user step) |
| B2. Save to SharePoint | ✔ | site permissions | – | – | – | Same + wider audience | P2 |
| C1. Agent Builder agent over exports | Maybe | agent policy | maybe | – | – | No | P2 pilot |
| B3/C4. Graph from Continuum | – | ✔ | likely | ✔ | – | Adds a channel | P3 |
| C2. Copilot Studio | – | ✔ | ✔ | maybe | Microsoft-hosted | If calling out | P3 |
| C3. Copilot connector | – | ✔ | ✔ | ✔ | ✔ | ✔ | P3 / not recommended |
| C5/C6. Copilot APIs / Work IQ | – | ✔ | ✔ | ✔ | – | Partly | Watch |
| C7/C8. Plugin / remote MCP | – | ✔ | ✔ | ✔ | ✔ | ✔ | Not compatible |

## E. What keeps future Microsoft use possible (design now, build later)

- A portable package format (`handover.json` schema with statement IDs, kinds and source hashes) [COP-01].
- An `AiProvider` interface in `AiClient` (`none` default; `remote-approved` slot for a future Azure OpenAI in the corporate tenant, behind explicit approval) [PRV-01].
- A `SourceAdapter` interface so Graph adapters can later sit beside file adapters without UI changes [XLS-01].
- No assumptions in the UI about where content came from (already a stated rule in `.clinerules`: "UI agnosticism").

## F. Questions for the tenant administrator

1. Is file upload to Microsoft 365 Copilot Chat enabled for my account? Is web grounding on, and can I disable it?
2. May I create a personal declarative agent (Agent Builder) with my OneDrive folder as knowledge? May it be shared?
3. Is there an approved process for registering an Entra SPA app with a `http://localhost` redirect for delegated `Files.ReadWrite` / `Mail.Read`? What consent is required?
4. Which M365 locations are approved for storing client project handovers?
5. Is Copilot Studio available in our tenant, and under what licensing?
