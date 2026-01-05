// js/view-pages.js - Complete Fixed Version
// This file is self-contained and doesn't depend on script.js

const API_BASE = "http://localhost:5000";

// ==================== HELPER FUNCTIONS ====================
function buildImageUrl(path) { 
  if (!path) return "https://via.placeholder.com/300x300?text=No+Image";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return API_BASE + path;
  return `${API_BASE}/uploads/${path}`;
}

function formatR(amount) { 
  return Number(amount || 0).toFixed(2); 
}

function escapeHtml(str) { 
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(s) {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[s];
  });
}

function toast(msg, duration = 2000) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #111;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(el);
  
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transform = 'translateY(100px)';
    setTimeout(function() {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 300);
  }, duration);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

// ==================== GLOBAL STATE ====================
let viewPageProducts = [];
let viewPageFilteredProducts = [];
let viewPageCurrentPage = 1;
const VIEW_PAGE_PRODUCTS_PER_PAGE = 12;

// Filter state
let viewPageFilters = {
  search: '',
  sort: 'newest',
  subCategory: 'all',
  brand: 'all',
  condition: 'all',
  priceRange: 'all',
  discount: 'all'
};

// Wishlist state
let wishlist = JSON.parse(localStorage.getItem('swishdrip_wishlist')) || { items: [] };

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  console.log(`${window.currentCategory || 'View'} page initialized`);
  
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
    } catch (e) {
      console.error("Error parsing auth data:", e);
    }
  }
  
  updateAuthUI();
  fetchProducts();
  initFilters();
  initSearch();
  setupEventListeners();
  setupAuthListeners();
});

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
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userGreeting) {
      userGreeting.textContent = "";
      userGreeting.style.display = "none";
    }
    if (profileLink) profileLink.style.display = "none";
  }
}

// ==================== PRODUCT FETCHING ====================
async function fetchProducts() {
  try {
    showLoading(true, `Loading ${window.currentCategory || ''} items...`);
    
    const response = await fetch(`${API_BASE}/api/products`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    // Handle response format
    if (Array.isArray(data)) {
      viewPageProducts = data;
    } else if (data.products && Array.isArray(data.products)) {
      viewPageProducts = data.products;
    } else {
      viewPageProducts = [];
    }
    
    console.log(`Loaded ${viewPageProducts.length} products`);
    
    // Filter by category
    if (window.currentCategory === 'brand') {
      viewPageProducts = viewPageProducts.filter(p => p.category === 'brand');
    } else if (window.currentCategory === 'thrift') {
      viewPageProducts = viewPageProducts.filter(p => p.category === 'thrift');
    } else if (window.currentCategory === 'sale') {
      viewPageProducts = viewPageProducts.filter(p => p.sale === true || p.sale === "true");
    }
    
    // Process products
    viewPageProducts = viewPageProducts.map(p => ({
      ...p,
      price: Number(p.price || 0),
      salePrice: Number(p.salePrice || 0),
      sale: p.sale === true || p.sale === "true",
      sizes: Array.isArray(p.sizes) ? p.sizes.map(s => ({
        size: String(s.size), 
        stock: Number(s.stock || 0)
      })) : []
    }));
    
    console.log(`Filtered to ${viewPageProducts.length} ${window.currentCategory} products`);
    
    populateFilters();
    applyFilters();
    showLoading(false);
    
  } catch (error) {
    console.error('Error loading products:', error);
    showLoading(false, `Failed to load products: ${error.message}`);
    
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.addEventListener('click', fetchProducts);
    }
  }
}

