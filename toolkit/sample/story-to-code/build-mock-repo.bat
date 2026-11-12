@echo off
rem Runs build-mock-repo.ps1 with the same arguments. Example: build-mock-repo.bat -Stage planned -Reset
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-mock-repo.ps1" %*
exit /b %ERRORLEVEL%
