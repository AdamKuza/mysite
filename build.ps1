# Сборка готовой версии из src. Генерирует векторные детали и записывает три отдельных файла: index.html, styles.css и app.js.
$ErrorActionPreference = 'Stop'
$siteDir = $PSScriptRoot
[Threading.Thread]::CurrentThread.CurrentCulture = [Globalization.CultureInfo]::InvariantCulture

function New-SvgBuilder { [Text.StringBuilder]::new() }
function Add-SvgLine($builder, [string]$line) { [void]$builder.AppendLine($line) }
function Write-Utf8([string]$path, [string]$value) { [IO.File]::WriteAllText($path, $value, [Text.UTF8Encoding]::new($false)) }

# Deterministic vector linework: no bitmap, canvas, tracing or downloaded artwork.
$city = New-SvgBuilder
Add-SvgLine $city '<svg class="city" data-fold="paper" data-delay=".08" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs><pattern id="masonry" width="9" height="6" patternUnits="userSpaceOnUse"><path d="M0 6H9M4 0V6" fill="none" stroke="currentColor" stroke-width=".3" opacity=".3"/></pattern></defs><g stroke="currentColor" stroke-width=".8" stroke-linejoin="round">'
$x = -10
$n = 0
while ($x -lt 1200) {
  $w = 45 + (($n * 17) % 43)
  $h = 36 + (($n * 13) % 33)
  $top = 213 - $h
  $roof = $top - 10 - ($n % 3) * 2
  Add-SvgLine $city "<g class='facade'><path d='M$x 213V$top`h${w}v${h}Z' fill='var(--paper)'/><path d='M$x $top`l12 -12h$($w-24)l12 12Z' fill='url(#masonry)'/><path d='M$x $($top+5)h$w`M$x 209h$w' fill='none'/>"
  for ($row = 0; $row -lt 3; $row++) {
    for ($wx = $x + 8; $wx -lt $x + $w - 6; $wx += 11) {
      $wy = $top + 10 + $row * 14
      if ($wy -lt 204) { Add-SvgLine $city "<path d='M$wx $wy`h4v7h-4Z' fill='none'/><path d='M$($wx-1) $($wy+9)h6' stroke-width='.45'/>" }
    }
  }
  Add-SvgLine $city "<path d='M$($x+6) $($top-5)v-12h5v12m$($w-24) 0v-9h5v9' fill='var(--paper)'/><path d='M$($x+3) $($top+6)v$($h-10)M$($x+$w-3) $($top+6)v$($h-10)' fill='none' stroke-width='.4'/></g>"
  $x += $w
  $n++
}
# Baroque bell tower with a slender spire, assembled from independent SVG paths.
Add-SvgLine $city @'
<g class="bell-tower" fill="var(--paper)">
  <path d="M724 213v-47h68v47ZM734 166v-33h48v33ZM741 133v-30h34v30ZM747 103V84h22v19ZM753 84V65h10v19ZM758 65V7l5 58Z"/>
  <path d="m720 167 38-15 38 15ZM730 134l28-14 28 14ZM737 103l21-12 21 12ZM744 84l14-10 14 10Z"/>
  <path d="M718 211h80M730 207v-31m8 31v-31m40 31v-31m8 31v-31M744 164v-22m28 22v-22M750 130v-21m16 21v-21M753 99V88m10 11V88M756 63h7m-5-56V0m-4 5h8" fill="none"/>
  <path d="M751 209v-25q7-11 14 0v25ZM750 157v-13q8-9 16 0v13ZM753 124v-12q5-6 10 0v12Z"/>
  <circle cx="758" cy="173" r="5" fill="none"/><path d="M758 169v4l3 2" fill="none"/>
</g>
<g class="river-palace" fill="var(--paper)">
  <path d="M866 213v-52h227v52ZM855 161l17-14h213l18 14ZM938 157v-15h81v15ZM932 142l47-22 47 22Z"/>
  <path d="M872 168h215M872 196h215M872 207h215M944 153h69M945 139h68" fill="none"/>
  <path d="M971 213v-30q8-14 16 0v30Z"/>
  <path d="M940 172v41m9-41v41m58-41v41m9-41v41" fill="none"/>
