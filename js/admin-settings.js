// Admin Settings Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
});

function setupEventListeners() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSettings);
    }
}

async function loadSettings() {
    try {
        showLoading(true);
        const response = await fetch('/api/admin/settings');
        const data = await response.json();

        if (data.success) {
            populateSettingsForm(data.settings);
        } else {
            showError('Failed to load settings: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Failed to load settings data.');
    } finally {
        showLoading(false);
    }
}

function populateSettingsForm(settings) {
    // General Settings
    document.getElementById('site-title').value = settings.general?.site_title || '';
    document.getElementById('tagline').value = settings.general?.tagline || '';
    document.getElementById('admin-email').value = settings.general?.admin_email || '';

    // SEO Settings
    document.getElementById('meta-description').value = settings.seo?.meta_description || '';
    document.getElementById('meta-keywords').value = settings.seo?.meta_keywords || '';

    // Social Media
    document.getElementById('social-facebook').value = settings.social?.facebook || '';
    document.getElementById('social-twitter').value = settings.social?.twitter || '';
    document.getElementById('social-instagram').value = settings.social?.instagram || '';
}

async function saveSettings(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const settings = {
        general: {
            site_title: formData.get('site-title'),
            tagline: formData.get('tagline'),
            admin_email: formData.get('admin-email'),
        },
        seo: {
            meta_description: formData.get('meta-description'),
            meta_keywords: formData.get('meta-keywords'),
        },
        social: {
            facebook: formData.get('social-facebook'),
            twitter: formData.get('social-twitter'),
            instagram: formData.get('social-instagram'),
        }
    };

    try {
        showLoading(true);
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const result = await response.json();
        if (result.success) {
            showSuccess('Settings saved successfully!');
        } else {
            showError('Failed to save settings: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('An error occurred while saving settings.');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
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
