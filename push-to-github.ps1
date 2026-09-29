$env:Path = "C:\Program Files\Git\cmd;" + $env:Path
Set-Location "c:\Users\Administrator\新建文件夹\plane-war"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload to github.com/xingcegongyue555/-vue3-ts"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1) Open: https://github.com/settings/tokens"
Write-Host "2) Copy the token value (starts with ghp_ ...)"
Write-Host "3) Paste below and press Enter"
Write-Host ""
$token = Read-Host "GitHub Token (ghp_...)"
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "Empty token, cancelled." -ForegroundColor Red
  pause
  exit 1
}
$remote = "https://xingcegongyue555:$token@github.com/xingcegongyue555/-vue3-ts.git"
Write-Host "Pushing..."
git -c http.version=HTTP/1.1 push $remote main:main
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin "https://github.com/xingcegongyue555/-vue3-ts.git"
  git branch --set-upstream-to=origin/main main 2>$null
  Write-Host ""
  Write-Host "SUCCESS!" -ForegroundColor Green
  Write-Host "https://github.com/xingcegongyue555/-vue3-ts"
} else {
  Write-Host "Push failed: $LASTEXITCODE" -ForegroundColor Red
}
Write-Host ""
pause