// ==================== FILTER FUNCTIONS ====================
function initFilters() {
  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    if (window.currentCategory === 'sale') {
      sortSelect.value = 'discount';
      viewPageFilters.sort = 'discount';
    }
    
    sortSelect.addEventListener('change', function(e) {
      viewPageFilters.sort = e.target.value;
      applyFilters();
    });
  }
  
  // Category filter (for sale page)
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function(e) {
      viewPageFilters.category = e.target.value;
      applyFilters();
    });
  }
  
  // Clothing type filter
  const clothingFilter = document.getElementById('clothing-filter');
  if (clothingFilter) {
    clothingFilter.addEventListener('change', function(e) {
      viewPageFilters.subCategory = e.target.value;
      applyFilters();
    });
  }
  
  // Brand filter
  const brandFilter = document.getElementById('brand-filter');
  if (brandFilter) {
    brandFilter.addEventListener('change', function(e) {
      viewPageFilters.brand = e.target.value;
      applyFilters();
    });
  }
  
  // Condition filter (thrift page)
  const conditionFilter = document.getElementById('condition-filter');
  if (conditionFilter) {
    conditionFilter.addEventListener('change', function(e) {
      viewPageFilters.condition = e.target.value;
      applyFilters();
    });
  }
  
  // Price range filter
  const priceRange = document.getElementById('price-range');
  if (priceRange) {
    priceRange.addEventListener('change', function(e) {
      viewPageFilters.priceRange = e.target.value;
      applyFilters();
    });
  }
  
  // Discount filter (sale page)
  const discountFilter = document.getElementById('discount-filter');
  if (discountFilter) {
    discountFilter.addEventListener('change', function(e) {
      viewPageFilters.discount = e.target.value;
      applyFilters();
    });
  }
  
  // Clear filters button
  const clearFilters = document.getElementById('clear-filters');
  if (clearFilters) {
    clearFilters.addEventListener('click', function() {
      clearAllFilters();
    });
  }
  
  // Reset filters button
  const resetFilters = document.getElementById('reset-filters');
  if (resetFilters) {
    resetFilters.addEventListener('click', function() {
      clearAllFilters();
    });
  }
}

function initSearch() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(function(e) {
      viewPageFilters.search = e.target.value.toLowerCase();
      applyFilters();
    }, 300));
  }
}

function populateFilters() {
  // Get unique clothing types
  const clothingTypes = [...new Set(viewPageProducts.map(p => 
    (p.clothingType || '').toLowerCase()).filter(t => t))];
  const clothingFilter = document.getElementById('clothing-filter');
  
  if (clothingFilter && clothingTypes.length > 0) {
    let optionsHTML = '<option value="all">All Types</option>';
    clothingTypes.forEach(function(t) {
      optionsHTML += `<option value="${t}">${capitalize(t)}</option>`;
    });
    clothingFilter.innerHTML = optionsHTML;
  }
  
  // Get unique brands (for brand page)
  const brands = [...new Set(viewPageProducts.map(p => p.brand).filter(b => b))];
  const brandFilter = document.getElementById('brand-filter');
  
  if (brandFilter && brands.length > 0) {
    let optionsHTML = '<option value="all">All Brands</option>';
    brands.forEach(function(b) {
      optionsHTML += `<option value="${b}">${b}</option>`;
    });
    brandFilter.innerHTML = optionsHTML;
    
    // Popular brands in sidebar
    const popularBrands = document.getElementById('popular-brands');
    if (popularBrands) {
      const topBrands = brands.slice(0, 6);
      let brandsHTML = '';
      topBrands.forEach(function(brand) {
        brandsHTML += `<span class="brand-tag" data-brand="${brand}">${brand}</span>`;
      });
      popularBrands.innerHTML = brandsHTML;
      
      popularBrands.querySelectorAll('.brand-tag').forEach(function(tag) {
        tag.addEventListener('click', function() {
          viewPageFilters.brand = tag.dataset.brand;
          if (brandFilter) brandFilter.value = tag.dataset.brand;
          applyFilters();
        });
      });
    }
  }
  
  // Value picks for sale page
  if (window.currentCategory === 'sale') {
    const valuePicks = document.getElementById('value-picks');
    if (valuePicks) {
      const saleItems = viewPageProducts.filter(p => p.sale).map(p => {
        const discount = ((p.price - (p.salePrice || p.price)) / p.price) * 100;
        return { ...p, discount };
      });
      
      const topDeals = saleItems.sort((a, b) => b.discount - a.discount).slice(0, 3);
      
      valuePicks.innerHTML = topDeals.map(item => `
        <div class="value-item" data-id="${item._id}">
          <img src="${buildImageUrl(item.image)}" alt="${item.name}" 
               onerror="this.src='https://via.placeholder.com/50x50?text=Product'">
          <div class="value-item-details">
            <div class="value-item-name">${escapeHtml(item.name)}</div>
            <div class="value-item-price">R${formatR(item.salePrice || item.price)}</div>
          </div>
        </div>
      `).join('');
      
      valuePicks.querySelectorAll('.value-item').forEach(function(item) {
        item.addEventListener('click', function() {
          const product = viewPageProducts.find(p => p._id === item.dataset.id);
          if (product) openProductModal(product);
        });
      });
    }
  }
}

