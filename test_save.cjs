const http = require('http');

const loginData = JSON.stringify({ email: 'admin@senseirm.com.br', pass: 'admin123' });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const { token } = JSON.parse(body);
    console.log('Token:', token ? 'Success' : 'Fail');
    
    // Now test /api/sync for a Sector
    const payload = JSON.stringify({
      type: 'sectors',
      action: 'ADD',
      payload: { id: 'test-123', nome: 'Financeiro TESTE', descricao: 'Teste' }
    });
    
    const syncReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/sync',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': payload.length
      }
    }, res2 => {
      let b2 = '';
      res2.on('data', chunk => b2 += chunk);
      res2.on('end', () => {
        console.log('Sync Sectors Response:', res2.statusCode, b2);
        
        // Also test /api/audit
        const auditPayload = JSON.stringify({
          action: 'LOGIN', module: 'AUTH', details: 'Test'
        });
        const auditReq = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/audit',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': auditPayload.length
          }
        }, res3 => {
          let b3 = '';
          res3.on('data', chunk => b3 += chunk);
          res3.on('end', () => {
            console.log('Audit Response:', res3.statusCode, b3);
          });
        });
        auditReq.write(auditPayload);
        auditReq.end();
      });
    });
    syncReq.write(payload);
    syncReq.end();
  });
});
req.write(loginData);
req.end();
