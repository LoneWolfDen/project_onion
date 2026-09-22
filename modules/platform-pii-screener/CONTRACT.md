# CONTRACT.md — platform-pii-screener — 80% — Middleware not normal module

## Purpose
Platform middleware — MUST be called before any save — CI fails if module saves without calling it.

## Inputs
- text: string — any text from Connected Chatter, GDP Summary, SharePoint doc, email, Teams chat
- source_type: enum [connected, sharepoint, gdp, email, teams, excel, onedrive]
- anchor: ProjectRef ID e.g., Acme-Discovery

## Outputs
- pii_detected: boolean
- pii_fields: array [{type: email|amount|payroll|TGS_EmpID|Resource_Name|Location|Budget, value_hash, original_redacted}]
- redacted_text: string — User_A@client.com, $XXXk, PO-XXXXX, TGS_EmpID 7821305 -> EMP-XXXX
- non_pii_text: string — OpportunityID 006Uj..., ProjectID, GDPID 8399, Account Name, Status Indicator, Current Phase

## Rules
- Must call Comprehend DetectPII + Presidio + Claude redaction
- PII fields from INBOX: email, amount Total Revenue £129,768.00 GBP, payroll TGS_EmpID 8261003, Resource_Name Alex Nejat, Location UK, Budget £119,560 SoW value, Allocation 80% FTE etc — mark as PII
- Non-PII: OpportunityID, ProjectID, GDPID, Engagement Name, Account Name, Status Indicator Green/Yellow/Red, Current Phase Execution, Engagement Risk, Resources count
- Badge: PII: Email, Amount — Approve redacted share — user decides Private/Team at Add Reference time
- If Private -> skip embedding, keep IndexedDB only — reduces processing
- If Team Shared -> embedding + PII check

## Privacy Guard Script
scripts/check-privacy.sh — parses imports, blocks any module saving to DynamoDB/OpenSearch without calling pii-screener, fails build with file:line