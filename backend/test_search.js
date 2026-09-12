import http from 'http';

const loginData = JSON.stringify({ identifier: 'admin@college.com', password: 'password123' });

const req1 = http.request({
  hostname: 'localhost',
  port: 5005,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).token;
    console.log('Got token');
    
    const req2 = http.request({
      hostname: 'localhost',
      port: 5005,
      path: '/api/library/students/search?q=hars',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }, res2 => {
      let b2 = '';
      res2.on('data', d => b2 += d);
      res2.on('end', () => console.log('Search result:', b2));
    });
    req2.end();
  });
});
req1.write(loginData);
req1.end();
