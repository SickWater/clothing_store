// js/wishlist.js - Complete Wishlist System with Skeleton Loaders
const API_BASE = "http://localhost:5000";

// ==================== WISHLIST STATE ====================
let wishlist = {
  items: [],
  version: '1.0',
  lastUpdated: null
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  console.log('Wishlist page initialized');
  
  // Show skeleton loaders immediately
  showSkeletonLoaders();
  
  // Check for Google OAuth redirect
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const user = urlParams.get('user');
  
  if (token && user) {
    try {
      const userData = JSON.parse(decodeURIComponent(user));
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      window.history.replaceState({}, document.title, window.location.pathname);
      updateAuthUI();
      syncWishlist();
    } catch (e) {
      console.error("Error parsing auth data:", e);
    }
  }
  
  updateAuthUI();
  loadWishlist();
  setupWishlistListeners();
});

// ==================== SKELETON LOADER FUNCTIONS ====================
function showSkeletonLoaders() {
  const skeletonGrid = document.getElementById('skeleton-grid');
  const wishlistGrid = document.getElementById('wishlist-grid');
  
  if (!skeletonGrid) return;
  
  // Hide the actual wishlist grid
  if (wishlistGrid) {
    wishlistGrid.style.display = 'none';
  }
  
  // Show skeleton container
  skeletonGrid.classList.add('loading');
  
  // Generate skeleton items (4 items for mobile, 6 for desktop)
  const skeletonCount = window.innerWidth < 768 ? 4 : 6;
  let skeletonHTML = '';
  
  for (let i = 0; i < skeletonCount; i++) {
    skeletonHTML += `
      <div class="skeleton-item">
        <div class="skeleton-remove"></div>
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-line long"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-actions">
            <div class="skeleton-button"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  skeletonGrid.innerHTML = skeletonHTML;
}

function hideSkeletonLoaders() {
  const skeletonGrid = document.getElementById('skeleton-grid');
  const wishlistGrid = document.getElementById('wishlist-grid');
  
  if (skeletonGrid) {
    skeletonGrid.classList.remove('loading');
  }
  
  if (wishlistGrid) {
    wishlistGrid.style.display = 'grid';
  }
  
  // Also update skeleton placeholders in sidebar
  const skeletonCount = document.querySelector('.skeleton-count');
  const skeletonStatus = document.querySelector('.skeleton-status');
  
  if (skeletonCount) {
    skeletonCount.style.display = 'none';
  }
  
  if (skeletonStatus) {
    skeletonStatus.style.display = 'none';
  }
}

// ==================== AUTH FUNCTIONS ====================
function updateAuthUI() {
  const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
  const authToken = localStorage.getItem('auth_token') || null;
  
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userGreeting = document.getElementById('user-greeting');
  const profileLink = document.getElementById('profile-link');
  
  if (currentUser && authToken) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (userGreeting) {
      userGreeting.textContent = `Hi, ${currentUser.name.split(' ')[0]}!`;
      userGreeting.style.display = "inline-block";
    }
    if (profileLink) profileLink.style.display = "inline-block";
    
    // Update sync status
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) {
      syncStatus.innerHTML = '<span class="sync-icon">🔗</span><span class="sync-text">Synced with Account</span>';
      syncStatus.classList.add('online');
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userGreeting) {
      userGreeting.textContent = "";
      userGreeting.style.display = "none";
    }
    if (profileLink) profileLink.style.display = "none";
    
    // Update sync status
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) {
      syncStatus.innerHTML = '<span class="sync-icon">📱</span><span class="sync-text">Guest Mode</span>';
      syncStatus.classList.remove('online');
    }
  }
}

// ==================== WISHLIST STORAGE ====================
function saveWishlistToLocal() {
  wishlist.lastUpdated = new Date().toISOString();
  localStorage.setItem('swishdrip_wishlist', JSON.stringify(wishlist));
}

function loadWishlistFromLocal() {
  const saved = localStorage.getItem('swishdrip_wishlist');
  if (saved) {
    try {
      wishlist = JSON.parse(saved);
      return true;
    } catch (e) {
      console.error("Error loading wishlist from localStorage:", e);
    }
  }
  return false;
}

// ==================== SERVER WISHLIST FUNCTIONS ====================
async function getServerWishlist() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    
    const response = await fetch(`${API_BASE}/api/wishlist`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.wishlist || [];
    }
    return null;
  } catch (error) {
    console.error("Error fetching server wishlist:", error);
    return null;
  }
}

async function addToServerWishlist(productId) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    
    const response = await fetch(`${API_BASE}/api/wishlist/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId })
    });
    
    return response.ok;
  } catch (error) {
    console.error("Error adding to server wishlist:", error);
    return false;
  }
}

