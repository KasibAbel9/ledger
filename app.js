(function(){
"use strict";

var SUPABASE_URL = "https://issreohiuzgbsujcdexq.supabase.co";
var SUPABASE_KEY = "sb_publishable_3Bn5vHh4AXyTu2tehjyShg_ef6kwtH2";
var GUEST_FN_URL = SUPABASE_URL + "/functions/v1/guest-signup";
var GUEST_EMAIL_DOMAIN = "@guest.ledger.local";

var APP_VERSION = "1.7.0";
// Newest first. `v` is the version an item shipped in.
var CHANGELOG = [
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