# Build dist/module.zip for a GitHub release: runtime files only, forward-slash entry names,
# no LevelDB LOCK files. Windows PowerShell's Compress-Archive writes backslash entry names,
# which break extraction on Foundry's Linux hosts, so entries are added one by one.
# Usage (from the repo root): powershell -File scripts/package-release.ps1
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$zip  = Join-Path $root 'dist\module.zip'
New-Item -ItemType Directory -Force (Join-Path $root 'dist') | Out-Null
$manifest = Get-Content (Join-Path $root 'module.json') -Raw | ConvertFrom-Json

$files = New-Object System.Collections.Generic.List[string]
$files.Add('module.json')
$files.Add('README.md')
$files.Add('animations\me-animations.json')
foreach ($s in $manifest.scripts) { $files.Add(($s -replace '/', [string][char]92)) }
foreach ($n in @('button-left.png', 'button-right.png', 'me2-journal-viewer.png')) { $files.Add("assets\journal-viewer\$n") }
# token-generator inputs stay out; nothing reads them at runtime
Get-ChildItem (Join-Path $root 'assets\img') -Recurse -File |
  Where-Object { $_.Name -notin @('_token-contact-sheet.png', 'token-focus.json') } |
  ForEach-Object { $files.Add($_.FullName.Substring($root.Length + 1)) }
Get-ChildItem (Join-Path $root 'packs') -Recurse -File | Where-Object { $_.Name -ne 'LOCK' } |
  ForEach-Object { $files.Add($_.FullName.Substring($root.Length + 1)) }

# Opening with 'Create' truncates an existing archive, so nothing needs deleting first.
$stream = [System.IO.File]::Open($zip, 'Create')
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($rel in $files) {
  $src = Join-Path $root $rel
  if (-not (Test-Path $src)) { throw "missing: $rel" }
  $entry = $rel.Replace([char]92, [char]47)
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $src, $entry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
$archive.Dispose()
$stream.Dispose()

# Verify what was written
$check = [System.IO.Compression.ZipFile]::OpenRead($zip)
$names = $check.Entries | ForEach-Object FullName
$backslash = @($names | Where-Object { $_.Contains([string][char]92) }).Count
$locks = @($names | Where-Object { $_ -match '/LOCK$' }).Count
$packDirs = @($names | Where-Object { $_ -like 'packs/*' } | ForEach-Object { ($_ -split '/')[1] } | Sort-Object -Unique).Count
$scripts = @($names | Where-Object { $_ -like 'scripts/*' })
$reader = New-Object System.IO.StreamReader(($check.Entries | Where-Object FullName -eq 'module.json').Open())
$inner = $reader.ReadToEnd() | ConvertFrom-Json
$reader.Dispose()
$check.Dispose()
"entries: $($names.Count)  backslash: $backslash  LOCK: $locks"
"pack dirs: $packDirs (manifest declares $($manifest.packs.Count))"
"scripts: $($scripts -join ', ')"
"zipped module.json version: $($inner.version)  download: $($inner.download)"
"size: {0:N1} MB" -f ((Get-Item $zip).Length / 1MB)
if ($backslash -or $locks -or $packDirs -ne $manifest.packs.Count) { throw 'package verification failed' }
