const https = require('https');

const payload = JSON.stringify({
  id: 'latest_roster',
  dates: ['25-Jul'],
  roster: [{ name: 'RIDWAN', shifts: {} }],
  updated_at: new Date().toISOString()
});

const options = {
  hostname: 'seiscumgtgjxaimaaegp.supabase.co',
  port: 443,
  path: '/rest/v1/gate_roster',
  method: 'POST',
  headers: {
    'apikey': 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk',
    'Prefer': 'resolution=merge-duplicates',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS ROSTER: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
});

req.write(payload);
req.end();
