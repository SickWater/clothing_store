// frontend/script.js
const API_BASE = "http://localhost:5000";

// ---------- Helpers ----------
const qs = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => Array.from((root || document).querySelectorAll(sel));

function buildImageUrl(path) { 
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return API_BASE + path;
  return `${API_BASE}/uploads/${path}`;
}

function formatR(amount) { return Number(amount || 0).toFixed(2); }

function escapeHtml(str="") { 
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s]); 
}

function toast(msg, t=1400) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.right = "20px";
  el.style.top = "20px";
  el.style.background = "#111";
  el.style.color = "#fff";
  el.style.padding = "8px 12px";
  el.style.borderRadius = "6px";
  el.style.zIndex = 99999;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), t);
}

// Debounce helper for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Update results count
function updateResultsCount(count) {
  let resultsCount = document.querySelector('.results-count');
  if (!resultsCount) {
    resultsCount = document.createElement('div');
    resultsCount.className = 'results-count';
    const shopControls = document.querySelector('.shop-controls');
    if (shopControls) {
      shopControls.appendChild(resultsCount);
    }
  }
  
  if (currentFilters.search || currentFilters.category !== 'all' || currentFilters.priceRange !== 'all') {
    resultsCount.textContent = `Showing ${count} of ${allProducts.length} products`;
    resultsCount.style.display = 'block';
  } else {
    resultsCount.style.display = 'none';
  }
}

// ---------- Skeleton Loader Functions ----------
function createSkeletonProductCard() {
  const div = document.createElement("div");
  div.className = "skeleton-product";
  div.innerHTML = `
    <div class="skeleton skeleton-image"></div>
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-price"></div>
    <div class="skeleton skeleton-category"></div>
    <div class="skeleton skeleton-sizes"></div>
    <div class="skeleton skeleton-stock"></div>
    <div class="skeleton-buttons">
      <div class="skeleton skeleton-button"></div>
      <div class="skeleton skeleton-button"></div>
    </div>
  `;
  return div;
}

function showSkeletonLoaders() {
  // Show skeleton for main shop grid
  const skeletonShop = document.getElementById('skeleton-shop');
  const productList = document.getElementById('product-list');
  
  if (skeletonShop && productList) {
    skeletonShop.style.display = 'grid';
    productList.style.display = 'none';
    
    // Clear and add skeleton cards (6 cards for shop)
    skeletonShop.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      skeletonShop.appendChild(createSkeletonProductCard());
    }
  }
  
  // Show skeleton for sale grid
  const skeletonSale = document.getElementById('skeleton-sale');
  const saleGrid = document.getElementById('sale-grid');
  
  if (skeletonSale && saleGrid) {
    skeletonSale.style.display = 'grid';
    saleGrid.style.display = 'none';
    
    skeletonSale.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      skeletonSale.appendChild(createSkeletonProductCard());
    }
  }
  
  // Show skeleton for brand grid
  const skeletonBrand = document.getElementById('skeleton-brand');
  const brandGrid = document.getElementById('brand-grid');
  
  if (skeletonBrand && brandGrid) {
    skeletonBrand.style.display = 'grid';
    brandGrid.style.display = 'none';
    
    skeletonBrand.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      skeletonBrand.appendChild(createSkeletonProductCard());
    }
  }
  
  // Show skeleton for thrift grid
  const skeletonThrift = document.getElementById('skeleton-thrift');
  const thriftGrid = document.getElementById('thrift-grid');
  
  if (skeletonThrift && thriftGrid) {
    skeletonThrift.style.display = 'grid';
    thriftGrid.style.display = 'none';
    
    skeletonThrift.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      skeletonThrift.appendChild(createSkeletonProductCard());
    }
  }
  
  // Show skeleton for blog
  const skeletonBlog = document.getElementById('skeleton-blog');
  const blogSection = document.getElementById('blog');
  
  if (skeletonBlog && blogSection) {
    skeletonBlog.style.display = 'block';
    blogSection.querySelectorAll('article').forEach(article => {
      article.style.display = 'none';
    });
  }
  
  // Show skeleton for cart if empty
  const skeletonCart = document.getElementById('skeleton-cart');
  const cartEditor = document.getElementById('cart-editor');
  
  if (skeletonCart && cartEditor && cart.length === 0) {
    skeletonCart.style.display = 'block';
    cartEditor.style.display = 'none';
  }
}

function hideSkeletonLoaders() {
  // Hide all skeleton loaders and show real content
  const skeletonIds = [
    'skeleton-shop', 'skeleton-sale', 'skeleton-brand', 
    'skeleton-thrift', 'skeleton-blog', 'skeleton-cart',
    'skeleton-auth', 'skeleton-product-modal', 'skeleton-checkout'
  ];
  
  skeletonIds.forEach(id => {
    const skeleton = document.getElementById(id);
    if (skeleton) skeleton.style.display = 'none';
  });
  
  // Show real content
  const productList = document.getElementById('product-list');
  if (productList) productList.style.display = 'grid';
  
  const saleGrid = document.getElementById('sale-grid');
  if (saleGrid) saleGrid.style.display = 'grid';
  
  const brandGrid = document.getElementById('brand-grid');
  if (brandGrid) brandGrid.style.display = 'grid';
  
  const thriftGrid = document.getElementById('thrift-grid');
  if (thriftGrid) thriftGrid.style.display = 'grid';
  
  const blogSection = document.getElementById('blog');
  if (blogSection) {
    blogSection.querySelectorAll('article').forEach(article => {
      article.style.display = 'block';
    });
  }
  
  const cartEditor = document.getElementById('cart-editor');
  if (cartEditor) cartEditor.style.display = 'block';
}

