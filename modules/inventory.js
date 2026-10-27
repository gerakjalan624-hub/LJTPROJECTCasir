/**
 * SIM-Market Enterprise - Inventory Management Module
 * Mengelola pemantauan stok gudang, modal registrasi SKU baru dengan validasi ketat,
 * pengadaan restock pasokan vendor, dan penanganan scan barcode SKU.
 */

import { panggilDatabaseAman } from '../services/db.js';
import { store } from '../services/state.js';
import { showToast } from '../services/notification.js';
import { renderMenusRestockDropdown } from './suppliers.js';

// --- RENDER TABEL STOK GUDANG ---
export function renderTabelStok() {
    const tbody = document.getElementById('stok-table-body');
    if (!tbody) return;

    const masterStok = store.masterStok;

    if (masterStok.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-500 italic">Belum ada data inventori produk di gudang.</td></tr>`;
        return;
    }

    tbody.innerHTML = masterStok.map(b => {
        let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Aman</span>`;
        if (b.stok <= 15 && b.stok > 0) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Menipis</span>`;
        } else if (b.stok === 0) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Habis</span>`;
        }

        return `
            <tr class="hover:bg-slate-900/30">
                <td class="py-3 px-4 font-mono font-bold text-xs text-cyan-400">${escapeHtml(b.id_produk)}</td>
                <td class="py-3 px-4 font-medium text-white">${escapeHtml(b.nama)}</td>
                <td class="py-3 px-4 text-xs text-slate-400">${escapeHtml(b.kategori || 'Umum')}</td>
                <td class="py-3 px-4 text-right font-medium">Rp ${Number(b.harga || 0).toLocaleString('id-ID')}</td>
                <td class="py-3 px-4 text-center font-bold ${b.stok <= 15 ? 'text-amber-400' : 'text-slate-200'}">${b.stok} Pcs</td>
                <td class="py-3 px-4 text-center">${statusBadge}</td>
            </tr>
        `;
    }).join('');

    renderMenusRestockDropdown();
}

// --- MODAL REGISTRASI PRODUK BARU & VALIDASI FORM (PENGGANTI PROMPT()) ---
export function bukaModalTambahProduk() {
    const modal = document.getElementById('modal-tambah-produk');
    if (!modal) return;

    // Reset pesan error form
    resetErrorMessages();

    // Rekomendasi Kode SKU otomatis berurutan
    const nextNum = store.masterStok.length + 1;
    const formattedNum = String(nextNum).padStart(3, '0');
    const autoSku = `BRG-${formattedNum}`;

    const skuInput = document.getElementById('modal-prod-sku');
    const namaInput = document.getElementById('modal-prod-nama');
    const kategoriSelect = document.getElementById('modal-prod-kategori');
    const hargaInput = document.getElementById('modal-prod-harga');
    const stokInput = document.getElementById('modal-prod-stok');

    if (skuInput) skuInput.value = autoSku;
    if (namaInput) {
        namaInput.value = '';
        setTimeout(() => namaInput.focus(), 100);
    }
    if (kategoriSelect) kategoriSelect.value = 'Makanan';
    if (hargaInput) hargaInput.value = '';
    if (stokInput) stokInput.value = '50';

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) modalBox.classList.remove('scale-95');
    });
}

export function tutupModalTambahProduk() {
    const modal = document.getElementById('modal-tambah-produk');
    if (!modal) return;

    modal.classList.add('opacity-0');
    const modalBox = modal.querySelector('.modal-box');
    if (modalBox) modalBox.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 250);
}

function resetErrorMessages() {
    document.querySelectorAll('.form-error-msg').forEach(el => el.innerText = '');
    document.querySelectorAll('.form-input-highlight').forEach(el => el.classList.remove('border-rose-500'));
}

export async function simpanProdukBaruModal() {
    const skuInput = document.getElementById('modal-prod-sku');
    const namaInput = document.getElementById('modal-prod-nama');
    const kategoriSelect = document.getElementById('modal-prod-kategori');
    const hargaInput = document.getElementById('modal-prod-harga');
    const stokInput = document.getElementById('modal-prod-stok');

    resetErrorMessages();

    let isValid = true;

    // 1. Validasi SKU
    const skuVal = skuInput ? skuInput.value.trim().toUpperCase() : '';
    if (!skuVal) {
        setFieldError('modal-prod-sku', 'error-prod-sku', 'Kode SKU tidak boleh kosong!');
        isValid = false;
    } else {
        const isDuplicate = store.masterStok.some(p => p.id_produk.toLowerCase() === skuVal.toLowerCase());
        if (isDuplicate) {
            setFieldError('modal-prod-sku', 'error-prod-sku', `Kode SKU [${skuVal}] sudah digunakan produk lain!`);
            isValid = false;
        }
    }

    // 2. Validasi Nama
    const namaVal = namaInput ? namaInput.value.trim() : '';
    if (!namaVal || namaVal.length < 2) {
        setFieldError('modal-prod-nama', 'error-prod-nama', 'Nama produk harus diisi minimal 2 karakter!');
        isValid = false;
    }

    // 3. Validasi Kategori
    const kategoriVal = kategoriSelect ? kategoriSelect.value.trim() : 'Umum';

    // 4. Validasi Harga (Wajib > 0)
    const hargaRaw = hargaInput ? hargaInput.value.trim() : '';
    const hargaVal = parseFloat(hargaRaw);
    if (isNaN(hargaVal) || hargaVal <= 0) {
        setFieldError('modal-prod-harga', 'error-prod-harga', 'Harga jual harus berupa angka lebih besar dari 0!');
        isValid = false;
    }

    // 5. Validasi Stok (Wajib >= 0)
    const stokRaw = stokInput ? stokInput.value.trim() : '';
    const stokVal = parseInt(stokRaw, 10);
    if (isNaN(stokVal) || stokVal < 0) {
        setFieldError('modal-prod-stok', 'error-prod-stok', 'Kuantitas stok awal harus berupa bilangan bulat >= 0!');
        isValid = false;
    }

    if (!isValid) return;

    const submitBtn = document.getElementById('btn-submit-modal-produk');
    const originalText = submitBtn ? submitBtn.innerHTML : "Simpan Produk";

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i> Menyimpan...`;
    }

    const produkBaru = {
        id_produk: skuVal,
        nama: namaVal,
        kategori: kategoriVal,
        harga: hargaVal,
        stok: stokVal
    };

    try {
        const { error } = await panggilDatabaseAman({
            tabel: 'produk',
            aksi: 'INSERT',
            data: [produkBaru]
        });

        if (error) {
            throw error;
        }

        store.upsertProductInState(produkBaru);
        renderTabelStok();
        renderMenusRestockDropdown();

        showToast(`SKU [${skuVal}] "${namaVal}" berhasil didaftarkan ke gudang!`, "success");
        tutupModalTambahProduk();

    } catch (err) {
        console.error("Gagal menambahkan SKU baru:", err);
        showToast("Gagal menyimpan produk: " + (err.message || err), "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

function setFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    if (input) input.classList.add('border-rose-500');
    if (errorEl) errorEl.innerText = message;
}

// --- RESTOCK BARANG MASUK ---
export async function eksekusiRestockBarang() {
    const produkIdEl = document.getElementById('restock-produk');
    const supplierIdEl = document.getElementById('restock-supplier');
    const qtyInput = document.getElementById('restock-qty');

    const produkId = produkIdEl ? produkIdEl.value : '';
    const supplierId = supplierIdEl ? supplierIdEl.value : '';
    const qtyMasuk = parseInt(qtyInput ? qtyInput.value : '0', 10);

    if (isNaN(qtyMasuk) || qtyMasuk < 1) {
        showToast("Masukkan kuantitas restock masuk yang valid (minimal 1 pcs)!", "warning");
        return;
    }

    const produkTarget = store.masterStok.find(b => b.id_produk === produkId);
    const supplierTarget = store.masterSupplier.find(s => s.id_supplier === supplierId);

    if (!produkTarget) {
        showToast("Pilih produk yang ingin direstock terlebih dahulu!", "warning");
        return;
    }

    const kuantitasBaru = produkTarget.stok + qtyMasuk;

    const restockBtn = document.querySelector('button[onclick="eksekusiRestockBarang()"]') ||
                       document.querySelector('#tab-supplier button.from-amber-500');
    const originalText = restockBtn ? restockBtn.innerHTML : "Konfirmasi Pasokan Masuk";

    if (restockBtn) {
        restockBtn.disabled = true;
        restockBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i> Mengupdate Pasokan...`;
    }

    try {
        const { error } = await panggilDatabaseAman({
            tabel: 'produk',
            aksi: 'UPDATE',
            data: { stok: kuantitasBaru },
            filterKolom: 'id_produk',
            filterNilai: produkId
        });

        if (error) throw error;

        store.updateSingleProductStock(produkId, kuantitasBaru);
        renderTabelStok();

        showToast(`[RESTOCK SUKSES] Produk: ${produkTarget.nama} (+${qtyMasuk} pcs). Total Stok: ${kuantitasBaru} pcs`, "success", 4000);
        if (qtyInput) qtyInput.value = "50";

    } catch (err) {
        console.error("Gagal restock:", err);
        showToast("Gagal melakukan restock barang: " + (err.message || err), "error");
    } finally {
        if (restockBtn) {
            restockBtn.disabled = false;
            restockBtn.innerHTML = originalText;
        }
    }
}

// --- DUKUNGAN SCAN BARCODE SKU (DARI URL ATAU LOCALSTORAGE) ---
export async function ensureScannedSkuInSupabase() {
    const params = new URLSearchParams(window.location.search);
    const scannedSku = params.get('sku') || localStorage.getItem('last_scanned_sku');
    if (!scannedSku) return false;

    const trimmedSku = scannedSku.trim();
    if (!trimmedSku) return false;

    const note = params.get('note') || localStorage.getItem('last_scanned_note') || '';
    const qtyFromParams = parseInt(params.get('qty') || localStorage.getItem('last_scanned_qty') || '1', 10);
    const qtyToAdd = Number.isFinite(qtyFromParams) && qtyFromParams > 0 ? qtyFromParams : 1;

    const existingProduct = store.masterStok.find(item => item.id_produk?.toString().toLowerCase() === trimmedSku.toLowerCase());
    const baseName = note ? `Produk ${trimmedSku} (${note})` : `Produk ${trimmedSku}`;

    try {
        if (existingProduct) {
            const nextQty = (Number(existingProduct.stok) || 0) + qtyToAdd;
            const { error } = await panggilDatabaseAman({
                tabel: 'produk',
                aksi: 'UPDATE',
                data: {
                    stok: nextQty,
                    nama: note ? `${existingProduct.nama || baseName} (${note})` : existingProduct.nama || baseName
                },
                filterKolom: 'id_produk',
                filterNilai: existingProduct.id_produk
            });

            if (error) throw error;

            existingProduct.stok = nextQty;
            if (note) existingProduct.nama = `${existingProduct.nama || baseName} (${note})`;
            store.upsertProductInState(existingProduct);
        } else {
            const newProduct = {
                id_produk: trimmedSku,
                nama: baseName,
                kategori: 'Scan',
                harga: 0,
                stok: qtyToAdd
            };

            const { data, error } = await panggilDatabaseAman({
                tabel: 'produk',
                aksi: 'INSERT',
                data: [newProduct]
            });
            if (error) throw error;

            store.upsertProductInState((data && data[0]) ? data[0] : newProduct);
        }

        localStorage.removeItem('last_scanned_sku');
        localStorage.removeItem('last_scanned_note');
        localStorage.removeItem('last_scanned_qty');
        renderTabelStok();
        renderMenusRestockDropdown();
        return true;
    } catch (err) {
        console.error('Gagal memproses SKU hasil scan barcode:', err);
        return false;
    }
}

export function applyScannedSkuToPOS() {
    const searchInput = document.getElementById('pos-produk-search');
    const selectedIdInput = document.getElementById('pos-produk-selected-id');
    if (!searchInput || !selectedIdInput) return;

    const params = new URLSearchParams(window.location.search);
    const scannedSku = params.get('sku') || localStorage.getItem('last_scanned_sku');
    if (!scannedSku) return;

    const trimmedSku = scannedSku.trim();
    const product = store.masterStok.find(item => item.id_produk?.toString().toLowerCase() === trimmedSku.toLowerCase());

    if (product) {
        selectedIdInput.value = product.id_produk;
        searchInput.value = `[${product.id_produk}] ${product.nama} - Rp ${Number(product.harga).toLocaleString('id-ID')}`;
    } else {
        selectedIdInput.value = trimmedSku;
        searchInput.value = trimmedSku;
    }

    searchInput.focus();
    localStorage.removeItem('last_scanned_sku');
    localStorage.removeItem('last_scanned_note');
    localStorage.removeItem('last_scanned_qty');
    window.history.replaceState({}, '', window.location.pathname);
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
