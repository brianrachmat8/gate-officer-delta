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

  // Ultra-Resilient Multi-Format Roster Parse Method (Handles all Excel date formats & layouts)
  parseFile: function(file, callback) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (!rawJson || rawJson.length === 0) {
          alert("File Excel kosong atau tidak dapat dibaca.");
          return;
        }

        const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Universal Date Normalizer: converts Date, string, or number to 'DD-MMM' (e.g. '27-Jul')
        const parseAnyDate = (val) => {
          if (val === undefined || val === null) return "";

          if (val instanceof Date && !isNaN(val.getTime())) {
            const day = String(val.getDate()).padStart(2, '0');
            const month = MONTH_NAMES[val.getMonth()];
            return `${day}-${month}`;
          }

          let s = String(val).trim();
          if (!s || s.length > 25 || s.toLowerCase().includes("jadwal") || s.toLowerCase().includes("halaman")) return "";

          // Match DD-MMM or DD-MMM-YYYY (e.g. 27-Jul, 27-Jul-2026, 27 Jul)
          let matchMMM = s.match(/(\d{1,2})[-/\s.]([A-Za-z]{3,9})/i);
          if (matchMMM) {
            const day = String(matchMMM[1]).padStart(2, '0');
            const mStr = matchMMM[2].toLowerCase();
            const mIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === mStr.slice(0, 3));
            const month = mIdx >= 0 ? MONTH_NAMES[mIdx] : mStr.charAt(0).toUpperCase() + mStr.slice(1, 3);
            return `${day}-${month}`;
          }

          // Match DD/MM or DD-MM or YYYY-MM-DD or DD.MM.YYYY
          let matchNum = s.match(/(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/) || s.match(/(\d{1,2})[-/. ](\d{1,2})(?:[-/. ]\d{2,4})?/);
          if (matchNum) {
            let day = matchNum[1].length === 4 ? String(matchNum[3]).padStart(2, '0') : String(matchNum[1]).padStart(2, '0');
            let mNum = parseInt(matchNum[1].length === 4 ? matchNum[2] : matchNum[2], 10);
            if (mNum >= 1 && mNum <= 12) {
              const month = MONTH_NAMES[mNum - 1];
              return `${day}-${month}`;
            }
          }

          // Handle Excel serial date numbers (e.g. 46230 -> 27-Jul-2026)
          let num = parseFloat(s);
          if (!isNaN(num) && num > 40000 && num < 60000) {
            let jsDate = new Date((num - (25567 + 2)) * 86400 * 1000);
            if (!isNaN(jsDate.getTime())) {
              const day = String(jsDate.getDate()).padStart(2, '0');
              const month = MONTH_NAMES[jsDate.getMonth()];
              return `${day}-${month}`;
            }
          }

          return "";
        };

        const allDatesList = [];
        const staffShiftMap = {};
        const staffNameOrder = [];

        let currentBlockDates = [];
        let currentColDateMap = {};

        // Primary Loop: Scan rows for date headers and staff shift rows
        for (let r = 0; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length < 2) continue;

          // Count date candidates in row
          let dateCandidates = [];
          for (let c = 0; c < row.length; c++) {
            const parsedD = parseAnyDate(row[c]);
            if (parsedD) {
              dateCandidates.push({ col: c, date: parsedD });
            }
          }

          // If a row contains 2 or more date-like cells, treat it as a Date Header row
          if (dateCandidates.length >= 2) {
            currentBlockDates = [];
            currentColDateMap = {};

            dateCandidates.forEach(item => {
              if (!allDatesList.includes(item.date)) {
                allDatesList.push(item.date);
              }
              currentBlockDates.push(item.date);
              currentColDateMap[item.col] = item.date;
            });
            continue;
          }

          // Read staff row if we are inside an active date block
          if (currentBlockDates.length > 0) {
            let staffName = "";

            // Find staff name in first 3 columns
            for (let c = 0; c < Math.min(3, row.length); c++) {
              let candidate = String(row[c] || '').trim().toUpperCase();
              if (candidate && candidate.length >= 2 && candidate !== 'UNDEFINED') {
                if (!candidate.includes("KET") && !candidate.includes("JADWAL") && !candidate.includes("DIBUAT") && 
                    !candidate.includes("MENGETAHUI") && !candidate.includes("SHIFT") && !candidate.includes("KORD") && 
                    !candidate.includes("NAMA") && !candidate.includes("MANAGER") && !candidate.includes("OPS") && 
                    !candidate.includes("NO") && !candidate.includes("SUBTOTAL") && !candidate.includes("TOTAL")) {
                  staffName = candidate;
                  break;
                }
              }
            }

            if (!staffName) continue;

            if (!staffShiftMap[staffName]) {
              staffShiftMap[staffName] = {};
              staffNameOrder.push(staffName);
            }

            for (let c = 0; c < row.length; c++) {
              const dateLabel = currentColDateMap[c];
              if (dateLabel) {
                const cellVal = String(row[c] || 'OFF').trim().toUpperCase();
                staffShiftMap[staffName][dateLabel] = cellVal;
              }
            }
          }
        }

        // Secondary Strategy: If no dates were detected via date headers, map staff rows using active matrixDatesList
        if (staffNameOrder.length === 0 || allDatesList.length === 0) {
          console.warn("⚠️ Date headers not detected automatically. Activating resilient fallback parser...");

          const fallbackDates = (matrixDatesList && matrixDatesList.length > 0) ? matrixDatesList : [];
          
          for (let r = 0; r < rawJson.length; r++) {
            const row = rawJson[r];
            if (!row || row.length < 2) continue;

            let staffName = String(row[0] || row[1] || '').trim().toUpperCase();
            if (!staffName || staffName.length < 2 || staffName.includes("JADWAL") || staffName.includes("SHIFT") || staffName.includes("MENGETAHUI")) continue;

            if (!staffShiftMap[staffName]) {
              staffShiftMap[staffName] = {};
              staffNameOrder.push(staffName);
            }

            let dateColIndex = 0;
            for (let c = 1; c < row.length; c++) {
              const cellVal = String(row[c] || '').trim().toUpperCase();
              if (cellVal && (cellVal.startsWith("P-") || cellVal.startsWith("S-") || cellVal.startsWith("M-") || cellVal === "OFF" || cellVal === "OT")) {
                const targetDate = fallbackDates[dateColIndex] || `Day-${dateColIndex + 1}`;
                staffShiftMap[staffName][targetDate] = cellVal;
                if (!allDatesList.includes(targetDate)) {
                  allDatesList.push(targetDate);
                }
                dateColIndex++;
              }
            }
          }
        }

        // Build new Matrix Roster
        const newMatrixRoster = staffNameOrder.map(name => ({
          name: name,
          shifts: staffShiftMap[name] || {}
        }));

        if (newMatrixRoster.length > 0) {
          const finalDates = allDatesList.length > 0 ? allDatesList : matrixDatesList;
          matrixDatesList = finalDates;
          matrixRosterData = newMatrixRoster;

          if (window.App && typeof window.App.saveRosterToStorage === 'function') {
            window.App.saveRosterToStorage();
          }

          if (typeof callback === 'function') {
            callback(newMatrixRoster, finalDates);
          }
        } else {
          alert("Silakan pastikan file Excel berisi tabel nama petugas dan kode shift (P-IN, S-OUT, M-IN, OFF, OT).");
        }

      } catch (err) {
        console.error("Excel Multi-Block Read Exception:", err);
        alert("Terjadi kesalahan membaca file Excel. Pastikan file dalam format .xlsx atau .xls.");
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
