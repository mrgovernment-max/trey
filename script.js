(function () {
  // ---------- PRODUCT DATA (exactly as before, with 4 gallery emojis) ----------
  const products = [
    {
      id: "triSync",
      name: "Tri-Sync sneaker",
      category: "tri-sync",
      price: 420,
      mainEmoji: "👟",
      galleryEmojis: ["👟", "👞", "👠", "👡"],
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
      mainEmoji: "🧥",
      galleryEmojis: ["🧥", "👕", "👚", "🧶"],
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
      mainEmoji: "🦻",
      galleryEmojis: ["🦻", "🎧", "📻", "🔊"],
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
      mainEmoji: "◈",
      galleryEmojis: ["◈", "🔷", "💠", "🔶"],
      description: "Physical + digital + code.",
      warranty: "lifetime",
      type: "membership",
      sizes: [],
      release: "ongoing",
      dimensions: false,
    },
  ];

  // cart and badge
  let cart = JSON.parse(localStorage.getItem("treyCart")) || [];
  const cartSpan = document.getElementById("cartCount");
  function updateCartBadge() {
    cartSpan.textContent = cart.reduce((acc, i) => acc + i.quantity, 0);
    localStorage.setItem("treyCart", JSON.stringify(cart));
  }
  updateCartBadge();

  // ----- PAGE SWITCHING (individual pages) -----
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
    // update active class in top nav
    document.querySelectorAll(".primary-nav a").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageId);
    });
  }

  // nav click handlers
  document.querySelectorAll(".primary-nav a, .cart-badge").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (el.classList.contains("cart-badge")) showPage("cart");
      else if (el.dataset.page) showPage(el.dataset.page);
    });
  });

  // ---------- PRODUCT GRID (products page) ----------
  const gridContainer = document.getElementById("productGridContainer");
  function buildProductGrid() {
    let html = "";
    products.forEach((p) => {
      html += `<div class="product-card" data-product-id="${p.id}">
    <div class="card-emoji">${p.mainEmoji}</div>
    <div class="card-title">${p.name}</div>
    <div class="card-price">$${p.price}</div>
  </div>`;
    });
    gridContainer.innerHTML = html;
    document.querySelectorAll(".product-card").forEach((card) => {
      card.addEventListener("click", () => {
        const pid = card.dataset.productId;
        showProductDetail(products.find((p) => p.id === pid));
      });
    });
  }

  // ---------- DETAIL PAGE with 4-image gallery (individual page) ----------
  function showProductDetail(product) {
    // size options
    let sizeOptions = "";
    if (product.sizes.length) {
      product.sizes.forEach((sz, idx) => {
        sizeOptions += `<div class="size-option ${
          idx === 0 ? "active" : ""
        }" data-size="${sz}">${sz}</div>`;
      });
    } else {
      sizeOptions = `<div class="size-option active" data-size="one">one size</div>`;
    }

    // dimension picker if needed
    let dimHtml = "";
    if (product.dimensions) {
      let btns = "";
      product.dimOptions.forEach((opt, i) => {
        btns += `<div class="dim-option ${
          i === 0 ? "active" : ""
        }">${opt}</div>`;
      });
      dimHtml = `<div class="dimension-selector">${btns}</div>`;
    }

    // prepare 4 thumbnails (always exactly 4)
    const gallery = product.galleryEmojis ? [...product.galleryEmojis] : [];
    while (gallery.length < 4) gallery.push(product.mainEmoji);
    const thumbnailsHtml = gallery
      .map((emoji, index) => {
        return `<div class="thumbnail ${
          index === 0 ? "active" : ""
        }" data-emoji="${emoji}">${emoji}</div>`;
      })
      .join("");

    const detailHtml = `
  <div class="detail-grid">
    <div class="detail-visual-col">
      <div class="main-image-container">
        <div class="main-emoji" id="mainProductEmoji">${product.mainEmoji}</div>
      </div>
      <div class="thumbnail-strip" id="thumbnailStrip">${thumbnailsHtml}</div>
    </div>
    <div class="detail-info">
      <div class="detail-category">${product.category}</div>
      <div class="detail-name">${product.name}</div>
      <div class="detail-price">$${product.price}</div>
      <div class="desc-block">${product.description}</div>
      <div class="specs-grid">
        <div><span class="spec-label">type</span> ${product.type}</div>
        <div><span class="spec-label">release</span> ${product.release}</div>
      </div>
      <div class="warranty-badge">🛡️ ${product.warranty}</div>
      <div style="font-weight:500;">size</div>
      <div class="size-selector">${sizeOptions}</div>
      ${dimHtml}
      <button class="add-to-cart-detail" id="detailAddBtn">add to cart <span>+</span></button>
    </div>
  </div>
`;

    document.getElementById("detailContainer").innerHTML = detailHtml;
    showPage("detail");

    // ---------- THUMBNAIL SWITCH (4‑image gallery) ----------
    const mainEmojiDiv = document.getElementById("mainProductEmoji");
    const thumbnails = document.querySelectorAll(".thumbnail");
    thumbnails.forEach((thumb) => {
      thumb.addEventListener("click", function () {
        thumbnails.forEach((t) => t.classList.remove("active"));
        this.classList.add("active");
        if (mainEmojiDiv) mainEmojiDiv.textContent = this.dataset.emoji;
      });
    });

    // size & dimension toggles
    document.querySelectorAll(".size-option").forEach((opt) => {
      opt.addEventListener("click", function () {
        document
          .querySelectorAll(".size-option")
          .forEach((o) => o.classList.remove("active"));
        this.classList.add("active");
      });
    });
    if (product.dimensions) {
      document.querySelectorAll(".dim-option").forEach((d) => {
        d.addEventListener("click", function () {
          document
            .querySelectorAll(".dim-option")
            .forEach((dd) => dd.classList.remove("active"));
          this.classList.add("active");
        });
      });
    }

    // add to cart
    document
      .getElementById("detailAddBtn")
      ?.addEventListener("click", function () {
        const selectedSize =
          document.querySelector(".size-option.active")?.dataset.size || "one";
        const selectedDim = product.dimensions
          ? document.querySelector(".dim-option.active")?.textContent || "hard"
          : null;
        const itemId = product.id + (selectedDim || "") + selectedSize;
        const existing = cart.find((i) => i.id === itemId);
        if (existing) {
          existing.quantity += 1;
        } else {
          cart.push({
            id: itemId,
            productId: product.id,
            name: product.name,
            price: product.price,
            emoji: product.mainEmoji,
            size: selectedSize,
            dimension: selectedDim,
            quantity: 1,
          });
        }
        updateCartBadge();
        this.innerHTML = `added (${selectedSize}) ✓`;
        this.style.background = "#2b4b3b";
        setTimeout(() => {
          this.innerHTML = "add to cart <span>+</span>";
          this.style.background = "#1e1e1e";
        }, 1000);
      });
  }

  // ---------- CART PAGE ----------
  function renderCart() {
    const container = document.getElementById("cartContainer");
    if (!cart.length) {
      container.innerHTML = '<div style="padding:1rem;">🛒 cart empty</div>';
      return;
    }
    let itemsHtml = "";
    let total = 0;
    cart.forEach((item) => {
      const subtotal = item.price * item.quantity;
      total += subtotal;
      itemsHtml += `<div style="display:flex; justify-content:space-between; align-items:center;">
    <span>${item.emoji} ${item.name} (${item.size}) x${item.quantity}</span>
    <span>$${subtotal}</span>
  </div>`;
    });
    itemsHtml += `<div style="font-weight:600; margin-top:1rem;">total: $${total}</div>`;
    itemsHtml += `<button style="margin-top:2rem; padding:0.8rem 2rem; background:#1e1e1e; color:white; border:none; border-radius:40px; font-weight:600; cursor:pointer;" onclick="showPage('checkout')">proceed to checkout</button>`;
    container.innerHTML = itemsHtml;
  }

  // back links
  document.getElementById("backToProducts").addEventListener("click", (e) => {
    e.preventDefault();
    showPage("products");
  });
  document.getElementById("backToCart").addEventListener("click", (e) => {
    e.preventDefault();
    showPage("cart");
  });

  // init
  buildProductGrid();
  showPage("home");

  // expose for inline onclick (checkout)
  window.showPage = showPage;
})();
