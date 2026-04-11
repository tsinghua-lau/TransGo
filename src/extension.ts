import * as vscode from 'vscode'
import { ConfigManager } from './configManager'
import { TranslationHoverProvider } from './hoverProvider'
import { TextFormatter } from './textFormatter'
import { TranslationPanelProvider } from './translationPanel'
import { TranslationService } from './translationService'
import { TTSService } from './ttsService'
import { initLogger, logger } from './logger'

export function activate(context: vscode.ExtensionContext) {
  // 初始化日志（生产环境静默）
  initLogger(context.extensionMode)

  // 初始化 ConfigManager
  ConfigManager.initialize(context)

  // 执行数据迁移（从旧版本的 settings.json 迁移到 SecretStorage）
  migrateSecretsFromSettings(context).catch((err) => {
    logger.error('密钥迁移失败:', err)
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

  // 注册播放命令（用于悬浮翻译的播放按钮）
  context.subscriptions.push(
    vscode.commands.registerCommand('transgo.playTextFromHover', async (args: { text: string; language: 'zh' | 'en' }) => {
      const { text, language } = args

      // 获取TTS服务实例
      const ttsService = TTSService.getInstance()

      // 显示播放通知（支持取消）
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '正在播放...',
          cancellable: true,
        },
        async (progress, token) => {
          // 处理取消事件
          token.onCancellationRequested(() => {
            ttsService.stop()
          })

          try {
            // 调用TTS播放
            await ttsService.speak(text, language, { speed: 1.0 })

            // 播放完成
            // if (!token.isCancellationRequested) {
            //   vscode.window.showInformationMessage('播放完成')
            // }
          } catch (error) {
            // 如果是用户主动取消，不显示错误提示
            if (token.isCancellationRequested) {
              return
            }

            // 真正的播放错误才显示提示
            const errorMsg = error instanceof Error ? error.message : '播放失败'
            vscode.window.showErrorMessage(`播放失败: ${errorMsg}`)
          }
        }
      )
    })
  )

  // 注册替换命令（用于悬浮翻译的替换按钮）
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'transgo.replaceText',
      async (args: { text: string; originalText: string; range: { startLine: number; startChar: number; endLine: number; endChar: number }; uri: string }) => {
        const { text, originalText, range: rangeData, uri } = args

        try {
          // 获取编辑器和文档
          const editor = vscode.window.activeTextEditor
          if (!editor || editor.document.uri.toString() !== uri) {
            vscode.window.showWarningMessage('文档已关闭或切换，无法替换')
            return
          }

          // 重建 Range 对象
          const range = new vscode.Range(new vscode.Position(rangeData.startLine, rangeData.startChar), new vscode.Position(rangeData.endLine, rangeData.endChar))

          // 验证原始文本是否仍然存在
          const currentText = editor.document.getText(range).trim()
          if (currentText !== originalText) {
            vscode.window.showWarningMessage('原始文本已改变，无法安全替换。请重新选择文本。')
            return
          }

          // 读取格式配置并转换文本
          const formatType = ConfigManager.getHoverReplaceFormat()
          // 检测翻译结果是否包含中文
          const hasChinese = /[\u4e00-\u9fa5]/.test(text)
          // 如果包含中文，不应用格式转换；否则应用格式转换
          const formattedText = hasChinese ? text : TextFormatter.format(text, formatType)

          // 执行替换
          const success = await editor.edit((editBuilder) => {
            editBuilder.replace(range, formattedText)
          })

          if (success) {
            // 如果是中文或者格式为none，不显示格式名称
            if (hasChinese || formatType === 'none') {
              vscode.window.setStatusBarMessage('已替换为翻译结果', 3000)
            } else {
              // 显示转换后的格式提示
              const formatName = TextFormatter.getFormatDisplayName(formatType)
              vscode.window.setStatusBarMessage(`已替换为翻译结果（${formatName}格式）`, 3000)
            }
          } else {
            vscode.window.showErrorMessage('替换失败')
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '替换失败'
          vscode.window.showErrorMessage(`替换失败: ${errorMsg}`)
        }
      }
    )
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

  // 快捷键翻译并替换命令 - 直接翻译并替换选中文本
  context.subscriptions.push(
    vscode.commands.registerCommand('translate.translateAndReplace', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('请先选择要翻译的文本')
        return
      }

      const selectedText = editor.document.getText(editor.selection).trim()
      if (!selectedText) {
        vscode.window.showWarningMessage('选中的文本为空')
        return
      }

      const range = editor.selection

      try {
        // 显示翻译进度
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: '正在翻译并替换...',
            cancellable: false,
          },
          async () => {
            // 获取翻译服务实例
            const translationService = TranslationService.getInstance()

            // 执行翻译
            const result = await translationService.translateText(selectedText)

            // 检测翻译结果是否包含中文
            const hasChinese = /[\u4e00-\u9fa5]/.test(result.translatedText)

            // 读取格式配置
            const formatType = ConfigManager.getHoverReplaceFormat()

            // 如果包含中文，不应用格式转换；否则应用格式转换
            const formattedText = hasChinese ? result.translatedText : TextFormatter.format(result.translatedText, formatType)

            // 执行替换
            const success = await editor.edit((editBuilder) => {
              editBuilder.replace(range, formattedText)
            })

            if (success) {
              // 显示成功提示
              if (hasChinese || formatType === 'none') {
                vscode.window.setStatusBarMessage('已替换为翻译结果', 3000)
              } else {
                const formatName = TextFormatter.getFormatDisplayName(formatType)
                vscode.window.setStatusBarMessage(`已替换为翻译结果（${formatName}格式）`, 3000)
              }
            } else {
              vscode.window.showErrorMessage('替换失败')
            }
          }
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '翻译失败'
        vscode.window.showErrorMessage(`翻译失败: ${errorMsg}`)
      }
    })
  )

  // 监听配置变化
  context.subscriptions.push(
    ConfigManager.onConfigurationChanged((e) => {
      //   logger.log('配置已更改，重新加载配置')
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
    logger.log('密钥已迁移，跳过迁移步骤')
    return
  }

  logger.log('开始迁移敏感信息到 SecretStorage...')
  const config = vscode.workspace.getConfiguration('transgo')
  let migrationCount = 0

  try {
    // 迁移百度密钥
    const baiduKey = config.get<string>('baidu.appkey', '')
    if (baiduKey) {
      await context.secrets.store('transgo.baidu.appkey', baiduKey)
      migrationCount++
      logger.log('已迁移: 百度翻译密钥')
    }

    // 迁移有道密钥
    const youdaoSecret = config.get<string>('youdao.appsecret', '')
    if (youdaoSecret) {
      await context.secrets.store('transgo.youdao.appsecret', youdaoSecret)
      migrationCount++
      logger.log('已迁移: 有道翻译密钥')
    }

    // 迁移腾讯翻译密钥
    const tencentKey = config.get<string>('tencent.secretkey', '')
    if (tencentKey) {
      await context.secrets.store('transgo.tencent.secretkey', tencentKey)
      migrationCount++
      logger.log('已迁移: 腾讯翻译密钥')
    }

    // 迁移腾讯TTS密钥
    const tencentTTSKey = config.get<string>('tts.tencent.secretKey', '')
    if (tencentTTSKey) {
      await context.secrets.store('transgo.tts.tencent.secretKey', tencentTTSKey)
      migrationCount++
      logger.log('已迁移: 腾讯TTS密钥')
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
          logger.log(`已迁移: AI配置 ${cfg.name} 的 apiKey`)
        } else {
          migratedConfigs.push(cfg)
        }
      }
      await config.update('ai.configs', migratedConfigs, vscode.ConfigurationTarget.Global)
    }

    // 标记迁移完成
    await context.globalState.update('transgo-secrets-migrated-v2', true)

    if (migrationCount > 0) {
      logger.log(`密钥迁移完成，共迁移 ${migrationCount} 个密钥`)
      vscode.window.showInformationMessage(`TransGo: 已将 ${migrationCount} 个密钥迁移到安全存储`)
    } else {
      logger.log('没有需要迁移的密钥')
    }
  } catch (error) {
    logger.error('密钥迁移失败:', error)
    vscode.window.showErrorMessage('TransGo: 密钥迁移失败，请检查控制台日志')
  }
}

export function deactivate() {}