function applyFilters() {
  // Start with all products
  viewPageFilteredProducts = [...viewPageProducts];
  
  // Search filter
  if (viewPageFilters.search) {
    viewPageFilteredProducts = viewPageFilteredProducts.filter(function(product) {
      const searchTerm = viewPageFilters.search.toLowerCase();
      return (
        (product.name && product.name.toLowerCase().includes(searchTerm)) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm))
      );
    });
  }
  
  // Sub-category filter
  if (viewPageFilters.subCategory !== 'all') {
    viewPageFilteredProducts = viewPageFilteredProducts.filter(function(product) {
      return product.clothingType && product.clothingType.toLowerCase() === viewPageFilters.subCategory;
    });
  }
  
  // Brand filter
  if (viewPageFilters.brand !== 'all') {
    viewPageFilteredProducts = viewPageFilteredProducts.filter(function(product) {
      return product.brand === viewPageFilters.brand;
    });
  }
  
  // Condition filter
  if (viewPageFilters.condition !== 'all') {
    viewPageFilteredProducts = viewPageFilteredProducts.filter(function(product) {
      return product.condition === viewPageFilters.condition;
    });
  }
  
  // Price range filter
  if (viewPageFilters.priceRange !== 'all') {
    viewPageFilteredProducts = viewPageFilteredProducts.filter(function(product) {
      const price = product.sale && product.salePrice ? product.salePrice : product.price;
      const range = viewPageFilters.priceRange;
      
      if (range === '0-50') return price <= 50;
      if (range === '50-100') return price >= 50 && price <= 100;
      if (range === '100-200') return price >= 100 && price <= 200;
      if (range === '200+') return price >= 200;
      if (range === '0-100') return price <= 100;
      if (range === '100-300') return price >= 100 && price <= 300;
      if (range === '300-500') return price >= 300 && price <= 500;
      if (range === '500+') return price >= 500;
      if (range === '250-500') return price >= 250 && price <= 500;
      
      return true;
    });
  }
  
  // Discount filter
  if (viewPageFilters.discount !== 'all') {
    viewPageFilteredProducts = viewPageFilteredProducts.filter(function(product) {
      if (!product.sale) return false;
      const discount = ((product.price - (product.salePrice || product.price)) / product.price) * 100;
      const minDiscount = parseInt(viewPageFilters.discount);
      return discount >= minDiscount;
    });
  }
  
  // Sort products
  sortProducts();
  
  // Update display
  updateResultsCount();
  renderProducts();
  updatePagination();
}

function sortProducts() {
  viewPageFilteredProducts.sort(function(a, b) {
    switch (viewPageFilters.sort) {
      case 'price-low':
        const priceA = a.sale && a.salePrice ? a.salePrice : a.price;
        const priceB = b.sale && b.salePrice ? b.salePrice : b.price;
        return priceA - priceB;
        
      case 'price-high':
        const priceA2 = a.sale && a.salePrice ? a.salePrice : a.price;
        const priceB2 = b.sale && b.salePrice ? b.salePrice : b.price;
        return priceB2 - priceA2;
        
      case 'sale':
      case 'discount':
        const aDiscount = a.sale ? ((a.price - (a.salePrice || a.price)) / a.price) * 100 : 0;
        const bDiscount = b.sale ? ((b.price - (b.salePrice || b.price)) / b.price) * 100 : 0;
        return bDiscount - aDiscount;
        
      case 'condition':
        const conditionOrder = { like_new: 3, good: 2, fair: 1 };
        const aOrder = conditionOrder[a.condition] || 0;
        const bOrder = conditionOrder[b.condition] || 0;
        return bOrder - aOrder;
        
      case 'newest':
      default:
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    }
  });
}

