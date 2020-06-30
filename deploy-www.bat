if "%~1" == "NO_BUILD" goto deploy
set "OLD_DIR=%CD%"

if "%HOST%" equ "" (
    echo Please enter the host address:
    set /P HOST=
)

:build
cd /D "%~dp0\www"
call ng build --prod
cd /D "%OLD_DIR%"

:deploy
pscp -r -i "%~dp0\env\cryptoFanta-heficed_cryptof.ppk" "%~dp0\www\dist" cryptof@%HOST%:crypto-fantazia/www/

:launch
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_cryptof.ppk" cryptof@%HOST% "killall lite-server"
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_cryptof.ppk" cryptof@%HOST% "cd crypto-fantazia/www/ && npx lite-server &"
