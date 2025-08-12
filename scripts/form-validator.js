/**
 * Form Validator Script
 * Tests all forms on the website for validation and submission
 */

class FormValidator {
    /**
     * @param {Object} options - Configuration options
     * @param {boolean} [options.testData=false] - Whether to fill forms with test data
     * @param {boolean} [options.checkCustomValidation=true] - Whether to check custom validation rules
     * @param {boolean} [options.validateOnBlur=false] - Whether to validate fields on blur
     * @param {boolean} [options.showRealTimeValidation=false] - Whether to show validation feedback in real time
     */
    constructor(options = {}) {
        this.forms = [];
        this.validatedForms = 0;
        this.invalidForms = [];
        this.testResults = {};
        
        // Configuration options with defaults
        this.options = {
            testData: false,
            checkCustomValidation: true,
            validateOnBlur: false,
            showRealTimeValidation: false,
            ...options
        };
        
        // Sample test data for different input types
        this.testDataValues = {
            text: 'Sample Text',
            email: 'test@example.com',
            password: 'Password123!',
            search: 'search query',
            tel: '+12345678901',
            number: '42',
            url: 'https://example.com',
            date: '2025-01-01',
            time: '12:00',
            color: '#ff0000',
            textarea: 'This is sample text for the textarea field. It is long enough to test multiline content.'
        };
    }

