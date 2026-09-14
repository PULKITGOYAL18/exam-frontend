## How to run frontend

Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
$env:Path += ";C:\Program Files\nodejs"
node -v 

npm install
npm run dev 


## How to run backend
co


<!-- helper for getting all file code in a folder -->
 Get-ChildItem -Recurse -File | Where-Object { $_.Name -ne "all-files.txt" } | ForEach-Object {>>     Add-Content -Path "all-files.txt" -Value "`r`n==================== $($_.FullName) ====================`r`n"
>>     Get-Content -LiteralPath $_.FullName -Raw | Add-Content -Path "all-files.txt"