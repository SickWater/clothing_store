// admin/orders.js - Order Management System
const API_BASE = "http://localhost:5000";

// State
let orders = [];
let filteredOrders = [];
let currentOrderId = null;

// ==================== HELPER FUNCTIONS ====================

// Check authentication
function isAdminLoggedIn() {
  const token = localStorage.getItem('admin_token');
  const user = localStorage.getItem('admin_user');
  return !!(token && user);
}

function requireAuth() {
  if (!isAdminLoggedIn()) {
    window.location.href = '../admin/admin-login.html';
    return false;
  }
  return true;
}

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
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

// Show skeleton loaders for orders
function showOrderSkeleton(show = true) {
  const skeletonStats = document.getElementById('skeletonOrderStats');
  const skeletonFilters = document.getElementById('skeletonOrderFilters');
  const skeletonOrders = document.getElementById('skeletonOrdersList');
  const actualFilters = document.getElementById('actualOrderFilters');
  const actualOrders = document.getElementById('ordersList');
  const orderStats = document.getElementById('orderStats');
  const emptyState = document.getElementById('emptyState');
  
  if (show) {
    if (skeletonStats) skeletonStats.style.display = 'grid';
    if (skeletonFilters) skeletonFilters.style.display = 'flex';
    if (skeletonOrders) skeletonOrders.style.display = 'block';
    
    if (actualFilters) actualFilters.style.display = 'none';
    if (actualOrders) actualOrders.style.display = 'none';
    if (orderStats) orderStats.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
  } else {
    if (skeletonStats) skeletonStats.style.display = 'none';
    if (skeletonFilters) skeletonFilters.style.display = 'none';
    if (skeletonOrders) skeletonOrders.style.display = 'none';
    
    if (actualFilters) actualFilters.style.display = 'flex';
    if (orderStats) orderStats.style.display = 'grid';
  }
}

function formatPrice(price) {
  return `R${parseFloat(price || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusBadge(status) {
  const statuses = {
    pending: { class: 'status-pending', text: 'Pending' },
    delivered: { class: 'status-delivered', text: 'Delivered' },
    cancelled: { class: 'status-cancelled', text: 'Cancelled' }
  };
  
  const statusInfo = statuses[status] || statuses.pending;
  return `<span class="order-status ${statusInfo.class}">${statusInfo.text}</span>`;
}

// ==================== ORDER OPERATIONS ====================

async function loadOrders() {
  if (!requireAuth()) return;
  
  // Skeleton already shown by HTML script
  
  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load orders: ${response.status}`);
    }
    
    orders = await response.json();
    filteredOrders = [...orders];
    
    renderOrders();
    updateStats();
    
    // Hide skeleton and show actual content
    showOrderSkeleton(false);
    
    // Dispatch event to notify skeleton script
    document.dispatchEvent(new Event('ordersLoaded'));
    
    showToast(`Loaded ${orders.length} orders`, 'success', 2000);
    
  } catch (error) {
    console.error('Error loading orders:', error);
    showToast(`Failed to load orders: ${error.message}`, 'error');
    
    // Hide skeleton on error
    showOrderSkeleton(false);
  }
}

