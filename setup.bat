@echo off
echo Installing Node.js dependencies...
cd backend
call npm install
echo.
echo Starting backend server...
call npm start
pause
