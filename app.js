(function(){
"use strict";

var SUPABASE_URL = "https://issreohiuzgbsujcdexq.supabase.co";
var SUPABASE_KEY = "sb_publishable_3Bn5vHh4AXyTu2tehjyShg_ef6kwtH2";
var GUEST_FN_URL = SUPABASE_URL + "/functions/v1/guest-signup";
var GUEST_EMAIL_DOMAIN = "@guest.ledger.local";

var APP_VERSION = "1.5.3";
// Newest first. `v` is the version an item shipped in.
var CHANGELOG = [
  { v:"1.5.3", title:"Status bar matches the theme", body:"The strip at the top of your screen now follows day and night mode instead of staying green." },
  { v:"1.5.2", title:"Swipe sheets closed", body:"Drag down on any panel \u2014 Settings, Add entry, Notifications \u2014 to close it, the way the little handle always suggested. Swiping no longer reloads the page." },
  { v:"1.5.1", title:"Edit your name", body:"You can now change the name you signed up with under Settings \u2192 Account & security." },
  { v:"1.5.0", title:"No-spend days", body:"Spent nothing today? Tap \u201cDidn\u2019t spend anything today\u201d on the streak card and the day still counts. Your streak now tracks awareness, not spending." },
  { v:"1.4.1", title:"Back button & install prompt", body:"Your phone's back button now closes sheets and Settings panels instead of leaving the app. An install prompt also stays on the home screen until Ledger is added to your home screen." },
  { v:"1.4.0", title:"Notifications", body:"A bell icon with a notifications panel — get in-app alerts when you hit 50%, 80% or 100% of your overall budget or any category cap, plus month-end reminders and streak milestones." },
  { v:"1.3.0", title:"Streak tracker", body:"A daily-logging streak card on the home screen — current streak, your best-ever record, and a weekly day tracker to keep the habit going." },
  { v:"1.2.0", title:"Category budgets", body:"Set optional spending caps on specific categories (e.g. Groceries). Progress bars on the home screen turn orange then red as you approach or pass a cap." },
  { v:"1.2.0", title:"Reorganised Settings", body:"Settings is now split into clear sections — Categories, Budgets, Preferences, Account, Data, and About." },
  { v:"1.1.0", title:"Quick / Guest login", body:"Create an account with just a username + 6-digit PIN, no email required. Add an email later to secure it." },
  { v:"1.1.0", title:"Multiple currencies", body:"Choose EUR, USD, INR or AED for your account." },
  { v:"1.1.0", title:"Faster logging & undo", body:"The app remembers your last category, offers ‘Save & add another’, and lets you undo a delete." }
];
var FEATURES = [
  { name:"Track expenses & income", desc:"Log entries by category and see monthly totals." },
  { name:"Monthly budget", desc:"Set a budget and watch ‘Left this month’ update." },
  { name:"Category caps", desc:"Optional per-category spending limits." },
  { name:"Quick / Guest login", desc:"Username + PIN, no email needed." },
  { name:"Multi-currency", desc:"EUR, USD, INR, AED." },
  { name:"Day / night themes", desc:"Sun-moon toggle, auto by time of day." },
  { name:"Excel import", desc:"Paste rows straight from a spreadsheet." },
  { name:"PDF export", desc:"Printable monthly statement." },
  { name:"Install to home screen", desc:"Use it like a native app, offline-friendly shell." },
  { name:"Savings plans (coming soon)", desc:"Tailored saving plans based on your own spending patterns — in the works." }
];
var DEFAULT_CATEGORIES = ["Groceries","Food & Dining","Transport","Utilities","Rent","Family","Friends","Healthcare","Shopping","Self Growth","Entertainment & Travel","Sadaqa","Miscellaneous"];
var DEFAULT_INCOME_CATEGORIES = ["Income source 1","Income source 2"];

// Supported currencies: code -> { symbol, locale for number formatting }
var CURRENCIES = {
  EUR: { locale:"de-DE" },
  USD: { locale:"en-US" },
  INR: { locale:"en-IN" },
  AED: { locale:"en-AE" }
};

var state = {
  transactions:[],
  categories:DEFAULT_CATEGORIES.slice(),
  incomeCategories:DEFAULT_INCOME_CATEGORIES.slice(),
  budget:0,
  categoryBudgets:{},
  bestStreak:0,
  noSpendDays:[],
  alertsSeen:{},
  currency:"EUR",
  profile:{ first:"", last:"" }
};
var viewMonthOffset = 0;
var nudgeDismissed = false;
var editingId = null;
var pendingConfirmAction = null;
var currentType = "expense";
var currentUser = null;
var saveTimer = null;
var lastSyncTime = null;
var currentTheme = "night";
var isNewUserWelcome = false;
var lastUsed = { type:"expense", category:null, date:null };
var undoTimer = null;
var pendingUndo = null;

function fmt(n){
  var cur = (state.currency && CURRENCIES[state.currency]) ? state.currency : "EUR";
  var loc = CURRENCIES[cur].locale;
  try{
    return new Intl.NumberFormat(loc,{style:"currency",currency:cur,maximumFractionDigits:2}).format(n);
  }catch(e){
    return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n);
  }
}
function todayISO(){ var d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function pad(n){ return n<10?"0"+n:""+n; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

function viewedMonthDate(){ var d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+viewMonthOffset); return d; }
function monthKeyOf(s){ return s.slice(0,7); }
function viewedMonthKey(){ var d=viewedMonthDate(); return d.getFullYear()+"-"+pad(d.getMonth()+1); }

// ---- Theme (day/night, sun/moon) ----
function detectDefaultTheme(){ var h=new Date().getHours(); return (h>=6&&h<18)?"day":"night"; }
function themeIconMarkup(t){
  return t==="day"
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
}
// Status-bar / browser-chrome colour, matched to the app background.
// #FBF1E6 = day --bg, #10131E = night --bg.
function applyThemeColor(t){
  var col = (t==="day") ? "#FBF1E6" : "#10131E";
  var m = document.querySelector('meta[name="theme-color"]');
  if(!m){ m=document.createElement("meta"); m.setAttribute("name","theme-color"); document.head.appendChild(m); }
  m.setAttribute("content", col);
  var s = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if(s) s.setAttribute("content", t==="day" ? "default" : "black-translucent");
}
function applyTheme(t){
  currentTheme = t;
  document.body.setAttribute("data-theme", t);
  applyThemeColor(t);
  var icon = document.getElementById("themeIcon");
  if(icon) icon.innerHTML = themeIconMarkup(t);
  var aIcon = document.getElementById("authThemeIcon");
  if(aIcon) aIcon.innerHTML = themeIconMarkup(t);
}
function toggleTheme(){
  var next = currentTheme==="day" ? "night" : "day";
  applyTheme(next);
  try{ localStorage.setItem("ledger_theme", next); }catch(e){}
}
function initTheme(){
  var saved = null;
  try{ saved = localStorage.getItem("ledger_theme"); }catch(e){}
  applyTheme(saved || detectDefaultTheme());
}
document.getElementById("themeToggle").addEventListener("click",toggleTheme);
document.getElementById("authThemeToggle").addEventListener("click",toggleTheme);

// ---- PWA install banner ----
var deferredInstallPrompt = null;
function isStandalone(){
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone===true;
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}
function isAndroid(){ return /android/i.test(window.navigator.userAgent); }

// ---- Back-button layer stack ----
// Every overlay/panel pushes a history entry so the phone's hardware/gesture
// back button closes that layer instead of leaving the app.
var layerStack=[];
function openLayer(id,closeFn){
  layerStack.push({id:id,close:closeFn});
  try{ history.pushState({ledgerLayer:id},""); }catch(e){}
}
function closeLayer(id){
  for(var i=layerStack.length-1;i>=0;i--){
    if(layerStack[i].id===id){ history.go(-(layerStack.length-i)); return true; }
  }
  return false;
}
window.addEventListener("popstate",function(){
  if(layerStack.length){
    var top=layerStack.pop();
    try{ top.close(); }catch(e){}
  }
});
// Android/Chrome fires this when the app is installable — capture it for our button
window.addEventListener("beforeinstallprompt", function(e){
  e.preventDefault();
  deferredInstallPrompt = e;
  refreshInstallBanner();
});
window.addEventListener("appinstalled", function(){
  deferredInstallPrompt = null;
  refreshInstallBanner();
});
var IOS_STEPS='Tap the <strong>Share</strong> button <span aria-hidden="true">⎋</span> in your browser bar, then choose <strong>“Add to Home Screen”</strong>.';
var ANDROID_STEPS='Open your browser menu <strong>⋮</strong> and choose <strong>“Install app”</strong> or <strong>“Add to Home screen”</strong>.';
function canOfferInstall(){
  if(isStandalone()) return false;
  return isIOS() || isAndroid() || !!deferredInstallPrompt;
}
function refreshInstallBanner(){
  var show=canOfferInstall();
  // Auth screen banner
  var banner=document.getElementById("installBanner");
  if(banner){
    banner.style.display=show?"block":"none";
    var ib=document.getElementById("installBtn"); if(ib) ib.style.display="block";
    if(!show){ var s1=document.getElementById("installIosSteps"); if(s1) s1.style.display="none"; }
  }
  // In-app bar (above the streak card)
  var bar=document.getElementById("installBarApp");
  if(bar){
    bar.style.display=show?"block":"none";
    var sub=document.getElementById("installBarSub");
    if(sub) sub.textContent=deferredInstallPrompt
      ? "One tap \u2014 full screen, faster, right on your home screen."
      : "Add it to your home screen for the full app.";
    if(!show){ var s2=document.getElementById("installBarSteps"); if(s2) s2.style.display="none"; }
  }
}
function doInstall(stepsId){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function(){ deferredInstallPrompt=null; refreshInstallBanner(); });
    return;
  }
  var el=document.getElementById(stepsId);
  if(el){ el.innerHTML=isIOS()?IOS_STEPS:ANDROID_STEPS; el.style.display="block"; }
}
var installBtnEl=document.getElementById("installBtn");
if(installBtnEl){ installBtnEl.addEventListener("click", function(){ doInstall("installIosSteps"); }); }
var installBarBtnEl=document.getElementById("installBarBtn");
if(installBarBtnEl){ installBarBtnEl.addEventListener("click", function(){ doInstall("installBarSteps"); }); }

// ---- Supabase helpers ----
function sbFetch(path, method, body, token, extraHeaders){
  var headers = {"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":"Bearer "+(token||SUPABASE_KEY)};
  if(extraHeaders){ for(var k in extraHeaders){ headers[k]=extraHeaders[k]; } }
  return fetch(SUPABASE_URL+path,{method:method||"GET",headers:headers,body:body?JSON.stringify(body):undefined});
}

