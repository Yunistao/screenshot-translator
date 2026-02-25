// 国际化配置 - 中文
export const zhCN = {
  // 通用
  common: {
    save: '保存',
    cancel: '取消',
    close: '关闭',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    refresh: '刷新',
    clear: '清空',
    reset: '重置',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    search: '搜索',
    copy: '复制',
    paste: '粘贴',
    cut: '剪切',
    undo: '撤销',
    redo: '重做'
  },

  // 应用标题和描述
  app: {
    title: '截图翻译工具',
    description: '便捷的截图翻译工具，支持OCR文字识别和多语言翻译功能'
  },

  // 截图工具
  screenshot: {
    start: '开始截图',
    cancel: '取消截图',
    retry: '重试',
    processing: '处理中...',
    selecting: '选择截图区域...',
    altKey: '开始截图 (Alt+S)',
    instruction: '拖拽选择截图区域，按 ESC 取消',
    captureFailed: '截图失败，请重试',
    processingProgress: {
      getting: '正在获取截图...',
      ocr: '正在执行OCR识别...',
      translating: '正在翻译文本...',
      completed: '处理完成！'
    }
  },

  // OCR相关
  ocr: {
    title: 'OCR 识别结果',
    recognizeFailed: 'OCR识别失败'
  },

  // 翻译相关
  translation: {
    title: '翻译结果',
    serviceUnconfigured: '未配置翻译API密钥，使用模拟翻译',
    failed: '翻译失败',
    apiCallFailed: '翻译API调用失败',
    emptyResult: '翻译服务返回空结果'
  },

  // 历史记录
  history: {
    title: '翻译历史记录',
    show: '显示历史记录',
    hide: '隐藏历史记录',
    clear: '清空历史',
    refresh: '刷新',
    empty: '暂无历史记录',
    item: {
      ocrPrefix: 'OCR: ',
      translationPrefix: '翻译: ',
      timeLabel: '时间: ',
      showAgain: '重新显示',
      delete: '删除'
    }
  },

  // 设置面板
  settings: {
    title: '设置',
    show: '显示设置',
    hide: '隐藏设置',
    saved: '设置已保存！',

    // 快捷键设置
    shortcut: {
      title: '快捷键设置',
      keyLabel: '截图快捷键:',
      placeholder: '例如: Alt+S'
    },

    // 翻译设置
    translation: {
      title: '翻译设置',
      apiKeyLabel: '翻译API密钥:',
      apiKeyPlaceholder: '请输入微软翻译API密钥',
      regionLabel: 'API区域:',
      regionPlaceholder: '例如: global 或特定区域',
      sourceLabel: '源语言:',
      targetLabel: '目标语言:',
      autoDetect: '自动检测'
    },

    // 界面设置
    interface: {
      title: '界面设置',
      fontSizeLabel: '字体大小:',
      opacityLabel: '窗口透明度:',
      themeLabel: '主题:',
      autoCopyLabel: '自动复制翻译结果',
      lightTheme: '明亮',
      darkTheme: '暗黑'
    },

    // 语言选项
    languages: {
      zhHans: '中文（简体）',
      zhHant: '中文（繁体）',
      en: '英语',
      ja: '日语',
      ko: '韩语',
      fr: '法语',
      es: '西班牙语',
      ru: '俄语',
      de: '德语',
      it: '意大利语',
      pt: '葡萄牙语'
    },

    actions: {
      save: '保存设置',
      reset: '恢复默认'
    }
  },

  // 错误信息
  errors: {
    settingsParse: '解析设置失败',
    storageLoad: '加载图片历史失败',
    storageSave: '保存图片历史失败',
    network: '网络错误',
    unknown: '未知错误'
  },

  // 成功信息
  success: {
    operationCompleted: '操作完成'
  }
};