/**
 * Link Checker Script
 * Tests all internal and external links on the website
 */

class LinkChecker {
    /**
     * @param {Object} options - Configuration options
     * @param {boolean} [options.checkExternalLinks=false] - Attempt to check external links (limited by CORS)
     * @param {boolean} [options.markRedirects=true] - Mark redirected links differently 
     * @param {boolean} [options.skipQueryParams=false] - Treat URLs that differ only by query params as the same
     */
    constructor(options = {}) {
        this.brokenLinks = [];
        this.checkedLinks = new Set();
        this.internalDomain = window.location.hostname;
        this.startTime = 0;
        this.endTime = 0;
        this.totalLinks = 0;
        
        // Configuration options with defaults
        this.options = {
            checkExternalLinks: false,
            markRedirects: true,
            skipQueryParams: false,
            ...options
        };
    }

    /**
     * Initialize and start the link checking process
     * @param {Object} options - Configuration options
     * @param {number} [options.concurrency=5] - Number of concurrent requests
     * @param {number} [options.delay=100] - Delay between batches in milliseconds
     */
    async init(options = {}) {
        const { 
            concurrency = 5, // Number of concurrent requests
            delay = 100 // Delay between batches in milliseconds
        } = options;
        
        console.log('🔍 Link Checker: Starting link validation...');
        this.startTime = performance.now();
        
        // Get all links on the current page
        const links = document.querySelectorAll('a[href]');
        this.totalLinks = links.length;
        
        console.log(`Found ${this.totalLinks} links to check`);
        
        // Convert NodeList to array for batch processing
        const linksArray = Array.from(links);
        
        // Process links in batches to limit concurrency
        for (let i = 0; i < linksArray.length; i += concurrency) {
            const batch = linksArray.slice(i, i + concurrency);
            
            const batchPromises = batch.map(link => {
                const href = link.getAttribute('href');
                if (!this.checkedLinks.has(href)) {
                    this.checkedLinks.add(href);
                    return this.checkLink(href, link);
                }
                return Promise.resolve(); // Skip already checked links
            });
            
            // Process current batch
            await Promise.all(batchPromises);
            
            // Update progress in console
            const progress = Math.min(i + concurrency, linksArray.length);
            const percentage = Math.round((progress / linksArray.length) * 100);
            console.log(`Progress: ${percentage}% (${progress}/${linksArray.length})`);
            
            // Add delay between batches to avoid overwhelming the server
            if (i + concurrency < linksArray.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        this.endTime = performance.now();
        
        // Display results
        this.displayResults();
    }
    
    /**
     * Check if a link is valid
     * @param {string} href - The URL to check
     * @param {HTMLElement} linkElement - The link DOM element
     */
    async checkLink(href, linkElement) {
        // Skip javascript:void(0), #, and mailto: links
        if (href.startsWith('javascript:') || 
            href === '#' || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:')) {
            return;
        }
        
        try {
            // Handle relative URLs for internal links
            const isInternal = !href.startsWith('http') && !href.startsWith('//');
            
            if (isInternal) {
                // Normalize the URL - strip hash fragments as they refer to the same page
                const normalizedUrl = href.split('#')[0];
                
                // For internal links, we can check if the page exists without CORS issues
                const response = await fetch(normalizedUrl, { 
                    method: 'HEAD',
                    cache: 'no-cache' 
                });
                
                // Handle redirects (200, 301, 302 are considered valid)
                if (![200, 201, 301, 302, 307, 308].includes(response.status)) {
                    this.recordBrokenLink(href, linkElement, response.status);
                } else if ([301, 302, 307, 308].includes(response.status)) {
                    // Mark redirects differently but don't count them as broken
                    linkElement.dataset.linkCheckerStatus = 'redirect';
                    linkElement.setAttribute('title', `Redirects to another URL (${response.status})`);
                }
            } else {
                // For external links, we would ideally check them through a proxy to avoid CORS issues
                // In a real implementation, this might be handled by a server-side script
                console.log(`External link: ${href} - Cannot validate due to CORS restrictions`);
                // Alternative: visual indicator for links that weren't checked
                linkElement.dataset.linkCheckerStatus = 'unchecked-external';
                
                // Optional: Simple favicon check that might indicate if the domain exists
                try {
                    const domain = new URL(href).hostname;
                    const faviconUrl = `https://${domain}/favicon.ico`;
                    const faviconResponse = await fetch(faviconUrl, { 
                        method: 'HEAD',
                        mode: 'no-cors' // This allows the request but we can't check status
                    });
                    // We can't access the response status due to CORS, but if it doesn't throw,
                    // the domain likely exists (though the specific page might not)
                } catch (faviconError) {
                    // If even the favicon fails, the domain might not exist
                    linkElement.dataset.linkCheckerStatus = 'potential-issue';
                }
            }
        } catch (error) {
            this.recordBrokenLink(href, linkElement, 'Network Error');
        }
    }
    
    /**
     * Record a broken link
     * @param {string} href - The broken URL
     * @param {HTMLElement} linkElement - The link DOM element
     * @param {string|number} status - HTTP status or error message
     */
    recordBrokenLink(href, linkElement, status) {
        this.brokenLinks.push({
            href,
            text: linkElement.textContent.trim() || linkElement.getAttribute('aria-label') || 'No text',
            location: this.getLinkLocation(linkElement),
            status
        });
        
        // Add visual indicator for broken link
        linkElement.classList.add('broken-link');
        linkElement.dataset.linkCheckerStatus = 'broken';
        linkElement.setAttribute('title', `Broken link: ${status}`);
    }
    
    /**
     * Get a description of where the link is located in the page
     * @param {HTMLElement} element - The link DOM element
     * @returns {string} A description of the link's location
     */
    getLinkLocation(element) {
        let location = '';
        let parent = element.parentElement;
        
        // Check if link is in header
        if (element.closest('header')) {
            location = 'Header';
        } 
        // Check if link is in footer
        else if (element.closest('footer')) {
            location = 'Footer';
        }
        // Check if link is in navigation
        else if (element.closest('nav')) {
            location = 'Navigation';
        }
        // Check if link is in main content
        else if (element.closest('main') || element.closest('section')) {
            const section = element.closest('section');
            if (section && section.className) {
                location = `Section: ${section.className}`;
            } else {
                location = 'Main Content';
            }
        }
        
        return location || 'Unknown location';
    }
    
    /**
     * Display the results of the link checking
     */
    displayResults() {
        const duration = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        if (this.brokenLinks.length === 0) {
            console.log(`✅ All ${this.checkedLinks.size} links are valid! (Completed in ${duration}s)`);
        } else {
            console.log(`⚠️ Found ${this.brokenLinks.length} broken links out of ${this.checkedLinks.size} (Completed in ${duration}s):`);
            
            this.brokenLinks.forEach((link, index) => {
                console.log(`${index + 1}. ${link.text} [${link.href}] - Location: ${link.location} - Status: ${link.status}`);
            });
            
            // Create report in the DOM if in test mode
            if (window.location.search.includes('test=links')) {
                this.createVisualReport();
            }
        }
    }
    
    /**
     * Create a visual report in the DOM
     */
    createVisualReport() {
        // Create a floating report container
        const reportContainer = document.createElement('div');
        reportContainer.className = 'link-checker-report';
        reportContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 9999;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            font-family: sans-serif;
        `;
        
        // Add a header
        const header = document.createElement('h2');
        header.textContent = 'Link Checker Report';
        header.style.marginTop = '0';
        reportContainer.appendChild(header);
        
        // Add summary
        const summary = document.createElement('p');
        summary.innerHTML = `
            Total links: <b>${this.totalLinks}</b><br>
            Broken links: <b>${this.brokenLinks.length}</b><br>
            Duration: <b>${((this.endTime - this.startTime) / 1000).toFixed(2)}s</b>
        `;
        reportContainer.appendChild(summary);
        
        // Add list of broken links
        if (this.brokenLinks.length > 0) {
            const list = document.createElement('ul');
            list.style.padding = '0 0 0 20px';
            
            this.brokenLinks.forEach(link => {
                const item = document.createElement('li');
                item.style.marginBottom = '10px';
                item.innerHTML = `
                    <div><strong>${link.text}</strong></div>
                    <div style="word-break: break-all; color: red;">${link.href}</div>
                    <div>Location: ${link.location}</div>
                    <div>Status: ${link.status}</div>
                `;
                list.appendChild(item);
            });
            
            reportContainer.appendChild(list);
        } else {
            const success = document.createElement('p');
            success.textContent = '✅ All links are valid!';
            success.style.color = 'green';
            reportContainer.appendChild(success);
        }
        
        // Add a close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.cssText = `
            display: block;
            margin-top: 15px;
            padding: 5px 10px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        closeButton.onclick = () => reportContainer.remove();
        reportContainer.appendChild(closeButton);
        
        // Add to the document
        document.body.appendChild(reportContainer);
    }
}

// Run the link checker when the page is fully loaded
window.addEventListener('load', () => {
    // Only run automatically when in test mode
    if (window.location.search.includes('test=links')) {
        // Parse options from URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const options = {
            concurrency: parseInt(urlParams.get('concurrency')) || 5,
            delay: parseInt(urlParams.get('delay')) || 100,
            checkExternalLinks: urlParams.get('external') === 'true',
            markRedirects: urlParams.get('redirects') !== 'false',
            skipQueryParams: urlParams.get('skipQuery') === 'true'
        };
        
        const linkChecker = new LinkChecker(options);
        linkChecker.init(options);
        
        console.log('Link checker running with options:', options);
    }
});

/**
 * Run the link checker manually with custom options
 * @example
 * // Run with default options
 * runLinkChecker();
 * 
 * // Run with custom options
 * runLinkChecker({ 
 *   concurrency: 3, 
 *   delay: 200,
 *   checkExternalLinks: true
 * });
 */
window.runLinkChecker = (options = {}) => {
    const linkChecker = new LinkChecker(options);
    linkChecker.init(options);
    return linkChecker; // Return instance for further interaction
};

// Export for manual use
window.LinkChecker = LinkChecker;
