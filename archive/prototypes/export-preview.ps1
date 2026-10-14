$ErrorActionPreference='Stop'
$source=Get-Content "$PSScriptRoot/prototype/index.html" -Raw
$fontData=[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PSScriptRoot/prototype/fonts/Outfit.ttf"))
foreach($name in @('home','workspace','analysis','explore','assistant','property')){
 $css=Get-Content "$PSScriptRoot/prototype/$name.css" -Raw
 $css=$css.Replace("url('fonts/Outfit.ttf')", "url('data:font/ttf;base64,"+$fontData+"')")
 $js=Get-Content "$PSScriptRoot/prototype/$name.js" -Raw
 $source=$source.Replace('<link rel="stylesheet" href="'+$name+'.css">','<style>'+$css+'</style>').Replace('<script src="'+$name+'.js"></script>','<script>'+$js+'</script>')
}
$propertyPhoto=[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PSScriptRoot/prototype/property-photo.png"))
$source=$source.Replace('src="property-photo.png"','src="data:image/png;base64,'+$propertyPhoto+'"')
$license=Get-Content "$PSScriptRoot/prototype/fonts/OFL.txt" -Raw
$source=$source.Replace('</head>','<!-- Outfit font license: '+$license+' --></head>')
Set-Content -LiteralPath "$PSScriptRoot/手机首页预览.html" -Value $source -Encoding utf8

