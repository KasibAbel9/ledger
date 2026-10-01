(function(){
"use strict";

var SUPABASE_URL = "https://issreohiuzgbsujcdexq.supabase.co";
var SUPABASE_KEY = "sb_publishable_3Bn5vHh4AXyTu2tehjyShg_ef6kwtH2";
var GUEST_FN_URL = SUPABASE_URL + "/functions/v1/guest-signup";
var GUEST_EMAIL_DOMAIN = "@guest.ledger.local";

var APP_VERSION = "1.9.1";
// Newest first. `v` is the version an item shipped in.
var CHANGELOG = [
  { v:"1.9.1", title:"Daily reminder & a new notification icon", body:"If you haven\u2019t logged anything by 8:30 pm, Ledger sends a gentle reminder (switch it off under More \u2192 Notifications). Notifications now show a \u20ac symbol in the status bar instead of the generic bell." },
  { v:"1.9.0", title:"Reminders on your phone", body:"Ledger can now send a real notification at 9 pm before a subscription payment, even when the app is closed. Turn it on under More \u2192 Notifications (or from the Subscriptions tab) and send yourself a test. How many days before is set on each subscription." },
  { v:"1.8.1", title:"Expenses and subscriptions are linked", body:"Add entry has a new Repeat option (Monthly, Quarterly, Yearly). Pick the Subscriptions category and it switches to Monthly on its own: saving logs today\u2019s payment and adds the subscription. The other way round, adding a subscription can also add the payment you\u2019ve already made this cycle, so it shows up in your expenses straight away." },
  { v:"1.8.0", title:"Subscriptions", body:"The Accounts tab is now Subscriptions. Add Netflix, your gym, rent — anything that repeats monthly, quarterly or yearly. On the payment date Ledger adds it to your expenses automatically, and the bell reminds you a few days before (you choose how many). Sort by date or price, filter by category or payment method, and pause anything you're not using." },
  { v:"1.8.0", title:"Budgets page fixed", body:"The Budgets & caps page no longer runs off the left edge of the screen on phones." },
  { v:"1.7.2", title:"Crisp donut edges", body:"Category segments on the Analysis donut now end in a flat, straight edge instead of a rounded cap, so colours line up cleanly against the separators instead of bulging past them." },
  { v:"1.7.1", title:"Donut separators fixed", body:"The thin separators between categories on the Analysis donut chart were rotated 90\u00b0 off from the actual colour boundaries. They now sit exactly where each category starts and ends." },
  { v:"1.7.0", title:"Smoother everywhere", body:"Tabs, the More menu and buttons now transition instead of snapping. The Add-entry sheet no longer hides its \u201cSave & add another\u201d button behind the nav bar, the Analysis donut chart has clean separators between categories, and a couple of tight-margin screens under More got proper breathing room." },
  { v:"1.6.0", title:"Bottom navigation", body:"Ledger now has a proper bottom bar: Home, Analysis, Accounts, and More. Settings moved from a pop-up sheet into its own More tab. Every tab keeps its own scroll position, and the back button returns you to Home first." },
  { v:"1.5.4", title:"Status bar fix", body:"Fixed the status bar clashing with icon colour on some Android phones by matching it to your phone's own light/dark setting." },
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
  { name:"Subscriptions", desc:"Recurring payments logged automatically on their date, with reminders before each charge." },
  { name:"Phone notifications", desc:"A 9 pm reminder before each subscription payment, even with the app closed." },
  { name:"Category caps", desc:"Optional per-category spending limits." },
  { name:"Quick / Guest login", desc:"Username + PIN, no email needed." },
  { name:"Multi-currency", desc:"EUR, USD, INR, AED." },
  { name:"Day / night themes", desc:"Sun-moon toggle, auto by time of day." },
  { name:"Excel import", desc:"Paste rows straight from a spreadsheet." },
  { name:"PDF export", desc:"Printable monthly statement." },
  { name:"Install to home screen", desc:"Use it like a native app, offline-friendly shell." },
  { name:"Savings plans (coming soon)", desc:"Tailored saving plans based on your own spending patterns — in the works." }
];
var DEFAULT_CATEGORIES = ["Groceries","Food & Dining","Transport","Utilities","Rent","Subscriptions","Family","Friends","Healthcare","Shopping","Self Growth","Entertainment & Travel","Sadaqa","Miscellaneous"];
var SUB_CATEGORY = "Subscriptions";
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
  profile:{ first:"", last:"" },
  subscriptions:[],
  subsCatSeeded:false,
  dailyReminder:true
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
  // Two tags exist (one per prefers-color-scheme); keep both pointed at the
  // in-app theme's colour so the visible one always matches what's on screen.
  document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){
    m.setAttribute("content", col);
  });
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
// history.go() is async: opening a new layer right after closing one would get
// undone by the still-pending back step. Work that must follow a close waits here.
var pendingAfterPop=null;
window.addEventListener("popstate",function(){
  if(layerStack.length){
    var top=layerStack.pop();
    try{ top.close(); }catch(e){}
  }
  if(pendingAfterPop){ var fn=pendingAfterPop; pendingAfterPop=null; fn(); }
});

