Add-Type -AssemblyName System.Drawing
$skip = @('suit_col','suit_row','sample_colors','char1','char2','char3','char4','char5','char6','char7','char8')
Get-ChildItem "C:\Users\Jon\OneDrive\Documents\VSCode\Rolemap\frontend\public\characters\*.png" | ForEach-Object {
    $name = $_.BaseName
    $skip_it = $false
    foreach ($s in $skip) { if ($name.StartsWith($s)) { $skip_it = $true; break } }
    if ($skip_it) { return }
    try {
        $img = [System.Drawing.Image]::FromFile($_.FullName)
        $groups = [int]($img.Width / 256)
        if ($groups -gt 1) {
            Write-Host ("{0}: {1}x{2} => {3} variants" -f $_.Name, $img.Width, $img.Height, $groups)
        } else {
            Write-Host ("{0}: {1}x{2} => 1 variant" -f $_.Name, $img.Width, $img.Height)
        }
        $img.Dispose()
    } catch {
        Write-Host ("{0}: error" -f $_.Name)
    }
}