// Add skeleton for product modal when loading
function showProductModalSkeleton() {
  const skeletonModal = document.getElementById('skeleton-product-modal');
  const modalContent = document.querySelector('#product-modal .modal-content');
  
  if (skeletonModal && modalContent) {
    skeletonModal.style.display = 'flex';
    modalContent.style.display = 'none';
  }
}

function hideProductModalSkeleton() {
  const skeletonModal = document.getElementById('skeleton-product-modal');
  const modalContent = document.querySelector('#product-modal .modal-content');
  
  if (skeletonModal && modalContent) {
    skeletonModal.style.display = 'none';
    modalContent.style.display = 'flex';
  }
}

// Add skeleton for auth modal when loading
function showAuthModalSkeleton() {
  const skeletonAuth = document.getElementById('skeleton-auth');
  const authContent = document.querySelector('#auth-modal .auth-modal-container');
  
  if (skeletonAuth && authContent) {
    skeletonAuth.style.display = 'flex';
    authContent.style.display = 'none';
  }
}

function hideAuthModalSkeleton() {
  const skeletonAuth = document.getElementById('skeleton-auth');
  const authContent = document.querySelector('#auth-modal .auth-modal-container');
  
  if (skeletonAuth && authContent) {
    skeletonAuth.style.display = 'none';
    authContent.style.display = 'flex';
  }
}

// Add skeleton for checkout modal when loading
function showCheckoutModalSkeleton() {
  const skeletonCheckout = document.getElementById('skeleton-checkout');
  const checkoutContent = document.querySelector('#checkout-modal .modal-content');
  
  if (skeletonCheckout && checkoutContent) {
    skeletonCheckout.style.display = 'block';
    checkoutContent.style.display = 'none';
  }
}

function hideCheckoutModalSkeleton() {
  const skeletonCheckout = document.getElementById('skeleton-checkout');
  const checkoutContent = document.querySelector('#checkout-modal .modal-content');
  
  if (skeletonCheckout && checkoutContent) {
    skeletonCheckout.style.display = 'none';
    checkoutContent.style.display = 'block';
  }
}

// ---------- Auth State Management ----------
let currentUser = JSON.parse(localStorage.getItem("user_data")) || null;
let authToken = localStorage.getItem("auth_token") || null;
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ---------- Wishlist State ----------
let wishlist = JSON.parse(localStorage.getItem('swishdrip_wishlist')) || { items: [] };

// Update UI based on auth state
function updateAuthUI() {
  const loginBtn = qs("#login-btn");
  const logoutBtn = qs("#logout-btn");
  const userGreeting = qs("#user-greeting");
  const profileLink = document.getElementById('profile-link');
  
  if (currentUser && authToken) {
    // User is logged in
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (userGreeting) {
      userGreeting.textContent = `Hi, ${currentUser.name.split(' ')[0]}!`;
      userGreeting.style.display = "inline-block";
    }
    if (profileLink) profileLink.style.display = "inline-block";
  } else {
    // User is not logged in
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userGreeting) {
      userGreeting.textContent = "";
      userGreeting.style.display = "none";
    }
    if (profileLink) profileLink.style.display = "none";
  }
}

// Check if user is authenticated
function isAuthenticated() {
  return !!(currentUser && authToken);
}

// Save auth data
function saveAuthData(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem("auth_token", token);
  localStorage.setItem("user_data", JSON.stringify(user));
  updateAuthUI();
}

// Clear auth data
function clearAuthData() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  updateAuthUI();
}

// ---------- Auth Modal ----------
const authModal = qs("#auth-modal");
const closeAuthBtn = qs("#close-auth");
const loginTab = qs("#login-tab");
const registerTab = qs("#register-tab");
const loginForm = qs("#login-form");
const registerForm = qs("#register-form");
const switchToRegister = qs("#switch-to-register");
const switchToLogin = qs("#switch-to-login");
const googleLoginBtn = qs("#google-auth-btn");
const authMessage = qs("#auth-message");

// Show auth modal
function showAuthModal() {
  authModal.style.display = "flex";
  showLoginForm();
}

// Hide auth modal
function hideAuthModal() {
  authModal.style.display = "none";
  clearAuthMessage();
}

// Show login form
function showLoginForm() {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.style.display = "block";
  registerForm.style.display = "none";
  clearAuthMessage();
}

// Show register form
function showRegisterForm() {
  loginTab.classList.remove("active");
  registerTab.classList.add("active");
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  clearAuthMessage();
}

// Clear auth message
function clearAuthMessage() {
  if (authMessage) {
    authMessage.style.display = "none";
    authMessage.textContent = "";
    authMessage.className = "";
  }
}

// Show auth message
function showAuthMessage(type, text) {
  if (authMessage) {
    authMessage.style.display = "block";
    authMessage.textContent = text;
    authMessage.className = type;
  }
}

// Tab switching
loginTab?.addEventListener("click", showLoginForm);
registerTab?.addEventListener("click", showRegisterForm);
switchToRegister?.addEventListener("click", (e) => {
  e.preventDefault();
  showRegisterForm();
});
switchToLogin?.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginForm();
});

// Close auth modal
closeAuthBtn?.addEventListener("click", hideAuthModal);
window.addEventListener("click", (e) => {
  if (e.target === authModal) hideAuthModal();
});

// ---------- Login Form Submission ----------
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = qs("#login-email").value.trim();
  const password = qs("#login-password").value;
  
  if (!email || !password) {
    showAuthMessage("error", "Please fill in all fields");
    return;
  }
  
  try {
    showAuthMessage("success", "Logging in...");
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      saveAuthData(data.token, data.user);
      showAuthMessage("success", "Login successful!");
      
      // Close modal after successful login
      setTimeout(() => {
        hideAuthModal();
        // If there was a pending cart action, execute it
        if (window.pendingCartAction) {
          window.pendingCartAction();
          window.pendingCartAction = null;
        }
      }, 1000);
    } else {
      showAuthMessage("error", data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    showAuthMessage("error", "Network error. Please try again.");
  }
});

