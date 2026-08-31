(function () {
  // ---------- state ----------
  let products = []; // will be filled from API
  let msize = null;

  ///dont show user acc logo if nt logged in

  //AOS animation — guarded: if the CDN is blocked, the site still renders
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 1000, // animation duration (ms)
      easing: "ease-in-out", // smooth animation
      once: true, // animation happens only once
      offset: 120, // trigger point (px from bottom)
      delay: 100, // delay before animation starts
      mirror: false, // no repeat when scrolling up
    });
  } else {
    // reveal anything that was waiting on an animation
    document
      .querySelectorAll("[data-aos]")
      .forEach((el) => el.classList.add("aos-animate"));
  }
  // DOM elements
  const pages = document.querySelectorAll(".page");
  const navLinks = document.querySelectorAll("[data-page]");
  const productGrid = document.getElementById("products-grid");
  const homeFeatured = document.getElementById("home-featured");
  const showProductDetailcontainer =
    document.getElementById("detail-container");
  const cartContainer = document.getElementById("cart-container");
  const cartCountSpan = document.getElementById("cart-count");
  const acc = document.getElementById("account");

  // ---------- routing ----------
  // Every view has a URL. This gives the site: a working back button,
  // shareable product links, per-view analytics, and something for search
  // engines to index beyond the homepage.
  const PAGE_TITLES = {
    home: "OJ || studios",
    products: "Collection — OJ || studios",
    thrift: "Thrift Store — OJ || studios",
    cart: "Your Cart — OJ || studios",
    contact: "Contact — OJ || studios",
    shipping: "Shipping — OJ || studios",
    returns: "Returns & Exchanges — OJ || studios",
    tracking: "Track Your Order — OJ || studios",
    size: "Size Guide — OJ || studios",
    policy: "Privacy Policy — OJ || studios",
    terms: "Terms of Service — OJ || studios",
    "product-detail": "OJ || studios",
  };

  let suppressRouteWrite = false;

  // helper: show page
  function showPage(pageId, options) {
    const opts = options || {};
    pages.forEach((p) => p.classList.remove("active-page"));
    const target = document.getElementById(pageId);
    if (target) target.classList.add("active-page");
    else {
      pageId = "home";
      document.getElementById("home").classList.add("active-page");
    }

    if (!opts.keepScroll) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (pageId === "cart") renderCart();

    document.title = opts.title || PAGE_TITLES[pageId] || "OJ || studios";

    if (!suppressRouteWrite) {
      const hash = opts.hash || `#${pageId}`;
      if (window.location.hash !== hash) {
        history.pushState({ pageId, hash }, "", hash);
      }
    }

    // per-view analytics — otherwise GA4 only ever sees one pageview
    if (typeof gtag === "function") {
      gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: opts.hash || `#${pageId}`,
      });
    }
  }

  // slug helper so product URLs read as #product/12-wanted-black-tee
  function productSlug(product) {
    const name = String(product.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${product.id}${name ? "-" + name : ""}`;
  }

  function applyRouteFromHash() {
    const raw = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    suppressRouteWrite = true;

    try {
      if (!raw) {
        showPage("home");
        return;
      }

      const productMatch = raw.match(/^product\/(\d+)/);
      if (productMatch) {
        const id = parseInt(productMatch[1], 10);
        if (products.length === 0) return; // fetchProducts re-invokes us
        const found = products.find((p) => p.id === id);
        if (found) {
          showProductDetail(id);
          return;
        }
        showPage("products");
        return;
      }

      // catalogue views used by the footer links
      if (["new", "best", "limited"].includes(raw)) {
        catalogue.view = raw;
        renderProducts();
        showPage("products");
        return;
      }

      if (document.getElementById(raw)) {
        if (raw === "products") renderProducts();
        showPage(raw);
        return;
      }

      showPage("home");
    } finally {
      suppressRouteWrite = false;
    }
  }

  window.addEventListener("popstate", applyRouteFromHash);
  window.addEventListener("hashchange", applyRouteFromHash);

  // account icon only means something once there is an account
  if (acc) acc.style.display = OJ.Auth.isLoggedIn() ? "" : "none";

  // skeleton cards while the API wakes up (Render free tier cold-starts)
  function skeletonCards(count, className) {
    return Array.from({ length: count })
      .map(
        () => `<div class="${className} skeleton-card" aria-hidden="true">
                 <div class="skeleton skeleton-img"></div>
                 <div class="skeleton skeleton-line"></div>
                 <div class="skeleton skeleton-line short"></div>
               </div>`
      )
      .join("");
  }

  function showProductsLoading() {
    if (productGrid) {
      productGrid.innerHTML = skeletonCards(6, "product-card");
      productGrid.setAttribute("aria-busy", "true");
    }
    if (homeFeatured) {
      homeFeatured.innerHTML = skeletonCards(3, "featured-item");
      homeFeatured.setAttribute("aria-busy", "true");
    }
  }

  function showProductsError() {
    const markup = `
      <div class="load-error" role="alert">
        <p>we could not reach the store.</p>
        <p class="load-error-hint">the shop may be waking up — this can take a moment.</p>
        <button type="button" class="btn" id="products-retry">try again</button>
      </div>`;
    if (productGrid) productGrid.innerHTML = markup;
    if (homeFeatured) homeFeatured.innerHTML = markup;
    document.querySelectorAll("#products-retry").forEach((btn) =>
      btn.addEventListener("click", () => {
        showProductsLoading();
        fetchProducts();
      })
    );
  }

  // fetch products from API
  async function fetchProducts() {
    showProductsLoading();
    try {
      // retries with backoff so a cold backend does not look like an outage
      const response = await OJ.apiWithRetry("/ojmerch", { method: "GET" }, 3);
      if (!response.ok) throw new Error("Network error");
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("Unexpected response");

      // ensure all products have proper image arrays
      products = payload.map((p) => ({
        ...p,
        // create array of up to 4 images: img_url, img_url_1, img_url_2, img_url_3, with fallback
        images: [p.img_url, p.img_url_1 || p.img_url].filter(Boolean),
      }));

      if (productGrid) productGrid.removeAttribute("aria-busy");
      if (homeFeatured) homeFeatured.removeAttribute("aria-busy");

      // after loading, render home and products
      renderHomeFeatured();
      renderProducts();
      buildFilterOptions();
      applyRouteFromHash();
    } catch (error) {
      console.error("Failed to load products:", error);
      if (productGrid) productGrid.removeAttribute("aria-busy");
      if (homeFeatured) homeFeatured.removeAttribute("aria-busy");
      showProductsError();
    }
  }

  // render first 3 as featured (or any logic)
  function renderHomeFeatured() {
    if (!homeFeatured || products.length === 0) return;
    const featured = products.slice(3, 6);
    homeFeatured.innerHTML = featured
      .map(
        (p) => `
              <div class="featured-item" data-product-id="${p.id}">
                  <img src="${OJ.safeUrl(p.img_url, OJ.BRAND_FALLBACK)}" alt="${OJ.escapeHtml(p.name)}" loading="lazy" width="600" height="750" decoding="async">
                  <h3>${OJ.escapeHtml(p.name)}</h3>
                  <span>${OJ.escapeHtml(
                    p.color
                      ? p.color.split(",").slice(0, 2).join(" · ")
                      : "signature"
                  )}</span>
              </div>
          `
      )
      .join("");

    // attach click listeners
    document.querySelectorAll(".featured-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = parseInt(el.dataset.productId);
        showProductDetail(id);
      });
    });
  }
  // ---------- catalogue filtering / sorting / search ----------
  const catalogue = { query: "", color: "all", sort: "featured", view: "all" };

  function visibleProducts() {
    let list = products.slice();

    if (catalogue.view === "new") {
      // newest first by id, top 8
      list = list.slice().sort((a, b) => b.id - a.id).slice(0, 8);
    } else if (catalogue.view === "best") {
      list = list.filter((p) => (parseFloat(p.rating) || 0) >= 4);
    } else if (catalogue.view === "limited") {
      list = list.filter(
        (p) =>
          /limited|launching/i.test(p.release || "") ||
          !(parseFloat(p.price) > 0)
      );
    }

    if (catalogue.query) {
      const q = catalogue.query.toLowerCase();
      list = list.filter((p) =>
        [p.name, p.description, p.color, p.material]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (catalogue.color !== "all") {
      list = list.filter((p) =>
        (p.color || "").toLowerCase().includes(catalogue.color.toLowerCase())
      );
    }

    if (catalogue.sort === "price-asc") {
      list.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    } else if (catalogue.sort === "price-desc") {
      list.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    } else if (catalogue.sort === "name") {
      list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    } else if (catalogue.sort === "rating") {
      list.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    }

    return list;
  }

  // populate the colour dropdown from whatever the API actually returned
  function buildFilterOptions() {
    const colorSelect = document.getElementById("filter-color");
    if (!colorSelect) return;
    const colors = new Set();
    products.forEach((p) => {
      String(p.color || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((c) => colors.add(c.toLowerCase()));
    });
    colorSelect.innerHTML =
      '<option value="all">all colours</option>' +
      [...colors]
        .sort()
        .map(
          (c) =>
            `<option value="${OJ.escapeHtml(c)}">${OJ.escapeHtml(c)}</option>`
        )
        .join("");
  }

  function renderProducts() {
    if (!productGrid) return;

    if (products.length === 0) {
      productGrid.innerHTML = skeletonCards(6, "product-card");
      return;
    }

    const list = visibleProducts();
    const countEl = document.getElementById("catalogue-count");
    if (countEl) {
      countEl.textContent = `${list.length} ${
        list.length === 1 ? "piece" : "pieces"
      }`;
    }

    if (list.length === 0) {
      productGrid.innerHTML = `
        <div class="load-error" role="status">
          <p>nothing matches that search.</p>
          <button type="button" class="btn" id="clear-filters">clear filters</button>
        </div>`;
      document.getElementById("clear-filters")?.addEventListener("click", () => {
        catalogue.query = "";
        catalogue.color = "all";
        catalogue.sort = "featured";
        catalogue.view = "all";
        const si = document.getElementById("product-search");
        if (si) si.value = "";
        const cs = document.getElementById("filter-color");
        if (cs) cs.value = "all";
        const ss = document.getElementById("sort-products");
        if (ss) ss.value = "featured";
        renderProducts();
      });
      return;
    }

    productGrid.innerHTML = list
      .map(
        (p) => `
        <div class="product-card ${
          parseFloat(p.price) > 0 ? "" : "vip"
        }" data-product-id="${p.id}">
            <img src="${OJ.safeUrl(p.img_url, OJ.BRAND_FALLBACK)}" alt="${OJ.escapeHtml(p.name)}" loading="lazy" width="600" height="750" decoding="async">
            <h3>${OJ.escapeHtml(p.name)}</h3>
            <div class="product-price">${
              parseFloat(p.price) > 0
                ? OJ.money(p.price)
                : "Not Available to Public"
            }</div>
            <div class="brand-mini">
                <img src="${
                  OJ.safeUrl(p.brand_img_url, OJ.BRAND_FALLBACK)
                }" alt="brand"> 
                <span style="font-size:0.85rem; color:#555;${
                  parseFloat(p.price) > 0 ? "" : "display: none;"
                }">${p.rating ? "★ " + OJ.escapeHtml(p.rating) : ""}</span>
            </div>
        </div>
      `
      )
      .join("");

    // attach listeners
    document.querySelectorAll(".product-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const id = card.dataset.productId;
        showProductDetail(parseInt(id));
      });
    });
  }

  // show detailed view using all DB fields + default fallbacks for missing fields
  function showProductDetail(productId) {
    //size select

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // default values for fields not yet in DB (release date, warranty etc)
    const releaseDate = product.release || "Upcoming";
    let availability = product.availability || 0;
    if (product.release === "Launching Soon") {
      availability = "Not Available to Public";
    }

    const material = product.material || "mixed materials";
    const weight = product.weight || "—";
    const warranty = product.warranty || "1 year warranty";
    const color = product.color || "multiple";
    const brandDesc =
      product.brand_description || "designed for everyday elegance.";

    // build image gallery using images array  created
    const images =
      product.images && product.images.length
        ? product.images
        : [product.img_url];

    // Check login status for button state

    showProductDetailcontainer.innerHTML = `
        <div class="detail-gallery">
            <img src="${OJ.safeUrl(images[0], OJ.BRAND_FALLBACK)}" class="main-img" id="detail-main-img" alt="${OJ.escapeHtml(product.name)}">
            <div class="thumbnails" id="detail-thumbs">
                ${images
                  .map(
                    (img, i) =>
                      `<img src="${OJ.safeUrl(img, OJ.BRAND_FALLBACK)}" class="thumb ${
                        i === 0 ? "active-thumb" : ""
                      }" data-img="${OJ.safeUrl(img, OJ.BRAND_FALLBACK)}" alt="${OJ.escapeHtml(
                        product.name
                      )} view ${i + 1}">`
                  )
                  .join("")}
            </div>
        </div>
        <div class="detail-info" >
            <h2>${OJ.escapeHtml(product.name)}</h2>
            <div id="detail-id" class="detail-id" style="${
              product.release === "Launching Soon" ? "display:none" : ""
            }">${OJ.money(product.price)}
                <span class="rating-stars">${"★".repeat(
                  Math.floor(product.rating || 0)
                )}${product.rating % 1 >= 0.5 ? "½" : ""}</span>
            </div>
            <div class="detail-description">${OJ.escapeHtml(
              product.description || "timeless design"
            )}</div>
            <ul class="detail-meta">
                <li><span class="meta-label">material</span><span class="meta-value">${OJ.escapeHtml(material)}</span></li>
                <li><span class="meta-label">color</span><span class="meta-value">${OJ.escapeHtml(color)}</span></li>
                <li><span class="meta-label">weight</span><span class="meta-value">${OJ.escapeHtml(weight)}</span></li>
                <li><span class="meta-label">warranty</span><span class="meta-value">${OJ.escapeHtml(warranty)}</span></li>
                <li><span class="meta-label">release</span><span class="meta-value">${OJ.escapeHtml(releaseDate)}</span></li>
                <li><span class="meta-label">availability</span><span style="${
                  product.release === "Launching Soon" ? "color:orange" : ""
                }" class="meta-value">${OJ.escapeHtml(availability)}</span></li>
            </ul>

            <!-- === TREY size selector - minimal, professional === -->
            <div class="trey-size-selector" style="${
              product.release === "Launching Soon" ? "display:none" : ""
            }">
                <span class="size-label">select size</span>
                <div class="size-options">
                    <button type="button" class="size-btn" data-size="XS">XS</button>
                    <button type="button" class="size-btn" data-size="S">S</button>
                    <button type="button" class="size-btn" data-size="M">M</button>
                    <button type="button" class="size-btn" data-size="L">L</button>
                    <button type="button" class="size-btn" data-size="XL">XL</button>
                </div>
            </div>
            
            <!-- Guests can build a cart; it merges into their account on sign-in -->
            ${
              !OJ.Auth.isLoggedIn()
                ? `
                <div class="login-reminder-badge"  style="${
                  product.release === "Launching Soon" ? "display:none" : ""
                }">
                <i class="fa-regular fa-circle-user"></i>
                    <span>shopping as a guest — <a href="login.html">sign in</a> to save your cart</span>
                </div>
            `
                : ""
            }

            <button class="add-to-cart-btn" style="${
              product.release === "Launching Soon" ? "display:none" : ""
            }"
                    data-product-id="${product.id}">
                add to cart
            </button>
            
            <div style="margin-top:1.5rem; border-top:1px solid #ddd; padding-top:1rem; display:flex; gap:10px;">
                <img src="${
                  OJ.safeUrl(product.brand_img_url, OJ.BRAND_FALLBACK)
                }" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                <p style="font-size:0.9rem; color:#3b3b38;"><strong>brand note</strong> · ${brandDesc}</p>
            </div>
        </div>
    `;

    //For Private Merch

    // thumbnail switcher
    setTimeout(() => {
      const thumbs = document.querySelectorAll(".thumb");
      const mainImg = document.getElementById("detail-main-img");
      thumbs.forEach((t) =>
        t.addEventListener("click", function () {
          mainImg.src = this.dataset.img;
          thumbs.forEach((th) => th.classList.remove("active-thumb"));
          this.classList.add("active-thumb");
        })
      );

      // guests and signed-in shoppers both get a working add-to-cart
      document
        .querySelector(".add-to-cart-btn")
        ?.addEventListener("click", async (e) => {
          const btn = e.currentTarget;
          const pid = parseInt(btn.dataset.productId);

          // Call  existing addToCart function
          await addToCart(pid);
        });
    }, 50);

    //active size — reset per product so the last pick does not leak over
    msize = null;
    const activeSize = document.querySelectorAll(".size-btn");
    activeSize.forEach((s) => {
      s.addEventListener("click", () => {
        activeSize.forEach((ss) => {
          ss.classList.remove("selected");
        });

        s.classList.add("selected");
        //this contains the size
        msize = s.dataset.size;
      });
    });

    showPage("product-detail", {
      hash: `#product/${productSlug(product)}`,
      title: `${product.name} — OJ || studios`,
    });

    // keep the meta description in step with the product on view
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && product.description) {
      metaDesc.setAttribute(
        "content",
        String(product.description).slice(0, 155)
      );
    }
  }

  //helper toast funs
  function showToast(message, type = "success") {
    // Remove any existing toast
    const existingToast = document.querySelector(".trey-toast");
    if (existingToast) existingToast.remove();

    // Create toast element
    const toast = document.createElement("div");
    toast.className = "trey-toast";
    toast.innerHTML = `
        <i class="fa-regular ${
          type === "success" ? "fa-circle-check" : "fa-circle-info"
        }"></i>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(toast);

    // Auto-remove after 2.5 seconds
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2500);
  }

  // cart functions
  // Guests get a localStorage cart; it is merged into the server cart on
  // sign-in (see OJ.GuestCart.merge, called from login.html).
  async function addToCart(productId) {
    const product = products.find((p) => p.id === productId);

    // items with no public price are not purchasable yet
    if (!product || !(parseFloat(product.price) > 0)) {
      OJ.toast("This piece is not available for purchase yet.", "error");
      return;
    }

    if (!msize) {
      OJ.toast("Please select a size first.", "error");
      return;
    }

    if (!OJ.Auth.isLoggedIn()) {
      OJ.GuestCart.add(product, msize, 1);
      showToast("✓ added — sign in at checkout", "success");
      renderCartCount();
      return;
    }

    try {
      const res = await OJ.api("/cartoj", {
        method: "POST",
        body: { productId: productId, size: msize, quantity: 1 },
      });

      if (res.ok) {
        showToast("✓ item added to your cart", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error(data);
        OJ.toast(data.message || "Could not add that item.", "error");
        return;
      }
    } catch (err) {
      console.error("Cart error:", err);
      OJ.toast(
        err.unauthorized
          ? "Your session expired. Please sign in again."
          : "Could not reach the store. Please try again.",
        "error"
      );
      return;
    }

    renderCartCount();
  }

  //remove from cart
  async function removeFromCart(cartId) {
    if (!OJ.Auth.isLoggedIn()) {
      OJ.GuestCart.remove(cartId);
      renderCart();
      renderCartCount();
      return;
    }

    try {
      const res = await OJ.api("/ojcartrmv", {
        method: "DELETE",
        body: { cartId: cartId },
      });

      if (res.ok) {
        renderCart(); // reload cart items
        renderCartCount(); // update badge
      } else {
        OJ.toast("Could not remove that item.", "error");
      }
    } catch (err) {
      console.error("Remove cart error:", err);
      OJ.toast("Could not remove that item.", "error");
    }
  }

  async function renderCartCount() {
    if (!OJ.Auth.isLoggedIn()) {
      cartCountSpan.innerText = OJ.GuestCart.count();
      return;
    }

    try {
      const res = await OJ.api("/ojcartget", { method: "POST", body: {} });
      const cart = await res.json();
      const total = Array.isArray(cart)
        ? cart.reduce((acc, i) => acc + i.quantity, 0)
        : 0;

      cartCountSpan.innerText = total;
    } catch (err) {
      console.error("Cart count error:", err);
      cartCountSpan.innerText = 0;
    }
  }

  /////////
  ///////RENDERCART
  ///////
  async function renderCart() {
    if (!cartContainer) return;

    // --- LOADING ANIMATION STARTS ---
    cartContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>loading your cart...</p>
        </div>
    `;
    // --- LOADING ANIMATION ENDS (will be replaced after fetch) ---

    const isAuthed = OJ.Auth.isLoggedIn();
    const userName = OJ.Auth.getUserName() || "Guest";

    const cartname = document.getElementById("cartname");
    if (cartname) {
      cartname.textContent = `${userName}'s Cart`;
    }

    let cart;
    if (isAuthed) {
      try {
        const res = await OJ.api("/ojcartget", { method: "POST", body: {} });
        cart = await res.json();
      } catch (err) {
        console.error("Cart load error:", err);
        cartContainer.innerHTML = `
          <div class="cart-error">
            <p>we could not load your cart just now.</p>
            <button type="button" class="btn" id="cart-retry">try again</button>
          </div>`;
        document
          .getElementById("cart-retry")
          ?.addEventListener("click", renderCart);
        return;
      }
    } else {
      cart = OJ.GuestCart.read();
    }

    if (!Array.isArray(cart)) cart = [];

    if (cart.length === 0) {
      cartContainer.innerHTML = `
        <div class="cart-empty">
          <p>your cart is empty.</p>
          <button type="button" class="btn" data-page="products">browse the collection</button>
        </div>`;
      cartContainer
        .querySelector('[data-page="products"]')
        ?.addEventListener("click", () => {
          renderProducts();
          showPage("products");
        });
      return;
    }

    let html = `<div class="cart-items">`;

    cart.forEach((item) => {
      html += `
        <div class="cart-item" data-cart-id="${item.cartId}">
            <div class="cart-img">
                <img src="${OJ.safeUrl(item.img_url, OJ.BRAND_FALLBACK)}"  data-item-id="${
        item.product_id
      }" alt="${OJ.escapeHtml(item.name)}" width="120" height="150" loading="lazy">
            </div>
            <div class="cart-name">
                <h4>${OJ.escapeHtml(item.name)}</h4>
            </div>
            <div class="cart-price">
                <span>${OJ.money(item.price)}</span>
            </div>
            <div class="cart-quantity">
                <span class="size-badge">${item.quantity}</span>
            </div>
            <div class="cart-size">
                <span class="size-badge">${OJ.escapeHtml(item.size || "M")}</span>
            </div>
            <div class="cart-remove">
                <i class="fa-regular fa-trash-can remove-item" data-cart-id="${
                  item.cartId
                }"></i>
            </div>
        </div>
        `;
    });

    let total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const subtotal = total;
    let shippingCost = 0;
    let selectedRegion = "accra";

    // Function to update total based on shipping
    function updateTotal() {
      const subtotalElem = document.getElementById("subtotal-amount");
      const shippingElem = document.getElementById("shipping-amount");
      const totalElem = document.getElementById("total-amount");

      if (subtotalElem) subtotalElem.textContent = OJ.money(subtotal);
      if (shippingElem)
        shippingElem.textContent = OJ.money(shippingCost);
      if (totalElem)
        totalElem.textContent = OJ.money(subtotal + shippingCost);

      //  store the total in GH₵ for Paystack
      total = subtotal + shippingCost;
    }

    // Shipping option listeners
    function attachShippingListeners() {
      const shippingRadios = document.querySelectorAll(
        'input[name="shipping"]'
      );

      shippingRadios.forEach((radio) => {
        radio.removeEventListener("change", handleShippingChange);
        radio.addEventListener("change", handleShippingChange);
      });
    }

    function handleShippingChange(e) {
      const selectedRadio = e.target;
      const price = parseFloat(selectedRadio.value);

      if (!isNaN(price)) {
        shippingCost = price;
        selectedRegion = selectedRadio.dataset.region;
        updateTotal();

        // Store selected shipping info
        sessionStorage.setItem(
          "selectedShipping",
          JSON.stringify({
            region: selectedRegion,
            cost: shippingCost,
          })
        );
      }
    }

    // Check for stored shipping preference
    const storedShipping = sessionStorage.getItem("selectedShipping");
    if (storedShipping) {
      const shipping = JSON.parse(storedShipping);
      shippingCost = shipping.cost;
      selectedRegion = shipping.region;
    }

    html += `</div>`;

    html += `
    <div class="cart-summary">
    <span style="color: #bf9a2c;">Please make sure you choose the right type of delivery to prevent delay in delivery or improper order processing</span> 
    <!-- Subtotal -->
    <div class="summary-row">
        <span>subtotal</span>
        <span id="subtotal-amount">GH₵ 0.00</span>
    </div>
    
    <!-- Shipping Section -->
    <div class="shipping-section">
        <div class="summary-row shipping-header">
            <span>shipping</span>
            <span id="shipping-amount">GH₵ 0.00</span>
        </div>
        
        <div class="shipping-options">
            <label class="shipping-option">
                <input type="radio" name="shipping" value="25" data-region="accra" data-price="25">
                <span class="shipping-details">
                    <strong>Accra</strong>
                    <small>Delivery within 1-3 days</small>
                </span>
                <span class="shipping-price">GH₵25.00</span>
            </label>
            
            <label class="shipping-option">
                <input type="radio" name="shipping" value="50" data-region="ghana-other" data-price="50">
                <span class="shipping-details">
                    <strong>Other Regions (Ghana)</strong>
                    <small>Delivery within 3-5 days</small>
                </span>
                <span class="shipping-price">GH₵50.00</span>
            </label>
            
            <label class="shipping-option">
                <input type="radio" name="shipping" value="220" data-region="africa" data-price="200">
                <span class="shipping-details">
                    <strong>Africa</strong>
                    <small>Delivery within 5-10 days</small>
                </span>
                <span class="shipping-price">GH₵220</span>
            </label>
            
            <label class="shipping-option">
                <input type="radio" name="shipping" value="330" data-region="international" data-price="300">
                <span class="shipping-details">
                    <strong>International</strong>
                    <small>Delivery within 10-14 days</small>
                </span>
                <span class="shipping-price">GH₵330</span>
            </label>
        </div>
    </div>
    
    <!-- Divider -->
    <div class="summary-divider"></div>
    
    <!-- Total -->
    <div class="summary-row total-row">
        <span>total</span>
        <span id="total-amount" class="total-price">GH₵ 0.00</span>
    </div>
    
    <!-- Currency Note -->
    <p class="currency-note">* All prices and charges are in Ghana Cedis (GH₵)</p>
    
    <button class="checkout-btn" id="paystack-checkout-btn">proceed to payment</button>
    <p class="secure-note"><i class="fa-solid fa-shield"></i> secure payment via Paystack</p>
</div>
    `;

    cartContainer.innerHTML = html;

    // totals and shipping listeners must run AFTER the markup exists —
    // previously updateTotal() ran first and silently wrote to nothing,
    // which is why the subtotal always displayed 0.00
    attachShippingListeners();

    if (shippingCost) {
      const savedRadio = document.querySelector(
        `input[name="shipping"][value="${shippingCost}"]`
      );
      if (savedRadio) savedRadio.checked = true;
    }

    updateTotal();

    // remove item
    document.querySelectorAll(".remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const cartId = e.target.dataset.cartId;
        removeFromCart(cartId);
      });
    });

    document.querySelectorAll(".cart-img").forEach((item) => {
      item.addEventListener("click", (e) => {
        const cartId = parseInt(e.target.dataset.itemId);
        showProductDetail(cartId);
      });
    });

    const checkoutBtn = document.getElementById("paystack-checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", async () => {
        // Guests can browse and build a cart, but an order needs an account.
        // Their cart is already in localStorage and merges on sign-in.
        if (!OJ.Auth.isLoggedIn()) {
          OJ.toast("Please sign in to complete your order.", "info");
          try {
            sessionStorage.setItem("returnTo", "index.html#cart");
          } catch (e) {
            /* non-fatal */
          }
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1200);
          return;
        }

        checkoutBtn.disabled = true;
        checkoutBtn.textContent = "processing...";

        try {
          // Show delivery address modal
          const deliveryData = await showDeliveryModal();
          if (!deliveryData) {
            enableCheckoutButton();
            return;
          }

          // Get user email
          const emailField = document.getElementById("paymentmail");
          let userEmail = (emailField ? emailField.value : "").trim();
          if (!userEmail) {
            userEmail = sessionStorage.getItem("userEmail") || "";
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
            OJ.toast(
              "Please enter a valid email for your order confirmation.",
              "error"
            );
            if (emailField) {
              emailField.focus();
              emailField.setAttribute("aria-invalid", "true");
            }
            enableCheckoutButton();
            return;
          }
          try {
            sessionStorage.setItem("userEmail", userEmail);
          } catch (e) {
            /* non-fatal */
          }

          // Prepare payment data
          // NOTE: `total` and `cartItems` are CLIENT values. The backend must
          // recompute the order total from its own product + shipping tables
          // and reject any Paystack charge whose amount does not match.
          // See SECURITY.md — "Server-side total verification".
          const paymentData = {
            total: total,
            shipping_region: selectedRegion,
            shipping_cost: shippingCost,
            email: userEmail,
            phone: deliveryData.phone || "Not provided",
            first_name: deliveryData.fullname.split(" ")[0] || "Valued",
            last_name:
              deliveryData.fullname.split(" ").slice(1).join(" ") || "Customer",
            userId: OJ.Auth.getUserId(),
            cartItems: cart,
            delivery_address: deliveryData,
          };

          // Initialize Paystack payment
          initializePaystackPayment(paymentData);
        } catch (err) {
          console.error("Checkout error:", err);
          showPaymentMessage("An error occurred. Please try again.", "error");
          enableCheckoutButton();
        }
      });
    }
  }

  // PAYSTACK CHECKOUT INTEGRATION

  // Paystack public Key
  const PAYSTACK_PUBLIC_KEY =
    "pk_live_72f7fb40a294df7d100a2f22611b2a96599a97f2";
  // Initialize Paystack payment
  function initializePaystackPayment(paymentData) {
    const amountInPesewas = Math.round(paymentData.total * 100);
    const reference = `TREY-${Date.now()}-${Math.floor(
      Math.random() * 1000000
    )}`;

    const address = paymentData.delivery_address || {};

    // Build custom fields array
    const customFields = [
      {
        display_name: "Customer Name",
        variable_name: "customer_name",
        value: `${paymentData.first_name} ${paymentData.last_name}`,
      },
      {
        display_name: "Email",
        variable_name: "customer_email",
        value: paymentData.email,
      },
      {
        display_name: "Phone",
        variable_name: "customer_phone",
        value: paymentData.phone,
      },
      {
        display_name: "Delivery Address",
        variable_name: "delivery_address",
        value: `${address.street_address || ""} ${
          address.apartment || ""
        }`.trim(),
      },
      {
        display_name: "City / Region / Country",
        variable_name: "location",
        value: `${address.city || ""}, ${address.region || ""}, ${
          address.country || ""
        }`,
      },
      {
        display_name: "Postal Code",
        variable_name: "postal_code",
        value: address.postal_code || "N/A",
      },
      {
        display_name: "Order Reference",
        variable_name: "order_ref",
        value: reference,
      },
      {
        display_name: "Total Amount",
        variable_name: "total_amount",
        value: OJ.money(paymentData.total),
      },
      {
        display_name: "━━━━━━━━━━━━━━━━━━━━━",
        variable_name: "separator",
        value: "🛒 ORDER ITEMS 🛒",
      },
    ];

    // Add each product as a separate custom field
    paymentData.cartItems.forEach((item, idx) => {
      customFields.push({
        display_name: `Item ${idx + 1}`,
        variable_name: `product_${idx + 1}`,
        value: `${item.name} | Size: ${item.size || "N/A"} | Qty: ${
          item.quantity
        } | Price: ${OJ.money(item.price)}`,
      });
    });

    // Add footer
    customFields.push({
      display_name: "━━━━━━━━━━━━━━━━━━━━━",
      variable_name: "footer",
      value: "✅ Order confirmed",
    });

    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: paymentData.email,
      amount: amountInPesewas,
      currency: "GHS",
      ref: reference,
      first_name: paymentData.first_name,
      last_name: paymentData.last_name,
      phone: paymentData.phone,
      metadata: {
        custom_fields: customFields,
      },
      callback: function (response) {
        console.log("Payment successful:", response);
        showPaymentMessage("Verifying payment...", "info");
        handleVerification(response, paymentData);
      },
      onClose: function () {
        console.log("Payment modal closed");
        showPaymentMessage("Payment cancelled. You can try again.", "error");
        enableCheckoutButton();
      },
    });

    handler.openIframe();
  }
  // Separate async function for verification
  async function handleVerification(response, paymentData) {
    try {
      const verificationData = {
        reference: response.reference,
        userId: paymentData.userId,
        paymentData: {
          total: paymentData.total,
          email: paymentData.email,
          phone: paymentData.phone,
          cartItems: paymentData.cartItems,
          delivery_address: paymentData.delivery_address,
        },
      };

      const verifyRes = await OJ.api("/verify-payment", {
        method: "POST",
        body: verificationData,
      });

      const result = await verifyRes.json();

      if (result.success) {
        showPaymentMessage(
          "✅ Order confirmed! Your items will be shipped soon.",
          "success"
        );

        setTimeout(() => {
          renderCart();
          renderCartCount();
        }, 2000);
      } else {
        showPaymentMessage("❌ " + result.message, "error");
      }
    } catch (err) {
      console.error("Verification error:", err);
      showPaymentMessage(
        "❌ Could not verify payment. Please contact support.",
        "error"
      );
    }

    enableCheckoutButton();
  }

  // Show payment message in cart
  function showPaymentMessage(message, type) {
    const summaryDiv = document.querySelector(".cart-summary");
    if (!summaryDiv) return;

    const existingMsg = document.querySelector(".payment-message");
    if (existingMsg) existingMsg.remove();

    const msgDiv = document.createElement("div");
    msgDiv.className = `payment-message ${type}`;
    msgDiv.style.cssText = `
      padding: 0.8rem;
      margin-bottom: 1rem;
      background: ${
        type === "success"
          ? "#e8f5e9"
          : type === "error"
          ? "#ffebee"
          : "#e3f2fd"
      };
      border-left: 4px solid ${
        type === "success"
          ? "#2e7d32"
          : type === "error"
          ? "#c62828"
          : "#1565c0"
      };
      font-size: 0.85rem;
      animation: slideDown 0.3s ease;
  `;
    msgDiv.innerHTML = message;

    summaryDiv.insertBefore(msgDiv, summaryDiv.firstChild);

    if (type !== "success") {
      setTimeout(() => msgDiv.remove(), 5000);
    }
  }

  // Enable checkout button
  function enableCheckoutButton() {
    const checkoutBtn = document.getElementById("paystack-checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "proceed to payment";
    }
  }

  // Show delivery address modal
  function showDeliveryModal() {
    return new Promise((resolve) => {
      const modal = document.getElementById("delivery-modal");
      if (!modal) {
        console.error("Delivery modal not found");
        resolve(null);
        return;
      }
      const form = document.getElementById("delivery-form");

      modal.style.display = "flex";

      const submitHandler = (e) => {
        e.preventDefault();

        const deliveryData = {
          fullname: document.getElementById("delivery-fullname").value.trim(),
          street_address: document
            .getElementById("street-address")
            .value.trim(),
          apartment: document.getElementById("apartment").value.trim(),
          city: document.getElementById("city").value.trim(),
          region: document.getElementById("region").value,
          postal_code: document.getElementById("postal-code").value.trim(),
          country: document.getElementById("country").value,
          instructions: document
            .getElementById("delivery-instructions")
            .value.trim(),
          phone: document.getElementById("phone").value.trim(),
        };

        if (!deliveryData.fullname) {
          OJ.toast("Please enter your full name.", "error");
          return;
        }
        if (!deliveryData.street_address) {
          OJ.toast("Please enter your street address.", "error");
          return;
        }
        if (!deliveryData.city) {
          OJ.toast("Please enter your city.", "error");
          return;
        }

        if (!deliveryData.country) {
          OJ.toast("Please select your country.", "error");
          return;
        }

        if (!deliveryData.phone) {
          OJ.toast("Please enter a phone number we can reach you on.", "error");
          return;
        }

        if (!deliveryData.postal_code) {
          OJ.toast("Please enter your postal code.", "error");
          return;
        }

        form.removeEventListener("submit", submitHandler);
        modal.style.display = "none";
        resolve(deliveryData);
      };

      form.addEventListener("submit", submitHandler);

      window.closeDeliveryModal = () => {
        form.removeEventListener("submit", submitHandler);
        modal.style.display = "none";
        resolve(null);
      };
    });
  }

  // Navigation links
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      const view = link.dataset.view; // footer: new / best / limited

      closeMobileNav();

      if (page === "products") {
        catalogue.view = view || "all";
        renderProducts();
        showPage("products", view ? { hash: `#${view}` } : undefined);
        return;
      }

      if (document.getElementById(page)) {
        showPage(page);
      }
    });
  });

  // keyboard support: these are <a>/<div> elements acting as controls
  navLinks.forEach((link) => {
    if (link.tagName !== "A" && link.tagName !== "BUTTON") {
      link.setAttribute("role", "button");
      link.setAttribute("tabindex", "0");
      link.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          link.click();
        }
      });
    }
  });

  document.getElementById("back-to-products")?.addEventListener("click", () => {
    renderProducts();
    showPage("products");
  });

  // ---------- mobile navigation ----------
  const navToggle = document.getElementById("nav-toggle");
  const navLinksWrap = document.querySelector(".nav-links");

  function closeMobileNav() {
    if (!navToggle || !navLinksWrap) return;
    navLinksWrap.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  if (navToggle && navLinksWrap) {
    navToggle.addEventListener("click", () => {
      const open = navLinksWrap.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobileNav();
    });
  }

  // ---------- catalogue controls ----------
  const searchInput = document.getElementById("product-search");
  if (searchInput) {
    let debounce;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        catalogue.query = searchInput.value.trim();
        renderProducts();
      }, 200);
    });
  }

  document.getElementById("filter-color")?.addEventListener("change", (e) => {
    catalogue.color = e.target.value;
    renderProducts();
  });

  document.getElementById("sort-products")?.addEventListener("change", (e) => {
    catalogue.sort = e.target.value;
    renderProducts();
  });

  // initial fetch & render
  fetchProducts().then(() => {
    renderCartCount();
    // if on home, featured already rendered inside fetchProducts then
  });

  // resolve the opening URL once the DOM is ready (products may still be
  // loading; fetchProducts calls applyRouteFromHash again when they land)
  applyRouteFromHash();
})();

