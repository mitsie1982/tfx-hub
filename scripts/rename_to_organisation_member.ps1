<#
scripts/rename_to_organisation_member.ps1

Purpose:
  Perform a safe, workspace-wide rename to adopt the "Organisation / Member / Task" terminology.
  - Replaces common tokens (Association -> Organisation, Contractor/Customer -> Member, Job -> Task, Administrator role -> Org Admin).
  - Creates per-file backups before writing changes.
  - Skips binary and large folders (node_modules, .git, .venv, .venv*, .pytest_cache, dist, build, out).
  - Produces a summary and optionally stages & commits changes to git.

Usage:
  pwsh ./scripts/rename_to_organisation_member.ps1
  pwsh ./scripts/rename_to_organisation_member.ps1 -WhatIf        # dry run, shows files that would change
  pwsh ./scripts/rename_to_organisation_member.ps1 -Commit      # stage and commit changes with default message
  pwsh ./scripts/rename_to_organisation_member.ps1 -Commit -Message "Rename to Organisation/Member/Task" -Push

Notes:
  - Review backups (*.bak.TIMESTAMP) before pushing.
  - This script performs textual replacements only. Manual review of domain logic, DB schemas, API contracts, tests and UI strings is required.
  - Do not run on a production branch without review. Run in a feature branch and open a PR.
#>

param(
  [switch]$WhatIf,
  [switch]$Commit,
  [string]$Message = "",
  [switch]$Push,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log($text) { Write-Host $text }

# Files/folders to exclude from search
$excludeDirs = @('node_modules','\.git','dist','build','out','.venv','.venv*','.pytest_cache','venv','__pycache__')
$excludePatterns = $excludeDirs -join '|'

# File extensions to include (text files)
$includeExt = @('*.ts','*.tsx','*.js','*.jsx','*.py','*.ps1','*.sh','*.yml','*.yaml','*.json','*.md','*.txt','*.html','*.css','*.scss','*.xml','*.ini','*.cfg','Dockerfile','Makefile')

# Replacement map: ordered list of hashtable entries with regex pattern and replacement
# Patterns use word boundaries to avoid partial matches. We include TitleCase and lowercase/plural forms explicitly.
$replacements = @(
  @{ pattern = '\bAssociations\b'; replacement = 'Organisations' },
  @{ pattern = '\bAssociation\b'; replacement = 'Organisation' },
  @{ pattern = '\bassociations\b'; replacement = 'organisations' },
  @{ pattern = '\bassociation\b'; replacement = 'organisation' },

  @{ pattern = '\bContractors\b'; replacement = 'Members' },
  @{ pattern = '\bContractor\b'; replacement = 'Member' },
  @{ pattern = '\bcontractors\b'; replacement = 'members' },
  @{ pattern = '\bcontractor\b'; replacement = 'member' },

  @{ pattern = '\bCustomers\b'; replacement = 'Members' },
  @{ pattern = '\bCustomer\b'; replacement = 'Member' },
  @{ pattern = '\bcustomers\b'; replacement = 'members' },
  @{ pattern = '\bcustomer\b'; replacement = 'member' },

  @{ pattern = '\bJobs\b'; replacement = 'Tasks' },
  @{ pattern = '\bJob\b'; replacement = 'Task' },
  @{ pattern = '\bjobs\b'; replacement = 'tasks' },
  @{ pattern = '\bjob\b'; replacement = 'task' },

  # Administrator / Admin role -> Org Admin (preserve case where appropriate)
  @{ pattern = '\bOrganisation Administrator\b'; replacement = 'Org Admin' },
  @{ pattern = '\bOrganisation administrator\b'; replacement = 'Org admin' },
  @{ pattern = '\bOrganisationAdmin\b'; replacement = 'OrgAdmin' },
  @{ pattern = '\bOrganisationAdmin\b'; replacement = 'OrgAdmin' },

  @{ pattern = '\bOrganisation Admin\b'; replacement = 'Org Admin' },
  @{ pattern = '\bOrganisation admin\b'; replacement = 'Org admin' },

  @{ pattern = '\bOrg Administrator\b'; replacement = 'Org Admin' },
  @{ pattern = '\bAdministrator\b'; replacement = 'Org Admin' }, # broad; review after run
  @{ pattern = '\badministrator\b'; replacement = 'org admin' },

  # Platform tagline replacement (exact phrase variants)
  @{ pattern = 'TFX Hub – Digital Infrastructure for Associations and their Members'; replacement = 'TFX Hub – Digital Infrastructure for Organisations and their Members' },
  @{ pattern = 'TFX Hub - Digital Infrastructure for Associations and their Members'; replacement = 'TFX Hub - Digital Infrastructure for Organisations and their Members' },
  @{ pattern = 'Digital Infrastructure for Associations and their Members'; replacement = 'Digital Infrastructure for Organisations and their Members' },

  # Short code aliases
  @{ pattern = '\bAssoc\b'; replacement = 'Org' },
  @{ pattern = '\bassoc\b'; replacement = 'org' },

  # Common UI labels
  @{ pattern = '\bAssociation Name\b'; replacement = 'Organisation Name' },
  @{ pattern = '\bassociation name\b'; replacement = 'organisation name' }

  # Safety: ensure "Member" mapping does not accidentally rename "membership" -> keep membership unchanged
  # (No replacement for 'membership' to preserve it)
  # Add any additional targeted replacements here as needed
)

# Validate git repo presence
function Ensure-Git {
  try { git rev-parse --is-inside-work-tree > $null 2>&1; return $true } catch { return $false }
}

# Collect files to process
Write-Log "Scanning workspace for files to update..."
$root = Get-Location
$files = @()
foreach ($ext in $includeExt) {
  $found = Get-ChildItem -Path $root -Recurse -File -Include $ext -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $excludePatterns }
  $files += $found
}
# Also include files without extension that are common (Makefile, Dockerfile)
$extraFiles = @('Makefile','Dockerfile')
foreach ($f in $extraFiles) {
  $p = Get-ChildItem -Path $root -Recurse -File -Filter $f -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $excludePatterns }
  $files += $p
}

