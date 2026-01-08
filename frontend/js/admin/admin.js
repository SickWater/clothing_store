// admin/admin.js - COMPLETE PRODUCT MANAGEMENT WITH PHASE 3 UPDATES
const API_BASE = "http://localhost:5000";

// ==================== STATE ====================
let products = [];
let filteredProducts = [];
let currentPage = 1;
let productsPerPage = 10;
let imageUploader = null;
let currentProductId = null;
let searchTimeout = null;

// ==================== HELPER FUNCTIONS ====================

// Check if admin is logged in
function isAdminLoggedIn() {
  const token = localStorage.getItem('admin_token');
  const user = localStorage.getItem('admin_user');
  return !!(token && user);
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

// Get auth headers
function getAuthHeaders(formData = false) {
  const token = localStorage.getItem('admin_token');
  const headers = {};
  
  if (!formData) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  // Type-specific styling
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
  
  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(100px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  return toast;
}

// Show loading skeleton
function showSkeleton(show = true) {
  const skeletonStats = document.getElementById('skeletonStats');
  const skeletonTable = document.getElementById('skeletonTable');
  const actualTable = document.getElementById('actualTable');
  const statsContainer = document.getElementById('statsContainer');
  
  if (show) {
    if (skeletonStats) skeletonStats.style.display = 'grid';
    if (skeletonTable) skeletonTable.style.display = 'block';
    if (actualTable) actualTable.style.display = 'none';
    if (statsContainer) statsContainer.style.display = 'none';
  } else {
    if (skeletonStats) skeletonStats.style.display = 'none';
    if (skeletonTable) skeletonTable.style.display = 'none';
    if (actualTable) actualTable.style.display = 'table';
    if (statsContainer) statsContainer.style.display = 'grid';
  }
}

// Format price
function formatPrice(price) {
  return `R${parseFloat(price || 0).toFixed(2)}`;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Generate random SKU
function generateSKU(category = '') {
  const prefix = category === 'brand' ? 'BR' : 'TH';
  const random = Math.floor(10000 + Math.random() * 90000);
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}-${random}`;
}

// Format stock by sizes
function formatStockBySizes(sizes) {
  if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
    return '<span class="stock-by-size">No sizes</span>';
  }
  
  // Sort sizes in a logical order
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const numericSizes = sizes.filter(s => !isNaN(s.size)).sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  const letterSizes = sizes.filter(s => isNaN(s.size) && sizeOrder.includes(s.size.toUpperCase()))
    .sort((a, b) => sizeOrder.indexOf(a.size.toUpperCase()) - sizeOrder.indexOf(b.size.toUpperCase()));
  const otherSizes = sizes.filter(s => !sizeOrder.includes(s.size.toUpperCase()) && isNaN(s.size));
  
  const sortedSizes = [...letterSizes, ...numericSizes, ...otherSizes];
  
  const stockItems = sortedSizes.map(size => {
    const stock = size.stock || 0;
    const stockClass = stock === 0 ? 'out-of-stock' : (stock < 3 ? 'low-stock' : '');
    return `<span class="stock-size-item ${stockClass}">${size.size}:${stock}</span>`;
  });
  
  return `<div class="stock-by-size">${stockItems.join(' | ')}</div>`;
}

// Calculate total stock
function calculateTotalStock(sizes) {
  if (!sizes || !Array.isArray(sizes)) return 0;
  return sizes.reduce((total, size) => total + (parseInt(size.stock) || 0), 0);
}

// ==================== SEARCH AND FILTER FUNCTIONS ====================

function applySearchAndFilters() {
  const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('categoryFilter')?.value || '';
  const saleFilter = document.getElementById('saleFilter')?.value || '';
  const sortFilter = document.getElementById('sortFilter')?.value || 'newest';
  
  // Start with all products
  filteredProducts = [...products];
  
  // Apply search filter
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(product => 
      product.name?.toLowerCase().includes(searchTerm) ||
      product.brand?.toLowerCase().includes(searchTerm) ||
      product.sku?.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply category filter
  if (categoryFilter) {
    filteredProducts = filteredProducts.filter(product => 
      product.category === categoryFilter
    );
  }
  
  // Apply sale filter
  if (saleFilter === 'on_sale') {
    filteredProducts = filteredProducts.filter(product => product.sale === true);
  } else if (saleFilter === 'not_on_sale') {
    filteredProducts = filteredProducts.filter(product => !product.sale);
  }
  
  // Apply sorting
  filteredProducts.sort((a, b) => {
    switch (sortFilter) {
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'price_high':
        return (b.price || 0) - (a.price || 0);
      case 'price_low':
        return (a.price || 0) - (b.price || 0);
      case 'stock_high':
        return calculateTotalStock(b.sizes) - calculateTotalStock(a.sizes);
      case 'stock_low':
        return calculateTotalStock(a.sizes) - calculateTotalStock(b.sizes);
      default:
        return 0;
    }
  });
  
  // Reset to first page
  currentPage = 1;
  
  // Render filtered products
  renderProducts();
}

// Clear all filters
function clearFilters() {
  document.getElementById('productSearch').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('saleFilter').value = '';
  document.getElementById('sortFilter').value = 'newest';
  
  filteredProducts = [...products];
  currentPage = 1;
  renderProducts();
}

// Initialize search and filter listeners
function initSearchAndFilters() {
  // Search input with debounce
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applySearchAndFilters, 300);
    });
  }
  
  // Filter change listeners
  document.getElementById('categoryFilter')?.addEventListener('change', applySearchAndFilters);
  document.getElementById('saleFilter')?.addEventListener('change', applySearchAndFilters);
  document.getElementById('sortFilter')?.addEventListener('change', applySearchAndFilters);
  document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
}

// ==================== PRODUCT FORM FUNCTIONS ====================

// Initialize form steps
function initFormSteps() {
  const steps = document.querySelectorAll('.step');
  const formSteps = document.querySelectorAll('.form-step');
  
  steps.forEach(step => {
    step.addEventListener('click', () => {
      const stepNumber = step.dataset.step;
      goToStep(stepNumber);
    });
  });
  
  // Next step buttons
  document.querySelectorAll('.next-step').forEach(button => {
    button.addEventListener('click', () => {
      const nextStep = button.dataset.next;
      if (validateStep(parseInt(button.dataset.next) - 1)) {
        goToStep(nextStep);
      }
    });
  });
  
  // Previous step buttons
  document.querySelectorAll('.prev-step').forEach(button => {
    button.addEventListener('click', () => {
      const prevStep = button.dataset.prev;
      goToStep(prevStep);
    });
  });
}

// Go to specific step
function goToStep(stepNumber) {
  // Update step indicators
  document.querySelectorAll('.step').forEach(step => {
    step.classList.toggle('active', step.dataset.step === stepNumber);
  });
  
  // Show/hide form steps
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.toggle('active', step.dataset.step === stepNumber);
  });
  
  // Scroll to top of modal
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.querySelector('.modal-content').scrollTop = 0;
  }
}

// Validate current step
function validateStep(stepNumber) {
  const stepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
  if (!stepElement) return true;
  
  // Check required fields
  const requiredFields = stepElement.querySelectorAll('[required]');
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.style.borderColor = '#e53935';
      isValid = false;
      
      // Add error class
      field.parentElement.classList.add('has-error');
      
      // Show error message
      const errorMsg = field.parentElement.querySelector('.error-message') || 
                      document.createElement('div');
      errorMsg.className = 'error-message';
      errorMsg.textContent = 'This field is required';
      errorMsg.style.cssText = 'color: #e53935; font-size: 12px; margin-top: 4px;';
      
      if (!field.parentElement.querySelector('.error-message')) {
        field.parentElement.appendChild(errorMsg);
      }
    } else {
      field.style.borderColor = '';
      field.parentElement.classList.remove('has-error');
      
      const errorMsg = field.parentElement.querySelector('.error-message');
      if (errorMsg) errorMsg.remove();
    }
  });
  
  // Special validation for step 4 (images)
  if (stepNumber === 4) {
    if (imageUploader && imageUploader.files.length === 0 && 
        (!currentProductId || imageUploader.existingImages.length === 0)) {
      showToast('Please upload at least one image for the product.', 'warning');
      isValid = false;
    }
  }
  
  // Special validation for step 2 (pricing)
  if (stepNumber === 2) {
    const price = document.getElementById('price');
    const salePrice = document.getElementById('salePrice');
    const onSale = document.getElementById('onSale');
    
    if (price && parseFloat(price.value) <= 0) {
      showToast('Price must be greater than 0', 'warning');
      isValid = false;
    }
    
    if (onSale && onSale.checked && salePrice && parseFloat(salePrice.value) <= 0) {
      showToast('Sale price must be greater than 0', 'warning');
      isValid = false;
    }
  }
  
  return isValid;
}

// Initialize size management
function initSizeManagement() {
  const tableBody = document.getElementById('sizesTableBody');
  const totalStockEl = document.getElementById('totalStock');
  
  // Preset buttons
  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => {
      const preset = button.dataset.preset;
      
      if (preset === 'clear') {
        tableBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
              No sizes added yet. Add sizes or use presets.
            </td>
          </tr>
        `;
        updateStockTotal();
        return;
      }
      
      // Clear existing rows
      tableBody.innerHTML = '';
      
      // Add preset sizes
      const sizes = getPresetSizes(preset);
      sizes.forEach(size => addSizeRow(size.size, size.stock));
      
      updateStockTotal();
    });
  });
  
  // Add size button
  document.getElementById('addSizeBtn')?.addEventListener('click', () => {
    const sizeInput = document.getElementById('newSize');
    const stockInput = document.getElementById('newStock');
    
    if (!sizeInput.value.trim()) {
      showToast('Please enter a size', 'warning');
      return;
    }
    
    addSizeRow(sizeInput.value.trim(), parseInt(stockInput.value) || 0);
    
    // Clear inputs
    sizeInput.value = '';
    stockInput.value = '';
    
    updateStockTotal();
  });
}

