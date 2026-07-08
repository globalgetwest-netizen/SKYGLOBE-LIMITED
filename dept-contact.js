/* SkyGlobe Group — Department Contact Strip + On-Site Message Form
   Every public page shows the professional email of the department that owns
   it. The "Message this department" button opens a premium ON-SITE form (no
   mail app involved) that feeds straight into the AI Reception — answered by
   AI within minutes or escalated to the department's specialists. The address
   itself is click-to-copy for clients who prefer their own email. */
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

  var deptKey = null, dept = null;

  function copyAddress(el) {
    var done = function () {
      var old = el.textContent;
      el.textContent = '✓ Copied to clipboard';
      setTimeout(function () { el.textContent = old; }, 1600);
    };
    try { navigator.clipboard.writeText(dept.email).then(done, done); }
    catch (e) { done(); }
  }

  function openForm() {
    if (document.getElementById('sgdcModal')) return;
    var m = document.createElement('div');
    m.id = 'sgdcModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:99995;background:rgba(4,8,18,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px';
    m.innerHTML =
      '<div style="position:relative;width:min(480px,96vw);background:linear-gradient(160deg,#0e1730,#0b1120);border:1px solid rgba(212,167,58,.35);border-radius:18px;padding:26px 24px;box-shadow:0 30px 80px rgba(0,0,0,.6);font-family:\'Segoe UI\',system-ui,sans-serif;color:#eef2fb">' +
      '<button id="sgdcX" aria-label="Close" style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#8fa0c0;cursor:pointer;font-size:.85rem;line-height:1">✕</button>' +
      '<div style="font-size:.64rem;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#e9c86a;margin-bottom:4px">' + dept.icon + ' ' + dept.label + '</div>' +
      '<h3 style="margin:0 0 4px;font-size:1.2rem">Message this department</h3>' +
      '<p style="margin:0 0 16px;font-size:.78rem;color:#8fa0c0;line-height:1.5">Delivered instantly to our AI concierge — you\'ll get a reply by email within minutes, and a specialist follows up personally when needed.</p>' +
      '<div id="sgdcBody">' +
      '<input id="sgdcName" placeholder="Your full name" style="width:100%;margin-bottom:10px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#eef2fb;font-size:.9rem;font-family:inherit;box-sizing:border-box">' +
      '<input id="sgdcEmail" type="email" placeholder="Your email address" style="width:100%;margin-bottom:10px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#eef2fb;font-size:.9rem;font-family:inherit;box-sizing:border-box">' +
      '<textarea id="sgdcMsg" placeholder="How can we help? Include your application reference if you have one." style="width:100%;min-height:110px;margin-bottom:6px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#eef2fb;font-size:.9rem;font-family:inherit;line-height:1.5;box-sizing:border-box;resize:vertical"></textarea>' +
      '<div id="sgdcErr" style="display:none;color:#ff9c9c;font-size:.78rem;margin-bottom:8px"></div>' +
      '<button id="sgdcSend" style="width:100%;padding:13px;border:none;border-radius:11px;background:linear-gradient(135deg,#f7d774,#e4b132);color:#181000;font-weight:800;font-size:.9rem;cursor:pointer;box-shadow:0 8px 22px rgba(228,177,50,.35);font-family:inherit">Send message</button>' +
      '<div style="text-align:center;margin-top:12px;font-size:.72rem;color:#8fa0c0">or write from your own email: <b style="color:#c9d4ea">' + dept.email + '</b></div>' +
      '</div></div>';
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    document.getElementById('sgdcX').onclick = function () { m.remove(); };
    document.getElementById('sgdcSend').onclick = function () {
      var name = document.getElementById('sgdcName').value.trim();
      var email = document.getElementById('sgdcEmail').value.trim();
      var msg = document.getElementById('sgdcMsg').value.trim();
      var err = document.getElementById('sgdcErr');
      if (!name || !email || !msg) { err.textContent = 'Please fill in your name, email and message.'; err.style.display = 'block'; return; }
      var btn = document.getElementById('sgdcSend');
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/dept-message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept: deptKey, name: name, email: email, message: msg }),
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.d && res.d.error) || 'Could not send. Please try again.');
          document.getElementById('sgdcBody').innerHTML =
            '<div style="text-align:center;padding:26px 6px">' +
            '<div style="font-size:2.4rem;margin-bottom:10px">✅</div>' +
            '<div style="font-weight:700;font-size:1.02rem;margin-bottom:6px">Message received</div>' +
            '<div style="font-size:.8rem;color:#8fa0c0;line-height:1.6">Our AI concierge is already reading it — check <b style="color:#c9d4ea">' + email.replace(/</g, '&lt;') + '</b> for a reply within minutes. A ' + dept.label + ' specialist follows up personally if your case needs one.</div>' +
            '</div>';
        })
        .catch(function (e) { err.textContent = e.message; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Send message'; });
    };
  }

  function mount() {
    deptKey = pageKey(); dept = DEPTS[deptKey] || DEPTS.general;
    var footer = document.querySelector('footer');
    var strip = document.createElement('div');
    strip.setAttribute('role', 'complementary');
    strip.style.cssText = 'background:linear-gradient(135deg,#0b1120,#131c33);border-top:1px solid rgba(212,167,58,.25);padding:26px 20px;text-align:center;font-family:"Segoe UI",system-ui,sans-serif';
    strip.innerHTML =
      '<div style="max-width:820px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap">' +
      '<span style="font-size:1.5rem">' + dept.icon + '</span>' +
      '<div style="text-align:left;min-width:0">' +
        '<div style="font-size:.66rem;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#e9c86a">' + dept.label + ' · Direct line</div>' +
        '<span id="sgdcAddr" title="Click to copy" style="color:#eef2fb;font-weight:700;font-size:1.02rem;cursor:copy;word-break:break-all">' + dept.email + '</span>' +
        '<div style="font-size:.72rem;color:#8fa0c0;margin-top:2px">AI-assisted inbox — answered 24/7, escalated to our specialists when needed. Click the address to copy it.</div>' +
      '</div>' +
      '<button id="sgdcOpen" style="flex-shrink:0;border:none;background:linear-gradient(135deg,#f7d774,#e4b132);color:#181000;font-size:.8rem;font-weight:800;padding:11px 20px;border-radius:999px;cursor:pointer;box-shadow:0 6px 18px rgba(228,177,50,.35);font-family:inherit">💬 Message this department</button>' +
      '</div>' +
      '<button id="sgdcAllBtn" style="margin-top:14px;background:none;border:none;color:#8fa0c0;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">▾ View all department contacts</button>' +
      '<div id="sgdcAll" style="display:none;max-width:820px;margin:12px auto 0;display:none;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px">' +
      Object.keys(DEPTS).map(function (k) {
        var d2 = DEPTS[k];
        return '<div class="sgdc-chip" data-mail="' + d2.email + '" title="Click to copy" style="cursor:copy;display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:11px;background:#182342;border:1px solid rgba(212,167,58,.4);text-align:left;box-shadow:0 3px 10px rgba(0,0,0,.3)">' +
          '<span style="font-size:1.05rem">' + d2.icon + '</span><div style="min-width:0"><div style="font-size:.62rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#f0c75e">' + d2.label + '</div>' +
          '<div style="font-size:.8rem;color:#ffffff;font-weight:700;word-break:break-all">' + d2.email + '</div></div></div>';
      }).join('') +
      '</div>';
    if (footer && footer.parentNode) footer.parentNode.insertBefore(strip, footer);
    else document.body.appendChild(strip);
    document.getElementById('sgdcOpen').addEventListener('click', openForm);
    var addr = document.getElementById('sgdcAddr');
    addr.addEventListener('click', function () { copyAddress(addr); });
    // Full directory toggle + click-to-copy chips
    var allBtn = document.getElementById('sgdcAllBtn'), all = document.getElementById('sgdcAll');
    allBtn.addEventListener('click', function () {
      var open = all.style.display !== 'none';
      all.style.display = open ? 'none' : 'grid';
      allBtn.textContent = open ? '▾ View all department contacts' : '▴ Hide department contacts';
    });
    Array.prototype.forEach.call(strip.querySelectorAll('.sgdc-chip'), function (chip) {
      chip.addEventListener('click', function () {
        var mail = chip.getAttribute('data-mail');
        var done = function () {
          var sub = chip.querySelector('div > div:last-child');
          var old = sub.textContent; sub.textContent = '✓ Copied';
          setTimeout(function () { sub.textContent = old; }, 1400);
        };
        try { navigator.clipboard.writeText(mail).then(done, done); } catch (e) { done(); }
      });
    });
  }

  // Site-wide click-to-copy: any element with class="sg-copy" data-mail="…"
  // (footer contact lines, contact-page directory) copies the address —
  // never a mailto, never an app chooser.
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.sg-copy[data-mail]') : null;
    if (!el) return;
    e.preventDefault();
    var mail = el.getAttribute('data-mail');
    var done = function () {
      var old = el.textContent;
      el.textContent = '✓ Copied: ' + mail;
      setTimeout(function () { el.textContent = old; }, 1600);
    };
    try { navigator.clipboard.writeText(mail).then(done, done); } catch (err) { done(); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
