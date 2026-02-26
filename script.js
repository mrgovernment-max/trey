(function () {
  // ----- PRODUCT DATA (same) -----
  const products = [
    {
      id: "triSync",
      name: "Tri‑Sync sneaker",
      category: "tri‑sync",
      price: 420,
      emoji: "👟",
      description: "Three soles: hard, air, magnetic.",
      warranty: "3 year",
      type: "footwear",
      sizes: ["40", "41", "42", "43", "44"],
      release: "spring 2025",
      dimensions: true,
      dimOptions: ["hard", "air", "magnetic"],
    },
    {
      id: "hologramTee",
      name: "Hologram field tee",
      category: "apparel",
      price: 280,
      emoji: "🧥",
      description: "Black indoors — galaxy under sun.",
      warranty: "2 year",
      type: "apparel",
      sizes: ["S", "M", "L", "XL"],
      release: "fall 2024",
      dimensions: false,
    },
    {
      id: "thirdEar",
      name: "Third ear",
      category: "audio",
      price: 540,
      emoji: "🦻",
      description: "Personal sound bubble.",
      warranty: "18 month",
      type: "audio",
      sizes: ["one size"],
      release: "summer 2025",
      dimensions: false,
    },
    {
      id: "treyLife",
      name: "Trey of life",
      category: "subscription",
      price: 890,
      emoji: "◈",
      description: "Physical + digital + code.",
      warranty: "lifetime",
      type: "membership",
      sizes: [],
      release: "ongoing",
      dimensions: false,
    },
  ];

  let cart = JSON.parse(localStorage.getItem("treyCart")) || [];
  let cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartSpan = document.getElementById("cartCount");
  function updateCartBadge() {
    cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
    cartSpan.textContent = cartCount;
    localStorage.setItem("treyCart", JSON.stringify(cart));
  }
  updateCartBadge();

  // navigation

  const sections = {
    home: document.getElementById("homePage"),
    products: document.getElementById("productsPage"),
    detail: document.getElementById("detailPage"),
    gallery: document.getElementById("galleryPage"),
    contact: document.getElementById("contactPage"),
    cart: document.getElementById("cartPage"),
    checkout: document.getElementById("checkoutPage"),
  };
  function showPage(pageId) {
    Object.values(sections).forEach((s) =>
      s?.classList.remove("active-section")
    );
    if (sections[pageId]) sections[pageId].classList.add("active-section");
    if (pageId === "cart") renderCart();
    if (pageId === "checkout") renderCheckout();
  }

  document.querySelectorAll(".primary-nav a, .cart-badge").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (el.dataset.page) showPage(el.dataset.page);
    });
  });

  // build product grid
  const gridContainer = document.getElementById("productGridContainer");
  function buildProductGrid() {
    let html = "";
    products.forEach((p) => {
      html += `<div class="product-card" data-product-id="${p.id}"><div class="card-emoji">${p.emoji}</div><div class="card-title">${p.name}</div><div class="card-price">$${p.price}</div></div>`;
    });
    gridContainer.innerHTML = html;
    document.querySelectorAll(".product-card").forEach((card) => {
      card.addEventListener("click", () => {
        const pid = card.dataset.productId;
        showProductDetail(products.find((p) => p.id === pid));
      });
    });
  }

  // product detail (responsive)
  function showProductDetail(product) {
    let sizeOptions = product.sizes.length
      ? product.sizes
          .map(
            (sz, idx) =>
              `<div class="size-option ${
                idx === 0 ? "active" : ""
              }" data-size="${sz}">${sz}</div>`
          )
          .join("")
      : `<div class="size-option active" data-size="one">one size</div>`;
    let dimHtml = product.dimensions
      ? `<div class="dimension-selector">${product.dimOptions
          .map(
            (opt, i) =>
              `<div class="dim-option ${i === 0 ? "active" : ""}">${opt}</div>`
          )
          .join("")}</div>`
      : "";
    const detailHtml = `
                <div class="detail-grid">
                    <div class="detail-visual">${product.emoji}</div>
                    <div class="detail-info">
                        <div class="detail-category">${product.category}</div>
                        <div class="detail-name">${product.name}</div>
                        <div class="detail-price">$${product.price}</div>
                        <div class="desc-block">${product.description}</div>
                        <div class="specs-grid"><div><span class="spec-label">type</span> ${product.type}</div><div><span class="spec-label">release</span> ${product.release}</div></div>
                        <div class="warranty-badge">🛡️ ${product.warranty}</div>
                        <div style="font-weight:500;">size</div><div class="size-selector">${sizeOptions}</div>${dimHtml}
                        <button class="add-to-cart-detail" id="detailAddBtn">add to cart <span>+</span></button>
                    </div>
                </div>`;
    document.getElementById("detailContainer").innerHTML = detailHtml;
    showPage("detail");

    document.querySelectorAll(".size-option").forEach((o) =>
      o.addEventListener("click", function () {
        document
          .querySelectorAll(".size-option")
          .forEach((oo) => oo.classList.remove("active"));
        this.classList.add("active");
      })
    );
    if (product.dimensions)
      document.querySelectorAll(".dim-option").forEach((d) =>
        d.addEventListener("click", function () {
          document
            .querySelectorAll(".dim-option")
            .forEach((dd) => dd.classList.remove("active"));
          this.classList.add("active");
        })
      );

    document
      .getElementById("detailAddBtn")
      .addEventListener("click", function () {
        const selectedSize =
          document.querySelector(".size-option.active")?.dataset.size || "one";
        const selectedDim = product.dimensions
          ? document.querySelector(".dim-option.active")?.textContent || "hard"
          : null;
        const itemId = product.id + (selectedDim || "") + selectedSize;
        const existing = cart.find((i) => i.id === itemId);
        if (existing) existing.quantity += 1;
        else
          cart.push({
            id: itemId,
            productId: product.id,
            name: product.name,
            price: product.price,
            emoji: product.emoji,
            size: selectedSize,
            dimension: selectedDim,
            quantity: 1,
          });
        updateCartBadge();
        this.innerHTML = `added (${selectedSize}) ✓`;
        this.style.background = "#2b4b3b";
        setTimeout(() => {
          this.innerHTML = "add to cart <span>+</span>";
          this.style.background = "#1e1e1e";
        }, 1000);
      });
  }

  // render cart (responsive)
  function renderCart() {
    const container = document.getElementById("cartContainer");
    if (!cart.length) {
      container.innerHTML =
        '<div class="empty-cart">your cart is empty</div><button class="checkout-btn" onclick="showPage(\'products\')">shop now</button>';
      return;
    }
    let itemsHtml = "";
    cart.forEach((item, idx) => {
      itemsHtml += `<div class="cart-item" data-index="${idx}"><span class="cart-item-emoji">${
        item.emoji
      }</span><div class="cart-item-details"><strong>${
        item.name
      }</strong><p>size: ${item.size} ${
        item.dimension ? "· " + item.dimension : ""
      }</p></div><div>$${
        item.price
      }</div><div class="cart-qty"><button class="qty-down" data-index="${idx}">−</button><span>${
        item.quantity
      }</span><button class="qty-up" data-index="${idx}">+</button></div><div>$${
        item.price * item.quantity
      }</div><button class="cart-remove" data-index="${idx}">✕</button></div>`;
    });
    const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
    container.innerHTML =
      itemsHtml +
      `<div class="cart-summary">total: GHS ${Math.round(
        total * 15
      )} · ($${total})</div><button class="checkout-btn" id="proceedToCheckout">proceed to checkout</button>`;
    document.querySelectorAll(".qty-up").forEach((b) =>
      b.addEventListener("click", (e) => {
        cart[e.target.dataset.index].quantity++;
        updateCartBadge();
        renderCart();
      })
    );
    document.querySelectorAll(".qty-down").forEach((b) =>
      b.addEventListener("click", (e) => {
        let idx = e.target.dataset.index;
        if (cart[idx].quantity > 1) cart[idx].quantity--;
        else cart.splice(idx, 1);
        updateCartBadge();
        renderCart();
      })
    );
    document.querySelectorAll(".cart-remove").forEach((b) =>
      b.addEventListener("click", (e) => {
        cart.splice(e.target.dataset.index, 1);
        updateCartBadge();
        renderCart();
      })
    );
    document
      .getElementById("proceedToCheckout")
      ?.addEventListener("click", () => showPage("checkout"));
  }

  // checkout with mobile money (Ghana)
  function renderCheckout() {
    const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
    const container = document.getElementById("checkoutContainer");
    container.innerHTML = `
                <h3 style="margin-bottom:1.5rem;">checkout · pay with mobile money</h3>
                <div class="payment-option selected" id="mtnOption">
                    <input type="radio" name="payment" value="mtn" checked> <span style="font-weight:600;">MTN Mobile Money</span>
                </div>
                <div class="payment-option" id="vodOption">
                    <input type="radio" name="payment" value="vodafone"> <span style="font-weight:600;">Vodafone Cash</span>
                </div>
                <div class="payment-option" id="tigoOption">
                    <input type="radio" name="payment" value="tigo"> <span style="font-weight:600;">AirtelTigo Money</span>
                </div>
                <div class="momo-details" id="momoDetails">
                    <input type="text" placeholder="mobile money number (e.g. 0244xxxxxx)">
                    <input type="text" placeholder="name on account">
                    <p style="font-size:0.9rem; color:#666;">You'll receive an OTP prompt on your phone to confirm payment.</p>
                </div>
                <div style="margin:1.5rem 0;"><strong>total: GHS ${Math.round(
                  total * 15
                )}</strong> (approx $${total})</div>
                <button class="place-order" id="placeOrderBtn">place order · pay with MoMo</button>
            `;
    document.querySelectorAll(".payment-option").forEach((opt) => {
      opt.addEventListener("click", function () {
        document
          .querySelectorAll(".payment-option")
          .forEach((o) => o.classList.remove("selected"));
        this.classList.add("selected");
        this.querySelector('input[type="radio"]').checked = true;
      });
    });
    document.getElementById("placeOrderBtn").addEventListener("click", () => {
      alert(
        "Payment initiated (demo) · check your phone for OTP. Order placed!"
      );
      cart = [];
      updateCartBadge();
      showPage("home");
    });
  }

  document.getElementById("backToProducts").addEventListener("click", (e) => {
    e.preventDefault();
    showPage("products");
  });
  document.getElementById("backToCart").addEventListener("click", (e) => {
    e.preventDefault();
    showPage("cart");
  });

  buildProductGrid();
  showPage("home");
  window.showPage = showPage;
})();
