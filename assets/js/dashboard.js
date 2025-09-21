document.addEventListener('DOMContentLoaded', () => {
    initShared(); // Initialize shared components like theme, settings modal
    renderDashboard();
});

function renderDashboard() {
    const totalInvoicesEl = document.getElementById('total-invoices');
    const totalRevenueEl = document.getElementById('total-revenue');
    const outstandingBalanceEl = document.getElementById('outstanding-balance');

    // Ensure the elements exist on the page before proceeding
    if (!totalInvoicesEl || !totalRevenueEl || !outstandingBalanceEl) {
        return;
    }

    const totalInvoices = state.invoices.length;

    const totalRevenue = state.invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const outstandingBalance = state.invoices
        .filter(inv => inv.status === 'pending' || inv.status === 'draft')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

    totalInvoicesEl.textContent = totalInvoices;
    totalRevenueEl.textContent = formatCurrency(totalRevenue);
    outstandingBalanceEl.textContent = formatCurrency(outstandingBalance);
}