// FAQ accordion functionality
document.addEventListener("DOMContentLoaded", function () {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      item.classList.toggle("active");
    });
  });
});

// Category switcher functionality
document.addEventListener("DOMContentLoaded", function () {
  const categoryBtns = document.querySelectorAll(".cat-btn");
  const apparelChart = document.getElementById("apparel-chart");
  const footwearChart = document.getElementById("footwear-chart");
  const accessoriesChart = document.getElementById("accessories-chart");

  function showCategory(category) {
    // Hide all charts
    if (apparelChart) apparelChart.style.display = "none";
    if (footwearChart) footwearChart.style.display = "none";
    if (accessoriesChart) accessoriesChart.style.display = "none";

    // Show selected chart
    if (category === "apparel" && apparelChart) {
      apparelChart.style.display = "block";
    } else if (category === "footwear" && footwearChart) {
      footwearChart.style.display = "block";
    } else if (category === "accessories" && accessoriesChart) {
      accessoriesChart.style.display = "block";
    }

    // Update active button
    categoryBtns.forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.category === category) {
        btn.classList.add("active");
      }
    });
  }

  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showCategory(btn.dataset.category);
    });
  });
});

// Sidebar navigation smooth scroll and active state
document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".policy-section");

  function updateActiveLink() {
    let current = "";
    const scrollPosition = window.scrollY + 150;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      const sectionId = section.getAttribute("id");

      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        current = sectionId;
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (href === `#${current}`) {
        link.classList.add("active");
      }
    });
  }

  // Smooth scroll for anchor links
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Update active link on scroll
  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();
});

