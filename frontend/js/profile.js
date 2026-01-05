// js/profile.js - User Profile Management
const API_BASE = "http://localhost:5000";

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  console.log('Profile page initialized');
  
  // Check authentication
  const currentUser = JSON.parse(localStorage.getItem('user_data')) || null;
  const authToken = localStorage.getItem('auth_token') || null;
  
  if (!currentUser || !authToken) {
    window.location.href = 'index.html';
    return;
  }
  
  // Setup event listeners
  setupProfileListeners();
  setupNavigation();
  
  // Load profile data
  loadProfileData();
  loadOrders();
  loadWishlistPreview();
});

// ==================== NAVIGATION ====================
function setupNavigation() {
  // Profile navigation tabs
  const navButtons = document.querySelectorAll('.profile-nav-btn');
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      navButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Hide all tabs
      document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Show selected tab
      const tabId = this.dataset.tab + '-tab';
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
      }
    });
  }
}

// ==================== PROFILE DATA ====================
async function loadProfileData() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load profile data');
    }
    
    const user = await response.json();
    
    // Update profile display
    document.getElementById('profile-name').textContent = user.name || 'User';
    document.getElementById('profile-email').textContent = user.email || '';
    
    // Format member since date
    if (user.createdAt) {
      const date = new Date(user.createdAt);
      document.getElementById('member-since').textContent = 
        `Member since: ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    
    // Update profile picture
    const avatarImg = document.getElementById('profile-avatar-img');
    if (user.profilePicture) {
      avatarImg.src = user.profilePicture.startsWith('http') ? 
        user.profilePicture : `${API_BASE}${user.profilePicture}`;
    } else {
      // Generate avatar based on name
      const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=111&color=fff&size=100`;
    }
    
    // Set form values
    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-phone').value = user.phone || '';
    
    // Set address fields
    if (user.address) {
      document.getElementById('edit-address').value = user.address.street || '';
      document.getElementById('edit-city').value = user.address.city || '';
      document.getElementById('edit-province').value = user.address.province || '';
      document.getElementById('edit-postal').value = user.address.postalCode || '';
    }
    
    // Set birthday if available
    if (user.birthday) {
      document.getElementById('edit-birthday').value = user.birthday;
    }
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showToast('Failed to load profile data', 'error');
  }
}

// ==================== PROFILE FORM ====================
function setupProfileListeners() {
  // Profile form submission
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await updateProfile();
    });
  }
  
  // Avatar upload
  const avatarUpload = document.getElementById('avatar-upload');
  if (avatarUpload) {
    avatarUpload.addEventListener('change', async function(e) {
      if (this.files && this.files[0]) {
        await uploadAvatar(this.files[0]);
      }
    });
  }
  
  // Password form submission
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await updatePassword();
    });
    
    // Password strength indicator
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', updatePasswordStrength);
    }
  }
}

async function updateProfile() {
  try {
    const token = localStorage.getItem('auth_token');
    
    const profileData = {
      name: document.getElementById('edit-name').value,
      email: document.getElementById('edit-email').value,
      phone: document.getElementById('edit-phone').value,
      birthday: document.getElementById('edit-birthday').value || undefined,
      address: {
        street: document.getElementById('edit-address').value,
        city: document.getElementById('edit-city').value,
        province: document.getElementById('edit-province').value,
        postalCode: document.getElementById('edit-postal').value
      }
    };
    
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    if (response.ok) {
      // Update localStorage user data
      const user = JSON.parse(localStorage.getItem('user_data'));
      Object.assign(user, profileData);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      // Update UI
      document.getElementById('profile-name').textContent = profileData.name;
      document.getElementById('profile-email').textContent = profileData.email;
      
      showToast('Profile updated successfully!', 'success');
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }
    
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast(`Failed to update profile: ${error.message}`, 'error');
  }
}

async function uploadAvatar(file) {
  try {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_BASE}/api/auth/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Update avatar image
      const avatarImg = document.getElementById('profile-avatar-img');
      avatarImg.src = data.profilePicture;
      
      // Update localStorage
      const user = JSON.parse(localStorage.getItem('user_data'));
      user.profilePicture = data.profilePicture;
      localStorage.setItem('user_data', JSON.stringify(user));
      
      showToast('Profile picture updated!', 'success');
    } else {
      throw new Error('Failed to upload avatar');
    }
    
  } catch (error) {
    console.error('Error uploading avatar:', error);
    showToast('Failed to upload profile picture', 'error');
  }
}

function resetProfileForm() {
  loadProfileData();
  showToast('Form reset to saved values', 'info');
}

