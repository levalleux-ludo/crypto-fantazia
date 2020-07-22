pushd "%~dp0"
docker build -t local/rskj/ubuntu .
pause
popd