// Sidebar navigation smooth scroll and active state
document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".policy-section");

  function updateActiveLink() {
    let current = "";
    const scrollPosition = window.scrollY + 150;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      const sectionId = section.getAttribute("id");

      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        current = sectionId;
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (href === `#${current}`) {
        link.classList.add("active");
      }
    });
  }

  // Smooth scroll for anchor links
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Update active link on scroll
  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();
});

// TREY Newsletter Form
(function () {
  const newsletterForm = document.getElementById("treyNewsletterForm");
  if (!newsletterForm) return;

  // Create notification container if it doesn't exist
  let notificationContainer = document.querySelector(
    ".newsletter-notification"
  );
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.className = "newsletter-notification";
    newsletterForm.appendChild(notificationContainer);
  }

  // Function to show message with animation
  function showMessage(message, type = "success") {
    // Remove existing message if any
    const existingMsg = notificationContainer.querySelector(".message-reveal");
    if (existingMsg) {
      existingMsg.classList.add("fade-out");
      setTimeout(() => existingMsg.remove(), 300);
    }

    // Create message element
    const messageEl = document.createElement("div");
    messageEl.className = `message-reveal ${type}`;

    const icon = type === "success" ? "✓" : "✕";
    messageEl.innerHTML = `
          <div class="message-content">
              <span class="message-icon">${icon}</span>
              <span class="message-text">${message}</span>
          </div>
      `;

    notificationContainer.appendChild(messageEl);

    // Trigger animation
    setTimeout(() => messageEl.classList.add("show"), 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
      messageEl.classList.add("fade-out");
      setTimeout(() => {
        if (messageEl.parentNode) messageEl.remove();
      }, 300);
    }, 5000);
  }

  // Function to show loading state on button
  function setLoading(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.classList.add("loading");
      const originalText = button.innerHTML;
      button.setAttribute("data-original-text", originalText);
      button.innerHTML = `
              <span class="spinner-mini"></span>
              <span>subscribing...</span>
          `;
    } else {
      button.disabled = false;
      button.classList.remove("loading");
      const originalText = button.getAttribute("data-original-text");
      if (originalText) button.innerHTML = originalText;
    }
  }

  // Function to validate email
  function validateEmail(email) {
    const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return re.test(email);
  }

  // Function to send subscription to API
  async function subscribeToNewsletter(email) {
    const apiUrl = "https://backendroutes-lcpt.onrender.com/ojsub";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message:
            data.message || "Thanks for subscribing! Check your inbox soon.",
        };
      } else {
        return {
          success: false,
          message: data.message || "Something went wrong. Please try again.",
        };
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      return {
        success: false,
        message: "Unable to connect. Please check your internet connection.",
      };
    }
  }

  // Form submission handler
  newsletterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("newsletter-email");
    const submitBtn = newsletterForm.querySelector(".newsletter-btn");
    const email = emailInput.value.trim();

    // Validate email
    if (!email) {
      showMessage("Please enter your email address.", "error");
      emailInput.focus();
      return;
    }

    if (!validateEmail(email)) {
      showMessage("Please enter a valid email address.", "error");
      emailInput.focus();
      return;
    }

    // Show loading state
    setLoading(submitBtn, true);

    // Send to API
    const result = await subscribeToNewsletter(email);

    // Remove loading state
    setLoading(submitBtn, false);

    // Show result message
    if (result.success) {
      showMessage(result.message, "success");
      emailInput.value = ""; // Clear input on success
    } else {
      showMessage(result.message, "error");
    }
  });

  //  Real-time email validation styling
  const emailInput = document.getElementById("newsletter-email");
  if (emailInput) {
    emailInput.addEventListener("input", function () {
      const isValid = validateEmail(this.value);
      if (this.value.length > 0) {
        if (isValid) {
          this.classList.add("valid");
          this.classList.remove("invalid");
        } else {
          this.classList.add("invalid");
          this.classList.remove("valid");
        }
      } else {
        this.classList.remove("valid", "invalid");
      }
    });
  }
})();

