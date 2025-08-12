// Admin Notifications Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadNotifications();
    setupEventListeners();
});

function setupEventListeners() {
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }

    const deleteAllBtn = document.getElementById('delete-all-btn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', deleteAllNotifications);
    }
}

async function loadNotifications() {
    try {
        showLoading(true);
        const response = await fetch('/api/admin/notifications');
        const data = await response.json();

        if (data.success) {
            renderNotifications(data.notifications);
            updateNotificationCount(data.notifications);
        } else {
            showError('Failed to load notifications: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        showError('Failed to load notifications');
    } finally {
        showLoading(false);
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state text-center">
                <i class="fas fa-bell-slash fa-3x text-muted"></i>
                <p class="mt-3">You have no new notifications.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <p>${notification.message}</p>
                <small class="text-muted">${timeAgo(notification.created_at)}</small>
            </div>
            <div class="notification-actions">
                <button class="action-btn" onclick="toggleReadStatus('${notification.id}', ${notification.read})">
                    <i class="fas ${notification.read ? 'fa-envelope-open' : 'fa-envelope'}"></i>
                </button>
                <button class="action-btn" onclick="deleteNotification('${notification.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateNotificationCount(notifications) {
    const unreadCount = notifications.filter(n => !n.read).length;
    const countElement = document.getElementById('notification-count');
    if (countElement) {
        countElement.textContent = unreadCount;
        countElement.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

async function toggleReadStatus(id, currentState) {
    try {
        const response = await fetch(`/api/admin/notifications/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: !currentState })
        });
        const data = await response.json();
        if (data.success) {
            loadNotifications();
        } else {
            showError('Failed to update notification status.');
        }
    } catch (error) {
        showError('Error updating notification.');
    }
}

async function markAllAsRead() {
    try {
        const response = await fetch('/api/admin/notifications/mark-all-read', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showSuccess('All notifications marked as read.');
            loadNotifications();
        } else {
            showError('Failed to mark all as read.');
        }
    } catch (error) {
        showError('Error marking all notifications as read.');
    }
}

async function deleteNotification(id) {
    try {
        const response = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            loadNotifications();
        } else {
            showError('Failed to delete notification.');
        }
    } catch (error) {
        showError('Error deleting notification.');
    }
}

async function deleteAllNotifications() {
    Swal.fire({
        title: 'Are you sure?',
        text: "This will delete all notifications. This action cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete all!',
        confirmButtonColor: '#d33'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch('/api/admin/notifications', { method: 'DELETE' });
                const data = await response.json();
                if (data.success) {
                    showSuccess('All notifications have been deleted.');
                    loadNotifications();
                } else {
                    showError('Failed to delete all notifications.');
                }
            } catch (error) {
                showError('Error deleting all notifications.');
            }
        }
    });
}

function getNotificationIcon(type) {
    switch (type) {
        case 'new_order': return 'fa-shopping-cart';
        case 'new_user': return 'fa-user-plus';
        case 'low_stock': return 'fa-exclamation-triangle';
        default: return 'fa-bell';
    }
}

function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const seconds = Math.floor((now - past) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

function showLoading(show) {
    const loadingElement = document.getElementById('loading-spinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    Swal.fire({ icon: 'error', title: 'Error', text: message });
}

function showSuccess(message) {
    Swal.fire({ icon: 'success', title: 'Success', text: message, timer: 2000, showConfirmButton: false });
}
