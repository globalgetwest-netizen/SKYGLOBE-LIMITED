/* SkyGlobe Group — Department Contact Strip
   One shared script: every public page shows the professional email of the
   department that owns it, in a premium strip above the footer. The same
   addresses are wired to the AI Reception — mail sent to them is answered
   by the AI 24/7 or escalated to the right human team. */
(function () {
  'use strict';
  if (window.__sgDeptContact) return; window.__sgDeptContact = true;

  var DEPTS = {
    travel:    { icon: '✈️', label: 'Travel & Global Mobility', email: 'visas@skyglobegroup.com' },
    education: { icon: '🎓', label: 'SkyGlobe Academy',          email: 'education@skyglobegroup.com' },
    legal:     { icon: '📜', label: 'Legal & Documents',        email: 'legal@skyglobegroup.com' },
    identity:  { icon: '🪪', label: 'Digital Identity',          email: 'id@skyglobegroup.com' },
    finance:   { icon: '💳', label: 'Finance & Payments',        email: 'finance@skyglobegroup.com' },
    general:   { icon: '📨', label: 'SkyGlobe Group',            email: 'support@skyglobegroup.com' },
  };
  // Which department owns which page.
  var PAGE_DEPT = {
    'work-permit': 'travel', 'conferences': 'travel', 'packages': 'travel',
    'courses': 'education', 'course-learn': 'education', 'academy-admission': 'education',
    'academy-portal': 'education', 'skyglobe-kids-academy': 'education',
    'legal-documents': 'legal',
    'digital-id': 'identity', 'digitalization': 'identity', 'id-verify': 'identity',
    'payments': 'finance', 'pay': 'finance',
    'more-services': 'general', 'index': 'general', '': 'general',
  };

  function pageKey() {
    var p = location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '');
    return PAGE_DEPT.hasOwnProperty(p) ? PAGE_DEPT[p] : 'general';
  }

  function mount() {
    var d = DEPTS[pageKey()] || DEPTS.general;
    var footer = document.querySelector('footer');
    var strip = document.createElement('div');
    strip.setAttribute('role', 'complementary');
    strip.style.cssText = 'background:linear-gradient(135deg,#0b1120,#131c33);border-top:1px solid rgba(212,167,58,.25);padding:26px 20px;text-align:center;font-family:"Segoe UI",system-ui,sans-serif';
    strip.innerHTML =
      '<div style="max-width:820px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap">' +
      '<span style="font-size:1.5rem">' + d.icon + '</span>' +
      '<div style="text-align:left;min-width:0">' +
        '<div style="font-size:.66rem;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#e9c86a">' + d.label + ' · Direct line</div>' +
        '<a href="mailto:' + d.email + '" style="color:#eef2fb;font-weight:700;font-size:1.02rem;text-decoration:none;word-break:break-all">' + d.email + '</a>' +
        '<div style="font-size:.72rem;color:#8fa0c0;margin-top:2px">AI-assisted inbox — answered 24/7, escalated to our specialists when needed.</div>' +
      '</div>' +
      '<a href="mailto:' + d.email + '" style="flex-shrink:0;background:linear-gradient(135deg,#f7d774,#e4b132);color:#181000;font-size:.8rem;font-weight:800;padding:10px 20px;border-radius:999px;text-decoration:none;box-shadow:0 6px 18px rgba(228,177,50,.35)">✉ Email this department</a>' +
      '</div>';
    if (footer && footer.parentNode) footer.parentNode.insertBefore(strip, footer);
    else document.body.appendChild(strip);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
