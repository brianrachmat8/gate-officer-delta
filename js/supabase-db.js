/* ==========================================================================
   PortGate / Gate Officer Delta - Supabase Cloud Database Module
   Handles 100% real-time cloud data sync across all online devices/phones.
   ========================================================================== */

const SupabaseDB = {
  // Pre-configured Supabase Credentials
  url: (function(){ try { return localStorage.getItem('portgate_supabase_url') || 'https://seiscumgtgjxaimaaegp.supabase.co'; } catch(e) { return 'https://seiscumgtgjxaimaaegp.supabase.co'; } })(),
  key: (function(){ try { return localStorage.getItem('portgate_supabase_key') || 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk'; } catch(e) { return 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk'; } })(),
  client: null,
  isConfigured: false,

  init: function() {
    try {
      let activeUrl = 'https://seiscumgtgjxaimaaegp.supabase.co';
      let activeKey = 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk';
      try {
        activeUrl = localStorage.getItem('portgate_supabase_url') || SupabaseDB.url || activeUrl;
        activeKey = localStorage.getItem('portgate_supabase_key') || SupabaseDB.key || activeKey;
      } catch(e) {}

      if (typeof supabase !== 'undefined' && activeUrl && activeKey) {
        SupabaseDB.client = supabase.createClient(activeUrl, activeKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        SupabaseDB.isConfigured = true;
        console.log("⚡ Supabase Cloud Database Connected Successfully!");

        try { SupabaseDB.subscribeToRealtimeChanges(); } catch(re) { console.warn("Realtime N/A:", re); }

        // Initial Cloud Sync after 2 seconds (delayed to allow local DOM render first)
        setTimeout(function() {
          try { SupabaseDB.syncAllFromCloud(); } catch(se) { console.warn("Sync failed:", se); }
        }, 2000);
      } else {
        console.log("ℹ️ Supabase SDK pending key entry or offline.");
      }
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
      SupabaseDB.isConfigured = false;
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

  // 1. Save Roster Schedule Matrix to Cloud
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

  loadRoster: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_roster')
        .select('*')
        .eq('id', 'latest_roster')
        .single();

      if (error) return null;
      return data;
    } catch(e) {
      return null;
    }
  },

  // 2. Sync Operational Notices / Peraturan (Stored reliably via gate_roster table)
  saveAllNotices: async function(noticesArray) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const payload = {
        id: 'latest_notices',
        dates: ['2026-07-25'],
        roster: noticesArray,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await SupabaseDB.client
        .from('gate_roster')
        .upsert(payload, { onConflict: 'id' });

      if (error) console.error("Error saving notices to Supabase:", error);
      else console.log("☁️ All 10 Notices synced to Supabase Cloud!");
    } catch(e) {
      console.error("Supabase Notice Save Exception:", e);
    }
  },

  saveNotice: async function(noticeRecord) {
    let existingIndex = operationalAnnouncements.findIndex(n => n.id === noticeRecord.id);
    if (existingIndex >= 0) {
      operationalAnnouncements[existingIndex] = noticeRecord;
    } else {
      operationalAnnouncements.unshift(noticeRecord);
    }
    await SupabaseDB.saveAllNotices(operationalAnnouncements);
  },

  deleteNotice: async function(noticeId) {
    operationalAnnouncements = operationalAnnouncements.filter(n => n.id !== noticeId);
    await SupabaseDB.saveAllNotices(operationalAnnouncements);
  },

  loadAllNotices: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_roster')
        .select('*')
        .eq('id', 'latest_notices')
        .single();

      if (error || !data || !data.roster) return null;
      return data.roster;
    } catch(e) {
      return null;
    }
  },

  // 3. Sync SKCR Records (Stored reliably via gate_roster table)
  saveAllSKCR: async function(skcrArray) {
    if (!SupabaseDB.isConfigured) return;
    try {
      const payload = {
        id: 'latest_skcr_data',
        dates: ['2026-07-25'],
        roster: skcrArray,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await SupabaseDB.client
        .from('gate_roster')
        .upsert(payload, { onConflict: 'id' });

      if (error) console.error("Error saving SKCR data to Supabase:", error);
      else console.log("☁️ SKCR data synced to Supabase Cloud!");
    } catch(e) {
      console.error("Supabase SKCR Save Exception:", e);
    }
  },

  saveSKCR: async function(skcrRecord) {
    let existingIndex = skcrData.findIndex(s => s.id === skcrRecord.id);
    if (existingIndex >= 0) {
      skcrData[existingIndex] = skcrRecord;
    } else {
      skcrData.unshift(skcrRecord);
    }
    await SupabaseDB.saveAllSKCR(skcrData);
  },

  deleteSKCR: async function(skcrId) {
    skcrData = skcrData.filter(s => s.id !== skcrId);
    await SupabaseDB.saveAllSKCR(skcrData);
  },

  loadAllSKCR: async function() {
    if (!SupabaseDB.isConfigured) return null;
    try {
      const { data, error } = await SupabaseDB.client
        .from('gate_roster')
        .select('*')
        .eq('id', 'latest_skcr_data')
        .single();

      if (error || !data || !data.roster) return null;
      return data.roster;
    } catch(e) {
      return null;
    }
  },

  // Real-time Subscriptions across all online devices/phones
  subscribeToRealtimeChanges: function() {
    if (!SupabaseDB.isConfigured || !SupabaseDB.client) return;

    // Listen to changes in gate_roster channel
    SupabaseDB.client
      .channel('public:gate_roster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_roster' }, async payload => {
        console.log('🔄 Live Realtime Cloud Update Received:', payload);
        if (payload.new) {
          if (payload.new.id === 'latest_roster' && payload.new.dates && payload.new.roster) {
            matrixDatesList = payload.new.dates;
            matrixRosterData = payload.new.roster;
          } else if (payload.new.id === 'latest_notices' && payload.new.roster) {
            operationalAnnouncements = payload.new.roster;
          } else if (payload.new.id === 'latest_skcr_data' && payload.new.roster) {
            skcrData = payload.new.roster;
          }

          if (window.App) {
            App.renderAll();
          }
        }
      })
      .subscribe();
  },

  // Full Fail-Proof Cloud Sync & Merge Trigger
  syncAllFromCloud: async function() {
    if (!SupabaseDB.isConfigured) return;

    try {
      // 1. Notices Sync & Bidirectional Merge
      const cloudNotices = await SupabaseDB.loadAllNotices();
      if (cloudNotices && cloudNotices.length > 0) {
        const noticeMap = new Map();
        operationalAnnouncements.forEach(n => noticeMap.set(n.id, n));
        cloudNotices.forEach(n => noticeMap.set(n.id, n));

        operationalAnnouncements = Array.from(noticeMap.values());
        await SupabaseDB.saveAllNotices(operationalAnnouncements);
      } else {
        // If cloud empty, seed all notices to cloud
        await SupabaseDB.saveAllNotices(operationalAnnouncements);
      }

      // 2. SKCR Sync & Bidirectional Merge
      const cloudSKCR = await SupabaseDB.loadAllSKCR();
      if (cloudSKCR && cloudSKCR.length > 0) {
        const skcrMap = new Map();
        skcrData.forEach(s => skcrMap.set(s.id, s));
        cloudSKCR.forEach(s => skcrMap.set(s.id, s));

        skcrData = Array.from(skcrMap.values());
        await SupabaseDB.saveAllSKCR(skcrData);
      } else {
        await SupabaseDB.saveAllSKCR(skcrData);
      }

      // 3. Roster Sync
      const cloudRoster = await SupabaseDB.loadRoster();
      if (cloudRoster && cloudRoster.dates && cloudRoster.roster) {
        matrixDatesList = cloudRoster.dates;
        matrixRosterData = cloudRoster.roster;
      } else {
        await SupabaseDB.saveRoster(matrixDatesList, matrixRosterData);
      }

      if (window.App) {
        App.renderAll();
      }
    } catch(e) {
      console.error("Cloud Sync Exception:", e);
    }
  }
};

window.SupabaseDB = SupabaseDB;
