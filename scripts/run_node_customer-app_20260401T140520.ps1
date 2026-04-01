$env:DEMO_NAME = 'customer-app'
cd 'C:\Users\1hans\tfx-hub\packages\customer-app'
node server.js 2>&1 | Tee-Object -FilePath 'C:\Users\1hans\tfx-hub\artifacts\demo-logs\customer-app_server_20260401T140520.log'
