Add-Type -AssemblyName System.Drawing
$files = @("suit.png","basic.png","sporty.png","dress.png","buzzcut.png","bob.png","eyes.png")
foreach ($f in $files) {
    if (-not (Test-Path $f)) { Write-Host "$f not found"; continue }
    $img = [System.Drawing.Bitmap]::new((Resolve-Path $f).Path)
    Write-Host "=== $f ($($img.Width)x$($img.Height)) frameW=32 frameH=28 ==="
    $numGroups = [int]($img.Width / 256)
    Write-Host "  Color groups: $numGroups"
    for ($v = 0; $v -lt $numGroups; $v++) {
        $bestSat = -1.0; $bestR=0; $bestG=0; $bestB=0
        for ($y = 10; $y -lt 28; $y++) {
            for ($x = ($v*256); $x -lt ($v*256+32); $x++) {
                try {
                    $px = $img.GetPixel($x, $y)
                    if ($px.A -gt 10) {
                        $r = $px.R / 255.0; $g = $px.G / 255.0; $b = $px.B / 255.0
                        $max = [Math]::Max($r, [Math]::Max($g, $b))
                        $min = [Math]::Min($r, [Math]::Min($g, $b))
                        $sat = if ($max -gt 0) { ($max - $min) / $max } else { 0 }
                        if ($sat -gt $bestSat) { $bestSat=$sat; $bestR=$px.R; $bestG=$px.G; $bestB=$px.B }
                    }
                } catch {}
            }
        }
        if ($bestSat -ge 0) {
            Write-Host ("  Variant {0}: #{1:X2}{2:X2}{3:X2} (sat={4:F2})" -f $v, $bestR, $bestG, $bestB, $bestSat)
        } else {
            Write-Host ("  Variant {0}: no opaque pixel" -f $v)
        }
    }
    $img.Dispose()
}
