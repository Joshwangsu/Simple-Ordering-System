// Product UI Module
const ProductModule = {
  productsCache: [],

  async init() {
    this.bindEvents();
    await this.loadProducts();
  },

  bindEvents() {
    // Add Product Form
    const form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin"></i> Adding...';
        btn.disabled = true;
        lucide.createIcons();

        try {
          const formData = new FormData();
          formData.append('name', document.getElementById('prod-name').value);
          formData.append('description', document.getElementById('prod-desc').value);
          formData.append('price', document.getElementById('prod-price').value);
          formData.append('stock', document.getElementById('prod-stock').value);
          formData.append('is_on_sale', document.getElementById('prod-sale').checked);
          
          const imageFile = document.getElementById('prod-image').files[0];
          if (imageFile) {
              formData.append('image', imageFile);
          }

          await api.addProduct(formData);
          utils.showToast('Product added successfully!');
          form.reset();
          document.getElementById('add-product-modal').classList.remove('active');
          await this.loadProducts();
        } catch (error) {
          utils.showToast(error.message, 'error');
        } finally {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      });
    }

    // Edit Product Form
    const editForm = document.getElementById('edit-product-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = editForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin"></i> Updating...';
            btn.disabled = true;
            lucide.createIcons();

            try {
                const id = document.getElementById('edit-prod-id').value;
                const formData = new FormData();
                formData.append('name', document.getElementById('edit-prod-name').value);
                formData.append('description', document.getElementById('edit-prod-desc').value);
                formData.append('price', document.getElementById('edit-prod-price').value);
                formData.append('stock', document.getElementById('edit-prod-stock').value);
                formData.append('is_on_sale', document.getElementById('edit-prod-sale').checked);
                formData.append('existing_image_url', document.getElementById('edit-prod-existing-image').value);
                
                const imageFile = document.getElementById('edit-prod-image').files[0];
                if (imageFile) {
                    formData.append('image', imageFile);
                }
                
                await api.request(`/products/${id}`, 'PUT', formData);
                utils.showToast('Product updated successfully!');
                document.getElementById('edit-product-modal').classList.remove('active');
                await this.loadProducts();
            } catch (error) {
                utils.showToast(error.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
  },

  async loadProducts() {
    try {
      this.productsCache = await api.getProducts();
      this.renderGrid(this.productsCache);
      
      // Update global dashboard stats
      const statEl = document.getElementById('stat-products');
      if (statEl) statEl.textContent = this.productsCache.length;
      
    } catch (error) {
      utils.showToast('Failed to load products', 'error');
    }
  },

  renderGrid(products) {
    const grid = document.getElementById('products-list');
    if (!grid) return;

    if (products.length === 0) {
      grid.innerHTML = '<p class="text-muted">No products available.</p>';
      grid.style.display = 'block';
      return;
    }
    grid.style.display = 'grid';

    const user = api.getUser();
    const isAdmin = user && user.role === 'admin';

    grid.innerHTML = products.map(p => {
      
      const imageHtml = p.image_url 
        ? `<div style="width:100%; height:180px; overflow:hidden; border-radius:var(--radius-sm); margin-bottom:12px; background:var(--color-canvas);"><img src="${p.image_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src=''; this.style.display='none'; this.nextElementSibling.style.display='flex';" /> <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; color:var(--color-text-muted);"><i data-lucide="image-off"></i></div> </div>`
        : `<div style="width:100%; height:180px; background:var(--color-canvas); border-radius:var(--radius-sm); margin-bottom:12px; display:flex; align-items:center; justify-content:center; color:var(--color-text-muted);"><i data-lucide="image"></i></div>`;
      
      const saleBadge = p.is_on_sale 
        ? `<span class="badge status-processing" style="position:absolute; top:12px; right:12px;">ON SALE</span>` 
        : '';
      
      const adminActions = isAdmin 
        ? `<div style="display:flex; gap:8px; margin-top:16px; border-top:1px solid var(--color-border); padding-top:16px;">
             <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="ProductModule.openEditModal(${p.id})"><i data-lucide="edit-2" style="width:14px;"></i> Edit</button>
             <button class="btn btn-danger btn-sm" onclick="ProductModule.deleteProduct(${p.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>
           </div>`
        : '';

      return `
      <div class="product-card" style="position:relative;">
        ${imageHtml}
        ${saleBadge}
        <h3>${p.name}</h3>
        <div class="product-desc">${p.description || 'No description'}</div>
        <div class="product-price">${utils.formatCurrency(p.price)}</div>
        <div class="product-stock ${p.stock > 0 ? '' : 'text-danger'}" style="display:flex; align-items:center; gap:8px;">
          <i data-lucide="package" style="width:16px; height:16px;"></i> Stock: ${p.stock}
        </div>
        ${adminActions}
      </div>
    `}).join('');
    lucide.createIcons();
  },
  
  openEditModal(id) {
      const product = this.productsCache.find(p => p.id === id);
      if (!product) return;
      
      document.getElementById('edit-prod-id').value = product.id;
      document.getElementById('edit-prod-name').value = product.name;
      document.getElementById('edit-prod-desc').value = product.description || '';
      document.getElementById('edit-prod-price').value = product.price;
      document.getElementById('edit-prod-stock').value = product.stock;
      document.getElementById('edit-prod-existing-image').value = product.image_url || '';
      document.getElementById('edit-prod-image').value = ''; // Reset file input
      document.getElementById('edit-prod-sale').checked = !!product.is_on_sale;
      
      document.getElementById('edit-product-modal').classList.add('active');
  },
  
  async deleteProduct(id) {
      if (!confirm('Are you sure you want to delete this product?')) return;
      
      try {
          await api.request(`/products/${id}`, 'DELETE');
          utils.showToast('Product deleted');
          await this.loadProducts();
      } catch (error) {
          utils.showToast(error.message, 'error');
      }
  },
  
  getProductsList() {
    return this.productsCache;
  }
};