async function markAsDelivered(orderId) {
  if (!confirm('Mark this order as delivered?')) return;
  
  // Show loading state
  const orderCard = document.getElementById(`order-${orderId}`);
  if (orderCard) {
    const originalContent = orderCard.innerHTML;
    orderCard.innerHTML = `
      <div class="skeleton-overlay">
        <div class="skeleton-overlay-content">
          <div class="skeleton-spinner" style="width: 24px; height: 24px; margin-bottom: 8px;"></div>
          <p style="font-size: 14px;">Updating...</p>
        </div>
      </div>
      ${originalContent}
    `;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/deliver`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      showToast('Order marked as delivered!', 'success');
      
      // Refresh the list with skeleton
      showOrderSkeleton(true);
      setTimeout(() => {
        loadOrders();
      }, 300);
    } else {
      const data = await response.json();
      throw new Error(data.message || 'Failed to update order');
    }
  } catch (error) {
    console.error('Error updating order:', error);
    showToast(`Failed to update order: ${error.message}`, 'error');
    
    // Restore original content on error
    if (orderCard) {
      const overlay = orderCard.querySelector('.skeleton-overlay');
      if (overlay) overlay.remove();
    }
  }
}

async function viewOrderDetails(orderId) {
  try {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    
    currentOrderId = orderId;
    
    // Show loading in modal
    const modalContent = document.getElementById('orderDetailsContent');
    modalContent.innerHTML = `
      <div class="skeleton-overlay" style="min-height: 400px;">
        <div class="skeleton-overlay-content">
          <div class="skeleton-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    `;
    
    document.getElementById('orderDetailsModal').style.display = 'flex';
    
    // Format order items HTML
    const itemsHtml = order.items.map(item => `
      <div class="order-item">
        <div class="item-details">
          <div class="item-name">${item.name}</div>
          <div class="item-meta">
            ${item.size ? `Size: ${item.size} • ` : ''}
            Qty: ${item.quantity} • 
            Price: ${formatPrice(item.price)}
          </div>
        </div>
        <div class="item-price">
          ${formatPrice(item.price * item.quantity)}
        </div>
      </div>
    `).join('');
    
    // Format modal content
    const modalHtml = `
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order._id.substring(18, 24).toUpperCase()}</div>
          <div class="order-date">${formatDate(order.createdAt)}</div>
        </div>
        ${getStatusBadge(order.status)}
      </div>
      
      <div class="customer-info">
        <h4>Customer Information</h4>
        <p><strong>Name:</strong> ${order.customerName}</p>
        <p><strong>Phone:</strong> ${order.phone}</p>
        <p><strong>Location:</strong> ${order.location}</p>
      </div>
      
      <div class="order-items">
        <h4>Order Items (${order.items.length})</h4>
        ${itemsHtml}
      </div>
      
      <div class="order-total">
        Total: ${formatPrice(order.total)}
      </div>
      
      <div class="order-actions">
        ${order.status === 'pending' ? `
          <button class="btn primary" onclick="markAsDeliveredFromModal('${order._id}')">
            Mark as Delivered
          </button>
        ` : ''}
        <button class="btn secondary" onclick="printOrder('${order._id}')">
          Print Receipt
        </button>
      </div>
    `;
    
    // Simulate loading delay
    setTimeout(() => {
      modalContent.innerHTML = modalHtml;
    }, 500);
    
  } catch (error) {
    console.error('Error loading order details:', error);
    showToast('Failed to load order details', 'error');
  }
}

function markAsDeliveredFromModal(orderId) {
  // Show loading in modal
  const modalContent = document.getElementById('orderDetailsContent');
  const originalContent = modalContent.innerHTML;
  
  modalContent.innerHTML = `
    <div class="skeleton-overlay">
      <div class="skeleton-overlay-content">
        <div class="skeleton-spinner"></div>
        <p>Updating order...</p>
      </div>
    </div>
    ${originalContent}
  `;
  
  markAsDelivered(orderId);
  closeOrderModal();
}

function closeOrderModal() {
  document.getElementById('orderDetailsModal').style.display = 'none';
  currentOrderId = null;
}

function printOrder(orderId) {
  const order = orders.find(o => o._id === orderId);
  if (!order) return;
  
  // Show printing indicator
  const toast = showToast('Preparing print...', 'info');
  
  setTimeout(() => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Receipt - ${order._id.substring(18, 24).toUpperCase()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #0b6ff2; }
          .info { margin: 20px 0; }
          .info p { margin: 5px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; }
          .items-table td { padding: 10px; border-bottom: 1px solid #dee2e6; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 20px; border-top: 2px solid #333; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Swish Drip</h1>
          <p>Order Receipt</p>
        </div>
        
        <div class="info">
          <p><strong>Order ID:</strong> ${order._id.substring(18, 24).toUpperCase()}</p>
          <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
          <p><strong>Customer:</strong> ${order.customerName}</p>
          <p><strong>Phone:</strong> ${order.phone}</p>
          <p><strong>Location:</strong> ${order.location}</p>
          <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.size || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>${formatPrice(item.price)}</td>
                <td>${formatPrice(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          Total: ${formatPrice(order.total)}
        </div>
        
        <div class="footer">
          <p>Thank you for your order!</p>
          <p>Swish Drip Clothing Store</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Update toast
    if (toast) {
      toast.textContent = 'Print dialog opening...';
    }
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      showToast('Print dialog opened', 'success');
    }, 250);
  }, 300);
}

// ==================== FILTERING & SEARCH ====================

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  const dateFilter = document.getElementById('dateFilter').value;
  
  filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = !searchTerm || 
      order.customerName.toLowerCase().includes(searchTerm) ||
      order.phone.includes(searchTerm) ||
      order._id.toLowerCase().includes(searchTerm) ||
      order.location.toLowerCase().includes(searchTerm);
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = orderDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          matchesDate = orderDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(today.getMonth() - 1);
          matchesDate = orderDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });
  
  renderOrders();
}

