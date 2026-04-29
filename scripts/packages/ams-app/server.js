const http = require('http');
const port = process.env.PORT || 3002;
console.log('AMS placeholder server starting on port', port);
const server = http.createServer((req,res)=>{ res.writeHead(200,{'Content-Type':'text/html'}); res.end('<h1>AMS Demo</h1>'); });
server.listen(port,()=>console.log('Listening on',port));
