$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$ai = Join-Path $backend 'ai-services'
$python = Join-Path $ai '.venv\Scripts\python.exe'
$logs = Join-Path $env:TEMP 'gtec-server-logs'
$stateDir = Join-Path $logs 'processes'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
function Port-Open([int]$port) {
    $c = New-Object System.Net.Sockets.TcpClient
    try { $a = $c.BeginConnect('127.0.0.1', $port, $null, $null); return ($a.AsyncWaitHandle.WaitOne(500) -and $c.Connected) }
    catch { return $false } finally { $c.Dispose() }
}
function Wait-Port([int]$port, [int]$seconds) {
    for ($i = 0; $i -lt $seconds; $i++) { if (Port-Open $port) { return $true }; Start-Sleep -Seconds 1 }
    return $false
}
function Start-ServiceProcess([string]$name, [int]$port, [string]$exe, [string]$argsLine, [string]$dir, [int]$timeout) {
    if (Port-Open $port) { Write-Host "$name`: port $port already in use; verify the existing server."; return }
    $out = Join-Path $logs "$name.out.log"
    $err = Join-Path $logs "$name.err.log"
    $launched = Start-Process -FilePath $exe -ArgumentList $argsLine -WorkingDirectory $dir -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
    if (-not (Wait-Port $port $timeout)) { throw "$name failed to start. Check $err and $out" }
    try {
        $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique)
        if ($listeners.Count -ne 1) { throw 'Listener could not be uniquely identified.' }
        $listener = Get-Process -Id $listeners[0] -ErrorAction Stop
        if ($listener.StartTime.ToUniversalTime() -lt $launched.StartTime.ToUniversalTime().AddSeconds(-2)) { throw 'Listener existed before this launch.' }
        @{ name=$name; port=$port; processId=$listener.Id; startTicks=$listener.StartTime.ToUniversalTime().Ticks.ToString() } |
            ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $stateDir "$name.json")
    } catch { Write-Warning "$name started, but automatic shutdown tracking could not be recorded: $_" }
    Write-Host "$name listening on port $port"
}
try {
    if (-not (Test-Path -LiteralPath (Join-Path $backend 'gradlew.bat'))) { throw 'backend\gradlew.bat not found.' }
    if (-not (Test-Path -LiteralPath $python)) { throw 'AI virtual environment backend\ai-services\.venv not found.' }
    if (-not (Test-Path -LiteralPath (Join-Path $frontend 'node_modules\vite\bin\vite.js'))) { throw 'Frontend dependencies not found. Run npm install in frontend.' }
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js not found on PATH.' }
    if (-not (Port-Open 5432)) { throw 'PostgreSQL is not listening on localhost:5432. Start it and retry.' }
    if (-not (Port-Open 6379)) {
        if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) { throw 'Redis is stopped and Docker was not found.' }
        & docker.exe info *> $null
        if ($LASTEXITCODE -ne 0) {
            $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
            if (-not (Test-Path -LiteralPath $desktop)) { throw 'Docker Desktop not found.' }
            Start-Process -FilePath $desktop -WindowStyle Hidden | Out-Null
            $ready = $false
            for ($i = 0; $i -lt 90; $i++) { & docker.exe info *> $null; if ($LASTEXITCODE -eq 0) { $ready = $true; break }; Start-Sleep -Seconds 1 }
            if (-not $ready) { throw 'Docker Desktop did not become ready in 90 seconds.' }
        }
        & docker.exe container inspect redis *> $null
        if ($LASTEXITCODE -eq 0) { & docker.exe start redis | Out-Null }
        else { & docker.exe run -d --name redis -p 127.0.0.1:6379:6379 redis:7 | Out-Null }
        if ($LASTEXITCODE -ne 0 -or -not (Wait-Port 6379 30)) { throw 'Redis failed to start.' }
    }
    Start-ServiceProcess 'backend' 8090 $env:ComSpec '/d /c gradlew.bat bootRun' $backend 120
    Start-ServiceProcess 'customer-ai' 8001 $python '-m uvicorn main:app --host 127.0.0.1 --port 8001' (Join-Path $ai 'customer_analyze') 90
    Start-ServiceProcess 'recommend-ai' 8002 $python '-m uvicorn main:app --host 127.0.0.1 --port 8002' (Join-Path $ai 'recommend') 90
    Start-ServiceProcess 'review-ai' 8003 $python '-m uvicorn main:app --host 127.0.0.1 --port 8003' (Join-Path $ai 'review_analyze') 90
    $env:BACKEND_PROXY_TARGET = 'http://127.0.0.1:8090'
    Start-ServiceProcess 'frontend' 5173 'node.exe' 'node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 --strictPort' $frontend 60
    Write-Host 'Ready: http://localhost:5173'
    Write-Host "Logs: $logs"
    Write-Host 'Review AI periodically analyzes pending reviews while running.'
} catch { Write-Error $_; exit 1 }
