Set-Location "C:\Users\1hans\tfx-hub\packages\ams-app"
$env:PORT = '3002'
node server.js 2>&1 | Tee-Object -FilePath "C:\Users\1hans\tfx-hub\artifacts\demo-logs\ams-app_server_20260401T163000.log"
