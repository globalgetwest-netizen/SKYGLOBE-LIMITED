<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SKYGLOBE LIMITED — Your Gateway to Global Opportunity</title>
<link rel="icon" type="image/png" href="logo.png">
<link rel="apple-touch-icon" href="logo.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0a1628">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SkyGlobe">
<meta name="description" content="Skyglobe Limited is a premium global travel and study-abroad consultancy. Visas, university admissions, work relocation, and travel documentation.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/globe.gl@2.31.0/dist/globe.gl.min.js"></script>
<script>
  const API_URL = 'https://skyglobegroup.com/api/contact';
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0a1628;
  --navy-2:#f4f7fb;
  --navy-3:#e8eef6;
  --navy-light:#dce6f2;
  --gold:#b8860b;
  --gold-light:#d4a017;
  --gold-pale:#fdf6e3;
  --white:#ffffff;
  --off-white:#f8f9fb;
  --muted:#64748b;
  --border:rgba(0,0,0,0.1);
  --border-strong:rgba(0,0,0,0.18);
  --text-body:#374151;
  --radius:12px;
  --radius-lg:20px;
  --radius-xl:32px;
  --trans:0.32s cubic-bezier(0.4,0,0.2,1);
}
html{scroll-behavior:smooth;font-size:16px}
body{background:#f8f9fb;color:#0a1628;font-family:'Outfit',sans-serif;line-height:1.6;overflow-x:hidden;min-height:100vh}

/* SCROLLBAR */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#f0f4f8}
::-webkit-scrollbar-thumb{background:var(--gold);border-radius:3px}

/* PAGE ROUTER */
.page{display:none;animation:fadeUp 0.5s ease both}
.page.active{display:block}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:72px;transition:var(--trans);background:#ffffff;border-bottom:1px solid rgba(0,0,0,0.08);box-shadow:0 1px 8px rgba(0,0,0,0.06)}
nav.scrolled{background:#ffffff;backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,0.1);box-shadow:0 2px 16px rgba(0,0,0,0.1)}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;cursor:pointer}
.nav-logo-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--gold),var(--gold-light));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
.nav-logo-text{font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:600;color:#0a1628;letter-spacing:0.04em}
.nav-logo-text span{color:var(--gold)}
.nav-links{display:flex;align-items:center;gap:2.5rem;list-style:none}
.nav-links a{color:#374151;text-decoration:none;font-size:0.92rem;font-weight:500;letter-spacing:0.03em;transition:var(--trans);cursor:pointer}
.nav-links a:hover,.nav-links a.active{color:var(--gold)}
.nav-cta{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#fff!important;padding:10px 22px;border-radius:8px;font-weight:600!important;transition:var(--trans)!important}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(184,134,11,0.3)}
.hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px}
.hamburger span{width:24px;height:2px;background:#0a1628;transition:var(--trans)}
.mobile-menu{display:none;position:fixed;inset:0;background:#ffffff;z-index:999;flex-direction:column;align-items:center;justify-content:center;gap:2rem}
.mobile-menu.open{display:flex}
.mobile-menu a{color:#0a1628;text-decoration:none;font-size:1.4rem;font-family:'Cormorant Garamond',serif;cursor:pointer}

/* HERO */
.hero{min-height:100vh;display:flex;align-items:center;position:relative;overflow:hidden;padding:100px 5% 60px;background:linear-gradient(135deg,#ffffff 0%,#f0f5ff 50%,#fdf9f0 100%)}
.hero-bg{position:absolute;inset:0;z-index:0}
#globeContainer canvas{border-radius:50%}
.grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(10,22,40,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(10,22,40,0.03) 1px,transparent 1px);background-size:60px 60px}
.glow-blob{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
.blob-1{width:500px;height:500px;background:rgba(184,134,11,0.06);top:-100px;right:100px}
.blob-2{width:400px;height:400px;background:rgba(59,130,246,0.05);bottom:-50px;left:-50px}
.hero-content{position:relative;z-index:1;max-width:660px}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(184,134,11,0.1);border:1px solid rgba(184,134,11,0.3);border-radius:100px;padding:6px 16px;font-size:0.8rem;font-weight:500;color:#92640a;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:1.8rem;animation:fadeUp 0.6s 0.1s both}
.hero-badge::before{content:'';width:6px;height:6px;background:var(--gold);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
.hero h1{font-family:'Cormorant Garamond',serif;font-size:clamp(2.8rem,6vw,4.4rem);font-weight:300;line-height:1.12;letter-spacing:-0.01em;margin-bottom:1.4rem;animation:fadeUp 0.6s 0.2s both;color:#0a1628}
.hero h1 em{font-style:italic;color:var(--gold)}
.hero h1 strong{font-weight:600;color:#0a1628}
.hero p{font-size:1.1rem;color:#4b5563;line-height:1.7;max-width:520px;margin-bottom:2.4rem;animation:fadeUp 0.6s 0.3s both}
.hero-btns{display:flex;gap:1rem;flex-wrap:wrap;animation:fadeUp 0.6s 0.4s both}
.btn-primary{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#ffffff;padding:14px 32px;border-radius:10px;font-weight:600;font-size:0.95rem;text-decoration:none;border:none;cursor:pointer;transition:var(--trans);display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(184,134,11,0.25)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(184,134,11,0.35)}
.btn-outline{background:#ffffff;color:#0a1628;padding:14px 32px;border-radius:10px;font-weight:500;font-size:0.95rem;text-decoration:none;border:1px solid rgba(0,0,0,0.15);cursor:pointer;transition:var(--trans);display:inline-flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.btn-outline:hover{background:#f8f9fb;border-color:var(--gold);color:var(--gold)}
.hero-stats{display:flex;gap:3rem;margin-top:3.5rem;animation:fadeUp 0.6s 0.5s both;padding-top:2rem;border-top:1px solid rgba(0,0,0,0.1)}
.stat-item{text-align:center}
.stat-num{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--gold);display:block}
.stat-label{font-size:0.8rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em}

/* SECTIONS */
section{padding:100px 5%}
.section-tag{display:inline-block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold);margin-bottom:0.8rem}
.section-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3rem);font-weight:300;line-height:1.2;margin-bottom:1.2rem;color:#0a1628}
.section-title strong{font-weight:600;color:#0a1628}
.section-sub{color:#4b5563;font-size:1rem;max-width:560px;line-height:1.7}
.text-center{text-align:center}
.text-center .section-sub{margin:0 auto}
.section-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.12),transparent);margin:0 5%}

/* SERVICES SECTION */
.services-preview{background:#f0f5ff}
.services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;margin-top:3.5rem}
.service-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius-lg);padding:2rem;transition:var(--trans);position:relative;overflow:hidden;cursor:default;box-shadow:0 2px 12px rgba(0,0,0,0.05)}
.service-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--gold),var(--gold-light));opacity:0;transition:var(--trans)}
.service-card:hover{border-color:rgba(184,134,11,0.3);transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,0.1)}
.service-card:hover::before{opacity:1}
.service-icon{width:52px;height:52px;background:linear-gradient(135deg,rgba(184,134,11,0.12),rgba(184,134,11,0.06));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.2rem;border:1px solid rgba(184,134,11,0.2)}
.service-card h3{font-size:1.05rem;font-weight:600;margin-bottom:0.6rem;color:#0a1628}
.service-card p{font-size:0.88rem;color:#4b5563;line-height:1.6}

/* ABOUT */
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center;margin-top:4rem}
.about-visual{position:relative}
.about-img-frame{width:100%;aspect-ratio:4/5;background:linear-gradient(135deg,#e8f0fe,#f0f5ff);border-radius:var(--radius-xl);border:1px solid rgba(0,0,0,0.08);overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
.about-globe-anim{width:80%;animation:float 6s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
.about-badge{position:absolute;bottom:2rem;left:-1.5rem;background:linear-gradient(135deg,var(--gold),var(--gold-light));border-radius:var(--radius);padding:1.2rem 1.5rem;color:#ffffff;box-shadow:0 8px 24px rgba(184,134,11,0.3)}
.about-badge strong{display:block;font-size:1.8rem;font-weight:700;font-family:'Cormorant Garamond',serif}
.about-badge span{font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em}
.trust-items{margin-top:2rem;display:flex;flex-direction:column;gap:1rem}
.trust-item{display:flex;gap:1rem;align-items:flex-start}
.trust-icon{width:36px;height:36px;background:rgba(184,134,11,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem}
.trust-item h4{font-size:0.95rem;font-weight:600;margin-bottom:0.2rem;color:#0a1628}
.trust-item p{font-size:0.85rem;color:#4b5563}

/* DESTINATIONS */
.dest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-top:3rem}
.dest-card{border-radius:var(--radius-lg);overflow:hidden;position:relative;cursor:pointer;aspect-ratio:3/4;border:1px solid var(--border);transition:var(--trans)}
.dest-card:hover{transform:translateY(-6px);border-color:var(--gold)}
.dest-bg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:5rem;background:var(--navy-2)}
.dest-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,22,40,0.95) 30%,transparent 70%)}
.dest-info{position:absolute;bottom:0;left:0;right:0;padding:1.5rem}
.dest-flag{font-size:2rem;margin-bottom:0.4rem;display:block}
.dest-name{font-size:1.1rem;font-weight:600;display:block;margin-bottom:0.2rem}
.dest-badge{display:inline-block;font-size:0.72rem;background:rgba(201,168,76,0.2);border:1px solid var(--border-strong);color:var(--gold-light);padding:3px 10px;border-radius:100px}

/* CONTACT */
.contact-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:4rem;margin-top:4rem}
.contact-info{display:flex;flex-direction:column;gap:1.5rem}
.contact-detail{display:flex;gap:1rem;align-items:flex-start}
.contact-icon{width:44px;height:44px;background:rgba(184,134,11,0.1);border:1px solid rgba(184,134,11,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
.contact-detail h4{font-weight:600;margin-bottom:0.2rem;font-size:0.95rem;color:#0a1628}
.contact-detail p,.contact-detail a{font-size:0.9rem;color:#4b5563;text-decoration:none}
.contact-detail a:hover{color:var(--gold)}
.contact-form{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius-xl);padding:2.5rem;box-shadow:0 4px 24px rgba(0,0,0,0.07)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
.form-group{margin-bottom:1rem}
.form-group label{display:block;font-size:0.85rem;color:#374151;margin-bottom:0.5rem;font-weight:500}
.form-group input,.form-group select,.form-group textarea{width:100%;background:#f9fafb;border:1px solid rgba(0,0,0,0.12);border-radius:8px;padding:12px 16px;color:#0a1628;font-family:'Outfit',sans-serif;font-size:0.9rem;outline:none;transition:var(--trans)}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--gold);background:#fff;box-shadow:0 0 0 3px rgba(184,134,11,0.1)}
.form-group select option{background:#ffffff;color:#0a1628}
.form-group textarea{resize:vertical;min-height:120px}
.wa-btn{display:inline-flex;align-items:center;gap:10px;background:#25D366;color:white;padding:13px 24px;border-radius:10px;font-weight:600;font-size:0.9rem;text-decoration:none;transition:var(--trans);margin-top:1rem}
.wa-btn:hover{background:#20b258;transform:translateY(-2px)}

/* FOOTER */
footer{background:#0a1628;border-top:1px solid rgba(255,255,255,0.08);padding:60px 5% 30px}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:3rem;margin-bottom:3rem}
.footer-brand p{font-size:0.88rem;color:#8899bb;margin-top:1rem;max-width:280px;line-height:1.7}
.footer-col h5{font-size:0.85rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold);margin-bottom:1rem}
.footer-col ul{list-style:none;display:flex;flex-direction:column;gap:0.6rem}
.footer-col ul li a{font-size:0.88rem;color:#8899bb;text-decoration:none;transition:var(--trans);cursor:pointer}
.footer-col ul li a:hover{color:var(--gold)}
.footer-bottom{border-top:1px solid rgba(255,255,255,0.08);padding-top:1.5rem;display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;color:#64748b}

/* TOAST */
.toast{position:fixed;bottom:2rem;right:2rem;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#ffffff;padding:14px 24px;border-radius:12px;font-weight:600;font-size:0.9rem;z-index:9999;transform:translateY(80px);opacity:0;transition:var(--trans);display:flex;align-items:center;gap:10px;max-width:320px;box-shadow:0 8px 24px rgba(184,134,11,0.3)}
.toast.show{transform:translateY(0);opacity:1}

/* WHATSAPP FLOAT */
.faq-item{border:1px solid rgba(0,0,0,0.08);border-radius:12px;margin-bottom:10px;overflow:hidden;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.faq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;background:none;border:none;color:#0a1628;font-family:'Outfit',sans-serif;font-size:0.95rem;font-weight:500;text-align:left;padding:18px 22px;cursor:pointer}
.faq-q span{color:var(--gold);font-size:1.3rem;font-weight:400;transition:transform 0.25s}
.faq-item.open .faq-q span{transform:rotate(45deg)}
.faq-a{max-height:0;overflow:hidden;transition:max-height 0.3s ease;padding:0 22px;font-size:0.88rem;color:#4b5563;line-height:1.7}
.faq-item.open .faq-a{max-height:300px;padding:0 22px 18px}
.wa-float{position:fixed;bottom:2rem;left:2rem;width:54px;height:54px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;text-decoration:none;z-index:998;box-shadow:0 4px 20px rgba(37,211,102,0.4);transition:var(--trans)}
.wa-float:hover{transform:scale(1.1)}

/* RESPONSIVE */
@media(max-width:900px){
  .about-grid,.contact-grid{grid-template-columns:1fr}
  .about-img-frame{aspect-ratio:16/9}
  .footer-grid{grid-template-columns:1fr 1fr}
  .hero-stats{gap:1.5rem}
  .form-row{grid-template-columns:1fr}
  nav .nav-links{display:none}
  .hamburger{display:flex}
}
@media(max-width:600px){
  .hero h1{font-size:2.4rem}
  .footer-grid{grid-template-columns:1fr}
  .hero-stats{flex-wrap:wrap;gap:1rem}
}

/* SERVICES PAGE */
.services-full-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-top:3rem}
.service-full-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius-lg);padding:2rem;transition:var(--trans);position:relative;overflow:hidden;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
.service-full-card:hover{border-color:rgba(184,134,11,0.4);box-shadow:0 10px 30px rgba(0,0,0,0.1);transform:translateY(-3px)}
.service-full-card .s-icon{font-size:2.2rem;margin-bottom:1rem;display:block}
.service-full-card h3{font-size:1.1rem;font-weight:600;margin-bottom:0.6rem;color:#0a1628}
.service-full-card p{font-size:0.88rem;color:#4b5563;line-height:1.65}
.service-full-card .s-tag{display:inline-block;margin-top:1rem;font-size:0.75rem;color:var(--gold);font-weight:500;letter-spacing:0.06em;text-transform:uppercase}
.service-full-card .apply-hint{display:inline-block;margin-top:0.8rem;margin-left:0.6rem;font-size:0.75rem;color:#64748b;opacity:0;transition:opacity 0.2s}
.service-full-card:hover .apply-hint{opacity:1}

/* DESTINATIONS FULL */
.dest-region{margin-bottom:3rem}
.dest-region h3{font-size:1.3rem;font-weight:600;margin-bottom:1.5rem;display:flex;align-items:center;gap:10px;color:#0a1628}
.dest-region h3::after{content:'';flex:1;height:1px;background:rgba(0,0,0,0.1)}
.dest-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}
.dest-info-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius);padding:1.5rem;transition:var(--trans);box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.dest-info-card:hover{border-color:rgba(184,134,11,0.3);box-shadow:0 6px 20px rgba(0,0,0,0.08)}
.dest-info-card .flag{font-size:2rem;margin-bottom:0.8rem;display:block}
.dest-info-card h4{font-weight:600;margin-bottom:0.6rem;color:#0a1628}
.dest-info-card ul{list-style:none;font-size:0.85rem;color:#4b5563;display:flex;flex-direction:column;gap:0.3rem}
.dest-info-card ul li::before{content:'→ ';color:var(--gold)}

/* ABOUT FULL */
.about-mission{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:3rem}
.mission-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius-lg);padding:2.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.05)}
.mission-card h3{font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:600;color:var(--gold);margin-bottom:1rem}
.mission-card p{color:#4b5563;line-height:1.75;font-size:0.95rem}
.team-strip{margin-top:4rem}
.values-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-top:2rem}
.value-card{background:#fff;border:1px solid rgba(184,134,11,0.15);border-radius:var(--radius);padding:1.5rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.value-card .v-icon{font-size:2rem;margin-bottom:0.8rem;display:block}
.value-card h4{font-weight:600;margin-bottom:0.4rem;color:#0a1628}
.value-card p{font-size:0.83rem;color:#4b5563}

/* SEARCH PAGE */
.search-hero{text-align:center;padding:140px 5% 40px;background:linear-gradient(135deg,#fff,#f0f5ff)}
.search-box{display:flex;gap:0;max-width:680px;margin:2rem auto 0;border-radius:14px;overflow:hidden;border:2px solid rgba(0,0,0,0.12);background:#ffffff;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.search-box input{flex:1;background:transparent;border:none;padding:18px 24px;color:#0a1628;font-family:'Outfit',sans-serif;font-size:1rem;outline:none}
.search-box input::placeholder{color:#94a3b8}
.search-box button{background:linear-gradient(135deg,var(--gold),var(--gold-light));border:none;padding:0 28px;cursor:pointer;font-size:1.2rem;transition:var(--trans)}
.search-box button:hover{opacity:0.9}
.search-filters{display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;margin:1.5rem auto;max-width:680px}
.filter-btn{background:#ffffff;border:1px solid rgba(0,0,0,0.12);border-radius:100px;padding:6px 18px;color:#374151;font-size:0.82rem;cursor:pointer;transition:var(--trans);font-family:'Outfit',sans-serif}
.filter-btn:hover,.filter-btn.active{background:rgba(184,134,11,0.1);border-color:var(--gold);color:var(--gold)}
.search-results{padding:0 5% 80px;max-width:1100px;margin:0 auto}
.results-count{font-size:0.88rem;color:#64748b;margin-bottom:1.5rem}
.result-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius-lg);padding:1.8rem;margin-bottom:1rem;transition:var(--trans);cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.result-card:hover{border-color:rgba(184,134,11,0.4);box-shadow:0 8px 24px rgba(0,0,0,0.1)}
.result-card-header{display:flex;align-items:flex-start;gap:1rem;margin-bottom:0.8rem}
.result-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;background:rgba(184,134,11,0.1);border:1px solid rgba(184,134,11,0.2)}
.result-category{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold);font-weight:600;margin-bottom:0.3rem}
.result-title{font-size:1.05rem;font-weight:600;color:#0a1628}
.result-body{font-size:0.88rem;color:#4b5563;line-height:1.7}
.result-tags{display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.8rem}
.result-tag{font-size:0.72rem;background:rgba(184,134,11,0.08);border:1px solid rgba(184,134,11,0.2);color:var(--gold);padding:3px 10px;border-radius:100px}
.result-detail{display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.08)}
.result-detail.open{display:block}
.result-detail ul{list-style:none;display:flex;flex-direction:column;gap:0.4rem}
.result-detail ul li{font-size:0.87rem;color:#4b5563;padding-left:1rem;position:relative}
.result-detail ul li::before{content:'→';position:absolute;left:0;color:var(--gold)}
.result-detail .detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:0.8rem}
.result-detail .detail-item{background:#f8f9fb;border-radius:8px;padding:0.8rem;border:1px solid rgba(0,0,0,0.07)}
.result-detail .detail-item strong{display:block;font-size:0.78rem;color:var(--gold);margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.06em}
.result-detail .detail-item span{font-size:0.85rem;color:#4b5563}
.no-results{text-align:center;padding:4rem 0;color:#64748b}
.no-results .nr-icon{font-size:3rem;margin-bottom:1rem}
.search-popular{max-width:680px;margin:0 auto;text-align:center}
.search-popular p{font-size:0.85rem;color:#64748b;margin-bottom:0.8rem}
.popular-tags{display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center}
.popular-tag{background:#ffffff;border:1px solid rgba(0,0,0,0.1);border-radius:100px;padding:5px 14px;color:#374151;font-size:0.82rem;cursor:pointer;transition:var(--trans)}
.popular-tag:hover{border-color:var(--gold);color:var(--gold)}

/* APPLY PAGE */
.apply-steps{display:flex;justify-content:center;gap:0;margin:2rem auto 2.5rem;max-width:700px;position:relative}
.apply-steps::before{content:'';position:absolute;top:18px;left:10%;right:10%;height:2px;background:rgba(0,0,0,0.1);z-index:0}
.apply-step{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;position:relative;z-index:1;cursor:pointer}
.step-num{width:36px;height:36px;border-radius:50%;background:#f0f4f8;border:2px solid rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;font-size:0.82rem;font-weight:600;color:#64748b;transition:var(--trans)}
.apply-step.active .step-num{background:var(--gold);border-color:var(--gold);color:#ffffff}
.apply-step.done .step-num{background:rgba(184,134,11,0.15);border-color:var(--gold);color:var(--gold)}
.step-label{font-size:0.72rem;color:#64748b;text-align:center;white-space:nowrap}
.apply-step.active .step-label{color:var(--gold)}
.form-step{display:none}
.form-step.active{display:block;animation:fadeUp 0.35s ease both}
.service-select-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-top:1rem}
.svc-card{background:#ffffff;border:2px solid rgba(0,0,0,0.1);border-radius:var(--radius-lg);padding:1.4rem 1rem;text-align:center;cursor:pointer;transition:var(--trans);box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.svc-card:hover{border-color:var(--gold);box-shadow:0 6px 20px rgba(0,0,0,0.08)}
.svc-card.selected{border-color:var(--gold);background:rgba(184,134,11,0.05)}
.svc-card .sc-icon{font-size:2rem;display:block;margin-bottom:0.6rem}
.svc-card h4{font-size:0.88rem;font-weight:600;color:#0a1628;margin-bottom:0.3rem}
.svc-card p{font-size:0.75rem;color:#64748b}
.app-ref-card{background:linear-gradient(135deg,#f0f5ff,#fdf9f0);border:2px solid var(--gold);border-radius:var(--radius-xl);padding:3rem;text-align:center;max-width:560px;margin:2rem auto;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
.app-ref-number{font-family:'Cormorant Garamond',serif;font-size:2.4rem;color:var(--gold);font-weight:600;letter-spacing:0.06em;margin:1rem 0}
.app-tracker{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius-lg);padding:2rem;margin-top:2rem;max-width:560px;margin-left:auto;margin-right:auto;box-shadow:0 2px 12px rgba(0,0,0,0.05)}
.status-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:100px;font-size:0.82rem;font-weight:600}
.status-received{background:rgba(184,134,11,0.12);border:1px solid rgba(184,134,11,0.4);color:#92640a}
.status-processing{background:rgba(30,100,200,0.1);border:1px solid #4a90d9;color:#1565c0}
.status-approved{background:rgba(0,150,80,0.1);border:1px solid #00a060;color:#005c32}
.status-rejected{background:rgba(200,50,50,0.1);border:1px solid #c83232;color:#991b1b}
@media(max-width:600px){.apply-steps::before{display:none}.step-label{display:none}.service-select-grid{grid-template-columns:1fr 1fr}}

/* ── APPLICATION PROGRESS BAR ────────────────────────────────────── */
.app-progress{display:flex;align-items:flex-start;margin:0.8rem 0 1.2rem;position:relative}
.app-prog-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative}
.app-prog-step:not(:last-child)::after{content:'';position:absolute;top:14px;left:50%;width:100%;height:2px;background:rgba(0,0,0,0.08);z-index:0;transition:background 0.4s}
.app-prog-step.done:not(:last-child)::after{background:var(--gold)}
.app-prog-dot{width:28px;height:28px;border-radius:50%;border:2px solid rgba(0,0,0,0.12);background:#f0f4f8;display:flex;align-items:center;justify-content:center;font-size:0.7rem;z-index:1;position:relative;transition:all 0.4s;color:#64748b}
.app-prog-step.done .app-prog-dot{border-color:var(--gold);background:rgba(184,134,11,0.12);color:var(--gold)}
.app-prog-step.current .app-prog-dot{border-color:var(--gold);background:var(--gold);color:#ffffff;box-shadow:0 0 14px rgba(184,134,11,0.4);font-size:0.9rem}
.app-prog-step.rejected .app-prog-dot{border-color:#ef4444;background:rgba(239,68,68,0.1);color:#ef4444}
.app-prog-label{font-size:0.6rem;color:#64748b;margin-top:5px;text-align:center;line-height:1.3;white-space:nowrap}
.app-prog-step.done .app-prog-label,.app-prog-step.current .app-prog-label{color:var(--gold)}
.app-prog-step.rejected .app-prog-label{color:#ef4444}

/* ── DOCUMENT CHECKLIST ──────────────────────────────────────────── */
.checklist-overlay{position:fixed;inset:0;z-index:9400;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px}
.checklist-overlay.open{display:flex}
.checklist-modal{background:#ffffff;border:1px solid rgba(0,0,0,0.1);border-radius:var(--radius-xl);max-width:600px;width:100%;padding:2.2rem;position:relative;animation:fadeUp 0.35s ease;max-height:88vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.18)}
.checklist-modal::-webkit-scrollbar{width:4px}.checklist-modal::-webkit-scrollbar-track{background:transparent}.checklist-modal::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:2px}
.cl-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,0.06)}
.cl-item input[type=checkbox]{width:18px;height:18px;cursor:pointer;accent-color:var(--gold);margin-top:2px;flex-shrink:0}
.cl-item label{font-size:0.86rem;line-height:1.5;cursor:pointer;color:#0a1628}
.cl-item .cl-sub{font-size:0.73rem;color:#64748b;display:block;margin-top:2px}
.cl-item:has(input:checked) label{color:#94a3b8;text-decoration:line-through}

/* ── COUNTRY GUIDES ──────────────────────────────────────────────── */
.country-card{background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;transition:var(--trans);box-shadow:0 2px 8px rgba(0,0,0,0.05)}
.country-card:hover{border-color:rgba(184,134,11,0.4);transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,0.12)}
.country-card-flag{height:80px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:linear-gradient(135deg,#f0f5ff,#fdf9f0)}
.country-card-body{padding:1.1rem}
.country-card h3{font-size:0.95rem;margin-bottom:0.2rem;color:#0a1628}
.country-card .ctag{font-size:0.68rem;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em}
.country-card .cinfo{font-size:0.78rem;color:#4b5563;margin-top:0.5rem;line-height:1.5}
.country-guide-overlay{position:fixed;inset:0;z-index:9300;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding:80px 16px 16px;overflow-y:auto}
.country-guide-overlay.open{display:flex}
.country-guide-panel{background:#ffffff;border:1px solid rgba(0,0,0,0.1);border-radius:var(--radius-xl);max-width:700px;width:100%;padding:2.4rem;position:relative;animation:fadeUp 0.35s ease;box-shadow:0 24px 60px rgba(0,0,0,0.15)}
.cg-section{margin-bottom:1.6rem}
.cg-section h4{font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--gold);margin-bottom:0.6rem;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:0.4rem}
.cg-row{display:flex;gap:8px;align-items:flex-start;padding:5px 0;font-size:0.85rem}
.cg-row .lbl{color:#64748b;font-size:0.75rem;min-width:130px;flex-shrink:0;padding-top:2px}
.cg-row .val{color:#374151;line-height:1.5}
.cg-visa-chip{display:inline-block;background:rgba(184,134,11,0.08);border:1px solid rgba(184,134,11,0.25);border-radius:20px;padding:4px 12px;font-size:0.75rem;color:var(--gold);margin:2px}

/* ── POLICY PAGES ────────────────────────────────────────────────── */
.policy-body{max-width:760px;margin:2rem 0;color:#374151;font-size:0.92rem;line-height:1.9}
.policy-body h3{font-family:'Cormorant Garamond',serif;font-size:1.25rem;margin:1.8rem 0 0.6rem;color:var(--gold)}
.policy-body p{margin-bottom:1rem}
.policy-body ul{padding-left:1.4rem;margin-bottom:1rem}
.policy-body li{margin-bottom:0.4rem}

/* ── CHAT WIDGET ─────────────────────────────────────────────────── */
.chat-fab{position:fixed;bottom:28px;right:28px;z-index:9000;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-light));border:none;cursor:pointer;box-shadow:0 8px 28px rgba(184,134,11,0.45);display:flex;align-items:center;justify-content:center;font-size:26px;transition:var(--trans);animation:chatPop 0.5s 1.5s both}
@keyframes chatPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes aiDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
.chat-fab:hover{transform:scale(1.1);box-shadow:0 14px 40px rgba(184,134,11,0.6)}
.chat-badge{position:absolute;top:-3px;right:-3px;width:20px;height:20px;background:#e53935;border-radius:50%;border:2px solid #0a1628;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;color:white;animation:pulse 2s infinite}
.chat-panel{position:fixed;bottom:100px;right:28px;z-index:8999;width:360px;background:#0d1f3e;border:1px solid rgba(201,168,76,0.25);border-radius:var(--radius-xl);box-shadow:0 24px 60px rgba(0,0,0,0.55);display:none;flex-direction:column;overflow:hidden}
.chat-panel.open{display:flex;animation:slideUp 0.3s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.chat-head{background:linear-gradient(135deg,#132952,#1e3a6e);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(201,168,76,0.15)}
.chat-head-info{display:flex;align-items:center;gap:10px}
.chat-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-light));display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.chat-status .cname{font-size:0.88rem;font-weight:600;color:#ffffff}
.chat-status .online{font-size:0.72rem;color:#4caf50;display:flex;align-items:center;gap:4px;margin-top:2px}
.chat-status .online::before{content:'';width:6px;height:6px;background:#4caf50;border-radius:50%;display:inline-block}
.chat-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.08)}
.chat-tab{flex:1;padding:10px 6px;background:none;border:none;color:#8899bb;font-size:0.78rem;font-weight:500;cursor:pointer;transition:var(--trans);border-bottom:2px solid transparent;font-family:'Outfit',sans-serif}
.chat-tab.active{color:var(--gold);border-bottom-color:var(--gold);background:rgba(201,168,76,0.05)}
.chat-body{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;min-height:180px;max-height:280px}
.chat-body::-webkit-scrollbar{width:4px}.chat-body::-webkit-scrollbar-track{background:transparent}.chat-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
.chat-msg{max-width:84%;padding:10px 13px;border-radius:14px;font-size:0.83rem;line-height:1.5;word-break:break-word}
.chat-msg.bot{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:#cdd8ee;align-self:flex-start;border-bottom-left-radius:4px}
.chat-msg.user{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#0a1628;align-self:flex-end;font-weight:500;border-bottom-right-radius:4px}
.chat-sugs{padding:8px 14px 4px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.06)}
.chat-sug{background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:20px;padding:5px 11px;font-size:0.73rem;color:#e6c97a;cursor:pointer;transition:var(--trans);font-family:'Outfit',sans-serif}
.chat-sug:hover{background:rgba(201,168,76,0.22);border-color:var(--gold)}
.chat-footer{padding:10px 13px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:8px;align-items:center}
.chat-input{flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:9px 11px;color:#ffffff;font-size:0.83rem;outline:none;transition:var(--trans);font-family:'Outfit',sans-serif}
.chat-input::placeholder{color:#8899bb}
.chat-input:focus{border-color:var(--gold);background:rgba(255,255,255,0.1)}
.chat-send-btn{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#0a1628;border:none;border-radius:8px;padding:9px 14px;cursor:pointer;font-size:0.8rem;font-weight:600;transition:var(--trans);font-family:'Outfit',sans-serif;flex-shrink:0}
.chat-send-btn:hover{opacity:0.85}
@media(max-width:400px){.chat-panel{width:calc(100vw - 32px);right:16px}.chat-fab{bottom:16px;right:16px}}

/* ── TESTIMONIAL TICKER ──────────────────────────────────────────── */
.testi-track-wrap{overflow:hidden;mask:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);-webkit-mask:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.testi-track{display:flex;gap:1rem;width:max-content;animation:scrollLeft 40s linear infinite}
.testi-track-rev{animation:scrollRight 44s linear infinite}
@keyframes scrollLeft{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes scrollRight{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
.testi-track-wrap:hover .testi-track,.testi-track-wrap:hover .testi-track-rev{animation-play-state:paused}
.testi-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:1.4rem 1.6rem;width:300px;flex-shrink:0;transition:transform 0.3s,border-color 0.3s}
.testi-card:hover{transform:translateY(-4px);border-color:rgba(184,134,11,0.5)}
.testi-stars{color:#b8860b;font-size:0.9rem;margin-bottom:0.7rem;letter-spacing:2px}
.testi-card p{font-size:0.85rem;color:#cdd8ee;line-height:1.65;font-style:italic;margin-bottom:1rem}
.testi-author{display:flex;align-items:center;gap:10px}
.testi-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#b8860b,#d4a017);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.9rem;flex-shrink:0}
.testi-author strong{display:block;font-size:0.83rem;font-weight:600;color:#fff}
.testi-author span{font-size:0.72rem;color:#8899bb}

/* ── ELIGIBILITY CHECKER ─────────────────────────────────────────── */
.elig-overlay{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px}
.elig-overlay.open{display:flex}
.elig-modal{background:#ffffff;border:1px solid rgba(0,0,0,0.1);border-radius:var(--radius-xl);max-width:560px;width:100%;padding:2.4rem;position:relative;animation:fadeUp 0.35s ease;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.18)}
.elig-modal::-webkit-scrollbar{width:4px}.elig-modal::-webkit-scrollbar-track{background:transparent}.elig-modal::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:2px}
.elig-progress{display:flex;gap:5px;margin-bottom:1.8rem}
.elig-dot{height:4px;border-radius:2px;flex:1;background:rgba(184,134,11,0.15);transition:background 0.4s}
.elig-dot.done{background:var(--gold)}
.elig-q{font-family:'Cormorant Garamond',serif;font-size:1.55rem;font-weight:400;margin-bottom:1.4rem;line-height:1.3;color:#0a1628}
.elig-opts{display:grid;grid-template-columns:1fr 1fr;gap:0.7rem;margin-bottom:1.2rem}
.elig-opt{background:#f8f9fb;border:1px solid rgba(0,0,0,0.1);border-radius:var(--radius-lg);padding:1rem;cursor:pointer;transition:var(--trans);text-align:left}
.elig-opt:hover{border-color:var(--gold);background:rgba(184,134,11,0.06);transform:translateY(-2px)}
.elig-opt.selected{border-color:var(--gold);background:rgba(184,134,11,0.08)}
.elig-opt-icon{font-size:1.5rem;margin-bottom:0.3rem;display:block}
.elig-opt-label{font-size:0.88rem;font-weight:600;display:block;margin-bottom:2px;color:#0a1628}
.elig-opt-sub{font-size:0.73rem;color:#64748b}
.elig-result-badge{display:inline-block;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#ffffff;padding:7px 20px;border-radius:100px;font-weight:700;font-size:0.82rem;margin-bottom:1rem}
.elig-recs{display:flex;flex-direction:column;gap:0.6rem;margin-top:1rem}
.elig-rec{background:#f8f9fb;border:1px solid rgba(0,0,0,0.08);border-radius:var(--radius);padding:0.9rem;display:flex;align-items:center;gap:12px;cursor:pointer;transition:var(--trans)}
.elig-rec:hover{border-color:var(--gold);background:rgba(184,134,11,0.06);transform:translateX(4px)}
.elig-rec-icon{font-size:1.4rem;width:38px;text-align:center;flex-shrink:0}
.elig-rec-title{font-size:0.88rem;font-weight:600;color:#0a1628}
.elig-rec-sub{font-size:0.73rem;color:#64748b}
@media(max-width:480px){.elig-opts{grid-template-columns:1fr}}

/* ── WORLD CUP 2026 BANNER ───────────────────────────────────────── */
#wcBanner{position:fixed;top:0;left:0;right:0;z-index:1100;display:flex;align-items:center;justify-content:center;gap:14px;padding:9px 48px 9px 16px;background:linear-gradient(90deg,#0a1628,#132952 40%,#1e3a6e);border-bottom:2px solid var(--gold);overflow:hidden}
#wcBanner::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.18),transparent);background-size:200% 100%;animation:wcShine 4s linear infinite;pointer-events:none}
@keyframes wcShine{0%{background-position:200% 0}100%{background-position:-200% 0}}
.wc-ball{font-size:1.1rem;animation:wcBounce 1.6s ease-in-out infinite;flex-shrink:0}
@keyframes wcBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.wc-text{font-size:0.83rem;color:#e8eef6;line-height:1.3;position:relative;z-index:1}
.wc-text strong{color:var(--gold-light)}
.wc-cta{background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#0a1628;border:none;border-radius:7px;padding:7px 16px;font-size:0.8rem;font-weight:700;cursor:pointer;white-space:nowrap;font-family:'Outfit',sans-serif;flex-shrink:0;position:relative;z-index:1;transition:var(--trans)}
.wc-cta:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(201,168,76,0.4)}
.wc-close{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#8899bb;font-size:1.1rem;cursor:pointer;z-index:2;line-height:1;padding:4px}
.wc-close:hover{color:#fff}
body.wc-active nav{top:46px}
body.wc-active .hero{padding-top:150px}
body.wc-active .mobile-menu{padding-top:46px}
@media(max-width:760px){
  #wcBanner{padding:8px 40px 8px 12px;gap:10px}
  .wc-text{font-size:0.74rem}
  .wc-cta{padding:6px 12px;font-size:0.74rem}
  body.wc-active nav{top:60px}
}
@media(max-width:480px){
  .wc-cta{display:none}
  body.wc-active nav{top:52px}
}
</style>
</head>
<body>

<!-- WORLD CUP 2026 TOP BANNER -->
<div id="wcBanner">
  <span class="wc-ball">🏆</span>
  <span class="wc-text"><strong>World Cup 2026 is here!</strong> Fast-track your <strong>USA &amp; Canada</strong> visa, flight &amp; hotel letters — limited slots.</span>
  <button class="wc-cta" onclick="showPage('contact')">Get My World Cup Visa →</button>
  <button class="wc-close" onclick="dismissWC()" aria-label="Close">✕</button>
</div>
<script>
  (function(){
    if(localStorage.getItem('wcDismissed')==='1'){
      var b=document.getElementById('wcBanner'); if(b) b.style.display='none';
    } else {
      document.body.classList.add('wc-active');
    }
  })();
  function dismissWC(){
    localStorage.setItem('wcDismissed','1');
    var b=document.getElementById('wcBanner'); if(b) b.style.display='none';
    document.body.classList.remove('wc-active');
  }
</script>

<!-- NAV -->
<nav id="navbar">
  <div class="nav-logo" onclick="showPage('home')">
    <img src="logo.png" alt="SkyGlobe Limited" style="height:52px;width:auto;border-radius:10px">
  </div>
  <ul class="nav-links">
    <li><a onclick="showPage('home')" data-page="home">Home</a></li>
    <li><a onclick="showPage('about')" data-page="about">About</a></li>
    <li><a onclick="showPage('services')" data-page="services">Services</a></li>
    <li><a onclick="showPage('countries')" data-page="countries">Country Guides</a></li>
    <li><a onclick="showPage('destinations')" data-page="destinations">Destinations</a></li>
    <li><a onclick="showPage('search')" data-page="search">🔍 Search</a></li>
    <li><a onclick="showPage('apply')" data-page="apply" style="color:var(--gold)">📋 Apply Now</a></li>
    <li><a onclick="showPage('contact')" class="nav-cta" data-page="contact">Free Consult</a></li>
  </ul>
  <div class="hamburger" onclick="toggleMenu()" aria-label="Open menu">
    <span></span><span></span><span></span>
  </div>
</nav>

<!-- MOBILE MENU -->
<div class="mobile-menu" id="mobileMenu">
  <div class="nav-logo" onclick="showPage('home');toggleMenu()">
    <img src="logo.png" alt="SkyGlobe Limited" style="height:64px;width:auto;border-radius:12px">
  </div>
  <a onclick="showPage('home');toggleMenu()">Home</a>
  <a onclick="showPage('about');toggleMenu()">About</a>
  <a onclick="showPage('services');toggleMenu()">Services</a>
  <a onclick="showPage('destinations');toggleMenu()">Destinations</a>
  <a onclick="showPage('apply');toggleMenu()" style="color:var(--gold)">📋 Apply Now</a>
  <a onclick="showPage('search');toggleMenu()">🔍 Search</a>
  <a onclick="showPage('contact');toggleMenu()">Contact</a>
</div>

<!-- ============ HOME PAGE ============ -->
<div class="page active" id="page-home">

  <!-- HERO -->
  <section class="hero">
    <div class="hero-bg">
      <div class="grid-lines"></div>
      <div class="glow-blob blob-1"></div>
      <div class="glow-blob blob-2"></div>
      <div id="globeContainer" style="position:absolute;right:-8%;top:50%;transform:translateY(-50%);width:56%;max-width:680px;aspect-ratio:1/1;z-index:0"></div>
    </div>
    <div class="hero-content">
      <div class="hero-badge">✦ Global Opportunity Awaits</div>
      <h1>Your <em>Gateway</em> to<br><strong>Travel & Study Abroad</strong></h1>
      <p>We bridge borders, open universities, and unlock careers across the world. From visa processing to university admissions — Skyglobe turns your global ambitions into reality.</p>
      <div class="hero-btns">
        <button class="btn-primary" onclick="showPage('apply')">📋 Start Application</button>
        <button class="btn-outline" onclick="showPage('services')">Explore Services →</button>
        <button class="btn-outline" onclick="openElig()" style="border-color:rgba(100,180,255,0.4);color:#a0cfff">✦ Check My Eligibility</button>
      </div>
      <div class="hero-stats">
        <div class="stat-item"><span class="stat-num">12K+</span><span class="stat-label">Visas Processed</span></div>
        <div class="stat-item"><span class="stat-num">98%</span><span class="stat-label">Success Rate</span></div>
        <div class="stat-item"><span class="stat-num">47</span><span class="stat-label">Countries Served</span></div>
        <div class="stat-item"><span class="stat-num">8yr</span><span class="stat-label">Experience</span></div>
      </div>
    </div>
  </section>

  <!-- FLAG STRIP -->
  <div style="background:#0a1628;padding:14px 0;overflow:hidden;border-top:1px solid rgba(201,168,76,0.15);border-bottom:1px solid rgba(201,168,76,0.15)">
    <div style="display:flex;gap:0;width:max-content;animation:scrollLeft 30s linear infinite">
      <div style="display:flex;gap:32px;align-items:center;padding:0 16px;white-space:nowrap;font-size:0.85rem;color:#8899bb">
        <span>🇬🇧 United Kingdom</span><span>🇺🇸 United States</span><span>🇨🇦 Canada</span><span>🇩🇪 Germany</span><span>🇦🇺 Australia</span><span>🇵🇱 Poland</span><span>🇵🇹 Portugal</span><span>🇱🇻 Latvia</span><span>🇯🇵 Japan</span><span>🇰🇷 South Korea</span><span>🇦🇪 UAE</span><span>🇫🇷 France</span><span>🇳🇱 Netherlands</span><span>🇧🇪 Belgium</span><span>🇮🇹 Italy</span><span>🇪🇸 Spain</span><span>🇸🇬 Singapore</span><span>🇳🇴 Norway</span><span>🇫🇮 Finland</span><span style="color:#b8860b">✦ 47 Countries Served ✦</span>
      </div>
      <div style="display:flex;gap:32px;align-items:center;padding:0 16px;white-space:nowrap;font-size:0.85rem;color:#8899bb">
        <span>🇬🇧 United Kingdom</span><span>🇺🇸 United States</span><span>🇨🇦 Canada</span><span>🇩🇪 Germany</span><span>🇦🇺 Australia</span><span>🇵🇱 Poland</span><span>🇵🇹 Portugal</span><span>🇱🇻 Latvia</span><span>🇯🇵 Japan</span><span>🇰🇷 South Korea</span><span>🇦🇪 UAE</span><span>🇫🇷 France</span><span>🇳🇱 Netherlands</span><span>🇧🇪 Belgium</span><span>🇮🇹 Italy</span><span>🇪🇸 Spain</span><span>🇸🇬 Singapore</span><span>🇳🇴 Norway</span><span>🇫🇮 Finland</span><span style="color:#b8860b">✦ 47 Countries Served ✦</span>
      </div>
    </div>
  </div>

  <!-- WORLD CUP 2026 PROMO SECTION -->
  <section style="padding:70px 5%">
    <div style="max-width:1100px;margin:0 auto;background:linear-gradient(135deg,#0a1628 0%,#132952 55%,#1e3a6e 100%);border:1px solid rgba(201,168,76,0.3);border-radius:var(--radius-xl);padding:3rem;position:relative;overflow:hidden;box-shadow:0 20px 50px rgba(10,22,40,0.25)">
      <div style="position:absolute;top:-60px;right:-40px;font-size:14rem;opacity:0.07;pointer-events:none;line-height:1">🏆</div>
      <div style="position:absolute;bottom:-50px;left:-30px;width:260px;height:260px;background:rgba(201,168,76,0.08);border-radius:50%;filter:blur(50px);pointer-events:none"></div>
      <div style="position:relative;z-index:1">
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);border-radius:100px;padding:6px 16px;font-size:0.75rem;font-weight:600;color:var(--gold-light);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:1.4rem">🏆 FIFA World Cup 2026 · USA · Canada · Mexico</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:300;color:#fff;line-height:1.15;margin-bottom:1rem">Going to the <strong style="font-weight:600;color:var(--gold-light)">World Cup?</strong><br>We'll get your visa ready.</h2>
        <p style="color:#cdd8ee;font-size:1rem;line-height:1.7;max-width:560px;margin-bottom:1.8rem">The biggest tournament on Earth is happening across the <strong style="color:#fff">USA &amp; Canada</strong>. Don't miss a single match because of paperwork. We fast-track everything you need to be in the stadium.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem">
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1.2rem"><div style="font-size:1.6rem;margin-bottom:0.4rem">🛂</div><div style="color:#fff;font-weight:600;font-size:0.92rem;margin-bottom:0.2rem">USA &amp; Canada Visas</div><div style="color:#8899bb;font-size:0.8rem">B-1/B-2 visitor &amp; eTA — expertly prepared</div></div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1.2rem"><div style="font-size:1.6rem;margin-bottom:0.4rem">✈️</div><div style="color:#fff;font-weight:600;font-size:0.92rem;margin-bottom:0.2rem">Flight &amp; Hotel Letters</div><div style="color:#8899bb;font-size:0.8rem">Embassy-accepted, same-day delivery</div></div>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1.2rem"><div style="font-size:1.6rem;margin-bottom:0.4rem">🛡️</div><div style="color:#fff;font-weight:600;font-size:0.92rem;margin-bottom:0.2rem">Travel Insurance</div><div style="color:#8899bb;font-size:0.8rem">Full medical cover for your trip</div></div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button onclick="showPage('contact')" style="background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#0a1628;border:none;padding:14px 30px;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;box-shadow:0 6px 18px rgba(201,168,76,0.35)">🏆 Get My World Cup Visa</button>
          <button onclick="showSvcDetail('Tourist / Visit Visa')" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:14px 28px;border-radius:10px;font-weight:500;font-size:0.95rem;cursor:pointer">See the Full Package</button>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVICES PREVIEW -->
  <section class="services-preview">
    <div class="text-center">
      <div class="section-tag">What We Do</div>
      <h2 class="section-title">World-Class <strong>Services</strong></h2>
      <p class="section-sub">Comprehensive travel, immigration, and education solutions tailored to your destination and goals.</p>
    </div>
    <div class="services-grid">
      <div class="service-card" onclick="showSvcDetail('Student Visa Processing')" style="cursor:pointer">
        <div class="service-icon">🎓</div>
        <h3>Student Visa</h3>
        <p>Expert guidance for student visa applications to top universities worldwide — UK, USA, Canada & beyond.</p>
      </div>
      <div class="service-card" onclick="showSvcDetail('Work Visa Processing')" style="cursor:pointer">
        <div class="service-icon">💼</div>
        <h3>Work Visa</h3>
        <p>Skilled worker visas, employer sponsorships, and work permit processing handled professionally.</p>
      </div>
      <div class="service-card" onclick="showSvcDetail('Flight Booking')" style="cursor:pointer">
        <div class="service-icon">✈️</div>
        <h3>Travel Services</h3>
        <p>Flight booking, reservations, hotel bookings, travel insurance, and complete trip documentation.</p>
      </div>
      <div class="service-card" onclick="showSvcDetail('University Admission Assistance')" style="cursor:pointer">
        <div class="service-icon">🏛️</div>
        <h3>University Admissions</h3>
        <p>End-to-end support from shortlisting institutions to application submission and scholarship discovery.</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:2.5rem">
      <button class="btn-outline" onclick="showPage('services')">View All 12 Services →</button>
    </div>
  </section>

  <div class="section-divider"></div>

  <!-- ABOUT PREVIEW -->
  <section>
    <div class="about-grid">
      <div class="about-visual">
        <div class="about-img-frame">
          <svg class="about-globe-anim" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="globeGrad" cx="35%" cy="35%">
                <stop offset="0%" stop-color="#1e3a6e"/>
                <stop offset="100%" stop-color="#0a1628"/>
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="140" fill="url(#globeGrad)" stroke="#c9a84c" stroke-width="1.5"/>
            <ellipse cx="150" cy="150" rx="70" ry="140" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.5"/>
            <ellipse cx="150" cy="150" rx="35" ry="140" fill="none" stroke="#c9a84c" stroke-width="0.8" opacity="0.4"/>
            <line x1="10" y1="150" x2="290" y2="150" stroke="#c9a84c" stroke-width="0.8" opacity="0.5"/>
            <ellipse cx="150" cy="150" rx="140" ry="55" fill="none" stroke="#c9a84c" stroke-width="0.8" opacity="0.4"/>
            <ellipse cx="150" cy="150" rx="140" ry="95" fill="none" stroke="#c9a84c" stroke-width="0.6" opacity="0.3"/>
            <!-- Land masses -->
            <ellipse cx="120" cy="115" rx="30" ry="22" fill="#c9a84c" opacity="0.2"/>
            <ellipse cx="175" cy="125" rx="24" ry="18" fill="#c9a84c" opacity="0.18"/>
            <ellipse cx="155" cy="170" rx="18" ry="14" fill="#c9a84c" opacity="0.15"/>
            <ellipse cx="200" cy="155" rx="14" ry="10" fill="#c9a84c" opacity="0.15"/>
            <!-- Plane -->
            <g transform="translate(190,90) rotate(-30)">
              <path d="M0,0 L12,-4 L12,4 Z" fill="#c9a84c" opacity="0.9"/>
              <path d="M6,-1 L0,-8 L2,-8 L7,0" fill="#c9a84c" opacity="0.7"/>
              <path d="M6,1 L0,8 L2,8 L7,0" fill="#c9a84c" opacity="0.7"/>
            </g>
          </svg>
          <div class="about-badge">
            <strong>2016</strong>
            <span>Est. New York</span>
          </div>
        </div>
      </div>
      <div>
        <div class="section-tag">About Skyglobe</div>
        <h2 class="section-title">More Than a <br><strong>Travel Agency</strong></h2>
        <p class="section-sub">We are architects of global mobility — combining expert knowledge, trusted relationships, and a genuine passion for helping people achieve their international dreams.</p>
        <div class="trust-items">
          <div class="trust-item">
            <div class="trust-icon">⚡</div>
            <div>
              <h4>Lightning-Fast Processing</h4>
              <p>Our streamlined systems ensure your applications move swiftly through every stage, minimizing wait times.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon">🛡️</div>
            <div>
              <h4>Trusted & Certified</h4>
              <p>Licensed immigration consultants with direct embassy relationships and a 98% visa approval record.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon">🌍</div>
            <div>
              <h4>Global Reach</h4>
              <p>Active partnerships with universities, employers, and embassies across 47 countries on 6 continents.</p>
            </div>
          </div>
        </div>
        <div style="margin-top:2rem">
          <button class="btn-primary" onclick="showPage('about')">Our Full Story →</button>
        </div>
      </div>
    </div>
  </section>

  <!-- DESTINATIONS PREVIEW -->
  <section style="padding-top:0">
    <div class="text-center">
      <div class="section-tag">Where We Go</div>
      <h2 class="section-title">Top <strong>Destinations</strong></h2>
      <p class="section-sub">From the ivy leagues of America to the ancient universities of Europe — we unlock access everywhere.</p>
    </div>
    <div class="dest-grid" style="margin-top:2.5rem">
      <div class="dest-card" onclick="showPage('destinations')">
        <div class="dest-bg">🗽</div>
        <div class="dest-overlay"></div>
        <div class="dest-info">
          <span class="dest-flag">🇺🇸</span>
          <span class="dest-name">United States</span>
          <span class="dest-badge">F1 · H1B · B1/B2</span>
        </div>
      </div>
      <div class="dest-card" onclick="showPage('destinations')">
        <div class="dest-bg">🍁</div>
        <div class="dest-overlay"></div>
        <div class="dest-info">
          <span class="dest-flag">🇨🇦</span>
          <span class="dest-name">Canada</span>
          <span class="dest-badge">Study · Express Entry</span>
        </div>
      </div>
      <div class="dest-card" onclick="showPage('destinations')">
        <div class="dest-bg">🎡</div>
        <div class="dest-overlay"></div>
        <div class="dest-info">
          <span class="dest-flag">🇬🇧</span>
          <span class="dest-name">United Kingdom</span>
          <span class="dest-badge">Tier 4 · Skilled Worker</span>
        </div>
      </div>
      <div class="dest-card" onclick="showPage('destinations')">
        <div class="dest-bg">🗼</div>
        <div class="dest-overlay"></div>
        <div class="dest-info">
          <span class="dest-flag">🇪🇺</span>
          <span class="dest-name">Europe</span>
          <span class="dest-badge">Schengen · Student</span>
        </div>
      </div>
      <div class="dest-card" onclick="showPage('destinations')">
        <div class="dest-bg">🏯</div>
        <div class="dest-overlay"></div>
        <div class="dest-info">
          <span class="dest-flag">🌏</span>
          <span class="dest-name">Asia</span>
          <span class="dest-badge">Work · Student</span>
        </div>
      </div>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section>
    <div style="text-align:center;margin-bottom:3rem">
      <div class="section-tag">Our Process</div>
      <h2 class="section-title">How It <strong>Works</strong></h2>
      <p class="section-sub">A clear, transparent process from first contact to final approval — you always know exactly where your application stands.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.2rem">
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.8rem;text-align:center;position:relative">
        <div style="width:46px;height:46px;background:rgba(201,168,76,0.12);border:1px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--gold)">1</div>
        <h3 style="font-size:1rem;margin-bottom:0.5rem">Choose Your Service</h3>
        <p style="font-size:0.85rem;color:var(--text-body);line-height:1.6">Browse our services, read the full details, and submit your application online in minutes — or book a free consultation first.</p>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.8rem;text-align:center;position:relative">
        <div style="width:46px;height:46px;background:rgba(201,168,76,0.12);border:1px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--gold)">2</div>
        <h3 style="font-size:1rem;margin-bottom:0.5rem">Expert Review</h3>
        <p style="font-size:0.85rem;color:var(--text-body);line-height:1.6">Our consultants review your application within 24 hours, contact you with a document checklist, and confirm your eligibility.</p>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.8rem;text-align:center;position:relative">
        <div style="width:46px;height:46px;background:rgba(201,168,76,0.12);border:1px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--gold)">3</div>
        <h3 style="font-size:1rem;margin-bottom:0.5rem">We Process Everything</h3>
        <p style="font-size:0.85rem;color:var(--text-body);line-height:1.6">Upload your documents securely on our site. We prepare, submit, and manage your application — track progress anytime with your reference number.</p>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.8rem;text-align:center;position:relative">
        <div style="width:46px;height:46px;background:rgba(201,168,76,0.12);border:1px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--gold)">4</div>
        <h3 style="font-size:1rem;margin-bottom:0.5rem">Approval & Departure</h3>
        <p style="font-size:0.85rem;color:var(--text-body);line-height:1.6">Receive your visa, documents, and pre-departure briefing. We stay with you until you've safely arrived at your destination.</p>
      </div>
    </div>
  </section>

  <div class="section-divider"></div>

  <!-- TESTIMONIALS -->
  <section style="background:#0a1628;padding:80px 5%;overflow:hidden">
    <div style="text-align:center;margin-bottom:3rem">
      <div style="display:inline-block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold);margin-bottom:0.8rem">Client Stories</div>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3rem);font-weight:300;line-height:1.2;margin-bottom:0.5rem;color:#ffffff">What Our <strong style="font-weight:600">Clients Say</strong></h2>
      <p style="color:#8899bb;font-size:0.95rem">Real stories from clients across 47 countries</p>
    </div>

    <!-- Scrolling ticker row 1 (left→right) -->
    <div class="testi-track-wrap" style="margin-bottom:1rem">
      <div class="testi-track" id="testiRow1">
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"SkyGlobe handled my UK student visa from start to finish. Approved on the first attempt — incredible service!"</p><div class="testi-author"><div class="testi-av">A</div><div><strong>Adaeze O.</strong><span>🇳🇬 Nigeria → 🇬🇧 UK</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"Got a job in Poland through their EU programme. They handled the work permit and visa. I'm now earning in euros!"</p><div class="testi-author"><div class="testi-av">K</div><div><strong>Kwame B.</strong><span>🇬🇭 Ghana → 🇵🇱 Poland</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"Schengen visa, flight letter and hotel letter all delivered the same day. Truly professional service."</p><div class="testi-author"><div class="testi-av">M</div><div><strong>Maria S.</strong><span>🇧🇷 Brazil → 🇪🇺 Schengen</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"My Canada Express Entry was processed flawlessly. SkyGlobe's knowledge of immigration law is unmatched."</p><div class="testi-author"><div class="testi-av">R</div><div><strong>Ravi M.</strong><span>🇮🇳 India → 🇨🇦 Canada</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"I was rejected twice before finding SkyGlobe. They identified the errors and my third application was approved!"</p><div class="testi-author"><div class="testi-av">F</div><div><strong>Fatima A.</strong><span>🇲🇦 Morocco → 🇩🇪 Germany</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"The scholarship application support was exceptional. I secured a full scholarship to a top UK university!"</p><div class="testi-author"><div class="testi-av">C</div><div><strong>Chisom E.</strong><span>🇳🇬 Nigeria → 🇬🇧 UK</span></div></div></div>
        <!-- duplicates for infinite scroll -->
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"SkyGlobe handled my UK student visa from start to finish. Approved on the first attempt — incredible service!"</p><div class="testi-author"><div class="testi-av">A</div><div><strong>Adaeze O.</strong><span>🇳🇬 Nigeria → 🇬🇧 UK</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"Got a job in Poland through their EU programme. They handled the work permit and visa. I'm now earning in euros!"</p><div class="testi-author"><div class="testi-av">K</div><div><strong>Kwame B.</strong><span>🇬🇭 Ghana → 🇵🇱 Poland</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"Schengen visa, flight letter and hotel letter all delivered the same day. Truly professional service."</p><div class="testi-author"><div class="testi-av">M</div><div><strong>Maria S.</strong><span>🇧🇷 Brazil → 🇪🇺 Schengen</span></div></div></div>
      </div>
    </div>

    <!-- Scrolling ticker row 2 (right→left) -->
    <div class="testi-track-wrap">
      <div class="testi-track testi-track-rev" id="testiRow2">
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"Australia student visa processed in 6 weeks. The team kept me updated at every stage. So professional!"</p><div class="testi-author"><div class="testi-av">L</div><div><strong>Linh N.</strong><span>🇻🇳 Vietnam → 🇦🇺 Australia</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"My family's UAE visit visa was ready in 3 days. The application portal makes everything so easy to track."</p><div class="testi-author"><div class="testi-av">O</div><div><strong>Omar A.</strong><span>🇪🇬 Egypt → 🇦🇪 UAE</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"From job offer in Lithuania to landing in Vilnius — SkyGlobe managed every step. Forever grateful."</p><div class="testi-author"><div class="testi-av">J</div><div><strong>John M.</strong><span>🇰🇪 Kenya → 🇱🇹 Lithuania</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"Needed a USA tourist visa on short notice. They prepared everything perfectly and I got a 10-year visa!"</p><div class="testi-author"><div class="testi-av">P</div><div><strong>Priya K.</strong><span>🇵🇰 Pakistan → 🇺🇸 USA</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"University admission in Germany sorted in 8 weeks. SkyGlobe even helped with my German bank account!"</p><div class="testi-author"><div class="testi-av">E</div><div><strong>Emmanuel T.</strong><span>🇨🇲 Cameroon → 🇩🇪 Germany</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"The travel insurance they provided covered my whole Schengen trip. Simple, fast, reliable — 10/10."</p><div class="testi-author"><div class="testi-av">S</div><div><strong>Sara H.</strong><span>🇸🇦 Saudi Arabia → 🇫🇷 France</span></div></div></div>
        <!-- duplicates -->
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"Australia student visa processed in 6 weeks. The team kept me updated at every stage. So professional!"</p><div class="testi-author"><div class="testi-av">L</div><div><strong>Linh N.</strong><span>🇻🇳 Vietnam → 🇦🇺 Australia</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"My family's UAE visit visa was ready in 3 days. The application portal makes everything so easy to track."</p><div class="testi-author"><div class="testi-av">O</div><div><strong>Omar A.</strong><span>🇪🇬 Egypt → 🇦🇪 UAE</span></div></div></div>
        <div class="testi-card"><div class="testi-stars">★★★★★</div><p>"From job offer in Lithuania to landing in Vilnius — SkyGlobe managed every step. Forever grateful."</p><div class="testi-author"><div class="testi-av">J</div><div><strong>John M.</strong><span>🇰🇪 Kenya → 🇱🇹 Lithuania</span></div></div></div>
      </div>
    </div>
  </section>

  <div class="section-divider"></div>

  <!-- FAQ -->
  <section>
    <div style="text-align:center;margin-bottom:3rem">
      <div class="section-tag">Questions & Answers</div>
      <h2 class="section-title">Frequently Asked <strong>Questions</strong></h2>
    </div>
    <div style="max-width:760px;margin:0 auto" id="faqList">
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">How long does visa processing take?<span>+</span></button><div class="faq-a">It depends on the visa type and destination. Tourist visas typically take 1–4 weeks, student visas 4–12 weeks, and work visas 6–16 weeks. We give you a realistic timeline during your free consultation and keep you updated at every stage through our online tracking system.</div></div>
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">How much do your services cost?<span>+</span></button><div class="faq-a">Fees vary by service and destination country. Embassy/government fees are separate from our service fees, and we are always transparent about both before you commit. Book a free consultation for an exact quote — no hidden charges, ever.</div></div>
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">What happens if my visa is refused?<span>+</span></button><div class="faq-a">Our 98% success rate comes from only submitting applications that are properly prepared. If a refusal does happen, we analyse the refusal reasons free of charge and advise on reapplication or appeal — many of our successful clients came to us after a refusal elsewhere.</div></div>
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">How does the EU Direct Employment programme work?<span>+</span></button><div class="faq-a">We match your CV with verified employers in 14 European countries. Once an employer selects you, they issue a job offer letter, and we process your work permit and national visa. The full journey typically takes 8–20 weeks. You need a valid passport, a clean criminal record, and relevant work experience.</div></div>
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">How do I track my application?<span>+</span></button><div class="faq-a">Every application receives a unique reference number (e.g. SKY-2026-XXXX). Enter it in the Track Application section of our website to see your live status, messages from our team, and any documents we've issued to you — 24/7.</div></div>
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">How do I send you my documents?<span>+</span></button><div class="faq-a">Securely through our website. After applying, open your application with your reference number and use the Documents section to upload passport copies, certificates, and photos. We deliver your finished documents (visas, letters, tickets) the same way.</div></div>
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Are you a registered company?<span>+</span></button><div class="faq-a">Yes — SkyGlobe Limited is a registered travel and immigration consultancy. We operate transparently: every application gets a written reference, documented communication, and printable official records on our company letterhead.</div></div>
      <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Can I pay in instalments?<span>+</span></button><div class="faq-a">For longer processes such as student visas and EU employment placements, staged payments tied to milestones are available. Discuss your situation during the free consultation and we'll agree a plan that works for you.</div></div>
    </div>
  </section>

  <div class="section-divider"></div>

  <!-- CTA STRIP -->
  <section style="padding-top:0">
    <div style="background:linear-gradient(135deg,#0a1628,#132952);border:1px solid rgba(201,168,76,0.2);border-radius:var(--radius-xl);padding:4rem;text-align:center;position:relative;overflow:hidden">
      <div style="position:absolute;top:-50px;right:-50px;width:300px;height:300px;background:rgba(201,168,76,0.05);border-radius:50%;filter:blur(40px)"></div>
      <div class="section-tag">Ready to Begin?</div>
      <h2 class="section-title" style="margin-bottom:1rem">Start Your Global Journey <strong>Today</strong></h2>
      <p style="color:var(--text-body);max-width:480px;margin:0 auto 2rem">Book a free 30-minute consultation with our experts and get a clear roadmap to your international goals.</p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
        <button class="btn-primary" onclick="showPage('contact')">✦ Book Free Consultation</button>
        <a href="https://wa.me/17373998522" class="wa-btn" target="_blank">💬 Chat on WhatsApp</a>
      </div>
    </div>
  </section>

</div>

<!-- ============ ABOUT PAGE ============ -->
<div class="page" id="page-about">
  <section style="padding-top:140px">
    <div class="section-tag">Our Story</div>
    <h1 class="section-title">Skyglobe is a <em style="font-family:'Cormorant Garamond',serif;color:var(--gold);font-weight:300">Gateway</em><br>to <strong>Global Opportunity</strong></h1>
    <p class="section-sub" style="max-width:640px">Founded in 2016 in New York City, Skyglobe Limited was born from a simple belief: every person deserves the chance to pursue their dreams — wherever in the world those dreams live.</p>
    
    <div class="about-mission">
      <div class="mission-card">
        <h3>Our Mission</h3>
        <p>To democratize global mobility by providing world-class immigration, education, and travel consultancy services that are accessible, transparent, and results-driven. We believe borders should never limit ambition.</p>
      </div>
      <div class="mission-card">
        <h3>Our Vision</h3>
        <p>To become the most trusted name in global mobility — the first call anyone makes when they want to study, work, or live abroad. A world where every qualified dream finds its destination.</p>
      </div>
    </div>

    <div style="margin-top:4rem">
      <div class="section-tag">Why We're Different</div>
      <h2 class="section-title">Why <strong>12,000+ Clients</strong> Trust Skyglobe</h2>
      <div class="values-grid" style="margin-top:2rem">
        <div class="value-card">
          <span class="v-icon">🏆</span>
          <h4>98% Success Rate</h4>
          <p>Industry-leading visa approval record built over 8 years of expert practice</p>
        </div>
        <div class="value-card">
          <span class="v-icon">⚡</span>
          <h4>Fast Turnaround</h4>
          <p>Streamlined processes mean faster applications without sacrificing quality</p>
        </div>
        <div class="value-card">
          <span class="v-icon">🤝</span>
          <h4>End-to-End Support</h4>
          <p>From initial consultation to arrival — we're with you every step of the journey</p>
        </div>
        <div class="value-card">
          <span class="v-icon">🌐</span>
          <h4>Global Network</h4>
          <p>Direct relationships with embassies, universities, and employers in 47 countries</p>
        </div>
        <div class="value-card">
          <span class="v-icon">🔒</span>
          <h4>Fully Compliant</h4>
          <p>All services strictly follow immigration laws and embassy protocols</p>
        </div>
        <div class="value-card">
          <span class="v-icon">💛</span>
          <h4>Client-First Culture</h4>
          <p>Your success is our success — we invest personally in every client's outcome</p>
        </div>
      </div>
    </div>

    <div style="margin-top:4rem;background:rgba(201,168,76,0.06);border:1px solid var(--border);border-radius:var(--radius-xl);padding:3rem">
      <div class="text-center">
        <div class="section-tag">Global Impact</div>
        <h2 class="section-title" style="margin-bottom:2.5rem">The Numbers <strong>Speak</strong></h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:2rem;text-align:center">
        <div><div class="stat-num">12,400+</div><div class="stat-label">Visas Approved</div></div>
        <div><div class="stat-num">3,200+</div><div class="stat-label">Students Placed</div></div>
        <div><div class="stat-num">47</div><div class="stat-label">Countries</div></div>
        <div><div class="stat-num">98%</div><div class="stat-label">Approval Rate</div></div>
        <div><div class="stat-num">8yr</div><div class="stat-label">Experience</div></div>
        <div><div class="stat-num">24/7</div><div class="stat-label">Client Support</div></div>
      </div>
    </div>
  </section>
</div>

<!-- ============ SERVICES PAGE ============ -->
<div class="page" id="page-services">
  <section style="padding-top:140px">
    <div class="section-tag">Full Services</div>
    <h1 class="section-title">Everything You Need <br>to Go <strong>Global</strong></h1>
    <p class="section-sub">Ten specialist services covering every dimension of international travel, immigration, and education — handled by certified consultants with proven track records.</p>

    <div class="services-full-grid">
      <div class="service-full-card" onclick="showSvcDetail('Student Visa Processing')">
        <span class="s-icon">🎓</span>
        <h3>Student Visa Processing</h3>
        <p>Comprehensive student visa applications for the USA (F-1), UK (Tier 4), Canada, Australia, Germany, and more. We handle documentation, financial proof, and interview preparation.</p>
        <span class="s-tag">Education → Global</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Work Visa Processing')">
        <span class="s-icon">💼</span>
        <h3>Work Visa Processing</h3>
        <p>Skilled worker visas, employer sponsorship management, and work permit applications across the UK, USA, Canada, and EU. We navigate complex immigration rules so you don't have to.</p>
        <span class="s-tag">Career → Abroad</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Tourist / Visit Visa')">
        <span class="s-icon">🌴</span>
        <h3>Visit / Tourist Visa Services</h3>
        <p>Short-stay and tourist visa applications for Schengen, USA B-1/B-2, UK Standard Visitor, and more. Fast-tracked options available for urgent travel needs.</p>
        <span class="s-tag">Tourism → Anywhere</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Flight Reservation Letter')">
        <span class="s-icon">✈️</span>
        <h3>Flight Reservation Services</h3>
        <p>Genuine flight reservations and itinerary documentation for visa applications and embassy appointments — without requiring upfront ticket purchase.</p>
        <span class="s-tag">Travel → Ready</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Travel Insurance')">
        <span class="s-icon">🛡️</span>
        <h3>Travel Insurance</h3>
        <p>Comprehensive travel insurance plans that meet Schengen and embassy requirements — covering medical emergencies, trip cancellation, and baggage loss worldwide.</p>
        <span class="s-tag">Protection → Global</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('University Admission Assistance')">
        <span class="s-icon">🏛️</span>
        <h3>University Admission Assistance</h3>
        <p>End-to-end university application support: shortlisting, personal statement writing, application submission, and offer acceptance — across the UK, USA, Canada, and Europe.</p>
        <span class="s-tag">Education → Future</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Scholarship Application Support')">
        <span class="s-icon">🌟</span>
        <h3>Scholarship Support</h3>
        <p>Identify and apply for merit-based, need-based, and country-specific scholarships. We've helped students secure over $2M in scholarship awards across multiple cycles.</p>
        <span class="s-tag">Funding → Dreams</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Hotel Booking / Accommodation Letter')">
        <span class="s-icon">🏨</span>
        <h3>Hotel Booking Services</h3>
        <p>Hotel accommodation bookings for visa application requirements, business travel, and study-abroad arrivals. Confirmation letters issued same-day for embassy use.</p>
        <span class="s-tag">Accommodation → Sorted</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Document Authentication / Apostille')">
        <span class="s-icon">📋</span>
        <h3>Document Verification</h3>
        <p>Authentication, notarization, apostille, and legalization of educational certificates, police clearances, financial statements, and other supporting documents.</p>
        <span class="s-tag">Documents → Verified</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showPage('contact')">
        <span class="s-icon">🧭</span>
        <h3>Travel & Immigration Consultation</h3>
        <p>One-on-one expert consultation sessions to map out the best immigration pathway for your specific goals, timeline, and background — with a clear, actionable plan.</p>
        <span class="s-tag">Strategy → Success</span><span class="apply-hint">→ Book consultation</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('Flight Booking')">
        <span class="s-icon">🎫</span>
        <h3>Flight Booking</h3>
        <p>Full flight ticket booking service — we search the best fares, book one-way, round-trip or multi-city tickets, and deliver your e-ticket directly to you. Pay only the best available price.</p>
        <span class="s-tag">Fly → Anywhere</span><span class="apply-hint">→ Apply now</span>
      </div>
      <div class="service-full-card" onclick="showSvcDetail('EU Direct Employment')">
        <span class="s-icon">🇪🇺</span>
        <h3>EU Direct Employment</h3>
        <p>Direct job placement with employers in Poland, Latvia, Lithuania, Portugal, Spain, Norway, Finland, Czech Republic, Slovakia, Austria, Hungary, Bulgaria, Montenegro, North Macedonia, Ukraine, Japan and South Korea — including work permit and visa processing from start to finish.</p>
        <span class="s-tag">Work → Europe</span><span class="apply-hint">→ Apply now</span>
      </div>
    </div>

    <div style="text-align:center;margin-top:3rem;padding:3rem;background:rgba(201,168,76,0.06);border:1px solid var(--border);border-radius:var(--radius-xl)">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:2rem;margin-bottom:0.8rem">Ready to get started?</h3>
      <p style="color:var(--text-body);margin-bottom:1.5rem">Book a free consultation and let our experts find the right service combination for your goals.</p>
      <button class="btn-primary" onclick="showPage('contact')">✦ Book Free Consultation</button>
    </div>
  </section>
</div>

<!-- ============ SERVICE DETAIL OVERLAY ============ -->
<div id="svcOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;overflow-y:auto;padding:24px 12px" onclick="if(event.target===this)closeSvcOverlay()">
  <div id="svcOverlayBox" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid rgba(0,0,0,0.1);border-radius:20px;padding:36px 40px;position:relative;box-shadow:0 24px 60px rgba(0,0,0,0.15)">
    <button onclick="closeSvcOverlay()" style="position:absolute;top:16px;right:20px;background:none;border:none;color:#64748b;font-size:1.5rem;cursor:pointer">✕</button>
    <button onclick="closeSvcOverlay()" style="position:absolute;top:18px;left:24px;background:none;border:1px solid rgba(0,0,0,0.12);border-radius:8px;color:#374151;font-size:0.8rem;cursor:pointer;padding:6px 14px">← Back</button>
    <div id="svcOverlayContent"></div>
  </div>
</div>

<!-- ============ DESTINATIONS PAGE ============ -->
<div class="page" id="page-destinations">
  <section style="padding-top:140px">
    <div class="section-tag">Destinations</div>
    <h1 class="section-title">Where We Can <strong>Take You</strong></h1>
    <p class="section-sub">We operate in 47 countries across 5 major regions. Here's a snapshot of visa requirements and opportunities in each area.</p>

    <div style="margin-top:3rem">
      <div class="dest-region">
        <h3>🇺🇸 North America</h3>
        <div class="dest-info-grid">
          <div class="dest-info-card">
            <span class="flag">🇺🇸</span>
            <h4>United States</h4>
            <ul>
              <li>F-1 Student Visa</li>
              <li>H-1B Work Visa</li>
              <li>B-1/B-2 Visitor Visa</li>
              <li>O-1 Extraordinary Ability</li>
              <li>J-1 Exchange Visitor</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🇨🇦</span>
            <h4>Canada</h4>
            <ul>
              <li>Study Permit</li>
              <li>Express Entry (PR)</li>
              <li>Work Permit</li>
              <li>Visitor Visa</li>
              <li>Provincial Nominee Program</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🇲🇽</span>
            <h4>Mexico & Caribbean</h4>
            <ul>
              <li>Tourist Visa</li>
              <li>Temporary Resident</li>
              <li>Business Visa</li>
              <li>Retirement Visa</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="dest-region">
        <h3>🇬🇧 United Kingdom</h3>
        <div class="dest-info-grid">
          <div class="dest-info-card">
            <span class="flag">🇬🇧</span>
            <h4>United Kingdom</h4>
            <ul>
              <li>Student Visa (formerly Tier 4)</li>
              <li>Skilled Worker Visa</li>
              <li>Standard Visitor Visa</li>
              <li>Graduate Visa (Post-Study Work)</li>
              <li>Global Talent Visa</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>
            <h4>Scotland & Ireland</h4>
            <ul>
              <li>Independent pathways</li>
              <li>Scottish Graduate Route</li>
              <li>IRL Critical Skills Permit</li>
              <li>Irish Student Visa</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="dest-region">
        <h3>🇪🇺 Europe</h3>
        <div class="dest-info-grid">
          <div class="dest-info-card">
            <span class="flag">🇩🇪</span>
            <h4>Germany</h4>
            <ul>
              <li>Student Visa</li>
              <li>Skilled Worker Visa</li>
              <li>Job Seeker Visa</li>
              <li>Schengen (tourist)</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🇫🇷</span>
            <h4>France</h4>
            <ul>
              <li>Long-Stay Student Visa</li>
              <li>Talent Passport</li>
              <li>Schengen Visa</li>
              <li>Work Authorization</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🇳🇱</span>
            <h4>Netherlands & Nordics</h4>
            <ul>
              <li>Highly Skilled Migrant</li>
              <li>Orientation Year Visa</li>
              <li>Student Visa</li>
              <li>Schengen Short-Stay</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🇦🇺</span>
            <h4>Australia & NZ</h4>
            <ul>
              <li>Student Visa (Subclass 500)</li>
              <li>Skilled Independent (189)</li>
              <li>Working Holiday</li>
              <li>Employer Sponsored</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="dest-region">
        <h3>🌏 Asia</h3>
        <div class="dest-info-grid">
          <div class="dest-info-card">
            <span class="flag">🇯🇵</span>
            <h4>Japan</h4>
            <ul>
              <li>Student Visa</li>
              <li>Specified Skilled Worker</li>
              <li>Short-Term Stay</li>
              <li>Cultural Activities Visa</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🇸🇬</span>
            <h4>Singapore & UAE</h4>
            <ul>
              <li>Employment Pass</li>
              <li>Student Pass</li>
              <li>Golden Visa (UAE)</li>
              <li>Work Permit</li>
            </ul>
          </div>
          <div class="dest-info-card">
            <span class="flag">🇨🇳</span>
            <h4>China & East Asia</h4>
            <ul>
              <li>X1/X2 Student Visa</li>
              <li>Work Visa (Z Visa)</li>
              <li>Business Visa (M)</li>
              <li>Tourist Visa (L)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div style="text-align:center;margin-top:2rem;padding:2.5rem;background:rgba(201,168,76,0.06);border:1px solid var(--border);border-radius:var(--radius-xl)">
      <p style="color:var(--text-body);margin-bottom:1.2rem">Don't see your destination? We cover 47+ countries — let's talk.</p>
      <button class="btn-primary" onclick="showPage('contact')">Ask About Your Destination →</button>
    </div>
  </section>
</div>

<!-- ============ CONTACT PAGE ============ -->
<div class="page" id="page-contact">
  <section style="padding-top:140px">
    <div class="section-tag">Get In Touch</div>
    <h1 class="section-title">Start Your Journey <strong>Today</strong></h1>
    <p class="section-sub">Fill in the form below and one of our consultants will reach out within 24 hours with a personalized consultation plan.</p>

    <div class="contact-grid">
      <div class="contact-info">
        <div class="contact-detail">
          <div class="contact-icon">📧</div>
          <div>
            <h4>Email Us</h4>
            <a href="mailto:support@skyglobegroup.com">support@skyglobegroup.com</a>
          </div>
        </div>
        <div class="contact-detail">
          <div class="contact-icon">📞</div>
          <div>
            <h4>Call Us</h4>
            <a href="tel:+17373998522">+1 737-399-8522</a>
          </div>
        </div>
        <div class="contact-detail">
          <div class="contact-icon">📍</div>
          <div>
            <h4>Our Office</h4>
            <p>123 Fifth Avenue, Suite 450<br>New York, NY 10011, USA</p>
          </div>
        </div>
        <div class="contact-detail">
          <div class="contact-icon">🕐</div>
          <div>
            <h4>Office Hours</h4>
            <p>Monday – Friday: 9am – 6pm EST<br>Saturday: 10am – 3pm EST</p>
          </div>
        </div>
        <a href="https://wa.me/17373998522" class="wa-btn" target="_blank">
          💬 Chat on WhatsApp — Fast Response
        </a>
        <div style="margin-top:2rem;padding:1.5rem;background:rgba(201,168,76,0.08);border:1px solid var(--border);border-radius:var(--radius);border-left:3px solid var(--gold)">
          <p style="font-size:0.88rem;color:var(--text-body);line-height:1.7"><strong style="color:var(--gold-light)">Free Consultation Included.</strong><br>Your first 30-minute consultation is completely free — no obligation, no pressure. Just expert guidance to help you understand your options.</p>
        </div>
      </div>

      <div class="contact-form">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.7rem;margin-bottom:1.5rem">Book a <strong>Free Consultation</strong></h3>
        <div class="form-row">
          <div class="form-group">
            <label>First Name *</label>
            <input type="text" placeholder="John" id="fname">
          </div>
          <div class="form-group">
            <label>Last Name *</label>
            <input type="text" placeholder="Doe" id="lname">
          </div>
        </div>
        <div class="form-group">
          <label>Email Address *</label>
          <input type="email" placeholder="john.doe@email.com" id="email">
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <input type="tel" placeholder="+1 000 000 0000" id="phone">
        </div>
        <div class="form-group">
          <label>Service Interested In *</label>
          <select id="service">
            <option value="">— Select a Service —</option>
            <option>Student Visa Processing</option>
            <option>Work Visa Processing</option>
            <option>Visit / Tourist Visa</option>
            <option>Flight Reservation</option>
            <option>Travel Insurance</option>
            <option>University Admission Assistance</option>
            <option>Scholarship Support</option>
            <option>Hotel Booking</option>
            <option>Document Verification</option>
            <option>Immigration Consultation</option>
            <option>Flight Booking</option>
            <option>EU Direct Employment</option>
          </select>
        </div>
        <div class="form-group">
          <label>Target Destination</label>
          <input type="text" placeholder="e.g. United Kingdom, Canada..." id="destination">
        </div>
        <div class="form-group">
          <label>Tell Us About Your Goals</label>
          <textarea placeholder="Share a bit about your situation, timeline, and what you hope to achieve..." id="message"></textarea>
        </div>
        <button class="btn-primary" style="width:100%;justify-content:center" onclick="submitForm()">
          ✦ Submit Consultation Request
        </button>
        <p style="font-size:0.78rem;color:var(--muted);text-align:center;margin-top:1rem">🔒 Your information is secure and never shared with third parties.</p>
      </div>
    </div>
  </section>
</div>

<!-- ============ SEARCH PAGE ============ -->
<div class="page" id="page-search">
  <div class="search-hero">
    <div class="section-tag">Knowledge Base</div>
    <h1 class="section-title">Search <strong>Real Information</strong></h1>
    <p class="section-sub" style="margin:0 auto">Search for countries, universities, visa types, work permits, travel insurance, hotels and more — real detailed information.</p>
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search e.g. USA student visa, Oxford University, Canada work permit..." oninput="doSearch()" onkeydown="if(event.key==='Enter')doSearch()">
      <button onclick="doSearch()">🔍</button>
    </div>
    <div class="search-filters">
      <button class="filter-btn active" onclick="setFilter('all',this)">All</button>
      <button class="filter-btn" onclick="setFilter('visa',this)">🛂 Visas</button>
      <button class="filter-btn" onclick="setFilter('university',this)">🎓 Universities</button>
      <button class="filter-btn" onclick="setFilter('country',this)">🌍 Countries</button>
      <button class="filter-btn" onclick="setFilter('work',this)">💼 Work Permits</button>
      <button class="filter-btn" onclick="setFilter('hotel',this)">🏨 Hotels</button>
      <button class="filter-btn" onclick="setFilter('insurance',this)">🛡️ Insurance</button>
      <button class="filter-btn" onclick="setFilter('scholarship',this)">🌟 Scholarships</button>
      <button class="filter-btn" onclick="setFilter('flight',this)">✈️ Flights</button>
    </div>
    <div class="search-popular" id="popularSection">
      <p>Popular searches:</p>
      <div class="popular-tags">
        <span class="popular-tag" onclick="searchFor('UK student visa')">UK Student Visa</span>
        <span class="popular-tag" onclick="searchFor('flights')">✈️ Book Flights</span>
        <span class="popular-tag" onclick="searchFor('hotel booking')">🏨 Book Hotels</span>
        <span class="popular-tag" onclick="searchFor('Canada work permit')">Canada Work Permit</span>
        <span class="popular-tag" onclick="searchFor('Harvard University')">Harvard University</span>
        <span class="popular-tag" onclick="searchFor('Schengen visa')">Schengen Visa</span>
        <span class="popular-tag" onclick="searchFor('travel insurance')">🛡️ Travel Insurance</span>
        <span class="popular-tag" onclick="searchFor('document apostille')">📋 Document Auth</span>
        <span class="popular-tag" onclick="searchFor('Australia skilled visa')">Australia Skilled Visa</span>
        <span class="popular-tag" onclick="searchFor('Dubai work permit')">Dubai Work Permit</span>
        <span class="popular-tag" onclick="searchFor('Oxford University')">Oxford University</span>
        <span class="popular-tag" onclick="searchFor('USA F1 visa')">USA F1 Visa</span>
        <span class="popular-tag" onclick="searchFor('Germany job seeker')">Germany Job Seeker</span>
      </div>
    </div>
  </div>
  <div class="search-results" id="searchResults"></div>
</div>

<!-- ============ APPLY PAGE ============ -->
<div class="page" id="page-apply">
  <section style="padding-top:140px;max-width:860px;margin:0 auto">
    <div class="section-tag">Submit Your Application</div>
    <h1 class="section-title">Apply for Any <strong>Service Online</strong></h1>
    <p class="section-sub">Fill out the form below — your application is saved permanently and our team will contact you within 24 hours. No need to visit an office.</p>

    <!-- Step Indicators -->
    <div class="apply-steps" id="applySteps">
      <div class="apply-step active" id="stepInd1"><div class="step-num">1</div><div class="step-label">Service</div></div>
      <div class="apply-step" id="stepInd2"><div class="step-num">2</div><div class="step-label">Personal</div></div>
      <div class="apply-step" id="stepInd3"><div class="step-num">3</div><div class="step-label">Travel Details</div></div>
      <div class="apply-step" id="stepInd4"><div class="step-num">4</div><div class="step-label">Review</div></div>
    </div>

    <!-- STEP 1: Select Service -->
    <div class="form-step active" id="applyStep1">
      <h3 style="margin-bottom:0.4rem">What service do you need?</h3>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:1rem">Select one to continue. You can apply for multiple services by submitting separate applications.</p>
      <div class="service-select-grid" id="serviceGrid">
        <div class="svc-card" onclick="selectService('Student Visa Processing',this)"><span class="sc-icon">🎓</span><h4>Student Visa</h4><p>Study abroad application</p></div>
        <div class="svc-card" onclick="selectService('Work Visa Processing',this)"><span class="sc-icon">💼</span><h4>Work Visa</h4><p>Employment abroad</p></div>
        <div class="svc-card" onclick="selectService('Tourist / Visit Visa',this)"><span class="sc-icon">🌴</span><h4>Tourist Visa</h4><p>Travel & visit</p></div>
        <div class="svc-card" onclick="selectService('University Admission Assistance',this)"><span class="sc-icon">🏛️</span><h4>University Admission</h4><p>Enrolment support</p></div>
        <div class="svc-card" onclick="selectService('Flight Reservation Letter',this)"><span class="sc-icon">✈️</span><h4>Flight Reservation</h4><p>Visa itinerary letter</p></div>
        <div class="svc-card" onclick="selectService('Hotel Booking / Accommodation Letter',this)"><span class="sc-icon">🏨</span><h4>Hotel Booking</h4><p>Accommodation proof</p></div>
        <div class="svc-card" onclick="selectService('Travel Insurance',this)"><span class="sc-icon">🛡️</span><h4>Travel Insurance</h4><p>Coverage certificate</p></div>
        <div class="svc-card" onclick="selectService('Document Authentication / Apostille',this)"><span class="sc-icon">📋</span><h4>Document Auth</h4><p>Apostille & notarization</p></div>
        <div class="svc-card" onclick="selectService('Scholarship Application Support',this)"><span class="sc-icon">🌟</span><h4>Scholarship</h4><p>Funding assistance</p></div>
        <div class="svc-card" onclick="selectService('Express Entry / PR Pathway',this)"><span class="sc-icon">🍁</span><h4>Express Entry / PR</h4><p>Permanent residence</p></div>
        <div class="svc-card" onclick="selectService('Flight Booking',this)"><span class="sc-icon">🎫</span><h4>Flight Booking</h4><p>Ticket purchase & booking</p></div>
        <div class="svc-card" onclick="selectService('EU Direct Employment',this)"><span class="sc-icon">🇪🇺</span><h4>EU Direct Employment</h4><p>Jobs in Europe + work permit</p></div>
      </div>
      <div style="margin-top:1.5rem;text-align:right">
        <button class="btn-primary" onclick="goStep(2)" id="step1Next" disabled style="opacity:0.4">Next: Personal Details →</button>
      </div>
    </div>

    <!-- STEP 2: Personal Information -->
    <div class="form-step" id="applyStep2">
      <h3 style="margin-bottom:1.2rem">Your Personal Information</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>First Name *</label><input type="text" id="ap_fname" placeholder="John"></div>
        <div class="form-group"><label>Last Name *</label><input type="text" id="ap_lname" placeholder="Doe"></div>
        <div class="form-group"><label>Email Address *</label><input type="email" id="ap_email" placeholder="john.doe@email.com"></div>
        <div class="form-group"><label>Phone / WhatsApp *</label><input type="tel" id="ap_phone" placeholder="+1 000 000 0000"></div>
        <div class="form-group"><label>Date of Birth</label><input type="date" id="ap_dob"></div>
        <div class="form-group"><label>Nationality / Country of Origin *</label><input type="text" id="ap_nationality" placeholder="e.g. Nigerian, Indian, Brazilian"></div>
        <div class="form-group"><label>Passport Number</label><input type="text" id="ap_passport" placeholder="A12345678 (optional)"></div>
        <div class="form-group"><label>Passport Expiry Date</label><input type="date" id="ap_passportExpiry"></div>
      </div>
      <div style="margin-top:1rem;display:flex;gap:1rem;justify-content:space-between">
        <button class="btn-outline" onclick="goStep(1)">← Back</button>
        <button class="btn-primary" onclick="goStep(3)">Next: Travel Details →</button>
      </div>
    </div>

    <!-- STEP 3: Travel Details -->
    <div class="form-step" id="applyStep3">
      <h3 style="margin-bottom:0.4rem">Travel & Service Details</h3>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:1.2rem">Service selected: <strong id="selectedServiceLabel" style="color:var(--gold-light)">—</strong></p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>Destination Country *</label><input type="text" id="ap_destination" placeholder="e.g. United Kingdom, Canada"></div>
        <div class="form-group"><label>Intended Travel / Start Date</label><input type="date" id="ap_travelDate"></div>
        <div class="form-group"><label>Duration of Stay</label><input type="text" id="ap_duration" placeholder="e.g. 3 years, 2 weeks, 6 months"></div>
        <div class="form-group"><label>Purpose</label><input type="text" id="ap_purpose" placeholder="e.g. Study, Work, Tourism, Business"></div>
        <div class="form-group" id="fieldInstitution"><label>University / Institution Name</label><input type="text" id="ap_institution" placeholder="e.g. University of Toronto"></div>
        <div class="form-group" id="fieldEmployer"><label>Employer / Company Name</label><input type="text" id="ap_employer" placeholder="e.g. Google UK Ltd (if known)"></div>
        <div class="form-group" id="fieldHotelCity"><label>City / Hotel Destination</label><input type="text" id="ap_hotelCity" placeholder="e.g. Paris, London, Dubai"></div>
        <div class="form-group" id="fieldCheckIn"><label>Check-in / Arrival Date</label><input type="date" id="ap_checkin"></div>
        <div class="form-group" id="fieldCheckOut"><label>Check-out / Departure Date</label><input type="date" id="ap_checkout"></div>
        <div class="form-group" id="fieldCoverage"><label>Insurance Coverage Type</label>
          <select id="ap_coverage"><option value="">— Select —</option><option>Schengen (€30,000 min)</option><option>Comprehensive Worldwide</option><option>Student Health Cover</option><option>Business Travel</option></select>
        </div>
        <div class="form-group" id="fieldDocType"><label>Document Type</label>
          <select id="ap_docType"><option value="">— Select —</option><option>University Degree / Diploma</option><option>Birth Certificate</option><option>Marriage Certificate</option><option>Police Clearance Certificate</option><option>Academic Transcripts</option><option>Power of Attorney</option><option>Other</option></select>
        </div>
        <div class="form-group" id="fieldScholarship"><label>Scholarship Program</label>
          <select id="ap_scholarship"><option value="">— Select —</option><option>Chevening (UK)</option><option>Commonwealth Scholarship</option><option>DAAD (Germany)</option><option>Vanier CGS (Canada)</option><option>Fulbright (USA)</option><option>Other / General Search</option></select>
        </div>
        <div class="form-group" id="fieldFlightFrom"><label>Departure City / Airport</label><input type="text" id="ap_flightFrom" placeholder="e.g. Lagos (LOS), Accra (ACC)"></div>
        <div class="form-group" id="fieldFlightType"><label>Trip Type</label>
          <select id="ap_flightType"><option value="">— Select —</option><option>One Way</option><option>Round Trip</option><option>Multi-City</option></select>
        </div>
        <div class="form-group" id="fieldEuCountry"><label>Preferred Country (Europe)</label>
          <select id="ap_euCountry" onchange="if(this.value)document.getElementById('ap_destination').value=this.value"><option value="">— Select —</option><option>Poland</option><option>Montenegro</option><option>Lithuania</option><option>Portugal</option><option>Spain</option><option>Norway</option><option>Finland</option><option>Czech Republic</option><option>Slovakia</option><option>Ukraine</option><option>Austria</option><option>North Macedonia</option><option>Bulgaria</option><option>Hungary</option><option>Any / Best Available</option></select>
        </div>
        <div class="form-group" id="fieldJobField"><label>Job Field / Industry</label>
          <select id="ap_jobField"><option value="">— Select —</option><option>Construction & Skilled Trades</option><option>Factory / Warehouse / Production</option><option>Hospitality & Hotels</option><option>Agriculture & Farming</option><option>Transport / Drivers</option><option>Caregiving & Healthcare</option><option>Cleaning & Housekeeping</option><option>IT & Office Work</option><option>Other / Any Available</option></select>
        </div>
      </div>
      <div class="form-group" style="margin-top:0.5rem">
        <label>Additional Notes / Special Requirements</label>
        <textarea id="ap_notes" placeholder="Any additional information we should know — previous visa refusals, specific requirements, timeline urgency, etc." style="min-height:100px;width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;color:var(--white);font-family:'Outfit',sans-serif;font-size:0.9rem;outline:none;resize:vertical"></textarea>
      </div>
      <div style="margin-top:1rem;display:flex;gap:1rem;justify-content:space-between">
        <button class="btn-outline" onclick="goStep(2)">← Back</button>
        <button class="btn-primary" onclick="goStep(4)">Review Application →</button>
      </div>
    </div>

    <!-- STEP 4: Review & Submit -->
    <div class="form-step" id="applyStep4">
      <h3 style="margin-bottom:1rem">Review Your Application</h3>
      <div id="reviewSummary" style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.5rem;font-size:0.9rem;color:var(--text-body);line-height:2"></div>
      <div style="padding:1rem;background:rgba(201,168,76,0.06);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:1.5rem">
        <p style="font-size:0.85rem;color:var(--text-body)">✅ By submitting, you agree that Skyglobe Limited may contact you about your application via email or phone. Your data is kept securely and used only to process your request. You will receive a reference number for tracking.</p>
      </div>
      <div style="display:flex;gap:1rem;justify-content:space-between;align-items:center">
        <button class="btn-outline" onclick="goStep(3)">← Back</button>
        <button class="btn-primary" style="padding:14px 40px;font-size:1rem" onclick="submitApplication()" id="submitAppBtn">✦ Submit Application</button>
      </div>
    </div>

    <!-- SUCCESS STATE -->
    <div class="form-step" id="applySuccess">
      <div class="app-ref-card">
        <div style="font-size:3rem;margin-bottom:0.5rem">🎉</div>
        <div class="section-tag">Application Submitted!</div>
        <div class="app-ref-number" id="appRefDisplay">SKY-2024-XXXX</div>
        <p style="color:var(--text-body);margin-bottom:0.5rem">Your application has been received and saved. A confirmation has been sent to your email.</p>
        <p style="color:var(--muted);font-size:0.85rem">Our team will review your application and contact you within <strong style="color:var(--gold-light)">24 hours</strong>.</p>
        <div style="margin-top:1.5rem;display:flex;gap:0.8rem;justify-content:center;flex-wrap:wrap">
          <button class="btn-primary" onclick="showTracker()">📍 Track My Application</button>
          <button class="btn-outline" onclick="resetApplyForm()">Submit Another</button>
        </div>
      </div>
    </div>

    <!-- APPLICATION TRACKER -->
    <div style="margin-top:4rem;padding-top:3rem;border-top:1px solid var(--border)">
      <div class="section-tag">Track Application</div>
      <h2 class="section-title" style="margin-bottom:0.5rem">Check Your <strong>Application Status</strong></h2>
      <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1.5rem">Enter your reference number (e.g. SKY-2024-ABCD) or your email address to view all your submitted applications.</p>
      <div style="display:flex;gap:0.8rem;max-width:560px;flex-wrap:wrap">
        <input type="text" id="trackInput" placeholder="SKY-2024-ABCD or your email" style="flex:1;min-width:200px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;color:var(--white);font-family:'Outfit',sans-serif;font-size:0.9rem;outline:none">
        <button class="btn-primary" onclick="trackApplication()">🔍 Track</button>
      </div>
      <div id="trackResult" style="margin-top:1.2rem;max-width:560px"></div>
    </div>
  </section>
</div>

<!-- FOOTER (shown on all pages) -->
<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <div class="nav-logo" style="cursor:default">
        <img src="logo.png" alt="SkyGlobe Limited" style="height:72px;width:auto;border-radius:12px">
      </div>
      <p>Your trusted partner for global travel, immigration, and education. Turning international ambitions into lived realities since 2016.</p>
      <div style="display:flex;gap:10px;margin-top:1.2rem;flex-wrap:wrap">
        <a href="https://www.tiktok.com/@skyglobe_limited" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 13px;color:#fff;font-size:0.78rem;font-weight:500;text-decoration:none;transition:0.25s" onmouseover="this.style.borderColor='#b8860b';this.style.color='#e6c97a'" onmouseout="this.style.borderColor='rgba(255,255,255,0.12)';this.style.color='#fff'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/></svg>
          @skyglobe_limited
        </a>
        <a href="https://wa.me/17373998522" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.25);border-radius:8px;padding:7px 13px;color:#25D366;font-size:0.78rem;font-weight:500;text-decoration:none;transition:0.25s" onmouseover="this.style.background='rgba(37,211,102,0.2)'" onmouseout="this.style.background='rgba(37,211,102,0.12)'">
          💬 WhatsApp Us
        </a>
        <a href="mailto:support@skyglobegroup.com" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 13px;color:#8899bb;font-size:0.78rem;font-weight:500;text-decoration:none;transition:0.25s" onmouseover="this.style.color='#e6c97a'" onmouseout="this.style.color='#8899bb'">
          ✉️ Email Us
        </a>
      </div>
    </div>
    <div class="footer-col">
      <h5>Services</h5>
      <ul>
        <li><a onclick="showSvcDetail('Student Visa Processing')">Student Visa</a></li>
        <li><a onclick="showSvcDetail('Work Visa Processing')">Work Visa</a></li>
        <li><a onclick="showSvcDetail('Tourist / Visit Visa')">Tourist Visa</a></li>
        <li><a onclick="showSvcDetail('University Admission Assistance')">University Admission</a></li>
        <li><a onclick="showSvcDetail('Scholarship Application Support')">Scholarship Support</a></li>
        <li><a onclick="showSvcDetail('Flight Booking')">Flight Booking</a></li>
        <li><a onclick="showSvcDetail('EU Direct Employment')">EU Direct Employment</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h5>Company</h5>
      <ul>
        <li><a onclick="showPage('about')">About Us</a></li>
        <li><a onclick="showPage('destinations')">Destinations</a></li>
        <li><a onclick="showPage('countries')">Country Guides</a></li>
        <li><a onclick="showPage('contact')">Contact</a></li>
        <li><a onclick="showPage('contact')">Free Consultation</a></li>
        <li><a onclick="openChecklist('Tourist / Visit Visa')">Document Checklist</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h5>Contact</h5>
      <ul>
        <li><a href="mailto:support@skyglobegroup.com">support@skyglobegroup.com</a></li>
        <li><a href="tel:+17373998522">+1 737-399-8522</a></li>
        <li><a>123 Fifth Ave, Suite 450</a></li>
        <li><a>New York, NY 10011</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2026 Skyglobe Limited. All rights reserved.</span>
    <div style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap;justify-content:center">
      <a onclick="showPage('privacy')" style="color:var(--muted);font-size:0.78rem;cursor:pointer;text-decoration:none;transition:color 0.2s" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='var(--muted)'">Privacy Policy</a>
      <span style="color:var(--border-strong)">·</span>
      <a onclick="showPage('terms')" style="color:var(--muted);font-size:0.78rem;cursor:pointer;text-decoration:none;transition:color 0.2s" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='var(--muted)'">Terms of Service</a>
      <span style="color:var(--border-strong)">·</span>
      <a onclick="showPage('antiFraud')" style="color:var(--muted);font-size:0.78rem;cursor:pointer;text-decoration:none;transition:color 0.2s" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='var(--muted)'">Anti-Fraud Policy</a>
    </div>
    <span>Trusted Global Travel & Immigration Consultancy</span>
  </div>
</footer>

<!-- ============ COUNTRY GUIDES PAGE ============ -->
<div class="page" id="page-countries">
  <section style="padding-top:140px">
    <div class="section-tag">Country Guides</div>
    <h1 class="section-title">Where Do You Want<br>to <strong>Go?</strong></h1>
    <p class="section-sub">Select a destination to see visa types, costs, processing times, and how we can help you get there.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-top:2.5rem" id="countryGrid"></div>
    <div style="margin-top:3rem;padding:2rem;background:rgba(201,168,76,0.05);border:1px solid var(--border);border-radius:var(--radius-xl);text-align:center">
      <div class="section-tag">Don't see your country?</div>
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;margin:0.5rem 0">We Cover 47+ Countries</h3>
      <p style="color:var(--text-body);font-size:0.9rem;margin-bottom:1.5rem">Our consultants have processed applications for destinations worldwide. Book a free consultation for a personalised assessment.</p>
      <button class="btn-primary" onclick="showPage('contact')">📋 Book Free Consultation</button>
    </div>
  </section>
</div>

<!-- ============ PRIVACY POLICY PAGE ============ -->
<div class="page" id="page-privacy">
  <section style="padding-top:140px">
    <div class="section-tag">Legal</div>
    <h1 class="section-title">Privacy <strong>Policy</strong></h1>
    <div class="policy-body">
      <p><strong style="color:var(--white)">Last updated: June 2026</strong></p>
      <h3>1. Information We Collect</h3>
      <p>We collect personal information you voluntarily provide when completing our application forms, including name, email address, phone number, date of birth, passport details, travel preferences, and uploaded documents. We also collect standard server log data when you visit our website.</p>
      <h3>2. How We Use Your Information</h3>
      <p>Your information is used solely to:</p>
      <ul>
        <li>Process your visa, travel, education, or employment application</li>
        <li>Communicate updates and decisions on your application</li>
        <li>Send transactional emails related to your application</li>
        <li>Improve our services and website</li>
      </ul>
      <p>We do not sell, rent, or share your personal information with any third party except where strictly required to process your application (e.g., embassies, universities, employers, partner agencies).</p>
      <h3>3. Data Storage & Security</h3>
      <p>All personal data and documents are stored securely in encrypted cloud databases. Access is restricted to authorised SkyGlobe staff only. We retain your data for up to 5 years to support reapplication or reference needs, after which it is securely deleted upon request.</p>
      <h3>4. Cookies & Local Storage</h3>
      <p>We use your browser's localStorage to save your application reference number for your convenience when tracking. We do not use third-party tracking cookies or advertising pixels.</p>
      <h3>5. Your Rights</h3>
      <p>You have the right to access, correct, or request deletion of your personal data at any time. To exercise these rights, contact us at <a href="mailto:support@skyglobegroup.com" style="color:var(--gold)">support@skyglobegroup.com</a> with your application reference number.</p>
      <h3>6. Contact</h3>
      <p>For any privacy enquiries: <a href="mailto:support@skyglobegroup.com" style="color:var(--gold)">support@skyglobegroup.com</a><br>SkyGlobe Limited, 123 Fifth Avenue, Suite 450, New York, NY 10011, USA.</p>
    </div>
    <button class="btn-outline" onclick="history.back()||showPage('home')" style="margin-top:1rem">← Back</button>
  </section>
</div>

<!-- ============ TERMS OF SERVICE PAGE ============ -->
<div class="page" id="page-terms">
  <section style="padding-top:140px">
    <div class="section-tag">Legal</div>
    <h1 class="section-title">Terms of <strong>Service</strong></h1>
    <div class="policy-body">
      <p><strong style="color:var(--white)">Last updated: June 2026</strong></p>
      <h3>1. Services</h3>
      <p>SkyGlobe Limited provides visa consultancy, university admission assistance, travel documentation, and employment placement services. We act as a consultancy and intermediary — final visa decisions are made by the relevant government authority or institution, not by SkyGlobe.</p>
      <h3>2. Fees & Payment</h3>
      <p>Our service fees are separate from and in addition to all government, embassy, and institutional fees. All fees are communicated transparently before you commit. Fees paid for services rendered are non-refundable unless a specific refund commitment was made in writing.</p>
      <h3>3. No Guarantee of Outcome</h3>
      <p>While SkyGlobe maintains a 98% success rate, we cannot and do not guarantee visa approval, university admission, or employment placement, as final decisions rest with third-party authorities. We guarantee professional, thorough preparation and representation of your application.</p>
      <h3>4. Client Responsibilities</h3>
      <p>Clients are responsible for providing accurate, truthful, and complete information. Submitting false documents or misrepresenting information is illegal and will result in immediate termination of services without refund.</p>
      <h3>5. Intellectual Property</h3>
      <p>All content on this website including text, graphics, and code is the property of SkyGlobe Limited and may not be reproduced without written permission.</p>
      <h3>6. Limitation of Liability</h3>
      <p>SkyGlobe Limited's liability is limited to the service fees paid. We are not liable for consequential damages including lost travel costs, lost income, or personal inconvenience resulting from visa refusals or delays beyond our control.</p>
      <h3>7. Governing Law</h3>
      <p>These terms are governed by the laws of the State of New York, USA. Any disputes shall be resolved through binding arbitration in New York City.</p>
      <h3>8. Contact</h3>
      <p><a href="mailto:support@skyglobegroup.com" style="color:var(--gold)">support@skyglobegroup.com</a> — SkyGlobe Limited, 123 Fifth Avenue, New York, NY 10011.</p>
    </div>
    <button class="btn-outline" onclick="showPage('home')" style="margin-top:1rem">← Back to Home</button>
  </section>
</div>

<!-- ============ ANTI-FRAUD POLICY PAGE ============ -->
<div class="page" id="page-antiFraud">
  <section style="padding-top:140px">
    <div class="section-tag">Important Notice</div>
    <h1 class="section-title">Anti-Fraud <strong>Policy</strong></h1>
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:2rem">
      <div style="font-size:1.3rem;margin-bottom:0.5rem">⚠️ <strong style="color:#f87171">Warning: Protect Yourself from Fraud</strong></div>
      <p style="color:var(--text-body);font-size:0.9rem;line-height:1.7">Fraudsters sometimes impersonate legitimate agencies. Please verify you are dealing with the real SkyGlobe Limited before making any payment.</p>
    </div>
    <div class="policy-body">
      <h3>Our Official Channels Only</h3>
      <ul>
        <li>Website: <strong style="color:var(--gold)">skyglobegroup.com</strong></li>
        <li>Email: <strong style="color:var(--gold)">support@skyglobegroup.com</strong></li>
        <li>WhatsApp: <strong style="color:var(--gold)">+1 737-399-8522</strong></li>
      </ul>
      <h3>We Will NEVER:</h3>
      <ul>
        <li>Ask for payment via gift cards, cryptocurrency, or Western Union</li>
        <li>Ask for your password or full bank account details</li>
        <li>Contact you first and pressure you to pay immediately</li>
        <li>Promise 100% guaranteed visa approval in an unofficial message</li>
        <li>Ask you to keep our communication secret</li>
        <li>Operate through multiple unverified WhatsApp numbers claiming to be us</li>
      </ul>
      <h3>How to Verify You Are Talking to Us</h3>
      <ul>
        <li>All printed documents from SkyGlobe contain a reference number traceable on this website</li>
        <li>All official emails come from <strong style="color:var(--gold-light)">support@skyglobegroup.com</strong></li>
        <li>Every application receives a unique SKY-YEAR-XXXX reference you can track here 24/7</li>
        <li>If in doubt, contact us directly via WhatsApp: +1 737-399-8522</li>
      </ul>
      <h3>Report a Scam</h3>
      <p>If you believe someone is impersonating SkyGlobe Limited or has defrauded you, please contact us immediately at <a href="mailto:support@skyglobegroup.com" style="color:var(--gold)">support@skyglobegroup.com</a> and report to your local authorities.</p>
    </div>
    <button class="btn-outline" onclick="showPage('home')" style="margin-top:1rem">← Back to Home</button>
  </section>
</div>

<!-- ===== DOCUMENT CHECKLIST MODAL ===== -->
<div class="checklist-overlay" id="checklistOverlay" onclick="if(event.target===this)closeChecklist()">
  <div class="checklist-modal">
    <button onclick="closeChecklist()" style="position:absolute;top:1rem;right:1.2rem;background:none;border:none;color:var(--muted);font-size:1.6rem;cursor:pointer;line-height:1">×</button>
    <div class="section-tag">Document Checklist</div>
    <div id="checklistContent"></div>
  </div>
</div>

<!-- ===== COUNTRY GUIDE PANEL ===== -->
<div class="country-guide-overlay" id="countryGuideOverlay" onclick="if(event.target===this)closeCountryGuide()">
  <div class="country-guide-panel">
    <button onclick="closeCountryGuide()" style="position:absolute;top:1rem;right:1.2rem;background:none;border:none;color:var(--muted);font-size:1.6rem;cursor:pointer;line-height:1">×</button>
    <div id="countryGuideContent"></div>
  </div>
</div>

<!-- WhatsApp Float -->
<a href="https://wa.me/17373998522" class="wa-float" target="_blank" title="Chat on WhatsApp">💬</a>

<!-- Toast -->
<div class="toast" id="toast">✅ Consultation request submitted! We'll be in touch within 24 hours.</div>

<script>
// PAGE ROUTING
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (!target) return;
  target.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'countries') initCountryGrid();
}

// NAV SCROLL
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});

// MOBILE MENU
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// FORM SUBMIT
async function submitForm() {
  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const service = document.getElementById('service').value;
  const destination = document.getElementById('destination').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!fname || !email || !service) {
    showToast('⚠️ Please fill in your name, email, and service selection.', true);
    return;
  }

  const btn = document.querySelector('#page-contact .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fname, lname, email, phone, service, destination, message }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    showToast('✅ Request submitted! We\'ll contact you within 24 hours.');
    ['fname','lname','email','phone','service','destination','message'].forEach(id => {
      document.getElementById(id).value = '';
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('⚠️ Server is taking too long. Please try WhatsApp or email us directly.', true);
    } else {
      showToast('⚠️ ' + (err.message || 'Failed to send') + '. Try WhatsApp instead.', true);
    }
    console.error('Contact form error:', err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Submit Consultation Request';
  }
}

function showToast(msg, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  if (isError) {
    toast.style.background = 'linear-gradient(135deg,#c0392b,#e74c3c)';
    toast.style.color = '#fff';
  } else {
    toast.style.background = 'linear-gradient(135deg,var(--gold),var(--gold-light))';
    toast.style.color = 'var(--navy)';
  }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// Set home as active initially
document.querySelector('[data-page="home"]').classList.add('active');

// ── SEARCH KNOWLEDGE BASE ────────────────────────────────────────────────────
const KB = [
  // ── VISAS ──
  {cat:'visa',icon:'🛂',title:'USA F-1 Student Visa',tags:['USA','student','university','america'],
   summary:'The F-1 visa is a non-immigrant student visa that allows foreign nationals to pursue full-time academic studies at accredited US institutions.',
   details:{
     requirements:['Valid passport (6+ months beyond stay)','Form I-20 from a SEVIS-approved school','DS-160 online application form','SEVIS fee payment ($350)','Proof of financial support ($20,000–$50,000/year)','Academic transcripts and diplomas','English proficiency (TOEFL/IELTS)','Visa interview at US Embassy'],
     duration:'Duration of Status (D/S) — stays as long as enrolled',
     processing:'3–5 weeks (varies by embassy)',
     cost:'$185 visa application fee + $350 SEVIS fee',
     workRights:'On-campus: 20hrs/week. Off-campus (OPT/CPT): requires authorization',
     successTips:['Show strong ties to home country','Prove sufficient funds','Have clear study plan','Book interview early — slots fill fast']
   },
   officialLink:'https://ceac.state.gov/genniv/'
  },
  {cat:'visa',icon:'🛂',title:'UK Student Visa (formerly Tier 4)',tags:['UK','student','britain','england'],
   summary:'The UK Student Visa allows you to study at a licensed UK education provider. You must have a Confirmation of Acceptance for Studies (CAS) from your university.',
   details:{
     requirements:['CAS number from UK university','Valid passport','English proficiency (IELTS 5.5–7.0 depending on course)','Proof of funds: £1,334/month in London, £1,023/month outside London','Tuberculosis test (some countries)','Academic qualifications'],
     duration:'Course length + 4 months (undergraduate), + 2 months (postgraduate)',
     processing:'3 weeks (online), up to 6 weeks (paper)',
     cost:'£363 visa fee + £776/year Immigration Health Surcharge',
     workRights:'20 hrs/week during term, full-time during holidays',
     successTips:['Apply no earlier than 6 months before course start','Maintain £1,334/month for 28 consecutive days in bank','Get CAS before applying']
   },
   officialLink:'https://www.gov.uk/student-visa'
  },
  {cat:'visa',icon:'🛂',title:'Canada Study Permit',tags:['canada','student','university','study'],
   summary:'A Study Permit is required for most international students studying in Canada for programs longer than 6 months.',
   details:{
     requirements:['Letter of acceptance from a DLI (Designated Learning Institution)','Proof of financial support ($10,000/year + tuition)','Valid passport','Medical exam (some countries)','Police certificate','Proof of English/French proficiency'],
     duration:'Length of study program + 90 days',
     processing:'8–12 weeks (online applications faster)',
     cost:'CAD $150',
     workRights:'20 hrs/week off-campus during studies, full-time during scheduled breaks',
     successTips:['Apply as soon as you receive acceptance letter','Show proof of funds clearly','PGWP after graduation allows 1–3 years work']
   },
   officialLink:'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html'
  },
  {cat:'visa',icon:'🛂',title:'Schengen Visa (Europe)',tags:['europe','schengen','tourist','travel','germany','france','italy'],
   summary:'The Schengen Visa allows travel to 27 European countries within the Schengen Area for up to 90 days in any 180-day period.',
   details:{
     requirements:['Valid passport (3+ months beyond stay)','Completed Schengen application form','2 passport photos','Travel insurance (min €30,000 coverage)','Flight itinerary (return ticket)','Hotel/accommodation proof','Bank statements (last 3–6 months)','Cover letter explaining purpose of visit'],
     duration:'Up to 90 days within 180-day period',
     processing:'15 calendar days (can take up to 30–60 days)',
     cost:'€80 adults, €40 children (6–12 years), free under 6',
     workRights:'No work rights on standard Schengen tourist visa',
     successTips:['Apply at the embassy of your main destination country','Book refundable flights and hotels','Show sufficient funds: €50–100/day','Apply 3–4 weeks in advance']
   },
   officialLink:'https://www.schengenvisainfo.com/schengen-visa-application-form/'
  },
  {cat:'visa',icon:'🛂',title:'Australia Student Visa (Subclass 500)',tags:['australia','student','study'],
   summary:'The Student Visa (subclass 500) lets you stay in Australia to study full-time in a registered course.',
   details:{
     requirements:['Confirmation of Enrolment (CoE) from CRICOS-registered provider','Genuine Temporary Entrant (GTE) requirement','English proficiency (IELTS 5.5–6.0)','Proof of financial capacity (AUD $21,041/year + tuition)','Overseas Student Health Cover (OSHC)','Valid passport'],
     duration:'Length of course + 1–2 months',
     processing:'75% of applications: 29 days; 90%: 40 days',
     cost:'AUD $650',
     workRights:'48 hrs/fortnight during semester, unlimited during breaks',
     successTips:['Apply online via ImmiAccount','Demonstrate genuine intention to study and return home','Graduate Visa (subclass 485) available after graduation']
   },
   officialLink:'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500'
  },
  {cat:'visa',icon:'🛂',title:'Germany Student Visa',tags:['germany','student','study','europe'],
   summary:'Germany offers free or low-cost university education. A national student visa (Type D) is required for non-EU citizens studying in Germany.',
   details:{
     requirements:['University admission letter','Blocked account: €11,208/year (approx €934/month)','Health insurance','Language proficiency (German B2/C1 or English C1)','APS certificate (for applicants from China, India, Vietnam)','Valid passport','Proof of accommodation'],
     duration:'Initially 1–2 years, renewable',
     processing:'4–12 weeks at German embassy',
     cost:'€75',
     workRights:'120 full days or 240 half days per year',
     successTips:['Open a blocked account (Fintiba or Expatrio) early','Apply for language course visa first if needed','Many programs are taught in English — no German required']
   },
   officialLink:'https://www.make-it-in-germany.com/en/visa-residence/types/students'
  },
  {cat:'visa',icon:'🛂',title:'UAE Golden Visa',tags:['UAE','dubai','golden visa','residency'],
   summary:'The UAE Golden Visa is a long-term residency visa valid for 5 or 10 years, renewable, for investors, entrepreneurs, professionals, and outstanding students.',
   details:{
     requirements:['Investors: AED 2 million property investment','Entrepreneurs: approved startup or AED 500K capital','Professionals: valid employment contract, salary AED 30,000+/month','Researchers/specialists: recommended by MOHESR','Outstanding students: GPA 3.75+ from UAE university or top world university'],
     duration:'5 or 10 years (renewable)',
     processing:'2–4 weeks',
     cost:'Varies: AED 2,800–4,000 approx',
     workRights:'Full work rights — sponsor yourself and family',
     successTips:['No need for an Emirati sponsor','Family members included','Can stay outside UAE for more than 6 months without visa expiry']
   },
   officialLink:'https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa'
  },
  {cat:'visa',icon:'🛂',title:'USA H-1B Work Visa',tags:['USA','work','america','h1b','tech'],
   summary:'The H-1B is a non-immigrant work visa for specialty occupations requiring at least a bachelor\'s degree, commonly used in tech, finance, and engineering.',
   details:{
     requirements:['Job offer from US employer','Bachelor\'s degree or equivalent in specialty field','Employer must file Labor Condition Application (LCA)','Subject to annual cap: 65,000 regular + 20,000 for US master\'s holders'],
     duration:'3 years, extendable to 6 years',
     processing:'Standard: 3–6 months. Premium: 15 business days ($2,805 fee)',
     cost:'$730 base fee + ACWIA fee + fraud prevention fee',
     workRights:'Full-time work for sponsoring employer only',
     successTips:['Registration lottery opens in March each year','Employers file petitions in April','OPT STEM extension increases H-1B chances','Consider O-1 visa if highly distinguished']
   },
   officialLink:'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations'
  },
  {cat:'visa',icon:'🛂',title:'UK Skilled Worker Visa',tags:['UK','work','skilled','britain'],
   summary:'The UK Skilled Worker visa replaced the Tier 2 General visa. It allows you to work in the UK if you have a job offer from an approved employer.',
   details:{
     requirements:['Job offer from a UK Home Office-licensed sponsor','Certificate of Sponsorship (CoS)','Salary: at least £26,200/year or going rate for the role','English language: B1 level (CEFR)','Enough money to support yourself (£1,270 in bank for 28 days)'],
     duration:'Up to 5 years, renewable',
     processing:'3 weeks (inside UK), 3 weeks (outside UK)',
     cost:'£719–£1,420 depending on length + Immigration Health Surcharge £776/year',
     workRights:'Full-time for sponsoring employer. Can do second job in same SOC code.',
     successTips:['After 5 years, apply for Indefinite Leave to Remain (ILR)','Shortage occupation list roles have lower salary threshold','Healthcare workers: IHS surcharge is refunded']
   },
   officialLink:'https://www.gov.uk/skilled-worker-visa'
  },
  {cat:'visa',icon:'🛂',title:'Canada Express Entry (PR)',tags:['canada','permanent residence','express entry','skilled worker'],
   summary:'Express Entry is Canada\'s primary system for managing applications for permanent residence for skilled workers through three programs: FSWP, FSTP, and CEC.',
   details:{
     requirements:['At least 1 year skilled work experience','Language proficiency: CLB 7+ (IELTS 6.0+)','Educational Credential Assessment (ECA)','Comprehensive Ranking System (CRS) score — competitive scores: 470–530+'],
     duration:'Permanent Residence',
     processing:'6 months from ITA (Invitation to Apply)',
     cost:'CAD $1,365 principal applicant + CAD $1,365 spouse + CAD $230 per dependent child',
     workRights:'Unlimited work rights anywhere in Canada',
     successTips:['Improve CRS score: language test retake, provincial nomination, Canadian job offer','PNP (Provincial Nominee Program) adds 600 CRS points','Canadian education and work experience boosts CRS significantly']
   },
   officialLink:'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html'
  },
  {cat:'visa',icon:'🛂',title:'Germany Job Seeker Visa',tags:['germany','work','job seeker','europe'],
   summary:'The Germany Job Seeker Visa allows qualified professionals to enter Germany for up to 6 months to look for a job matching their qualifications.',
   details:{
     requirements:['University degree recognized in Germany (or equivalent)','At least 5 years relevant work experience','Basic German language skills (helpful but not always required)','Proof of financial means: €1,027/month (€6,162 for 6 months)','Health insurance for the stay','Accommodation proof'],
     duration:'6 months (non-extendable)',
     processing:'4–12 weeks',
     cost:'€75',
     workRights:'Can work up to 10 hrs/week during job search. Full rights once employed.',
     successTips:['Convert to work visa once job found — stay in Germany','Germany has critical shortage in IT, engineering, healthcare, skilled trades','Recognized qualification from anabin database required']
   },
   officialLink:'https://www.make-it-in-germany.com/en/visa-residence/types/job-search-visa'
  },

  // ── UNIVERSITIES ──
  {cat:'university',icon:'🎓',title:'Harvard University — USA',tags:['harvard','USA','ivy league','university'],
   summary:'Harvard University is a private Ivy League research university in Cambridge, Massachusetts. Consistently ranked #1–3 globally.',
   details:{
     requirements:['GPA: 3.9+ (unweighted)','SAT: 1460–1580 / ACT: 33–36','TOEFL: 100+ / IELTS: 7.0+','2–3 recommendation letters','Personal essays','Extracurricular achievements'],
     duration:'Undergraduate: 4 years | Masters: 1–2 years | PhD: 4–6 years',
     processing:'Regular Decision: Jan 1 deadline, notified in late March',
     cost:'Tuition: ~$59,076/year | Total: ~$80,000/year | Financial aid available',
     workRights:'F-1 visa: 20 hrs/week on-campus, OPT after graduation',
     successTips:['Apply Early Action by Nov 1 for better odds','Acceptance rate: ~3.4%','Strong financial aid — meets 100% of demonstrated need','Apply to scholarships: Harvard College Financial Aid']
   }
  },
  {cat:'university',icon:'🎓',title:'University of Oxford — UK',tags:['oxford','UK','britain','university'],
   summary:'The University of Oxford is the oldest English-speaking university in the world, located in Oxford, UK. Ranked #1 globally multiple years.',
   details:{
     requirements:['A-levels: A*A*A to AAA depending on course','UCAS application via ucas.com','TOEFL: 100+ / IELTS: 7.0+','Personal statement','Interview (most courses)','Written work or admissions tests (BMAT, MAT, TSA, etc.)'],
     duration:'Undergraduate: 3–4 years | Masters: 1 year | DPhil: 3–4 years',
     processing:'UCAS deadline: October 15 for Oxford',
     cost:'International tuition: £26,770–£39,010/year | Living: ~£1,200/month',
     workRights:'UK Student Visa: 20 hrs/week during term',
     successTips:['Apply only to Oxford OR Cambridge (not both via UCAS)','Prepare thoroughly for admissions tests','Oxford has 44 semi-autonomous colleges — research which college suits you','Rhodes Scholarship, Clarendon Fund available']
   }
  },
  {cat:'university',icon:'🎓',title:'University of Toronto — Canada',tags:['toronto','canada','university'],
   summary:'University of Toronto is Canada\'s top-ranked university and a global research powerhouse, located in Toronto, Ontario.',
   details:{
     requirements:['High school average: 85–95%+','TOEFL: 100+ / IELTS: 6.5+','Supplemental application for competitive programs','Reference letters (graduate level)'],
     duration:'Undergraduate: 4 years | Masters: 1–2 years | PhD: 4–5 years',
     processing:'Application deadline: January 13 (most undergrad programs)',
     cost:'International tuition: CAD $45,000–$65,000/year | Living: CAD ~$15,000/year',
     workRights:'Study permit: 20 hrs/week off-campus. PGWP available after graduation.',
     successTips:['U of T has 700+ undergraduate programs','Strong co-op programs available','Post-Graduation Work Permit: up to 3 years','Located in one of Canada\'s most diverse cities']
   }
  },
  {cat:'university',icon:'🎓',title:'MIT — Massachusetts Institute of Technology',tags:['MIT','USA','technology','engineering','university'],
   summary:'MIT is the world\'s leading technology and engineering university, located in Cambridge, Massachusetts. Known for innovation and research.',
   details:{
     requirements:['GPA: 3.9+ (near perfect)','SAT: 1510–1580 / ACT: 34–36','TOEFL: 90+ / IELTS: 6.5+','Strong math and science background','Research experience highly valued','2–3 recommendations'],
     duration:'Undergraduate: 4 years | Masters: 1–2 years | PhD: 4–7 years',
     processing:'Early Action: Nov 1 | Regular: Jan 1 | Decision: mid-March',
     cost:'Tuition: ~$59,750/year | Need-based aid — no merit scholarships',
     workRights:'F-1 visa + OPT/STEM OPT (3 years for STEM)',
     successTips:['Acceptance rate: ~3.9%','91% of undergrads receive financial aid','Strong alumni network in Silicon Valley, Wall Street','Research opportunities from freshman year']
   }
  },
  {cat:'university',icon:'🎓',title:'University of Melbourne — Australia',tags:['melbourne','australia','university'],
   summary:'The University of Melbourne is Australia\'s top-ranked university, a member of the Group of Eight research universities.',
   details:{
     requirements:['ATAR equivalent: 80–99 depending on course','TOEFL: 79+ / IELTS: 6.5+','Graduate Research: Honours degree or equivalent','Portfolio (architecture/fine arts)'],
     duration:'Undergraduate: 3 years | Masters: 1.5–2 years | PhD: 3–4 years',
     processing:'Multiple intakes: February and July',
     cost:'International tuition: AUD $40,000–$50,000/year | Living: AUD ~$20,000/year',
     workRights:'Student visa: 48 hrs/fortnight. Graduate visa (485): 2–4 years after graduation.',
     successTips:['Melbourne Model: broad undergraduate then specialised masters','Strong graduate employment outcomes','Australia Global Alumni Award worth AUD $10,000','Research Training Program (RTP) scholarships for PhD students']
   }
  },
  {cat:'university',icon:'🎓',title:'Technical University of Munich (TUM) — Germany',tags:['TUM','germany','engineering','university','europe'],
   summary:'TU Munich is Germany\'s top-ranked technical university and one of Europe\'s best engineering and technology institutions. Many programs are tuition-free.',
   details:{
     requirements:['Bachelor\'s degree (first-class) in relevant field','GRE/GMAT (some programs)','TOEFL: 88+ / IELTS: 6.5+ (English programs)','German B2/C1 for German-language programs','APS certificate for Chinese, Indian, Vietnamese applicants'],
     duration:'Masters: 2 years | PhD: 3–4 years',
     processing:'Winter: May 31 deadline | Summer: Jan 15 deadline',
     cost:'Semester fee: ~€145. No tuition for most programs! Living: ~€1,000/month',
     workRights:'120 full days/year work rights on student visa',
     successTips:['Germany charges no tuition at public universities','Blocked account required for visa: €11,208/year','TUM is ranked top 50 globally in Engineering','Deutschlandticket (€29/month) for all public transport']
   }
  },
  {cat:'university',icon:'🎓',title:'McGill University — Canada',tags:['mcgill','canada','montreal','university'],
   summary:'McGill University in Montreal is one of Canada\'s most prestigious universities, known for medicine, law, and sciences. Bilingual city — English and French.',
   details:{
     requirements:['High school average: 87–95%+','TOEFL: 86–100 / IELTS: 6.5–7.0','Supplemental application for medicine/dentistry','Letters of reference for graduate programs'],
     duration:'Undergraduate: 3–4 years | Masters: 1.5–2 years | PhD: 4–5 years',
     processing:'January 15 deadline for most undergraduate programs',
     cost:'International tuition: CAD $21,000–$55,000/year | Living: CAD ~$15,000/year',
     workRights:'20 hrs/week during studies. PGWP 1–3 years after graduation.',
     successTips:['Montreal has lower cost of living than Toronto or Vancouver','Both English and French programs available','Strong medical and law schools','Quebec Experience Program (PEQ) pathway to Quebec PR']
   }
  },
  {cat:'university',icon:'🎓',title:'Imperial College London — UK',tags:['imperial','london','UK','science','engineering','university'],
   summary:'Imperial College London specialises in science, engineering, medicine and business. Located in South Kensington, London. Consistently top 10 globally.',
   details:{
     requirements:['A-levels: A*AA–AAA','UCAS application','TOEFL: 92+ / IELTS: 6.5+','BMAT for medicine','Personal statement emphasising STEM passion'],
     duration:'Undergraduate: 3–4 years | Masters: 1 year | PhD: 3.5 years',
     processing:'UCAS deadline: January 31 (most courses), October 15 (medicine)',
     cost:'International tuition: £32,000–£45,000/year | Living: £1,500–£2,000/month in London',
     workRights:'Student visa: 20 hrs/week during term, full-time in holidays',
     successTips:['Graduate Visa allows 2 years work after graduation (3 for PhD)','President\'s PhD Scholarships available (full funding)','Strong industry links — placements at top companies','South Kensington campus next to world-class museums']
   }
  },

  // ── COUNTRIES ──
  {cat:'country',icon:'🌍',title:'United States of America',tags:['USA','america','united states'],
   summary:'The USA is the world\'s largest economy and most popular destination for international students and skilled workers. Home to world\'s top universities.',
   details:{
     requirements:['Visa types: F-1 (student), H-1B (work), B1/B2 (tourist), O-1 (talent), J-1 (exchange)','ESTA for visa-waiver countries','Strong English required for study/work'],
     duration:'Varies by visa type',
     processing:'Tourist: 1–3 weeks | Student: 3–5 weeks | Work: 3–6 months',
     cost:'Visa fees: $160–$290 depending on type',
     workRights:'Depends on visa category',
     successTips:['World\'s highest number of top-ranked universities','Diverse cities: New York, San Francisco, Boston, Chicago','Healthcare is expensive — always get insurance','SSN (Social Security Number) needed to work legally']
   }
  },
  {cat:'country',icon:'🌍',title:'United Kingdom',tags:['UK','britain','england','london'],
   summary:'The UK is home to world-class universities including Oxford and Cambridge. A top destination for international students with a post-study work visa available.',
   details:{
     requirements:['Student Visa, Skilled Worker Visa, BNO Visa, Ancestry Visa','English proficiency (IELTS/TOEFL) required','NHS provides healthcare — IHS surcharge applies'],
     duration:'Varies by visa',
     processing:'Student visa: 3 weeks | Skilled worker: 3 weeks',
     cost:'IHS: £776/year on top of visa fee',
     workRights:'Student: 20 hrs/week. Graduate Visa: 2 years unrestricted work.',
     successTips:['Graduate Visa is very popular — 2 years to find work after graduation','5 years leads to ILR (permanent residence)','Strong job market in finance, tech, healthcare','London is most expensive — consider Manchester, Edinburgh, Birmingham']
   }
  },
  {cat:'country',icon:'🌍',title:'Canada',tags:['canada','toronto','vancouver','montreal'],
   summary:'Canada is the most immigration-friendly developed country. Express Entry, PNP, and study-to-PR pathways make it a top choice for permanent residence.',
   details:{
     requirements:['Multiple pathways: Express Entry, PNP, Family Sponsorship, Study→PR','Language: IELTS/TEF required for most programs','ECA for foreign credentials'],
     duration:'PR processing: 6 months (Express Entry)',
     processing:'Study permit: 8–12 weeks | Work permit: 2–6 months',
     cost:'PR application: CAD $1,365 per adult',
     workRights:'Open Work Permit available for spouses of students/workers',
     successTips:['PGWP after graduation: 1–3 years work permit','CRS score improvement: language test, Canadian experience, PNP','Free healthcare for PR holders and citizens','Extremely multicultural — 23% of population are immigrants']
   }
  },
  {cat:'country',icon:'🌍',title:'Germany',tags:['germany','europe','german','berlin','munich'],
   summary:'Germany offers free or near-free university education, a strong economy, and a clear immigration pathway for skilled workers.',
   details:{
     requirements:['Recognised qualification (anabin database)','German language for some roles (B2/C1)','Job Seeker Visa for initial entry','Blocked account: €11,208/year for students'],
     duration:'EU Blue Card: 4 years (2 years with B1 German)',
     processing:'Job seeker visa: 4–12 weeks | Work visa: 1–3 months',
     cost:'Visa: €75 | No tuition at public universities',
     workRights:'EU Blue Card: full rights. After 21–33 months: Permanent Residence.',
     successTips:['Critical shortage: IT, engineering, healthcare, skilled trades','Minimum EU Blue Card salary: €43,992 (€39,682 for shortage occupations)','Germany launched the Chancenkarte (Opportunity Card) in 2024','Family reunification possible after arrival']
   }
  },
  {cat:'country',icon:'🌍',title:'Australia',tags:['australia','sydney','melbourne','brisbane'],
   summary:'Australia offers high quality of life, strong wages, and multiple pathways from student visa to permanent residence.',
   details:{
     requirements:['Skills assessment by relevant authority (e.g., ACS for IT)','English: IELTS 6.0–7.0+ depending on visa','Points test for skilled migration (65+ points required)','State sponsorship for subclass 190'],
     duration:'Subclass 189 (independent): Permanent from grant',
     processing:'Student visa: 29–40 days | Skilled: 6–12 months',
     cost:'Skilled visa: AUD $4,640 | Student: AUD $650',
     workRights:'Student: 48 hrs/fortnight. Graduate 485 visa: 2–4 years unrestricted.',
     successTips:['485 Graduate visa: 2 years (bachelor), 3 years (masters), 4 years (PhD)','Regional areas offer extra points and easier PR','Occupation Ceiling limits — check SOL and MLTSSL lists','Healthcare: OSHC for students, Medicare for PR holders']
   }
  },
  {cat:'country',icon:'🌍',title:'United Arab Emirates (Dubai)',tags:['UAE','dubai','abu dhabi','emirates'],
   summary:'UAE (Dubai/Abu Dhabi) offers tax-free income, world-class infrastructure, and the Golden Visa for long-term residency. No personal income tax.',
   details:{
     requirements:['Employment visa: sponsored by employer','Freelance permit: from Dubai Internet City, DMCC, etc.','Golden Visa: investment, talent, or student pathways','Medical fitness certificate required'],
     duration:'Employment visa: 2–3 years renewable | Golden Visa: 5–10 years',
     processing:'Employment visa: 2–4 weeks | Golden Visa: 2–4 weeks',
     cost:'Employment visa: AED 3,000–5,000 (often employer-paid)',
     workRights:'Employment visa: full rights with sponsoring employer. Golden Visa: self-sponsor.',
     successTips:['No income tax on salaries','Strong job market: finance, tech, tourism, healthcare, construction','DMCC free zone allows business ownership for foreigners','Family visa available for dependents']
   }
  },
  {cat:'country',icon:'🌍',title:'Singapore',tags:['singapore','asia','employment pass'],
   summary:'Singapore is Asia\'s financial hub with world-class infrastructure, safety, and a transparent immigration system.',
   details:{
     requirements:['Employment Pass: salary SGD $5,000+/month (graduates from top universities: lower threshold)','S Pass: SGD $3,150+/month for mid-level skills','Work Permit: unskilled/semi-skilled workers'],
     duration:'Employment Pass: 1–2 years (renewable)',
     processing:'Employment Pass: 3 weeks online',
     cost:'Employment Pass: SGD $105',
     workRights:'Employment Pass: work for sponsoring employer',
     successTips:['Permanent Residence (PR) after 2–6 years on EP','COMPASS points system for EP applications from 2023','Strong demand in finance, tech, biomedical','CPF (pension) contributions begin for PR holders']
   }
  },

  // ── WORK PERMITS ──
  {cat:'work',icon:'💼',title:'Canada Open Work Permit',tags:['canada','work permit','open work','PGWP'],
   summary:'Canada offers several open work permits that are not tied to a specific employer, giving maximum flexibility.',
   details:{
     requirements:['PGWP: completed degree at eligible Canadian institution','Spousal OWP: spouse of skilled worker or student','IEC Working Holiday: aged 18–35 for eligible nationalities','Bridging OWP: applied for PR while current permit expires'],
     duration:'PGWP: 1–3 years depending on study length | Working Holiday: 1–2 years',
     processing:'PGWP: 3–6 months online | Working Holiday: varies',
     cost:'CAD $255',
     workRights:'Work for ANY employer in Canada — maximum flexibility',
     successTips:['PGWP is the #1 path to Canadian PR for international graduates','Get Canadian work experience to boost Express Entry CRS score','IEC Working Holiday: apply as soon as pool opens — limited spots','Spousal OWP allows entire family to work simultaneously']
   }
  },
  {cat:'work',icon:'💼',title:'UK Graduate Visa (Post-Study Work)',tags:['UK','graduate visa','post study work','britain'],
   summary:'The UK Graduate Visa allows international students who have completed a degree at a UK university to stay and work for 2 years (3 for PhD).',
   details:{
     requirements:['Must have completed a UK degree at a licensed student sponsor','Must currently be in the UK on a valid Student Visa','Apply from inside the UK only'],
     duration:'2 years (undergraduate/masters), 3 years (PhD)',
     processing:'8 weeks typically',
     cost:'£715',
     workRights:'Work in any job, any number of hours — no employer restriction',
     successTips:['No job offer required to apply','Can switch to Skilled Worker Visa if you find qualifying job','No extension possible — must find sponsoring employer before expiry','Start job hunting before graduation']
   }
  },
  {cat:'work',icon:'💼',title:'Australia Working Holiday Visa (417 & 462)',tags:['australia','working holiday','backpacker'],
   summary:'Australia\'s Working Holiday visa lets young people (18–30, or 35 for some countries) live and work in Australia for up to 1 year, extendable to 3 years.',
   details:{
     requirements:['Age: 18–30 (35 for some passport holders)','Valid passport from eligible country','AUD $5,000 in savings','No dependent children accompanying','Health and character requirements'],
     duration:'1 year, extendable to 2nd and 3rd year with regional work',
     processing:'1–4 weeks',
     cost:'AUD $635',
     workRights:'Work for any employer — max 6 months with same employer',
     successTips:['88 days regional work extends visa to 2nd year','179 days regional work in year 2 unlocks 3rd year','In-demand jobs: farm work, hospitality, construction','Can study up to 4 months','Strong job market: AUD $25/hour minimum wage']
   }
  },
  {cat:'work',icon:'💼',title:'Germany EU Blue Card',tags:['germany','EU Blue Card','work','europe','skilled'],
   summary:'The EU Blue Card is a work and residence permit for highly qualified non-EU professionals. It leads to permanent residence in as little as 21 months.',
   details:{
     requirements:['University degree (recognised in Germany)','Job offer with minimum salary: €43,992/year (€39,682 for shortage occupations)','Relevant qualifications for the job','Health insurance'],
     duration:'4 years, or length of employment contract + 3 months',
     processing:'1–3 months at German immigration office (Ausländerbehörde)',
     cost:'€100–140',
     workRights:'Full work rights for all employers (not tied to one job after 2 years)',
     successTips:['Permanent Residence in 21 months with B1 German','Shortage occupations: IT specialists, engineers, doctors, nurses','Family reunification allowed — spouse gets work permit immediately','Upgrade to settlement permit (Niederlassungserlaubnis) quickly']
   }
  },
  {cat:'work',icon:'💼',title:'USA OPT & STEM OPT Extension',tags:['USA','OPT','STEM','work','america','F1'],
   summary:'Optional Practical Training (OPT) allows F-1 students to work in the USA for 12 months after graduation. STEM graduates get an additional 24-month extension.',
   details:{
     requirements:['Must be on valid F-1 status','Full-time enrollment for at least 1 academic year','Apply through DSO (Designated School Official)','STEM OPT: degree in STEM field + E-Verify employer'],
     duration:'12 months standard. 24-month extension for STEM = 36 months total',
     processing:'Apply 90 days before graduation. USCIS processing: 3–5 months.',
     cost:'$410 (I-765 form)',
     workRights:'Work for any employer related to your field of study',
     successTips:['Apply early — EAD card processing takes time','STEM OPT increases H-1B lottery chances (3 attempts)','Must work 20+ hrs/week and maintain status','Track your job/hours in SEVP portal for STEM OPT']
   }
  },

  // ── HOTELS ──
  {cat:'hotel',icon:'🏨',title:'Hotel Booking for Visa Applications',tags:['hotel','visa','booking','accommodation'],
   summary:'Many visa applications require proof of accommodation. We provide official hotel reservation letters accepted by all embassies worldwide. Also book real hotels at the best rates.',
   details:{
     requirements:['Passport details','Travel dates','Destination city','Purpose of visit'],
     duration:'Same-day to 24-hour delivery',
     processing:'Skyglobe provides official hotel reservations without upfront full payment',
     cost:'Visa reservation letter: from $15 | Real hotel booking: varies by property',
     workRights:'N/A',
     successTips:['Embassy-accepted reservations — not just screenshots','Refundable or non-refundable options available','We work with hotels in 150+ countries','Include in your visa application package for stronger approval chances']
   },
   bookingLinks:[
     {label:'🏨 Search on Booking.com',url:'https://www.booking.com'},
     {label:'🛏️ Hotels.com',url:'https://www.hotels.com'},
     {label:'🌐 Agoda Hotels',url:'https://www.agoda.com'},
     {label:'🏡 Airbnb',url:'https://www.airbnb.com'}
   ]
  },
  {cat:'hotel',icon:'🏨',title:'Student Accommodation Booking',tags:['hotel','student','accommodation','dormitory','university'],
   summary:'Finding accommodation before arriving abroad is critical. We help book university dorms, private student halls, and apartments near your institution.',
   details:{
     requirements:['University acceptance letter','Arrival date','Budget range','Preferred location (on-campus vs off-campus)'],
     duration:'Book 3–6 months before arrival for best options',
     processing:'We search and secure accommodation within 48–72 hours',
     cost:'Varies: UK dorms £150–300/week | Canada CAD 800–1,500/month | Australia AUD 250–450/week',
     workRights:'N/A',
     successTips:['University accommodation fills up fast — apply immediately after acceptance','Off-campus is usually cheaper but requires longer commute','Check if utilities (electricity, internet) are included','Look for student-specific platforms: Unite Students (UK), Amber Student (global)']
   }
  },
  {cat:'hotel',icon:'🏨',title:'Business Travel Hotel Reservations',tags:['hotel','business','travel','corporate'],
   summary:'Corporate and business travel hotel bookings with official confirmation letters for visa and expense purposes.',
   details:{
     requirements:['Business travel dates','Destination','Company name (for invoice)','Room requirements'],
     duration:'Same-day booking available',
     processing:'24-hour confirmation with official letter',
     cost:'Contact Skyglobe for corporate rates',
     workRights:'N/A',
     successTips:['We negotiate corporate rates at 3–5 star hotels globally','Official invoices provided for expense claims','Multi-city itineraries handled in one booking','Cancellation protection available']
   }
  },

  // ── TRAVEL INSURANCE ──
  {cat:'insurance',icon:'🛡️',title:'Schengen Travel Insurance',tags:['insurance','schengen','europe','travel'],
   summary:'Schengen visa applicants MUST have travel insurance with minimum €30,000 medical coverage valid for the entire Schengen Area. This is mandatory.',
   details:{
     requirements:['Minimum €30,000 medical coverage','Valid for all Schengen countries','Covers repatriation in case of death','Must cover entire duration of stay'],
     duration:'Single trip or multi-trip annual policies available',
     processing:'Same-day policy issuance',
     cost:'Approximately €20–50 for a 2-week policy',
     workRights:'N/A',
     successTips:['Buy before booking flights — needed for visa application','Skyglobe provides embassy-accepted insurance documents','Annual multi-trip policies save money for frequent travellers','COVID-19 coverage now recommended by many embassies']
   },
   bookingLinks:[
     {label:'🌍 World Nomads',url:'https://www.worldnomads.com/travel-insurance/'},
     {label:'🛡️ Allianz Travel',url:'https://www.allianztravelinsurance.com/'},
     {label:'🏥 SafetyWing',url:'https://safetywing.com/'},
     {label:'📋 InsureMyTrip',url:'https://www.insuremytrip.com/'}
   ]
  },
  {cat:'insurance',icon:'🛡️',title:'Overseas Student Health Cover (OSHC) — Australia',tags:['insurance','OSHC','australia','student'],
   summary:'OSHC is mandatory for international students in Australia. It covers doctor visits, hospital stays, and some pharmaceuticals.',
   details:{
     requirements:['Mandatory for all international student visa holders','Must be purchased before or when applying for student visa','Cover entire duration of visa'],
     duration:'Match your visa duration',
     processing:'Same-day purchase online',
     cost:'AUD ~$600–700/year (single). AUD ~$2,300/year (family)',
     workRights:'N/A',
     successTips:['Providers: Medibank, BUPA, Allianz, NIB, AHM','Compare via comparetravelinsurance.com.au','OSHC does NOT cover dental, optical, physiotherapy — get extras cover separately','Keep your OSHC card with you at all times']
   }
  },
  {cat:'insurance',icon:'🛡️',title:'International Student Health Insurance — UK',tags:['insurance','UK','student','IHS','britain'],
   summary:'International students in the UK pay the Immigration Health Surcharge (IHS) which grants access to the NHS — no separate insurance needed for most healthcare.',
   details:{
     requirements:['IHS paid as part of UK visa application','£776/year per person','Covers NHS services: GP, hospital, emergency'],
     duration:'Paid upfront for entire visa duration',
     processing:'Paid during visa application online',
     cost:'£776/year (£388 for students and under-18s) — 2024 rates',
     workRights:'N/A',
     successTips:['NHS is free at point of use after IHS payment','Register with a GP (General Practitioner) immediately on arrival','Dental and optical care may require additional insurance','Emergency A&E is always free regardless of insurance status']
   }
  },
  {cat:'insurance',icon:'🛡️',title:'Comprehensive Travel Insurance — General',tags:['insurance','travel','general','worldwide'],
   summary:'Comprehensive travel insurance covers medical emergencies, trip cancellation, lost luggage, flight delays, and repatriation worldwide.',
   details:{
     requirements:['Passport details','Travel dates and destinations','Activities planned (adventure sports need additional cover)'],
     duration:'Single trip or annual multi-trip',
     processing:'Instant policy via Skyglobe',
     cost:'Single trip: $30–$100 | Annual: $150–$300 | Varies by age and destination',
     workRights:'N/A',
     successTips:['Always buy before departure — cannot buy after incident','Pre-existing medical conditions must be declared','Adventure activities (skiing, scuba diving) need add-on cover','Keep all receipts for medical expenses — needed for claims']
   },
   bookingLinks:[
     {label:'🌍 World Nomads',url:'https://www.worldnomads.com/travel-insurance/'},
     {label:'🛡️ SafetyWing (nomads)',url:'https://safetywing.com/'},
     {label:'🏥 Allianz Travel',url:'https://www.allianztravelinsurance.com/'},
     {label:'📋 Compare at InsureMyTrip',url:'https://www.insuremytrip.com/'}
   ]
  },

  // ── FLIGHTS ──
  {cat:'flight',icon:'✈️',title:'Flight Booking & Reservation Services',tags:['flight','flights','booking','ticket','reservation','air travel'],
   summary:'Skyglobe provides official flight reservation letters accepted by all embassies, plus real ticket booking to 500+ airlines worldwide.',
   details:{
     requirements:['Passport details','Travel dates','Destination','Purpose of travel'],
     duration:'Same-day delivery for reservation letters',
     processing:'Official reservation letter: 2–6 hours | Real ticket: instant confirmation',
     cost:'Reservation letter: contact us | Tickets: varies by airline and route',
     workRights:'N/A',
     successTips:['Reservation letters are accepted by ALL embassies worldwide','You do NOT need to buy a real ticket before your visa is approved','We issue official PNR-backed reservation letters','Real ticket booking available for 500+ airlines worldwide']
   },
   officialLink:'https://www.skyscanner.com',
   bookingLinks:[
     {label:'🔍 Search on Skyscanner',url:'https://www.skyscanner.com'},
     {label:'✈️ Google Flights',url:'https://www.google.com/travel/flights'},
     {label:'💺 Booking.com Flights',url:'https://flights.booking.com'},
     {label:'🛩️ Kayak Flights',url:'https://www.kayak.com/flights'}
   ]
  },
  {cat:'flight',icon:'✈️',title:'Visa Flight Reservation Letter',tags:['flight','reservation','letter','visa','embassy','PNR'],
   summary:'An official flight reservation letter (PNR-backed itinerary) required for visa applications. Accepted by Schengen, US, UK, Canada, and all embassies.',
   details:{
     requirements:['Full name as in passport','Passport number and expiry','Travel dates (arrival + departure)','Destination country and cities'],
     duration:'Valid for 30 days typically',
     processing:'2–6 hours after order',
     cost:'Starting from $15 — contact Skyglobe',
     workRights:'N/A',
     successTips:['Do NOT book a real ticket before visa approval — use a reservation','All major airlines: Emirates, British Airways, Air France, Lufthansa etc.','Includes full itinerary, booking reference, airline confirmation','Refundable if visa is denied']
   }
  },

  // ── DOCUMENTATION ──
  {cat:'visa',icon:'📋',title:'Document Authentication & Apostille',tags:['document','apostille','authentication','notarization','legalization'],
   summary:'Authentication, apostille, notarization, and legalization of certificates for visa, work, and study applications worldwide. Required by embassies and universities.',
   details:{
     requirements:['Original document or certified copy','Identify destination country','Determine if Hague Convention member (apostille) or non-member (full legalization)'],
     duration:'Apostille: 1–5 business days | Full legalization: 1–3 weeks',
     processing:'We handle collection, authentication, and delivery end-to-end',
     cost:'Apostille: $50–150 per document | Full legalization: $100–300 per document',
     workRights:'N/A',
     successTips:['Apostille accepted in 120+ countries — check if your destination qualifies','Common documents: degree, transcripts, police clearance, birth certificate, marriage certificate','FBI background check: 3–4 months standard, 1–2 months premium processing','We can notarize, apostille, AND translate in one service']
   },
   officialLink:'https://www.hcch.net/en/instruments/conventions/status-table/?cid=41'
  },
  {cat:'visa',icon:'🪪',title:'Visa Application Document Checklist',tags:['document','checklist','visa','application','required documents','paperwork'],
   summary:'Missing documents are the #1 cause of visa refusals and delays. Our expert checklist review ensures your application is complete, signed, and submission-ready.',
   details:{
     requirements:['Valid passport (6+ months validity)','Biometric passport photos','Bank statements (3–6 months)','Travel insurance certificate','Hotel/accommodation proof','Flight reservation letter','Employer or enrollment letter','Purpose of travel statement'],
     duration:'Checklist review: 24–48 hours',
     processing:'Document preparation and review service',
     cost:'Document review: from $50 | Full preparation package: from $150',
     workRights:'N/A',
     successTips:['All foreign documents must be officially translated by a certified translator','Certified copies often required — originals returned after review','Bank statements must be stamped/signed by the bank','Photos must meet biometric standards: white background, 35mm x 45mm']
   }
  },

  // ── SCHOLARSHIPS ──
  {cat:'scholarship',icon:'🌟',title:'Chevening Scholarship — UK',tags:['scholarship','UK','chevening','funding'],
   summary:'Chevening is the UK Government\'s global scholarship programme, funded by the Foreign, Commonwealth & Development Office. Fully funded masters scholarships.',
   details:{
     requirements:['Citizens of Chevening-eligible countries','At least 2 years work experience','Undergraduate degree (2:1 or equivalent)','Unconditional offer from a UK university','Leadership potential and strong academics'],
     duration:'1 year masters degree in UK',
     processing:'Applications open August–November each year',
     cost:'FULLY FUNDED: tuition, flights, living allowance, visa',
     workRights:'Student visa rights during study',
     successTips:['Apply to 3 UK universities before applying for Chevening','Leadership and networking essays are key — show impact','Results announced in June following application year','Network of 50,000+ Chevening Alumni worldwide']
   }
  },
  {cat:'scholarship',icon:'🌟',title:'Commonwealth Scholarship — UK',tags:['scholarship','commonwealth','UK','funding'],
   summary:'Commonwealth Scholarships are for citizens of Commonwealth countries to study masters and PhD programs at UK universities.',
   details:{
     requirements:['Citizen of a Commonwealth country','Bachelors degree (first class or 2:1)','Under 35 years old for most awards','Research proposal for PhD applications'],
     duration:'1–3 years depending on program',
     processing:'Applications via Commonwealth Scholarship Commission (CSC)',
     cost:'FULLY FUNDED: tuition, flights, living allowance, thesis grant',
     workRights:'Student visa during study',
     successTips:['Development-focused research preferred','Apply through your national nominating agency','High competition — strong academic record essential','800+ scholarships awarded annually']
   }
  },
  {cat:'scholarship',icon:'🌟',title:'Vanier Canada Graduate Scholarship',tags:['scholarship','canada','PhD','research','funding'],
   summary:'The Vanier CGS awards $50,000/year for 3 years to doctoral students who demonstrate leadership skills and a high standard of scholarly achievement.',
   details:{
     requirements:['First full-time PhD student at eligible Canadian university','Nominated by your university (not a direct application)','Academic excellence (A- minimum average)','Research leadership potential'],
     duration:'3 years (PhD funding)',
     processing:'Universities nominate by November each year',
     cost:'CAD $50,000/year for 3 years = CAD $150,000 total',
     workRights:'Study permit work rights',
     successTips:['Contact your university graduate office early — they nominate you','Strong letters of reference are critical','Both Canadian and international students eligible','Strengthens PR application after graduation']
   }
  },
  {cat:'scholarship',icon:'🌟',title:'DAAD Scholarship — Germany',tags:['scholarship','germany','DAAD','funding','europe'],
   summary:'DAAD (German Academic Exchange Service) is the world\'s largest funding organisation for international student exchange. Hundreds of programs available.',
   details:{
     requirements:['Varies by program: undergraduate, masters, PhD, research','Strong academic record','Language skills (German or English depending on program)','Research proposal for some programs'],
     duration:'1 month to 4 years depending on program',
     processing:'Applications typically 6–12 months before program start',
     cost:'FUNDED: monthly stipend €850–1,200 + travel + health insurance',
     workRights:'Student visa work rights',
     successTips:['Over 100 different scholarship programs — find your match at daad.de','Both degree scholarships and research grants available','Many programs specifically for developing country applicants','Germany also has Helmholtz, Alexander von Humboldt fellowships']
   }
  },
];

let activeFilter = 'all';
let ALL_COUNTRIES = [];
let countriesLoaded = false;

// Load all world countries from REST Countries API
async function loadAllCountries() {
  if (countriesLoaded) return;
  try {
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,population,currencies,languages,flags,flag,region,subregion,area,timezones,tld,car');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ALL_COUNTRIES = await res.json();
    countriesLoaded = true;
    const q = document.getElementById('searchInput').value.trim();
    if (q) doSearch();
  } catch(e) {
    console.warn('Countries API failed:', e.message);
    countriesLoaded = true; // prevent infinite loading spinner
    ALL_COUNTRIES = [];
    const q = document.getElementById('searchInput').value.trim();
    if (q) doSearch(); // re-run so KB results still show
  }
}

function setFilter(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  doSearch();
}

function searchFor(term) {
  document.getElementById('searchInput').value = term;
  document.getElementById('popularSection').style.display = 'none';
  doSearch();
}

function fmtNum(n) {
  if (!n) return '—';
  if (n >= 1e9) return (n/1e9).toFixed(2) + ' billion';
  if (n >= 1e6) return (n/1e6).toFixed(1) + ' million';
  if (n >= 1e3) return (n/1e3).toFixed(0) + ',000';
  return n.toString();
}

function renderCountryCard(c, idx) {
  const name = c.name?.common || '—';
  const official = c.name?.official || name;
  const flagEmoji = c.flag || '';
  const flag = flagEmoji ? `<span style="font-size:1.8rem;line-height:1">${flagEmoji}</span>` : (c.flags?.png ? `<img src="${c.flags.png}" style="width:32px;height:22px;object-fit:cover;border-radius:3px;border:1px solid var(--border)">` : '🌍');
  const capital = c.capital?.[0] || '';
  const capitalDisplay = c.capital?.join(', ') || '—';
  const population = fmtNum(c.population);
  const region = c.region || '—';
  const subregion = c.subregion || '';
  const currencyCode = c.currencies ? Object.keys(c.currencies)[0] : '';
  const currencies = c.currencies ? Object.values(c.currencies).map(cur => `${cur.name}${cur.symbol?' ('+cur.symbol+')':''}`).join(', ') : '—';
  const languages = c.languages ? Object.values(c.languages).join(', ') : '—';
  const area = c.area ? (c.area).toLocaleString() + ' km²' : '—';
  const tld = c.tld?.join(', ') || '—';
  const drive = c.car?.side === 'left' ? 'Left-hand (like UK)' : 'Right-hand';
  const timezones = c.timezones?.slice(0,3).join(', ') + (c.timezones?.length > 3 ? '…' : '') || '—';
  const safeCapital = capital.replace(/'/g,"&#39;");
  const safeName = name.replace(/'/g,"&#39;");

  return `
    <div class="result-card" onclick="toggleDetail('c${idx}')" data-country="${safeName}" data-capital="${safeCapital}" data-currency="${currencyCode}">
      <div class="result-card-header">
        <div class="result-icon" style="font-size:1.6rem;overflow:hidden">${flag}</div>
        <div style="flex:1">
          <div class="result-category">COUNTRY · ${region.toUpperCase()}</div>
          <div class="result-title">${name}</div>
        </div>
        <div style="color:var(--gold);font-size:1.2rem" id="arrow-c${idx}">▼</div>
      </div>
      <div class="result-body">${official}${subregion ? ' — ' + subregion : ''}. Capital: <strong style="color:var(--white)">${capitalDisplay}</strong>. Population: <strong style="color:var(--white)">${population}</strong>.</div>
      <div class="result-tags">
        <span class="result-tag">${region}</span>
        ${subregion ? `<span class="result-tag">${subregion}</span>` : ''}
        <span class="result-tag">Pop: ${population}</span>
      </div>
      <div class="result-detail" id="detail-c${idx}">
        <div class="detail-grid" style="margin-top:0.5rem">
          <div class="detail-item"><strong>Capital</strong><span>${capitalDisplay}</span></div>
          <div class="detail-item"><strong>Population</strong><span>${population}</span></div>
          <div class="detail-item"><strong>Area</strong><span>${area}</span></div>
          <div class="detail-item"><strong>Currency</strong><span>${currencies}</span></div>
          <div class="detail-item"><strong>Languages</strong><span>${languages}</span></div>
          <div class="detail-item"><strong>Region</strong><span>${region}${subregion ? ' / ' + subregion : ''}</span></div>
          <div class="detail-item"><strong>Timezones</strong><span>${timezones}</span></div>
          <div class="detail-item"><strong>Internet TLD</strong><span>${tld}</span></div>
          <div class="detail-item"><strong>Driving Side</strong><span>${drive}</span></div>
        </div>
        <div id="live-c${idx}" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
          <p style="font-size:0.78rem;color:var(--muted)">📡 Expand to load live weather, exchange rate & universities…</p>
        </div>
        <div style="margin-top:1.2rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
          <a href="https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(name)}" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.82rem;padding:9px 16px;text-decoration:none" onclick="event.stopPropagation()">✈️ Search Flights</a>
          <a href="https://www.booking.com/search.html?ss=${encodeURIComponent(capital||name)}" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.82rem;padding:9px 16px;text-decoration:none" onclick="event.stopPropagation()">🏨 Find Hotels</a>
          <a href="https://www.worldnomads.com/travel-insurance/" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.82rem;padding:9px 16px;text-decoration:none" onclick="event.stopPropagation()">🛡️ Get Insurance</a>
          <button class="btn-primary" style="font-size:0.82rem;padding:9px 16px" onclick="event.stopPropagation();searchFor('${safeName} visa')">🛂 Visa Info</button>
          <button class="btn-outline" style="font-size:0.82rem;padding:9px 16px" onclick="event.stopPropagation();showPage('contact')">✦ Consult</button>
        </div>
      </div>
    </div>`;
}

function doSearch() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const resultsEl = document.getElementById('searchResults');
  const popularEl = document.getElementById('popularSection');

  if (!q) {
    popularEl.style.display = 'block';
    resultsEl.innerHTML = '';
    return;
  }
  popularEl.style.display = 'none';

  // KB results
  let kbResults = KB.filter(item => {
    const matchFilter = activeFilter === 'all' || item.cat === activeFilter;
    const matchQuery = item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q)) ||
      item.cat.toLowerCase().includes(q);
    return matchFilter && matchQuery;
  });

  // Country results (only when filter is 'all' or 'country')
  let countryResults = [];
  let countriesStillLoading = false;
  if (activeFilter === 'all' || activeFilter === 'country') {
    if (!countriesLoaded) {
      loadAllCountries(); // trigger loading in background
      countriesStillLoading = true; // show loading note but DON'T block KB results
    } else {
      countryResults = ALL_COUNTRIES.filter(c => {
        const name = (c.name?.common || '').toLowerCase();
        const official = (c.name?.official || '').toLowerCase();
        const capital = (c.capital?.[0] || '').toLowerCase();
        const region = (c.region || '').toLowerCase();
        const subregion = (c.subregion || '').toLowerCase();
        const currencies = c.currencies ? Object.values(c.currencies).map(cu=>cu.name).join(' ').toLowerCase() : '';
        const languages = c.languages ? Object.values(c.languages).join(' ').toLowerCase() : '';
        return name.includes(q) || official.includes(q) || capital.includes(q) ||
               region.includes(q) || subregion.includes(q) || languages.includes(q) || currencies.includes(q);
      }).sort((a, b) => (b.population || 0) - (a.population || 0)).slice(0, 20);
    }
  }

  const totalCount = kbResults.length + countryResults.length;

  if (totalCount === 0 && !countriesStillLoading) {
    resultsEl.innerHTML = `<div class="no-results"><div class="nr-icon">🔍</div><p>No results found for "<strong>${q}</strong>"</p><p style="font-size:0.85rem;margin-top:0.5rem;color:var(--muted)">Try any country name, city, visa type, university, work permit, insurance, or scholarship</p></div>`;
    return;
  }

  // Smart intent cards
  let intentHTML = '';
  const flightIntent = /flight|fly|flies|airline|ticket|airfare/.test(q);
  const hotelIntent = /hotel|hostel|accommodation|stay|lodg|airbnb/.test(q);
  const insureIntent = /insur|cover|protection|medical|health cover/.test(q);
  const destMatch = q.replace(/flights?\s*(to|from|in)?|hotels?\s*(in|at)?|insurance\s*(for)?/gi,'').trim();
  const encDest = encodeURIComponent(destMatch || q);

  if (flightIntent) {
    intentHTML += `<div class="result-card" style="border-color:var(--gold);background:rgba(201,168,76,0.04)">
      <div class="result-card-header">
        <div class="result-icon">✈️</div>
        <div style="flex:1"><div class="result-category">LIVE FLIGHT SEARCH</div><div class="result-title">Find Real Flights${destMatch?' to '+destMatch.charAt(0).toUpperCase()+destMatch.slice(1):''}</div></div>
      </div>
      <div class="result-body">Compare real-time prices across hundreds of airlines. Click any platform below to search live fares.</div>
      <div style="margin-top:1rem;display:flex;gap:0.6rem;flex-wrap:wrap">
        <a href="https://www.google.com/travel/flights?q=flights+${encDest}" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🔍 Google Flights</a>
        <a href="https://www.skyscanner.com/transport/flights/anywhere/?query=${encDest}" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">✈️ Skyscanner</a>
        <a href="https://www.kayak.com/flights/anywhere-${encDest}/" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🛩️ Kayak</a>
        <a href="https://flights.booking.com" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🌐 Booking.com</a>
        <button class="btn-outline" style="font-size:0.85rem;padding:10px 18px" onclick="showPage('contact')">📄 Visa Reservation Letter</button>
      </div>
      <p style="font-size:0.78rem;color:var(--muted);margin-top:0.8rem">💡 Need a flight reservation letter for your visa application? Skyglobe provides official PNR-backed letters accepted by all embassies.</p>
    </div>`;
  }
  if (hotelIntent) {
    intentHTML += `<div class="result-card" style="border-color:var(--gold);background:rgba(201,168,76,0.04)">
      <div class="result-card-header">
        <div class="result-icon">🏨</div>
        <div style="flex:1"><div class="result-category">LIVE HOTEL SEARCH</div><div class="result-title">Find Real Hotels${destMatch?' in '+destMatch.charAt(0).toUpperCase()+destMatch.slice(1):''}</div></div>
      </div>
      <div class="result-body">Search and book real hotels worldwide. Compare prices across all major platforms.</div>
      <div style="margin-top:1rem;display:flex;gap:0.6rem;flex-wrap:wrap">
        <a href="https://www.booking.com/search.html?ss=${encDest}" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🏨 Booking.com</a>
        <a href="https://www.hotels.com/search.do?q-destination=${encDest}" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🛏️ Hotels.com</a>
        <a href="https://www.agoda.com/search?city=${encDest}" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🌐 Agoda</a>
        <a href="https://www.airbnb.com/s/${encDest}/homes" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🏡 Airbnb</a>
        <button class="btn-outline" style="font-size:0.85rem;padding:10px 18px" onclick="showPage('contact')">📄 Visa Hotel Letter</button>
      </div>
      <p style="font-size:0.78rem;color:var(--muted);margin-top:0.8rem">💡 Need an official hotel reservation letter for your visa? Skyglobe issues embassy-accepted accommodation letters same-day.</p>
    </div>`;
  }
  if (insureIntent) {
    intentHTML += `<div class="result-card" style="border-color:var(--gold);background:rgba(201,168,76,0.04)">
      <div class="result-card-header">
        <div class="result-icon">🛡️</div>
        <div style="flex:1"><div class="result-category">TRAVEL INSURANCE</div><div class="result-title">Get Real Travel Insurance</div></div>
      </div>
      <div class="result-body">Compare travel insurance from leading providers. Schengen-compliant plans with €30,000+ medical coverage from €20.</div>
      <div style="margin-top:1rem;display:flex;gap:0.6rem;flex-wrap:wrap">
        <a href="https://www.worldnomads.com/travel-insurance/get-a-quote" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🌍 World Nomads</a>
        <a href="https://safetywing.com/" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🏥 SafetyWing</a>
        <a href="https://www.allianztravelinsurance.com/" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">🛡️ Allianz Travel</a>
        <a href="https://www.insuremytrip.com/" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.85rem;padding:10px 18px;text-decoration:none">📋 InsureMyTrip</a>
      </div>
      <p style="font-size:0.78rem;color:var(--muted);margin-top:0.8rem">💡 Schengen visa requires minimum €30,000 medical cover valid for all 27 Schengen countries. Single-trip policies from ~€20.</p>
    </div>`;
  }

  const kbHTML = kbResults.map((item, i) => `
    <div class="result-card" onclick="toggleDetail(${i})">
      <div class="result-card-header">
        <div class="result-icon">${item.icon}</div>
        <div style="flex:1">
          <div class="result-category">${item.cat.toUpperCase()}</div>
          <div class="result-title">${item.title}</div>
        </div>
        <div style="color:var(--gold);font-size:1.2rem" id="arrow-${i}">▼</div>
      </div>
      <div class="result-body">${item.summary}</div>
      <div class="result-tags">${item.tags.map(t=>`<span class="result-tag">${t}</span>`).join('')}</div>
      <div class="result-detail" id="detail-${i}">
        ${item.details.requirements ? `<p style="font-size:0.82rem;color:var(--gold);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.6rem">Requirements</p><ul>${item.details.requirements.map(r=>`<li>${r}</li>`).join('')}</ul>` : ''}
        <div class="detail-grid" style="margin-top:1rem">
          ${item.details.duration?`<div class="detail-item"><strong>Duration</strong><span>${item.details.duration}</span></div>`:''}
          ${item.details.processing?`<div class="detail-item"><strong>Processing Time</strong><span>${item.details.processing}</span></div>`:''}
          ${item.details.cost?`<div class="detail-item"><strong>Cost</strong><span>${item.details.cost}</span></div>`:''}
          ${item.details.workRights&&item.details.workRights!=='N/A'?`<div class="detail-item"><strong>Work Rights</strong><span>${item.details.workRights}</span></div>`:''}
        </div>
        ${item.details.successTips?`<p style="font-size:0.82rem;color:var(--gold);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:1rem 0 0.6rem">Tips for Success</p><ul>${item.details.successTips.map(t=>`<li>${t}</li>`).join('')}</ul>`:''}
        <div style="margin-top:1.2rem;display:flex;gap:0.7rem;flex-wrap:wrap;align-items:center">
          ${item.officialLink?`<a href="${item.officialLink}" target="_blank" rel="noopener" class="btn-primary" style="font-size:0.82rem;padding:9px 18px;text-decoration:none" onclick="event.stopPropagation()">🌐 Official Portal</a>`:''}
          ${item.bookingLinks?item.bookingLinks.map(bl=>`<a href="${bl.url}" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.82rem;padding:9px 18px;text-decoration:none" onclick="event.stopPropagation()">${bl.label}</a>`).join(''):''}
          <button class="btn-outline" style="font-size:0.82rem;padding:9px 18px" onclick="event.stopPropagation();showPage('contact')">✦ Get Expert Help</button>
        </div>
      </div>
    </div>`).join('');

  const countryHTML = countryResults.map((c, i) => renderCountryCard(c, i)).join('');

  const loadingNote = countriesStillLoading ? `<div style="text-align:center;padding:2rem;color:var(--muted);border:1px solid var(--border);border-radius:var(--radius-lg);margin-top:1rem">🌍 Loading world countries data… please wait a moment</div>` : '';

  const countrySection = countryResults.length > 0 ? `
    ${kbResults.length > 0 ? `<div style="margin:1.5rem 0 1rem;font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold)">🌍 World Countries (${countryResults.length})</div>` : ''}
    ${countryHTML}` : '';

  const intentCount = (flightIntent?1:0)+(hotelIntent?1:0)+(insureIntent?1:0);
  const displayTotal = totalCount + intentCount;
  resultsEl.innerHTML = `<p class="results-count">${displayTotal} result${displayTotal>1?'s':''} found for "<strong>${q}</strong>"</p>` + intentHTML + kbHTML + countrySection + loadingNote;
}

async function fetchLiveData(name, capital, currencyCode, idx) {
  const el = document.getElementById('live-'+idx);
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = 'true';
  el.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">📡 Loading live data…</p>';
  const [weather, rates, unis] = await Promise.allSettled([
    capital ? fetch('https://wttr.in/'+encodeURIComponent(capital)+'?format=%C,+%t,+Humidity+%h&m').then(r=>r.text()) : Promise.reject('no capital'),
    fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json()),
    fetch('https://universities.hipolabs.com/search?country='+encodeURIComponent(name)).then(r=>r.json())
  ]);
  let html = '<div class="detail-grid" style="margin-top:0">';
  if (weather.status==='fulfilled' && weather.value.trim()) {
    html += `<div class="detail-item"><strong>🌤️ Live Weather (${capital})</strong><span>${weather.value.trim()}</span></div>`;
  }
  if (rates.status==='fulfilled' && currencyCode && rates.value.rates?.[currencyCode]) {
    html += `<div class="detail-item"><strong>💱 Exchange Rate</strong><span>1 USD = ${rates.value.rates[currencyCode].toLocaleString(undefined,{maximumFractionDigits:4})} ${currencyCode}</span></div>`;
  }
  if (unis.status==='fulfilled' && unis.value?.length) {
    html += `<div class="detail-item" style="grid-column:1/-1"><strong>🎓 Universities in ${name}</strong><span>${unis.value.slice(0,6).map(u=>u.name).join(' • ')}</span></div>`;
  }
  html += '</div>';
  if (html === '<div class="detail-grid" style="margin-top:0"></div>') {
    el.innerHTML = '<p style="color:var(--muted);font-size:0.78rem">Live data unavailable for this country.</p>';
  } else {
    el.innerHTML = html;
  }
}

function toggleDetail(i) {
  const d = document.getElementById('detail-'+i);
  const a = document.getElementById('arrow-'+i);
  if (!d) return;
  d.classList.toggle('open');
  a.textContent = d.classList.contains('open') ? '▲' : '▼';
  if (d.classList.contains('open') && String(i).startsWith('c')) {
    const card = d.closest('.result-card') || document.querySelector(`[onclick="toggleDetail('${i}')"]`);
    if (card) {
      const name = card.dataset.country;
      const capital = card.dataset.capital;
      const currency = card.dataset.currency;
      fetchLiveData(name, capital, currency, String(i));
    }
  }
}

// Pre-load countries when search page is first visited
const _origShowPage = showPage;
showPage = function(page) {
  _origShowPage(page);
  if (page === 'search' && !countriesLoaded) loadAllCountries();
};

// ── APPLICATION FORM ──────────────────────────────────────────────────────────
let selectedService = '';
let currentAppStep = 1;
const APPLY_API = API_URL.replace('/api/contact', '/api/apply');

const serviceFields = {
  'Student Visa Processing':          ['institution'],
  'Work Visa Processing':             ['employer'],
  'Tourist / Visit Visa':             [],
  'University Admission Assistance':  ['institution'],
  'Flight Reservation Letter':        [],
  'Hotel Booking / Accommodation Letter': ['hotelCity','checkIn','checkOut'],
  'Travel Insurance':                 ['coverage'],
  'Document Authentication / Apostille': ['docType'],
  'Scholarship Application Support':  ['scholarship','institution'],
  'Express Entry / PR Pathway':       [],
  'Flight Booking':                   ['flightFrom','flightType'],
  'EU Direct Employment':             ['euCountry','jobField']
};
const allOptFields = ['institution','employer','hotelCity','checkIn','checkOut','coverage','docType','scholarship','flightFrom','flightType','euCountry','jobField'];

const SERVICE_DETAILS = {
  'Student Visa Processing': {
    icon:'🎓', tag:'Education → Global',
    headline:'Student Visa Processing',
    about:'We handle the complete student visa process so you can focus on your studies. From document preparation to embassy booking, our team manages every step for USA (F-1), UK (Student), Canada, Australia, Germany, Netherlands, and more.',
    includes:['Eligibility assessment & country recommendation','Full document checklist & review','Personal statement & cover letter guidance','Financial proof advisory','Embassy / VFS appointment booking','Application form completion & submission','Interview preparation & mock sessions','Follow-up until visa decision'],
    timeline:'4–12 weeks depending on destination',
    note:'Processing fees vary by country. Contact us for a tailored quote.'
  },
  'Work Visa Processing': {
    icon:'💼', tag:'Career → Abroad',
    headline:'Work Visa Processing',
    about:'We guide skilled professionals through the complete work visa and employer sponsorship process for the UK, USA, Canada, UAE, Germany, and EU countries. We navigate complex immigration rules so you arrive job-ready.',
    includes:['Skills & eligibility assessment','Job offer verification & employer guidance','Sponsorship documentation support','Work permit & visa application','Police clearance & background doc support','Biometrics & embassy appointment booking','Post-arrival registration guidance'],
    timeline:'6–16 weeks depending on destination',
    note:'Employer letter of offer typically required. We advise on alternatives where applicable.'
  },
  'Tourist / Visit Visa': {
    icon:'🌴', tag:'Tourism → Anywhere',
    headline:'Visit / Tourist Visa Services',
    about:'Whether it\'s a holiday, family visit, or short business trip, we handle Schengen, UK Standard Visitor, USA B-1/B-2, and dozens of other tourist visa categories. Fast-track options available.',
    includes:['Visa category selection & eligibility check','Full document preparation checklist','Hotel & flight booking support for application','Bank statement & financial proof advisory','Application form completion','VFS / embassy appointment booking','Tracking until decision'],
    timeline:'1–4 weeks for most destinations',
    note:'Schengen visa requires travel insurance. We can arrange this for you.'
  },
  'Flight Reservation Letter': {
    icon:'✈️', tag:'Travel → Ready',
    headline:'Flight Reservation / Itinerary Letter',
    about:'Get a genuine, verifiable flight reservation for your visa application or embassy appointment — without paying the full ticket price upfront. Accepted by all major embassies.',
    includes:['Genuine PNR-verified reservation','Full itinerary on airline letterhead','Round-trip or one-way options','Delivery within 24 hours','Valid for 2–4 weeks (enough for embassy)'],
    timeline:'Within 24 hours of order',
    note:'This is a reservation, not a purchased ticket. Suitable for visa applications only.'
  },
  'Travel Insurance': {
    icon:'🛡️', tag:'Protection → Global',
    headline:'Travel Insurance',
    about:'Comprehensive travel insurance meeting Schengen and embassy requirements — covering medical emergencies, trip cancellation, and baggage loss. We partner with leading global insurers.',
    includes:['Schengen-compliant €30,000 minimum cover','Medical emergency & hospitalisation','Trip cancellation & curtailment','Baggage loss & delay','24/7 emergency assistance','Certificate ready within 24 hours'],
    timeline:'Certificate issued within 24 hours',
    note:'Coverage amounts can be increased. Business and student health plans also available.'
  },
  'University Admission Assistance': {
    icon:'🏛️', tag:'Education → Future',
    headline:'University Admission Assistance',
    about:'End-to-end support for university applications — from choosing the right institution to receiving your offer letter. We\'ve placed students in universities across the UK, USA, Canada, Australia, and Europe.',
    includes:['University shortlisting based on your profile','Personal statement writing & editing','Application portal submission (UCAS, Common App, etc.)','Reference letter guidance','Scholarship identification','Offer letter follow-up','Conditional offer fulfilment support','Pre-departure orientation'],
    timeline:'3–8 weeks per application cycle',
    note:'We recommend applying to 4–6 universities to maximise offer chances.'
  },
  'Scholarship Application Support': {
    icon:'🌟', tag:'Funding → Dreams',
    headline:'Scholarship Application Support',
    about:'We help you identify and successfully apply for merit-based, need-based, and country-specific scholarships. Our clients have secured awards from Chevening, Commonwealth, DAAD, Fulbright, and many more.',
    includes:['Scholarship matching based on your profile','Personal statement & motivation letter writing','CV / résumé preparation','Reference letter guidance','Application form completion & review','Submission tracking','Interview preparation for shortlisted candidates'],
    timeline:'Varies by scholarship deadline',
    note:'Early applications have the highest success rates. Contact us as early as possible.'
  },
  'Hotel Booking / Accommodation Letter': {
    icon:'🏨', tag:'Accommodation → Sorted',
    headline:'Hotel Booking & Accommodation Letters',
    about:'Hotel booking confirmation letters for visa applications, business travel, and study-abroad arrivals. Same-day letters accepted at all embassies and consulates.',
    includes:['Embassy-accepted hotel confirmation letter','Booking in your name & travel dates','Same-day delivery','Support for all countries','Student accommodation booking assistance'],
    timeline:'Same day (within a few hours)',
    note:'Cancellable reservations available for visa purposes. Full bookings also arranged.'
  },
  'Document Authentication / Apostille': {
    icon:'📋', tag:'Documents → Verified',
    headline:'Document Authentication & Apostille',
    about:'We handle authentication, notarization, apostille certification, and legalization of all types of documents for international use — education certificates, birth certificates, police clearances, and more.',
    includes:['Notarization & certified true copies','Apostille certification (Hague Convention)','Embassy legalization','Educational certificate authentication','Police clearance certificate processing','Translation services (where required)'],
    timeline:'3–10 business days depending on document type',
    note:'Original documents are required for most authentication processes.'
  },
  'Flight Booking': {
    icon:'🎫', tag:'Fly → Anywhere',
    headline:'Flight Booking Service',
    about:'We search and book the best available flight tickets for you — one-way, round trip, or multi-city. Competitive fares, e-ticket delivery directly to your email, and full booking support.',
    includes:['Fare comparison across all major airlines','One-way, round-trip, or multi-city booking','Economy, business & first class options','E-ticket issued to your email','Booking confirmation & itinerary','Date change guidance if needed'],
    timeline:'Tickets booked within 24 hours of payment confirmation',
    note:'Final ticket price depends on selected airline, route and dates. We charge a small booking service fee.'
  },
  'EU Direct Employment': {
    icon:'🇪🇺', tag:'Work → Europe',
    headline:'EU Direct Employment Programme',
    about:'We connect you directly with verified employers in 17 countries across Europe and Asia — and handle the complete work permit and visa process from offer letter to arrival. No agency fees charged to the employer.',
    includes:['CV review & job matching','Direct employer introduction','Job offer letter facilitation','Work permit application & support','National visa (D-visa) processing','Flight & accommodation advisory','Pre-departure briefing & orientation','Post-arrival support & employer check-in'],
    countries:['🇵🇱 Poland','🇲🇪 Montenegro','🇱🇹 Lithuania','🇵🇹 Portugal','🇱🇻 Latvia','🇪🇸 Spain','🇳🇴 Norway','🇫🇮 Finland','🇨🇿 Czech Republic','🇸🇰 Slovakia','🇺🇦 Ukraine','🇦🇹 Austria','🇲🇰 North Macedonia','🇧🇬 Bulgaria','🇭🇺 Hungary','🇯🇵 Japan','🇰🇷 South Korea'],
    timeline:'8–20 weeks from application to departure',
    note:'Requires valid passport, clean criminal record, and relevant work experience.'
  },
};

function showSvcDetail(name) {
  const d = SERVICE_DETAILS[name];
  if (!d) { applyForService(name); return; }
  const countriesHtml = d.countries ? `<div style="margin-top:1.2rem"><div style="font-size:0.72rem;color:#b8860b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Available Countries</div><div style="display:flex;flex-wrap:wrap;gap:6px">${d.countries.map(c=>`<span style="background:rgba(184,134,11,0.08);border:1px solid rgba(184,134,11,0.25);border-radius:20px;padding:4px 12px;font-size:0.8rem;color:#374151">${c}</span>`).join('')}</div></div>` : '';
  document.getElementById('svcOverlayContent').innerHTML = `
    <div style="font-size:2.6rem;margin-bottom:0.6rem">${d.icon}</div>
    <div style="font-size:0.72rem;color:#b8860b;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px">${d.tag}</div>
    <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.9rem;font-weight:700;color:#0a1628;margin-bottom:1rem">${d.headline}</h2>
    <p style="color:#4b5563;line-height:1.75;margin-bottom:1.4rem">${d.about}</p>
    <div style="background:rgba(184,134,11,0.05);border:1px solid rgba(184,134,11,0.18);border-radius:12px;padding:18px 22px;margin-bottom:1.2rem">
      <div style="font-size:0.72rem;color:#b8860b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">✦ What's Included</div>
      <ul style="list-style:none;padding:0;margin:0">${d.includes.map(i=>`<li style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:0.88rem;color:#374151"><span style="color:#b8860b;margin-top:2px">✓</span>${i}</li>`).join('')}</ul>
    </div>
    ${countriesHtml}
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:0.8rem;padding:14px 18px;background:#f8f9fb;border-radius:10px;border:1px solid rgba(0,0,0,0.08)">
      <div style="flex:1;min-width:160px"><div style="font-size:0.68rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">⏱ Typical Timeline</div><div style="font-size:0.88rem;color:#0a1628">${d.timeline}</div></div>
      <div style="flex:2;min-width:200px"><div style="font-size:0.68rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">ℹ Note</div><div style="font-size:0.82rem;color:#64748b">${d.note}</div></div>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:1.4rem">
      <button onclick="closeSvcOverlay();applyForService('${name.replace(/'/g,"\\'")}');" style="flex:1;background:linear-gradient(135deg,#b8860b,#d4a017);color:#fff;border:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:0.95rem;cursor:pointer;min-width:180px;box-shadow:0 4px 14px rgba(184,134,11,0.25)">✦ Apply for This Service</button>
      <button onclick="closeSvcOverlay();openChecklist('${name.replace(/'/g,"\\'")}');" style="background:rgba(184,134,11,0.08);border:1px solid rgba(184,134,11,0.25);color:#b8860b;padding:14px 20px;border-radius:10px;font-size:0.88rem;cursor:pointer;font-weight:500">📋 Document Checklist</button>
      <button onclick="closeSvcOverlay();showPage('contact');" style="background:#f8f9fb;border:1px solid rgba(0,0,0,0.1);color:#374151;padding:14px 20px;border-radius:10px;font-size:0.88rem;cursor:pointer">Ask a Question First</button>
    </div>`;
  document.getElementById('svcOverlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function toggleFaq(btn) {
  const item = btn.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

function closeSvcOverlay() {
  document.getElementById('svcOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function applyForService(name) {
  showPage('apply');
  // Pre-select the service and jump directly to step 2
  selectedService = name;
  document.querySelectorAll('.svc-card').forEach(c => {
    c.classList.remove('selected');
    if (c.getAttribute('onclick') && c.getAttribute('onclick').includes("'" + name + "'")) c.classList.add('selected');
  });
  const btn = document.getElementById('step1Next');
  btn.disabled = false; btn.style.opacity = '1';
  goStep(2);
}

function selectService(name, el) {
  selectedService = name;
  document.querySelectorAll('.svc-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById('step1Next');
  btn.disabled = false;
  btn.style.opacity = '1';
}

function goStep(n) {
  if (n === 2) {
    if (!selectedService) { showToast('⚠️ Please select a service first.', true); return; }
  }
  if (n === 3) {
    const fname = document.getElementById('ap_fname').value.trim();
    const email = document.getElementById('ap_email').value.trim();
    const phone = document.getElementById('ap_phone').value.trim();
    const nationality = document.getElementById('ap_nationality').value.trim();
    if (!fname || !email || !phone || !nationality) { showToast('⚠️ Please fill in all required fields.', true); return; }
    document.getElementById('selectedServiceLabel').textContent = selectedService;
    showServiceFields();
  }
  if (n === 4) {
    buildReview();
  }
  currentAppStep = n;
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('applyStep' + n).classList.add('active');
  document.querySelectorAll('.apply-step').forEach((s, i) => {
    s.classList.remove('active','done');
    if (i + 1 < n) s.classList.add('done');
    if (i + 1 === n) s.classList.add('active');
  });
  window.scrollTo({top: document.getElementById('page-apply').offsetTop - 80, behavior:'smooth'});
}

function showServiceFields() {
  const show = serviceFields[selectedService] || [];
  allOptFields.forEach(f => {
    const el = document.getElementById('field' + f.charAt(0).toUpperCase() + f.slice(1));
    if (el) el.style.display = show.includes(f) ? '' : 'none';
  });
}

function buildReview() {
  const rows = [
    ['Service', selectedService],
    ['Name', (document.getElementById('ap_fname').value+' '+document.getElementById('ap_lname').value).trim()],
    ['Email', document.getElementById('ap_email').value],
    ['Phone', document.getElementById('ap_phone').value],
    ['Date of Birth', document.getElementById('ap_dob').value || '—'],
    ['Nationality', document.getElementById('ap_nationality').value],
    ['Passport No.', document.getElementById('ap_passport').value || '—'],
    ['Destination', document.getElementById('ap_destination').value || '—'],
    ['Travel Date', document.getElementById('ap_travelDate').value || '—'],
    ['Duration', document.getElementById('ap_duration').value || '—'],
    ['Purpose', document.getElementById('ap_purpose').value || '—'],
    ['Institution', document.getElementById('ap_institution').value || '—'],
    ['Employer', document.getElementById('ap_employer').value || '—'],
    ['Departure City', document.getElementById('ap_flightFrom').value || '—'],
    ['Trip Type', document.getElementById('ap_flightType').value || '—'],
    ['Preferred Country', document.getElementById('ap_euCountry').value || '—'],
    ['Job Field', document.getElementById('ap_jobField').value || '—'],
    ['Notes', document.getElementById('ap_notes').value || '—'],
  ];
  document.getElementById('reviewSummary').innerHTML = rows.filter(r=>r[1]&&r[1]!=='—').map(r =>
    `<span style="color:var(--gold);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em">${r[0]}</span>: <strong style="color:var(--white)">${r[1]}</strong><br>`
  ).join('');
}

async function submitApplication() {
  const btn = document.getElementById('submitAppBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';
  const payload = {
    service: selectedService,
    fname: document.getElementById('ap_fname').value.trim(),
    lname: document.getElementById('ap_lname').value.trim(),
    email: document.getElementById('ap_email').value.trim(),
    phone: document.getElementById('ap_phone').value.trim(),
    dob: document.getElementById('ap_dob').value,
    nationality: document.getElementById('ap_nationality').value.trim(),
    passport: document.getElementById('ap_passport').value.trim(),
    passportExpiry: document.getElementById('ap_passportExpiry').value,
    destination: document.getElementById('ap_destination').value.trim(),
    travelDate: document.getElementById('ap_travelDate').value,
    duration: document.getElementById('ap_duration').value.trim(),
    purpose: document.getElementById('ap_purpose').value.trim(),
    institution: document.getElementById('ap_institution').value.trim(),
    employer: document.getElementById('ap_employer').value.trim(),
    hotelCity: document.getElementById('ap_hotelCity').value.trim(),
    checkin: document.getElementById('ap_checkin').value,
    checkout: document.getElementById('ap_checkout').value,
    coverage: document.getElementById('ap_coverage').value,
    docType: document.getElementById('ap_docType').value,
    scholarship: document.getElementById('ap_scholarship').value,
    notes: document.getElementById('ap_notes').value.trim()
  };
  // New service-specific fields are appended to notes (no DB changes needed)
  const extras = [];
  const flightFrom = document.getElementById('ap_flightFrom').value.trim();
  const flightType = document.getElementById('ap_flightType').value;
  const euCountry = document.getElementById('ap_euCountry').value;
  const jobField = document.getElementById('ap_jobField').value;
  if (flightFrom) extras.push('Departure: ' + flightFrom);
  if (flightType) extras.push('Trip type: ' + flightType);
  if (euCountry) { extras.push('Preferred country: ' + euCountry); if (!payload.destination) payload.destination = euCountry; }
  if (jobField) extras.push('Job field: ' + jobField);
  if (extras.length) payload.notes = (payload.notes ? payload.notes + '\n\n' : '') + '— ' + extras.join('\n— ');
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(APPLY_API, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload), signal: ctrl.signal
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok && !data.ref) throw new Error(data.error || 'Server error');
    const ref = data.ref || ('SKY-' + new Date().getFullYear() + '-SAVE');
    document.getElementById('appRefDisplay').textContent = ref;
    // Save to localStorage so tracking works even after server restarts
    const savedApp = {...payload, ref, timestamp: new Date().toISOString(), status: 'Received'};
    try { localStorage.setItem('skyapp_' + ref, JSON.stringify(savedApp)); } catch(e){}
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById('applySuccess').classList.add('active');
    document.querySelectorAll('.apply-step').forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
    window.scrollTo({top: document.getElementById('page-apply').offsetTop - 80, behavior:'smooth'});
  } catch(err) {
    if (err.name === 'AbortError') {
      showToast('⚠️ Server timeout. Your application may still be saved — check via WhatsApp.', true);
    } else {
      showToast('⚠️ ' + (err.message || 'Failed to submit') + '. Please try WhatsApp.', true);
    }
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '✦ Submit Application';
  }
}

function resetApplyForm() {
  selectedService = '';
  currentAppStep = 1;
  document.querySelectorAll('.svc-card').forEach(c => c.classList.remove('selected'));
  ['ap_fname','ap_lname','ap_email','ap_phone','ap_dob','ap_nationality','ap_passport','ap_passportExpiry',
   'ap_destination','ap_travelDate','ap_duration','ap_purpose','ap_institution','ap_employer',
   'ap_hotelCity','ap_checkin','ap_checkout','ap_flightFrom','ap_notes'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  ['ap_coverage','ap_docType','ap_scholarship','ap_flightType','ap_euCountry','ap_jobField'].forEach(id => { const el = document.getElementById(id); if(el) el.selectedIndex=0; });
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('applyStep1').classList.add('active');
  document.querySelectorAll('.apply-step').forEach((s,i) => { s.classList.remove('active','done'); if(i===0) s.classList.add('active'); });
  const btn = document.getElementById('step1Next');
  btn.disabled = true; btn.style.opacity = '0.4';
}

function showTracker() {
  document.getElementById('trackInput').focus();
  document.getElementById('trackInput').scrollIntoView({behavior:'smooth', block:'center'});
}

async function trackApplication() {
  const val = document.getElementById('trackInput').value.trim();
  const resultEl = document.getElementById('trackResult');
  if (!val) { resultEl.innerHTML = '<p style="color:var(--muted)">Enter a reference number or email address.</p>'; return; }
  resultEl.innerHTML = '<p style="color:var(--muted)">🔍 Searching…</p>';

  // Helper: load all saved apps from localStorage
  function localApps() {
    const apps = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('skyapp_')) {
        try { apps.push(JSON.parse(localStorage.getItem(key))); } catch(e){}
      }
    }
    return apps;
  }

  try {
    if (val.toUpperCase().startsWith('SKY-')) {
      const ref = val.toUpperCase();
      // Server first — always shows the latest status and team responses
      const res = await fetch(APPLY_API + '/' + encodeURIComponent(ref));
      const data = await res.json();
      if (!res.ok) {
        // Fall back to a locally saved copy
        const local = localStorage.getItem('skyapp_' + ref);
        if (local) { resultEl.innerHTML = renderAppCard(JSON.parse(local)); return; }
        resultEl.innerHTML = `<p style="color:var(--muted)">No application found for reference <strong>${ref}</strong>. Please check the reference, or contact us via WhatsApp.</p>`; return;
      }
      try { localStorage.setItem('skyapp_' + ref, JSON.stringify(data)); } catch(e){}
      resultEl.innerHTML = renderAppCard(data);
    } else {
      const email = val.toLowerCase();
      // Server first — always shows the latest status and team responses
      const res = await fetch(APPLY_API + '?email=' + encodeURIComponent(val));
      const data = await res.json();
      if (!res.ok || !data.length) {
        const localMatches = localApps().filter(a => a.email && a.email.toLowerCase() === email);
        if (localMatches.length) { resultEl.innerHTML = localMatches.map(renderAppCard).join(''); return; }
        resultEl.innerHTML = '<p style="color:var(--muted)">No applications found for that email address. Please check the email, or contact us on WhatsApp.</p>'; return;
      }
      data.forEach(a => { try { localStorage.setItem('skyapp_' + a.ref, JSON.stringify(a)); } catch(e){} });
      resultEl.innerHTML = data.map(renderAppCard).join('');
    }
  } catch(e) {
    // Last resort: check localStorage only
    const email = val.toLowerCase();
    const localMatches = localApps().filter(a =>
      (a.ref && a.ref === val.toUpperCase()) ||
      (a.email && a.email.toLowerCase() === email)
    );
    if (localMatches.length) { resultEl.innerHTML = localMatches.map(renderAppCard).join(''); return; }
    resultEl.innerHTML = '<p style="color:var(--muted)">Could not connect to server. Please try again.</p>';
  }
}

function renderAppCard(app) {
  const statusColor = {'Received':'#3b82f6','Processing':'#f59e0b','In Review':'#f59e0b','Needs More Info':'#ef4444','Approved':'#22c55e','Completed':'#22c55e','Rejected':'#ef4444'}[app.status]||'#3b82f6';
  const statusIcon = {'Received':'📥','Processing':'⚙️','In Review':'⚙️','Needs More Info':'📋','Approved':'✅','Completed':'✅','Rejected':'❌'}[app.status]||'📥';
  const ts = app.timestamp || app.created_at;
  const date = ts ? new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const responses = Array.isArray(app.responses) ? app.responses : [];

  function row(label, val) {
    if (!val || val === '—' || val === '') return '';
    return `<tr style="border-bottom:1px solid rgba(0,0,0,0.06)">
      <td style="padding:7px 10px 7px 0;color:#64748b;font-size:0.82rem;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:7px 0 7px 10px;font-size:0.87rem;font-weight:500;color:#0a1628">${val}</td>
    </tr>`;
  }

  const printId = 'print_' + app.ref;
  (window.__printApps = window.__printApps || {})[printId] = { app, responses, date, statusColor, statusIcon };
  setTimeout(() => loadAppDocs(app.ref), 100);
  return `<div class="app-tracker" id="${printId}">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.8rem;margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid rgba(0,0,0,0.08)">
      <div>
        <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Application Reference</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;color:var(--gold);font-weight:700;letter-spacing:0.04em">${app.ref}</div>
        <div style="font-size:0.8rem;color:#64748b;margin-top:2px">Submitted: ${date}</div>
      </div>
      <div style="text-align:right">
        <div style="display:inline-flex;align-items:center;gap:6px;background:${statusColor}18;border:1px solid ${statusColor}55;border-radius:20px;padding:6px 14px;font-size:0.85rem;font-weight:600;color:${statusColor}">${statusIcon} ${app.status}</div>
        <div style="font-size:0.78rem;color:#64748b;margin-top:6px">Service: <strong style="color:#0a1628">${app.service||'—'}</strong></div>
      </div>
    </div>

    <!-- Progress Bar -->
    ${getAppProgressBar(app.status)}

    <!-- Details Table -->
    <table style="width:100%;border-collapse:collapse">
      ${row('Full Name', [app.fname, app.lname].filter(Boolean).join(' '))}
      ${row('Email', app.email)}
      ${row('Phone', app.phone)}
      ${row('Nationality', app.nationality)}
      ${row('Date of Birth', app.dob)}
      ${row('Passport No.', app.passport)}
      ${row('Passport Expiry', app.passportExpiry || app.passport_expiry)}
      ${row('Destination', app.destination)}
      ${row('Travel Date', app.travelDate || app.travel_date)}
      ${row('Duration', app.duration)}
      ${row('Purpose', app.purpose)}
      ${row('Institution', app.institution)}
      ${row('Employer', app.employer)}
      ${row('Hotel City', app.hotelCity || app.hotel_city)}
      ${row('Check-in', app.checkin)}
      ${row('Check-out', app.checkout)}
      ${row('Coverage', app.coverage)}
      ${row('Document Type', app.docType || app.doc_type)}
      ${row('Scholarship', app.scholarship)}
    </table>
    ${app.notes ? `<div style="margin-top:0.8rem;padding:10px;background:#fdf9f0;border-radius:8px;border-left:3px solid var(--gold)"><div style="font-size:0.75rem;color:#64748b;margin-bottom:4px">Notes</div><div style="font-size:0.85rem;line-height:1.5;color:#374151">${app.notes}</div></div>` : ''}

    ${responses.length ? `
    <!-- Messages from our team -->
    <div style="margin-top:1rem">
      <div style="font-size:0.72rem;color:var(--gold);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">💬 Messages From Our Team</div>
      ${responses.map(r => `
      <div style="padding:12px 14px;background:#fdf9f0;border-radius:8px;border-left:3px solid var(--gold);margin-bottom:8px">
        <div style="font-size:0.72rem;color:#64748b;margin-bottom:5px">${r.date ? new Date(r.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</div>
        <div style="font-size:0.88rem;line-height:1.6;color:#374151">${String(r.message||'').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
      </div>`).join('')}
    </div>` : `
    <!-- Status message -->
    <div style="margin-top:1rem;padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;font-size:0.82rem;color:#1e40af">
      Our team will contact you at <strong>${app.email}</strong> within 24 hours. Use your reference number for any enquiries.
    </div>`}

    <!-- Documents -->
    <div style="margin-top:1.1rem;border-top:1px solid rgba(0,0,0,0.08);padding-top:0.9rem">
      <div style="font-size:0.72rem;color:var(--gold);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">📎 Documents</div>
      <div id="docs_${app.ref}" style="font-size:0.82rem;color:#64748b">Loading…</div>
      <div style="margin-top:10px;background:#f8f9fb;border:1px solid rgba(0,0,0,0.08);border-radius:10px;padding:12px">
        <div style="font-size:0.74rem;color:#374151;margin-bottom:8px;font-weight:600">Upload a document to your application:</div>
        <input type="text" id="doclabel_${app.ref}" placeholder="Document name (e.g. Passport copy, Bank statement…)" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,0.1);background:#fff;color:#0a1628;font-size:0.82rem;margin-bottom:8px">
        <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap">
          <input type="file" id="docfile_${app.ref}" style="font-size:0.78rem;color:#374151;flex:1;min-width:0">
          <button onclick="uploadUserDoc('${app.ref}')" id="docbtn_${app.ref}" style="background:transparent;border:1px solid var(--gold);color:var(--gold);padding:8px 14px;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;white-space:nowrap">⬆️ Upload</button>
        </div>
        <div style="font-size:0.68rem;color:#64748b;margin-top:6px">Max 8 MB. PDF, JPG, PNG accepted. Documents sent by our team will also appear here.</div>
      </div>
    </div>

    <!-- Action buttons -->
    <div style="display:flex;gap:0.7rem;flex-wrap:wrap;margin-top:1rem">
      <button onclick="printApp('${printId}')" style="display:inline-flex;align-items:center;gap:6px;background:var(--gold);color:var(--navy);border:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer">🖨️ Print / Save PDF</button>
      <a href="https://wa.me/17373998522?text=Hi%2C%20my%20application%20reference%20is%20${app.ref}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none">💬 WhatsApp Us</a>
    </div>
  </div>`;
}

const DOCS_API = API_URL.replace('/api/contact', '/api/documents');

async function loadAppDocs(ref) {
  const el = document.getElementById('docs_' + ref);
  if (!el) return;
  try {
    const res = await fetch(DOCS_API + '/' + encodeURIComponent(ref));
    const docs = await res.json();
    if (!res.ok) throw new Error();
    if (!docs.length) { el.innerHTML = '<span style="color:var(--muted)">No documents yet.</span>'; return; }
    el.innerHTML = docs.map(d => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
        <div style="min-width:0">
          <a href="${d.url}" target="_blank" style="color:var(--gold-light);text-decoration:none;font-weight:500;word-break:break-all">📄 ${d.filename}</a>
          <div style="font-size:0.68rem;color:var(--muted)">${d.uploaded_by && String(d.uploaded_by).startsWith('admin') ? '✅ From the SkyGlobe team' : 'Uploaded by you'}${d.created_at ? ' · ' + new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
        </div>
        <a href="${d.url}" download target="_blank" style="color:var(--gold);font-size:0.75rem;text-decoration:none;white-space:nowrap">⬇ Download</a>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = '<span style="color:var(--muted)">Could not load documents.</span>';
  }
}

async function uploadUserDoc(ref) {
  const input = document.getElementById('docfile_' + ref);
  const labelEl = document.getElementById('doclabel_' + ref);
  const btn = document.getElementById('docbtn_' + ref);
  const file = input && input.files && input.files[0];
  if (!file) { alert('Please choose a file first.'); return; }
  if (file.size > 8 * 1024 * 1024) { alert('File too large — maximum size is 8 MB.'); return; }
  const label = (labelEl && labelEl.value.trim()) || file.name;
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
  const displayName = label.endsWith(ext) ? label : label + ext;
  btn.disabled = true; btn.textContent = '⏳ Uploading…';
  try {
    const data = await new Promise((ok, err) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(',')[1]);
      r.onerror = err;
      r.readAsDataURL(file);
    });
    const res = await fetch(DOCS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, filename: displayName, contentType: file.type, data }),
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'Upload failed');
    input.value = '';
    if (labelEl) labelEl.value = '';
    loadAppDocs(ref);
  } catch (e) {
    alert('Upload failed: ' + e.message);
  }
  btn.disabled = false; btn.textContent = '⬆️ Upload';
}

// ── APPLICATION PROGRESS BAR ─────────────────────────────────────────────────
function getAppProgressBar(status) {
  const stages = [
    {label:'Received', icon:'📥'},
    {label:'In Review', icon:'🔍'},
    {label:'Processing', icon:'⚙️'},
    {label:'Complete', icon:'✅'},
  ];
  const idxMap = {
    'Received':0,'In Review':1,'Needs More Info':1,
    'Processing':2,'Approved':3,'Completed':3,'Rejected':3
  };
  const idx = idxMap[status] ?? 0;
  const isRejected = status === 'Rejected';
  return `<div class="app-progress">
    ${stages.map((s,i) => {
      const done = i < idx;
      const current = i === idx;
      const rej = isRejected && current;
      const dot = rej ? '✕' : current ? s.icon : done ? '✓' : String(i+1);
      return `<div class="app-prog-step ${done?'done':''} ${current&&!rej?'current':''} ${rej?'rejected':''}">
        <div class="app-prog-dot">${dot}</div>
        <div class="app-prog-label">${rej ? 'Rejected' : s.label}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ── DOCUMENT CHECKLIST GENERATOR ─────────────────────────────────────────────
const CHECKLISTS = {
  'Student Visa Processing':{title:'Student Visa Document Checklist',sections:[
    {h:'Personal Documents',items:[
      {t:'Valid passport — min 6 months validity beyond intended stay',s:'All pages clear, no damage'},
      {t:'2–6 passport-size photographs',s:'White background, recent, biometric format (35×45mm)'},
      {t:'Birth certificate',s:'Certified copy required by some embassies'},
      {t:'National ID card copy'},
    ]},
    {h:'Academic Documents',items:[
      {t:'University / College acceptance letter or CAS number',s:'Original, signed by institution'},
      {t:'Previous academic certificates and transcripts',s:'WAEC, A-Level, Bachelor\'s etc.'},
      {t:'English language test result',s:'IELTS min 5.5–6.5, TOEFL, or Duolingo'},
      {t:'SEVIS fee receipt (USA F-1 only)',s:'$350 — must be paid before embassy interview'},
    ]},
    {h:'Financial Documents',items:[
      {t:'Bank statements — last 3 to 6 months',s:'Must show sufficient funds for tuition + living costs'},
      {t:'Sponsorship letter if parent or guardian is paying',s:'Signed and notarized'},
      {t:'Sponsor\'s bank statements and employment/income letter'},
      {t:'Scholarship award letter (if applicable)'},
    ]},
    {h:'Application Documents',items:[
      {t:'Completed visa application form',s:'DS-160 for USA; online for UK, Canada, Australia'},
      {t:'Visa application fee payment receipt'},
      {t:'Medical exam certificate (required by some countries)'},
      {t:'Police clearance certificate (required by some countries)'},
      {t:'Yellow fever vaccination card (required for some nationalities)'},
    ]},
  ]},
  'Work Visa Processing':{title:'Work Visa Document Checklist',sections:[
    {h:'Personal Documents',items:[
      {t:'Valid passport — min 6 months validity'},
      {t:'Passport-size photographs'},
      {t:'Birth certificate'},
      {t:'Marriage certificate (if applicable, for dependent visas)'},
    ]},
    {h:'Employment Documents',items:[
      {t:'Job offer letter from employer',s:'On company letterhead, signed and dated'},
      {t:'Certificate of Sponsorship (CoS) — UK Skilled Worker Visa',s:'Employer must be Home Office licensed'},
      {t:'Labor Condition Application (LCA) — USA H-1B',s:'Filed by US employer with Department of Labor'},
      {t:'Signed employment contract'},
    ]},
    {h:'Qualification Documents',items:[
      {t:'University degree certificates and transcripts'},
      {t:'Professional licences and certifications'},
      {t:'Updated CV / Résumé'},
      {t:'Work experience letters from previous employers',s:'Covering last 3–5 years'},
    ]},
    {h:'Financial Documents',items:[
      {t:'Bank statements — last 3 months'},
      {t:'Recent payslips'},
      {t:'Tax returns (required by some countries)'},
    ]},
  ]},
  'Tourist / Visit Visa':{title:'Tourist / Visit Visa Checklist',sections:[
    {h:'Identity Documents',items:[
      {t:'Valid passport',s:'3+ months beyond stay for Schengen; 6+ for USA and UK'},
      {t:'Previous visa copies',s:'Shows travel history — strengthens your application'},
      {t:'2 passport photographs',s:'White background, recent, biometric format'},
    ]},
    {h:'Travel Documents',items:[
      {t:'Flight reservation letter',s:'Official PNR-backed itinerary — SkyGlobe provides this same day'},
      {t:'Hotel reservation or accommodation proof',s:'Official letter accepted by embassy — SkyGlobe provides'},
      {t:'Detailed travel itinerary / cover letter explaining trip'},
    ]},
    {h:'Financial Proof',items:[
      {t:'Bank statements — last 3 to 6 months',s:'Show regular income and sufficient balance'},
      {t:'Payslips or employer salary letter'},
      {t:'Sponsorship letter + sponsor\'s bank statement (if someone else funds your trip)'},
    ]},
    {h:'Supporting Documents',items:[
      {t:'Travel insurance',s:'Min €30,000 coverage — MANDATORY for Schengen visa'},
      {t:'Employment letter with approved leave dates',s:'Proves you will return home'},
      {t:'Business registration (if self-employed)'},
      {t:'Proof of ties to home country',s:'Property, family, business — shows intent to return'},
      {t:'Invitation letter from host (if visiting family or friends)'},
    ]},
  ]},
  'EU Direct Employment':{title:'EU Direct Employment Checklist',sections:[
    {h:'Personal Documents',items:[
      {t:'Valid international passport',s:'Minimum 12 months validity'},
      {t:'National ID card (certified copy)'},
      {t:'Birth certificate'},
      {t:'Marriage certificate (if married)'},
      {t:'2–4 passport photographs'},
    ]},
    {h:'Qualifications & Experience',items:[
      {t:'Highest educational certificate',s:'WAEC/NECO, HND, Bachelor\'s — certified copy'},
      {t:'Vocational training certificates (if applicable)'},
      {t:'Work experience letters',s:'On company letterhead, showing role and duration'},
      {t:'Updated CV / Résumé in English',s:'We can prepare a Europass-style CV for you'},
      {t:'2 professional references'},
    ]},
    {h:'Health & Background',items:[
      {t:'Police clearance certificate',s:'From your home country — apostilled if required'},
      {t:'Medical fitness certificate'},
      {t:'Vaccination records'},
    ]},
    {h:'Financial',items:[
      {t:'Bank statement — last 3 months'},
    ]},
  ]},
  'University Admission Assistance':{title:'University Admission Checklist',sections:[
    {h:'Academic Documents',items:[
      {t:'Secondary school certificate and transcripts',s:'WAEC, NECO, IGCSE, A-Levels'},
      {t:'Undergraduate degree and transcripts (for Master\'s applicants)'},
      {t:'Graded coursework or portfolio (some programmes)'},
      {t:'Research proposal (for PhD applications)'},
    ]},
    {h:'Language & Test Scores',items:[
      {t:'IELTS result',s:'Min 6.0–7.0 depending on university and programme'},
      {t:'TOEFL result (alternative to IELTS)'},
      {t:'GRE or GMAT scores (USA / some UK Master\'s programmes)'},
      {t:'SAT / ACT scores (USA undergraduate)'},
    ]},
    {h:'Personal Documents',items:[
      {t:'Personal Statement / Statement of Purpose',s:'We write and edit this professionally for you'},
      {t:'CV / Résumé'},
      {t:'2–3 reference letters from academics or employers'},
      {t:'Passport copy'},
      {t:'Passport-size photographs'},
    ]},
    {h:'Application Requirements',items:[
      {t:'Portfolio of work (design, arts, architecture programmes)'},
      {t:'Writing samples (journalism, law, humanities)'},
      {t:'Application fee payment receipt'},
    ]},
  ]},
  'Scholarship Application Support':{title:'Scholarship Application Checklist',sections:[
    {h:'Academic Records',items:[
      {t:'Academic transcripts (all levels)',s:'Certified copies with grades'},
      {t:'Degree certificate(s)'},
      {t:'IELTS / TOEFL score',s:'Most scholarships require min IELTS 6.5'},
    ]},
    {h:'Application Essays',items:[
      {t:'Personal statement',s:'Why you deserve the scholarship — 500–1000 words'},
      {t:'Statement of Purpose (for Master\'s / PhD)',s:'Research focus and goals'},
      {t:'Leadership / community impact essay',s:'Required for Chevening, Commonwealth and similar'},
    ]},
    {h:'References & Evidence',items:[
      {t:'2–3 reference letters',s:'From academics or professional supervisors'},
      {t:'Community service / volunteering evidence'},
      {t:'Work experience letters'},
      {t:'Awards, publications, certificates of achievement'},
      {t:'Bank statement (some scholarships check financial need)'},
    ]},
    {h:'Personal Documents',items:[
      {t:'Passport copy'},
      {t:'Passport photographs'},
    ]},
  ]},
  'Flight Reservation Letter':{title:'Flight Reservation Checklist',sections:[
    {h:'Information Needed',items:[
      {t:'Full name exactly as in passport'},
      {t:'Passport number and expiry date'},
      {t:'Travel dates — outbound and return'},
      {t:'Destination country and cities'},
      {t:'Purpose of visit'},
    ]},
    {h:'Documents to Attach to Visa Application',items:[
      {t:'SkyGlobe official flight reservation letter',s:'Delivered same day — accepted by all embassies'},
      {t:'Hotel reservation letter',s:'Also provided by SkyGlobe'},
      {t:'Travel insurance certificate',s:'Mandatory for Schengen — also provided by SkyGlobe'},
    ]},
  ]},
};

let __clTotal = 0;

function openChecklist(service) {
  const cl = CHECKLISTS[service] || CHECKLISTS['Tourist / Visit Visa'];
  const cont = document.getElementById('checklistContent');
  let total = 0;
  let html = `<h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;margin-bottom:0.3rem;color:var(--white)">${cl.title}</h3>
    <p style="font-size:0.8rem;color:var(--muted);margin-bottom:1rem">Tick each item as you prepare it. Print or save for reference.</p>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(201,168,76,0.07);border-radius:8px;border:1px solid var(--border);margin-bottom:1.2rem">
      <span style="font-size:0.8rem;color:var(--gold-light)" id="clProgress">0 items checked</span>
      <button onclick="window.print()" style="background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--navy);border:none;padding:7px 16px;border-radius:6px;font-size:0.76rem;font-weight:600;cursor:pointer">🖨️ Print</button>
    </div>`;
  cl.sections.forEach(sec => {
    html += `<div style="margin-bottom:1.3rem">
      <div style="font-size:0.7rem;color:var(--gold);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:0.5rem;border-bottom:1px solid var(--border);padding-bottom:0.35rem">${sec.h}</div>`;
    sec.items.forEach(item => {
      total++;
      const id = 'cl_' + Math.random().toString(36).slice(2,8);
      html += `<div class="cl-item"><input type="checkbox" id="${id}" onchange="updateClProgress()"><div><label for="${id}">${item.t}</label>${item.s?`<span class="cl-sub">${item.s}</span>`:''}</div></div>`;
    });
    html += `</div>`;
  });
  html += `<div style="margin-top:1.2rem;padding:12px 14px;background:rgba(201,168,76,0.07);border-radius:8px;border-left:3px solid var(--gold);font-size:0.83rem;color:var(--text-body)">
    💡 <strong style="color:var(--gold-light)">SkyGlobe prepares all documents for you.</strong> Gather these items and we handle the rest.
    <a onclick="closeChecklist();applyForService('${service}')" style="color:var(--gold);cursor:pointer;text-decoration:underline;margin-left:6px">Start application →</a>
  </div>`;
  cont.innerHTML = html;
  __clTotal = total;
  updateClProgress();
  document.getElementById('checklistOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeChecklist() {
  document.getElementById('checklistOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function updateClProgress() {
  const checked = document.querySelectorAll('#checklistContent input:checked').length;
  const el = document.getElementById('clProgress');
  if (el) el.textContent = `${checked} / ${__clTotal} items checked`;
}

// ── COUNTRY GUIDES ─────────────────────────────────────────────────────────
const COUNTRIES = [
  {flag:'🇬🇧',name:'United Kingdom',tag:'Study · Work · Visit',visas:['Student Visa (Tier 4)','Skilled Worker Visa','Standard Visitor Visa','Graduate Visa'],
   sections:[
    {h:'Popular Visa Types',rows:[
      {l:'Student Visa',v:'For university / college — requires CAS from institution. 20 hrs/week work allowed.'},
      {l:'Skilled Worker',v:'Employer-sponsored. Min salary £26,200/year. Leads to ILR after 5 years.'},
      {l:'Visitor Visa',v:'Up to 6 months. No work rights. For tourism, family visits, business meetings.'},
      {l:'Graduate Visa',v:'2 years (3 for PhD) post-study work — no employer required.'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'British Pound (GBP)'},
      {l:'Language',v:'English'},
      {l:'Processing',v:'Visitor: 3 weeks · Student: 3 weeks · Skilled Worker: 3 weeks'},
      {l:'Visa Fee',v:'Visitor: £115 · Student: £363 + IHS · Skilled Worker: £719–£1,420'},
      {l:'IHS Surcharge',v:'£1,035/year for workers; £776/year for students'},
    ]},
    {h:'Top Universities',rows:[
      {l:'',v:'Oxford, Cambridge, Imperial College, UCL, LSE, Edinburgh, Manchester'},
    ]},
   ],svc:'Student Visa Processing'},
  {flag:'🇺🇸',name:'United States',tag:'Study · Work · Travel',visas:['F-1 Student','H-1B Work','B-1/B-2 Tourist','O-1 Extraordinary Ability'],
   sections:[
    {h:'Popular Visa Types',rows:[
      {l:'F-1 Student',v:'Full-time study at SEVIS-approved institution. 20 hrs/week on-campus work. OPT/STEM OPT after graduation.'},
      {l:'H-1B Work',v:'Specialty occupations. Annual cap lottery. 3 years, extendable to 6.'},
      {l:'B-1/B-2',v:'Business/tourist visits up to 6 months. No work rights.'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'US Dollar (USD)'},
      {l:'Language',v:'English'},
      {l:'Processing',v:'F-1: 3–5 weeks · H-1B: 3–6 months (premium: 15 days) · B-2: varies'},
      {l:'Visa Fee',v:'F-1: $185 + $350 SEVIS · B-2: $185 · H-1B: employer pays'},
    ]},
    {h:'Top Universities',rows:[
      {l:'',v:'Harvard, MIT, Stanford, Yale, Princeton, Columbia, NYU, UCLA'},
    ]},
   ],svc:'Student Visa Processing'},
  {flag:'🇨🇦',name:'Canada',tag:'Study · Work · Permanent Residence',visas:['Study Permit','Express Entry PR','Open Work Permit','Visitor Visa'],
   sections:[
    {h:'Popular Pathways',rows:[
      {l:'Study Permit',v:'For programs over 6 months at DLI. 20 hrs/week work. PGWP 1–3 years after graduation.'},
      {l:'Express Entry',v:'Points-based PR system. CRS score 470–530+. Decision in 6 months.'},
      {l:'Open Work Permit',v:'PGWP, spousal, IEC Working Holiday. Work for ANY employer.'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'Canadian Dollar (CAD)'},
      {l:'Language',v:'English / French'},
      {l:'Processing',v:'Study Permit: 8–12 weeks · PR (Express Entry): 6 months'},
      {l:'Visa Fee',v:'Study Permit: CAD $150 · Express Entry: CAD $1,365 principal'},
    ]},
   ],svc:'Work Visa Processing'},
  {flag:'🇩🇪',name:'Germany',tag:'Study · Work · EU Blue Card',visas:['Student Visa','EU Blue Card','Job Seeker Visa','National Work Visa'],
   sections:[
    {h:'Popular Pathways',rows:[
      {l:'Student Visa',v:'Type D national visa. Many programs free or €500/semester admin fee. Blocked account €11,208/year required.'},
      {l:'EU Blue Card',v:'Highly qualified professionals. Salary €43,992+/year. PR in 21 months with B1 German.'},
      {l:'Job Seeker Visa',v:'6 months to search for work. Convert to work visa once employed.'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'Euro (EUR)'},
      {l:'Language',v:'German (many English-taught programmes available)'},
      {l:'Processing',v:'Student: 4–12 weeks · EU Blue Card: 1–3 months'},
      {l:'Visa Fee',v:'€75 for most visa types · EU Blue Card: €100–140'},
    ]},
   ],svc:'Work Visa Processing'},
  {flag:'🇦🇺',name:'Australia',tag:'Study · Work · Working Holiday',visas:['Student Visa 500','Skilled Migration','Working Holiday 417','Graduate Visa 485'],
   sections:[
    {h:'Popular Pathways',rows:[
      {l:'Student Visa 500',v:'Study at CRICOS-registered provider. 48 hrs/fortnight work. Graduate Visa 485 after graduation.'},
      {l:'Working Holiday',v:'18–30 years. Work up to 3 years with regional work requirement.'},
      {l:'Skilled Migration',v:'Points-based system. Invitation to Apply, then permanent residence.'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'Australian Dollar (AUD)'},
      {l:'Language',v:'English'},
      {l:'Processing',v:'Student: 29–40 days · Working Holiday: 1–4 weeks'},
      {l:'Visa Fee',v:'Student: AUD $650 · Working Holiday: AUD $635'},
    ]},
   ],svc:'Student Visa Processing'},
  {flag:'🌍',name:'Schengen Area',tag:'Tourist · Business · Short Stay',visas:['Type C Schengen','Multiple Entry','Business Visa'],
   sections:[
    {h:'About Schengen',rows:[
      {l:'Countries',v:'27 European countries including France, Germany, Italy, Spain, Netherlands, Belgium, and more'},
      {l:'Duration',v:'Up to 90 days in any 180-day period'},
      {l:'Insurance',v:'Min €30,000 medical coverage — MANDATORY'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'Euro (most countries)'},
      {l:'Processing',v:'15 calendar days (can take up to 30–60 days)'},
      {l:'Visa Fee',v:'€80 adults · €40 children (6–12) · Free under 6'},
      {l:'Apply at',v:'Embassy of your main destination country'},
    ]},
   ],svc:'Tourist / Visit Visa'},
  {flag:'🇵🇱',name:'Poland',tag:'EU Direct Employment',visas:['National Work Visa (D)','Seasonal Work Visa','EU Blue Card'],
   sections:[
    {h:'Direct Employment Overview',rows:[
      {l:'In-demand roles',v:'Manufacturing, construction, warehouse, hospitality, agriculture'},
      {l:'Work permit',v:'SkyGlobe arranges employer-sponsored work permit'},
      {l:'Timeline',v:'8–16 weeks from registration to departure'},
      {l:'Language',v:'Polish (basic helpful); most factory jobs need none'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'Polish Zloty (PLN) — approx €0.23 per PLN'},
      {l:'Min wage',v:'Approx PLN 4,300/month gross (2024)'},
      {l:'Work visa',v:'National Visa Type D — sponsored by employer'},
    ]},
   ],svc:'EU Direct Employment'},
  {flag:'🇦🇪',name:'UAE / Dubai',tag:'Work · Tourism · Golden Visa',visas:['Employment Visa','Tourist Visa','Golden Visa','Freelance Permit'],
   sections:[
    {h:'Popular Pathways',rows:[
      {l:'Employment Visa',v:'Sponsored by UAE employer. Employment Pass: salary AED 5,000+/month.'},
      {l:'Tourist Visa',v:'30 or 60 days. Extendable. Available on arrival for many nationalities.'},
      {l:'Golden Visa',v:'5 or 10 years for investors, professionals, and outstanding students.'},
    ]},
    {h:'Key Facts',rows:[
      {l:'Currency',v:'UAE Dirham (AED) — pegged to USD'},
      {l:'Language',v:'Arabic (official); English widely spoken'},
      {l:'Processing',v:'Employment: 2–4 weeks · Tourist: 3–5 days'},
      {l:'Tax',v:'No personal income tax'},
    ]},
   ],svc:'Work Visa Processing'},
];

function showCountryGuide(idx) {
  const c = COUNTRIES[idx];
  const secs = c.sections.map(s => `
    <div class="cg-section">
      <h4>${s.h}</h4>
      ${s.rows.map(r => `<div class="cg-row"><span class="lbl">${r.l}</span><span class="val">${r.v}</span></div>`).join('')}
    </div>`).join('');
  const chips = c.visas.map(v => `<span class="cg-visa-chip">${v}</span>`).join('');
  document.getElementById('countryGuideContent').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1.2rem;border-bottom:1px solid var(--border)">
      <div style="font-size:3.5rem;line-height:1">${c.flag}</div>
      <div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:400">${c.name}</h2>
        <div style="font-size:0.75rem;color:var(--gold);text-transform:uppercase;letter-spacing:0.1em">${c.tag}</div>
        <div style="margin-top:0.4rem">${chips}</div>
      </div>
    </div>
    ${secs}
    <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-top:1.5rem">
      <button class="btn-primary" onclick="closeCountryGuide();applyForService('${c.svc}')">📋 Apply for ${c.name}</button>
      <button onclick="closeCountryGuide();openChecklist('${c.svc}')" style="background:rgba(201,168,76,0.1);border:1px solid var(--border-strong);color:var(--gold-light);padding:12px 20px;border-radius:10px;cursor:pointer;font-size:0.88rem;font-weight:500">📋 Document Checklist</button>
    </div>`;
  document.getElementById('countryGuideOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCountryGuide() {
  document.getElementById('countryGuideOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function initCountryGrid() {
  const grid = document.getElementById('countryGrid');
  if (!grid) return;
  grid.innerHTML = COUNTRIES.map((c,i) => `
    <div class="country-card" onclick="showCountryGuide(${i})">
      <div class="country-card-flag">${c.flag}</div>
      <div class="country-card-body">
        <h3>${c.name}</h3>
        <div class="ctag">${c.tag}</div>
        <div class="cinfo">${c.visas.slice(0,2).join(' · ')}</div>
      </div>
    </div>`).join('');
}

// ── ELIGIBILITY CHECKER ──────────────────────────────────────────────────────
const ELIG_QUESTIONS = {
  goal:{q:'What is your main goal?',opts:[
    {icon:'🎓',label:'Study Abroad',sub:'University or college',val:'study'},
    {icon:'💼',label:'Work Abroad',sub:'Job or career move',val:'work'},
    {icon:'🌴',label:'Travel / Tourism',sub:'Holiday or visit',val:'travel'},
    {icon:'🇪🇺',label:'EU Employment',sub:'Direct job in Europe',val:'eu'},
  ]},
  dest_study:{q:'Which destination interests you?',opts:[
    {icon:'🇬🇧',label:'United Kingdom',sub:'Top universities',val:'UK'},
    {icon:'🇺🇸',label:'USA / Canada',sub:'Ivy League & beyond',val:'USA'},
    {icon:'🇩🇪',label:'Europe (EU)',sub:'Germany, France, etc.',val:'EU'},
    {icon:'🌏',label:'Australia / NZ',sub:'World-class education',val:'AUS'},
  ]},
  dest_work:{q:'Where would you like to work?',opts:[
    {icon:'🇬🇧',label:'United Kingdom',sub:'Skilled Worker Visa',val:'UK'},
    {icon:'🇨🇦',label:'Canada',sub:'Express Entry',val:'Canada'},
    {icon:'🇩🇪',label:'Germany / EU',sub:'EU Blue Card',val:'EU'},
    {icon:'🇦🇺',label:'Australia',sub:'Skilled Migration',val:'AUS'},
  ]},
  dest_travel:{q:'Where are you travelling?',opts:[
    {icon:'🌍',label:'Schengen / Europe',sub:'27 EU countries',val:'Schengen'},
    {icon:'🇺🇸',label:'USA / Canada',sub:'Tourist B-2 / eTA',val:'USA'},
    {icon:'🇦🇪',label:'Middle East',sub:'UAE, Qatar, Saudi',val:'UAE'},
    {icon:'🌏',label:'Asia Pacific',sub:'Japan, Australia, etc.',val:'Asia'},
  ]},
  jobfield:{q:'What is your field of work?',opts:[
    {icon:'🏗️',label:'Construction / Trades',sub:'Building, welding, etc.',val:'construction'},
    {icon:'🏭',label:'Manufacturing',sub:'Factory, production',val:'manufacturing'},
    {icon:'🌱',label:'Agriculture',sub:'Farming, food processing',val:'agriculture'},
    {icon:'🏥',label:'Healthcare / Care',sub:'Nursing, care work',val:'healthcare'},
  ]},
  passport:{q:'Do you have a valid passport?',opts:[
    {icon:'✅',label:'Yes — valid 6+ months',sub:'Ready to apply',val:'yes'},
    {icon:'⏳',label:'Expiring soon',sub:'Less than 6 months',val:'soon'},
    {icon:'❌',label:'No passport yet',sub:'Need to apply first',val:'no'},
  ]},
};

let eligState = {};
let eligFlow = [];
let eligStep = 0;

function openElig(){
  eligState={};eligFlow=[];eligStep=0;
  document.getElementById('eligOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  buildEligFlow();
  renderEligStep();
}
function closeElig(){
  document.getElementById('eligOverlay').classList.remove('open');
  document.body.style.overflow='';
}
function buildEligFlow(){
  const g=eligState.goal;
  eligFlow=['goal'];
  if(g==='study') eligFlow.push('dest_study');
  else if(g==='work') eligFlow.push('dest_work');
  else if(g==='travel') eligFlow.push('dest_travel');
  else if(g==='eu') eligFlow.push('jobfield');
  eligFlow.push('passport','result');
}
function renderEligStep(){
  const total=eligFlow.length;
  const prog=document.getElementById('eligProgress');
  prog.innerHTML=eligFlow.map((_,i)=>`<div class="elig-dot ${i<eligStep?'done':''}"></div>`).join('');
  const key=eligFlow[eligStep];
  const cont=document.getElementById('eligContent');
  if(key==='result'){cont.innerHTML=renderEligResult();return;}
  const step=ELIG_QUESTIONS[key];
  cont.innerHTML=`<h3 class="elig-q">${step.q}</h3>
    <div class="elig-opts">${step.opts.map(o=>`<div class="elig-opt" onclick="pickElig('${key}','${o.val}',this)">
      <span class="elig-opt-icon">${o.icon}</span>
      <span class="elig-opt-label">${o.label}</span>
      <span class="elig-opt-sub">${o.sub}</span>
    </div>`).join('')}</div>
    ${eligStep>0?`<button onclick="eligBack()" style="background:none;border:none;color:var(--muted);font-size:0.82rem;cursor:pointer;padding:0">← Back</button>`:''}`;
}
function pickElig(key,val,el){
  el.closest('.elig-opts').querySelectorAll('.elig-opt').forEach(e=>e.classList.remove('selected'));
  el.classList.add('selected');
  eligState[key]=val;
  if(key==='goal'){buildEligFlow();}
  setTimeout(()=>{eligStep++;renderEligStep();},280);
}
function eligBack(){if(eligStep>0){eligStep--;renderEligStep();}}
function renderEligResult(){
  const g=eligState.goal,dest=eligState.dest_study||eligState.dest_work||eligState.dest_travel||'';
  const passport=eligState.passport||'yes';
  if(passport==='no'){
    return `<div style="text-align:center"><div class="elig-result-badge">⚠️ Passport Required First</div>
      <h3 class="elig-q" style="font-size:1.4rem;margin-bottom:0.8rem">You Need a Valid Passport</h3>
      <p style="color:var(--text-body);font-size:0.9rem;margin-bottom:1.5rem">A valid passport is the first step for any visa application. Our team can guide you through the passport application process.</p>
      <button class="btn-primary" onclick="closeElig();showPage('contact')" style="width:100%">📋 Get Guidance on Passport Application</button>
    </div>`;
  }
  let recs=[];
  if(g==='study'){
    if(dest==='UK') recs=[{icon:'🇬🇧',t:'UK Student Visa (Tier 4)',s:'England, Scotland & Wales',svc:'Student Visa Processing'},{icon:'🏛️',t:'University Admission Assistance',s:'We apply to UK universities for you',svc:'University Admission Assistance'},{icon:'🌟',t:'Scholarship Support',s:'Identify and apply for scholarships',svc:'Scholarship Application Support'}];
    else if(dest==='USA') recs=[{icon:'🇺🇸',t:'USA F-1 Student Visa',s:'Accredited US universities and colleges',svc:'Student Visa Processing'},{icon:'🇨🇦',t:'Canada Study Permit',s:'World-class Canadian universities',svc:'Student Visa Processing'},{icon:'🌟',t:'Scholarship Support',s:'Merit-based and need-based awards',svc:'Scholarship Application Support'}];
    else if(dest==='EU') recs=[{icon:'🇩🇪',t:'Germany Student Visa',s:'Free/low-cost university education',svc:'Student Visa Processing'},{icon:'🌍',t:'Schengen Country Study Visa',s:'France, Netherlands, Sweden & more',svc:'Student Visa Processing'}];
    else recs=[{icon:'🇦🇺',t:'Australia Student Visa (Subclass 500)',s:'CRICOS-registered institutions',svc:'Student Visa Processing'},{icon:'🏛️',t:'University Admission Assistance',s:'Applications to Australian/NZ universities',svc:'University Admission Assistance'}];
  } else if(g==='work'){
    if(dest==='UK') recs=[{icon:'🇬🇧',t:'UK Skilled Worker Visa',s:'Employer-sponsored work in the UK',svc:'Work Visa Processing'}];
    else if(dest==='Canada') recs=[{icon:'🇨🇦',t:'Canada Express Entry',s:'Permanent residence for skilled workers',svc:'Work Visa Processing'},{icon:'🍁',t:'Canada Open Work Permit',s:'Work for any Canadian employer',svc:'Work Visa Processing'}];
    else if(dest==='EU') recs=[{icon:'🇩🇪',t:'Germany EU Blue Card',s:'Highly qualified professionals in Germany',svc:'Work Visa Processing'},{icon:'🇪🇺',t:'EU Direct Employment Programme',s:'Job placement in 14 European countries',svc:'EU Direct Employment'}];
    else recs=[{icon:'🇦🇺',t:'Australia Skilled Migration',s:'Points-based visa for skilled workers',svc:'Work Visa Processing'},{icon:'🏖️',t:'Working Holiday Visa',s:'Live and work in Australia up to 3 years',svc:'Work Visa Processing'}];
  } else if(g==='travel'){
    if(dest==='Schengen') recs=[{icon:'🌍',t:'Schengen Tourist Visa',s:'Travel 27 European countries, up to 90 days',svc:'Tourist / Visit Visa'},{icon:'✈️',t:'Flight Reservation Letter',s:'Official PNR itinerary accepted by all embassies',svc:'Flight Reservation Letter'},{icon:'🛡️',t:'Schengen Travel Insurance',s:'Mandatory €30,000 medical coverage',svc:'Travel Insurance'}];
    else recs=[{icon:'🌴',t:'Tourist / Visit Visa',s:'Professional visa application preparation',svc:'Tourist / Visit Visa'},{icon:'✈️',t:'Flight Reservation Letter',s:'Embassy-accepted flight itinerary, same-day',svc:'Flight Reservation Letter'},{icon:'🏨',t:'Hotel Reservation Letter',s:'Official accommodation proof for embassy',svc:'Hotel Booking / Accommodation Letter'}];
  } else if(g==='eu'){
    recs=[{icon:'🇪🇺',t:'EU Direct Employment Programme',s:'Job offer + work permit + visa — full package',svc:'EU Direct Employment'},{icon:'📋',t:'Document Authentication / Apostille',s:'We authenticate your credentials for EU employers',svc:'Document Authentication / Apostille'}];
  }
  const recsHtml=recs.map(r=>`<div class="elig-rec" onclick="closeElig();applyForService('${r.svc}')">
    <div class="elig-rec-icon">${r.icon}</div>
    <div style="flex:1"><div class="elig-rec-title">${r.t}</div><div class="elig-rec-sub">${r.s}</div></div>
    <span style="color:var(--gold);font-size:1.1rem">→</span>
  </div>`).join('');
  return `<div style="text-align:center;margin-bottom:1.2rem"><div class="elig-result-badge">✅ You're Eligible!</div>
    <h3 class="elig-q" style="font-size:1.35rem;margin-bottom:0.5rem">We Can Help You</h3>
    <p style="color:var(--text-body);font-size:0.87rem">Click any service below to start your application:</p>
  </div>
  <div class="elig-recs">${recsHtml}</div>
  <div style="text-align:center;margin-top:1.2rem">
    <button onclick="eligStep=0;eligState={};eligFlow=[];buildEligFlow();renderEligStep()" style="background:none;border:none;color:var(--muted);font-size:0.82rem;cursor:pointer;padding:0">← Start over</button>
  </div>`;
}

// ── AI ASSISTANT & CHAT WIDGET ────────────────────────────────────────────────
let chatOpen=false,aiGreeted=false,currentChatTab='ai';

function toggleChat(){
  chatOpen=!chatOpen;
  document.getElementById('chatPanel').classList.toggle('open',chatOpen);
  document.getElementById('chatFabIcon').textContent=chatOpen?'✕':'💬';
  document.getElementById('chatBadge').style.display='none';
  if(chatOpen&&!aiGreeted){
    aiGreeted=true;
    setTimeout(()=>addChatMsg('aiMessages',`👋 Hi! I'm SkyGlobe's AI assistant.\n\nI can answer questions about visas, universities, work permits, our services, fees, and more. What would you like to know?`,'bot'),450);
  }
}
function switchChatTab(tab){
  currentChatTab=tab;
  ['ai','live','send'].forEach(t=>{
    const c=document.getElementById('chatContent_'+t);
    if(c) c.style.display=t===tab?'flex':'none';
    const b=document.getElementById('chatTab_'+t);
    if(b) b.classList.toggle('active',t===tab);
  });
  if(tab==='live'&&document.getElementById('liveMessages').children.length===0){
    addChatMsg('liveMessages','🕐 Our team is available Mon–Sat, 9am–6pm. Use WhatsApp for instant replies, or send a message below and we\'ll get back to you within a few hours.','bot');
  }
}
function addChatMsg(containerId,text,type){
  const c=document.getElementById(containerId);
  if(!c)return;
  const d=document.createElement('div');
  d.className='chat-msg '+type;
  d.innerHTML=text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  c.appendChild(d);
  c.scrollTop=c.scrollHeight;
}
let aiChatHistory=[];
async function askAI(preset){
  const inp=document.getElementById('aiInput');
  const q=(preset||(inp?inp.value.trim():'')).trim();
  if(!q)return;
  if(inp)inp.value='';
  document.getElementById('aiSugs').style.display='none';
  addChatMsg('aiMessages',q,'user');
  const typing=document.createElement('div');
  typing.className='chat-msg bot';typing.id='aiTyping';
  typing.innerHTML='<span style="display:inline-flex;gap:4px;align-items:center"><span style="width:7px;height:7px;border-radius:50%;background:var(--gold);animation:aiDot 1.2s infinite 0s"></span><span style="width:7px;height:7px;border-radius:50%;background:var(--gold);animation:aiDot 1.2s infinite 0.2s"></span><span style="width:7px;height:7px;border-radius:50%;background:var(--gold);animation:aiDot 1.2s infinite 0.4s"></span></span>';
  document.getElementById('aiMessages').appendChild(typing);
  document.getElementById('aiMessages').scrollTop=99999;
  try{
    const r=await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:q,history:aiChatHistory})
    });
    const data=await r.json();
    document.getElementById('aiTyping')?.remove();
    if(!r.ok||data.error){
      addChatMsg('aiMessages',data.error||'Something went wrong. Please WhatsApp us at +1 737-399-8522.','bot');
    }else{
      aiChatHistory.push({role:'user',content:q});
      aiChatHistory.push({role:'assistant',content:data.reply});
      if(aiChatHistory.length>20)aiChatHistory=aiChatHistory.slice(-20);
      addChatMsg('aiMessages',data.reply,'bot');
    }
  }catch(e){
    document.getElementById('aiTyping')?.remove();
    addChatMsg('aiMessages','Network error. Please check your connection or WhatsApp us at +1 737-399-8522.','bot');
  }
}
async function sendChatMsg(){
  const name=document.getElementById('chatSendName').value.trim();
  const email=document.getElementById('chatSendEmail').value.trim();
  const msg=document.getElementById('chatSendMsg').value.trim();
  const res=document.getElementById('chatSendRes');
  if(!name||!email||!msg){res.style.color='#e57373';res.textContent='Please fill all fields.';return;}
  res.style.color='var(--muted)';res.textContent='Sending…';
  try{
    const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fname:name,email,service:'General Enquiry',message:msg})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Failed');
    res.style.color='#66bb6a';res.textContent='✅ Sent! We\'ll reply within a few hours.';
    document.getElementById('chatSendName').value='';
    document.getElementById('chatSendEmail').value='';
    document.getElementById('chatSendMsg').value='';
  }catch(e){res.style.color='#e57373';res.textContent='Error: '+e.message;}
}

function printApp(cardId) {
  const data = (window.__printApps || {})[cardId];
  if (!data) return;
  const { app, responses, date } = data;
  const esc = v => String(v == null ? '' : v).replace(/</g, '&lt;');
  const row = (label, val) => val ? `<tr><td>${label}</td><td>${esc(val)}</td></tr>` : '';
  const logo = location.origin + '/logo.png';
  const w = window.open('', '_blank', 'width=860,height=760');
  w.document.write(`<!DOCTYPE html><html><head><title>SkyGlobe Limited — Official Application Document</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    body { font-family:'Outfit',sans-serif; background:#fff; color:#1a1a1a; }
    .page { position:relative; background:#fffdf8; max-width:820px; min-height:1080px; margin:0 auto; display:flex; flex-direction:column; overflow:hidden; }
    .frame { position:absolute; inset:14px; border:1.5px solid #c9a84c55; pointer-events:none; z-index:2; }
    .frame::before { content:''; position:absolute; inset:4px; border:0.5px solid #c9a84c33; }
    .corner { position:absolute; width:46px; height:46px; z-index:3; pointer-events:none; }
    .corner::before, .corner::after { content:''; position:absolute; background:#c9a84c; }
    .corner::before { width:100%; height:3px; }
    .corner::after { width:3px; height:100%; }
    .c-tl { top:14px; left:14px; } .c-tr { top:14px; right:14px; transform:scaleX(-1); }
    .c-bl { bottom:14px; left:14px; transform:scaleY(-1); } .c-br { bottom:14px; right:14px; transform:scale(-1); }
    .watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:0; pointer-events:none; }
    .watermark img { width:62%; opacity:0.055; filter:grayscale(35%); }
    .lh-header { position:relative; z-index:4; background:#0a1628; margin:14px 14px 0; padding:24px 44px 20px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
    .lh-header::after { content:''; position:absolute; left:0; right:0; bottom:-9px; height:9px; background:linear-gradient(90deg,#8a6f2a,#c9a84c 30%,#f0d98c 50%,#c9a84c 70%,#8a6f2a); }
    .lh-header img { height:76px; width:auto; border-radius:10px; }
    .co { text-align:right; color:#fff; }
    .co .name { font-family:'Cormorant Garamond',serif; font-size:1.7rem; font-weight:700; letter-spacing:0.08em; }
    .co .name span { color:#c9a84c; }
    .co .tag { font-size:0.68rem; color:#9badd1; letter-spacing:0.22em; text-transform:uppercase; margin-top:4px; }
    .co .tag2 { font-size:0.64rem; color:#c9a84c; letter-spacing:0.12em; margin-top:3px; font-style:italic; }
    .lh-body { position:relative; z-index:4; flex:1; padding:36px 60px; font-size:0.9rem; }
    .doc-title { text-align:center; font-family:'Cormorant Garamond',serif; font-size:1.45rem; font-weight:700; color:#0a1628; letter-spacing:0.14em; text-transform:uppercase; }
    .doc-sub { text-align:center; font-size:0.7rem; color:#8a6f2a; letter-spacing:0.2em; text-transform:uppercase; margin:4px 0 22px; }
    .ref-bar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:#0a162808; border:1px solid #c9a84c44; border-radius:8px; padding:12px 18px; margin-bottom:20px; }
    .ref-bar .ref { font-family:'Cormorant Garamond',serif; font-size:1.5rem; color:#8a6f2a; font-weight:700; letter-spacing:0.05em; }
    .ref-bar .lbl { font-size:0.65rem; color:#777; text-transform:uppercase; letter-spacing:0.12em; }
    .badge { display:inline-block; border-radius:20px; padding:5px 16px; font-size:0.8rem; font-weight:600; background:#0a1628; color:#c9a84c; border:1px solid #c9a84c; }
    table { width:100%; border-collapse:collapse; }
    td { padding:7px 8px; border-bottom:1px solid #e8e2d2; font-size:0.86rem; }
    td:first-child { color:#777; width:175px; font-size:0.76rem; text-transform:uppercase; letter-spacing:0.06em; }
    td:last-child { font-weight:500; color:#1a1a1a; }
    .notes-box { margin-top:14px; padding:12px 16px; background:#faf6ea; border-radius:8px; border-left:3px solid #c9a84c; font-size:0.85rem; color:#374151; }
    .msg-title { font-size:0.7rem; color:#8a6f2a; text-transform:uppercase; letter-spacing:0.12em; margin:18px 0 8px; }
    .msg { padding:10px 14px; background:#faf6ea; border-radius:8px; border-left:3px solid #c9a84c; margin-bottom:8px; font-size:0.85rem; line-height:1.6; }
    .msg .d { font-size:0.68rem; color:#999; margin-bottom:4px; }
    .lh-footer { position:relative; z-index:4; background:#0a1628; margin:0 14px 14px; padding:14px 44px; color:#9badd1; font-size:0.7rem; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; align-items:center; }
    .lh-footer::before { content:''; position:absolute; left:0; right:0; top:-9px; height:9px; background:linear-gradient(90deg,#8a6f2a,#c9a84c 30%,#f0d98c 50%,#c9a84c 70%,#8a6f2a); }
    .lh-footer span strong { color:#c9a84c; margin-right:4px; }
    .lh-footer .motto { width:100%; text-align:center; font-family:'Cormorant Garamond',serif; font-style:italic; font-size:0.8rem; color:#c9a84c; border-bottom:1px solid #1e3a6e; padding-bottom:7px; margin-bottom:2px; letter-spacing:0.06em; }
    .print-note { max-width:820px; margin:10px auto; font-size:0.74rem; color:#777; text-align:center; }
    @media print { .print-note { display:none; } .page { max-width:none; min-height:100vh; } @page { margin:0; size:A4; } }
  </style></head><body>
  <div class="print-note">⚠️ In the print window, click <strong>More settings → Background graphics</strong> to print the official letterhead design.</div>
  <div class="page">
    <div class="frame"></div>
    <div class="corner c-tl"></div><div class="corner c-tr"></div><div class="corner c-bl"></div><div class="corner c-br"></div>
    <div class="watermark"><img src="${logo}" alt=""></div>
    <div class="lh-header">
      <img src="${logo}" alt="SkyGlobe Limited">
      <div class="co">
        <div class="name">SKY<span>GLOBE</span> LIMITED</div>
        <div class="tag">Global Travel · Immigration · Education</div>
        <div class="tag2">Your Gateway to Global Opportunity</div>
      </div>
      <div style="text-align:center;margin-left:8px">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&bgcolor=0a1628&color=c9a84c&data=${encodeURIComponent('https://skyglobegroup.com/?ref='+esc(app.ref))}" alt="QR" style="border-radius:6px;width:72px;height:72px;display:block" onerror="this.style.display='none'">
        <div style="font-size:0.52rem;color:#9badd1;margin-top:3px;letter-spacing:0.08em">VERIFY ONLINE</div>
      </div>
    </div>
    <div class="lh-body">
      <div class="doc-title">Official Application Record</div>
      <div class="doc-sub">This document certifies receipt of the application below</div>
      <div class="ref-bar">
        <div><div class="lbl">Application Reference</div><div class="ref">${esc(app.ref)}</div><div class="lbl" style="margin-top:3px">Submitted: ${esc(date)}</div></div>
        <div style="text-align:right"><span class="badge">${esc(app.status)}</span><div class="lbl" style="margin-top:6px">Service: <strong style="color:#1a1a1a">${esc(app.service || '—')}</strong></div></div>
      </div>
      <table>
        ${row('Full Name', [app.fname, app.lname].filter(Boolean).join(' '))}
        ${row('Email', app.email)}
        ${row('Phone', app.phone)}
        ${row('Nationality', app.nationality)}
        ${row('Date of Birth', app.dob)}
        ${row('Passport No.', app.passport)}
        ${row('Passport Expiry', app.passportExpiry || app.passport_expiry)}
        ${row('Destination', app.destination)}
        ${row('Travel Date', app.travelDate || app.travel_date)}
        ${row('Duration', app.duration)}
        ${row('Purpose', app.purpose)}
        ${row('Institution', app.institution)}
        ${row('Employer', app.employer)}
        ${row('Hotel City', app.hotelCity || app.hotel_city)}
        ${row('Check-in', app.checkin)}
        ${row('Check-out', app.checkout)}
        ${row('Coverage', app.coverage)}
        ${row('Document Type', app.docType || app.doc_type)}
        ${row('Scholarship', app.scholarship)}
      </table>
      ${app.notes ? `<div class="notes-box"><strong style="font-size:0.72rem;color:#8a6f2a;text-transform:uppercase;letter-spacing:0.08em">Notes</strong><br>${esc(app.notes)}</div>` : ''}
      ${responses && responses.length ? `<div class="msg-title">Messages From Our Team</div>` + responses.map(r => `<div class="msg"><div class="d">${r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>${esc(r.message).replace(/\\n/g, '<br>')}</div>`).join('') : ''}
      <p style="margin-top:20px;font-size:0.76rem;color:#777;line-height:1.7">This is an official record issued by SkyGlobe Limited confirming the above application. Please quote your reference number in all correspondence. For enquiries contact us using the details below.</p>
    </div>
    <div class="lh-footer">
      <div class="motto">“Turning international ambitions into lived realities”</div>
      <span><strong>✉</strong> support@skyglobegroup.com</span>
      <span><strong>☎</strong> +1 737-399-8522</span>
      <span><strong>⌂</strong> 123 Fifth Avenue, New York, NY 10011</span>
      <span><strong>🌐</strong> skyglobegroup.com</span>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);}<\/script>
  </body></html>`);
  w.document.close();
}

// ── REAL 3D GLOBE ─────────────────────────────────────────────────────
function initGlobe(){
  const el=document.getElementById('globeContainer');
  if(!el||typeof Globe==='undefined')return;
  const size=el.offsetWidth||560;
  const globe=Globe()(el);

  const continentLabels=[
    {lat:45,lng:-100,text:'North America'},
    {lat:-15,lng:-55,text:'South America'},
    {lat:52,lng:20,text:'Europe'},
    {lat:10,lng:22,text:'Africa'},
    {lat:35,lng:90,text:'Asia'},
    {lat:-25,lng:135,text:'Australia'},
    {lat:-75,lng:0,text:'Antarctica'},
  ];

  const cities=[
    {lat:40.71,lng:-74.0,label:'🗽 New York (HQ)',color:'#b8860b'},
    {lat:51.5,lng:-0.12,label:'🇬🇧 London',color:'#d4a017'},
    {lat:48.85,lng:2.35,label:'🇫🇷 Paris',color:'#b8860b'},
    {lat:52.23,lng:21.01,label:'🇵🇱 Warsaw',color:'#d4a017'},
    {lat:25.2,lng:55.27,label:'🇦🇪 Dubai',color:'#b8860b'},
    {lat:6.46,lng:3.39,label:'🇳🇬 Lagos',color:'#d4a017'},
    {lat:-33.87,lng:151.21,label:'🇦🇺 Sydney',color:'#b8860b'},
    {lat:1.35,lng:103.82,label:'🇸🇬 Singapore',color:'#d4a017'},
    {lat:28.63,lng:77.22,label:'🇮🇳 New Delhi',color:'#b8860b'},
    {lat:-1.29,lng:36.82,label:'🇰🇪 Nairobi',color:'#d4a017'},
    {lat:35.68,lng:139.69,label:'🇯🇵 Tokyo',color:'#b8860b'},
    {lat:37.57,lng:126.97,label:'🇰🇷 Seoul',color:'#d4a017'},
    {lat:38.72,lng:-9.14,label:'🇵🇹 Lisbon',color:'#b8860b'},
    {lat:56.95,lng:24.11,label:'🇱🇻 Riga',color:'#d4a017'},
  ];

  globe
    .width(size).height(size)
    .backgroundColor('rgba(0,0,0,0)')
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .atmosphereColor('#b8860b')
    .atmosphereAltitude(0.22)
    .arcsData([
      {startLat:40.71,startLng:-74.0,endLat:51.5,endLng:-0.12,color:'#b8860b'},
      {startLat:51.5,startLng:-0.12,endLat:48.85,endLng:2.35,color:'#d4a017'},
      {startLat:40.71,startLng:-74.0,endLat:52.23,endLng:21.01,color:'#b8860b'},
      {startLat:40.71,startLng:-74.0,endLat:-33.87,endLng:151.21,color:'#d4a017'},
      {startLat:51.5,startLng:-0.12,endLat:25.2,endLng:55.27,color:'#b8860b'},
      {startLat:6.46,startLng:3.39,endLat:40.71,endLng:-74.0,color:'#d4a017'},
      {startLat:6.46,startLng:3.39,endLat:51.5,endLng:-0.12,color:'#b8860b'},
      {startLat:1.35,startLng:103.82,endLat:40.71,endLng:-74.0,color:'#d4a017'},
      {startLat:28.63,startLng:77.22,endLat:51.5,endLng:-0.12,color:'#b8860b'},
      {startLat:-1.29,startLng:36.82,endLat:48.85,endLng:2.35,color:'#d4a017'},
      {startLat:35.68,startLng:139.69,endLat:40.71,endLng:-74.0,color:'#b8860b'},
      {startLat:37.57,startLng:126.97,endLat:51.5,endLng:-0.12,color:'#d4a017'},
      {startLat:38.72,startLng:-9.14,endLat:6.46,endLng:3.39,color:'#b8860b'},
      {startLat:56.95,startLng:24.11,endLat:6.46,endLng:3.39,color:'#d4a017'},
    ])
    .arcColor('color')
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.6)
    .pointsData(cities)
    .pointColor('color')
    .pointAltitude(0.05)
    .pointRadius(0.5)
    .pointLabel('label')
    .labelsData(continentLabels)
    .labelLat('lat')
    .labelLng('lng')
    .labelText('text')
    .labelSize(1.4)
    .labelColor(()=>'rgba(230,201,122,0.85)')
    .labelResolution(2)
    .labelAltitude(0.02)
    .labelDotRadius(0);

  globe.controls().autoRotate=true;
  globe.controls().autoRotateSpeed=0.5;
  globe.controls().enableZoom=false;
  window.addEventListener('resize',()=>{
    const w=el.offsetWidth;
    globe.width(w).height(w);
  });
}
// Wait for globe.gl to load
if(typeof Globe!=='undefined'){initGlobe();}
else{window.addEventListener('load',initGlobe);}
</script>

<!-- ===== ELIGIBILITY CHECKER OVERLAY ===== -->
<div class="elig-overlay" id="eligOverlay" onclick="if(event.target===this)closeElig()">
  <div class="elig-modal">
    <button onclick="closeElig()" style="position:absolute;top:1rem;right:1.2rem;background:none;border:none;color:var(--muted);font-size:1.6rem;cursor:pointer;line-height:1">×</button>
    <div class="section-tag">Eligibility Checker</div>
    <div class="elig-progress" id="eligProgress"></div>
    <div id="eligContent"></div>
  </div>
</div>

<!-- ===== CHAT WIDGET ===== -->
<button class="chat-fab" id="chatFab" onclick="toggleChat()" title="Chat with us · AI Assistant">
  <span id="chatFabIcon">💬</span>
  <div class="chat-badge" id="chatBadge">1</div>
</button>

<div class="chat-panel" id="chatPanel">
  <!-- Header -->
  <div class="chat-head">
    <div class="chat-head-info">
      <div class="chat-avatar">🌐</div>
      <div class="chat-status">
        <div class="cname">SkyGlobe Support</div>
        <div class="online">AI + Live Team</div>
      </div>
    </div>
    <button onclick="toggleChat()" style="background:none;border:none;color:var(--muted);font-size:1.5rem;cursor:pointer;line-height:1;padding:4px">×</button>
  </div>
  <!-- Tabs -->
  <div class="chat-tabs">
    <button class="chat-tab active" id="chatTab_ai" onclick="switchChatTab('ai')">🤖 AI Assistant</button>
    <button class="chat-tab" id="chatTab_live" onclick="switchChatTab('live')">👥 Live Support</button>
    <button class="chat-tab" id="chatTab_send" onclick="switchChatTab('send')">✉️ Message Us</button>
  </div>

  <!-- AI Tab -->
  <div id="chatContent_ai" style="display:flex;flex-direction:column">
    <div class="chat-sugs" id="aiSugs">
      <span class="chat-sug" onclick="askAI('How do I apply for a student visa?')">Student visa</span>
      <span class="chat-sug" onclick="askAI('How long does processing take?')">Processing time</span>
      <span class="chat-sug" onclick="askAI('Tell me about EU Direct Employment')">EU Jobs</span>
      <span class="chat-sug" onclick="askAI('How much do your services cost?')">Fees & cost</span>
    </div>
    <div class="chat-body" id="aiMessages"></div>
    <div class="chat-footer">
      <input class="chat-input" id="aiInput" placeholder="Ask me anything about visas, travel…" onkeypress="if(event.key==='Enter')askAI()">
      <button class="chat-send-btn" onclick="askAI()">Send</button>
    </div>
  </div>

  <!-- Live Support Tab -->
  <div id="chatContent_live" style="display:none;flex-direction:column">
    <div class="chat-body" id="liveMessages"></div>
    <div style="padding:12px 14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px">
      <a href="https://wa.me/17373998522" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:white;padding:13px;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.88rem">💬 Chat on WhatsApp — Instant Reply</a>
      <button class="chat-send-btn" style="width:100%;padding:11px;border-radius:10px;font-size:0.85rem" onclick="switchChatTab('send')">✉️ Send Us a Message Instead</button>
    </div>
  </div>

  <!-- Message Tab -->
  <div id="chatContent_send" style="display:none;flex-direction:column">
    <div style="padding:16px;display:flex;flex-direction:column;gap:8px">
      <p style="font-size:0.8rem;color:var(--muted);margin:0 0 4px">We reply within a few hours Mon–Sat.</p>
      <input id="chatSendName" class="chat-input" style="width:100%" placeholder="Your full name">
      <input id="chatSendEmail" class="chat-input" style="width:100%" placeholder="Your email address">
      <textarea id="chatSendMsg" class="chat-input" style="width:100%;height:90px;resize:none" placeholder="How can we help you?"></textarea>
      <button class="chat-send-btn" style="width:100%;padding:12px;border-radius:10px" onclick="sendChatMsg()">Send Message →</button>
      <div id="chatSendRes" style="font-size:0.8rem;text-align:center;min-height:18px"></div>
    </div>
  </div>
</div>

</body>
</html>
