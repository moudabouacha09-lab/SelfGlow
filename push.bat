@echo off
echo.
echo ================================
echo    SelfGlow — Pushing to GitHub
echo ================================
echo.
git add .
git commit -m "update"
git push
echo.
echo ================================
echo  APK building on GitHub Actions
echo  Check progress:
echo  https://github.com/moudabouacha09-lab/SelfGlow/actions
echo ================================
echo.
pause