// ==================== ORDERS ====================
async function loadOrders() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/orders/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const ordersList = document.getElementById('orders-list');
    const emptyOrders = document.getElementById('empty-orders');
    
    if (response.ok) {
      const orders = await response.json();
      
      if (orders.length === 0) {
        if (ordersList) ordersList.style.display = 'none';
        if (emptyOrders) emptyOrders.style.display = 'block';
        return;
      }
      
      if (emptyOrders) emptyOrders.style.display = 'none';
      if (ordersList) {
        renderOrders(orders);
      }
    } else {
      throw new Error('Failed to load orders');
    }
    
  } catch (error) {
    console.error('Error loading orders:', error);
    const ordersList = document.getElementById('orders-list');
    if (ordersList) {
      ordersList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>Failed to load orders. Please try again later.</p>
          <button class="btn" onclick="loadOrders()">Retry</button>
        </div>
      `;
    }
  }
}

function renderOrders(orders) {
  const ordersList = document.getElementById('orders-list');
  if (!ordersList) return;
  
  const ordersHTML = orders.map(order => `
    <div class="order-item">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order._id.substring(18, 24).toUpperCase()}</div>
          <div class="order-date">${formatDate(order.createdAt)}</div>
        </div>
        <span class="order-status ${order.status === 'delivered' ? 'status-delivered' : 'status-pending'}">
          ${order.status}
        </span>
      </div>
      
      <div class="order-items">
        ${order.items.map(item => `
          <div class="order-item-product">
            <div>
              <div class="product-name">${item.name}</div>
              <div class="product-quantity">Qty: ${item.quantity}${item.size ? ` • Size: ${item.size}` : ''}</div>
            </div>
            <div class="product-price">R${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="order-total">
        Total: R${formatPrice(order.total)}
      </div>
      
      <div class="order-actions">
        ${order.status === 'pending' ? `
          <button class="btn small" onclick="contactSupport('${order._id}')">
            Contact Support
          </button>
        ` : ''}
        <button class="btn small secondary" onclick="reorder('${order._id}')">
          Reorder
        </button>
      </div>
    </div>
  `).join('');
  
  ordersList.innerHTML = ordersHTML;
}

// ==================== WISHLIST PREVIEW ====================
async function loadWishlistPreview() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/wishlist`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const wishlistPreview = document.getElementById('wishlist-preview');
    const emptyWishlist = document.getElementById('empty-wishlist-preview');
    
    if (response.ok) {
      const data = await response.json();
      const wishlist = data.wishlist || [];
      
      if (wishlist.length === 0) {
        if (wishlistPreview) wishlistPreview.style.display = 'none';
        if (emptyWishlist) emptyWishlist.style.display = 'block';
        return;
      }
      
      if (emptyWishlist) emptyWishlist.style.display = 'none';
      if (wishlistPreview) {
        renderWishlistPreview(wishlist.slice(0, 4)); // Show first 4 items
      }
    }
    
  } catch (error) {
    console.error('Error loading wishlist:', error);
  }
}

function renderWishlistPreview(wishlist) {
  const wishlistPreview = document.getElementById('wishlist-preview');
  if (!wishlistPreview) return;
  
  const previewHTML = wishlist.map(product => `
    <div class="wishlist-preview-item">
      <img src="${product.image ? (product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`) : 'https://via.placeholder.com/200x150?text=Product'}" 
           alt="${product.name}" 
           class="wishlist-preview-image"
           onerror="this.src='https://via.placeholder.com/200x150?text=Product'">
      <div class="wishlist-preview-content">
        <div class="wishlist-preview-name">${product.name}</div>
        <div class="wishlist-preview-price">
          R${formatPrice(product.sale && product.salePrice ? product.salePrice : product.price)}
        </div>
      </div>
    </div>
  `).join('');
  
  wishlistPreview.innerHTML = previewHTML;
}

// ==================== PASSWORD MANAGEMENT ====================
async function updatePassword() {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('Please fill in all password fields', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    
    if (response.ok) {
      // Clear form
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
      
      showToast('Password updated successfully!', 'success');
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update password');
    }
    
  } catch (error) {
    console.error('Error updating password:', error);
    showToast(`Failed to update password: ${error.message}`, 'error');
  }
}

function updatePasswordStrength() {
  const password = document.getElementById('new-password').value;
  const strengthBar = document.querySelector('.strength-bar');
  const strengthText = document.querySelector('.strength-text');
  
  if (!password) {
    strengthBar.style.width = '0%';
    strengthBar.style.backgroundColor = '#e53935';
    strengthText.textContent = 'Password strength';
    return;
  }
  
  // Calculate strength
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  
  // Complexity checks
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  
  // Cap at 100
  strength = Math.min(strength, 100);
  
  // Update UI
  strengthBar.style.width = `${strength}%`;
  
  if (strength < 50) {
    strengthBar.style.backgroundColor = '#e53935';
    strengthText.textContent = 'Weak';
  } else if (strength < 75) {
    strengthBar.style.backgroundColor = '#ff9800';
    strengthText.textContent = 'Fair';
  } else {
    strengthBar.style.backgroundColor = '#4CAF50';
    strengthText.textContent = 'Strong';
  }
}

function requestPasswordReset() {
  const email = document.getElementById('profile-email').value;
  
  if (!email) {
    showToast('Please save your email first', 'error');
    return;
  }
  
  if (confirm(`Send password reset instructions to ${email}?`)) {
    // This would call your password reset endpoint
    showToast('Password reset email sent!', 'success');
  }
}

// ==================== ACCOUNT DELETION ====================
function confirmDeleteAccount() {
  document.getElementById('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
}

async function deleteAccount() {
  try {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE}/api/auth/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      // Clear localStorage and redirect
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      showToast('Account deleted successfully', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      throw new Error('Failed to delete account');
    }
    
  } catch (error) {
    console.error('Error deleting account:', error);
    showToast('Failed to delete account. Please contact support.', 'error');
    closeDeleteModal();
  }
}

// ==================== HELPER FUNCTIONS ====================
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatPrice(amount) {
  return Number(amount || 0).toFixed(2);
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

// ==================== ORDER ACTIONS ====================
function contactSupport(orderId) {
  showToast(`Contact support about order ${orderId.substring(18, 24).toUpperCase()}`, 'info');
}

async function reorder(orderId) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/reorder`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      showToast('Items added to cart!', 'success');
    } else {
      throw new Error('Failed to reorder');
    }
    
  } catch (error) {
    console.error('Error reordering:', error);
    showToast('Failed to reorder items', 'error');
  }
}