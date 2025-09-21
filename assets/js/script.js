document.addEventListener('DOMContentLoaded', init);

// --- STATE MANAGEMENT ---
const STORAGE_KEY = 'invoicer-app-state';
let state = {
    invoices: [],
    clients: [],
    settings: {
        company: { name: 'My Company', address: '123 Main St', email: 'me@company.com', taxId: 'XX-123456' },
        theme: 'dark',
        defaultCurrency: '$',
        defaultTaxRate: 10,
    },
    nextInvoiceId: 1,
    isFormVisible: false,
    isSettingsVisible: false,
};

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        state = { ...state, ...parsedState };
        state.settings = { ...state.settings, ...(parsedState.settings || {}) };
        state.settings.company = { ...state.settings.company, ...(parsedState.settings?.company || {}) };
        state.clients = state.clients || []; // Ensure clients array exists
    }
}

// --- INITIALIZATION ---
function init() {
    loadState();
    setupEventListeners();
    render();
}

function setupEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('settings-btn').addEventListener('click', showSettingsModal);
    document.getElementById('create-invoice-btn').addEventListener('click', () => showInvoiceForm());
    document.getElementById('search-bar').addEventListener('input', renderInvoiceList);
    document.getElementById('filter-status').addEventListener('change', renderInvoiceList);
}

// --- CORE RENDER FUNCTION ---
function render() {
    renderTheme();
    renderDashboard();
    renderInvoiceList();
    renderInvoiceForm();
    renderSettingsModal();
}

// --- THEME LOGIC ---
function renderTheme() {
    // (Omitted for brevity - same as before)
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    if (state.settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
    }
}

function toggleTheme() {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    saveState();
    renderTheme();
}

// --- DASHBOARD ---
function renderDashboard() {
    // (Omitted for brevity - same as before)
    const totalInvoices = state.invoices.length;
    const totalRevenue = state.invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const outstandingBalance = state.invoices.filter(inv => inv.status === 'pending' || inv.status === 'draft').reduce((sum, inv) => sum + inv.total, 0);

    document.getElementById('total-invoices').textContent = totalInvoices;
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('outstanding-balance').textContent = formatCurrency(outstandingBalance);
}

// --- SETTINGS MODAL ---
function showSettingsModal() {
    state.isSettingsVisible = true;
    render();
}

function hideSettingsModal() {
    state.isSettingsVisible = false;
    render();
}

function renderSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (state.isSettingsVisible) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.querySelector('.bg-white').innerHTML = getSettingsModalHTML();
        document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
        document.getElementById('cancel-settings-btn').addEventListener('click', hideSettingsModal);
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function handleSaveSettings(event) {
    event.preventDefault();
    const form = event.target;
    state.settings.company = {
        name: form.querySelector('#setting-company-name').value,
        address: form.querySelector('#setting-company-address').value,
        email: form.querySelector('#setting-company-email').value,
        taxId: form.querySelector('#setting-company-taxid').value,
    };
    state.settings.defaultCurrency = form.querySelector('#setting-currency').value;
    state.settings.defaultTaxRate = parseFloat(form.querySelector('#setting-tax-rate').value);
    saveState();
    hideSettingsModal();
    render(); // Re-render everything to reflect new settings
}

// --- INVOICE FORM (with Client Management) ---
function showInvoiceForm(invoiceToEdit = null) {
    state.isFormVisible = true;
    state.currentInvoice = invoiceToEdit || createNewInvoiceObject();
    render();
}

function hideInvoiceForm() {
    state.isFormVisible = false;
    state.currentInvoice = null;
    render();
}

function renderInvoiceForm() {
    const formSection = document.getElementById('invoice-form-section');
    const mainContent = document.querySelectorAll('#dashboard, #actions, #invoice-list');

    if (state.isFormVisible) {
        formSection.innerHTML = getInvoiceFormHTML(state.currentInvoice);
        formSection.classList.remove('hidden');
        mainContent.forEach(el => el.classList.add('hidden'));
        setupInvoiceFormEventListeners();
        calculateAllTotals();
    } else {
        formSection.classList.add('hidden');
        formSection.innerHTML = '';
        mainContent.forEach(el => el.classList.remove('hidden'));
    }
}

