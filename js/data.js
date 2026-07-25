/* ==========================================================================
   PortGate Logistics Hub - Initial Mock Data & Constants
   Includes SKCR Records, Matrix Roster Data (09-Mar to 26-Jul), Peraturan Pelayaran Ekspor/Impor, & Tarif LOLO Presisi
   ========================================================================== */

const SHIPPING_LINES = [
  "HYUNDAI",
  "HAPAG",
  "SINOKOR",
  "HEUNG-A",
  "RCL",
  "WAN-HAI",
  "SITC",
  "STAR SHIPPING",
  "ONE",
  "ZIMLINE",
  "HMM"
];

// Initial SKCR (Surat Keterangan Container Rusak) Records
let skcrData = [
  {
    id: "SKCR-2026-0701",
    date: "2026-07-25",
    time: "09:30",
    containers: ["SNKO8923410", "ONEU4421098", "HLCU9812304", "SITU3319021", "TLLU7721092"],
    containerCount: 5,
    primaryContainer: "SNKO8923410",
    isoCode: "40HC",
    sizeType: "40ft High Cube (40HC)",
    shippingLine: "ONE",
    vesselVoyage: "INTERASIA ENGAGE V. N037",
    consignee: "PT STAR SHIPPING INDONESIA",
    gateLane: "Gate 02 - Inbound",
    userNameGate: "RIDWAN ALAMSYAH",
    companyName: "PT DELTA KONTAINER DEPOT",
    userTitle: "Gate Operasional",
    damageSeverity: "Major",
    damagedComponents: ["Dinding Samping Kiri", "Lantai Dalam", "Pintu Utama"],
    damageDescription: "Empty reposition damage / rusak akan diperbaiki di negara tujuan.",
    status: "Approved"
  },
  {
    id: "SKCR-2026-0702",
    date: "2026-07-24",
    time: "14:20",
    containers: ["HLCU9812304"],
    containerCount: 1,
    primaryContainer: "HLCU9812304",
    isoCode: "40RF",
    sizeType: "40ft Reefer Container (40RF)",
    shippingLine: "HAPAG",
    vesselVoyage: "EXPRESS BERLIN V.991W",
    consignee: "PT HAPAG-LLOYD INDONESIA",
    gateLane: "Gate 01 - Inbound",
    userNameGate: "RIDWAN ALAMSYAH",
    companyName: "PT DELTA KONTAINER DEPOT",
    userTitle: "Gate Operasional",
    damageSeverity: "Total Loss",
    damagedComponents: ["Unit Pendingin (Reefer Unit)"],
    damageDescription: "Mesin reefer mati total akibat korsleting pendingin.",
    status: "Approved"
  }
];

// Matrix Dates Header Range (All 5 vertical blocks from 09-Mar all the way to 26-Jul)
let matrixDatesList = [
  // Block 1: 09-Mar to 05-Apr
  "09-Mar", "10-Mar", "11-Mar", "12-Mar", "13-Mar", "14-Mar", "15-Mar",
  "16-Mar", "17-Mar", "18-Mar", "19-Mar", "20-Mar", "21-Mar", "22-Mar",
  "23-Mar", "24-Mar", "25-Mar", "26-Mar", "27-Mar", "28-Mar", "29-Mar",
  "30-Mar", "31-Mar", "01-Apr", "02-Apr", "03-Apr", "04-Apr", "05-Apr",
  // Block 2: 06-Apr to 03-May
  "06-Apr", "07-Apr", "08-Apr", "09-Apr", "10-Apr", "11-Apr", "12-Apr",
  "13-Apr", "14-Apr", "15-Apr", "16-Apr", "17-Apr", "18-Apr", "19-Apr",
  "20-Apr", "21-Apr", "22-Apr", "23-Apr", "24-Apr", "25-Apr", "26-Apr",
  "27-Apr", "28-Apr", "29-Apr", "30-Apr", "01-May", "02-May", "03-May",
  // Block 3: 04-May to 31-May
  "04-May", "05-May", "06-May", "07-May", "08-May", "09-May", "10-May",
  "11-May", "12-May", "13-May", "14-May", "15-May", "16-May", "17-May",
  "18-May", "19-May", "20-May", "21-May", "22-May", "23-May", "24-May",
  "25-May", "26-May", "27-May", "28-May", "29-May", "30-May", "31-May",
  // Block 4: 01-Jun to 28-Jun
  "01-Jun", "02-Jun", "03-Jun", "04-Jun", "05-Jun", "06-Jun", "07-Jun",
  "08-Jun", "09-Jun", "10-Jun", "11-Jun", "12-Jun", "13-Jun", "14-Jun",
  "15-Jun", "16-Jun", "17-Jun", "18-Jun", "19-Jun", "20-Jun", "21-Jun",
  "22-Jun", "23-Jun", "24-Jun", "25-Jun", "26-Jun", "27-Jun", "28-Jun",
  // Block 5: 29-Jun to 26-Jul
  "29-Jun", "30-Jun", "01-Jul", "02-Jul", "03-Jul", "04-Jul", "05-Jul",
  "06-Jul", "07-Jul", "08-Jul", "09-Jul", "10-Jul", "11-Jul", "12-Jul",
  "13-Jul", "14-Jul", "15-Jul", "16-Jul", "17-Jul", "18-Jul", "19-Jul",
  "20-Jul", "21-Jul", "22-Jul", "23-Jul", "24-Jul", "25-Jul", "26-Jul"
];

