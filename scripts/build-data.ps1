# Mirror of scripts/build-data.mjs for environments without Node.
# Reads data/*.csv, joins on FCDB Food ID, writes public/foods.json.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root 'data'
$outDir = Join-Path $root 'public'
$outFile = Join-Path $outDir 'foods.json'

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$headers = @('Food','FoodId','Serving','ServingUnit','QtyPer100','NutrientUnit1','QtyPerServe','NutrientUnit2','DI')

function Read-Nutrient($path) {
    Import-Csv -Path $path -Header $headers | Select-Object -Skip 1 | ForEach-Object {
        $val = 0.0
        if ($_.QtyPer100) { [void][double]::TryParse($_.QtyPer100, [ref]$val) }
        $serving = $null
        if ($_.Serving) {
            $s = 0.0
            if ([double]::TryParse($_.Serving, [ref]$s)) { $serving = $s }
        }
        [PSCustomObject]@{
            id = $_.FoodId.Trim()
            name = $_.Food.Trim()
            serving = $serving
            servingUnit = if ($_.ServingUnit) { $_.ServingUnit.Trim() } else { $null }
            value = $val
        }
    }
}

$sucrose = Read-Nutrient (Join-Path $dataDir 'sucrose.csv')
$maltose = Read-Nutrient (Join-Path $dataDir 'maltose.csv')
$lactose = Read-Nutrient (Join-Path $dataDir 'lactose.csv')

$merged = @{}
foreach ($r in $sucrose) {
    $merged[$r.id] = [PSCustomObject]@{
        id = $r.id
        name = $r.name
        serving = $r.serving
        servingUnit = $r.servingUnit
        sucs = $r.value
        mals = 0.0
        lacs = 0.0
    }
}
foreach ($r in $maltose) {
    if ($merged.ContainsKey($r.id)) { $merged[$r.id].mals = $r.value }
    else {
        $merged[$r.id] = [PSCustomObject]@{
            id = $r.id; name = $r.name; serving = $r.serving; servingUnit = $r.servingUnit
            sucs = 0.0; mals = $r.value; lacs = 0.0
        }
    }
}
foreach ($r in $lactose) {
    if ($merged.ContainsKey($r.id)) { $merged[$r.id].lacs = $r.value }
    else {
        $merged[$r.id] = [PSCustomObject]@{
            id = $r.id; name = $r.name; serving = $r.serving; servingUnit = $r.servingUnit
            sucs = 0.0; mals = 0.0; lacs = $r.value
        }
    }
}

$foods = $merged.Values | Sort-Object -Property name
$payload = [PSCustomObject]@{
    version = '2024-nz-foodfiles'
    count = $foods.Count
    foods = $foods
}

$json = $payload | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText($outFile, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Wrote $($foods.Count) foods to $outFile"
