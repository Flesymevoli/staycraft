$ErrorActionPreference='Stop'
try {
  $project=Split-Path -Parent $PSScriptRoot
  Set-Location -LiteralPath $project
  $node=Get-Command node.exe -ErrorAction SilentlyContinue
  $fallback=Join-Path $env:LOCALAPPDATA 'Programs/nodejs/node.exe'
  $nodePath=if($node){$node.Source}else{$fallback}
  & $nodePath (Join-Path $PSScriptRoot 'dev.cjs') --sample
  if($LASTEXITCODE -ne 0){throw "桌面演示启动失败（退出码 $LASTEXITCODE）。"}
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Read-Host '按 Enter 关闭'
  exit 1
}