// Generate Roster Shifts for all 5 blocks (09-Mar to 26-Jul)
function generateFullRosterShifts(staffName) {
  const shifts = {};
  matrixDatesList.forEach((d, index) => {
    const dayMod = index % 7;
    if (dayMod === 5) {
      shifts[d] = "OFF";
    } else if (dayMod === 6) {
      shifts[d] = "OT";
    } else {
      if (staffName === "BAYU") shifts[d] = (index % 14 < 7) ? "S-ACC DO" : "S-OUT";
      else if (staffName === "ARIP") shifts[d] = (index % 14 < 7) ? "P-IN" : "P-ACC DO";
      else if (staffName === "BRIAN") shifts[d] = (index % 14 < 7) ? "M-IN" : "S-IN";
      else if (staffName === "AGUS") shifts[d] = (index % 14 < 7) ? "P-OUT" : "M-IN";
      else if (staffName === "IRFAN") shifts[d] = (index % 14 < 7) ? "P-IN" : "S-OUT";
      else if (staffName === "RIDWAN") shifts[d] = (index % 14 < 7) ? "S-IN" : "P-IN";
      else if (staffName === "SYAHRUL") shifts[d] = (index % 14 < 7) ? "S-OUT" : "P-OUT";
      else if (staffName === "AGUM") shifts[d] = (index % 14 < 7) ? "P-IN" : "S-ACC DO";
      else if (staffName === "NURHIKMAH") shifts[d] = (index % 14 < 7) ? "M-OUT" : "S-IN";
      else if (staffName === "INDRA") shifts[d] = (index % 14 < 7) ? "M-IN" : "P-OUT";
      else shifts[d] = "P-IN";
    }
  });
  return shifts;
}

// Full Matrix Roster Data (AGUSTIKA -> IRFAN)
let matrixRosterData = [
  { name: "BAYU", shifts: generateFullRosterShifts("BAYU") },
  { name: "ARIP", shifts: generateFullRosterShifts("ARIP") },
  { name: "BRIAN", shifts: generateFullRosterShifts("BRIAN") },
  { name: "AGUS", shifts: generateFullRosterShifts("AGUS") },
  { name: "IRFAN", shifts: generateFullRosterShifts("IRFAN") },
  { name: "RIDWAN", shifts: generateFullRosterShifts("RIDWAN") },
  { name: "SYAHRUL", shifts: generateFullRosterShifts("SYAHRUL") },
  { name: "AGUM", shifts: generateFullRosterShifts("AGUM") },
  { name: "NURHIKMAH", shifts: generateFullRosterShifts("NURHIKMAH") },
  { name: "INDRA", shifts: generateFullRosterShifts("INDRA") }
];

