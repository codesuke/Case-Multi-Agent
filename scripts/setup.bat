@echo off
rem Create the local virtual environment and install every declared dependency.
setlocal

for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"
if not defined VENV_DIR set "VENV_DIR=%PROJECT_ROOT%\.venv"
if not defined VENV_PYTHON set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"
if not defined PYTHON_BIN set "PYTHON_BIN=py -3"

if not exist "%VENV_PYTHON%" (
  echo Creating virtual environment in %VENV_DIR%
  call %PYTHON_BIN% -m venv "%VENV_DIR%"
  if errorlevel 1 goto setup_failed
)

echo Installing Python requirements
"%VENV_PYTHON%" -m pip install --upgrade pip
if errorlevel 1 goto setup_failed
"%VENV_PYTHON%" -m pip install -r "%PROJECT_ROOT%\requirements.txt"
if errorlevel 1 goto setup_failed

echo Setup complete. Start the app with scripts\run.bat
call :pause_if_needed
exit /b 0

:setup_failed
set "EXIT_CODE=%errorlevel%"
echo Setup failed. Review the message above and try again. 1>&2
call :pause_if_needed
exit /b %EXIT_CODE%

:pause_if_needed
if defined NO_PAUSE exit /b 0
echo.
pause
exit /b 0
