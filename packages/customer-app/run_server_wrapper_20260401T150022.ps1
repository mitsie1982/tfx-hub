Set-Location "C:\Users\1hans\tfx-hub\packages\customer-app"
$env:PORT = ''
node server.js 2>&1 | Tee-Object -FilePath "C:\Users\1hans\tfx-hub\artifacts\demo-logs\customer-app_server_20260401T150022.log"
