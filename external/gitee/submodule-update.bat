@echo off
setlocal enabledelayedexpansion

REM Redirects git submodules to gitee mirrors and updates these recursively.
REM To revert the changed URLs use 'git submodule deinit .'

REM -----------------------------------------------------------------------------
REM Common batch

if not "%DEBUG_SHELL%"=="" (
  set "DEBUG_SHELL=true"
  echo DEBUG_SHELL is set
)

REM -----------------------------------------------------------------------------

set "ERR_CANNOT_UPDATE=13"

set "REPO_DIR=%~1"
if "%REPO_DIR%"=="" set "REPO_DIR=%CD%"
cd /d "%REPO_DIR%"

set "SCRIPT_SH=%~dp0%~nx0"
if not exist "%SCRIPT_SH%" (
  echo %SCRIPT_SH% does not exist!
  exit /b 1
)

REM repo group
set "REPOS_ARRAY=esp-idf espressifsystems
esp-rainmaker espressifsystems
esp-insights espressifsystems
esp-qcloud espressifsystems
esp-sr esp-components
esp-adf-libs esp-components
esp32-camera esp-components
esp-rainmaker-common esp-components
esp-dl esp-components"

set /a len=0
for %%A in (%REPOS_ARRAY%) do (
  set /a len+=1
)

pushd %REPO_DIR% >nul

REM 0
if not exist ".gitmodules" exit /b 0

REM 1
git submodule init

REM 2
REM Replacing each submodule URL of the current repository
REM to the mirror repos in gitee
for /f "usebackq delims=" %%L in (`git config -f .gitmodules --list ^| findstr /C:".url=../" /C:".url=../../" /C:".url=https://github.com/" /C:".url=https://git.eclipse.org/"`) do (
  for /f "tokens=1,2 delims==" %%A in ("%%L") do (
    set "LINE=%%A"
    set "VALUE=%%B"

    setlocal enabledelayedexpansion
    set "SUBPATH=!LINE:~12!"
    set "LOCATION=!LINE:~-1!"
    set "LOCATION=!LOCATION:.git=!"
    for /l %%I in (0,2,%len%) do (
      set "REPO=!REPOS_ARRAY:~%%I,1!"
      set "GROUP=!REPOS_ARRAY:~%%I+1,1!"

      if "!LOCATION!"=="!REPO!" (
        set "SUBURL=https://gitee.com/!GROUP!/!LOCATION!"
        endlocal & set "SUBURL=!SUBURL!"
        exit /b
      ) else (
        REM gitee url is case sensitive
        if "!LOCATION!"=="unity" (
          set "LOCATION=Unity"
        )
        if "!LOCATION!"=="cexception" (
          set "LOCATION=CException"
        )
        set "SUBURL=https://gitee.com/esp-submodules/!LOCATION!"
        endlocal & set "SUBURL=!SUBURL!"
      )
    )
  )

  git config submodule."!SUBPATH!".url "!SUBURL!"
)

REM 3
REM Getting submodules of the current repository from gitee mirrors
for /f %%I in ('git --version') do (
  set "GIT_VERSION=%%I"
)
set "REQUIRED_VERSION=2.11.0"
setlocal enabledelayedexpansion
if "!REQUIRED_VERSION!" leq "!GIT_VERSION!" (
  git submodule update --progress || exit /b %ERR_CANNOT_UPDATE%
) else (
  git submodule update || exit /b %ERR_CANNOT_UPDATE%
)
endlocal

REM 4
REM Replacing URLs for each sub-submodule.
REM The script runs recursively
git submodule foreach "%SCRIPT_SH%" REM No '--recursive'

popd >nul
