@echo off
setlocal enabledelayedexpansion

REM ?????????scripts ???????
cd /d "%~dp0.."

REM MSVC / Windows SDK ???????????????????????
if not defined VS_CPP_SDK set "VS_CPP_SDK=E:\software\vs_studio\package\SDK\ScopeCppSDK\vc15"
set "VC=%VS_CPP_SDK%\VC"
set "SDK=%VS_CPP_SDK%\SDK"

if not exist "%VC%\bin\cl.exe" (
    echo [build-native] ????? cl.exe: %VC%\bin\cl.exe
    echo ????????????? VS_CPP_SDK ??? ScopeCppSDK\vc15 ??
    exit /b 1
)

REM Node ?????? node.lib??node-gyp ?????
for /f "delims=" %%v in ('node -p "process.version.slice(1)"') do set "NODE_VERSION=%%v"
set "NODE_GYP_ROOT=%LOCALAPPDATA%\node-gyp\Cache\%NODE_VERSION%"
set "NODE_GYP_LIB=%NODE_GYP_ROOT%\x64"
set "NODE_INCLUDE=%NODE_GYP_ROOT%\include\node"

if not exist "%NODE_GYP_LIB%\node.lib" (
    echo [build-native] downloading Node %NODE_VERSION% headers...
    call node-gyp install %NODE_VERSION%
    if errorlevel 1 exit /b 1
)

set "ROOT=%CD%"
set "OUT=%ROOT%\build\Release"
set "OBJ=%OUT%\adapter.obj"
set "TARGET=%OUT%\adapter.node"

if not exist "%OUT%" mkdir "%OUT%"

echo [build-native] ???? adapter.cpp ...
"%VC%\bin\cl.exe" /nologo /EHsc /std:c++17 /DNAPI_CPP_EXCEPTIONS /DNDEBUG /DWIN32 /D_WINDOWS /D_CRT_SECURE_NO_DEPRECATE ^
    /I"%ROOT%\include" /I"%ROOT%\include\self" /I"%ROOT%\include\json" /I"%ROOT%\include\kcbpcli\lib" ^
    /I"%ROOT%\node_modules\node-addon-api" /I"%NODE_INCLUDE%" ^
    /I"%VC%\include" /I"%SDK%\include\um" /I"%SDK%\include\shared" /I"%SDK%\include\ucrt" ^
    /c "%ROOT%\src\adapter.cpp" /Fo"%OBJ%"
if errorlevel 1 exit /b 1

echo [build-native] ???? adapter.node ...
"%VC%\bin\link.exe" /nologo /DLL /OUT:"%TARGET%" "%OBJ%" ^
    "%ROOT%\include\kcbpcli\lib\KCBPCli.lib" "%NODE_GYP_LIB%\node.lib" ^
    /LIBPATH:"%VC%\lib" /LIBPATH:"%SDK%\lib" /LIBPATH:"%SDK%\lib\x64" /LIBPATH:"%SDK%\lib\um\x64"
if errorlevel 1 exit /b 1

echo [build-native] ???: %TARGET%
exit /b 0
