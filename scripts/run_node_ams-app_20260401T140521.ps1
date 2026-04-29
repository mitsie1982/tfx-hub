$env:DEMO_NAME = 'ams-app'
cd 'C:\Users\1hans\tfx-hub\packages\ams-app'
node server.js 2>&1 | Tee-Object -FilePath 'C:\Users\1hans\tfx-hub\artifacts\demo-logs\ams-app_server_20260401T140521.log'