    /**
     * Initialize and start the form validation process
     * @param {Object} options - Additional initialization options
     */
    init(options = {}) {
        console.log('🔍 Form Validator: Starting form validation...');
        
        // Merge provided options with constructor options
        this.options = {...this.options, ...options};
        
        // Get all forms on the page
        const forms = document.querySelectorAll('form');
        this.forms = Array.from(forms);
        
        console.log(`Found ${this.forms.length} forms to validate`);
        
        if (this.forms.length === 0) {
            console.log('No forms found on this page.');
            return;
        }
        
        // Add test listeners to each form
        this.forms.forEach((form, index) => {
            // Give the form an identifier if it doesn't have one
            const formId = form.id || form.classList[0] || `form-${index}`;
            form.dataset.testId = formId;
            
            // Initialize result tracking for this form
            this.testResults[formId] = {
                formElement: form,
                id: formId,
                name: form.getAttribute('name') || 'Unnamed form',
                location: this.getFormLocation(form),
                action: form.getAttribute('action') || 'Not specified',
                method: form.getAttribute('method') || 'GET',
                enctype: form.getAttribute('enctype') || 'application/x-www-form-urlencoded',
                fields: Array.from(form.elements).filter(el => el.name && !['button', 'submit', 'reset'].includes(el.type)).length,
                requiredFields: 0,
                emptyRequiredFields: [],
                invalidFields: [],
                validationStatus: null
            };
            
            // Track required fields
            const requiredFields = form.querySelectorAll('[required]');
            this.testResults[formId].requiredFields = requiredFields.length;
            
            // Add validation check on submit
            form.addEventListener('submit', this.handleFormSubmit.bind(this, formId, form));
            
            // Add real-time validation if enabled
            if (this.options.validateOnBlur || this.options.showRealTimeValidation) {
                Array.from(form.elements).forEach(field => {
                    if (['button', 'submit', 'reset'].includes(field.type)) return;
                    
                    // Validate on blur
                    if (this.options.validateOnBlur) {
                        field.addEventListener('blur', () => {
                            this.validateField(field);
                        });
                    }
                    
                    // Real-time validation feedback
                    if (this.options.showRealTimeValidation) {
                        field.addEventListener('input', () => {
                            this.validateField(field, true);
                        });
                    }
                });
            }
            
            // Flag the form as being tested
            form.classList.add('form-being-tested');
        });
        
        // Create the test UI if in test mode
        if (window.location.search.includes('test=forms')) {
            this.createTestUI();
            
            // Parse URL parameters for additional options
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('fillForms') === 'true') {
                this.options.testData = true;
            }
        }
    }
    
    /**
     * Get a description of where the form is located in the page
     * @param {HTMLElement} form - The form element
     * @returns {string} A description of the form's location
     */
    getFormLocation(form) {
        let location = '';
        
        if (form.closest('header')) {
            location = 'Header';
        } else if (form.closest('footer')) {
            location = 'Footer';
        } else if (form.closest('nav')) {
            location = 'Navigation';
        } else {
            const section = form.closest('section');
            if (section && section.className) {
                location = `Section: ${section.className}`;
            } else {
                location = 'Main Content';
            }
        }
        
        // Check if it's in a modal
        if (form.closest('.modal') || form.closest('[role="dialog"]')) {
            location += ' (Modal/Dialog)';
        }
        
        return location || 'Unknown location';
    }
    
    /**
     * Handle form submission events
     * @param {string} formId - The form identifier
     * @param {HTMLFormElement} form - The form element
     * @param {Event} event - The submit event
     */
    handleFormSubmit(formId, form, event) {
        // Always prevent actual submission during testing
        if (window.location.search.includes('test=forms')) {
            event.preventDefault();
        }
        
        // Check HTML5 validation
        const isValid = form.checkValidity();
        this.testResults[formId].validationStatus = isValid;
        
        // Find all invalid fields
        const invalidFields = Array.from(form.querySelectorAll(':invalid'));
        this.testResults[formId].invalidFields = invalidFields.map(field => {
            return {
                name: field.name || field.id || 'unnamed field',
                type: field.type,
                message: field.validationMessage
            };
        });
        
        // Find empty required fields
        const emptyRequiredFields = Array.from(form.querySelectorAll('[required]'))
            .filter(field => !field.value.trim());
        
        this.testResults[formId].emptyRequiredFields = emptyRequiredFields.map(field => {
            return {
                name: field.name || field.id || 'unnamed field',
                type: field.type
            };
        });
        
        // Update the results in the UI
        this.updateTestResults(formId);
        
        // Log the results
        if (isValid) {
            console.log(`✅ Form "${formId}" is valid`);
            this.validatedForms++;
        } else {
            console.log(`❌ Form "${formId}" is invalid. Issues found:`, this.testResults[formId]);
            this.invalidForms.push(formId);
        }
    }
    
    /**
     * Create a test UI for form validation
     */
    createTestUI() {
        // Create a floating test container
        const testContainer = document.createElement('div');
        testContainer.className = 'form-validator-container';
        testContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
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
        header.textContent = 'Form Validator';
        header.style.marginTop = '0';
        testContainer.appendChild(header);
        
        // Add form list
        const formList = document.createElement('div');
        formList.className = 'form-validator-list';
        
        if (this.forms.length === 0) {
            const noForms = document.createElement('p');
            noForms.textContent = 'No forms found on this page.';
            formList.appendChild(noForms);
        } else {
            this.forms.forEach((form, index) => {
                const formId = form.dataset.testId;
                const formItem = document.createElement('div');
                formItem.className = 'form-validator-item';
                formItem.dataset.formId = formId;
                formItem.style.cssText = `
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 4px;
                `;
                
                // Form title
                const formTitle = document.createElement('h3');
                formTitle.textContent = `Form ${index + 1}: ${form.id || form.classList[0] || 'Unnamed'}`;
                formTitle.style.margin = '0 0 5px 0';
                formItem.appendChild(formTitle);
                
                // Form location
                const formLocation = document.createElement('p');
                formLocation.textContent = `Location: ${this.testResults[formId].location}`;
                formLocation.style.margin = '0 0 5px 0';
                formLocation.style.fontSize = '12px';
                formLocation.style.color = '#666';
                formItem.appendChild(formLocation);
                
                // Required fields
                const requiredFields = document.createElement('p');
                requiredFields.textContent = `Required fields: ${this.testResults[formId].requiredFields}`;
                requiredFields.style.margin = '0 0 10px 0';
                requiredFields.style.fontSize = '14px';
                formItem.appendChild(requiredFields);
                
                // Button container
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                    display: flex;
                    gap: 5px;
                    margin-bottom: 10px;
                `;
                
                // Test button
                const testButton = document.createElement('button');
                testButton.textContent = 'Test Form';
                testButton.style.cssText = `
                    padding: 5px 10px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                `;
                testButton.onclick = () => this.testForm(formId);
                buttonContainer.appendChild(testButton);
                
                // Fill and test button
                const fillButton = document.createElement('button');
                fillButton.textContent = 'Fill & Test';
                fillButton.style.cssText = `
                    padding: 5px 10px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                `;
                fillButton.onclick = () => this.testForm(formId, true);
                buttonContainer.appendChild(fillButton);
                
                formItem.appendChild(buttonContainer);
                
                // Scroll to form button
                const scrollButton = document.createElement('button');
                scrollButton.textContent = 'Go to Form';
                scrollButton.style.cssText = `
                    padding: 5px 10px;
                    background: #9e9e9e;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                `;
                scrollButton.onclick = () => this.scrollToForm(formId);
                formItem.appendChild(scrollButton);
                
                // Results area (initially hidden)
                const resultsArea = document.createElement('div');
                resultsArea.className = 'form-validation-results';
                resultsArea.style.display = 'none';
                resultsArea.style.marginTop = '10px';
                resultsArea.style.padding = '10px';
                resultsArea.style.backgroundColor = '#f5f5f5';
                resultsArea.style.borderRadius = '4px';
                formItem.appendChild(resultsArea);
                
                formList.appendChild(formItem);
            });
        }
        
        testContainer.appendChild(formList);
        
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
        closeButton.onclick = () => testContainer.remove();
        testContainer.appendChild(closeButton);
        
        // Add to the document
        document.body.appendChild(testContainer);
    }
    
    /**
     * Test a specific form
     * @param {string} formId - The form identifier
     * @param {boolean} fillWithTestData - Whether to fill the form with test data before testing
     */
    testForm(formId, fillWithTestData = false) {
        const form = this.testResults[formId].formElement;
        
        // Fill with test data if requested
        if (fillWithTestData || this.options.testData) {
            this.fillFormWithTestData(form);
        }
        
        // Highlight the form
        form.style.outline = '2px solid blue';
        setTimeout(() => {
            form.style.outline = '';
        }, 3000);
        
        // Attempt to submit the form to trigger validation
        const submitEvent = new Event('submit', { 
            cancelable: true,
            bubbles: true
        });
        
        form.dispatchEvent(submitEvent);
    }
    
    /**
     * Fill a form with test data based on field types
     * @param {HTMLFormElement} form - The form to fill with data
     */
    fillFormWithTestData(form) {
        // Process all form elements except buttons
        Array.from(form.elements).forEach(field => {
            if (!field.name || ['button', 'submit', 'reset'].includes(field.type)) {
                return;
            }
            
            // Skip fields that already have values
            if (field.value.trim()) {
                return;
            }
            
            // Handle different input types
            switch (field.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'search':
                case 'tel':
                case 'number':
                case 'url':
                case 'date':
                case 'time':
                case 'color':
                    field.value = this.testDataValues[field.type] || 'Test Value';
                    break;
                    
                case 'textarea':
                    field.value = this.testDataValues.textarea;
                    break;
                    
                case 'checkbox':
                    field.checked = true;
                    break;
                    
                case 'radio':
                    // Check the first radio button in each group
                    const name = field.name;
                    const radioGroup = form.querySelectorAll(`input[type="radio"][name="${name}"]`);
                    if (radioGroup.length > 0) {
                        radioGroup[0].checked = true;
                    }
                    break;
                    
                case 'select-one':
                case 'select-multiple':
                    // Select the second option if available (first may be a placeholder)
                    if (field.options.length > 1) {
                        field.options[1].selected = true;
                    } else if (field.options.length === 1) {
                        field.options[0].selected = true;
                    }
                    break;
                
                case 'file':
                    // Can't programmatically set file inputs for security reasons
                    // Just add a visual indicator
                    field.dataset.testNote = 'File inputs cannot be automatically filled';
                    break;
                    
                default:
                    field.value = 'Test Value';
            }
            
            // Dispatch input and change events to trigger any listeners
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
    
    /**
     * Scroll to a specific form
     * @param {string} formId - The form identifier
     */
    scrollToForm(formId) {
        const form = this.testResults[formId].formElement;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the form
        form.style.outline = '2px solid blue';
        setTimeout(() => {
            form.style.outline = '';
        }, 3000);
    }
    
    /**
     * Validate a single form field
     * @param {HTMLElement} field - The field to validate
     * @param {boolean} isRealTime - Whether this is real-time validation
     * @returns {boolean} Whether the field is valid
     */
    validateField(field, isRealTime = false) {
        // Skip non-input elements
        if (!field || !field.nodeName || !['INPUT', 'SELECT', 'TEXTAREA'].includes(field.nodeName)) {
            return true;
        }
        
        // Check HTML5 validation
        const isValid = field.checkValidity();
        
        // Add/remove visual indicator classes
        if (isRealTime) {
            // For real-time validation, only show valid status or nothing
            if (field.value && isValid) {
                field.classList.add('valid-field');
                field.classList.remove('invalid-field');
            } else {
                field.classList.remove('valid-field');
                field.classList.remove('invalid-field');
            }
        } else {
            // For blur validation, show both valid and invalid status
            if (isValid) {
                field.classList.add('valid-field');
                field.classList.remove('invalid-field');
            } else {
                field.classList.remove('valid-field');
                field.classList.add('invalid-field');
                
                // Show validation message tooltip if not already shown
                if (!field.nextElementSibling || !field.nextElementSibling.classList.contains('validation-message')) {
                    const message = document.createElement('div');
                    message.className = 'validation-message';
                    message.textContent = field.validationMessage || 'This field is invalid';
                    message.style.cssText = `
                        color: red;
                        font-size: 12px;
                        margin-top: 4px;
                    `;
                    field.insertAdjacentElement('afterend', message);
                    
                    // Remove message when field is focused
                    field.addEventListener('focus', () => {
                        message.remove();
                    }, { once: true });
                }
            }
        }
        
        return isValid;
    }
    
    /**
     * Update the test results in the UI
     * @param {string} formId - The form identifier
     */
    updateTestResults(formId) {
        // Only update UI if we're in test mode
        if (!window.location.search.includes('test=forms')) {
            return;
        }
        
        const formItem = document.querySelector(`.form-validator-item[data-form-id="${formId}"]`);
        if (!formItem) return;
        
        const resultsArea = formItem.querySelector('.form-validation-results');
        resultsArea.style.display = 'block';
        
        const result = this.testResults[formId];
        
        // Clear previous results
        resultsArea.innerHTML = '';
        
        // Set status color
        if (result.validationStatus === true) {
            resultsArea.style.borderLeft = '4px solid green';
        } else if (result.validationStatus === false) {
            resultsArea.style.borderLeft = '4px solid red';
        } else {
            resultsArea.style.borderLeft = '4px solid gray';
        }
        
        // Status message
        const status = document.createElement('p');
        status.style.fontWeight = 'bold';
        if (result.validationStatus === true) {
            status.textContent = '✅ Form is valid';
            status.style.color = 'green';
        } else if (result.validationStatus === false) {
            status.textContent = '❌ Form is invalid';
            status.style.color = 'red';
        } else {
            status.textContent = '⚠️ Form not tested yet';
            status.style.color = 'gray';
        }
        resultsArea.appendChild(status);
        
        // Form information
        const formInfo = document.createElement('div');
        formInfo.innerHTML = `
            <p style="margin: 5px 0; font-size: 12px;">
                Action: ${result.action}<br>
                Method: ${result.method}<br>
                Encoding: ${result.enctype}<br>
                Total fields: ${result.fields}
            </p>
        `;
        resultsArea.appendChild(formInfo);
        
        // Show empty required fields
        if (result.emptyRequiredFields.length > 0) {
            const emptyFields = document.createElement('div');
            emptyFields.innerHTML = '<p style="margin: 5px 0; font-weight: bold;">Empty required fields:</p>';
            
            const ul = document.createElement('ul');
            ul.style.margin = '5px 0';
            ul.style.paddingLeft = '20px';
            
            result.emptyRequiredFields.forEach(field => {
                const li = document.createElement('li');
                li.textContent = field.name;
                ul.appendChild(li);
            });
            
            emptyFields.appendChild(ul);
            resultsArea.appendChild(emptyFields);
        }
        
        // Show invalid fields
        if (result.invalidFields.length > 0) {
            const invalidFields = document.createElement('div');
            invalidFields.innerHTML = '<p style="margin: 5px 0; font-weight: bold;">Invalid fields:</p>';
            
            const ul = document.createElement('ul');
            ul.style.margin = '5px 0';
            ul.style.paddingLeft = '20px';
            
            result.invalidFields.forEach(field => {
                const li = document.createElement('li');
                li.textContent = `${field.name}: ${field.message}`;
                ul.appendChild(li);
            });
            
            invalidFields.appendChild(ul);
            resultsArea.appendChild(invalidFields);
        }
    }
}

// Initialize form validator when the page is fully loaded
window.addEventListener('load', () => {
    // Run automatically in test mode
    if (window.location.search.includes('test=forms')) {
        // Parse URL options
        const urlParams = new URLSearchParams(window.location.search);
        const options = {
            testData: urlParams.get('fillForms') === 'true',
            validateOnBlur: urlParams.get('validateOnBlur') === 'true',
            showRealTimeValidation: urlParams.get('realTime') === 'true'
        };
        
        const formValidator = new FormValidator(options);
        formValidator.init();
        
        console.log('Form validator running with options:', options);
    }
});

/**
 * Run the form validator manually with custom options
 * @example
 * // Run with default options
 * runFormValidator();
 * 
 * // Run with custom options
 * runFormValidator({ 
 *   testData: true, 
 *   validateOnBlur: true,
 *   showRealTimeValidation: true
 * });
 */
window.runFormValidator = (options = {}) => {
    const formValidator = new FormValidator(options);
    formValidator.init(options);
    return formValidator; // Return instance for further interaction
};

// Add CSS for validation styles
const addValidationStyles = () => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .valid-field {
            border-color: green !important;
            background-color: rgba(0, 255, 0, 0.05) !important;
        }
        
        .invalid-field {
            border-color: red !important;
            background-color: rgba(255, 0, 0, 0.05) !important;
        }
        
        .validation-message {
            color: red;
            font-size: 12px;
            margin-top: 4px;
        }
    `;
    document.head.appendChild(styleEl);
};

// Add validation styles when in test mode
if (window.location.search.includes('test=forms')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addValidationStyles);
    } else {
        addValidationStyles();
    }
}

// Export for manual use
window.FormValidator = FormValidator;
