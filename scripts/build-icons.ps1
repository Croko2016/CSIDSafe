# Generates PWA icons (192, 512, and maskable 512) into public/icons/.
# Re-run if you want to change the brand color or symbol.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'public/icons'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$brand = [System.Drawing.Color]::FromArgb(31, 122, 77)   # primary green
$accent = [System.Drawing.Color]::FromArgb(255, 255, 255)
$bg = [System.Drawing.Color]::FromArgb(15, 17, 21)        # app bg, used for "any" icon edge

function Draw-Icon {
    param(
        [int]$size,
        [string]$path,
        [bool]$maskable
    )

    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $brandBrush = New-Object System.Drawing.SolidBrush $brand
    $whiteBrush = New-Object System.Drawing.SolidBrush $accent

    if ($maskable) {
        # Maskable icons: full-bleed brand color, content in safe zone (~80%).
        $g.FillRectangle($brandBrush, 0, 0, $size, $size)
        $pad = [int]($size * 0.18)
    } else {
        # Standard icons: rounded square brand badge over transparent.
        $g.Clear([System.Drawing.Color]::Transparent)
        $r = [int]($size * 0.22)
        $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
        $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path2.AddArc($rect.X, $rect.Y, $r * 2, $r * 2, 180, 90)
        $path2.AddArc($rect.Right - $r * 2, $rect.Y, $r * 2, $r * 2, 270, 90)
        $path2.AddArc($rect.Right - $r * 2, $rect.Bottom - $r * 2, $r * 2, $r * 2, 0, 90)
        $path2.AddArc($rect.X, $rect.Bottom - $r * 2, $rect.X + $r * 2, $r * 2, 90, 90)
        $path2.CloseFigure()
        $g.FillPath($brandBrush, $path2)
        $pad = [int]($size * 0.16)
    }

    # Three traffic-light dots: green, amber, red — the brand of the app.
    $dotSize = [int]($size * 0.16)
    $gap = [int]($size * 0.06)
    $totalWidth = ($dotSize * 3) + ($gap * 2)
    $startX = ([int](($size - $totalWidth) / 2))
    $dotsY = [int]($size * 0.30)

    $green = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 167, 69))
    $amber = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 173, 78))
    $red = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 53, 69))
    $g.FillEllipse($green, $startX, $dotsY, $dotSize, $dotSize)
    $g.FillEllipse($amber, $startX + $dotSize + $gap, $dotsY, $dotSize, $dotSize)
    $g.FillEllipse($red, $startX + ($dotSize + $gap) * 2, $dotsY, $dotSize, $dotSize)

    # "CSID" text below dots
    $fontSize = [single]([Math]::Max(10, $size * 0.20))
    $bold = [System.Drawing.FontStyle]::Bold
    $pixel = [System.Drawing.GraphicsUnit]::Pixel
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, $bold, $pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textY = $dotsY + $dotSize + [int]($size * 0.10)
    $textHeight = [int]($size * 0.30)
    $g.DrawString('CSID', $font, $whiteBrush, (New-Object System.Drawing.RectangleF $pad, $textY, ($size - $pad * 2), $textHeight), $sf)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Wrote $path"
}

Draw-Icon -size 192 -path (Join-Path $outDir 'icon-192.png') -maskable $false
Draw-Icon -size 512 -path (Join-Path $outDir 'icon-512.png') -maskable $false
Draw-Icon -size 512 -path (Join-Path $outDir 'icon-maskable.png') -maskable $true