// ==================== RENDERING ====================

function renderOrders() {
  const ordersList = document.getElementById('ordersList');
  const emptyState = document.getElementById('emptyState');
  
  if (filteredOrders.length === 0) {
    ordersList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  ordersList.innerHTML = filteredOrders.map(order => `
    <div class="order-card" id="order-${order._id}">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order._id.substring(18, 24).toUpperCase()}</div>
          <div class="order-date">${formatDate(order.createdAt)}</div>
        </div>
        ${getStatusBadge(order.status)}
      </div>
      
      <div class="customer-info">
        <h4>${order.customerName}</h4>
        <p>📱 ${order.phone}</p>
        <p>📍 ${order.location}</p>
      </div>
      
      <div class="order-items">
        ${order.items.slice(0, 2).map(item => `
          <div class="order-item">
            <div class="item-details">
              <div class="item-name">${item.name}</div>
              <div class="item-meta">
                ${item.size ? `Size: ${item.size} • ` : ''}
                Qty: ${item.quantity}
              </div>
            </div>
            <div class="item-price">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
        
        ${order.items.length > 2 ? `
          <div style="text-align: center; padding: 8px; color: #6c757d; font-size: 14px;">
            + ${order.items.length - 2} more items
          </div>
        ` : ''}
      </div>
      
      <div class="order-total">
        Total: ${formatPrice(order.total)}
      </div>
      
      <div class="order-actions">
        <button class="btn" onclick="viewOrderDetails('${order._id}')">
          View Details
        </button>
        
        ${order.status === 'pending' ? `
          <button class="btn primary" onclick="markAsDelivered('${order._id}')">
            Mark as Delivered
          </button>
        ` : ''}
        
        <button class="btn secondary" onclick="printOrder('${order._id}')">
          Print
        </button>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  
  const statsContainer = document.getElementById('orderStats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalOrders}</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${pendingOrders}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${deliveredOrders}</div>
        <div class="stat-label">Delivered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatPrice(totalRevenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
    `;
  }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    showOrderSkeleton(true);
    setTimeout(() => {
      loadOrders();
    }, 300);
  });
  
  // Logout button - FIXED PATH
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
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
        window.location.href = '../admin/admin-login.html';
      }, 500);
    }
  });
  
  // Filters
  document.getElementById('searchInput')?.addEventListener('input', applyFilters);
  document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
  document.getElementById('dateFilter')?.addEventListener('change', applyFilters);
  
  // Order modal close
  document.getElementById('orderModalClose')?.addEventListener('click', closeOrderModal);
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('orderDetailsModal');
    if (e.target === modal) {
      closeOrderModal();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOrderModal();
    }
    if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      showOrderSkeleton(true);
      setTimeout(() => {
        loadOrders();
      }, 300);
    }
  });
}

// ==================== INITIALIZATION ====================

async function initializeOrders() {
  console.log('🚀 Order Management initializing...');
  
  // Check authentication
  if (!requireAuth()) {
    return;
  }
  
  // Display user info
  try {
    const userData = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const brandElement = document.querySelector('.brand');
    if (brandElement && userData.email) {
      brandElement.innerHTML = `
        <a href="admin.html" style="color: white; text-decoration: none; margin-right: 20px;">← Products</a>
        Swish Drip — Order Management (${userData.email})
      `;
    }
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Load initial data (skeleton already shown by HTML)
  await loadOrders();
  
  console.log('✅ Order Management initialized');
}

// Make functions available globally
window.markAsDelivered = markAsDelivered;
window.viewOrderDetails = viewOrderDetails;
window.markAsDeliveredFromModal = markAsDeliveredFromModal;
window.printOrder = printOrder;
window.loadOrders = loadOrders;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeOrders);