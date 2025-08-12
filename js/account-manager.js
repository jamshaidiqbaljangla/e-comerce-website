/**
 * BINGO E-commerce Account Manager
 * Handles account dashboard, orders, addresses, payment methods, and settings
 */

window.AccountManager = {
    // Configuration
    USERS_KEY: 'bingoUsers',
    SESSION_KEY: 'bingoLoggedInUser',
    
    /**
     * Initialize the account manager
     */
    init: function() {
        console.log('[DEBUG] account-manager.js: Account Manager initializing...');
        
        // ONLY check authentication if we're on the account page
        if (window.location.pathname.includes('account.html')) {
            if (!this.isAuthenticated()) {
                console.log('[DEBUG] account-manager.js: User not authenticated, redirecting to login');
                window.location.href = 'login.html';
                return;
            }
            
            // Load user data
            const userData = this.loadUserData();
            if (!userData) {
                console.error('[ERROR] account-manager.js: User data not found');
                window.location.href = 'login.html';
                return;
            }
            
            // Setup account page
            this.setupAccountPage(userData);
            
            // Setup tab navigation
            this.setupTabNavigation();
            
            // Setup logout button
            this.setupLogout();
        }
        
        console.log('[DEBUG] account-manager.js: Account Manager initialized');
    },
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated: function() {
        try {
            const userData = localStorage.getItem(this.SESSION_KEY);
            if (!userData) return false;
            
            // Parse the user data
            const user = JSON.parse(userData);
            
            // Check if session has expired
            if (user.expiresAt && user.expiresAt < new Date().getTime()) {
                localStorage.removeItem(this.SESSION_KEY);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[ERROR] account-manager.js: Authentication check error:', error);
            return false;
        }
    },
    
    /**
     * Load user data from localStorage
     */
    loadUserData: function() {
        try {
            // Get current user from session
            const currentUser = JSON.parse(localStorage.getItem(this.SESSION_KEY));
            if (!currentUser) return null;
            
            // Find user in users database
            const users = JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
            return users.find(user => user.id === currentUser.id);
        } catch (error) {
            console.error('[ERROR] account-manager.js: Error loading user data:', error);
            return null;
        }
    },
    
    /**
     * Setup account page with user data
     */
    setupAccountPage: function(userData) {
        // Update welcome message
        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName) {
            welcomeName.textContent = `Hello, ${userData.name}`;
        }
        
        // Load dashboard stats
        this.loadDashboardStats(userData);
        
        // Load recent orders
        this.loadRecentOrders(userData);
        
        // Load all orders 
        this.loadAllOrders(userData);
        
        // Load addresses
        this.loadAddresses(userData);
        
        // Load payment methods
        this.loadPaymentMethods(userData);
        
        // Load wishlist
        this.loadWishlist(userData);
        
        // Load account settings
        this.loadAccountSettings(userData);
        
        // Setup forms and modals
        this.setupAddressModal();
        this.setupPaymentModal();
        this.setupAccountForm(userData);
    },
    
    /**
     * Setup tab navigation
     */
    setupTabNavigation: function() {
        const tabs = document.querySelectorAll('.account-tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding content
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
                
                // Update URL hash for direct linking
                window.location.hash = tabId;
            });
        });
        
        // Check for hash in URL to show corresponding tab
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            const tabToActivate = document.querySelector(`.account-tab[data-tab="${hash}"]`);
            if (tabToActivate) {
                tabToActivate.click();
            }
        }
        
        // Handle "View All Orders" button
        const viewAllOrdersBtn = document.querySelector('.btn[data-tab="orders"]');
        if (viewAllOrdersBtn) {
            viewAllOrdersBtn.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelector('.account-tab[data-tab="orders"]').click();
            });
        }
    },
    
    /**
     * Setup logout button
     */
    setupLogout: function() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                localStorage.removeItem('bingoLoggedInUser');
                window.location.href = 'login.html';
            });
        }
    },
    
    /**
     * Load dashboard stats
     */
    loadDashboardStats: function(userData) {
        // Update order count
        const orderCount = document.getElementById('order-count');
        if (orderCount) {
            orderCount.textContent = userData.orders ? userData.orders.length : '0';
        }
        
        // Update pending orders count
        const pendingCount = document.getElementById('pending-count');
        if (pendingCount) {
            const pendingOrders = userData.orders ? userData.orders.filter(order => order.status === 'processing') : [];
            pendingCount.textContent = pendingOrders.length;
        }
        
        // Update wishlist count
        const wishlistCount = document.getElementById('wishlist-count');
        if (wishlistCount) {
            wishlistCount.textContent = userData.wishlist ? userData.wishlist.length : '0';
        }
    },
    
    /**
     * Load recent orders
     */
    loadRecentOrders: function(userData) {
        const recentOrdersContainer = document.getElementById('recent-orders-container');
        const recentOrdersTable = document.getElementById('recent-orders');
        const noOrdersMessage = document.getElementById('no-orders-message');
        
        if (!recentOrdersContainer || !recentOrdersTable || !noOrdersMessage) return;
        
        if (!userData.orders || userData.orders.length === 0) {
            // No orders, show empty state
            recentOrdersContainer.querySelector('table').style.display = 'none';
            noOrdersMessage.style.display = 'block';
            return;
        }
        
        // Show recent orders (up to 3)
        const recentOrders = userData.orders.slice(0, 3);
        let ordersHtml = '';
        
        recentOrders.forEach(order => {
            const statusClass = this.getStatusClass(order.status);
            
            ordersHtml += `
                <tr>
                    <td>${order.orderId}</td>
                    <td>${this.formatDate(order.date)}</td>
                    <td><span class="order-status ${statusClass}">${this.capitalizeFirst(order.status)}</span></td>
                    <td>${this.formatPrice(order.total)}</td>
                    <td><a href="#orders" class="btn btn-sm btn-outline" data-order-id="${order.orderId}">View Order</a></td>
                </tr>
            `;
        });
        
        recentOrdersTable.innerHTML = ordersHtml;
        recentOrdersContainer.querySelector('table').style.display = 'table';
        noOrdersMessage.style.display = 'none';
    },
    
    /**
     * Load all orders
     */
    loadAllOrders: function(userData) {
        const allOrdersContainer = document.getElementById('all-orders-container');
        const allOrdersTable = document.getElementById('all-orders');
        const noAllOrdersMessage = document.getElementById('no-all-orders-message');
        
        if (!allOrdersContainer || !allOrdersTable || !noAllOrdersMessage) return;
        
        if (!userData.orders || userData.orders.length === 0) {
            // No orders, show empty state
            allOrdersContainer.querySelector('table').style.display = 'none';
            noAllOrdersMessage.style.display = 'block';
            return;
        }
        
        // Show all orders
        let ordersHtml = '';
        
        userData.orders.forEach(order => {
            const statusClass = this.getStatusClass(order.status);
            
            ordersHtml += `
                <tr>
                    <td>${order.orderId}</td>
                    <td>${this.formatDate(order.date)}</td>
                    <td><span class="order-status ${statusClass}">${this.capitalizeFirst(order.status)}</span></td>
                    <td>${order.items.length} item${order.items.length !== 1 ? 's' : ''}</td>
                    <td>${this.formatPrice(order.total)}</td>
                    <td><a href="#" class="btn btn-sm btn-outline" data-order-id="${order.orderId}">View</a></td>
                </tr>
            `;
        });
        
        allOrdersTable.innerHTML = ordersHtml;
        allOrdersContainer.querySelector('table').style.display = 'table';
        noAllOrdersMessage.style.display = 'none';
    },
    
    /**
     * Load addresses
     */
    loadAddresses: function(userData) {
        const addressesContainer = document.getElementById('addresses-container');
        const addressList = document.getElementById('address-list');
        const noAddressesMessage = document.getElementById('no-addresses-message');
        
        if (!addressesContainer || !addressList || !noAddressesMessage) return;
        
        if (!userData.addresses || userData.addresses.length === 0) {
            // No addresses, show empty state
            addressList.style.display = 'none';
            noAddressesMessage.style.display = 'block';
            return;
        }
        
        // Show addresses
        let addressesHtml = '';
        
        userData.addresses.forEach(address => {
            addressesHtml += `
                <div class="address-card" data-address-id="${address.id}">
                    <span class="address-type ${address.isDefault ? 'address-default' : ''}">${address.isDefault ? 'Default' : address.type}</span>
                    <div class="address-actions">
                        <button class="address-action-btn edit-address" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        <button class="address-action-btn delete-address" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div class="address-content">
                        <div class="address-name">${address.name}</div>
                        <div class="address-details">
                            ${address.line1}<br>
                            ${address.line2 ? address.line2 + '<br>' : ''}
                            ${address.city}, ${address.state} ${address.zip}<br>
                            ${address.country}
                        </div>
                        <div class="address-contact">
                            ${address.phone}
                        </div>
                    </div>
                </div>
            `;
        });
        
        addressList.innerHTML = addressesHtml;
        addressList.style.display = 'grid';
        noAddressesMessage.style.display = 'none';
        
        // Add event listeners to edit and delete buttons
        this.setupAddressActions();
    },
    
    /**
     * Load payment methods
     */
    loadPaymentMethods: function(userData) {
        const paymentMethodsContainer = document.getElementById('payment-methods-container');
        const paymentList = document.getElementById('payment-list');
        const noPaymentsMessage = document.getElementById('no-payments-message');
        
        if (!paymentMethodsContainer || !paymentList || !noPaymentsMessage) return;
        
        if (!userData.paymentMethods || userData.paymentMethods.length === 0) {
            // No payment methods, show empty state
            paymentList.style.display = 'none';
            noPaymentsMessage.style.display = 'block';
            return;
        }
        
        // Show payment methods
        let paymentsHtml = '';
        
        userData.paymentMethods.forEach(payment => {
            const cardType = this.getCardType(payment.cardNumber);
            const cardIcon = this.getCardIcon(cardType);
            
            paymentsHtml += `
                <div class="payment-card" data-payment-id="${payment.id}">
                    <div class="payment-card-header">
                        <div class="payment-card-logo">
                            <i class="${cardIcon}"></i>
                        </div>
                        <div class="payment-card-type">${cardType}</div>
                    </div>
                    <div class="payment-card-number">${this.formatCardNumber(payment.cardNumber)}</div>
                    <div class="payment-card-name">${payment.cardholderName}</div>
                    <div class="payment-card-expiry">Expires: ${payment.expiryDate}</div>
                    <div class="payment-card-actions">
                        <button class="address-action-btn edit-payment" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        <button class="address-action-btn delete-payment" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        });
        
        paymentList.innerHTML = paymentsHtml;
        paymentList.style.display = 'grid';
        noPaymentsMessage.style.display = 'none';
        
        // Add event listeners to edit and delete buttons
        this.setupPaymentActions();
    },
    
    /**
     * Load wishlist
     */
    loadWishlist: function(userData) {
        const wishlistContainer = document.getElementById('wishlist-container');
        const wishlistList = document.getElementById('wishlist-list');
        const noWishlistMessage = document.getElementById('no-wishlist-message');
        
        if (!wishlistContainer || !wishlistList || !noWishlistMessage) return;
        
        if (!userData.wishlist || userData.wishlist.length === 0) {
            // No wishlist items, show empty state
            wishlistList.style.display = 'none';
            noWishlistMessage.style.display = 'block';
            return;
        }
        
        // Show wishlist items
        let wishlistHtml = '';
        
        // For demo purposes, use placeholder product data
        // In a real app, you would fetch product details from your database
        userData.wishlist.forEach(item => {
            wishlistHtml += `
                <div class="wishlist-item" data-product-id="${item.productId}">
                    <div class="wishlist-image">
                        <img src="images/product-${Math.floor(Math.random() * 8) + 1}.jpg" alt="Product">
                        <button class="wishlist-remove" title="Remove from wishlist">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wishlist-content">
                        <h4 class="wishlist-title">${item.productName || 'Product Name'}</h4>
                        <div class="wishlist-price">${this.formatPrice(item.price || 199)}</div>
                        <div class="wishlist-actions">
                            <button class="btn btn-dark btn-sm wishlist-btn">Add to Cart</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        wishlistList.innerHTML = wishlistHtml;
        wishlistList.style.display = 'grid';
        noWishlistMessage.style.display = 'none';
        
        // Add event listeners to wishlist actions
        this.setupWishlistActions();
    },
    
    /**
     * Load account settings
     */
    loadAccountSettings: function(userData) {
        const accountForm = document.getElementById('account-form');
        if (!accountForm) return;
        
        // Set form values
        document.getElementById('firstName').value = userData.firstName || '';
        document.getElementById('lastName').value = userData.lastName || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('phone').value = userData.phone || '';
        
        // Set checkboxes based on user preferences
        document.getElementById('emailPromo').checked = userData.preferences?.emailPromo !== false;
        document.getElementById('emailOrder').checked = userData.preferences?.emailOrder !== false;
    },
    
    /**
     * Setup address modal
     */
    setupAddressModal: function() {
        const addAddressBtn = document.getElementById('add-address-btn');
        const emptyAddAddressBtn = document.getElementById('empty-add-address-btn');
        const addressModal = document.getElementById('address-modal');
        const addressForm = document.getElementById('address-form');
        const modalClose = addressModal ? addressModal.querySelector('.modal-close') : null;
        
        // Show modal when add address button is clicked
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', () => {
                this.showAddressModal();
            });
        }
        
        // Show modal when empty state add address button is clicked
        if (emptyAddAddressBtn) {
            emptyAddAddressBtn.addEventListener('click', () => {
                this.showAddressModal();
            });
        }
        
        // Close modal when close button is clicked
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                addressModal.classList.remove('active');
            });
        }
        
        // Close modal when clicking outside content
        if (addressModal) {
            addressModal.addEventListener('click', (e) => {
                if (e.target === addressModal) {
                    addressModal.classList.remove('active');
                }
            });
        }
        
        // Handle form submission
        if (addressForm) {
            addressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const addressId = document.getElementById('address-id').value;
                const isEdit = !!addressId;
                
                const addressData = {
                    id: isEdit ? addressId : Date.now().toString(),
                    name: document.getElementById('address-name').value,
                    line1: document.getElementById('address-line1').value,
                    line2: document.getElementById('address-line2').value,
                    city: document.getElementById('address-city').value,
                    state: document.getElementById('address-state').value,
                    zip: document.getElementById('address-zip').value,
                    country: document.getElementById('address-country').value,
                    phone: document.getElementById('address-phone').value,
                    isDefault: document.getElementById('address-default').checked,
                    type: 'Home' // Default type
                };
                
                // Save address
                if (isEdit) {
                    this.updateAddress(addressData);
                } else {
                    this.addAddress(addressData);
                }
                
                // Close modal
                addressModal.classList.remove('active');
            });
        }
    },
    
    /**
     * Show address modal for adding new address
     */
    showAddressModal: function(addressData = null) {
        const addressModal = document.getElementById('address-modal');
        const modalTitle = document.getElementById('address-modal-title');
        const addressForm = document.getElementById('address-form');
        
        if (!addressModal || !modalTitle || !addressForm) return;
        
        // Reset form
        addressForm.reset();
        
        if (addressData) {
            // Edit existing address
            modalTitle.textContent = 'Edit Address';
            
            // Set form values
            document.getElementById('address-id').value = addressData.id;
            document.getElementById('address-name').value = addressData.name;
            document.getElementById('address-line1').value = addressData.line1;
            document.getElementById('address-line2').value = addressData.line2 || '';
            document.getElementById('address-city').value = addressData.city;
            document.getElementById('address-state').value = addressData.state;
            document.getElementById('address-zip').value = addressData.zip;
            document.getElementById('address-country').value = addressData.country;
            document.getElementById('address-phone').value = addressData.phone;
            document.getElementById('address-default').checked = addressData.isDefault;
        } else {
            // Add new address
            modalTitle.textContent = 'Add New Address';
            document.getElementById('address-id').value = '';
        }
        
        // Show modal
        addressModal.classList.add('active');
    },
    
    /**
     * Setup payment modal
     */
    setupPaymentModal: function() {
        const addPaymentBtn = document.getElementById('add-payment-btn');
        const emptyAddPaymentBtn = document.getElementById('empty-add-payment-btn');
        const paymentModal = document.getElementById('payment-modal');
        const paymentForm = document.getElementById('payment-form');
        const modalClose = paymentModal ? paymentModal.querySelector('.modal-close') : null;
        
        // Show modal when add payment button is clicked
        if (addPaymentBtn) {
            addPaymentBtn.addEventListener('click', () => {
                this.showPaymentModal();
            });
        }
        
        // Show modal when empty state add payment button is clicked
        if (emptyAddPaymentBtn) {
            emptyAddPaymentBtn.addEventListener('click', () => {
                this.showPaymentModal();
            });
        }
        
        // Close modal when close button is clicked
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                paymentModal.classList.remove('active');
            });
        }
        
        // Close modal when clicking outside content
        if (paymentModal) {
            paymentModal.addEventListener('click', (e) => {
                if (e.target === paymentModal) {
                    paymentModal.classList.remove('active');
                }
            });
        }
        
        // Handle form submission
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const paymentId = document.getElementById('payment-id').value;
                const isEdit = !!paymentId;
                
                const paymentData = {
                    id: isEdit ? paymentId : Date.now().toString(),
                    cardNumber: document.getElementById('card-number').value.replace(/\s/g, ''),
                    cardholderName: document.getElementById('card-name').value,
                    expiryDate: document.getElementById('card-expiry').value,
                    cvv: document.getElementById('card-cvv').value
                };
                
                // Save payment method
                if (isEdit) {
                    this.updatePaymentMethod(paymentData);
                } else {
                    this.addPaymentMethod(paymentData);
                }
                
                // Close modal
                paymentModal.classList.remove('active');
            });
        }
    },
    
    /**
     * Show payment modal for adding new payment method
     */
    showPaymentModal: function(paymentData = null) {
        const paymentModal = document.getElementById('payment-modal');
        const modalTitle = document.getElementById('payment-modal-title');
        const paymentForm = document.getElementById('payment-form');
        
        if (!paymentModal || !modalTitle || !paymentForm) return;
        
        // Reset form
        paymentForm.reset();
        
        if (paymentData) {
            // Edit existing payment method
            modalTitle.textContent = 'Edit Payment Method';
            
            // Set form values
            document.getElementById('payment-id').value = paymentData.id;
            document.getElementById('card-number').value = this.formatCardNumber(paymentData.cardNumber);
            document.getElementById('card-name').value = paymentData.cardholderName;
            document.getElementById('card-expiry').value = paymentData.expiryDate;
            document.getElementById('card-cvv').value = paymentData.cvv;
        } else {
            // Add new payment method
            modalTitle.textContent = 'Add New Payment Method';
            document.getElementById('payment-id').value = '';
        }
        
        // Show modal
        paymentModal.classList.add('active');
    },
    
    /**
     * Setup account form
     */
    setupAccountForm: function(userData) {
        const accountForm = document.getElementById('account-form');
        if (!accountForm) return;
        
        accountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const emailPromo = document.getElementById('emailPromo').checked;
            const emailOrder = document.getElementById('emailOrder').checked;
            
            // Basic validation
            if (newPassword && newPassword !== confirmPassword) {
                alert('New passwords do not match.');
                return;
            }
            
            // Check current password if changing password
            if (newPassword && userData.password !== currentPassword) {
                alert('Current password is incorrect.');
                return;
            }
            
            // Build updated user data
            const updatedUserData = {
                firstName: firstName,
                lastName: lastName,
                name: `${firstName} ${lastName}`,
                email: email,
                phone: phone,
                preferences: {
                    emailPromo: emailPromo,
                    emailOrder: emailOrder
                }
            };
            
            // Add new password if provided
            if (newPassword) {
                updatedUserData.password = newPassword;
            }
            
            // Update user data
            if (this.updateUser(updatedUserData)) {
                alert('Account information updated successfully.');
                
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                alert('Error updating account information. Please try again.');
            }
        });
    },
    
    /**
     * Setup address actions (edit, delete)
     */
    setupAddressActions: function() {
        // Edit address buttons
        const editButtons = document.querySelectorAll('.edit-address');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const addressCard = e.target.closest('.address-card');
                if (!addressCard) return;
                
                const addressId = addressCard.getAttribute('data-address-id');
                const addressData = this.getAddressById(addressId);
                
                if (addressData) {
                    this.showAddressModal(addressData);
                }
            });
        });
        
        // Delete address buttons
        const deleteButtons = document.querySelectorAll('.delete-address');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const addressCard = e.target.closest('.address-card');
                if (!addressCard) return;
                
                const addressId = addressCard.getAttribute('data-address-id');
                
                if (confirm('Are you sure you want to delete this address?')) {
                    this.deleteAddress(addressId);
                }
            });
        });
    },
    
    /**
     * Setup payment method actions (edit, delete)
     */
    setupPaymentActions: function() {
        // Edit payment buttons
        const editButtons = document.querySelectorAll('.edit-payment');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const paymentCard = e.target.closest('.payment-card');
                if (!paymentCard) return;
                
                const paymentId = paymentCard.getAttribute('data-payment-id');
                const paymentData = this.getPaymentMethodById(paymentId);
                
                if (paymentData) {
                    this.showPaymentModal(paymentData);
                }
            });
        });
        
        // Delete payment buttons
        const deleteButtons = document.querySelectorAll('.delete-payment');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const paymentCard = e.target.closest('.payment-card');
                if (!paymentCard) return;
                
                const paymentId = paymentCard.getAttribute('data-payment-id');
                
                if (confirm('Are you sure you want to delete this payment method?')) {
                    this.deletePaymentMethod(paymentId);
                }
            });
        });
    },
    
    /**
     * Setup wishlist actions
     */
    setupWishlistActions: function() {
        // Remove from wishlist buttons
        const removeButtons = document.querySelectorAll('.wishlist-remove');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const wishlistItem = e.target.closest('.wishlist-item');
                if (!wishlistItem) return;
                
                const productId = wishlistItem.getAttribute('data-product-id');
                
                this.removeFromWishlist(productId);
            });
        });
        
        // Add to cart buttons
        const addToCartButtons = document.querySelectorAll('.wishlist-btn');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const wishlistItem = e.target.closest('.wishlist-item');
                if (!wishlistItem) return;
                
                const productId = wishlistItem.getAttribute('data-product-id');
                
                // Add to cart (if CartManager is available)
                if (window.CartManager && typeof window.CartManager.addToCart === 'function') {
                    window.CartManager.addToCart(productId, 1);
                    alert('Product added to cart!');
                } else {
                    alert('Product added to cart!');
                }
            });
        });
    },
    
    /**
     * Add new address
     */
    addAddress: function(addressData) {
        const userData = this.loadUserData();
        if (!userData) return false;
        
        // Initialize addresses array if not exists
        if (!userData.addresses) {
            userData.addresses = [];
        }
        
        // If this is the first address or set as default, update all others
        if (addressData.isDefault || userData.addresses.length === 0) {
            userData.addresses.forEach(address => {
                address.isDefault = false;
            });
        }
        
        // Add new address
        userData.addresses.push(addressData);
        
        // Save user data
        return this.updateUser(userData);
    },
    
    /**
     * Update existing address
     */
    updateAddress: function(addressData) {
        const userData = this.loadUserData();
        if (!userData) return false;
        
        // Find address index
        const addressIndex = userData.addresses.findIndex(address => address.id === addressData.id);
        
        if (addressIndex === -1) return false;
        
        // If this address is set as default, update all others
        if (addressData.isDefault) {
            userData.addresses.forEach(address => {
                address.isDefault = false;
            });
        }
        
        // Update address
        userData.addresses[addressIndex] = addressData;
        
        // Save user data
        return this.updateUser(userData);
    },
    
    /**
     * Delete address
     */
    deleteAddress: function(addressId) {
        const userData = this.loadUserData();
        if (!userData) return false;
        
        // Find address
        const address = userData.addresses.find(address => address.id === addressId);
        
        if (!address) return false;
        
        // Cannot delete default address
        if (address.isDefault) {
            alert('Cannot delete default address. Please set another address as default first.');
            return false;
        }
        
        // Remove address
        userData.addresses = userData.addresses.filter(address => address.id !== addressId);
        
        // Save user data
        if (this.updateUser(userData)) {
            // Reload addresses
            this.loadAddresses(userData);
            return true;
        }
        
        return false;
    },
    
    /**
     * Get address by ID
     */
    getAddressById: function(addressId) {
        const userData = this.loadUserData();
        if (!userData || !userData.addresses) return null;
        
        return userData.addresses.find(address => address.id === addressId);
    },
    
    /**
     * Add new payment method
     */
    addPaymentMethod: function(paymentData) {
        const userData = this.loadUserData();
        if (!userData) return false;
        
        // Initialize payment methods array if not exists
        if (!userData.paymentMethods) {
            userData.paymentMethods = [];
        }
        
        // Add new payment method
        userData.paymentMethods.push(paymentData);
        
        // Save user data
        return this.updateUser(userData);
    },
    
    /**
     * Update existing payment method
     */
    updatePaymentMethod: function(paymentData) {
        const userData = this.loadUserData();
        if (!userData) return false;
        
        // Find payment method index
        const paymentIndex = userData.paymentMethods.findIndex(payment => payment.id === paymentData.id);
        
        if (paymentIndex === -1) return false;
        
        // Update payment method
        userData.paymentMethods[paymentIndex] = paymentData;
        
        // Save user data
        return this.updateUser(userData);
    },
    
    /**
     * Delete payment method
     */
    deletePaymentMethod: function(paymentId) {
        const userData = this.loadUserData();
        if (!userData) return false;
        
        // Remove payment method
        userData.paymentMethods = userData.paymentMethods.filter(payment => payment.id !== paymentId);
        
        // Save user data
        if (this.updateUser(userData)) {
            // Reload payment methods
            this.loadPaymentMethods(userData);
            return true;
        }
        
        return false;
    },
    
    /**
     * Get payment method by ID
     */
    getPaymentMethodById: function(paymentId) {
        const userData = this.loadUserData();
        if (!userData || !userData.paymentMethods) return null;
        
        return userData.paymentMethods.find(payment => payment.id === paymentId);
    },
    
    /**
     * Remove from wishlist
     */
    removeFromWishlist: function(productId) {
        const userData = this.loadUserData();
        if (!userData) return false;
        
        // Remove from wishlist
        userData.wishlist = userData.wishlist.filter(item => item.productId !== productId);
        
        // Save user data
        if (this.updateUser(userData)) {
            // Reload wishlist
            this.loadWishlist(userData);
            return true;
        }
        
        return false;
    },
    
    /**
     * Update user data
     */
    updateUser: function(updatedUserData) {
        try {
            // Get current user from session
            const currentUser = JSON.parse(localStorage.getItem(this.SESSION_KEY));
            if (!currentUser) return false;
            
            // Get all users
            const users = JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
            
            // Find user index
            const userIndex = users.findIndex(user => user.id === currentUser.id);
            
            if (userIndex === -1) return false;
            
            // Update user data
            users[userIndex] = {
                ...users[userIndex],
                ...updatedUserData
            };
            
            // Save users
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            
            // Update session with name and email changes if needed
            if (updatedUserData.name || updatedUserData.email) {
                const sessionUser = {
                    id: currentUser.id,
                    name: updatedUserData.name || currentUser.name,
                    email: updatedUserData.email || currentUser.email,
                    expiresAt: currentUser.expiresAt
                };
                
                localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionUser));
            }
            
            return true;
        } catch (error) {
            console.error('[ERROR] account-manager.js: Error updating user:', error);
            return false;
        }
    },
    
    /**
     * Get card type based on card number
     */
    getCardType: function(cardNumber) {
        // Basic card type detection based on first digits
        const firstDigit = cardNumber.charAt(0);
        const firstTwoDigits = cardNumber.substring(0, 2);
        const firstFourDigits = cardNumber.substring(0, 4);
        
        if (firstDigit === '4') {
            return 'Visa';
        } else if (['51', '52', '53', '54', '55'].includes(firstTwoDigits)) {
            return 'Mastercard';
        } else if (['34', '37'].includes(firstTwoDigits)) {
            return 'American Express';
        } else if (['6011', '644', '65'].includes(firstFourDigits) || (firstTwoDigits === '62')) {
            return 'Discover';
        } else {
            return 'Credit Card';
        }
    },
    
    /**
     * Get card icon based on card type
     */
    getCardIcon: function(cardType) {
        switch (cardType) {
            case 'Visa':
                return 'fab fa-cc-visa';
            case 'Mastercard':
                return 'fab fa-cc-mastercard';
            case 'American Express':
                return 'fab fa-cc-amex';
            case 'Discover':
                return 'fab fa-cc-discover';
            default:
                return 'far fa-credit-card';
        }
    },
    
    /**
     * Format card number (e.g., **** **** **** 1234)
     */
    formatCardNumber: function(cardNumber) {
        if (!cardNumber) return '';
        
        // Keep last 4 digits visible
        const lastFour = cardNumber.slice(-4);
        return `**** **** **** ${lastFour}`;
    },
    
    /**
     * Format price with currency symbol
     */
    formatPrice: function(price) {
        return `$${parseFloat(price).toFixed(2)}`;
    },
    
    /**
     * Format date (e.g., May 5, 2025)
     */
    formatDate: function(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    /**
     * Get status class for order status
     */
    getStatusClass: function(status) {
        switch (status.toLowerCase()) {
            case 'delivered':
                return 'status-delivered';
            case 'processing':
                return 'status-processing';
            case 'canceled':
                return 'status-canceled';
            default:
                return '';
        }
    },
    
    /**
     * Capitalize first letter of string
     */
    capitalizeFirst: function(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};

// Initialize account manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.AccountManager) {
            window.AccountManager.init();
        }
    });
} else {
    if (window.AccountManager) {
        window.AccountManager.init();
    }
}

console.log('[DEBUG] account-manager.js: AccountManager object defined');