function Resolve-PostgresBin {
  param(
    [switch]$AllowMissing
  )

  function Get-SortableVersion {
    param(
      [string]$Value
    )

    $normalized = ($Value -replace '[^0-9\.]', '').Trim('.')
    if (-not $normalized) {
      return [version]'0.0'
    }

    if ($normalized -notmatch '\.') {
      $normalized = "$normalized.0"
    }

    return [version]$normalized
  }

  if ($env:TFX_PG_BIN -and (Test-Path $env:TFX_PG_BIN)) {
    return $env:TFX_PG_BIN
  }

  $installRoot = 'C:\Program Files\PostgreSQL'
  if (Test-Path $installRoot) {
    $candidate = Get-ChildItem -Path $installRoot -Directory |
      Sort-Object { Get-SortableVersion $_.Name } -Descending |
      ForEach-Object { Join-Path $_.FullName 'bin' } |
      Where-Object { Test-Path (Join-Path $_ 'pg_ctl.exe') } |
      Select-Object -First 1
    if ($candidate) {
      return $candidate
    }
  }

  if ($AllowMissing) {
    return $null
  }

  throw 'PostgreSQL tools not found. Install PostgreSQL or set TFX_PG_BIN to the bin directory.'
}

function Invoke-PgCtlStart {
  param(
    [string]$PgCtlPath,
    [string]$DataDir,
    [string]$LogFile,
    [string]$PortArgument = ' -p 5433 '
  )

  $argumentString = ('-D "{0}" -l "{1}" -o "{2}" start' -f $DataDir, $LogFile, $PortArgument.Trim())
  $process = Start-Process -FilePath $PgCtlPath -ArgumentList $argumentString -PassThru -WindowStyle Hidden

  return [pscustomobject]@{
    ProcessId = $process.Id
    ExitCode = $null
    Output = @()
  }
}

function Get-ListeningProcessId {
  param(
    [int]$Port
  )

  if (-not $Port) {
    return $null
  }

  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($connection) {
      return [int]$connection.OwningProcess
    }
  } catch {
    return $null
  }

  return $null
}

function Get-ProcessInfo {
  param(
    [int]$ProcessId
  )

  if (-not $ProcessId) {
    return $null
  }

  try {
    return Get-CimInstance Win32_Process -Filter ("ProcessId = " + $ProcessId) -ErrorAction Stop
  } catch {
    return $null
  }
}

