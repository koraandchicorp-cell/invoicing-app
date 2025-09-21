document.addEventListener('DOMContentLoaded', () => {
    initShared();
    setupEventListeners();
    renderInvoiceList();
});

function setupEventListeners() {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.addEventListener('input', renderInvoiceList);

    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) filterStatus.addEventListener('change', renderInvoiceList);

    // Use event delegation for edit and delete buttons
    const invoicesContainer = document.getElementById('invoices-container');
    if (invoicesContainer) {
        invoicesContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-btn')) {
                handleDeleteInvoice(event);
            }
        });
        invoicesContainer.addEventListener('change', (event) => {
            if (event.target.classList.contains('status-select')) {
                handleStatusChange(event);
            }
        });
    }
}

function renderInvoiceList() {
    const container = document.getElementById('invoices-container');
    const emptyMessage = document.getElementById('invoice-list-empty');
    if (!container || !emptyMessage) return;

    const filter = document.getElementById('filter-status').value;
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();

    const filteredInvoices = state.invoices.filter(inv => {
        const matchesFilter = filter === 'all' || inv.status === filter;
        const matchesSearch = searchTerm === '' ||
                              (inv.to.name && inv.to.name.toLowerCase().includes(searchTerm)) ||
                              (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm));
        return matchesFilter && matchesSearch;
    });

    if (filteredInvoices.length === 0) {
        container.innerHTML = ''; // Clear previous content
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');
    container.innerHTML = filteredInvoices.map(getInvoiceListItemHTML).join('');
}

function getInvoiceListItemHTML(invoice) {
    const statusColors = {
        paid: 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100',
        pending: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
        draft: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
    };

    return `
        <div class="invoice-list-item grid grid-cols-6 gap-4 items-center p-2 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700" data-id="${invoice.id}">
            <div class="font-medium text-gray-800 dark:text-gray-100">${invoice.invoiceNumber}</div>
            <div class="text-gray-600 dark:text-gray-300 truncate">${invoice.to.name}</div>
            <div class="text-gray-600 dark:text-gray-300">${invoice.date}</div>
            <div class="font-medium text-gray-800 dark:text-gray-100 text-right">${formatCurrency(invoice.total)}</div>
            <div class="text-center">
                <select class="status-select text-xs rounded-full px-2 py-1 border-0 ${statusColors[invoice.status] || ''} focus:ring-0 appearance-none">
                    <option value="draft" ${invoice.status === 'draft' ? 'selected' : ''}>Draft</option>
                    <option value="pending" ${invoice.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Paid</option>
                </select>
            </div>
            <div class="text-right">
                <a href="invoice-edit.html?id=${invoice.id}" class="edit-btn text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</a>
                <button class="delete-btn ml-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>
            </div>
        </div>
    `;
}

function handleStatusChange(event) {
    const invoiceId = event.target.closest('.invoice-list-item').dataset.id;
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = event.target.value;
        saveState();
        renderInvoiceList(); // Re-render to update colors if needed
    }
}

function handleDeleteInvoice(event) {
    const invoiceId = event.target.closest('.invoice-list-item').dataset.id;
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
        state.invoices = state.invoices.filter(inv => inv.id !== invoiceId);
        saveState();
        renderInvoiceList();
    }
}
