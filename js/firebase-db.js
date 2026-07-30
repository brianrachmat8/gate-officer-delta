/* ==========================================================================
   PortGate Logistics Hub - Firebase Realtime Database Connector
   Provides zero-dependency, zero-library 100% Realtime Cloud Synchronization
   using Firebase REST API & Server-Sent Events (SSE) WebSockets
   ========================================================================== */

const FirebaseDB = {
  dbUrl: "https://gate-officer-delta-default-rtdb.firebaseio.com",
  eventSource: null,

  init: function(customUrl) {
    if (customUrl) FirebaseDB.dbUrl = customUrl.replace(/\/$/, '');
    FirebaseDB.listenRealtimeUpdates();
  },

  // Save Roster to Firebase Cloud Realtime Database
  saveRoster: function(dates, roster) {
    const endpoint = `${FirebaseDB.dbUrl}/roster.json`;
    const payload = {
      dates: dates,
      roster: roster,
      updatedAt: Date.now()
    };

    fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      console.log("🔥 [Firebase] Roster successfully synced to cloud:", data);
    })
    .catch(err => {
      console.error("🔥 [Firebase] Error saving roster:", err);
    });
  },

  // Listen to 100% Realtime Cloud Updates via Server-Sent Events (SSE)
  listenRealtimeUpdates: function() {
    try {
      if (FirebaseDB.eventSource) FirebaseDB.eventSource.close();

      const sseUrl = `${FirebaseDB.dbUrl}/roster.json`;
      FirebaseDB.eventSource = new EventSource(sseUrl);

      FirebaseDB.eventSource.addEventListener('put', function(e) {
        if (!e || !e.data) return;
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.data) {
            const data = payload.data;
            if (data.roster && data.dates && window.App) {
              matrixDatesList = data.dates;
              matrixRosterData = data.roster;
              isRosterUploaded = true;
              App.saveRosterToStorage();
              App.updateStaffFilterOptions();
              App.updateMonthFilterOptions();
              App.renderMatrixScheduleTable();
              console.log("🔥 [Firebase Realtime] Live Roster update received & applied!");
            }
          }
        } catch(err) {
          console.error("Firebase SSE parse error:", err);
        }
      });

      FirebaseDB.eventSource.onerror = function(err) {
        console.warn("Firebase Realtime SSE connection retrying...");
      };
    } catch(e) {
      console.error("Firebase Realtime init error:", e);
    }
  }
};

window.FirebaseDB = FirebaseDB;
