@echo off
rem Start the Gradio application through the project's local virtual environment.
setlocal

for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"
if not defined VENV_DIR set "VENV_DIR=%PROJECT_ROOT%\.venv"
if defined VENV_PYTHON goto launch
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"

if not exist "%VENV_PYTHON%" (
  goto missing_virtual_environment
)

:launch
echo Starting Sherlok
call "%VENV_PYTHON%" "%PROJECT_ROOT%\app.py"
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%" == "0" echo The application stopped with an error. Review the message above. 1>&2
call :pause_if_needed
exit /b %EXIT_CODE%

:missing_virtual_environment
echo Virtual environment not found. Run scripts\setup.bat first. 1>&2
call :pause_if_needed
exit /b 1

:pause_if_needed
if defined NO_PAUSE exit /b 0
echo.
echo Press any key to continue . . .
exit /b 0
