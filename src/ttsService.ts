import * as say from 'say'

export interface TTSOptions {
  voice?: string
  speed?: number
}

export class TTSService {
  private static instance: TTSService
  private isCurrentlySpeaking: boolean = false

  private constructor() {}

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService()
    }
    return TTSService.instance
  }

  /**
   * 播放文本
   * @param text 要播放的文本
   * @param language 语言类型 'zh' | 'en'
   * @param options 播放选项
   */
  async speak(text: string, language: 'zh' | 'en' = 'en', options?: TTSOptions): Promise<void> {
    if (!text || !text.trim()) {
      throw new Error('播放文本不能为空')
    }

    // 如果正在播放，先停止
    if (this.isCurrentlySpeaking) {
      this.stop()
    }

    return new Promise((resolve, reject) => {
      try {
        this.isCurrentlySpeaking = true

        const sayOptions: any = {
          ...options,
        }

        // 根据语言设置合适的语音
        if (language === 'zh') {
          // 中文语音设置
          if (process.platform === 'darwin') {
            // macOS
            sayOptions.voice = options?.voice || 'Ting-Ting'
          } else if (process.platform === 'win32') {
            // Windows
            sayOptions.voice = options?.voice || 'Microsoft Huihui Desktop'
          }
        } else {
          // 英文语音设置
          if (process.platform === 'darwin') {
            // macOS
            sayOptions.voice = options?.voice || 'Alex'
          } else if (process.platform === 'win32') {
            // Windows
            sayOptions.voice = options?.voice || 'Microsoft Zira Desktop'
          }
        }

        // 设置语速
        sayOptions.speed = options?.speed || 1.0

        // 使用正确的 say.speak API
        // say.speak(text, voice?, speed?, callback?)
        say.speak(text, sayOptions.voice, sayOptions.speed, (err: any) => {
          this.isCurrentlySpeaking = false
          if (err) {
            reject(new Error(`语音播放失败: ${err.message}`))
          } else {
            resolve()
          }
        })
      } catch (error) {
        this.isCurrentlySpeaking = false
        reject(new Error(`语音播放失败: ${error instanceof Error ? error.message : '未知错误'}`))
      }
    })
  }

  /**
   * 停止当前播放
   */
  stop(): void {
    try {
      say.stop()
      this.isCurrentlySpeaking = false
    } catch (error) {
      // 静默处理停止错误，因为可能没有正在播放的内容
      this.isCurrentlySpeaking = false
      console.log('停止语音播放:', error instanceof Error ? error.message : '无正在播放的内容')
    }
  }

  /**
   * 检查是否正在播放
   */
  isSpeaking(): boolean {
    return this.isCurrentlySpeaking
  }

  /**
   * 获取可用的语音列表
   */
  async getAvailableVoices(): Promise<string[]> {
    // say 库没有提供获取语音列表的方法，返回预设的语音列表
    const defaultVoices = {
      darwin: ['Alex', 'Samantha', 'Victoria', 'Ting-Ting', 'Sin-ji'],
      win32: ['Microsoft Zira Desktop', 'Microsoft David Desktop', 'Microsoft Huihui Desktop'],
      linux: ['espeak', 'festival'],
    }

    const platform = process.platform as keyof typeof defaultVoices
    return defaultVoices[platform] || defaultVoices.linux
  }

  /**
   * 检查语音播放功能是否可用
   */
  isAvailable(): boolean {
    try {
      return say !== undefined && typeof say.speak === 'function'
    } catch (error) {
      return false
    }
  }
}
