// js/data/mockSeed.js — mirrors data/seed/clients.json (Q5A).
// Active: Apollo-123, NovaTech-42. Inactive (active:false): Apollo-124, Helios-09, Stellar-09.
// New Project_ReferenceID format + project_ids arrays. Leading-zero case preserved for tests.
export const MOCK_SEED = {
  version: 'phase2-esm-v1',
  seeded_at: new Date().toISOString(),
  clients: [
    { account_name: 'Acme Corp', project: 'Apollo-123', opportunity_id: 'O-008891', keywords: ['furlough', 'PO', 'overrun'], domains: ['acme.com'] },
    { account_name: 'NovaTech Labs', project: 'NovaTech-42', opportunity_id: 'O-5644421', keywords: ['payroll', 'milestone'], domains: ['novatechlabs.com'] },
  ],
  projects: [
    { Project_ReferenceID: 'Apollo-O-008891-200926120000', anchor_id: 'Apollo-O-008891-200926120000', client_name: 'Acme Corp', project_name: 'Apollo-123', opportunity_numbers: ['O-008891'], project_ids: ['987987', '0000606071'], active: true, syncStatus: 'synced', created_at: new Date().toISOString() },
    { Project_ReferenceID: 'NovaTech-O-5644421-200926120001', anchor_id: 'NovaTech-O-5644421-200926120001', client_name: 'NovaTech Labs', project_name: 'NovaTech-42', opportunity_numbers: ['O-5644421'], project_ids: ['424242'], active: true, syncStatus: 'synced', created_at: new Date().toISOString() },
    { Project_ReferenceID: 'Apollo-O-008892-200926120002', anchor_id: 'Apollo-O-008892-200926120002', client_name: 'Acme Corp', project_name: 'Apollo-124', opportunity_numbers: ['O-008892'], project_ids: ['00000987987'], active: false, syncStatus: 'synced', created_at: new Date().toISOString() },
    { Project_ReferenceID: 'Helios-O-008893-200926120003', anchor_id: 'Helios-O-008893-200926120003', client_name: 'Acme Corp', project_name: 'Helios-09', opportunity_numbers: ['O-008893'], project_ids: ['99974052'], active: false, syncStatus: 'synced', created_at: new Date().toISOString() },
    { Project_ReferenceID: 'Stellar-O-009001-200926120004', anchor_id: 'Stellar-O-009001-200926120004', client_name: 'Stellar Dynamics', project_name: 'Stellar-09', opportunity_numbers: ['O-009001'], project_ids: ['5551212'], active: false, syncStatus: 'synced', created_at: new Date().toISOString() },
  ],
  timeline: [
    { id: 'seed-m1', client_name: 'Acme Corp', project_name: 'Apollo-123', projectId: 'apollo-123', Project_ReferenceID: 'Apollo-O-008891-200926120000', opportunity_id: 'O-008891', type: 'Excel', title: 'PO Extension Approved', detail: 'MS3 extended Q2-Q3 signed', content: 'MS3 extended Q2-Q3 signed', source: 'GDP Status', timestamp: 'Just now', piiStatus: 'Clean', privacy: 'Team Shared', syncStatus: 'synced', impactScore: 0.85, tags: ['#Milestone_Tracked'], created_at: new Date().toISOString() },
    {
      id: 'seed-wow-invoice-01',
      client_name: 'Acme Corp',
      project_name: 'Apollo-123',
      projectId: 'apollo-123',
      Project_ReferenceID: 'Apollo-O-008891-200926120000',
      opportunity_id: 'O-008891',
      type: 'Email',
      title: 'Missing PO — Invoicing Resolution',
      source: 'Outlook Mail',
      timestamp: 'Just now',
      content: 'Vendor registration protocols indicate POs are dispatched to the central invoicing mailbox. Advise checking the registered inbox directly before escalating to client delivery contacts.',
      synthesizedText: 'Vendor registration protocols indicate POs are dispatched to the central invoicing mailbox. Advise checking the registered inbox directly before escalating to client delivery contacts.',
      detail: 'Vendor registration protocols indicate POs are dispatched to the central invoicing mailbox. Advise checking the registered inbox directly before escalating to client delivery contacts.',
      piiStatus: 'Clean',
      privacy: 'Team Shared',
      syncStatus: 'processed',
      impactScore: 0.9,
      tags: ['#Invoice_Resolved'],
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    // Low-signal filler so the Noise Filter has something honest to hide in demos.
    { id: 'seed-noise-01', client_name: 'Acme Corp', project_name: 'Apollo-123', projectId: 'apollo-123', Project_ReferenceID: 'Apollo-O-008891-200926120000', opportunity_id: 'O-008891', type: 'generic_chatter', title: 'Routine check-in', detail: 'Team sync, no decisions.', content: 'Team sync, no decisions.', source: 'Teams Chat', timestamp: 'Just now', piiStatus: 'Clean', privacy: 'Team Shared', syncStatus: 'processed', impactScore: 0.2, tags: ['#Routine'], created_at: new Date().toISOString() },
    { id: 'seed-noise-02', client_name: 'Acme Corp', project_name: 'Apollo-123', projectId: 'apollo-123', Project_ReferenceID: 'Apollo-O-008891-200926120000', opportunity_id: 'O-008891', type: 'generic_chatter', title: 'FYI thread', detail: 'Copied on FYI distribution.', content: 'Copied on FYI distribution.', source: 'Outlook Mail', timestamp: 'Just now', piiStatus: 'Clean', privacy: 'Team Shared', syncStatus: 'processed', impactScore: 0.3, tags: ['#Routine'], created_at: new Date().toISOString() },
    { id: 'seed-noise-03', client_name: 'NovaTech Labs', project_name: 'NovaTech-42', projectId: 'novatech-42', Project_ReferenceID: 'NovaTech-O-5644421-200926120001', opportunity_id: 'O-5644421', type: 'generic_chatter', title: 'Standup notes', detail: 'Daily standup, no blockers.', content: 'Daily standup, no blockers.', source: 'Teams Chat', timestamp: 'Just now', piiStatus: 'Clean', privacy: 'Team Shared', syncStatus: 'processed', impactScore: 0.25, tags: ['#Routine'], created_at: new Date().toISOString() },
  ],
  notes: [],
  archived: [],
};