// Get preset sizes
function getPresetSizes(preset) {
  const presets = {
    shirt: [
      { size: 'XS', stock: 5 },
      { size: 'S', stock: 10 },
      { size: 'M', stock: 15 },
      { size: 'L', stock: 10 },
      { size: 'XL', stock: 5 },
      { size: 'XXL', stock: 3 }
    ],
    pants: [
      { size: '28', stock: 5 },
      { size: '30', stock: 8 },
      { size: '32', stock: 12 },
      { size: '34', stock: 10 },
      { size: '36', stock: 6 },
      { size: '38', stock: 4 }
    ],
    shoes: [
      { size: '6', stock: 3 },
      { size: '7', stock: 5 },
      { size: '8', stock: 8 },
      { size: '9', stock: 10 },
      { size: '10', stock: 7 },
      { size: '11', stock: 4 },
      { size: '12', stock: 2 }
    ]
  };
  
  return presets[preset] || [];
}

// Add size row to table
function addSizeRow(size, stock = 0) {
  const tableBody = document.getElementById('sizesTableBody');
  
  // Remove empty row if present
  const emptyRow = tableBody.querySelector('.empty-row');
  if (emptyRow) emptyRow.remove();
  
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>
      <input type="text" class="size-input" value="${size}" placeholder="Size">
    </td>
    <td>
      <input type="number" class="stock-input" value="${stock}" min="0" placeholder="Stock">
    </td>
    <td>
      <span class="stock-status ${getStockStatusClass(stock)}">
        ${getStockStatusText(stock)}
      </span>
    </td>
    <td>
      <button type="button" class="btn-icon remove-size" title="Remove size">
        ✕
      </button>
    </td>
  `;
  
  // Add event listeners
  const sizeInput = row.querySelector('.size-input');
  sizeInput.addEventListener('blur', () => {
    if (!sizeInput.value.trim()) {
      row.remove();
      updateStockTotal();
    }
  });
  
  const stockInput = row.querySelector('.stock-input');
  stockInput.addEventListener('input', updateStockTotal);
  
  const removeBtn = row.querySelector('.remove-size');
  removeBtn.addEventListener('click', () => {
    row.remove();
    updateStockTotal();
    
    // Add empty row if no sizes left
    if (tableBody.children.length === 0) {
      tableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
            No sizes added yet. Add sizes or use presets.
          </td>
        </tr>
      `;
    }
  });
  
  tableBody.appendChild(row);
}