function clearAllFilters() {
  viewPageFilters = {
    search: '',
    sort: window.currentCategory === 'sale' ? 'discount' : 'newest',
    subCategory: 'all',
    brand: 'all',
    condition: 'all',
    priceRange: 'all',
    discount: 'all'
  };
  
  // Reset form values
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = viewPageFilters.sort;
  
  const clothingFilter = document.getElementById('clothing-filter');
  if (clothingFilter) clothingFilter.value = 'all';
  
  const brandFilter = document.getElementById('brand-filter');
  if (brandFilter) brandFilter.value = 'all';
  
  const conditionFilter = document.getElementById('condition-filter');
  if (conditionFilter) conditionFilter.value = 'all';
  
  const priceRange = document.getElementById('price-range');
  if (priceRange) priceRange.value = 'all';
  
  const discountFilter = document.getElementById('discount-filter');
  if (discountFilter) discountFilter.value = 'all';
  
  viewPageCurrentPage = 1;
  applyFilters();
}

// ==================== WISHLIST FUNCTIONS ====================
function addWishlistHeartToProductHTML(productId, isInWishlist) {
  return `
    <button class="product-heart ${isInWishlist ? 'active' : ''}" 
            data-product-id="${productId}"
            onclick="toggleWishlist('${productId}', event)"
            title="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}"
            style="position: absolute; top: 10px; right: 10px; background: rgba(255, 255, 255, 0.9); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; transition: all 0.2s ease; z-index: 2;">
      ${isInWishlist ? '❤️' : '🤍'}
    </button>
  `;
}

async function toggleWishlist(productId, event) {
  event.stopPropagation();
  event.preventDefault();
  
  // Check if user is authenticated
  const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
  const authToken = localStorage.getItem('auth_token') || null;
  
  if (!currentUser || !authToken) {
    // Show auth modal
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.style.display = 'flex';
      showLoginForm();
      const authMessage = document.getElementById('auth-message');
      if (authMessage) {
        authMessage.textContent = "Please login to manage your wishlist";
        authMessage.className = "info";
        authMessage.style.display = "block";
      }
    }
    return false;
  }
  
  const index = wishlist.items.indexOf(productId);
  
  if (index === -1) {
    // Add to wishlist
    wishlist.items.push(productId);
    localStorage.setItem('swishdrip_wishlist', JSON.stringify(wishlist));
    toast('Added to wishlist!');
    
    // Update the heart button
    const heartBtn = event.target;
    heartBtn.classList.add('active');
    heartBtn.innerHTML = '❤️';
    heartBtn.title = 'Remove from wishlist';
    heartBtn.style.background = 'rgba(229, 57, 53, 0.1)';
    return true;
  } else {
    // Remove from wishlist
    wishlist.items.splice(index, 1);
    localStorage.setItem('swishdrip_wishlist', JSON.stringify(wishlist));
    toast('Removed from wishlist');
    
    // Update the heart button
    const heartBtn = event.target;
    heartBtn.classList.remove('active');
    heartBtn.innerHTML = '🤍';
    heartBtn.title = 'Add to wishlist';
    heartBtn.style.background = 'rgba(255, 255, 255, 0.9)';
    return false;
  }
}

// ==================== RENDERING FUNCTIONS ====================
function updateResultsCount() {
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    const categoryName = window.currentCategory === 'brand' ? 'Brand' : 
                       window.currentCategory === 'thrift' ? 'Thrift' : 'Sale';
    resultsCount.textContent = `${viewPageFilteredProducts.length} ${categoryName} items found`;
  }
  
  const activeFilters = document.getElementById('active-filters');
  if (activeFilters) {
    const active = [];
    if (viewPageFilters.search) active.push(`Search: "${viewPageFilters.search}"`);
    if (viewPageFilters.subCategory !== 'all') active.push(`Type: ${capitalize(viewPageFilters.subCategory)}`);
    if (viewPageFilters.brand !== 'all') active.push(`Brand: ${viewPageFilters.brand}`);
    if (viewPageFilters.condition !== 'all') active.push(`Condition: ${capitalize(viewPageFilters.condition)}`);
    if (viewPageFilters.priceRange !== 'all') active.push(`Price: ${viewPageFilters.priceRange}`);
    if (viewPageFilters.discount !== 'all') active.push(`Discount: ${viewPageFilters.discount}+`);
    
    if (active.length > 0) {
      activeFilters.textContent = `(${active.join(', ')})`;
    } else {
      activeFilters.textContent = '';
    }
  }
}