</g>
'@
for ($wx=877; $wx -lt 1080; $wx+=13) {
  if ($wx -lt 965 -or $wx -gt 994) { Add-SvgLine $city "<path d='M$wx 175h5v10h-5Zm0 18h5v9h-5Z' fill='none'/>" }
}
Add-SvgLine $city '</g><g fill="none" stroke="currentColor" stroke-width=".65"><path d="M0 214H1200M0 218H1200M0 224H1200M0 230H1200"/>'
for ($i=0; $i -le 1200; $i+=9) { Add-SvgLine $city "<path d='M$i 214v16' opacity='.45'/>" }
Add-SvgLine $city '</g></svg>'
Write-Utf8 "$siteDir\src\city.svg" $city.ToString()

$sea = New-SvgBuilder
Add-SvgLine $sea '<svg class="sea" data-fold="paper" data-delay=".18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 140" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="water-engraving" width="1200" height="140" patternUnits="userSpaceOnUse"><g stroke="currentColor" fill="none" stroke-linecap="round">'
for ($row=0; $row -lt 25; $row++) {
  $y = 5 + $row * 5.5
  $offset = ($row * 37) % 70
  $stroke = [math]::Round(.35 + $row * .017,2)
  $opacity = [math]::Round(.3 + $row * .021,2)
  for ($j=0; $j -lt 18; $j++) {
    $sx = $j * 72 - $offset
    $len = 22 + (($row*7 + $j*13) % 44)
    $dy = 1 + (($j + $row) % 3)
    Add-SvgLine $sea "<path d='M$sx $y`q$([math]::Round($len*.25,1)) -$dy $([math]::Round($len*.5,1)) 0t$([math]::Round($len*.5,1)) 0' stroke-width='$stroke' opacity='$opacity'/>"
  }
}
Add-SvgLine $sea '</g></pattern></defs><g class="water-ripple"><rect class="water-drift" x="-1200" y="-3" width="3600" height="146" fill="url(#water-engraving)"/></g></svg>'
Write-Utf8 "$siteDir\src\sea.svg" $sea.ToString()

$clouds = New-SvgBuilder
Add-SvgLine $clouds '<svg class="clouds" data-fold="paper" data-delay=".12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 170" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".65">'
for ($i=0; $i -lt 11; $i++) {
  $y=30 + $i*3
  Add-SvgLine $clouds "<path d='M0 $($y+45)q30 -12 60 -2t60 0m-30 -$($i+5)q16 -19 38 -8q19 -26 46 -5q26 -10 50 8m580 -$($i+8)q22 -16 45 -4q29 -30 56 -9q40 -12 73 9m-90 15q60 -9 100 -3t130 -2'/>"
}
Add-SvgLine $clouds '</g></svg>'
Write-Utf8 "$siteDir\src\clouds.svg" $clouds.ToString()

$columns = New-SvgBuilder
foreach ($side in @('left','right')) {
  Add-SvgLine $columns @"
<div class="column column-$side" data-fold="$side" data-delay=".10" aria-hidden="true">
  <svg class="urn" viewBox="0 0 70 92"><use href="#urn"/></svg>
  <div class="abacus"></div>
  <svg class="capital" viewBox="0 0 140 100"><use href="#capital"/></svg>
  <div class="shaft"><div class="shaft-panel"><svg class="pendant" viewBox="0 0 40 300"><use href="#pendant"/></svg></div></div>
  <div class="base-ring"></div>
  <div class="plinth"><svg viewBox="0 0 60 60"><use href="#rosette"/></svg></div>
  <div class="foot"></div>
</div>
"@
}