// ---- Auth ----
function signUp(email, password){
  return sbFetch("/auth/v1/signup","POST",{email:email,password:password}).then(function(r){return r.json();});
}
function signIn(email, password){
  return sbFetch("/auth/v1/token?grant_type=password","POST",{email:email,password:password}).then(function(r){return r.json();});
}
function signOut(token){
  return sbFetch("/auth/v1/logout","POST",null,token);
}
function requestPasswordRecovery(email){
  return sbFetch("/auth/v1/recover","POST",{email:email}).then(function(r){return r.json().catch(function(){return{};});});
}
function verifyRecoveryCode(email, token){
  return sbFetch("/auth/v1/verify","POST",{type:"recovery",email:email,token:token}).then(function(r){return r.json();});
}
function setNewPassword(accessToken, newPassword){
  return sbFetch("/auth/v1/user","PUT",{password:newPassword},accessToken).then(function(r){return r.json();});
}
function getSession(){
  try{ var s=localStorage.getItem("ledger_session"); return s?JSON.parse(s):null; }catch(e){ return null; }
}
function saveSession(session){
  if(session) localStorage.setItem("ledger_session",JSON.stringify(session));
  else localStorage.removeItem("ledger_session");
}
function refreshToken(refresh_token){
  return sbFetch("/auth/v1/token?grant_type=refresh_token","POST",{refresh_token:refresh_token}).then(function(r){return r.json();});
}

// ---- Cloud data ----
// dataLoaded becomes true ONLY after a genuinely successful load from the cloud.
// Saves are blocked until then, so a failed load can never overwrite real data with empties.
var dataLoaded = false;
function loadCloudData(token, userId){
  dataLoaded = false;
  return sbFetch("/rest/v1/user_data?user_id=eq."+userId+"&select=data","GET",null,token)
    .then(function(r){
      // CRITICAL: a stale/expired token returns 401 here. If we don't detect it,
      // we'd fall through with empty state and later overwrite the cloud copy.
      if(!r.ok){
        var err = new Error("load-failed-"+r.status);
        err.status = r.status;
        throw err;
      }
      return r.json();
    })
    .then(function(rows){
      if(rows && rows.length && rows[0].data){
        var d = rows[0].data;
        state.transactions = Array.isArray(d.transactions)?d.transactions:[];
        state.categories = (Array.isArray(d.categories)&&d.categories.length)?d.categories:DEFAULT_CATEGORIES.slice();
        state.incomeCategories = (Array.isArray(d.incomeCategories)&&d.incomeCategories.length)?d.incomeCategories:DEFAULT_INCOME_CATEGORIES.slice();
        state.budget = typeof d.budget==="number"?d.budget:0;
        state.categoryBudgets = (d.categoryBudgets && typeof d.categoryBudgets==="object")?d.categoryBudgets:{};
        state.bestStreak = typeof d.bestStreak==="number"?d.bestStreak:0;
        state.noSpendDays = Array.isArray(d.noSpendDays)?d.noSpendDays:[];
        state.alertsSeen = (d.alertsSeen && typeof d.alertsSeen==="object")?d.alertsSeen:{};
        state.currency = (d.currency && CURRENCIES[d.currency])?d.currency:"EUR";
        state.profile = (d.profile && typeof d.profile==="object")?{first:d.profile.first||"",last:d.profile.last||""}:{first:"",last:""};
        dataLoaded = true;
        return true; // existing data found
      }
      dataLoaded = true; // genuine empty account (no row yet) — safe to save from here
      return false;
    });
}
// True upsert in one request: Prefer:resolution=merge-duplicates relies on a
// unique constraint on user_id (needed either way, for RLS + data integrity).
function upsertUserData(){
  var body = { user_id:currentUser.id, data:state, updated_at:new Date().toISOString() };
  return sbFetch("/rest/v1/user_data","POST",body,currentUser.token,{"Prefer":"resolution=merge-duplicates,return=minimal"});
}
function flushSave(){
  if(!currentUser) return Promise.resolve();
  // SAFETY: never write to the cloud until we've confirmed a successful load.
  // This prevents an empty/half-initialised state from clobbering real data.
  if(!dataLoaded){ console.warn("Save blocked: data not loaded yet"); return Promise.resolve(); }
  var sb = document.getElementById("syncBar");
  return upsertUserData()
    .then(function(r){
      if(r.status===401 && currentUser.refresh_token){
        // access token expired mid-session — refresh once and retry the same save
        return refreshToken(currentUser.refresh_token).then(function(d){
          if(d.access_token){
            currentUser.token = d.access_token;
            currentUser.refresh_token = d.refresh_token;
            saveSession(d);
            return upsertUserData();
          }
          saveSession(null); currentUser=null; showAuth();
          throw new Error("Session expired — please sign in again.");
        });
      }
      return r;
    })
    .then(function(r){
      if(r && r.ok){
        lastSyncTime = new Date();
        if(sb) sb.textContent = "Synced "+lastSyncTime.toLocaleTimeString();
      } else if(r){
        if(sb) sb.textContent = "Sync failed — will retry on next change";
      }
    })
    .catch(function(e){
      console.error("Save failed",e);
      if(sb) sb.textContent = "Offline — changes saved locally, will sync later";
    });
}
function doSave(){
  if(!currentUser) return;
  if(!dataLoaded) return; // don't even schedule a save before data is safely loaded
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 600);
}
// Flush immediately if the tab is backgrounded/closed so a pending debounce
// isn't lost — visibilitychange fires reliably on mobile, unlike beforeunload.
document.addEventListener("visibilitychange", function(){
  if(document.visibilityState==="hidden" && saveTimer){ clearTimeout(saveTimer); flushSave(); }
});
window.addEventListener("pagehide", function(){
  if(saveTimer){ clearTimeout(saveTimer); flushSave(); }
});

