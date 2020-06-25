:deploy
plink -no-antispoof -ssh -i .\env\cryptoFanta-heficed_ubuntu.ppk ubuntu@%HOST% "cd crypto-fantazia && git pull origin master"
:Build_Launch
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_ubuntu.ppk" ubuntu@%HOST% "killall node"
plink -no-antispoof -ssh -i "%~dp0\env\cryptoFanta-heficed_ubuntu.ppk" ubuntu@%HOST% "source ./.profile && cd crypto-fantazia/api/ && npm run build && node build/api/src/index.js &"
