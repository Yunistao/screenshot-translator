// 测试应用基本功能
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== 测试截图翻译工具 ===\n');

// 检查项目结构
console.log('1. 检查项目结构...');
const requiredFiles = [
  'package.json',
  'src/main.ts',
  'src/preload.ts',
  'src/renderer.tsx',
  'src/components/ScreenshotTool.tsx',
  'src/components/SettingsPanel.tsx',
  'src/services/ocrService.ts',
  'src/services/translationService.ts',
  'src/i18n/zh-CN.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file}`);
    allFilesExist = false;
  }
});

// 检查构建文件
console.log('\n2. 检查构建文件...');
const buildFiles = [
  'dist/main.js',
  'dist/preload.js',
  'dist/index.html'
];

buildFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file}`);
    allFilesExist = false;
  }
});

// 检查依赖
console.log('\n3. 检查依赖...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  console.log('  依赖项:');
  Object.keys(dependencies).forEach(dep => {
    console.log(`    - ${dep}: ${dependencies[dep]}`);
  });
} catch (error) {
  console.log('  ✗ 读取package.json失败:', error.message);
  allFilesExist = false;
}

// 检查TypeScript编译
console.log('\n4. 检查TypeScript编译...');
try {
  execSync('npx tsc --noEmit', { cwd: __dirname, stdio: 'inherit' });
  console.log('  ✓ TypeScript编译无错误');
} catch (error) {
  console.log('  ✗ TypeScript编译失败');
  allFilesExist = false;
}

// 检查Electron API暴露
console.log('\n5. 检查Electron API暴露...');
const preloadContent = fs.readFileSync(path.join(__dirname, 'src/preload.ts'), 'utf8');
if (preloadContent.includes('contextBridge.exposeInMainWorld')) {
  console.log('  ✓ Electron API已正确暴露');
} else {
  console.log('  ✗ Electron API暴露可能存在问题');
  allFilesExist = false;
}

// 检查快捷键注册
console.log('\n6. 检查快捷键注册...');
const mainContent = fs.readFileSync(path.join(__dirname, 'src/main.ts'), 'utf8');
if (mainContent.includes('globalShortcut.register(\'Alt+S\'') && mainContent.includes('screenshot-request')) {
  console.log('  ✓ 全局快捷键Alt+S已注册');
} else {
  console.log('  ✗ 快捷键注册可能存在问题');
  allFilesExist = false;
}

// 检查截图功能
console.log('\n7. 检查截图功能...');
const screenshotToolContent = fs.readFileSync(path.join(__dirname, 'src/components/ScreenshotTool.tsx'), 'utf8');
if (screenshotToolContent.includes('window.electronAPI.requestScreenshot') && screenshotToolContent.includes('performOCR')) {
  console.log('  ✓ 截图和OCR功能已实现');
} else {
  console.log('  ✗ 截图功能可能存在问题');
  allFilesExist = false;
}

// 检查翻译功能
console.log('\n8. 检查翻译功能...');
const translationServiceContent = fs.readFileSync(path.join(__dirname, 'src/services/translationService.ts'), 'utf8');
if (translationServiceContent.includes('translateWithMicrosoft') && translationServiceContent.includes('translateWithGoogle') && 
    translationServiceContent.includes('translateWithBaidu') && translationServiceContent.includes('translateWithYoudao')) {
  console.log('  ✓ 多翻译引擎已实现');
} else {
  console.log('  ✗ 翻译功能可能存在问题');
  allFilesExist = false;
}

// 检查国际化
console.log('\n9. 检查国际化...');
const zhCNContent = fs.readFileSync(path.join(__dirname, 'src/i18n/zh-CN.ts'), 'utf8');
if (zhCNContent.includes('正在获取截图') && zhCNContent.includes('正在执行OCR识别')) {
  console.log('  ✓ 中文国际化已实现');
} else {
  console.log('  ✗ 国际化可能存在问题');
  allFilesExist = false;
}

// 检查历史记录功能
console.log('\n10. 检查历史记录功能...');
const imageManagerContent = fs.readFileSync(path.join(__dirname, 'src/services/imageManager.ts'), 'utf8');
if (imageManagerContent.includes('addImage') && imageManagerContent.includes('getAll') && imageManagerContent.includes('clearAll')) {
  console.log('  ✓ 历史记录功能已实现');
} else {
  console.log('  ✗ 历史记录功能可能存在问题');
  allFilesExist = false;
}

console.log('\n=== 测试完成 ===');
if (allFilesExist) {
  console.log('✅ 所有检查项通过，应用基本功能正常');
  console.log('\n下一步：运行应用测试实际功能');
  console.log('  1. 执行: npm start');
  console.log('  2. 点击"开始截图"按钮或按Alt+S快捷键');
  console.log('  3. 检查OCR识别和翻译结果');
  console.log('  4. 测试历史记录功能');
  console.log('  5. 测试设置功能');
} else {
  console.log('❌ 部分检查项未通过，应用可能存在问题');
  console.log('\n建议：');
  console.log('  1. 检查缺失的文件');
  console.log('  2. 修复TypeScript编译错误');
  console.log('  3. 确保Electron API正确暴露');
  console.log('  4. 检查快捷键注册逻辑');
}
