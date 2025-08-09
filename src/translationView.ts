import * as vscode from 'vscode'
import { TranslationService } from './translationService'
import { TTSService } from './ttsService'

export class TranslationViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'translateView'

  private _view?: vscode.WebviewView
  private translationService: TranslationService
  private ttsService: TTSService

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.translationService = TranslationService.getInstance()
    this.ttsService = TTSService.getInstance()
  }

  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'translate':
          try {
            const result = await this.translationService.translateText(data.text)
            webviewView.webview.postMessage({
              type: 'translationResult',
              result: result,
            })
          } catch (error) {
            webviewView.webview.postMessage({
              type: 'translationError',
              error: error instanceof Error ? error.message : '翻译失败',
            })
          }
          break
        case 'speak':
          try {
            await this.ttsService.speak(data.text, data.language, data.options)
            webviewView.webview.postMessage({
              type: 'speakComplete',
            })
          } catch (error) {
            webviewView.webview.postMessage({
              type: 'speakError',
              error: error instanceof Error ? error.message : '语音播放失败',
            })
          }
          break
        case 'stopSpeak':
          // 停止语音播放，不处理错误（因为可能没有正在播放的内容）
          this.ttsService.stop()
          webviewView.webview.postMessage({
            type: 'speakStopped',
          })
          break
        case 'checkTTSAvailable':
          webviewView.webview.postMessage({
            type: 'ttsAvailable',
            available: this.ttsService.isAvailable(),
          })
          break
        case 'setProvider':
          this.translationService.setTranslationProvider(data.provider)
          break
        case 'setBaiduConfig':
          this.translationService.setBaiduConfig(data.appid, data.appkey)
          break
        case 'setYoudaoConfig':
          this.translationService.setYoudaoConfig(data.appKey, data.appSecret)
          break
        case 'getProvider':
          webviewView.webview.postMessage({
            type: 'currentProvider',
            provider: this.translationService.getCurrentProvider(),
          })
          break
        case 'getBaiduConfig':
          webviewView.webview.postMessage({
            type: 'baiduConfig',
            config: this.translationService.getBaiduConfig(),
          })
          break
        case 'getYoudaoConfig':
          webviewView.webview.postMessage({
            type: 'youdaoConfig',
            config: this.translationService.getYoudaoConfig(),
          })
          break
        case 'checkConfig':
          const currentProvider = this.translationService.getCurrentProvider()
          let isConfigValid = true
          let errorMessage = ''

          if (currentProvider === 'baidu') {
            const baiduConfig = this.translationService.getBaiduConfig()
            if (!baiduConfig.appid || !baiduConfig.appkey) {
              isConfigValid = false
              errorMessage = '百度翻译需要配置 APPID 和密钥，请在设置中填写相关信息'
            }
          } else if (currentProvider === 'youdao') {
            const youdaoConfig = this.translationService.getYoudaoConfig()
            if (!youdaoConfig.appKey || !youdaoConfig.appSecret) {
              isConfigValid = false
              errorMessage = '有道翻译需要配置 AppKey 和 AppSecret，请在设置中填写相关信息'
            }
          }

          if (!isConfigValid) {
            // 使用 VS Code 通知用户进行配置
            vscode.window.showWarningMessage(errorMessage, '去设置').then((selection) => {
              if (selection === '去设置') {
                // 重新打开设置页面
                this.openSettings()
              }
            })
          }

          webviewView.webview.postMessage({
            type: 'configCheckResult',
            isValid: isConfigValid,
            message: errorMessage,
          })
          break
      }
    })
  }

  public openSettings() {
    console.log('打开设置页面')

    console.log(this._view)

    if (this._view) {
      // 延迟一下确保webview已经加载完成
      setTimeout(() => {
        if (this._view) {
          this._view.webview.postMessage({
            type: 'openSettings',
          })
        }
      }, 100)
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to the image and then convert it to a uri the webview can use
    const sendIconPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'images', 'send.png')
    const sendIconUri = webview.asWebviewUri(sendIconPath)

    const settingIconPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'images', 'setting.png')
    const settingIconUri = webview.asWebviewUri(settingIconPath)

    const playIconPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'images', 'play.png')
    const playIconUri = webview.asWebviewUri(playIconPath)

    const stopIconPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'images', 'stop.png')
    const stopIconUri = webview.asWebviewUri(stopIconPath)

    const copyIconPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'images', 'copy.png')
    const copyIconUri = webview.asWebviewUri(copyIconPath)

    const loadingIconPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'images', 'loading.png')
    const loadingIconUri = webview.asWebviewUri(loadingIconPath)

    return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 16px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    line-height: 1.5;
                }
                
                .container {
                    max-width: 100%;
                    position: relative;
                }
                
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
                    font-size: 16px;
                    color: var(--vscode-foreground);
                    margin: 0;
                }
                
                .done-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
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
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .settings-section {
                    margin-bottom: 24px;
                    padding: 16px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    background-color: var(--vscode-sideBar-background);
                }
                
                .settings-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .settings-title {
                    font-weight: 600;
                    font-size: 15px;
                    color: var(--vscode-foreground);
                }
                
                .settings-toggle {
                    background: var(--vscode-button-secondaryBackground);
                    border: 1px solid var(--vscode-button-border);
                    color: var(--vscode-button-secondaryForeground);
                    cursor: pointer;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                
                .settings-toggle:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                    transform: translateY(-1px);
                }
                
                .settings-content {
                    display: none;
                    animation: slideDown 0.3s ease;
                }
                
                .settings-content.expanded {
                    display: block;
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .form-group {
                    margin-bottom: 16px;
                }
                
                .input-section {
                    margin-bottom: 24px;
                }
                
                .label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    font-size: 13px;
                }
                
                .provider-select {
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
                
                .provider-select:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 0 0 2px var(--vscode-focusBorder);
                }
                
                .config-input {
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
                
                .config-input:focus {
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
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
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
                    -webkit-appearance: none;
                }
                
                .input-textarea:focus {
                    outline: none !important;
                    -webkit-focus-ring-color: transparent !important;
                }

                .input-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    border-radius: 0 0 8px 8px;
                }

                .input-play-btn {
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                .input-play-btn img {
                    width: 18px;
                    height: 18px;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                }
                
                .input-play-btn:hover img {
                    opacity: 1;
                }
                
                .input-play-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                
                .input-play-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                .send-btn {
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                .send-btn img {
                    width: 18px;
                    height: 18px;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                }
                
                .send-btn:hover img {
                    opacity: 1;
                }
                
                .send-btn.loading img {
                    display: none;
                }
                
                // .send-btn.loading::after {
                //     content: '⏳';
                //     font-size: 16px;
                // }
                
                .send-btn:hover {
                    // background-color: var(--vscode-button-hoverBackground);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                
                .send-btn:disabled {
                    // background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                

                
                .result-section {
                    margin-top: 16px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    background-color: var(--vscode-sideBar-background);
                    position: relative;
                }
                
                .result-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 24px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .result-content-wrapper {
                    position: relative;
                }
                
                .result-content {
                    padding: 16px 16px 50px 16px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 6px;
                    min-height: 60px;
                    font-size: 14px;
                    line-height: 1.6;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    color: var(--vscode-foreground);
                }

                .result-actions-bottom {
                    position: absolute;
                    bottom: 8px;
                    left: 16px;
                    right: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .result-play-btn {
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                .result-play-btn img {
                    width: 16px;
                    height: 16px;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                }
                
                .result-play-btn:hover img {
                    opacity: 1;
                }
                
                .result-play-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                
                .result-play-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .result-copy-btn {
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                .result-copy-btn img {
                    width: 16px;
                    height: 16px;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                }
                
                .result-copy-btn:hover img {
                    opacity: 1;
                }
                
                .result-copy-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                
                .result-copy-btn.copied {
                    background-color: var(--vscode-testing-iconPassed);
                    border-radius: 50%;
                }
                
                .result-copy-btn.copied img {
                    filter: brightness(0) invert(1);
                }
                
                .result-actions {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                
                .btn-text {
                    font-size: 11px;
                    font-weight: 500;
                }
                
                
                .error {
                    color: #fff;
                    // background-color: var(--vscode-inputValidation-errorBackground);
                    // border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-top: 16px;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .error::before {
                    content: "⚠️";
                    font-size: 16px;
                }
                
                .loading {
                    text-align: center;
                    color: var(--vscode-foreground);
                    font-style: italic;
                    padding: 20px;
                }
                
                .language-info {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    padding: 4px 8px;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    border-radius: 12px;
                    display: inline-block;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div id="mainContent" class="main-content">
                    <div class="input-section">
                        <label class="label" id="inputLabel" for="inputText">输入要翻译的文本:</label>
                        <div class="input-container">
                            <textarea id="inputText" class="input-textarea" placeholder="输入中文或英文文本... (按 Enter 键翻译)"></textarea>
                            <div class="input-actions">
                                <button id="inputPlayBtn" class="input-play-btn" title="播放原文">
                                    <img id="inputPlayIcon" src="${playIconUri}" alt="播放" />
                                </button>
                                <button id="sendBtn" class="send-btn" title="发送">
                                    <img src="${sendIconUri}" alt="发送" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="resultHeader" class="result-header" style="display: none;">
                        <div>
                            <div id="languageInfo" class="language-info"></div>
                        </div>
                    </div>
                    
                    <div id="resultSection" class="result-section" style="display: none;">
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
                    
                    <div id="errorDiv" style="display: none;"></div>
                </div>
                
                <div id="settingsPage" class="settings-page">
                    <div class="settings-header">
                        <h3 class="settings-title">翻译设置</h3>
                        <button id="doneBtn" class="done-btn">完成</button>
                    </div>
                    
                    <div class="form-group">
                        <label class="label" for="providerSelect">翻译源:</label>
                        <select id="providerSelect" class="provider-select">
                            <option value="google">Google 翻译</option>
                            <option value="baidu">百度翻译</option>
                            <option value="youdao">有道翻译</option>
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
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                const inputText = document.getElementById('inputText');
                const inputLabel = document.getElementById('inputLabel');
                const sendBtn = document.getElementById('sendBtn');
                const inputPlayBtn = document.getElementById('inputPlayBtn');
                const inputPlayIcon = document.getElementById('inputPlayIcon');
                const resultSection = document.getElementById('resultSection');
                const resultContent = document.getElementById('resultContent');
                const languageInfo = document.getElementById('languageInfo');
                const errorDiv = document.getElementById('errorDiv');
                const mainContent = document.getElementById('mainContent');
                const settingsPage = document.getElementById('settingsPage');
                const doneBtn = document.getElementById('doneBtn');
                const providerSelect = document.getElementById('providerSelect');
                const baiduConfig = document.getElementById('baiduConfig');
                const youdaoConfig = document.getElementById('youdaoConfig');
                const baiduAppid = document.getElementById('baiduAppid');
                const baiduAppkey = document.getElementById('baiduAppkey');
                const youdaoAppKey = document.getElementById('youdaoAppKey');
                const youdaoAppSecret = document.getElementById('youdaoAppSecret');
                const copyBtn = document.getElementById('copyBtn');
                const copyIcon = document.getElementById('copyIcon');
                const resultPlayBtn = document.getElementById('resultPlayBtn');
                const resultPlayIcon = document.getElementById('resultPlayIcon');
                const resultHeader = document.getElementById('resultHeader');
                
                let currentTranslation = '';
                let currentOriginalText = '';
                let currentSourceLang = '';
                let currentTargetLang = '';
                let isSpeaking = false;
                let currentSpeakingButton = null;
                
                // 图片URI
                const playIconUri = '${playIconUri}';
                const stopIconUri = '${stopIconUri}';
                const copyIconUri = '${copyIconUri}';
                const sendIconUri = '${sendIconUri}';
                const loadingIconUri = '${loadingIconUri}';
                
                // 页面切换功能（只通过VS Code菜单触发）
                doneBtn.addEventListener('click', () => {
                    // 检查当前选择的翻译服务配置
                    vscode.postMessage({ type: 'checkConfig' });
                });
                
                function showSettingsPage() {
                    console.log('显示设置页面');
                    mainContent.classList.add('hidden');
                    settingsPage.classList.add('show');
                    // 获取当前配置
                    vscode.postMessage({ type: 'getProvider' });
                    vscode.postMessage({ type: 'getBaiduConfig' });
                    vscode.postMessage({ type: 'getYoudaoConfig' });
                }
                
                function showMainPage() {
                    settingsPage.classList.remove('show');
                    mainContent.classList.remove('hidden');
                    // 获取当前提供商并更新标签
                    vscode.postMessage({ type: 'getProvider' });
                }
                
                // 更新输入标签
                function updateInputLabel(provider) {
                    const providerNames = {
                        'google': 'Google 翻译',
                        'baidu': '百度翻译', 
                        'youdao': '有道翻译'
                    };
                    const providerName = providerNames[provider] || 'Google 翻译';
                    if (inputLabel) {
                        inputLabel.textContent = providerName + ':';
                    }
                }
                
                // 翻译源选择
                providerSelect.addEventListener('change', () => {
                    const provider = providerSelect.value;
                    vscode.postMessage({
                        type: 'setProvider',
                        provider: provider
                    });
                    
                    // 显示/隐藏配置区域
                    baiduConfig.classList.toggle('show', provider === 'baidu');
                    youdaoConfig.classList.toggle('show', provider === 'youdao');
                    
                    // 更新输入标签
                    updateInputLabel(provider);
                });
                
                // 百度配置保存
                baiduAppid.addEventListener('blur', saveBaiduConfig);
                baiduAppkey.addEventListener('blur', saveBaiduConfig);
                
                // 有道配置保存
                youdaoAppKey.addEventListener('blur', saveYoudaoConfig);
                youdaoAppSecret.addEventListener('blur', saveYoudaoConfig);
                
                function saveBaiduConfig() {
                    if (baiduAppid.value && baiduAppkey.value) {
                        vscode.postMessage({
                            type: 'setBaiduConfig',
                            appid: baiduAppid.value,
                            appkey: baiduAppkey.value
                        });
                    }
                }
                
                function saveYoudaoConfig() {
                    if (youdaoAppKey.value && youdaoAppSecret.value) {
                        vscode.postMessage({
                            type: 'setYoudaoConfig',
                            appKey: youdaoAppKey.value,
                            appSecret: youdaoAppSecret.value
                        });
                    }
                }
                
                // 输入框播放按钮
                inputPlayBtn.addEventListener('click', () => {
                    const text = inputText.value.trim();
                    if (text && !isSpeaking) {
                        // 检测语言
                        const isChinesePattern = /[\u4e00-\u9fa5]/;
                        const detectedLang = isChinesePattern.test(text) ? 'zh' : 'en';
                        playTextWithButton(text, detectedLang, inputPlayBtn, inputPlayIcon);
                    } else if (isSpeaking && currentSpeakingButton === inputPlayBtn) {
                        stopSpeaking();
                    }
                });
                
                // 结果框播放按钮
                resultPlayBtn.addEventListener('click', () => {
                    if (currentTranslation && !isSpeaking) {
                        playTextWithButton(currentTranslation, currentTargetLang, resultPlayBtn, resultPlayIcon);
                    } else if (isSpeaking && currentSpeakingButton === resultPlayBtn) {
                        stopSpeaking();
                    }
                });
                
                function playTextWithButton(text, language, button, iconElement) {
                    if (isSpeaking) return;
                    
                    isSpeaking = true;
                    currentSpeakingButton = button;
                    // 不禁用按钮，保持可点击状态以便停止播放
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
                    
                    // 重置图标按钮状态
                    inputPlayIcon.src = playIconUri;
                    inputPlayIcon.alt = '播放';
                    resultPlayIcon.src = playIconUri;
                    resultPlayIcon.alt = '播放';
                }
                copyBtn.addEventListener('click', async () => {
                    if (!currentTranslation) return;
                    
                    try {
                        await navigator.clipboard.writeText(currentTranslation);
                        copyBtn.classList.add('copied');
                        
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                        }, 1000);
                    } catch (err) {
                        // 降级方案：使用传统的复制方法
                        const textArea = document.createElement('textarea');
                        textArea.value = currentTranslation;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        copyBtn.classList.add('copied');
                        
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                        }, 1000);
                    }
                });
                
                // 翻译功能
                function performTranslation() {
                    const text = inputText.value.trim();
                    if (!text) {
                        showError('请输入要翻译的文本');
                        return;
                    }
                    
                    sendBtn.disabled = true;
                    // 切换为loading图标
                    const sendImg = sendBtn.querySelector('img');
                    if (sendImg) {
                        sendImg.src = loadingIconUri;
                        sendImg.alt = '加载中';
                    }
                    hideError();
                    
                    // 打印调试信息：前端发送请求
                    console.log('前端发送翻译请求:', {
                        type: 'translate',
                        text: text,
                        timestamp: new Date().toISOString()
                    });
                    
                    vscode.postMessage({
                        type: 'translate',
                        text: text
                    });
                }
                
                sendBtn.addEventListener('click', performTranslation);
                
                // 回车键翻译（只有普通回车，不包括Shift+回车）
                inputText.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // 阻止默认的换行行为
                        performTranslation();
                    }
                });
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    // 打印调试信息：前端消息处理
                    console.log('前端收到消息:', {
                        type: message.type,
                        data: message,
                        timestamp: new Date().toISOString()
                    });
                    
                    switch (message.type) {
                        case 'translationResult':
                            sendBtn.disabled = false;
                            // 恢复发送图标
                            const sendImg1 = sendBtn.querySelector('img');
                            if (sendImg1) {
                                sendImg1.src = sendIconUri;
                                sendImg1.alt = '发送';
                            }
                            showResult(message.result);
                            break;
                        case 'translationError':
                            sendBtn.disabled = false;
                            // 恢复发送图标
                            const sendImg2 = sendBtn.querySelector('img');
                            if (sendImg2) {
                                sendImg2.src = sendIconUri;
                                sendImg2.alt = '发送';
                            }
                            showError(message.error);
                            break;
                        case 'speakComplete':
                            resetSpeakingState();
                            break;
                        case 'speakError':
                            resetSpeakingState();
                            // showError(message.error);
                            break;
                        case 'speakStopped':
                            resetSpeakingState();
                            break;
                        case 'ttsAvailable':
                            // 根据TTS可用性显示/隐藏语音按钮
                            if (!message.available) {
                                inputPlayBtn.style.display = 'none';
                                resultPlayBtn.style.display = 'none';
                            }
                            break;
                        case 'currentProvider':
                            providerSelect.value = message.provider;
                            baiduConfig.classList.toggle('show', message.provider === 'baidu');
                            youdaoConfig.classList.toggle('show', message.provider === 'youdao');
                            // 更新输入标签
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
                        case 'openSettings':
                            console.log('收到openSettings消息');
                            showSettingsPage();
                            break;
                        case 'configCheckResult':
                            if (message.isValid) {
                                // 配置有效，切换到主页面
                                showMainPage();
                            }
                            // 如果配置无效，保持在设置页面，VS Code会显示通知
                            break;
                    }
                });
                
                function showResult(result) {
                    currentTranslation = result.translatedText;
                    currentOriginalText = result.originalText;
                    currentSourceLang = result.sourceLang;
                    currentTargetLang = result.targetLang;
                    
                    resultContent.textContent = result.translatedText;
                    const sourceLangName = result.sourceLang === 'zh' ? '中文' : '英文';
                    const targetLangName = result.targetLang === 'zh' ? '中文' : '英文';
                    languageInfo.textContent = \`\${sourceLangName} → \${targetLangName}\`;
                    resultHeader.style.display = 'flex';
                    resultSection.style.display = 'block';
                    hideError();
                    
                    // 重置语音播放状态
                    resetSpeakingState();
                    
                    // 滚动到结果区域
                    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                
                function showError(errorMessage) {
                    errorDiv.className = 'error';
                    errorDiv.textContent = errorMessage;
                    errorDiv.style.display = 'block';
                    resultHeader.style.display = 'none';
                    resultSection.style.display = 'none';
                }
                
                function hideError() {
                    errorDiv.style.display = 'none';
                }
                
                // 页面加载时检查TTS可用性
                vscode.postMessage({ type: 'checkTTSAvailable' });
                // 获取当前翻译提供商并更新标签
                vscode.postMessage({ type: 'getProvider' });
            </script>
        </body>
        </html>`
  }
}
