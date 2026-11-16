const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Simple Admin Authentication Middleware
function adminAuth(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.query.admin_pin || req.body.adminPin;
  if (!pin || !db.verifyAdmin(pin)) {
    return res.status(401).json({ success: false, message: 'Akses ditolak: PIN Admin salah atau belum login!' });
  }
  next();
}

// ------------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------------

// 1. Get Store info & Live stats
app.get('/api/public-info', (req, res) => {
  try {
    const data = db.getPublicStats();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat data sistem' });
  }
});

// 2. Claim / Redeem Account
app.post('/api/claim', async (req, res) => {
  try {
    const { code, deviceId } = req.body;
    const rawIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                  req.headers['x-real-ip'] ||
                  req.socket.remoteAddress ||
                  'unknown';
    // Clean IPv4 mapped in IPv6 (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
    const clientIp = rawIp.replace(/^::ffff:/, '');
    const result = await db.claimCode(code, clientIp, deviceId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Claim error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat memproses klaim.' });
  }
});

// ------------------------------------------------------------------
// ADMIN API
// ------------------------------------------------------------------

// Admin Login verification
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (db.verifyAdmin(pin)) {
    return res.json({ success: true, message: 'Login Admin Berhasil!' });
  }
  return res.status(401).json({ success: false, message: 'PIN Admin yang Anda masukkan salah!' });
});

// Get all data for admin dashboard
app.get('/api/admin/dashboard', adminAuth, (req, res) => {
  try {
    const dashboardData = db.getAdminDashboard();
    res.json({ success: true, ...dashboardData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data dashboard' });
  }
});

// Add Single Account
app.post('/api/admin/accounts', adminAuth, async (req, res) => {
  try {
    const { email, password, notes, giveawayCode } = req.body;
    const result = await db.addAccount(email, password, notes, giveawayCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk Import Accounts
app.post('/api/admin/accounts/bulk', adminAuth, async (req, res) => {
  try {
    const { bulkText, autoGenerateCodes, defaultPassword } = req.body;
    const result = await db.bulkAddAccounts(bulkText || '', autoGenerateCodes !== false, defaultPassword || '11223344');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Account
app.delete('/api/admin/accounts/:id', adminAuth, async (req, res) => {
  try {
    const result = await db.deleteAccount(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear Claimed Accounts
app.post('/api/admin/accounts/clear-claimed', adminAuth, async (req, res) => {
  try {
    const result = await db.clearClaimedAccounts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate Random Codes
app.post('/api/admin/codes/generate', adminAuth, async (req, res) => {
  try {
    const { count, prefix, maxUses, description } = req.body;
    const result = await db.generateCodes({ count, prefix, maxUses, description });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add Custom Code
app.post('/api/admin/codes/custom', adminAuth, async (req, res) => {
  try {
    const { code, maxUses, description } = req.body;
    const result = await db.addCustomCode({ code, maxUses, description });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Code
app.delete('/api/admin/codes/:id', adminAuth, async (req, res) => {
  try {
    const result = await db.deleteCode(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reset Claim Limits (IP & Device Unlock)
app.post('/api/admin/limits/reset', adminAuth, async (req, res) => {
  try {
    const result = await db.resetClaimLimits();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Settings
app.post('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const result = await db.updateSettings(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve frontend route fallbacks
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback for SPA/HTML
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 RIISTORE CARX STREET GIVEAWAY SERVER BERJALAN!`);
  console.log(`🌐 Website Utama:  http://localhost:${PORT}`);
  console.log(`🔑 Admin Panel:    http://localhost:${PORT}/admin`);
  console.log(`🔒 Default Admin PIN: admin123`);
  console.log(`======================================================\n`);
});
