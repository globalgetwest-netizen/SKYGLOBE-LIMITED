/* SKYGLOBEGROUP — shared premium line-icon set (Phase 6 shared component).
   Usage:  <script src="/sg-icons.js"></script>  then  sgIcon('💬')  ->  <svg…>.
   Keyed by the legacy glyph so registries can migrate without a rewrite. */
(function () {
  var IC = {
    '💬': '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/>',
    '📚': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    '📖': '<path d="M12 6.5C10.5 5 8 4.5 5 5v13c3-.5 5.5 0 7 1.5 1.5-1.5 4-2 7-1.5V5c-3-.5-5.5 0-7 1.5z"/><path d="M12 6.5v13"/>',
    '📄': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M15 13H9M15 17H9M11 9H9"/>',
    '📝': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    '📜': '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H16a1.5 1.5 0 0 1 1.5 1.5V18a3 3 0 0 0 3 3H8a3 3 0 0 1-3-3V4.5z"/><path d="M9 8h5M9 12h5"/>',
    '🈯': '<path d="M5 8h9M9.5 4.2V8c0 4-1.8 6.8-5 8.2M8 8.5c0 3 1.8 5 5.5 6.8"/><path d="M14 20.5l4-9 4 9M15.4 17.5h5.2"/>',
    '🗣': '<path d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 0 1-13.1 8L3 21l1-4.9A9 9 0 1 1 21 12z"/>',
    '🎙': '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/>',
    '⚙': '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1.1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1.1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1H22a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    '🛡': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    '🎓': '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5"/>',
    '🌍': '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a15 15 0 0 1 4 9.5 15 15 0 0 1-4 9.5 15 15 0 0 1-4-9.5 15 15 0 0 1 4-9.5z"/>',
    '🪪': '<rect x="2" y="5" width="20" height="14" rx="2.5"/><circle cx="8" cy="11.5" r="2.2"/><path d="M13 10h5M13 13.5h4M4.6 16.4c.5-1.5 1.9-2.4 3.4-2.4s2.9.9 3.4 2.4"/>',
    '🧳': '<rect x="6" y="8" width="12" height="12" rx="2"/><path d="M9 8V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3M10 12v4M14 12v4"/>',
    '🔎': '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    '💼': '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2.5 12.5h19"/>',
    '✈': '<path d="M21 15.5l-8-5V4.5a1.5 1.5 0 0 0-3 0v6l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-2l8 2.5z"/>',
    '🛫': '<path d="M21 15.5l-8-5V4.5a1.5 1.5 0 0 0-3 0v6l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-2l8 2.5z"/>',
    '🗓': '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    '💜': '<path d="M6 2L3 6.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.2L18 2z"/><path d="M3 6.2h18M16 10a4 4 0 0 1-8 0"/>',
    '🛂': '<rect x="4" y="2.5" width="16" height="19" rx="2"/><circle cx="12" cy="9.5" r="3"/><path d="M9 16h6"/>',
    '🔬': '<path d="M9 3h6M10 3v5.5l-4.7 8A1.5 1.5 0 0 0 6.6 19h10.8a1.5 1.5 0 0 0 1.3-2.5L14 8.5V3"/><path d="M8 14h8"/>',
    '🧭': '<circle cx="12" cy="12" r="9.5"/><path d="M16 8l-2.2 6L8 16l2-6 6-2z"/>',
    '🗂': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    '🏢': '<rect x="4" y="2.5" width="16" height="19" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M9.5 21.5v-3h5v3"/>',
    '🏅': '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/>',
    '🏛': '<path d="M3 21h18M4.5 21V10M19.5 21V10M3 10l9-6 9 6M8.5 21V13M12 21V13M15.5 21V13"/>',
    '🏠': '<path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10M9.5 20v-6h5v6"/>',
    '✨': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 14.5l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z"/>',
    '🔐': '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 15v2.5"/>',
    '✦': '<path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z"/>',
    '🗑': '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    '📎': '<path d="M21.4 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.49-8.48"/>',
    '✉': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7.5l9 6 9-6"/>',
    '🛍': '<path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    '💳': '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
    '🤝': '<path d="M11 17l2 2a1.4 1.4 0 0 0 2-2M13.5 13.5l3 3a1.4 1.4 0 0 0 2-2l-4.4-4.4a3 3 0 0 0-4.2 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a5 5 0 0 1 6.3-.6"/><path d="M3.5 4.5L3 14l6 6a1.4 1.4 0 0 0 2-2"/><path d="M3.5 5h6"/>',
    '🚚': '<rect x="1.5" y="4.5" width="14" height="11" rx="1"/><path d="M15.5 8h4l3 3v4.5h-7V8z"/><circle cx="5.5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    '⭐': '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>',
    '🔒': '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    '☰': '<path d="M3 12h18M3 6h18M3 18h18"/>',
    '＋': '<path d="M12 5v14M5 12h14"/>',
    '✕': '<path d="M6 6l12 12M18 6L6 18"/>',
    '💚': '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21.5l7.1-7.1 1.7-1.7a5 5 0 0 0 0-7.1z"/>'
  };
  window.sgIcon = function (glyph, size) {
    if (glyph && !IC[glyph]) glyph = glyph.replace(/\uFE0F/g, ''); // drop emoji variation selector
    if (!IC[glyph]) return glyph;
    var s = size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '';
    return '<svg class="sgic" viewBox="0 0 24 24"' + s + '>' + IC[glyph] + '</svg>';
  };
  var st = document.createElement('style');
  st.textContent = '.sgic{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;display:inline-block;vertical-align:middle;flex-shrink:0}';
  (document.head || document.documentElement).appendChild(st);
})();
