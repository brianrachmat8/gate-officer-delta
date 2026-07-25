/* ==========================================================================
   PortGate / Gate Officer Delta - Supabase Cloud Database Module
   Handles real-time cloud data sync across all online devices/phones.
   ========================================================================== */

const SupabaseDB = {
  // Pre-configured Supabase Project URL
  url: localStorage.getItem('portgate_supabase_url') || 'https://seiscumgtgjxaimaaegp.supabase.co',
  key: localStorage.getItem('portgate_supabase_key') || '',
  client: null,
  isConfigured: false,

  init: function() {
    const activeUrl = SupabaseDB.url || localStorage.getItem('portgate_supabase_url') || 'https://seiscumgtgjxaimaaegp.supabase.co';
    const activeKey = SupabaseDB.key || localStorage.getItem('portgate_supabase_key') || '';

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
    SupabaseDB.key = key.trim();
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
      const { data, error } = await SupabaseDB.client
        .from('gate_skcr')
        .upsert(skcrRecord, { onConflict: 'id' });

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
        .order('created_at', { ascending: false });

      if (error) return null;
      return data;
    } catch(e) {
      return null;
    }
  },

  // Sync Operational Notices / Peraturan
  saveNotice: async function(noticeRecord) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_notices')
        .upsert(noticeRecord, { onConflict: 'id' });

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
          if (window.App) {
            App.updateStaffFilterOptions();
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
        console.log('🔄 Live Realtime SKCR Update Received:', payload);
        const cloudSKCR = await SupabaseDB.loadAllSKCR();
        if (cloudSKCR && window.App) {
          skcrData = cloudSKCR;
          App.renderSKCRTable();
          App.updateKPIs();
        }
      })
      .subscribe();

    // Listen to changes in gate_notices
    SupabaseDB.client
      .channel('public:gate_notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_notices' }, async payload => {
        console.log('🔄 Live Realtime Notice Update Received:', payload);
        const cloudNotices = await SupabaseDB.loadAllNotices();
        if (cloudNotices && window.App) {
          operationalAnnouncements = cloudNotices;
          App.renderNoticeFeed();
          App.updateKPIs();
        }
      })
      .subscribe();
  },

  // Full Cloud Sync Trigger
  syncAllFromCloud: async function() {
    if (!SupabaseDB.isConfigured) return;

    // Roster
    const cloudRoster = await SupabaseDB.loadRoster();
    if (cloudRoster && cloudRoster.dates && cloudRoster.roster) {
      matrixDatesList = cloudRoster.dates;
      matrixRosterData = cloudRoster.roster;
    }

    // SKCR
    const cloudSKCR = await SupabaseDB.loadAllSKCR();
    if (cloudSKCR && cloudSKCR.length > 0) {
      skcrData = cloudSKCR;
    }

    // Notices
    const cloudNotices = await SupabaseDB.loadAllNotices();
    if (cloudNotices && cloudNotices.length > 0) {
      operationalAnnouncements = cloudNotices;
    }

    if (window.App) {
      App.renderAll();
    }
  }
};

window.SupabaseDB = SupabaseDB;
