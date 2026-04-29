$env:DEMO_NAME = 'contractor-app'
cd 'C:\Users\1hans\tfx-hub\packages\contractor-app'
node server.js 2>&1 | Tee-Object -FilePath 'C:\Users\1hans\tfx-hub\artifacts\demo-logs\contractor-app_server_20260401T140520.log'
