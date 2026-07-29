const https = require('https');

const payload = JSON.stringify({
  id: 'SKCR-TEST',
  date: '2026-07-25',
  time: '12:00',
  containers: ['TEST1234567'],
  containerCount: 1,
  primaryContainer: 'TEST1234567',
  sizeType: '40HC',
  shippingLine: 'ONE',
  vesselVoyage: 'TEST V.1',
  consignee: 'TEST',
  userNameGate: 'RIDWAN ALAMSYAH',
  companyName: 'PT DELTA KONTAINER DEPOT',
  userTitle: 'Gate Operasional'
});

const options = {
  hostname: 'seiscumgtgjxaimaaegp.supabase.co',
  port: 443,
  path: '/rest/v1/gate_skcr',
  method: 'POST',
  headers: {
    'apikey': 'sb_publishable_KSks9KaAtq81yEXRKxk7RQ_ewro02jk',
    'Prefer': 'resolution=merge-duplicates',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS SKCR: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
});

req.write(payload);
req.end();
