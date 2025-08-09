# VSCode翻译插件

一个简单的VSCode中英文翻译插件，支持中英文互译。

## 功能特点

- 在VSCode左侧活动栏添加翻译图标
- 点击图标打开翻译侧边栏
- 自动识别中英文并进行相互翻译
- 简洁美观的界面设计
- 支持快捷键翻译（Ctrl/Cmd + Enter）

## 安装使用

1. 编译插件：
   ```bash
   npm install
   npm run compile
   ```

2. 在VSCode中安装插件：
   - 按 `F5` 启动扩展开发主机
   - 或者打包插件：`vsce package`

3. 使用插件：
   - 点击左侧活动栏的翻译图标
   - 在侧边栏中输入要翻译的文本
   - 点击"翻译"按钮或使用快捷键 `Ctrl/Cmd + Enter`

## 开发

- `npm run compile`：编译TypeScript代码
- `npm run watch`：监听文件变化并自动编译

## 技术栈

- TypeScript
- VSCode Extension API
- Google翻译API
- Webview

## 许可证

MIT