function renderProducts() {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) {
    console.error('Product grid element not found!');
    return;
  }
  
  const startIndex = (viewPageCurrentPage - 1) * VIEW_PAGE_PRODUCTS_PER_PAGE;
  const endIndex = startIndex + VIEW_PAGE_PRODUCTS_PER_PAGE;
  const paginatedProducts = viewPageFilteredProducts.slice(startIndex, endIndex);
  
  if (paginatedProducts.length === 0) {
    productGrid.innerHTML = '';
    const noProducts = document.getElementById('no-products');
    if (noProducts) noProducts.style.display = 'block';
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.style.display = 'none';
    return;
  }
  
  const noProducts = document.getElementById('no-products');
  if (noProducts) noProducts.style.display = 'none';
  const pagination = document.getElementById('pagination');
  if (pagination) pagination.style.display = 'flex';
  
  let productsHTML = '';
  paginatedProducts.forEach(function(product) {
    productsHTML += createProductCardHTML(product);
  });
  
  productGrid.innerHTML = productsHTML;
  addProductCardListeners();
}

function createProductCardHTML(product) {
  const totalStock = product.sizes ? product.sizes.reduce(function(sum, size) {
    return sum + (size.stock || 0);
  }, 0) : 0;
  
  const isOutOfStock = totalStock === 0;
  const inStockSizes = product.sizes ? product.sizes.filter(function(s) {
    return s.stock > 0;
  }) : [];
  
  const imgSrc = buildImageUrl(product.image || (product.images && product.images[0]) || '');
  
  // Calculate discount
  let discountBadge = '';
  if (product.sale && product.salePrice) {
    const discount = Math.round(((product.price - product.salePrice) / product.price) * 100);
    if (discount > 0) {
      discountBadge = `<div class="sale-badge">-${discount}%</div>`;
    }
  }
  
  // Create size chips
  let sizeChipsHTML = '';
  if (product.sizes && product.sizes.length > 0) {
    sizeChipsHTML = '<div class="product-sizes">';
    inStockSizes.slice(0, 3).forEach(function(s) {
      sizeChipsHTML += `<span class="size-chip">${s.size}</span>`;
    });
    if (inStockSizes.length > 3) {
      sizeChipsHTML += `<span class="size-chip">+${inStockSizes.length - 3} more</span>`;
    }
    if (inStockSizes.length === 0) {
      sizeChipsHTML += '<span class="size-chip out-of-stock">No sizes</span>';
    }
    sizeChipsHTML += '</div>';
  }
  
  // Check if product is in wishlist
  const isInWishlist = wishlist.items.includes(product._id || product.id);
  
  return `
    <div class="product" data-id="${product._id || product.id}">
      <div style="position:relative;">
        ${discountBadge}
        ${isOutOfStock ? '<div class="out-of-stock-badge">OUT OF STOCK</div>' : ''}
        ${addWishlistHeartToProductHTML(product._id || product.id, isInWishlist)}
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(product.name)}"
             style="width:100%;height:200px;object-fit:cover;border-radius:8px;"
             onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
      </div>
      <h3 class="product-name">${escapeHtml(product.name)}</h3>
      <p class="product-price">
        ${product.sale && product.salePrice ? 
          `<strong>R${formatR(product.salePrice)}</strong> <span class="original-price">R${formatR(product.price)}</span>` : 
          `R${formatR(product.price)}`}
      </p>
      
      ${sizeChipsHTML}
      
      <!-- Stock status -->
      <p style="font-size:0.8rem; margin:8px 0; color:${isOutOfStock ? '#e74c3c' : (totalStock < 10 ? '#f39c12' : '#27ae60')}">
        ${isOutOfStock ? 'Out of Stock' : 
          (product.sizes && product.sizes.length > 0 ? 
            `${totalStock} items left • ${inStockSizes.length} sizes available` : 
            'In Stock')}
      </p>
      
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
        <button class="view-btn btn" ${isOutOfStock ? 'disabled style="opacity:0.5"' : ''}>View Details</button>
        <button class="add-btn btn" ${isOutOfStock ? 'disabled style="opacity:0.5"' : ''}>Add to Cart</button>
      </div>
    </div>
  `;
}

