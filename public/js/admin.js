// Riistore Admin Script
document.addEventListener('DOMContentLoaded', () => {
  // Auth state
  let adminPin = localStorage.getItem('riistore_admin_pin') || '';

  // DOM Elements - Login
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminPinInput = document.getElementById('admin-pin-input');
  const togglePinBtn = document.getElementById('toggle-pin-visibility');
  const loginError = document.getElementById('login-error');
  const btnLogout = document.getElementById('btn-logout');
  const adminStoreBrand = document.getElementById('admin-store-brand');

  // DOM Elements - Stat counters
  const statTotalAccounts = document.getElementById('stat-total-accounts');
  const statReadyAccounts = document.getElementById('stat-ready-accounts');
  const statClaimedAccounts = document.getElementById('stat-claimed-accounts');
  const statActiveCodes = document.getElementById('stat-active-codes');
  const statTotalCodes = document.getElementById('stat-total-codes');

  // DOM Elements - Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // DOM Elements - Accounts Tab
  const btnModeSingle = document.getElementById('btn-mode-single');
  const btnModeBulk = document.getElementById('btn-mode-bulk');
  const formSingleAccount = document.getElementById('form-single-account');
  const formBulkAccount = document.getElementById('form-bulk-account');
  const inputAccEmail = document.getElementById('input-acc-email');
  const inputAccPassword = document.getElementById('input-acc-password');
  const inputAccCode = document.getElementById('input-acc-code');
  const btnRerollCode = document.getElementById('btn-reroll-code');
  const btnResetDefaultPwd = document.getElementById('btn-reset-default-pwd');
  const inputAccNotes = document.getElementById('input-acc-notes');
  const inputBulkText = document.getElementById('input-bulk-text');
  const inputBulkDefaultPwd = document.getElementById('input-bulk-default-pwd');
  const inputBulkAutoCodes = document.getElementById('input-bulk-auto-codes');
  const filterAccountStatus = document.getElementById('filter-account-status');
  const searchAccount = document.getElementById('search-account');
  const btnClearClaimed = document.getElementById('btn-clear-claimed');
  const tbodyAccounts = document.getElementById('tbody-accounts');
  const accountsEmpty = document.getElementById('accounts-empty');

  // DOM Elements - Codes Tab
  const formGenerateCodes = document.getElementById('form-generate-codes');
  const formCustomCode = document.getElementById('form-custom-code');
  const btnCopyAllCodes = document.getElementById('btn-copy-all-codes');
  const tbodyCodes = document.getElementById('tbody-codes');
  const codesEmpty = document.getElementById('codes-empty');

  // DOM Elements - History Tab
  const tbodyHistory = document.getElementById('tbody-history');
  const historyEmpty = document.getElementById('history-empty');
  const btnExportHistory = document.getElementById('btn-export-history');

  // DOM Elements - Settings Tab
  const formSettings = document.getElementById('form-settings');
  const settingStoreName = document.getElementById('setting-store-name');
  const settingTagline = document.getElementById('setting-tagline');
  const settingAnnouncement = document.getElementById('setting-announcement');
  const settingWhatsapp = document.getElementById('setting-whatsapp');
  const settingTiktok = document.getElementById('setting-tiktok');
  const settingTelegram = document.getElementById('setting-telegram');
  const settingDiscord = document.getElementById('setting-discord');
  const settingAdminPin = document.getElementById('setting-admin-pin');
  const settingLimitClaim = document.getElementById('setting-limit-claim');
  const btnResetLimits = document.getElementById('btn-reset-limits');

  // DOM Elements - Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // State cache
  let dashboardData = {
    accounts: [],
    codes: [],
    claimHistory: [],
    settings: {},
    stats: {}
  };

  // Initialize Lucide icons
  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Toast notification
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    toastTimer = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 2800);
  }

  // Toggle PIN input visibility
  if (togglePinBtn) {
    togglePinBtn.addEventListener('click', () => {
      if (adminPinInput.type === 'password') {
        adminPinInput.type = 'text';
      } else {
        adminPinInput.type = 'password';
      }
    });
  }

  // Check initial login state
  if (adminPin) {
    verifySession();
  } else {
    showLoginView();
  }

  function showLoginView() {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    refreshIcons();
  }

  function showDashboardView() {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    refreshIcons();
  }

  // Admin Login
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = adminPinInput.value.trim();
    if (!pin) return;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        adminPin = pin;
        localStorage.setItem('riistore_admin_pin', pin);
        loginError.classList.add('hidden');
        showDashboardView();
        loadDashboardData();
        showToast('Login Admin Berhasil!');
      } else {
        loginError.textContent = data.message || 'PIN Admin salah!';
        loginError.classList.remove('hidden');
      }
    } catch (err) {
      loginError.textContent = 'Gagal terhubung ke server.';
      loginError.classList.remove('hidden');
    }
  });

  // Verify stored session
  async function verifySession() {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin })
      });
      if (res.ok) {
        showDashboardView();
        loadDashboardData();
      } else {
        localStorage.removeItem('riistore_admin_pin');
        adminPin = '';
        showLoginView();
      }
    } catch (err) {
      showLoginView();
    }
  }

  // Logout
  btnLogout.addEventListener('click', () => {
    if (confirm('Yakin ingin keluar dari Admin Panel?')) {
      localStorage.removeItem('riistore_admin_pin');
      adminPin = '';
      showLoginView();
      showToast('Berhasil keluar dari admin.');
    }
  });

  // Helper for Authenticated Admin Requests
  async function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['x-admin-pin'] = adminPin;
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('riistore_admin_pin');
      adminPin = '';
      showLoginView();
      throw new Error('Sesi admin berakhir. Silakan login kembali.');
    }
    return res;
  }

  // Load Dashboard Data
  async function loadDashboardData() {
    try {
      const res = await adminFetch('/api/admin/dashboard');
      const data = await res.json();
      if (data.success) {
        dashboardData = data;
        updateUI();
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }

  // Update All UI Components
  function updateUI() {
    // 1. Stats
    statTotalAccounts.textContent = dashboardData.stats.totalAccounts || 0;
    statReadyAccounts.textContent = dashboardData.stats.availableAccounts || 0;
    statClaimedAccounts.textContent = dashboardData.stats.claimedAccounts || 0;
    statActiveCodes.textContent = dashboardData.stats.activeCodes || 0;
    statTotalCodes.textContent = dashboardData.stats.totalCodes || 0;

    // 2. Brand
    if (dashboardData.settings.storeName) {
      adminStoreBrand.textContent = dashboardData.settings.storeName.toUpperCase();
    }

    // 3. Render Views
    renderAccountsTable();
    renderCodesTable();
    renderHistoryTable();
    populateSettingsForm();

    refreshIcons();
  }

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabBtns.forEach(b => {
        b.classList.remove('active', 'bg-amber-500', 'text-black', 'shadow-md', 'shadow-amber-500/20');
        b.classList.add('bg-gray-900', 'text-gray-400');
      });
      btn.classList.add('active', 'bg-amber-500', 'text-black', 'shadow-md', 'shadow-amber-500/20');
      btn.classList.remove('bg-gray-900', 'text-gray-400');

      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      document.getElementById(targetId).classList.remove('hidden');
      refreshIcons();
    });
  });

  // Switch between Single & Bulk account input
  btnModeSingle.addEventListener('click', () => {
    btnModeSingle.classList.add('bg-amber-500', 'text-black');
    btnModeSingle.classList.remove('text-gray-400');
    btnModeBulk.classList.remove('bg-cyan-500', 'text-black');
    btnModeBulk.classList.add('text-gray-400');
    formSingleAccount.classList.remove('hidden');
    formBulkAccount.classList.add('hidden');
  });

  btnModeBulk.addEventListener('click', () => {
    btnModeBulk.classList.add('bg-cyan-500', 'text-black');
    btnModeBulk.classList.remove('text-gray-400');
    btnModeSingle.classList.remove('bg-amber-500', 'text-black');
    btnModeSingle.classList.add('text-gray-400');
    formBulkAccount.classList.remove('hidden');
    formSingleAccount.classList.add('hidden');
  });

  // Generate random giveaway code helper
  function generateRandomCodeStr(prefix = 'RII-') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '', p2 = '';
    for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    return `${prefix}${p1}-${p2}`;
  }

  function resetSingleAccountForm() {
    inputAccEmail.value = '';
    inputAccPassword.value = '11223344';
    inputAccNotes.value = '';
    if (inputAccCode) inputAccCode.value = generateRandomCodeStr();
  }

  // Initial code generation on form load
  if (inputAccCode && !inputAccCode.value) {
    inputAccCode.value = generateRandomCodeStr();
  }

  // Reroll random code button
  if (btnRerollCode) {
    btnRerollCode.addEventListener('click', () => {
      inputAccCode.value = generateRandomCodeStr();
      showToast('Kode giveaway baru diacak!');
    });
  }

  // Reset default password button
  if (btnResetDefaultPwd) {
    btnResetDefaultPwd.addEventListener('click', () => {
      inputAccPassword.value = '11223344';
      showToast('Password direset ke 11223344');
    });
  }

  // -------------------------------------------------------------
  // ACCOUNTS MANAGEMENT
  // -------------------------------------------------------------

  // Add Single Account
  formSingleAccount.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = inputAccEmail.value.trim();
    const password = inputAccPassword.value.trim() || '11223344';
    const notes = inputAccNotes.value.trim();
    const giveawayCode = inputAccCode ? inputAccCode.value.trim().toUpperCase() : '';

    try {
      const res = await adminFetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, notes, giveawayCode })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        resetSingleAccountForm();
        loadDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Gagal menambahkan akun: ' + err.message);
    }
  });

  // Bulk Import Accounts
  formBulkAccount.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bulkText = inputBulkText.value.trim();
    if (!bulkText) {
      alert('Silakan masukkan daftar email pada form!');
      return;
    }

    const defaultPassword = inputBulkDefaultPwd ? inputBulkDefaultPwd.value.trim() || '11223344' : '11223344';
    const autoGenerateCodes = inputBulkAutoCodes ? inputBulkAutoCodes.checked : true;

    try {
      const res = await adminFetch('/api/admin/accounts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkText, defaultPassword, autoGenerateCodes })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        inputBulkText.value = '';
        loadDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Gagal import akun: ' + err.message);
    }
  });

  // Clear Claimed Accounts
  btnClearClaimed.addEventListener('click', async () => {
    const claimedCount = dashboardData.accounts.filter(a => a.status === 'claimed').length;
    if (claimedCount === 0) {
      showToast('Tidak ada akun terklaim yang perlu dibersihkan.');
      return;
    }

    if (confirm(`Yakin ingin menghapus ${claimedCount} akun yang sudah terklaim? Akun yang belum terklaim akan tetap aman.`)) {
      try {
        const res = await adminFetch('/api/admin/accounts/clear-claimed', {
          method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          loadDashboardData();
        }
      } catch (err) {
        alert('Gagal membersihkan akun: ' + err.message);
      }
    }
  });

  // Filter & Search listeners
  filterAccountStatus.addEventListener('change', renderAccountsTable);
  searchAccount.addEventListener('input', renderAccountsTable);

  function renderAccountsTable() {
    const statusFilter = filterAccountStatus.value;
    const query = searchAccount.value.toLowerCase().trim();

    let filtered = dashboardData.accounts.filter(acc => {
      // Status filter
      if (statusFilter !== 'all' && acc.status !== statusFilter) return false;
      // Search query
      if (query) {
        const matchEmail = acc.email.toLowerCase().includes(query);
        const matchNotes = (acc.notes || '').toLowerCase().includes(query);
        const matchCode = (acc.claimedByCode || '').toLowerCase().includes(query);
        if (!matchEmail && !matchNotes && !matchCode) return false;
      }
      return true;
    });

    tbodyAccounts.innerHTML = '';

    if (filtered.length === 0) {
      accountsEmpty.classList.remove('hidden');
      return;
    }
    accountsEmpty.classList.add('hidden');

    filtered.forEach((acc, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-800/40 transition-colors border-b border-gray-800/40';

      const isClaimed = acc.status === 'claimed';
      const statusBadge = isClaimed
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">Terklaim</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Ready</span>';

      const claimInfo = isClaimed
        ? `<div class="text-[11px] text-gray-300 font-sans leading-tight">
            Kode: <b class="text-amber-400">${acc.claimedByCode || '-'}</b><br>
            <span class="text-gray-500 text-[10px]">${new Date(acc.claimedAt).toLocaleString('id-ID')}</span>
          </div>`
        : '<span class="text-gray-500 text-xs">-</span>';

      const giveawayCode = acc.giveawayCode || acc.claimedByCode || null;
      let codeHtml = '<span class="text-gray-500 font-mono text-xs">-</span>';

      if (giveawayCode) {
        if (isClaimed) {
          codeHtml = `<div class="flex items-center gap-1.5 opacity-60">
            <span class="line-through text-gray-500 font-mono text-xs">${escapeHtml(giveawayCode)}</span>
            <span class="text-[10px] text-red-400 font-bold font-sans bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Hangus</span>
          </div>`;
        } else {
          codeHtml = `<div class="flex items-center gap-1.5">
            <span class="font-bold text-amber-400 font-mono text-xs">${escapeHtml(giveawayCode)}</span>
            <button type="button" class="btn-copy-acc-code text-gray-400 hover:text-white p-1" data-code="${escapeHtml(giveawayCode)}" title="Salin Kode Giveaway">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
           </div>`;
        }
      }

      tr.innerHTML = `
        <td class="py-3 px-4 text-gray-500 font-sans">${idx + 1}</td>
        <td class="py-3 px-4 font-bold text-white">${escapeHtml(acc.email)}</td>
        <td class="py-3 px-4 text-gray-300">
          <div class="flex items-center gap-1.5">
            <span id="pwd-text-${acc.id}">••••••••</span>
            <button type="button" class="btn-peek-pwd text-gray-500 hover:text-amber-400 p-1" data-id="${acc.id}" data-pwd="${escapeHtml(acc.password)}" title="Intip Password">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
        <td class="py-3 px-4 font-mono">${codeHtml}</td>
        <td class="py-3 px-4 text-gray-400 text-xs font-sans">${escapeHtml(acc.notes || '-')}</td>
        <td class="py-3 px-4 font-sans">${statusBadge}</td>
        <td class="py-3 px-4 font-sans">${claimInfo}</td>
        <td class="py-3 px-4 text-center font-sans">
          <button type="button" class="btn-del-account p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-all" data-id="${acc.id}" title="Hapus Akun">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      `;

      tbodyAccounts.appendChild(tr);
    });

    // Attach copy code listeners from account table
    document.querySelectorAll('.btn-copy-acc-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        showToast(`Kode ${code} disalin ke clipboard!`);
      });
    });

    // Attach peek password listeners
    document.querySelectorAll('.btn-peek-pwd').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const pwd = btn.getAttribute('data-pwd');
        const span = document.getElementById(`pwd-text-${id}`);
        if (span.textContent === '••••••••') {
          span.textContent = pwd;
          btn.innerHTML = '<i data-lucide="eye-off" class="w-3.5 h-3.5"></i>';
        } else {
          span.textContent = '••••••••';
          btn.innerHTML = '<i data-lucide="eye" class="w-3.5 h-3.5"></i>';
        }
        refreshIcons();
      });
    });

    // Attach delete account listeners
    document.querySelectorAll('.btn-del-account').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Yakin ingin menghapus akun ini dari database?')) {
          try {
            const res = await adminFetch(`/api/admin/accounts/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              showToast(data.message);
              loadDashboardData();
            }
          } catch (err) {
            alert('Gagal menghapus: ' + err.message);
          }
        }
      });
    });

    refreshIcons();
  }

  // -------------------------------------------------------------
  // CODES MANAGEMENT (Helper & Copy Actions)
  // -------------------------------------------------------------

  // Auto Generate Codes (if form exists)
  if (formGenerateCodes) {
    formGenerateCodes.addEventListener('submit', async (e) => {
      e.preventDefault();
      const count = document.getElementById('gen-count').value;
      const prefix = document.getElementById('gen-prefix').value;
      const maxUses = document.getElementById('gen-max-uses').value;
      const description = document.getElementById('gen-description').value;

      try {
        const res = await adminFetch('/api/admin/codes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count, prefix, maxUses, description })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          loadDashboardData();
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('Gagal membuat kode: ' + err.message);
      }
    });
  }

  // Custom Code (if form exists)
  if (formCustomCode) {
    formCustomCode.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('custom-code-input').value.trim();
      const maxUses = document.getElementById('custom-max-uses').value;
      const description = document.getElementById('custom-desc').value.trim();

      try {
        const res = await adminFetch('/api/admin/codes/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, maxUses, description })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          document.getElementById('custom-code-input').value = '';
          document.getElementById('custom-desc').value = '';
          loadDashboardData();
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert('Gagal membuat kode: ' + err.message);
      }
    });
  }

  // Copy All Active Codes (HANYA KODE DARI AKUN YANG MASIH READY / BELUM HANGUS)
  if (btnCopyAllCodes) {
    btnCopyAllCodes.addEventListener('click', () => {
      // 1. Ambil semua akun yang statusnya masih 'available' dan memiliki giveawayCode
      const availableAccounts = (dashboardData.accounts || []).filter(acc => 
        acc.status === 'available' && acc.giveawayCode && acc.giveawayCode.trim().length > 0
      );

      // 2. Filter hanya kode yang di database codes masih active & belum depleted
      const activeCodes = [];
      const seen = new Set();

      for (const acc of availableAccounts) {
        const code = acc.giveawayCode.trim().toUpperCase();
        if (!seen.has(code)) {
          seen.add(code);
          const codeRec = (dashboardData.codes || []).find(c => c.code.toUpperCase() === code);
          // Jika ada record kode, pastikan belum habis
          if (!codeRec || (codeRec.status === 'active' && codeRec.usedCount < codeRec.maxUses)) {
            activeCodes.push(code);
          }
        }
      }

      if (activeCodes.length === 0) {
        showToast('Tidak ada kode aktif yang siap disalin (semua akun sudah terklaim / habis).');
        return;
      }

      const codeList = activeCodes.join('\n');
      navigator.clipboard.writeText(codeList);
      showToast(`${activeCodes.length} kode aktif (Hanya akun Ready) berhasil disalin!`);
    });
  }

  function renderCodesTable() {
    if (!tbodyCodes) return;
    tbodyCodes.innerHTML = '';
    const codes = dashboardData.codes;

    if (codes.length === 0) {
      if (codesEmpty) codesEmpty.classList.remove('hidden');
      return;
    }
    if (codesEmpty) codesEmpty.classList.add('hidden');

    codes.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-800/40 transition-colors border-b border-gray-800/40';

      const isDepleted = c.status === 'depleted' || c.usedCount >= c.maxUses;
      const statusBadge = isDepleted
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-500 border border-gray-700">Habis</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Aktif</span>';

      const createdDate = new Date(c.createdAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      tr.innerHTML = `
        <td class="py-3 px-4 text-gray-500 font-sans">${idx + 1}</td>
        <td class="py-3 px-4 font-bold text-amber-400 text-sm tracking-wide">
          <div class="flex items-center gap-2">
            <span>${escapeHtml(c.code)}</span>
            <button type="button" class="btn-copy-code text-gray-400 hover:text-white p-1" data-code="${escapeHtml(c.code)}" title="Salin Kode">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
        <td class="py-3 px-4 text-gray-300 font-mono text-xs">
          ${c.usedCount} / ${c.maxUses} klaim
        </td>
        <td class="py-3 px-4 font-sans">${statusBadge}</td>
        <td class="py-3 px-4 text-gray-400 text-xs font-sans">${escapeHtml(c.description || '-')}</td>
        <td class="py-3 px-4 text-gray-500 text-xs font-sans">${createdDate}</td>
        <td class="py-3 px-4 text-center font-sans">
          <button type="button" class="btn-del-code p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-all" data-id="${c.id}" title="Hapus Kode">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      `;

      tbodyCodes.appendChild(tr);
    });

    // Copy single code
    document.querySelectorAll('.btn-copy-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        showToast(`Kode ${code} disalin!`);
      });
    });

    // Delete single code
    document.querySelectorAll('.btn-del-code').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Yakin ingin menghapus kode giveaway ini?')) {
          try {
            const res = await adminFetch(`/api/admin/codes/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              showToast(data.message);
              loadDashboardData();
            }
          } catch (err) {
            alert('Gagal menghapus kode: ' + err.message);
          }
        }
      });
    });

    refreshIcons();
  }

  // -------------------------------------------------------------
  // HISTORY MANAGEMENT
  // -------------------------------------------------------------

  function renderHistoryTable() {
    tbodyHistory.innerHTML = '';
    const history = dashboardData.claimHistory || [];

    if (history.length === 0) {
      historyEmpty.classList.remove('hidden');
      return;
    }
    historyEmpty.classList.add('hidden');

    history.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-800/40 transition-colors border-b border-gray-800/40 text-xs';

      const dateStr = new Date(item.claimedAt).toLocaleString('id-ID');

      tr.innerHTML = `
        <td class="py-3 px-4 text-gray-400 font-sans">${dateStr}</td>
        <td class="py-3 px-4 font-bold text-amber-400">${escapeHtml(item.code)}</td>
        <td class="py-3 px-4 text-white font-mono">${escapeHtml(item.email)}</td>
        <td class="py-3 px-4 text-gray-400 font-sans">${escapeHtml(item.accountNotes || '-')}</td>
        <td class="py-3 px-4 text-gray-500 font-mono">${escapeHtml(item.ip || '-')}</td>
      `;

      tbodyHistory.appendChild(tr);
    });

    refreshIcons();
  }

  // Export History to CSV
  btnExportHistory.addEventListener('click', () => {
    const history = dashboardData.claimHistory || [];
    if (history.length === 0) {
      showToast('Tidak ada data riwayat untuk diekspor.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Waktu Klaim,Kode,Email Akun,Spek Akun,IP\n';
    history.forEach(h => {
      const row = [
        `"${new Date(h.claimedAt).toLocaleString('id-ID')}"`,
        `"${h.code}"`,
        `"${h.email}"`,
        `"${(h.accountNotes || '').replace(/"/g, '""')}"`,
        `"${h.ip}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `riistore_claim_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV riwayat klaim berhasil diunduh!');
  });

  // -------------------------------------------------------------
  // SETTINGS MANAGEMENT
  // -------------------------------------------------------------

  function populateSettingsForm() {
    const s = dashboardData.settings || {};
    if (s.storeName) settingStoreName.value = s.storeName;
    if (s.tagline) settingTagline.value = s.tagline;
    if (s.announcement !== undefined) settingAnnouncement.value = s.announcement;
    if (s.whatsapp !== undefined) settingWhatsapp.value = s.whatsapp;
    if (s.tiktok !== undefined) settingTiktok.value = s.tiktok;
    if (s.telegram !== undefined) settingTelegram.value = s.telegram;
    if (s.discord !== undefined) settingDiscord.value = s.discord;
    if (s.adminPin) settingAdminPin.value = s.adminPin;
    if (settingLimitClaim) {
      settingLimitClaim.checked = s.limitOnePerPerson !== false;
    }
  }

  // Reset IP / Device claim limits
  if (btnResetLimits) {
    btnResetLimits.addEventListener('click', async () => {
      if (confirm('Yakin ingin mereset batasan klaim? Semua orang/IP yang sebelumnya sudah klaim akan bisa mengklaim kode lagi.')) {
        try {
          const res = await adminFetch('/api/admin/limits/reset', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message);
            loadDashboardData();
          } else {
            alert(data.message);
          }
        } catch (err) {
          alert('Gagal mereset: ' + err.message);
        }
      }
    });
  }

  formSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newSettings = {
      storeName: settingStoreName.value.trim(),
      tagline: settingTagline.value.trim(),
      announcement: settingAnnouncement.value.trim(),
      whatsapp: settingWhatsapp.value.trim(),
      tiktok: settingTiktok.value.trim(),
      telegram: settingTelegram.value.trim(),
      discord: settingDiscord.value.trim(),
      adminPin: settingAdminPin.value.trim(),
      limitOnePerPerson: settingLimitClaim ? settingLimitClaim.checked : true
    };

    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        // Update stored pin if changed
        if (newSettings.adminPin !== adminPin) {
          adminPin = newSettings.adminPin;
          localStorage.setItem('riistore_admin_pin', adminPin);
        }
        showToast(data.message);
        loadDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    }
  });

  // Utility to prevent HTML injection in rendered tables
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
