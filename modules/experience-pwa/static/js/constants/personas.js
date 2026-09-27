// js/constants/personas.js — Single source of truth for active persona list
// (Dual-Mode Facade: air-gapped offline default, no backend dependency).
// P1 FIX (Issue #5): list was stale — 'Apollo' is a PROJECT name (Apollo-123),
// not a persona, and it was missing 'Malcolm'/'Daniel' who are real seed
// authors used throughout mockSeed.js and App.js's persona dropdown. This is
// the actual roster; App.js's <select> now maps over this array instead of
// hardcoding its own <option> list, so there is exactly one source of truth.
export const PERSONAS = ['Brené', 'Malcolm', 'Walter', 'Daniel'];
export const getDefaultPersona = () => PERSONAS[0];