// ---- Boot ----
function boot(){
  initTheme();
  populateCurrencySelects();
  setLoading("Checking session…");

  // Detect return from email verification: Supabase appends tokens in the URL hash
  var verified = handleEmailVerificationRedirect();

  var session = getSession();
  if(!session){ showAuth(); return; }
  loadCloudData(session.access_token, session.user.id)
    .then(function(){
      currentUser = sessionToUser(session);
      if(verified) isNewUserWelcome = false;
      showApp(verified ? "verified" : "returning");
    })
    .catch(function(){
      // Load failed (usually an expired token). Refresh and retry ONCE.
      // If anything in this recovery path fails, send them to sign in —
      // we must never fall through and show the app with empty data.
      if(session.refresh_token){
        setLoading("Refreshing session…");
        refreshToken(session.refresh_token).then(function(d){
          if(d && d.access_token){
            saveSession(d);
            currentUser = sessionToUser(d);
            return loadCloudData(d.access_token, d.user.id)
              .then(function(){ showApp("returning"); })
              .catch(function(){ saveSession(null); currentUser=null; showAuth(); });
          } else { saveSession(null); currentUser=null; showAuth(); }
        }).catch(function(){ saveSession(null); currentUser=null; showAuth(); });
      } else { saveSession(null); currentUser=null; showAuth(); }
    });
}
function sessionToUser(d){
  var isGuest = (d.user.email||"").indexOf(GUEST_EMAIL_DOMAIN)>-1;
  return {token:d.access_token, refresh_token:d.refresh_token, id:d.user.id, email:d.user.email, isGuest:isGuest};
}
// If the user just clicked the email-verify link, Supabase sends them back with
// #access_token=...&refresh_token=... in the URL. Capture it as a live session.
function handleEmailVerificationRedirect(){
  try{
    var h = window.location.hash || "";
    if(h.indexOf("access_token=")===-1) return false;
    var params = {};
    h.replace(/^#/,"").split("&").forEach(function(kv){ var p=kv.split("="); params[decodeURIComponent(p[0])]=decodeURIComponent(p[1]||""); });
    if(!params.access_token) return false;
    // Build a session-like object; fetch the user to fill in id/email.
    var pseudo = { access_token:params.access_token, refresh_token:params.refresh_token, user:null };
    // We can't await here synchronously, so store raw and let boot's session path handle it:
    // Simplest: persist and strip hash, then reload cleanly.
    localStorage.setItem("ledger_pending_verify","1");
    // Get user info synchronously via a blocking-ish approach isn't possible; instead
    // save tokens as a session with a placeholder and resolve user in showApp fallback.
    // We fetch user now and store a proper session before continuing.
    // (boot continues using getSession which we set below.)
    // NOTE: we do a quick synchronous-style fetch using XHR to keep boot ordering simple.
    var xhr = new XMLHttpRequest();
    xhr.open("GET", SUPABASE_URL+"/auth/v1/user", false); // sync (fine, one-time at load)
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Authorization","Bearer "+params.access_token);
    xhr.send(null);
    if(xhr.status>=200 && xhr.status<300){
      var u = JSON.parse(xhr.responseText);
      var sess = { access_token:params.access_token, refresh_token:params.refresh_token||"", user:{id:u.id, email:u.email} };
      saveSession(sess);
      history.replaceState(null,"",window.location.pathname + window.location.search);
      localStorage.removeItem("ledger_pending_verify");
      return true;
    }
  }catch(e){ /* fall through */ }
  history.replaceState(null,"",window.location.pathname + window.location.search);
  return false;
}
function setLoading(msg){ document.getElementById("loadMsg").textContent = msg||"Loading…"; }

// ---- Panel switching on the auth screen ----
var AUTH_PANELS = ["landingWrap","loginWrap","signupWrap","guestWrap","recoverFormWrap"];
function showAuthPanel(id){
  AUTH_PANELS.forEach(function(p){ var el=document.getElementById(p); if(el) el.style.display=(p===id?"block":"none"); });
  document.getElementById("authTagline").textContent = "Your personal expense tracker";
}
function showAuth(){
  document.getElementById("loadingScreen").style.display="none";
  document.getElementById("app").style.display="none";
  document.getElementById("authScreen").style.display="flex";
  showAuthPanel("landingWrap");
  refreshInstallBanner();
}
function showApp(mode){
  document.getElementById("loadingScreen").style.display="none";
  document.getElementById("authScreen").style.display="none";
  document.getElementById("app").style.display="block";
  var first = (state.profile && state.profile.first) ? state.profile.first : (currentUser.email.split("@")[0]);
  var av = document.getElementById("userAvatar");
  if(av) av.textContent = (first||"?").charAt(0).toUpperCase();
  var chip = document.getElementById("userGreeting");
  if(chip) chip.textContent = "Hi, "+first;
  var sub = document.getElementById("userSub");
  if(sub){
    if(mode==="verified") sub.textContent = "email verified · welcome!";
    else if(mode==="new") sub.textContent = "welcome to Ledger!";
    else sub.textContent = "welcome back";
  }
  render();
  renderWhatsNewCard();
  // Full-width welcome banner for first-time users
  if(mode==="new") showWelcomeBanner("Welcome, "+first+"! 🎉","Log your first expense with the + button to get started.");
  else if(mode==="verified") showWelcomeBanner("Email verified — welcome, "+first+"!","Your account is confirmed and your data is syncing.");
}

// ---- Currency selects ----
function populateCurrencySelects(){
  var opts = Object.keys(CURRENCIES).map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join("");
  ["signupCurrency","guestCurrency"].forEach(function(id){ var el=document.getElementById(id); if(el) el.innerHTML=opts; });
}

// ---- Landing buttons ----
document.getElementById("goLoginBtn").addEventListener("click",function(){ clearAuthMessages(); showAuthPanel("loginWrap"); });
document.getElementById("goSignupBtn").addEventListener("click",function(){ clearAuthMessages(); showAuthPanel("signupWrap"); });
document.getElementById("goGuestBtn").addEventListener("click",function(){ clearAuthMessages(); guestShowTab("returning"); showAuthPanel("guestWrap"); });
document.getElementById("loginBackBtn").addEventListener("click",function(){ showAuthPanel("landingWrap"); });
document.getElementById("signupBackBtn").addEventListener("click",function(){ showAuthPanel("landingWrap"); });
document.getElementById("guestBackBtn").addEventListener("click",function(){ showAuthPanel("landingWrap"); });
function clearAuthMessages(){
  ["loginErr","loginMsg","signupErr","signupMsg","guestErr","guestMsg","guestLoginErr","recoverErr","recoverMsg","unameStatus"].forEach(function(id){ var el=document.getElementById(id); if(el){ el.textContent=""; el.className=(id==="unameStatus"?"uname-status":el.className.replace(/(auth-err|auth-msg).*/, "$1")); } });
}

// ---- Show/hide password toggles ----
function wireShowPw(checkboxId, fieldIds){
  var cb=document.getElementById(checkboxId);
  if(!cb) return;
  cb.addEventListener("change",function(){
    fieldIds.forEach(function(fid){ var f=document.getElementById(fid); if(f) f.type=cb.checked?"text":"password"; });
  });
}
wireShowPw("loginShowPw",["loginPassword"]);
wireShowPw("signupShowPw",["signupPassword","signupPassword2"]);
wireShowPw("recoverShowPw",["recoverNewPassword","recoverNewPassword2"]);
// PIN fields are type=text (numeric) already; toggle masks them via a data attribute trick
function wireShowPin(checkboxId, fieldIds){
  var cb=document.getElementById(checkboxId);
  if(!cb) return;
  cb.addEventListener("change",function(){
    fieldIds.forEach(function(fid){ var f=document.getElementById(fid); if(f) f.style.webkitTextSecurity=cb.checked?"none":"disc"; });
  });
  // start masked
  fieldIds.forEach(function(fid){ var f=document.getElementById(fid); if(f) f.style.webkitTextSecurity="disc"; });
}
wireShowPin("guestShowPin",["guestPin","guestPin2"]);
wireShowPin("guestLoginShowPin",["guestLoginPin"]);

// ---- Email login ----
document.getElementById("loginSubmit").addEventListener("click",function(){
  var email=document.getElementById("loginEmail").value.trim();
  var password=document.getElementById("loginPassword").value;
  var errEl=document.getElementById("loginErr"), msgEl=document.getElementById("loginMsg");
  errEl.textContent=""; msgEl.textContent="";
  if(!email||!password){ errEl.textContent="Please enter your email and password."; return; }
  var btn=document.getElementById("loginSubmit"); btn.textContent="…";
  signIn(email,password).then(function(d){
    if(d.error||!d.access_token){ errEl.textContent=d.error_description||(d.error&&d.error.message)||"Login failed. Check your email and password."; btn.textContent="Log in"; return; }
    saveSession(d);
    currentUser=sessionToUser(d);
    return loadCloudData(d.access_token,d.user.id).then(function(existed){ showApp(existed?"returning":"new"); });
  }).catch(function(){ errEl.textContent="Network error. Check your internet connection."; btn.textContent="Log in"; });
});
["loginEmail","loginPassword"].forEach(function(id){ document.getElementById(id).addEventListener("keydown",function(e){ if(e.key==="Enter") document.getElementById("loginSubmit").click(); }); });

// ---- Email signup ----
document.getElementById("signupSubmit").addEventListener("click",function(){
  var first=document.getElementById("signupFirst").value.trim();
  var last=document.getElementById("signupLast").value.trim();
  var email=document.getElementById("signupEmail").value.trim();
  var pw=document.getElementById("signupPassword").value;
  var pw2=document.getElementById("signupPassword2").value;
  var cur=document.getElementById("signupCurrency").value;
  var errEl=document.getElementById("signupErr"), msgEl=document.getElementById("signupMsg");
  errEl.textContent=""; msgEl.textContent="";
  if(!first){ errEl.textContent="Please enter your first name."; return; }
  if(!email){ errEl.textContent="Please enter your email."; return; }
  if(!pw||pw.length<6){ errEl.textContent="Password must be at least 6 characters."; return; }
  if(pw!==pw2){ errEl.textContent="Passwords don't match."; return; }
  var btn=document.getElementById("signupSubmit"); btn.textContent="…";
  // Pass names + currency as user metadata so they're saved even before first login
  sbFetch("/auth/v1/signup","POST",{email:email,password:pw,data:{first_name:first,last_name:last,currency:cur}}).then(function(r){return r.json();}).then(function(d){
    if(d.error){ errEl.textContent=d.error.message||d.msg||"Sign-up failed."; btn.textContent="Create account"; return; }
    // Stash the profile+currency locally so first login after verify can seed the account
    try{ localStorage.setItem("ledger_pending_profile", JSON.stringify({first:first,last:last,currency:cur})); }catch(e){}
    btn.textContent="Create account";
    showAuthPanel("loginWrap");
    var lm=document.getElementById("loginMsg");
    lm.textContent="Almost there! Please check your personal mailbox and click the verification link before logging in.";
    document.getElementById("loginEmail").value=email;
  }).catch(function(){ errEl.textContent="Network error. Check your internet connection."; btn.textContent="Create account"; });
});

// ---- Guest: username availability check (debounced) ----
var unameTimer=null;
function usernameValid(u){ return /^[a-z0-9_]{3,20}$/.test(u); }
document.getElementById("guestUsername").addEventListener("input",function(){
  var raw=this.value.trim().toLowerCase();
  this.value=raw;
  var st=document.getElementById("unameStatus");
  clearTimeout(unameTimer);
  if(!raw){ st.textContent=""; st.className="uname-status"; return; }
  if(!usernameValid(raw)){ st.textContent="3–20 chars: lowercase letters, numbers, underscore"; st.className="uname-status bad"; return; }
  st.textContent="Checking availability…"; st.className="uname-status checking";
  unameTimer=setTimeout(function(){
    sbFetch("/rest/v1/usernames?username=eq."+encodeURIComponent(raw)+"&select=username","GET",null,null).then(function(r){return r.json();}).then(function(rows){
      if(Array.isArray(rows)&&rows.length){ st.textContent="\u2717 '"+raw+"' is taken"; st.className="uname-status bad"; }
      else { st.textContent="\u2713 '"+raw+"' is available"; st.className="uname-status ok"; }
    }).catch(function(){ st.textContent=""; st.className="uname-status"; });
  },450);
});

// ---- Guest: create account (via edge function) ----
document.getElementById("guestCreateBtn").addEventListener("click",function(){
  var first=document.getElementById("guestFirst").value.trim();
  var last=document.getElementById("guestLast").value.trim();
  var uname=document.getElementById("guestUsername").value.trim().toLowerCase();
  var pin=document.getElementById("guestPin").value.trim();
  var pin2=document.getElementById("guestPin2").value.trim();
  var cur=document.getElementById("guestCurrency").value;
  var errEl=document.getElementById("guestErr"), msgEl=document.getElementById("guestMsg");
  errEl.textContent=""; msgEl.textContent="";
  if(!first){ errEl.textContent="Please enter your first name."; return; }
  if(!usernameValid(uname)){ errEl.textContent="Username must be 3–20 chars: letters, numbers, underscore."; return; }
  if(!/^\d{6}$/.test(pin)){ errEl.textContent="PIN must be exactly 6 digits."; return; }
  if(pin!==pin2){ errEl.textContent="PINs don't match."; return; }
  var btn=document.getElementById("guestCreateBtn"); btn.textContent="…";
  // 1) create the account server-side (pre-confirmed, username reserved)
  fetch(GUEST_FN_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+SUPABASE_KEY,"apikey":SUPABASE_KEY},body:JSON.stringify({username:uname,pin:pin,firstName:first,lastName:last,currency:cur})})
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,body:j}; }); })
    .then(function(res){
      if(!res.ok){ errEl.textContent=(res.body&&res.body.error)||"Could not create account."; btn.textContent="Create quick account"; return; }
      // 2) log in with the internal email + PIN
      return signIn(uname+GUEST_EMAIL_DOMAIN, pin).then(function(d){
        if(d.error||!d.access_token){ errEl.textContent="Account created but login failed. Try 'I have one' with your username + PIN."; btn.textContent="Create quick account"; return; }
        saveSession(d);
        currentUser=sessionToUser(d);
        state.profile={first:first,last:last};
        state.currency=cur;
        return loadCloudData(d.access_token,d.user.id).then(function(){
          state.profile={first:first,last:last}; state.currency=cur; // ensure seeded
          doSave();
          showApp("new");
        });
      });
    })
    .catch(function(){ errEl.textContent="Network error. Check your internet connection."; btn.textContent="Create quick account"; });
});

// ---- Guest: returning login ----
function guestShowTab(which){
  var isNew = which==="new";
  document.getElementById("guestTabNew").classList.toggle("active",isNew);
  document.getElementById("guestTabReturning").classList.toggle("active",!isNew);
  document.getElementById("guestNewPanel").style.display=isNew?"block":"none";
  document.getElementById("guestReturningPanel").style.display=isNew?"none":"block";
}
document.getElementById("guestTabNew").addEventListener("click",function(){ guestShowTab("new"); });
document.getElementById("guestTabReturning").addEventListener("click",function(){ guestShowTab("returning"); });
document.getElementById("guestGoNewLink").addEventListener("click",function(){ guestShowTab("new"); });
document.getElementById("guestLoginBtn").addEventListener("click",function(){
  var uname=document.getElementById("guestLoginUsername").value.trim().toLowerCase();
  var pin=document.getElementById("guestLoginPin").value.trim();
  var errEl=document.getElementById("guestLoginErr");
  errEl.textContent="";
  if(!uname||!pin){ errEl.textContent="Enter your username and PIN."; return; }
  var btn=document.getElementById("guestLoginBtn"); btn.textContent="…";
  signIn(uname+GUEST_EMAIL_DOMAIN, pin).then(function(d){
    if(d.error||!d.access_token){ errEl.textContent="Wrong username or PIN."; btn.textContent="Log in"; return; }
    saveSession(d);
    currentUser=sessionToUser(d);
    return loadCloudData(d.access_token,d.user.id).then(function(existed){ showApp(existed?"returning":"new"); });
  }).catch(function(){ errEl.textContent="Network error. Check your internet connection."; btn.textContent="Log in"; });
});

