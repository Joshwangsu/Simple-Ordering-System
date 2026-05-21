// Centralized API handler
const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('jwt_token');
  },
  
  setAuth(token, user) {
    if (token) {
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
    }
  },

  getUser() {
    const data = localStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
  },

  async request(endpoint, method = 'GET', data = null) {
    const options = {
      method,
      headers: {}
    };
    
    // Automatically set JSON content type if data is a plain object, NOT FormData
    if (data && !(data instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }
    
    const token = this.getToken();
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      options.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      
      if (response.status === 401 || response.status === 403) {
         // Token expired or invalid role
         if (endpoint !== '/auth/login') {
             api.setAuth(null, null);
             window.location.reload(); 
         }
      }

      if (response.status === 204) return null;
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'API Request Failed');
      }
      return result;
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  },

  // Auth
  login: (email, password) => api.request('/auth/login', 'POST', { email, password }),
  changePassword: (newPassword) => api.request('/auth/change-password', 'POST', { newPassword }),

  // Customers
  getCustomers: () => api.request('/customers'),
  registerCustomer: (data) => api.request('/customers/register', 'POST', data),
  updateCustomer: (id, data) => api.request(`/customers/${id}`, 'PUT', data),
  deleteCustomer: (id) => api.request(`/customers/${id}`, 'DELETE'),

  // Products
  getProducts: () => api.request('/products'),
  addProduct: (data) => api.request('/products', 'POST', data),

  // Orders
  getOrders: () => api.request('/orders'),
  getOrderById: (id) => api.request(`/orders/${id}`),
  placeOrder: (data) => api.request('/orders', 'POST', data),
  updateOrderStatus: (id, status) => api.request(`/orders/${id}/status`, 'PATCH', { status }),
  cancelOrder: (id) => api.request(`/orders/${id}/cancel`, 'PATCH')
};

// UI Utilities
const utils = {
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    // Reset classes
    toast.className = 'toast';
    // Force reflow
    void toast.offsetWidth;
    
    if (type === 'error') {
      toast.style.background = 'var(--color-danger)';
      toast.style.color = 'white';
    } else {
      toast.style.background = 'var(--color-text-primary)';
      toast.style.color = 'var(--color-surface)';
    }
    
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
  },
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  },
  
  formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }
};