// ---------- Register Form Submission ----------
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = qs("#reg-name").value.trim();
  const email = qs("#reg-email").value.trim();
  const password = qs("#reg-password").value;
  
  if (!name || !email || !password) {
    showAuthMessage("error", "Please fill in all fields");
    return;
  }
  
  if (password.length < 6) {
    showAuthMessage("error", "Password must be at least 6 characters");
    return;
  }
  
  try {
    showAuthMessage("success", "Creating account...");
    
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      saveAuthData(data.token, data.user);
      showAuthMessage("success", "Account created successfully!");
      
      setTimeout(() => {
        hideAuthModal();
      }, 1000);
    } else {
      showAuthMessage("error", data.message || "Registration failed");
    }
  } catch (error) {
    console.error("Registration error:", error);
    showAuthMessage("error", "Network error. Please try again.");
  }
});

// ---------- Google OAuth ----------
googleLoginBtn?.addEventListener("click", () => {
  // Determine if we're on login or register form
  const isRegisterFormVisible = registerForm.style.display === "block";
  
  // Store the intended action in sessionStorage
  if (isRegisterFormVisible) {
    sessionStorage.setItem('auth_intent', 'register');
  } else {
    sessionStorage.setItem('auth_intent', 'login');
  }
  
  // Redirect to backend Google OAuth
  window.location.href = `${API_BASE}/api/auth/google`;
});

// ---------- Logout ----------
qs("#logout-btn")?.addEventListener("click", () => {
  if (confirm("Are you sure you want to logout?")) {
    clearAuthData();
    toast("Logged out successfully");
  }
});

// ---------- Login Button ----------
qs("#login-btn")?.addEventListener("click", showAuthModal);

// ---------- DOM refs ----------
const loadingSpinner = qs("#loading-spinner");
const loadingMessage = qs("#loading-message");
const retryBtn = qs("#retry-btn");
const noProductsMsg = qs("#no-products");

const productList = qs("#product-list");
const brandGrid = qs("#brand .product-grid");
const thriftGrid = qs("#thrift .product-grid");
const saleGrid = qs("#sale-grid");

const brandFilter = qs("#brand-filter");
const thriftFilter = qs("#thrift-filter");

// Product Modal
const productModal = qs("#product-modal");
const modalMainImg = qs("#modal-main-img");
const modalThumbs = qs("#modal-thumbnails");
const modalName = qs("#modal-name");
const modalPrice = qs("#modal-price");
const modalDescription = qs("#modal-description");
const modalSizesArea = qs("#modal-sizes-area");
const modalAddCartBtn = qs("#modal-add-cart-btn");
const modalCloseBtn = qs(".close-btn");

// Cart
const cartItemsEl = qs("#cart-items");
const cartTotalEl = qs("#cart-total");
const checkoutBtn = qs("#checkout-btn");
const clearCartBtn = qs("#clear-cart-btn");

// Checkout modal
const checkoutModal = qs("#checkout-modal");
const orderSummaryEl = qs("#order-summary");
const orderTotalEl = qs("#order-total");
const placeOrderBtn = qs("#place-order");
const checkoutClose = qs("#close-modal");

// ---------- Product State ----------
let allProducts = [];
let selectedProductForModal = null;
let selectedSizeForModal = null;

// ---------- Filter State ----------
let currentFilters = {
  search: '',
  sort: 'newest',
  category: 'all',
  priceRange: 'all'
};

