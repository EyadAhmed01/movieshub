$ErrorActionPreference = "Stop"
$public = Join-Path $PSScriptRoot "..\public"
New-Item -ItemType Directory -Force -Path $public | Out-Null
Add-Type -AssemblyName System.Drawing
foreach ($size in @(192, 512)) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.Color]::FromArgb(26, 26, 32))
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 200, 160))
  $fontSize = [math]::Max(48, $size / 6)
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = "Center"
  $sf.LineAlignment = "Center"
  $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $g.DrawString("VH", $font, $brush, $rect, $sf)
  $g.Dispose()
  $out = Join-Path $public "icon-$size.png"
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
Write-Host "Wrote $public\icon-192.png and icon-512.png"