// CONTACT FORM WITH EMAILJS

(function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init("9njw5PNNC3JuIC3ot");
    console.log("EmailJS initialized for contact form");
  }
})();

// Get contact form elements
const contactForm = document.getElementById("treyContactForm");
const fullnameInput = document.getElementById("fullname");
const contactEmailInput = document.getElementById("contact-email");
const phoneInput = document.getElementById("phone");
const subjectSelect = document.getElementById("subject");
const messageTextarea = document.getElementById("message");

// Create notification container for contact form
let contactNotification = document.createElement("div");
contactNotification.className = "contact-notification";
contactForm.appendChild(contactNotification);

// Function to show message
function showContactMessage(message, type = "success") {
  // Remove existing message
  const existingMsg = contactNotification.querySelector(".message-reveal");
  if (existingMsg) existingMsg.remove();

  // Create message element
  const messageEl = document.createElement("div");
  messageEl.className = `message-reveal ${type}`;

  const icon = type === "success" ? "✓" : "✕";
  messageEl.innerHTML = `
      <div class="message-content">
          <span class="message-icon">${icon}</span>
          <span class="message-text">${message}</span>
      </div>
  `;

  contactNotification.appendChild(messageEl);

  // Trigger animation
  setTimeout(() => messageEl.classList.add("show"), 10);

  // Auto remove after 5 seconds
  setTimeout(() => {
    messageEl.classList.add("fade-out");
    setTimeout(() => {
      if (messageEl.parentNode) messageEl.remove();
    }, 300);
  }, 5000);
}

