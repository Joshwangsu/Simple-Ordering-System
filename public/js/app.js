// Main App Initialization & Routing
document.addEventListener('DOMContentLoaded', async () => {
  
  const loginApp = document.getElementById('login-app');
  const mainApp = document.getElementById('main-app');
  const loginForm = document.getElementById('login-form');
  const passwordForm = document.getElementById('password-form');
  const logoutBtn = document.getElementById('logout-btn');
  const sidebarLinks = document.getElementById('sidebar-links');

  // Check initial auth state
  const checkAuth = async () => {
    const user = api.getUser();
    if (!user) {
      showLogin();
      return;
    }

    if (user.is_first_login && user.role === 'buyer') {
      showChangePasswordModal();
    } else {
      await initializeApp(user);
    }
  };

  const showLogin = () => {
    loginApp.classList.remove('hidden');
    mainApp.classList.add('hidden');
  };

  const showChangePasswordModal = () => {
    loginApp.classList.add('hidden');
    document.getElementById('password-modal').classList.add('active');
  };

  const initializeApp = async (user) => {
    loginApp.classList.add('hidden');
    mainApp.classList.remove('hidden');
    document.getElementById('password-modal').classList.remove('active');
    
    document.getElementById('user-display-name').textContent = user.name;

    // Render Sidebar based on role
    renderSidebar(user.role);

    // Initialize appropriate modules
    if (user.role === 'admin') {
      await Promise.all([
        CustomerModule.init(),
        ProductModule.init(),
        OrderModule.init()
      ]);
      switchView('dashboard', 'Dashboard');
    } else {
      // Buyer
      await Promise.all([
        ProductModule.init(), // Buyers need products for placing orders
        OrderModule.init()
      ]);
      switchView('place-order', 'Place Order');
    }
  };

  const renderSidebar = (role) => {
    let linksHTML = '';
    if (role === 'admin') {
      linksHTML = `
        <li><a href="#dashboard" class="active" data-view="dashboard"><i data-lucide="layout-dashboard"></i> Dashboard</a></li>
        <li><a href="#customers" data-view="customers"><i data-lucide="users"></i> Customers</a></li>
        <li><a href="#products" data-view="products"><i data-lucide="package"></i> Products</a></li>
        <li><a href="#orders" data-view="orders"><i data-lucide="shopping-cart"></i> View Orders</a></li>
      `;
    } else {
      linksHTML = `
        <li><a href="#place-order" class="active" data-view="place-order"><i data-lucide="plus-circle"></i> Place Order</a></li>
        <li><a href="#orders" data-view="orders"><i data-lucide="list"></i> View My Orders</a></li>
      `;
    }
    sidebarLinks.innerHTML = linksHTML;
    lucide.createIcons();
    bindNavEvents();
  };

  // --- Auth Handlers ---

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button');
    btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Signing In...';
    btn.disabled = true;

    try {
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const result = await api.login(email, pass);
      
      api.setAuth(result.token, result.user);
      await checkAuth();
    } catch (error) {
      utils.showToast(error.message, 'error');
    } finally {
      btn.innerHTML = 'Sign In';
      btn.disabled = false;
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = passwordForm.querySelector('button');
    btn.disabled = true;

    try {
      const newPass = document.getElementById('new-password').value;
      const result = await api.changePassword(newPass);
      
      api.setAuth(result.token, result.user);
      utils.showToast('Password updated successfully!');
      await checkAuth();
    } catch (error) {
      utils.showToast(error.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', () => {
    api.setAuth(null, null);
    window.location.reload();
  });


  // --- SPA Navigation ---
  function bindNavEvents() {
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = link.dataset.view;
        const title = link.textContent.trim();
        switchView(viewId, title);
      });
    });
  }

  function switchView(viewId, title) {
    const links = document.querySelectorAll('.nav-links a');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');

    // Update Active Link
    links.forEach(link => {
      link.classList.remove('active');
      if (link.dataset.view === viewId) link.classList.add('active');
    });

    // Update View Visibility
    views.forEach(view => {
      view.classList.remove('active');
      if (view.id === `${viewId}-view`) {
        // slight delay to allow display block to apply before opacity transition
        view.classList.add('active');
      }
    });

    pageTitle.textContent = title || viewId.charAt(0).toUpperCase() + viewId.slice(1);
    
    // Refresh data if needed when entering views
    if (viewId === 'place-order') {
       ProductModule.loadProducts();
    } else if (viewId === 'orders') {
       OrderModule.loadOrders();
    }
  }

  // --- Style fix for spinner ---
  const style = document.createElement('style');
  style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);

  // Boot
  checkAuth();
});
