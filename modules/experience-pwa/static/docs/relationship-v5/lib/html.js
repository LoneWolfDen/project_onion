// html.js: one place to bind htm to the repository-local React UMD build
// (loaded by index.html from ../../js/vendor/). No build step, no CDN.
export const React = window.React;
export const html = window.htm.bind(window.React.createElement);
export const { useState, useEffect, useMemo, useRef, useCallback } = window.React;
