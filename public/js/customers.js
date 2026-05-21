const CustomerModule = {
  customersCache: [],

  async init() {
    this.bindEvents();
    await this.loadCustomers();
  },

  bindEvents() {
    const form = document.getElementById('customer-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = form.querySelector('button');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin"></i> Registering...';
      btn.disabled = true;
      lucide.createIcons();

      try {
        const data = {
          first_name: document.getElementById('cust-first-name').value,
          middle_name: document.getElementById('cust-middle-name').value,
          last_name: document.getElementById('cust-last-name').value,
          email: document.getElementById('cust-email').value,
          phone: document.getElementById('cust-phone').value,
          address: document.getElementById('cust-address').value
        };

        const res = await api.registerCustomer(data);
        utils.showToast('Customer registered successfully!');
        
        // Show temp password to Admin
        alert(`CUSTOMER REGISTERED!\n\nPlease give this temporary password to the buyer:\n\nPassword: ${res.tempPassword}`);
        
        form.reset();
        await this.loadCustomers();
      } catch (error) {
        utils.showToast(error.message, 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });

    // Edit Customer Form
    const editForm = document.getElementById('edit-customer-form');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = editForm.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin"></i> Updating...';
        btn.disabled = true;
        lucide.createIcons();

        try {
          const id = document.getElementById('edit-cust-id').value;
          const data = {
            first_name: document.getElementById('edit-cust-first-name').value,
            middle_name: document.getElementById('edit-cust-middle-name').value,
            last_name: document.getElementById('edit-cust-last-name').value,
            email: document.getElementById('edit-cust-email').value,
            phone: document.getElementById('edit-cust-phone').value,
            address: document.getElementById('edit-cust-address').value
          };

          await api.updateCustomer(id, data);
          utils.showToast('Customer updated successfully!');
          document.getElementById('edit-customer-modal').classList.remove('active');
          await this.loadCustomers();
        } catch (error) {
          utils.showToast(error.message, 'error');
        } finally {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      });
    }
  },

  async loadCustomers() {
    try {
      this.customersCache = await api.getCustomers();
      this.renderTable(this.customersCache);
      
      const statEl = document.getElementById('stat-customers');
      if (statEl) statEl.textContent = this.customersCache.length;
      
      // Customer selection is removed, buyer is inferred from token.
    } catch (error) {
      utils.showToast('Failed to load customers', 'error');
    }
  },

  renderTable(customers) {
    const tbody = document.getElementById('customers-list');
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td class="text-muted">#${c.id}</td>
        <td class="font-semibold">${[c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ')}</td>
        <td>${c.email}</td>
        <td><span class="badge ${c.role === 'admin' ? 'status-processing' : 'status-pending'}">${c.role}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="CustomerModule.openEditModal(${c.id})"><i data-lucide="edit-2" style="width:14px;"></i></button>
          <button class="btn btn-danger btn-sm" onclick="CustomerModule.deleteCustomer(${c.id})" ${c.role === 'admin' ? 'disabled' : ''}><i data-lucide="trash-2" style="width:14px;"></i></button>
        </td>
      </tr>
    `).join('');
    lucide.createIcons();
  },

  openEditModal(id) {
    const customer = this.customersCache.find(c => c.id === id);
    if (!customer) return;
    
    document.getElementById('edit-cust-id').value = customer.id;
    document.getElementById('edit-cust-first-name').value = customer.first_name || '';
    document.getElementById('edit-cust-middle-name').value = customer.middle_name || '';
    document.getElementById('edit-cust-last-name').value = customer.last_name || '';
    document.getElementById('edit-cust-email').value = customer.email || '';
    document.getElementById('edit-cust-phone').value = customer.phone || '';
    document.getElementById('edit-cust-address').value = customer.address || '';
    
    document.getElementById('edit-customer-modal').classList.add('active');
  },

  async deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer? This will also delete all of their orders.')) return;
    try {
      await api.deleteCustomer(id);
      utils.showToast('Customer deleted');
      await this.loadCustomers();
    } catch (error) {
      utils.showToast(error.message, 'error');
    }
  }
};
