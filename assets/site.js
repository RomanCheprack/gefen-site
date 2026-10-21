/* Shared behavior for every page: config values, nav, analytics, popovers. */
(function(){
  "use strict";
  const S = window.SITE || {};
  const brand = S.brand || "בודק תוכניות גפ״ן";

  /* ---- analytics ---- */
  window.track = function(name, props){
    try{
      if(window.goatcounter && window.goatcounter.count) window.goatcounter.count({path:"event-"+name+(props&&props.id?"-"+props.id:""), title:name, event:true});
      if(window.plausible) window.plausible(name,{props:props||{}});
      if(window.gtag) window.gtag("event",name,props||{});
    }catch(e){}
  };
  const A = S.analytics || {};
  function addScript(src, attrs){ const s=document.createElement("script"); s.async=true; s.src=src; Object.entries(attrs||{}).forEach(([k,v])=>s.setAttribute(k,v)); document.head.appendChild(s); }
  if(A.provider==="goatcounter" && A.id) addScript("https://gc.zgo.at/count.js",{"data-goatcounter":`https://${A.id}.goatcounter.com/count`});
  if(A.provider==="plausible" && A.id){ window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}; addScript("https://plausible.io/js/script.js",{"data-domain":A.id}); }
  if(A.provider==="ga4" && A.id){ window.dataLayer=window.dataLayer||[]; window.gtag=function(){dataLayer.push(arguments)}; gtag("js",new Date()); gtag("config",A.id); addScript("https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(A.id)); }

  /* ---- booking link: bookingUrl, else WhatsApp with a ready message ---- */
  const waLink = (text) => S.whatsapp ? `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(text||"")}` : "";
  window.SITE_LINKS = {
    booking: S.bookingUrl || waLink("היי, הגעתי מבודק התוכניות ואשמח לקבוע זום של 20 דקות"),
    whatsapp: waLink("היי, הגעתי מהאתר"),
    wa: waLink
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-brand]").forEach(el => el.textContent = brand);
    document.querySelectorAll("[data-cfg]").forEach(el => {
      const k = el.dataset.cfg, v = S[k];
      if(v) el.textContent = v; else if(el.dataset.empty!==undefined) el.closest("[data-hide-empty]")?.setAttribute("hidden","");
    });
    document.querySelectorAll("[data-book]").forEach(a => {
      a.dataset.bound = "1";
      const url = window.SITE_LINKS.booking;
      if(url){ a.href = url; a.target = "_blank"; a.rel = "noopener"; }
      else { a.href = "contact.html"; }
      a.addEventListener("click", () => track("book_click",{from:a.dataset.book||location.pathname}));
    });
    document.querySelectorAll("[data-wa]").forEach(a => { const u=window.SITE_LINKS.whatsapp; if(u){a.href=u;a.target="_blank";a.rel="noopener";} else a.closest("[data-hide-empty]")?.setAttribute("hidden",""); });
    document.querySelectorAll("[data-mail]").forEach(a => { if(S.email){a.href="mailto:"+S.email;a.textContent=S.email;} else a.closest("[data-hide-empty]")?.setAttribute("hidden",""); });
    document.querySelectorAll("[data-updated]").forEach(el => { el.textContent = S.dataUpdated ? `הנתונים עודכנו: ${S.dataUpdated}` : "הנתונים מתוך מאגר התוכניות של משרד החינוך לשנת תשפ״ז"; });
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

    /* active nav + mobile menu */
    const here = (location.pathname.split("/").pop() || "index.html");
    document.querySelectorAll(".nav a[href]").forEach(a => { if(a.getAttribute("href")===here) a.setAttribute("aria-current","page"); });
    const tg = document.querySelector(".menu-toggle"), nav = document.querySelector(".nav");
    if(tg && nav) tg.addEventListener("click", () => { const open = nav.classList.toggle("open"); tg.setAttribute("aria-expanded", open); });

    initPopovers();
  });

  /* ---- info popovers: <button class="info" data-tip="..."> ---- */
  function initPopovers(){
    const pop = document.createElement("div"); pop.className="pop"; pop.setAttribute("role","tooltip"); pop.hidden=true; document.body.appendChild(pop);
    let owner=null;
    function close(){ pop.hidden=true; if(owner) owner.setAttribute("aria-expanded","false"); owner=null; }
    function open(btn){
      owner=btn; btn.setAttribute("aria-expanded","true");
      pop.textContent = btn.dataset.tip; pop.hidden=false;
      const r=btn.getBoundingClientRect(), pw=Math.min(300, innerWidth-32);
      pop.style.width=pw+"px";
      let left = r.left + r.width/2 - pw/2; left=Math.max(16,Math.min(left, innerWidth-pw-16));
      let top = r.bottom + 8; const ph=pop.offsetHeight;
      if(top+ph > innerHeight-8) top = r.top - ph - 8;
      pop.style.left=left+"px"; pop.style.top=top+"px";
    }
    document.addEventListener("click", e => {
      const b = e.target.closest("button.info");
      if(b){ e.preventDefault(); e.stopPropagation(); if(owner===b) close(); else open(b); return; }
      if(!e.target.closest(".pop")) close();
    }, true);
    document.addEventListener("keydown", e => { if(e.key==="Escape") close(); });
    addEventListener("scroll", close, {passive:true}); addEventListener("resize", close);
  }
  window.infoBtn = (tip, label) => `<button type="button" class="info" aria-label="${label||"הסבר"}" aria-expanded="false" data-tip="${String(tip).replace(/"/g,"&quot;")}">i</button>`;
})();
