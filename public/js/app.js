// Riistore Public App Script
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const claimForm = document.getElementById('claim-form');
  const redeemInput = document.getElementById('redeem-code');
  const btnSubmit = document.getElementById('btn-submit-claim');
  const btnPaste = document.getElementById('btn-paste');
  const claimAlert = document.getElementById('claim-alert');
  const alertText = document.getElementById('alert-text');
  const alertIcon = document.getElementById('alert-icon');
  
  // Stats & Store info elements
  const statAvailable = document.getElementById('stat-available');
  const statClaimed = document.getElementById('stat-claimed');
  const navBrand = document.getElementById('nav-brand');
  const heroTagline = document.getElementById('hero-tagline');
  const announcementText = document.getElementById('announcement-text');
  
  // Social links
  const linkWa = document.getElementById('link-wa');
  const linkTiktok = document.getElementById('link-tiktok');
  const linkTelegram = document.getElementById('link-telegram');
  const linkDiscord = document.getElementById('link-discord');

  // Modal elements
  const successModal = document.getElementById('success-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalEmail = document.getElementById('modal-email');
  const modalPassword = document.getElementById('modal-password');
  const modalNotes = document.getElementById('modal-notes');
  const btnCopyEmail = document.getElementById('btn-copy-email');
  const btnCopyPassword = document.getElementById('btn-copy-password');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const eyeIcon = document.getElementById('eye-icon');
  const btnCopyAll = document.getElementById('btn-copy-all');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  let currentClaimedAccount = null;

  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Load public info & stats
  async function loadPublicData() {
    try {
      const res = await fetch('/api/public-info');
      const data = await res.json();
      if (data.success) {
        // Update stats
        statAvailable.textContent = data.stats.availableAccounts;
        statClaimed.textContent = data.stats.claimedAccounts;

        // Update brand
        if (data.storeName) {
          navBrand.textContent = data.storeName.toUpperCase();
          document.title = `${data.storeName} - Giveaway Akun CarX Street Gratis`;
        }
        if (data.tagline && heroTagline) {
          heroTagline.textContent = data.tagline;
        }
        if (data.announcement && announcementText) {
          announcementText.textContent = data.announcement;
        }

        // Update socials
        if (data.socials) {
          if (data.socials.whatsapp) linkWa.href = data.socials.whatsapp;
          if (data.socials.tiktok) linkTiktok.href = data.socials.tiktok;
          if (data.socials.telegram) linkTelegram.href = data.socials.telegram;
          if (data.socials.discord) linkDiscord.href = data.socials.discord;
        }
      }
    } catch (err) {
      console.error('Failed to load public info:', err);
    }
  }

  // Initial load
  loadPublicData();
  // Poll stats every 20 seconds
  setInterval(loadPublicData, 20000);

  // Paste button
  if (btnPaste) {
    btnPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          redeemInput.value = text.trim().toUpperCase();
          showToast('Kode berhasil ditempel!');
          redeemInput.focus();
        }
      } catch (err) {
        showToast('Izinkan akses clipboard di browser Anda');
      }
    });
  }

  // Auto uppercase on type
  redeemInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    hideAlert();
  });

  // Get or initialize persistent Device ID for Anti-Tuyul / 1 person 1 claim
  let userDeviceId = localStorage.getItem('riistore_user_did');
  if (!userDeviceId) {
    userDeviceId = 'did_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('riistore_user_did', userDeviceId);
  }

  // Handle Redeem Form Submit
  claimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = redeemInput.value.trim().toUpperCase();
    if (!code) {
      showAlert('Silakan masukkan kode giveaway terlebih dahulu.', 'warning');
      return;
    }

    // Set loading state
    btnSubmit.disabled = true;
    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>MEMERIKSA KODE...</span>
    `;
    hideAlert();

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceId: userDeviceId })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        // Success claim!
        currentClaimedAccount = result.account;
        showSuccessModal(result.account);
        redeemInput.value = '';
        loadPublicData(); // Refresh stats
      } else {
        // Error from server
        showAlert(result.message || 'Kode giveaway tidak valid atau gagal diklaim.', 'error');
      }
    } catch (err) {
      console.error('Claim error:', err);
      showAlert('Gagal terhubung ke server. Periksa koneksi internet Anda.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Alert handler
  function showAlert(msg, type = 'error') {
    claimAlert.classList.remove('hidden', 'bg-red-500/15', 'border-red-500/40', 'text-red-400', 'bg-amber-500/15', 'border-amber-500/40', 'text-amber-400');
    if (type === 'error') {
      claimAlert.classList.add('bg-red-500/15', 'border', 'border-red-500/40', 'text-red-400');
    } else {
      claimAlert.classList.add('bg-amber-500/15', 'border', 'border-amber-500/40', 'text-amber-400');
    }
    alertText.textContent = msg;
    claimAlert.classList.remove('hidden');
  }

  function hideAlert() {
    claimAlert.classList.add('hidden');
  }

  // Success Modal
  function showSuccessModal(account) {
    modalEmail.textContent = account.email;
    modalPassword.value = account.password;
    modalPassword.type = 'password';
    modalNotes.textContent = account.notes || 'Akun Game CarX Street riistore';

    successModal.classList.remove('hidden');

    // Confetti celebration
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#06b6d4', '#10b981', '#ffffff']
      });

      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f59e0b', '#ec4899', '#3b82f6']
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f59e0b', '#10b981', '#06b6d4']
        });
      }, 250);
    }
  }

  function hideSuccessModal() {
    successModal.classList.add('hidden');
  }

  btnCloseModal.addEventListener('click', hideSuccessModal);
  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) hideSuccessModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !successModal.classList.contains('hidden')) {
      hideSuccessModal();
    }
  });

  // Toggle Password Visibility
  btnTogglePassword.addEventListener('click', () => {
    if (modalPassword.type === 'password') {
      modalPassword.type = 'text';
      btnTogglePassword.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
      modalPassword.type = 'password';
      btnTogglePassword.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // Copy Handlers
  btnCopyEmail.addEventListener('click', () => {
    if (currentClaimedAccount) {
      navigator.clipboard.writeText(currentClaimedAccount.email);
      showToast('Email akun berhasil disalin!');
    }
  });

  btnCopyPassword.addEventListener('click', () => {
    if (currentClaimedAccount) {
      navigator.clipboard.writeText(currentClaimedAccount.password);
      showToast('Password akun berhasil disalin!');
    }
  });

  btnCopyAll.addEventListener('click', () => {
    if (currentClaimedAccount) {
      const fullText = `=== AKUN CARX STREET (${document.getElementById('nav-brand').textContent}) ===\nEmail: ${currentClaimedAccount.email}\nPassword: ${currentClaimedAccount.password}\nSpek/Catatan: ${currentClaimedAccount.notes || '-'}\nTanggal Klaim: ${new Date().toLocaleString('id-ID')}\n==============================`;
      navigator.clipboard.writeText(fullText);
      showToast('Seluruh info akun berhasil disalin ke clipboard!');
    }
  });

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
});
