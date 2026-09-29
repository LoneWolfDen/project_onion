// conditions.js: the six typed linking operators (scope § 6, concept § 5.4).
// Each has a colour AND a stroke pattern AND a glyph, so edges stay readable
// in grayscale and for colour-blind viewers.
export const CONDITIONS = {
  EXACT:         { glyph: '=', ink: '#1F4A7A', fill: '#D6E8FF', dash: '',        width: 2.2, meaning: 'Identical value, e.g. Opp ID = Opp ID' },
  CONTAINS:      { glyph: '⊃', ink: '#5B3FA0', fill: '#E8DAFF', dash: '',        width: 1.4, meaning: 'Value appears inside text or a file name' },
  DOMAIN:        { glyph: '@', ink: '#9F1239', fill: '#FFE4E6', dash: '10 5',    width: 2,   meaning: 'Email or attendee domain matches the client' },
  DATE_RANGE:    { glyph: '⧗', ink: '#92400E', fill: '#FFF5D6', dash: '8 4 2 4', width: 2,   meaning: 'Falls inside the project start and end dates' },
  TOKEN_OVERLAP: { glyph: '≈', ink: '#065F46', fill: '#D6F5E8', dash: '4 4',     width: 2,   meaning: 'Shares project-name tokens' },
  URL_CONTAINS:  { glyph: '↗', ink: '#9A3412', fill: '#FFE4D6', dash: '1.5 4',   width: 2.4, meaning: 'URL path holds the ID, e.g. /project-details/{id}' },
};

export const CONDITION_ORDER = ['EXACT', 'CONTAINS', 'DOMAIN', 'DATE_RANGE', 'TOKEN_OVERLAP', 'URL_CONTAINS'];
