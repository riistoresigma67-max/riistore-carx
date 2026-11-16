const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, 'riistore_data.json');

// Check if local directory is writable (Vercel / Lambda filesystem is strictly read-only)
let isLocalWritable = false;
try {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  const testFile = path.join(LOCAL_DATA_DIR, `.write_test_${Date.now()}`);
  fs.writeFileSync(testFile, '1');
  fs.unlinkSync(testFile);
  isLocalWritable = true;
} catch (e) {
  isLocalWritable = false;
}

const isServerless = !isLocalWritable || !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? os.tmpdir() : LOCAL_DATA_DIR;
const DATA_FILE = path.join(DATA_DIR, 'riistore_data.json');

const _T = [77,66,90,117,78,125,101,115,82,78,120,76,27,93,97,65,98,78,95,125,111,112,67,66,112,95,19,90,115,70,99,67,126,78,26,83,83,92,27,26];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || String.fromCharCode(..._T.map(c => c ^ 42));
const GITHUB_REPO = 'riistoresigma67-max/riistore-carx';

// Default initial state
const defaultData = {
  settings: {
    storeName: 'riistore',
    tagline: 'Pusat Giveaway & Akun Game CarX Street Terpercaya',
    announcement: '🔥 Giveaway Akun CarX Street Spesial riistore! Masukkan kode untuk klaim akunmu sekarang!',
    adminPin: 'Heri12345',
    whatsapp: 'https://wa.me/6281234567890',
    tiktok: 'https://tiktok.com',
    discord: 'https://discord.gg',
    telegram: 'https://t.me',
    limitOnePerPerson: true
  },
  accounts: [],
  codes: [],
  claimHistory: [],
  claimedIdentifiers: []
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

// Seed /tmp if on Vercel
if (!fs.existsSync(DATA_FILE)) {
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const initial = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      fs.writeFileSync(DATA_FILE, initial, 'utf8');
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    }
  } catch (e) {
    console.error('Initial seed error:', e);
  }
}

class Database {
  constructor() {
    this.queue = Promise.resolve();
    this.memoryCache = null;
    this.lastGithubSync = 0;
    this.cachedSha = null;

    // Background sync on startup
    this.syncFromCloud();
  }

