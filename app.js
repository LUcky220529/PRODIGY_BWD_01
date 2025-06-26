// API base URL
const API_BASE = '/api';

// DOM elements
const statusAlert = document.getElementById('status-alert');
const statusMessage = document.getElementById('status-message');
const usersContainer = document.getElementById('users-container');
const createUserForm = document.getElementById('create-user-form');
const updateUserForm = document.getElementById('update-user-form');
const updateUserModal = new bootstrap.Modal(document.getElementById('updateUserModal'));

// Show status message
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusAlert.className = `alert alert-${type}`;
    statusAlert.classList.remove('d-none');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusAlert.classList.add('d-none');
    }, 5000);
}

// Load and display users
async function loadUsers() {
    try {
        usersContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading users...</p>
            </div>
        `;

        const response = await fetch(`${API_BASE}/users`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to load users');
        }

        if (result.data.length === 0) {
            usersContainer.innerHTML = `
                <div class="text-center py-5">
                    <i data-feather="users" class="mb-3" style="width: 48px; height: 48px; opacity: 0.5;"></i>
                    <h5 class="text-muted">No users found</h5>
                    <p class="text-muted">Create your first user using the form above.</p>
                </div>
            `;
            feather.replace();
            return;
        }

        const usersHtml = result.data.map(user => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h5 class="card-title mb-1">${escapeHtml(user.name)}</h5>
                            <p class="card-text mb-1">
                                <i data-feather="mail" class="me-1" style="width: 16px; height: 16px;"></i>
                                ${escapeHtml(user.email)}
                            </p>
                            <p class="card-text mb-0">
                                <i data-feather="calendar" class="me-1" style="width: 16px; height: 16px;"></i>
                                ${user.age} years old
                            </p>
                            <small class="text-muted">ID: ${user.id}</small>
                        </div>
                        <div class="col-md-4 text-md-end">
                            <div class="btn-group" role="group">
                                <button class="btn btn-outline-primary btn-sm" onclick="editUser('${user.id}')">
                                    <i data-feather="edit" style="width: 16px; height: 16px;"></i>
                                    Edit
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteUser('${user.id}', '${escapeHtml(user.name)}')">
                                    <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        usersContainer.innerHTML = usersHtml;
        feather.replace();

    } catch (error) {
        console.error('Error loading users:', error);
        usersContainer.innerHTML = `
            <div class="alert alert-danger">
                <i data-feather="alert-circle" class="me-2"></i>
                Error loading users: ${escapeHtml(error.message)}
            </div>
        `;
        feather.replace();
    }
}

// Create user
createUserForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
        
        const formData = new FormData(this);
        const userData = {
            name: document.getElementById('create-name').value,
            email: document.getElementById('create-email').value,
            age: parseInt(document.getElementById('create-age').value)
        };

        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.details && Array.isArray(result.details)) {
                throw new Error(result.details.join(', '));
            }
            throw new Error(result.error || 'Failed to create user');
        }

        showStatus(`User "${result.data.name}" created successfully!`, 'success');
        this.reset();
        loadUsers();

    } catch (error) {
        console.error('Error creating user:', error);
        showStatus(`Error creating user: ${error.message}`, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Edit user
async function editUser(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch user');
        }

        const user = result.data;
        document.getElementById('update-user-id').value = user.id;
        document.getElementById('update-name').value = user.name;
        document.getElementById('update-email').value = user.email;
        document.getElementById('update-age').value = user.age;

        updateUserModal.show();

    } catch (error) {
        console.error('Error fetching user:', error);
        showStatus(`Error fetching user: ${error.message}`, 'danger');
    }
}

// Update user
async function updateUser() {
    const userId = document.getElementById('update-user-id').value;
    const updateBtn = document.querySelector('#updateUserModal .btn-primary');
    const originalText = updateBtn.innerHTML;
    
    try {
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
        
        const userData = {
            name: document.getElementById('update-name').value,
            email: document.getElementById('update-email').value,
            age: parseInt(document.getElementById('update-age').value)
        };

        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.details && Array.isArray(result.details)) {
                throw new Error(result.details.join(', '));
            }
            throw new Error(result.error || 'Failed to update user');
        }

        showStatus(`User "${result.data.name}" updated successfully!`, 'success');
        updateUserModal.hide();
        loadUsers();

    } catch (error) {
        console.error('Error updating user:', error);
        showStatus(`Error updating user: ${error.message}`, 'danger');
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalText;
    }
}

// Delete user
async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete user');
        }

        showStatus(`User "${userName}" deleted successfully!`, 'success');
        loadUsers();

    } catch (error) {
        console.error('Error deleting user:', error);
        showStatus(`Error deleting user: ${error.message}`, 'danger');
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle form validation
document.addEventListener('DOMContentLoaded', function() {
    // Add Bootstrap validation styles
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
});