// ---- Forgot password ----
function showRecoverPanel(){
  showAuthPanel("recoverFormWrap");
  document.getElementById("recoverErr").textContent="";
  document.getElementById("recoverMsg").textContent="";
  document.getElementById("recoverStep2").style.display="none";
  document.getElementById("recoverSendBtn").textContent="Send reset code";
  document.getElementById("recoverEmail").value=document.getElementById("loginEmail").value.trim();
}
document.getElementById("forgotLink").addEventListener("click", showRecoverPanel);
document.getElementById("recoverBackBtn").addEventListener("click", function(){ showAuthPanel("loginWrap"); });

document.getElementById("recoverSendBtn").addEventListener("click", function(){
  var email = document.getElementById("recoverEmail").value.trim();
  var errEl = document.getElementById("recoverErr"), msgEl = document.getElementById("recoverMsg");
  errEl.textContent=""; msgEl.textContent="";
  if(!email){ errEl.textContent="Enter your email first."; return; }
  var btn = document.getElementById("recoverSendBtn");
  btn.textContent="…";
  requestPasswordRecovery(email).then(function(d){
    if(d && d.error){ errEl.textContent=d.error.message||d.msg||"Couldn't send reset code."; btn.textContent="Send reset code"; return; }
    msgEl.textContent="If that email has an account, a 6-digit code is on its way. Check your inbox (and spam).";
    document.getElementById("recoverStep2").style.display="block";
    btn.textContent="Resend code";
  }).catch(function(){ errEl.textContent="Network error. Check your internet connection."; btn.textContent="Send reset code"; });
});

document.getElementById("recoverResetBtn").addEventListener("click", function(){
  var email = document.getElementById("recoverEmail").value.trim();
  var code = document.getElementById("recoverCode").value.trim();
  var newPassword = document.getElementById("recoverNewPassword").value;
  var newPassword2 = document.getElementById("recoverNewPassword2").value;
  var errEl = document.getElementById("recoverErr"), msgEl = document.getElementById("recoverMsg");
  errEl.textContent=""; msgEl.textContent="";
  if(!/^\d{6}$/.test(code)){ errEl.textContent="Enter the 6-digit code from your email."; return; }
  if(!newPassword||newPassword.length<6){ errEl.textContent="New password must be at least 6 characters."; return; }
  if(newPassword!==newPassword2){ errEl.textContent="Passwords don't match."; return; }
  var btn = document.getElementById("recoverResetBtn");
  btn.textContent="…";
  verifyRecoveryCode(email, code).then(function(d){
    if(d.error||!d.access_token){ errEl.textContent=d.error_description||(d.error&&d.error.message)||"That code is invalid or expired."; btn.textContent="Reset password"; return; }
    return setNewPassword(d.access_token, newPassword).then(function(ud){
      if(ud.error){ errEl.textContent="Code verified, but couldn't set the new password. Try again."; btn.textContent="Reset password"; return; }
      saveSession(d);
      currentUser = sessionToUser(d);
      return loadCloudData(d.access_token, d.user.id).then(function(){ showApp("returning"); });
    });
  }).catch(function(){ errEl.textContent="Network error. Check your internet connection."; btn.textContent="Reset password"; });
});

// ---- Sign out ----
function freshState(){ return {transactions:[],categories:DEFAULT_CATEGORIES.slice(),incomeCategories:DEFAULT_INCOME_CATEGORIES.slice(),budget:0,categoryBudgets:{},bestStreak:0,noSpendDays:[],alertsSeen:{},currency:"EUR",profile:{first:"",last:""}}; }
document.getElementById("signOutBtn").addEventListener("click",function(){
  showConfirm("Sign out?","You'll need to sign in again on this device.",function(){
    if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; } // cancel any pending save
    if(currentUser) signOut(currentUser.token).catch(function(){});
    saveSession(null);
    currentUser=null;
    dataLoaded=false; // block saves until a real load happens again
    state=freshState();
    closeSettings();
    showAuth();
  });
});

// ---- Welcome banner ----
function showWelcomeBanner(title,msg){
  var slot=document.getElementById("welcomeSlot");
  if(!slot) return;
  slot.innerHTML='<div class="welcome-banner"><button class="wb-close" id="wbClose">×</button><h4>'+escapeHtml(title)+'</h4><p>'+escapeHtml(msg)+'</p></div>';
  var c=document.getElementById("wbClose");
  if(c) c.addEventListener("click",function(){ slot.innerHTML=""; });
}

// ---- Render ----
var MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
var WEEKDAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var CAT_COLORS=["#E7924F","#7CA0D8","#7EBB98","#C494D9","#D9776E","#D9B85B","#5FA8C9","#9C8CD9"];

function txForMonth(mk){ return state.transactions.filter(function(t){ return monthKeyOf(t.date)===mk; }); }
function monthTotals(mk){ var e=0,i=0; txForMonth(mk).forEach(function(t){ if(t.type==="expense") e+=t.amount; else i+=t.amount; }); return{expense:e,income:i}; }
function allTimeBalance(){ var b=0; state.transactions.forEach(function(t){ b+=(t.type==="income"?t.amount:-t.amount); }); return b; }
function categoryTotals(mk){
  var map={};
  txForMonth(mk).filter(function(t){ return t.type==="expense"; }).forEach(function(t){ map[t.category]=(map[t.category]||0)+t.amount; });
  return Object.keys(map).map(function(k){ return{name:k,total:map[k]}; }).sort(function(a,b){ return b.total-a.total; });
}
// A day "counts" if something was logged OR it was marked a no-spend day.
function isNoSpendDay(iso){ return (state.noSpendDays||[]).indexOf(iso)>-1; }
function loggedOn(iso){ return state.transactions.some(function(t){ return t.date===iso; }); }
function markNoSpendToday(){
  var t=todayISO();
  if(!state.noSpendDays) state.noSpendDays=[];
  if(state.noSpendDays.indexOf(t)===-1) state.noSpendDays.push(t);
  doSave(); render();
}
function unmarkNoSpendToday(){
  var t=todayISO();
  state.noSpendDays=(state.noSpendDays||[]).filter(function(d){ return d!==t; });
  doSave(); render();
}
function currentStreak(){
  var ds={};state.transactions.forEach(function(t){ ds[t.date]=true; });
  (state.noSpendDays||[]).forEach(function(d){ ds[d]=true; });
  var c=0,cursor=new Date();
  if(!ds[todayISO()]) cursor.setDate(cursor.getDate()-1);
  while(true){ var k=cursor.getFullYear()+"-"+pad(cursor.getMonth()+1)+"-"+pad(cursor.getDate()); if(ds[k]){c++;cursor.setDate(cursor.getDate()-1);}else break; }
  return c;
}

function render(){
  var d=viewedMonthDate();
  document.getElementById("monthLabel").textContent=MONTH_NAMES[d.getMonth()]+" "+d.getFullYear();
  var mk=viewedMonthKey();
  var totals=monthTotals(mk);
  document.getElementById("heroAmount").textContent=fmt(totals.expense);
  renderBudgetBlock(totals.expense);
  var balEl=document.getElementById("balanceAmount");
  var balLabel=document.getElementById("balanceLabel");
  if(state.budget>0){
    // "Left this month" = budget minus what was spent this month
    var left=state.budget-totals.expense;
    balLabel.textContent="Left this month";
    balEl.textContent=fmt(left);
    balEl.classList.toggle("neg",left<0); // red when overspent
  } else {
    // No budget set → fall back to net (income − expenses) all-time
    var bal=allTimeBalance();
    balLabel.textContent="Balance";
    balEl.textContent=fmt(bal);
    balEl.classList.toggle("neg",bal<0);
  }
  renderNudge();
  refreshInstallBanner();
  renderStreakCard();
  refreshBell();
  renderDonut(mk,totals);
  renderCategoryList(mk,totals);
  renderActivity(mk);
}
function renderBudgetBlock(spent){
  var el=document.getElementById("budgetBlock");
  if(!state.budget){
    el.innerHTML='<div class="budget-cta"><span>No monthly budget set</span><button id="setBudgetInline">Set one</button></div>';
    document.getElementById("setBudgetInline").addEventListener("click",openSettings);
    return;
  }
  var pct=Math.min(100,(spent/state.budget)*100);
  var color=pct>=100?"var(--brick)":pct>=70?"var(--accent)":"var(--sage)";
  el.innerHTML='<div class="budget-row"><span>'+fmt(spent)+' of '+fmt(state.budget)+'</span><button id="editBudgetInline">edit</button></div><div class="budget-bar-track"><div class="budget-bar-fill" style="width:'+pct+'%;background:'+color+';"></div></div>';
  document.getElementById("editBudgetInline").addEventListener("click",openSettings);
}
function renderNudge(){
  var slot=document.getElementById("nudgeSlot");
  var loggedToday=loggedOn(todayISO());
  var html="";
  if(!loggedToday&&!isNoSpendDay(todayISO())&&!nudgeDismissed){
    html='<div class="nudge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><p>Nothing logged today yet.</p><div class="actions"><button class="log" id="nudgeLogBtn">Add</button><button class="dismiss" id="nudgeDismissBtn">×</button></div></div>';
  }
  slot.innerHTML=html;
  var lb=document.getElementById("nudgeLogBtn"); if(lb) lb.addEventListener("click",function(){ openTxSheet(null); });
  var db=document.getElementById("nudgeDismissBtn"); if(db) db.addEventListener("click",function(){ nudgeDismissed=true; renderNudge(); });
}