// ---------- Fetch products ----------
async function fetchProducts() {
  try {
    // Show skeleton loaders
    showSkeletonLoaders();
    
    if (loadingSpinner) loadingSpinner.style.display = "block";
    if (loadingMessage) {
      loadingMessage.style.display = "block";
      loadingMessage.textContent = "Loading products...";
    }
    if (retryBtn) retryBtn.style.display = "none";
    if (noProductsMsg) noProductsMsg.style.display = "none";

    const res = await fetch(`${API_BASE}/api/products?raw=true`, {
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!res.ok) throw new Error(`Network error (${res.status} ${res.statusText})`);
    
    const data = await res.json();
    
    // Handle both response formats
    if (Array.isArray(data)) {
      allProducts = data;
    } else if (data.products && Array.isArray(data.products)) {
      allProducts = data.products;
    } else {
      allProducts = [];
    }

    // Process products
    allProducts = allProducts.map(p => ({
      ...p,
      price: Number(p.price || 0),
      salePrice: Number(p.salePrice || 0),
      sale: p.sale === true || p.sale === "true",
      sizes: Array.isArray(p.sizes) ? p.sizes.map(s => ({size: String(s.size), stock: Number(s.stock || 0)})) : []
    }));

    if (loadingSpinner) loadingSpinner.style.display = "none";
    if (loadingMessage) loadingMessage.style.display = "none";

    populateFilterOptions();
    renderAllSections();
    updateCartDisplay();
    
    // Hide skeleton loaders
    hideSkeletonLoaders();
    
    console.log(`Loaded ${allProducts.length} products`);
  } catch (err) {
    console.error("Failed to load products:", err);
    
    // Hide skeleton loaders on error too
    hideSkeletonLoaders();
    
    if (loadingSpinner) loadingSpinner.style.display = "none";
    if (loadingMessage) loadingMessage.textContent = "⚠️ Failed to load products: " + err.message;
    if (retryBtn) retryBtn.style.display = "inline-block";
  }
}

// ---------- Filters ----------
function capitalize(s="") { return s.charAt(0).toUpperCase() + s.slice(1); }

function populateFilterOptions() {
  const brandTypes = [...new Set(allProducts.filter(p => p.category === "brand").map(p => (p.clothingType || "").toLowerCase()))];
  const thriftTypes = [...new Set(allProducts.filter(p => p.category === "thrift").map(p => (p.clothingType || "").toLowerCase()))];

  if (brandFilter) {
    brandFilter.innerHTML = `<option value="all">All</option>`;
    brandTypes.forEach(t => {
      if (t) brandFilter.innerHTML += `<option value="${t}">${capitalize(t)}</option>`;
    });
  }
  
  if (thriftFilter) {
    thriftFilter.innerHTML = `<option value="all">All</option>`;
    thriftTypes.forEach(t => {
      if (t) thriftFilter.innerHTML += `<option value="${t}">${capitalize(t)}</option>`;
    });
  }
}

// ---------- Render ----------
function renderAllSections() {
  renderShopGrid();
  renderCategoryGrids();
  renderSaleGrid();
}

function renderShopGrid() {
  if (!productList) return;
  productList.innerHTML = "";
  if (!allProducts.length) {
    productList.innerHTML = "<p>No items yet.</p>";
    return;
  }
  allProducts.forEach(p => productList.appendChild(createProductCard(p, true)));
}

function renderCategoryGrids() {
  if (brandGrid) {
    const brandProducts = allProducts.filter(p => p.category === "brand");
    brandGrid.innerHTML = "";
    if (!brandProducts.length) brandGrid.innerHTML = "<p>No brand items</p>";
    brandProducts.forEach(p => brandGrid.appendChild(createProductCard(p)));
  }
  
  if (thriftGrid) {
    const thriftProducts = allProducts.filter(p => p.category === "thrift");
    thriftGrid.innerHTML = "";
    if (!thriftProducts.length) thriftGrid.innerHTML = "<p>No thrift items</p>";
    thriftProducts.forEach(p => thriftGrid.appendChild(createProductCard(p)));
  }
}

function renderSaleGrid() {
  if (!saleGrid) return;
  saleGrid.innerHTML = "";
  const saleItems = allProducts.filter(p => p.sale === true);
  if (!saleItems.length) {
    saleGrid.innerHTML = `<p id="no-sale">No deals right now — check back soon!</p>`;
    return;
  }
  saleItems.forEach(p => saleGrid.appendChild(createProductCard(p)));
}

// ---------- Wishlist Heart Icons ----------
function addWishlistHeartToProduct(product, div) {
  // Check if product is in wishlist
  const isInWishlist = wishlist.items.includes(product._id || product.id);
  
  // Create heart button
  const heartBtn = document.createElement('button');
  heartBtn.className = `product-heart ${isInWishlist ? 'active' : ''}`;
  heartBtn.innerHTML = isInWishlist ? '❤️' : '🤍';
  heartBtn.setAttribute('data-product-id', product._id || product.id);
  heartBtn.title = isInWishlist ? 'Remove from wishlist' : 'Add to wishlist';
  
  // Position it
  heartBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.2s ease;
    z-index: 2;
  `;
  
  // Add hover effects
  heartBtn.addEventListener('mouseenter', () => {
    if (!isInWishlist) {
      heartBtn.style.transform = 'scale(1.1)';
    }
  });
  
  heartBtn.addEventListener('mouseleave', () => {
    if (!isInWishlist) {
      heartBtn.style.transform = 'scale(1)';
    }
  });
  
  // Add click event
  heartBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Toggle wishlist
    const wasAdded = await toggleWishlist(product._id || product.id, product);
    
    // Update button state
    if (wasAdded) {
      heartBtn.classList.add('active');
      heartBtn.innerHTML = '❤️';
      heartBtn.title = 'Remove from wishlist';
      heartBtn.style.background = 'rgba(229, 57, 53, 0.1)';
    } else {
      heartBtn.classList.remove('active');
      heartBtn.innerHTML = '🤍';
      heartBtn.title = 'Add to wishlist';
      heartBtn.style.background = 'rgba(255, 255, 255, 0.9)';
    }
  });
  
  // Add to product card
  const productImageContainer = div.querySelector('div[style*="position:relative"]');
  if (productImageContainer) {
    productImageContainer.appendChild(heartBtn);
  }
}

// ---------- Wishlist Functions ----------
async function toggleWishlist(productId, productData = null) {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    showAuthModal();
    showAuthMessage("info", "Please login to manage your wishlist");
    return false;
  }
  
  const index = wishlist.items.indexOf(productId);
  
  if (index === -1) {
    // Add to wishlist
    wishlist.items.push(productId);
    localStorage.setItem('swishdrip_wishlist', JSON.stringify(wishlist));
    toast('Added to wishlist!');
    return true;
  } else {
    // Remove from wishlist
    wishlist.items.splice(index, 1);
    localStorage.setItem('swishdrip_wishlist', JSON.stringify(wishlist));
    toast('Removed from wishlist');
    return false;
  }
}

// ---------- Product card ----------
function createProductCard(product, showCategory = false) {
  const div = document.createElement("div");
  div.className = "product";
  
  // Check if product is in stock
  const totalStock = product.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0;
  const isOutOfStock = totalStock === 0;
  const inStockSizes = product.sizes?.filter(s => s.stock > 0) || [];
  
  const imgSrc = buildImageUrl(product.image || product.images?.[0] || "");
  
  div.innerHTML = `
    <div style="position:relative;">
      ${product.sale ? `<div class="sale-badge">SALE</div>` : ""}
      ${isOutOfStock ? `<div class="out-of-stock-badge">OUT OF STOCK</div>` : ""}
      <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(product.name || '')}" 
           style="width:100%;height:200px;object-fit:cover;border-radius:8px;
                  ${isOutOfStock ? 'opacity:0.7;filter:grayscale(20%);' : ''}"
           onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=No+Image';">
    </div>
    <h3 class="product-name">${escapeHtml(product.name || '')}</h3>
    <p class="product-price">
      ${product.sale && product.salePrice ? 
        `<strong>R${formatR(product.salePrice)}</strong> <span class="original-price">R${formatR(product.price)}</span>` : 
        `R${formatR(product.price)}`}
    </p>
    ${showCategory ? `<p style="font-size:0.85rem;color:#666">${escapeHtml(product.category || "")} · ${escapeHtml(product.clothingType || "")}</p>` : ""}
    
    <!-- Size chips (show only 3, +more if applicable) -->
    ${product.sizes?.length > 0 ? `
      <div class="product-sizes">
        ${inStockSizes.slice(0, 3).map(s => `
          <span class="size-chip">${s.size}</span>
        `).join('')}
        ${inStockSizes.length > 3 ? `<span class="size-chip">+${inStockSizes.length - 3} more</span>` : ''}
        ${inStockSizes.length === 0 ? `<span class="size-chip out-of-stock">No sizes</span>` : ''}
      </div>
    ` : ''}
    
    <!-- Stock status -->
    <p style="font-size:0.8rem; margin:8px 0; color:${isOutOfStock ? '#e74c3c' : (totalStock < 10 ? '#f39c12' : '#27ae60')}">
      ${isOutOfStock ? 'Out of Stock' : 
        (product.sizes?.length > 0 ? 
          `${totalStock} items left • ${inStockSizes.length} sizes available` : 
          'In Stock')}
    </p>
    
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
      <button class="view-btn btn" ${isOutOfStock ? 'disabled style="opacity:0.5"' : ''}>View Details</button>
      <button class="add-btn btn" ${isOutOfStock ? 'disabled style="opacity:0.5"' : ''}>Add to Cart</button>
    </div>
  `;

  // Add wishlist heart to product
  addWishlistHeartToProduct(product, div);

  div.querySelector(".view-btn")?.addEventListener("click", () => openModal(product));
  
  div.querySelector(".add-btn")?.addEventListener("click", () => {
    if (product.sizes?.length > 0) {
      // If product has sizes, open modal to select size
      openModal(product);
    } else {
      // If no sizes, add directly
      const price = (product.sale && product.salePrice) ? product.salePrice : product.price;
      
      // Check if user is authenticated
      if (!isAuthenticated()) {
        window.pendingCartAction = () => {
          addToCart(product._id || product.id, product.name, price, null, 1);
        };
        showAuthModal();
        showAuthMessage("info", "Please login to add items to cart");
        return;
      }
      
      addToCart(product._id || product.id, product.name, price, null, 1);
    }
  });

  return div;
}

// ---------- Update Product Stock ----------
async function updateProductStock(productId, size, quantity) {
  try {
    const response = await fetch(`${API_BASE}/api/products/${productId}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ size, quantity })
    });
    
    if (!response.ok) throw new Error('Failed to update stock');
    return await response.json();
  } catch (error) {
    console.error('Error updating stock:', error);
    // You might want to handle this gracefully
  }
}

