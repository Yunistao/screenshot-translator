@echo off
REM 截图翻译小工具启动脚本

echo 正在启动截图翻译小工具...
echo.

REM 检查Node.js是否已安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查npm是否已安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到npm，请先安装Node.js
    pause
    exit /b 1
)

REM 切换到项目目录
cd /d "C:\Users\yt\screenshot-translator"

REM 检查node_modules是否存在，如果不存在则安装依赖
if not exist "node_modules" (
    echo 正在安装项目依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo 依赖安装完成
    echo.
)

REM 编译主进程文件
echo 正在编译主进程文件...
npx tsc -p tsconfig.main.json
if %errorlevel% neq 0 (
    echo 主进程编译失败
    pause
    exit /b 1
)
echo 主进程编译完成
echo.

REM 构建前端资源
echo 正在构建前端资源...
npm run build
if %errorlevel% neq 0 (
    echo 前端构建失败
    pause
    exit /b 1
)
echo 前端构建完成
echo.

echo 启动截图翻译小工具...
echo 应用已启动，请使用 Alt+S 进行截图翻译
echo 按 Ctrl+C 可停止应用
echo.

REM 启动应用
npm start

pause