/**
 * ==============================================================================
 * SISTEM INFORMASI MINIMARKET (SIM-MARKET ENTERPRISE)
 * Entry Point & Modular Application Orchestrator
 * ==============================================================================
 */

// 1. Service Worker PWA Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log("[PWA] Service Worker Aktif & Terdaftar."))
            .catch((err) => console.warn("[PWA] Gagal mendaftarkan Service Worker:", err));
    });
}

// 2. Import Modular Services & Feature Modules
import { supabaseClient, SUPABASE_URL } from './config/supabase.js';
import { store } from './services/state.js';
import { panggilDatabaseAman } from './services/db.js';
import { periksaSesiAktif, loginUser, logoutUser, applyRolePermissions } from './services/auth.js';
import { showToast } from './services/notification.js';
import {
    initOfflineDb,
    initNetworkListeners,
    cacheLocalData,
    getCachedLocalData,
    syncOfflineTransactions,
    renderNetworkBadgeUI
} from './services/offlineQueue.js';

import {
    renderDaftarProdukPOS,
    filterProdukPOS,
    pilihProdukPOS,
    handleCustomerSearch,
    pilihMemberPOS,
    handleMetodeBayarChange,
    tambahItemKeranjang,
    hapusItemKeranjang,
    renderTabelKeranjangPOS,
    cetakStrukKePrinterFisik,
    prosesCheckoutPOS
} from './modules/pos.js';

import {
    renderTabelStok,
    bukaModalTambahProduk,
    tutupModalTambahProduk,
    simpanProdukBaruModal,
    eksekusiRestockBarang,
    ensureScannedSkuInSupabase,
    applyScannedSkuToPOS
} from './modules/inventory.js';

import {
    renderTabelMember,
    tambahMemberBaru
} from './modules/members.js';

import {
    renderTabelSupplier,
    renderMenusRestockDropdown
} from './modules/suppliers.js';

import {
    kalkulasiLaporanDashboard
} from './modules/reports.js';

import {
    switchTab,
    toggleSidebar,
    hideSidebar,
    initGlobalClickDismissers,
    initTheme,
    ubahTemaAplikasi
} from './modules/ui.js';

// ==============================================================================
// 3. EXPOSE GLOBAL WINDOW BINDINGS (Agar kompatibel dengan inline onclick di HTML)
// ==============================================================================
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.hideSidebar = hideSidebar;
window.logout = logoutUser;
window.filterProdukPOS = filterProdukPOS;
window.pilihProdukPOS = pilihProdukPOS;
window.pilihMemberPOS = pilihMemberPOS;
window.handleMetodeBayarChange = handleMetodeBayarChange;
window.tambahItemKeranjang = tambahItemKeranjang;
window.hapusItemKeranjang = hapusItemKeranjang;
window.prosesCheckoutPOS = prosesCheckoutPOS;
window.cetakStrukKePrinterFisik = cetakStrukKePrinterFisik;
window.tambahMemberBaru = tambahMemberBaru;
window.bukaModalTambahProduk = bukaModalTambahProduk;
window.tutupModalTambahProduk = tutupModalTambahProduk;
window.simpanProdukBaruModal = simpanProdukBaruModal;
window.eksekusiRestockBarang = eksekusiRestockBarang;
window.syncOfflineTransactions = syncOfflineTransactions;
window.ubahTemaAplikasi = ubahTemaAplikasi;

