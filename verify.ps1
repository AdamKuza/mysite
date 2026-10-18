$ErrorActionPreference = 'Stop'
$markup = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'index.html'))
if ($markup -match 'data:image|<img\b|<image\b|<canvas\b|(?:href|src)\s*=\s*["'']https?://(?!www.w3.org/2000/svg)|url\(\s*["'']?https?://') { throw 'The deliverable contains raster or an external resource.' }
if ($markup -match '__[A-Z]+__') { throw 'An unresolved build placeholder remains.' }
if ($markup -notmatch '<h1 id="name"><span>АДАМА</span> <span>КУЗНЕЦОВА</span></h1>') { throw 'The approved name is missing.' }
if ($markup -match '<style\b|<script>') { throw 'CSS and JavaScript must be separate files.' }
if ($markup -notmatch '<link rel="stylesheet" href="styles.css">' -or $markup -notmatch '<script src="app.js"></script>') { throw 'Expected local stylesheet and script references.' }
$css = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'styles.css'))
$js = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'app.js'))
if ($css -match '__[A-Z_]+__|data:font|url\(["'']?https?://' -or $js.Length -lt 1000) { throw 'Invalid CSS or JavaScript output.' }
foreach ($font in @('ElMessiri-VF.ttf', 'Ponomar-Regular.ttf', 'Oswald-VF.ttf')) {
  if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "src/fonts/$font"))) { throw "Missing font: $font" }
}
if (-not $markup.Contains('Живу въ') -or -not $markup.Contains('Москвѣ')) { throw 'Moscow residence copy is missing.' }
$moscow = [regex]::Match($markup, '<section id="moscow-scene"[\s\S]*?</section>').Value
if ($moscow -match 'class="sea"') { throw 'Moscow must not contain a water layer.' }
if ([regex]::Matches($markup,'<svg class="sea"').Count -ne 1) { throw 'Expected one water layer, only in Petersburg.' }
if ([regex]::Matches($markup,'class="pull-cord"').Count -ne 5) { throw 'Expected four navigation cords and one secret cord.' }
if ([regex]::Matches($markup,'class="site scene ').Count -ne 5) { throw 'Expected four main scenes and one secret scene.' }
if (-not $markup.Contains('Исповѣдую исламъ<br>суннитскаго толку.') -or -not $markup.Contains('Въ Мекку')) { throw 'Mecca biography or cord is missing.' }
$mecca = [regex]::Match($markup, '<section id="mecca-scene"[\s\S]*?</section>').Value
if (-not $mecca.Contains('class="mecca-model"') -or $mecca -match 'class="sea"|liberty-ripples') { throw 'Expected Kaaba and a dry courtyard in Mecca.' }
if (-not $markup.Contains('Знаю американскій англійскій.') -or -not $markup.Contains('Мечтаю слетать въ Нью-Іоркъ.')) { throw 'New York biography copy is missing.' }
if ($markup -match 'ny-vehicle|ny-traffic|times-square|ny-reference') { throw 'Removed Times Square content remains.' }
if (-not $markup.Contains('class="liberty-monument"')) { throw 'Statue of Liberty is missing.' }
$newYorkSvg = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'src\newyork.svg'))
if ($newYorkSvg -match '<text\b') { throw 'The monument artwork must have no lettering.' }
$ids = @{}
foreach ($match in [regex]::Matches($markup, '\bid=["'']([^"'']+)["'']')) {
  $id = $match.Groups[1].Value
  if ($ids.ContainsKey($id)) { throw "Duplicate DOM id: $id" }
  $ids[$id] = $true
}
foreach ($match in [regex]::Matches($markup, '(?:href=["'']#|url\(#)([a-zA-Z0-9-]+)')) {
  $id = $match.Groups[1].Value
  if (-not $ids.ContainsKey($id)) { throw "Broken SVG reference: $id" }
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'src') -Filter '*.svg') {
  $document = [xml]([IO.File]::ReadAllText($file.FullName))
  Write-Output "SVG XML valid: $($file.Name)"
}
Write-Output "PASS: separate HTML/CSS/JS, local fonts, no raster or remote resources, correct name and valid vector references."
$resultsPath = Join-Path $PSScriptRoot 'qa\rope-results.json'
if (Test-Path -LiteralPath $resultsPath) {
  $report = [IO.File]::ReadAllText($resultsPath) | ConvertFrom-Json
  if ($report.errors.Count -ne 0 -or $report.results.Count -ne 3) { throw 'Rope browser validation failed.' }
  Write-Output "Archived Firefox book report (previous build): $($report.results.Count) viewport interaction sets verified."
}
$newYorkPath = Join-Path $PSScriptRoot 'qa\newyork-results.json'
if (Test-Path -LiteralPath $newYorkPath) {
  $report = [IO.File]::ReadAllText($newYorkPath) | ConvertFrom-Json
  if ($report.errors.Count -ne 0 -or $report.results.Count -ne 5) { throw 'New York browser validation failed.' }
  Write-Output "Archived Firefox New York report (previous build): $($report.results.Count) viewport interaction sets verified."
}