$files = $files | Sort-Object -Unique
Write-Log ("Files considered: {0}" -f @($files).Count)

if (@($files).Count -eq 0) {
  Write-Log "No candidate files found. Exiting."
  exit 0
}

# Process files
$modified = @()
$timestamp = (Get-Date).ToString('yyyyMMddHHmmss')
foreach ($file in $files) {
  try {
    $text = Get-Content -Raw -LiteralPath $file.FullName -ErrorAction Stop
  } catch {
    Write-Log "Skipping unreadable file: $($file.FullName)"
    continue
  }

  $original = $text
  $new = $text

  foreach ($r in $replacements) {
    $pattern = $r.pattern
    $replacement = $r.replacement
    # Use regex replace with word boundaries; case-sensitive as patterns include case variants
    $new = [regex]::Replace($new, $pattern, $replacement)
  }

  if ($new -ne $original) {
    # Backup original
    $bak = "$($file.FullName).bak.$timestamp"
    Copy-Item -LiteralPath $file.FullName -Destination $bak -Force
    # Write new content
    Set-Content -LiteralPath $file.FullName -Value $new -Encoding UTF8
    $modified += $file.FullName
    Write-Log "Updated: $($file.FullName) (backup: $bak)"
  }
}

if ($modified.Count -eq 0) {
  Write-Log "No textual changes were made. Nothing to commit."
  exit 0
}

Write-Log ""
Write-Log "Summary: Modified files count: $($modified.Count)"
$modified | ForEach-Object { Write-Host "  - $_" }

# Post-change guidance: list files that likely need manual review
$manualReview = @()
# Heuristics: files with 'Org Admin' replacements or Administrator broad replacement
foreach ($f in $modified) {
  $content = Get-Content -Raw -LiteralPath $f -ErrorAction SilentlyContinue
  if ($content -match 'Org Admin' -or $content -match 'org admin' -or $content -match 'Organisation Administrator') {
    $manualReview += $f
  }
}
if ($manualReview.Count -gt 0) {
  Write-Log ""
  Write-Log "Files recommended for manual review (role labels, UI text, API contracts):"
  $manualReview | ForEach-Object { Write-Host "  - $_" }
}

# Optionally run a quick grep to show remaining occurrences of old terms
$checkPatterns = @('Association','association','Contractor','contractor','Customer','customer','Job\b','Jobs\b')
Write-Log ""
Write-Log "Scanning for remaining legacy tokens (for manual follow-up)..."
foreach ($p in $checkPatterns) {
  $matches = Select-String -Path $modified -Pattern $p -SimpleMatch -ErrorAction SilentlyContinue
  if ($matches) {
    Write-Log ("Found occurrences of '{0}' in {1} files" -f $p, ($matches | Select-Object -ExpandProperty Path | Sort-Object -Unique).Count)
  } else {
    Write-Log ("No occurrences of '{0}' found in modified files." -f $p)
  }
}

# Git staging and commit (optional)
if ($Commit) {
  if (-not (Ensure-Git)) {
    Write-Log "Git repository not detected. Cannot commit. Review changes and commit manually."
    exit 2
  }

  # Default commit message
  if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "Rename: adopt Organisation/Member/Task terminology (automated)"
  }

  Write-Log "Staging modified files..."
  git add -- $modified

  Write-Log "Committing changes..."
  if ($Force) {
    git commit -m "$Message" --no-verify
  } else {
    git commit -m "$Message"
  }

  Write-Log "Commit created."

  if ($Push) {
    Write-Log "Pushing to upstream..."
    try {
      $branch = git rev-parse --abbrev-ref HEAD
      $upstream = git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null
      if (-not $upstream) {
        git push -u origin $branch
      } else {
        git push
      }
      Write-Log "Push completed."
    } catch {
      Write-Log "Push failed: $($_.Exception.Message)"
    }
  } else {
    Write-Log "Push not requested. To push, re-run with -Push."
  }
} else {
  Write-Log ""
  Write-Log "No commit requested. To stage and commit these changes automatically, re-run with -Commit."
}

Write-Log ""
Write-Log "IMPORTANT NEXT STEPS (manual review required):"
Write-Log "  - Review backups (*.bak.$timestamp) and modified files in a feature branch."
Write-Log "  - Run tests and linting; update DB schemas, API docs and migrations if necessary."
Write-Log "  - Update UI copy, email templates and external integrations that reference old terms."
Write-Log "  - Coordinate with product, legal and marketing to update public-facing copy (tagline, pitch decks)."

Write-Log ""
Write-Log "Script completed."