// Update total stock display
function updateStockTotal() {
  const stockInputs = document.querySelectorAll('.stock-input');
  let total = 0;
  
  stockInputs.forEach(input => {
    total += parseInt(input.value) || 0;
  });
  
  const totalStockEl = document.getElementById('totalStock');
  const statusEl = document.querySelector('.stock-status');
  
  if (totalStockEl) totalStockEl.textContent = total;
  if (statusEl) {
    statusEl.className = `stock-status ${getStockStatusClass(total)}`;
    statusEl.textContent = getStockStatusText(total);
  }
}

// Get stock status class
function getStockStatusClass(stock) {
  if (stock === 0) return 'out-of-stock';
  if (stock < 10) return 'low-stock';
  return 'in-stock';
}

// Get stock status text
function getStockStatusText(stock) {
  if (stock === 0) return 'Out of Stock';
  if (stock < 10) return 'Low Stock';
  return 'In Stock';
}

// Get all sizes data
function getSizesData() {
  const sizes = [];
  const rows = document.querySelectorAll('#sizesTableBody tr:not(.empty-row)');
  
  rows.forEach(row => {
    const sizeInput = row.querySelector('.size-input');
    const stockInput = row.querySelector('.stock-input');
    
    if (sizeInput && stockInput) {
      sizes.push({
        size: sizeInput.value.trim(),
        stock: parseInt(stockInput.value) || 0
      });
    }
  });
  
  return sizes;
}

