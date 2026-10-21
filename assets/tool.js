/* בודק תוכניות גפ״ן: search, report, calculator, niche map, personal links, onboarding tour. */
(function(){
"use strict";
const S = window.SITE || {};
const ANNUAL_MIN = S.annualMin || 20;
const NEXT_TENDER = S.nextTender || "";
const MAX_PRICE = {plain:504, materials:756, lecture:403}; // לשעה כולל מע"מ, נספח 1 למכרז 13/3.2022
const STAGES = ["גן ילדים","יסודי","חט\"ב","עליונה"];
const NOSTAGE = "ללא שלב חינוך";
const ROWS = [...STAGES, NOSTAGE];
const SECTORS = ["יהודי","ערבי","דרוזי","בדואי","צרקסי"];
const SUPS = ["ממלכתי","ממלכתי דתי","חרדי"];
const SESS = {"1":"מפגש חד פעמי","3-5":"3 עד 5 מפגשים","6+":"6 מפגשים ומעלה"};
const STATUS = {ok:["חזק","s-ok"],warn:["אפשר לחזק","s-warn"],bad:["פוגע במכירה","s-bad"],q:["לבירור","s-q"],na:["טרם נבדק","s-na"]};
const CHECKS = [
  {id:1,t:"תועלות או מאפיינים",tip:"האם הדף מדבר במה שישתנה אצל התלמידים ובבית הספר, או רק במה שקורה בתוכנית. סימן לבעיה: ״10 מפגשים של רובוטיקה״ במקום ״פחות נשירה, יותר שייכות״."},
  {id:2,t:"שפת המכרז בתת-הסל",tip:"האם הדף משתמש בניסוחים ובמטרות שהמכרז מגדיר לתת-הסל של התוכנית. אלה המילים שהמשרד כתב, ושהמנהלת מחפשת."},
  {id:3,t:"הכאב של המנהלת",tip:"האם הדף מזכיר בעיה שהמנהלת מנסה לפתור בבית הספר. בלי בעיה, אין סיבה לקנות."},
  {id:4,t:"שם ותקציר",tip:"האם השם ספציפי, והאם השורה הראשונה של התקציר אומרת למה לבחור דווקא בתוכנית הזו."},
  {id:5,t:"נכנס למשבצת קיימת",tip:"האם ברור לאיזו שכבה התוכנית מיועדת, באיזו מסגרת זמן, ואיך היא נכנסת למערכת השעות."},
  {id:6,t:"מבנה",tip:"מה המנהלת יכולה לקנות ממך לפי הכרטיס בגפ״ן: מפגש חד פעמי, 3 עד 5 מפגשים, או 6 ומעלה. ״6 ומעלה״ הוא רק הקטגוריה הגבוהה בטופס, ולא אומר שהתוכנית שנתית."}
];
const CTA = {
  short:{ title:"בוא נהפוך את זה לתוכנית שנתית", text:"בזום של 20 דקות נבנה מהתוכנית הזו הצעה שנתית למנהלת. תצא עם דף הצעה של עמוד אחד שתוכל לשלוח כבר מחר.", label:"לקביעת זום של 20 דקות", sticky:"בית ספר אחד בשנתי שווה לך עוד" },
  annual:{ title:"יש לך כבר תוכנית שנתית. עכשיו צריך שיותר בתי ספר יקנו אותה", text:"בשיחה קצרה נבדוק אילו בתי ספר כבר מכירים אותך ומה להציע להם, כדי שהתוכנית השנתית תעבוד ביותר מקומות.", label:"לקביעת שיחה", sticky:"כל בית ספר נוסף בשנתי שווה לך" }
};

let P=[], SAMPLES={}, TENDER={}, SUBS=[], byId={};
const $ = s=>document.querySelector(s);
const esc = s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ils = n=>"₪"+Math.round(n).toLocaleString("he-IL");
const norm = s=>String(s).toLowerCase().replace(/["'״׳\-–]/g,"").replace(/\s+/g," ").trim();
const store = { get(k){try{return localStorage.getItem(k)}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}} };
const pid = p => p.id!=null && p.id!=="" ? String(p.id) : "r"+p.i;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const info = (tip,label) => window.infoBtn(tip,label);
const track = (n,pr) => window.track && window.track(n,pr);

/* ================= load ================= */
Promise.all(["data/index.json","data/samples.json","data/tender.json"].map(u=>fetch(u).then(r=>{ if(!r.ok) throw new Error(u); return r.json(); })))
.then(([p,s,t])=>{
  P=p; SAMPLES=s; TENDER=t;
  P.forEach((x,i)=>{ x.i=i; x._k=norm(x.n+" "+x.o+" "+(x.id||"")); byId[pid(x)]=x; });
  const c={}; P.forEach(x=>x.sb.forEach(b=>c[b]=(c[b]||0)+1)); SUBS=Object.entries(c).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  init();
}).catch(()=>{ $("#loading").innerHTML='לא הצלחנו לטעון את מאגר התוכניות. רענן את הדף. אם פתחת את הקובץ ישירות מהמחשב, הוא יעבוד רק אחרי העלאה ל-GitHub Pages או דרך שרת מקומי.'; $("#loading").classList.add("err"); });

const SHARDS=32, shardCache={};
function ensureDetails(p){
  if(p.own || p.sm!==undefined) return Promise.resolve(p);
  const k=Number(p.id)%SHARDS;
  shardCache[k] = shardCache[k] || fetch(`data/details/${k}.json`).then(r=>{ if(!r.ok) throw new Error("details"); return r.json(); });
  return shardCache[k].then(s=>{ const d=s[p.id]||{}; p.sm=d.sm||""; p.gl=d.gl||""; p.sk=d.sk||[]; p.ai=d.ai||null; return p; });
}
const sampleOf = p => p.own ? null : (p.ai || SAMPLES[pid(p)] || null);
function init(){
  $("#q").disabled=false;
  $("#samples").innerHTML = Object.keys(SAMPLES).filter(k=>byId[k]).map(k=>{const p=byId[k];return `<button class="ex" data-id="${esc(pid(p))}" title="${esc(p.o)}">${esc(p.n.split(/[:\-–]/)[0].trim())}</button>`}).join("");
  $("#samples").addEventListener("click",e=>{const b=e.target.closest("[data-id]"); if(b) openProgram(byId[b.dataset.id]);});
  initOwn(); initMap();
  $("#report").innerHTML = emptyState();
  route();
  addEventListener("hashchange", route);
  if(!location.hash) setTimeout(()=>startTour("search"), 400);
}
function emptyState(){ return `<p class="pending" style="border-style:solid">הבדיקה תופיע כאן אחרי שתבחר תוכנית. אפשר להתחיל מאחת התוכניות לדוגמה.</p>`; }
function route(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(h.startsWith("p-") && byId[h.slice(2)]){ showTab("check"); openProgram(byId[h.slice(2)],{fromRoute:true}); }
  else if(h.startsWith("org-")){ showTab("check"); openOrg(h.slice(4)); }
  else if(h==="map"){ showTab("map"); }
}
function setHash(h){ try{ history.replaceState(null,"",h?("#"+h):location.pathname); }catch(e){} }

/* ================= tabs ================= */
function showTab(name){
  ["check","map"].forEach(n=>{ $("#tab-"+n).setAttribute("aria-selected", n===name); $("#view-"+n).hidden = n!==name; });
  $("#stickybar").classList.remove("on");
  if(name==="map"){ renderMap(); track("map_open"); }
}
$("#tab-check").onclick=()=>{ showTab("check"); if(current&&!current.own) setHash("p-"+pid(current)); else setHash(""); };
$("#tab-map").onclick=()=>{ mapFocus=null; showTab("map"); setHash("map"); };

/* ================= search ================= */
const q=$("#q"), res=$("#results");
let searchTimer;
q.addEventListener("input",()=>{
  const v=norm(q.value);
  if(v.length<2){res.hidden=true;return;}
  const words=v.split(" ");
  const hits=P.filter(p=>words.every(w=>p._k.includes(w))).sort((a,b)=>b.rv-a.rv);
  const orgs={}; hits.forEach(p=>{ if(p.o) orgs[p.o]=(orgs[p.o]||0)+1; });
  const orgRows=Object.keys(orgs).filter(o=>norm(o).includes(v)).map(o=>[o,P.filter(p=>p.o===o).length]).filter(x=>x[1]>1).slice(0,2);
  res.innerHTML = (orgRows.map(([o,n])=>`<button class="orgrow" data-org="${esc(o)}">כל ${n} התוכניות של ${esc(o)}</button>`).join("")) +
    (hits.length ? hits.slice(0,12).map(p=>`<button data-id="${esc(pid(p))}">${esc(p.n)}<span class="org">${esc(p.o)}${p.id?`, מספר ${esc(p.id)}`:""}</span></button>`).join("") : `<div class="empty">לא נמצאה תוכנית. בדוק את האיות, או הדבק את הטקסט דרך ״התוכנית שלי עוד לא במאגר״.</div>`);
  res.hidden=false;
  clearTimeout(searchTimer); searchTimer=setTimeout(()=>track("search",{q:q.value.trim(),hits:hits.length}),1200);
});
q.addEventListener("focus",()=>{ if(tour&&tour.name==="search") endTour(true); });
res.addEventListener("click",e=>{
  const o=e.target.closest("[data-org]"); if(o){ res.hidden=true; q.value=""; openOrg(o.dataset.org); return; }
  const b=e.target.closest("[data-id]"); if(!b) return; res.hidden=true; q.value=""; openProgram(byId[b.dataset.id]);
});
document.addEventListener("click",e=>{ if(!e.target.closest(".searchbox")) res.hidden=true; });

/* ================= own program ================= */
function initOwn(){
  $("#own-sb").innerHTML = SUBS.map(s=>`<option>${esc(s)}</option>`).join("");
  const cbx=(id,vals,labels)=>$(id).innerHTML = vals.map((v,k)=>`<label><input type="checkbox" value="${esc(v)}" id="${id.slice(1)}-${k}"> ${esc(labels?labels[v]:v)}</label>`).join("");
  cbx("#own-st",STAGES); cbx("#own-sc",SECTORS); cbx("#own-ss",Object.keys(SESS),SESS);
  $("#own-toggle").onclick=()=>{const f=$("#own"); f.hidden=!f.hidden; $("#own-toggle").setAttribute("aria-expanded",!f.hidden);};
  $("#own").addEventListener("submit",e=>{
    e.preventDefault();
    const vals=id=>[...document.querySelectorAll(id+" input:checked")].map(x=>x.value);
    const p={i:"own", n:$("#own-name").value.trim()||"התוכנית שלי", o:"", sm:$("#own-sm").value.trim(), gl:"",
      sb:[$("#own-sb").value], st:vals("#own-st"), sc:vals("#own-sc"), sp:[], ss:vals("#own-ss"), sk:[], g:0, rv:0, tg:"תלמידים", own:true};
    if(p.sm.length<20){ $("#report").innerHTML=`<p class="pending err">כדי לבדוק צריך תקציר של לפחות משפט אחד.</p>`; return; }
    openProgram(p);
  });
}

/* ================= checks ================= */
function check6(p){
  const s=p.ss;
  if(!s.length) return {status:"bad",finding:"מספר המפגשים לא מוגדר בכרטיס התוכנית, ולכן המנהלת לא יודעת מה היא יכולה לקנות ממך.",pitch:"להציע למנהלת במפורש שני מסלולים: מפגש היכרות ומסלול שנתי.",gefen:"להגדיר לפחות שני מסלולים: מפגש היכרות ומסלול של 6 מפגשים ומעלה."};
  if(s.length===1 && s[0]==="1") return {status:"bad",finding:"בגפ״ן המנהלת יכולה לקנות ממך רק מפגש חד פעמי. אין לה דרך לבנות איתך תהליך לאורך השנה.",pitch:"לבתי הספר שכבר מכירים אותך: להציע את המפגש שהיה כשלב הראשון בתוכנית שנתית.",gefen:"להוסיף הצעה של 6 מפגשים ומעלה, ולהשאיר את המפגש החד פעמי כנקודת כניסה."};
  if(s.includes("6+")) return {status:"q",finding:`בכרטיס רשום ${s.map(x=>SESS[x]).join(" וגם ")}. זו הקטגוריה הגבוהה ביותר בטופס, והיא כוללת גם תוכנית של 7 מפגשים וגם תוכנית שנתית של 30. מהכרטיס אי אפשר לדעת מה בתי הספר קונים ממך בפועל.`,pitch:"לבדוק כמה מפגשים כל בית ספר קונה ממך בפועל. אם זה פחות משנה מלאה, להציע לבית ספר שכבר מכיר אותך להרחיב לתוכנית שנתית.",gefen:"לכתוב בתקציר במפורש את המסלול השנתי: כמה מפגשים ולאורך כמה זמן."};
  return {status:"warn",finding:"המסלול הארוך ביותר שהמנהלת יכולה לקנות הוא 3 עד 5 מפגשים. זה פחות מתוכנית שנתית.",pitch:"להציע לבתי הספר שסיימו את המסלול הקצר המשך לאורך השנה.",gefen:"להוסיף מסלול של 6 מפגשים ומעלה."};
}
function hint4(p){
  const notes=[];
  if(p.o && norm(p.n)===norm(p.o)) notes.push("שם התוכנית זהה לשם הארגון");
  if(p.sm.length<200) notes.push(`התקציר קצר מאוד (${p.sm.length} תווים, החציון במאגר הוא כ-490)`);
  if(/^[\s\-–]*(התוכנית|התכנית|תוכנית|תכנית)\b/.test(p.sm)) notes.push("התקציר נפתח במילה ״תוכנית״ ולא בתועלת");
  return notes;
}
const tenderFor = p => { const k=p.sb.find(s=>TENDER[s]); return k?{key:k,...TENDER[k]}:null; };
const defMeet = p => p.ss.includes("6+") ? 8 : p.ss.includes("3-5") ? 4 : 1;

/* ================= opportunity ================= */
function oppFor(p){
  const sb=(tenderFor(p)||{}).key || p.sb[0]; if(!sb) return null;
  const pool=P.filter(x=>x.sb.includes(sb));
  const st = p.st.length ? p.st.filter(s=>STAGES.includes(s)) : [NOSTAGE];
  if(!st.length || !p.sc.length) return null;
  const count=(s,sc)=>pool.filter(x=>(s===NOSTAGE?!x.st.length:x.st.includes(s))&&x.sc.includes(sc)).length;
  const cells=[]; st.forEach(s=>SECTORS.forEach(sc=>cells.push({st:s,sc,c:count(s,sc),mine:p.sc.includes(sc)})));
  const mine=cells.filter(c=>c.mine), other=cells.filter(c=>!c.mine);
  const mineAvg=Math.round(mine.reduce((a,c)=>a+c.c,0)/Math.max(1,mine.length));
  const best=(other.length?other:mine).slice().sort((a,b)=>a.c-b.c)[0];
  return {sb,mineAvg,best,expansion:other.length>0,pool:pool.length};
}
function oppText(p,o){
  const where = o.best.st===NOSTAGE ? `בתוכניות לצוות ולהורים במגזר ה${o.best.sc}` : `ב${o.best.st} במגזר ה${o.best.sc}`;
  if(o.expansion) return `בתת-הסל „${esc(o.sb)}״, ${esc(where)} יש רק <b>${o.best.c}</b> תוכניות מתחרות, לעומת ${o.mineAvg} בממוצע במשבצות שבהן אתה פועל היום.`;
  return `התוכנית שלך כבר פתוחה לכל המגזרים. המשבצת הכי פנויה שלך בתת-הסל „${esc(o.sb)}״ היא ${esc(where)}, עם <b>${o.best.c}</b> תוכניות מתחרות.`;
}

/* ================= report ================= */
let current=null, calcState=null;
function stHTML(s){ return `<span class="st ${STATUS[s][1]}"><i></i>${STATUS[s][0]}</span>`; }
function adviceHTML(r){
  if(!r.pitch && !r.gefen) return "";
  const when = NEXT_TENDER ? `בעדכון בגפ״ן (${esc(NEXT_TENDER)})` : "בחלון ההגשה הבא";
  return `<dl class="advice">${r.pitch?`<dt class="now">עכשיו, בהצעה למנהלת</dt><dd>${esc(r.pitch)}</dd>`:""}${r.gefen?`<dt>${when}</dt><dd>${esc(r.gefen)}</dd>`:""}</dl>`;
}
function results(p){
  const ai = sampleOf(p);
  return CHECKS.map(c=>{
    if(c.id===6) return {...c,...check6(p),src:"מחושב מנתוני המאגר"};
    const a = ai && ai.checks.find(x=>+x.id===c.id);
    if(a) return {...c,...a,pitch:a.pitch||a.fix||"",gefen:a.gefen||""};
    if(c.id===4){ const h=hint4(p); return {...c,status:h.length?"warn":"na",finding:h.length?("סימנים ראשונים מהנתונים: "+h.join(". ")+". הבדיקה המלאה של הניסוח תתפרסם בקרוב."):"הבדיקה המלאה של הניסוח תתפרסם בקרוב."}; }
    return {...c,status:"na",finding:"הבדיקה המלאה של הסעיף הזה תתפרסם בקרוב."};
  });
}
function openProgram(p,opt){
  if(!p) return;
  if(!p.own && p.sm===undefined){ $("#report").innerHTML='<p class="loading">טוען את הבדיקה…</p>'; ensureDetails(p).then(()=>openProgram(p,opt)).catch(()=>{ $("#report").innerHTML='<p class="pending err">לא הצלחנו לטעון את פרטי התוכנית. רענן את הדף.</p>'; }); return; }
  if(tour&&tour.name==="search") endTour(true); else endTour();
  current=p; renderReport(p);
  if(!p.own) setHash("p-"+pid(p));
  track("report_view",{id:pid(p),name:p.n});
  const top=$("#report").getBoundingClientRect().top+scrollY-72;
  window.scrollTo({top, behavior: (opt&&opt.fromRoute)||reduced()?"auto":"smooth"});
  setTimeout(()=>startTour("report"), (opt&&opt.fromRoute)?600:900);
}
function renderReport(p){
  const R=results(p), r6=R[5], rest=R.slice(0,5), ai=sampleOf(p);
  const o=oppFor(p), td=tenderFor(p);
  const join=a=>a.length?esc(a.join(", ")):"לא צוין";
  document.querySelectorAll(".ex").forEach(b=>b.classList.toggle("on",b.dataset.id===pid(p)));
  const pending = !ai;
  $("#report").innerHTML = `
  <div class="report">
    <aside class="summary">
      <div>
        <h2 class="pname">${esc(p.n)}</h2>
        ${p.o?`<p class="org">${esc(p.o)}</p>`:""}${p.id?`<p class="org">מספר תוכנית ${esc(p.id)}</p>`:""}
      </div>
      <dl class="meta">
        <dt>שלב חינוך</dt><dd>${join(p.st)}</dd>
        <dt>מגזר</dt><dd>${join(p.sc)}</dd>
        <dt>תת-סל</dt><dd>${join(p.sb)}</dd>
        ${p.own?"":`<dt>ציון במאגר</dt><dd>${p.rv?`<b>${p.g}</b> מתוך ${p.rv} חוות דעת`:"עוד אין חוות דעת"}</dd>`}
        ${p.pr?`<dt>מחיר לשעה</dt><dd>₪${p.pr} כולל מע״מ</dd>`:""}
        ${p.ap&&p.ap.length?`<dt>תקופת אישור</dt><dd>${esc(p.ap.join(", "))}</dd>`:""}
        ${p.rt&&p.rt!=="מענים"?`<dt>מסלול</dt><dd>${esc(p.rt)}</dd>`:""}
      </dl>
      <ol class="scorelist" id="scorelist" aria-label="סיכום שש הבדיקות">
        ${[r6,...rest].map(r=>`<li><a href="#chk-${r.id}" data-jump="chk-${r.id}"><span class="n">${r.id}</span><span class="t">${esc(r.t)}</span>${stHTML(r.status)}</a></li>`).join("")}
      </ol>
      ${p.own?"":`<div class="share"><button class="btn line" id="copy-link">העתק קישור לדוח</button><a class="btn line" id="wa-share" target="_blank" rel="noopener">שלח בוואטסאפ</a><span class="done" id="copy-done" hidden>הקישור הועתק</span></div>`}
      <div class="cta" id="cta-desk" aria-live="polite"></div>
    </aside>

    <div class="main">
      ${expiryHTML(p)}
      <div id="bottomline-wrap"><p class="bottomline" id="bottomline"></p><p class="bottomline-sub" id="bottomline-sub"></p></div>

      <section class="block" id="chk-6">
        <div class="bhead"><div><h2>מה המנהלת יכולה לקנות ממך ${info(CHECKS[5].tip,"הסבר על בדיקת המבנה")}</h2><p>בדיקה 6, מבנה. זו הבדיקה שהכי משפיעה על ההכנסה שלך.</p></div>${stHTML(r6.status)}</div>
        <p class="lead">${esc(r6.finding)}</p>
        ${adviceHTML(r6)}
        ${calcHTML(p)}
        <div class="cta mob" id="cta-mob" aria-live="polite"></div>
      </section>

      <section class="block">
        <div class="bhead"><div><h2>איך הדף נקרא בעיני המנהלת</h2><p>בדיקות 1 עד 5, על השם, התקציר והמטרה כפי שהם מופיעים בגפ״ן.</p></div></div>
        ${pending?`<p class="pending">הבדיקה המלאה של סעיפים 1 עד 5 לתוכנית הזו תתפרסם בקרוב. בינתיים אפשר לראות איך היא נראית בתוכניות לדוגמה.</p>`:""}
        <div class="rows">
          ${rest.map(r=>`<article class="crow" id="chk-${r.id}">
            <span class="n">${r.id}</span>
            <div>
              <h3>${esc(r.t)}${info(r.tip,"הסבר על "+r.t)}</h3>
              <p class="finding">${esc(r.finding)}</p>
              ${(r.pitch||r.gefen)?`<details><summary>מה לעשות עם זה</summary>${adviceHTML(r)}</details>`:""}
            </div>
            ${stHTML(r.status)}
          </article>`).join("")}
        </div>
      </section>

      ${ai&&ai.rewrite&&S.showRewrite!==false?`<section class="rewrite">
        <span class="lbl">שם ושורה ראשונה מוצעים. אפשר להשתמש בהם כבר עכשיו בהצעה למנהלת, ולעדכן בגפ״ן בחלון ההגשה הבא.</span>
        <div class="nm">${esc(ai.rewrite.name)}</div>
        <p>${esc(ai.rewrite.line)}</p>
      </section>`:""}

      ${o?`<section class="opp">
        <h3>ההזדמנות שלך</h3>
        <p>${oppText(p,o)}</p>
        ${o.expansion?`<p class="small">פעילות במגזר אחר מחייבת התאמה תרבותית והפעלה בשפת ההוראה של בית הספר, לפי תנאי המכרז.</p>`:""}
        <div><button class="btn line" id="to-map">ראה את ההזדמנות במפה</button></div>
      </section>`:""}

      ${tenderHTML(td)}
    </div>
  </div>`;
  calcState=null; updateCalc(p);
  $("#calc").addEventListener("input",()=>updateCalc(p));
  document.querySelectorAll("[data-jump]").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); const el=document.getElementById(a.dataset.jump); const d=el.querySelector("details"); if(d) d.open=true; scrollTo({top:el.getBoundingClientRect().top+scrollY-84,behavior:reduced()?"auto":"smooth"}); }));
  const tm=$("#to-map"); if(tm) tm.onclick=()=>{ mapFocus=p; $("#m-sb").value=o.sb; $("#m-tg").value=""; setCol("sc"); showTab("map"); setHash("map"); scrollTo({top:0}); };
  if(!p.own){
    const url=location.origin+location.pathname+"#p-"+encodeURIComponent(pid(p));
    $("#wa-share").href="https://wa.me/?text="+encodeURIComponent(`הבדיקה של התוכנית „${p.n}״: מה המנהלת רואה בגפ״ן, וכמה שווה לך תוכנית שנתית\n${url}`);
    $("#wa-share").addEventListener("click",()=>track("share_wa",{id:pid(p)}));
    $("#copy-link").onclick=()=>{
      const done=()=>{ $("#copy-done").hidden=false; setTimeout(()=>$("#copy-done").hidden=true,2500); track("share_copy",{id:pid(p)}); };
      if(navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(()=>fallbackCopy(url,done)); else fallbackCopy(url,done);
    };
  }
  watchSticky();
}
const GEM={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};
const hebYear = s => [...String(s).replace(/[^א-ת]/g,"")].reduce((a,c)=>a+(GEM[c]||0),0); // תשפ"ז → 787
const schoolYear = () => { const d=new Date(); return (d.getFullYear()+(d.getMonth()>=8?1:0)+3760)%1000; }; // ספטמבר 2026 → 787
const hebLabel = n => { const t=n%100, tens=Math.floor(t/10)*10, ones=t%10, L=k=>Object.keys(GEM).find(c=>GEM[c]===k)||""; const s="תש"+L(tens)+L(ones); return s.slice(0,-1)+"״"+s.slice(-1); };
function expiryHTML(p){
  if(p.own||!p.ap||!p.ap.length) return "";
  const end=Math.max(...p.ap.map(a=>hebYear(String(a).split("-").pop())));
  const now=schoolYear(); if(!end || end>now) return "";
  const when = NEXT_TENDER ? ` חלון ההגשה הבא: ${esc(NEXT_TENDER)}.` : "";
  return `<div class="alert" role="note"><b>${end<now?"תקופת האישור של התוכנית בגפ״ן הסתיימה.":`תקופת האישור של התוכנית בגפ״ן מסתיימת בסוף ${hebLabel(end)}, שנת הלימודים הנוכחית.`}</b> כדי שהתוכנית תמשיך להופיע במאגר צריך להגיש אותה מחדש, וזו גם ההזדמנות לתקן את הדף לפי הבדיקה.${when}</div>`;
}
function fallbackCopy(text,done){ const t=document.createElement("textarea"); t.value=text; t.style.position="fixed"; t.style.opacity="0"; document.body.appendChild(t); t.select(); try{document.execCommand("copy"); done();}catch(e){} t.remove(); }
function tenderHTML(d){
  if(!d) return "";
  const li=a=>`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  return `<section class="tender">
    <div><h3>מה המכרז מגדיר לתת-הסל שלך</h3><p class="src" style="margin:2px 0 0">תת-סל „${esc(d.name)}״, מתוך מסמך תכולת הסלים, מכרז 13/3.2022 (נובמבר 2025)</p></div>
    <p class="goal">${esc(d.goal)}</p>
    <p class="tip">אלה הניסוחים שהמשרד עצמו כתב. כשהם מופיעים בהצעה שלך למנהלת, היא מזהה מיד לאיזה סל התוכנית שייכת ולמה היא עונה.</p>
    ${(d.extra.length||d.emph.length||d.content.length)?`<details><summary>מה עוד המכרז מפרט</summary><div>
      ${d.extra.length?`<div><h4>שיקולים שהצוות המקצועי רשאי לבחון</h4>${li(d.extra)}</div>`:""}
      ${d.emph.length?`<div><h4>דגשים</h4>${li(d.emph)}</div>`:""}
      ${d.content.length?`<div><h4>תוכן ומהות התוכניות</h4>${li(d.content)}</div>`:""}
    </div></details>`:""}
  </section>`;
}

/* ================= calculator ================= */
function field(id,label,tip,val,step){
  return `<label for="${id}"><span class="lt">${label}${info(tip,"הסבר: "+label)}</span><input type="number" id="${id}" min="0" step="${step||1}" value="${val}" inputmode="numeric"></label>`;
}
function calcHTML(p){
  return `<div class="calc" id="calc">
    <div><h3>כמה שווה לך תוכנית שנתית</h3></div>
    <div class="calc-in">
      ${field("c-sch","בתי ספר שעובדים איתך","בכמה בתי ספר התוכנית פועלת השנה, בכל היקף.",3)}
      ${field("c-wpy","מפגשים לכיתה בשנה, היום","כמה מפגשים כיתה אחת מקבלת ממך במהלך שנה. סדנה חד פעמית היא מפגש אחד. אם בית ספר קונה שתי סדנאות לאותה כיתה, הכנס 2.",defMeet(p))}
    </div>
    <details><summary>התאמה מתקדמת</summary><div>
      <div class="calc-in adv">
        ${field("c-cls","כיתות בכל בית ספר","בכמה כיתות בכל בית ספר התוכנית פועלת, או יכולה לפעול. גפ״ן משלם לפי כיתה.",2)}
        ${field("c-meet","מפגשים בתוכנית שנתית","כמה מפגשים לכיתה תכלול תוכנית שנתית. מפגש בשבוע לאורך שנת הלימודים הוא בערך 30.",30)}
        ${field("c-price","מחיר לשעת מפגש (₪)",`המחיר לשעה שגפ״ן משלם, כולל מע״מ. ${p.pr?`כאן מופיע המחיר שהגשת בגפ״ן: ₪${p.pr}. `:""}המקסימום לפי המכרז: ₪${MAX_PRICE.plain} לסדנה, ₪${MAX_PRICE.materials} לסדנה עם חומרים מתכלים, ₪${MAX_PRICE.lecture} להרצאה. המנהלת רשאית לנהל משא ומתן על המחיר, וגם לקצר מפגש ל-45 דקות.`,(p.pr&&p.pr<=MAX_PRICE.materials)?p.pr:MAX_PRICE.plain)}
      </div>
      <p class="note" id="c-note"></p>
    </div></details>
    <div class="calc-out" id="calc-out"></div>
  </div>`;
}
function updateCalc(p){
  const v=id=>Math.max(0,+document.getElementById(id).value||0);
  const sch=Math.max(1,v("c-sch")), cls=Math.max(1,v("c-cls")), wpy=v("c-wpy"), meet=v("c-meet"), price=v("c-price");
  const perNow=cls*wpy*price, perAnnual=cls*meet*price, now=sch*perNow, one=now-perNow+perAnnual, all=sch*perAnnual, gain=one-now;
  const note=$("#c-note");
  if(price>MAX_PRICE.materials){ note.className="note warn"; note.textContent=`המחיר גבוה מהמקסימום בגפ״ן: ₪${MAX_PRICE.plain} לשעת סדנה, ₪${MAX_PRICE.materials} עם חומרים מתכלים.`; }
  else { note.className="note"; note.textContent = (p.pr&&price===p.pr) ? `זה המחיר לשעה שהגשת בגפ״ן. המקסימום לפי המכרז: ₪${MAX_PRICE.plain} לשעת סדנה, ₪${MAX_PRICE.materials} עם חומרים מתכלים.` : "המחיר כאן הוא המקסימום לשעת סדנה בגפ״ן, לפי מחירון המכרז."; }
  $("#calc-out").innerHTML=`<div><span>היום, בשנה</span><b>${ils(now)}</b></div>
    <div class="gain"><span>בית ספר אחד עובר לשנתי</span><b>${gain>=0?"+":""}${ils(gain)}</b></div>
    <div><span>כולם עוברים לשנתי</span><b>${ils(all)}</b></div>`;
  const isAnnual = wpy>=ANNUAL_MIN, c = isAnnual?CTA.annual:CTA.short;
  ["#cta-desk","#cta-mob"].forEach(s=>{ const el=$(s); if(el) el.innerHTML=ctaHTML(c); });
  $("#sticky-text").innerHTML = isAnnual ? `${c.sticky} <b>${ils(perAnnual)}</b>` : `${c.sticky} <b>${ils(gain)}</b>`;
  bindBook();
  // bottom line
  const R=results(p), weak=R.slice(0,5).filter(r=>r.status==="bad"||r.status==="warn").length, hasAI=!!sampleOf(p);
  const lead = isAnnual
    ? `יש לך כבר תוכנית שנתית. כל בית ספר נוסף שעובר אליה שווה לך <b>${ils(perAnnual)}</b> בשנה.`
    : `בית ספר אחד שעובר ממך לתוכנית שנתית שווה לך עוד <b>${ils(gain)}</b> בשנה.`;
  const st6=check6(p).status;
  const sub = [
    st6==="bad"?"כרגע המנהלת יכולה לקנות ממך בגפ״ן רק מפגש חד פעמי.":st6==="warn"?"בגפ״ן המסלול הארוך ביותר שלך הוא 3 עד 5 מפגשים.":(!isAnnual?"בגפ״ן רשום ״6 מפגשים ומעלה״, אבל זה לא אומר שבתי הספר קונים ממך שנה מלאה.":""),
    hasAI&&weak?`ובדף עצמו ${weak} מתוך 5 הבדיקות פוגעות במכירה או חלשות.`:""
  ].filter(Boolean).join(" ");
  $("#bottomline").innerHTML=lead; $("#bottomline-sub").textContent=sub;
}
function ctaHTML(c){ return `<h3>${esc(c.title)}</h3><p>${esc(c.text)}</p><a class="btn" href="contact.html" data-book="tool-cta">${esc(c.label)}</a>`; }
function bindBook(){
  document.querySelectorAll("[data-book]:not([data-bound])").forEach(a=>{
    a.dataset.bound="1"; const url=window.SITE_LINKS&&window.SITE_LINKS.booking;
    if(url){ a.href=url; a.target="_blank"; a.rel="noopener"; }
    a.addEventListener("click",()=>track("book_click",{from:a.dataset.book,id:current?pid(current):""}));
  });
}

/* ================= sticky bar (phones) ================= */
function stickyUpdate(){
  const bar=$("#stickybar"), calc=$("#calc"), mob=$("#cta-mob");
  if(!calc || $("#view-check").hidden || innerWidth>960){ bar.classList.remove("on"); return; }
  const seen = calc.getBoundingClientRect().top < innerHeight*0.4;
  const r = mob ? mob.getBoundingClientRect() : null;
  const mobVisible = r && r.bottom>0 && r.top<innerHeight;
  bar.classList.toggle("on", seen && !mobVisible && !tour);
}
let stickyBound=false;
function watchSticky(){
  if(!stickyBound){ addEventListener("scroll",stickyUpdate,{passive:true}); addEventListener("resize",stickyUpdate); stickyBound=true; }
  stickyUpdate();
}

/* ================= organization view ================= */
function openOrg(org){
  const list=P.filter(p=>p.o===org); if(!list.length) return;
  endTour(); current=null; setHash("org-"+org);
  track("org_view",{org});
  document.querySelectorAll(".ex").forEach(b=>b.classList.remove("on"));
  $("#report").innerHTML=`<div class="report" style="grid-template-columns:1fr">
    <div class="main">
      <div><h2 class="pname" style="font-size:26px">${esc(org)}</h2><p class="org">${list.length} תוכניות במאגר. בחר תוכנית כדי לראות את הבדיקה שלה.</p></div>
      <div class="orglist">${list.map(p=>`<div class="item"><div><button class="textlink" data-id="${esc(pid(p))}">${esc(p.n)}</button><div class="m">${esc([p.st.join(", ")||"ללא שלב חינוך", (p.ss.map(x=>SESS[x]).join(", ")||"מספר מפגשים לא צוין")].join(", "))}</div></div>${stHTML(check6(p).status)}</div>`).join("")}</div>
      <p class="src">הסטטוס ליד כל תוכנית הוא של בדיקה 6, מבנה: מה המנהלת יכולה לקנות ממך.</p>
    </div></div>`;
  $("#report .orglist").addEventListener("click",e=>{const b=e.target.closest("[data-id]"); if(b) openProgram(byId[b.dataset.id]);});
  scrollTo({top:$("#report").getBoundingClientRect().top+scrollY-72,behavior:reduced()?"auto":"smooth"});
}

/* ================= map ================= */
let colDim="sc", selCell=null, mapFocus=null;
const HEAT=["--h0","--h1","--h2","--h3","--h4","--h5"];
function setCol(c){ colDim=c; document.querySelectorAll(".toggle[data-col]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.col===c)); }
function initMap(){
  $("#m-sb").innerHTML = `<option value="">כל התחומים</option>`+SUBS.map(s=>`<option>${esc(s)}</option>`).join("");
  $("#m-tg").innerHTML = `<option value="">כולם</option>`+[...new Set(P.map(p=>p.tg))].map(s=>`<option>${esc(s)}</option>`).join("");
  $("#m-sb").onchange=$("#m-tg").onchange=()=>{selCell=null;renderMap();};
  document.querySelectorAll(".toggle[data-col]").forEach(b=>b.onclick=()=>{setCol(b.dataset.col);selCell=null;renderMap();});
}
function pool(){ const sb=$("#m-sb").value, tg=$("#m-tg").value; return P.filter(p=>(!sb||p.sb.includes(sb))&&(!tg||p.tg===tg)); }
function renderMap(){
  const pl=pool(), cols=colDim==="sc"?SECTORS:SUPS;
  $("#m-title").textContent = $("#m-sb").value || "כל התחומים";
  $("#m-total").textContent = `${pl.length.toLocaleString("he-IL")} תוכניות`;
  const grid=ROWS.map(st=>cols.map(c=>{const xs=pl.filter(p=>(st===NOSTAGE?!p.st.length:p.st.includes(st))&&p[colDim].includes(c)); const rated=xs.filter(p=>p.rv>0); return {st,c,xs,n:xs.length,avg:rated.length?Math.round(rated.reduce((a,p)=>a+p.g,0)/rated.length):null};}));
  const max=Math.max(1,...grid.flat().map(x=>x.n));
  const school=grid.slice(1,4).flat().map(x=>x.n).sort((a,b)=>a-b), q1=school[Math.floor(school.length/4)];
  const lvl=n=>n===0?0:Math.min(5,1+Math.floor(4.999*Math.sqrt(n/max)));
  const f = mapFocus && colDim==="sc" ? {p:mapFocus,o:oppFor(mapFocus)} : null;
  const focusOn = f && f.o && $("#m-sb").value===f.o.sb;
  const fs = f ? (f.p.st.length?f.p.st:[NOSTAGE]) : [];
  $("#heat").innerHTML = `<colgroup><col class="rhc">${cols.map(()=>"<col>").join("")}</colgroup><thead><tr><th></th>${cols.map(c=>`<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>`+
    grid.map((row,ri)=>`<tr><th scope="row" class="rh">${esc(ROWS[ri])}${ri===4?"<small>צוות, הורים, מנהלים</small>":""}</th>${row.map((x,ci)=>{
      const L=lvl(x.n), opp=ri>0&&ri<4&&x.n<=q1&&max>8&&school[school.length-1]>0, sel=selCell&&selCell[0]===ri&&selCell[1]===ci;
      const mine=focusOn&&fs.includes(ROWS[ri])&&f.p.sc.includes(x.c), best=focusOn&&f.o.best.st===ROWS[ri]&&f.o.best.sc===x.c;
      return `<td><button class="cell ${L>=4?"dark":""} ${x.n===0?"zero":""} ${opp&&!best?"opp":""} ${mine?"mine":""} ${best?"best":""} ${sel?"sel":""}" style="background:var(${HEAT[L]})" data-r="${ri}" data-c="${ci}" aria-label="${esc(ROWS[ri])}, ${esc(x.c)}: ${x.n} תוכניות${mine?", המשבצת שלך":""}${best?", ההזדמנות שלך":""}"><span class="c">${x.n}</span><span class="a">${x.n===0?"":x.avg!=null?"ציון "+x.avg:"בלי חוות דעת"}</span></button></td>`}).join("")}</tr>`).join("")+`</tbody>`;
  $("#ramp").innerHTML = HEAT.map(h=>`<i style="background:var(${h})"></i>`).join("");
  $("#ramp-lbl").textContent = `0 עד ${max}`;
  const mf=$("#mapfocus");
  if(focusOn){ mf.hidden=false; mf.innerHTML=`<h3>ההזדמנות של „${esc(f.p.n)}״</h3><p>${oppText(f.p,f.o)}</p><p class="small">המשבצות שבהן התוכנית פועלת היום מסומנות ״שלך״. ההזדמנות מסומנת במסגרת ירוקה.</p><div><button class="textlink" id="back-report">חזרה לבדיקה של התוכנית</button></div>`;
    $("#back-report").onclick=()=>openProgram(f.p); }
  else mf.hidden=true;
  $("#heat").onclick=e=>{const b=e.target.closest(".cell"); if(!b) return; selCell=[+b.dataset.r,+b.dataset.c]; renderMap(); $("#m-list-title").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"}); };
  if(selCell) renderList(grid[selCell[0]][selCell[1]]); else { $("#m-list-title").textContent="בחר משבצת כדי לראות את התוכניות בה"; $("#m-list").innerHTML=""; }
}
function renderList(x){
  const xs=[...x.xs].sort((a,b)=>b.rv-a.rv||b.g-a.g);
  $("#m-list-title").textContent = `${x.st}, ${x.c}: ${x.n} תוכניות`;
  $("#m-list").innerHTML = xs.length ? `<div class="pitem h"><span>תוכנית</span><span class="num">ציון</span><span class="num rv">חוות דעת</span></div>`+
    xs.slice(0,60).map(p=>`<div class="pitem"><div><button class="textlink" data-id="${esc(pid(p))}">${esc(p.n)}</button><div class="o">${esc(p.o)}</div></div><span class="num">${p.rv?p.g:"–"}</span><span class="num rv">${p.rv}</span></div>`).join("")+
    (xs.length>60?`<p class="mapnote">מוצגות 60 התוכניות עם הכי הרבה חוות דעת.</p>`:"")
    : `<p class="mapnote" style="font-size:15px">אין אף תוכנית במשבצת הזו. זו יכולה להיות נישה פתוחה, או סימן שאין בה ביקוש. כדאי לבדוק מול מנהלות לפני שבונים.</p>`;
  $("#m-list").onclick=e=>{const b=e.target.closest("[data-id]"); if(!b) return; showTab("check"); openProgram(byId[b.dataset.id]);};
}

/* ================= onboarding tour ================= */
const TOURS = {
  search:[ {el:"#searchbox", text:"הכנס את שם התוכנית, שם הספק או מספר התוכנית, וקבל בדיקה מקיפה של התוכנית כפי שהמנהלת רואה אותה."} ],
  report:[
    {el:"#bottomline-wrap", text:"זו השורה התחתונה: כמה שווה לך מסלול שנתי, לפי המחירון של המכרז."},
    {el:"#calc", text:"כאן מכניסים את המספרים שלך. כל שדה מוסבר בעיגול הקטן שלידו."},
    {el:"#scorelist", text:"שש הבדיקות של הדף. לחיצה על בדיקה מעבירה אליה, עם מה להגיד למנהלת עכשיו ומה לעדכן בגפ״ן."},
    {el:()=>innerWidth<=960?"#cta-mob":"#cta-desk", text:"רוצה לבנות את המסלול השנתי יחד? כאן קובעים זום של 20 דקות."}
  ]
};
let tour=null;
function startTour(name){
  if(store.get("tour_"+name)) return;
  if(name==="report" && !$("#bottomline-wrap")) return;
  tour={name,steps:TOURS[name],i:0};
  const spot=document.createElement("div"); spot.className="tour-spot"; spot.id="tour-spot";
  const tip=document.createElement("div"); tip.className="tour-tip"; tip.id="tour-tip"; tip.setAttribute("role","dialog"); tip.setAttribute("aria-live","polite");
  document.body.append(spot,tip);
  addEventListener("resize",placeTour); addEventListener("scroll",placeTour,{passive:true}); document.addEventListener("keydown",tourKey);
  showStep();
}
function tourKey(e){ if(e.key==="Escape"){ track("tour_skip",{tour:tour&&tour.name}); endTour(true); } }
function stepEl(){ const s=tour.steps[tour.i]; return document.querySelector(typeof s.el==="function"?s.el():s.el); }
function showStep(){
  const s=tour.steps[tour.i], el=stepEl();
  if(!el){ nextStep(); return; }
  const last=tour.i===tour.steps.length-1, many=tour.steps.length>1;
  $("#tour-tip").innerHTML=`<p>${esc(s.text)}</p><div class="row"><span class="count">${many?`${tour.i+1} מתוך ${tour.steps.length}`:""}</span><span class="actions"><button class="skip" id="tour-skip">${many&&!last?"דלג":""}</button><button class="btn" id="tour-next">${last?"הבנתי":"הבא"}</button></span></div>`;
  if(!(many&&!last)) $("#tour-skip").remove(); else $("#tour-skip").onclick=()=>{ track("tour_skip",{tour:tour.name,step:tour.i}); endTour(true); };
  $("#tour-next").onclick=nextStep;
  const r=el.getBoundingClientRect();
  if(r.top<80 || r.bottom>innerHeight-40) el.scrollIntoView({block:"center",behavior:reduced()?"auto":"smooth"});
  setTimeout(()=>{ placeTour(); $("#tour-next") && $("#tour-next").focus({preventScroll:true}); }, reduced()?0:350);
  placeTour();
}
function nextStep(){ if(!tour) return; tour.i++; if(tour.i>=tour.steps.length) endTour(true); else showStep(); }
function placeTour(){
  if(!tour) return; const el=stepEl(); if(!el) return;
  const r=el.getBoundingClientRect(), pad=8, spot=$("#tour-spot"), tip=$("#tour-tip");
  const h=Math.min(r.height+pad*2, innerHeight-24);
  Object.assign(spot.style,{left:(r.left-pad)+"px",top:(r.top-pad)+"px",width:(r.width+pad*2)+"px",height:h+"px"});
  const tw=tip.offsetWidth, th=tip.offsetHeight;
  let top = r.top-pad+h+12; if(top+th>innerHeight-12) top=Math.max(12,r.top-pad-th-12);
  let left = r.right-tw; left=Math.max(16,Math.min(left,innerWidth-tw-16));
  Object.assign(tip.style,{top:top+"px",left:left+"px"});
}
function endTour(done){
  if(!tour) return;
  if(done) store.set("tour_"+tour.name,"1");
  $("#tour-spot")&&$("#tour-spot").remove(); $("#tour-tip")&&$("#tour-tip").remove();
  removeEventListener("resize",placeTour); removeEventListener("scroll",placeTour); document.removeEventListener("keydown",tourKey);
  tour=null;
}
})();
