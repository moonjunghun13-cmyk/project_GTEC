$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$stateDir = Join-Path $env:TEMP 'gtec-server-logs\processes'
$services = @(
    @{ name='frontend'; port=5173; expected='node' },
    @{ name='customer-ai'; port=8001; expected='python' },
    @{ name='recommend-ai'; port=8002; expected='python' },
    @{ name='review-ai'; port=8003; expected='python' },
    @{ name='backend'; port=8090; expected='java' }
)
$unverified = $false
foreach ($service in $services) {
    try {
        $connections = @(Get-NetTCPConnection -LocalPort $service.port -State Listen -ErrorAction Stop)
    } catch {
        if ($_.Exception.Message -match 'No matching|No MSFT_NetTCPConnection|찾을 수 없|일치하는') { $connections = @() }
        else { Write-Warning "Could not inspect $($service.name): $_"; $unverified = $true; continue }
    }
    if ($connections.Count -eq 0) { Write-Host "$($service.name): already stopped"; continue }
    $listeners = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($listeners.Count -ne 1) { Write-Warning "$($service.name): multiple listeners; not stopping"; $unverified = $true; continue }
    $listenerId = $listeners[0]
    $recordPath = Join-Path $stateDir "$($service.name).json"
    $verified = $false
    try {
        $process = Get-Process -Id $listenerId -ErrorAction Stop
        if ($process.ProcessName -ne $service.expected) { throw 'Unexpected process name.' }
        if (Test-Path -LiteralPath $recordPath) {
            $record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
            $verified = $record.processId -eq $listenerId -and $record.port -eq $service.port -and $process.StartTime.ToUniversalTime().Ticks -eq [long]$record.startTicks
        }
        if (-not $verified) {
            # Servers started before tracking was added: require project path and a service-specific command.
            $details = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerId" -ErrorAction Stop
            $cmd = [string]$details.CommandLine
            $projectMatch = $cmd.IndexOf($root, [StringComparison]::OrdinalIgnoreCase) -ge 0
            $signature = switch ($service.name) {
                'frontend' { $cmd -match 'vite' }
                'backend' { $cmd -match 'com\.gtec\.mall\.MallApplication' }
                default { $cmd -match 'uvicorn' -and $cmd -match "--port\s+$($service.port)(\s|$)" }
            }
            $verified = $projectMatch -and $signature
            if (-not $verified -and $signature) {
                # Older launches may use relative paths, so their project cannot be
                # identified from the command line. Ask before stopping that process.
                Write-Warning "$($service.name): project ownership could not be verified."
                Write-Host "Port: $($service.port)  PID: $listenerId"
                Write-Host "Executable: $($details.ExecutablePath)"
                Write-Host "Command: $cmd"
                $answer = Read-Host "Stop this process? Enter Y to stop, or press Enter to leave it running"
                $verified = $answer -match '^[Yy]$'
                if (-not $verified) { throw 'Skipped by user; process was not stopped.' }
                # The listener may have changed while waiting for input.
                $currentListeners = @(Get-NetTCPConnection -LocalPort $service.port -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique)
                $currentProcess = Get-Process -Id $listenerId -ErrorAction Stop
                if ($currentListeners.Count -ne 1 -or $currentListeners[0] -ne $listenerId -or
                    $currentProcess.StartTime.ToUniversalTime().Ticks -ne $process.StartTime.ToUniversalTime().Ticks) {
                    throw 'The process changed while waiting; it was not stopped.'
                }
            }
        }
        if (-not $verified) { throw 'Cannot verify that the listener belongs to this project.' }
        Stop-Process -Id $listenerId -ErrorAction Stop
        Write-Host "$($service.name): stopped"
        if (Test-Path -LiteralPath $recordPath) { Remove-Item -LiteralPath $recordPath }
    } catch { Write-Warning "$($service.name): not stopped. $_"; $unverified = $true }
}
Write-Host 'PostgreSQL, Redis, and Docker Desktop were left running.'
if ($unverified) { Write-Warning 'Some servers could not be verified. Stop them in their original terminal or IDE.'; exit 1 }