// Function to show loading state
function setContactLoading(isLoading, button) {
  if (isLoading) {
    button.disabled = true;
    button.classList.add("loading");
    const originalText = button.innerHTML;
    button.setAttribute("data-original-text", originalText);
    button.innerHTML = `<span class="spinner-mini"></span><span>sending...</span>`;
  } else {
    button.disabled = false;
    button.classList.remove("loading");
    const originalText = button.getAttribute("data-original-text");
    if (originalText) button.innerHTML = originalText;
  }
}

// Function to validate form
function validateContactForm() {
  if (!fullnameInput.value.trim()) {
    showContactMessage("Please enter your full name.", "error");
    fullnameInput.focus();
    return false;
  }

  if (!contactEmailInput.value.trim()) {
    showContactMessage("Please enter your email address.", "error");
    contactEmailInput.focus();
    return false;
  }

  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  if (!emailRegex.test(contactEmailInput.value.trim())) {
    showContactMessage("Please enter a valid email address.", "error");
    contactEmailInput.focus();
    return false;
  }

  if (!subjectSelect.value) {
    showContactMessage("Please select a subject.", "error");
    subjectSelect.focus();
    return false;
  }

  if (!messageTextarea.value.trim()) {
    showContactMessage("Please enter your message.", "error");
    messageTextarea.focus();
    return false;
  }

  return true;
}

