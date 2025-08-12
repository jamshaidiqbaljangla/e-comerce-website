// js/admin-users.js - Real Data Integration

document.addEventListener('DOMContentLoaded', () => {
    const userPage = new AdminUserPage();
    userPage.init();
});

class AdminUserPage {
    constructor() {
        this.API_BASE = window.API_BASE || window.location.origin || 'https://ubiquitous-meringue-b2611a.netlify.app';
        this.users = [];
        this.modal = document.getElementById('user-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.userForm = document.getElementById('user-form');
        this.editingUserId = null;
        this.currentPage = 1;
        this.totalPages = 1;
    }

    async init() {
        await this.loadUsers();
        this.bindEvents();
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.API_BASE}/api/admin/users?page=${this.currentPage}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.users = data.users.map(user => ({
                    id: user.id,
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                    role: user.role === 'admin' ? 'Administrator' : 'Customer',
                    status: 'Active',
                    lastLogin: this.formatDate(user.updated_at || user.created_at),
                    first_name: user.first_name,
                    last_name: user.last_name,
                    original_role: user.role
                }));
                this.totalPages = data.pagination.pages;
                this.renderUsers();
            } else {
                console.error('Failed to load users');
                this.loadFallbackData();
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        // Fallback static data
        this.users = [
            { id: 1, name: 'Admin User', email: 'admin@bingo.com', role: 'Administrator', status: 'Active', lastLogin: '2025-08-05 10:30 AM' },
            { id: 2, name: 'John Doe', email: 'john@example.com', role: 'Customer', status: 'Active', lastLogin: '2025-08-04 03:15 PM' },
            { id: 3, name: 'Jane Smith', email: 'jane@example.com', role: 'Customer', status: 'Active', lastLogin: '2025-07-20 09:00 AM' }
        ];
        this.renderUsers();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    bindEvents() {
        document.getElementById('add-user-btn').addEventListener('click', () => this.openModal());
        this.modal.querySelector('.close-btn').addEventListener('click', () => this.closeModal());
        document.querySelectorAll('.modal-footer .close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        document.getElementById('save-user-btn').addEventListener('click', () => this.saveUser());
        document.getElementById('search-users').addEventListener('input', (e) => this.searchUsers(e.target.value));
    }

    renderUsers() {
        const tableBody = document.getElementById('users-table').querySelector('tbody');
        tableBody.innerHTML = '';
        this.users.forEach(user => {
            const row = `
                <tr data-id="${user.id}">
                    <td>
                        <div class="user-info">
                            <span class="user-avatar">${user.name.charAt(0)}</span>
                            <div>
                                <div class="user-name">${user.name}</div>
                                <div class="user-email">${user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>${user.role}</td>
                    <td><span class="status ${user.status.toLowerCase()}">${user.status}</span></td>
                    <td>${user.lastLogin}</td>
                    <td class="actions">
                        <button class="btn-icon edit-btn"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon delete-btn"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

        // Add event listeners for edit/delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('tr').dataset.id;
                this.openModal(userId);
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('tr').dataset.id;
                this.deleteUser(userId);
            });
        });
    }

    openModal(userId = null) {
        this.editingUserId = userId;
        if (userId) {
            const user = this.users.find(u => u.id == userId);
            this.modalTitle.textContent = 'Edit User';
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-role').value = user.role.toLowerCase();
            document.getElementById('user-password').value = '';
            document.getElementById('user-status').checked = user.status === 'Active';
        } else {
            this.modalTitle.textContent = 'Add New User';
            this.userForm.reset();
            document.getElementById('user-status').checked = true;
        }
        this.modal.style.display = 'flex';
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.userForm.reset();
        this.editingUserId = null;
    }

    saveUser() {
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        const role = document.getElementById('user-role').value;
        const status = document.getElementById('user-status').checked ? 'Active' : 'Inactive';

        if (this.editingUserId) {
            const user = this.users.find(u => u.id == this.editingUserId);
            user.name = name;
            user.email = email;
            user.role = role.charAt(0).toUpperCase() + role.slice(1);
            user.status = status;
        } else {
            const newUser = {
                id: this.users.length + 1,
                name,
                email,
                role: role.charAt(0).toUpperCase() + role.slice(1),
                status,
                lastLogin: 'Never'
            };
            this.users.push(newUser);
        }
        this.renderUsers();
        this.closeModal();
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            this.users = this.users.filter(u => u.id != userId);
            this.renderUsers();
        }
    }

    searchUsers(query) {
        const filteredUsers = this.users.filter(user => 
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase())
        );
        // A bit of a trick to re-render with the filtered list without changing the main list
        const originalUsers = this.users;
        this.users = filteredUsers;
        this.renderUsers();
        this.users = originalUsers;
    }
}
