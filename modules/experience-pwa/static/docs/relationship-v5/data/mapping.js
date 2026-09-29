// mapping.js: carries a selection across the Runtime / Domain switch (scope § 6, S6).
// Source nodes share IDs in both views, so most rows map to themselves.
// A runtime node missing from RUNTIME_TO_DOMAIN has no business-model entity
// (e.g. Harvester is a process, not data), and the selection clears with a note.
export const DOMAIN_TO_RUNTIME = {
  client_master: 'client_master',
  project_card: 'project_card',
  sp_comm_plan: 'sp_comm_plan',
  sp_risk_log: 'sp_risk_log',
  sp_esc: 'sp_esc',
  gdp_dash: 'gdp_dash',
  gdp_excel: 'gdp_excel',
  connected: 'connected',
  emails: 'emails',
  teams_chats: 'teams_chats',
  teams_vtt: 'teams_vtt',
  raid_agg: 'status_cards',
};

export const RUNTIME_TO_DOMAIN = {
  ...Object.fromEntries(Object.entries(DOMAIN_TO_RUNTIME).map(([d, r]) => [r, d])),
  // Collapsed groups map to their most representative domain node.
  anchor: 'project_card',
  sharepoint: 'sp_risk_log',
  gdp: 'gdp_dash',
  comms: 'emails',
  cards: 'raid_agg',
};
