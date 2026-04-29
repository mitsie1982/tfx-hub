Set-Location "C:\Users\1hans\tfx-hub\packages\members-app"
$env:PORT = ''
node server.js 2>&1 | Tee-Object -FilePath "C:\Users\1hans\tfx-hub\artifacts\demo-logs\members-app_server_20260401T150024.log"
