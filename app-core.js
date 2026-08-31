/* ==========================================================================
   OJ || studios — shared core
   Loaded before every page script. Provides:
     OJ.escapeHtml   — XSS-safe interpolation for backend data
     OJ.money        — the ONE currency formatter (GH₵, matches Paystack GHS)
     OJ.Auth         — token-aware session handling, fails closed on 401/403
     OJ.api          — fetch wrapper that attaches the auth token
     OJ.GuestCart    — localStorage cart for logged-out shoppers
     OJ.toast        — non-blocking replacement for alert()
   ========================================================================== */
(function (global) {
  "use strict";

  const API_BASE = "https://backendroutes-lcpt.onrender.com";

  /* ---------- escaping ------------------------------------------------- */
  const ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
  }

  // For values interpolated into an HTML attribute that is itself a URL.
  // Blocks javascript:/data: payloads arriving from the API.
  function safeUrl(value, fallback) {
    const url = String(value || "").trim();
    if (/^(https?:|\/|\.\/|data:image\/)/i.test(url)) return escapeHtml(url);
    return escapeHtml(fallback || "");
  }

  /* ---------- currency -------------------------------------------------- */
  // Every price on this site is Ghana Cedis. Paystack charges GHS.
  // There is no second currency — do not introduce one without a real
  // conversion rate and a matching Paystack currency.
  const CURRENCY = "GH₵";

  function money(amount) {
    const n = parseFloat(amount);
    if (!isFinite(n)) return `${CURRENCY} 0.00`;
    return `${CURRENCY} ${n.toFixed(2)}`;
  }

  /* ---------- brand fallback image -------------------------------------- */
  // Replaces the placecats.com placeholder that was shipping to production.
  const BRAND_FALLBACK =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
         <rect width="64" height="64" fill="#232321"/>
         <text x="32" y="41" font-family="Helvetica,Arial,sans-serif"
               font-size="26" font-weight="700" fill="#c9a46c"
               text-anchor="middle">OJ</text>
       </svg>`
    );

  /* ---------- session --------------------------------------------------- */
  const KEYS = {
    token: "authToken",
    userId: "userId",
    userName: "userName",
    isLoggedIn: "isLoggedIn",
  };

  const Auth = {
    // The backend does not issue tokens yet. When it does, login responses
    // carrying `token` (or `accessToken`/`jwt`) are picked up automatically
    // and sent as `Authorization: Bearer <token>` on every request below.
    getToken() {
      try {
        return sessionStorage.getItem(KEYS.token) || null;
      } catch (e) {
        return null;
      }
    },

    getUserId() {
      try {
        return sessionStorage.getItem(KEYS.userId) || null;
      } catch (e) {
        return null;
      }
    },

    getUserName() {
      try {
        return sessionStorage.getItem(KEYS.userName) || null;
      } catch (e) {
        return null;
      }
    },

    isLoggedIn() {
      return !!Auth.getUserId();
    },

    setSession(result) {
      if (!result) return;
      const token = result.token || result.accessToken || result.jwt;
      try {
        if (token) sessionStorage.setItem(KEYS.token, token);
        if (result.userId) sessionStorage.setItem(KEYS.userId, result.userId);
        if (result.userName)
          sessionStorage.setItem(KEYS.userName, result.userName);
        sessionStorage.setItem(KEYS.isLoggedIn, "yes");
      } catch (e) {
        /* storage disabled — session simply will not persist */
      }
    },

    clear() {
      try {
        sessionStorage.clear();
      } catch (e) {
        /* nothing to clear */
      }
    },

    logout(redirectTo) {
      Auth.clear();
      if (redirectTo) global.location.href = redirectTo;
    },
  };

  /* ---------- api ------------------------------------------------------- */
  /**
   * fetch wrapper.
   *  - attaches Authorization: Bearer <token> when a token exists
   *  - still sends userId in the body so the current backend keeps working
   *  - treats 401/403 as "session is gone": clears it and reports failure
   *
   * Do NOT use this for login routes (/loginoj, /admin/login). There a 401
   * means "wrong credentials", not "session expired" — routing it through
   * here throws and hides the server's actual message. Use plain fetch.
   *
   * IMPORTANT: the userId in the body is NOT authentication. Until the
   * backend validates the bearer token, any client can claim any userId.
   */
  async function api(path, options) {
    const opts = options || {};
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      opts.headers || {}
    );

    const token = Auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let body = opts.body;
    if (body && typeof body === "object") {
      // back-compat: current backend identifies the caller by this field
      const userId = Auth.getUserId();
      if (userId && body.userId === undefined) body = { ...body, userId };
      body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || "GET",
      headers,
      body,
      signal: opts.signal,
    });

    if (res.status === 401 || res.status === 403) {
      Auth.clear();
      const err = new Error("Session expired. Please sign in again.");
      err.status = res.status;
      err.unauthorized = true;
      throw err;
    }

    return res;
  }

  /** Retry helper for Render's free-tier cold starts (~50s first hit). */
  async function apiWithRetry(path, options, attempts) {
    const max = attempts || 3;
    let lastErr;
    for (let i = 0; i < max; i++) {
      try {
        const res = await api(path, options);
        if (res.ok || res.status < 500) return res;
        lastErr = new Error(`Server responded ${res.status}`);
      } catch (err) {
        if (err.unauthorized) throw err;
        lastErr = err;
      }
      // 1s, 3s, 7s — covers a cold container waking up
      if (i < max - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (2 ** (i + 1) - 1)));
      }
    }
    throw lastErr;
  }

  /** Wake the backend early so the first real request is not the cold one. */
  function warmBackend() {
    try {
      fetch(`${API_BASE}/ojmerch`, { method: "GET", mode: "cors" }).catch(
        () => {}
      );
    } catch (e) {
      /* best effort only */
    }
  }

  /* ---------- guest cart ------------------------------------------------ */
  const GUEST_KEY = "ojGuestCart";

  const GuestCart = {
    read() {
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    },

    write(items) {
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(items));
      } catch (e) {
        /* storage full or disabled — cart just will not persist */
      }
    },

    add(product, size, quantity) {
      const items = GuestCart.read();
      const qty = quantity || 1;
      const existing = items.find(
        (i) => i.productId === product.id && i.size === size
      );
      if (existing) {
        existing.quantity += qty;
      } else {
        items.push({
          cartId: `guest-${product.id}-${size}`,
          productId: product.id,
          name: product.name,
          price: parseFloat(product.price) || 0,
          img_url: product.img_url,
          size,
          quantity: qty,
        });
      }
      GuestCart.write(items);
      return items;
    },

    remove(cartId) {
      const items = GuestCart.read().filter(
        (i) => String(i.cartId) !== String(cartId)
      );
      GuestCart.write(items);
      return items;
    },

    count() {
      return GuestCart.read().reduce((sum, i) => sum + (i.quantity || 0), 0);
    },

    clear() {
      try {
        localStorage.removeItem(GUEST_KEY);
      } catch (e) {
        /* nothing to clear */
      }
    },

    /** Push a guest cart into the server cart after sign-in. */
    async merge() {
      const items = GuestCart.read();
      if (!items.length || !Auth.isLoggedIn()) return 0;

      let merged = 0;
      for (const item of items) {
        try {
          const res = await api("/cartoj", {
            method: "POST",
            body: {
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
            },
          });
          if (res.ok) merged++;
        } catch (e) {
          /* keep going: one failed line should not block the rest */
        }
      }
      if (merged) GuestCart.clear();
      return merged;
    },
  };

  /* ---------- toast ----------------------------------------------------- */
  function toast(message, type) {
    let host = document.querySelector(".oj-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "oj-toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }

    const el = document.createElement("div");
    el.className = `oj-toast oj-toast--${type || "info"}`;
    el.textContent = message;
    host.appendChild(el);

    setTimeout(() => {
      el.classList.add("oj-toast--leaving");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  global.OJ = {
    API_BASE,
    escapeHtml,
    safeUrl,
    money,
    CURRENCY,
    BRAND_FALLBACK,
    Auth,
    api,
    apiWithRetry,
    warmBackend,
    GuestCart,
    toast,
  };
})(window);
