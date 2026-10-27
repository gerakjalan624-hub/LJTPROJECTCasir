/**
 * SIM-Market Enterprise - UI Navigation & Layout Controller Module
 * Mengelola tab workspace, sidebar responsive, dan modal controller
 * + Theme Switcher & Setting Tab Support
 */

import { store } from '../services/state.js';

// ==============================================================================
// THEME MANAGEMENT
// ==============================================================================

const THEME_STORAGE_KEY = 'sim-market-theme';
const VALID_THEMES = ['light', 'green', 'dark'];

/**
 * Inisialisasi tema dari localStorage atau default ke 'light'
 */
export function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = VALID_THEMES.includes(saved) ? saved : 'light';
    applyTheme(theme);
}

/**
 * Ganti tema aplikasi secara menyeluruh
 * @param {string} tema - 'light' | 'green' | 'dark'
 */
export function ubahTemaAplikasi(tema) {
    if (!VALID_THEMES.includes(tema)) {
        console.warn(`[Theme] Tema "${tema}" tidak valid. Opsi: ${VALID_THEMES.join(', ')}`);
        return;
    }
    applyTheme(tema);
    localStorage.setItem(THEME_STORAGE_KEY, tema);
}

/**
 * Aplikasikan tema ke elemen HTML dan perbarui UI tombol theme picker
 */
function applyTheme(tema) {
    document.documentElement.setAttribute('data-theme', tema);

    const body = document.body;
    if (tema === 'light') {
        body.classList.remove('text-slate-100');
        body.classList.add('text-slate-900');
    } else {
        body.classList.remove('text-slate-900');
        body.classList.add('text-slate-100');
    }

    updateThemePickerUI(tema);
}

/**
 * Update visual state on theme picker buttons
 */
function updateThemePickerUI(activeTema) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const btnTheme = btn.getAttribute('data-theme-value');
        if (btnTheme === activeTema) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// ==============================================================================
// SIDEBAR COMPACT / ICON MODE
// ==============================================================================

function wrapSidebarTextLabels() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav) return;

    sidebarNav.querySelectorAll('button').forEach((btn) => {
        if (btn.querySelector('.sidebar-btn-label')) return;

        const nodes = Array.from(btn.childNodes);
        nodes.forEach((node) => {
            if (node.nodeType === 3 && node.textContent.trim()) {
                const span = document.createElement('span');
                span.className = 'sidebar-btn-label';
                span.textContent = node.textContent.trim();
                btn.insertBefore(span, node);
                btn.removeChild(node);
            }
        });
    });
}

export function initSidebarCompactState() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    wrapSidebarTextLabels();

    const compact = localStorage.getItem('sim-market-sidebar-compact') === '1';
    sidebar.classList.toggle('sidebar-compact', compact);
}

export function compactSidebar(forceCompact = null) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (forceCompact === null) {
        const next = !sidebar.classList.contains('sidebar-compact');
        sidebar.classList.toggle('sidebar-compact', next);
        localStorage.setItem('sim-market-sidebar-compact', next ? '1' : '0');
    } else {
        sidebar.classList.toggle('sidebar-compact', forceCompact);
        localStorage.setItem('sim-market-sidebar-compact', forceCompact ? '1' : '0');
    }
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuOverlay = document.getElementById('menu-overlay');
    if (!sidebar) return;

    const isCompact = sidebar.classList.contains('sidebar-compact');
    sidebar.classList.toggle('sidebar-hidden');

    if (isCompact) {
        sidebar.classList.add('sidebar-compact');
    } else {
        sidebar.classList.remove('sidebar-compact');
    }

    const isHidden = sidebar.classList.contains('sidebar-hidden');
    if (menuOverlay) menuOverlay.classList.toggle('active', !isHidden);
}

export function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuOverlay = document.getElementById('menu-overlay');
    if (!sidebar) return;

    sidebar.classList.add('sidebar-hidden');
    sidebar.classList.remove('sidebar-compact');
    if (menuOverlay) menuOverlay.classList.remove('active');
}

// ==============================================================================
// TAB NAVIGATION
// ==============================================================================

export function switchTab(tabId) {
    if (!tabId) return;

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = "w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent smooth-transition";
    });

    const activeBtn = document.getElementById('btn-' + tabId);
    if (activeBtn) {
        let themeColor = "cyan";
        if (tabId === 'stok') themeColor = "cyan";
        if (tabId === 'pelanggan') themeColor = "emerald";
        if (tabId === 'supplier') themeColor = "amber";
        if (tabId === 'laporan') themeColor = "indigo";
        if (tabId === 'setting') themeColor = "violet";
        activeBtn.className = `w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium text-sm text-${themeColor}-400 bg-${themeColor}-500/10 border border-${themeColor}-500/20 smooth-transition`;
    }

    const titles = {
        'penjualan': '1.0 Penjualan & Transaksi Kasir',
        'pelanggan': '2.0 Pusat Pengelolaan Keanggotaan Member (Proses 2.0)',
        'stok': '3.0 Manajemen & Pengendalian Sediaan Stok',
        'supplier': '4.0 Logistik Sourcing & Pengadaan Restock',
        'laporan': '5.0 Dashboard Agregasi Laporan Manajer',
        'setting': '⚙️ Pengaturan Sistem & Kustomisasi'
    };
    const descs = {
        'penjualan': 'Kelola input belanja pembeli, kalkulasi nota atomic, dan cetak struk kasir.',
        'pelanggan': 'Kelola basis data keanggotaan pembeli loyal dan akumulasi poin reward terenkripsi.',
        'stok': 'Monitor status ketersediaan inventori gudang SKU produk minimarket.',
        'supplier': 'Terima restock inventori masuk dari supplier rekanan resmi terdaftar.',
        'laporan': 'Tinjauan omset grafik pendapatan harian dan riwayat log berkas nota.',
        'setting': 'Kelola akun profil, preferensi tampilan, dan informasi sistem aplikasi.'
    };

    const titleEl = document.getElementById('current-tab-title');
    const descEl = document.getElementById('current-tab-desc');

    if (titleEl) titleEl.innerText = titles[tabId] || "Dashboard";
    if (descEl) descEl.innerText = descs[tabId] || "";

    if (tabId === 'setting') {
        populateSettingPage();
    }

    if (window.innerWidth < 1024) {
        hideSidebar();
    }
}

/**
 * Populate setting page fields with current user data from store
 */
function populateSettingPage() {
    const user = store.activeUser;
    const role = store.activeRole;

    const nameEl = document.getElementById('setting-username');
    const emailEl = document.getElementById('setting-email');
    const roleEl = document.getElementById('setting-role');

    if (nameEl) nameEl.textContent = user?.username || 'Pengguna';
    if (emailEl) emailEl.textContent = user?.email || '-';
    if (roleEl) roleEl.textContent = (role || 'Tidak diketahui').toUpperCase();

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemePickerUI(currentTheme);
}

// ==============================================================================
// GLOBAL CLICK DISMISSERS
// ==============================================================================

export function initGlobalClickDismissers() {
    document.addEventListener('click', (e) => {
        const searchInput = document.getElementById('pos-produk-search');
        const searchDropdown = document.getElementById('pos-produk-dropdown');
        if (searchInput && searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }

        const customerInput = document.getElementById('pos-customer');
        const customerDropdown = document.getElementById('pos-customer-dropdown');
        if (customerInput && customerDropdown && !customerInput.contains(e.target) && !customerDropdown.contains(e.target)) {
            customerDropdown.classList.add('hidden');
        }
    });
}