async function removeFromServerWishlist(productId) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    
    const response = await fetch(`${API_BASE}/api/wishlist/remove`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId })
    });
    
    return response.ok;
  } catch (error) {
    console.error("Error removing from server wishlist:", error);
    return false;
  }
}

// ==================== SYNC FUNCTIONS ====================
async function syncWishlist() {
  const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
  const authToken = localStorage.getItem('auth_token') || null;
  
  if (!currentUser || !authToken) {
    showAuthModal();
    showAuthMessage("info", "Please login to sync your wishlist across devices");
    return;
  }
  
  try {
    // Show loading state
    const syncBtn = document.querySelector('.wishlist-actions .btn:nth-child(1)');
    const originalText = syncBtn.textContent;
    syncBtn.textContent = '🔄 Syncing...';
    syncBtn.disabled = true;
    
    // Get server wishlist
    const serverWishlist = await getServerWishlist();
    
    if (serverWishlist === null) {
      showToast("Failed to sync with server", "error");
      syncBtn.textContent = originalText;
      syncBtn.disabled = false;
      return;
    }
    
    // Merge local and server wishlists
    const localItems = wishlist.items || [];
    const serverItems = serverWishlist.map(item => item._id || item);
    
    // Create combined list (unique items)
    const combinedItems = [...new Set([...localItems, ...serverItems])];
    
    // Update server with all items
    for (const productId of combinedItems) {
      if (!serverItems.includes(productId)) {
        await addToServerWishlist(productId);
      }
    }
    
    // Update local wishlist from server
    wishlist.items = combinedItems;
    saveWishlistToLocal();
    
    showToast("Wishlist synced successfully!", "success");
    loadWishlist();
    
    // Restore button
    syncBtn.textContent = originalText;
    syncBtn.disabled = false;
    
  } catch (error) {
    console.error("Error syncing wishlist:", error);
    showToast("Sync failed. Please try again.", "error");
    
    // Restore button even on error
    const syncBtn = document.querySelector('.wishlist-actions .btn:nth-child(1)');
    if (syncBtn) {
      syncBtn.textContent = '🔄 Sync with Account';
      syncBtn.disabled = false;
    }
  }
}

// ==================== WISHLIST OPERATIONS ====================
async function toggleWishlist(productId, productData = null) {
  const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
  const authToken = localStorage.getItem('auth_token') || null;
  
  // Check if product is already in wishlist
  const isInWishlist = wishlist.items.includes(productId);
  
  if (isInWishlist) {
    // Remove from wishlist
    await removeFromWishlist(productId, productData);
  } else {
    // Add to wishlist
    await addToWishlist(productId, productData);
  }
  
  return !isInWishlist;
}

async function addToWishlist(productId, productData = null) {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
  const authToken = localStorage.getItem('auth_token') || null;
  
  if (!currentUser || !authToken) {
    // Store in localStorage for guest users
    if (!wishlist.items.includes(productId)) {
      wishlist.items.push(productId);
      saveWishlistToLocal();
    }
    
    // Optional: Show login prompt
    if (window.confirm("Want to save your wishlist across devices?\n\nLogin now to sync your wishlist.")) {
      showAuthModal();
    }
  } else {
    // Add to server wishlist
    const success = await addToServerWishlist(productId);
    if (success) {
      // Also update local storage
      if (!wishlist.items.includes(productId)) {
        wishlist.items.push(productId);
        saveWishlistToLocal();
      }
    } else {
      showToast("Failed to add to wishlist. Please try again.", "error");
      return;
    }
  }
  
  showToast("Added to wishlist! ❤️", "success");
  
  // Update UI
  updateWishlistUI(productId, true);
  
  // If on wishlist page, reload
  if (window.location.pathname.includes('wishlist.html')) {
    loadWishlist();
  }
}

async function removeFromWishlist(productId, productData = null) {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
  const authToken = localStorage.getItem('auth_token') || null;
  
  if (currentUser && authToken) {
    // Remove from server wishlist
    await removeFromServerWishlist(productId);
  }
  
  // Remove from local wishlist
  const index = wishlist.items.indexOf(productId);
  if (index > -1) {
    wishlist.items.splice(index, 1);
    saveWishlistToLocal();
  }
  
  showToast("Removed from wishlist", "info");
  
  // Update UI
  updateWishlistUI(productId, false);
  
  // If on wishlist page, reload
  if (window.location.pathname.includes('wishlist.html')) {
    loadWishlist();
  }
}

