# Wrapper: forward to manage.ps1 so there is a single source of truth
param([Parameter(ValueFromRemainingArguments = $true)] [string[]]$Args)

$script = Join-Path $PSScriptRoot "manage.ps1"
if (!(Test-Path $script)) {
  Write-Host "manage.ps1 not found next to manage-simple.ps1" -ForegroundColor Red
  exit 1
}

& $script @Args
