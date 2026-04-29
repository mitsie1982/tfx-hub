# PowerShell script to open PostgreSQL SQL shell for tfxhub_demo
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$database = "tfxhub_demo"
$pgHost = "localhost"
$port = 5432
$user = "postgres"

Start-Process -NoNewWindow -Wait -FilePath $psqlPath -ArgumentList "-U $user -h $pgHost -p $port -d $database"