function addProductCardListeners() {
  // View details buttons
  document.querySelectorAll('.view-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const productId = btn.closest('.product').dataset.id;
      const product = viewPageProducts.find(function(p) {
        return p._id === productId || p.id === productId;
      });
      if (product) openProductModal(product);
    });
  });
  
  // Add to cart buttons
  document.querySelectorAll('.add-btn:not(:disabled)').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const productId = btn.closest('.product').dataset.id;
      const product = viewPageProducts.find(function(p) {
        return p._id === productId || p.id === productId;
      });
      if (product) {
        const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
        const authToken = localStorage.getItem('auth_token') || null;
        
        if (!currentUser || !authToken) {
          window.pendingCartAction = function() {
            addToCartDirect(product);
          };
          
          const authModal = document.getElementById('auth-modal');
          if (authModal) {
            authModal.style.display = 'flex';
            showLoginForm();
          }
          return;
        }
        
        addToCartDirect(product);
      }
    });
  });
  
  // Product card click
  document.querySelectorAll('.product').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (!e.target.closest('button')) {
        const productId = card.dataset.id;
        const product = viewPageProducts.find(function(p) {
          return p._id === productId || p.id === productId;
        });
        if (product) openProductModal(product);
      }
    });
  });
}

function updatePagination() {
  const totalPages = Math.ceil(viewPageFilteredProducts.length / VIEW_PAGE_PRODUCTS_PER_PAGE);
  const pagination = document.getElementById('pagination');
  
  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.style.display = 'none';
    return;
  }
  
  let paginationHTML = `
    <button class="pagination-btn prev" ${viewPageCurrentPage === 1 ? 'disabled' : ''}>
      ← Previous
    </button>
    <div class="page-numbers">
  `;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= viewPageCurrentPage - 1 && i <= viewPageCurrentPage + 1)) {
      paginationHTML += `
        <button class="pagination-btn ${i === viewPageCurrentPage ? 'active' : ''}">
          ${i}
        </button>
      `;
    } else if (i === viewPageCurrentPage - 2 || i === viewPageCurrentPage + 2) {
      paginationHTML += `<span class="page-dots">...</span>`;
    }
  }
  
  paginationHTML += `
    </div>
    <button class="pagination-btn next" ${viewPageCurrentPage === totalPages ? 'disabled' : ''}>
      Next →
    </button>
    <span class="page-info">Page ${viewPageCurrentPage} of ${totalPages}</span>
  `;
  
  pagination.innerHTML = paginationHTML;
  pagination.style.display = 'flex';
  
  // Add event listeners
  const prevBtn = pagination.querySelector('.prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (viewPageCurrentPage > 1) {
        viewPageCurrentPage--;
        renderProducts();
        updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  const nextBtn = pagination.querySelector('.next');
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (viewPageCurrentPage < totalPages) {
        viewPageCurrentPage++;
        renderProducts();
        updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  pagination.querySelectorAll('.pagination-btn:not(.prev):not(.next):not(.active)').forEach(function(btn) {
    btn.addEventListener('click', function() {
      viewPageCurrentPage = parseInt(btn.textContent);
      renderProducts();
      updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ==================== PRODUCT MODAL ====================
function openProductModal(product) {
  const modal = document.getElementById('product-modal');
  if (!modal) return;
  
  const modalName = document.getElementById('modal-name');
  const modalPrice = document.getElementById('modal-price');
  const modalDescription = document.getElementById('modal-description');
  const modalMainImg = document.getElementById('modal-main-img');
  const modalThumbs = document.getElementById('modal-thumbnails');
  const modalSizesArea = document.getElementById('modal-sizes-area');
  const modalAddCartBtn = document.getElementById('modal-add-cart-btn');
  
  if (modalName) modalName.textContent = product.name || "";
  if (modalPrice) {
    modalPrice.textContent = product.sale && product.salePrice ? 
      `R${formatR(product.salePrice)}` : `R${formatR(product.price)}`;
  }
  if (modalDescription) modalDescription.textContent = product.description || "";
  
  // Set main image
  const mainImgSrc = buildImageUrl(product.image || (product.images && product.images[0]) || '');
  if (modalMainImg) {
    modalMainImg.src = mainImgSrc;
    modalMainImg.onerror = function() {
      this.src = 'https://via.placeholder.com/500x400?text=Image+Not+Found';
    };
  }
  
  // Set thumbnails
  if (modalThumbs) {
    modalThumbs.innerHTML = "";
    const thumbs = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
    thumbs.forEach(function(src, idx) {
      const img = document.createElement("img");
      img.src = buildImageUrl(src);
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.border = idx === 0 ? "2px solid #111" : "2px solid transparent";
      img.style.cursor = "pointer";
      img.style.borderRadius = "4px";
      img.addEventListener("click", function() {
        if (modalMainImg) modalMainImg.src = buildImageUrl(src);
        modalThumbs.querySelectorAll("img").forEach(function(img) {
          img.style.border = "2px solid transparent";
        });
        this.style.border = "2px solid #111";
      });
      modalThumbs.appendChild(img);
    });
  }
  
  // Set sizes
  if (modalSizesArea) {
    modalSizesArea.innerHTML = '';
    
    if (product.sizes && product.sizes.length > 0) {
      const sizesContainer = document.createElement('div');
      sizesContainer.style.display = 'flex';
      sizesContainer.style.flexWrap = 'wrap';
      sizesContainer.style.gap = '10px';
      sizesContainer.style.marginTop = '10px';
      
      product.sizes.forEach(function(s) {
        const btn = document.createElement("button");
        btn.className = "size-btn";
        btn.textContent = s.size;
        btn.title = `${s.stock} in stock`;
        btn.disabled = s.stock === 0;
        
        if (s.stock > 0 && s.stock < 5) {
          btn.style.borderColor = '#f39c12';
        }
        
        btn.addEventListener("click", function() {
          sizesContainer.querySelectorAll(".size-btn").forEach(function(x) {
            x.classList.remove('selected');
            x.style.background = "";
            x.style.color = "";
          });
          btn.classList.add('selected');
          btn.style.background = "#111";
          btn.style.color = "#fff";
          product.selectedSize = s.size;
        });
        sizesContainer.appendChild(btn);
      });
      
      modalSizesArea.appendChild(sizesContainer);
      
      // Auto-select first available size
      const firstAvailable = product.sizes.find(s => s.stock > 0);
      if (firstAvailable && sizesContainer.firstChild) {
        const firstBtn = sizesContainer.querySelector('.size-btn:not(:disabled)');
        if (firstBtn) {
          firstBtn.click();
        }
      }
    } else {
      modalSizesArea.innerHTML = '<div style="color:#666">One size fits all</div>';
    }
  }
  
  // Set add to cart button
  if (modalAddCartBtn) {
    modalAddCartBtn.onclick = function() {
      const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
      const authToken = localStorage.getItem('auth_token') || null;
      
      if (!currentUser || !authToken) {
        window.pendingCartAction = function() {
          const price = product.sale && product.salePrice ? product.salePrice : product.price;
          addToCart(product._id || product.id, product.name, price, product.selectedSize || null, 1);
          modal.style.display = 'none';
        };
        
        modal.style.display = 'none';
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
          authModal.style.display = 'flex';
          showLoginForm();
        }
        return;
      }
      
      if (product.sizes && product.sizes.length > 0 && !product.selectedSize) {
        toast("Please pick a size.");
        return;
      }
      
      const price = product.sale && product.salePrice ? product.salePrice : product.price;
      addToCart(product._id || product.id, product.name, price, product.selectedSize || null, 1);
      modal.style.display = 'none';
    };
  }
  
  modal.style.display = 'flex';
}

// ==================== CART FUNCTIONS ====================
function addToCart(productId, name, price, size, qty) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const key = `${productId}${size ? ":" + size : ""}`;
  const existing = cart.find(function(c) {
    return c.productKey === key;
  });
  
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
  toast(`${name} added to cart`);
}

function addToCartDirect(product) {
  const price = (product.sale && product.salePrice) ? product.salePrice : product.price;
  
  if (product.sizes && product.sizes.length > 0) {
    openProductModal(product);
  } else {
    addToCart(product._id || product.id, product.name, price, null, 1);
  }
}

// ==================== AUTH MODAL FUNCTIONS ====================
function setupAuthListeners() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const authModal = document.getElementById('auth-modal');
  const closeAuth = document.getElementById('close-auth');
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const googleAuthBtn = document.getElementById('google-auth-btn');
  
  // Login button
  if (loginBtn) {
    loginBtn.addEventListener('click', function() {
      if (authModal) {
        authModal.style.display = 'flex';
        showLoginForm();
      }
    });
  }
  
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('swishdrip_wishlist');
        wishlist = { items: [] };
        updateAuthUI();
        toast("Logged out successfully");
      }
    });
  }
  
  // Close auth modal
  if (closeAuth) {
    closeAuth.addEventListener('click', function() {
      if (authModal) authModal.style.display = 'none';
    });
  }
  
  // Auth tabs
  if (loginTab) {
    loginTab.addEventListener('click', showLoginForm);
  }
  
  if (registerTab) {
    registerTab.addEventListener('click', showRegisterForm);
  }
  
  // Switch forms
  if (switchToRegister) {
    switchToRegister.addEventListener('click', function(e) {
      e.preventDefault();
      showRegisterForm();
    });
  }
  
  if (switchToLogin) {
    switchToLogin.addEventListener('click', function(e) {
      e.preventDefault();
      showLoginForm();
    });
  }
  
  // Google auth
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', function() {
      const isRegisterFormVisible = document.getElementById('register-form').style.display === 'block';
      if (isRegisterFormVisible) {
        sessionStorage.setItem('auth_intent', 'register');
      } else {
        sessionStorage.setItem('auth_intent', 'login');
      }
      window.location.href = `${API_BASE}/api/auth/google`;
    });
  }
  
  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password })
        });
        
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user_data', JSON.stringify(data.user));
          updateAuthUI();
          toast("Login successful!");
          
          if (authModal) authModal.style.display = 'none';
          
          if (window.pendingCartAction) {
            window.pendingCartAction();
            window.pendingCartAction = null;
          }
        } else {
          const error = await response.json();
          toast(`Login failed: ${error.message}`);
        }
      } catch (error) {
        toast(`Network error: ${error.message}`);
      }
    });
  }
  
  // Register form submission
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      
      try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, password: password })
        });
        
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user_data', JSON.stringify(data.user));
          updateAuthUI();
          toast("Registration successful!");
          
          if (authModal) authModal.style.display = 'none';
        } else {
          const error = await response.json();
          toast(`Registration failed: ${error.message}`);
        }
      } catch (error) {
        toast(`Network error: ${error.message}`);
      }
    });
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

function showRegisterForm() {
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginTab) loginTab.classList.remove('active');
  if (registerTab) registerTab.classList.add('active');
  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'block';
}

// ==================== UTILITY FUNCTIONS ====================
function setupEventListeners() {
  // Retry button
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', fetchProducts);
  }
  
  // Close modals
  document.querySelectorAll('.close-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

function showLoading(show, message) {
  const loadingArea = document.getElementById('loading-area');
  const loadingSpinner = document.getElementById('loading-spinner');
  const loadingMessage = document.getElementById('loading-message');
  
  if (loadingArea) {
    loadingArea.style.display = show ? 'block' : 'none';
  }
  
  if (loadingSpinner) {
    loadingSpinner.style.display = show ? 'block' : 'none';
  }
  
  if (loadingMessage) {
    loadingMessage.textContent = message || 'Loading...';
  }
}