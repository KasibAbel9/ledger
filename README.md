# Ledger — a personal expense tracker

A lightweight, installable expense tracker built as a single-file Progressive Web App (PWA). No app store, no build step — just an HTML file served over the web that friends can add to their home screen and use like a native app. Each person gets their own private, cloud-synced account.

**Privacy is a core priority** — every user's financial data is isolated at the database level so no one can see anyone else's entries. See [Privacy & security](#privacy--security) for exactly how.

**Live app:** https://kasibabel9.github.io/ledger/

---

## What it does

- **Track expenses and income** by month, with a radial spend chart and per-category breakdown
- **Monthly budgets** with a progress bar and colour-coded warnings
- **Multiple account types** — full email accounts, or quick username + PIN "guest" accounts with no email required
- **Multi-currency** — EUR, USD, INR, AED (one per account)
- **Day / night themes** with a sun-moon toggle, auto-selected by time of day
- **Excel/CSV import** — paste rows straight from a spreadsheet
- **PDF export** — printable monthly statement
- **Installable** — "Add to Home Screen" for a full-screen app experience
- **Streaks & nudges** to encourage daily logging

---

## Tech stack

Deliberately minimal — no frameworks, no build tooling, no dependencies to install.

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Vanilla HTML/CSS/JS, single `index.html` | Zero build step; trivially portable and hostable |
| Fonts | Manrope (Google Fonts) | Clean, minimalist sans-serif |
| Backend | [Supabase](https://supabase.com) | Managed Postgres + auth on a generous free tier |
| Auth | Supabase Auth (email/password + internal-email guest accounts) | Handles sessions, tokens, password reset |
| Data | One JSON blob per user in a `user_data` table | Simple; fine for this scale |
| Guest signup | Supabase Edge Function (`guest-signup`) | Server-side account creation with admin rights |
| Hosting | GitHub Pages | Free, permanent, HTTPS |

---

## Architecture at a glance

```
Browser (index.html, PWA)
   │
   ├── Supabase Auth  ── sessions, email verification, password reset
   │
   ├── Supabase REST (user_data)  ── per-user data, protected by Row Level Security
   │
   ├── Supabase REST (usernames)  ── public lookup table for guest-name availability
   │
   └── Edge Function (guest-signup)  ── creates pre-confirmed guest accounts (admin key, server-side only)
```

### Account types

- **Email account** — standard email + password, with email verification and a 6-digit-code password reset flow.
- **Quick / Guest account** — a self-chosen **username + 6-digit PIN**. Under the hood this maps to an internal Supabase email (`username@guest.ledger.local`) so it reuses the same auth system, but the user only ever sees username + PIN. Guests can later add a real email in Settings to secure the account — data carries over since it's the same underlying user.

### Data isolation

All personal data lives in `user_data`, protected by **Row Level Security** so each row is readable/writable only by its owner (`auth.uid() = user_id`). The Supabase publishable/anon key is public by design (it ships in the client) — RLS is what actually keeps data private.

---

## Repo contents

| File | Purpose |
|------|---------|
| `index.html` | The entire app — structure, styles, and logic |
| `manifest.json` | PWA metadata (name, colours, icons) for install |
| `icon-192.png`, `icon-512.png` | Home-screen / install icons |
| `apple-touch-icon.png` | iOS home-screen icon |
| `favicon-32.png`, `favicon-48.png` | Browser-tab icons |

> **Note:** the app is currently a single `index.html` by design — it keeps hosting and updates dead simple. Splitting into separate `styles.css` / `app.js` files is a planned refactor once the feature set stabilises.

---

## Running it yourself

Because it's a static PWA, you can fork and host it in minutes.

1. **Fork this repo.**
2. **Create a free Supabase project** and note your project URL + publishable (anon) key.
3. In `index.html`, update `SUPABASE_URL` and `SUPABASE_KEY` near the top of the script.
4. **Set up the database** (Supabase SQL Editor):
   ```sql
   -- per-user data
   create table public.user_data (
     user_id uuid primary key references auth.users(id) on delete cascade,
     data jsonb,
     updated_at timestamptz default now()
   );
   alter table public.user_data enable row level security;
   create policy "own data" on public.user_data
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- public username lookup (guest accounts)
   create table public.usernames (
     username text primary key,
     user_id uuid not null references auth.users(id) on delete cascade,
     created_at timestamptz default now()
   );
   alter table public.usernames enable row level security;
   create policy "anyone can check availability" on public.usernames for select using (true);
   create policy "users manage own username" on public.usernames
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
5. **Deploy the `guest-signup` Edge Function** and set a `SERVICE_ROLE_KEY` secret (your Supabase secret/service-role key). This function creates pre-confirmed guest accounts server-side.
6. **Set the Site URL** (Auth → URL Configuration) to your hosted URL so email-verification links redirect back to the app.
7. **Enable GitHub Pages** (Settings → Pages → deploy from `main`, root). Your app is live at `https://<username>.github.io/<repo>/`.

---

## Privacy & security

Privacy is a first-class concern in this project, not an afterthought. Here's exactly how each user's financial data is kept private and secure, layer by layer.

### 1. Every account's data is isolated by Row Level Security (RLS)
All personal data lives in the `user_data` table, with **Row Level Security enabled**. The access policy is:

```sql
using (auth.uid() = user_id) with check (auth.uid() = user_id)
```

This means the database itself enforces that a logged-in user can **only ever read or write their own row** — it is physically impossible to query another person's data, even with direct API access. Isolation is enforced at the database layer, not just in the app code (which could otherwise be bypassed).

### 2. The public API key is safe to expose — by design
The Supabase **publishable (anon) key** ships inside the client, and that's intentional and safe. On its own it grants **no access to any data**, because every table is gated by RLS. Think of it like a building's public street address: knowing it doesn't get you through any locked door. Data privacy relies on RLS + authentication, never on hiding this key.

### 3. The powerful admin key never touches the browser
The **service-role / secret key** (which *can* bypass RLS) exists in exactly one place: as an encrypted secret inside the server-side `guest-signup` Edge Function. It is **never** in `index.html`, never sent to the browser, never in the repo. Guest account creation happens server-side precisely so this key stays off the client.

### 4. Passwords and PINs are never stored by us
Authentication is handled entirely by **Supabase Auth**. Passwords (and guest PINs, which are treated as passwords) are **hashed and salted by Supabase** — they are never stored in plain text, never visible in the database, and never handled by our own code. We only ever send them over HTTPS to Supabase's auth endpoint.

### 5. Everything travels over HTTPS
The app is served over HTTPS (GitHub Pages) and all API calls go to Supabase over HTTPS, so data is encrypted in transit.

### 6. Username lookups reveal nothing sensitive
The one deliberately public table, `usernames`, exists only so the app can tell a new user "that name is taken / available." It contains **only usernames** — no PINs, no names, no financial data, no emails. Even reading the entire table exposes nothing private.

### 7. Guest accounts: an honest tradeoff
Quick/guest accounts (username + PIN, no email) are just as isolated by RLS as email accounts. The **only** difference is recoverability: because there's no email, **a forgotten PIN cannot be recovered.** This tradeoff is stated plainly to the user at sign-up, and any guest can add an email later (in Settings) to gain password recovery — their data carries over, since it's the same underlying account.

### What this means in plain terms
- Only *you* can see *your* entries. Not other users, not someone who inspects the app's code, not someone who grabs the public key.
- We (the maintainers) can't see your password or PIN — they're hashed by Supabase.
- The single most powerful credential is locked server-side and never shipped to anyone's device.

---

## Roadmap / ideas

- Offline support via a service worker (with an in-app "new version available" update prompt)
- Full German (Deutsch) translation — the language toggle exists; strings to follow
- Split `index.html` into separate HTML/CSS/JS files as the codebase grows

---

## Credits

Built by [Kasib Ahmed](https://github.com/KasibAbel9), as a personal project. Not affiliated with any company; shared for friends and anyone who finds it useful.
