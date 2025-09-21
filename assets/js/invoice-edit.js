document.addEventListener('DOMContentLoaded', () => {
    initShared();
    initInvoiceForm();
});

let currentInvoice = null;

function initInvoiceForm() {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('id');

    if (invoiceId) {
        currentInvoice = state.invoices.find(inv => inv.id === invoiceId);
    } else {
        currentInvoice = createNewInvoiceObject();
    }

    if (!currentInvoice) {
        document.getElementById('invoice-form-section').innerHTML = `<p class="text-red-500">Error: Invoice not found.</p>`;
        return;
    }

    renderInvoiceForm();
}

function renderInvoiceForm() {
    const formSection = document.getElementById('invoice-form-section');
    if (!formSection) return;

    formSection.innerHTML = getInvoiceFormHTML(currentInvoice);
    setupInvoiceFormEventListeners();
    calculateAllTotals();
}

function setupInvoiceFormEventListeners() {
    document.getElementById('invoice-form').addEventListener('submit', handleSaveInvoice);
    document.getElementById('cancel-invoice-btn').addEventListener('click', () => { window.location.href = 'invoices.html'; });
    document.getElementById('add-item-btn').addEventListener('click', handleAddItem);
    document.getElementById('invoice-items').addEventListener('click', handleRemoveItem);
    document.getElementById('invoice-items').addEventListener('input', handleFormInput);
    document.querySelector('.totals-section').addEventListener('input', handleFormInput);
    document.getElementById('client-select').addEventListener('change', handleClientSelect);
    document.getElementById('print-invoice-btn').addEventListener('click', () => window.print());
}

function handleSaveInvoice(event) {
    event.preventDefault();
    const form = event.target;

    const clientDetails = {
        name: form.querySelector('#client-name').value,
        company: form.querySelector('#client-company').value,
        address: form.querySelector('#client-address').value,
        email: form.querySelector('#client-email').value,
        phone: form.querySelector('#client-phone').value,
    };

    // Client Management: Save or update client
    if (clientDetails.name) {
        let clientInState = state.clients.find(c => c.name.toLowerCase() === clientDetails.name.toLowerCase());
        if (clientInState) {
            Object.assign(clientInState, clientDetails);
        } else {
            state.clients.push({ ...clientDetails, id: `CLIENT-${Date.now()}` });
        }
    }

    const updatedInvoice = {
        id: currentInvoice.id,
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
        status: currentInvoice.status || 'draft',
    };

    form.querySelectorAll('.invoice-item').forEach(itemRow => {
        updatedInvoice.items.push({
            description: itemRow.querySelector('.item-description').value,
            quantity: parseFloat(itemRow.querySelector('.item-quantity').value) || 0,
            price: parseFloat(itemRow.querySelector('.item-price').value) || 0,
        });
    });

    updatedInvoice.total = calculateFinalTotal(updatedInvoice);

    const existingIndex = state.invoices.findIndex(inv => inv.id === updatedInvoice.id);
    if (existingIndex > -1) {
        state.invoices[existingIndex] = updatedInvoice;
    } else {
        state.invoices.push(updatedInvoice);
        if (parseInt(updatedInvoice.invoiceNumber.replace(/[^0-9]/g, '')) >= state.nextInvoiceId) {
            state.nextInvoiceId = parseInt(updatedInvoice.invoiceNumber.replace(/[^0-9]/g, '')) + 1;
        }
    }

    saveState();
    window.location.href = 'invoices.html'; // Redirect after save
}

function handleAddItem() {
    currentInvoice.items.push({ description: '', quantity: 1, price: 0 });
    renderInvoiceForm();
}

function handleRemoveItem(event) {
    if (!event.target.classList.contains('remove-item-btn')) return;
    const itemIndex = parseInt(event.target.closest('.invoice-item').dataset.index, 10);
    currentInvoice.items.splice(itemIndex, 1);
    renderInvoiceForm();
}

function handleFormInput(event) {
    if (event.target.matches('.item-quantity, .item-price, #tax-rate, #discount-value')) {
        calculateAllTotals();
    }
}

function handleClientSelect(event) {
    const clientId = event.target.value;
    const client = state.clients.find(c => c.id === clientId);
    const nameEl = document.getElementById('client-name');
    const addressEl = document.getElementById('client-address');
    const emailEl = document.getElementById('client-email');

    if (client) {
        nameEl.value = client.name;
        addressEl.value = client.address;
        emailEl.value = client.email;
    } else {
        nameEl.value = '';
        addressEl.value = '';
        emailEl.value = '';
    }
}

