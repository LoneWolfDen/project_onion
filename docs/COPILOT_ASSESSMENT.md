# Microsoft 365 Copilot and chat assistant assessment

6 Oct 2026. Scope: Continuum (this repo). The Pre-Sales Accelerator reached the same conclusions in its `docs/architecture/COPILOT_AND_CHAT_ARCHITECTURE.md`; the two apps use the same pattern names so they stay consistent.

Starting point: a Microsoft 365 Copilot licence gives a person Copilot inside Microsoft 365. It is **not** a JavaScript API that a browser app can call, and it cannot be driven by automating the Copilot web page (not permitted). So Continuum works with Copilot through files and copy-paste first, Microsoft-native storage second, and approved extensibility only later.

## Pattern A: manual package workflow (built, available now)

| Step | In Continuum |
|---|---|
| Export a grounded package | Handover → review → export `.zip`: `handover.md`, `handover.html`, `handover.json`, `sources.csv`, `decisions.csv`, `copilot-prompts.md`, `manifest.json` (SHA-256 of every file). Only approved content is in it; statement ids are shared across files. |
| Ready-made review prompts | `copilot-prompts.md`: rules (use only the package, cite statement ids, label every sentence Inference or Recommendation, write "Not found in the package" instead of guessing) and four prompts (gaps, risks to watch, steering summary, consistency check). |
| User saves or uploads to Microsoft 365 | Manual and deliberate. Copilot can use files that are uploaded or stored in OneDrive or SharePoint; a local path alone is not enough. |
| Copilot output returns | Harvester → "Paste a Copilot reply": stored as a private **Draft** with origin `copilot-pasted`, kind Inference or Recommendation, cited statement ids recorded, PII screen applied. |
| Never silently a Fact | Enforced in `core/knowledge.js` (`kindOf` returns Inference or Recommendation for any `copilot-pasted` item, even if it claims to be a fact or decision) and `core/handover.js` (drafts only appear under "Needs confirmation"). Tests: `tests/copilot.test.mjs`, `tests/knowledge.test.mjs`. |

Not built yet: promoting a pasted Inference to an accepted Recommendation with the person's name and time (the Draft stays under "Needs confirmation" until then).

## Pattern B: Microsoft-native grounding (manual now, direct writes later)

- Now: the user saves the exported package into a OneDrive folder or SharePoint library of their choice. Copilot then works with it under the user's existing permissions, sensitivity labels and Microsoft 365 controls, and the files stay governed by the tenant.
- Later (not built): writing the package straight to a chosen folder needs Microsoft Graph (`Files.ReadWrite` delegated, or a narrower selected-sites permission), an Entra app registration and tenant consent. Wait for the identity and governance decisions below before building it.

## Pattern C: agents and APIs (not built; tenant-dependent)

None of these is available to Continuum today. Each needs the record below completed with the tenant's Microsoft 365 and security owners before any build starts. Items marked "verify" must be checked against current Microsoft documentation and the tenant's AI Centre of Excellence guidance at the time; several of these offerings change often and some parts are in preview.

| Route | What it would do for Continuum | Licensing | Preview status | App registration | Permissions | Admin consent | Hosting | Data boundary | Tenant policy | Owner | Audit and retention |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Declarative agent (Agent Builder) | A Copilot agent instructed to use exported packages in a named SharePoint library | Copilot licence per user (verify) | Verify | No, if knowledge is SharePoint only | User's own | Possibly, by agent policy | Microsoft 365 | Microsoft 365 | Agent Builder governance in progress in the tenant | Not assigned | Microsoft 365 audit (verify) |
| Copilot Studio agent | Same, plus actions (for example "file this handover") | Copilot Studio capacity or licence (verify) | Mostly GA (verify per feature) | Yes for custom connectors or actions | Delegated or application | Yes | Microsoft (Power Platform environment) | Environment region | Copilot Studio governance in progress | Not assigned | Power Platform and Purview (verify) |
| Microsoft 365 Copilot APIs (for example retrieval or chat APIs) | Continuum asks Copilot-grounded questions from inside the app | Copilot licence (verify) | Some APIs in preview (verify) | Yes | Delegated (verify scopes) | Yes | Needs a server or an authenticated SPA | Microsoft 365 | Must be approved | Not assigned | Verify |
| Work IQ APIs | Bring Microsoft work context into Continuum | Verify | Verify | Yes | Verify | Yes | Verify | Verify | Must be approved | Not assigned | Verify |
| Microsoft Graph | Read Teams, Outlook, SharePoint; write packages to OneDrive | No Copilot licence needed; Teams chat export APIs may need extra licensing (verify) | GA for core APIs | Yes | For example `Files.ReadWrite`, `Chat.Read`, `ChannelMessage.Read.All` | Yes for most Teams scopes | Browser (MSAL) or server | Microsoft 365 plus wherever Continuum stores it | Must be approved | Not assigned | App audit plus Microsoft 365 audit |
| Copilot connectors | Make approved Continuum packages searchable by Copilot | Verify | Verify | Yes | Application | Yes | Server needed | Microsoft 365 index | Must be approved | Not assigned | Verify |
| Plugins or remote tools (for example an MCP server) | Copilot or an agent calls a Continuum service | Verify | Verify | Yes | Verify | Yes | A hosted, authenticated Continuum service (none exists; all services are loopback-only) | Wherever it is hosted | Must be approved | Not assigned | Must be designed |

Recommendation: stay on Pattern A for the pilot, use Pattern B by manual save, and open Pattern C only when the pilot shows a need and the tenant's Copilot Studio and Agent Builder governance is settled. The first Pattern C candidate is a declarative agent over a SharePoint library of exported packages, because it needs no new hosting and keeps data inside Microsoft 365.

## Chat assistant (Smart Assistant) against the requirements

| Requirement | Status |
|---|---|
| Cite stored sources | Yes: each line ends with `[Card id]`; remote answers are told to cite `[Card id]`. |
| Distinguish Fact, Inference, Recommendation, Not found, Needs confirmation | Yes without AI: each matched card is labelled with its statement kind, drafts as Needs confirmation, no match as "Not found". Remote answers are labelled "Inference, AI: <model>". |
| Quote or link the evidence | Yes: the matched card's own text is quoted, with a link to the card in the results list. |
| Show the search scope | Yes: "Searched N cards (view: ..., as ...)". |
| Report when no evidence exists | Yes: "Not found: no card mentions that, so nothing was inferred." |
| Never present demo fallback text as project truth | Fixed in Phase 3 (the canned answers were removed); a trust-boundary test bans them. |
| Useful when AI is unavailable | Yes: no-AI is the default and is fully deterministic. |
| Providers behind an interface | `core/aiConfig.js` (provider choice, consent, session key) and `core/AiClient.js`. Default is none. Slots for an approved Copilot capability, an approved Azure-hosted model or another corporate endpoint fit behind `resolveRemote()`; none is configured. |
