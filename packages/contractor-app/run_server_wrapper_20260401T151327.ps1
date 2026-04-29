Set-Location "C:\Users\1hans\tfx-hub\packages\contractor-app"
$env:PORT = ''
node server.js 2>&1 | Tee-Object -FilePath "C:\Users\1hans\tfx-hub\artifacts\demo-logs\contractor-app_server_20260401T151327.log"
