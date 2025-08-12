// Admin Blog Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadPosts();
    setupEventListeners();
});

let currentPosts = [];

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadPosts);
    }

    // Add new post button
    const addPostBtn = document.getElementById('add-post-btn');
    if (addPostBtn) {
        addPostBtn.addEventListener('click', () => editPost(null));
    }
}

async function loadPosts() {
    const searchTerm = document.getElementById('search-input')?.value || '';
    
    try {
        showLoading(true);
        
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        
        const response = await fetch(`/api/admin/blog/posts?${params}`);
        const data = await response.json();
        
        if (data.success) {
            currentPosts = data.posts;
            renderPostsTable(data.posts);
            updatePostsStats(data.posts);
        } else {
            showError('Failed to load posts: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        showError('Failed to load posts');
    } finally {
        showLoading(false);
    }
}

function renderPostsTable(posts) {
    const tableBody = document.querySelector('#posts-table tbody');
    if (!tableBody) return;

    if (posts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>No posts found</p>
                        <button class="btn btn-primary mt-2" id="add-first-post-btn">Create New Post</button>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('add-first-post-btn')?.addEventListener('click', () => editPost(null));
        return;
    }

    tableBody.innerHTML = posts.map(post => `
        <tr data-post-id="${post.id}">
            <td>
                <input type="checkbox" class="post-checkbox" value="${post.id}">
            </td>
            <td>
                <div class="post-info">
                    <strong>${post.title}</strong>
                    <small>By ${post.author_name}</small>
                </div>
            </td>
            <td>${post.category || 'Uncategorized'}</td>
            <td>
                <span class="badge badge-${post.status === 'published' ? 'success' : 'warning'}">
                    ${post.status}
                </span>
            </td>
            <td>${post.views || 0}</td>
            <td>${formatDate(post.published_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewPost(${post.id})" title="View Post">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editPost(${post.id})" title="Edit Post">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deletePost(${post.id})" title="Delete Post">
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
            const checkboxes = document.querySelectorAll('.post-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
}

function updatePostsStats(posts) {
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(post => post.status === 'published').length;
    const draftPosts = totalPosts - publishedPosts;
    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);

    document.getElementById('total-posts').textContent = totalPosts;
    document.getElementById('published-posts').textContent = publishedPosts;
    document.getElementById('draft-posts').textContent = draftPosts;
    document.getElementById('total-views').textContent = totalViews;
}

function viewPost(postId) {
    // Redirect to the actual blog post page
    window.open(`/blog/${postId}`, '_blank');
}

function editPost(postId) {
    // Redirect to the post editor page
    const url = postId ? `/admin/blog/edit/${postId}` : '/admin/blog/new';
    window.location.href = url;
}

function deletePost(postId) {
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
                const response = await fetch(`/api/admin/blog/posts/${postId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();

                if (data.success) {
                    showSuccess('Post deleted successfully');
                    loadPosts();
                } else {
                    showError('Failed to delete post: ' + data.message);
                }
            } catch (error) {
                console.error('Error deleting post:', error);
                showError('An error occurred while deleting the post.');
            }
        }
    });
}

function handleSearch() {
    loadPosts();
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
