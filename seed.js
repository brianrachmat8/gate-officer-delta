const https = require('https');

const notices = [
  { id: 'NOTE-HAPAG-001', date: '2026-07-25', time: '08:30', title: 'Peraturan Operasional & Ketentuan Release HAPAG LLOYD (EKSPOR)', category: 'HAPAG', priority: 'Danger', author: 'Pak Dady (HAPAG Ops)', body: 'SCHENKER: Wajib menggunakan Container Murni HAPAG.', status: 'Active' },
  { id: 'NOTE-SNKO-002', date: '2026-07-25', time: '09:00', title: 'Ketentuan Release & Foto SINOKOR & HASPUL (EKSPOR)', category: 'SINOKOR', priority: 'Warning', author: 'Pak Firman & Pak Agung (Ops)', body: 'TUJUAN PREFIX RU: JANGAN RELEASE ALL CONTAINER UP 2022.', status: 'Active' },
  { id: 'NOTE-RCL-003', date: '2026-07-25', time: '09:45', title: 'Peraturan Release & Seal Pelayaran RCL (EKSPOR)', category: 'RCL', priority: 'Warning', author: 'Pak Agung (RCL Ops)', body: 'TUJUAN PREFIX TZ: JANGAN RELEASE ALL REGU.', status: 'Active' },
  { id: 'NOTE-ONE-004', date: '2026-07-25', time: '10:15', title: 'Prosedur Early Pick-Up & Seal Pelayaran ONE (EKSPOR)', category: 'ONE', priority: 'Info', author: 'Pak Firman (ONE Ops)', body: 'UNTUK EARLY PICK UP: Mohon selalu di-cek di Exception List resmi.', status: 'Active' },
  { id: 'NOTE-ZIM-005', date: '2026-07-25', time: '10:50', title: 'Ketentuan Prefix & Seal Pelayaran ZIM / ZIMLINE (EKSPOR)', category: 'ZIMLINE', priority: 'Info', author: 'Pak Pandu (ZIM Ops)', body: 'PREFIX CONTAINER MURNI ZIM: Harus dipastikan keluar untuk negara tujuan Non-Muslim.', status: 'Active' },
  { id: 'NOTE-SITC-006', date: '2026-07-24', time: '14:00', title: 'Batas Closing Time & Cut-Off Gate-In SITC Line (EKSPOR)', category: 'SITC', priority: 'Info', author: 'SITC Line Ops', body: 'Batas Waktu Closing Time Cut-off Gate-In Ekspor SITC.', status: 'Active' },
  { id: 'NOTE-HEUNG-007', date: '2026-07-24', time: '15:30', title: 'Standar Inspeksi Integritas Peti Kemas HEUNG-A (EKSPOR)', category: 'HEUNG-A', priority: 'Info', author: 'HEUNG-A Ops', body: 'Seluruh peti kemas HEUNG-A tipe 20GP & 40HC wajib dicek kebersihan lantai.', status: 'Active' },
  { id: 'NOTE-UMUM-008', date: '2026-07-24', time: '17:00', title: 'Instruksi Kalibrasi Timbangan & Keamanan K3 Pos Gate', category: 'Umum / Gate', priority: 'Warning', author: 'Superintendent Gate Operations', body: 'Timbangan Digital Gate 2 dialihkan sementara ke Gate 3.', status: 'Active' },
  { id: 'NOTE-HMM-009', date: '2026-07-25', time: '11:15', title: 'Prosedur Pengambilan DO & Release Duty HMM / Hyundai (IMPOR)', category: 'HYUNDAI', priority: 'Info', author: 'HMM Import Ops', body: 'Pengambilan DO Impor HMM wajib membawa SPPB & BL Asli / E-DO.', status: 'Active' },
  { id: 'NOTE-WANHAI-010', date: '2026-07-25', time: '11:45', title: 'Petunjuk Pelepasan Segel & Pemeriksaan Fisik Impor Wan-Hai Line (IMPOR)', category: 'WAN-HAI', priority: 'Warning', author: 'Wan-Hai Import Ops', body: 'Pembongkaran kontainer impor Wan-Hai wajib verifikasi nomor segel pelayaran.', status: 'Active' }
];

const postData = JSON.stringify(notices);

const options = {
  hostname: 'seiscumgtgjxaimaaegp.supabase.co',
  port: 443,
  path: '/rest/v1/gate_notices',
  method: 'POST',
  headers: {
    'apikey': 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk',
    'Prefer': 'resolution=merge-duplicates',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(postData);
req.end();
