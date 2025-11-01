import * as vscode from 'vscode'
import { ConfigManager } from './configManager'
import { TranslationHoverProvider } from './hoverProvider'
import { TranslationPanelProvider } from './translationPanel'

export function activate(context: vscode.ExtensionContext) {
  // 注册悬浮翻译提供器 - 支持所有文件类型
  const hoverProvider = new TranslationHoverProvider(context.extensionUri)

  // 注册为支持所有文件类型的悬浮翻译提供器
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [
        { scheme: 'file' }, // 支持所有本地文件
        { scheme: 'untitled' }, // 支持未保存的文件
        { scheme: 'vscode-vfs' }, // 支持虚拟文件系统
        { scheme: 'git' }, // 支持Git文件
        { scheme: 'output' }, // 支持输出面板
      ],
      hoverProvider
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('translate.openView', () => {
      // 打开翻译面板
      TranslationPanelProvider.createOrShow(context.extensionUri)
    })
  )

  // 注册复制命令（用于悬浮翻译的复制按钮）
  context.subscriptions.push(
    vscode.commands.registerCommand('transgo.copyText', (text: string) => {
      vscode.env.clipboard.writeText(text)

      // 使用 withProgress 显示进度提示
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '已复制到剪贴板',
          cancellable: false,
        },
        (progress) => {
          return new Promise((resolve) => {
            let currentProgress = 0
            const totalDuration = 1500 // 总持续时间1.5秒
            const updateInterval = 50 // 每50毫秒更新一次进度
            const progressIncrement = 100 / (totalDuration / updateInterval) // 每次增加的进度

            const timer = setInterval(() => {
              currentProgress += progressIncrement
              if (currentProgress >= 100) {
                currentProgress = 100
                clearInterval(timer)
                setTimeout(resolve, 100) // 稍微延迟一下再关闭
              }

              progress.report({
                increment: progressIncrement,
              })
            }, updateInterval)
          })
        }
      )
    })
  )

  // 快速翻译命令 - 在右侧打开翻译面板
  context.subscriptions.push(
    vscode.commands.registerCommand('translate.quickTranslate', async () => {
      // 获取选中的文本
      const editor = vscode.window.activeTextEditor
      let selectedText = ''

      if (editor && editor.selection && !editor.selection.isEmpty) {
        selectedText = editor.document.getText(editor.selection).trim()
      }

      // 打开或显示翻译面板
      TranslationPanelProvider.createOrShow(context.extensionUri, selectedText)
    })
  )

  // 翻译选中文本命令 - 在右侧面板自动翻译
  context.subscriptions.push(
    vscode.commands.registerCommand('translate.translateSelection', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showInformationMessage('请先选择要翻译的文本')
        return
      }

      const selectedText = editor.document.getText(editor.selection)
      if (!selectedText.trim()) {
        vscode.window.showInformationMessage('选中的文本为空')
        return
      }

      // 打开翻译面板
      TranslationPanelProvider.createOrShow(context.extensionUri, selectedText.trim())

      // 延迟一下确保面板加载完成，然后自动翻译
      setTimeout(() => {
        if (TranslationPanelProvider.currentPanel) {
          TranslationPanelProvider.currentPanel.translateText(selectedText.trim())
        }
      }, 300)
    })
  )

  // 监听配置变化
  context.subscriptions.push(
    ConfigManager.onConfigurationChanged((e) => {
      //   console.log('配置已更改，重新加载配置')
      // 可以在这里添加配置变化时的处理逻辑
    })
  )
}

export function deactivate() {}
