/* ==========================================================================
   PortGate / Gate Officer Delta - Main Application Controller
   Handles Settings, Copy-Paste SKCR, Delete SKCR/Notices, LocalStorage Roster Persistence,
   Supabase Cloud DB Sync, EKSPOR vs IMPOR Service Type Filter, Per-Block Shipping Line Cards for LOLO,
   User Module Profile Duty Hub, & 3-Theme Selector (Soft Cream, Soft Pink & Dark)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  App.init();
});

const App = {
  activeNoticeDateFilter: "",
  activeNoticeCategoryFilter: "",
  activeNoticeServiceType: "EKSPOR",
  showDisabledNotices: false,
  activeRosterStaffFilter: "",
  activeRosterShiftFilter: "",
  activeRosterMonthFilter: "",
  activeLOLOTab: "LIFTOFF", // Default: LIFT OFF vs LIFT ON
  activeLOLOViewMode: "BLOCK", // "BLOCK" Grid Cards vs "TABLE" List View
  activeLOLOFilter: "",
  currentActiveNoticeId: null,

  // Settings State with LocalStorage & Supabase Credentials
  settings: {
    userNameGate: "RIDWAN",
    companyName: "PT DELTA KONTAINER DEPOT",
    userTitle: "Gate Operasional",
    logoUrl: "",
    stampUrl: "",
    signatureUrl: "",
    marqueeText: "⚠️ PENGINGAT GATE: Pastikan Cek Seal HAPAG & Remake Foto Floor SINOKOR Tujuan Hochiminh! | Wajib Cek Exception List Pelayaran ONE untuk Early Pick-Up. | Seal RCL Free Apabila Ada Email Konfirmasi.",
    marqueeActive: true,
    supabaseUrl: "https://seiscumgtgjxaimaaegp.supabase.co",
    supabaseKey: "sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk"
  },

  init: function() {
    App.loadSettings();
    SupabaseDB.init();

    App.loadRosterFromStorage();
    App.loadSKCRFromStorage();
    App.loadNoticesFromStorage();
    App.loadHandoverFromStorage();
    
    // If Supabase is configured, trigger Cloud sync
    if (SupabaseDB.isConfigured) {
      SupabaseDB.syncAllFromCloud();
    }

    App.startClock();
    App.setupThemeToggle();
    App.setupTabNavigation();
    App.setupModalGlobalListeners();
    App.setupMarqueeBanner();
    App.setupSettingsModule();
    App.setupSKCRModule();
    App.setupExcelRosterModule();
    App.setupNoticeModule();
    App.setupLOLOTariffModule();
    App.setupHandoverModule();
    App.setupUserGuideModule();
    App.setupGlobalSearch();
    App.renderAll();
  },

  openModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  escapeHTML: function(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  closeModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  closeAllModals: function() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
    });
  },

  setupModalGlobalListeners: function() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        App.closeAllModals();
      }
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-close-modal');
        App.closeModal(targetId);
      });
    });
  },

  loadSettings: function() {
    const saved = localStorage.getItem('portgate_settings');
    if (saved) {
      try {
        App.settings = { ...App.settings, ...JSON.parse(saved) };
      } catch(e) {
        console.error("Failed to parse settings:", e);
      }
    }
  },

  saveSettings: function(newSettings) {
    App.settings = { ...App.settings, ...newSettings };
    localStorage.setItem('portgate_settings', JSON.stringify(App.settings));
    App.updateMarqueeUI();
    if (typeof SupabaseDB !== 'undefined' && SupabaseDB.isConfigured) {
      SupabaseDB.saveSettings(App.settings);
    }
  },

  applyCloudSettings: function(cloudSettings) {
    if (!cloudSettings) return;
    const activeLogo = cloudSettings.logoUrl || App.settings.logoUrl;
    const activeStamp = cloudSettings.stampUrl || App.settings.stampUrl;
    const activeSig = cloudSettings.signatureUrl || App.settings.signatureUrl;
    const localUser = localStorage.getItem('portgate_active_user') || App.settings.userNameGate;

    App.settings = { 
      ...App.settings, 
      ...cloudSettings,
      userNameGate: localUser,
      logoUrl: activeLogo,
      stampUrl: activeStamp,
      signatureUrl: activeSig
    };
    localStorage.setItem('portgate_settings', JSON.stringify(App.settings));
    App.updateMarqueeUI();
    App.renderStampPreviews();
    App.updateUserProfileDisplay();
  },

  compressImageFile: function(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  getSettings: function() {
    return App.settings;
  },

  saveRosterToStorage: function() {
    try {
      const rosterPayload = {
        dates: matrixDatesList,
        roster: matrixRosterData,
        timestamp: Date.now()
      };
      localStorage.setItem('portgate_matrix_roster', JSON.stringify(rosterPayload));
      SupabaseDB.saveRoster(matrixDatesList, matrixRosterData);
    } catch(e) {
      console.error("Failed to save roster to storage:", e);
    }
  },

  loadRosterFromStorage: function() {
    const saved = localStorage.getItem('portgate_matrix_roster');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Invalidate stale cache if it contains outdated date headers (e.g. 09-Mar, 06-Apr, 26-Jul, or 12-Dec offset)
        const isStaleCache = parsed.dates && (
          parsed.dates.some(d => d.includes("Mar") || d.includes("Apr") || d.includes("May") || d.includes("Jun")) ||
          parsed.dates[0] === "26-Jul" ||
          parsed.dates[parsed.dates.length - 1] === "12-Dec"
        );

        if (isStaleCache) {
          console.warn("🧹 Purging outdated roster cache (26-Jul/12-Dec era) from localStorage...");
          localStorage.removeItem('portgate_matrix_roster');
          return;
        }

        if (parsed.dates && parsed.dates.length > 0 && parsed.roster && parsed.roster.length > 0) {
          matrixDatesList = parsed.dates;
          matrixRosterData = parsed.roster;
        }
      } catch(e) {
        console.error("Failed to load roster from storage:", e);
      }
    }

    // Safety guard: Ensure matrixDatesList ALWAYS starts on 27-Jul (Senin)
    if (matrixDatesList && matrixDatesList[0] === "26-Jul") {
      console.warn("🧹 Stripping legacy 26-Jul start date from active matrixDatesList...");
      matrixDatesList.shift();
      if (matrixRosterData) {
        matrixRosterData.forEach(r => {
          if (r.shifts && r.shifts["26-Jul"]) delete r.shifts["26-Jul"];
        });
      }
    }
  },

  saveSKCRToStorage: function() {
    localStorage.setItem('portgate_skcr_data', JSON.stringify(skcrData));
  },

  loadSKCRFromStorage: function() {
    const saved = localStorage.getItem('portgate_skcr_data');
    if (saved) {
      try {
        skcrData = JSON.parse(saved);
      } catch(e) {
        console.error("Failed to load SKCR data:", e);
      }
    }
  },

  saveNoticesToStorage: function() {
    localStorage.setItem('portgate_notices_data', JSON.stringify(operationalAnnouncements));
  },

  loadNoticesFromStorage: function() {
    const saved = localStorage.getItem('portgate_notices_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          operationalAnnouncements = parsed;
          return;
        }
      } catch(e) {
        console.error("Failed to load notices data:", e);
      }
    }
    // Fallback: If localStorage notice data is empty or invalid, clear key so initial seed notices from data.js are used
    localStorage.removeItem('portgate_notices_data');
  },

  saveHandoverToStorage: function() {
    localStorage.setItem('portgate_handover_data', JSON.stringify(shiftHandoverLogs));
  },

  loadHandoverFromStorage: function() {
    const saved = localStorage.getItem('portgate_handover_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          shiftHandoverLogs = parsed;
        }
      } catch(e) {
        console.error("Failed to load handover logs data:", e);
      }
    }
  },

  startClock: function() {
    const updateClock = () => {
      const now = new Date();
      const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      document.getElementById('liveClockDisplay').textContent = now.toLocaleDateString('id-ID', options) + " WIB";
    };
    updateClock();
    setInterval(updateClock, 1000);
  },

  setupThemeToggle: function() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    // Check if user has saved theme preference or default to light (Warm Soft Cream)
    const savedTheme = localStorage.getItem('portgate_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    App.updateThemeBtnIcon(savedTheme);

    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      let nextTheme = 'light';

      if (currentTheme === 'light') {
        nextTheme = 'pink';
      } else if (currentTheme === 'pink') {
        nextTheme = 'dark';
      } else {
        nextTheme = 'light';
      }

      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('portgate_theme', nextTheme);
      App.updateThemeBtnIcon(nextTheme);
    });
  },

  updateThemeBtnIcon: function(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    if (theme === 'light') {
      btn.innerHTML = `<i class="fa-solid fa-sun" style="color: #d97706;"></i> Soft Cream`;
      btn.title = "Tema Aktif: Soft Cream. Klik untuk ganti ke Soft Pink.";
    } else if (theme === 'pink') {
      btn.innerHTML = `<i class="fa-solid fa-heart" style="color: #ec4899;"></i> Soft Pink`;
      btn.title = "Tema Aktif: Soft Pink. Klik untuk ganti ke Dark Mode.";
    } else {
      btn.innerHTML = `<i class="fa-solid fa-moon" style="color: #3b82f6;"></i> Dark Mode`;
      btn.title = "Tema Aktif: Dark Mode. Klik untuk ganti ke Soft Cream.";
    }
  },

  setupTabNavigation: function() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetTab = tab.getAttribute('data-tab');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
      });
    });
  },

  setupMarqueeBanner: function() {
    const toggleBtn = document.getElementById('btnToggleMarquee');
    toggleBtn.addEventListener('click', () => {
      App.settings.marqueeActive = !App.settings.marqueeActive;
      App.saveSettings({ marqueeActive: App.settings.marqueeActive });
    });
    App.updateMarqueeUI();
  },

  updateMarqueeUI: function() {
    const banner = document.getElementById('marqueeBanner');
    const display = document.getElementById('marqueeTextDisplay');
    
    if (display) {
      display.textContent = App.settings.marqueeText;
    }

    if (banner) {
      if (App.settings.marqueeActive) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  },

  setupSettingsModule: function() {
    const openBtn = document.getElementById('btnOpenSettings');

    openBtn.addEventListener('click', () => {
      document.getElementById('settingUserNameGate').value = App.settings.userNameGate;
      document.getElementById('settingCompanyName').value = App.settings.companyName;
      document.getElementById('settingUserTitle').value = App.settings.userTitle;
      document.getElementById('settingMarqueeText').value = App.settings.marqueeText;
      document.getElementById('settingMarqueeActive').checked = App.settings.marqueeActive;

      App.renderStampPreviews();
      App.openModal('settingsModal');
    });

    document.getElementById('settingLogoFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        App.compressImageFile(file, 450, 450, (dataUrl) => {
          App.settings.logoUrl = dataUrl;
          App.renderStampPreviews();
          App.saveSettings({ logoUrl: dataUrl });
        });
      }
    });

    document.getElementById('settingStampFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        App.compressImageFile(file, 450, 450, (dataUrl) => {
          App.settings.stampUrl = dataUrl;
          App.renderStampPreviews();
          App.saveSettings({ stampUrl: dataUrl });
        });
      }
    });

    document.getElementById('settingSignatureFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        App.compressImageFile(file, 450, 450, (dataUrl) => {
          App.settings.signatureUrl = dataUrl;
          App.renderStampPreviews();
          App.saveSettings({ signatureUrl: dataUrl });
        });
      }
    });

    document.getElementById('formSettings').addEventListener('submit', (e) => {
      e.preventDefault();

      const newSettings = {
        userNameGate: document.getElementById('settingUserNameGate').value.trim(),
        companyName: document.getElementById('settingCompanyName').value.trim(),
        userTitle: document.getElementById('settingUserTitle').value.trim(),
        marqueeText: document.getElementById('settingMarqueeText').value.trim(),
        marqueeActive: document.getElementById('settingMarqueeActive').checked
      };

      App.saveSettings(newSettings);

      document.getElementById('skcrUserNameGate').value = App.settings.userNameGate;
      document.getElementById('skcrCompanyName').value = App.settings.companyName;
      document.getElementById('skcrUserTitle').value = App.settings.userTitle;

      App.updateUserProfileDisplay();
      App.closeModal('settingsModal');
      alert("Pengaturan profil user gate, logo, stempel & teks berjalan berhasil disimpan!");
    });
  },

  renderStampPreviews: function() {
    const logoContainer = document.getElementById('logoPreviewContainer');
    const stampContainer = document.getElementById('stampPreviewContainer');
    const sigContainer = document.getElementById('signaturePreviewContainer');

    if (App.settings.logoUrl) {
      logoContainer.innerHTML = `
        <div style="display:inline-block; position:relative; background:#fff; padding:0.5rem; border-radius:6px;">
          <img src="${App.settings.logoUrl}" style="max-height:60px; max-width:120px; object-fit:contain;">
          <br><small style="color:#0f172a; font-weight:bold;">Logo Perusahaan Terpasang</small>
        </div>
      `;
    } else {
      logoContainer.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted);">Belum ada gambar logo di-upload.</span>`;
    }

    if (App.settings.stampUrl) {
      stampContainer.innerHTML = `
        <div style="display:inline-block; position:relative; background:#fff; padding:0.5rem; border-radius:6px;">
          <img src="${App.settings.stampUrl}" style="max-height:80px; max-width:120px; object-fit:contain;">
          <br><small style="color:#0f172a; font-weight:bold;">Stempel Perusahaan Terpasang</small>
        </div>
      `;
    } else {
      stampContainer.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted);">Belum ada gambar stempel di-upload.</span>`;
    }

    if (App.settings.signatureUrl) {
      sigContainer.innerHTML = `
        <div style="display:inline-block; position:relative; background:#fff; padding:0.5rem; border-radius:6px;">
          <img src="${App.settings.signatureUrl}" style="max-height:80px; max-width:120px; object-fit:contain;">
          <br><small style="color:#0f172a; font-weight:bold;">Tanda Tangan Digital Terpasang</small>
        </div>
      `;
    } else {
      sigContainer.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted);">Belum ada gambar tanda tangan di-upload.</span>`;
    }
  },

  setupSKCRModule: function() {
    const rawTextArea = document.getElementById('skcrContainerRawText');
    const countBadge = document.getElementById('containerCountBadge');

    document.getElementById('tbodySKCR').addEventListener('click', (e) => {
      const btnPrint = e.target.closest('.btn-print-skcr');
      const btnDelete = e.target.closest('.btn-delete-skcr');

      if (btnPrint) {
        const skcrId = btnPrint.getAttribute('data-id');
        App.openSKCRDetail(skcrId);
      }

      if (btnDelete) {
        const skcrId = btnDelete.getAttribute('data-id');
        App.deleteSKCR(skcrId);
      }
    });

    const shippingLineSelect = document.getElementById('skcrShippingLine');
    const consigneeInput = document.getElementById('skcrConsignee');

    if (shippingLineSelect && consigneeInput) {
      shippingLineSelect.addEventListener('change', (e) => {
        const selectedLine = e.target.value;
        if (typeof SHIPPING_CONSIGNEE_MAP !== 'undefined' && SHIPPING_CONSIGNEE_MAP[selectedLine]) {
          consigneeInput.value = SHIPPING_CONSIGNEE_MAP[selectedLine];
        }
      });
    }

    const skcrUserSelect = document.getElementById('skcrUserNameGate');
    if (skcrUserSelect) {
      skcrUserSelect.value = localStorage.getItem('portgate_active_user') || App.settings.userNameGate || "RIDWAN";
      skcrUserSelect.addEventListener('change', (e) => {
        const selectedUser = e.target.value;
        localStorage.setItem('portgate_active_user', selectedUser);
        App.settings.userNameGate = selectedUser;
        App.saveSettings({ userNameGate: selectedUser });

        const userDutySelect = document.getElementById('userDutySelect');
        if (userDutySelect) userDutySelect.value = selectedUser;

        App.updateUserProfileDisplay();
      });
    }

    rawTextArea.addEventListener('input', () => {
      const parsed = SKCRModule.parseContainerBatch(rawTextArea.value);
      countBadge.textContent = `${parsed.length} / 100 Container`;
      if (parsed.length > 100) {
        countBadge.className = "badge badge-warning";
      } else if (parsed.length > 0) {
        countBadge.className = "badge badge-success";
      } else {
        countBadge.className = "badge badge-info";
      }
    });

    const form = document.getElementById('formCreateSKCR');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = {
        containerRawText: rawTextArea.value,
        shippingLine: document.getElementById('skcrShippingLine').value,
        sizeType: document.getElementById('skcrSizeType').value,
        vesselVoyage: document.getElementById('skcrVesselVoyage').value,
        consignee: document.getElementById('skcrConsignee').value,
        userNameGate: document.getElementById('skcrUserNameGate').value,
        companyName: document.getElementById('skcrCompanyName').value,
        userTitle: document.getElementById('skcrUserTitle').value
      };

      const newRecord = SKCRModule.createSKCR(formData);
      if (!newRecord) return;

      form.reset();
      countBadge.textContent = "0 / 100 Container";

      document.getElementById('skcrUserNameGate').value = App.settings.userNameGate;
      document.getElementById('skcrCompanyName').value = App.settings.companyName;
      document.getElementById('skcrUserTitle').value = App.settings.userTitle;

      App.saveSKCRToStorage();
      SupabaseDB.saveSKCR(newRecord);

      App.renderSKCRTable();
      App.updateKPIs();

      SKCRModule.renderCertificateModal(newRecord);
    });

    document.getElementById('filterSKCRLine').addEventListener('change', () => {
      App.renderSKCRTable();
    });

    document.getElementById('btnExportSKCRExcel').addEventListener('click', () => {
      if (skcrData.length === 0) {
        alert("Tidak ada data SKCR untuk di-export.");
        return;
      }

      const exportRows = [];
      skcrData.forEach(item => {
        const cList = item.containers && item.containers.length > 0 ? item.containers : [item.containerNo];
        cList.forEach((cNum, idx) => {
          exportRows.push({
            "No SKCR": item.id,
            "Tanggal": item.date,
            "Index": idx + 1,
            "No Kontainer": cNum,
            "Shipping Line": item.shippingLine,
            "Tipe Kontainer": item.sizeType,
            "Nama Kapal": item.vesselVoyage,
            "Consignee": item.consignee,
            "User Gate": item.userNameGate,
            "Perusahaan": item.companyName
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan_SKCR_Container");
      const currentDate = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Laporan_Surat_Keterangan_Container_Rusak_${currentDate}.xlsx`);
    });
  },

  deleteSKCR: function(skcrId) {
    if (confirm(`Apakah Anda yakin ingin MENGHAPUS dokumen Surat Keterangan Rusak No. ${skcrId}?`)) {
      skcrData = skcrData.filter(item => item.id !== skcrId);
      App.saveSKCRToStorage();
      SupabaseDB.deleteSKCR(skcrId);
      App.renderSKCRTable();
      App.updateKPIs();
      alert(`Dokumen SKCR No. ${skcrId} berhasil dihapus!`);
    }
  },

  renderSKCRTable: function(searchTerm = "") {
    const tbody = document.getElementById('tbodySKCR');
    const filterLine = document.getElementById('filterSKCRLine').value;

    let filtered = skcrData.filter(item => {
      const matchLine = !filterLine || item.shippingLine === filterLine;
      const cStr = (item.containers ? item.containers.join(' ') : item.containerNo || '').toLowerCase();
      const matchSearch = !searchTerm || 
        cStr.includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vesselVoyage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.shippingLine.toLowerCase().includes(searchTerm.toLowerCase());
      return matchLine && matchSearch;
    });

    tbody.innerHTML = filtered.map((item, idx) => {
      const cCount = item.containerCount || (item.containers ? item.containers.length : 1);
      const mainContainer = item.primaryContainer || (item.containers && item.containers[0]) || item.containerNo || "SNKO8923410";
      const sLine = item.shippingLine || "HAPAG";
      const consigneeName = item.consignee || "-";

      return `
        <tr>
          <td style="text-align: center; font-size: 0.72rem; font-weight: bold; color: var(--text-muted); padding: 0.35rem 0.2rem;">${idx + 1}</td>
          <td style="padding: 0.35rem 0.4rem;"><strong style="font-size: 0.74rem; word-break: break-all;">${App.escapeHTML(item.id)}</strong></td>
          <td style="white-space: nowrap; font-size: 0.74rem; font-weight: 600; color: var(--text-muted); padding: 0.35rem 0.4rem;">${App.escapeHTML(item.date)}</td>
          <td style="padding: 0.35rem 0.4rem;">
            <div style="display: flex; flex-direction: column; gap: 0.15rem; align-items: flex-start;">
              <span class="badge badge-shipping-line" style="font-weight: 800; font-size: 0.68rem; padding: 0.1rem 0.4rem; text-transform: uppercase;">${App.escapeHTML(sLine)}</span>
              <span style="font-size: 0.72rem; font-weight: 600; color: var(--text-main); word-break: break-word; line-height: 1.2;">${App.escapeHTML(consigneeName)}</span>
            </div>
          </td>
          <td style="padding: 0.35rem 0.4rem;">
            <strong style="color: var(--accent-blue); font-size: 0.76rem;">${App.escapeHTML(mainContainer)}</strong>
            ${cCount > 1 ? `<span class="badge badge-info" style="margin-left:0.15rem; font-size: 0.65rem; padding: 0.1rem 0.3rem;">+${cCount - 1} cont</span>` : ''}
          </td>
          <td style="padding: 0.35rem 0.4rem;"><span style="font-size: 0.7rem; color: var(--text-muted); display: block; word-break: break-word; line-height: 1.2;">${App.escapeHTML(item.vesselVoyage || '-')}</span></td>
          <td style="white-space: nowrap; text-align: center; padding: 0.35rem 0.4rem;">
            <div style="display: flex; gap: 0.2rem; justify-content: center;">
              <button class="btn btn-primary btn-sm btn-print-skcr" data-id="${item.id}" style="padding: 0.2rem 0.45rem; font-size: 0.7rem;">
                <i class="fa-solid fa-print"></i> Cetak (${cCount})
              </button>
              <button class="btn btn-secondary btn-sm btn-delete-skcr" data-id="${item.id}" style="color: var(--status-danger); padding: 0.2rem 0.4rem; font-size: 0.7rem;" title="Hapus Dokumen SKCR Ini">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('skcrCountBadge').textContent = skcrData.length;
  },

  openSKCRDetail: function(skcrId) {
    const record = skcrData.find(r => r.id === skcrId);
    if (record) {
      SKCRModule.renderCertificateModal(record);
    } else {
      alert("Data SKCR tidak ditemukan.");
    }
  },

  setupExcelRosterModule: function() {
    const dropZone = document.getElementById('dropZoneExcel');
    const fileInput = document.getElementById('fileInputExcel');
    const btnToggleUpload = document.getElementById('btnToggleExcelUpload');
    const iconToggle = document.getElementById('iconToggleUpload');
    const textToggle = document.getElementById('textToggleUpload');

    const updateUploadPanelState = (isMinimized) => {
      if (isMinimized) {
        dropZone.style.display = 'none';
        if (iconToggle) iconToggle.className = 'fa-solid fa-chevron-down';
        if (textToggle) textToggle.textContent = 'Expand Panel Upload';
        btnToggleUpload.className = 'btn btn-primary btn-sm';
      } else {
        dropZone.style.display = 'block';
        if (iconToggle) iconToggle.className = 'fa-solid fa-chevron-up';
        if (textToggle) textToggle.textContent = 'Minimize Panel';
        btnToggleUpload.className = 'btn btn-secondary btn-sm';
      }
    };

    // Restore saved state
    const isSavedMinimized = localStorage.getItem('portgate_excel_upload_minimized') === 'true';
    updateUploadPanelState(isSavedMinimized);

    btnToggleUpload.addEventListener('click', () => {
      const isCurrentlyHidden = dropZone.style.display === 'none';
      const newState = !isCurrentlyHidden;
      localStorage.setItem('portgate_excel_upload_minimized', newState ? 'true' : 'false');
      updateUploadPanelState(newState);
    });

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        ExcelParser.parseFile(files[0], App.onExcelRosterParsed);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        ExcelParser.parseFile(e.target.files[0], App.onExcelRosterParsed);
      }
    });

    document.getElementById('btnDownloadExcelTemplate').addEventListener('click', () => {
      ExcelParser.downloadTemplate();
    });

    document.getElementById('btnResetSavedRoster').addEventListener('click', async () => {
      if (confirm("Apakah Anda yakin ingin RESET ULANG data jadwal ke default (mulai Senin 27-Jul s/d 13-Dec 2026)?")) {
        localStorage.removeItem('portgate_matrix_roster');
        await SupabaseDB.resetRosterToDefault();
        alert("✅ Master data jadwal berhasil di-reset total ke default (Senin 27-Jul 2026)!");
        location.reload();
      }
    });

    document.getElementById('filterRosterStaff').addEventListener('change', (e) => {
      App.activeRosterStaffFilter = e.target.value;
      App.renderMatrixScheduleTable();
    });

    document.getElementById('filterRosterMonth').addEventListener('change', (e) => {
      App.activeRosterMonthFilter = e.target.value;
      App.renderMatrixScheduleTable();
    });

    document.getElementById('filterRosterShift').addEventListener('change', (e) => {
      App.activeRosterShiftFilter = e.target.value;
      App.renderMatrixScheduleTable();
    });

    document.getElementById('btnResetRosterFilter').addEventListener('click', () => {
      App.activeRosterStaffFilter = "";
      App.activeRosterMonthFilter = "";
      App.activeRosterShiftFilter = "";
      document.getElementById('filterRosterStaff').value = "";
      document.getElementById('filterRosterMonth').value = "";
      document.getElementById('filterRosterShift').value = "";
      App.renderMatrixScheduleTable();
    });

    App.updateStaffFilterOptions();
    App.updateMonthFilterOptions();
  },

  updateStaffFilterOptions: function() {
    const select = document.getElementById('filterRosterStaff');
    if (!select) return;

    const staffNames = matrixRosterData.map(item => item.name).sort();

    select.innerHTML = `
      <option value="">-- Semua Anggota Gate (${staffNames.length} Petugas) --</option>
      ${staffNames.map(name => `<option value="${name}">${name}</option>`).join('')}
    `;
  },

  updateMonthFilterOptions: function() {
    const select = document.getElementById('filterRosterMonth');
    const headerTitle = document.getElementById('rosterTitleHeader');
    if (!select || !matrixDatesList || matrixDatesList.length === 0) return;

    const monthNamesMap = {
      "Jan": "Januari 2026",
      "Feb": "Februari 2026",
      "Mar": "Maret 2026",
      "Apr": "April 2026",
      "May": "Mei 2026",
      "Jun": "Juni 2026",
      "Jul": "Juli 2026",
      "Aug": "Agustus 2026",
      "Sep": "September 2026",
      "Oct": "Oktober 2026",
      "Nov": "November 2026",
      "Dec": "Desember 2026"
    };

    const startDate = matrixDatesList[0];
    const endDate = matrixDatesList[matrixDatesList.length - 1];

    if (headerTitle) {
      headerTitle.innerHTML = `<i class="fa-solid fa-table-cells"></i> Matriks Shift Gate Utuh (${startDate} s/d ${endDate} 2026)`;
    }

    const uniqueMonths = [];
    matrixDatesList.forEach(d => {
      const parts = d.split('-');
      if (parts.length >= 2) {
        const m = parts[1].trim();
        if (!uniqueMonths.includes(m)) {
          uniqueMonths.push(m);
        }
      }
    });

    let optionsHtml = `<option value="">🗓️ Semua Tanggal (${startDate} s/d ${endDate})</option>`;
    uniqueMonths.forEach(m => {
      const label = monthNamesMap[m] || m;
      optionsHtml += `<option value="${m}">${label}</option>`;
    });

    select.innerHTML = optionsHtml;
  },

  onExcelRosterParsed: function(newRoster, newDates) {
    if (newDates && newDates.length > 0 && newRoster && newRoster.length > 0) {
      matrixDatesList = newDates;
      matrixRosterData = newRoster;
    }

    App.saveRosterToStorage();
    App.updateStaffFilterOptions();
    App.updateMonthFilterOptions();
    App.renderMatrixScheduleTable();
    App.updateKPIs();
    alert(`🎉 File Excel Matriks Berhasil Di-Upload!\nJadwal ${newRoster.length} petugas gate across ${newDates.length} tanggal (${newDates[0]} s/d ${newDates[newDates.length - 1]}) tersimpan & ter-sync realtime!`);
  },

  getDayNameIndonesian: function(dateStr) {
    if (!dateStr) return '';
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const monthMap = {
      "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
      "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
    };

    const parts = String(dateStr).split('-');
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1];
      const monthIdx = monthMap[monthStr] !== undefined ? monthMap[monthStr] : 6;
      const year = parts[2] ? parseInt(parts[2], 10) : 2026;

      const d = new Date(Date.UTC(year, monthIdx, day));
      const dayIdx = d.getUTCDay();
      return dayNames[dayIdx] || '';
    }
    return '';
  },

  renderMatrixScheduleTable: function(searchTerm = "") {
    const thead = document.getElementById('theadMatrixSchedule');
    const tbody = document.getElementById('tbodyMatrixSchedule');

    if (!thead || !tbody) return;

    let displayDates = matrixDatesList;
    if (App.activeRosterMonthFilter) {
      displayDates = matrixDatesList.filter(d => d.includes(App.activeRosterMonthFilter));
    }

    thead.innerHTML = `
      <tr>
        <th class="matrix-staff-col"><i class="fa-solid fa-user"></i> NAMA PETUGAS</th>
        ${displayDates.map(d => {
          const dayName = App.getDayNameIndonesian(d);
          const isWeekend = (dayName === "Sabtu" || dayName === "Minggu");
          const isFriday = (dayName === "Jumat");
          const styleAttr = isWeekend 
            ? 'style="background: rgba(239, 68, 68, 0.12); color: #ef4444;"' 
            : (isFriday ? 'style="background: rgba(245, 158, 11, 0.12);"' : '');
          return `
            <th ${styleAttr}>
              <div style="font-size: 0.65rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.9;">${dayName}</div>
              <div style="font-size: 0.8rem; font-weight: 800;">${d}</div>
            </th>
          `;
        }).join('')}
      </tr>
    `;

    let filteredStaff = matrixRosterData.filter(item => {
      const matchStaff = !App.activeRosterStaffFilter || item.name === App.activeRosterStaffFilter;
      const matchSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStaff && matchSearch;
    });

    if (filteredStaff.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${displayDates.length + 1}" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="fa-solid fa-user-slash" style="font-size: 1.8rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
            <div>Tidak ada jadwal petugas gate yang cocok dengan filter.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredStaff.map(item => {
      const cellsHtml = displayDates.map(dateKey => {
        let code = item.shifts[dateKey] || 'OFF';

        if (App.activeRosterShiftFilter && !code.includes(App.activeRosterShiftFilter)) {
          return `<td><span class="shift-pill shift-pill-grey" style="opacity: 0.25;">-</span></td>`;
        }

        const pillInfo = ExcelParser.getShiftPillCategory(code);
        return `
          <td>
            <span class="shift-pill ${pillInfo.class}">${pillInfo.text}</span>
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td class="matrix-staff-col">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-user-gear" style="color: var(--accent-blue);"></i>
              <strong style="font-size: 0.9rem;">${item.name}</strong>
            </div>
          </td>
          ${cellsHtml}
        </tr>
      `;
    }).join('');
  },

  setupNoticeModule: function() {
    const btnEkspor = document.getElementById('btnNoticeTypeEkspor');
    const btnImpor = document.getElementById('btnNoticeTypeImpor');
    const categorySelect = document.getElementById('filterNoticeCategory');
    const dateInput = document.getElementById('filterNoticeDate');
    const chkShowDisabled = document.getElementById('chkShowDisabledNotices');
    const resetBtn = document.getElementById('btnResetNoticeFilter');

    btnEkspor.addEventListener('click', () => {
      App.activeNoticeServiceType = "EKSPOR";
      btnEkspor.className = "btn btn-primary btn-sm service-type-btn active";
      btnImpor.className = "btn btn-secondary btn-sm service-type-btn";
      document.getElementById('noticeTypeTitleHeader').textContent = "EKSPOR";
      App.renderNoticeFeed();
    });

    btnImpor.addEventListener('click', () => {
      App.activeNoticeServiceType = "IMPOR";
      btnImpor.className = "btn btn-primary btn-sm service-type-btn active";
      btnEkspor.className = "btn btn-secondary btn-sm service-type-btn";
      document.getElementById('noticeTypeTitleHeader').textContent = "IMPOR";
      App.renderNoticeFeed();
    });

    categorySelect.addEventListener('change', (e) => {
      App.activeNoticeCategoryFilter = e.target.value;
      App.renderNoticeFeed();
    });

    dateInput.addEventListener('change', (e) => {
      App.activeNoticeDateFilter = e.target.value;
      App.renderNoticeFeed();
    });

    chkShowDisabled.addEventListener('change', (e) => {
      App.showDisabledNotices = e.target.checked;
      App.renderNoticeFeed();
    });

    resetBtn.addEventListener('click', () => {
      App.activeNoticeCategoryFilter = "";
      App.activeNoticeDateFilter = "";
      App.showDisabledNotices = false;
      categorySelect.value = "";
      dateInput.value = "";
      chkShowDisabled.checked = false;
      App.renderNoticeFeed();
    });

    const form = document.getElementById('formAddNotice');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const newNotice = {
        id: `NOTE-${document.getElementById('noticeCategory').value}-${Date.now()}`,
        date: document.getElementById('noticeDate').value,
        time: new Date().toTimeString().slice(0, 5),
        title: document.getElementById('noticeTitle').value,
        category: document.getElementById('noticeCategory').value,
        serviceType: document.getElementById('noticeServiceType').value,
        priority: document.getElementById('noticePriority').value,
        author: "Supervisor Duty Terminal",
        body: document.getElementById('noticeBody').value,
        status: "Active"
      };

      operationalAnnouncements.unshift(newNotice);
      App.saveNoticesToStorage();
      SupabaseDB.saveNotice(newNotice);

      form.reset();

      if (newNotice.serviceType === "IMPOR") {
        btnImpor.click();
      } else {
        btnEkspor.click();
      }

      App.updateKPIs();
      alert(`Peraturan / Edaran pelayaran (${newNotice.serviceType}) berhasil dipublikasikan & ter-sync realtime!`);
    });

    document.getElementById('newsTimelineContainer').addEventListener('click', (e) => {
      const btnPrint = e.target.closest('.btn-print-notice');
      const btnToggle = e.target.closest('.btn-toggle-notice-status');
      const btnDelete = e.target.closest('.btn-delete-notice');

      if (btnPrint) {
        const noticeId = btnPrint.getAttribute('data-id');
        App.openNoticePrintModal(noticeId);
      }

      if (btnToggle) {
        const noticeId = btnToggle.getAttribute('data-id');
        App.toggleNoticeStatus(noticeId);
      }

      if (btnDelete) {
        const noticeId = btnDelete.getAttribute('data-id');
        App.deleteNotice(noticeId);
      }
    });
  },

  deleteNotice: function(noticeId) {
    if (confirm(`Apakah Anda yakin ingin MENGHAPUS edaran operasional ini secara permanen?`)) {
      operationalAnnouncements = operationalAnnouncements.filter(n => n.id !== noticeId);
      App.saveNoticesToStorage();
      SupabaseDB.deleteNotice(noticeId);
      App.renderNoticeFeed();
      App.updateKPIs();
      alert("Edaran operasional berhasil dihapus!");
    }
  },

  toggleNoticeStatus: function(noticeId) {
    const notice = operationalAnnouncements.find(n => n.id === noticeId);
    if (!notice) return;

    if (notice.status === "Disabled") {
      notice.status = "Active";
    } else {
      notice.status = "Disabled";
    }

    App.saveNoticesToStorage();
    SupabaseDB.saveNotice(notice);

    App.renderNoticeFeed();
    App.updateKPIs();
  },

  renderNoticeFeed: function() {
    const container = document.getElementById('newsTimelineContainer');
    const displayBadge = document.getElementById('noticeDateDisplayBadge');

    let filtered = operationalAnnouncements.filter(n => {
      const itemType = (n.serviceType || 'EKSPOR').toUpperCase();
      const activeType = (App.activeNoticeServiceType || 'EKSPOR').toUpperCase();
      const matchType = (itemType === activeType);
      const matchCategory = !App.activeNoticeCategoryFilter || n.category === App.activeNoticeCategoryFilter;
      const matchDate = !App.activeNoticeDateFilter || n.date === App.activeNoticeDateFilter;
      const matchStatus = App.showDisabledNotices ? true : (n.status !== "Disabled");
      return matchType && matchCategory && matchDate && matchStatus;
    });

    displayBadge.textContent = App.activeNoticeCategoryFilter 
      ? `Pelayaran: ${App.activeNoticeCategoryFilter}` 
      : `Layanan: ${App.activeNoticeServiceType} (${filtered.length})`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
          <i class="fa-solid fa-inbox" style="font-size: 3rem; margin-bottom: 0.75rem; opacity: 0.4; color: var(--accent-blue);"></i>
          <h4 style="font-size: 1.1rem; margin-bottom: 0.3rem;">Belum ada edaran ${App.activeNoticeServiceType} terdaftar</h4>
          <div style="font-size: 0.85rem;">Menunggu input peraturan baru untuk layanan <strong>${App.activeNoticeServiceType}</strong> melalui form di sebelah kiri.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const d = new Date(item.date);
      const dayNum = d.getDate();
      const monthYear = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

      let badgePriorityClass = "badge-info";
      if (item.priority === "Warning") badgePriorityClass = "badge-warning";
      if (item.priority === "Danger") badgePriorityClass = "badge-danger";

      const isDisabled = (item.status === "Disabled");

      let categoryCardClass = "card-umum";
      const catUpper = item.category.toUpperCase();
      if (catUpper.includes("HAPAG")) categoryCardClass = "card-hapag";
      else if (catUpper.includes("ONE")) categoryCardClass = "card-one";
      else if (catUpper.includes("SINOKOR")) categoryCardClass = "card-sinokor";
      else if (catUpper.includes("HEUNG")) categoryCardClass = "card-heung-a";
      else if (catUpper.includes("RCL")) categoryCardClass = "card-rcl";
      else if (catUpper.includes("SITC")) categoryCardClass = "card-sitc";
      else if (catUpper.includes("ZIM")) categoryCardClass = "card-zimline";

      return `
        <div class="news-card ${categoryCardClass} ${isDisabled ? 'disabled-notice' : ''}">
          <div class="news-date-badge">
            <div class="news-day">${dayNum}</div>
            <div class="news-month-year">${monthYear}</div>
          </div>
          <div class="news-content">
            <div class="news-meta">
              <span class="badge ${badgePriorityClass}">${item.priority}</span>
              <span class="badge badge-shipping-line">${item.category}</span>
              <span class="badge badge-info">${item.serviceType || 'EKSPOR'}</span>
              ${isDisabled ? `<span class="badge badge-muted">[NONAKTIF]</span>` : ''}
              <small style="color: var(--text-muted); font-size: 0.78rem; margin-left: auto;">${item.time} WIB | ${item.author}</small>
            </div>
            <div class="news-title">${item.title}</div>
            <div class="news-body">${item.body}</div>
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm btn-print-notice" data-id="${item.id}">
                <i class="fa-solid fa-file-pdf" style="color: #ef4444;"></i> Cetak PDF
              </button>
              <button class="btn btn-secondary btn-sm btn-toggle-notice-status" data-id="${item.id}">
                ${isDisabled 
                  ? `<i class="fa-solid fa-eye" style="color: #10b981;"></i> Aktifkan` 
                  : `<i class="fa-solid fa-eye-slash" style="color: #f59e0b;"></i> Sembunyikan`
                }
              </button>
              <button class="btn btn-secondary btn-sm btn-delete-notice" data-id="${item.id}" style="color: var(--status-danger);" title="Hapus Edaran Ini">
                <i class="fa-solid fa-trash-can"></i> Hapus
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const activeCount = operationalAnnouncements.filter(n => n.status !== "Disabled").length;
    document.getElementById('infoCountBadge').textContent = activeCount;
  },

  // Tariff Lift On / Lift Off Module with Per-Block Shipping Line Grid Cards
  setupLOLOTariffModule: function() {
    const btnLiftOff = document.getElementById('btnLoloTabLiftOff');
    const btnLiftOn = document.getElementById('btnLoloTabLiftOn');
    const btnToggleViewMode = document.getElementById('btnToggleLoloViewMode');
    const dropZone = document.getElementById('dropZoneLOLOExcel');
    const fileInput = document.getElementById('fileInputLOLOExcel');
    const filterLine = document.getElementById('filterLOLOLine');

    btnLiftOff.addEventListener('click', () => {
      App.activeLOLOTab = "LIFTOFF";
      btnLiftOff.className = "btn btn-primary lolo-subtab-btn active";
      btnLiftOff.style.background = "#ea580c";
      btnLiftOff.style.borderColor = "#c2410c";
      btnLiftOn.className = "btn btn-secondary lolo-subtab-btn";
      btnLiftOn.style.background = "";
      btnLiftOn.style.borderColor = "";

      document.getElementById('loloActiveTabTitleHeader').textContent = "TARIF LOLO PER 1 MEI 2026 - INFORMASI HARGA LIFT OFF";
      document.getElementById('loloPriceTableHeader').textContent = "Harga Tarif Lift Off (Per 1 Mei 2026)";
      App.renderLOLOTariffs();
    });

    btnLiftOn.addEventListener('click', () => {
      App.activeLOLOTab = "LIFTON";
      btnLiftOn.className = "btn btn-primary lolo-subtab-btn active";
      btnLiftOn.style.background = "#16a34a";
      btnLiftOn.style.borderColor = "#15803d";
      btnLiftOff.className = "btn btn-secondary lolo-subtab-btn";
      btnLiftOff.style.background = "";
      btnLiftOff.style.borderColor = "";

      document.getElementById('loloActiveTabTitleHeader').textContent = "TARIF LOLO PER 20 APRIL 2026 - INFORMASI HARGA LIFT ON";
      document.getElementById('loloPriceTableHeader').textContent = "Harga Tarif Lift On (Per 20 April 2026)";
      App.renderLOLOTariffs();
    });

    // Toggle View Mode (Block Grid vs Table)
    btnToggleViewMode.addEventListener('click', () => {
      if (App.activeLOLOViewMode === "BLOCK") {
        App.activeLOLOViewMode = "TABLE";
        btnToggleViewMode.innerHTML = `<i class="fa-solid fa-table-cells-large"></i> Switch Ke Tampilan Blok Kotak Excel`;
        document.getElementById('loloBlockGridContainer').style.display = "none";
        document.getElementById('loloTableWrapper').style.display = "block";
      } else {
        App.activeLOLOViewMode = "BLOCK";
        btnToggleViewMode.innerHTML = `<i class="fa-solid fa-list-check"></i> Switch Ke Tampilan Tabel List`;
        document.getElementById('loloBlockGridContainer').style.display = "grid";
        document.getElementById('loloTableWrapper').style.display = "none";
      }
      App.renderLOLOTariffs();
    });

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        ExcelParser.parseLOLOTariffFile(files[0], App.onLOLOExcelParsed);
      }
    });

    const btnToggleUpload = document.getElementById('btnToggleLOLOExcelUpload');
    const iconToggle = document.getElementById('iconToggleLOLOUpload');
    const textToggle = document.getElementById('textToggleLOLOUpload');

    const updateUploadPanelState = (isMinimized) => {
      if (isMinimized) {
        dropZone.style.display = 'none';
        if (iconToggle) iconToggle.className = 'fa-solid fa-chevron-down';
        if (textToggle) textToggle.textContent = 'Expand Panel Upload';
        if (btnToggleUpload) btnToggleUpload.className = 'btn btn-primary btn-sm';
      } else {
        dropZone.style.display = 'block';
        if (iconToggle) iconToggle.className = 'fa-solid fa-chevron-up';
        if (textToggle) textToggle.textContent = 'Minimize Panel';
        if (btnToggleUpload) btnToggleUpload.className = 'btn btn-secondary btn-sm';
      }
    };

    // Restore saved state (default true / minimized)
    const isSavedMinimized = localStorage.getItem('portgate_lolo_excel_upload_minimized') !== 'false';
    updateUploadPanelState(isSavedMinimized);

    if (btnToggleUpload) {
      btnToggleUpload.addEventListener('click', () => {
        const isCurrentlyHidden = dropZone.style.display === 'none';
        const newState = !isCurrentlyHidden;
        localStorage.setItem('portgate_lolo_excel_upload_minimized', newState ? 'true' : 'false');
        updateUploadPanelState(newState);
      });
    }

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        ExcelParser.parseLOLOTariffFile(e.target.files[0], App.onLOLOExcelParsed);
      }
    });

    document.getElementById('btnDownloadLOLOExcelTemplate').addEventListener('click', () => {
      ExcelParser.downloadLOLOTemplate();
    });

    filterLine.addEventListener('change', (e) => {
      App.activeLOLOFilter = e.target.value;
      App.renderLOLOTariffs();
    });
  },

  onLOLOExcelParsed: function(newTariffs) {
    newTariffs.forEach(nt => {
      let existingIndex = loloTariffData.findIndex(t => t.shippingLine === nt.shippingLine && t.sizeType === nt.sizeType);
      if (existingIndex >= 0) {
        if (nt.liftOn > 0) loloTariffData[existingIndex].liftOn = nt.liftOn;
        if (nt.liftOff > 0) loloTariffData[existingIndex].liftOff = nt.liftOff;
      } else {
        loloTariffData.push(nt);
      }
    });

    App.renderLOLOTariffs();
    App.updateKPIs();
    alert(`🎉 Berhasil membaca & memperbarui data harga tarif per-block pelayaran dari file Excel!`);
  },

  renderLOLOTariffs: function(searchTerm = "") {
    App.renderLOLOBlockGrid(searchTerm);
    App.renderLOLOTariffTable(searchTerm);
  },

  // Render Per-Block Shipping Line Colorful Grid Cards (Matches User Excel Screenshot Layout 100%)
  renderLOLOBlockGrid: function(searchTerm = "") {
    const gridContainer = document.getElementById('loloBlockGridContainer');
    if (!gridContainer) return;

    const isLiftOff = (App.activeLOLOTab === "LIFTOFF");
    const formatRp = (num) => {
      if (!num || num === 0) return "-";
      return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
    };

    // Group tariffs by shipping line
    const shippingLineMap = {};
    loloTariffData.forEach(item => {
      if (!shippingLineMap[item.shippingLine]) {
        shippingLineMap[item.shippingLine] = {};
      }
      shippingLineMap[item.shippingLine][item.sizeType] = item;
    });

    // List of lines to render
    let linesList = Object.keys(shippingLineMap);
    if (App.activeLOLOFilter) {
      linesList = linesList.filter(l => l === App.activeLOLOFilter);
    }
    if (searchTerm) {
      linesList = linesList.filter(l => l.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (linesList.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
          Tidak ada blok pelayaran yang cocok dengan pencarian/filter.
        </div>
      `;
      return;
    }

    // Map Header CSS class per Brand
    const getHeaderClass = (lineName) => {
      const u = lineName.toUpperCase();
      if (u.includes("HYUNDAI")) return "header-hyundai";
      if (u.includes("HAPAG")) return "header-hapag";
      if (u.includes("SINOKOR")) return "header-sinokor";
      if (u.includes("HEUNG")) return "header-heung-a";
      if (u.includes("RCL")) return "header-rcl";
      if (u.includes("WAN")) return "header-wan-hai";
      if (u.includes("SITC")) return "header-sitc";
      if (u.includes("STAR")) return "header-star-shipping";
      if (u.includes("ONE")) return "header-one";
      return "header-zimline";
    };

    gridContainer.innerHTML = linesList.map(lineName => {
      const headerClass = getHeaderClass(lineName);
      const data20 = shippingLineMap[lineName]["20 FT"] || shippingLineMap[lineName]["20GP"] || {};
      const data40 = shippingLineMap[lineName]["40 FT"] || shippingLineMap[lineName]["40HC"] || {};

      const price20 = isLiftOff ? data20.liftOff : data20.liftOn;
      const price40 = isLiftOff ? data40.liftOff : data40.liftOn;

      const valColor = isLiftOff ? "#f97316" : "#10b981";

      return `
        <div class="shipping-block-card">
          <div class="block-header ${headerClass}">
            ${lineName}
          </div>
          <div class="block-body-grid">
            <div class="block-subhead">20 FT</div>
            <div class="block-subhead">40 FT</div>
            <div class="block-price-val" style="color: ${valColor};">${formatRp(price20)}</div>
            <div class="block-price-val" style="color: ${valColor};">${formatRp(price40)}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderLOLOTariffTable: function(searchTerm = "") {
    const tbody = document.getElementById('tbodyLOLOTariffs');
    if (!tbody) return;

    let filtered = loloTariffData.filter(item => {
      const matchLine = !App.activeLOLOFilter || item.shippingLine === App.activeLOLOFilter;
      const matchSearch = !searchTerm ||
        item.shippingLine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sizeType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchTerm.toLowerCase());
      return matchLine && matchSearch;
    });

    const formatRp = (num) => {
      if (!num || num === 0) return `<span style="color: var(--text-muted);">-</span>`;
      return "Rp " + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
    };

    const isLiftOff = (App.activeLOLOTab === "LIFTOFF");

    tbody.innerHTML = filtered.map(item => {
      const displayPrice = isLiftOff ? item.liftOff : item.liftOn;
      const priceColor = isLiftOff ? "#ea580c" : "#16a34a";
      const dateTag = isLiftOff ? "Per 1 Mei 2026" : "Per 20 April 2026";

      return `
        <tr>
          <td><span class="badge badge-shipping-line">${item.shippingLine}</span></td>
          <td><strong style="font-size: 0.9rem;">${item.sizeType}</strong></td>
          <td><strong style="color: ${priceColor}; font-size: 1rem;">${formatRp(displayPrice)}</strong></td>
          <td>
            <span class="badge badge-info" style="margin-right: 0.35rem;">${dateTag}</span>
            <small style="color: var(--text-muted);">${item.notes}</small>
          </td>
        </tr>
      `;
    }).join('');
  },

  openNoticePrintModal: function(noticeId) {
    const notice = operationalAnnouncements.find(n => n.id === noticeId);
    if (!notice) return;

    App.currentActiveNoticeId = noticeId;

    const settings = App.getSettings();
    const companyName = settings.companyName || "PT DELTA KONTAINER DEPOT";
    const userName = settings.userNameGate || "RIDWAN";
    const userTitle = settings.userTitle || "Gate Operasional";
    const logoUrl = settings.logoUrl || "";
    const stampUrl = settings.stampUrl || "";
    const signatureUrl = settings.signatureUrl || "";

    const dateFormatted = (typeof SKCRModule !== 'undefined' && SKCRModule.formatIndonesianDateStr)
      ? SKCRModule.formatIndonesianDateStr(notice.date)
      : notice.date;

    const modalContent = `
      <div class="notice-official-document">
        <div class="skcr-header-letterhead">
          <div class="skcr-letterhead-left">
            ${logoUrl ? `<img src="${logoUrl}" class="skcr-company-logo" alt="Logo Perusahaan">` : ''}
            <div>
              <div class="skcr-company-title">${companyName}</div>
              <div class="skcr-company-sub">CONTAINER DEPOT & GATE LOGISTICS TERMINAL SERVICES</div>
              <div class="skcr-company-address">Jl. Madya Kebantenan No. 8, Semper Timur, Cilincing Jakarta</div>
              <div class="skcr-company-contact">Phone : +62 21 21485050 &nbsp;|&nbsp; Fax : +62 21 21485532</div>
            </div>
          </div>
          <div class="skcr-letterhead-right">
            <div>Edaran Resmi Operations</div>
            <div>Ref: ${notice.id}</div>
          </div>
        </div>

        <div class="skcr-official-title">
          <h2>SURAT EDARAN & PERATURAN OPERASIONAL (${notice.serviceType || 'EKSPOR'})</h2>
          <div class="doc-num">Kategori Pelayaran: <strong>${notice.category}</strong></div>
        </div>

        <table class="skcr-field-table" style="margin-bottom: 1rem;">
          <tr>
            <td class="skcr-field-label">Tanggal Publikasi</td>
            <td class="skcr-field-colon">:</td>
            <td><strong>${dateFormatted} | ${notice.time} WIB</strong></td>
          </tr>
          <tr>
            <td class="skcr-field-label">Penerbit Edaran</td>
            <td class="skcr-field-colon">:</td>
            <td><strong>${notice.author}</strong></td>
          </tr>
          <tr>
            <td class="skcr-field-label">Subjek / Judul</td>
            <td class="skcr-field-colon">:</td>
            <td><strong style="text-decoration: underline;">${notice.title}</strong></td>
          </tr>
        </table>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 1.25rem; border-radius: 8px; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; text-align: justify; white-space: pre-line;">
          ${notice.body}
        </div>

        <div class="skcr-closing-statement">
          Demikian surat edaran dan instruksi operasional pelayaran <strong>${notice.category} (${notice.serviceType || 'EKSPOR'})</strong> ini disampaikan untuk dipatuhi oleh seluruh anggota gate, petugas depo, serta pengemudi armada logistik.
        </div>

        <div class="skcr-signature-block">
          <div class="skcr-sig-right">
            <div class="skcr-sig-city-date">Jakarta, ${dateFormatted}</div>
            <div class="skcr-sig-company">${companyName}</div>

            <div class="skcr-stamp-signature-wrapper">
              ${stampUrl ? `<img src="${stampUrl}" class="skcr-stamp-img" alt="Stempel Perusahaan">` : `
                <div style="position: absolute; border: 2px dashed #9ca3af; padding: 0.35rem; font-size: 0.68rem; color: #6b7280; transform: rotate(-5deg);">
                  [ STEMPEL PERUSAHAAN ]
                </div>
              `}

              ${signatureUrl ? `<img src="${signatureUrl}" class="skcr-signature-img" alt="Tanda Tangan Digital">` : `
                <div style="z-index: 2; font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.8rem; color: #1e3a8a;">
                  ${userName}
                </div>
              `}
            </div>

            <div class="skcr-sig-person-name">${userName.toUpperCase()}</div>
            <div class="skcr-sig-person-title">${userTitle}</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modalBodyNotice').innerHTML = modalContent;
    App.openModal('noticePrintModal');
  },

  printNoticeDocument: function() {
    const originalTitle = document.title;
    const notice = operationalAnnouncements.find(n => n.id === App.currentActiveNoticeId);

    let customFileName = "Surat_Edaran_Pelayaran";
    if (notice) {
      const catClean = (notice.category || 'UMUM').replace(/[^a-zA-Z0-9]/g, '_');
      customFileName = `Surat_Edaran_${notice.serviceType || 'EKSPOR'}_${catClean}_${notice.id}_${notice.date}`;
    }

    document.title = customFileName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  },

  getFormattedHandoverText: function(handoverId) {
    const log = shiftHandoverLogs.find(l => l.id === handoverId);
    if (!log) return "";

    const formattedDate = (typeof SKCRModule !== 'undefined' && SKCRModule.formatIndonesianDateStr)
      ? SKCRModule.formatIndonesianDateStr(log.date)
      : log.date;

    return `📋 *LAPORAN SERAH TERIMA SHIFT GATE*
🏢 *PT DELTA KONTAINER DEPOT*
📅 *Tanggal:* ${formattedDate}

🔄 *Pergantian Shift:* ${log.shiftFrom} ➔ ${log.shiftTo}
👤 *Supervisor / Petugas:* ${log.supervisor}
🚦 *Keterangan Kondisi & Alat:* ${log.gateCondition}
📦 *Container Hold / Pending:* ${log.pendingContainers}

📝 *Catatan Khusus Operasional:*
${log.generalNotes}
${log.responseText ? `
💬 *Tanggapan / Respon Shift:*
_"${log.responseText}"_
(Direspon oleh ${log.respondedBy} pada ${log.respondedAtDate || log.date} pukul ${log.respondedAtTime || log.respondedAt})
` : ''}
---
_Diposting via Terminal System Gate Officer Operasional_`;
  },

  shareHandoverToWA: function(handoverId) {
    const messageText = App.getFormattedHandoverText(handoverId);
    if (!messageText) return;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
  },

  copyHandoverToClipboard: function(handoverId) {
    const messageText = App.getFormattedHandoverText(handoverId);
    if (!messageText) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(messageText).then(() => {
        alert("✅ Format Laporan Serah Terima Shift berhasil disalin ke Clipboard!\n\nAnda dapat langsung meletakkan (Paste / Ctrl+V) di grup WhatsApp.");
      }).catch(() => {
        App.fallbackCopyText(messageText);
      });
    } else {
      App.fallbackCopyText(messageText);
    }
  },

  fallbackCopyText: function(text) {
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    alert("✅ Format Laporan Serah Terima Shift berhasil disalin ke Clipboard!\n\nAnda dapat langsung meletakkan (Paste / Ctrl+V) di grup WhatsApp.");
  },

  setupHandoverModule: function() {
    document.getElementById('btnOpenHandoverModal').addEventListener('click', () => {
      App.openModal('handoverModal');
    });

    document.getElementById('tbodyHandover').addEventListener('click', (e) => {
      const btnWA = e.target.closest('.btn-share-wa-handover');
      const btnCopy = e.target.closest('.btn-copy-wa-handover');
      const btnRespond = e.target.closest('.btn-respond-handover');

      if (btnWA) {
        const hId = btnWA.getAttribute('data-id');
        App.shareHandoverToWA(hId);
      }

      if (btnCopy) {
        const hId = btnCopy.getAttribute('data-id');
        App.copyHandoverToClipboard(hId);
      }

      if (btnRespond) {
        const hId = btnRespond.getAttribute('data-id');
        const logIndex = shiftHandoverLogs.findIndex(l => l.id === hId);
        if (logIndex >= 0) {
          const log = shiftHandoverLogs[logIndex];
          
          // Prompt 1: Get Officer's Name
          const defaultName = log.respondedBy || App.getSettings().userNameGate || "RIDWAN";
          const officerName = prompt("Masukkan NAMA PETUGAS yang merespon serah terima ini:", defaultName);
          if (officerName !== null && officerName.trim() !== "") {
            
            // Prompt 2: Get Response/Acknowledge text
            const defaultVal = log.responseText || "Diterima & Sesuai";
            const userResp = prompt(`Masukkan tanggapan/konfirmasi dari ${officerName.trim().toUpperCase()} (misal: 'Diterima & Sesuai' atau 'Diterima, printer sudah IT perbaiki'):`, defaultVal);
            
            if (userResp !== null) {
              log.respondedBy = officerName.trim().toUpperCase();
              log.responseText = userResp.trim();
              
              // Generate Current local Date and Time in WIB / Jakarta
              const now = new Date();
              const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
              const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
              
              log.respondedAtDate = dateStr;
              log.respondedAtTime = timeStr;
              log.respondedAt = timeStr; // Legacy fallback

              App.saveHandoverToStorage();
              SupabaseDB.saveHandover(log);
              App.renderHandoverTable();
              alert("✅ Tanggapan serah terima berhasil disimpan & ter-sync realtime!");
            }
          }
        }
      }
    });

    document.getElementById('formAddHandover').addEventListener('submit', (e) => {
      e.preventDefault();

      const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      const newLog = {
        id: `LOG-${Date.now()}`,
        date: getLocalDate(),
        shiftFrom: document.getElementById('hoShiftFrom').value,
        shiftTo: document.getElementById('hoShiftTo').value,
        supervisor: document.getElementById('hoSupervisor').value,
        gateCondition: document.getElementById('hoGateCondition').value,
        pendingContainers: document.getElementById('hoPendingContainers').value || "-",
        generalNotes: document.getElementById('hoGeneralNotes').value || "-"
      };

      shiftHandoverLogs.unshift(newLog);
      App.saveHandoverToStorage();
      SupabaseDB.saveHandover(newLog);

      document.getElementById('formAddHandover').reset();
      App.closeModal('handoverModal');

      App.renderHandoverTable();
      alert(`Catatan Serah Terima Shift (${newLog.shiftFrom} -> ${newLog.shiftTo}) berhasil disimpan & ter-sync realtime!`);
    });
  },

  renderHandoverTable: function() {
    const tbody = document.getElementById('tbodyHandover');
    if (!tbody) return;
    tbody.innerHTML = shiftHandoverLogs.map(log => `
      <tr>
        <td style="white-space: nowrap;"><strong>${App.escapeHTML(log.date)}</strong></td>
        <td style="white-space: nowrap;"><span class="badge badge-info">${App.escapeHTML(log.shiftFrom)}</span> &rarr; <span class="badge badge-success">${App.escapeHTML(log.shiftTo)}</span></td>
        <td style="white-space: nowrap;"><strong>${App.escapeHTML(log.supervisor)}</strong></td>
        <td>${App.escapeHTML(log.gateCondition)}</td>
        <td style="white-space: nowrap;"><strong style="color: var(--status-danger);">${App.escapeHTML(log.pendingContainers)}</strong></td>
        <td>
          <div>${App.escapeHTML(log.generalNotes)}</div>
          ${log.responseText ? `
            <div style="margin-top: 0.5rem; padding: 0.4rem 0.6rem; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 6px; font-size: 0.76rem; color: var(--text-main);">
              <div style="font-weight: 700; color: #059669; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.15rem;">
                <i class="fa-solid fa-reply"></i> Respon oleh ${App.escapeHTML(log.respondedBy)} (${App.escapeHTML(log.respondedAtDate || log.date)} pukul ${App.escapeHTML(log.respondedAtTime || log.respondedAt)}):
              </div>
              <div style="font-style: italic;">"${App.escapeHTML(log.responseText)}"</div>
            </div>
          ` : ''}
        </td>
        <td style="white-space: nowrap; text-align: center;">
          <div style="display: flex; gap: 0.3rem; justify-content: center; align-items: center;">
            <button class="btn btn-primary btn-sm btn-respond-handover" data-id="${log.id}" style="padding: 0.25rem 0.5rem; font-size: 0.73rem; background: var(--accent-blue);" title="Tulis Tanggapan / Konfirmasi Serah Terima">
              <i class="fa-solid fa-comment-dots"></i> ${log.responseText ? 'Edit' : 'Respon'}
            </button>
            <button class="btn btn-success btn-sm btn-share-wa-handover" data-id="${log.id}" style="padding: 0.25rem 0.5rem; font-size: 0.73rem; background-color: #25D366; border-color: #25D366; color: white;" title="Buka Langsung WhatsApp">
              <i class="fa-brands fa-whatsapp"></i> Kirim WA
            </button>
            <button class="btn btn-secondary btn-sm btn-copy-wa-handover" data-id="${log.id}" style="padding: 0.25rem 0.5rem; font-size: 0.73rem;" title="Salin Teks Format WA ke Clipboard">
              <i class="fa-solid fa-copy"></i> Salin
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  setupUserGuideModule: function() {
    const userSelect = document.getElementById('userDutySelect');
    if (!userSelect) return;

    userSelect.value = localStorage.getItem('portgate_active_user') || App.settings.userNameGate || "RIDWAN";

    userSelect.addEventListener('change', (e) => {
      const selectedUser = e.target.value;
      localStorage.setItem('portgate_active_user', selectedUser);
      App.settings.userNameGate = selectedUser;
      App.saveSettings({ userNameGate: selectedUser });

      document.getElementById('skcrUserNameGate').value = selectedUser;

      App.updateUserProfileDisplay();
      alert(`Profil petugas aktif berhasil diubah ke ${selectedUser}!`);
    });

    App.updateUserProfileDisplay();
  },

  updateUserProfileDisplay: function() {
    const nameEl = document.getElementById('userProfileNameDisplay');
    const titleEl = document.getElementById('userProfileTitleDisplay');
    const companyEl = document.getElementById('userProfileCompanyDisplay');

    if (nameEl) nameEl.textContent = App.settings.userNameGate || "RIDWAN ALAMSYAH";
    if (titleEl) titleEl.textContent = App.settings.userTitle || "Gate Operasional";
    if (companyEl) companyEl.textContent = App.settings.companyName || "PT DELTA KONTAINER DEPOT";
  },

  setupGlobalSearch: function() {
    const searchInput = document.getElementById('globalContainerSearch');
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.trim();
      App.renderSKCRTable(term);
      App.renderMatrixScheduleTable(term);
      App.renderLOLOTariffs(term);
    });
  },

  updateKPIs: function() {
    document.getElementById('kpiTotalSKCR').textContent = skcrData.length;
    document.getElementById('kpiGateDuty').textContent = matrixRosterData.length;
    const activeNotices = operationalAnnouncements.filter(n => n.status !== "Disabled").length;
    document.getElementById('kpiActiveNotices').textContent = activeNotices;

    const infoBadge = document.getElementById('infoCountBadge');
    if (infoBadge) infoBadge.textContent = activeNotices;

    document.getElementById('kpiTotalLOLORates').textContent = loloTariffData.length;
  },

  renderAll: function() {
    App.renderSKCRTable();
    App.updateStaffFilterOptions();
    App.updateMonthFilterOptions();
    App.renderMatrixScheduleTable();
    App.renderNoticeFeed();
    App.renderLOLOTariffs();
    App.renderHandoverTable();
    App.updateUserProfileDisplay();
    App.updateKPIs();
  }
};

window.App = App;
