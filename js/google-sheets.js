/* ==========================================================================
   PortGate Logistics Hub - Google Sheets Live Sync Connector
   Allows reading live Jadwal Matriks Shift & Tarif LOLO directly from online Google Sheets
   ========================================================================== */

const GoogleSheets = {
  // Extract Spreadsheet ID from full URL or return ID directly
  parseSpreadsheetId: function(urlOrId) {
    if (!urlOrId) return "";
    const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId.trim();
  },

  // Fetch live Roster data from a public Google Sheet
  fetchLiveRoster: function(sheetUrlOrId, callback) {
    const sheetId = GoogleSheets.parseSpreadsheetId(sheetUrlOrId);
    if (!sheetId) {
      alert("❌ URL / ID Google Sheets tidak valid. Pastikan formatnya benar.");
      return;
    }

    // Google Visualization API JSON endpoint
    const endpoint = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

    fetch(endpoint)
      .then(res => res.text())
      .then(text => {
        // Remove Google Viz wrapper "/*O_o*/\ngoogle.visualization.Query.setResponse(...);"
        const jsonString = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        const data = JSON.parse(jsonString);

        if (!data || !data.table || !data.table.rows) {
          alert("⚠️ Gagal membaca data dari Google Sheets. Pastikan akses spreadsheet di-set ke 'Anyone with the link can view' (Publik).");
          return;
        }

        const rows = data.table.rows;
        const cols = data.table.cols;

        let parsedDates = [];
        let parsedRoster = [];

        // Header row (date columns)
        if (cols && cols.length > 1) {
          for (let c = 1; c < cols.length; c++) {
            const label = cols[c] ? (cols[c].label || cols[c].id || `Day-${c}`) : `Day-${c}`;
            parsedDates.push(label);
          }
        }

        // Data rows (staff names and shifts)
        rows.forEach(r => {
          if (!r || !r.c || !r.c[0]) return;
          const staffName = r.c[0] ? String(r.c[0].v || '').trim().toUpperCase() : '';
          if (!staffName || staffName === 'NAMA' || staffName.length < 2) return;

          const shiftsMap = {};
          for (let c = 1; c < r.c.length; c++) {
            const dateLabel = parsedDates[c - 1] || `Col-${c}`;
            const cellVal = r.c[c] ? String(r.c[c].v || 'OFF').trim().toUpperCase() : 'OFF';
            shiftsMap[dateLabel] = cellVal;
          }

          parsedRoster.push({
            name: staffName,
            shifts: shiftsMap
          });
        });

        if (parsedRoster.length > 0 && typeof callback === 'function') {
          callback(parsedRoster, parsedDates);
        } else {
          alert("⚠️ File Google Sheet berhasil dihubungkan tetapi tidak ada data personil yang valid.");
        }
      })
      .catch(err => {
        console.error("Google Sheets Fetch Error:", err);
        alert("❌ Terjadi kesalahan saat menghubungkan ke Google Sheets. Pastikan akses Spreadsheet sudah di-share 'Publik / Anyone with link'.");
      });
  }
};

window.GoogleSheets = GoogleSheets;