// ==================== PRODUCT CRUD OPERATIONS ====================

// Open add product modal
function openAddModal() {
  currentProductId = null;
  
  // Reset form
  document.getElementById('productForm').reset();
  document.getElementById('modalTitle').textContent = 'Add New Product';
  document.getElementById('productId').value = '';
  
  // Reset image uploader
  if (imageUploader) {
    imageUploader.clear();
  }
  
  // Reset sizes table
  const tableBody = document.getElementById('sizesTableBody');
  tableBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
        No sizes added yet. Add sizes or use presets.
      </td>
    </tr>
  `;
  
  // Update stock total
  updateStockTotal();
  
  // Reset steps
  goToStep('1');
  
  // Show modal
  document.getElementById('productModal').style.display = 'flex';
}

// Open edit product modal
async function openEditModal(productId) {
  try {
    // Show loading state in modal
    const modalContent = document.querySelector('#productModal .modal-content');
    const originalContent = modalContent.innerHTML;
    
    modalContent.innerHTML = `
      <div class="skeleton-overlay">
        <div class="skeleton-overlay-content">
          <div class="skeleton-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
      ${originalContent}
    `;
    
    document.getElementById('productModal').style.display = 'flex';
    
    // Fetch product details
    const response = await fetch(`${API_BASE}/api/products/${productId}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.status}`);
    }
    
    const data = await response.json();
    const product = data.product || data;
    
    currentProductId = productId;
    
    // Remove loading overlay
    const overlay = modalContent.querySelector('.skeleton-overlay');
    if (overlay) overlay.remove();
    
    // Set modal title
    document.getElementById('modalTitle').textContent = `Edit: ${product.name}`;
    document.getElementById('productId').value = productId;
    
    // Fill basic info
    document.getElementById('name').value = product.name || '';
    document.getElementById('description').value = product.description || '';
    document.getElementById('shortDescription').value = product.shortDescription || '';
    
    // Fill pricing
    document.getElementById('price').value = product.price || 0;
    document.getElementById('costPrice').value = product.costPrice || 0;
    document.getElementById('onSale').checked = product.sale || false;
    document.getElementById('salePrice').value = product.salePrice || 0;
    document.getElementById('saleEndDate').value = product.saleEndDate || '';
    
    // Toggle sale price section
    toggleSalePriceSection();
    
    // Fill categories
    document.getElementById('category').value = product.category || '';
    document.getElementById('clothingType').value = product.clothingType || '';
    document.getElementById('brand').value = product.brand || '';
    document.getElementById('gender').value = product.gender || 'unisex';
    document.getElementById('condition').value = product.condition || 'new';
    document.getElementById('subCategory').value = product.subCategory || '';
    
    // Fill colors and tags
    document.getElementById('colors').value = Array.isArray(product.colors) 
      ? product.colors.join(', ') 
      : product.colors || '';
    
    document.getElementById('tags').value = Array.isArray(product.tags) 
      ? product.tags.join(', ') 
      : product.tags || '';
    
    // Fill inventory
    document.getElementById('sku').value = product.sku || '';
    document.getElementById('barcode').value = product.barcode || '';
    document.getElementById('weight').value = product.weight || 0;
    
    // Fill dimensions
    if (product.dimensions) {
      document.getElementById('dimLength').value = product.dimensions.length || 0;
      document.getElementById('dimWidth').value = product.dimensions.width || 0;
      document.getElementById('dimHeight').value = product.dimensions.height || 0;
    }
    
    // Fill notes
    document.getElementById('notes').value = product.notes || '';
    
    // Fill sizes
    const tableBody = document.getElementById('sizesTableBody');
    tableBody.innerHTML = '';
    
    if (product.sizes && product.sizes.length > 0) {
      product.sizes.forEach(size => {
        addSizeRow(size.size, size.stock || 0);
      });
    } else {
      tableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
            No sizes added yet. Add sizes or use presets.
          </td>
        </tr>
      `;
    }
    
    updateStockTotal();
    
    // Handle images
    if (imageUploader) {
      imageUploader.clear();
      
      // Add existing images
      const existingImages = [];
      if (product.image) existingImages.push(product.image);
      if (product.images && Array.isArray(product.images)) {
        existingImages.push(...product.images.filter(img => img !== product.image));
      }
      
      imageUploader.addExistingImages(existingImages);
    }
    
    // Go to first step
    goToStep('1');
    
  } catch (error) {
    console.error('Error loading product:', error);
    showToast(`Failed to load product: ${error.message}`, 'error');
    closeProductModal();
  }
}