// ---- Streak highlighter (Duolingo-style) ----
// Returns the last 7 days as [{label, iso, done, isToday}] Mon→Sun of THIS week.
function weekDays(){
  var logged={}; state.transactions.forEach(function(t){ logged[t.date]=true; });
  var now=new Date();
  // find Monday of current week (getDay: 0=Sun..6=Sat)
  var dow=now.getDay(); var mondayOffset=(dow===0?-6:1-dow);
  var monday=new Date(now); monday.setDate(now.getDate()+mondayOffset);
  var labels=["M","T","W","T","F","S","S"];
  var out=[];
  for(var i=0;i<7;i++){
    var d=new Date(monday); d.setDate(monday.getDate()+i);
    var iso=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
    out.push({ label:labels[i], iso:iso, done:!!logged[iso]||isNoSpendDay(iso), noSpend:(!logged[iso]&&isNoSpendDay(iso)), isToday:(iso===todayISO()) });
  }
  return out;
}
function renderStreakCard(){
  var slot=document.getElementById("streakSlot");
  if(!slot) return;
  var today=todayISO();
  var streak=currentStreak();
  // keep best-streak record up to date (persists to cloud)
  if(streak > (state.bestStreak||0)){ state.bestStreak=streak; doSave(); }
  var best=state.bestStreak||0;
  var loggedToday=loggedOn(today);
  var markedToday=isNoSpendDay(today);

  var msg;
  if(streak===0){ msg="Log an expense today to start a streak. \ud83d\udd25"; }
  else if(!loggedToday&&!markedToday){ msg="You're on a "+streak+"-day streak \u2014 log today to keep it alive!"; }
  else if(markedToday&&!loggedToday){ msg="No spending today \u2014 streak safe, and money saved. \ud83d\udcb0"; }
  else if(streak===1){ msg="Nice start! Come back tomorrow to build your streak."; }
  else { msg="\ud83d\udd25 "+streak+" days strong. Keep the momentum going!"; }

  var week=weekDays();
  var weekHtml=week.map(function(dn){
    var cls="dot"+(dn.done?" done":"")+(dn.noSpend?" nospend":"")+(dn.isToday?" today":"");
    var inner=dn.done?(dn.noSpend?"\u2013":"\u2713"):"";
    return '<div class="streak-day"><div class="'+cls+'">'+inner+'</div><div class="dl">'+dn.label+'</div></div>';
  }).join("");

  // Protect the streak on a day with genuinely nothing to log
  var actionHtml="";
  if(!loggedToday&&!markedToday){
    actionHtml='<button class="nospend-btn" id="noSpendBtn">Didn\'t spend anything today</button>';
  } else if(markedToday&&!loggedToday){
    actionHtml='<div class="nospend-done"><span>\u2713 Marked as a no-spend day</span><button id="noSpendUndo">Undo</button></div>';
  }

  slot.innerHTML=
    '<div class="streak-card">'+
      '<div class="streak-top">'+
        '<div class="streak-flame'+(streak>0?" lit":"")+'">\ud83d\udd25</div>'+
        '<div class="streak-nums">'+
          '<div class="streak-count">'+streak+' <span>day'+(streak===1?"":"s")+'</span></div>'+
          '<div class="streak-best">Best streak: '+best+' day'+(best===1?"":"s")+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="streak-week">'+weekHtml+'</div>'+
      '<div class="streak-msg">'+escapeHtml(msg)+'</div>'+
      actionHtml+
    '</div>';

  var nb=document.getElementById("noSpendBtn");
  if(nb) nb.addEventListener("click",markNoSpendToday);
  var nu=document.getElementById("noSpendUndo");
  if(nu) nu.addEventListener("click",unmarkNoSpendToday);
}

// ---- Notifications engine ----
// Alerts are generated from current data. Each has a stable id so we can
// dedup (fire once) and track read/unread. Threshold alerts are keyed by
// month so they reset every new month.
function buildAlerts(){
  var alerts=[];
  var mk=viewedMonthKey();
  // Only generate for the *current real month*, not when browsing past months
  var realMk=(function(){ var d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1); })();
  var totals=monthTotals(realMk);

  // Overall budget thresholds 50/80/100
  if(state.budget>0){
    var bpct=(totals.expense/state.budget)*100;
    [100,80,50].forEach(function(th){
      if(bpct>=th){
        alerts.push({
          id:"budget:"+realMk+":"+th,
          sev:"info",
          icon: th>=100?"🚨":(th>=80?"⚠️":"📊"),
          title: th>=100?"Budget reached":(th>=80?"Budget almost gone":"Halfway through budget"),
          body: "You've spent "+fmt(totals.expense)+" of your "+fmt(state.budget)+" budget ("+Math.round(bpct)+"%)."
        });
      }
    });
  }

  // Per-category caps 50/80/100
  var catMap={};
  txForMonth(realMk).filter(function(t){return t.type==="expense";}).forEach(function(t){ catMap[t.category]=(catMap[t.category]||0)+t.amount; });
  Object.keys(state.categoryBudgets||{}).forEach(function(cat){
    var cap=state.categoryBudgets[cat];
    if(!(typeof cap==="number"&&cap>0)) return;
    var spent=catMap[cat]||0;
    var cpct=(spent/cap)*100;
    [100,80,50].forEach(function(th){
      if(cpct>=th){
        alerts.push({
          id:"cap:"+realMk+":"+cat+":"+th,
          sev: th>=100?"red":(th>=80?"orange":"green"),
          icon: th>=100?"🚨":(th>=80?"⚠️":"📊"),
          title: cat+(th>=100?" cap reached":(th>=80?" almost capped":" at half")),
          body: fmt(spent)+" of "+fmt(cap)+" ("+Math.round(cpct)+"%) spent on "+cat+" this month."
        });
      }
    });
  });

  // Month-end nudge (3 or fewer days left)
  (function(){
    var now=new Date();
    var last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    var left=last-now.getDate();
    if(left>=0 && left<=3){
      alerts.push({
        id:"monthend:"+realMk,
        sev:"info", icon:"📅",
        title: left===0?"Last day of the month":left+" day"+(left===1?"":"s")+" left this month",
        body: "You've spent "+fmt(totals.expense)+ (state.budget>0?" of "+fmt(state.budget):"")+" so far. Review before the month closes."
      });
    }
  })();

  // Streak milestones
  var streak=currentStreak();
  [30,14,7,3].forEach(function(m){
    if(streak>=m){
      alerts.push({ id:"streak:"+m+":"+streakEpochKey(), sev:"green", icon:"🔥",
        title: m+"-day streak!", body:"You've logged "+m+" days in a row. Keep it going!" });
    }
  });

  // fix the budget sev (ternary placeholder above)
  alerts.forEach(function(a){
    if(a.id.indexOf("budget:")===0){
      var th=parseInt(a.id.split(":").pop(),10);
      a.sev = th>=100?"red":(th>=80?"orange":"green");
    }
  });
  return alerts;
}
// A key that changes only when a streak is broken, so a milestone alert for a
// given streak-run fires once (not every day the streak continues).
function streakEpochKey(){
  var ds={}; state.transactions.forEach(function(t){ ds[t.date]=true; });
  var cursor=new Date();
  if(!ds[todayISO()]) cursor.setDate(cursor.getDate()-1);
  var last=null;
  while(true){ var k=cursor.getFullYear()+"-"+pad(cursor.getMonth()+1)+"-"+pad(cursor.getDate()); if(ds[k]){ last=k; cursor.setDate(cursor.getDate()-1);} else break; }
  return last||"none"; // the start date of the current run
}
function unreadCount(){
  var alerts=buildAlerts();
  var n=0;
  alerts.forEach(function(a){ if(!state.alertsSeen[a.id]) n++; });
  return n;
}
function refreshBell(){
  var badge=document.getElementById("bellBadge");
  if(!badge) return;
  badge.style.display = unreadCount()>0 ? "block" : "none";
}
function openNotif(){
  var alerts=buildAlerts();
  var el=document.getElementById("notifList");
  if(!alerts.length){
    el.innerHTML='<div class="notif-empty">No notifications right now.<br>Alerts about budgets, caps and streaks will show up here.</div>';
  } else {
    el.innerHTML=alerts.map(function(a){
      var unread=!state.alertsSeen[a.id];
      return '<div class="notif-item sev-'+a.sev+(unread?" unread":"")+'">'+
        '<div class="notif-icon">'+a.icon+'</div>'+
        '<div class="notif-body"><h5>'+escapeHtml(a.title)+'</h5><p>'+escapeHtml(a.body)+'</p></div>'+
      '</div>';
    }).join("");
  }
  document.getElementById("notifOverlay").classList.add("open");
  openLayer("notif",function(){ document.getElementById("notifOverlay").classList.remove("open"); });
  // mark all as seen when opened (they've now been viewed)
  var changed=false;
  alerts.forEach(function(a){ if(!state.alertsSeen[a.id]){ state.alertsSeen[a.id]=true; changed=true; } });
  if(changed){ doSave(); }
  refreshBell();
}
function closeNotif(){ if(!closeLayer("notif")) document.getElementById("notifOverlay").classList.remove("open"); }
document.getElementById("bellBtn").addEventListener("click",openNotif);
document.getElementById("notifClose").addEventListener("click",closeNotif);
document.getElementById("notifOverlay").addEventListener("click",function(e){ if(e.target===this) closeNotif(); });
document.getElementById("notifClearBtn").addEventListener("click",function(){
  var alerts=buildAlerts();
  alerts.forEach(function(a){ state.alertsSeen[a.id]=true; });
  doSave(); openNotif();
});

// ---- Donut (radial spend chart) ----
function buildDonutSvg(segments,totalLabel,subLabel){
  var size=168,r=66,cx=size/2,cy=size/2,circ=2*Math.PI*r;
  var total=segments.reduce(function(s,x){ return s+x.value; },0);
  var arcs="";
  if(total<=0){
    arcs='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--surface-2)" stroke-width="15"/>';
  } else {
    var offset=0;
    segments.forEach(function(seg){
      var frac=seg.value/total, len=Math.max(frac*circ-2,0);
      arcs+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+seg.color+'" stroke-width="15" stroke-linecap="round" stroke-dasharray="'+len+' '+(circ-len)+'" stroke-dashoffset="'+(-offset)+'"/>';
      offset+=frac*circ;
    });
  }
  return '<svg class="donut-svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+
    '<g transform="rotate(-90 '+cx+' '+cy+')">'+arcs+'</g>'+
    '<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" class="donut-total">'+escapeHtml(totalLabel)+'</text>'+
    '<text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" class="donut-sub">'+escapeHtml(subLabel)+'</text>'+
    '</svg>';
}
function renderDonut(mk,totals){
  var wrap=document.getElementById("donutWrap");
  var cats=categoryTotals(mk).slice(0,6);
  var segments=cats.map(function(c,i){ return {value:c.total,color:CAT_COLORS[i%CAT_COLORS.length]}; });
  var totalLabel,subLabel;
  if(state.budget>0){
    totalLabel=Math.round((totals.expense/state.budget)*100)+"%";
    subLabel="of "+fmt(state.budget)+" budget";
  } else {
    totalLabel=fmt(totals.expense);
    subLabel="spent this month";
  }
  wrap.innerHTML=buildDonutSvg(segments,totalLabel,subLabel);
}
function renderCategoryList(mk,totals){
  var el=document.getElementById("categoryList");
  var cats=categoryTotals(mk);
  if(!cats.length){ el.innerHTML='<div class="empty">No expenses yet this month.</div>'; return; }
  var spent=totals.expense||1;
  el.innerHTML=cats.map(function(c,i){
    var color=CAT_COLORS[i%CAT_COLORS.length];
    var pct=Math.round((c.total/spent)*100);
    var initial=c.name.trim().charAt(0).toUpperCase()||"?";
    // Optional per-category cap line
    var capHtml="";
    var cap=state.categoryBudgets&&state.categoryBudgets[c.name];
    if(typeof cap==="number" && cap>0){
      var capPct=(c.total/cap)*100;
      var capColor=capPct>=100?"var(--brick)":capPct>=80?"var(--accent)":"var(--sage)";
      var capWidth=Math.min(100,capPct);
      capHtml='<div class="cat-cap"><div class="cat-cap-track"><div class="cat-cap-fill" style="width:'+capWidth+'%;background:'+capColor+';"></div></div>'+
        '<span class="cat-cap-txt" style="color:'+capColor+';">'+fmt(c.total)+' of '+fmt(cap)+'</span></div>';
    }
    return '<div class="cat-row">'+
      '<div class="cat-icon" style="background:'+color+'26;color:'+color+';">'+initial+'</div>'+
      '<div class="cat-info">'+
        '<div class="cat-top"><span class="cat-name">'+escapeHtml(c.name)+'</span><span class="cat-pct">'+pct+'%</span></div>'+
        '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:'+pct+'%;background:'+color+';"></div></div>'+
        capHtml+
      '</div>'+
      '<div class="cat-amount">'+fmt(c.total)+'</div>'+
    '</div>';
  }).join("");
}
function renderActivity(mk){
  var el=document.getElementById("activityList");
  var tx=txForMonth(mk).slice().sort(function(a,b){ return b.date.localeCompare(a.date)||(b._order||0)-(a._order||0); });
  if(!tx.length){ el.innerHTML='<div class="empty">Nothing logged this month. Tap + to add.</div>'; return; }
  var groups={},order=[];
  tx.forEach(function(t){ if(!groups[t.date]){groups[t.date]=[];order.push(t.date);} groups[t.date].push(t); });
  var html="";
  order.forEach(function(ds){
    var dp=ds.split("-").map(Number),dObj=new Date(dp[0],dp[1]-1,dp[2]);
    html+='<div class="day-group"><div class="day-heading">'+WEEKDAYS[dObj.getDay()]+", "+dObj.getDate()+" "+MONTH_NAMES[dObj.getMonth()].slice(0,3)+'</div>';
    groups[ds].forEach(function(t){
      html+='<div class="tx-row" data-id="'+t.id+'"><div class="tx-main"><div class="tx-desc">'+escapeHtml(t.description||t.category)+'</div><div class="tx-cat">'+escapeHtml(t.category)+'</div></div><div class="tx-amount '+t.type+'">'+(t.type==="income"?"+":"−")+" "+fmt(t.amount)+'</div></div>';
    });
    html+='</div>';
  });
  el.innerHTML=html;
  Array.prototype.forEach.call(el.querySelectorAll(".tx-row"),function(row){
    row.addEventListener("click",function(){
      var t=state.transactions.find(function(x){ return x.id===row.getAttribute("data-id"); });
      if(t) openTxSheet(t);
    });
  });
}

