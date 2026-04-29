# scripts/verify_regions.ps1
param()
$report = "out/region_report.txt"
New-Item -ItemType Directory -Path out -Force | Out-Null
"=== Region & Service Verification Report ===" | Out-File $report
# Azure: list locations and check South Africa regions
if (Get-Command az -ErrorAction SilentlyContinue) {
  "Azure locations (sample):" | Out-File $report -Append
  az account list-locations --query "[?contains(name,'southafrica')].{name:name,display:displayName}" -o table 2>>$report | Out-File $report -Append
  "AKS availability zones check (southafricanorth):" | Out-File $report -Append
  az aks list-skus --location southafricanorth --query "[?contains(name,'Standard')]" -o table 2>>$report | Out-File $report -Append
} else { "Azure CLI not installed" | Out-File $report -Append }

# AWS: describe availability zones and sample instance types
if (Get-Command aws -ErrorAction SilentlyContinue) {
  "AWS AZs (af-south-1):" | Out-File $report -Append
  aws ec2 describe-availability-zones --region af-south-1 --query "AvailabilityZones[].ZoneName" -o text 2>>$report | Out-File $report -Append
  "AWS GPU instance families (sample):" | Out-File $report -Append
  aws ec2 describe-instance-types --filters Name=processor-info.supported-architecture,Values=x86_64 --region af-south-1 --max-items 20 --query "InstanceTypes[?starts_with(InstanceType,'g')].InstanceType" -o text 2>>$report | Out-File $report -Append
} else { "AWS CLI not installed" | Out-File $report -Append }

"Report written to $report"
