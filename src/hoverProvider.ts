import { logger } from './logger'
import * as vscode from 'vscode'
import { ConfigManager } from './configManager'
import { TranslationService } from './translationService'

export class TranslationHoverProvider implements vscode.HoverProvider {
  private translationService: TranslationService
  private hoverTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private lastRequestTime: number = 0
  private requestCount: number = 0
  private readonly MIN_INTERVAL = 2000 // 最小请求间隔2秒
  private readonly MAX_REQUESTS_PER_MINUTE = 2 // 每分钟最多2次请求
  private requestTimes: number[] = []
  private translationCache: Map<string, { result: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 缓存5分钟
  private pendingTranslations: Map<string, Promise<any>> = new Map()
  private readonly HOVER_DELAY = 2000 // 悬停2秒后开始翻译
  private readonly LOADING_DELAY = 2000 // 显示"翻译中"的延迟
  private extensionUri: vscode.Uri

  constructor(extensionUri: vscode.Uri) {
    this.translationService = TranslationService.getInstance()
    this.extensionUri = extensionUri
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
    // 检查是否启用悬浮翻译
    const hoverEnabled = ConfigManager.getHoverTranslationEnabled()
    if (!hoverEnabled) {
      return undefined
    }

    // 获取当前位置的单词或选中文本
    const range = this.getTextRange(document, position)
    if (!range) {
      return undefined
    }

    const text = document.getText(range).trim()

    // 过滤条件
    if (!this.shouldTranslate(text)) {
      return undefined
    }

    // 检查缓存，如果有缓存直接返回
    const cacheKey = this.getCacheKey(text)
    const cachedResult = this.getFromCache(cacheKey)
    if (cachedResult) {
      const hoverContent = this.createHoverContent(text, cachedResult, this.extensionUri, document, range)
      return new vscode.Hover([hoverContent], range)
    }

    // 直接开始翻译
    return this.createDirectHover(text, range, token, document)
  }

  private getTextRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
    // 先尝试获取选中的文本
    const editor = vscode.window.activeTextEditor
    if (editor && !editor.selection.isEmpty) {
      // 检查鼠标位置是否在选中范围内
      if (editor.selection.contains(position)) {
        return editor.selection
      }
    }

    // 如果没有选中文本，获取当前单词
    const wordRange = document.getWordRangeAtPosition(position)
    if (wordRange) {
      return wordRange
    }

    // 尝试获取包含中文字符的范围
    const line = document.lineAt(position.line)
    const text = line.text
    const charIndex = position.character

    if (charIndex >= text.length) {
      return undefined
    }

    // 检查当前字符是否是中文
    const currentChar = text[charIndex]
    if (this.isChinese(currentChar)) {
      // 扩展中文字符范围
      let start = charIndex
      let end = charIndex + 1

      // 向左扩展
      while (start > 0 && (this.isChinese(text[start - 1]) || this.isWhitespace(text[start - 1]))) {
        start--
      }

      // 向右扩展
      while (end < text.length && (this.isChinese(text[end]) || this.isWhitespace(text[end]))) {
        end++
      }

      if (start < end) {
        return new vscode.Range(new vscode.Position(position.line, start), new vscode.Position(position.line, end))
      }
    }

    return undefined
  }

  private shouldTranslate(text: string): boolean {
    // 长度检查
    if (text.length < 1 || text.length > 200) {
      return false
    }

    // 去除空白字符
    const trimmedText = text.trim()
    if (trimmedText.length === 0) {
      return false
    }

    // 检查是否只包含数字、标点符号或特殊字符
    if (/^[0-9\s\p{P}\p{S}]+$/u.test(trimmedText)) {
      return false
    }

    // 检查是否包含有意义的文本（中文或英文字母）
    const hasChineseOrEnglish = /[\u4e00-\u9fa5a-zA-Z]/.test(trimmedText)
    if (!hasChineseOrEnglish) {
      return false
    }

    return true
  }