// ==============================================================================
// 4. DATA SYNCHRONIZATION INITIALIZER (CLOUD & OFFLINE-CACHE FALLBACK)
// ==============================================================================
export async function initAplikasi() {
    try {
        if (navigator.onLine) {
            // Ambil data dari 4 tabel Supabase secara paralel
            const [stokRes, memberRes, supplierRes, transaksiRes] = await Promise.all([
                panggilDatabaseAman({ tabel: 'produk', aksi: 'SELECT' }),
                panggilDatabaseAman({ tabel: 'member', aksi: 'SELECT' }),
                panggilDatabaseAman({ tabel: 'supplier', aksi: 'SELECT' }),
                panggilDatabaseAman({ tabel: 'riwayat_transaksi', aksi: 'SELECT', orderBy: 'created_at', ascending: false })
            ]);

            if (stokRes.data) {
                const sortedStok = stokRes.data.sort((a, b) => (a.id_produk || '').localeCompare(b.id_produk || ''));
                store.setMasterStok(sortedStok);
                await cacheLocalData('master_stok', sortedStok);
            }
            if (memberRes.data) {
                const sortedMember = memberRes.data.sort((a, b) => (a.id_member || '').localeCompare(b.id_member || ''));
                store.setMasterMember(sortedMember);
                await cacheLocalData('master_member', sortedMember);
            }
            if (supplierRes.data) {
                const sortedSupplier = supplierRes.data.sort((a, b) => (a.id_supplier || '').localeCompare(b.id_supplier || ''));
                store.setMasterSupplier(sortedSupplier);
                await cacheLocalData('master_supplier', sortedSupplier);
            }
            if (transaksiRes.data) {
                store.setRiwayatNotaTransaksi(transaksiRes.data);
                await cacheLocalData('riwayat_transaksi', transaksiRes.data);
            }
        } else {
            // Jika perangkat kasir sedang offline, pulihkan data dari Cache IndexedDB
            console.log("[Offline Mode] Mengambil master data dari cache lokal IndexedDB...");
            const [cachedStok, cachedMember, cachedSupplier, cachedTx] = await Promise.all([
                getCachedLocalData('master_stok'),
                getCachedLocalData('master_member'),
                getCachedLocalData('master_supplier'),
                getCachedLocalData('riwayat_transaksi')
            ]);

            if (cachedStok) store.setMasterStok(cachedStok);
            if (cachedMember) store.setMasterMember(cachedMember);
            if (cachedSupplier) store.setMasterSupplier(cachedSupplier);
            if (cachedTx) store.setRiwayatNotaTransaksi(cachedTx);

            showToast("Berjalan dalam Mode Offline: Menggunakan salinan data lokal kasir.", "warning");
        }

        // Tangani SKU barcode hasil scan jika ada
        await ensureScannedSkuInSupabase();
        applyScannedSkuToPOS();

        // Render data ke seluruh elemen antarmuka
        renderDaftarProdukPOS();
        renderTabelStok();
        renderTabelMember();
        renderTabelSupplier();
        renderMenusRestockDropdown();
        kalkulasiLaporanDashboard();
        renderNetworkBadgeUI();

    } catch (err) {
        console.error("Gagal sinkronisasi data cloud Supabase:", err);
        showToast("Terjadi kendala saat memuat data cloud. Menggunakan data cadangan lokal.", "warning");

        // Fallback coba ambil dari cache jika request gagal
        const cachedStok = await getCachedLocalData('master_stok');
        if (cachedStok) {
            store.setMasterStok(cachedStok);
            renderTabelStok();
            renderDaftarProdukPOS();
        }
    }
}

// ==============================================================================
// 5. EVENT LISTENERS INITIALIZATION
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Password Toggle di Halaman Login
    const togglePwdBtn = document.getElementById('toggle-pwd');
    const passwordInput = document.getElementById('password');
    if (togglePwdBtn && passwordInput) {
        togglePwdBtn.addEventListener('click', () => {
            const isPwd = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPwd ? 'text' : 'password');
            togglePwdBtn.innerHTML = isPwd ? `<i class="fa-solid fa-eye-slash text-sm"></i>` : `<i class="fa-solid fa-eye text-sm"></i>`;
        });
    }

    // 2. Setup Form Submit Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('username')?.value.trim();
            const password = passwordInput?.value;
            const jabatan = document.getElementById('jabatan')?.value;

            if (!email || !password) {
                showToast("Email dan password wajib diisi!", "warning");
                return;
            }

            loginUser(email, password, jabatan, initAplikasi);
        });
    }

    // 3. Setup Toggle Sidebar Responsive
    const menuToggleBtn = document.getElementById('menu-toggle');
    const menuOverlay = document.getElementById('menu-overlay');
    if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleSidebar);
    if (menuOverlay) menuOverlay.addEventListener('click', hideSidebar);

    // 4. Setup Input POS Search & Member Dropdown
    const posSearchInput = document.getElementById('pos-produk-search');
    if (posSearchInput) {
        posSearchInput.addEventListener('input', filterProdukPOS);
        posSearchInput.addEventListener('focus', filterProdukPOS);
    }

    const posCustomerInput = document.getElementById('pos-customer');
    if (posCustomerInput) {
        posCustomerInput.addEventListener('input', handleCustomerSearch);
        posCustomerInput.addEventListener('focus', handleCustomerSearch);
    }

    // 5. Setup Modal Tambah Produk Buttons
    const btnBukaModal = document.getElementById('btn-buka-modal-produk');
    if (btnBukaModal) {
        btnBukaModal.addEventListener('click', bukaModalTambahProduk);
    }

    const btnTutupModal = document.getElementById('btn-tutup-modal-produk');
    const btnBatalModal = document.getElementById('btn-batal-modal-produk');
    if (btnTutupModal) btnTutupModal.addEventListener('click', tutupModalTambahProduk);
    if (btnBatalModal) btnBatalModal.addEventListener('click', tutupModalTambahProduk);

    const btnSubmitModal = document.getElementById('btn-submit-modal-produk');
    if (btnSubmitModal) {
        btnSubmitModal.addEventListener('click', simpanProdukBaruModal);
    }

    // 6. Setup Global Click Dismissers (Dropdowns)
    initGlobalClickDismissers();

    // 7. Setup Network Listeners & Offline Queue Sync
    initNetworkListeners(initAplikasi);

    // 8. Inisialisasi Tema dari localStorage (sebelum login check)
    initTheme();

    // 9. Cek apakah ada sesi login aktif di Supabase
    periksaSesiAktif(initAplikasi);
});