// ---------- Modal ----------
function openModal(product) {
  if (!productModal) return;
  
  // Show skeleton loader for modal
  showProductModalSkeleton();
  
  selectedProductForModal = product;
  selectedSizeForModal = null;
  productModal.dataset.productId = product._id || product.id || "";
  
  // Use setTimeout to simulate loading (remove in production)
  setTimeout(() => {
    modalName.textContent = product.name || "";
    modalPrice.textContent = (product.sale && product.salePrice) ? `R${formatR(product.salePrice)}` : `R${formatR(product.price)}`;
    modalDescription.textContent = product.description || "";
    const mainImgSrc = buildImageUrl(product.image || product.images?.[0] || "");
    modalMainImg.src = mainImgSrc;
    modalMainImg.onerror = () => {
      modalMainImg.src = 'https://via.placeholder.com/500x400?text=Image+Not+Found';
    };

    // Thumbnails
    if (modalThumbs) {
      modalThumbs.innerHTML = "";
      const thumbs = (product.images?.length) ? product.images : (product.image ? [product.image] : []);
      thumbs.forEach((src, idx) => {
        const t = document.createElement("img");
        t.src = buildImageUrl(src);
        t.style.width = "60px";
        t.style.height = "60px";
        t.style.objectFit = "cover";
        t.style.border = idx === 0 ? "2px solid #111" : "2px solid transparent";
        t.style.cursor = "pointer";
        t.style.borderRadius = "4px";
        t.addEventListener("click", () => {
          modalMainImg.src = buildImageUrl(src);
          qsa("img", modalThumbs).forEach(img => img.style.border = "2px solid transparent");
          t.style.border = "2px solid #111";
        });
        modalThumbs.appendChild(t);
      });
    }

    renderModalSizes(product.sizes || []);
    
    // Hide skeleton and show actual content
    hideProductModalSkeleton();
    
    productModal.style.display = "flex";
  }, 300); // Small delay to show skeleton (remove or reduce in production)
}

