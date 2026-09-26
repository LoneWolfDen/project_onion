// js/constants/personas.js — Single source of truth for active persona list
// (Dual-Mode Facade: air-gapped offline default, no backend dependency).
export const PERSONAS = ['Brené', 'Walter', 'Apollo'];
export const getDefaultPersona = () => PERSONAS[0];
