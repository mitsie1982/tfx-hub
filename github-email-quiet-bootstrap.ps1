<#
github-email-quiet-bootstrap.ps1

Single consolidated PowerShell script you can run from VS Code to:
  - Quiet GitHub email noise for a repository (set repo subscription to ignored via GitHub API).
  - Unsubscribe from a specific notification thread (if you paste the thread URL).
  - Create an Outlook inbox rule (Windows + Outlook) to auto-archive GitHub CI emails.
  - Produce a ready-to-copy Gmail filter query and step-by-step instructions.
  - Open the repo Watch settings page so you can change watch level manually.
  - Write a short README with copy/paste instructions for teammates.

Usage (interactive):
  1) Open VS Code integrated terminal.
  2) Run: pwsh ./github-email-quiet-bootstrap.ps1
  3) Follow prompts.

Notes:
  - To change repo subscription automatically you must provide a GitHub Personal Access Token (PAT) with "repo" or "notifications" scope.
  - Outlook rule creation requires Outlook desktop installed and running on Windows.
  - Gmail filter creation cannot be automated without OAuth; this script writes a ready-to-use filter query and instructions you can paste into Gmail's filter UI.
  - The script is idempotent and safe: it writes files under ./out and does not delete anything.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Prompt-YesNo($msg, $default = $false) {
  $yn = Read-Host "$msg [y/N]"
  if ([string]::IsNullOrWhiteSpace($yn)) { return $default }
  return $yn.Trim().ToLower().StartsWith('y')
}

function Write-Log($text) {
  $outDir = Join-Path (Get-Location) 'out'
  if (-not (Test-Path $outDir)) { New-Item -Path $outDir -ItemType Directory | Out-Null }
  $logFile = Join-Path $outDir 'github_email_quiet.log'
  $line = "$(Get-Date -Format o)`t$text"
  $line | Out-File -FilePath $logFile -Append -Encoding utf8
  Write-Host $text
}

# --- Interactive inputs ---
Write-Host "GitHub Email Quiet Bootstrap — interactive setup" -ForegroundColor Cyan
$repo = Read-Host "Enter the repository full name (owner/repo) you want to quiet (e.g., mitsie1982/tfx-hub). Leave blank to skip GitHub API steps"
$token = $null
if (-not [string]::IsNullOrWhiteSpace($repo)) {
  if (Prompt-YesNo "Do you want to call the GitHub API to set this repo to 'Ignore' (requires a Personal Access Token)?") {
    $token = Read-Host "Paste a GitHub Personal Access Token (PAT) with notifications/repo scope (input hidden)" -AsSecureString
    $token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
  }
}

$threadUrl = Read-Host "If you want to unsubscribe a specific notification thread, paste the notification thread URL from the email here (leave blank to skip)"
$emailProvider = Read-Host "Which email client do you use for these notifications? (gmail / outlook / other) [default: gmail]"
if ([string]::IsNullOrWhiteSpace($emailProvider)) { $emailProvider = 'gmail' }

# --- Helper: GitHub API set repo subscription to ignored ---
function Set-GitHubRepoIgnored([string]$repoFullName, [string]$pat) {
  try {
    Write-Log "Setting repository subscription to ignored for $repoFullName via GitHub API"
    $uri = "https://api.github.com/repos/$repoFullName/subscription"
    $body = @{ ignored = $true; subscribed = $false } | ConvertTo-Json
    $headers = @{ Authorization = "token $pat"; 'User-Agent' = 'github-email-quiet-bootstrap' }
    $resp = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Log "GitHub API response: ignored=$($resp.ignored) subscribed=$($resp.subscribed)"
    return $true
  } catch {
    Write-Log "GitHub API call failed: $($_.Exception.Message)"
    return $false
  }
}