function renderModalSizes(sizes) {
  if (!modalSizesArea) return;
  modalSizesArea.innerHTML = '';
  
  if (!sizes.length) {
    modalSizesArea.innerHTML = `<div style="color:#666">One size fits all</div>`;
    return;
  }

  // Add label
  const label = document.createElement('span');
  label.className = 'size-label';
  label.textContent = 'Select Size:';
  modalSizesArea.appendChild(label);
  
  // Create size buttons
  const sizesContainer = document.createElement('div');
  sizesContainer.style.display = 'flex';
  sizesContainer.style.flexWrap = 'wrap';
  sizesContainer.style.gap = '10px';
  sizesContainer.style.marginTop = '10px';
  
  sizes.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "size-btn";
    btn.textContent = s.size;
    btn.title = `${s.stock} in stock`;
    btn.disabled = s.stock === 0;
    
    if (s.stock > 0 && s.stock < 5) {
      btn.style.borderColor = '#f39c12'; // Low stock warning
      btn.innerHTML = `${s.size} <small style="display:block;font-size:10px;color:#f39c12">(${s.stock} left)</small>`;
    }
    
    btn.addEventListener("click", () => {
      qsa(".size-btn", sizesContainer).forEach(x => {
        x.classList.remove('selected');
        x.style.background = "";
        x.style.color = "";
      });
      btn.classList.add('selected');
      btn.style.background = "#111";
      btn.style.color = "#fff";
      selectedSizeForModal = s.size;
    });
    sizesContainer.appendChild(btn);
  });
  
  modalSizesArea.appendChild(sizesContainer);
  
  // Auto-select first available size
  const firstAvailable = sizes.find(s => s.stock > 0);
  if (firstAvailable && sizesContainer.firstChild) {
    const firstBtn = sizesContainer.querySelector('.size-btn:not(:disabled)');
    if (firstBtn) {
      firstBtn.click();
    }
  }
}

// Close modal
modalCloseBtn?.addEventListener("click", () => productModal.style.display = "none");
window.addEventListener("click", e => {
  if (e.target === productModal) productModal.style.display = "none";
});

// Modal add-to-cart
modalAddCartBtn?.addEventListener("click", () => {
  if (!selectedProductForModal) return;
  
  // Check if user is authenticated
  if (!isAuthenticated()) {
    // Store the cart action for after login
    window.pendingCartAction = () => {
      const price = (selectedProductForModal.sale && selectedProductForModal.salePrice) ? 
        selectedProductForModal.salePrice : selectedProductForModal.price;
      addToCart(
        selectedProductForModal._id || selectedProductForModal.id,
        selectedProductForModal.name,
        price,
        selectedSizeForModal || null,
        1
      );
      productModal.style.display = "none";
    };
    
    // Show auth modal
    productModal.style.display = "none";
    showAuthModal();
    showAuthMessage("info", "Please login to add items to cart");
    return;
  }
  
  if (selectedProductForModal.sizes.length > 0 && !selectedSizeForModal) {
    toast("Please pick a size.");
    return;
  }
  
  const price = (selectedProductForModal.sale && selectedProductForModal.salePrice) ? 
    selectedProductForModal.salePrice : selectedProductForModal.price;
  
  addToCart(
    selectedProductForModal._id || selectedProductForModal.id,
    selectedProductForModal.name,
    price,
    selectedSizeForModal || null,
    1
  );
  productModal.style.display = "none";
});

// ---------- Search & Filter System ----------
function initSearchAndFilter() {
  // Search input
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentFilters.search = e.target.value.toLowerCase();
      applyFilters();
    }, 300));
  }
  
  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      applyFilters();
    });
  }
  
  // Category filter
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      applyFilters();
    });
  }
  
  // Price range
  const priceRange = document.getElementById('price-range');
  if (priceRange) {
    priceRange.addEventListener('change', (e) => {
      currentFilters.priceRange = e.target.value;
      applyFilters();
    });
  }
  
  // Clear filters
  const clearFilters = document.getElementById('clear-filters');
  if (clearFilters) {
    clearFilters.addEventListener('click', () => {
      currentFilters = {
        search: '',
        sort: 'newest',
        category: 'all',
        priceRange: 'all'
      };
      
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = 'newest';
      if (categoryFilter) categoryFilter.value = 'all';
      if (priceRange) priceRange.value = 'all';
      
      applyFilters();
    });
  }
}

