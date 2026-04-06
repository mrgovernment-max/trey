(function () {
  // ---------- state ----------
  let products = []; // will be filled from API
  let msize = null;

  //AOS animation
  AOS.init({
    duration: 1000, // animation duration (ms)
    easing: "ease-in-out", // smooth animation
    once: true, // animation happens only once
    offset: 120, // trigger point (px from bottom)
    delay: 100, // delay before animation starts
    mirror: false, // no repeat when scrolling up
  });
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
        "https://backendroutes-lcpt.onrender.com/ojmerch"
      );
      if (!response.ok) throw new Error("Network error");
      products = await response.json();

      // ensure all products have proper image arrays
      products = products.map((p) => ({
        ...p,
        // create array of up to 4 images: img_url, img_url_1, img_url_2, img_url_3, with fallback
        images: [p.img_url, p.img_url_1 || p.img_url].filter(Boolean),
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
        <div class="product-card ${
          parseFloat(p.price) > 0 ? "" : "vip"
        }" data-product-id="${p.id}">
            <img src="${p.img_url}" alt="${p.name}" loading="lazy">
            <h3>${p.name}</h3>
            <div class="product-price">${
              parseFloat(p.price) > 0
                ? `$${parseFloat(p.price).toFixed(2)}`
                : "Not Available to Public"
            }</div>
            <div class="brand-mini">
                <img src="${
                  p.brand_img_url || "https://placecats.com/30/30"
                }" alt="brand"> 
                <span style="font-size:0.85rem; color:#555;${
                  parseFloat(p.price) > 0 ? "" : "display: none;"
                }">${p.rating ? "★ " + p.rating : ""}</span>
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
    const releaseDate = product.release || "Upcomming"; // placeholder
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
        <div class="detail-info" >
            <h2>${product.name}</h2>
            <div id="detail-id" class="detail-id" style="${
              product.release === "Launching Soon" ? "display:none" : ""
            }">$${parseFloat(product.price).toFixed(2)} USD 
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
                <li><span class="meta-label">availability</span><span style="${
                  product.release === "Launching Soon" ? "color:orange" : ""
                }" class="meta-value">${availability}</span></li>
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
            
            <!-- Login reminder if not logged in (UI only) -->
            ${
              !isLoggedIn
                ? `
                <div class="login-reminder-badge"  style="${
                  product.release === "Launching Soon" ? "display:none" : ""
                }">
                <i class="fa-solid fa-lock"></i>
                    <span>please <a href="login.html">sign in</a> to add items to cart</span>
                </div>
            `
                : ""
            }
            
            <button class="add-to-cart-btn ${
              !isLoggedIn ? "disabled" : ""
            }"  style="${
      product.release === "Launching Soon" ? "display:none" : ""
    }"
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
      console.log(cart);

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
    if (cartname) {
      cartname.textContent = `${userName}'s Cart`;
    }

    if (!userName) {
      userName = "Guest";
      if (cartname) cartname.textContent = `${userName}'s Cart`;
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
        '<p style="padding: 3rem; background: #f6f6f2;"><a style ="color:black;" href="login.html"> Login </a> to see Cart</p>';
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
        <div class="cart-item" data-cart-id="${item.cartId}">
            <div class="cart-img">
                <img src="${item.img_url}" alt="${item.name}">
            </div>
            <div class="cart-name">
                <h4>${item.name}</h4>
            </div>
            <div class="cart-price">
                <span>$${parseFloat(item.price).toFixed(2)}</span>
            </div>
            <div class="cart-quantity">
                <span class="size-badge">${item.quantity}</span>
            </div>
            <div class="cart-size">
                <span class="size-badge">${item.size || "M"}</span>
            </div>
            <div class="cart-remove">
                <i class="fa-regular fa-trash-can remove-item" data-cart-id="${
                  item.cartId
                }"></i>
            </div>
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
            <button class="checkout-btn" id="paystack-checkout-btn">proceed to payment</button>
            <p style="margin-top:1rem; font-size:0.8rem;">secure payment via Paystack</p>
        </div>
    `;

    cartContainer.innerHTML = html;

    // remove item
    document.querySelectorAll(".remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const cartId = parseInt(e.target.dataset.cartId);
        removeFromCart(cartId, userId);
      });
    });

    const checkoutBtn = document.getElementById("paystack-checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", async () => {
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
          let userEmail = sessionStorage.getItem("userEmail");
          if (!userEmail) {
            userEmail = prompt(
              "Please enter your email address for order confirmation:",
              ""
            );
            if (userEmail && userEmail.includes("@")) {
              sessionStorage.setItem("userEmail", userEmail);
            } else {
              enableCheckoutButton();
              return;
            }
          }

          // Prepare payment data
          const paymentData = {
            total: total,
            email: userEmail,
            phone: deliveryData.phone || "Not provided",
            first_name: deliveryData.fullname.split(" ")[0] || "Valued",
            last_name:
              deliveryData.fullname.split(" ").slice(1).join(" ") || "Customer",
            userId: userId,
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

    // Define callback function separately
    const paymentCallback = function (response) {
      console.log("Payment successful:", response);
      showPaymentMessage(
        "✅ Payment successful! Your order is confirmed.",
        "success"
      );

      // Clear cart after successful payment
      clearCartAfterPayment(paymentData.userId, paymentData.cartItems);
    };

    // Define onClose function separately
    const paymentOnClose = function () {
      console.log("Payment modal closed");
      showPaymentMessage("Payment cancelled. You can try again.", "error");
      enableCheckoutButton();
    };

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
        cart_items: paymentData.cartItems,
        total_amount: paymentData.total,
        user_id: paymentData.userId,
        delivery_address: paymentData.delivery_address,
        timestamp: new Date().toISOString(),
      },
      callback: paymentCallback,
      onClose: paymentOnClose,
    });

    handler.openIframe();
  }

  // Helper function to clear cart after payment
  async function clearCartAfterPayment(userId, cartItems) {
    try {
      for (const item of cartItems) {
        await removeFromCart(item.cartId, userId);
      }
      showPaymentMessage(
        "🎉 Order confirmed! Your items will be shipped soon.",
        "success"
      );

      // Refresh cart display
      setTimeout(() => {
        renderCart();
        renderCartCount();
      }, 2000);
    } catch (err) {
      console.error("Error clearing cart:", err);
    }
  }

  // Process successful payment
  async function processSuccessfulPayment(reference, paymentData) {
    try {
      // Here you would typically verify the transaction with your backend
      // For now, we'll clear the cart and show success

      // Clear cart from backend
      for (const item of paymentData.cartItems) {
        await removeFromCart(item.cartId, paymentData.userId);
      }

      showPaymentMessage(
        "🎉 Order confirmed! Thank you for your purchase. You will receive a confirmation email shortly.",
        "success"
      );

      // Refresh cart display
      setTimeout(() => {
        renderCart();
        renderCartCount();
      }, 2000);
    } catch (err) {
      console.error("Error processing payment:", err);
      showPaymentMessage(
        "Payment received but order processing failed. Please contact support.",
        "error"
      );
    }
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
          phone: sessionStorage.getItem("userPhone") || "",
        };

        if (!deliveryData.fullname) {
          alert("Please enter your full name.");
          return;
        }
        if (!deliveryData.street_address) {
          alert("Please enter your street address.");
          return;
        }
        if (!deliveryData.city) {
          alert("Please enter your city.");
          return;
        }
        if (!deliveryData.region) {
          alert("Please select your region.");
          return;
        }
        if (!deliveryData.country) {
          alert("Please select your country.");
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
      const page = link.dataset.page; // This should be "contact" for your contact link

      if (page === "home") {
        showPage("home");
      } else if (page === "products") {
        renderProducts();
        showPage("products");
      } else if (page === "gallery") {
        showPage("gallery");
      } else if (page === "cart") {
        showPage("cart");
      } else if (page === "contact") {
        showPage("contact");
      } else if (page === "shipping") {
        showPage("shipping");
      } else if (page === "returns") {
        showPage("returns");
      } else if (page === "tracking") {
        showPage("tracking");
      } else if (page === "size") {
        showPage("size");
      } else if (page === "policy") {
        showPage("policy");
      } else if (page === "terms") {
        showPage("terms");
      } else if (page === "thrift") {
        showPage("thrift");
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

// TREY Newsletter Form - Professional Implementation

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

// Add spinner animation
//const style = document.createElement("style");
//style.textContent = `
//    @keyframes spin {
//        to { transform: rotate(360deg); }
//    }
//  `;
//document.head.appendChild(style);
