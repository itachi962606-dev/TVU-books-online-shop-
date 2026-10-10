@echo off
title TVU Books Shop - NOVA AI server
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages (first time only)...
  call npm install
)
echo.
echo Open  http://localhost:3000  in your browser
echo.
call npm start
pause