  private isChinese(char: string): boolean {
    return /[\u4e00-\u9fa5]/.test(char)
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char)
  }

  private createHoverContent(
    originalText: string,
    translationResult: any,
    extensionUri?: vscode.Uri,
    document?: vscode.TextDocument,
    range?: vscode.Range
  ): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    // 获取当前翻译源名称
    const currentProvider = this.translationService.getCurrentProvider()
    const providerNames: { [key: string]: string } = {
      google: 'Google翻译',
      baidu: '百度翻译',
      youdao: '有道翻译',
      tencent: '腾讯翻译',
      ai: 'AI翻译',
    }
    const providerName = providerNames[currentProvider] || currentProvider

    // 尝试使用扩展URI来显示logo
    if (extensionUri) {
      const logoUri = vscode.Uri.joinPath(extensionUri, 'src', 'images', 'logo.png')
      markdown.appendMarkdown(`<img src="${logoUri.toString()}" width="16" height="10" style="vertical-align: middle;"> **${providerName}:**\n\n`)
    } else {
      markdown.appendMarkdown(`**${providerName}:**\n\n`)
    }

    // 显示翻译结果（使用代码块显示）
    markdown.appendCodeblock(translationResult.translatedText, '')
    markdown.appendMarkdown(`\n\n`)

    // 检测原文语言类型（用于播放原文）
    const isChineseInput = /[\u4e00-\u9fa5]/.test(originalText)
    const originalLanguage = isChineseInput ? 'zh' : 'en' // 原文的语言

    // 添加复制按钮
    const copyArgs = JSON.stringify([translationResult.translatedText])
    const copyCommand = `command:transgo.copyText?${encodeURIComponent(copyArgs)}`
    if (extensionUri) {
      const copyIconUri = vscode.Uri.joinPath(extensionUri, 'src', 'images', 'copy.png')
      markdown.appendMarkdown(`[<img src="${copyIconUri.toString()}" width="16" height="16" align="absmiddle">&nbsp;复制](${copyCommand} "复制翻译结果")`)
    } else {
      markdown.appendMarkdown(`[📋 复制](${copyCommand} "复制翻译结果")`)
    }

    // 添加播放按钮
    const playArgs = JSON.stringify([
      {
        text: originalText,
        language: originalLanguage,
      },
    ])
    const playCommand = `command:transgo.playTextFromHover?${encodeURIComponent(playArgs)}`
    if (extensionUri) {
      const playIconUri = vscode.Uri.joinPath(extensionUri, 'src', 'images', 'play.png')
      markdown.appendMarkdown(`&nbsp;&nbsp;&nbsp;[<img src="${playIconUri.toString()}" width="16" height="16" align="absmiddle">&nbsp;播放](${playCommand} "播放原文")`)
    } else {
      markdown.appendMarkdown(`&nbsp;&nbsp;&nbsp;[▶️ 播放](${playCommand} "播放原文")`)
    }

    // 添加替换按钮
    if (document && range) {
      const replaceArgs = JSON.stringify([
        {
          text: translationResult.translatedText,
          originalText: originalText,
          range: {
            startLine: range.start.line,
            startChar: range.start.character,
            endLine: range.end.line,
            endChar: range.end.character,
          },
          uri: document.uri.toString(),
        },
      ])
      const replaceCommand = `command:transgo.replaceText?${encodeURIComponent(replaceArgs)}`
      if (extensionUri) {
        const replaceIconUri = vscode.Uri.joinPath(extensionUri, 'src', 'images', 'replace.png')
        markdown.appendMarkdown(`&nbsp;&nbsp;&nbsp;[<img src="${replaceIconUri.toString()}" width="16" height="16" align="absmiddle">&nbsp;替换](${replaceCommand} "替换为翻译结果")`)
      } else {
        markdown.appendMarkdown(`&nbsp;&nbsp;&nbsp;[$(replace)&nbsp;替换](${replaceCommand} "替换为翻译结果")`)
      }
    }

    markdown.appendMarkdown(`\n\n`)

    // 添加分隔线
    markdown.appendMarkdown(`---`)

    return markdown
  }

  /**
   * 检查是否可以发起新的请求（频率控制）
   */
  private canMakeRequest(): boolean {
    const now = Date.now()

    // 检查最小间隔
    if (now - this.lastRequestTime < this.MIN_INTERVAL) {
      return false
    }

    // 清理1分钟前的请求记录
    this.requestTimes = this.requestTimes.filter((time) => now - time < 60000)

    // 检查每分钟请求数限制
    if (this.requestTimes.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return false
    }

    return true
  }

  /**
   * 记录请求时间
   */
  private recordRequest(): void {
    const now = Date.now()
    this.lastRequestTime = now
    this.requestTimes.push(now)
  }

  /**
   * 创建频率限制提示的悬浮内容
   */
  private createRateLimitHover(text: string, range: vscode.Range): vscode.Hover {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    const nextAllowedTime = this.getNextAllowedTime()
    const waitSeconds = Math.ceil((nextAllowedTime - Date.now()) / 1000)

    markdown.appendMarkdown(`### ⏳ 翻译频率限制\n\n`)
    markdown.appendMarkdown(`为避免触发API限制，请等待 **${waitSeconds}秒** 后再试\n\n`)
    markdown.appendMarkdown(`*原文: ${text}*\n\n`)
    markdown.appendMarkdown(`---`)

    return new vscode.Hover([markdown], range)
  }

  /**
   * 获取下次允许请求的时间
   */
  private getNextAllowedTime(): number {
    const now = Date.now()

    // 基于最小间隔的下次请求时间
    const minIntervalNext = this.lastRequestTime + this.MIN_INTERVAL

    // 基于每分钟请求数的下次请求时间
    let rpmNext = now
    if (this.requestTimes.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestRequest = Math.min(...this.requestTimes)
      rpmNext = oldestRequest + 60000 // 1分钟后
    }

    return Math.max(minIntervalNext, rpmNext)
  }

  /**
   * 检查是否是频率限制错误
   */
  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return message.includes('rpm') || message.includes('rate limit') || message.includes('too many requests') || message.includes('quota exceeded') || message.includes('频繁')
  }

  /**
   * 创建错误提示的悬浮内容
   */
  private createErrorHover(text: string, errorMessage: string, range: vscode.Range): vscode.Hover {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    markdown.appendMarkdown(`### 💡 提示\n\n`)
    markdown.appendMarkdown(`${errorMessage}\n\n`)
    markdown.appendMarkdown(`**提示**: 您可以在翻译面板中手动翻译\n\n`)
    markdown.appendMarkdown(`---`)

    return new vscode.Hover([markdown], range)
  }

  /**
   * 创建延时翻译悬浮内容
   */
  private async createDirectHover(
    text: string,
    range: vscode.Range,
    token: vscode.CancellationToken,
    document: vscode.TextDocument
  ): Promise<vscode.Hover> {
    const cacheKey = this.getCacheKey(text)

    try {
      // 检查是否已有正在进行的翻译
      if (this.pendingTranslations.has(cacheKey)) {
        const result = await this.pendingTranslations.get(cacheKey)!
        if (result === null) {
          return this.createLoadingHover(text, range)
        }
        const hoverContent = this.createHoverContent(text, result, this.extensionUri, document, range)
        return new vscode.Hover([hoverContent], range)
      }

      // 等待1.5秒，给用户时间移开鼠标
      await this.delay(1500)

      if (token.isCancellationRequested) {
        return this.createLoadingHover(text, range)
      }

      // 创建翻译任务
      const translationPromise = this.createTranslationTask(text, token)
      this.pendingTranslations.set(cacheKey, translationPromise)

      // 等待200ms后显示"翻译中"状态，然后等待翻译完成
      await this.delay(200)

      if (token.isCancellationRequested) {
        return this.createLoadingHover(text, range)
      }

      // 显示翻译中状态并等待翻译完成
      const result = await translationPromise
      if (result === null) {
        return this.createLoadingHover(text, range)
      }

      const hoverContent = this.createHoverContent(text, result, this.extensionUri, document, range)
      return new vscode.Hover([hoverContent], range)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '翻译失败'
      logger.error('悬浮翻译失败:', error)

      // 通知用户（仅对配置错误通知，避免频繁打扰）
      if (errorMsg.includes('配置') || errorMsg.includes('不支持')) {
        vscode.window.showWarningMessage(`TransGo 悬浮翻译: ${errorMsg}`)
      }

      if (error instanceof Error) {
        return this.createErrorHover(text, error.message, range)
      }
      return this.createErrorHover(text, errorMsg, range)
    }
  }

  /**
   * 创建翻译任务
   */
  private async createTranslationTask(text: string, token: vscode.CancellationToken): Promise<any> {
    const cacheKey = this.getCacheKey(text)

    try {
      if (token.isCancellationRequested) {
        return null
      }

      // 翻译文本
      const result = await this.translationService.translateText(text)

      // 保存到缓存
      this.saveToCache(cacheKey, result)

      return result
    } catch (error) {
      logger.error('悬浮翻译 - 翻译任务失败:', error)
      throw error
    } finally {
      // 清理pending状态
      this.pendingTranslations.delete(cacheKey)
    }
  }

  /**
   * 延迟辅助方法
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 创建翻译中状态的悬浮内容
   */
  private createLoadingHover(text: string, range: vscode.Range): vscode.Hover {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    markdown.appendMarkdown(`### 翻译中...\n\n`)
    markdown.appendMarkdown(`*正在翻译: ${text}*`)

    return new vscode.Hover([markdown], range)
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(text: string): string {
    const provider = this.translationService.getCurrentProvider()
    const cleanText = text.trim().toLowerCase()
    return `${provider}:${cleanText}`
  }

  /**
   * 从缓存获取翻译结果
   */
  private getFromCache(cacheKey: string): any | null {
    const cached = this.translationCache.get(cacheKey)
    if (!cached) {
      return null
    }

    // 检查缓存是否过期
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.translationCache.delete(cacheKey)
      return null
    }

    return cached.result
  }

  /**
   * 保存翻译结果到缓存
   */
  private saveToCache(cacheKey: string, result: any): void {
    // 清理过期的缓存项
    this.cleanExpiredCache()

    this.translationCache.set(cacheKey, {
      result: result,
      timestamp: Date.now(),
    })

    // 缓存保存成功
  }

  /**
   * 清理过期的缓存项
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.translationCache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.translationCache.delete(key)
      }
    }
  }

  dispose() {
    // 清理定时器
    this.hoverTimeouts.forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.hoverTimeouts.clear()

    // 清理缓存
    this.translationCache.clear()

    // 清理pending翻译
    this.pendingTranslations.clear()
  }
}
