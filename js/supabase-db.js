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
      const payload = {
        id: skcrRecord.id,
        date: skcrRecord.date || new Date().toISOString().split('T')[0],
        containers: skcrRecord.containers || [skcrRecord.containerNo || 'SNKO8923410'],
        consignee: skcrRecord.consignee || skcrRecord.shippingLine || 'PT DELTA KONTAINER'
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
      const { data, error } = await SupabaseDB.client
        .from('gate_skcr')
        .select('*')
        .order('id', { ascending: false });

      if (error || !data) return null;
      return data.map(item => ({
        id: item.id,
        date: item.date || new Date().toISOString().split('T')[0],
        containers: item.containers || [item.containerNo || 'SNKO8923410'],
        containerNo: item.containerNo || (item.containers ? item.containers[0] : 'SNKO8923410'),
        consignee: item.consignee || 'PT GLOBAL CARGO LOGISTICS',
        shippingLine: item.shippingLine || item.consignee || 'HAPAG',
        sizeType: item.sizeType || '40 FT',
        vesselVoyage: item.vesselVoyage || 'MV SAWASDEE BALI V.2405N',
        userNameGate: item.userNameGate || 'RIDWAN',
        companyName: item.companyName || 'PT DELTA KONTAINER DEPOT',
        userTitle: item.userTitle || 'Gate Operasional',
        containerCount: item.containerCount || (item.containers ? item.containers.length : 1),
        primaryContainer: item.primaryContainer || (item.containers ? item.containers[0] : 'SNKO8923410')
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
