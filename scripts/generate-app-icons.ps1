# Generates PWA + Apple touch icons (potato) into public/ and public/assets/
$ErrorActionPreference = "Stop"
$public = Join-Path $PSScriptRoot "..\public"
$assets = Join-Path $public "assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null
Add-Type -AssemblyName System.Drawing

function Draw-PotatoIcon {
  param([int]$size)
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.Color]::FromArgb(26, 26, 32))

  $cx = $size / 2.0
  $cy = $size / 2.0 + ($size * 0.06)
  $rx = $size * 0.34
  $ry = $size * 0.28

  $darkBrown = [System.Drawing.Color]::FromArgb(139, 105, 20)
  $midBrown = [System.Drawing.Color]::FromArgb(184, 137, 42)
  $stroke = [System.Drawing.Color]::FromArgb(92, 69, 16)
  $green = [System.Drawing.Color]::FromArgb(107, 140, 62)

  $bodyBrush = New-Object System.Drawing.SolidBrush $darkBrown
  $penW = [math]::Max(1, [int][math]::Floor($size / 64))
  $bodyPen = New-Object System.Drawing.Pen -ArgumentList @($stroke, $penW)
  $g.DrawEllipse($bodyPen, [float]($cx - $rx), [float]($cy - $ry), [float]($rx * 2), [float]($ry * 2))
  $g.FillEllipse($bodyBrush, [float]($cx - $rx + 1), [float]($cy - $ry + 1), [float]($rx * 2 - 2), [float]($ry * 2 - 2))

  $innerRx = $rx * 0.78
  $innerRy = $ry * 0.72
  $lightBrush = New-Object System.Drawing.SolidBrush $midBrown
  $g.FillEllipse($lightBrush, [float]($cx - $innerRx), [float]($cy - $innerRy - $size * 0.02), [float]($innerRx * 2), [float]($innerRy * 2))

  # Sprout
  $sproutPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $sx = $cx
  $sy = $cy - $ry - $size * 0.08
  $sproutPath.AddArc([float]($sx - $size * 0.12), [float]($sy - $size * 0.14), [float]($size * 0.24), [float]($size * 0.2), 180, 180)
  $g.FillPath((New-Object System.Drawing.SolidBrush $green), $sproutPath)

  $eye = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(100, 61, 40, 16))
  $g.FillEllipse($eye, [float]($cx - $rx * 0.35), [float]($cy - $ry * 0.1), [float]($size * 0.07), [float]($size * 0.09))
  $g.FillEllipse($eye, [float]($cx + $rx * 0.08), [float]($cy - $ry * 0.02), [float]($size * 0.055), [float]($size * 0.07))

  $g.Dispose()
  return $bmp
}

foreach ($entry in @(
    @{ size = 180; path = (Join-Path $assets "apple-touch-icon.png") },
    @{ size = 192; path = (Join-Path $assets "icon-192.png") },
    @{ size = 512; path = (Join-Path $assets "icon-512.png") },
    @{ size = 192; path = (Join-Path $public "icon-192.png") },
    @{ size = 512; path = (Join-Path $public "icon-512.png") }
  )) {
  $bmp = Draw-PotatoIcon $entry.size
  $bmp.Save($entry.path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $($entry.path)"
}
