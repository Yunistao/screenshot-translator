@echo off
REM 截图翻译小工具构建脚本

echo 截图翻译小工具 - 构建可执行文件
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

echo 开始构建应用...
echo.

REM 构建应用
npm run dist:win

if %errorlevel% eq 0 (
    echo.
    echo 构建成功完成！
    echo 您可以在 release 目录中找到安装程序
    echo.
    echo 安装程序位于: C:\Users\yt\screenshot-translator\release
    echo.
    explorer.exe "C:\Users\yt\screenshot-translator\release"
) else (
    echo.
    echo 构建过程中出现错误
    echo 请检查控制台输出以获取详细信息
)

pause