# One-time installer for the GTEC weekly customer model refresh check.
# Run this script from the (dl) environment, with the files placed at the project root.
$ErrorActionPreference = 'Stop'
$taskName = 'GTEC_Customer_Weekly_Refresh'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = 'D:\kim\deep\dl\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $pythonExe -PathType Leaf)) {
    throw "Python not found at $pythonExe. Run: python -c 'import sys; print(sys.executable)' and edit this file."
}
if (-not (Test-Path -LiteralPath (Join-Path $project 'app\services\customer_service.py') -PathType Leaf)) {
    throw "customer_service.py was not found under $project. Put this setup script in customer_analyze first."
}

# Weekly Monday at 09:10 local Windows time, when the user is logged in.
# Model checks run directly with Python, so uvicorn/Swagger do not need to be open.
$action = New-ScheduledTaskAction -Execute $pythonExe -Argument '-m app.services.customer_service --weekly-refresh' -WorkingDirectory $project
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At '09:10'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'GTEC customer AI model weekly readiness and candidate training; never replace active model.' -Force | Out-Null
Write-Host "Registered $taskName (weekly Monday 09:10, local time)" -ForegroundColor Green
Write-Host "Project: $project"
Write-Host "Python:  $pythonExe"
Write-Host "Check:  Get-ScheduledTask -TaskName '$taskName'"
Write-Host "Manual task execution: Start-ScheduledTask -TaskName '$taskName'"