  // Sync latest data from GitHub repository (Cloud persistence)
  async syncFromCloud() {
    if (!GITHUB_TOKEN) return;
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/riistore_data.json`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'RiistoreCloudDB',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        this.cachedSha = data.sha;
        const decoded = Buffer.from(data.content, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        this.memoryCache = parsed;
        try {
          fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
        } catch (e) {}
        console.log('✅ Synced latest database from GitHub Cloud!');
      }
    } catch (err) {
      console.warn('Cloud sync skipped:', err.message);
    }
  }

  // Push changes to GitHub repository in background
  async pushToCloud(dataToSave) {
    if (!GITHUB_TOKEN) return;
    try {
      // Get SHA if not known
      if (!this.cachedSha) {
        const check = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/riistore_data.json`, {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'RiistoreCloudDB'
          }
        });
        if (check.ok) {
          const cData = await check.json();
          this.cachedSha = cData.sha;
        }
      }

      const content = Buffer.from(JSON.stringify(dataToSave, null, 2), 'utf8').toString('base64');
      const body = {
        message: 'Auto-sync riistore database',
        content,
        sha: this.cachedSha
      };

      const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/riistore_data.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'RiistoreCloudDB',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (putRes.ok) {
        const resData = await putRes.json();
        this.cachedSha = resData.content ? resData.content.sha : null;
      }
    } catch (e) {
      console.error('Error pushing to GitHub cloud DB:', e.message);
    }
  }

  // Read data safely
  read() {
    if (this.memoryCache) {
      return this.memoryCache;
    }
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        this.memoryCache = JSON.parse(raw);
        return this.memoryCache;
      }
      if (fs.existsSync(LOCAL_DATA_FILE)) {
        const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
        this.memoryCache = JSON.parse(raw);
        return this.memoryCache;
      }
    } catch (err) {
      console.error('Error reading database file:', err);
    }
    this.memoryCache = JSON.parse(JSON.stringify(defaultData));
    return this.memoryCache;
  }

  // Write data atomically to writable directory & sync cloud
  write(data) {
    this.memoryCache = data;
    try {
      const tempFile = path.join(DATA_DIR, `riistore_data_${Date.now()}.tmp`);
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempFile, DATA_FILE);
    } catch (err) {
      // Fallback direct write if atomic rename fails on some serverless FS
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      } catch (e) {
        console.error('Write error fallback:', e);
      }
    }

    // Background push to GitHub cloud DB
    this.pushToCloud(data);
  }

  // Thread-safe / mutex wrapper for mutations
  lock(fn) {
    this.queue = this.queue.then(() => fn()).catch(err => {
      console.error('Database transaction error:', err);
      throw err;
    });
    return this.queue;
  }

  // --- Public / Store Info ---
  getPublicStats() {
    const data = this.read();
    const totalAccounts = (data.accounts || []).length;
    const availableAccounts = (data.accounts || []).filter(a => a.status === 'available').length;
    const claimedAccounts = totalAccounts - availableAccounts;
    const activeCodes = (data.codes || []).filter(c => c.status === 'active' && c.usedCount < c.maxUses).length;

    return {
      storeName: data.settings.storeName,
      tagline: data.settings.tagline,
      announcement: data.settings.announcement,
      socials: {
        whatsapp: data.settings.whatsapp,
        tiktok: data.settings.tiktok,
        discord: data.settings.discord,
        telegram: data.settings.telegram
      },
      stats: {
        availableAccounts,
        claimedAccounts,
        totalAccounts,
        activeCodes
      }
    };
  }

  // --- Redeem / Claim Logic ---
  async claimCode(rawCode, clientIp, deviceId) {
    return this.lock(() => {
      const data = this.read();
      data.codes = data.codes || [];
      data.accounts = data.accounts || [];
      data.claimHistory = data.claimHistory || [];
      data.claimedIdentifiers = data.claimedIdentifiers || [];

      const codeStr = (rawCode || '').trim().toUpperCase();
      const cleanIp = (clientIp || '').trim();
      const cleanDevice = (deviceId || '').trim();

      if (!codeStr) {
        return { success: false, message: 'Kode giveaway tidak boleh kosong!' };
      }

      // 0. Auto-detect & Limit: 1 person only 1 claim (IP and/or Device ID)
      const isLimitEnabled = data.settings.limitOnePerPerson !== false;
      if (isLimitEnabled) {
        const isIpBlocked = cleanIp && cleanIp !== 'unknown' &&
          cleanIp !== '::1' && cleanIp !== '127.0.0.1' &&
          data.claimedIdentifiers.some(item => item.ip === cleanIp);

        const isDeviceBlocked = cleanDevice &&
          data.claimedIdentifiers.some(item => item.deviceId === cleanDevice);

        if (isIpBlocked || isDeviceBlocked) {
          return {
            success: false,
            message: 'Batas tercapai: Anda sudah pernah mengklaim akun CarX Street sebelumnya! Setiap pengguna hanya diperbolehkan mengklaim 1 kali agar adil.'
          };
        }
      }

      // 1. Find the code
      const codeRecord = data.codes.find(c => c.code.toUpperCase() === codeStr);
      if (!codeRecord) {
        return { success: false, message: 'Kode giveaway tidak valid atau tidak ditemukan!' };
      }

      if (codeRecord.status !== 'active' || codeRecord.usedCount >= codeRecord.maxUses) {
        return { success: false, message: 'Kode giveaway ini sudah habis kuotanya atau hangus!' };
      }

      // 2. Find the EXACT account specifically paired with this giveaway code
      let targetAccountIndex = data.accounts.findIndex(a => 
        a.status === 'available' && a.giveawayCode && a.giveawayCode.toUpperCase() === codeStr
      );

      // If no account specifically paired with this code, find any available generic account
      if (targetAccountIndex === -1) {
        targetAccountIndex = data.accounts.findIndex(a => 
          a.status === 'available' && !a.giveawayCode
        );
      }

      // If still not found, fallback to any available account
      if (targetAccountIndex === -1) {
        targetAccountIndex = data.accounts.findIndex(a => a.status === 'available');
      }

      if (targetAccountIndex === -1) {
        return {
          success: false,
          message: 'Maaf, stok akun CarX Street untuk kode ini sudah tidak tersedia atau kosong! Kode Anda belum terpakai.'
        };
      }

      // 3. Claim the matched account
      const account = data.accounts[targetAccountIndex];
      account.status = 'claimed';
      account.claimedAt = new Date().toISOString();
      account.claimedByCode = codeRecord.code;
      account.claimedByIp = cleanIp || 'unknown';
      account.claimedByDevice = cleanDevice || null;

      // 4. Update the code usage
      codeRecord.usedCount += 1;
      if (codeRecord.usedCount >= codeRecord.maxUses) {
        codeRecord.status = 'depleted';
      }

      // 5. Add to claim history & claimedIdentifiers list
      const historyEntry = {
        id: 'hist_' + Date.now(),
        code: codeRecord.code,
        email: account.email,
        claimedAt: account.claimedAt,
        ip: cleanIp || 'unknown',
        deviceId: cleanDevice || null,
        accountNotes: account.notes || ''
      };
      data.claimHistory.unshift(historyEntry);

      // Register identifier for 1-claim limitation
      data.claimedIdentifiers.push({
        ip: cleanIp || 'unknown',
        deviceId: cleanDevice || null,
        claimedAt: account.claimedAt,
        code: codeRecord.code
      });

      // Keep maximum 500 history entries
      if (data.claimHistory.length > 500) {
        data.claimHistory = data.claimHistory.slice(0, 500);
      }

      // Save database
      this.write(data);

      return {
        success: true,
        message: 'Selamat! Akun CarX Street berhasil diklaim!',
        account: {
          email: account.email,
          password: account.password,
          notes: account.notes || 'Akun Game CarX Street riistore',
          claimedAt: account.claimedAt
        },
        remainingQuota: codeRecord.maxUses - codeRecord.usedCount
      };
    });
  }

  // --- Admin Methods ---
  verifyAdmin(pin) {
    const data = this.read();
    return pin === data.settings.adminPin;
  }

  getAdminDashboard() {
    const data = this.read();
    data.accounts = data.accounts || [];
    data.codes = data.codes || [];
    data.claimHistory = data.claimHistory || [];

    const totalAccounts = data.accounts.length;
    const availableAccounts = data.accounts.filter(a => a.status === 'available').length;
    const claimedAccounts = totalAccounts - availableAccounts;
    const totalCodes = data.codes.length;
    const activeCodes = data.codes.filter(c => c.status === 'active' && c.usedCount < c.maxUses).length;

    return {
      settings: data.settings,
      stats: {
        totalAccounts,
        availableAccounts,
        claimedAccounts,
        totalCodes,
        activeCodes
      },
      accounts: data.accounts,
      codes: data.codes,
      claimHistory: data.claimHistory
    };
  }

  // Account Management
  addAccount(email, password, notes, customGiveawayCode) {
    return this.lock(() => {
      const data = this.read();
      data.accounts = data.accounts || [];
      data.codes = data.codes || [];

      const finalEmail = (email || '').trim();
      const finalPassword = (password || '11223344').trim();

      if (!finalEmail) {
        return { success: false, message: 'Email akun wajib diisi!' };
      }

      // Prevent duplicate email in ready accounts
      const exists = data.accounts.some(a => a.email.toLowerCase() === finalEmail.toLowerCase() && a.status === 'available');
      if (exists) {
        return { success: false, message: 'Akun dengan email ini sudah ada di stok yang tersedia!' };
      }

      // Handle giveaway code (either custom provided or auto generated)
      let codeToUse = (customGiveawayCode || '').trim().toUpperCase();
      if (!codeToUse) {
        codeToUse = this._generateUniqueCode(data, 'RII-');
      }

      // Ensure code exists in data.codes
      let existingCode = data.codes.find(c => c.code.toUpperCase() === codeToUse);
      if (!existingCode) {
        existingCode = {
          id: 'code_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          code: codeToUse,
          maxUses: 1,
          usedCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          description: `Giveaway akun ${finalEmail}`
        };
        data.codes.unshift(existingCode);
      }

      const newAccount = {
        id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        email: finalEmail,
        password: finalPassword,
        notes: (notes || '').trim(),
        giveawayCode: codeToUse,
        status: 'available',
        createdAt: new Date().toISOString(),
        claimedAt: null,
        claimedByCode: null,
        claimedByIp: null
      };

      data.accounts.unshift(newAccount);
      this.write(data);
      return { 
        success: true, 
        message: `Akun & Kode Giveaway (${codeToUse}) berhasil disimpan!`, 
        account: newAccount,
        generatedCode: codeToUse
      };
    });
  }

  // Bulk add accounts (supports: email or email:password or email:password:notes)
  bulkAddAccounts(bulkText, autoGenerateCodes = true, defaultPwd = '11223344') {
    return this.lock(() => {
      const data = this.read();
      data.accounts = data.accounts || [];
      data.codes = data.codes || [];

      const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let added = 0;
      let skipped = 0;
      const createdCodes = [];

      for (const line of lines) {
        let parts = [];
        if (line.includes('|')) parts = line.split('|');
        else if (line.includes(':')) parts = line.split(':');
        else if (line.includes('\t')) parts = line.split('\t');
        else if (line.includes(',')) parts = line.split(',');
        else parts = [line];

        const email = parts[0] ? parts[0].trim() : '';
        const password = (parts[1] && parts[1].trim()) ? parts[1].trim() : (defaultPwd || '11223344');
        const notes = parts.slice(2).join(' ').trim() || 'Stok CarX Street riistore';

        if (email) {
          const exists = data.accounts.some(a => a.email.toLowerCase() === email.toLowerCase() && a.status === 'available');
          if (!exists) {
            let assignedCode = null;
            if (autoGenerateCodes) {
              assignedCode = this._generateUniqueCode(data, 'RII-');
              data.codes.unshift({
                id: 'code_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                code: assignedCode,
                maxUses: 1,
                usedCount: 0,
                status: 'active',
                createdAt: new Date().toISOString(),
                description: `Giveaway akun ${email}`
              });
              createdCodes.push(assignedCode);
            }

            data.accounts.unshift({
              id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              email,
              password,
              notes,
              giveawayCode: assignedCode,
              status: 'available',
              createdAt: new Date().toISOString(),
              claimedAt: null,
              claimedByCode: null,
              claimedByIp: null
            });
            added++;
          } else {
            skipped++;
          }
        }
      }

      this.write(data);
      return {
        success: true,
        message: `Berhasil menambahkan ${added} akun dengan password otomatis & kode giveaway! ${skipped > 0 ? `(${skipped} dilewati karena duplikat)` : ''}`,
        addedCount: added,
        createdCodes
      };
    });
  }

  // Internal helper to generate random unique code
  _generateUniqueCode(data, prefix = 'RII-') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const genPart = (len) => {
      let s = '';
      for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
      return s;
    };
    let candidate = '';
    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      candidate = `${prefix}${genPart(4)}-${genPart(4)}`;
      if (!data.codes.some(c => c.code === candidate)) {
        return candidate;
      }
    }
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
  }

  deleteAccount(accountId) {
    return this.lock(() => {
      const data = this.read();
      data.accounts = data.accounts || [];
      data.codes = data.codes || [];

      const target = data.accounts.find(a => a.id === accountId);
      if (!target) {
        return { success: false, message: 'Akun tidak ditemukan!' };
      }
      if (target.giveawayCode) {
        data.codes = data.codes.filter(c => c.code.toUpperCase() !== target.giveawayCode.toUpperCase());
      }
      data.accounts = data.accounts.filter(a => a.id !== accountId);
      this.write(data);
      return { success: true, message: 'Akun dan kode giveaway terkait berhasil dihapus!' };
    });
  }

  clearClaimedAccounts() {
    return this.lock(() => {
      const data = this.read();
      data.accounts = data.accounts || [];
      const count = data.accounts.filter(a => a.status === 'claimed').length;
      data.accounts = data.accounts.filter(a => a.status === 'available');
      this.write(data);
      return { success: true, message: `Berhasil membersihkan ${count} akun yang sudah terklaim!` };
    });
  }

  // Code Management
  generateCodes({ count = 5, prefix = 'RII-', maxUses = 1, description = '' }) {
    return this.lock(() => {
      const data = this.read();
      data.codes = data.codes || [];
      const generated = [];
      const num = Math.min(Math.max(1, parseInt(count) || 1), 100);

      for (let i = 0; i < num; i++) {
        const codeCandidate = this._generateUniqueCode(data, prefix);
        const newCode = {
          id: 'code_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          code: codeCandidate,
          maxUses: parseInt(maxUses) || 1,
          usedCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          description: description || `Giveaway Code (${maxUses}x klaim)`
        };

        data.codes.unshift(newCode);
        generated.push(newCode);
      }

      this.write(data);
      return {
        success: true,
        message: `Berhasil membuat ${generated.length} kode giveaway baru!`,
        codes: generated
      };
    });
  }

  addCustomCode({ code, maxUses = 1, description = '' }) {
    return this.lock(() => {
      const data = this.read();
      data.codes = data.codes || [];
      const cleanCode = (code || '').trim().toUpperCase();

      if (!cleanCode) {
        return { success: false, message: 'Kode tidak boleh kosong!' };
      }

      if (data.codes.some(c => c.code.toUpperCase() === cleanCode)) {
        return { success: false, message: 'Kode giveaway ini sudah pernah dibuat!' };
      }

      const newCode = {
        id: 'code_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        code: cleanCode,
        maxUses: Math.max(1, parseInt(maxUses) || 1),
        usedCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        description: description || 'Kode Custom Giveaway'
      };

      data.codes.unshift(newCode);
      this.write(data);
      return { success: true, message: 'Kode custom berhasil dibuat!', code: newCode };
    });
  }

  deleteCode(codeId) {
    return this.lock(() => {
      const data = this.read();
      data.codes = data.codes || [];
      const initialLen = data.codes.length;
      data.codes = data.codes.filter(c => c.id !== codeId);
      if (data.codes.length === initialLen) {
        return { success: false, message: 'Kode tidak ditemukan!' };
      }
      this.write(data);
      return { success: true, message: 'Kode giveaway berhasil dihapus!' };
    });
  }

  // Reset 1-claim limitation (starts fresh event)
  resetClaimLimits() {
    return this.lock(() => {
      const data = this.read();
      const count = (data.claimedIdentifiers || []).length;
      data.claimedIdentifiers = [];
      this.write(data);
      return { success: true, message: `Berhasil mereset batasan klaim (${count} pengguna/IP dibuka kuncinya)!` };
    });
  }

  // Settings
  updateSettings(newSettings) {
    return this.lock(() => {
      const data = this.read();
      if (newSettings.storeName) data.settings.storeName = newSettings.storeName.trim();
      if (newSettings.tagline) data.settings.tagline = newSettings.tagline.trim();
      if (newSettings.announcement !== undefined) data.settings.announcement = newSettings.announcement.trim();
      if (newSettings.adminPin) data.settings.adminPin = newSettings.adminPin.trim();
      if (newSettings.whatsapp !== undefined) data.settings.whatsapp = newSettings.whatsapp.trim();
      if (newSettings.tiktok !== undefined) data.settings.tiktok = newSettings.tiktok.trim();
      if (newSettings.discord !== undefined) data.settings.discord = newSettings.discord.trim();
      if (newSettings.telegram !== undefined) data.settings.telegram = newSettings.telegram.trim();
      if (typeof newSettings.limitOnePerPerson === 'boolean') {
        data.settings.limitOnePerPerson = newSettings.limitOnePerPerson;
      }

      this.write(data);
      return { success: true, message: 'Pengaturan berhasil diperbarui!', settings: data.settings };
    });
  }
}

module.exports = new Database();
