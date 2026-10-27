/**
 * SIM-Market Enterprise - Supplier & Procurement Logistics Module
 * Mengelola daftar distributor rekanan dan opsi pengadaan pasokan barang
 */

import { store } from '../services/state.js';

export function renderTabelSupplier() {
    const tbody = document.getElementById('supplier-table-body');
    if (!tbody) return;

    const masterSupplier = store.masterSupplier;

    if (masterSupplier.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-xs text-slate-500 italic">Belum ada distributor rekanan terdaftar.</td></tr>`;
        return;
    }

    tbody.innerHTML = masterSupplier.map(s => `
        <tr class="hover:bg-slate-900/30">
            <td class="py-3 px-4 font-mono text-xs text-amber-400 font-bold">${escapeHtml(s.id_supplier)}</td>
            <td class="py-3 px-4 font-medium text-white font-semibold">${escapeHtml(s.nama)}</td>
            <td class="py-3 px-4 text-xs text-slate-400">${escapeHtml(s.kategori || 'Distributor')}</td>
            <td class="py-3 px-4 text-xs text-slate-400">${escapeHtml(s.kontak || '-')}</td>
        </tr>
    `).join('');
}

export function renderMenusRestockDropdown() {
    const pSelect = document.getElementById('restock-produk');
    const sSelect = document.getElementById('restock-supplier');
    if (!pSelect || !sSelect) return;

    const masterStok = store.masterStok;
    const masterSupplier = store.masterSupplier;

    if (masterStok.length === 0) {
        pSelect.innerHTML = `<option value="">(Belum ada produk di database)</option>`;
    } else {
        pSelect.innerHTML = masterStok.map(b => `
            <option value="${b.id_produk}">[${b.id_produk}] ${escapeHtml(b.nama)} (Sisa: ${b.stok} pcs)</option>
        `).join('');
    }

    if (masterSupplier.length === 0) {
        sSelect.innerHTML = `<option value="">(Belum ada supplier terdaftar)</option>`;
    } else {
        sSelect.innerHTML = masterSupplier.map(s => `
            <option value="${s.id_supplier}">[${s.id_supplier}] ${escapeHtml(s.nama)} (${escapeHtml(s.kategori || 'Distributor')})</option>
        `).join('');
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