# Дальше собираются готовые фрагменты: шаблон HTML, стили сцен со ссылками на локальные шрифты и контроллеры в порядке зависимостей.
$markup = [IO.File]::ReadAllText("$siteDir\src\template.html")
$meccaStyle = [IO.File]::ReadAllText("$siteDir\src\mecca.css").Replace('__MECCA_FONT__', 'src/fonts/ElMessiri-VF.ttf')
$meccaStyle += "`n/* El Messiri font license:`n" + [IO.File]::ReadAllText("$siteDir\src\fonts\ElMessiri-OFL.txt") + "`n*/`n"
$moscowStyle = [IO.File]::ReadAllText("$siteDir\src\moscow.css").Replace('__MOSCOW_FONT__', 'src/fonts/Ponomar-Regular.ttf')
$moscowStyle += "`n/* Ponomar font license:`n" + [IO.File]::ReadAllText("$siteDir\src\fonts\Ponomar-OFL.txt") + "`n*/`n"
$newyorkStyle = [IO.File]::ReadAllText("$siteDir\src\newyork.css").Replace('__NEWYORK_FONT__', 'src/fonts/Oswald-VF.ttf')
$newyorkStyle += "`n/* Oswald font license:`n" + [IO.File]::ReadAllText("$siteDir\src\fonts\Oswald-OFL.txt") + "`n*/`n"
# Ключи соответствуют местам подстановки в шаблоне. CSS и BOOK_SCRIPT записываются отдельно, остальные фрагменты встраиваются в HTML.
$parts = @{
  CSS = [IO.File]::ReadAllText("$siteDir\src\styles.css") + [IO.File]::ReadAllText("$siteDir\src\book.css") + [IO.File]::ReadAllText("$siteDir\src\harbor.css") + $newyorkStyle + $meccaStyle + $moscowStyle + [IO.File]::ReadAllText("$siteDir\src\rain.css") + [IO.File]::ReadAllText("$siteDir\src\snow.css") + [IO.File]::ReadAllText("$siteDir\src\weather.css") + [IO.File]::ReadAllText("$siteDir\src\viewport.css")
  ORNAMENTS = [IO.File]::ReadAllText("$siteDir\src\ornaments.svg")
  SHIP = [IO.File]::ReadAllText("$siteDir\src\ship.svg")
  CITY = $city.ToString()
  SEA = $sea.ToString()
  CLOUDS = $clouds.ToString()
  COLUMNS = $columns.ToString()
  MOSCOW = [IO.File]::ReadAllText("$siteDir\src\moscow.svg")
  MOSCOW_FRAME = [IO.File]::ReadAllText("$siteDir\src\moscow-frame.svg")
  NEWYORK = [IO.File]::ReadAllText("$siteDir\src\newyork.svg")
  NEWYORK_FRAME = [IO.File]::ReadAllText("$siteDir\src\newyork-frame.svg")
  MECCA = [IO.File]::ReadAllText("$siteDir\src\mecca.svg")
  MECCA_FRAME = [IO.File]::ReadAllText("$siteDir\src\mecca-frame.svg")
  BOOK_SCRIPT = [IO.File]::ReadAllText("$siteDir\src\book.js") + [IO.File]::ReadAllText("$siteDir\src\harbor.js") + [IO.File]::ReadAllText("$siteDir\src\rope.js") + [IO.File]::ReadAllText("$siteDir\src\weather.js") + [IO.File]::ReadAllText("$siteDir\src\rain.js") + [IO.File]::ReadAllText("$siteDir\src\snow.js") + [IO.File]::ReadAllText("$siteDir\src\mecca-air.js")
}
# Исходники остаются раздельными в src; готовые файлы в корне перезаписываются при каждом запуске сборки.
foreach ($part in $parts.GetEnumerator()) { $markup = $markup.Replace("__$($part.Key)__", $part.Value) }
Write-Utf8 "$siteDir\styles.css" $parts.CSS
Write-Utf8 "$siteDir\app.js" $parts.BOOK_SCRIPT
Write-Utf8 "$siteDir\index.html" $markup
Get-Item -LiteralPath "$siteDir\index.html" | Select-Object FullName,Length