// Official Operational Rules per Shipping Line tagged with serviceType ("EKSPOR" / "IMPOR")
let operationalAnnouncements = [
  {
    id: "NOTE-HAPAG-001",
    date: "2026-07-25",
    time: "08:30",
    title: "Peraturan Operasional & Ketentuan Release HAPAG LLOYD (EKSPOR)",
    category: "HAPAG",
    serviceType: "EKSPOR",
    priority: "Danger",
    author: "Pak Dady (HAPAG Ops)",
    body: "• SCHENKER: Wajib menggunakan Container Murni HAPAG.\n• TUJUAN PREFIX GT (GUATEMALA): Wajib Leasing Container.\n• MATTEL & IKEA: Free LOLO (Selama DO untuk ke DKD).\n• ADIDAS BUFFERSTOCK: Free LOLO (Cek Email / Info Pak Dady).\n• SEAL HAPAG FREE: Apabila sudah ada email konfirmasi dari HAPAG. WAJIB DI-INPUT DI DMS & INFO DI GROUP (Pak Dady).",
    status: "Active"
  },
  {
    id: "NOTE-SNKO-002",
    date: "2026-07-25",
    time: "09:00",
    title: "Ketentuan Release & Foto SINOKOR & HASPUL (EKSPOR)",
    category: "SINOKOR",
    serviceType: "EKSPOR",
    priority: "Warning",
    author: "Pak Firman & Pak Agung (Ops)",
    body: "• TUJUAN PREFIX RU (VLADIVOSTOK): JANGAN RELEASE ALL CONTAINER UP 2022 & Prefix SEKU, SEGU, GESU, CRXU, CRSU.\n• SEAL SINOKOR & HASPUL BAYAR: Wajib di-input di DMS & info di Group (SKR: Pak Firman & HASPUL: Pak Agung).\n• TUJUAN HOCHIMINH (SINOKOR): Wajib remake foto floor atas dan bawah.",
    status: "Active"
  },
  {
    id: "NOTE-RCL-003",
    date: "2026-07-25",
    time: "09:45",
    title: "Peraturan Release & Seal Pelayaran RCL (EKSPOR)",
    category: "RCL",
    serviceType: "EKSPOR",
    priority: "Warning",
    author: "Pak Agung (RCL Ops)",
    body: "• TUJUAN PREFIX TZ (TANZANIA): JANGAN RELEASE ALL REGU.\n• SEAL RCL FREE: Apabila sudah ada email konfirmasi resmi dari RCL. WAJIB DI-INPUT DI DMS & INFO DI GROUP (Pak Agung).",
    status: "Active"
  },
  {
    id: "NOTE-ONE-004",
    date: "2026-07-25",
    time: "10:15",
    title: "Prosedur Early Pick-Up & Seal Pelayaran ONE (EKSPOR)",
    category: "ONE",
    serviceType: "EKSPOR",
    priority: "Info",
    author: "Pak Firman (ONE Ops)",
    body: "• UNTUK EARLY PICK UP: Mohon selalu di-cek di Exception List resmi.\n• SEAL ONE FREE: Customer / EMKL harus mengisi Google Sheet dan menunggu info dari Pelayaran by email. WAJIB DI-INPUT DI DMS & INFO DI GROUP (Pak Firman).",
    status: "Active"
  },
  {
    id: "NOTE-ZIM-005",
    date: "2026-07-25",
    time: "10:50",
    title: "Ketentuan Prefix & Seal Pelayaran ZIM / ZIMLINE (EKSPOR)",
    category: "ZIMLINE",
    serviceType: "EKSPOR",
    priority: "Info",
    author: "Pak Pandu (ZIM Ops)",
    body: "• PREFIX CONTAINER MURNI ZIM: Harus dipastikan keluar untuk negara tujuan Non-Muslim.\n• SEAL ZIM FREE: Customer / EMKL harus info ke Pelayaran dan menunggu konfirmasi by email. WAJIB DI-INPUT DI DMS & INFO DI GROUP (Pak Pandu).",
    status: "Active"
  },
  {
    id: "NOTE-SITC-006",
    date: "2026-07-24",
    time: "14:00",
    title: "Batas Closing Time & Cut-Off Gate-In SITC Line (EKSPOR)",
    category: "SITC",
    serviceType: "EKSPOR",
    priority: "Info",
    author: "SITC Line Ops",
    body: "• Batas Waktu Closing Time / Cut-off Gate-In Ekspor SITC armada kapal SITC SHANGHAI V.2612E jam 18:00 WIB.\n• Truk yang terlambat wajib konfirmasi late-gate ke pos inspek.",
    status: "Active"
  },
  {
    id: "NOTE-HEUNG-007",
    date: "2026-07-24",
    time: "15:30",
    title: "Standar Inspeksi Integritas Peti Kemas HEUNG-A (EKSPOR)",
    category: "HEUNG-A",
    serviceType: "EKSPOR",
    priority: "Info",
    author: "HEUNG-A Ops",
    body: "• Seluruh peti kemas HEUNG-A tipe 20GP & 40HC wajib dicek kebersihan lantai dan bebas dari bau bahan kimia berbahaya sebelum serah terima.",
    status: "Active"
  },
  {
    id: "NOTE-UMUM-008",
    date: "2026-07-24",
    time: "17:00",
    title: "Instruksi Kalibrasi Timbangan & Keamanan K3 Pos Gate",
    category: "Umum / Gate",
    serviceType: "EKSPOR",
    priority: "Warning",
    author: "Superintendent Gate Operations",
    body: "• Timbangan Digital Gate 2 dialihkan sementara ke Gate 3 untuk sertifikasi kalibrasi tahunan.\n• Seluruh pengemudi truk wajib menggunakan rompi K3 dan helm keselamatan selama berada di jalur gate depo.",
    status: "Active"
  }
];

// Presisi Real Master Tarif Lift On (Per 20 April 2026) & Lift Off (Per 1 Mei 2026) sesuai File Excel Asli User
let loloTariffData = [
  // 1. HYUNDAI
  { id: "LOLO-001", shippingLine: "HYUNDAI", sizeType: "20 FT", liftOn: 749250, liftOff: 976850, total: 1726100, notes: "Tarif Resmi (Lift On 20-Apr / Lift Off 1-Mei)" },
  { id: "LOLO-002", shippingLine: "HYUNDAI", sizeType: "40 FT", liftOn: 915750, liftOff: 1265400, total: 2181150, notes: "Tarif Resmi (Lift On 20-Apr / Lift Off 1-Mei)" },

  // 2. HAPAG
  { id: "LOLO-003", shippingLine: "HAPAG", sizeType: "20 FT", liftOn: 832500, liftOff: 1093350, total: 1925850, notes: "Tarif Resmi (Mattel & IKEA Free LOLO ke DKD)" },
  { id: "LOLO-004", shippingLine: "HAPAG", sizeType: "40 FT", liftOn: 965700, liftOff: 1337550, total: 2303250, notes: "Tarif Resmi (Adidas Bufferstock Free LOLO)" },

  // 3. SINOKOR
  { id: "LOLO-005", shippingLine: "SINOKOR", sizeType: "20 FT", liftOn: 582750, liftOff: 871350, total: 1454100, notes: "Tarif Resmi (Stack Blok D3-D5)" },
  { id: "LOLO-006", shippingLine: "SINOKOR", sizeType: "40 FT", liftOn: 704850, liftOff: 1104450, total: 1809300, notes: "Tarif Resmi (Stack Blok D3-D5)" },

  // 4. HEUNG-A
  { id: "LOLO-007", shippingLine: "HEUNG-A", sizeType: "20 FT", liftOn: 582750, liftOff: 871350, total: 1454100, notes: "Tarif Resmi (Clean Floor Standard)" },
  { id: "LOLO-008", shippingLine: "HEUNG-A", sizeType: "40 FT", liftOn: 704850, liftOff: 1104450, total: 1809300, notes: "Tarif Resmi (Clean Floor Standard)" },

  // 5. RCL
  { id: "LOLO-009", shippingLine: "RCL", sizeType: "20 FT", liftOn: 588300, liftOff: 627150, total: 1215450, notes: "Tarif Resmi (Prefix TZ Restricted)" },
  { id: "LOLO-010", shippingLine: "RCL", sizeType: "40 FT", liftOn: 810300, liftOff: 849150, total: 1659450, notes: "Tarif Resmi (Prefix TZ Restricted)" },

  // 6. WAN-HAI
  { id: "LOLO-011", shippingLine: "WAN-HAI", sizeType: "20 FT", liftOn: 577200, liftOff: 577200, total: 1154400, notes: "Tarif Resmi Wan-Hai Line" },
  { id: "LOLO-012", shippingLine: "WAN-HAI", sizeType: "40 FT", liftOn: 754800, liftOff: 754800, total: 1509600, notes: "Tarif Resmi Wan-Hai Line" },

  // 7. SITC
  { id: "LOLO-013", shippingLine: "SITC", sizeType: "20 FT", liftOn: 604950, liftOff: 643800, total: 1248750, notes: "Tarif Resmi SITC Line" },
  { id: "LOLO-014", shippingLine: "SITC", sizeType: "40 FT", liftOn: 782550, liftOff: 821400, total: 1603950, notes: "Tarif Resmi SITC Line" },

  // 8. STAR SHIPPING
  { id: "LOLO-015", shippingLine: "STAR SHIPPING", sizeType: "20 FT", liftOn: 588300, liftOff: 904650, total: 1492950, notes: "Tarif Resmi Star Shipping Line" },
  { id: "LOLO-016", shippingLine: "STAR SHIPPING", sizeType: "40 FT", liftOn: 721500, liftOff: 1148850, total: 1870350, notes: "Tarif Resmi Star Shipping Line" },

  // 9. ONE (OCEAN NETWORK EXPRESS)
  { id: "LOLO-017", shippingLine: "ONE", sizeType: "20 FT", liftOn: 627150, liftOff: 999000, total: 1626150, notes: "Tarif Resmi ONE (Exception List Check)" },
  { id: "LOLO-018", shippingLine: "ONE", sizeType: "40 FT", liftOn: 804750, liftOff: 1343100, total: 2147850, notes: "Tarif Resmi ONE (Exception List Check)" }
];

// Initial Shift Handover Log Records
let shiftHandoverLogs = [
  {
    id: "LOG-SHIFT-102",
    date: "2026-07-25",
    shiftFrom: "Shift 3 (Malam)",
    shiftTo: "Shift 1 (Pagi)",
    supervisor: "Ridwan Alamsyah",
    gateCondition: "Gate 1, 2, 3 Normal. Pos Gate Operasional lancar.",
    pendingContainers: "Dokumen Empty Reposition Damage 5 container sudah diterbitkan.",
    generalNotes: "Serah terima HT 8 unit, printer nota gate jalan lancar."
  }
];
