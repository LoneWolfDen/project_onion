// js/core/PiiGate.js — compatibility entry point. All screening lives in core/pii.js (PRV-05).
// Emails stay by design; phones, noise words and configured patterns are redacted before anything is stored.
export { PRESERVE_REGEX, STRIP_KEYWORDS, piiScreen, screenPayload, screenTitle, screen } from './pii.js';
