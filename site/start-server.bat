@echo off
rem QianFuZhiTu local web server launcher
rem Usage: double-click this file. It serves this folder at http://127.0.0.1:8321/ and opens your browser.
cd /d "%~dp0"
echo ================================================
echo  QianFuZhiTu - local web server
echo  http://127.0.0.1:8321/
echo  Keep this window open while playing.
echo ================================================
start "" "http://127.0.0.1:8321/"
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8321 --bind 127.0.0.1
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8321 --bind 127.0.0.1
  goto :eof
)
echo [ERROR] Python not found in PATH.
echo Install Python from https://www.python.org/ then run this file again.
pause