function clearWishlist() {
  if (wishlist.items.length === 0) return;
  
  if (confirm(`Are you sure you want to clear all ${wishlist.items.length} items from your wishlist?`)) {
    // Show skeleton loader while clearing
    showSkeletonLoaders();
    
    // Clear server wishlist if logged in
    const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
    const authToken = localStorage.getItem('auth_token') || null;
    
    if (currentUser && authToken) {
      // We'll need to implement a clear endpoint or remove each item
      wishlist.items.forEach(productId => {
        removeFromServerWishlist(productId).catch(console.error);
      });
    }
    
    // Clear local wishlist
    wishlist.items = [];
    saveWishlistToLocal();
    
    showToast("Wishlist cleared", "success");
    
    // Small delay to show the skeleton briefly
    setTimeout(() => {
      loadWishlist();
    }, 500);
  }
}

// ==================== WISHLIST PAGE FUNCTIONS ====================
async function loadWishlist() {
  // Show skeleton loaders while loading
  showSkeletonLoaders();
  
  // Load from localStorage
  loadWishlistFromLocal();
  
  // Get product details for wishlist items
  const wishlistGrid = document.getElementById('wishlist-grid');
  const emptyWishlist = document.getElementById('empty-wishlist');
  const wishlistCount = document.getElementById('wishlist-count');
  
  if (wishlist.items.length === 0) {
    // Hide skeleton and show empty state after a brief delay
    setTimeout(() => {
      hideSkeletonLoaders();
      if (wishlistGrid) wishlistGrid.innerHTML = '';
      if (emptyWishlist) emptyWishlist.style.display = 'block';
      if (wishlistCount) {
        wishlistCount.innerHTML = '0 items';
      }
    }, 600);
    return;
  }
  
  if (emptyWishlist) emptyWishlist.style.display = 'none';
  
  try {
    // Fetch all products
    const response = await fetch(`${API_BASE}/api/products`);
    const data = await response.json();
    
    const allProducts = Array.isArray(data) ? data : (data.products || []);
    
    // Filter to only wishlist items
    const wishlistProducts = allProducts.filter(product => 
      wishlist.items.includes(product._id || product.id)
    );
    
    // Small delay to ensure skeleton is visible
    setTimeout(() => {
      hideSkeletonLoaders();
      
      if (wishlistGrid) {
        renderWishlistItems(wishlistProducts);
      }
      
      if (wishlistCount) {
        wishlistCount.innerHTML = `${wishlist.items.length} item${wishlist.items.length !== 1 ? 's' : ''}`;
      }
    }, 600);
    
  } catch (error) {
    console.error("Error loading wishlist products:", error);
    
    // Hide skeleton on error
    hideSkeletonLoaders();
    
    if (wishlistGrid) {
      wishlistGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
          <p>Failed to load wishlist items. Please check your connection.</p>
          <button class="btn" onclick="loadWishlist()">Retry</button>
        </div>
      `;
    }
    
    if (wishlistCount) {
      wishlistCount.innerHTML = 'Error loading';
    }
  }
}

function renderWishlistItems(products) {
  const wishlistGrid = document.getElementById('wishlist-grid');
  if (!wishlistGrid) return;
  
  if (products.length === 0) {
    wishlistGrid.innerHTML = '';
    const emptyWishlist = document.getElementById('empty-wishlist');
    if (emptyWishlist) emptyWishlist.style.display = 'block';
    return;
  }
  
  const itemsHTML = products.map(product => {
    const totalStock = product.sizes ? product.sizes.reduce((sum, size) => sum + (size.stock || 0), 0) : 0;
    const isOutOfStock = totalStock === 0;
    const imgSrc = product.image ? 
      (product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`) :
      'https://via.placeholder.com/300x200?text=No+Image';
    
    return `
      <div class="wishlist-item" data-id="${product._id || product.id}">
        <button class="remove-wishlist" onclick="removeFromWishlist('${product._id || product.id}')" title="Remove from wishlist">
          ✕
        </button>
        <img src="${imgSrc}" alt="${product.name}" class="wishlist-item-image"
             onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
        <div class="wishlist-item-content">
          <h3 class="wishlist-item-name">${product.name}</h3>
          <div class="wishlist-item-price">
            ${product.sale && product.salePrice ? 
              `<strong>R${formatPrice(product.salePrice)}</strong> <span class="original-price">R${formatPrice(product.price)}</span>` : 
              `R${formatPrice(product.price)}`}
          </div>
          <p style="font-size: 0.9rem; color: ${isOutOfStock ? '#e53935' : '#27ae60'}; margin: 5px 0;">
            ${isOutOfStock ? 'Out of Stock' : 'In Stock'}
          </p>
          <div class="wishlist-item-actions">
            <button class="btn" onclick="viewProduct('${product._id || product.id}')">
              View Details
            </button>
            <button class="btn primary" onclick="addToCartFromWishlist('${product._id || product.id}')" ${isOutOfStock ? 'disabled' : ''}>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  wishlistGrid.innerHTML = itemsHTML;
}

function viewProduct(productId) {
  // Open product modal or redirect to product page
  // For now, we'll try to open the modal if it exists
  const event = new CustomEvent('openProductModal', { detail: { productId } });
  window.dispatchEvent(event);
  
  // Fallback: Show message
  showToast("Opening product details...", "info");
}

async function addToCartFromWishlist(productId) {
  // Get product details
  try {
    const response = await fetch(`${API_BASE}/api/products/${productId}`);
    const data = await response.json();
    const product = data.product || data;
    
    // Check if user is authenticated
    const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
    const authToken = localStorage.getItem('auth_token') || null;
    
    if (!currentUser || !authToken) {
      window.pendingCartAction = () => {
        const price = product.sale && product.salePrice ? product.salePrice : product.price;
        addToCart(product._id || product.id, product.name, price, null, 1);
      };
      
      showAuthModal();
      showAuthMessage("info", "Please login to add items to cart");
      return;
    }
    
    // Add to cart
    const price = product.sale && product.salePrice ? product.salePrice : product.price;
    addToCart(product._id || product.id, product.name, price, null, 1);
    
  } catch (error) {
    console.error("Error adding to cart from wishlist:", error);
    showToast("Failed to add to cart", "error");
  }
}

// ==================== HELPER FUNCTIONS ====================
function formatPrice(amount) {
  return Number(amount || 0).toFixed(2);
}

function updateWishlistUI(productId, isAdded) {
  // Update heart icons on product cards
  document.querySelectorAll(`[data-product-id="${productId}"] .product-heart`).forEach(heart => {
    if (isAdded) {
      heart.classList.add('active');
      heart.innerHTML = '❤️';
    } else {
      heart.classList.remove('active');
      heart.innerHTML = '🤍';
    }
  });
}

function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  
  const styles = {
    info: { background: '#2196F3' },
    success: { background: '#4CAF50' },
    error: { background: '#e53935' },
    warning: { background: '#ff9800' }
  };
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '15px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideUp 0.3s ease',
    ...styles[type]
  });
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(100px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  return toast;
}

// ==================== AUTH MODAL FUNCTIONS ====================
function showAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (authModal) {
    authModal.style.display = 'flex';
    showLoginForm();
  }
}

function showAuthMessage(type, text) {
  const authMessage = document.getElementById('auth-message');
  if (authMessage) {
    authMessage.style.display = 'block';
    authMessage.textContent = text;
    authMessage.className = type;
  }
}

function showLoginForm() {
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginTab) loginTab.classList.add('active');
  if (registerTab) registerTab.classList.remove('active');
  if (loginForm) loginForm.style.display = 'block';
  if (registerForm) registerForm.style.display = 'none';
}

// ==================== CART FUNCTIONS ====================
function addToCart(productId, name, price, size, qty) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const key = `${productId}${size ? ":" + size : ""}`;
  const existing = cart.find(c => c.productKey === key);
  
  if (existing) {
    existing.quantity += Number(qty);
  } else {
    cart.push({
      productKey: key,
      productId: productId,
      name: name,
      price: Number(price),
      size: size,
      quantity: Number(qty)
    });
  }
  
  localStorage.setItem("cart", JSON.stringify(cart));
  showToast(`${name} added to cart`);
}

// ==================== EVENT LISTENERS ====================
function setupWishlistListeners() {
  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', showAuthModal);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        updateAuthUI();
        showToast("Logged out successfully");
      }
    });
  }
  
  // Close auth modal
  const closeAuth = document.getElementById('close-auth');
  if (closeAuth) {
    closeAuth.addEventListener('click', function() {
      const authModal = document.getElementById('auth-modal');
      if (authModal) authModal.style.display = 'none';
    });
  }
  
  // Close modals when clicking outside
  window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
  
  // Listen for product modal opening
  window.addEventListener('openProductModal', function(e) {
    // You can implement this to open your product modal
    console.log('Open product modal for:', e.detail.productId);
  });
}

// ==================== GLOBAL FUNCTIONS ====================
// Make functions available globally
window.toggleWishlist = toggleWishlist;
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.clearWishlist = clearWishlist;
window.syncWishlist = syncWishlist;
window.loadWishlist = loadWishlist;