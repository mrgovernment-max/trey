# OJ || studios

A minimalist streetwear storefront — oversized tees, graphic pieces and limited
drops, crafted in Accra, Ghana and shipped worldwide.

Live at **https://blacksheep-mu.vercel.app** — real payments via Paystack (GHS).

## Tech

Vanilla HTML / CSS / JavaScript — no build step. Open `index.html` and it runs.

| File | Purpose |
|------|---------|
| `index.html` | The whole storefront (all views are sections of this page) |
| `app-core.js` | Shared core: auth/session, API wrapper, escaping, currency, guest cart, toasts |
| `script.js` | Storefront behaviour — catalogue, routing, cart, checkout |
| `theme.css` | Design tokens + shared components. Loads first on every page |
| `style.css` | Storefront styles |
| `acc.html` / `acc.css` | Customer account area |
| `admin.html` | Admin dashboard |
| `login.html` / `signup.html` | Auth pages |
| `404.html` | Not-found page |

Backend API lives in a separate repo, deployed at
`https://backendroutes-lcpt.onrender.com`.

## Running locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. A plain file:// open also works, but the
Paystack and EmailJS SDKs behave better over http.

## Routing

Every view has a URL, so links are shareable and the back button works:

- `#products` — the collection
- `#product/12-wanted-black-tee` — a single product
- `#new`, `#best`, `#limited` — filtered catalogue views
- `#cart`, `#contact`, `#shipping`, `#returns`, `#tracking`, `#size`,
  `#policy`, `#terms`, `#thrift`

## Before you deploy

- [ ] Read **[SECURITY.md](SECURITY.md)** — there are two critical backend
      issues (token auth, server-side order totals) that the frontend cannot fix
- [ ] Point `404.html` at your host's not-found handler (on Vercel this is
      automatic for a root-level `404.html`)

## Conventions

- **Currency:** every price is Ghana Cedis. Format it with `OJ.money()` — never
  hand-write a currency symbol. Paystack charges `GHS`; there is no second currency.
- **Backend data:** anything from the API goes through `OJ.escapeHtml()` before
  it reaches `innerHTML`, and `OJ.safeUrl()` if it is an image source.
- **API calls:** use `OJ.api()` so the auth token is attached and expired
  sessions are handled in one place.
- **Colours:** use the tokens in `theme.css`. Avoid new raw hex values.
