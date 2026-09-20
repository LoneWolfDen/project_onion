## v0.8.1 Decision: CORS fix + Doc vs Timeline clarification

Context: Screenshot shows PWA :8002 header OK GE Aero / GEAERO-DIP-DISCOVERY / O-5030460 / 006Uj... / 2d ago green + timeline Week33 Laptop 50%->100% [Row12+Row18] OK but lower panels Error TypeError Load failed - terminals 200 ok - browser fetch blocked by CORS - plus Doc Cards V6.3_ESC question - is it test data? ESC will not have laptop raid log.

Decision:
- Fix: Add CORSMiddleware allow_origins * to :8000 anchor and :8001 cards - allow_credentials True allow_methods * allow_headers * - PWA :8002 JS fetch now works - browser was blocking, curl 200 ok but browser TypeError
- Clarification: V6.3_ESC = doc card from file name PS-v2026.2a-GE-Aero-(O-5030460)-V6.3_ESC - NOT laptop RAID log - laptop is timeline card Row12+Row18 Excel significance 0.9 EXTENSION Week33 - doc card is separate provenance from SharePoint file name containing O-5030460 - both linked to same anchor via opportunity_numbers + connected_record_ids + sharepoint_smps geadinspf + gdp_ids 8399 - data/seed/cards.json now separates card_type timeline vs doc

Consequence: Restart both :8000 and :8001 with new service.py - PWA :8002 will show anchor + cards panels 200 ok - doc cards explanation added to PWA UI - user question answered