(function () {
  // ---------- state ----------
  let products = []; // will be filled from API
  let cart = [];
  let msize = null;

  // DOM elements
  const pages = document.querySelectorAll(".page");
  const navLinks = document.querySelectorAll("[data-page]");
  const productGrid = document.getElementById("products-grid");
  const homeFeatured = document.getElementById("home-featured");
  const detailContainer = document.getElementById("detail-container");
  const cartContainer = document.getElementById("cart-container");
  const cartCountSpan = document.getElementById("cart-count");

  // helper: show page
  function showPage(pageId) {
    pages.forEach((p) => p.classList.remove("active-page"));
    const target = document.getElementById(pageId);
    if (target) target.classList.add("active-page");
    else document.getElementById("home").classList.add("active-page");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (pageId === "cart") renderCart();
  }

  // fetch products from API
  async function fetchProducts() {
    try {
      const response = await fetch(
        "https://backendroutes-lcpt.onrender.com/products"
      );
      if (!response.ok) throw new Error("Network error");
      products = await response.json();

      // ensure all products have proper image arrays
      products = products.map((p) => ({
        ...p,
        // create array of up to 4 images: img_url, img_url_1, img_url_2, img_url_3, with fallback
        images: [
          p.img_url,
          p.img_url_1 || p.img_url,
          p.img_url_2 || p.img_url,
          p.img_url_3 || p.img_url,
        ].filter(Boolean),
      }));

      // after loading, render home and products
      renderHomeFeatured();
      renderProducts();
    } catch (error) {
      console.error("Failed to load products:", error);
      productGrid.innerHTML =
        '<div class="loading">could not load products. please refresh.</div>';
      homeFeatured.innerHTML = `<div class="loading"><button 
      style="
        padding: 12px 25px; 
        background-color: #111; 
        color: #fff; 
        border: none; 
        border-radius: 30px; 
        cursor: pointer; 
        font-weight: 600;
        transition: 0.3s;
      " 
      onclick="location.reload()"
      onmouseover="this.style.background='#c9a46c'"
      onmouseout="this.style.background='#111'"
    >
      Products failed Reload Page
    </button></div>`;
    }
  }

  // render first 3 as featured (or any logic)
  function renderHomeFeatured() {
    if (!homeFeatured || products.length === 0) return;
    const featured = products.slice(0, 3);
    homeFeatured.innerHTML = featured
      .map(
        (p) => `
              <div class="featured-item" data-product-id="${p.id}">
                  <img src="${p.img_url}" alt="${p.name}" loading="lazy">
                  <h3>${p.name}</h3>
                  <span>${
                    p.color
                      ? p.color.split(",").slice(0, 2).join(" · ")
                      : "signature"
                  }</span>
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
  function renderProducts() {
    if (!productGrid) return;

    // --- LOADING ANIMATION STARTS ---
    if (products.length === 0) {
      productGrid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>loading merchandise...</p>
            </div>
        `;
      return;
    }
    // --- LOADING ANIMATION ENDS (will show products when available) ---

    productGrid.innerHTML = products
      .map(
        (p) => `
                <div class="product-card" data-product-id="${p.id}">
                    <img src="${p.img_url}" alt="${p.name}" loading="lazy">
                    <h3>${p.name}</h3>
                    <div class="product-price">$${parseFloat(p.price).toFixed(
                      2
                    )}</div>
                    <div class="brand-mini">
                        <img src="${
                          p.brand_img_url || "https://placecats.com/30/30"
                        }" alt="brand"> 
                        <span style="font-size:0.85rem; color:#555;">${
                          p.rating ? "★ " + p.rating : ""
                        }</span>
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
    const releaseDate = product.release || "autumn 2025"; // placeholder
    const availability = product.availability || "in stock";
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
    const userId = sessionStorage.getItem("userId");
    const isLoggedIn = !!userId;

    detailContainer.innerHTML = `
        <div class="detail-gallery">
            <img src="${images[0]}" class="main-img" id="detail-main-img">
            <div class="thumbnails" id="detail-thumbs">
                ${images
                  .map(
                    (img, i) =>
                      `<img src="${img}" class="thumb ${
                        i === 0 ? "active-thumb" : ""
                      }" data-img="${img}">`
                  )
                  .join("")}
            </div>
        </div>
        <div class="detail-info">
            <h2>${product.name}</h2>
            <div class="detail-id">$${parseFloat(product.price).toFixed(2)} USD 
                <span class="rating-stars">${"★".repeat(
                  Math.floor(product.rating || 0)
                )}${product.rating % 1 >= 0.5 ? "½" : ""}</span>
            </div>
            <div class="detail-description">${
              product.description || "timeless design"
            }</div>
            <ul class="detail-meta">
                <li><span class="meta-label">material</span><span class="meta-value">${material}</span></li>
                <li><span class="meta-label">color</span><span class="meta-value">${color}</span></li>
                <li><span class="meta-label">weight</span><span class="meta-value">${weight}</span></li>
                <li><span class="meta-label">warranty</span><span class="meta-value">${warranty}</span></li>
                <li><span class="meta-label">release</span><span class="meta-value">${releaseDate}</span></li>
                <li><span class="meta-label">availability</span><span class="meta-value">${availability}</span></li>
            </ul>

            <!-- === TREY size selector - minimal, professional === -->
            <div class="trey-size-selector">
                <span class="size-label">select size</span>
                <div class="size-options">
                    <button type="button" class="size-btn" data-size="XS">XS</button>
                    <button type="button" class="size-btn" data-size="S">S</button>
                    <button type="button" class="size-btn" data-size="M">M</button>
                    <button type="button" class="size-btn" data-size="L">L</button>
                    <button type="button" class="size-btn" data-size="XL">XL</button>
                </div>
            </div>
            
            <!-- Login reminder if not logged in (UI only) -->
            ${
              !isLoggedIn
                ? `
                <div class="login-reminder-badge">
                    <i class="fa-regular fa-lock"></i>
                    <span>please <a href="/login.html">sign in</a> to add items to cart</span>
                </div>
            `
                : ""
            }
            
            <button class="add-to-cart-btn ${!isLoggedIn ? "disabled" : ""}" 
                    data-product-id="${product.id}"
                    ${!isLoggedIn ? "disabled" : ""}>
                ${!isLoggedIn ? "login to add to cart" : "add to cart"}
            </button>
            
            <div style="margin-top:1.5rem; border-top:1px solid #ddd; padding-top:1rem; display:flex; gap:10px;">
                <img src="${
                  product.brand_img_url || "https://placecats.com/50/50"
                }" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                <p style="font-size:0.9rem; color:#3b3b38;"><strong>brand note</strong> · ${brandDesc}</p>
            </div>
        </div>
    `;

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

      // ONLY attach event if logged in - button is disabled otherwise
      if (isLoggedIn) {
        document
          .querySelector(".add-to-cart-btn")
          .addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const pid = parseInt(btn.dataset.productId);

            // Call  existing addToCart function
            await addToCart(pid);
          });
      }
    }, 50);

    //active size
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

    showPage("product-detail");
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
  async function addToCart(productId) {
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      alert("Please login first");
      return;
    }

    if (!msize) {
      alert("Please select a size");
      return;
    }

    try {
      const res = await fetch(
        "https://backendroutes-lcpt.onrender.com/cartoj",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            productId: productId,
            size: msize,
            quantity: 1,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        showToast("✓ item added to your cart", "success");
      } else {
        console.error(data);
        return;
      }
    } catch (err) {
      console.error("Cart error:", err);
      return;
    }

    renderCartCount();
  }

  //remove from cart
  async function removeFromCart(cartId, userId) {
    try {
      const res = await fetch(
        `https://backendroutes-lcpt.onrender.com/ojcartrmv`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cartId: cartId,
            userId: userId,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        console.log(data.message);
        renderCart(); // reload cart items
        renderCartCount(); // update badge
      }
    } catch (err) {
      console.error("Remove cart error:", err);
    }
  }

  async function renderCartCount() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      cartCountSpan.innerText = 0;
      return;
    }

    try {
      const res = await fetch(
        "https://backendroutes-lcpt.onrender.com/ojcartget",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }
      );

      const cart = await res.json();

      const total = cart.reduce((acc, i) => acc + i.quantity, 0);

      cartCountSpan.innerText = total;
    } catch (err) {
      console.error("Cart count error:", err);
    }
  }
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

    const userId = sessionStorage.getItem("userId");
    let userName = sessionStorage.getItem("userName");

    const cartname = document.getElementById("cartname");
    cartname.textContent = `${userName}'s Cart`;

    if (!userName) {
      userName = "Guest";
      cartname.textContent = `${userName}'s Cart`;
    }

    const res = await fetch(
      "https://backendroutes-lcpt.onrender.com/ojcartget",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      }
    );

    const cart = await res.json();

    if (!userId) {
      cartContainer.innerHTML =
        '<p style="padding: 3rem; background: #f6f6f2;">Login to see Cart</p>';
      return;
    }

    if (userName && cart.length === 0) {
      cartContainer.innerHTML =
        '<p style="padding: 3rem; background: #f6f6f2;">your cart is empty.</p>';
      return;
    }

    let html = `<div class="cart-items">`;

    cart.forEach((item) => {
      html += `
            <div class="cart-item" data-id="${item.cartId}">
                <img src="${item.img_url}" alt="${item.name}">
                <h4>${item.name}</h4>
                <span class="cart-item-price">$${parseFloat(item.price).toFixed(
                  2
                )}</span>
                
                <span class="cart-qty" data-id="${item.cartId}"> 
                    ${item.quantity}
                </span>

                <i class="fa-regular fa-trash-can remove-item" data-id="${
                  item.cartId
                }"></i>
            </div>
        `;
    });

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    html += `</div>`;

    html += `
        <div class="cart-summary">
            <h3>summary</h3>
            <p style="margin: 1.5rem 0; font-size: 2rem;">$${total.toFixed(
              2
            )}</p>
            <button class="checkout-btn" id="fake-checkout">proceed to checkout</button>
            <p style="margin-top:1rem; font-size:0.8rem;">(demo — no payment)</p>
        </div>
    `;

    cartContainer.innerHTML = html;

    // remove item
    document.querySelectorAll(".remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const cartId = parseInt(e.target.dataset.id);
        removeFromCart(cartId, userId);
      });
    });

    document.getElementById("fake-checkout")?.addEventListener("click", () => {
      alert("checkout demo — items would be purchased. thank you.");
    });
  }

  // navigation
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page === "home") showPage("home");
      else if (page === "products") {
        renderProducts();
        showPage("products");
      } else if (page === "gallery") showPage("gallery");
      else if (page === "cart") {
        renderCart();
        showPage("cart");
      }
    });
  });

  document.getElementById("back-to-products")?.addEventListener("click", () => {
    renderProducts();
    showPage("products");
  });

  // initial fetch & render
  fetchProducts().then(() => {
    renderCartCount();
    // if on home, featured already rendered inside fetchProducts then
  });

  // cart icon
  document.querySelector(".cart-icon").addEventListener("click", (e) => {
    renderCart();
    showPage("cart");
  });
})();
