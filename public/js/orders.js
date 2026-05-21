// Order & Cart UI Module
const OrderModule = {
  cart: {}, // { productId: { product, quantity } }
  
  async init() {
    this.bindEvents();
    
    // Determine view contexts based on user role
    const user = api.getUser();
    if (user && user.role === 'buyer') {
      await this.loadBentoGrid();
      // Hide customer column header in orders view
      const thCustomer = document.getElementById('th-customer');
      if (thCustomer) thCustomer.style.display = 'none';
    } else if (user && user.role === 'admin') {
      await this.loadOrders();
    }
  },

  bindEvents() {
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async () => {
        await this.placeOrder();
      });
    }
  },

  async loadBentoGrid() {
    try {
      const products = await api.getProducts();
      const grid = document.getElementById('bento-grid-container');
      if (!grid) return;

      if (products.length === 0) {
        grid.innerHTML = '<p class="text-muted">No products available at the moment.</p>';
        return;
      }

      grid.innerHTML = products.map(p => {
        const isOutOfStock = p.stock <= 0;
        const imageHtml = p.image_url 
          ? `<img src="${p.image_url}" class="bento-img" onerror="this.src=''; this.style.display='none'; this.nextElementSibling.style.display='flex';" /> <div class="bento-img" style="display:none;"><i data-lucide="image-off"></i></div>`
          : `<div class="bento-img"><i data-lucide="image"></i></div>`;
          
        return `
          <div class="bento-card ${isOutOfStock ? 'disabled' : ''}" onclick="${isOutOfStock ? '' : `OrderModule.addToCart(${p.id})`}">
            ${imageHtml}
            <div class="bento-content">
              <div class="bento-title">${p.name}</div>
              <div class="bento-desc">${p.description || ''}</div>
              <div class="bento-footer">
                <div class="bento-price">${utils.formatCurrency(p.price)}</div>
                <div class="bento-stock ${isOutOfStock ? 'out' : ''}">${isOutOfStock ? 'OUT OF STOCK' : `Stock: ${p.stock}`}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // Store globally for cart lookup
      this.availableProducts = products;
      lucide.createIcons();
    } catch (error) {
      utils.showToast('Failed to load menu', 'error');
    }
  },

  addToCart(productId) {
    const product = this.availableProducts.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    if (!this.cart[productId]) {
      this.cart[productId] = { product, quantity: 1 };
    } else {
      if (this.cart[productId].quantity < product.stock) {
        this.cart[productId].quantity += 1;
      } else {
        utils.showToast('Maximum stock reached for this item', 'error');
        return;
      }
    }
    this.renderCart();
  },

  updateCartQty(productId, delta) {
    if (!this.cart[productId]) return;
    
    const newQty = this.cart[productId].quantity + delta;
    if (newQty <= 0) {
      delete this.cart[productId];
    } else if (newQty > this.cart[productId].product.stock) {
      utils.showToast('Maximum stock reached for this item', 'error');
    } else {
      this.cart[productId].quantity = newQty;
    }
    this.renderCart();
  },

  renderCart() {
    const container = document.getElementById('cart-items-container');
    const countBadge = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total-amount');
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    
    if (!container) return;

    const items = Object.values(this.cart);
    
    if (items.length === 0) {
      container.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Select items from the menu to add them.</div>';
      countBadge.textContent = '0';
      totalEl.textContent = '$0.00';
      checkoutBtn.disabled = true;
      return;
    }

    let totalAmount = 0;
    let totalItems = 0;

    container.innerHTML = items.map(item => {
      totalAmount += item.product.price * item.quantity;
      totalItems += item.quantity;
      
      const imageHtml = item.product.image_url 
        ? `<img src="${item.product.image_url}" class="cart-item-img" onerror="this.style.display='none'" />`
        : `<div class="cart-item-img" style="display:flex; align-items:center; justify-content:center; color:var(--color-text-muted);"><i data-lucide="image" style="width:16px;"></i></div>`;

      return `
        <div class="cart-item">
          ${imageHtml}
          <div class="cart-item-details">
            <div class="cart-item-title">${item.product.name}</div>
            <div class="cart-item-price">${utils.formatCurrency(item.product.price)}</div>
            <div class="cart-controls">
              <button class="cart-btn" onclick="OrderModule.updateCartQty(${item.product.id}, -1)"><i data-lucide="minus" style="width:14px;"></i></button>
              <div class="cart-qty">${item.quantity}</div>
              <button class="cart-btn" onclick="OrderModule.updateCartQty(${item.product.id}, 1)"><i data-lucide="plus" style="width:14px;"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    countBadge.textContent = totalItems;
    totalEl.textContent = utils.formatCurrency(totalAmount);
    checkoutBtn.disabled = false;
    lucide.createIcons();
  },

  async placeOrder() {
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    const originalText = checkoutBtn.innerHTML;
    checkoutBtn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin"></i> Placing...';
    checkoutBtn.disabled = true;
    lucide.createIcons();

    try {
      const items = Object.values(this.cart).map(i => ({
        product_id: i.product.id,
        quantity: i.quantity
      }));

      const order = await api.placeOrder({ items });
      
      // Clear cart and refresh
      this.cart = {};
      this.renderCart();
      await this.loadBentoGrid(); // Reload to get fresh stock
      await this.loadOrders();
      
      // Switch view to orders
      const orderLink = document.querySelector('.nav-links a[data-view="orders"]');
      if (orderLink) orderLink.click();

      // Show success modal
      const content = document.getElementById('modal-order-content');
      content.innerHTML = `
        <div style="text-align:center; padding: 32px 0;">
          <i data-lucide="check-circle" style="width:64px; height:64px; color:var(--color-brand); margin-bottom:16px;"></i>
          <h2 style="margin-bottom:8px;">Order Placed Successfully!</h2>
          <p class="text-muted">Your order #${order.id} has been received and is currently pending.</p>
          <button class="btn btn-primary" style="margin-top:24px;" onclick="document.getElementById('order-modal').classList.remove('active')">View Orders</button>
        </div>
      `;
      document.getElementById('order-modal').classList.add('active');
      lucide.createIcons();
      
    } catch (error) {
      utils.showToast(error.message, 'error');
      // If a stock error occurs, reload grid to sync
      await this.loadBentoGrid();
    } finally {
      checkoutBtn.innerHTML = originalText;
      checkoutBtn.disabled = this.cart && Object.keys(this.cart).length === 0;
    }
  },

  // --- Order History View ---
  async loadOrders() {
    try {
      const orders = await api.getOrders();
      this.renderTable(orders);
      
      const statEl = document.getElementById('stat-orders');
      if (statEl) statEl.textContent = orders.length;
      
      const revEl = document.getElementById('stat-revenue');
      if (revEl) {
        const total = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
        revEl.textContent = utils.formatCurrency(total);
      }
    } catch (error) {
      utils.showToast('Failed to load orders', 'error');
    }
  },

  renderTable(orders) {
    const tbody = document.getElementById('orders-list');
    const recentTbody = document.getElementById('dashboard-recent-orders');
    
    const user = api.getUser();
    const isBuyer = user && user.role === 'buyer';

    if (tbody) {
      tbody.innerHTML = orders.map(o => `
        <tr>
          <td class="text-muted">#${o.id}</td>
          ${!isBuyer ? `
          <td>
            <div class="font-semibold">${o.customer_name}</div>
            <div style="font-size:var(--text-xs); color:var(--color-text-muted)">${o.customer_email}</div>
          </td>` : ''}
          <td class="text-muted">${utils.formatDate(o.created_at)}</td>
          <td class="font-semibold">${utils.formatCurrency(o.total_amount)}</td>
          <td><span class="badge status-${o.status}">${o.status.toUpperCase()}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="OrderModule.viewOrderDetails(${o.id})">
              <i data-lucide="eye" style="width:14px; height:14px;"></i> View
            </button>
          </td>
        </tr>
      `).join('');
    }
    
    if (recentTbody && !isBuyer) {
      const recentOrders = orders.slice(0, 5);
      recentTbody.innerHTML = recentOrders.map(o => `
        <tr>
          <td class="text-muted">#${o.id}</td>
          <td>
            <div class="font-semibold">${o.customer_name}</div>
          </td>
          <td class="text-muted">${utils.formatDate(o.created_at)}</td>
          <td class="font-semibold">${utils.formatCurrency(o.total_amount)}</td>
          <td><span class="badge status-${o.status}">${o.status.toUpperCase()}</span></td>
        </tr>
      `).join('');
      if (recentOrders.length === 0) {
          recentTbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center" style="padding: 24px;">No recent orders.</td></tr>';
      }
    }
    
    lucide.createIcons();
  },

  async viewOrderDetails(id) {
    try {
      const order = await api.getOrderById(id);
      const content = document.getElementById('modal-order-content');
      
      const user = api.getUser();
      const isAdmin = user && user.role === 'admin';
      
      let statusHtml = `<span class="badge status-${order.status}" style="font-size: var(--text-base);">${order.status.toUpperCase()}</span>`;
      
      if (isAdmin) {
          statusHtml = `
             <select id="status-update-${order.id}" class="badge status-${order.status}" style="padding:6px; border-radius:var(--radius-sm); outline:none; font-weight:600; cursor:pointer;" onchange="OrderModule.changeStatus(${order.id}, this.value)">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>PENDING</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>PROCESSING</option>
                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>COMPLETED</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>CANCELLED</option>
             </select>
          `;
      }
      
      let cancelHtml = '';
      if (!isAdmin && order.status === 'pending') {
          cancelHtml = `
            <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
              <button class="btn btn-danger btn-sm" onclick="OrderModule.cancelOrder(${order.id})">
                <i data-lucide="x-circle" style="width:14px;"></i> Cancel Order
              </button>
            </div>
          `;
      }
      
      content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--color-border); padding-bottom:16px;">
          <div>
            <h3 style="margin:0;">Order #${order.id}</h3>
            <p class="text-muted" style="margin:0;">${utils.formatDate(order.created_at)}</p>
          </div>
          <div>
             ${statusHtml}
          </div>
        </div>
        ${cancelHtml}
        
        ${isAdmin ? `
        <div style="margin-bottom:24px;">
          <h4 style="color:var(--color-text-secondary); margin-bottom:4px; font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.05em;">Customer</h4>
          <p style="margin:0;" class="font-semibold">${order.customer_name} <span class="text-muted font-normal">(${order.customer_email})</span></p>
        </div>` : ''}

        <table class="data-table" style="margin-bottom:24px;">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${utils.formatCurrency(item.unit_price)}</td>
                <td>${utils.formatCurrency(item.quantity * item.unit_price)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right; font-weight:600; padding-top:16px;">Total Amount:</td>
              <td style="font-size:var(--text-lg); color:var(--color-brand); font-weight:700; padding-top:16px;">${utils.formatCurrency(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      `;
      
      document.getElementById('order-modal').classList.add('active');
    } catch (error) {
      utils.showToast(error.message, 'error');
    }
  },

  async changeStatus(id, newStatus) {
    try {
      await api.updateOrderStatus(id, newStatus);
      utils.showToast('Order status updated');
      
      // Update badge color class in select dynamically
      const select = document.getElementById(`status-update-${id}`);
      if (select) {
         select.className = `badge status-${newStatus}`;
      }
      
      await this.loadOrders();
    } catch (error) {
      utils.showToast(error.message, 'error');
    }
  },

  async cancelOrder(id) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.cancelOrder(id);
      utils.showToast('Order cancelled successfully');
      document.getElementById('order-modal').classList.remove('active');
      await this.loadOrders();
    } catch (error) {
      utils.showToast(error.message, 'error');
    }
  }
};
