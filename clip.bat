@echo off
if /i "%1"=="render" (
  shift
  node "%~dp0scripts\render.js" %1 %2 %3 %4 %5 %6 %7 %8 %9
) else (
  node "%~dp0main.js" %*
)
