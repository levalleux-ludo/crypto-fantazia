@echo off
for /F "usebackq tokens=1,2,3 delims= " %%I in (%USERPROFILE%\.aws\credentials) do if %%J=== set %%I=%%K
