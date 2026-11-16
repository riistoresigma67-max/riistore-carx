const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'riistore_data.json');

// Default initial state
const defaultData = {
  settings: {
    storeName: 'riistore',
    tagline: 'Pusat Giveaway & Akun Game CarX Street Terpercaya',
    announcement: '🔥 Giveaway Akun CarX Street Spesial riistore! Masukkan kode untuk klaim akunmu sekarang!',
    adminPin: 'admin123',
    whatsapp: 'https://wa.me/6281234567890',
    tiktok: 'https://tiktok.com',
    discord: 'https://discord.gg',
    telegram: 'https://t.me',
    limitOnePerPerson: true // Auto-detect IP & Device: 1 person = max 1 claim
  },
  accounts: [
    {
      id: 'acc_' + Date.now() + '_1',
      email: 'carx_vip_turbo@riistore.net',
      password: 'RiiCarxStreet#2026',
      notes: 'CarX Street Level 45 + Nissan GT-R R35 + 15M Gold',
      status: 'available', // available | claimed
      createdAt: new Date().toISOString(),
      claimedAt: null,
      claimedByCode: null,
      claimedByIp: null
    },
    {
      id: 'acc_' + Date.now() + '_2',
      email: 'carx_drifter_pro@riistore.net',
      password: 'DriftKing@Street26',
      notes: 'CarX Street Level 30 + Toyota Supra MK4 + Full Max Upgrade',
      status: 'available',
      createdAt: new Date().toISOString(),
      claimedAt: null,
      claimedByCode: null,
      claimedByIp: null
    },
    {
      id: 'acc_' + Date.now() + '_3',
      email: 'carx_starter_gemini@riistore.net',
      password: 'StarterPack#Rii99',
      notes: 'CarX Street Starter Pack + Mazda RX7 + 5M Silver',
      status: 'available',
      createdAt: new Date().toISOString(),
      claimedAt: null,
      claimedByCode: null,
      claimedByIp: null
    }
  ],
  codes: [
    {
      id: 'code_1',
      code: 'RII-CARX-2026',
      maxUses: 1,
      usedCount: 0,
      status: 'active', // active | depleted | expired
      createdAt: new Date().toISOString(),
      description: 'Kode Spesial Giveaway riistore (1 Akun)'
    },
    {
      id: 'code_2',
      code: 'RII-FREE-ACCOUNT',
      maxUses: 1,
      usedCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      description: 'Kode Giveaway Member Baru'
    },
    {
      id: 'code_3',
      code: 'CARXSTREET-VIP',
      maxUses: 2,
      usedCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      description: 'Kode Spesial untuk 2 Pemenang Tercepat'
    }
  ],
  claimHistory: []
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure database file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
}

class Database {
  constructor() {
    this.queue = Promise.resolve();
  }

  // Read data safely
  read() {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading database file:', err);
      return defaultData;
    }
  }

  // Write data atomically
  write(data) {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
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
    const totalAccounts = data.accounts.length;
    const availableAccounts = data.accounts.filter(a => a.status === 'available').length;
    const claimedAccounts = totalAccounts - availableAccounts;
    const activeCodes = data.codes.filter(c => c.status === 'active' && c.usedCount < c.maxUses).length;

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
      const codeStr = (rawCode || '').trim().toUpperCase();
      const cleanIp = (clientIp || '').trim();
      const cleanDevice = (deviceId || '').trim();

      if (!codeStr) {
        return { success: false, message: 'Kode giveaway tidak boleh kosong!' };
      }

      // 0. Auto-detect & Limit: 1 person only 1 claim (IP and/or Device ID)
      const isLimitEnabled = data.settings.limitOnePerPerson !== false;
      if (isLimitEnabled) {
        data.claimedIdentifiers = data.claimedIdentifiers || [];

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
      data.claimedIdentifiers = data.claimedIdentifiers || [];
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
        // Auto-generate random code if not supplied
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
      const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let added = 0;
      let skipped = 0;
      const createdCodes = [];

      for (const line of lines) {
        // Support separator ':' or '|' or comma or tab
        let parts = [];
        if (line.includes('|')) parts = line.split('|');
        else if (line.includes(':')) parts = line.split(':');
        else if (line.includes('\t')) parts = line.split('\t');
        else if (line.includes(',')) parts = line.split(',');
        else parts = [line]; // Email only!

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
      const target = data.accounts.find(a => a.id === accountId);
      if (!target) {
        return { success: false, message: 'Akun tidak ditemukan!' };
      }
      // If account had a giveaway code, remove it too
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
      const generated = [];
      const num = Math.min(Math.max(1, parseInt(count) || 1), 100);

      const generateRandomStr = (len = 4) => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0, O, 1, I
        let str = '';
        for (let i = 0; i < len; i++) {
          str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return str;
      };

      for (let i = 0; i < num; i++) {
        let codeCandidate = '';
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 100) {
          attempts++;
          const part1 = generateRandomStr(4);
          const part2 = generateRandomStr(4);
          const cleanPrefix = (prefix || 'RII-').toUpperCase().trim();
          codeCandidate = `${cleanPrefix}${part1}-${part2}`;
          if (!data.codes.some(c => c.code === codeCandidate)) {
            isUnique = true;
          }
        }

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
