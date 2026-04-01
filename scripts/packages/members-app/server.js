const http = require('http');
const port = process.env.PORT || 3003;
console.log('Members placeholder server starting on port', port);
const server = http.createServer((req,res)=>{ res.writeHead(200,{'Content-Type':'text/html'}); res.end('<h1>Members Demo</h1>'); });
server.listen(port,()=>console.log('Listening on',port));
