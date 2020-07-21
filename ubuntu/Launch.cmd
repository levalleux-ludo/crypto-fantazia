set OLD_DIR=%CD%
cd /D "%~dp0\..\.."
start cmd /C docker run -i ^
 -v %CD%:/home/developer/Project ^
 -t local/rskj/ubuntu /bin/bash
cd /D %OLD_DIR%