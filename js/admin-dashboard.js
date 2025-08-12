// Admin Dashboard Real Analytics Integration
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardAnalytics();
    setupDashboardEventListeners();
    
    // Refresh data every 30 seconds
    setInterval(loadDashboardAnalytics, 30000);
});

function setupDashboardEventListeners() {
    // Period selector for analytics
    const periodSelector = document.getElementById('analytics-period');
    if (periodSelector) {
        periodSelector.addEventListener('change', loadDashboardAnalytics);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardAnalytics);
    }
}

async function loadDashboardAnalytics() {
    try {
        const period = document.getElementById('analytics-period')?.value || '30';
        
        const response = await fetch(`/api/admin/analytics/dashboard?period=${period}`);
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.stats);
            updateRecentOrders(data.stats.recent_orders);
            updateTopProducts(data.stats.top_products);
        } else {
            console.error('Failed to load analytics:', data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard analytics:', error);
    }
}

function updateDashboardStats(stats) {
    // Update main statistics cards
    updateElement('total-orders-stat', stats.total_orders || 0);
    updateElement('total-revenue-stat', `$${parseFloat(stats.total_revenue || 0).toLocaleString()}`);
    updateElement('total-products-stat', stats.total_products || 0);
    updateElement('total-customers-stat', stats.total_customers || 0);
    
    // Update period statistics
    updateElement('period-orders', stats.period_orders || 0);
    updateElement('period-revenue', `$${parseFloat(stats.period_revenue || 0).toLocaleString()}`);
    updateElement('period-customers', stats.period_customers || 0);
    updateElement('low-stock-products', stats.low_stock_products || 0);
    
    // Update percentage changes (mock calculation for demo)
    updatePercentageChange('orders-change', stats.period_orders, stats.total_orders);
    updatePercentageChange('revenue-change', stats.period_revenue, stats.total_revenue);
    updatePercentageChange('customers-change', stats.period_customers, stats.total_customers);
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updatePercentageChange(id, current, total) {
    const element = document.getElementById(id);
    if (element && total > 0) {
        const percentage = ((current / total) * 100).toFixed(1);
        element.textContent = `+${percentage}%`;
        element.className = 'percentage-change positive';
    }
}

function updateRecentOrders(orders) {
    const container = document.getElementById('recent-orders-list');
    if (!container || !orders) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="no-data">No recent orders</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-item" onclick="viewOrderDetails(${order.id})">
            <div class="order-info">
                <div class="order-number">#${order.order_number}</div>
                <div class="customer-name">${order.first_name || ''} ${order.last_name || ''}</div>
                <div class="order-email">${order.email}</div>
            </div>
            <div class="order-details">
                <div class="order-amount">$${parseFloat(order.total_amount).toFixed(2)}</div>
                <div class="order-status">
                    <span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span>
                </div>
                <div class="order-date">${formatRelativeTime(order.created_at)}</div>
            </div>
        </div>
    `).join('');
}

function updateTopProducts(products) {
    const container = document.getElementById('top-products-list');
    if (!container || !products) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p class="no-data">No product data available</p>';
        return;
    }
    
    container.innerHTML = products.map((product, index) => `
        <div class="product-item">
            <div class="product-rank">#${index + 1}</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-stats">
                    <span class="sold-count">${product.sold_quantity} sold</span>
                    <span class="revenue-amount">$${parseFloat(product.revenue).toFixed(2)} revenue</span>
                </div>
            </div>
        </div>
    `).join('');
}

function viewOrderDetails(orderId) {
    // Redirect to order details page or open modal
    window.location.href = `admin-orders.html#order-${orderId}`;
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Add notification checking
async function checkNotifications() {
    try {
        // Check for low stock products
        const response = await fetch('/api/admin/products?status=active&lowStock=true');
        const data = await response.json();
        
        if (data.success && data.products) {
            const lowStockCount = data.products.filter(p => 
                p.quantity <= (p.low_stock_threshold || 5)
            ).length;
            
            if (lowStockCount > 0) {
                showLowStockNotification(lowStockCount);
            }
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

function showLowStockNotification(count) {
    const notificationBadge = document.querySelector('.notification-badge');
    if (notificationBadge) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = count > 0 ? 'block' : 'none';
    }
}

// Initialize notifications check
setTimeout(checkNotifications, 2000);
setInterval(checkNotifications, 300000); // Check every 5 minutes
