$env:DEMO_NAME = 'members-app'
cd 'C:\Users\1hans\tfx-hub\packages\members-app'
node server.js 2>&1 | Tee-Object -FilePath 'C:\Users\1hans\tfx-hub\artifacts\demo-logs\members-app_server_20260401T140522.log'