# --- Helper: Unsubscribe a notification thread (if thread URL provided) ---
function Unsubscribe-GitHubThread([string]$threadUrl, [string]$pat) {
  # Accepts thread URL like: https://github.com/notifications/threads/123456789
  try {
    if (-not $pat) { Write-Log "No PAT provided; cannot call GitHub API to unsubscribe thread."; return $false }
    if (-not $threadUrl) { Write-Log "No thread URL provided."; return $false }
    # Extract thread id from URL
    if ($threadUrl -match '/notifications/threads/([0-9]+)') {
      $threadId = $matches[1]
    } elseif ($threadUrl -match '/threads/([0-9]+)') {
      $threadId = $matches[1]
    } else {
      Write-Log "Could not parse thread id from URL. Provide a URL containing /notifications/threads/{id}."
      return $false
    }
    $uri = "https://api.github.com/notifications/threads/$threadId/subscription"
    $headers = @{ Authorization = "token $pat"; 'User-Agent' = 'github-email-quiet-bootstrap' }
    $body = @{ subscribed = $false } | ConvertTo-Json
    # PUT to set subscribed false
    $resp = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Log "Thread unsubscribed via API (thread id $threadId). Response: $($resp | ConvertTo-Json -Depth 2)"
    return $true
  } catch {
    Write-Log "Unsubscribe thread API call failed: $($_.Exception.Message)"
    return $false
  }
}

# --- Helper: Open repo watch settings in browser ---
function Open-RepoWatchSettings([string]$repoFullName) {
  if (-not $repoFullName) { return }
  $url = "https://github.com/$repoFullName/subscription"
  Write-Log "Opening repo watch settings: $url"
  Start-Process $url
}

# --- Helper: Create Outlook rule (Windows + Outlook) ---
function Create-OutlookRuleForGitHub([string]$repoFullName) {
  try {
    if ($env:OS -notlike '*Windows*' -and -not $IsWindows) {
      Write-Log "Outlook rule creation is only supported on Windows with Outlook installed."
      return $false
    }
    # Create rule: from notifications@github.com and subject contains repo name -> move to folder "GitHub Notifications" and mark as read
    Write-Log "Attempting to create Outlook rule for GitHub notifications (requires Outlook desktop)."
    $ol = New-Object -ComObject Outlook.Application
    $ns = $ol.GetNamespace("MAPI")
    $inbox = $ns.GetDefaultFolder([Microsoft.Office.Interop.Outlook.OlDefaultFolders]::olFolderInbox)
    # Ensure folder exists
    $folderName = "GitHub Notifications"
    $targetFolder = $null
    foreach ($f in $inbox.Folders) { if ($f.Name -eq $folderName) { $targetFolder = $f; break } }
    if (-not $targetFolder) { $targetFolder = $inbox.Folders.Add($folderName) }
    # Create rule
    $rules = $ns.DefaultStore.GetRules()
    $ruleName = "GitHub CI - $repoFullName"
    # Remove existing rule with same name
    try { $existing = $rules.Item($ruleName); if ($existing) { $rules.Remove($ruleName) } } catch {}
    $rule = $rules.Create($ruleName, 0) # 0 = olRuleReceive
    # Condition: from address
    $condFrom = $rule.Conditions.SenderAddress
    $condFrom.Enabled = $true
    $condFrom.Address = "notifications@github.com"
    # Condition: subject contains repo short name
    $condSubj = $rule.Conditions.Subject
    $condSubj.Enabled = $true
    $condSubj.Text = @($repoFullName)
    # Action: move to folder
    $actMove = $rule.Actions.MoveToFolder
    $actMove.Enabled = $true
    $actMove.Folder = $targetFolder
    # Action: mark as read
    $actRead = $rule.Actions.MarkAsRead
    $actRead.Enabled = $true
    $rules.Save()
    Write-Log "Outlook rule created: $ruleName -> moves notifications@github.com with subject containing '$repoFullName' to folder '$folderName'."
    return $true
  } catch {
    Write-Log "Outlook rule creation failed: $($_.Exception.Message)"
    return $false
  }
}