function applyFilters() {
  let filtered = [...allProducts];
  
  // Search filter
  if (currentFilters.search) {
    filtered = filtered.filter(product => {
      return (
        (product.name && product.name.toLowerCase().includes(currentFilters.search)) ||
        (product.category && product.category.toLowerCase().includes(currentFilters.search)) ||
        (product.clothingType && product.clothingType.toLowerCase().includes(currentFilters.search)) ||
        (product.brand && product.brand.toLowerCase().includes(currentFilters.search)) ||
        (product.description && product.description.toLowerCase().includes(currentFilters.search))
      );
    });
  }
  
  // Category filter
  if (currentFilters.category !== 'all') {
    filtered = filtered.filter(product => product.category === currentFilters.category);
  }
  
  // Price range filter
  if (currentFilters.priceRange !== 'all') {
    filtered = filtered.filter(product => {
      const price = product.sale && product.salePrice ? product.salePrice : product.price;
      switch (currentFilters.priceRange) {
        case '0-100': return price <= 100;
        case '100-300': return price > 100 && price <= 300;
        case '300-500': return price > 300 && price <= 500;
        case '500+': return price > 500;
        default: return true;
      }
    });
  }
  
  // Sort products
  filtered.sort((a, b) => {
    switch (currentFilters.sort) {
      case 'price-low':
        return (a.sale && a.salePrice ? a.salePrice : a.price) - 
               (b.sale && b.salePrice ? b.salePrice : b.price);
        
      case 'price-high':
        return (b.sale && b.salePrice ? b.salePrice : b.price) - 
               (a.sale && a.salePrice ? a.salePrice : a.price);
        
      case 'sale':
        // Put sale items first, then sort by discount percentage
        const aDiscount = a.sale ? (a.price - (a.salePrice || a.price)) / a.price : 0;
        const bDiscount = b.sale ? (b.price - (b.salePrice || b.price)) / b.price : 0;
        return bDiscount - aDiscount;
        
      case 'popular':
        // For now, sort by stock (lower stock = more popular)
        const aStock = a.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0;
        const bStock = b.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0;
        return aStock - bStock;
        
      case 'newest':
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });
  
  // Update all product displays
  renderFilteredProducts(filtered);
  
  // Show results count
  updateResultsCount(filtered.length);
}

function renderFilteredProducts(filteredProducts) {
  // Main shop grid
  if (productList) {
    productList.innerHTML = '';
    filteredProducts.forEach(p => productList.appendChild(createProductCard(p, true)));
  }
  
  // Brand section
  const brandProducts = filteredProducts.filter(p => p.category === 'brand');
  if (brandGrid) {
    brandGrid.innerHTML = '';
    brandProducts.forEach(p => brandGrid.appendChild(createProductCard(p)));
  }
  
  // Thrift section
  const thriftProducts = filteredProducts.filter(p => p.category === 'thrift');
  if (thriftGrid) {
    thriftGrid.innerHTML = '';
    thriftProducts.forEach(p => thriftGrid.appendChild(createProductCard(p)));
  }
  
  // Sale section
  const saleProducts = filteredProducts.filter(p => p.sale);
  if (saleGrid) {
    saleGrid.innerHTML = '';
    saleProducts.forEach(p => saleGrid.appendChild(createProductCard(p)));
  }
}

// ---------- Filters live ----------
brandFilter?.addEventListener("change", () => {
  const val = brandFilter.value;
  const brandProducts = allProducts.filter(p => p.category === "brand");
  const filtered = val === "all" ? brandProducts : brandProducts.filter(p => (p.clothingType || "").toLowerCase() === val);
  brandGrid.innerHTML = "";
  filtered.forEach(p => brandGrid.appendChild(createProductCard(p)));
});

thriftFilter?.addEventListener("change", () => {
  const val = thriftFilter.value;
  const thriftProducts = allProducts.filter(p => p.category === "thrift");
  const filtered = val === "all" ? thriftProducts : thriftProducts.filter(p => (p.clothingType || "").toLowerCase() === val);
  thriftGrid.innerHTML = "";
  filtered.forEach(p => thriftGrid.appendChild(createProductCard(p)));
});

// ---------- Cart ----------
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartDisplay() {
  renderCartEditor();
}

function addToCart(productId, name, price, size = null, qty = 1) {
  // Check if user is authenticated (this should already be checked, but just in case)
  if (!isAuthenticated()) {
    showAuthModal();
    showAuthMessage("info", "Please login to add items to cart");
    return;
  }
  
  const key = `${productId}${size ? ":" + size : ""}`;
  const existing = cart.find(c => c.productKey === key);
  
  if (existing) {
    existing.quantity += Number(qty);
  } else {
    cart.push({
      productKey: key,
      productId,
      name,
      price: Number(price),
      size,
      quantity: Number(qty)
    });
  }
  
  saveCart();
  updateCartDisplay();
  toast(`${name} added to cart`);
}

// Enhanced Cart Editor Functions
function renderCartEditor() {
  const cartEditor = document.getElementById('cart-editor');
  if (!cartEditor) {
    // Fallback to old display if cart-editor element doesn't exist
    fallbackCartDisplay();
    return;
  }
  
  if (cart.length === 0) {
    cartEditor.innerHTML = '<p style="text-align:center;color:#666;">Your cart is empty</p>';
    updateCartSummary();
    return;
  }
  
  let html = '';
  cart.forEach((item, index) => {
    const product = allProducts.find(p => p._id === item.productId);
    const imageUrl = product ? buildImageUrl(product.image || product.images?.[0]) : '';
    
    html += `
      <div class="cart-item" data-index="${index}">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}" 
             class="cart-item-image"
             onerror="this.src='https://via.placeholder.com/80x80?text=Product'">
        <div class="cart-item-details">
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-meta">
            ${item.size ? `Size: ${item.size} • ` : ''}
            Price: R${formatR(item.price)} each
          </div>
          <div class="cart-item-actions">
            <div class="quantity-control">
              <button class="quantity-btn minus" data-index="${index}">-</button>
              <span class="quantity-display">${item.quantity}</span>
              <button class="quantity-btn plus" data-index="${index}">+</button>
            </div>
            <button class="remove-item" data-index="${index}">Remove</button>
          </div>
        </div>
        <div class="cart-item-total">
          <strong>R${formatR(item.price * item.quantity)}</strong>
        </div>
      </div>
    `;
  });
  
  cartEditor.innerHTML = html;
  
  // Add event listeners
  document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      updateCartQuantity(index, cart[index].quantity - 1);
    });
  });
  
  document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      updateCartQuantity(index, cart[index].quantity + 1);
    });
  });
  
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeFromCart(index);
    });
  });
  
  updateCartSummary();
}