// ---- Add/Edit ----
var txOverlay=document.getElementById("txOverlay");
function activeCatList(){ return currentType==="income" ? state.incomeCategories : state.categories; }
function populateCategorySelect(sel){
  var list=activeCatList();
  document.getElementById("txCategory").innerHTML=list.map(function(c){ return '<option value="'+escapeHtml(c)+'"'+(c===sel?' selected':'')+'>'+escapeHtml(c)+'</option>'; }).join("")+'<option value="__new__">+ Add new category…</option>';
}
function openTxSheet(tx){
  editingId=tx?tx.id:null;
  document.getElementById("txSheetTitle").textContent=tx?"Edit entry":"Add entry";
  document.getElementById("txDelete").style.display=tx?"block":"none";
  document.getElementById("txSaveAnother").style.display=tx?"none":"block";
  document.getElementById("txAmountErr").classList.remove("show");
  document.getElementById("newCatField").style.display="none";
  // For new entries, start from the last-used type so repeat logging is quick
  currentType = tx ? tx.type : (lastUsed.type||"expense");
  setTypeButtons(currentType);
  // Pick category: editing -> its own; new -> last-used if still valid, else first
  var startCat;
  if(tx){ startCat=tx.category; }
  else if(lastUsed.category && activeCatList().indexOf(lastUsed.category)>-1){ startCat=lastUsed.category; }
  else { startCat=activeCatList()[0]; }
  populateCategorySelect(startCat);
  document.getElementById("txAmount").value=tx?tx.amount:"";
  document.getElementById("txDesc").value=tx?(tx.description||""):"";
  document.getElementById("txDate").value=tx?tx.date:(lastUsed.date||todayISO());
  txOverlay.classList.add("open");
  openLayer("tx",function(){ txOverlay.classList.remove("open"); editingId=null; });
  setTimeout(function(){ document.getElementById("txAmount").focus(); },300);
}
function closeTxSheet(){ if(!closeLayer("tx")){ txOverlay.classList.remove("open"); editingId=null; } }
function setTypeButtons(type){
  currentType=type;
  document.getElementById("typeExpenseBtn").classList.toggle("active",type==="expense");
  document.getElementById("typeIncomeBtn").classList.toggle("active",type==="income");
  document.getElementById("newCatField").style.display="none";
  populateCategorySelect(activeCatList()[0]);
}
document.getElementById("typeExpenseBtn").addEventListener("click",function(){ setTypeButtons("expense"); });
document.getElementById("typeIncomeBtn").addEventListener("click",function(){ setTypeButtons("income"); });
document.getElementById("txCategory").addEventListener("change",function(){
  document.getElementById("newCatField").style.display=this.value==="__new__"?"flex":"none";
  if(this.value==="__new__") document.getElementById("newCatInput").focus();
});
document.getElementById("newCatAdd").addEventListener("click",function(){
  var name=document.getElementById("newCatInput").value.trim();
  if(!name) return;
  var list=activeCatList();
  if(list.indexOf(name)===-1) list.push(name);
  populateCategorySelect(name);
  document.getElementById("newCatField").style.display="none";
  document.getElementById("newCatInput").value="";
  doSave();
});
document.getElementById("fab").addEventListener("click",function(){ openTxSheet(null); });
document.getElementById("txCancel").addEventListener("click",closeTxSheet);
txOverlay.addEventListener("click",function(e){ if(e.target===txOverlay) closeTxSheet(); });
function commitTx(){
  var amountRaw=document.getElementById("txAmount").value;
  var amount=parseFloat(amountRaw);
  if(!amountRaw||isNaN(amount)||amount<=0){ document.getElementById("txAmountErr").classList.add("show"); return false; }
  document.getElementById("txAmountErr").classList.remove("show");
  var catVal=document.getElementById("txCategory").value;
  var category=catVal==="__new__"?activeCatList()[0]:catVal;
  var desc=document.getElementById("txDesc").value.trim();
  var date=document.getElementById("txDate").value||todayISO();
  if(editingId){
    var t=state.transactions.find(function(x){ return x.id===editingId; });
    if(t){t.type=currentType;t.amount=amount;t.category=category;t.description=desc;t.date=date;}
  } else {
    state.transactions.push({id:uid(),type:currentType,amount:amount,category:category,description:desc,date:date,_order:Date.now()});
  }
  // remember choices to speed up the next entry
  lastUsed.type=currentType; lastUsed.category=category; lastUsed.date=date;
  doSave();
  render();
  return true;
}
document.getElementById("txSave").addEventListener("click",function(){
  if(commitTx()) closeTxSheet();
});
document.getElementById("txSaveAnother").addEventListener("click",function(){
  if(!commitTx()) return;
  // keep the sheet open, reset for a fresh entry using the just-used defaults
  editingId=null;
  document.getElementById("txAmount").value="";
  document.getElementById("txDesc").value="";
  document.getElementById("txAmount").focus();
  // brief confirmation flash on the button
  var b=document.getElementById("txSaveAnother"); var old=b.textContent;
  b.textContent="Added ✓"; setTimeout(function(){ b.textContent=old; },900);
});
document.getElementById("txDelete").addEventListener("click",function(){
  var id=editingId;
  var t=state.transactions.find(function(x){ return x.id===id; });
  if(!t){ closeTxSheet(); return; }
  var removed={id:t.id,type:t.type,amount:t.amount,category:t.category,description:t.description,date:t.date,_order:t._order};
  closeTxSheet();
  // optimistic delete + undo window (no blocking confirm dialog)
  state.transactions=state.transactions.filter(function(x){ return x.id!==id; });
  doSave(); render();
  showUndo("Entry deleted", removed);
});
function showUndo(msg, removedTx){
  var toast=document.getElementById("undoToast");
  document.getElementById("undoToastMsg").textContent=msg;
  pendingUndo=removedTx;
  toast.classList.add("show");
  clearTimeout(undoTimer);
  undoTimer=setTimeout(function(){ toast.classList.remove("show"); pendingUndo=null; },5000);
}
document.getElementById("undoToastBtn").addEventListener("click",function(){
  if(pendingUndo){
    state.transactions.push(pendingUndo);
    pendingUndo=null;
    doSave(); render();
  }
  clearTimeout(undoTimer);
  document.getElementById("undoToast").classList.remove("show");
});

// ---- Settings ----
var settingsOverlay=document.getElementById("settingsOverlay");
var SETTINGS_PANELS = ["panelCategories","panelBudgets","panelPrefs","panelAccount","panelData","panelAbout","panelStory"];
var PANEL_TITLES = { panelCategories:"Categories", panelBudgets:"Budgets & caps", panelPrefs:"Preferences", panelAccount:"Account & security", panelData:"Data", panelAbout:"About & what's new", panelStory:"The story & my mission" };
function showSettingsMenu(){
  document.getElementById("settingsMenu").style.display="block";
  SETTINGS_PANELS.forEach(function(p){ document.getElementById(p).style.display="none"; });
  document.getElementById("settingsBack").style.display="none";
  document.getElementById("settingsTitle").textContent="Settings";
}
function openSettingsPanel(id){
  document.getElementById("settingsMenu").style.display="none";
  SETTINGS_PANELS.forEach(function(p){ document.getElementById(p).style.display=(p===id?"block":"none"); });
  document.getElementById("settingsBack").style.display="flex";
  document.getElementById("settingsTitle").textContent=PANEL_TITLES[id]||"Settings";
  // lazy-fill each panel's dynamic content when opened
  if(id==="panelCategories"){ renderCatManageList(); renderIncomeCatManageList(); }
  if(id==="panelBudgets"){
    document.getElementById("budgetInput").value=state.budget||"";
    document.getElementById("budgetLabel").textContent="Monthly budget ("+state.currency+")";
    renderCatBudgetList();
  }
  if(id==="panelPrefs"){
    var cs=document.getElementById("currencySelect");
    cs.innerHTML=Object.keys(CURRENCIES).map(function(c){ return '<option value="'+c+'"'+(c===state.currency?' selected':'')+'>'+c+'</option>'; }).join("");
    try{ document.getElementById("langSelect").value=localStorage.getItem("ledger_lang")||"en"; }catch(e){}
    setPrefThemeButtons(currentTheme);
  }
  if(id==="panelAccount"){ renderAccountInfo(); }
  if(id==="panelAbout"){ renderAbout(); }
  openLayer("settingsPanel",showSettingsMenu);
}
function openSettings(){
  showSettingsMenu();
  settingsOverlay.classList.add("open");
  openLayer("settings",function(){ settingsOverlay.classList.remove("open"); });
}
function closeSettings(){
  if(!closeLayer("settings")) settingsOverlay.classList.remove("open");
}
document.getElementById("settingsBtn").addEventListener("click",openSettings);
document.getElementById("settingsClose").addEventListener("click",closeSettings);
document.getElementById("settingsBack").addEventListener("click",function(){
  if(!closeLayer("settingsPanel")) showSettingsMenu();
});
settingsOverlay.addEventListener("click",function(e){ if(e.target===settingsOverlay) closeSettings(); });
Array.prototype.forEach.call(document.querySelectorAll(".settings-item[data-panel]"),function(btn){
  btn.addEventListener("click",function(){ openSettingsPanel(btn.getAttribute("data-panel")); });
});