# --- Helper: Write Gmail filter instructions and copy query to clipboard ---
function Create-GmailFilterInstructions([string]$repoFullName) {
  $queryParts = @()
  $queryParts += 'from:notifications@github.com'
  if ($repoFullName) {
    # match repo tag in subject like [owner/repo]
    $repoTag = "[$repoFullName]"
    $queryParts += "subject:`"$repoFullName`""
    $queryParts += "subject:`"$repoTag`""
  } else {
    $queryParts += 'subject:("Run failed" OR "workflow run" OR "CI -")'
  }
  $query = $queryParts -join ' '
  $instructions = @"
Gmail filter query (copy the entire line below and paste into Gmail's search box when creating a filter):

$query

Steps to create the filter in Gmail:
1) Open Gmail in your browser.
2) In the search box at the top, paste the query above and press Enter to verify results.
3) Click the small down-arrow on the right of the search box to open the advanced search dialog (it will be pre-filled).
4) Click 'Create filter' at the bottom-right of the dialog.
5) Choose actions: 'Skip the Inbox (Archive it)', 'Mark as read', 'Apply the label: GitHub' (create label if needed).
6) Optionally check 'Also apply filter to matching conversations'.
7) Click 'Create filter'.

Notes:
- This filter targets emails from notifications@github.com and subjects containing the repo name or common CI phrases.
- Adjust the query if you want to be more or less aggressive.
"@
  $outDir = Join-Path (Get-Location) 'out'
  if (-not (Test-Path $outDir)) { New-Item -Path $outDir -ItemType Directory | Out-Null }
  $file = Join-Path $outDir 'gmail_filter_instructions.txt'
  $instructions | Out-File -FilePath $file -Encoding utf8
  Write-Log "Wrote Gmail filter instructions to $file"
  # Copy query to clipboard for convenience
  try {
    Set-Clipboard -Value $query
    Write-Log "Filter query copied to clipboard."
  } catch {
    Write-Log "Could not copy to clipboard; please open out/gmail_filter_instructions.txt and copy manually."
  }
}

# --- Helper: Write README for teammates ---
function Write-TeammateReadme([string]$repoFullName) {
  $outDir = Join-Path (Get-Location) 'out'
  if (-not (Test-Path $outDir)) { New-Item -Path $outDir -ItemType Directory | Out-Null }
  $file = Join-Path $outDir 'GITHUB_NOTIFICATION_OPT_OUT_README.md'
  $content = @"
How to stop GitHub CI emails for repository: $repoFullName

Quick options (recommended):
- Unsubscribe from the specific email thread: open the email and click 'Unsubscribe' in the footer.
- Stop watching the repository: open https://github.com/$repoFullName and click the 'Watch' button -> choose 'Not watching' or 'Ignore'.

Automated options (if you provided a PAT to the bootstrap script):
- The script attempted to set the repository subscription to 'ignored' via the GitHub API.
- If you want to do this manually: curl -X PUT -H "Authorization: token YOUR_PAT" -H "User-Agent: you" -d '{"ignored":true,"subscribed":false}' https://api.github.com/repos/$repoFullName/subscription

Email client filters:
- Gmail: see out/gmail_filter_instructions.txt (query copied to clipboard if available).
- Outlook (Windows): the script can create a rule that moves notifications@github.com messages with the repo name in the subject to a 'GitHub Notifications' folder and marks them read.

If you are a repo admin and want to reduce noise for all contributors:
- Consider posting CI results to Slack/Teams instead of creating comments or status updates that trigger emails.
- Avoid broad team mentions in CI comments.
- Add a short note in README/CONTRIBUTING explaining how to opt out of email notifications.

"@
  $content | Out-File -FilePath $file -Encoding utf8
  Write-Log "Wrote teammate README to $file"
}

# --- Execute actions based on inputs ---
if (-not [string]::IsNullOrWhiteSpace($repo) -and $token) {
  $ok = Set-GitHubRepoIgnored -repoFullName $repo -pat $token
  if ($ok) { Write-Log "Repository subscription updated to ignored for $repo." } else { Write-Log "Repository subscription update failed for $repo." }
} elseif (-not [string]::IsNullOrWhiteSpace($repo)) {
  Write-Log "No PAT provided; skipping GitHub API repo subscription change. You can open the repo watch settings to change manually."
}

if (-not [string]::IsNullOrWhiteSpace($threadUrl)) {
  if ($token) {
    $ok = Unsubscribe-GitHubThread -threadUrl $threadUrl -pat $token
    if ($ok) { Write-Log "Unsubscribed thread via API." } else { Write-Log "Failed to unsubscribe thread via API." }
  } else {
    Write-Log "No PAT provided; cannot unsubscribe"
