/* ==========================================================================
   PortGate / Gate Officer Delta - Supabase Cloud Database Module
   Handles real-time cloud data sync across all online devices/phones.
   ========================================================================== */

const SupabaseDB = {
  // Pre-configured Supabase Credentials
  url: localStorage.getItem('portgate_supabase_url') || 'https://seiscumgtgjxaimaaegp.supabase.co',
  key: localStorage.getItem('portgate_supabase_key') || 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk',
  client: null,
  isConfigured: false,

  init: function() {
    const activeUrl = SupabaseDB.url || localStorage.getItem('portgate_supabase_url') || 'https://seiscumgtgjxaimaaegp.supabase.co';
    const activeKey = SupabaseDB.key || localStorage.getItem('portgate_supabase_key') || 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk';

    if (typeof supabase !== 'undefined' && activeUrl && activeKey) {
      try {
        SupabaseDB.client = supabase.createClient(activeUrl, activeKey);
        SupabaseDB.isConfigured = true;
        console.log("⚡ Supabase Cloud Database Connected Successfully!");
        SupabaseDB.subscribeToRealtimeChanges();
      } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
        SupabaseDB.isConfigured = false;
      }
    } else {
      console.log("ℹ️ Supabase credentials pending key entry.");
    }
  },

  setCredentials: function(url, key) {
    SupabaseDB.url = url.trim() || 'https://seiscumgtgjxaimaaegp.supabase.co';
    SupabaseDB.key = key.trim() || 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk';
    localStorage.setItem('portgate_supabase_url', SupabaseDB.url);
    localStorage.setItem('portgate_supabase_key', SupabaseDB.key);

    if (SupabaseDB.url && SupabaseDB.key) {
      SupabaseDB.init();
      if (SupabaseDB.isConfigured) {
        SupabaseDB.syncAllFromCloud();
      }
    }
  },

  // Save Roster Schedule Matrix to Cloud
  saveRoster: async function(dates, roster) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const payload = {
        id: 'latest_roster',
        dates: dates,
        roster: roster,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await SupabaseDB.client
        .from('gate_roster')
        .upsert(payload, { onConflict: 'id' });

      if (error) console.error("Error saving roster to Supabase:", error);
      else console.log("☁️ Roster schedule synced to Supabase Cloud!");
    } catch(e) {
      console.error("Supabase Roster Save Exception:", e);
    }
  },

  resetRosterToDefault: async function() {
    if (!SupabaseDB.isConfigured) return;
    try {
      const defaultDates = [
        "27-Jul","28-Jul","29-Jul","30-Jul","31-Jul","01-Aug","02-Aug","03-Aug","04-Aug","05-Aug",
        "06-Aug","07-Aug","08-Aug","09-Aug","10-Aug","11-Aug","12-Aug","13-Aug","14-Aug","15-Aug",
        "16-Aug","17-Aug","18-Aug","19-Aug","20-Aug","21-Aug","22-Aug","23-Aug","24-Aug","25-Aug",
        "26-Aug","27-Aug","28-Aug","29-Aug","30-Aug","31-Aug","01-Sep","02-Sep","03-Sep","04-Sep",
        "05-Sep","06-Sep","07-Sep","08-Sep","09-Sep","10-Sep","11-Sep","12-Sep","13-Sep","14-Sep",
        "15-Sep","16-Sep","17-Sep","18-Sep","19-Sep","20-Sep","21-Sep","22-Sep","23-Sep","24-Sep",
        "25-Sep","26-Sep","27-Sep","28-Sep","29-Sep","30-Sep","01-Oct","02-Oct","03-Oct","04-Oct",
        "05-Oct","06-Oct","07-Oct","08-Oct","09-Oct","10-Oct","11-Oct","12-Oct","13-Oct","14-Oct",
        "15-Oct","16-Oct","17-Oct","18-Oct","19-Oct","20-Oct","21-Oct","22-Oct","23-Oct","24-Oct",
        "25-Oct","26-Oct","27-Oct","28-Oct","29-Oct","30-Oct","31-Oct","01-Nov","02-Nov","03-Nov",
        "04-Nov","05-Nov","06-Nov","07-Nov","08-Nov","09-Nov","10-Nov","11-Nov","12-Nov","13-Nov",
        "14-Nov","15-Nov","16-Nov","17-Nov","18-Nov","19-Nov","20-Nov","21-Nov","22-Nov","23-Nov",
        "24-Nov","25-Nov","26-Nov","27-Nov","28-Nov","29-Nov","30-Nov","01-Dec","02-Dec","03-Dec",
        "04-Dec","05-Dec","06-Dec","07-Dec","08-Dec","09-Dec","10-Dec","11-Dec","12-Dec","13-Dec"
      ];

      const defaultRoster = typeof OFFICIAL_WEEKLY_SHIFTS !== 'undefined'
        ? Object.keys(OFFICIAL_WEEKLY_SHIFTS).map(name => ({
            name: name,
            shifts: generateFullRosterShifts(name)
          }))
        : [];

      const payload = {
        id: 'latest_roster',
        dates: defaultDates,
        roster: defaultRoster,
        updated_at: new Date().toISOString()
      };

      await SupabaseDB.client.from('gate_roster').upsert(payload, { onConflict: 'id' });
      console.log("☁️ Supabase Cloud Roster Reset to Default (27-Jul start)!");
    } catch(e) {
      console.error("Error resetting Supabase Roster:", e);
    }
  },

  // Load Roster Schedule Matrix from Cloud
  loadRoster: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_roster')
        .select('*')
        .eq('id', 'latest_roster')
        .single();

      if (error) {
        console.error("Error fetching roster from Supabase:", error);
        return null;
      }

      if (data && data.dates && data.dates[0] === "26-Jul") {
        console.warn("🔧 Stripping legacy 26-Jul start date from Supabase Cloud roster data...");
        data.dates.shift();
        if (data.roster && Array.isArray(data.roster)) {
          data.roster.forEach(r => {
            if (r.shifts && r.shifts["26-Jul"]) delete r.shifts["26-Jul"];
          });
        }
      }

      return data;
    } catch(e) {
      console.error("Supabase Roster Fetch Exception:", e);
      return null;
    }
  },

  // Sync SKCR Records
  saveSKCR: async function(skcrRecord) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const payload = {
        id: skcrRecord.id,
        date: skcrRecord.date || getLocalDate(),
        containers: skcrRecord.containers || [skcrRecord.containerNo || 'SNKO8923410'],
        consignee: skcrRecord.consignee || skcrRecord.shippingLine || 'PT DELTA KONTAINER',
        shippingline: skcrRecord.shippingLine || 'HAPAG',
        sizetype: skcrRecord.sizeType || '40ft High Cube (40HC)',
        vesselvoyage: skcrRecord.vesselVoyage || '-',
        usernamegate: skcrRecord.userNameGate || 'RIDWAN',
        companyname: skcrRecord.companyName || 'PT DELTA KONTAINER DEPOT',
        usertitle: skcrRecord.userTitle || 'Gate Operasional',
        containercount: skcrRecord.containerCount || (skcrRecord.containers ? skcrRecord.containers.length : 1),
        primarycontainer: skcrRecord.primaryContainer || (skcrRecord.containers ? skcrRecord.containers[0] : 'SNKO8923410')
      };
      const { data, error } = await SupabaseDB.client
        .from('gate_skcr')
        .upsert(payload, { onConflict: 'id' });

      if (error) console.error("Error saving SKCR to Supabase:", error);
      else console.log("☁️ SKCR Record synced to Supabase Cloud!");
    } catch(e) {
      console.error("Supabase SKCR Save Exception:", e);
    }
  },

  deleteSKCR: async function(skcrId) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const { error } = await SupabaseDB.client
        .from('gate_skcr')
        .delete()
        .eq('id', skcrId);

      if (error) console.error("Error deleting SKCR from Supabase:", error);
    } catch(e) {
      console.error("Supabase SKCR Delete Exception:", e);
    }
  },

  loadAllSKCR: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const { data, error } = await SupabaseDB.client
        .from('gate_skcr')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return null;
      return data.map(item => ({
        id: item.id,
        date: item.date || getLocalDate(),
        containers: item.containers || [item.containerno || 'SNKO8923410'],
        containerNo: item.containerno || (item.containers ? item.containers[0] : 'SNKO8923410'),
        consignee: item.consignee || 'PT GLOBAL CARGO LOGISTICS',
        shippingLine: item.shippingline || item.shippingLine || item.consignee || 'HAPAG',
        sizeType: item.sizetype || item.sizeType || '40ft High Cube (40HC)',
        vesselVoyage: item.vesselvoyage || item.vesselVoyage || '-',
        userNameGate: item.usernamegate || item.userNameGate || 'RIDWAN',
        companyName: item.companyname || item.companyName || 'PT DELTA KONTAINER DEPOT',
        userTitle: item.usertitle || item.userTitle || 'Gate Operasional',
        containerCount: item.containercount || item.containerCount || (item.containers ? item.containers.length : 1),
        primaryContainer: item.primarycontainer || item.primaryContainer || (item.containers ? item.containers[0] : 'SNKO8923410')
      }));
    } catch(e) {
      return null;
    }
  },

  // Sync Operational Notices / Peraturan
  saveNotice: async function(noticeRecord) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const payload = {
        id: noticeRecord.id,
        date: noticeRecord.date || new Date().toISOString().split('T')[0],
        time: noticeRecord.time || "08:00",
        title: noticeRecord.title || "",
        category: noticeRecord.category || "UMUM",
        priority: noticeRecord.priority || "Info",
        author: noticeRecord.author || "Gate Ops",
        body: noticeRecord.body || "",
        status: noticeRecord.status || "Active"
      };
      const { data, error } = await SupabaseDB.client
        .from('gate_notices')
        .upsert(payload, { onConflict: 'id' });

      if (error) console.error("Error saving notice to Supabase:", error);
      else console.log("☁️ Notice synced to Supabase Cloud!");
    } catch(e) {
      console.error("Supabase Notice Save Exception:", e);
    }
  },

  deleteNotice: async function(noticeId) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const { error } = await SupabaseDB.client
        .from('gate_notices')
        .delete()
        .eq('id', noticeId);

      if (error) console.error("Error deleting notice from Supabase:", error);
    } catch(e) {
      console.error("Supabase Notice Delete Exception:", e);
    }
  },

  loadAllNotices: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_notices')
        .select('*')
        .order('date', { ascending: false });

      if (error) return null;
      return data;
    } catch(e) {
      return null;
    }
  },

  // Sync App Settings (Logo, Stamp, Signature, Profile, Marquee)
  saveSettings: async function(settingsPayload) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const payload = {
        id: 'global_settings',
        user_name_gate: settingsPayload.userNameGate || '',
        company_name: settingsPayload.companyName || '',
        user_title: settingsPayload.userTitle || '',
        logo_url: settingsPayload.logoUrl || '',
        stamp_url: settingsPayload.stampUrl || '',
        signature_url: settingsPayload.signatureUrl || '',
        marquee_text: settingsPayload.marqueeText || '',
        marquee_active: settingsPayload.marqueeActive !== undefined ? settingsPayload.marqueeActive : true,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await SupabaseDB.client
        .from('gate_settings')
        .upsert(payload, { onConflict: 'id' });

      if (error) console.error("Error saving settings to Supabase:", error);
      else console.log("☁️ Global Settings & Branding synced to Supabase Cloud!");
    } catch(e) {
      console.error("Supabase Settings Save Exception:", e);
    }
  },

  loadSettings: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_settings')
        .select('*')
        .eq('id', 'global_settings')
        .single();

      if (error) return null;
      return {
        userNameGate: data.user_name_gate,
        companyName: data.company_name,
        userTitle: data.user_title,
        logoUrl: data.logo_url,
        stampUrl: data.stamp_url,
        signatureUrl: data.signature_url,
        marqueeText: data.marquee_text,
        marqueeActive: data.marquee_active
      };
    } catch(e) {
      return null;
    }
  },

  // Sync Shift Handover Logs
  saveHandover: async function(logRecord) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const payloadObj = {
        id: logRecord.id,
        date: logRecord.date || new Date().toISOString().split('T')[0],
        payload: logRecord,
        created_at: new Date().toISOString()
      };
      const { error } = await SupabaseDB.client
        .from('gate_handover')
        .upsert(payloadObj, { onConflict: 'id' });

      if (error) console.error("Error saving handover log to Supabase:", error);
      else console.log("☁️ Handover Log synced to Supabase Cloud!");
    } catch(e) {
      console.error("Supabase Handover Save Exception:", e);
    }
  },

  loadAllHandovers: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_handover')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return null;
      return data.map(item => item.payload || item);
    } catch(e) {
      return null;
    }
  },

  // Real-time Subscriptions across all online devices/phones
  subscribeToRealtimeChanges: function() {
    if (!SupabaseDB.isConfigured || !SupabaseDB.client) return;

    // Listen to changes in gate_roster
    SupabaseDB.client
      .channel('public:gate_roster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_roster' }, payload => {
        console.log('🔄 Live Realtime Roster Update Received:', payload);
        if (payload.new && payload.new.dates && payload.new.roster) {
          if (payload.new.dates[0] === "26-Jul") {
            payload.new.dates.shift();
            if (payload.new.roster && Array.isArray(payload.new.roster)) {
              payload.new.roster.forEach(r => {
                if (r.shifts && r.shifts["26-Jul"]) delete r.shifts["26-Jul"];
              });
            }
          }
          matrixDatesList = payload.new.dates;
          matrixRosterData = payload.new.roster;

          try {
            localStorage.setItem('portgate_matrix_roster', JSON.stringify({
              dates: matrixDatesList,
              roster: matrixRosterData,
              timestamp: Date.now()
            }));
          } catch(e) {
            console.error("Failed to update local storage on roster realtime event:", e);
          }

          if (window.App) {
            App.updateStaffFilterOptions();
            App.updateMonthFilterOptions();
            App.renderMatrixScheduleTable();
            App.updateKPIs();
          }
        }
      })
      .subscribe();

    // Listen to changes in gate_skcr
    SupabaseDB.client
      .channel('public:gate_skcr')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_skcr' }, async payload => {
        console.log('🔄 Live Realtime SKCR Event Received:', payload);
        const cloudSKCR = await SupabaseDB.loadAllSKCR();
        if (Array.isArray(cloudSKCR) && window.App) {
          skcrData = cloudSKCR;
          try {
            localStorage.setItem('portgate_skcr_data', JSON.stringify(skcrData));
          } catch(e) {}
          App.renderSKCRTable();
          App.updateKPIs();
        }
      })
      .subscribe();

    // Listen to changes in gate_notices
    SupabaseDB.client
      .channel('public:gate_notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_notices' }, async payload => {
        console.log('🔄 Live Realtime Notice Event Received:', payload);
        const cloudNotices = await SupabaseDB.loadAllNotices();
        if (Array.isArray(cloudNotices) && window.App) {
          operationalAnnouncements = cloudNotices;
          try {
            localStorage.setItem('portgate_notices_data', JSON.stringify(operationalAnnouncements));
          } catch(e) {}
          App.renderNoticeFeed();
          App.updateKPIs();
        }
      })
      .subscribe();

    // Listen to changes in gate_handover (Serah Terima Shift)
    SupabaseDB.client
      .channel('public:gate_handover')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_handover' }, async payload => {
        console.log('🔄 Live Realtime Handover Log Event Received:', payload);
        const cloudHandovers = await SupabaseDB.loadAllHandovers();
        if (Array.isArray(cloudHandovers) && window.App) {
          shiftHandoverLogs = cloudHandovers;
          try {
            localStorage.setItem('portgate_handover_data', JSON.stringify(shiftHandoverLogs));
          } catch(e) {}
          App.renderHandoverTable();
        }
      })
      .subscribe();

    // Listen to changes in gate_settings (Logo, TTD, Stamp, Profile)
    SupabaseDB.client
      .channel('public:gate_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_settings' }, async payload => {
        console.log('🔄 Live Realtime Settings/Branding Event Received:', payload);
        const cloudSettings = await SupabaseDB.loadSettings();
        if (cloudSettings && window.App) {
          App.applyCloudSettings(cloudSettings);
        }
      })
      .subscribe();
  },

  // Full Cloud Sync Trigger
  syncAllFromCloud: async function() {
    if (!SupabaseDB.isConfigured) return;

    // Settings (Logo, Stamp, TTD, Profile, Marquee)
    const cloudSettings = await SupabaseDB.loadSettings();
    if (cloudSettings && window.App) {
      App.applyCloudSettings(cloudSettings);
    }

    // Roster
    const cloudRoster = await SupabaseDB.loadRoster();
    if (cloudRoster && cloudRoster.dates && cloudRoster.roster && cloudRoster.dates.length > 0) {
      if (cloudRoster.dates[0] === "26-Jul") {
        cloudRoster.dates.shift();
        if (cloudRoster.roster && Array.isArray(cloudRoster.roster)) {
          cloudRoster.roster.forEach(r => {
            if (r.shifts && r.shifts["26-Jul"]) delete r.shifts["26-Jul"];
          });
        }
      }
      matrixDatesList = cloudRoster.dates;
      matrixRosterData = cloudRoster.roster;

      try {
        localStorage.setItem('portgate_matrix_roster', JSON.stringify({
          dates: matrixDatesList,
          roster: matrixRosterData,
          timestamp: Date.now()
        }));
      } catch(e) {
        console.error("Failed to update local storage on cloud roster sync:", e);
      }
    }

    // SKCR
    const cloudSKCR = await SupabaseDB.loadAllSKCR();
    if (Array.isArray(cloudSKCR) && cloudSKCR.length > 0) {
      skcrData = cloudSKCR;
      try {
        localStorage.setItem('portgate_skcr_data', JSON.stringify(skcrData));
      } catch(e) {}
    }

    // Notices / Peraturan
    const cloudNotices = await SupabaseDB.loadAllNotices();
    if (Array.isArray(cloudNotices) && cloudNotices.length > 0) {
      operationalAnnouncements = cloudNotices;
      try {
        localStorage.setItem('portgate_notices_data', JSON.stringify(operationalAnnouncements));
      } catch(e) {}
    } else if (operationalAnnouncements && operationalAnnouncements.length > 0) {
      // Auto-seed initial 7 notices to Cloud if table is currently empty
      console.log("🌱 Auto-seeding initial 7 operational notices to Supabase Cloud...");
      operationalAnnouncements.forEach(n => SupabaseDB.saveNotice(n));
    }

    // Handover Logs
    const cloudHandovers = await SupabaseDB.loadAllHandovers();
    if (Array.isArray(cloudHandovers) && cloudHandovers.length > 0) {
      shiftHandoverLogs = cloudHandovers;
      try {
        localStorage.setItem('portgate_handover_data', JSON.stringify(shiftHandoverLogs));
      } catch(e) {}
    }

    if (window.App) {
      App.renderAll();
    }
  }
};

window.SupabaseDB = SupabaseDB;
