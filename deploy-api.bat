
if "%HOST%" equ "" (
    echo Please enter the host address:
    set /P HOST=
)


:deploy
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_cryptof.ppk" cryptof@%HOST% "[ ! -d "crypto-fantazia" ] && git clone https://github.com/levalleux-ludo/crypto-fantazia"
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_cryptof.ppk" cryptof@%HOST% "cd crypto-fantazia && git pull origin master && npm install"
:Build_Launch
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_cryptof.ppk" cryptof@%HOST% "killall node"
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_cryptof.ppk" cryptof@%HOST% "source ./.profile && cd crypto-fantazia/api/ && npm run build && node build/api/src/index.js &"
