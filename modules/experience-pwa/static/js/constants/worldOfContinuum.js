// js/constants/worldOfContinuum.js — the "World of Continuum" footer entries.
// `url` is the default address of each running app; a device can override it in
// Harvester → Linked apps (codespace and local ports change). Links carry the active
// project as #ctx=... (docs/APP_HANDOVER_CONTRACT.md). An empty url renders the entry as plain text, so the
// footer never shows a broken link. The current app (Continuum) is never a link.
export const WORLD_OF_CONTINUUM = [
  { id: 'presales', repo: 'https://github.com/LoneWolfDen/Project_Delivery_Accelerator_Engine', name: 'Pre-Sales Accelerator', role: 'The Precursor', blurb: 'Reviews SoWs and proposals through four delivery lenses before you commit.', url: 'https://friendly-meme-jr5vjjp7qwgqfxr4-8080.app.github.dev/' },
  { id: 'continuum', name: 'Continuum', role: 'The Brain', blurb: 'Remembers what happened, why, and who knows.', current: true },
  { id: 'finance', repo: 'https://github.com/LoneWolfDen/project_finance_engine', name: 'Finance Engine', role: 'The Pulse', blurb: 'PO burn, margin and forecast, so delivery stays profitable.', url: 'https://special-waddle-p7r4jj5wpwrvf679j-3005.app.github.dev/' },
];