function setupInvoiceFormEventListeners() {
    document.getElementById('invoice-form').addEventListener('submit', handleSaveInvoice);
    document.getElementById('cancel-invoice-btn').addEventListener('click', hideInvoiceForm);
    document.getElementById('add-item-btn').addEventListener('click', handleAddItem);
    document.getElementById('invoice-items').addEventListener('click', handleRemoveItem);
    document.getElementById('invoice-items').addEventListener('input', handleFormInput);
    document.querySelector('.totals-section').addEventListener('input', handleFormInput);
    document.getElementById('client-select').addEventListener('change', handleClientSelect);
    document.getElementById('print-invoice-btn').addEventListener('click', () => window.print());
}

function handleClientSelect(event) {
    const clientId = event.target.value;
    const client = state.clients.find(c => c.id === clientId);
    if (client) {
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-address').value = client.address;
        document.getElementById('client-email').value = client.email;
    } else {
        // Clear fields if "New Client" is selected
        document.getElementById('client-name').value = '';
        document.getElementById('client-address').value = '';
        document.getElementById('client-email').value = '';
    }
}

function handleSaveInvoice(event) {
    event.preventDefault();
    const form = event.target;
    const invoiceId = form.dataset.invoiceId;

    const clientDetails = {
        name: form.querySelector('#client-name').value,
        address: form.querySelector('#client-address').value,
        email: form.querySelector('#client-email').value,
    };

    // Client Management: Save or update client
    let clientInState = state.clients.find(c => c.name.toLowerCase() === clientDetails.name.toLowerCase());
    if (clientInState) {
        Object.assign(clientInState, clientDetails);
    } else if (clientDetails.name) {
        clientInState = { ...clientDetails, id: `CLIENT-${Date.now()}` };
        state.clients.push(clientInState);
    }

    const updatedInvoice = {
        id: invoiceId,
        invoiceNumber: form.querySelector('#invoice-number').value,
        date: form.querySelector('#invoice-date').value,
        from: state.settings.company,
        to: clientDetails,
        items: [],
        taxRate: parseFloat(form.querySelector('#tax-rate').value) || 0,
        discount: {
            type: form.querySelector('#discount-type').value,
            value: parseFloat(form.querySelector('#discount-value').value) || 0,
        },
        status: state.currentInvoice.status || 'draft',
    };

    form.querySelectorAll('.invoice-item').forEach(itemRow => {
        updatedInvoice.items.push({
            description: itemRow.querySelector('.item-description').value,
            quantity: parseFloat(itemRow.querySelector('.item-quantity').value) || 0,
            price: parseFloat(itemRow.querySelector('.item-price').value) || 0,
        });
    });

    updatedInvoice.total = calculateFinalTotal(updatedInvoice);

    const existingIndex = state.invoices.findIndex(inv => inv.id === invoiceId);
    if (existingIndex > -1) {
        state.invoices[existingIndex] = updatedInvoice;
    } else {
        state.invoices.push(updatedInvoice);
        if (parseInt(updatedInvoice.invoiceNumber.replace('#','')) >= state.nextInvoiceId) {
             state.nextInvoiceId = parseInt(updatedInvoice.invoiceNumber.replace('#','')) + 1;
        }
    }

    saveState();
    hideInvoiceForm();
}


