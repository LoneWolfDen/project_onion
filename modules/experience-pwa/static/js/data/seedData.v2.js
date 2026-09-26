// js/data/seedData.v2.js — Offline-first demo fixture set (Dual-Mode Facade).
// Additive loader ONLY — never auto-overwrites FailoverDB. Project_ReferenceID
// is the real key (not projectId/project_name literals) — resolved at load
// time from the active project already registered via AppLeft.js "Register/
// Add new". No hard-coded Apollo-123/apollo-123 except as an explicit
// last-resort fallback when no project exists yet (logged, not silent).
// 10 cards cover: v2-01/v2-02 identical title+content -> identical contentHash
// (dedup gate), v2-03/v2-04 vectorDistance 0.2 -> similarity 0.9 (>=0.85, pass
// Smart-Append), v2-05/v2-06 vectorDistance 1.1 -> similarity 0.45 (<0.85,
// fail -> stays a new card), Private vs Team Shared privacy mix. Every
// contentHash = SHA256(title + content), verified via Node crypto.
import { getDefaultPersona } from '../constants/personas.js';

const AUTHOR = getDefaultPersona();

const v2Cards = [
  { id: 'v2-01', type: 'Excel', title: 'PO Overrun Alert - Apollo', source: 'RAID Log Excel', timestamp: 'Just now', content: 'PO-8891 exceeded budget by 12 percent this sprint on Apollo-123.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: 'c11908823847c663b5c197c64fc8dc84cca879b983193e3af65dc6145b8f5260' },
  // Exact duplicate of v2-01 (same title+content -> same contentHash) — proves the dedup gate blocks a second stage/push.
  { id: 'v2-02', type: 'Email', title: 'PO Overrun Alert - Apollo', source: 'Outlook Mail', timestamp: 'Just now', content: 'PO-8891 exceeded budget by 12 percent this sprint on Apollo-123.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: 'c11908823847c663b5c197c64fc8dc84cca879b983193e3af65dc6145b8f5260' },
  // Near-identical paraphrase — vector distance 0.2 -> similarity 0.9 (>=0.85) => Smart Append routing match.
  { id: 'v2-03', type: 'Chat', title: 'Sprint Delay Risk Noted', source: 'Teams Chat', timestamp: 'Just now', content: 'MS3 milestone slipping two weeks due to vendor PO-8891 delay on Apollo-123.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: 'e14c8c35f065f1389c1cfdcb385c9e8d13a91ee44102c4a222f27e5f76f9c3e4', vectorDistance: 0.2, similarity: 0.9 },
  { id: 'v2-04', type: 'Chat', title: 'Milestone Slip Warning Sprint', source: 'Teams Chat', timestamp: 'Just now', content: 'Vendor delay on PO-8891 pushes MS3 milestone back roughly two weeks for Apollo-123.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: 'c6b56231ff12e2275f1f5bfab5f142068b4afa52e165921da81b1bec14c80113', vectorDistance: 0.2, similarity: 0.9 },
  // Distant paraphrase — vector distance 1.1 -> similarity 0.45 (<0.85) => stays a new card, no Smart Append.
  { id: 'v2-05', type: 'Email', title: 'Client Escalation Draft', source: 'Outlook Mail', timestamp: 'Just now', content: 'Escalation draft for Acme Corp leadership regarding furlough impact on staffing.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Private', author: AUTHOR, contentHash: 'c747b532b68df4b09dc6b99c5c80de30ef905e42cd2316f3f49a708d4373ad7a', vectorDistance: 1.1, similarity: 0.45 },
  { id: 'v2-06', type: 'Excel', title: 'Weekly Status Sync', source: 'GDP Status', timestamp: 'Just now', content: 'GDP status refreshed for Apollo-123, MS2 closed on schedule, no blockers reported.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: 'f4f4ddaf017376172b15c285aec637d1d61f62133bdae572e7dd7537dab5f702', vectorDistance: 1.1, similarity: 0.45 },
  { id: 'v2-07', type: 'Excel', title: 'RAID Log Entry R-12', source: 'RAID Log Excel', timestamp: 'Just now', content: 'Risk R-12 logged: vendor onboarding delay may affect Q3 delivery for Apollo-123.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: '33e79b792c98c3d1f4650c47d20c87ef4b6177bf7bff6aaeaf0c8679a6f6fb0c' },
  { id: 'v2-08', type: 'Email', title: 'Contract Renewal Note SoW-Ref-001', source: 'Outlook Mail', timestamp: 'Just now', content: 'SoW-Ref-001 renewal terms under review, PO-8891 tied to Phase 2 billing.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: '59dbad31a928f80520a123a6bd394339b377a0ffedbf5e45d9e144fec25bdab3' },
  { id: 'v2-09', type: 'Chat', title: 'Teams Chat Payroll Concern', source: 'Teams Chat', timestamp: 'Just now', content: 'Team flagged furlough related payroll concern impacting Apollo-123 timeline.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'Team Shared', author: AUTHOR, contentHash: '6cbccdc6db3ea1a4da8f81839b3c92353df599301a65b70abe00ccec8b739b26' },
  // Private note (never leaks to non-authors) contrasted against the Team Shared cards above.
  { id: 'v2-10', type: 'Email', title: 'Private Draft Budget Check', source: 'Outlook Mail', timestamp: 'Just now', content: 'Draft note verifying PO-8891 overrun figures before sharing with Acme Corp team.', piiStatus: 'Clean', syncStatus: 'pending_upload', privacy: 'My Notes (Private)', author: AUTHOR, contentHash: 'afa73572f44733d663e610a8fe36770c421170e4538139f6de1c263fa0baccb8' },
];

// Additive loader: resolves the real Project_ReferenceID from whatever
// project is already registered (AppLeft.js "Register/Add new"); links every
// seed card to it; only appends cards whose contentHash is not already
// present in onion_db_state.timeline (never deletes/overwrites existing
// cards, including prior test data).
export function loadSeedV2() {
  const projects = JSON.parse(localStorage.getItem('onion_projects') || '[]');
  const activeProject = Array.isArray(projects) ? projects[0] : projects;
  const activeRef = (activeProject && (activeProject.Project_ReferenceID || activeProject.project_name)) || '';
  if (!activeRef) {
    console.warn('loadSeedV2: no Project_ReferenceID found — create a project first (Register/Add new).');
    return 0;
  }
  const db = JSON.parse(localStorage.getItem('onion_db_state') || '{"timeline":[]}');
  if (!Array.isArray(db.timeline)) db.timeline = [];
  const toAdd = v2Cards
    .map((c) => ({ ...c, project: activeRef, project_name: activeRef, Project_ReferenceID: activeRef }))
    .filter((c) => !db.timeline.find((x) => x.contentHash === c.contentHash));
  db.timeline = [...db.timeline, ...toAdd];
  localStorage.setItem('onion_db_state', JSON.stringify(db));
  return toAdd.length;
}

export default loadSeedV2;