// Save product (add or update)
async function saveProduct(event) {
  event.preventDefault();
  
  if (!validateStep(5)) {
    showToast('Please fix errors in the form', 'error');
    return;
  }
  
  // Disable submit button and show loading
  const submitBtn = document.getElementById('submitProductBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  submitBtn.disabled = true;
  
  // Add loading overlay to modal
  const modalContent = document.querySelector('#productModal .modal-content');
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'skeleton-overlay';
  loadingOverlay.innerHTML = `
    <div class="skeleton-overlay-content">
      <div class="skeleton-spinner"></div>
      <p>Saving product...</p>
    </div>
  `;
  modalContent.appendChild(loadingOverlay);

  try {
    // Get form data
    const formData = new FormData();
    const isEdit = !!currentProductId;
    
    // Add basic fields
    formData.append('name', document.getElementById('name').value.trim());
    formData.append('description', document.getElementById('description').value.trim());
    formData.append('shortDescription', document.getElementById('shortDescription').value.trim());
    formData.append('price', parseFloat(document.getElementById('price').value));
    formData.append('costPrice', parseFloat(document.getElementById('costPrice').value) || 0);
    formData.append('sale', document.getElementById('onSale').checked);
    formData.append('salePrice', parseFloat(document.getElementById('salePrice').value) || 0);
    formData.append('category', document.getElementById('category').value);
    formData.append('clothingType', document.getElementById('clothingType').value);
    formData.append('brand', document.getElementById('brand').value.trim());
    formData.append('gender', document.getElementById('gender').value);
    formData.append('condition', document.getElementById('condition').value);
    formData.append('subCategory', document.getElementById('subCategory').value.trim());
    
    // Colors and tags as arrays
    const colors = document.getElementById('colors').value
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    formData.append('colors', JSON.stringify(colors));
    
    const tags = document.getElementById('tags').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    formData.append('tags', JSON.stringify(tags));
    
    // SKU and barcode
    formData.append('sku', document.getElementById('sku').value.trim() || 
      generateSKU(document.getElementById('category').value));
    formData.append('barcode', document.getElementById('barcode').value.trim());
    
    // Weight and dimensions
    formData.append('weight', parseFloat(document.getElementById('weight').value) || 0);
    
    const dimensions = {
      length: parseFloat(document.getElementById('dimLength').value) || 0,
      width: parseFloat(document.getElementById('dimWidth').value) || 0,
      height: parseFloat(document.getElementById('dimHeight').value) || 0
    };
    formData.append('dimensions', JSON.stringify(dimensions));
    
    // Notes
    formData.append('notes', document.getElementById('notes').value.trim());
    
    // Sizes
    const sizes = getSizesData();
    formData.append('sizes', JSON.stringify(sizes));
    
    // Sale end date if exists
    const saleEndDate = document.getElementById('saleEndDate').value;
    if (saleEndDate) {
      formData.append('saleEndDate', saleEndDate);
    }
    
    // Add images from uploader
    if (imageUploader) {
      const imageData = imageUploader.getAllImages();
      
      // Add new files
      imageData.files.forEach((file, index) => {
        if (index === imageData.mainImageIndex) {
          formData.append('image', file);
        } else {
          formData.append('images', file);
        }
      });
      
      // Add existing images
      if (imageData.existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(imageData.existingImages));
      }
    }
    
    // Determine endpoint and method
    const url = isEdit 
      ? `${API_BASE}/api/products/${currentProductId}`
      : `${API_BASE}/api/products`;
    
    const method = isEdit ? 'PUT' : 'POST';
    
    // Send request
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(
        isEdit ? 'Product updated successfully!' : 'Product added successfully!',
        'success'
      );
      
      // Remove loading overlay
      if (loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
      
      // Show success message in modal briefly
      const successOverlay = document.createElement('div');
      successOverlay.className = 'skeleton-overlay';
      successOverlay.innerHTML = `
        <div class="skeleton-overlay-content">
          <div style="color: #4CAF50; font-size: 48px; margin-bottom: 16px;">✓</div>
          <p>Product saved successfully!</p>
        </div>
      `;
      modalContent.appendChild(successOverlay);
      
      // Close modal and refresh products after delay
      setTimeout(() => {
        closeProductModal();
        // Show skeleton during refresh
        showSkeleton(true);
        setTimeout(() => {
          loadProducts();
        }, 300);
      }, 1500);
      
    } else {
      throw new Error(data.message || 'Failed to save product');
    }
    
  } catch (error) {
    console.error('Error saving product:', error);
    showToast(`Failed to save product: ${error.message}`, 'error');
    
    // Remove loading overlay
    if (loadingOverlay.parentNode) {
      loadingOverlay.parentNode.removeChild(loadingOverlay);
    }
    
    // Re-enable submit button
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// Delete product
async function deleteProduct(productId) {
  const product = products.find(p => p._id === productId);
  if (!product) return;
  
  if (!confirm(`Are you sure you want to delete "${product.name}"?\n\nThis will mark it as inactive but keep it in the database.`)) {
    return;
  }
  
  // Show skeleton during deletion
  showSkeleton(true);
  
  try {
    const response = await fetch(`${API_BASE}/api/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      showToast(`Product "${product.name}" deleted successfully!`, 'success');
      // Keep skeleton shown briefly, then refresh
      setTimeout(() => {
        loadProducts();
      }, 500);
    } else {
      const data = await response.json();
      throw new Error(data.message || 'Failed to delete product');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showToast(`Failed to delete product: ${error.message}`, 'error');
    // Hide skeleton on error
    showSkeleton(false);
  }
}

// Close product modal
function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

// Toggle sale price section
function toggleSalePriceSection() {
  const onSale = document.getElementById('onSale');
  const salePriceSection = document.getElementById('salePriceSection');
  const salePriceInput = document.getElementById('salePrice');
  
  if (onSale && salePriceSection) {
    salePriceSection.style.display = onSale.checked ? 'flex' : 'none';
    salePriceInput.disabled = !onSale.checked;
    
    if (!onSale.checked) {
      salePriceInput.value = '';
    }
  }
}

// ==================== PRODUCT LISTING ====================

// Load products from API
async function loadProducts() {
  if (!requireAuth()) return;
  
  // Skeleton is already shown by the HTML script
  
  try {
    const response = await fetch(`${API_BASE}/api/products?raw=true`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle response format
    if (Array.isArray(data)) {
      products = data;
    } else if (data.products && Array.isArray(data.products)) {
      products = data.products;
    } else {
      products = [];
    }
    
    // Initialize filtered products
    filteredProducts = [...products];
    
    // Render products
    renderProducts();
    
    // Update stats
    updateStats();
    
    // Hide skeleton and show actual content
    showSkeleton(false);
    
    showToast(`Loaded ${products.length} products`, 'success', 2000);
    
  } catch (error) {
    console.error('❌ Error loading products:', error);
    showToast(`Failed to load products: ${error.message}`, 'error');
    
    // Hide skeleton on error
    showSkeleton(false);
    
    // Show error in table
    const tbody = document.getElementById('productsTbody');
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 40px; color: #e53935;">
          ❌ Error loading products: ${error.message}
          <br><br>
          <button class="btn primary" onclick="loadProducts()">Retry</button>
        </td>
      </tr>
    `;
  }
}

// Render products table
function renderProducts() {
  const tbody = document.getElementById('productsTbody');
  const emptyMsg = document.getElementById('emptyMsg');
  
  if (filteredProducts.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    emptyMsg.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h3 style="color: #666; margin-bottom: 10px;">No products found</h3>
        <p style="color: #999; margin-bottom: 20px;">Try adjusting your search or filters</p>
        <button class="btn primary" onclick="clearFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }
  
  emptyMsg.style.display = 'none';
  tbody.innerHTML = '';
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  paginatedProducts.forEach(product => {
    const row = document.createElement('tr');
    
    // Get stock info
    const totalStock = calculateTotalStock(product.sizes);
    const stockStatus = totalStock === 0 ? 'out-of-stock' : (totalStock < 10 ? 'low-stock' : 'in-stock');
    
    // Image
    const imgSrc = product.image 
      ? (product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`)
      : 'https://via.placeholder.com/72x72?text=No+Image';
    
    // Category badge
    const categoryBadge = product.category === 'brand' 
      ? '<span class="category-badge brand">🏷️ Brand</span>'
      : '<span class="category-badge thrift">🔄 Thrift</span>';
    
    // Sale badge
    const saleBadge = product.sale 
      ? '<span style="color: #4CAF50; font-weight: bold;">✓</span>' 
      : '<span style="color: #666;">✗</span>';
    
    // Format stock by sizes
    const stockBySizes = formatStockBySizes(product.sizes);
    
    row.innerHTML = `
      <td>
        <img src="${imgSrc}" 
             alt="${product.name}"
             class="product-image"
             onerror="this.src='https://via.placeholder.com/72x72?text=No+Image'">
      </td>
      <td>
        <div style="font-weight: 600; margin-bottom: 4px;">${product.name || 'Unnamed Product'}</div>
        <div style="font-size: 12px; color: #666;">${product.brand || 'No brand'}</div>
        <div style="font-size: 11px; color: #999; margin-top: 2px;">${product.sku || 'No SKU'}</div>
      </td>
      <td>${categoryBadge}</td>
      <td>${product.clothingType || 'N/A'}</td>
      <td><strong>${formatPrice(product.price)}</strong></td>
      <td>${saleBadge}</td>
      <td>${product.sale ? formatPrice(product.salePrice) : '-'}</td>
      <td>
        ${stockBySizes}
        <div style="margin-top: 4px; font-size: 11px; color: #666;">
          Total: ${totalStock} units
        </div>
      </td>
      <td>
        <div style="font-size: 12px;">${formatDate(product.createdAt)}</div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn small" onclick="editProduct('${product._id}')">
            <span style="font-size: 12px;">✏️ Edit</span>
          </button>
          <button class="btn danger small" onclick="deleteProductFromList('${product._id}')">
            <span style="font-size: 12px;">🗑️ Delete</span>
          </button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Render pagination
  renderPagination();
}

// Delete product from list (wrapper function)
function deleteProductFromList(productId) {
  deleteProduct(productId);
}

// Update stats
function updateStats() {
  const totalProducts = products.length;
  const brandProducts = products.filter(p => p.category === 'brand').length;
  const thriftProducts = products.filter(p => p.category === 'thrift').length;
  const saleProducts = products.filter(p => p.sale).length;
  const totalStock = products.reduce((sum, p) => sum + calculateTotalStock(p.sizes), 0);
  
  // Create or update stats container
  let statsContainer = document.getElementById('statsContainer');
  
  if (!statsContainer) {
    statsContainer = document.createElement('div');
    statsContainer.id = 'statsContainer';
    statsContainer.className = 'stats-grid';
    
    const header = document.querySelector('.dashboard-header');
    header.parentNode.insertBefore(statsContainer, header.nextSibling);
  }
  
  statsContainer.innerHTML = `
    <div class="stat-card">
      <h3>Total Products</h3>
      <div class="value">${totalProducts}</div>
    </div>
    <div class="stat-card">
      <h3>Brand Items</h3>
      <div class="value">${brandProducts}</div>
    </div>
    <div class="stat-card">
      <h3>Thrift Items</h3>
      <div class="value">${thriftProducts}</div>
    </div>
    <div class="stat-card">
      <h3>On Sale</h3>
      <div class="value">${saleProducts}</div>
    </div>
    <div class="stat-card">
      <h3>Total Stock</h3>
      <div class="value">${totalStock}</div>
    </div>
  `;
}

// Render pagination
function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  
  if (totalPages <= 1) return;
  
  let pagination = document.getElementById('pagination');
  
  if (!pagination) {
    pagination = document.createElement('div');
    pagination.id = 'pagination';
    pagination.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 20px;
      padding: 10px;
    `;
    
    const tableWrap = document.querySelector('.table-wrap');
    tableWrap.parentNode.insertBefore(pagination, tableWrap.nextSibling);
  }
  
  let paginationHTML = `
    <button class="btn small" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      ← Previous
    </button>
  `;
  
  // Show page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      paginationHTML += `
        <button class="btn small ${i === currentPage ? 'primary' : ''}" onclick="changePage(${i})">
          ${i}
        </button>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      paginationHTML += `<span style="color: #999;">...</span>`;
    }
  }
  
  paginationHTML += `
    <button class="btn small" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      Next →
    </button>
    <span style="color: #666; font-size: 14px; margin-left: 10px;">
      Page ${currentPage} of ${totalPages} (${filteredProducts.length} products)
    </span>
  `;
  
  pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  if (page < 1 || page > Math.ceil(filteredProducts.length / productsPerPage)) return;
  currentPage = page;
  renderProducts();
}

// ==================== EVENT HANDLERS ====================

// Logout
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    // Show loading skeleton
    document.body.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #111 0%, #333 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      ">
        <div class="skeleton-spinner" style="margin-bottom: 20px;"></div>
        <p>Logging out...</p>
      </div>
    `;
    
    setTimeout(() => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = 'admin-login.html';
    }, 500);
  }
}

// Refresh products
function refreshProducts() {
  showSkeleton(true);
  setTimeout(() => {
    loadProducts();
  }, 300);
}

// ==================== INITIALIZATION ====================

async function initializeAdmin() {
  console.log('🚀 Admin panel initializing...');
  
  // Check authentication
  if (!requireAuth()) {
    return;
  }
  
  // Display user info
  try {
    const userData = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const brandElement = document.querySelector('.brand');
    if (brandElement && userData.email) {
      brandElement.textContent = `Swish Drip Admin - ${userData.email}`;
    }
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
  
  // Initialize search and filters
  initSearchAndFilters();
  
  // Initialize form steps
  initFormSteps();
  
  // Initialize size management
  initSizeManagement();
  
  // Initialize image uploader
  try {
    const ImageUploaderModule = await import('./image-uploader.js');
    imageUploader = new ImageUploaderModule.default({
      previewContainer: document.getElementById('imagePreviews'),
      uploadArea: document.getElementById('imageUploadArea'),
      onFilesChange: (files) => {
        console.log(`Images selected: ${files.length}`);
      }
    });
  } catch (error) {
    console.error('Failed to load image uploader:', error);
    // Fallback if module not available
    imageUploader = {
      files: [],
      existingImages: [],
      clear: () => {},
      addExistingImages: () => {},
      getAllImages: () => ({ files: [], existingImages: [] })
    };
  }
  
  // Event listeners
  document.getElementById('refreshBtn')?.addEventListener('click', refreshProducts);
  document.getElementById('openAddBtn')?.addEventListener('click', openAddModal);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  
  // Product modal events
  document.getElementById('productModalClose')?.addEventListener('click', closeProductModal);
  document.getElementById('productForm')?.addEventListener('submit', saveProduct);
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('productModal');
    if (e.target === modal) {
      closeProductModal();
    }
  });
  
  // Sale toggle
  document.getElementById('onSale')?.addEventListener('change', toggleSalePriceSection);
  
  // Short description character count
  const shortDescInput = document.getElementById('shortDescription');
  const shortDescCount = document.getElementById('shortDescCount');
  
  if (shortDescInput && shortDescCount) {
    shortDescInput.addEventListener('input', () => {
      shortDescCount.textContent = shortDescInput.value.length;
    });
  }
  
  // Load products (skeleton already shown by HTML)
  await loadProducts();
}

// Make functions available globally
window.editProduct = openEditModal;
window.deleteProductFromList = deleteProductFromList;
window.openAddModal = openAddModal;
window.loadProducts = loadProducts;
window.changePage = changePage;
window.clearFilters = clearFilters;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAdmin);