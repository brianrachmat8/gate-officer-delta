/* ==========================================================================
   PortGate Logistics Hub - SheetJS Excel Parser Module
   Multi-Block Vertical Grid Roster Parser & Resilient Grid LOLO Tariff Parser
   ========================================================================== */

const ExcelParser = {
  getShiftPillCategory: function(code) {
    if (!code) return { class: "shift-pill-grey", text: "OFF" };
    const clean = String(code).trim().toUpperCase();

    if (clean.startsWith("P-") || clean.startsWith("Pagi")) return { class: "shift-pill-yellow", text: clean };
    if (clean.startsWith("S-") || clean.startsWith("Sore")) return { class: "shift-pill-blue", text: clean };
    if (clean.startsWith("M-") || clean.startsWith("Malam")) return { class: "shift-pill-grey", text: clean };
    if (clean === "OFF" || clean === "LIBUR") return { class: "shift-pill-grey", text: "OFF" };
    if (clean === "OT" || clean === "LEMBUR") return { class: "shift-pill-red", text: clean };

    return { class: "shift-pill-yellow", text: clean };
  },

  // Multi-Block Roster Parse Method
  parseFile: function(file, callback) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length === 0) {
          alert("File Excel kosong!");
          return;
        }

        const allDatesList = [];
        const staffShiftMap = {};
        const staffNameOrder = [];

        let currentBlockDates = [];
        let currentColDateMap = {};

        for (let r = 0; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length < 2) continue;

          let dateMatches = 0;
          for (let c = 1; c < row.length; c++) {
            const rawVal = row[c];
            if (rawVal === undefined || rawVal === null) continue;

            if (rawVal instanceof Date) {
              dateMatches++;
            } else if (typeof rawVal === 'number' && rawVal > 30000 && rawVal < 60000) {
              dateMatches++;
            } else {
              const val = String(rawVal).trim();
              if (val.match(/\d{1,2}[-\/\.][A-Za-z]{3,9}/) ||
                  val.match(/\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}/) ||
                  val.match(/\d{1,2}[-\/\.]\d{1,2}/) ||
                  (val.length >= 3 && !isNaN(Date.parse(val)))) {
                dateMatches++;
              }
            }
          }

          if (dateMatches >= 2) {
            currentBlockDates = [];
            currentColDateMap = {};

            for (let c = 1; c < row.length; c++) {
              const rawVal = row[c];
              if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;

              let dateStr = "";
              if (rawVal instanceof Date) {
                const day = String(rawVal.getDate()).padStart(2, '0');
                const month = rawVal.toLocaleString('en-US', { month: 'short' });
                dateStr = `${day}-${month}`;
              } else if (typeof rawVal === 'number' && rawVal > 30000 && rawVal < 60000) {
                const jsDate = new Date((rawVal - (25567 + 2)) * 86400 * 1000);
                if (!isNaN(jsDate.getTime())) {
                  const day = String(jsDate.getDate()).padStart(2, '0');
                  const month = jsDate.toLocaleString('en-US', { month: 'short' });
                  dateStr = `${day}-${month}`;
                } else {
                  dateStr = String(rawVal).trim();
                }
              } else {
                dateStr = String(rawVal).trim();
              }

              if (dateStr && !dateStr.toLowerCase().includes("jadwal")) {
                if (!allDatesList.includes(dateStr)) {
                  allDatesList.push(dateStr);
                }
                currentBlockDates.push(dateStr);
                currentColDateMap[c] = dateStr;
              }
            }
            continue;
          }

          if (currentBlockDates.length > 0) {
            let staffName = String(row[0] || row[1] || '').trim().toUpperCase();
            if (!staffName || staffName === 'UNDEFINED' || staffName.length < 2) continue;

            if (staffName.includes("KET") || staffName.includes("JADWAL") || staffName.includes("DIBUAT") || staffName.includes("MENGETAHUI") || staffName.includes("SHIFT") || staffName.includes("KORD") || staffName.includes("NAMA")) {
              continue;
            }

            if (!staffShiftMap[staffName]) {
              staffShiftMap[staffName] = {};
              staffNameOrder.push(staffName);
            }

            for (let c = 1; c < row.length; c++) {
              const dateLabel = currentColDateMap[c];
              if (dateLabel) {
                const cellVal = String(row[c] || 'OFF').trim().toUpperCase();
                staffShiftMap[staffName][dateLabel] = cellVal;
              }
            }
          }
        }

        const newMatrixRoster = staffNameOrder.map(name => ({
          name: name,
          shifts: staffShiftMap[name]
        }));

        if (newMatrixRoster.length > 0 && allDatesList.length > 0) {
          matrixDatesList = allDatesList;
          matrixRosterData = newMatrixRoster;

          if (window.App && typeof window.App.saveRosterToStorage === 'function') {
            window.App.saveRosterToStorage();
          }

          if (typeof callback === 'function') {
            callback(newMatrixRoster, allDatesList);
          }
        } else {
          alert("Gagal membaca struktur blok jadwal Excel. Pastikan header tanggal berbentuk '09-Mar', '06-Apr', dst.");
        }
      } catch (err) {
        console.error("Excel Multi-Block Read Error:", err);
        alert("Terjadi kesalahan saat membaca file Excel. Pastikan file tidak rusak.");
      }
    };

    reader.readAsArrayBuffer(file);
  },

  // Parse Tarif Lift On / Lift Off Excel File (Handles both Grid Layout & Column Table Layout)
  parseLOLOTariffFile: function(file, callback) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) {
          alert("File Excel Tarif LOLO kosong!");
          return;
        }

        const parsedTariffs = [];
        let isLiftOnSheet = false;
        let isLiftOffSheet = false;

        // Clean & Scan top headers for "LIFT ON" or "LIFT OFF"
        for (let r = 0; r < Math.min(5, rawJson.length); r++) {
          const rowText = (rawJson[r] || []).join(' ').toUpperCase();
          if (rowText.includes("LIFT ON")) isLiftOnSheet = true;
          if (rowText.includes("LIFT OFF")) isLiftOffSheet = true;
        }

        // Try Grid Parser matching User Excel Screenshots (HYUNDAI, HAPAG, SINOKOR, HEUNG-A, RCL, WAN-HAI, SITC, STAR SHIPPING, ONE)
        let gridPairsFound = false;

        for (let r = 0; r < rawJson.length - 2; r++) {
          const lineRow = rawJson[r] || [];
          const sizeRow = rawJson[r + 1] || [];
          const priceRow = rawJson[r + 2] || [];

          // Check if sizeRow has "20 FT" or "40 FT"
          let sizeMatches = 0;
          for (let c = 0; c < sizeRow.length; c++) {
            const sz = String(sizeRow[c] || '').toUpperCase();
            if (sz.includes("20 FT") || sz.includes("40 FT") || sz.includes("20FT") || sz.includes("40FT")) {
              sizeMatches++;
            }
          }

          if (sizeMatches >= 2) {
            gridPairsFound = true;
            let currentShippingLine = "";

            for (let c = 0; c < sizeRow.length; c++) {
              const rawLine = String(lineRow[c] || '').trim().toUpperCase();
              if (rawLine && !rawLine.includes("INFORMASI") && !rawLine.includes("TARIF") && !rawLine.includes("HARGA")) {
                currentShippingLine = rawLine;
              }

              const sizeStr = String(sizeRow[c] || '').trim().toUpperCase();
              if (sizeStr.includes("20 FT") || sizeStr.includes("40 FT") || sizeStr.includes("20FT") || sizeStr.includes("40FT")) {
                const normSize = sizeStr.includes("20") ? "20 FT" : "40 FT";
                
                // Parse Price numeric value (handling string "976.850" or numeric 976850)
                let rawPrice = priceRow[c];
                let numPrice = 0;
                if (typeof rawPrice === 'number') {
                  numPrice = rawPrice;
                } else if (typeof rawPrice === 'string') {
                  // Replace dots/commas if formatted as Indonesian 976.850
                  let cleanP = rawPrice.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
                  numPrice = parseFloat(cleanP) || 0;
                }

                if (currentShippingLine && numPrice > 0) {
                  // Find existing record in parsedTariffs or pre-populate
                  let existing = parsedTariffs.find(t => t.shippingLine === currentShippingLine && t.sizeType === normSize);
                  if (!existing) {
                    existing = {
                      id: `LOLO-EXCEL-${currentShippingLine}-${normSize}`,
                      shippingLine: currentShippingLine,
                      sizeType: normSize,
                      liftOn: 0,
                      liftOff: 0,
                      total: 0,
                      notes: "Imported Excel Grid"
                    };
                    parsedTariffs.push(existing);
                  }

                  if (isLiftOffSheet) {
                    existing.liftOff = numPrice;
                  } else {
                    existing.liftOn = numPrice;
                  }
                  existing.total = existing.liftOn + existing.liftOff;
                }
              }
            }
          }
        }

        // Standard Table Parser Fallback if Grid wasn't triggered
        if (!gridPairsFound) {
          for (let i = 1; i < rawJson.length; i++) {
            const row = rawJson[i];
            if (!row || row.length === 0 || !row[0]) continue;

            const line = String(row[0]).trim().toUpperCase();
            if (line.includes("SHIPPING") || line.includes("TARIF") || line.includes("INFORMASI")) continue;

            const size = row[1] ? String(row[1]).trim().toUpperCase() : "20 FT";
            const lo = row[2] ? parseFloat(String(row[2]).replace(/\./g, '').replace(/,/g, '.')) || 0 : 0;
            const lf = row[3] ? parseFloat(String(row[3]).replace(/\./g, '').replace(/,/g, '.')) || 0 : 0;
            const notes = row[4] ? String(row[4]).trim() : "Tarif Excel Upload";

            parsedTariffs.push({
              id: `LOLO-EXCEL-${Date.now()}-${i}`,
              shippingLine: line,
              sizeType: size,
              liftOn: lo,
              liftOff: lf,
              total: lo + lf,
              notes: notes
            });
          }
        }

        if (parsedTariffs.length > 0) {
          if (typeof callback === 'function') {
            callback(parsedTariffs);
          }
        } else {
          alert("Gagal membaca data tarif LOLO dari Excel! Pastikan susunan tabel atau grid sesuai template.");
        }

      } catch (err) {
        console.error("Excel Tariff Read Error:", err);
        alert("Gagal membaca file Excel Tarif LOLO! Pastikan format sesuai template.");
      }
    };

    reader.readAsArrayBuffer(file);
  },

  // Download Sample Roster Template
  downloadTemplate: function() {
    const templateData = [
      ["NAMA PETUGAS", "09-Mar", "10-Mar", "11-Mar", "12-Mar", "13-Mar", "14-Mar", "15-Mar"],
      ["BAYU", "S-ACC DO", "S-ACC DO", "S-ACC DO", "S-ACC DO", "S-ACC DO", "OFF", "OT"],
      ["ARIP", "P-IN", "P-IN", "P-IN", "P-IN", "P-IN", "P-ACC DO", "OFF"],
      ["BRIAN", "M-IN", "M-IN", "M-IN", "M-IN", "M-IN", "OFF", "OT"],
      ["AGUS", "P-OUT", "P-OUT", "P-OUT", "P-OUT", "P-OUT", "OFF", "OT"],
      ["IRFAN", "P-IN", "P-IN", "P-IN", "P-IN", "P-IN", "OFF", "OT"],
      ["RIDWAN", "S-IN", "S-IN", "S-IN", "S-IN", "S-IN", "S-IN", "OFF"],
      ["SYAHRUL", "S-OUT", "S-OUT", "S-OUT", "S-OUT", "S-OUT", "OFF", "OT"],
      ["AGUM", "P-IN", "P-IN", "P-IN", "P-IN", "P-IN", "P-ACC DO", "OFF"],
      ["NURHIKMAH", "M-OUT", "M-OUT", "M-OUT", "M-OUT", "M-OUT", "OFF", "OT"],
      ["INDRA", "M-IN", "M-IN", "M-IN", "M-IN", "M-IN", "OFF", "OT"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal_Matriks_Gate");
    XLSX.writeFile(wb, "Template_Jadwal_Shift_Matriks.xlsx");
  },

  // Download Sample LOLO Tariff Template (Matching exact user Excel grid layout)
  downloadLOLOTemplate: function() {
    const templateData = [
      ["TARIF LOLO PER 1 MEI 2026"],
      [],
      ["INFORMASI HARGA LIFT OFF"],
      ["HYUNDAI", "", "HAPAG", "", "SINOKOR", "", "HEUNG-A", "", "RCL", ""],
      ["20 FT", "40 FT", "20 FT", "40 FT", "20 FT", "40 FT", "20 FT", "40 FT", "20 FT", "40 FT"],
      [976850, 1265400, 1093350, 1337550, 871350, 1104450, 871350, 1104450, 627150, 849150],
      ["WAN-HAI", "", "SITC", "", "STAR SHIPPING", "", "ONE", ""],
      ["20 FT", "40 FT", "20 FT", "40 FT", "20 FT", "40 FT", "20 FT", "40 FT"],
      [577200, 754800, 643800, 821400, 904650, 1148850, 999000, 1343100]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tarif_LOLO_Master");
    XLSX.writeFile(wb, "Template_Tarif_Lift_On_Lift_Off.xlsx");
  }
};

window.ExcelParser = ExcelParser;