// --- INVOICE LIST & OTHER HANDLERS (Mostly unchanged) ---
function renderInvoiceList() {
    const container = document.getElementById('invoices-container');
    const emptyMessage = document.getElementById('invoice-list-empty');
    const filter = document.getElementById('filter-status').value;
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();

    const filteredInvoices = state.invoices.filter(inv => {
        const matchesFilter = filter === 'all' || inv.status === filter;
        const matchesSearch = searchTerm === '' || inv.to.name.toLowerCase().includes(searchTerm) || inv.invoiceNumber.toLowerCase().includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    const listHeader = `
        <div class="grid grid-cols-5 gap-4 p-2 border-b dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 text-sm print-hidden">
            <div>Invoice #</div>
            <div>Client</div>
            <div>Date</div>
            <div class="text-right">Amount</div>
            <div class="text-center">Actions</div>
        </div>
    `;

    if (filteredInvoices.length === 0) {
        container.innerHTML = listHeader;
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');
    container.innerHTML = listHeader + filteredInvoices.map(getInvoiceListItemHTML).join('');

    container.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditInvoice));
    container.querySelectorAll('.status-select').forEach(sel => sel.addEventListener('change', handleStatusChange));
}
function handleEditInvoice(event) {
    const invoiceId = event.target.closest('.invoice-list-item').dataset.id;
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    showInvoiceForm(invoice);
}
function handleStatusChange(event) {
    const invoiceId = event.target.closest('.invoice-list-item').dataset.id;
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    invoice.status = event.target.value;
    saveState();
    render();
}
function handleAddItem() {
    state.currentInvoice.items.push({ description: '', quantity: 1, price: 0 });
    renderInvoiceForm();
}
function handleRemoveItem(event) {
    if (!event.target.classList.contains('remove-item-btn')) return;
    const itemIndex = event.target.closest('.invoice-item').dataset.index;
    state.currentInvoice.items.splice(itemIndex, 1);
    renderInvoiceForm();
}
function handleFormInput(event) {
    if (event.target.matches('.item-quantity, .item-price, #tax-rate, #discount-value')) {
        calculateAllTotals();
    }
}
function calculateAllTotals() {
    // (Omitted for brevity - same as before)
    const form = document.getElementById('invoice-form');
    let subtotal = 0;

    form.querySelectorAll('.invoice-item').forEach(itemRow => {
        const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
        const itemTotal = quantity * price;
        itemRow.querySelector('.item-total').textContent = formatCurrency(itemTotal);
        subtotal += itemTotal;
    });

    const taxRate = parseFloat(form.querySelector('#tax-rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);

    const discountType = form.querySelector('#discount-type').value;
    const discountValue = parseFloat(form.querySelector('#discount-value').value) || 0;
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
    } else {
        discountAmount = discountValue;
    }

    const total = subtotal + taxAmount - discountAmount;

    form.querySelector('#subtotal').textContent = formatCurrency(subtotal);
    form.querySelector('#tax-amount').textContent = formatCurrency(taxAmount);
    form.querySelector('#discount-amount').textContent = formatCurrency(discountAmount);
    form.querySelector('#total').textContent = formatCurrency(total);
}
function calculateFinalTotal(invoice) {
    // (Omitted for brevity - same as before)
     const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxAmount = subtotal * (invoice.taxRate / 100);
    let discountAmount = 0;
    if (invoice.discount.type === 'percentage') {
        discountAmount = subtotal * (invoice.discount.value / 100);
    } else {
        discountAmount = invoice.discount.value;
    }
    return subtotal + taxAmount - discountAmount;
}

// --- HTML TEMPLATES ---
function getSettingsModalHTML() {
    const s = state.settings;
    return `
        <h2 class="text-xl font-bold mb-4 text-gray-800 dark:text-white">Settings</h2>
        <form id="settings-form" class="space-y-4">
            <h3 class="text-lg font-semibold border-b pb-2">Your Company</h3>
            <div>
                <label for="setting-company-name" class="label">Company Name</label>
                <input id="setting-company-name" class="input-field" value="${s.company.name}">
            </div>
            <div>
                <label for="setting-company-address" class="label">Address</label>
                <input id="setting-company-address" class="input-field" value="${s.company.address}">
            </div>
            <div>
                <label for="setting-company-email" class="label">Email</label>
                <input id="setting-company-email" type="email" class="input-field" value="${s.company.email}">
            </div>
            <div>
                <label for="setting-company-taxid" class="label">Tax ID</label>
                <input id="setting-company-taxid" class="input-field" value="${s.company.taxId}">
            </div>
            <h3 class="text-lg font-semibold border-b pb-2 pt-4">Defaults</h3>
            <div>
                <label for="setting-currency" class="label">Currency Symbol</label>
                <input id="setting-currency" class="input-field w-24" value="${s.defaultCurrency}">
            </div>
            <div>
                <label for="setting-tax-rate" class="label">Default Tax Rate (%)</label>
                <input id="setting-tax-rate" type="number" class="input-field w-24" value="${s.defaultTaxRate}">
            </div>
            <div class="mt-6 flex justify-end">
                <button type="button" id="cancel-settings-btn" class="btn-secondary mr-2">Cancel</button>
                <button type="submit" class="btn-primary">Save Settings</button>
            </div>
        </form>
    `;
}

function getInvoiceFormHTML(invoice) {
    const clientOptions = state.clients.map(c => `<option value="${c.id}" ${invoice.to.email === c.email ? 'selected' : ''}>${c.name}</option>`).join('');
    const itemsHTML = invoice.items.map((item, index) => `
        <div class="invoice-item grid grid-cols-12 gap-2 items-center mb-2" data-index="${index}">
            <div class="col-span-4"><input type="text" class="item-description input-field" placeholder="Item description" value="${item.description || ''}"></div>
            <div class="col-span-2"><input type="number" class="item-quantity input-field" placeholder="1" value="${item.quantity}"></div>
            <div class="col-span-2"><input type="number" step="0.01" class="item-price input-field" placeholder="0.00" value="${item.price}"></div>
            <div class="col-span-3 item-total text-right pr-4 text-gray-800 dark:text-gray-100">${formatCurrency(item.quantity * item.price)}</div>
            <div class="col-span-1 text-right"><button type="button" class="remove-item-btn text-red-500 hover:text-red-700 text-2xl">&times;</button></div>
        </div>
    `).join('');

    return `
        <!-- Form is wrapped in a 'printable-area' for CSS print targeting -->
        <div class="printable-area">
            <form id="invoice-form" data-invoice-id="${invoice.id}" class="space-y-6">
                <!-- Header & Meta -->
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Invoice</h2>
                        <input type="text" id="invoice-number" class="input-field text-lg" value="${invoice.invoiceNumber}">
                    </div>
                    <div class="text-right">
                        <label for="invoice-date" class="block text-sm">Date</label>
                        <input type="date" id="invoice-date" class="input-field" value="${invoice.date}">
                    </div>
                </div>
                <!-- From/To -->
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h3 class="font-bold mb-2">From:</h3>
                        <p>${state.settings.company.name}</p>
                        <p>${state.settings.company.address}</p>
                        <p>${state.settings.company.email}</p>
                    </div>
                    <div>
                        <h3 class="font-bold mb-2">To:</h3>
                        <select id="client-select" class="input-field w-full mb-2">
                            <option value="">--- New Client ---</option>
                            ${clientOptions}
                        </select>
                        <input id="client-name" class="input-field w-full mb-2" placeholder="Client Name" value="${invoice.to.name || ''}">
                        <textarea id="client-address" class="input-field w-full mb-2" placeholder="Client Address">${invoice.to.address || ''}</textarea>
                        <input id="client-email" type="email" class="input-field w-full" placeholder="Client Email" value="${invoice.to.email || ''}">
                    </div>
                </div>
                <!-- Items -->
                <div>
                    <div class="grid grid-cols-12 gap-2 mb-2 font-bold text-sm text-gray-600 dark:text-gray-300">
                        <div class="col-span-4">Description</div>
                        <div class="col-span-2">Quantity</div>
                        <div class="col-span-2">Price</div>
                        <div class="col-span-3 text-right pr-4">Total</div>
                    </div>
                    <div id="invoice-items">${itemsHTML}</div>
                    <button type="button" id="add-item-btn" class="mt-2 btn-secondary text-sm">Add Item</button>
                </div>
                <!-- Totals -->
                <div class="flex justify-end">
                    <div class="w-1/2 space-y-2 totals-section">
                        <div class="flex justify-between"><span>Subtotal</span><span id="subtotal">$0.00</span></div>
                        <div class="flex justify-between items-center">
                            <span>Tax (%)</span>
                            <input type="number" id="tax-rate" class="input-field w-20 text-right" value="${invoice.taxRate}">
                            <span id="tax-amount" class="w-24 text-right">$0.00</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Discount</span>
                            <div class="flex items-center">
                                <select id="discount-type" class="input-field w-24 mr-1">
                                    <option value="fixed" ${invoice.discount?.type === 'fixed' ? 'selected' : ''}>Fixed</option>
                                    <option value="percentage" ${invoice.discount?.type === 'percentage' ? 'selected' : ''}>%</option>
                                </select>
                                <input type="number" id="discount-value" class="input-field w-20 text-right" value="${invoice.discount?.value || 0}">
                            </div>
                            <span id="discount-amount" class="w-24 text-right">$0.00</span>
                        </div>
                        <div class="border-t border-gray-300 dark:border-gray-600 my-2"></div>
                        <div class="flex justify-between font-bold text-lg"><span>Total</span><span id="total">$0.00</span></div>
                    </div>
                </div>
            </form>
        </div>
        <!-- Actions -->
        <div class="flex justify-end pt-4 print-hidden">
            <button type="button" id="cancel-invoice-btn" class="btn-secondary mr-2">Cancel</button>
            <button type="button" id="print-invoice-btn" class="btn-secondary mr-2">Print / PDF</button>
            <button type="submit" form="invoice-form" class="btn-primary">Save Invoice</button>
        </div>
    `;
}

function getInvoiceListItemHTML(invoice) {
    // (Omitted for brevity - same as before)
     const statusColors = {
        paid: 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100',
        pending: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
        draft: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
    };
    return `
        <div class="invoice-list-item grid grid-cols-5 gap-4 items-center p-2 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700" data-id="${invoice.id}">
            <div class="font-medium text-gray-800 dark:text-gray-100">${invoice.invoiceNumber}</div>
            <div class="text-gray-600 dark:text-gray-300 truncate">${invoice.to.name}</div>
            <div class="text-gray-600 dark:text-gray-300">${invoice.date}</div>
            <div class="font-medium text-gray-800 dark:text-gray-100 text-right">${formatCurrency(invoice.total)}</div>
            <div class="text-center">
                <select class="status-select text-xs rounded-full px-2 py-1 border-0 ${statusColors[invoice.status]} focus:ring-0">
                    <option value="draft" ${invoice.status === 'draft' ? 'selected' : ''}>Draft</option>
                    <option value="pending" ${invoice.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Paid</option>
                </select>
                <button class="edit-btn ml-2 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</button>
            </div>
        </div>
    `;
}

// --- UTILITIES ---
function formatCurrency(amount, currency = state.settings.defaultCurrency) {
    return `${currency}${(amount || 0).toFixed(2)}`;
}

function createNewInvoiceObject() {
    return {
        id: `INV-${Date.now()}`,
        invoiceNumber: `#${String(state.nextInvoiceId).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        from: state.settings.company,
        to: { name: '', address: '', email: '' },
        items: [{ description: 'Example Item', quantity: 1, price: 50 }],
        taxRate: state.settings.defaultTaxRate,
        discount: { type: 'fixed', value: 0 },
        status: 'draft',
        total: 0,
    };
}

// Inject base styles to avoid repeating tailwind classes in JS
const style = document.createElement('style');
style.textContent = `
    .label { @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1; }
    .input-field { @apply block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500; }
    .btn-primary { @apply bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500; }
    .btn-secondary { @apply bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-lg; }
`;
document.head.append(style);
