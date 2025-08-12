// Admin Pages Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadPages();
    setupEventListeners();
});

let currentPages = [];

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadPages);
    }

    // Add new page button
    const addPageBtn = document.getElementById('add-page-btn');
    if (addPageBtn) {
        addPageBtn.addEventListener('click', () => editPage(null));
    }
}

async function loadPages() {
    const searchTerm = document.getElementById('search-input')?.value || '';
    
    try {
        showLoading(true);
        
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        
        const response = await fetch(`/api/admin/pages?${params}`);
        const data = await response.json();
        
        if (data.success) {
            currentPages = data.pages;
            renderPagesTable(data.pages);
            updatePagesStats(data.pages);
        } else {
            showError('Failed to load pages: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading pages:', error);
        showError('Failed to load pages');
    } finally {
        showLoading(false);
    }
}

function renderPagesTable(pages) {
    const tableBody = document.querySelector('#pages-table tbody');
    if (!tableBody) return;

    if (pages.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>No pages found</p>
                        <button class="btn btn-primary mt-2" id="add-first-page-btn">Create New Page</button>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('add-first-page-btn')?.addEventListener('click', () => editPage(null));
        return;
    }

    tableBody.innerHTML = pages.map(page => `
        <tr data-page-id="${page.id}">
            <td>
                <input type="checkbox" class="page-checkbox" value="${page.id}">
            </td>
            <td>
                <div class="page-info">
                    <strong>${page.title}</strong>
                    <small>/${page.slug}</small>
                </div>
            </td>
            <td>
                <span class="badge badge-${page.status === 'published' ? 'success' : 'warning'}">
                    ${page.status}
                </span>
            </td>
            <td>${page.visibility}</td>
            <td>${formatDate(page.updated_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewPage('${page.slug}')" title="View Page">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editPage(${page.id})" title="Edit Page">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deletePage(${page.id})" title="Delete Page">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Setup select all checkbox
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.page-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
}

function updatePagesStats(pages) {
    const totalPages = pages.length;
    const publishedPages = pages.filter(page => page.status === 'published').length;
    
    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('published-pages').textContent = publishedPages;
}

function viewPage(pageSlug) {
    window.open(`/${pageSlug}`, '_blank');
}

function editPage(pageId) {
    const url = pageId ? `/admin/pages/edit/${pageId}` : '/admin/pages/new';
    window.location.href = url;
}

function deletePage(pageId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/admin/pages/${pageId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();

                if (data.success) {
                    showSuccess('Page deleted successfully');
                    loadPages();
                } else {
                    showError('Failed to delete page: ' + data.message);
                }
            } catch (error) {
                console.error('Error deleting page:', error);
                showError('An error occurred while deleting the page.');
            }
        }
    });
}

function handleSearch() {
    loadPages();
}

function showLoading(show) {
    const loadingElement = document.getElementById('loading-spinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}

function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: message,
        timer: 2000,
        showConfirmButton: false
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
