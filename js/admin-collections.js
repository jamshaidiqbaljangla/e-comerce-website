class AdminCollections {
    constructor() {
    // Use current origin so it works on Netlify with redirects to /api/*
    this.API_BASE = window.API_BASE || window.location.origin || 'https://ubiquitous-meringue-b2611a.netlify.app';
        this.collections = [];
        this.editingCollection = null;
        this.uploadedFile = null;
        
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.bindEvents();
    }
    
    checkAuth() {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('adminAuthToken');
        if (!token) {
            this.showLoginModal();
        } else {
            this.loadCollections();
        }
    }
    
    bindEvents() {
        // Login
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Collection management
        document.getElementById('add-collection-btn').addEventListener('click', () => this.showCollectionModal());
        document.getElementById('close-modal').addEventListener('click', () => this.hideCollectionModal());
        document.getElementById('cancel-btn').addEventListener('click', () => this.hideCollectionModal());
        document.getElementById('save-btn').addEventListener('click', () => this.saveCollection());
        
        // Search and filters
        document.getElementById('search-btn').addEventListener('click', () => this.searchCollections());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCollections();
        });
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadCollections());
        
        // Collection name to slug generation
        document.getElementById('collection-name').addEventListener('input', (e) => {
            this.generateSlug(e.target.value);
        });
        
        // Image upload
        document.getElementById('image-upload').addEventListener('click', () => {
            document.getElementById('image-input').click();
        });
        document.getElementById('image-input').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });
        
        // Form submission
        document.getElementById('collection-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCollection();
        });
        
        // Select all checkbox
        document.getElementById('select-all').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });

        const exportBtn = document.querySelector('.btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCollections());
        }
        
        // Bind click events for dynamically created buttons
        document.getElementById('collections-tbody').addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn')) {
                const id = e.target.closest('tr').dataset.id;
                this.editCollection(id);
            } else if (e.target.closest('.delete-btn')) {
                const id = e.target.closest('tr').dataset.id;
                this.deleteCollection(id);
            } else if (e.target.closest('.view-btn')) {
                const slug = e.target.closest('tr').dataset.slug;
                if (slug) {
                    window.open(`collection.html?slug=${slug}`, '_blank');
                } else {
                    alert('This collection does not have a valid slug to view.');
                }
            }
        });
    }
    
    generateSlug(name) {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
            
        document.getElementById('collection-slug').value = slug;
        document.getElementById('slug-preview').textContent = `URL: /collection/${slug || 'your-collection-name'}`;
    }
    
    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginBtn = document.getElementById('login-btn');
        const loginText = document.getElementById('login-text');
        const loginSpinner = document.getElementById('login-spinner');
        const loginError = document.getElementById('login-error');
        
        loginBtn.classList.add('loading');
        loginText.style.display = 'none';
        loginSpinner.style.display = 'inline-block';
        loginError.style.display = 'none';
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.token) {
                if (data.user.role !== 'admin') {
                    throw new Error('Admin access required');
                }
                // Store in both keys for compatibility across admin pages
                localStorage.setItem('adminAuthToken', data.token);
                localStorage.setItem('adminToken', data.token);
                this.hideLoginModal();
                this.loadCollections();
                this.showAlert('Welcome back! Login successful.', 'success');
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        } finally {
            loginBtn.classList.remove('loading');
            loginText.style.display = 'inline';
            loginSpinner.style.display = 'none';
        }
    }
    
    logout() {
        localStorage.removeItem('adminAuthToken');
        localStorage.removeItem('adminToken');
        this.showAlert('You have been logged out.', 'success');
        setTimeout(() => {
            this.showLoginModal();
        }, 1500);
    }
    
    showLoginModal() {
        document.getElementById('login-modal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    hideLoginModal() {
        document.getElementById('login-modal').classList.remove('show');
        document.body.style.overflow = '';
    }
    
    async loadCollections() {
        try {
            const collections = await getCollections();
            if (collections) {
                this.collections = collections;
                this.renderCollections();
                this.updateStats();
            } else {
                throw new Error('Failed to load collections from API.');
            }
        } catch (error) {
            this.showAlert('Failed to load collections: ' + error.message, 'error');
            this.renderCollections([]);
        }
    }
    
    async searchCollections() {
        const searchTerm = document.getElementById('search-input').value.trim();
        const filtered = this.collections.filter(col => 
            col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (col.description && col.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderCollections(filtered);
    }
    
    updateStats() {
        const total = this.collections.length;
        const active = this.collections.filter(c => c.isActive).length;
        const productsInCollections = this.collections.reduce((acc, c) => acc + (c.productCount || 0), 0);
        const emptyCollections = this.collections.filter(c => (c.productCount || 0) === 0).length;
        
        document.getElementById('total-collections').textContent = total;
        document.getElementById('active-collections').textContent = active;
        document.getElementById('products-in-collections').textContent = productsInCollections;
        document.getElementById('empty-collections').textContent = emptyCollections;
    }
    
    renderCollections(collectionsToRender) {
        const tbody = document.getElementById('collections-tbody');
        const collections = collectionsToRender || this.collections;
        
        if (collections.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <h3>No collections found</h3>
                        <p>Click "Add New Collection" to get started.</p>
                    </td>
                </tr>
            `;
            this.updateStats();
            return;
        }
        
        tbody.innerHTML = collections.map(collection => `
            <tr data-id="${collection._id}" data-slug="${collection.slug}">
                <td><input type="checkbox" class="select-row"></td>
                <td><img src="${collection.imageUrl || 'images/placeholder.jpg'}" alt="${collection.name}" class="collection-image"></td>
                <td>
                    <div class="collection-info">
                        <div class="collection-name">${collection.name}</div>
                        <div class="collection-slug">/collection/${collection.slug}</div>
                    </div>
                </td>
                <td>${collection.productCount || 0}</td>
                <td>
                    <span class="status ${collection.isActive ? 'status-active' : 'status-inactive'}">
                        ${collection.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="action-btn view-btn" title="View Collection"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" title="Edit Collection"><i class="fas fa-pencil-alt"></i></button>
                    <button class="action-btn delete-btn" title="Delete Collection"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `).join('');
        
        this.updateStats();
    }
    
    getCollectionImageUrl(collection) {
        if (collection.image_url && collection.image_url.trim() !== '') {
            if (collection.image_url.startsWith('blob:') || collection.image_url.startsWith('data:') || collection.image_url.startsWith('http')) {
                return collection.image_url;
            }
            return `/${collection.image_url}`;
        }
        return this.getDefaultCollectionImage();
    }
    
    getDefaultCollectionImage() {
        return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=60&h=60&fit=crop&crop=center';
    }
    
    showCollectionModal(collection = null) {
        this.editingCollection = collection;
        this.uploadedFile = null;
        
        const modal = document.getElementById('collection-modal');
        const title = document.getElementById('modal-title');
        
        if (collection) {
            title.textContent = 'Edit Collection';
            this.populateForm(collection);
        } else {
            title.textContent = 'Add New Collection';
            this.resetForm();
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    hideCollectionModal() {
        document.getElementById('collection-modal').classList.remove('show');
        document.body.style.overflow = '';
        this.editingCollection = null;
        this.uploadedFile = null;
        
        // Clear image preview and file input to prevent state persistence
        const preview = document.getElementById('image-preview');
        const imageInput = document.getElementById('image-input');
        
        if (preview) {
            preview.innerHTML = '';
        }
        if (imageInput) {
            imageInput.value = '';
        }
    }
    
    populateForm(collection) {
        document.getElementById('collection-name').value = collection.name || '';
        document.getElementById('collection-slug').value = collection.slug || '';
        document.getElementById('collection-status').value = collection.is_active ? 'true' : 'false';
        document.getElementById('collection-description').value = collection.description || '';
        
        this.generateSlug(collection.name || '');
        
        // Clear any uploaded file state to prevent cross-contamination between collections
        this.uploadedFile = null;
        
        const preview = document.getElementById('image-preview');
        const imageInput = document.getElementById('image-input');
        
        // Reset file input to clear any selected file
        if (imageInput) {
            imageInput.value = '';
        }
        
        // Set image preview based on existing collection image
        if (collection.image_url && collection.image_url.trim() !== '') {
            preview.innerHTML = `<img src="${this.getCollectionImageUrl(collection)}" alt="Current Collection Image">`;
        } else {
            preview.innerHTML = '';
        }
    }
    
    resetForm() {
        document.getElementById('collection-form').reset();
        document.getElementById('image-preview').innerHTML = '';
        this.uploadedFile = null;
        this.generateSlug('');
    }
    
    handleImageUpload(file) {
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            this.showAlert('Image file is too large. Maximum size is 2MB.', 'error');
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            this.showAlert('Please select a valid image file.', 'error');
            return;
        }
        
        this.uploadedFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').innerHTML = `<img src="${e.target.result}" alt="Collection Image Preview">`;
        };
        reader.readAsDataURL(file);
    }
    
    async saveCollection() {
        const saveBtn = document.getElementById('save-btn');
        const saveText = document.getElementById('save-text');
        const saveSpinner = document.getElementById('save-spinner');
        
        const name = document.getElementById('collection-name').value.trim();
        const slug = document.getElementById('collection-slug').value.trim();
        
        if (!name || !slug) {
            this.showAlert('Collection name and slug are required.', 'error');
            return;
        }
        
        saveBtn.classList.add('loading');
        saveText.style.display = 'none';
        saveSpinner.style.display = 'inline-block';
        
        const formData = new FormData();
        formData.append('name', name);
        formData.append('slug', slug);
        formData.append('description', document.getElementById('collection-description').value.trim());
        formData.append('isActive', document.getElementById('collection-status').value);
        if (this.uploadedFile) {
            formData.append('image', this.uploadedFile);
        }

        try {
            const endpoint = this.editingCollection 
                ? `/admin/collections/${this.editingCollection.id}`
                : '/admin/collections';
            const method = this.editingCollection ? 'PUT' : 'POST';
            
            await this.apiRequest(endpoint, {
                method,
                body: formData
            });
            
            this.showAlert(`Collection ${this.editingCollection ? 'updated' : 'created'} successfully!`, 'success');
            this.hideCollectionModal();
            this.loadCollections();
            
        } catch (error) {
            this.showAlert('Failed to save collection: ' + error.message, 'error');
        } finally {
            saveBtn.classList.remove('loading');
            saveText.style.display = 'inline';
            saveSpinner.style.display = 'none';
        }
    }
    
    viewCollection(collectionId) {
        const collection = this.collections.find(c => c.id === collectionId);
        if (collection) {
            this.showCollectionModal(collection);
            
            setTimeout(() => {
                const inputs = document.querySelectorAll('#collection-modal input, #collection-modal textarea, #collection-modal select');
                inputs.forEach(input => input.disabled = true);
                
                document.getElementById('save-btn').style.display = 'none';
                document.getElementById('modal-title').textContent = 'View Collection Details';
                
                document.getElementById('image-upload').style.pointerEvents = 'none';
                document.getElementById('image-upload').style.opacity = '0.6';
            }, 50);
        }
    }
    
    editCollection(collectionId) {
        const collection = this.collections.find(c => c.id === collectionId);
        if (collection) {
            this.showCollectionModal(collection);
        }
    }
    
    async deleteCollection(collectionId) {
        const collection = this.collections.find(c => c.id === collectionId);
        if (!collection) return;
        
        if (confirm(`Are you sure you want to delete "${collection.name}"?`)) {
            try {
                await this.apiRequest(`/admin/collections/${collectionId}`, { method: 'DELETE' });
                this.showAlert('Collection deleted successfully', 'success');
                this.loadCollections();
            } catch (error) {
                this.showAlert('Failed to delete collection: ' + error.message, 'error');
            }
        }
    }
    
    showAlert(message, type) {
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
        
        document.querySelector('.container').insertBefore(alert, document.querySelector('.header').nextSibling);
        
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
        
        alert.addEventListener('click', () => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        });
    }

    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('adminAuthToken');
        
        const config = {
            headers: {
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };
        
    const response = await fetch(`${this.API_BASE}${endpoint}`, config);
        
        if (response.status === 401 || response.status === 403) {
            this.logout();
            throw new Error('Authentication failed');
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(error.error || error.message || 'Request failed');
        }
        
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    }

    exportCollections() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.collections, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "collections.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminCollections = new AdminCollections();
});
