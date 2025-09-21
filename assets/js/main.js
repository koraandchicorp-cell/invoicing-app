// --- SHARED STATE MANAGEMENT ---
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
};

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Deep merge to handle nested objects and new properties
        state = {
            ...state,
            ...parsedState,
            settings: {
                ...state.settings,
                ...(parsedState.settings || {}),
                company: {
                    ...state.settings.company,
                    ...(parsedState.settings?.company || {}),
                },
            },
            clients: parsedState.clients || [],
            invoices: parsedState.invoices || [],
        };
    }
}

// --- SHARED INITIALIZATION ---
// This function will be called by page-specific scripts.
function initShared() {
    loadState();
    // Setup listeners for elements present on all pages
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', showSettingsModal);

    renderTheme();
    renderSettingsModal(); // Initial render in case it needs to be shown
}


// --- THEME LOGIC ---
function renderTheme() {
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    if (!lightIcon || !darkIcon) return;

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


// --- SETTINGS MODAL LOGIC ---
function showSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        renderSettingsModal();
    }
}

function hideSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal || !modal.classList.contains('flex')) return;

    modal.innerHTML = getSettingsModalHTML();
    document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
    document.getElementById('cancel-settings-btn').addEventListener('click', hideSettingsModal);
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
    // Potentially alert the user or re-render parts of the page if needed
}

function getSettingsModalHTML() {
    const s = state.settings;
    return `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 class="text-xl font-bold mb-4 text-gray-800 dark:text-white">Settings</h2>
            <form id="settings-form" class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2">Your Company</h3>
                <div><label for="setting-company-name" class="label">Company Name</label><input id="setting-company-name" class="input-field" value="${s.company.name}"></div>
                <div><label for="setting-company-address" class="label">Address</label><input id="setting-company-address" class="input-field" value="${s.company.address}"></div>
                <div><label for="setting-company-email" class="label">Email</label><input id="setting-company-email" type="email" class="input-field" value="${s.company.email}"></div>
                <div><label for="setting-company-taxid" class="label">Tax ID</label><input id="setting-company-taxid" class="input-field" value="${s.company.taxId}"></div>
                <h3 class="text-lg font-semibold border-b pb-2 pt-4">Defaults</h3>
                <div><label for="setting-currency" class="label">Currency Symbol</label><input id="setting-currency" class="input-field w-24" value="${s.defaultCurrency}"></div>
                <div><label for="setting-tax-rate" class="label">Default Tax Rate (%)</label><input id="setting-tax-rate" type="number" class="input-field w-24" value="${s.defaultTaxRate}"></div>
                <div class="mt-6 flex justify-end">
                    <button type="button" id="cancel-settings-btn" class="btn-secondary mr-2">Cancel</button>
                    <button type="submit" class="btn-primary">Save Settings</button>
                </div>
            </form>
        </div>
    `;
}


// --- UTILITIES ---
function formatCurrency(amount, currency = state.settings.defaultCurrency) {
    return `${currency}${(amount || 0).toFixed(2)}`;
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
