$sourcePath = Join-Path $PSScriptRoot '..\..\archive\prototypes\手机原型_柔白新版_v2.html'
$targetPath = Join-Path $PSScriptRoot '..\public\prototype.html'
$sourcePath = [System.IO.Path]::GetFullPath($sourcePath)
$targetPath = [System.IO.Path]::GetFullPath($targetPath)
if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
  throw "Prototype source not found: $sourcePath"
}
Copy-Item -LiteralPath $sourcePath -Destination $targetPath
Write-Output "Synced prototype to $targetPath"
