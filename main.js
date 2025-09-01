const API_BASE = 'http://localhost:8085';
let currentEditId = null;
let currentEditShortUrl = null;

// Show alert
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = message;

    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// URL validation
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Shorten URL
async function shortenUrl() {
    const originalUrl = document.getElementById('originalUrl').value.trim();
    const spinner = document.getElementById('shortenSpinner');

    if (!originalUrl) {
        showAlert('Please enter a URL', 'error');
        return;
    }

    if (!isValidUrl(originalUrl)) {
        showAlert('Please enter a valid URL (must start with http:// or https://)', 'error');
        return;
    }

    spinner.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_BASE}/api/v1.0/Url/shorten`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ originalUrl })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorData}`);
        }

        const result = await response.json();
        document.getElementById('originalUrl').value = '';
        showAlert('URL successfully shortened!', 'success');
        loadUrls(); // Refresh table
    } catch (error) {
        console.error('Error shortening URL:', error);
        showAlert(`Error shortening URL: ${error.message}`, 'error');
    } finally {
        spinner.style.display = 'none';
    }
}

// Load URL list via GraphQL
async function loadUrls() {
    const tableBody = document.getElementById('urlsTable');
    const spinner = document.getElementById('refreshSpinner');

    spinner.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_BASE}/graphql/endpoint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    query {
                        urls(skip: 0, take: 50, order: [{createdAt: DESC}]) {
                            items {
                                id
                                originalUrl
                                shortUrl
                                createdAt
                                accessCount
                            }
                        }
                    }
                `
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error(`GraphQL error: ${result.errors.map(e => e.message).join(', ')}`);
        }

        const urls = result.data.urls.items;

        if (urls.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
                        📝 No shortened URLs yet
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = urls.map(url => `
            <tr>
                <td class="url-cell" title="${url.originalUrl}">${url.originalUrl}</td>
                <td>
                    <a href="${API_BASE}/${url.shortUrl}" target="_blank" class="short-url">
                        ${API_BASE}/${url.shortUrl}
                    </a>
                </td>
                <td>${new Date(url.createdAt).toLocaleString('en-US')}</td>
                <td>
                    <span class="badge badge-success">${url.accessCount}</span>
                </td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editUrl(${url.id}, '${url.originalUrl.replace(/'/g, "\\'")}', '${url.shortUrl}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteUrl(${url.id})">
                        🗑️ Delete
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading URLs:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                    ❌ Error loading data: ${error.message}
                </td>
            </tr>
        `;
        showAlert(`Error loading data: ${error.message}`, 'error');
    } finally {
        spinner.style.display = 'none';
    }
}

// Delete URL
async function deleteUrl(id) {
    if (!confirm('Are you sure you want to delete this URL?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1.0/UrlManagement/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorData}`);
        }

        showAlert('URL successfully deleted!', 'success');
        loadUrls(); // Refresh table
    } catch (error) {
        console.error('Error deleting URL:', error);
        showAlert(`Error deleting URL: ${error.message}`, 'error');
    }
}

// Open edit modal
function editUrl(id, originalUrl, shortUrl) {
    currentEditId = id;
    currentEditShortUrl = shortUrl;
    document.getElementById('editOriginalUrl').value = originalUrl;
    document.getElementById('editModal').style.display = 'block';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditId = null;
}

// Update URL
async function updateUrl() {
    const originalUrl = document.getElementById('editOriginalUrl').value.trim();
    const spinner = document.getElementById('updateSpinner');

    if (!originalUrl) {
        showAlert('Please enter a URL', 'error');
        return;
    }

    if (!isValidUrl(originalUrl)) {
        showAlert('Please enter a valid URL (must start with http:// or https://)', 'error');
        return;
    }

    spinner.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_BASE}/api/v1.0/UrlManagement`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentEditId,
                originalUrl,
                shortUrl: currentEditShortUrl
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorData}`);
        }

        showAlert('URL successfully updated!', 'success');
        closeEditModal();
        loadUrls(); // Refresh table
    } catch (error) {
        console.error('Error updating URL:', error);
        showAlert(`Error updating URL: ${error.message}`, 'error');
    } finally {
        spinner.style.display = 'none';
    }
}

// Enter key handler for input field
document.getElementById('originalUrl').addEventListener('keypress', e => {
    if (e.key === 'Enter') shortenUrl();
});

// Enter key handler for edit input
document.getElementById('editOriginalUrl').addEventListener('keypress', e => {
    if (e.key === 'Enter') updateUrl();
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target == modal) closeEditModal();
};

// Load data on page load
document.addEventListener('DOMContentLoaded', () => loadUrls());
