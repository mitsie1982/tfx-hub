# PowerShell concurrency test for /api/jobs/:id/accept

$jobId = "demo-job-1"
$uri = "http://localhost:4000/api/jobs/$jobId/accept"

Write-Host "Contractor 1 Accept Attempt:"
$response1 = Invoke-RestMethod -Uri $uri -Method Post -Body '{"contractorId":"c1","version":1}' -ContentType 'application/json' -ErrorAction SilentlyContinue
$response1 | ConvertTo-Json -Depth 5

Write-Host "Contractor 2 Accept Attempt:"
$response2 = Invoke-RestMethod -Uri $uri -Method Post -Body '{"contractorId":"c2","version":1}' -ContentType 'application/json' -ErrorAction SilentlyContinue
$response2 | ConvertTo-Json -Depth 5