function calculateAllTotals() {
    const form = document.getElementById('invoice-form');
    if(!form) return;
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

function getInvoiceFormHTML(invoice) {
    const clientOptions = state.clients.map(c => `<option value="${c.id}" ${invoice.to && invoice.to.email === c.email ? 'selected' : ''}>${c.name}</option>`).join('');
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
        <div class="printable-area">
            <form id="invoice-form" class="space-y-6">
                <div class="flex justify-between items-start"><input type="text" id="invoice-number" class="input-field text-lg hidden" value="${invoice.invoiceNumber}"><h2 class="text-2xl font-bold text-gray-800 dark:text-white">${invoice.id ? 'Edit Invoice' : 'New Invoice'} ${invoice.invoiceNumber}</h2><div class="text-right"><label for="invoice-date" class="block text-sm">Date</label><input type="date" id="invoice-date" class="input-field" value="${invoice.date}"></div></div>
                <div class="grid grid-cols-2 gap-6">
                    <div><h3 class="font-bold mb-2">From:</h3><p>${state.settings.company.name}</p><p>${state.settings.company.address}</p><p>${state.settings.company.email}</p></div>
                    <div>
                        <h3 class="font-bold mb-2">To:</h3>
                        <select id="client-select" class="input-field w-full mb-2"><option value="">--- New Client ---</option>${clientOptions}</select>
                        <input id="client-name" class="input-field w-full mb-2" placeholder="Client Name" value="${invoice.to.name || ''}">
                        <input id="client-company" class="input-field w-full mb-2" placeholder="Company" value="${invoice.to.company || ''}">
                        <input id="client-email" type="email" class="input-field w-full mb-2" placeholder="Email" value="${invoice.to.email || ''}">
                        <input id="client-phone" type="tel" class="input-field w-full mb-2" placeholder="Phone" value="${invoice.to.phone || ''}">
                        <textarea id="client-address" class="input-field w-full" placeholder="Address">${invoice.to.address || ''}</textarea>
                    </div>
                </div>
                <div><div class="grid grid-cols-12 gap-2 mb-2 font-bold text-sm text-gray-600 dark:text-gray-300"><div class="col-span-4">Description</div><div class="col-span-2">Quantity</div><div class="col-span-2">Price</div><div class="col-span-3 text-right pr-4">Total</div></div><div id="invoice-items">${itemsHTML}</div><button type="button" id="add-item-btn" class="mt-2 btn-secondary text-sm">Add Item</button></div>
                <div class="flex justify-end"><div class="w-1/2 space-y-2 totals-section"><div class="flex justify-between"><span>Subtotal</span><span id="subtotal">$0.00</span></div><div class="flex justify-between items-center"><span>Tax (%)</span><input type="number" id="tax-rate" class="input-field w-20 text-right" value="${invoice.taxRate}"><span id="tax-amount" class="w-24 text-right">$0.00</span></div><div class="flex justify-between items-center"><span>Discount</span><div class="flex items-center"><select id="discount-type" class="input-field w-24 mr-1"><option value="fixed" ${invoice.discount?.type === 'fixed' ? 'selected' : ''}>Fixed</option><option value="percentage" ${invoice.discount?.type === 'percentage' ? 'selected' : ''}>%</option></select><input type="number" id="discount-value" class="input-field w-20 text-right" value="${invoice.discount?.value || 0}"></div><span id="discount-amount" class="w-24 text-right">$0.00</span></div><div class="border-t border-gray-300 dark:border-gray-600 my-2"></div><div class="flex justify-between font-bold text-lg"><span>Total</span><span id="total">$0.00</span></div></div></div>
            </form>
        </div>
        <div class="flex justify-end pt-4 print-hidden"><button type="button" id="cancel-invoice-btn" class="btn-secondary mr-2">Cancel</button><button type="button" id="print-invoice-btn" class="btn-secondary mr-2">Print / PDF</button><button type="submit" form="invoice-form" class="btn-primary">Save Invoice</button></div>
    `;
}

function createNewInvoiceObject() {
    return {
        id: ``, // Will be set on save
        invoiceNumber: `#${String(state.nextInvoiceId).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        from: state.settings.company,
        to: { name: '', address: '', email: '' },
        items: [{ description: '', quantity: 1, price: 0 }],
        taxRate: state.settings.defaultTaxRate,
        discount: { type: 'fixed', value: 0 },
        status: 'draft',
        total: 0,
    };
}
