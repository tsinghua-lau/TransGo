import * as vscode from 'vscode'
import { ConfigManager } from './configManager'
import { TranslationPanelProvider } from './translationPanel'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('translate.openView', () => {
      // 打开翻译面板
      TranslationPanelProvider.createOrShow(context.extensionUri)
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
      console.log('配置已更改，重新加载配置')
      // 可以在这里添加配置变化时的处理逻辑
    })
  )
}

export function deactivate() {}
