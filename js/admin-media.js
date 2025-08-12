document.addEventListener('DOMContentLoaded', () => {
    const mediaPage = new AdminMediaPage();
    mediaPage.init();
});

class AdminMediaPage {
    constructor() {
        this.API_BASE = window.API_BASE || window.location.origin || 'https://ubiquitous-meringue-b2611a.netlify.app';
        this.mediaData = {
            hero: [],
            categories: [],
            'feature-banner': [],
            instagram: [],
            products: []
        };
        this.modal = document.getElementById('media-modal');
        this.fileInput = document.getElementById('file-input');
        this.editingMedia = { section: null, id: null, newFile: null };
    }

    async init() {
        await this.loadMediaData();
        this.renderAllSections();
        this.bindEvents();
    }

    async loadMediaData() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.API_BASE}/api/admin/media`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.mediaData = data;
            } else {
                console.error('Failed to load media data');
                this.loadFallbackData();
            }
        } catch (error) {
            console.error('Error loading media data:', error);
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        // Fallback to static data if API fails
        this.mediaData = {
            hero: [
                { id: 'hero-1', src: 'images/hero-1.jpg', name: 'hero-1.jpg', type: 'image' },
                { id: 'hero-2', src: 'images/hero-2.jpg', name: 'hero-2.jpg', type: 'image' },
                { id: 'hero-3', src: 'images/hero-3.jpg', name: 'hero-3.jpg', type: 'image' },
            ],
            categories: [
                { id: 'cat-1', src: 'images/category-1.jpg', name: 'category-1.jpg', type: 'image' },
                { id: 'cat-2', src: 'images/category-2.jpg', name: 'category-2.jpg', type: 'image' },
                { id: 'cat-3', src: 'images/category-3.jpg', name: 'category-3.jpg', type: 'image' },
                { id: 'cat-4', src: 'images/category-4.jpg', name: 'category-4.jpg', type: 'image' },
            ],
            'feature-banner': [
                { id: 'banner-1', src: 'images/banner.jpg', name: 'banner.jpg', type: 'image' },
            ],
            instagram: [
                { id: 'insta-1', src: 'images/instagram-1.jpg', name: 'instagram-1.jpg', type: 'image' },
                { id: 'insta-2', src: 'images/instagram-2.jpg', name: 'instagram-2.jpg', type: 'image' },
                { id: 'insta-3', src: 'images/instagram-3.jpg', name: 'instagram-3.jpg', type: 'image' },
                { id: 'insta-4', src: 'images/instagram-4.jpg', name: 'instagram-4.jpg', type: 'image' },
                { id: 'insta-5', src: 'images/instagram-5.jpg', name: 'instagram-5.jpg', type: 'image' },
                { id: 'insta-6', src: 'images/instagram-6.jpg', name: 'instagram-6.jpg', type: 'image' },
            ],
            products: [
                { id: 'prod-1', src: 'images/product-1.jpg', name: 'product-1.jpg', type: 'image' },
                { id: 'prod-2', src: 'images/product-2.jpg', name: 'product-2.jpg', type: 'image' },
                { id: 'prod-3', src: 'images/product-3.jpg', name: 'product-3.jpg', type: 'image' },
            ]
        };
    }

    bindEvents() {
        document.querySelectorAll('.add-media-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.add-media-btn').dataset.section;
                this.openModal(section);
            });
        });

        this.modal.querySelector('.close-btn').addEventListener('click', () => this.closeModal());
        this.modal.querySelector('.modal-footer .btn-secondary').addEventListener('click', () => this.closeModal());
        document.getElementById('save-media-btn').addEventListener('click', () => this.saveMedia());

        const uploadArea = this.modal.querySelector('.upload-area');
        uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));
    }

    renderAllSections() {
        for (const section in this.mediaData) {
            this.renderSection(section);
        }
    }

    renderSection(section) {
        const sectionEl = document.getElementById(`${section}-section`);
        if (!sectionEl) return;

        const grid = sectionEl.querySelector('.media-grid');
        grid.innerHTML = '';
        this.mediaData[section].forEach(item => {
            // Check if image has optimized formats
            let formatBadges = '';
            if (item.formats) {
                formatBadges = '<div class="image-formats">';
                if (item.formats.webp) {
                    formatBadges += '<span class="format-badge webp">WebP</span>';
                }
                if (item.formats.avif) {
                    formatBadges += '<span class="format-badge avif">AVIF</span>';
                }
                if (item.responsive && item.responsive.length > 0) {
                    formatBadges += '<span class="format-badge responsive">Responsive</span>';
                }
                formatBadges += '</div>';
            }
            
            const card = `
                <div class="media-card" data-id="${item.id}" data-section="${section}">
                    <div class="media-card-image">
                        <img src="${item.src}" alt="${item.name}">
                    </div>
                    <div class="media-card-info">
                        <div class="media-name">${item.name}</div>
                        ${item.size ? `<div class="media-size">${this.formatFileSize(item.size)}</div>` : ''}
                        ${item.width && item.height ? `<div class="media-dimensions">${item.width}×${item.height}</div>` : ''}
                        ${formatBadges}
                    </div>
                    <div class="media-card-actions">
                        <button class="btn-icon replace-btn"><i class="fas fa-sync-alt"></i></button>
                        <button class="btn-icon delete-btn"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', card);
        });

        this.bindCardButtons(grid);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    bindCardButtons(grid) {
        grid.querySelectorAll('.replace-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.media-card');
                const section = card.dataset.section;
                const id = card.dataset.id;
                this.openModal(section, id);
            });
        });

        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Are you sure you want to delete this image?')) {
                    const card = e.target.closest('.media-card');
                    const section = card.dataset.section;
                    const id = card.dataset.id;
                    this.mediaData[section] = this.mediaData[section].filter(item => item.id !== id);
                    this.renderSection(section);
                }
            });
        });
    }

    openModal(section, id = null) {
        this.editingMedia = { section, id, newFile: null };
        
        // Clear any previous state first
        this.fileInput.value = '';
        const previewArea = document.getElementById('preview-area');
        const currentImagePreview = document.getElementById('current-image-preview');
        const newImagePreview = document.getElementById('new-image-preview');
        
        if (previewArea) {
            previewArea.innerHTML = '';
        }
        if (currentImagePreview) {
            currentImagePreview.src = '';
        }
        if (newImagePreview) {
            newImagePreview.src = '';
        }
        
        const uploaderDiv = document.getElementById('uploader');
        const replaceDiv = document.getElementById('replace-preview');
        
        if (id) { // Replacing existing image
            const item = this.mediaData[section].find(i => i.id === id);
            this.modal.querySelector('#media-modal-title').textContent = `Replace ${item.name}`;
            document.getElementById('current-image-preview').src = item.src;
            uploaderDiv.style.display = 'block';
            replaceDiv.style.display = 'flex';
        } else { // Adding new image
            this.modal.querySelector('#media-modal-title').textContent = `Add to ${section}`;
            uploaderDiv.style.display = 'block';
            replaceDiv.style.display = 'none';
        }
        
        this.modal.style.display = 'flex';
    }

    closeModal() {
        this.modal.style.display = 'none';
        
        // Clear all preview areas and file input
        const previewArea = document.getElementById('preview-area');
        const currentImagePreview = document.getElementById('current-image-preview');
        const newImagePreview = document.getElementById('new-image-preview');
        
        if (previewArea) {
            previewArea.innerHTML = '';
        }
        if (currentImagePreview) {
            currentImagePreview.src = '';
        }
        if (newImagePreview) {
            newImagePreview.src = '';
        }
        
        this.fileInput.value = '';
        this.editingMedia = { section: null, id: null, newFile: null };
    }

    handleFileSelection(files) {
        if (!files.length) return;
        const file = files[0];
        this.editingMedia.newFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.editingMedia.id) { // Replace mode
                document.getElementById('new-image-preview').src = e.target.result;
            } else { // Add mode
                const previewArea = document.getElementById('preview-area');
                previewArea.innerHTML = `<img src="${e.target.result}" style="max-width:100%; border-radius: 8px;">`;
            }
        };
        reader.readAsDataURL(file);
    }

    async saveMedia() {
        const { section, id, newFile } = this.editingMedia;
        if (!newFile) {
            alert('Please select a file to upload.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', newFile);
            formData.append('section', section);

            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.API_BASE}/api/admin/media/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                
                if (id) { // Replace
                    const item = this.mediaData[section].find(i => i.id === id);
                    item.src = result.file.src;
                    item.name = result.file.name;
                    item.size = result.file.size;
                } else { // Add
                    const newItem = {
                        id: result.file.id,
                        src: result.file.src,
                        name: result.file.name,
                        type: result.file.type,
                        size: result.file.size
                    };
                    this.mediaData[section].push(newItem);
                }
                
                this.renderSection(section);
                this.closeModal();
                
                // Show success message
                this.showNotification('File uploaded successfully!', 'success');
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: ${type === 'success' ? '#28a745' : '#17a2b8'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}
