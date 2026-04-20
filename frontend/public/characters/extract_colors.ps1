Add-Type -AssemblyName System.Drawing

$files = @(
    @{name="basic.png"; groups=10},
    @{name="beard.png"; groups=14},
    @{name="blush_all.png"; groups=5},
    @{name="bob.png"; groups=14},
    @{name="braids.png"; groups=14},
    @{name="buzzcut.png"; groups=14},
    @{name="clown.png"; groups=2},
    @{name="curly.png"; groups=14},
    @{name="dress.png"; groups=10},
    @{name="emo.png"; groups=14},
    @{name="extra_long.png"; groups=14},
    @{name="extra_long_skirt.png"; groups=14},
    @{name="eyes.png"; groups=14},
    @{name="floral.png"; groups=10},
    @{name="french_curl.png"; groups=14},
    @{name="gentleman.png"; groups=14},
    @{name="glasses.png"; groups=10},
    @{name="glasses_sun.png"; groups=10},
    @{name="lipstick.png"; groups=5},
    @{name="long_straight .png"; groups=14},
    @{name="long_straight_skirt.png"; groups=14},
    @{name="midiwave.png"; groups=14},
    @{name="overalls.png"; groups=10},
    @{name="pants.png"; groups=10},
    @{name="pants_suit.png"; groups=10},
    @{name="ponytail.png"; groups=14},
    @{name="pumpkin.png"; groups=2},
    @{name="sailor.png"; groups=10},
    @{name="sailor_bow.png"; groups=10},
    @{name="shoes.png"; groups=10},
    @{name="skirt.png"; groups=10},
    @{name="skull.png"; groups=10},
    @{name="spacebuns.png"; groups=14},
    @{name="spaghetti.png"; groups=10},
    @{name="sporty.png"; groups=10},
    @{name="stripe.png"; groups=10},
    @{name="suit.png"; groups=10},
    @{name="wavy.png"; groups=14}
)

$base = "C:\Users\Jon\OneDrive\Documents\VSCode\Rolemap\frontend\public\characters"

foreach ($f in $files) {
    $path = Join-Path $base $f.name
    if (-not (Test-Path $path)) { Write-Host ("{0}: not found" -f $f.name); continue }
    $img = [System.Drawing.Image]::FromFile($path)
    $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($img, 0, 0); $g.Dispose(); $img.Dispose()
    
    $colors = @()
    for ($v = 0; $v -lt $f.groups; $v++) {
        $bestSat = -1.0; $bestR=0; $bestG=0; $bestB=0
        for ($y = 0; $y -lt 28; $y++) {
            for ($x = ($v*256); $x -lt ($v*256+32); $x++) {
                try {
                    $px = $bmp.GetPixel($x, $y)
                    if ($px.A -gt 10) {
                        $r = $px.R / 255.0; $gg = $px.G / 255.0; $b = $px.B / 255.0
                        $max = [Math]::Max($r, [Math]::Max($gg, $b))
                        $min = [Math]::Min($r, [Math]::Min($gg, $b))
                        $sat = if ($max -gt 0) { ($max - $min) / $max } else { 0 }
                        if ($sat -gt $bestSat) { $bestSat=$sat; $bestR=$px.R; $bestG=$px.G; $bestB=$px.B }
                    }
                } catch {}
            }
        }
        if ($bestSat -ge 0) {
            $colors += ("#{0:X2}{1:X2}{2:X2}" -f $bestR, $bestG, $bestB)
        } else {
            $colors += "#808080"
        }
    }
    $bmp.Dispose()
    $quotedName = $f.name -replace ' ', ' '
    $colorsStr = ($colors | ForEach-Object { '"{0}"' -f $_ }) -join ","
    Write-Host ("  `"{0}`": [{1}]," -f $quotedName, $colorsStr)
}
