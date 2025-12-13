import * as vscode from 'vscode'
import { ConfigManager } from './configManager'
import { TranslationHoverProvider } from './hoverProvider'
import { TranslationPanelProvider } from './translationPanel'

export function activate(context: vscode.ExtensionContext) {
  // 初始化 ConfigManager
  ConfigManager.initialize(context)

  // 执行数据迁移（从旧版本的 settings.json 迁移到 SecretStorage）
  migrateSecretsFromSettings(context).catch((err) => {
    console.error('密钥迁移失败:', err)
  })

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

/**
 * 从 settings.json 迁移敏感信息到 SecretStorage
 * 只执行一次，迁移后会设置标志位
 */
async function migrateSecretsFromSettings(context: vscode.ExtensionContext): Promise<void> {
  const migrated = context.globalState.get('transgo-secrets-migrated-v2', false)
  if (migrated) {
    console.log('密钥已迁移，跳过迁移步骤')
    return
  }

  console.log('开始迁移敏感信息到 SecretStorage...')
  const config = vscode.workspace.getConfiguration('transgo')
  let migrationCount = 0

  try {
    // 迁移百度密钥
    const baiduKey = config.get<string>('baidu.appkey', '')
    if (baiduKey) {
      await context.secrets.store('transgo.baidu.appkey', baiduKey)
      migrationCount++
      console.log('已迁移: 百度翻译密钥')
    }

    // 迁移有道密钥
    const youdaoSecret = config.get<string>('youdao.appsecret', '')
    if (youdaoSecret) {
      await context.secrets.store('transgo.youdao.appsecret', youdaoSecret)
      migrationCount++
      console.log('已迁移: 有道翻译密钥')
    }

    // 迁移腾讯翻译密钥
    const tencentKey = config.get<string>('tencent.secretkey', '')
    if (tencentKey) {
      await context.secrets.store('transgo.tencent.secretkey', tencentKey)
      migrationCount++
      console.log('已迁移: 腾讯翻译密钥')
    }

    // 迁移腾讯TTS密钥
    const tencentTTSKey = config.get<string>('tts.tencent.secretKey', '')
    if (tencentTTSKey) {
      await context.secrets.store('transgo.tts.tencent.secretKey', tencentTTSKey)
      migrationCount++
      console.log('已迁移: 腾讯TTS密钥')
    }

    // 迁移AI配置的 apiKey
    const aiConfigs = config.get<any[]>('ai.configs', [])
    if (aiConfigs.length > 0) {
      const migratedConfigs = []
      for (const cfg of aiConfigs) {
        if (cfg.apiKey) {
          // 存储 apiKey 到 SecretStorage
          await context.secrets.store(`transgo.ai.config.${cfg.id}.apiKey`, cfg.apiKey)
          // 从配置中移除 apiKey
          const { apiKey, ...rest } = cfg
          migratedConfigs.push(rest)
          migrationCount++
          console.log(`已迁移: AI配置 ${cfg.name} 的 apiKey`)
        } else {
          migratedConfigs.push(cfg)
        }
      }
      await config.update('ai.configs', migratedConfigs, vscode.ConfigurationTarget.Global)
    }

    // 标记迁移完成
    await context.globalState.update('transgo-secrets-migrated-v2', true)
    
    if (migrationCount > 0) {
      console.log(`密钥迁移完成，共迁移 ${migrationCount} 个密钥`)
      vscode.window.showInformationMessage(`TransGo: 已将 ${migrationCount} 个密钥迁移到安全存储`)
    } else {
      console.log('没有需要迁移的密钥')
    }
  } catch (error) {
    console.error('密钥迁移失败:', error)
    vscode.window.showErrorMessage('TransGo: 密钥迁移失败，请检查控制台日志')
  }
}

export function deactivate() {}