// Budget save (Budgets panel)
document.getElementById("saveBudgetBtn").addEventListener("click",function(){
  var v=parseFloat(document.getElementById("budgetInput").value);
  state.budget=isNaN(v)||v<0?0:v;
  doSave(); render();
  var b=document.getElementById("saveBudgetBtn"); var o=b.textContent; b.textContent="Saved ✓"; setTimeout(function(){ b.textContent=o; },900);
});
// Preferences save (currency + language + theme)
function setPrefThemeButtons(t){
  document.getElementById("prefThemeDay").classList.toggle("active",t==="day");
  document.getElementById("prefThemeNight").classList.toggle("active",t==="night");
}
document.getElementById("prefThemeDay").addEventListener("click",function(){ applyTheme("day"); try{localStorage.setItem("ledger_theme","day");}catch(e){} setPrefThemeButtons("day"); });
document.getElementById("prefThemeNight").addEventListener("click",function(){ applyTheme("night"); try{localStorage.setItem("ledger_theme","night");}catch(e){} setPrefThemeButtons("night"); });
document.getElementById("currencySelect").addEventListener("change",function(){
  var lbl=document.getElementById("budgetLabel"); if(lbl) lbl.textContent="Monthly budget ("+this.value+")";
});
document.getElementById("savePrefsBtn").addEventListener("click",function(){
  var cur=document.getElementById("currencySelect").value;
  if(CURRENCIES[cur]) state.currency=cur;
  var lang=document.getElementById("langSelect").value;
  try{ localStorage.setItem("ledger_lang",lang); }catch(e){}
  doSave(); render();
  var b=document.getElementById("savePrefsBtn"); var o=b.textContent; b.textContent="Saved ✓"; setTimeout(function(){ b.textContent=o; },900);
});

// Account info + email-upgrade visibility
function renderAccountInfo(){
  var el=document.getElementById("accountInfo");
  var name=((state.profile.first||"")+" "+(state.profile.last||"")).trim()||"—";
  var kind = currentUser&&currentUser.isGuest ? "Quick / Guest account" : "Email account";
  var idLine = currentUser&&currentUser.isGuest
    ? '<div><span class="ai-label">Username: </span><span class="ai-value">'+escapeHtml((currentUser.email||"").split("@")[0])+'</span></div>'
    : '<div><span class="ai-label">Email: </span><span class="ai-value">'+escapeHtml(currentUser?currentUser.email:"")+'</span></div>';
  el.innerHTML='<div><span class="ai-label">Name: </span><span class="ai-value">'+escapeHtml(name)+'</span></div>'+
    idLine+
    '<div><span class="ai-label">Type: </span><span class="ai-value">'+kind+'</span></div>';
  document.getElementById("addEmailSection").style.display=(currentUser&&currentUser.isGuest)?"block":"none";
  // fill the name editor with what's currently stored
  document.getElementById("profileFirst").value=(state.profile&&state.profile.first)||"";
  document.getElementById("profileLast").value=(state.profile&&state.profile.last)||"";
  document.getElementById("profileNameErr").textContent="";
  document.getElementById("profileNameMsg").textContent="";
}

// Save an edited name: lives in state.profile, so it syncs with everything else.
document.getElementById("saveNameBtn").addEventListener("click",function(){
  var errEl=document.getElementById("profileNameErr");
  var msgEl=document.getElementById("profileNameMsg");
  errEl.textContent=""; msgEl.textContent="";
  var first=document.getElementById("profileFirst").value.trim();
  var last=document.getElementById("profileLast").value.trim();
  if(!first){ errEl.textContent="Please enter a first name."; return; }
  if(first.length>40||last.length>40){ errEl.textContent="That's a bit long \u2014 keep it under 40 characters."; return; }
  state.profile={first:first,last:last};
  doSave();
  renderAccountInfo();
  render();               // refresh the welcome greeting on the home screen
  msgEl.textContent="Name updated.";
  setTimeout(function(){ msgEl.textContent=""; },2500);
});


// About + What's New + Features
function renderAbout(){
  document.getElementById("aboutVersion").textContent="Version "+APP_VERSION;
  document.getElementById("whatsNewList").innerHTML=CHANGELOG.slice(0,6).map(function(c){
    return '<div class="whatsnew-item"><h5>'+escapeHtml(c.title)+'</h5><p>'+escapeHtml(c.body)+'</p></div>';
  }).join("");
  document.getElementById("featuresList").innerHTML=FEATURES.map(function(f){
    return '<div class="feature-item"><b>'+escapeHtml(f.name)+'</b><span>'+escapeHtml(f.desc)+'</span></div>';
  }).join("");
}

// What's New dismissible card on the home screen (shows once per new version)
function renderWhatsNewCard(){
  var slot=document.getElementById("whatsNewSlot");
  if(!slot) return;
  var seen=null;
  try{ seen=localStorage.getItem("ledger_seen_version"); }catch(e){}
  if(seen===APP_VERSION){ slot.innerHTML=""; return; }
  var latest=CHANGELOG.filter(function(c){ return c.v===APP_VERSION; });
  if(!latest.length){ slot.innerHTML=""; return; }
  var titles=latest.map(function(c){ return c.title; }).join(", ");
  slot.innerHTML='<div class="whatsnew-card"><h4>✨ What\'s new in v'+APP_VERSION+'</h4><p>'+escapeHtml(titles)+'</p>'+
    '<div class="wn-actions"><button class="wn-see" id="wnSee">See details</button><button class="wn-dismiss" id="wnDismiss">Dismiss</button></div></div>';
  document.getElementById("wnSee").addEventListener("click",function(){
    try{ localStorage.setItem("ledger_seen_version",APP_VERSION); }catch(e){}
    slot.innerHTML="";
    openSettings(); openSettingsPanel("panelAbout");
  });
  document.getElementById("wnDismiss").addEventListener("click",function(){
    try{ localStorage.setItem("ledger_seen_version",APP_VERSION); }catch(e){}
    slot.innerHTML="";
  });
}
function renderCatManageList(){
  var el=document.getElementById("catManageList");
  el.innerHTML=state.categories.map(function(c){ return '<div class="cat-manage-row"><span>'+escapeHtml(c)+'</span><button data-cat="'+escapeHtml(c)+'">remove</button></div>'; }).join("");
  Array.prototype.forEach.call(el.querySelectorAll("button"),function(btn){
    btn.addEventListener("click",function(){
      var cat=btn.getAttribute("data-cat");
      var inUse=state.transactions.some(function(t){ return t.type==="expense"&&t.category===cat; });
      function doRemove(){ state.categories=state.categories.filter(function(c){ return c!==cat; }); if(state.categoryBudgets){ delete state.categoryBudgets[cat]; } doSave(); renderCatManageList(); }
      if(inUse) showConfirm('Remove "'+cat+'"?',"Past entries keep their label but it won't appear in the picker.",doRemove);
      else doRemove();
    });
  });
}
function renderIncomeCatManageList(){
  var el=document.getElementById("incomeCatManageList");
  el.innerHTML=state.incomeCategories.map(function(c){ return '<div class="cat-manage-row"><span>'+escapeHtml(c)+'</span><button data-cat="'+escapeHtml(c)+'">remove</button></div>'; }).join("");
  Array.prototype.forEach.call(el.querySelectorAll("button"),function(btn){
    btn.addEventListener("click",function(){
      var cat=btn.getAttribute("data-cat");
      var inUse=state.transactions.some(function(t){ return t.type==="income"&&t.category===cat; });
      function doRemove(){ state.incomeCategories=state.incomeCategories.filter(function(c){ return c!==cat; }); doSave(); renderIncomeCatManageList(); }
      if(inUse) showConfirm('Remove "'+cat+'"?',"Past entries keep their label but it won't appear in the picker.",doRemove);
      else doRemove();
    });
  });
}
document.getElementById("settingsNewCatAdd").addEventListener("click",function(){
  var input=document.getElementById("settingsNewCat");
  var name=input.value.trim(); if(!name) return;
  if(state.categories.indexOf(name)===-1) state.categories.push(name);
  input.value=""; doSave(); renderCatManageList();
});
document.getElementById("settingsNewIncomeCatAdd").addEventListener("click",function(){
  var input=document.getElementById("settingsNewIncomeCat");
  var name=input.value.trim(); if(!name) return;
  if(state.incomeCategories.indexOf(name)===-1) state.incomeCategories.push(name);
  input.value=""; doSave(); renderIncomeCatManageList();
});

// ---- Category budgets (per-category caps) ----
function renderCatBudgetList(){
  var listEl=document.getElementById("catBudgetList");
  var names=Object.keys(state.categoryBudgets||{}).filter(function(k){ return typeof state.categoryBudgets[k]==="number" && state.categoryBudgets[k]>0; });
  if(!names.length){
    listEl.innerHTML='<p style="font-size:12px;color:var(--text-faint);margin:0 0 4px;">No category caps set yet.</p>';
  } else {
    listEl.innerHTML=names.map(function(n){
      return '<div class="cat-budget-row"><span class="cbname">'+escapeHtml(n)+'</span><span class="cbamt">'+fmt(state.categoryBudgets[n])+'</span><button data-cb="'+escapeHtml(n)+'">remove</button></div>';
    }).join("");
    Array.prototype.forEach.call(listEl.querySelectorAll("button"),function(btn){
      btn.addEventListener("click",function(){
        var n=btn.getAttribute("data-cb");
        delete state.categoryBudgets[n];
        doSave(); renderCatBudgetList(); render();
      });
    });
  }
  // populate dropdown with expense categories that don't already have a cap
  var sel=document.getElementById("catBudgetSelect");
  var avail=state.categories.filter(function(c){ return !(state.categoryBudgets && state.categoryBudgets[c]>0); });
  sel.innerHTML=avail.length ? avail.map(function(c){ return '<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>'; }).join("")
                             : '<option value="">All categories capped</option>';
}
document.getElementById("catBudgetAddBtn").addEventListener("click",function(){
  var cat=document.getElementById("catBudgetSelect").value;
  var amt=parseFloat(document.getElementById("catBudgetAmount").value);
  if(!cat){ return; }
  if(isNaN(amt)||amt<=0){ return; }
  if(!state.categoryBudgets) state.categoryBudgets={};
  state.categoryBudgets[cat]=amt;
  document.getElementById("catBudgetAmount").value="";
  doSave(); renderCatBudgetList(); render();
});

