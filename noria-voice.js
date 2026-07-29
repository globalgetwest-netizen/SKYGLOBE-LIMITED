/* NORIA shared voice helper.
   Tries the premium server voice (/api/tts) first — a real, neutral NORIA voice
   that sounds the same on every device. Resolves to a ready <Audio> element, or
   null when no server voice is configured/available, so callers fall back to the
   on-device browser voice (window.speechSynthesis) they already have. */
(function () {
  /* Prepare text so the voice reads NATURAL SENTENCES with tone — not raw words
     or markdown symbols. Keeps terminal punctuation (so neural voices apply
     intonation and pauses), turns lists/line breaks into flowing sentences, and
     strips only the non-spoken clutter. Language-agnostic: recognises Latin,
     Arabic (، ؟) and CJK (。！？) sentence terminators. */
  window.noriaSpeechText = function (raw) {
    var s = String(raw || '');
    s = s.replace(/```[\s\S]*?```/g, '. ');          // code blocks
    s = s.replace(/`([^`]+)`/g, '$1');               // inline code
    s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '');       // images
    s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');     // links → text
    s = s.replace(/https?:\/\/\S+/g, '');             // bare URLs
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'); // bold/italic
    s = s.replace(/__([^_]+)__/g, '$1');
    s = s.replace(/^\s{0,3}#{1,6}\s*/gm, '');          // headings
    s = s.replace(/^\s*[-*•]\s+/gm, '');               // bullet markers
    s = s.replace(/^\s*\d+[.)]\s+/gm, '');             // numbered-list markers
    s = s.replace(/[*_#>`~|]+/g, ' ');                 // leftover md symbols
    // Strip emojis & pictographic symbols so the voice never reads "sparkles",
    // "globe", "check mark" etc. — it should read the WORDS only.
    try { s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, ''); } catch (_) {}
    s = s.replace(/["“”«»•·]/g, '');                   // quotes/bullets (voice adds tone itself)
    // Read ALL-CAPS brand words as WORDS, not letter-by-letter (YUNEX → Yunex).
    s = s.replace(/\bSKYGLOBEGROUP\b/g, 'SkyGlobe Group').replace(/\bSKYGLOBE\b/g, 'SkyGlobe');
    s = s.replace(/\b[A-Z][A-Z0-9]{2,}\b/g, function (m) { return m.charAt(0) + m.slice(1).toLowerCase(); });
    // Each line should read as a sentence: add a period where one is missing so
    // the voice pauses naturally between lines instead of running them together.
    s = s.split(/\n+/).map(function (line) {
      line = line.trim();
      if (!line) return '';
      return /[.!?:;…،؟。！？]$/.test(line) ? line : line + '.';
    }).filter(Boolean).join(' ');
    s = s.replace(/\s+([,.!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
    return s;
  };

  window.noriaServerVoice = async function (text, lang) {
    var body = String(text || '').trim();
    if (!body) return null;
    try {
      var r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body.slice(0, 3000), lang: lang || '' }),
      });
      var ct = r.headers.get('Content-Type') || '';
      if (!r.ok || ct.indexOf('audio') === -1) return null; // 503/JSON → use browser voice
      var blob = await r.blob();
      if (!blob || !blob.size) return null;
      var url = URL.createObjectURL(blob);
      var audio = new Audio(url);
      audio.addEventListener('ended', function () { URL.revokeObjectURL(url); }, { once: true });
      return audio;
    } catch (_) { return null; }
  };
})();
