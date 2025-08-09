import * as vscode from 'vscode'
import { TranslationViewProvider } from './translationView'

export function activate(context: vscode.ExtensionContext) {
  const translationViewProvider = new TranslationViewProvider(context.extensionUri)

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(TranslationViewProvider.viewType, translationViewProvider))

  context.subscriptions.push(
    vscode.commands.registerCommand('translate.openView', () => {
      vscode.commands.executeCommand('workbench.view.extension.translate-sidebar')
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('translate.openSettings', () => {
      // 先确保视图可见
      vscode.commands.executeCommand('workbench.view.extension.translate-sidebar').then(() => {
        // 延迟一下确保视图完全加载
        setTimeout(() => {
          translationViewProvider.openSettings()
        }, 200)
      })
    })
  )
}

export function deactivate() {}
