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