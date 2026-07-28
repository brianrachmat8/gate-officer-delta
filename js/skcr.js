/* ==========================================================================
   PortGate Logistics Hub - SKCR & Multi-Container Statement Module
   Handles Batch Copy-Paste (Up to 100 Containers) & 1-Page A4 Printable Generator
   ========================================================================== */

const SKCRModule = {
  currentActiveSKCR: null,

  // Helper to format short container size code (e.g. 40'HC, 20'GP)
  getShortSizeCode: function(fullSizeType) {
    if (!fullSizeType) return "40'HC";
    if (fullSizeType.includes("40HC") || fullSizeType.includes("40ft High")) return "40'HC";
    if (fullSizeType.includes("20GP") || fullSizeType.includes("20ft General")) return "20'GP";
    if (fullSizeType.includes("40RF") || fullSizeType.includes("40ft Reefer")) return "40'RF";
    if (fullSizeType.includes("20OT") || fullSizeType.includes("20ft Open")) return "20'OT";
    return fullSizeType.replace(/ft/gi, "'").replace(/\(.*?\)/gi, '').trim();
  },

  // Parse raw text paste containing container numbers (separated by newline, comma, space, tab)
  parseContainerBatch: function(rawText) {
    if (!rawText) return [];
    
    // Split by newlines, commas, semicolons, tabs, or spaces
    const tokens = rawText.split(/[\n,\t;]+/).map(t => t.trim().toUpperCase()).filter(t => t.length >= 4);
    
    // Deduplicate while maintaining order
    const uniqueContainers = Array.from(new Set(tokens));
    
    // Cap at 100 containers
    return uniqueContainers.slice(0, 100);
  },

  // Generate SKCR ID
  generateId: function() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `SKCR-${year}-${month}${randomNum}`;
  },

  getLocalDateISOString: function() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Save new SKCR Statement Record
  createSKCR: function(formData) {
    const containers = SKCRModule.parseContainerBatch(formData.containerRawText);

    if (containers.length === 0) {
      alert("Masukkan minimal 1 nomor kontainer yang valid!");
      return null;
    }

    const newRecord = {
      id: SKCRModule.generateId(),
      date: formData.date || SKCRModule.getLocalDateISOString(),
      time: formData.time || new Date().toTimeString().slice(0, 5),
      containers: containers, // Array of container numbers (up to 100)
      containerCount: containers.length,
      primaryContainer: containers[0],
      sizeType: formData.sizeType || "40ft High Cube (40HC)",
      shippingLine: formData.shippingLine,
      vesselVoyage: formData.vesselVoyage.toUpperCase().trim(),
      consignee: formData.consignee || formData.shippingLine,
      gateLane: formData.gateLane || "Gate 01",
      userNameGate: formData.userNameGate || "RIDWAN",
      companyName: formData.companyName || "DELTA",
      userTitle: formData.userTitle || "Gate Operasional",
      damageSeverity: formData.damageSeverity || "Major Damage",
      damagedComponents: formData.damagedComponents || ["Dinding / Body Container", "Lantai / Floor Panel"],
      damageDescription: formData.damageDescription || "Empty reposition damage / rusak akan diperbaiki di negara tujuan.",
      status: "Approved"
    };

    skcrData.unshift(newRecord);
    return newRecord;
  },

  formatIndonesianDateStr: function(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${day} ${months[monthIdx] || ''} ${year}`;
    }
    return dateStr;
  },

  // Render Official Surat Keterangan Document HTML inside Modal (1-Page A4 Compact Layout)
  renderCertificateModal: function(skcrRecord) {
    if (!skcrRecord) {
      alert("Data SKCR tidak valid.");
      return;
    }

    SKCRModule.currentActiveSKCR = skcrRecord;
    const escape = (typeof App !== 'undefined' && App.escapeHTML) ? App.escapeHTML : (str => str || '');

    // Get Settings (UserName, Company, Title, Logo URL, Stamp URL, Signature URL)
    const settings = (typeof App !== 'undefined' && App.getSettings) ? App.getSettings() : {
      userNameGate: "RIDWAN",
      companyName: "DELTA",
      userTitle: "Gate Operasional"
    };

    const userName = skcrRecord.userNameGate || settings.userNameGate || "RIDWAN";
    const companyName = skcrRecord.companyName || settings.companyName || "DELTA";
    const userTitle = skcrRecord.userTitle || settings.userTitle || "Gate Operasional";
    const logoUrl = settings.logoUrl || "";
    const stampUrl = settings.stampUrl || "";
    const signatureUrl = settings.signatureUrl || "";

    const dateFormatted = SKCRModule.formatIndonesianDateStr(skcrRecord.date);
    const consigneeName = skcrRecord.consignee || skcrRecord.shippingLine || "PT DELTA KONTAINER";

    const containersList = skcrRecord.containers && skcrRecord.containers.length > 0 
      ? skcrRecord.containers 
      : [skcrRecord.containerNo || "SNKO8923410"];

    const totalCount = containersList.length;
    const shortSize = SKCRModule.getShortSizeCode(skcrRecord.sizeType);

    // Calculate number of columns to fit on 1 A4 page
    let numCols = 1;
    if (totalCount > 60) numCols = 4;
    else if (totalCount > 30) numCols = 3;
    else if (totalCount > 10) numCols = 2;

    const itemsPerCol = Math.ceil(totalCount / numCols);

    // Split containers into column arrays
    const columnsData = [];
    for (let c = 0; c < numCols; c++) {
      const startIndex = c * itemsPerCol;
      const endIndex = Math.min(startIndex + itemsPerCol, totalCount);
      const colItems = [];
      for (let i = startIndex; i < endIndex; i++) {
        colItems.push({
          num: i + 1,
          containerNo: containersList[i]
        });
      }
      if (colItems.length > 0) {
        columnsData.push(colItems);
      }
    }

    // Render Side-by-Side Tables
    let multiColTablesHtml = `<div class="skcr-multi-col-wrapper">`;
    columnsData.forEach(colItems => {
      let rowsHtml = "";
      colItems.forEach(item => {
        rowsHtml += `
          <tr>
            <td style="text-align: center; width: 26px; font-weight: bold;">${item.num}</td>
            <td><strong>${escape(item.containerNo)}</strong></td>
            <td style="text-align: center; width: 50px;">${escape(shortSize)}</td>
          </tr>
        `;
      });

      multiColTablesHtml += `
        <div class="skcr-compact-table-col">
          <table class="skcr-container-table">
            <thead>
              <tr>
                <th style="width: 26px;">NO</th>
                <th>NOMOR KONTAINER</th>
                <th style="width: 50px;">SIZE</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });
    multiColTablesHtml += `</div>`;

    const modalContent = `
      <div class="skcr-certificate-document" id="skcrDocumentPrintable">
        <!-- Letterhead Header -->
        <div class="skcr-header-letterhead">
          <div class="skcr-letterhead-left">
            ${logoUrl ? `<img src="${logoUrl}" class="skcr-company-logo" alt="Logo Perusahaan">` : ''}
            <div>
              <div class="skcr-company-title">${escape(companyName)}</div>
              <div class="skcr-company-sub">Kontainer Depot</div>
              <div class="skcr-company-address">Jl. Madya Kebantenan No. 8, Semper Timur, Cilincing Jakarta</div>
              <div class="skcr-company-contact">Phone : +62 21 21485050 &nbsp;|&nbsp; Fax : +62 21 21485532</div>
            </div>
          </div>
          <div class="skcr-letterhead-right">
            <div>Pos Gate Operations</div>
            <div>Ref: ${escape(skcrRecord.id)}</div>
          </div>
        </div>

        <div class="skcr-official-title">
          <h2>SURAT KETERANGAN CONTAINER RUSAK</h2>
          <div class="doc-num">Nomor: ${escape(skcrRecord.id)}</div>
        </div>

        <div class="skcr-statement-text">
          Yang bertanda tangan di bawah ini:
        </div>

        <table class="skcr-field-table">
          <tr>
            <td class="skcr-field-label">Nama</td>
            <td class="skcr-field-colon">:</td>
            <td><strong>${escape(userName.toUpperCase())}</strong></td>
          </tr>
          <tr>
            <td class="skcr-field-label">Perusahaan</td>
            <td class="skcr-field-colon">:</td>
            <td><strong>${escape(companyName.toUpperCase())}</strong></td>
          </tr>
          <tr>
            <td class="skcr-field-label">Jabatan</td>
            <td class="skcr-field-colon">:</td>
            <td><strong>${escape(userTitle)}</strong></td>
          </tr>
        </table>

        <div class="skcr-statement-text">
          Menyatakan bahwa <strong>Empty Reposition Container</strong> dibawah ini (Total: <strong>${totalCount} Container</strong>):
        </div>

        <!-- Dynamic Multi-Column Compact Table (Guaranteed 1 A4 Page) -->
        ${multiColTablesHtml}

        <table class="skcr-field-table" style="margin-top: 6px;">
          <tr>
            <td class="skcr-field-label">Nama Kapal</td>
            <td class="skcr-field-colon">:</td>
            <td><strong>${escape(skcrRecord.vesselVoyage)}</strong></td>
          </tr>
          <tr>
            <td class="skcr-field-label">Consignee</td>
            <td class="skcr-field-colon">:</td>
            <td><strong>${escape(consigneeName)}</strong></td>
          </tr>
        </table>

        <div class="skcr-closing-statement">
          Adalah benar container tersebut diatas merupakan container <strong>empty reposition damage / rusak</strong> dan akan diperbaiki dinegara tujuan, akan menjadi tanggung jawab kami. Demikian surat pernyataan ini kami buat dengan sebenar-benarnya, atas bantuan dan kerjasamanya kami ucapkan terima kasih.
        </div>

        <!-- Signature and Stamp Block -->
        <div class="skcr-signature-block">
          <div class="skcr-sig-right">
            <div class="skcr-sig-city-date">Jakarta, ${dateFormatted}</div>
            <div class="skcr-sig-company">${escape(companyName)}</div>

            <div class="skcr-stamp-signature-wrapper">
              ${stampUrl ? `<img src="${stampUrl}" class="skcr-stamp-img" alt="Stempel Perusahaan">` : `
                <div style="position: absolute; border: 2px dashed #9ca3af; padding: 0.35rem; font-size: 0.68rem; color: #6b7280; transform: rotate(-5deg);">
                  [ STEMPEL PERUSAHAAN ]
                </div>
              `}

              ${signatureUrl ? `<img src="${signatureUrl}" class="skcr-signature-img" alt="Tanda Tangan Digital">` : `
                <div style="z-index: 2; font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.8rem; color: #1e3a8a;">
                  ${escape(userName)}
                </div>
              `}
            </div>

            <div class="skcr-sig-person-name">${escape(userName.toUpperCase())}</div>
            <div class="skcr-sig-person-title">${escape(userTitle)}</div>
          </div>
        </div>
      </div>
    `;

    const modalBody = document.getElementById('modalBodySKCR');
    if (modalBody) {
      modalBody.innerHTML = modalContent;
      App.openModal('skcrPrintModal');
    }
  },

  // Print current active certificate with Dynamic Suggested File Name (PDF Download Name)
  printCertificate: function() {
    const originalTitle = document.title;
    const rec = SKCRModule.currentActiveSKCR;

    let customFileName = "Surat_Keterangan_Container_Rusak";
    if (rec) {
      const lineName = (rec.shippingLine || 'LINE').replace(/[^a-zA-Z0-9]/g, '_');
      customFileName = `Surat_Keterangan_Container_Rusak_${rec.id}_${lineName}_${rec.date}`;
    }

    document.title = customFileName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  }
};

// Make SKCRModule globally accessible
window.SKCRModule = SKCRModule;
