
# Provenance Model — Actual Links, Not Uploading Sources

## Concept: Read, Learn, Maintain Source Links

As we are not uploading sources from users for hackathon instead read learn, and then maintain source links like user, source url.

Every field in Project Onion now carries provenance:

```json
{
  "source_url": "https://allegisgroup.my.salesforce.com/lightning/r/Opportunity/006Uj00000QOBkvIAH/view",
  "cleaned_url": "https://allegisgroup.my.salesforce.com/lightning/r/Opportunity/006Uj00000QOBkvIAH/view",
  "extracted_id": "006Uj00000QOBkvIAH",
  "origin": "Salesforce Opportunity",
  "user": "current_user",
  "timestamp": "2026-09-20T22:44:41Z",
  "link": "https://allegisgroup.my.salesforce.com/lightning/r/Opportunity/006Uj00000QOBkvIAH/view"
}
```

## Origins tracked

- Salesforce Opportunity — Connected Record URL — Opp-8891
- GDP Dashboard — GDP URL — project-details/8399
- SharePoint {service_review, communications, planning_documents, solution_documents} — Risk Log, ESC, Collaboration Plan
- Collaboration Plan / Graph — Contacts
- Manual Note — Your Notes
- Email — Channel: Apollo-123 Budget — RE: PO Extension APPROVED
- Teams — Channel: Apollo-123 Budget, Chat: Apollo Budget Group

## How links are actual links

- connected_provenance.link = actual Salesforce URL — clickable
- gdp_provenance.link = actual GDP URL — clickable
- sharepoint_provenance[].link = cleaned SharePoint URL — clickable — no ?e= params
- contacts_provenance.link = mailto:J.Smith@acme.com — clickable
- notes.provenance.link = source_url provided by user — clickable
- notes.references[].link = origin link — Email link, Teams link, Salesforce link

## Where displayed

- Central card: each chip has ? tooltip showing provenance: user, source url, timestamp, origin
- Key Moments card: FULL PROVENANCE — EXPLORABLE — Email: RE: PO Extension APPROVED — 12 Aug, J.Smith@acme.com — link — "approved furlough for MS3..." — Channel: Apollo-123 Budget — link — Chat Group — link — Meeting — link — Salesforce: Quote-8891 — link — Excel: RAID.xlsx Row 12 — link
- Client 360: each aggregated contact shows provenance array with project_names where found
- Smart Assistant: when answering, carries references from where info originated — shows link to source

## Benefit for non-tech user

You know where every piece came from — not just text — actual link you can click to open original — trust + audit — if J.Smith approves MS3 extension via Email, you see Email link + timestamp + user — no need to upload file, just maintain link.
