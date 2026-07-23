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
    s = s.replace(/["“”«»]/g, '');                     // quotes (voice adds tone itself)
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
