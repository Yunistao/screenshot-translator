# 截图翻译小工具 - 详细使用指南

## 1. 项目启动步骤

### 环境要求
- Node.js 版本 >= 16
- npm 包管理器

### 启动步骤
1. 打开命令提示符或终端
2. 导航到项目目录:
   ```
   cd C:\Users\yt\screenshot-translator
   ```
3. 安装项目依赖（首次运行时）:
   ```
   npm install
   ```
4. 编译项目:
   ```
   npm run build:main     # 编译主进程
   npm run build:renderer # 构建前端资源
   ```
5. 启动开发模式:
   ```
   npm run dev
   ```

   或者直接运行应用:
   ```
   npm start
   ```

**简便启动方式：**
双击运行 `start-app.bat` 批处理脚本，该脚本会自动执行上述所有步骤。

注意：Windows上可能会出现一些非致命错误，如 "WSALookupServiceBegin failed"、"Can't find filter element" 或 "Unable to move the cache"，这些都是Electron在Windows上的常见现象，不影响应用功能。快捷键注册偶尔会失败，可以尝试重启应用解决。

## 2. 项目汉化说明

### 汉化范围
- 界面文字：已完成全面汉化
- 操作按钮：全部翻译为中文
- 设置面板：使用中文标签和提示
- 错误信息：提供中文提示
- 语言选项：支持中、英、日、韩等多种语言

### 汉化架构
- 使用国际化(i18n)架构，便于未来扩展多语言
- 所有界面文本都已迁移到语言文件
- 支持动态切换语言（当前默认为中文）

## 3. 设置微软翻译API

### 获取API密钥
1. 访问 Azure 门户: https://portal.azure.com/
2. 搜索并创建 "Translator" 资源
3. 在 "Keys and Endpoint" 选项卡中获取:
   - API 密钥(Key 1 或 Key 2)
   - 区域(Location) - 例如: "eastasia", "westus2"

### 在应用中配置API
1. 启动应用后，在设置面板中找到 "翻译设置" 部分
2. 在 "翻译API密钥" 字段中输入您的API密钥
3. 在 "API区域" 字段中输入您的区域(如: eastasia)
4. 点击 "保存设置"

或者，您也可以通过以下方式配置:
- 在系统环境变量中设置 `TRANSLATOR_API_KEY` 和 `TRANSLATOR_REGION`
- 在浏览器的 localStorage 中设置相应键值

## 4. 使用方法

### 基本使用
1. 启动应用
2. 按下 `Alt+S` 快捷键开始截图
3. 拖拽鼠标选择需要翻译的文本区域
4. 释放鼠标完成截图
5. 应用会自动进行OCR识别和翻译
6. 查看翻译结果窗口(默认置顶显示)

### 高级功能
- **设置调整**: 可在设置面板中修改快捷键、翻译语言、界面透明度等
- **历史记录**: 翻译过的图片会在历史记录中保存，方便查阅
- **多语言支持**: 支持中、英、日、韩、法、西等多种语言互译

## 5. 构建可执行文件（带图标）

### 为Windows构建安装程序
1. 确保已安装项目依赖
2. 准备好图标文件 (见 public/icon-info.txt)
3. 运行以下命令构建Windows安装程序:
   ```
   npm run dist:win
   ```

   生成的安装程序将在 `release` 目录中找到

### 构建到其他平台
- macOS: `npm run dist:mac`
- Linux: `npm run dist:linux`
- 通用: `npm run dist`

### 关于图标
1. 将您的PNG格式图标文件命名为 `icon.png` 并放在 `public` 目录中
2. 如果需要支持macOS，创建ICNS格式图标并命名为 `icon.icns`
3. 重新构建应用以应用新图标

## 6. 常见问题解决

### 问题1: 应用无法启动
- 确保已编译主进程文件：`npm run build:main`
- 确保已构建前端资源：`npm run build:renderer`
- 检查 dist 目录中是否包含 `main.js` 文件

### 问题2: 快捷键不工作
- 检查是否与其他应用程序冲突
- 尝试以管理员身份运行应用
- 检查Windows安全软件是否阻止了全局快捷键
- 应用启动后等待几秒钟再尝试快捷键

### 问题3: OCR识别不准确
- 确保截图中文字清晰可见
- 文字颜色与背景对比度高更有利于识别
- 尝试不同语言设置

### 问题4: 翻译API错误
- 检查API密钥是否正确
- 确认API区域设置无误
- 验证账户是否有足够的配额

## 7. 注意事项

- 您的API密钥存储在本地，不会上传到任何服务器
- 翻译API每月有500万字符的免费额度
- OCR功能离线运行，不需网络连接
- 应用数据存储在浏览器localStorage中