// ---- Guest → email upgrade ----
wireShowPw("upgradeShowPw",["upgradePassword","upgradePassword2"]);
document.getElementById("upgradeBtn").addEventListener("click",function(){
  var email=document.getElementById("upgradeEmail").value.trim();
  var pw=document.getElementById("upgradePassword").value;
  var pw2=document.getElementById("upgradePassword2").value;
  var errEl=document.getElementById("upgradeErr"), msgEl=document.getElementById("upgradeMsg");
  errEl.textContent=""; msgEl.textContent="";
  if(!email){ errEl.textContent="Enter an email."; return; }
  if(!pw||pw.length<6){ errEl.textContent="Password must be at least 6 characters."; return; }
  if(pw!==pw2){ errEl.textContent="Passwords don't match."; return; }
  var btn=document.getElementById("upgradeBtn"); btn.textContent="…";
  // Update the current auth user's email + password. Email change triggers a
  // verification email from Supabase; data stays under the same user id.
  sbFetch("/auth/v1/user","PUT",{email:email,password:pw},currentUser.token).then(function(r){return r.json();}).then(function(d){
    if(d.error){ errEl.textContent=d.error.message||"Couldn't add email. Try a different one."; btn.textContent="Add email & secure"; return; }
    msgEl.textContent="Almost done! Check "+email+" and click the verification link to finish securing your account.";
    btn.textContent="Add email & secure";
  }).catch(function(){ errEl.textContent="Network error. Check your internet connection."; btn.textContent="Add email & secure"; });
});

document.getElementById("resetDataBtn").addEventListener("click",function(){
  showConfirm("Erase all your data?","All entries, categories, and your budget will be permanently deleted.",function(){
    var keepProfile=state.profile, keepCur=state.currency;
    state=freshState();
    state.profile=keepProfile; state.currency=keepCur; // keep who they are + currency
    doSave(); render(); closeSettings();
  });
});

// ---- Import ----
function parseAmount(s){ s=(s||"").replace(/[^0-9.,\-]/g,""); if(!s) return 0; if(s.indexOf(",")>-1&&s.indexOf(".")>-1) s=s.replace(/\./g,"").replace(",","."); else if(s.indexOf(",")>-1) s=s.replace(",","."); var n=parseFloat(s); return isNaN(n)?0:n; }
function parseDateFlexible(s){ s=(s||"").trim(); var m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if(m) return m[1]+"-"+pad(+m[2])+"-"+pad(+m[3]); m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if(m) return m[3]+"-"+pad(+m[2])+"-"+pad(+m[1]); m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m) return m[3]+"-"+pad(+m[2])+"-"+pad(+m[1]); return null; }
document.getElementById("importBtn").addEventListener("click",function(){
  var text=document.getElementById("importTextarea").value;
  var resultEl=document.getElementById("importResult");
  if(!text.trim()){ resultEl.textContent="Paste some rows first."; return; }
  var lines=text.split(/\r?\n/).filter(function(l){ return l.trim().length; });
  var added=0,skipped=0;
  lines.forEach(function(line){
    var cols=line.indexOf("\t")>-1?line.split("\t"):line.split(",");
    if(cols.length<3){skipped++;return;}
    var rawDate=(cols[0]||"").trim(),desc=(cols[1]||"").trim(),cat=(cols[2]||"").trim()||"Miscellaneous";
    var expenseRaw=(cols[3]||"").trim(),incomeRaw=(cols[4]||"").trim();
    if(/date/i.test(rawDate)&&/desc/i.test(desc)) return;
    var dateISO=parseDateFlexible(rawDate);
    if(!dateISO){skipped++;return;}
    if(state.categories.indexOf(cat)===-1) state.categories.push(cat);
    var any=false;
    if(expenseRaw){ var a=parseAmount(expenseRaw); if(a>0){state.transactions.push({id:uid(),type:"expense",amount:a,category:cat,description:desc,date:dateISO,_order:Date.now()+added});added++;any=true;} }
    if(incomeRaw){ var a2=parseAmount(incomeRaw); if(a2>0){state.transactions.push({id:uid(),type:"income",amount:a2,category:cat,description:desc,date:dateISO,_order:Date.now()+added});added++;any=true;} }
    if(!any) skipped++;
  });
  resultEl.textContent="Imported "+added+" entr"+(added===1?"y":"ies")+(skipped?", skipped "+skipped+" row"+(skipped===1?"":"s")+" that couldn't be read":".")+" Saving to cloud…";
  if(added>0){ doSave(); render(); renderCatManageList(); document.getElementById("importTextarea").value=""; }
});

// ---- Confirm ----
var confirmOverlay=document.getElementById("confirmOverlay");
function showConfirm(title,msg,onOk){
  document.getElementById("confirmTitle").textContent=title;
  document.getElementById("confirmMsg").textContent=msg;
  pendingConfirmAction=onOk;
  confirmOverlay.classList.add("open");
  openLayer("confirm",function(){ confirmOverlay.classList.remove("open"); pendingConfirmAction=null; });
}
document.getElementById("confirmCancel").addEventListener("click",function(){ if(!closeLayer("confirm")){ confirmOverlay.classList.remove("open"); pendingConfirmAction=null; } });
document.getElementById("confirmOk").addEventListener("click",function(){ var act=pendingConfirmAction; if(!closeLayer("confirm")) confirmOverlay.classList.remove("open"); pendingConfirmAction=null; if(act) act(); });

// ---- PDF export ----
function buildPrintArea(){
  var mk=viewedMonthKey(),d=viewedMonthDate();
  var lbl=MONTH_NAMES[d.getMonth()]+" "+d.getFullYear();
  var tx=txForMonth(mk).slice().sort(function(a,b){ return a.date.localeCompare(b.date)||(a._order||0)-(b._order||0); });
  var totals=monthTotals(mk),net=totals.income-totals.expense;
  var rows="",lastDate=null;
  tx.forEach(function(t){
    var isNew=t.date!==lastDate; lastDate=t.date;
    var dp=t.date.split("-").map(Number),dObj=new Date(dp[0],dp[1]-1,dp[2]);
    var dl=WEEKDAYS[dObj.getDay()].slice(0,3)+" "+dObj.getDate()+" "+MONTH_NAMES[dObj.getMonth()].slice(0,3);
    rows+='<tr'+(isNew?' class="day-sep"':'')+'>'+
      '<td>'+(isNew?escapeHtml(dl):"")+'</td>'+
      '<td>'+escapeHtml(t.description||"—")+'</td>'+
      '<td>'+escapeHtml(t.category)+'</td>'+
      '<td class="num">'+(t.type==="expense"?fmt(t.amount):"—")+'</td>'+
      '<td class="num'+(t.type==="income"?" income-val":"")+'">'+(t.type==="income"?fmt(t.amount):"—")+'</td></tr>';
  });
  if(!tx.length) rows='<tr><td colspan="5" style="color:#888;padding:14px 8px;">No entries this month.</td></tr>';
  var cats=categoryTotals(mk);
  var catHtml=cats.map(function(c){ return '<tr><td>'+escapeHtml(c.name)+'</td><td class="num">'+fmt(c.total)+'</td></tr>'; }).join("");
  document.getElementById("printArea").innerHTML=
    '<h1>Ledger — '+lbl+'</h1>'+
    '<div class="print-sub">'+escapeHtml(currentUser?currentUser.email:"")+' · Exported '+new Date().toLocaleDateString('de-DE')+'</div>'+
    '<div class="print-summary">'+
      '<div><span class="lbl">Expenses</span><span class="val">'+fmt(totals.expense)+'</span></div>'+
      '<div><span class="lbl">Income</span><span class="val">'+fmt(totals.income)+'</span></div>'+
      '<div><span class="lbl">Net</span><span class="val">'+fmt(net)+'</span></div>'+
    '</div>'+
    '<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Expense</th><th>Income</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    (catHtml?'<div class="cat-summary"><h2>By category</h2><table><tbody>'+catHtml+'</tbody></table></div>':"");
}
document.getElementById("exportBtn").addEventListener("click",function(){ buildPrintArea(); setTimeout(function(){ window.print(); },50); });

// ---- Month nav ----
document.getElementById("prevMonth").addEventListener("click",function(){ viewMonthOffset--; render(); });
document.getElementById("nextMonth").addEventListener("click",function(){ if(viewMonthOffset<0){viewMonthOffset++;render();} });

// ---- Swipe-down-to-dismiss for bottom sheets ----
// The little handle pill implies a drag gesture, so make it real. Without this
// the swipe chains up to the page and fires Chrome's pull-to-refresh instead.
function enableSheetDrag(overlayId, closeFn){
  var overlay=document.getElementById(overlayId);
  if(!overlay) return;
  var sheet=overlay.querySelector(".sheet");
  if(!sheet) return;
  var startY=0, dy=0, startT=0, dragging=false;

  sheet.addEventListener("touchstart", function(e){
    if(e.touches.length!==1){ dragging=false; return; }
    var tag=(e.target.tagName||"").toLowerCase();
    // don't hijack the gesture from form controls
    if(tag==="input"||tag==="textarea"||tag==="select"){ dragging=false; return; }
    startY=e.touches[0].clientY;
    dy=0; startT=Date.now();
    // only drag when the sheet's own content is already scrolled to the top
    dragging=(sheet.scrollTop<=0);
  }, {passive:true});

  sheet.addEventListener("touchmove", function(e){
    if(!dragging) return;
    dy=e.touches[0].clientY-startY;
    if(dy<=0){
      // pulled back up — hand control back to normal scrolling
      sheet.classList.remove("dragging");
      sheet.style.transform="";
      return;
    }
    sheet.classList.add("dragging");
    // slight resistance so it feels attached rather than loose
    sheet.style.transform="translateY("+(dy*0.9)+"px)";
    if(e.cancelable) e.preventDefault();   // this is what blocks pull-to-refresh
  }, {passive:false});

  function endDrag(){
    if(!dragging){ return; }
    var dt=Date.now()-startT;
    var velocity=dy/(dt||1);
    sheet.classList.remove("dragging");
    sheet.style.transform="";
    dragging=false;
    // far enough, or a quick flick
    if(dy>110 || (dy>40 && velocity>0.5)){ closeFn(); }
    dy=0;
  }
  sheet.addEventListener("touchend", endDrag);
  sheet.addEventListener("touchcancel", endDrag);
}
enableSheetDrag("txOverlay", closeTxSheet);
enableSheetDrag("settingsOverlay", closeSettings);
enableSheetDrag("notifOverlay", closeNotif);

// ---- Start ----
boot();
})();
