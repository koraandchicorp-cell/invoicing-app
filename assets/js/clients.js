document.addEventListener('DOMContentLoaded', () => {
    initShared();
    setupEventListeners();
    renderClientList();
});

let isModalVisible = false;
let editingClient = null;

function setupEventListeners() {
    document.getElementById('add-client-btn').addEventListener('click', () => showClientModal());

    const container = document.getElementById('clients-container');
    container.addEventListener('click', (event) => {
        if (event.target.classList.contains('edit-client-btn')) {
            const clientId = event.target.closest('.client-list-item').dataset.id;
            const client = state.clients.find(c => c.id === clientId);
            showClientModal(client);
        }
        if (event.target.classList.contains('delete-client-btn')) {
            const clientId = event.target.closest('.client-list-item').dataset.id;
            handleDeleteClient(clientId);
        }
    });
}

function handleDeleteClient(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const clientHasInvoices = state.invoices.some(inv => inv.to.email === client.email);
    if (clientHasInvoices) {
        alert("This client cannot be deleted because they are associated with one or more invoices.");
        return;
    }

    if (window.confirm(`Are you sure you want to delete the client "${client.name}"? This action cannot be undone.`)) {
        state.clients = state.clients.filter(c => c.id !== clientId);
        saveState();
        renderClientList();
    }
}

function showClientModal(client = null) {
    isModalVisible = true;
    editingClient = client;
    renderClientModal();
}

function hideClientModal() {
    isModalVisible = false;
    editingClient = null;
    renderClientModal();
}

function renderClientModal() {
    const modal = document.getElementById('client-modal');
    if (!modal) return;

    if (isModalVisible) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.innerHTML = getClientFormHTML(editingClient);
        document.getElementById('client-form').addEventListener('submit', handleSaveClient);
        document.getElementById('cancel-client-btn').addEventListener('click', hideClientModal);
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.innerHTML = '';
    }
}

function handleSaveClient(event) {
    event.preventDefault();
    const form = event.target;
    const clientData = {
        name: form.querySelector('#client-name').value,
        company: form.querySelector('#client-company').value,
        email: form.querySelector('#client-email').value,
        phone: form.querySelector('#client-phone').value,
        address: form.querySelector('#client-address').value,
    };

    if (editingClient) {
        // Update existing client
        const index = state.clients.findIndex(c => c.id === editingClient.id);
        if (index > -1) {
            state.clients[index] = { ...editingClient, ...clientData };
        }
    } else {
        // Add new client
        const newClient = { ...clientData, id: `CLIENT-${Date.now()}` };
        state.clients.push(newClient);
    }

    saveState();
    renderClientList();
    hideClientModal();
}

function getClientFormHTML(client = null) {
    const isEditing = client !== null;
    const clientData = client || { name: '', company: '', email: '', phone: '', address: '' };
    return `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 class="text-xl font-bold mb-4 text-gray-800 dark:text-white">${isEditing ? 'Edit Client' : 'Add New Client'}</h2>
            <form id="client-form" class="space-y-4">
                <div><label for="client-name" class="label">Name</label><input id="client-name" class="input-field" value="${clientData.name}" required></div>
                <div><label for="client-company" class="label">Company</label><input id="client-company" class="input-field" value="${clientData.company}"></div>
                <div><label for="client-email" class="label">Email</label><input id="client-email" type="email" class="input-field" value="${clientData.email}"></div>
                <div><label for="client-phone" class="label">Phone</label><input id="client-phone" type="tel" class="input-field" value="${clientData.phone}"></div>
                <div><label for="client-address" class="label">Address</label><textarea id="client-address" class="input-field">${clientData.address}</textarea></div>
                <div class="mt-6 flex justify-end">
                    <button type="button" id="cancel-client-btn" class="btn-secondary mr-2">Cancel</button>
                    <button type="submit" class="btn-primary">Save Client</button>
                </div>
            </form>
        </div>
    `;
}

function renderClientList() {
    const container = document.getElementById('clients-container');
    const emptyMessage = document.getElementById('client-list-empty');
    if (!container || !emptyMessage) return;

    if (state.clients.length === 0) {
        container.innerHTML = '';
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');

    const headerHTML = `
        <div class="grid grid-cols-5 gap-4 p-2 border-b dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 text-sm">
            <div>Name</div>
            <div>Company</div>
            <div>Email</div>
            <div>Phone</div>
            <div class="text-right">Actions</div>
        </div>
    `;

    container.innerHTML = headerHTML + state.clients.map(getClientListItemHTML).join('');
}

function getClientListItemHTML(client) {
    return `
        <div class="client-list-item grid grid-cols-5 gap-4 items-center p-2 border-b dark:border-gray-700" data-id="${client.id}">
            <div class="font-medium text-gray-800 dark:text-gray-100">${client.name || ''}</div>
            <div class="text-gray-600 dark:text-gray-300 truncate">${client.company || ''}</div>
            <div class="text-gray-600 dark:text-gray-300 truncate">${client.email || ''}</div>
            <div class="text-gray-600 dark:text-gray-300">${client.phone || ''}</div>
            <div class="text-right">
                <a href="invoices.html?search=${encodeURIComponent(client.name)}" class="view-invoices-btn text-sm text-green-600 hover:text-green-800">Invoices</a>
                <button class="edit-client-btn ml-2 text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                <button class="delete-client-btn ml-2 text-sm text-red-600 hover:text-red-800">Delete</button>
            </div>
        </div>
    `;
}