// Function to send contact form via EmailJS (ONLY TO ADMIN)
async function sendContactMessage(formData) {
  const templateParams = {
    fullname: formData.fullname,
    email: formData.email,
    phone: formData.phone || "Not provided",
    subject: formData.subject,
    message: formData.message,
    submitted_date: new Date().toLocaleString(),
  };

  try {
    await emailjs.send("service_upc9ola", "template_no8s1ws", templateParams);
    console.log("✅ Contact form email sent to admin");
    return {
      success: true,
      message:
        "✅ Message sent successfully! We'll respond within 24-48 hours.",
    };
  } catch (error) {
    console.error("❌ Contact form email failed:", error);
    return {
      success: false,
      message: "❌ Unable to send message. Please try again later.",
    };
  }
}

// Form submission handler
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateContactForm()) return;

    const submitBtn = contactForm.querySelector(".contact-submit");

    // Collect form data
    const formData = {
      fullname: fullnameInput.value.trim(),
      email: contactEmailInput.value.trim(),
      phone: phoneInput ? phoneInput.value.trim() : "",
      subject: subjectSelect.value,
      message: messageTextarea.value.trim(),
    };

    // Show loading state
    setContactLoading(true, submitBtn);

    // Send message via EmailJS
    const result = await sendContactMessage(formData);

    // Remove loading state
    setContactLoading(false, submitBtn);

    // Show result message
    if (result.success) {
      showContactMessage(result.message, "success");
      contactForm.reset(); // Clear form on success
    } else {
      showContactMessage(result.message, "error");
    }
  });
}
