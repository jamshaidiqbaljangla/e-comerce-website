/**
 * BINGO E-commerce Cart Diagnostic Tool
 * 
 * This script thoroughly diagnoses cart functionality issues by checking:
 * - Script loading
 * - DOM structure
 * - Event binding
 * - Cart operations
 * - localStorage
 * 
 * Instructions: Add this script to your HTML after all other scripts and
 * before the closing </body> tag. Then check the browser console (F12).
 */

(function() {
    // Create styled console logging
    const log = {
        info: msg => console.log('%c[INFO] ' + msg, 'color: #3498db; font-weight: bold;'),
        success: msg => console.log('%c[SUCCESS] ' + msg, 'color: #2ecc71; font-weight: bold;'),
        warn: msg => console.log('%c[WARNING] ' + msg, 'color: #f39c12; font-weight: bold;'),
        error: msg => console.log('%c[ERROR] ' + msg, 'color: #e74c3c; font-weight: bold;'),
        group: title => console.group('%c' + title, 'color: #9b59b6; font-weight: bold;'),
        groupEnd: () => console.groupEnd()
    };
    
    // Start diagnostic
    log.group('CART DIAGNOSTIC TOOL');
    log.info('Starting comprehensive cart diagnostic...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDiagnostic);
    } else {
        runDiagnostic();
    }
    
    function runDiagnostic() {
        log.info('DOM is ready. Running diagnostics...');
        
        // 1. Check if required scripts are loaded
        checkScripts();
        
        // 2. Check DOM structure
        checkDOMStructure();
        
        // 3. Check event binding
        checkEventBinding();
        
        // 4. Check localStorage
        checkLocalStorage();
        
        // 5. Test cart operations
        testCartOperations();
        
        // 6. Provide summary and recommendations
        provideSummary();
    }
    
    // 1. Check if required scripts are loaded
    function checkScripts() {
        log.group('SCRIPT CHECK');
        
        const requiredScripts = [
            { name: 'PRODUCTS', global: window.PRODUCTS, desc: 'Product data object' },
            { name: 'ProductRenderer', global: window.ProductRenderer, desc: 'Product rendering functionality' },
            { name: 'CartManager', global: window.CartManager, desc: 'Cart management functionality' }
        ];
        
        let missingScripts = 0;
        requiredScripts.forEach(script => {
            if (typeof script.global === 'undefined') {
                log.error(`${script.name} (${script.desc}) is not loaded or not defined correctly`);
                missingScripts++;
            } else {
                log.success(`${script.name} is loaded properly`);
            }
        });
        
        // Check file inclusion in document
        const pageScripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
        log.info('Page scripts included:');
        pageScripts.forEach(src => {
            if (src) console.log('  - ' + src);
        });
        
        if (missingScripts > 0) {
            log.error(`${missingScripts} required scripts are missing or not initialized properly`);
            log.warn('Check that you have added these script tags in your HTML in this exact order:');
            log.info('<script src="js/products-data.js"></script>');
            log.info('<script src="js/product-renderer.js"></script>');
            log.info('<script src="js/cart-manager.js"></script>');
            log.info('<script src="js/main.js"></script>');
        } else {
            log.success('All required scripts are loaded properly');
        }
        
        log.groupEnd();
    }
    
    // 2. Check DOM structure
    function checkDOMStructure() {
        log.group('DOM STRUCTURE CHECK');
        
        // Required elements for cart functionality
        const requiredElements = [
            { name: '.cart-count', desc: 'Cart count display in header' },
            { name: '.cart-toggle, .cart-dropdown', desc: 'Cart dropdown components' },
            { name: '.product-card', desc: 'Product cards' },
            { name: '.add-to-cart-btn', desc: 'Add to cart buttons' }
        ];
        
        let missingElements = 0;
        requiredElements.forEach(el => {
            const elements = document.querySelectorAll(el.name);
            if (elements.length === 0) {
                log.error(`${el.name} (${el.desc}) not found in the document`);
                missingElements++;
            } else {
                log.success(`${el.name}: ${elements.length} found`);
            }
        });
        
        // Check detailed product card structure if they exist
        const productCards = document.querySelectorAll('.product-card');
        if (productCards.length > 0) {
            log.group('PRODUCT CARD STRUCTURE');
            
            const firstCard = productCards[0];
            const requiredAttributes = [
                { name: 'data-product-id', value: firstCard.getAttribute('data-product-id') },
                { name: '.product-title a', value: firstCard.querySelector('.product-title a')?.textContent },
                { name: '.current-price', value: firstCard.querySelector('.current-price')?.textContent },
                { name: '.primary-image', value: firstCard.querySelector('.primary-image')?.getAttribute('src') }
            ];
            
            let missingAttributes = 0;
            requiredAttributes.forEach(attr => {
                if (!attr.value) {
                    log.error(`${attr.name} is missing in product card`);
                    missingAttributes++;
                } else {
                    log.success(`${attr.name}: ${attr.value}`);
                }
            });
            
            if (missingAttributes > 0) {
                log.error(`Product card is missing ${missingAttributes} required attributes`);
                log.warn('The cart functionality relies on these attributes to identify products');
            } else {
                log.success('Product card structure looks correct');
            }
            
            log.groupEnd();
        }
        
        if (missingElements > 0) {
            log.error(`${missingElements} required elements are missing from the document`);
            log.warn('The cart functionality relies on these elements to work properly');
        } else {
            log.success('All required DOM elements are present');
        }
        
        log.groupEnd();
    }
    
    // 3. Check event binding
    function checkEventBinding() {
        log.group('EVENT BINDING CHECK');
        
        // Test if Add to Cart buttons have click handlers
        const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
        if (addToCartBtns.length > 0) {
            log.info(`Found ${addToCartBtns.length} Add to Cart buttons`);
            
            // Test by adding a visible click handler to the first button
            const firstBtn = addToCartBtns[0];
            const originalBackground = firstBtn.style.backgroundColor;
            const originalColor = firstBtn.style.color;
            
            firstBtn.style.position = 'relative';
            
            // Add a small indicator
            const indicator = document.createElement('span');
            indicator.style.position = 'absolute';
            indicator.style.top = '-5px';
            indicator.style.right = '-5px';
            indicator.style.width = '10px';
            indicator.style.height = '10px';
            indicator.style.borderRadius = '50%';
            indicator.style.backgroundColor = '#3498db';
            firstBtn.appendChild(indicator);
            
            const originalOnClick = firstBtn.onclick;
            
            // Add diagnostic click handler
            firstBtn.addEventListener('click', function testClickHandler(e) {
                e.preventDefault();
                e.stopPropagation();
                
                log.info('Test click handler executed');
                indicator.style.backgroundColor = '#2ecc71';
                
                // Check if anything else responds to the click
                log.info('Checking if CartManager responds to click...');
                
                // Remove this test handler so it doesn't interfere
                firstBtn.removeEventListener('click', testClickHandler);
                
                // Wait a bit and check if cart count changes
                setTimeout(() => {
                    const cartCount = document.querySelector('.cart-count');
                    const countBefore = cartCount ? cartCount.textContent : '0';
                    
                    // Reset the button to normal
                    indicator.remove();
                    firstBtn.style.backgroundColor = originalBackground;
                    firstBtn.style.color = originalColor;
                    
                    // Trigger original click (if any)
                    if (originalOnClick) {
                        log.info('Executing original click handler...');
                        originalOnClick.call(firstBtn);
                    } else {
                        // No original handler, manually click
                        log.info('No original click handler, triggering native click...');
                        firstBtn.click();
                    }
                    
                    // Check again after a moment
                    setTimeout(() => {
                        const countAfter = cartCount ? cartCount.textContent : '0';
                        if (countBefore !== countAfter) {
                            log.success('Cart count changed after click, event handling is working');
                        } else {
                            log.error('Cart count did not change after click, event handling is not working');
                            log.warn('The Add to Cart button is not properly connected to the cart functionality');
                            
                            if (window.CartManager && typeof window.CartManager.handleAddToCart === 'function') {
                                log.info('Trying to diagnose handleAddToCart function...');
                                try {
                                    // Try to invoke it directly
                                    const cartManager = window.CartManager;
                                    const mockEvent = { preventDefault: ()=>{}, currentTarget: firstBtn };
                                    cartManager.handleAddToCart(mockEvent);
                                    log.info('handleAddToCart function executed without errors');
                                } catch (error) {
                                    log.error(`handleAddToCart error: ${error.message}`);
                                }
                            }
                        }
                    }, 500);
                }, 100);
                
                return false;
            });
            
            log.info('Test click handler added to first Add to Cart button (with blue dot)');
            log.info('Please click this button to test event handling...');
            
            firstBtn.style.backgroundColor = '#f1c40f';
            firstBtn.style.color = '#000';
        } else {
            log.error('No Add to Cart buttons found, cannot test event binding');
        }
        
        log.groupEnd();
    }
    
    // 4. Check localStorage
    function checkLocalStorage() {
        log.group('LOCAL STORAGE CHECK');
        
        try {
            // Test localStorage availability
            const testKey = '_cart_test_' + Math.random();
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            log.success('localStorage is available');
            
            // Check if cart data exists
            const cartData = localStorage.getItem('bingoCart');
            if (cartData) {
                try {
                    const cart = JSON.parse(cartData);
                    log.success(`Cart data found in localStorage: ${cart.items.length} items`);
                    log.info(`Cart contents: ${JSON.stringify(cart, null, 2)}`);
                } catch (e) {
                    log.error(`Cart data exists but is not valid JSON: ${e.message}`);
                }
            } else {
                log.warn('No cart data found in localStorage (bingoCart)');
            }
        } catch (e) {
            log.error(`localStorage error: ${e.message}`);
            log.warn('The cart might not be able to persist between page reloads');
        }
        
        log.groupEnd();
    }
    
    // 5. Test cart operations
    function testCartOperations() {
        log.group('CART OPERATIONS TEST');
        
        if (window.CartManager) {
            log.info('Testing CartManager methods...');
            
            // Test adding item to cart
            try {
                const testItem = {
                    id: 'test-' + Date.now(),
                    name: 'Test Product',
                    price: 10.99,
                    image: 'images/product-1.jpg',
                    quantity: 1
                };
                
                log.info(`Testing adding item: ${JSON.stringify(testItem)}`);
                
                // Get initial state
                const initialItems = [...window.CartManager.cart.items];
                const initialCount = initialItems.length;
                
                // Try to add the item
                window.CartManager.addItem(testItem);
                
                // Check if it was added
                const newCount = window.CartManager.cart.items.length;
                if (newCount > initialCount) {
                    log.success('Item was successfully added to cart');
                } else {
                    log.error('Failed to add item to cart');
                }
                
                // Restore original state
                window.CartManager.cart.items = initialItems;
                window.CartManager.calculateTotals();
                window.CartManager.saveCartToStorage();
                window.CartManager.updateCartDisplay();
                
                log.info('Cart restored to original state');
            } catch (e) {
                log.error(`Error testing cart operations: ${e.message}`);
            }
        } else {
            log.error('CartManager not available, cannot test cart operations');
        }
        
        log.groupEnd();
    }
    
    // 6. Provide summary and recommendations
    function provideSummary() {
        log.group('SUMMARY AND RECOMMENDATIONS');
        
        const issues = {
            scripts: typeof window.CartManager === 'undefined',
            dom: document.querySelectorAll('.add-to-cart-btn').length === 0,
            storage: false
        };
        
        try {
            localStorage.getItem('test');
        } catch (e) {
            issues.storage = true;
        }
        
        const hasIssues = issues.scripts || issues.dom || issues.storage;
        
        if (hasIssues) {
            log.error('Cart diagnostic found issues that need to be fixed:');
            
            if (issues.scripts) {
                log.error('1. Script loading issue - CartManager is not defined');
                log.info('Solution: Make sure all script files are properly included in the correct order:');
                log.info('  - products-data.js');
                log.info('  - product-renderer.js');
                log.info('  - cart-manager.js');
                log.info('  - main.js');
            }
            
            if (issues.dom) {
                log.error('2. DOM structure issue - Required elements are missing');
                log.info('Solution: Make sure your HTML includes elements with these classes:');
                log.info('  - .product-card (with data-product-id attribute)');
                log.info('  - .add-to-cart-btn');
                log.info('  - .cart-count');
                log.info('  - .cart-dropdown');
            }
            
            if (issues.storage) {
                log.error('3. localStorage issue - Cannot store cart data');
                log.info('Solution: Check browser settings or use private browsing mode');
            }
            
            log.warn('After fixing these issues, refresh the page and run this diagnostic again');
        } else {
            log.success('Basic requirements are met, but if cart still doesn\'t work, check:');
            log.info('1. Event handling - Click events might not be properly bound');
            log.info('2. Product data - Make sure products have correct data structure');
            log.info('3. Script execution - Check for JavaScript errors in the console');
            log.info('4. CSS conflicts - Styles might be hiding cart elements');
        }
        
        // Add helper functions for manual testing
        if (typeof window.CartManager !== 'undefined') {
            window.testAddToCart = function(productId, name, price) {
                const testItem = {
                    id: productId || 'test-product',
                    name: name || 'Test Product',
                    price: price || 19.99,
                    image: 'images/product-1.jpg',
                    quantity: 1
                };
                
                window.CartManager.addItem(testItem);
                console.log('Test item added to cart:', testItem);
                return 'Item added! Check cart count and dropdown.';
            };
            
            window.clearCart = function() {
                window.CartManager.cart.items = [];
                window.CartManager.calculateTotals();
                window.CartManager.saveCartToStorage();
                window.CartManager.updateCartDisplay();
                console.log('Cart cleared');
                return 'Cart cleared!';
            };
            
            log.info('Helper functions added to window object:');
            log.info('- testAddToCart(productId, name, price) - Test adding an item to cart');
            log.info('- clearCart() - Clear the cart completely');
        }
        
        log.groupEnd();
        log.info('Diagnostic complete! Check the results above for issues and solutions.');
        log.groupEnd();
    }
})();