// ---- Bottom-nav tabs ----
// All four tab panels stay in the DOM at all times (never rebuilt), so
// switching tabs is just a display toggle and each tab keeps its own
// scroll position automatically.
var TAB_IDS = { home:"app", analysis:"tabAnalysis", subs:"tabSubs", more:"tabMore" };
var currentTab = "home";
function paintTab(name){
  Object.keys(TAB_IDS).forEach(function(t){
    var el=document.getElementById(TAB_IDS[t]);
    if(!el) return;
    if(t===name){
      el.style.display="block";
      // restart the fade-in animation on the tab that just became visible
      el.classList.remove("tab-anim");
      void el.offsetWidth;
      el.classList.add("tab-anim");
    } else {
      el.style.display="none";
      el.classList.remove("tab-anim");
    }
  });
  document.querySelectorAll(".nav-btn").forEach(function(b){
    b.classList.toggle("active", b.getAttribute("data-tab")===name);
  });
  currentTab=name;
}
// User-initiated tab switch (nav-bar tap). Leaving Home pushes exactly one
// history entry, so a single hardware back-press from anywhere else always
// returns to Home first, rather than exiting the app.
function goToTab(name){
  if(name===currentTab) return;
  if(currentTab==="home" && name!=="home"){
    paintTab(name);
    openLayer("tab",function(){ paintTab("home"); });
  } else if(name==="home"){
    if(!closeLayer("tab")) paintTab("home");
  } else {
    paintTab(name); // moving between two non-Home tabs — no history change
  }
}
document.querySelectorAll(".nav-btn").forEach(function(b){
  b.addEventListener("click",function(){ goToTab(b.getAttribute("data-tab")); });
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
        state.subscriptions = Array.isArray(d.subscriptions)?d.subscriptions:[];
        state.subsCatSeeded = d.subsCatSeeded===true;
        state.dailyReminder = d.dailyReminder!==false;
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
  // App left open overnight and brought back: log any subscription that fell due meanwhile.
  if(document.visibilityState==="visible" && currentUser && dataLoaded){
    if(processSubscriptions()){ doSave(); render(); }
  }
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
  document.getElementById("appShell").style.display="none";
  document.getElementById("authScreen").style.display="flex";
  showAuthPanel("landingWrap");
  refreshInstallBanner();
}
function showApp(mode){
  document.getElementById("loadingScreen").style.display="none";
  document.getElementById("authScreen").style.display="none";
  document.getElementById("appShell").style.display="block";
  document.getElementById("app").style.display="block"; // Home tab starts active
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
  // One-time: give existing accounts the new "Subscriptions" category.
  // The flag stops it coming back if the user deletes it later.
  var needsSave=false;
  if(!state.subsCatSeeded){
    if(state.categories.indexOf(SUB_CATEGORY)===-1) state.categories.push(SUB_CATEGORY);
    state.subsCatSeeded=true; needsSave=true;
  }
  if(processSubscriptions()) needsSave=true;
  if(needsSave) doSave();
  render();
  renderWhatsNewCard();
  refreshPushOnOpen();
  handleOpenTabParam();
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
function freshState(){ return {transactions:[],categories:DEFAULT_CATEGORIES.slice(),incomeCategories:DEFAULT_INCOME_CATEGORIES.slice(),budget:0,categoryBudgets:{},bestStreak:0,noSpendDays:[],alertsSeen:{},currency:"EUR",profile:{first:"",last:""},subscriptions:[],subsCatSeeded:true,dailyReminder:true}; }
document.getElementById("signOutBtn").addEventListener("click",function(){
  showConfirm("Sign out?","You'll need to sign in again on this device.",function(){
    if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; } // cancel any pending save
    if(currentUser){ pushSignOut(currentUser.token); signOut(currentUser.token).catch(function(){}); }
    saveSession(null);
    currentUser=null;
    dataLoaded=false; // block saves until a real load happens again
    state=freshState();
    paintTab("home"); layerStack=[];
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
// Auto-logged subscription entries don't count toward the streak or the
// "nothing logged today" nudge: those track the user's own logging habit.
function loggedOn(iso){ return state.transactions.some(function(t){ return t.date===iso && !t.subId; }); }
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
  var ds={};state.transactions.forEach(function(t){ if(!t.subId) ds[t.date]=true; });
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
  renderSubs();
}
function renderBudgetBlock(spent){
  var el=document.getElementById("budgetBlock");
  if(!state.budget){
    el.innerHTML='<div class="budget-cta"><span>No monthly budget set</span><button id="setBudgetInline">Set one</button></div>';
    document.getElementById("setBudgetInline").addEventListener("click",function(){ goToTab("more"); openSettingsPanel("panelBudgets"); });
    return;
  }
  var pct=Math.min(100,(spent/state.budget)*100);
  var color=pct>=100?"var(--brick)":pct>=70?"var(--accent)":"var(--sage)";
  el.innerHTML='<div class="budget-row"><span>'+fmt(spent)+' of '+fmt(state.budget)+'</span><button id="editBudgetInline">edit</button></div><div class="budget-bar-track"><div class="budget-bar-fill" style="width:'+pct+'%;background:'+color+';"></div></div>';
  document.getElementById("editBudgetInline").addEventListener("click",function(){ goToTab("more"); openSettingsPanel("panelBudgets"); });
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
  var logged={}; state.transactions.forEach(function(t){ if(!t.subId) logged[t.date]=true; });
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
  // Subscription reminders and "just logged" notes go first — they're the most time-sensitive.
  return subAlerts().concat(alerts);
}
// A key that changes only when a streak is broken, so a milestone alert for a
// given streak-run fires once (not every day the streak continues).
function streakEpochKey(){
  var ds={}; state.transactions.forEach(function(t){ if(!t.subId) ds[t.date]=true; });
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
  var arcs="", seps="";
  if(total<=0){
    arcs='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--surface-2)" stroke-width="15"/>';
  } else {
    var offset=0;
    segments.forEach(function(seg){
      var frac=seg.value/total, len=frac*circ;
      arcs+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+seg.color+'" stroke-width="15" stroke-linecap="butt" stroke-dasharray="'+len+' '+(circ-len)+'" stroke-dashoffset="'+(-offset)+'"/>';
      offset+=frac*circ;
    });
    // Thin card-coloured separators drawn on top at each segment boundary —
    // without these the rounded end-caps of adjacent arcs visually overlap
    // and the colours run together.
    if(segments.length>1){
      var cum=0;
      segments.forEach(function(seg){
        var deg=(cum/total)*360;
        seps+='<line x1="'+(cx+r-9)+'" y1="'+cy+'" x2="'+(cx+r+9)+'" y2="'+cy+'" stroke="var(--surface)" stroke-width="3" stroke-linecap="round" transform="rotate('+deg+' '+cx+' '+cy+')"/>';
        cum+=seg.value;
      });
    }
  }
  return '<svg class="donut-svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+
    '<g transform="rotate(-90 '+cx+' '+cy+')">'+arcs+seps+'</g>'+
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
      html+='<div class="tx-row" data-id="'+t.id+'"><div class="tx-main"><div class="tx-desc">'+escapeHtml(t.description||t.category)+'</div><div class="tx-cat">'+escapeHtml(t.category)+(t.subId?'<span class="tx-tag">↻ Subscription</span>':'')+'</div></div><div class="tx-amount '+t.type+'">'+(t.type==="income"?"+":"−")+" "+fmt(t.amount)+'</div></div>';
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
  txRepeatTouched=false;
  document.getElementById("txDescErr").classList.remove("show");
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
  setTxRepeat("none",false);
  refreshRepeatUI(tx);
  applyRepeatDefault();
  txOverlay.classList.add("open");
  openLayer("tx",function(){ txOverlay.classList.remove("open"); editingId=null; });
  setTimeout(function(){ document.getElementById("txAmount").focus(); },300);
}
function closeTxSheet(){ if(!closeLayer("tx")){ txOverlay.classList.remove("open"); editingId=null; } }
function editingTx(){ return editingId ? state.transactions.find(function(x){ return x.id===editingId; }) : null; }

// ---- Repeat: turn an expense into a subscription ----
var txRepeat="none", txRepeatTouched=false;
function setTxRepeat(r,touched){
  txRepeat=CYCLE_MONTHS[r]?r:"none";
  if(touched) txRepeatTouched=true;
  Array.prototype.forEach.call(document.querySelectorAll("#txRepeatToggle button"),function(b){
    b.classList.toggle("active", b.getAttribute("data-repeat")===txRepeat);
  });
  updateRepeatHint();
}
function updateRepeatHint(){
  var hint=document.getElementById("txRepeatHint");
  if(txRepeat==="none" || document.getElementById("txRepeatField").style.display==="none"){ hint.style.display="none"; return; }
  var date=document.getElementById("txDate").value||todayISO();
  var next=addMonthsAnchored(date, CYCLE_MONTHS[txRepeat], parseISO(date).getDate());
  var every={ monthly:"every month", quarterly:"every 3 months", yearly:"every year" }[txRepeat];
  hint.textContent="Saves this payment and adds it to Subscriptions. Next payment "+fullDate(next)+", then "+every+", added to your expenses automatically.";
  hint.style.display="block";
}
// New entries in the Subscriptions category default to Monthly, unless the user picked something themselves
function applyRepeatDefault(){
  if(txRepeatTouched || editingId) return;
  if(document.getElementById("txRepeatField").style.display==="none") return;
  setTxRepeat(document.getElementById("txCategory").value===SUB_CATEGORY ? "monthly" : "none", false);
}
// Entries that already belong to a subscription show that link instead of the Repeat control
function refreshRepeatUI(tx){
  var linkedToSub = !!(tx && tx.subId);
  var sub = linkedToSub ? (state.subscriptions||[]).find(function(s){ return s.id===tx.subId; }) : null;
  var showRepeat = currentType==="expense" && !linkedToSub;
  document.getElementById("txRepeatField").style.display=showRepeat?"block":"none";
  var box=document.getElementById("txLinkedSub");
  box.style.display=linkedToSub?"flex":"none";
  if(linkedToSub){
    document.getElementById("txLinkedText").innerHTML = sub
      ? "\u21bb Part of your <b>"+escapeHtml(sub.name)+"</b> subscription. Changing this entry doesn't change the subscription."
      : "\u21bb Added by a subscription that has since been deleted.";
    document.getElementById("txLinkedOpen").style.display=sub?"inline":"none";
  }
  if(!showRepeat) setTxRepeat("none",false);
  updateRepeatHint();
}
Array.prototype.forEach.call(document.querySelectorAll("#txRepeatToggle button"),function(b){
  b.addEventListener("click",function(){ setTxRepeat(b.getAttribute("data-repeat"),true); });
});
document.getElementById("txDate").addEventListener("change",updateRepeatHint);
document.getElementById("txDate").addEventListener("input",updateRepeatHint);
document.getElementById("txDesc").addEventListener("input",function(){ document.getElementById("txDescErr").classList.remove("show"); });
document.getElementById("txLinkedOpen").addEventListener("click",function(){
  var tx=editingTx(); if(!tx) return;
  var sub=(state.subscriptions||[]).find(function(s){ return s.id===tx.subId; });
  if(!sub) return;
  function go(){ goToTab("subs"); openSubSheet(sub); }
  if(closeLayer("tx")) pendingAfterPop=go;
  else { txOverlay.classList.remove("open"); editingId=null; go(); }
});
function setTypeButtons(type){
  currentType=type;
  document.getElementById("typeExpenseBtn").classList.toggle("active",type==="expense");
  document.getElementById("typeIncomeBtn").classList.toggle("active",type==="income");
  document.getElementById("newCatField").style.display="none";
  populateCategorySelect(activeCatList()[0]);
  refreshRepeatUI(editingTx());
  applyRepeatDefault();
}
document.getElementById("typeExpenseBtn").addEventListener("click",function(){ setTypeButtons("expense"); });
document.getElementById("typeIncomeBtn").addEventListener("click",function(){ setTypeButtons("income"); });
document.getElementById("txCategory").addEventListener("change",function(){
  document.getElementById("newCatField").style.display=this.value==="__new__"?"flex":"none";
  if(this.value==="__new__") document.getElementById("newCatInput").focus();
  applyRepeatDefault();
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
  var repeat=(currentType==="expense" && document.getElementById("txRepeatField").style.display!=="none") ? txRepeat : "none";
  if(repeat!=="none" && !desc){ document.getElementById("txDescErr").classList.add("show"); return false; }
  var entry=null;
  if(editingId){
    var t=state.transactions.find(function(x){ return x.id===editingId; });
    if(t){t.type=currentType;t.amount=amount;t.category=category;t.description=desc;t.date=date;entry=t;}
  } else {
    entry={id:uid(),type:currentType,amount:amount,category:category,description:desc,date:date,_order:Date.now()};
    state.transactions.push(entry);
  }
  // "Repeat" chosen: this entry is the payment just made, a linked subscription takes it from here
  if(entry && repeat!=="none" && !entry.subId) createSubFromEntry(entry,repeat);
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
  txRepeatTouched=false; setTxRepeat("none",false); refreshRepeatUI(null); applyRepeatDefault();
  document.getElementById("txAmount").focus();
  // brief confirmation flash on the button
  var b=document.getElementById("txSaveAnother"); var old=b.textContent;
  b.textContent="Added ✓"; setTimeout(function(){ b.textContent=old; },900);
});
document.getElementById("txDelete").addEventListener("click",function(){
  var id=editingId;
  var t=state.transactions.find(function(x){ return x.id===id; });
  if(!t){ closeTxSheet(); return; }
  var removed=JSON.parse(JSON.stringify(t)); // full copy, so undo keeps extras like the subscription tag
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
    // Either a deleted entry, or {restore:fn} for anything else (e.g. a deleted subscription)
    if(typeof pendingUndo.restore==="function") pendingUndo.restore();
    else state.transactions.push(pendingUndo);
    pendingUndo=null;
    doSave(); render();
  }
  clearTimeout(undoTimer);
  document.getElementById("undoToast").classList.remove("show");
});

// ---- Subscriptions ----
// Recurring payments. On its payment date each ACTIVE subscription becomes a
// normal expense entry (tagged with subId). Ledger has no server running in the
// background, so this happens the next time the app is opened or brought back
// to the front: anything that fell due in the meantime is logged with its real
// date, and never twice.
var CYCLE_MONTHS = { monthly:1, quarterly:3, yearly:12 };
var CYCLE_LABEL = { monthly:"Monthly", quarterly:"Quarterly", yearly:"Yearly" };
var SUB_COLORS = ["#E07A3F","#3F63C9","#2E9E6A","#7A5AC9","#C9485B","#D9A93F","#2B8C9E","#3A3F4F","#C9579E","#6F8F3F"];
var SUB_SORTS = [["date","Bill date"],["priceDesc","Most expensive"],["priceAsc","Cheapest"],["name","Alphabetical"],["category","Category"],["method","Payment method"]];

function parseISO(s){ var p=String(s).split("-").map(Number); return new Date(p[0],p[1]-1,p[2]); }
function toISO(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function daysUntil(iso){ return Math.round((parseISO(iso)-parseISO(todayISO()))/86400000); }
function shortDate(iso){ var d=parseISO(iso); return d.getDate()+" "+MONTH_NAMES[d.getMonth()].slice(0,3); }
function fullDate(iso){ var d=parseISO(iso); return shortDate(iso)+(d.getFullYear()!==new Date().getFullYear()?" "+d.getFullYear():""); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
function nextSubColor(){
  var used=(state.subscriptions||[]).map(function(s){ return s.color; });
  return SUB_COLORS.find(function(c){ return used.indexOf(c)===-1; }) || SUB_COLORS[(state.subscriptions||[]).length%SUB_COLORS.length];
}
// The payment one cycle before `nextIso` (e.g. next 27 Oct monthly -> 27 Sep)
function prevCycleDate(nextIso,cycle,anchor){ return addMonthsAnchored(nextIso,-(CYCLE_MONTHS[cycle]||1),anchor||parseISO(nextIso).getDate()); }

// Add entry -> "Repeat": the entry is the payment just made; a linked subscription
// takes over from the next cycle.
function createSubFromEntry(entry,cycle){
  if(!Array.isArray(state.subscriptions)) state.subscriptions=[];
  var anchor=parseISO(entry.date).getDate();
  var sub={ id:uid(), name:String(entry.description||entry.category).slice(0,40), amount:entry.amount, cycle:cycle,
    nextDate:addMonthsAnchored(entry.date,CYCLE_MONTHS[cycle]||1,anchor), anchorDay:anchor,
    category:entry.category||SUB_CATEGORY, payMethod:"", remindDays:1, color:nextSubColor(),
    active:true, createdAt:todayISO(), lastLogged:entry.date };
  state.subscriptions.push(sub);
  entry.subId=sub.id;
  processSubscriptions(); // an entry dated more than one cycle back catches up to today
  return sub;
}
// Subscription sheet -> "Already paid": log the payment one cycle before the next one.
// If the user already logged that payment by hand, link their entry instead of duplicating it.
function logPreviousPayment(sub,prev){
  var nameLc=String(sub.name).toLowerCase();
  var match=state.transactions.find(function(t){
    if(t.type!=="expense" || t.subId || Math.abs(t.amount-sub.amount)>=0.005) return false;
    if(Math.abs(daysBetween(t.date,prev))>3) return false;
    var d=String(t.description||"").toLowerCase().trim();
    return t.category===sub.category || (d && (d.indexOf(nameLc)>-1 || nameLc.indexOf(d)>-1));
  });
  if(match) match.subId=sub.id;
  else state.transactions.push({ id:uid(), type:"expense", amount:sub.amount, category:sub.category||SUB_CATEGORY,
    description:sub.name, date:prev, _order:Date.now(), subId:sub.id });
  sub.lastLogged=prev;
  delete sub.loggedOn; // the user asked for this one, no "logged" note in the bell
  return !!match;
}
// Step a date forward n months, keeping the original day of month where it exists:
// a subscription started on the 31st bills on the 30th in 30-day months, then the 31st again.
function addMonthsAnchored(iso,n,anchor){
  var d=parseISO(iso), y=d.getFullYear(), m=d.getMonth()+n;
  y+=Math.floor(m/12); m=((m%12)+12)%12;
  var dim=new Date(y,m+1,0).getDate();
  return toISO(new Date(y,m,Math.min(anchor||d.getDate(),dim)));
}
function subStep(sub){ return CYCLE_MONTHS[sub.cycle]||1; }
function subMonthly(sub){ return (Number(sub.amount)||0)/subStep(sub); }
// First payment date that is today or later, WITHOUT logging anything (used for paused subs).
function subRolledDate(sub){
  var d=sub.nextDate||todayISO(), today=todayISO(), guard=0;
  while(d<today && guard<240){ d=addMonthsAnchored(d,subStep(sub),sub.anchorDay); guard++; }
  return d;
}
function safeColor(c){ return /^#[0-9a-fA-F]{6}$/.test(c||"")?c:SUB_COLORS[0]; }
function isLightColor(hex){
  var h=safeColor(hex).slice(1);
  var r=parseInt(h.substr(0,2),16), g=parseInt(h.substr(2,2),16), b=parseInt(h.substr(4,2),16);
  return (0.299*r+0.587*g+0.114*b)>165;
}
function dueWords(iso){
  var d=daysUntil(iso);
  if(d<=0) return "today";
  if(d===1) return "tomorrow";
  return "in "+d+" days";
}

// Log every active subscription whose date has arrived. Returns true if anything changed.
function processSubscriptions(){
  if(!Array.isArray(state.subscriptions)) state.subscriptions=[];
  var today=todayISO(), changed=false;
  state.subscriptions.forEach(function(sub){
    if(!sub.active || !sub.nextDate) return;
    var guard=0;
    while(sub.nextDate<=today && guard<120){
      var date=sub.nextDate;
      var dup=state.transactions.some(function(t){ return t.subId===sub.id && t.date===date; });
      if(!dup){
        state.transactions.push({ id:uid(), type:"expense", amount:Number(sub.amount)||0,
          category:sub.category||SUB_CATEGORY, description:sub.name, date:date,
          _order:Date.now()+guard, subId:sub.id });
      }
      sub.lastLogged=date;   // payment date of the latest entry
      sub.loggedOn=today;    // the day Ledger actually added it (can be later, if the app wasn't opened)
      sub.nextDate=addMonthsAnchored(date,subStep(sub),sub.anchorDay);
      guard++; changed=true;
    }
  });
  return changed;
}

// Bell-panel items: "renews in N days" reminders + "just logged" notes.
function subAlerts(){
  var out=[];
  (state.subscriptions||[]).forEach(function(sub){
    if(!sub.active || !sub.nextDate) return;
    var d=daysUntil(sub.nextDate);
    var remind=Number(sub.remindDays)||0;
    if(remind>0 && d>0 && d<=remind){
      out.push({ id:"subdue:"+sub.id+":"+sub.nextDate, sev:"orange", icon:"🔔",
        title:sub.name+(d===1?" renews tomorrow":" renews in "+d+" days"),
        body:fmt(sub.amount)+" will be added to your expenses on "+shortDate(sub.nextDate)+"." });
    }
    if(sub.lastLogged && sub.loggedOn && daysUntil(sub.loggedOn)>=-1){
      out.push({ id:"sublog:"+sub.id+":"+sub.lastLogged, sev:"info", icon:"↻",
        title:sub.name+" logged",
        body:fmt(sub.amount)+" was added to your expenses for "+shortDate(sub.lastLogged)+"." });
    }
  });
  return out;
}

// ---- Subscriptions: list view (sort + filter, remembered per device) ----
var subView={ status:"active", cats:[], methods:[], sort:"date", reverse:false };
try{
  var savedView=JSON.parse(localStorage.getItem("ledger_sub_view")||"null");
  if(savedView && typeof savedView==="object"){
    if(["active","all","paused"].indexOf(savedView.status)>-1) subView.status=savedView.status;
    if(Array.isArray(savedView.cats)) subView.cats=savedView.cats;
    if(Array.isArray(savedView.methods)) subView.methods=savedView.methods;
    if(SUB_SORTS.some(function(o){ return o[0]===savedView.sort; })) subView.sort=savedView.sort;
    subView.reverse=savedView.reverse===true;
  }
}catch(e){}
function saveSubView(){ try{ localStorage.setItem("ledger_sub_view",JSON.stringify(subView)); }catch(e){} }

function subMatchesStatus(sub,status){ return status==="all" || (status==="active" ? !!sub.active : !sub.active); }
function subMatches(sub){
  if(!subMatchesStatus(sub,subView.status)) return false;
  if(subView.cats.length && subView.cats.indexOf(sub.category||SUB_CATEGORY)===-1) return false;
  if(subView.methods.length && subView.methods.indexOf(sub.payMethod||"")===-1) return false;
  return true;
}
function sortSubs(list){
  var s=subView.sort;
  list.sort(function(a,b){
    if(!!a.active!==!!b.active) return a.active?-1:1; // paused always sink to the bottom
    var r=0;
    if(s==="priceDesc") r=subMonthly(b)-subMonthly(a);
    else if(s==="priceAsc") r=subMonthly(a)-subMonthly(b);
    else if(s==="name") r=String(a.name).localeCompare(String(b.name));
    else if(s==="category") r=String(a.category||"").localeCompare(String(b.category||""));
    else if(s==="method") r=String(a.payMethod||"￿").localeCompare(String(b.payMethod||"￿"));
    if(r===0) r=String(a.nextDate||"").localeCompare(String(b.nextDate||""));
    if(r===0) r=String(a.name).localeCompare(String(b.name));
    return subView.reverse?-r:r;
  });
  return list;
}
function renderSubs(){
  var listEl=document.getElementById("subList");
  if(!listEl) return;
  var subs=state.subscriptions||[];
  var today=todayISO();

  // Summary card: what the active subscriptions cost, whatever the filter
  var active=subs.filter(function(s){ return s.active; });
  var perMonth=active.reduce(function(t,s){ return t+subMonthly(s); },0);
  var next=active.slice().sort(function(a,b){ return String(a.nextDate).localeCompare(String(b.nextDate)); })[0];
  var sumEl=document.getElementById("subSummary");
  if(!subs.length){ sumEl.style.display="none"; sumEl.innerHTML=""; }
  else {
    sumEl.style.display="block";
    sumEl.innerHTML='<div class="ss-label">Active subscriptions cost</div>'+
      '<div class="ss-amount">≈ '+fmt(perMonth)+'<span> / month</span></div>'+
      '<div class="ss-sub">≈ '+fmt(perMonth*12)+' a year · '+active.length+' active'+
        (next?' · next: '+escapeHtml(next.name)+' '+dueWords(next.nextDate):'')+'</div>';
  }

  var titles={ active:"Active subscriptions", all:"All subscriptions", paused:"Paused subscriptions" };
  document.getElementById("subTitleText").textContent=titles[subView.status]||titles.active;
  document.getElementById("subFilterBtn").classList.toggle("has-filter", subView.cats.length>0 || subView.methods.length>0);

  renderPushCta();
  if(!subs.length){
    listEl.innerHTML='<div class="subs-empty"><div class="se-icon">↻</div><b>No subscriptions yet</b>'+
      '<p>Add anything that repeats — Netflix, the gym, rent, your phone plan. Ledger adds it to your expenses on the payment date and reminds you before.</p>'+
      '<button class="btn-primary" id="subEmptyAdd">Add a subscription</button></div>';
    document.getElementById("subEmptyAdd").addEventListener("click",function(){ openSubSheet(null); });
    return;
  }
  var shown=sortSubs(subs.filter(subMatches));
  if(!shown.length){
    listEl.innerHTML='<div class="subs-empty"><p>Nothing matches this filter.</p>'+
      '<button class="btn-secondary" id="subShowAll" style="width:100%;">Show all subscriptions</button></div>';
    document.getElementById("subShowAll").addEventListener("click",function(){
      subView.status="all"; subView.cats=[]; subView.methods=[]; saveSubView(); renderSubs();
    });
    return;
  }
  listEl.innerHTML=shown.map(function(s){
    var color=safeColor(s.color);
    var initial=(String(s.name).trim().charAt(0)||"?").toUpperCase();
    var meta=CYCLE_LABEL[s.cycle]||"Monthly";
    if(subStep(s)>1) meta+=" · ≈ "+fmt(subMonthly(s))+"/mo";
    if(s.payMethod) meta+=" · "+s.payMethod;
    var due;
    if(!s.active) due="Paused";
    else if(s.lastLogged===today) due="Logged today";
    else { var d=daysUntil(s.nextDate); due = d>30 ? shortDate(s.nextDate) : (d===1 ? "Tomorrow" : "In "+d+" days"); }
    return '<button type="button" class="sub-card'+(isLightColor(color)?' dark-text':'')+(s.active?'':' paused')+'" data-sid="'+escapeHtml(s.id)+'" style="background:'+color+';">'+
      '<span class="sub-initial">'+escapeHtml(initial)+'</span>'+
      '<span class="sub-main"><span class="sub-name">'+escapeHtml(s.name)+'</span><span class="sub-meta">'+escapeHtml(meta)+'</span></span>'+
      '<span class="sub-right"><span class="sub-amt">'+fmt(s.amount)+'</span><span class="sub-due">'+escapeHtml(due)+'</span></span>'+
    '</button>';
  }).join("");
  Array.prototype.forEach.call(listEl.querySelectorAll(".sub-card"),function(card){
    card.addEventListener("click",function(){
      var id=card.getAttribute("data-sid");
      var sub=subs.find(function(x){ return x.id===id; });
      if(sub) openSubSheet(sub);
    });
  });
}

// ---- Subscriptions: small helpers shared by the three sheets ----
function openOverlayLayer(overlayId,layerId,onClose){
  var ov=document.getElementById(overlayId);
  ov.classList.add("open");
  openLayer(layerId,function(){ ov.classList.remove("open"); if(onClose) onClose(); });
}
function closeOverlayLayer(overlayId,layerId,onClose){
  if(!closeLayer(layerId)){ document.getElementById(overlayId).classList.remove("open"); if(onClose) onClose(); }
}
function optRow(kind,key,label,on,val){
  return '<button type="button" class="opt-row '+kind+(on?' on':'')+'" data-key="'+escapeHtml(key)+'">'+
    '<span class="opt-mark">'+(kind==="check"&&on?'✓':'')+'</span>'+
    '<span class="opt-label">'+escapeHtml(label)+'</span>'+
    (val?'<span class="opt-val">'+escapeHtml(val)+'</span>':'')+'</button>';
}
function keyParts(key){ var i=key.indexOf(":"); return [key.slice(0,i), key.slice(i+1)]; }

// ---- Subscriptions: add / edit sheet ----
var editingSubId=null, subFormCycle="monthly", subFormColor=SUB_COLORS[0], subFormActive=true, subFormOrigDate="";
function setSubCycle(c){
  subFormCycle=CYCLE_MONTHS[c]?c:"monthly";
  Array.prototype.forEach.call(document.querySelectorAll("#subCycleToggle button"),function(b){
    b.classList.toggle("active", b.getAttribute("data-cycle")===subFormCycle);
  });
  if(document.getElementById("subOverlay").classList.contains("open")) updateSubPaidRow();
}
function setSubActive(on){
  subFormActive=!!on;
  var sw=document.getElementById("subActiveSwitch");
  sw.classList.toggle("on",subFormActive);
  sw.setAttribute("aria-pressed",subFormActive?"true":"false");
}
function renderSwatches(){
  var el=document.getElementById("subSwatches");
  el.innerHTML=SUB_COLORS.map(function(c){
    return '<button type="button" class="swatch'+(c===subFormColor?' on':'')+'" data-color="'+c+'" style="background:'+c+';" aria-label="Colour '+c+'"></button>';
  }).join("");
  Array.prototype.forEach.call(el.querySelectorAll(".swatch"),function(b){
    b.addEventListener("click",function(){ subFormColor=b.getAttribute("data-color"); renderSwatches(); });
  });
}
function openSubSheet(sub){
  editingSubId=sub?sub.id:null;
  document.getElementById("subSheetTitle").textContent=sub?"Edit subscription":"Add subscription";
  document.getElementById("subDelete").style.display=sub?"block":"none";
  ["subNameErr","subAmountErr","subDateErr"].forEach(function(id){ document.getElementById(id).classList.remove("show"); });
  document.getElementById("subAmountLabel").textContent="Amount ("+state.currency+")";
  document.getElementById("subName").value=sub?sub.name:"";
  document.getElementById("subAmount").value=sub?sub.amount:"";
  setSubCycle(sub?sub.cycle:"monthly");
  var dateEl=document.getElementById("subDate");
  dateEl.min=todayISO();
  subFormOrigDate=sub?subRolledDate(sub):"";
  dateEl.value=subFormOrigDate;
  // Category: expense categories, plus the sub's own even if it was removed since
  // ("Subscriptions" is always offered as the default, even if it was deleted from Categories)
  var cats=state.categories.slice();
  if(cats.indexOf(SUB_CATEGORY)===-1) cats.unshift(SUB_CATEGORY);
  var cur=sub?(sub.category||SUB_CATEGORY):SUB_CATEGORY;
  if(cats.indexOf(cur)===-1) cats.push(cur);
  document.getElementById("subCategory").innerHTML=cats.map(function(c){
    return '<option value="'+escapeHtml(c)+'"'+(c===cur?' selected':'')+'>'+escapeHtml(c)+'</option>';
  }).join("");
  // Payment method + suggestions from methods already used
  document.getElementById("subPayMethod").value=sub?(sub.payMethod||""):"";
  var methods=[];
  (state.subscriptions||[]).forEach(function(s){ if(s.payMethod && methods.indexOf(s.payMethod)===-1) methods.push(s.payMethod); });
  document.getElementById("subPayList").innerHTML=methods.map(function(m){ return '<option value="'+escapeHtml(m)+'">'; }).join("");
  document.getElementById("subRemind").value=String(sub?(Number(sub.remindDays)||0):1);
  subFormColor=sub?safeColor(sub.color):nextSubColor();
  renderSwatches();
  setSubActive(sub?sub.active:true);
  setSubPaid(!sub); // new: on by default; editing a never-charged one: off until switched on
  updateSubPaidRow();
  openOverlayLayer("subOverlay","sub",function(){ editingSubId=null; });
  if(!sub) setTimeout(function(){ document.getElementById("subName").focus(); },300);
}
function closeSubSheet(){ closeOverlayLayer("subOverlay","sub",function(){ editingSubId=null; }); }
function saveSubFromSheet(){
  var ok=true;
  var name=document.getElementById("subName").value.trim();
  var amount=parseFloat(document.getElementById("subAmount").value);
  var date=document.getElementById("subDate").value;
  document.getElementById("subNameErr").classList.toggle("show",!name); if(!name) ok=false;
  var badAmount=isNaN(amount)||amount<=0;
  document.getElementById("subAmountErr").classList.toggle("show",badAmount); if(badAmount) ok=false;
  var badDate=!date||date<todayISO();
  document.getElementById("subDateErr").classList.toggle("show",badDate); if(badDate) ok=false;
  if(!ok) return;
  var fields={
    name:name.slice(0,40),
    amount:Math.round(amount*100)/100,
    cycle:subFormCycle,
    category:document.getElementById("subCategory").value||SUB_CATEGORY,
    payMethod:document.getElementById("subPayMethod").value.trim().slice(0,30),
    remindDays:parseInt(document.getElementById("subRemind").value,10)||0,
    color:safeColor(subFormColor),
    active:subFormActive
  };
  // Chosen category must exist so it shows up in pickers, Analysis and caps
  if(state.categories.indexOf(fields.category)===-1) state.categories.push(fields.category);
  var paidPrev=subPaidPrevDate(); // null unless "Already paid" is shown and switched on
  var target;
  if(editingSubId){
    target=(state.subscriptions||[]).find(function(x){ return x.id===editingSubId; });
    if(!target){ closeSubSheet(); return; }
    Object.keys(fields).forEach(function(k){ target[k]=fields[k]; });
    if(date!==subFormOrigDate) target.anchorDay=parseISO(date).getDate(); // user picked a new billing day
    target.nextDate=date;
  } else {
    if(!Array.isArray(state.subscriptions)) state.subscriptions=[];
    target=fields;
    target.id=uid();
    target.nextDate=date;
    target.anchorDay=parseISO(date).getDate();
    target.createdAt=todayISO();
    state.subscriptions.push(target);
  }
  if(paidPrev && subFormPaid) logPreviousPayment(target,paidPrev);
  processSubscriptions(); // a payment dated today is logged straight away
  doSave(); render();
  closeSubSheet();
}
// "Already paid this cycle": offered when the next payment is in the future, the
// payment before it has already happened, and this subscription has never logged anything.
var subFormPaid=true;
function setSubPaid(on){
  subFormPaid=!!on;
  var sw=document.getElementById("subPaidSwitch");
  sw.classList.toggle("on",subFormPaid);
  sw.setAttribute("aria-pressed",subFormPaid?"true":"false");
}
function subPaidPrevDate(){
  var sub=editingSubId?(state.subscriptions||[]).find(function(x){ return x.id===editingSubId; }):null;
  if(sub && sub.lastLogged) return null;
  var date=document.getElementById("subDate").value, today=todayISO();
  if(!date || date<=today) return null;
  var anchor=(sub && date===subFormOrigDate) ? sub.anchorDay : parseISO(date).getDate();
  var prev=prevCycleDate(date,subFormCycle,anchor);
  return prev<=today ? prev : null;
}
function updateSubPaidRow(){
  var row=document.getElementById("subPaidRow");
  var prev=subPaidPrevDate();
  if(!prev){ row.style.display="none"; return; }
  var amount=parseFloat(document.getElementById("subAmount").value);
  document.getElementById("subPaidText").textContent="Adds "+(isNaN(amount)||amount<=0?"this payment":fmt(amount))+
    " to your expenses for "+fullDate(prev)+". Leave it off if you haven't paid yet.";
  row.style.display="flex";
}
document.getElementById("subPaidSwitch").addEventListener("click",function(){ setSubPaid(!subFormPaid); });
["subDate","subAmount"].forEach(function(id){
  document.getElementById(id).addEventListener("input",updateSubPaidRow);
  document.getElementById(id).addEventListener("change",updateSubPaidRow);
});

// Clear each validation message as soon as its field is fixed
[["subName","subNameErr"],["subAmount","subAmountErr"],["subDate","subDateErr"]].forEach(function(pair){
  function clear(){ document.getElementById(pair[1]).classList.remove("show"); }
  document.getElementById(pair[0]).addEventListener("input",clear);
  document.getElementById(pair[0]).addEventListener("change",clear);
});
document.getElementById("subFab").addEventListener("click",function(){ openSubSheet(null); });
document.getElementById("subCancel").addEventListener("click",closeSubSheet);
document.getElementById("subSave").addEventListener("click",saveSubFromSheet);
document.getElementById("subOverlay").addEventListener("click",function(e){ if(e.target===this) closeSubSheet(); });
Array.prototype.forEach.call(document.querySelectorAll("#subCycleToggle button"),function(b){
  b.addEventListener("click",function(){ setSubCycle(b.getAttribute("data-cycle")); });
});
document.getElementById("subActiveSwitch").addEventListener("click",function(){ setSubActive(!subFormActive); });
document.getElementById("subDelete").addEventListener("click",function(){
  var id=editingSubId;
  var idx=(state.subscriptions||[]).findIndex(function(x){ return x.id===id; });
  if(idx===-1){ closeSubSheet(); return; }
  var removed=JSON.parse(JSON.stringify(state.subscriptions[idx]));
  closeSubSheet();
  state.subscriptions.splice(idx,1);
  doSave(); render();
  // Entries it already logged stay in the history; undo brings the subscription back.
  showUndo("Subscription deleted",{ restore:function(){ state.subscriptions.push(removed); } });
});

// ---- Subscriptions: sort sheet ----
function renderSubSortList(){
  var el=document.getElementById("subSortList");
  el.innerHTML=SUB_SORTS.map(function(o){ return optRow("radio","sort:"+o[0],o[1],subView.sort===o[0],""); }).join("")+
    '<div class="opt-section">Order</div>'+optRow("check","reverse:1","Reverse order",subView.reverse,"");
  Array.prototype.forEach.call(el.querySelectorAll(".opt-row"),function(row){
    row.addEventListener("click",function(){
      var kp=keyParts(row.getAttribute("data-key"));
      if(kp[0]==="sort") subView.sort=kp[1];
      else subView.reverse=!subView.reverse;
      saveSubView(); renderSubSortList(); renderSubs();
    });
  });
}
document.getElementById("subSortBtn").addEventListener("click",function(){ renderSubSortList(); openOverlayLayer("subSortOverlay","subSort"); });
document.getElementById("subSortClose").addEventListener("click",function(){ closeOverlayLayer("subSortOverlay","subSort"); });
document.getElementById("subSortOverlay").addEventListener("click",function(e){ if(e.target===this) closeOverlayLayer("subSortOverlay","subSort"); });

// ---- Subscriptions: filter sheet (with per-month totals, like the list they filter) ----
function renderSubFilterList(){
  var el=document.getElementById("subFilterList");
  var subs=state.subscriptions||[];
  function total(list){ return fmt(list.reduce(function(t,s){ return t+subMonthly(s); },0))+"/mo"; }
  var html='<div class="opt-section">Show</div>';
  [["active","Active"],["all","All"],["paused","Paused"]].forEach(function(o){
    var list=subs.filter(function(s){ return subMatchesStatus(s,o[0]); });
    html+=optRow("radio","status:"+o[0],o[1]+" ("+list.length+")",subView.status===o[0],total(list));
  });
  var base=subs.filter(function(s){ return subMatchesStatus(s,subView.status); });
  var cats=[], methods=[];
  subs.forEach(function(s){
    var c=s.category||SUB_CATEGORY; if(cats.indexOf(c)===-1) cats.push(c);
    if(s.payMethod && methods.indexOf(s.payMethod)===-1) methods.push(s.payMethod);
  });
  subView.cats.forEach(function(c){ if(cats.indexOf(c)===-1) cats.push(c); });
  subView.methods.forEach(function(m){ if(methods.indexOf(m)===-1) methods.push(m); });
  cats.sort(); methods.sort();
  if(cats.length){
    html+='<div class="opt-section">Categories</div>';
    cats.forEach(function(c){
      html+=optRow("check","cat:"+c,c,subView.cats.indexOf(c)>-1,total(base.filter(function(s){ return (s.category||SUB_CATEGORY)===c; })));
    });
  }
  if(methods.length){
    html+='<div class="opt-section">Payment methods</div>';
    methods.forEach(function(m){
      html+=optRow("check","method:"+m,m,subView.methods.indexOf(m)>-1,total(base.filter(function(s){ return s.payMethod===m; })));
    });
  }
  el.innerHTML=html;
  Array.prototype.forEach.call(el.querySelectorAll(".opt-row"),function(row){
    row.addEventListener("click",function(){
      var kp=keyParts(row.getAttribute("data-key"));
      function toggle(arr,v){ var i=arr.indexOf(v); if(i>-1) arr.splice(i,1); else arr.push(v); }
      if(kp[0]==="status") subView.status=kp[1];
      else if(kp[0]==="cat") toggle(subView.cats,kp[1]);
      else if(kp[0]==="method") toggle(subView.methods,kp[1]);
      saveSubView(); renderSubFilterList(); renderSubs();
    });
  });
}
function openSubFilter(){ renderSubFilterList(); openOverlayLayer("subFilterOverlay","subFilter"); }
document.getElementById("subTitleBtn").addEventListener("click",openSubFilter);
document.getElementById("subFilterBtn").addEventListener("click",openSubFilter);
document.getElementById("subFilterClose").addEventListener("click",function(){ closeOverlayLayer("subFilterOverlay","subFilter"); });
document.getElementById("subFilterReset").addEventListener("click",function(){
  subView.status="active"; subView.cats=[]; subView.methods=[];
  saveSubView(); renderSubFilterList(); renderSubs();
});
document.getElementById("subFilterOverlay").addEventListener("click",function(e){ if(e.target===this) closeOverlayLayer("subFilterOverlay","subFilter"); });

// ---- Push notifications ----
// A real phone notification at 21:00 local time before a subscription payment.
// The sending happens on the server: Supabase Edge Function "push" + a scheduler
// (supabase/push-setup.sql). This part only registers the device with it.
var PUSH_FN_URL = SUPABASE_URL + "/functions/v1/push";
var pushBusy = false, pushRefreshedThisSession = false;

function deviceTimeZone(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin"; }catch(e){ return "Europe/Berlin"; } }
function pushSupport(){
  if(isIOS() && !isStandalone()) return "ios-install"; // iPhone: only installed web apps get push
  if(!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if(Notification.permission==="denied") return "denied";
  return "ok";
}
function pushSupportText(sup){
  if(sup==="ios-install") return "On iPhone, add Ledger to your Home Screen first (Share → Add to Home Screen), then open it from there.";
  if(sup==="denied") return "Notifications are blocked for Ledger. Allow them in your phone's settings, then come back here.";
  if(sup==="unsupported") return "This browser can't receive notifications. Try Chrome, or the installed app.";
  return "";
}
function pushError(msg){ var e=new Error(msg); e.userMessage=msg; return e; }
function b64uToBytes(s){
  var pad="=".repeat((4-s.length%4)%4), bin=atob((s+pad).replace(/-/g,"+").replace(/_/g,"/"));
  var out=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out;
}
function bytesToB64u(buf){
  var bytes=new Uint8Array(buf), s=""; for(var i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function swRegistration(){
  if(!("serviceWorker" in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register("sw.js").then(function(){ return navigator.serviceWorker.ready; });
}
function currentPushSubscription(){
  if(!("serviceWorker" in navigator) || !("PushManager" in window)) return Promise.resolve(null);
  return navigator.serviceWorker.getRegistration()
    .then(function(reg){ return reg ? reg.pushManager.getSubscription() : null; })
    .catch(function(){ return null; });
}
// Talk to the push function as the signed-in user (refreshes an expired token once)
function pushCall(body, retried){
  if(!currentUser) return Promise.reject(pushError("Please sign in again."));
  return fetch(PUSH_FN_URL,{ method:"POST",
    headers:{ "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":"Bearer "+currentUser.token },
    body:JSON.stringify(body) })
    .catch(function(){ throw pushError("Couldn't reach the server. Check your connection and try again."); })
    .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { status:r.status, body:j||{} }; }); })
    .then(function(res){
      var ownAuthError = res.status===401 && res.body.error==="Please sign in again.";
      if(ownAuthError && !retried && currentUser && currentUser.refresh_token){
        return refreshToken(currentUser.refresh_token).then(function(d){
          if(!d || !d.access_token) throw pushError("Your session expired. Please sign in again.");
          currentUser.token=d.access_token; currentUser.refresh_token=d.refresh_token; saveSession(d);
          return pushCall(body,true);
        });
      }
      if(ownAuthError) throw pushError("Your session expired. Please sign in again.");
      if(res.status===404) throw pushError("Notifications aren't set up on the server yet (the “push” function wasn't found).");
      if(res.status===401) throw pushError("The server turned the request away. In Supabase, switch off “Verify JWT with legacy secret” for the push function.");
      if(res.status>=400) throw pushError(res.body.error || ("Server error "+res.status+"."));
      return res.body;
    });
}
function enablePush(){
  var sup=pushSupport();
  if(sup!=="ok") return Promise.reject(pushError(pushSupportText(sup)));
  var reg;
  return Promise.resolve(Notification.requestPermission()).then(function(perm){ // must run straight from the tap
    if(perm!=="granted") throw pushError(perm==="denied" ? pushSupportText("denied") : "Notifications weren't allowed. Tap Turn on again and choose Allow.");
    return swRegistration();
  }).then(function(r){
    reg=r;
    if(!reg) throw pushError(pushSupportText("unsupported"));
    return pushCall({ action:"config" });
  }).then(function(cfg){
    if(!cfg || !cfg.publicKey) throw pushError("The server didn't send a push key.");
    return reg.pushManager.getSubscription().then(function(existing){
      // A subscription made with an older server key can't receive anything: replace it
      var oldKey=existing && existing.options && existing.options.applicationServerKey;
      if(oldKey && bytesToB64u(oldKey)!==cfg.publicKey) return existing.unsubscribe().then(function(){ return null; });
      return existing;
    }).then(function(existing){
      return existing || reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64uToBytes(cfg.publicKey) });
    });
  }).then(function(sub){
    return pushCall({ action:"subscribe", subscription:sub.toJSON(), tz:deviceTimeZone() });
  }).then(function(){
    try{ localStorage.setItem("ledger_push_on","1"); }catch(e){}
    return true;
  });
}
function disablePush(){
  try{ localStorage.removeItem("ledger_push_on"); }catch(e){}
  return currentPushSubscription().then(function(sub){
    if(!sub) return;
    return pushCall({ action:"unsubscribe", endpoint:sub.endpoint }).catch(function(){}).then(function(){ return sub.unsubscribe(); });
  });
}
// Signing out: this device stops getting the old account's reminders
function pushSignOut(token){
  pushRefreshedThisSession=false;
  try{ localStorage.removeItem("ledger_push_on"); }catch(e){}
  currentPushSubscription().then(function(sub){
    if(!sub) return;
    fetch(PUSH_FN_URL,{ method:"POST", keepalive:true,
      headers:{ "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":"Bearer "+token },
      body:JSON.stringify({ action:"unsubscribe", endpoint:sub.endpoint }) }).catch(function(){});
    return sub.unsubscribe();
  }).catch(function(){});
}
// Every app open: re-register this device (the browser can rotate it) and record the current timezone
function refreshPushOnOpen(){
  if(pushRefreshedThisSession) return;
  pushRefreshedThisSession=true;
  if(pushSupport()!=="ok" || Notification.permission!=="granted") return;
  currentPushSubscription().then(function(sub){
    var wanted=false; try{ wanted=localStorage.getItem("ledger_push_on")==="1"; }catch(e){}
    if(sub) return pushCall({ action:"subscribe", subscription:sub.toJSON(), tz:deviceTimeZone() });
    if(wanted) return enablePush();
  }).catch(function(e){ console.warn("Push refresh failed", e); }).then(renderPushCta);
}

// Notifications panel under More
function setSwitchState(sw,on){ sw.classList.toggle("on",!!on); sw.setAttribute("aria-pressed",on?"true":"false"); }
function renderPushPanel(msg,cls){
  var sw=document.getElementById("pushSwitch"), st=document.getElementById("pushStatus"), test=document.getElementById("pushTestBtn"), m=document.getElementById("pushMsg");
  if(msg!==undefined){ m.textContent=msg; m.className="push-msg"+(cls?" "+cls:""); }
  var sup=pushSupport();
  if(sup!=="ok"){ sw.disabled=true; setSwitchState(sw,false); st.textContent=pushSupportText(sup); test.style.display="none"; document.getElementById("dailyRow").style.display="none"; return; }
  sw.disabled=pushBusy;
  currentPushSubscription().then(function(sub){
    var on=!!sub && Notification.permission==="granted";
    setSwitchState(sw,on);
    st.textContent=on ? "On for this device" : "Off";
    test.style.display=on && !pushBusy ? "block" : "none";
    document.getElementById("dailyRow").style.display=on ? "flex" : "none";
    setSwitchState(document.getElementById("dailySwitch"), state.dailyReminder!==false);
  });
}
document.getElementById("pushSwitch").addEventListener("click",function(){
  if(pushBusy) return;
  var turningOn=!this.classList.contains("on");
  pushBusy=true;
  renderPushPanel(turningOn?"Turning on…":"Turning off…","");
  (turningOn?enablePush():disablePush()).then(function(){
    pushBusy=false;
    renderPushPanel(turningOn?"Done. Send yourself a test to check it works.":"Turned off for this device.", turningOn?"good":"");
    renderPushCta();
  }).catch(function(e){
    pushBusy=false;
    renderPushPanel(e.userMessage||"Something went wrong. Try again.","bad");
    renderPushCta();
  });
});
// Daily 8:30 pm nudge: stored in the synced data so the server can respect it
document.getElementById("dailySwitch").addEventListener("click",function(){
  state.dailyReminder = !(state.dailyReminder!==false);
  setSwitchState(this, state.dailyReminder);
  doSave();
  renderPushPanel(state.dailyReminder ? "Daily reminder on." : "Daily reminder off. Subscription reminders stay on.", "");
});
document.getElementById("pushTestBtn").addEventListener("click",function(){
  var btn=this; btn.disabled=true;
  renderPushPanel("Sending…","");
  pushCall({ action:"test" }).then(function(res){
    btn.disabled=false;
    if(res && res.sent>0) renderPushPanel("Sent. It should appear in a few seconds.","good");
    else renderPushPanel("The server couldn't reach this device. Turn notifications off and on again.","bad");
  }).catch(function(e){ btn.disabled=false; renderPushPanel(e.userMessage||"Something went wrong. Try again.","bad"); });
});

// One-tap prompt on the Subscriptions tab (while there's something to be reminded about)
function renderPushCta(){
  var el=document.getElementById("pushCta");
  if(!el) return;
  var hasReminders=(state.subscriptions||[]).some(function(s){ return s.active && Number(s.remindDays)>0; });
  var snoozed=false; try{ snoozed=Number(localStorage.getItem("ledger_push_cta_later")||0)>Date.now(); }catch(e){}
  var sup=pushSupport();
  if(!currentUser || !hasReminders || snoozed || sup==="unsupported" || sup==="denied"){ el.style.display="none"; return; }
  var onBtn=document.getElementById("pushCtaOn");
  if(sup==="ios-install"){
    document.getElementById("pushCtaSub").textContent=pushSupportText(sup);
    onBtn.style.display="none"; el.style.display="flex"; return;
  }
  onBtn.style.display="";
  currentPushSubscription().then(function(sub){
    el.style.display=(sub && Notification.permission==="granted") ? "none" : "flex";
  });
}
document.getElementById("pushCtaOn").addEventListener("click",function(){
  var btn=this, txt=document.getElementById("pushCtaSub");
  btn.disabled=true; btn.textContent="…";
  enablePush().then(function(){
    txt.textContent="Done ✓ Reminders will arrive at 9 pm.";
    btn.style.display="none";
    setTimeout(function(){ btn.disabled=false; btn.textContent="Turn on"; txt.textContent="A notification at 9 pm before each payment."; renderPushCta(); },2200);
  }).catch(function(e){
    btn.disabled=false; btn.textContent="Turn on";
    txt.textContent=e.userMessage||"Something went wrong. Try again.";
  });
});
document.getElementById("pushCtaLater").addEventListener("click",function(){
  try{ localStorage.setItem("ledger_push_cta_later",String(Date.now()+14*86400000)); }catch(e){}
  renderPushCta();
});

// Tapping a notification opens the Subscriptions tab
function handleOpenTabParam(){
  try{
    var tab=new URLSearchParams(window.location.search).get("tab");
    if(tab){
      history.replaceState(null,"",window.location.pathname);
      if(TAB_IDS[tab] && tab!=="home") goToTab(tab);
    }
  }catch(e){}
}
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(function(){});
  navigator.serviceWorker.addEventListener("message",function(e){
    if(e.data && e.data.type==="open-tab" && currentUser && dataLoaded && TAB_IDS[e.data.tab]) goToTab(e.data.tab);
  });
}

// ---- Settings ----
// settingsOverlay no longer exists — Settings now lives inline in the More tab.
var SETTINGS_PANELS = ["panelCategories","panelBudgets","panelNotifications","panelPrefs","panelAccount","panelData","panelAbout","panelStory"];
var PANEL_TITLES = { panelCategories:"Categories", panelBudgets:"Budgets & caps", panelNotifications:"Notifications", panelPrefs:"Preferences", panelAccount:"Account & security", panelData:"Data", panelAbout:"About & what's new", panelStory:"The story & my mission" };
function showSettingsMenu(){
  var menu=document.getElementById("settingsMenu");
  menu.style.display="block";
  menu.classList.remove("panel-anim");
  void menu.offsetWidth;
  menu.classList.add("panel-anim");
  SETTINGS_PANELS.forEach(function(p){ document.getElementById(p).style.display="none"; });
  document.getElementById("settingsBack").style.display="none";
  document.getElementById("settingsTitle").textContent="Settings";
}
function openSettingsPanel(id){
  document.getElementById("settingsMenu").style.display="none";
  SETTINGS_PANELS.forEach(function(p){
    var el=document.getElementById(p);
    if(p===id){
      el.style.display="block";
      el.classList.remove("panel-anim");
      void el.offsetWidth;
      el.classList.add("panel-anim");
    } else {
      el.style.display="none";
    }
  });
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
  if(id==="panelNotifications"){ renderPushPanel(""); }
  openLayer("settingsPanel",showSettingsMenu);
}
document.getElementById("settingsBtn").addEventListener("click",function(){ goToTab("more"); });
document.getElementById("settingsBack").addEventListener("click",function(){
  if(!closeLayer("settingsPanel")) showSettingsMenu();
});
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
    goToTab("more"); openSettingsPanel("panelAbout");
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
    doSave(); render(); goToTab("home");
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
enableSheetDrag("notifOverlay", closeNotif);
enableSheetDrag("subOverlay", closeSubSheet);
enableSheetDrag("subSortOverlay", function(){ closeOverlayLayer("subSortOverlay","subSort"); });
enableSheetDrag("subFilterOverlay", function(){ closeOverlayLayer("subFilterOverlay","subFilter"); });

// ---- Start ----
boot();
})();