function Test-CommandLineContainsFragment {
  param(
    [string]$CommandLine,
    [string]$Fragment
  )

  if (-not $CommandLine -or -not $Fragment) {
    return $false
  }

  $normalizedCommandLine = $CommandLine.Replace('/', '\').ToLowerInvariant()
  $normalizedFragment = $Fragment.Trim().Trim('"').Replace('/', '\').ToLowerInvariant()
  return $normalizedCommandLine.Contains($normalizedFragment)
}

function Test-StackWrapperProcessMatches {
  param(
    [int]$ProcessId,
    [string]$WorkingDirectory,
    [string]$RunnerScriptPath
  )

  if (-not $ProcessId -or -not $WorkingDirectory -or -not $RunnerScriptPath) {
    return $false
  }

  $processInfo = Get-ProcessInfo -ProcessId $ProcessId
  if (-not $processInfo) {
    return $false
  }

  $processName = [string]$processInfo.Name
  if ($processName) {
    $normalizedProcessName = $processName.ToLowerInvariant()
    if ($normalizedProcessName -notin @('powershell.exe', 'powershell', 'pwsh.exe', 'pwsh')) {
      return $false
    }
  }

  $commandLine = [string]$processInfo.CommandLine
  return (
    (Test-CommandLineContainsFragment -CommandLine $commandLine -Fragment $RunnerScriptPath) -and
    (Test-CommandLineContainsFragment -CommandLine $commandLine -Fragment $WorkingDirectory)
  )
}

function Test-NodeProcessMatchesWorkingDirectory {
  param(
    [int]$ProcessId,
    [string]$WorkingDirectory,
    [string]$ExpectedCommandFragment
  )

  if (-not $ProcessId) {
    return $false
  }

  $processInfo = Get-ProcessInfo -ProcessId $ProcessId
  if (-not $processInfo) {
    return $false
  }

  $processName = [string]$processInfo.Name
  if ($processName) {
    $normalizedProcessName = $processName.ToLowerInvariant()
    if ($normalizedProcessName -notin @('node.exe', 'node')) {
      return $false
    }
  }

  $commandLine = [string]$processInfo.CommandLine
  if (Test-CommandLineContainsFragment -CommandLine $commandLine -Fragment $WorkingDirectory) {
    return $true
  }

  return (Test-CommandLineContainsFragment -CommandLine $commandLine -Fragment $ExpectedCommandFragment)
}

function Get-ListeningProcessInfo {
  param(
    [int]$Port
  )

  $processId = Get-ListeningProcessId -Port $Port
  if (-not $processId) {
    return $null
  }

  $processInfo = Get-ProcessInfo -ProcessId $processId
  if (-not $processInfo) {
    return [pscustomobject]@{
      ProcessId = $processId
      Name = $null
      CommandLine = $null
    }
  }

  return [pscustomobject]@{
    ProcessId = $processId
    Name = $processInfo.Name
    CommandLine = $processInfo.CommandLine
  }
}

function Normalize-PathForComparison {
  param(
    [string]$Path
  )

  if (-not $Path) {
    return $null
  }

  $candidate = $Path.Trim().Trim('"')
  try {
    $resolved = Resolve-Path -LiteralPath $candidate -ErrorAction Stop
    $candidate = $resolved.Path
  } catch {
  }

  return $candidate.Replace('/', '\\').TrimEnd('\\').ToLowerInvariant()
}

function Test-ProcessMatchesDataDir {
  param(
    [int]$ProcessId,
    [string]$DataDir
  )

  if (-not $ProcessId -or -not $DataDir) {
    return $false
  }

  $processInfo = Get-ProcessInfo -ProcessId $ProcessId
  if (-not $processInfo) {
    return $false
  }

  if ($processInfo.Name -and $processInfo.Name -ine 'postgres.exe') {
    return $false
  }

  $normalizedDataDir = Normalize-PathForComparison -Path $DataDir
  $normalizedCommandLine = Normalize-PathForComparison -Path ([string]$processInfo.CommandLine)
  if (-not $normalizedDataDir -or -not $normalizedCommandLine) {
    return $false
  }

  return $normalizedCommandLine.Contains($normalizedDataDir)
}

function Get-PostgresDataDirPid {
  param(
    [string]$DataDir
  )

  if (-not $DataDir) {
    return $null
  }

  $pidFile = Join-Path $DataDir 'postmaster.pid'
  if (-not (Test-Path $pidFile)) {
    return $null
  }

  $firstLine = Get-Content -Path $pidFile -TotalCount 1 -ErrorAction SilentlyContinue
  if (-not $firstLine) {
    return $null
  }

  $parsedPid = 0
  if ([int]::TryParse($firstLine.Trim(), [ref]$parsedPid)) {
    return $parsedPid
  }

  return $null
}

function Test-PostgresConnection {
  param(
    [string]$PsqlPath,
    [string]$HostName = '127.0.0.1',
    [int]$Port = 5433,
    [string]$User = 'postgres',
    [string]$Database = 'postgres'
  )

  if (-not $PsqlPath -or -not (Test-Path $PsqlPath)) {
    return $false
  }

  try {
    $result = & $PsqlPath -w -h $HostName -p $Port -U $User -d $Database -tAc 'SELECT 1' 2>$null
    return ($LASTEXITCODE -eq 0 -and "$result".Trim() -eq '1')
  } catch {
    return $false
  }
}

function Test-RepoLocalPostgresRunning {
  param(
    [string]$DataDir,
    [int]$Port = 5433
  )

  $listeningProcess = Get-ListeningProcessInfo -Port $Port
  if (-not $listeningProcess) {
    return $false
  }

  if (-not (Test-ProcessMatchesDataDir -ProcessId $listeningProcess.ProcessId -DataDir $DataDir)) {
    return $false
  }

  try {
    Get-Process -Id $listeningProcess.ProcessId -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-RepoLocalPostgresStarting {
  param(
    [string]$DataDir,
    [int]$Port = 5433
  )

  $dataDirPid = Get-PostgresDataDirPid -DataDir $DataDir
  if ($dataDirPid) {
    try {
      Get-Process -Id $dataDirPid -ErrorAction Stop | Out-Null
      if (Test-ProcessMatchesDataDir -ProcessId $dataDirPid -DataDir $DataDir) {
        return $true
      }
    } catch {
    }
  }

  $listeningProcess = Get-ListeningProcessInfo -Port $Port
  if (-not $listeningProcess) {
    return $false
  }

  return (Test-ProcessMatchesDataDir -ProcessId $listeningProcess.ProcessId -DataDir $DataDir)
}

function Wait-PostgresClusterReady {
  param(
    [string]$PgCtlPath,
    [string]$PsqlPath,
    [string]$DataDir,
    [int]$Port = 5433,
    [int]$TimeoutSeconds = 15,
    [int]$PollMilliseconds = 500,
    [int]$GraceTimeoutSeconds = 3
  )

  if (Test-PostgresClusterReady -PgCtlPath $PgCtlPath -PsqlPath $PsqlPath -DataDir $DataDir -Port $Port) {
    return $true
  }

  if (-not (Test-RepoLocalPostgresStarting -DataDir $DataDir -Port $Port)) {
    $graceDeadline = (Get-Date).AddSeconds($GraceTimeoutSeconds)
    while ((Get-Date) -lt $graceDeadline) {
      Start-Sleep -Milliseconds $PollMilliseconds
      if (Test-PostgresClusterReady -PgCtlPath $PgCtlPath -PsqlPath $PsqlPath -DataDir $DataDir -Port $Port) {
        return $true
      }
    }

    return $false
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PostgresClusterReady -PgCtlPath $PgCtlPath -PsqlPath $PsqlPath -DataDir $DataDir -Port $Port) {
      return $true
    }

    if (-not (Test-RepoLocalPostgresStarting -DataDir $DataDir -Port $Port)) {
      return $false
    }

    Start-Sleep -Milliseconds $PollMilliseconds
  }

  return (Test-PostgresClusterReady -PgCtlPath $PgCtlPath -PsqlPath $PsqlPath -DataDir $DataDir -Port $Port)
}

function Test-PostgresClusterReady {
  param(
    [string]$PgCtlPath,
    [string]$PsqlPath,
    [string]$DataDir,
    [int]$Port = 5433
  )

  if ($PgCtlPath -and (Test-Path $PgCtlPath)) {
    & $PgCtlPath -D $DataDir status 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return $true
    }
  }

  return ((Test-RepoLocalPostgresRunning -DataDir $DataDir -Port $Port) -and (Test-PostgresConnection -PsqlPath $PsqlPath -Port $Port))
}
