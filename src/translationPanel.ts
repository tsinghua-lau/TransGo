import * as vscode from 'vscode'
import { ConfigManager } from './configManager'
import { TranslationService } from './translationService'
import { TTSService } from './ttsService'

export class TranslationPanelProvider {
  public static currentPanel: TranslationPanelProvider | undefined

  private readonly _panel: vscode.WebviewPanel
  private _disposables: vscode.Disposable[] = []
  private translationService: TranslationService
  private ttsService: TTSService

  // 保存翻译状态
  private translationState = {
    inputText: '',
    translationResult: null as any,
    camelCaseResult: '',
  }

  public static createOrShow(extensionUri: vscode.Uri, selectedText?: string) {
    const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : undefined

    // 如果已经有面板存在，就显示它
    if (TranslationPanelProvider.currentPanel) {
      TranslationPanelProvider.currentPanel._panel.reveal(column)

      // 如果有选中的文本，填入输入框
      if (selectedText) {
        TranslationPanelProvider.currentPanel.setInputText(selectedText)
      }
      return
    }

    // 创建新的面板
    const panel = vscode.window.createWebviewPanel('translatePanel', 'TransGo', column || vscode.ViewColumn.One, {
      enableScripts: true,
      localResourceRoots: [extensionUri],
      retainContextWhenHidden: true, // 保持上下文，避免重新加载时丢失状态
    })

    // 打开的label设置自定义图标
    const logoPath = vscode.Uri.joinPath(extensionUri, 'src', 'images', 'logo.png')
    panel.iconPath = logoPath

    TranslationPanelProvider.currentPanel = new TranslationPanelProvider(panel, extensionUri, selectedText)
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, selectedText?: string) {
    this._panel = panel
    this.translationService = TranslationService.getInstance()
    this.ttsService = TTSService.getInstance()

    // 加载配置和状态
    this.loadConfigFromSettings()
    this.loadTranslationState()

    // 设置初始内容
    this._update()

    // 如果有选中的文本，设置到状态中
    if (selectedText) {
      this.translationState.inputText = selectedText
    }

    // 监听面板被释放的事件
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // 处理面板中的消息
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message)
      },
      null,
      this._disposables
    )
  }

  private loadConfigFromSettings() {
    // 从VS Code配置中加载翻译服务提供商
    const provider = ConfigManager.getProvider()
    this.translationService.setTranslationProvider(provider)

    // 加载百度翻译配置
    const baiduConfig = ConfigManager.getBaiduConfig()
    if (baiduConfig.appid && baiduConfig.appkey) {
      this.translationService.setBaiduConfig(baiduConfig.appid, baiduConfig.appkey)
    }

    // 加载有道翻译配置
    const youdaoConfig = ConfigManager.getYoudaoConfig()
    if (youdaoConfig.appKey && youdaoConfig.appSecret) {
      this.translationService.setYoudaoConfig(youdaoConfig.appKey, youdaoConfig.appSecret)
    }

    // 加载腾讯翻译配置
    const tencentConfig = ConfigManager.getTencentConfig()
    if (tencentConfig.secretId && tencentConfig.secretKey) {
      this.translationService.setTencentConfig(tencentConfig.secretId, tencentConfig.secretKey)
    }
  }

  private loadTranslationState() {
    // 从VS Code配置中加载翻译状态
    const savedState = ConfigManager.getTranslationState()
    // 不覆盖当前的 inputText，如果有选中文本的话
    if (!this.translationState.inputText) {
      this.translationState = savedState
    }
    console.log('TransGo Panel: 加载翻译状态:', savedState)
  }

  private async handleMessage(message: any) {
    console.log('后端收到消息:', message.type, message)
    switch (message.type) {
      case 'webviewReady':
        console.log('TransGo Panel: Webview已准备好，开始恢复状态')
        this.restoreState()
        break
      case 'translate':
        try {
          await this.saveInputText(message.text)
          const result = await this.translationService.translateText(message.text)
          await this.saveTranslationResult(result)

          this._panel.webview.postMessage({
            type: 'translationResult',
            result: result,
          })
        } catch (error) {
          this._panel.webview.postMessage({
            type: 'translationError',
            error: error instanceof Error ? error.message : '翻译失败',
          })
        }
        break
      case 'speak':
        try {
          await this.ttsService.speak(message.text, message.language, message.options)
          this._panel.webview.postMessage({ type: 'speakComplete' })
        } catch (error) {
          this._panel.webview.postMessage({
            type: 'speakError',
            error: error instanceof Error ? error.message : '语音播放失败',
          })
        }
        break
      case 'stopSpeak':
        this.ttsService.stop()
        this._panel.webview.postMessage({ type: 'speakStopped' })
        break
      case 'checkTTSAvailable':
        this._panel.webview.postMessage({
          type: 'ttsAvailable',
          available: this.ttsService.isAvailable(),
        })
        break
      case 'saveCamelCaseResult':
        await this.saveCamelCaseResult(message.result)
        break
      case 'saveInputText':
        await this.saveInputText(message.text)
        break
      case 'getProvider':
        this._panel.webview.postMessage({
          type: 'currentProvider',
          provider: this.translationService.getCurrentProvider(),
        })
        break
      case 'getBaiduConfig':
        this._panel.webview.postMessage({
          type: 'baiduConfig',
          config: this.translationService.getBaiduConfig(),
        })
        break
      case 'getYoudaoConfig':
        this._panel.webview.postMessage({
          type: 'youdaoConfig',
          config: this.translationService.getYoudaoConfig(),
        })
        break
      case 'getTencentConfig':
        this._panel.webview.postMessage({
          type: 'tencentConfig',
          config: this.translationService.getTencentConfig(),
        })
        break
      case 'setProvider':
        await this.translationService.setTranslationProvider(message.provider)
        break
      case 'setBaiduConfig':
        await this.translationService.setBaiduConfig(message.appid, message.appkey)
        break
      case 'setYoudaoConfig':
        await this.translationService.setYoudaoConfig(message.appKey, message.appSecret)
        break
      case 'setTencentConfig':
        await this.translationService.setTencentConfig(message.secretId, message.secretKey)
        break
      case 'getAIConfigs':
        this._panel.webview.postMessage({
          type: 'aiConfigs',
          configs: this.translationService.getAIConfigs(),
        })
        // 同时发送当前选中的配置ID
        this._panel.webview.postMessage({
          type: 'currentAIConfigId',
          configId: ConfigManager.getCurrentAIConfigId(),
        })
        break
      case 'addAIConfig':
        await this.translationService.addAIConfig(message.config)
        // 保存后立即返回最新的配置列表
        this._panel.webview.postMessage({
          type: 'aiConfigs',
          configs: this.translationService.getAIConfigs(),
        })
        break
      case 'removeAIConfig':
        console.log('后端接收到删除AI配置请求，ID:', message.configId)
        await this.translationService.removeAIConfig(message.configId)
        console.log('删除AI配置完成，获取最新配置列表')
        const updatedConfigs = this.translationService.getAIConfigs()
        console.log('删除后的配置列表:', updatedConfigs)

        // 删除后立即返回最新的配置列表
        this._panel.webview.postMessage({
          type: 'aiConfigs',
          configs: updatedConfigs,
        })
        // 同时发送更新后的当前选中配置ID
        this._panel.webview.postMessage({
          type: 'currentAIConfigId',
          configId: ConfigManager.getCurrentAIConfigId(),
        })
        break
      case 'setCurrentAIConfigId':
        await this.translationService.setCurrentAIConfigId(message.configId)
        // 更新选中状态后返回最新的配置列表
        this._panel.webview.postMessage({
          type: 'aiConfigs',
          configs: this.translationService.getAIConfigs(),
        })
        break
      case 'getShowCamelCaseButtons':
        this._panel.webview.postMessage({
          type: 'showCamelCaseButtons',
          show: ConfigManager.getShowCamelCaseButtons(),
        })
        break
      case 'setShowCamelCaseButtons':
        await ConfigManager.setShowCamelCaseButtons(message.show)
        break
    }
  }

  private async saveState() {
    console.log('TransGo Panel: 保存翻译状态:', this.translationState)
    await ConfigManager.saveTranslationState(this.translationState)
  }

  private restoreState() {
    if (!this._panel) return

    // 发送当前配置信息（这样可以确保标签显示正确）
    this._panel.webview.postMessage({
      type: 'currentProvider',
      provider: this.translationService.getCurrentProvider(),
    })

    // 发送AI配置信息
    this._panel.webview.postMessage({
      type: 'aiConfigs',
      configs: this.translationService.getAIConfigs(),
    })

    // 发送当前选中的AI配置ID
    this._panel.webview.postMessage({
      type: 'currentAIConfigId',
      configId: ConfigManager.getCurrentAIConfigId(),
    })

    // 发送驼峰按钮显示配置
    this._panel.webview.postMessage({
      type: 'showCamelCaseButtons',
      show: ConfigManager.getShowCamelCaseButtons(),
    })

    // 恢复输入文本
    if (this.translationState.inputText) {
      console.log('TransGo Panel: 恢复输入文本:', this.translationState.inputText)
      this._panel.webview.postMessage({
        type: 'restoreInputText',
        text: this.translationState.inputText,
      })
    }

    // 恢复翻译结果
    if (this.translationState.translationResult) {
      console.log('TransGo Panel: 恢复翻译结果:', this.translationState.translationResult)
      this._panel.webview.postMessage({
        type: 'restoreTranslationResult',
        result: this.translationState.translationResult,
      })
    }

    // 恢复驼峰转换结果
    if (this.translationState.camelCaseResult) {
      console.log('TransGo Panel: 恢复驼峰转换结果:', this.translationState.camelCaseResult)
      this._panel.webview.postMessage({
        type: 'restoreCamelCaseResult',
        result: this.translationState.camelCaseResult,
      })
    }
  }

  private async saveInputText(text: string) {
    this.translationState.inputText = text
    await this.saveState()
  }

  private async saveTranslationResult(result: any) {
    this.translationState.translationResult = result
    await this.saveState()
  }

  private async saveCamelCaseResult(result: string) {
    this.translationState.camelCaseResult = result
    await this.saveState()
  }

  public setInputText(text: string) {
    // 保存到状态中
    this.saveInputText(text)

    // 发送消息到前端设置输入框内容
    this._panel.webview.postMessage({
      type: 'setInputText',
      text: text,
    })
  }

  public async translateText(text: string) {
    try {
      // 保存用户输入的文本
      await this.saveInputText(text)

      // 先设置输入框内容
      this._panel.webview.postMessage({
        type: 'setInputText',
        text: text,
      })

      // 执行翻译
      const result = await this.translationService.translateText(text)

      // 保存翻译结果
      await this.saveTranslationResult(result)

      // 发送翻译结果到前端
      this._panel.webview.postMessage({
        type: 'translationResult',
        result: result,
      })
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'translationError',
        error: error instanceof Error ? error.message : '翻译失败',
      })
    }
  }

  private _update() {
    const webview = this._panel.webview
    this._panel.webview.html = this._getHtmlForWebview(webview)
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // 获取本地图片的路径，并将其转换为 webview 可以使用的 uri
    const sendIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'send.png')
    const sendIconUri = webview.asWebviewUri(sendIconPath)

    const playIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'play.png')
    const playIconUri = webview.asWebviewUri(playIconPath)

    const stopIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'stop.png')
    const stopIconUri = webview.asWebviewUri(stopIconPath)

    const copyIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'copy.png')
    const copyIconUri = webview.asWebviewUri(copyIconPath)

    const loadingIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'loading.png')
    const loadingIconUri = webview.asWebviewUri(loadingIconPath)

    const settingIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'setting.png')
    const settingIconUri = webview.asWebviewUri(settingIconPath)
    // 新增done按钮图片
    const doneIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'done.svg')
    const doneIconUri = webview.asWebviewUri(doneIconPath)

    // AI翻译logo图片
    const aiIconPath = vscode.Uri.joinPath(vscode.extensions.getExtension('tsinghua-lau.TransGo')!.extensionUri, 'src', 'images', 'ai.svg')
    const aiIconUri = webview.asWebviewUri(aiIconPath)

    return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>翻译面板</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    // background-color: var(--vscode-editor-background);
                    margin: 0;
                    line-height: 1.5;
                    height: 100vh;
                    box-sizing: border-box;
                    background-color:rgb(20, 20, 20);
                }
                
                .container {
                    margin: 0 auto;
                }
                
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                
                .settings-btn {
                    width: 36px;
                    height: 36px;
                    background: transparent;
                    border: 1px solid var(--vscode-button-border);
                    color: var(--vscode-button-secondaryForeground);
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .settings-btn:hover {
                    // background-color: var(--vscode-button-secondaryHoverBackground);
                    transform: translateY(-1px);
                      animation: spin 1s linear infinite;
                }
                
                .settings-btn img {
                    width: 18px;
                    height: 18px;
                }
                
                .input-section {
                    margin-bottom: 24px;
                }
                
                .label {
                    display: flex;
                    align-items: center;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    font-size: 14px;
                }
                
                .ai-icon {
                    width: 16px;
                    height: 16px;
                    margin-right: 6px;
                    opacity: 0.8;
                }
                
                .input-container {
                    width: 100%;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 8px;
                    background-color: var(--vscode-input-background);
                    transition: border-color 0.2s ease;
                }
                
                .input-container:focus-within {
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 0 0 2px var(--vscode-focusBorder);
                }
                
                .input-textarea {
                    width: 100%;
                    min-height: 120px;
                    max-height: 300px;
                    padding: 16px;
                    border: none;
                    background-color: transparent;
                    color: var(--vscode-input-foreground);
                    font-family: var(--vscode-font-family);
                    font-size: 14px;
                    resize: none;
                    box-sizing: border-box;
                    line-height: 1.5;
                    overflow-y: auto;
                    word-wrap: break-word;
                    outline: none !important;
                }
                
                .input-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid var(--vscode-input-border);
                    background-color: transparent;
                    border-radius: 0 0 8px 8px;
                    min-height: 45px;
                    padding: 0px 12px;
                }
                
                .input-play-btn, .send-btn {
                    width: 36px;
                    height: 36px;
                    background: transparent;
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .input-play-btn:hover, .send-btn:hover {
                    // background-color: var(--vscode-button-hoverBackground);
                    transform: translateY(-1px);
                }
                
                .input-play-btn img, .send-btn img {
                    width: 18px;
                    height: 18px;
                }
                
                .send-btn.loading img {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .result-section {
                    margin-top: 24px;
                    border-radius: 8px;
                }
                
                .result-header {
                    padding: 12px 16px;
                    padding-left: 0;
                    border-radius: 8px 8px 0 0;
                }
                
                .language-info {
                    font-size: 12px;
                    color: var(--vscode-badge-foreground);
                    background-color: var(--vscode-badge-background);
                    padding: 4px 8px;
                    border-radius: 12px;
                    display: inline-block;
                    font-weight: 500;
                }
                
                .result-content-wrapper {
                    position: relative;
                }
                
                .result-content {
                    padding: 20px 16px 60px 16px;
                    background-color: var(--vscode-editor-background);
                    min-height: 80px;
                    font-size: 15px;
                    line-height: 1.6;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    color: var(--vscode-foreground);
                    border-radius: 0 0 8px 8px;
                }
                
                .result-actions-bottom {
                    position: absolute;
                    bottom: 12px;
                    left: 16px;
                    right: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .result-play-btn, .result-copy-btn {
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: 1px solid var(--vscode-button-border);
                    color: var(--vscode-button-secondaryForeground);
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .result-play-btn:hover, .result-copy-btn:hover {
                    transform: translateY(-1px);
                }
                
                .result-play-btn img, .result-copy-btn img {
                    width: 18px;
                    height: 18px;
                }
                
                .result-copy-btn.copied {
                    background-color: var(--vscode-testing-iconPassed);
                    border-color: var(--vscode-testing-iconPassed);
                }
                
                .result-copy-btn.copied img {
                    filter: brightness(0) invert(1);
                }
                
                .camel-case-section {
                    margin-top: 16px;
                }
                
                .camel-case-header {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }
                
                .btn-camel-case {
                    font-size: 11px;
                    font-weight: 500;
                    background: var(--vscode-button-secondaryBackground);
                    border: 1px solid var(--vscode-button-border);
                    color: var(--vscode-button-secondaryForeground);
                    cursor: pointer;
                    padding: 6px 12px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    user-select: none;
                }
                
                .btn-camel-case:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                    transform: translateY(-1px);
                }
                
                .btn-camel-case.active {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border-color: var(--vscode-button-background);
                }
                
                .camel-case-result {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    background-color: var(--vscode-sideBar-background);
                    position: relative;
                }
                
                .camel-case-content-wrapper {
                    position: relative;
                }
                
                .camel-case-content {
                    padding: 16px 16px 50px 16px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 6px;
                    min-height: 40px;
                    font-size: 14px;
                    line-height: 1.6;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    color: var(--vscode-foreground);
                    font-family: 'Courier New', monospace;
                    font-weight: 600;
                }
                
                .camel-case-actions-bottom {
                    position: absolute;
                    bottom: 8px;
                    right: 16px;
                }
                
                .camel-copy-btn {
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: 1px solid var(--vscode-button-border);
                    color: var(--vscode-button-secondaryForeground);
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .camel-copy-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                    transform: translateY(-1px);
                }
                
                .camel-copy-btn img {
                    width: 16px;
                    height: 16px;
                }
                
                .camel-copy-btn.copied {
                    background-color: var(--vscode-testing-iconPassed);
                    border-color: var(--vscode-testing-iconPassed);
                }
                
                .camel-copy-btn.copied img {
                    filter: brightness(0) invert(1);
                }
                
                .error {
                    color: var(--vscode-errorForeground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-top: 16px;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .error::before {
                    content: "❗️";
                    font-size: 16px;
                }
                
                /* 设置页面样式 */
                .main-content {
                    transition: all 0.3s ease;
                }
                
                .main-content.hidden {
                    display: none;
                }
                
                .settings-page {
                    display: none;
                    animation: slideInRight 0.3s ease;
                }
                
                .settings-page.show {
                    display: block;
                }
                
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .settings-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .settings-title {
                    font-weight: 600;
                    font-size: 18px;
                    color: var(--vscode-foreground);
                    margin: 0;
                }
                
                .done-btn {
                    background: transparent;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: var(--vscode-font-family);
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                
                .done-btn:hover {
                   transform: translateY(-1px);
                }
                
                .form-group {
                    margin-bottom: 16px;
                    margin-top:25px;
                }
                
                .provider-select, .config-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: var(--vscode-font-family);
                    font-size: 13px;
                    border-radius: 6px;
                    box-sizing: border-box;
                    transition: border-color 0.2s ease;
                }
                
                .provider-select:focus, .config-input:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 0 0 2px var(--vscode-focusBorder);
                }
                
                .config-section {
                    display: none;
                    margin-top: 16px;
                    padding: 16px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    background-color: var(--vscode-editor-background);
                }
                
                .config-section.show {
                    display: block;
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .config-note {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 12px;
                    line-height: 1.4;
                    padding: 8px 12px;
                    background-color: var(--vscode-textBlockQuote-background);
                    border-left: 3px solid var(--vscode-textBlockQuote-border);
                    border-radius: 4px;
                }
                
                .config-link {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .config-link:hover {
                    text-decoration: underline;
                }
                
                .ai-configs-container {
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 6px;
                    background-color: var(--vscode-input-background);
                }
                
                .ai-config-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .ai-config-item:last-child {
                    border-bottom: none;
                }
                
                .ai-config-item.selected {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }
                
                .ai-config-info {
                    flex: 1;
                }
                
                .ai-config-name {
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                
                .ai-config-details {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .ai-config-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .ai-config-action-btn {
                    padding: 4px 8px;
                    font-size: 11px;
                    border: 1px solid var(--vscode-button-border);
                    background: transparent;
                    color: var(--vscode-button-secondaryForeground);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .ai-config-action-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .ai-config-action-btn.select-btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border-color: var(--vscode-button-background);
                }
                
                .ai-config-action-btn.delete-btn {
                    background-color: var(--vscode-inputValidation-errorBorder);
                    color: white;
                    border-color: var(--vscode-inputValidation-errorBorder);
                }
                
                .add-ai-config-btn {
                    width: 100%;
                    padding: 10px 16px;
                    background: var(--vscode-button-secondaryBackground);
                    border: 1px solid var(--vscode-button-border);
                    color: var(--vscode-button-secondaryForeground);
                    font-family: var(--vscode-font-family);
                    font-size: 13px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .add-ai-config-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .ai-config-form {
                    margin-top: 16px;
                    padding: 16px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 8px;
                    background-color: var(--vscode-editor-background);
                }
                
                .ai-form-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                
                .save-ai-config-btn, .cancel-ai-config-btn {
                    padding: 8px 16px;
                    font-size: 13px;
                    font-family: var(--vscode-font-family);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .save-ai-config-btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: 1px solid var(--vscode-button-background);
                }
                
                .save-ai-config-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .cancel-ai-config-btn {
                    background: transparent;
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                }
                
                .cancel-ai-config-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .empty-ai-configs {
                    text-align: center;
                    padding: 24px;
                    color: var(--vscode-descriptionForeground);
                    font-size: 13px;
                }
                
                /* 自定义确认对话框样式 */
                .custom-confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                
                .custom-confirm-dialog {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                
                .custom-confirm-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    margin-bottom: 12px;
                }
                
                .custom-confirm-message {
                    font-size: 14px;
                    color: var(--vscode-foreground);
                    margin-bottom: 20px;
                    line-height: 1.5;
                }
                
                .custom-confirm-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                
                .custom-confirm-btn {
                    padding: 8px 16px;
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 6px;
                    font-size: 13px;
                    font-family: var(--vscode-font-family);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .custom-confirm-btn.primary {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border-color: var(--vscode-button-background);
                }
                
                .custom-confirm-btn.primary:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .custom-confirm-btn.secondary {
                    background: transparent;
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .custom-confirm-btn.secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .custom-confirm-btn.danger {
                    background-color: var(--vscode-inputValidation-errorBorder);
                    color: white;
                    border-color: var(--vscode-inputValidation-errorBorder);
                }
                
                .custom-confirm-btn.danger:hover {
                    opacity: 0.9;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div id="mainContent" class="main-content">
                <div class="input-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label class="label" for="inputText" id="inputLabel">输入要翻译的文本 (Google翻译):</label>
                        <button id="settingsBtn" class="settings-btn" title="设置">
                            <img src="${settingIconUri}" alt="设置" />
                        </button>
                    </div>
                    <div class="input-container">
                        <textarea id="inputText" class="input-textarea" placeholder="输入中文或英文文本... (按 Enter 键翻译)"></textarea>
                        <div class="input-actions">
                            <button id="inputPlayBtn" class="input-play-btn" title="播放原文">
                                <img id="inputPlayIcon" src="${playIconUri}" alt="播放" />
                            </button>
                            <button id="sendBtn" class="send-btn" title="翻译">
                                <img src="${sendIconUri}" alt="翻译" />
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="resultSection" class="result-section" style="display: none;">
                    <div class="result-header">
                        <div id="languageInfo" class="language-info"></div>
                    </div>
                    <div class="result-content-wrapper">
                        <div id="resultContent" class="result-content"></div>
                        <div class="result-actions-bottom">
                            <button id="resultPlayBtn" class="result-play-btn" title="播放译文">
                                <img id="resultPlayIcon" src="${playIconUri}" alt="播放" />
                            </button>
                            <button id="copyBtn" class="result-copy-btn" title="复制">
                                <img id="copyIcon" src="${copyIconUri}" alt="复制" />
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="camelCaseSection" class="camel-case-section" style="display: none;">
                    <div class="camel-case-header">
                        <div id="convertToCamelCaseBtn" class="btn-camel-case">大驼峰</div>
                        <div id="convertToLowerCamelCaseBtn" class="btn-camel-case">小驼峰</div>
                        <div id="convertToUnderscoreBtn" class="btn-camel-case">下划线</div>
                        <div id="convertToKebabCaseBtn" class="btn-camel-case">中划线</div>
                    </div>
                    <div id="camelCaseResult" class="camel-case-result" style="display: none;">
                        <div class="camel-case-content-wrapper">
                            <div id="camelCaseContent" class="camel-case-content"></div>
                            <div class="camel-case-actions-bottom">
                                <button id="camelCopyBtn" class="camel-copy-btn" title="复制转换结果">
                                    <img id="camelCopyIcon" src="${copyIconUri}" alt="复制" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="errorDiv" class="error" style="display: none;"></div>
                </div>
                
                <!-- 自定义确认对话框 -->
                <div id="customConfirmOverlay" class="custom-confirm-overlay">
                    <div class="custom-confirm-dialog">
                        <div id="customConfirmTitle" class="custom-confirm-title">确认操作</div>
                        <div id="customConfirmMessage" class="custom-confirm-message"></div>
                        <div class="custom-confirm-buttons">
                            <button id="customConfirmCancel" class="custom-confirm-btn secondary">取消</button>
                            <button id="customConfirmOk" class="custom-confirm-btn danger">确定</button>
                        </div>
                    </div>
                </div>
                
                <div id="settingsPage" class="settings-page">
                    <div class="settings-header">
                        <h3 class="settings-title">翻译设置</h3>
                            <button id="doneBtn" class="done-btn"><img src="${doneIconUri}" alt="完成" style="width:24px;height:24px;vertical-align:middle;" /></button>
                    </div>
                    
                    <div class="form-group">
                        <label class="label" for="providerSelect">翻译源:</label>
                        <select id="providerSelect" class="provider-select">
                            <option value="google">Google 翻译</option>
                            <option value="baidu">百度翻译</option>
                            <option value="youdao">有道翻译</option>
                            <option value="tencent">腾讯翻译</option>
                            <option value="ai">AI 翻译</option>
                        </select>
                    </div>
                    
                    <div id="baiduConfig" class="config-section">
                        <div class="config-note">
                            使用百度翻译需要在 <a href="https://fanyi-api.baidu.com/" class="config-link" target="_blank">百度翻译开放平台</a> 注册并获取 APPID 和密钥
                        </div>
                        <div class="form-group">
                            <label class="label" for="baiduAppid">APPID:</label>
                            <input type="text" id="baiduAppid" class="config-input" placeholder="请输入百度翻译APPID">
                        </div>
                        <div class="form-group">
                            <label class="label" for="baiduAppkey">密钥:</label>
                            <input type="password" id="baiduAppkey" class="config-input" placeholder="请输入百度翻译密钥">
                        </div>
                    </div>
                    
                    <div id="youdaoConfig" class="config-section">
                        <div class="config-note">
                            使用有道翻译需要在 <a href="https://ai.youdao.com/" class="config-link" target="_blank">有道智云</a> 注册并获取 AppKey 和 AppSecret
                        </div>
                        <div class="form-group">
                            <label class="label" for="youdaoAppKey">AppKey:</label>
                            <input type="text" id="youdaoAppKey" class="config-input" placeholder="请输入有道翻译AppKey">
                        </div>
                        <div class="form-group">
                            <label class="label" for="youdaoAppSecret">AppSecret:</label>
                            <input type="password" id="youdaoAppSecret" class="config-input" placeholder="请输入有道翻译AppSecret">
                        </div>
                    </div>
                    
                    <div id="tencentConfig" class="config-section">
                        <div class="config-note">
                            使用腾讯翻译需要在 <a href="https://console.cloud.tencent.com/cam/capi" class="config-link" target="_blank">腾讯云控制台</a> 获取 SecretId 和 SecretKey
                        </div>
                        <div class="form-group">
                            <label class="label" for="tencentSecretId">SecretId:</label>
                            <input type="text" id="tencentSecretId" class="config-input" placeholder="请输入腾讯翻译SecretId">
                        </div>
                        <div class="form-group">
                            <label class="label" for="tencentSecretKey">SecretKey:</label>
                            <input type="password" id="tencentSecretKey" class="config-input" placeholder="请输入腾讯翻译SecretKey">
                        </div>
                    </div>
                    
                    <div id="aiConfig" class="config-section">
                        <div class="config-note">
                            配置AI翻译服务，支持兼容OpenAI格式的API接口（如ChatGPT、Claude、国产大模型等）
                        </div>
                        
                        <div class="ai-config-list">
                            <div class="form-group">
                                <label class="label">已配置的AI翻译服务:</label>
                                <div id="aiConfigsList" class="ai-configs-container">
                                    <!-- AI配置列表将在这里动态显示 -->
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <button id="addAIConfigBtn" class="add-ai-config-btn">+ 添加新的AI翻译配置</button>
                            </div>
                        </div>
                        
                        <div id="aiConfigForm" class="ai-config-form" style="display: none;">
                            <div class="form-group">
                                <label class="label" for="aiConfigName">配置名称:</label>
                                <input type="text" id="aiConfigName" class="config-input" placeholder="例如: ChatGPT, Claude, 通义千问">
                            </div>
                            
                            <div class="form-group">
                                <label class="label" for="aiConfigVendor">厂商标识:</label>
                                <input type="text" id="aiConfigVendor" class="config-input" placeholder="例如: openai, anthropic, alibaba">
                            </div>
                            
                            <div class="form-group">
                                <label class="label" for="aiConfigBaseUrl">Base URL:</label>
                                <input type="text" id="aiConfigBaseUrl" class="config-input" placeholder="例如: https://api.openai.com">
                            </div>
                            
                            <div class="form-group">
                                <label class="label" for="aiConfigApiKey">API Key:</label>
                                <input type="password" id="aiConfigApiKey" class="config-input" placeholder="请输入API密钥">
                            </div>
                            
                            <div class="form-group">
                                <label class="label" for="aiConfigModel">模型名称:</label>
                                <input type="text" id="aiConfigModel" class="config-input" placeholder="例如: gpt-4, claude-3-5-sonnet-20241022">
                            </div>
                            
                            <div class="form-group">
                                <label class="label" for="aiConfigPrompt">翻译提示词:</label>
                                <textarea id="aiConfigPrompt" class="config-input" rows="3" placeholder="自定义翻译提示词，使用{text}作为待翻译文本占位符。留空则使用默认提示词。"></textarea>
                            </div>
                            
                            <div class="form-group ai-form-actions">
                                <button id="saveAIConfigBtn" class="save-ai-config-btn">保存配置</button>
                                <button id="cancelAIConfigBtn" class="cancel-ai-config-btn">取消</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="label" for="showCamelCaseButtonsCheckbox">界面设置:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="showCamelCaseButtonsCheckbox" style="margin: 0;">
                            <label for="showCamelCaseButtonsCheckbox" style="margin: 0; font-weight: normal; font-size: 13px; cursor: pointer;">显示驼峰命名转换按钮（大驼峰、小驼峰等）</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                // DOM 元素
                const inputText = document.getElementById('inputText');
                const sendBtn = document.getElementById('sendBtn');
                const inputPlayBtn = document.getElementById('inputPlayBtn');
                const inputPlayIcon = document.getElementById('inputPlayIcon');
                const resultSection = document.getElementById('resultSection');
                const resultContent = document.getElementById('resultContent');
                const languageInfo = document.getElementById('languageInfo');
                const errorDiv = document.getElementById('errorDiv');
                const copyBtn = document.getElementById('copyBtn');
                const resultPlayBtn = document.getElementById('resultPlayBtn');
                const resultPlayIcon = document.getElementById('resultPlayIcon');
                const camelCaseSection = document.getElementById('camelCaseSection');
                const camelCaseResult = document.getElementById('camelCaseResult');
                const camelCaseContent = document.getElementById('camelCaseContent');
                const camelCopyBtn = document.getElementById('camelCopyBtn');
                
                // 设置相关元素
                const settingsBtn = document.getElementById('settingsBtn');
                const mainContent = document.getElementById('mainContent');
                const settingsPage = document.getElementById('settingsPage');
                const doneBtn = document.getElementById('doneBtn');
                const providerSelect = document.getElementById('providerSelect');
                const baiduConfig = document.getElementById('baiduConfig');
                const youdaoConfig = document.getElementById('youdaoConfig');
                const tencentConfig = document.getElementById('tencentConfig');
                const aiConfig = document.getElementById('aiConfig');
                const baiduAppid = document.getElementById('baiduAppid');
                const baiduAppkey = document.getElementById('baiduAppkey');
                const youdaoAppKey = document.getElementById('youdaoAppKey');
                const youdaoAppSecret = document.getElementById('youdaoAppSecret');
                const tencentSecretId = document.getElementById('tencentSecretId');
                const tencentSecretKey = document.getElementById('tencentSecretKey');
                const inputLabel = document.getElementById('inputLabel');
                
                // AI配置相关元素
                const aiConfigsList = document.getElementById('aiConfigsList');
                const addAIConfigBtn = document.getElementById('addAIConfigBtn');
                const aiConfigForm = document.getElementById('aiConfigForm');
                const aiConfigName = document.getElementById('aiConfigName');
                const aiConfigVendor = document.getElementById('aiConfigVendor');
                const aiConfigBaseUrl = document.getElementById('aiConfigBaseUrl');
                const aiConfigApiKey = document.getElementById('aiConfigApiKey');
                const aiConfigModel = document.getElementById('aiConfigModel');
                const aiConfigPrompt = document.getElementById('aiConfigPrompt');
                const saveAIConfigBtn = document.getElementById('saveAIConfigBtn');
                const cancelAIConfigBtn = document.getElementById('cancelAIConfigBtn');
                
                // 界面设置元素
                const showCamelCaseButtonsCheckbox = document.getElementById('showCamelCaseButtonsCheckbox');
                
                // 自定义确认对话框元素
                const customConfirmOverlay = document.getElementById('customConfirmOverlay');
                const customConfirmTitle = document.getElementById('customConfirmTitle');
                const customConfirmMessage = document.getElementById('customConfirmMessage');
                const customConfirmOk = document.getElementById('customConfirmOk');
                const customConfirmCancel = document.getElementById('customConfirmCancel');
                
                console.log('自定义确认对话框元素获取结果:');
                console.log('customConfirmOverlay:', customConfirmOverlay);
                console.log('customConfirmTitle:', customConfirmTitle);
                console.log('customConfirmMessage:', customConfirmMessage);
                console.log('customConfirmOk:', customConfirmOk);
                console.log('customConfirmCancel:', customConfirmCancel);
                
                // 转换按钮
                const convertToCamelCaseBtn = document.getElementById('convertToCamelCaseBtn');
                const convertToLowerCamelCaseBtn = document.getElementById('convertToLowerCamelCaseBtn');
                const convertToUnderscoreBtn = document.getElementById('convertToUnderscoreBtn');
                const convertToKebabCaseBtn = document.getElementById('convertToKebabCaseBtn');
                
                let currentTranslation = '';
                let isSpeaking = false;
                let currentSpeakingButton = null;
                let aiConfigs = [];
                let currentAIConfigId = '';
                let isEditingAIConfig = false;
                let editingConfigId = null;
                let showCamelCaseButtons = true; // 是否显示驼峰按钮
                
                // 更新标签文本的函数
                function updateInputLabel(provider) {
                    const providerNames = {
                        'google': 'Google翻译',
                        'baidu': '百度翻译',
                        'youdao': '有道翻译',
                        'tencent': '腾讯翻译',
                        'ai': 'AI翻译'
                    };
                    
                    let providerName = providerNames[provider] || 'Google翻译';
                    
                    // 如果是AI翻译，显示具体的配置名称
                    if (provider === 'ai' && currentAIConfigId) {
                        const currentConfig = aiConfigs.find(config => config.id === currentAIConfigId);
                        if (currentConfig) {
                            providerName = currentConfig.name;
                        }
                    }
                    
                    // 如果是AI翻译，在名称前添加AI图标
                    if (provider === 'ai') {
                        inputLabel.innerHTML = '<img src="' + aiIconUri + '" class="ai-icon" alt="AI" />' + providerName + ':';
                    } else {
                        inputLabel.textContent = providerName + ':';
                    }
                }
                
                // AI配置相关函数
                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                // 自定义确认对话框函数
                let confirmCallback = null;
                
                function showCustomConfirm(title, message, onConfirm) {
                    // console.log('显示自定义确认对话框');
                    // console.log('标题:', title);
                    // console.log('消息:', message);
                    // console.log('回调函数:', typeof onConfirm, onConfirm);
                    
                    customConfirmTitle.textContent = title;
                    customConfirmMessage.textContent = message;
                    customConfirmOverlay.style.display = 'flex';
                    
                    // 保存回调函数
                    confirmCallback = onConfirm;
                    // console.log('回调函数已保存:', typeof confirmCallback);
                }
                
                function hideCustomConfirm() {
                    // console.log('隐藏自定义确认对话框');
                    customConfirmOverlay.style.display = 'none';
                    confirmCallback = null;
                }
                
                // 添加确认对话框事件监听器
                // console.log('绑定确认对话框事件监听器');
                // console.log('customConfirmOk元素:', customConfirmOk);
                
                customConfirmOk.addEventListener('click', () => {
                    // console.log('点击了确定按钮');
                    // console.log('当前回调函数:', typeof confirmCallback, confirmCallback);
                    
                    if (confirmCallback) {
                        console.log('执行回调函数');
                        const callback = confirmCallback; // 保存回调函数
                        hideCustomConfirm(); // 先隐藏对话框
                        callback(); // 再执行回调
                    } else {
                        console.log('没有回调函数可执行');
                        hideCustomConfirm();
                    }
                });
                
                customConfirmCancel.addEventListener('click', () => {
                    console.log('点击了取消按钮');
                    hideCustomConfirm();
                });
                
                // 点击遮罩层关闭
                customConfirmOverlay.addEventListener('click', (e) => {
                    console.log('点击了遮罩层');
                    if (e.target === customConfirmOverlay) {
                        console.log('点击的是遮罩层本身，关闭对话框');
                        hideCustomConfirm();
                    }
                });
                
                // ESC键关闭
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && customConfirmOverlay.style.display === 'flex') {
                        console.log('按下ESC键，关闭对话框');
                        hideCustomConfirm();
                    }
                });
                
                function renderAIConfigsList() {
                    if (!aiConfigs || aiConfigs.length === 0) {
                        aiConfigsList.innerHTML = '<div class="empty-ai-configs">暂无AI翻译配置，请点击下方按钮添加</div>';
                        return;
                    }
                    
                    const html = aiConfigs.map(config => {
                        const isSelected = config.id === currentAIConfigId;
                        const actionButton = isSelected ? 
                            '<button class="ai-config-action-btn selected-btn">已选中</button>' : 
                            '<button class="ai-config-action-btn select-btn" data-action="select" data-config-id="' + escapeHtml(config.id) + '">选择</button>';
                        
                        return '<div class="ai-config-item ' + (isSelected ? 'selected' : '') + '" data-config-id="' + escapeHtml(config.id) + '">' +
                            '<div class="ai-config-info">' +
                                '<div class="ai-config-name">' + escapeHtml(config.name) + '</div>' +
                                '<div class="ai-config-details">' + escapeHtml(config.vendor) + ' | ' + escapeHtml(config.modelName) + '</div>' +
                            '</div>' +
                            '<div class="ai-config-actions">' +
                                actionButton +
                                '<button class="ai-config-action-btn" data-action="edit" data-config-id="' + escapeHtml(config.id) + '">编辑</button>' +
                                '<button class="ai-config-action-btn delete-btn" data-action="delete" data-config-id="' + escapeHtml(config.id) + '">删除</button>' +
                            '</div>' +
                        '</div>';
                    }).join('');
                    
                    aiConfigsList.innerHTML = html;
                    
                    // 如果当前提供商是AI，更新输入标签显示
                    if ((document.getElementById('providerSelect') ? document.getElementById('providerSelect').value : 'google') === 'ai') {
                        updateInputLabel('ai');
                    }
                }
                
                // 使用事件委托处理AI配置操作
                aiConfigsList.addEventListener('click', (e) => {
                    const target = e.target;
                    if (target.tagName !== 'BUTTON') return;
                    
                    const action = target.getAttribute('data-action');
                    const configId = target.getAttribute('data-config-id');
                    
                    if (!action || !configId) return;
                    
                    switch (action) {
                        case 'select':
                            selectAIConfig(configId);
                            break;
                        case 'edit':
                            editAIConfig(configId);
                            break;
                        case 'delete':
                            deleteAIConfig(configId);
                            break;
                    }
                });
                
                function clearAIConfigForm() {
                    aiConfigName.value = '';
                    aiConfigVendor.value = '';
                    aiConfigBaseUrl.value = '';
                    aiConfigApiKey.value = '';
                    aiConfigModel.value = '';
                    aiConfigPrompt.value = '';
                    isEditingAIConfig = false;
                    editingConfigId = null;
                }
                
                function showAIConfigForm() {
                    aiConfigForm.style.display = 'block';
                }
                
                function hideAIConfigForm() {
                    aiConfigForm.style.display = 'none';
                    clearAIConfigForm();
                }
                
                function selectAIConfig(configId) {
                    currentAIConfigId = configId;
                    vscode.postMessage({ type: 'setCurrentAIConfigId', configId: configId });
                    renderAIConfigsList();
                    
                    // 更新输入标签显示
                    if ((document.getElementById('providerSelect') ? document.getElementById('providerSelect').value : 'google') === 'ai') {
                        updateInputLabel('ai');
                    }
                }
                
                function editAIConfig(configId) {
                    const config = aiConfigs.find(c => c.id === configId);
                    if (!config) return;
                    
                    isEditingAIConfig = true;
                    editingConfigId = configId;
                    
                    aiConfigName.value = config.name;
                    aiConfigVendor.value = config.vendor;
                    aiConfigBaseUrl.value = config.baseUrl;
                    aiConfigApiKey.value = config.apiKey;
                    aiConfigModel.value = config.modelName;
                    aiConfigPrompt.value = config.prompt || '';
                    
                    showAIConfigForm();
                }
                
                function deleteAIConfig(configId) {
                    console.log('删除AI配置，ID:', configId);
                    console.log('当前所有配置:', aiConfigs);
                    console.log('vscode对象是否存在:', typeof vscode, vscode);
                    
                    const config = aiConfigs.find(c => c.id === configId);
                    const configName = config ? config.name : '该配置';
                    
                    console.log('找到的配置:', config);
                    
                    showCustomConfirm(
                        '确认删除',
                        '确定要删除AI翻译配置 "' + configName + '" 吗？删除后将无法恢复。',
                        () => {
                            console.log('确认删除配置，ID:', configId);
                            console.log('vscode对象:', typeof vscode, vscode);
                            console.log('vscode.postMessage方法:', typeof vscode.postMessage);
                            console.log('发送删除消息到后端...');
                            try {
                                vscode.postMessage({ type: 'removeAIConfig', configId: configId });
                                console.log('删除消息已发送');
                            } catch (error) {
                                console.error('发送删除消息时出错:', error);
                            }
                            if (currentAIConfigId === configId) {
                                currentAIConfigId = '';
                            }
                        }
                    );
                }
                
                // 图片 URI
                const playIconUri = '${playIconUri}';
                const stopIconUri = '${stopIconUri}';
                const copyIconUri = '${copyIconUri}';
                const sendIconUri = '${sendIconUri}';
                const loadingIconUri = '${loadingIconUri}';
                const aiIconUri = '${aiIconUri}';
                
                // 翻译功能
                function performTranslation() {
                    const text = inputText.value.trim();
                    if (!text) {
                        showError('请输入要翻译的文本');
                        return;
                    }
                    
                    sendBtn.disabled = true;
                    sendBtn.classList.add('loading');
                    const sendImg = sendBtn.querySelector('img');
                    if (sendImg) {
                        sendImg.src = loadingIconUri;
                        sendImg.alt = '翻译中';
                    }
                    hideError();
                    
                    vscode.postMessage({
                        type: 'translate',
                        text: text
                    });
                }
                
                sendBtn.addEventListener('click', performTranslation);
                
                // 回车键翻译
                inputText.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        performTranslation();
                    }
                });
                
                // 监听输入文本变化，保存状态
                inputText.addEventListener('input', () => {
                    vscode.postMessage({
                        type: 'saveInputText',
                        text: inputText.value
                    });
                });
                
                // 播放按钮事件
                inputPlayBtn.addEventListener('click', () => {
                    const text = inputText.value.trim();
                    if (text && !isSpeaking) {
                        const isChinesePattern = /[\u4e00-\u9fa5]/;
                        const detectedLang = isChinesePattern.test(text) ? 'zh' : 'en';
                        playTextWithButton(text, detectedLang, inputPlayBtn, inputPlayIcon);
                    } else if (isSpeaking && currentSpeakingButton === inputPlayBtn) {
                        stopSpeaking();
                    }
                });
                
                resultPlayBtn.addEventListener('click', () => {
                    if (currentTranslation && !isSpeaking) {
                        playTextWithButton(currentTranslation, 'en', resultPlayBtn, resultPlayIcon);
                    } else if (isSpeaking && currentSpeakingButton === resultPlayBtn) {
                        stopSpeaking();
                    }
                });
                
                function playTextWithButton(text, language, button, iconElement) {
                    if (isSpeaking) return;
                    
                    isSpeaking = true;
                    currentSpeakingButton = button;
                    iconElement.src = stopIconUri;
                    iconElement.alt = '停止';
                    
                    vscode.postMessage({
                        type: 'speak',
                        text: text,
                        language: language,
                        options: { speed: 1.0 }
                    });
                }
                
                function stopSpeaking() {
                    vscode.postMessage({ type: 'stopSpeak' });
                }
                
                function resetSpeakingState() {
                    isSpeaking = false;
                    currentSpeakingButton = null;
                    inputPlayIcon.src = playIconUri;
                    inputPlayIcon.alt = '播放';
                    resultPlayIcon.src = playIconUri;
                    resultPlayIcon.alt = '播放';
                }
                
                // 复制按钮
                copyBtn.addEventListener('click', async () => {
                    if (!currentTranslation) return;
                    
                    try {
                        await navigator.clipboard.writeText(currentTranslation);
                        copyBtn.classList.add('copied');
                        setTimeout(() => copyBtn.classList.remove('copied'), 1000);
                    } catch (err) {
                        // 降级方案
                        const textArea = document.createElement('textarea');
                        textArea.value = currentTranslation;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        copyBtn.classList.add('copied');
                        setTimeout(() => copyBtn.classList.remove('copied'), 1000);
                    }
                });
                
                // 驼峰复制按钮
                camelCopyBtn.addEventListener('click', async () => {
                    const camelText = camelCaseContent.textContent;
                    if (!camelText) return;
                    
                    try {
                        await navigator.clipboard.writeText(camelText);
                        camelCopyBtn.classList.add('copied');
                        setTimeout(() => camelCopyBtn.classList.remove('copied'), 1000);
                    } catch (err) {
                        // 降级方案
                        const textArea = document.createElement('textarea');
                        textArea.value = camelText;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        camelCopyBtn.classList.add('copied');
                        setTimeout(() => camelCopyBtn.classList.remove('copied'), 1000);
                    }
                });
                
                // 消息处理
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'translationResult':
                            sendBtn.disabled = false;
                            sendBtn.classList.remove('loading');
                            const sendImg1 = sendBtn.querySelector('img');
                            if (sendImg1) {
                                sendImg1.src = sendIconUri;
                                sendImg1.alt = '翻译';
                            }
                            showResult(message.result);
                            break;
                        case 'translationError':
                            sendBtn.disabled = false;
                            sendBtn.classList.remove('loading');
                            const sendImg2 = sendBtn.querySelector('img');
                            if (sendImg2) {
                                sendImg2.src = sendIconUri;
                                sendImg2.alt = '翻译';
                            }
                            showError(message.error);
                            break;
                        case 'speakComplete':
                            resetSpeakingState();
                            break;
                        case 'speakError':
                            resetSpeakingState();
                            break;
                        case 'speakStopped':
                            resetSpeakingState();
                            break;
                        case 'restoreInputText':
                            inputText.value = message.text;
                            break;
                        case 'restoreTranslationResult':
                            showResult(message.result);
                            break;
                        case 'restoreCamelCaseResult':
                            camelCaseContent.textContent = message.result;
                            camelCaseResult.style.display = 'block';
                            break;
                        case 'setInputText':
                            inputText.value = message.text;
                            vscode.postMessage({
                                type: 'saveInputText',
                                text: message.text
                            });
                            break;
                        case 'currentProvider':
                            providerSelect.value = message.provider;
                            baiduConfig.classList.toggle('show', message.provider === 'baidu');
                            youdaoConfig.classList.toggle('show', message.provider === 'youdao');
                            tencentConfig.classList.toggle('show', message.provider === 'tencent');
                            aiConfig.classList.toggle('show', message.provider === 'ai');
                            updateInputLabel(message.provider);
                            break;
                        case 'baiduConfig':
                            if (message.config.appid) {
                                baiduAppid.value = message.config.appid;
                            }
                            if (message.config.appkey) {
                                baiduAppkey.value = message.config.appkey;
                            }
                            break;
                        case 'youdaoConfig':
                            if (message.config.appKey) {
                                youdaoAppKey.value = message.config.appKey;
                            }
                            if (message.config.appSecret) {
                                youdaoAppSecret.value = message.config.appSecret;
                            }
                            break;
                        case 'tencentConfig':
                            if (message.config.secretId) {
                                tencentSecretId.value = message.config.secretId;
                            }
                            if (message.config.secretKey) {
                                tencentSecretKey.value = message.config.secretKey;
                            }
                            break;
                        case 'aiConfigs':
                            console.log('前端接收到aiConfigs消息:', message.configs);
                            aiConfigs = message.configs || [];
                            // 获取当前选中的配置ID
                            const currentConfig = aiConfigs.find(config => config.id === currentAIConfigId);
                            if (currentConfig) {
                                // 如果当前选中的配置仍然存在，保持选中状态
                                console.log('保持当前选中的配置:', currentConfig);
                                renderAIConfigsList();
                            } else if (aiConfigs.length > 0) {
                                // 如果当前选中的配置不存在了（可能被删除），自动选择第一个
                                console.log('当前选中的配置不存在，自动选择第一个:', aiConfigs[0]);
                                currentAIConfigId = aiConfigs[0].id;
                                renderAIConfigsList();
                            } else {
                                // 如果没有配置了，清空选中状态
                                console.log('没有配置了，清空选中状态');
                                currentAIConfigId = '';
                                renderAIConfigsList();
                            }
                            
                            // AI配置加载完成后，更新输入标签显示（如果当前是AI翻译）
                            if ((document.getElementById('providerSelect') ? document.getElementById('providerSelect').value : 'google') === 'ai') {
                                updateInputLabel('ai');
                            }
                            break;
                        case 'currentAIConfigId':
                            currentAIConfigId = message.configId || '';
                            
                            // 更新输入标签显示
                            if ((document.getElementById('providerSelect') ? document.getElementById('providerSelect').value : 'google') === 'ai') {
                                updateInputLabel('ai');
                            }
                            break;
                        case 'showCamelCaseButtons':
                            showCamelCaseButtons = message.show;
                            // 更新复选框状态（仅在设置页面中）
                            if (showCamelCaseButtonsCheckbox) {
                                showCamelCaseButtonsCheckbox.checked = showCamelCaseButtons;
                            }
                            // 如果当前有翻译结果，根据新配置显示/隐藏按钮
                            if (currentTranslation) {
                                updateCamelCaseSectionVisibility();
                            }
                            break;
                    }
                });
                
                // 更新驼峰转换区域的显示状态
                function updateCamelCaseSectionVisibility() {
                    if (!showCamelCaseButtons) {
                        camelCaseSection.style.display = 'none';
                        return;
                    }
                    
                    // 检测是否需要显示转换按钮（只有英文结果才显示）
                    const hasChinese = /[\u4e00-\u9fa5]/.test(currentTranslation);
                    if (hasChinese) {
                        camelCaseSection.style.display = 'none';
                    } else {
                        camelCaseSection.style.display = 'block';
                        const allBtns = [convertToCamelCaseBtn, convertToLowerCamelCaseBtn, convertToUnderscoreBtn, convertToKebabCaseBtn];
                        allBtns.forEach(btn => btn.classList.remove('active'));
                        camelCaseResult.style.display = 'none';
                    }
                }
                
                function showResult(result) {
                    currentTranslation = result.translatedText;
                    resultContent.textContent = result.translatedText;
                    const sourceLangName = result.sourceLang === 'zh' ? '中文' : '英文';
                    const targetLangName = result.targetLang === 'zh' ? '中文' : '英文';
                    languageInfo.textContent = sourceLangName + ' → ' + targetLangName;
                    resultSection.style.display = 'block';
                    
                    // 根据配置决定是否显示驼峰转换按钮
                    updateCamelCaseSectionVisibility();
                    
                    hideError();
                    resetSpeakingState();
                }
                
                function showError(errorMessage) {
                    errorDiv.textContent = errorMessage;
                    errorDiv.style.display = 'block';
                    resultSection.style.display = 'none';
                    camelCaseSection.style.display = 'none';
                }
                
                function hideError() {
                    errorDiv.style.display = 'none';
                }
                
                // 命名转换功能
                function toUpperCamelCase(text) {
                    if (typeof text !== 'string') return '';
                    const spaceChars = [' ', '　', '\u00A0', '\u200B', '\u202F', '\uFEFF'];
                    let result = '';
                    for (const ch of text) {
                        if (spaceChars.includes(ch)) {
                            result += '_';
                        } else {
                            result += ch;
                        }
                    }
                    return result.trim().split(/[_\-]+/).filter(word => word.length > 0)
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
                }
                
                function toLowerCamelCase(text) {
                    if (typeof text !== 'string') return '';
                    const spaceChars = [' ', '　', '\u00A0', '\u200B', '\u202F', '\uFEFF'];
                    let result = '';
                    for (const ch of text) {
                        if (spaceChars.includes(ch)) {
                            result += '_';
                        } else {
                            result += ch;
                        }
                    }
                    const words = result.trim().split(/[_\-]+/).filter(word => word.length > 0).map(word => word.toLowerCase());
                    if (words.length === 0) return '';
                    return words[0] + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
                }
                
                function toUnderscoreCase(text) {
                    if (typeof text !== 'string') return '';
                    const spaceChars = [' ', '　', '\u00A0', '\u200B', '\u202F', '\uFEFF'];
                    let result = '';
                    for (const ch of text) {
                        if (spaceChars.includes(ch)) {
                            result += '_';
                        } else {
                            result += ch;
                        }
                    }
                    return result.trim().split(/[_\-]+/).filter(word => word.length > 0)
                        .map(word => word.toLowerCase()).join('_');
                }
                
                function toKebabCase(text) {
                    if (typeof text !== 'string') return '';
                    const spaceChars = [' ', '　', '\u00A0', '\u200B', '\u202F', '\uFEFF'];
                    let result = '';
                    for (const ch of text) {
                        if (spaceChars.includes(ch)) {
                            result += '_';
                        } else {
                            result += ch;
                        }
                    }
                    return result.trim().split(/[_\-]+/).filter(word => word.length > 0)
                        .map(word => word.toLowerCase()).join('-');
                }
                
                function setActiveButton(activeBtn) {
                    const allBtns = [convertToCamelCaseBtn, convertToLowerCamelCaseBtn, convertToUnderscoreBtn, convertToKebabCaseBtn];
                    allBtns.forEach(btn => btn.classList.remove('active'));
                    activeBtn.classList.add('active');
                }
                
                // 转换按钮事件
                convertToCamelCaseBtn.addEventListener('click', () => {
                    const text = resultContent.textContent;
                    if (text) {
                        setActiveButton(convertToCamelCaseBtn);
                        const camelCaseText = toUpperCamelCase(text);
                        camelCaseContent.textContent = camelCaseText;
                        camelCaseResult.style.display = 'block';
                        vscode.postMessage({ type: 'saveCamelCaseResult', result: camelCaseText });
                    }
                });
                
                convertToLowerCamelCaseBtn.addEventListener('click', () => {
                    const text = resultContent.textContent;
                    if (text) {
                        setActiveButton(convertToLowerCamelCaseBtn);
                        const camelCaseText = toLowerCamelCase(text);
                        camelCaseContent.textContent = camelCaseText;
                        camelCaseResult.style.display = 'block';
                        vscode.postMessage({ type: 'saveCamelCaseResult', result: camelCaseText });
                    }
                });
                
                convertToUnderscoreBtn.addEventListener('click', () => {
                    const text = resultContent.textContent;
                    if (text) {
                        setActiveButton(convertToUnderscoreBtn);
                        const underscoreText = toUnderscoreCase(text);
                        camelCaseContent.textContent = underscoreText;
                        camelCaseResult.style.display = 'block';
                    }
                });
                
                convertToKebabCaseBtn.addEventListener('click', () => {
                    const text = resultContent.textContent;
                    if (text) {
                        setActiveButton(convertToKebabCaseBtn);
                        const kebabText = toKebabCase(text);
                        camelCaseContent.textContent = kebabText;
                        camelCaseResult.style.display = 'block';
                    }
                });
                
                // 设置功能
                function showSettingsPage() {
                    mainContent.classList.add('hidden');
                    settingsPage.classList.add('show');
                    // 获取当前配置
                    vscode.postMessage({ type: 'getProvider' });
                    vscode.postMessage({ type: 'getBaiduConfig' });
                    vscode.postMessage({ type: 'getYoudaoConfig' });
                    vscode.postMessage({ type: 'getTencentConfig' });
                    vscode.postMessage({ type: 'getAIConfigs' });
                    vscode.postMessage({ type: 'getShowCamelCaseButtons' });
                }
                
                function showMainPage() {
                    settingsPage.classList.remove('show');
                    mainContent.classList.remove('hidden');
                }
                
                // 设置按钮事件
                settingsBtn.addEventListener('click', showSettingsPage);
                doneBtn.addEventListener('click', showMainPage);
                
                // 翻译源选择
                providerSelect.addEventListener('change', () => {
                    const provider = providerSelect.value;
                    vscode.postMessage({ type: 'setProvider', provider: provider });
                    
                    // 显示/隐藏配置区域
                    baiduConfig.classList.toggle('show', provider === 'baidu');
                    youdaoConfig.classList.toggle('show', provider === 'youdao');
                    tencentConfig.classList.toggle('show', provider === 'tencent');
                    aiConfig.classList.toggle('show', provider === 'ai');
                    
                    // 更新输入标签
                    updateInputLabel(provider);
                });
                
                // 百度配置保存
                function saveBaiduConfig() {
                    if (baiduAppid.value && baiduAppkey.value) {
                        vscode.postMessage({
                            type: 'setBaiduConfig',
                            appid: baiduAppid.value,
                            appkey: baiduAppkey.value
                        });
                    }
                }
                
                // 有道配置保存
                function saveYoudaoConfig() {
                    if (youdaoAppKey.value && youdaoAppSecret.value) {
                        vscode.postMessage({
                            type: 'setYoudaoConfig',
                            appKey: youdaoAppKey.value,
                            appSecret: youdaoAppSecret.value
                        });
                    }
                }
                
                // 腾讯配置保存
                function saveTencentConfig() {
                    if (tencentSecretId.value && tencentSecretKey.value) {
                        vscode.postMessage({
                            type: 'setTencentConfig',
                            secretId: tencentSecretId.value,
                            secretKey: tencentSecretKey.value
                        });
                    }
                }
                
                baiduAppid.addEventListener('blur', saveBaiduConfig);
                baiduAppkey.addEventListener('blur', saveBaiduConfig);
                youdaoAppKey.addEventListener('blur', saveYoudaoConfig);
                youdaoAppSecret.addEventListener('blur', saveYoudaoConfig);
                tencentSecretId.addEventListener('blur', saveTencentConfig);
                tencentSecretKey.addEventListener('blur', saveTencentConfig);
                
                // AI配置事件监听器
                addAIConfigBtn.addEventListener('click', () => {
                    clearAIConfigForm();
                    showAIConfigForm();
                });
                
                cancelAIConfigBtn.addEventListener('click', () => {
                    hideAIConfigForm();
                });
                
                saveAIConfigBtn.addEventListener('click', () => {
                    const name = aiConfigName.value.trim();
                    const vendor = aiConfigVendor.value.trim();
                    const baseUrl = aiConfigBaseUrl.value.trim();
                    const apiKey = aiConfigApiKey.value.trim();
                    const modelName = aiConfigModel.value.trim();
                    const prompt = aiConfigPrompt.value.trim();
                    
                    if (!name || !vendor || !baseUrl || !apiKey || !modelName) {
                        alert('请填写所有必填字段（配置名称、厂商标识、Base URL、API Key、模型名称）');
                        return;
                    }
                    
                    const configId = isEditingAIConfig ? editingConfigId : 'ai_' + Date.now();
                    const config = {
                        id: configId,
                        name: name,
                        vendor: vendor,
                        baseUrl: baseUrl,
                        apiKey: apiKey,
                        modelName: modelName,
                        prompt: prompt
                    };
                    
                    vscode.postMessage({ type: 'addAIConfig', config: config });
                    
                    // 如果是新增配置，自动选中
                    if (!isEditingAIConfig) {
                        currentAIConfigId = configId;
                        vscode.postMessage({ type: 'setCurrentAIConfigId', configId: configId });
                    }
                    
                    hideAIConfigForm();
                });
                
                // 驼峰按钮显示配置事件监听器
                showCamelCaseButtonsCheckbox.addEventListener('change', () => {
                    const show = showCamelCaseButtonsCheckbox.checked;
                    vscode.postMessage({ type: 'setShowCamelCaseButtons', show: show });
                    showCamelCaseButtons = show;
                    // 立即更新当前页面的显示状态
                    if (currentTranslation) {
                        updateCamelCaseSectionVisibility();
                    }
                });
                
                // 页面加载完成后通知后端
                setTimeout(() => {
                    vscode.postMessage({ type: 'webviewReady' });
                }, 100);
                
                // 检查TTS可用性
                vscode.postMessage({ type: 'checkTTSAvailable' });
                vscode.postMessage({ type: 'getProvider' });
            </script>
        </body>
        </html>`
  }

  public dispose() {
    TranslationPanelProvider.currentPanel = undefined

    // 清理资源
    this._panel.dispose()

    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }
}