function fallbackCartDisplay() {
  // Old cart display method
  if (!cartItemsEl || !cartTotalEl) return;
  
  cartItemsEl.innerHTML = "";
  let total = 0;
  
  cart.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.name}${item.size ? " (" + item.size + ")" : ""} ×${item.quantity} — R${formatR(item.price * item.quantity)}`;
    cartItemsEl.appendChild(li);
    total += Number(item.price) * Number(item.quantity);
  });
  
  cartTotalEl.textContent = formatR(total);
}

function updateCartQuantity(index, newQuantity) {
  if (newQuantity < 1) {
    removeFromCart(index);
    return;
  }
  
  const item = cart[index];
  if (!item) return;
  
  // Check stock if size is specified
  if (item.size) {
    const product = allProducts.find(p => p._id === item.productId);
    if (product) {
      const sizeObj = product.sizes?.find(s => s.size === item.size);
      if (sizeObj && sizeObj.stock < newQuantity) {
        toast(`Only ${sizeObj.stock} items available in size ${item.size}`);
        return;
      }
    }
  }
  
  cart[index].quantity = newQuantity;
  saveCart();
  renderCartEditor();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCartEditor();
}

function updateCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 300 ? 0 : 50; // Free shipping over R300
  const total = subtotal + shipping;
  
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');
  
  if (subtotalEl) subtotalEl.textContent = formatR(subtotal);
  if (shippingEl) shippingEl.textContent = formatR(shipping);
  if (totalEl) totalEl.textContent = formatR(total);
}

clearCartBtn?.addEventListener("click", () => {
  cart = [];
  saveCart();
  updateCartDisplay();
});

// ---------- Enhanced Checkout Functions ----------
function setupEnhancedCheckout() {
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.onclick = function(e) {
      e.preventDefault();
      
      // Check if user is authenticated
      if (!isAuthenticated()) {
        showAuthModal();
        showAuthMessage("info", "Please login to checkout");
        return;
      }
      
      // Check if cart is empty
      if (cart.length === 0) {
        toast("Your cart is empty");
        return;
      }
      
      // Show enhanced checkout modal
      showEnhancedCheckoutModal();
    };
  }
}

function showEnhancedCheckoutModal() {
  // Create or get checkout modal
  let checkoutModal = document.getElementById('checkout-modal');
  if (!checkoutModal) {
    checkoutModal = document.createElement('div');
    checkoutModal.id = 'checkout-modal';
    checkoutModal.className = 'modal';
    document.body.appendChild(checkoutModal);
  }
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 300 ? 0 : 50;
  const total = subtotal + shipping;
  
  checkoutModal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <span class="close-btn" id="close-checkout">&times;</span>
      <h2>Complete Your Order</h2>
      
      <div style="margin:20px 0;">
        ${cart.map(item => `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #eee;">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              ${item.size ? `<div style="font-size:0.9rem;color:#666">Size: ${item.size}</div>` : ''}
              <div style="font-size:0.9rem;color:#666">Quantity: ${item.quantity}</div>
            </div>
            <div>
              R${formatR(item.price * item.quantity)}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Subtotal:</span>
          <span>R${formatR(subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Shipping:</span>
          <span>${shipping === 0 ? 'FREE' : `R${formatR(shipping)}`}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:1.2rem;font-weight:bold;padding-top:10px;border-top:2px solid #ddd;">
          <span>Total:</span>
          <span>R${formatR(total)}</span>
        </div>
      </div>
      
      <h3 style="margin-top:20px;">Delivery Information</h3>
      <div id="checkout-info-container" style="margin:20px 0;">
        <input type="text" id="customer-name" placeholder="Full Name" required 
               style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px;">
        <input type="tel" id="customer-phone" placeholder="Phone Number" required 
               style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px;">
        <textarea id="customer-address" placeholder="Delivery Address" required rows="3"
                  style="width:100%;padding:10px;margin-bottom:20px;border:1px solid #ddd;border-radius:4px;"></textarea>
      </div>
      
      <button id="confirm-order" class="btn" style="width:100%;padding:15px;background:#111;color:white;border:none;border-radius:8px;font-size:1.1rem;">
        Place Order
      </button>
    </div>
  `;
  
  checkoutModal.style.display = 'flex';
  
  // Add event listeners
  document.getElementById('close-checkout')?.addEventListener('click', () => {
    checkoutModal.style.display = 'none';
  });
  
  document.getElementById('confirm-order')?.addEventListener('click', async () => {
    await placeOrder();
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === checkoutModal) {
      checkoutModal.style.display = 'none';
    }
  });
}

async function placeOrder() {
  const name = document.getElementById('customer-name')?.value;
  const phone = document.getElementById('customer-phone')?.value;
  const address = document.getElementById('customer-address')?.value;
  
  if (!name || !phone || !address) {
    toast('Please fill in all delivery information');
    return;
  }
  
  try {
    const orderData = {
      customerName: name,
      phone: phone,
      location: address,
      items: cart.map(item => ({
        productId: item.productId,
        size: item.size || null,
        quantity: item.quantity
      }))
    };
    
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(orderData)
    });
    
    if (response.ok) {
      // Clear cart
      cart = [];
      saveCart();
      renderCartEditor();
      
      // Close modal
      document.getElementById('checkout-modal').style.display = 'none';
      
      // Show success message
      toast('Order placed successfully! We\'ll contact you soon.', 5000);
      
      // Refresh products to update stock
      fetchProducts();
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to place order');
    }
  } catch (error) {
    console.error('Order error:', error);
    toast(`Error: ${error.message}`);
  }
}

// Keep the old checkout close event listener (for existing modal)
checkoutClose?.addEventListener("click", () => {
  const checkoutModal = document.getElementById('checkout-modal');
  if (checkoutModal) checkoutModal.style.display = "none";
});

// ---------- Retry ----------
retryBtn?.addEventListener("click", fetchProducts);

// ---------- Initialize ----------
document.addEventListener("DOMContentLoaded", () => {
  // Check for auth parameters in URL (for Google OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const user = urlParams.get('user');
  
  // If we have token and user from Google OAuth redirect
  if (token && user) {
    try {
      const userData = JSON.parse(decodeURIComponent(user));
      saveAuthData(token, userData);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      toast("Login successful!");
      
      // If there was a pending cart action, execute it
      if (window.pendingCartAction) {
        window.pendingCartAction();
        window.pendingCartAction = null;
      }
    } catch (e) {
      console.error("Error parsing auth data:", e);
    }
  }

  const authIntent = sessionStorage.getItem('auth_intent');
  if (authIntent) {
    sessionStorage.removeItem('auth_intent');
    toast(authIntent === 'register' ? "Google registration successful!" : "Google login successful!");
  }
  
  // Update UI
  updateAuthUI();
  
  // Initialize new systems
  initSearchAndFilter();
  setupEnhancedCheckout();
  
  // Show skeleton loaders immediately
  showSkeletonLoaders();
  
  // Load products and render cart
  fetchProducts();
  renderCartEditor();
});