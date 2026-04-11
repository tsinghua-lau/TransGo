import { logger } from './logger'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as say from 'say'
import { ConfigManager } from './configManager'
import { TencentTTSService } from './tencentTtsService'
import { VolcanoTTSService } from './volcanoTtsService'

export interface TTSOptions {
  voice?: string
  speed?: number
  voiceType?: number
}

export class TTSService {
  private static instance: TTSService
  private isCurrentlySpeaking: boolean = false
  private tencentTTS: TencentTTSService
  private volcanoTTS: VolcanoTTSService
  private currentAudioProcess: any = null
  private tempAudioFiles: string[] = []
  private isStoppedByUser: boolean = false

  private constructor() {
    this.tencentTTS = TencentTTSService.getInstance()
    this.volcanoTTS = VolcanoTTSService.getInstance()
    this.loadTencentConfig()
    this.loadVolcanoConfig()
  }

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService()
    }
    return TTSService.instance
  }

  /**
   * 加载腾讯TTS配置（公开方法，供外部调用）
   */
  async loadTencentConfig(): Promise<void> {
    const config = await ConfigManager.getTencentTTSConfig()
    if (config.secretId && config.secretKey) {
      this.tencentTTS.setConfig({
        secretId: config.secretId,
        secretKey: config.secretKey,
        voiceType: config.voiceType,
      })
    }
  }

  /**
   * 加载火山TTS配置（公开方法，供外部调用）
   */
  async loadVolcanoConfig(): Promise<void> {
    const config = await ConfigManager.getVolcanoTTSConfig()
    if (config.appId && config.accessKey) {
      this.volcanoTTS.setConfig({
        appId: config.appId,
        accessKey: config.accessKey,
        resourceId: config.resourceId,
        speaker: config.speaker,
      })
      logger.log('[TTSService] 火山TTS配置加载成功')
    } else {
      logger.log('[TTSService] 火山TTS配置未完整，跳过加载')
    }
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

    this.isStoppedByUser = false

    // 获取当前TTS提供商
    const provider = ConfigManager.getTTSProvider()
    logger.log('[TTSService] 当前TTS提供商:', provider)

    if (provider === 'tencent') {
      return this.speakWithTencent(text, language, options)
    } else if (provider === 'volcano') {
      return this.speakWithVolcano(text, language, options)
    } else {
      return this.speakWithSystem(text, language, options)
    }
  }

  /**
   * 使用腾讯TTS播放
   */
  private async speakWithTencent(text: string, language: 'zh' | 'en', options?: TTSOptions): Promise<void> {
    await this.loadTencentConfig()

    if (!this.tencentTTS.isConfigured()) {
      throw new Error('腾讯语音服务未配置，请在设置中配置SecretId和SecretKey')
    }

    try {
      this.isCurrentlySpeaking = true

      // 如果没有指定音色，使用配置的音色，如果配置也没有，则根据语言选择默认音色
      const voiceType = options?.voiceType || this.tencentTTS.getConfiguredVoiceType() || this.tencentTTS.getDefaultVoiceByLanguage(language)

      //   logger.log('使用腾讯TTS播放，音色类型:😄😄', voiceType)

      // 调用腾讯TTS API获取音频数据
      const base64Audio = await this.tencentTTS.textToSpeech(text, voiceType)

      // 将Base64音频转换为Buffer
      const audioBuffer = this.tencentTTS.base64ToBuffer(base64Audio)

      // 创建临时文件
      const tempDir = os.tmpdir()
      const tempFile = path.join(tempDir, `transgo_tts_${Date.now()}.mp3`)
      this.tempAudioFiles.push(tempFile)

      // 写入临时文件
      fs.writeFileSync(tempFile, audioBuffer)

      // 使用系统播放器播放
      await this.playAudioFile(tempFile)

      this.isCurrentlySpeaking = false

      // 播放完成后删除临时文件
      this.cleanupTempFiles()
    } catch (error) {
      this.isCurrentlySpeaking = false
      this.cleanupTempFiles()
      throw error
    }
  }

  /**
   * 使用火山TTS播放
   */
  private async speakWithVolcano(text: string, language: 'zh' | 'en', options?: TTSOptions): Promise<void> {
    await this.loadVolcanoConfig()

    if (!this.volcanoTTS.isConfigured()) {
      throw new Error('火山语音服务未配置，请在设置中配置 App ID 和 Access Key')
    }

    try {
      this.isCurrentlySpeaking = true

      const speaker = this.volcanoTTS.getConfiguredSpeaker() || this.volcanoTTS.getDefaultSpeakerByLanguage(language)
      logger.log('[TTSService] 使用火山TTS播放，speaker:', speaker)

      // 调用火山TTS API获取音频 Buffer
      const audioBuffer = await this.volcanoTTS.textToSpeech(text, speaker)

      // 创建临时文件
      const tempDir = os.tmpdir()
      const tempFile = path.join(tempDir, `transgo_volcano_tts_${Date.now()}.mp3`)
      this.tempAudioFiles.push(tempFile)

      // 写入临时文件
      fs.writeFileSync(tempFile, audioBuffer)
      logger.log('[TTSService] 火山TTS音频已写入临时文件:', tempFile)

      // 使用系统播放器播放
      await this.playAudioFile(tempFile)

      this.isCurrentlySpeaking = false

      // 播放完成后删除临时文件
      this.cleanupTempFiles()
    } catch (error) {
      this.isCurrentlySpeaking = false
      this.cleanupTempFiles()
      throw error
    }
  }

  /**
   * 播放音频文件
   */
  private async playAudioFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')

      let command: string
      if (process.platform === 'darwin') {
        // macOS
        command = `afplay "${filePath}"`
      } else if (process.platform === 'win32') {
        // Windows
        command = `powershell -c (New-Object Media.SoundPlayer "${filePath}").PlaySync()`
      } else {
        // Linux
        command = `mpg123 "${filePath}" || ffplay -nodisp -autoexit "${filePath}"`
      }

      this.isStoppedByUser = false
      this.currentAudioProcess = exec(command, (error: any) => {
        this.currentAudioProcess = null
        if (error) {
          if (this.isStoppedByUser) {
            resolve()
          } else {
            reject(new Error(`音频播放失败: ${error.message}`))
          }
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * 使用系统TTS播放
   */
  private async speakWithSystem(text: string, language: 'zh' | 'en', options?: TTSOptions): Promise<void> {
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
      this.isStoppedByUser = true
      // 停止系统语音
      say.stop()

      // 停止腾讯TTS音频播放
      if (this.currentAudioProcess) {
        this.currentAudioProcess.kill()
        this.currentAudioProcess = null
      }

      this.isCurrentlySpeaking = false
      this.cleanupTempFiles()
    } catch (error) {
      this.isCurrentlySpeaking = false
      logger.log('停止语音播放:', error instanceof Error ? error.message : '无正在播放的内容')
    }
  }

  /**
   * 清理临时音频文件
   */
  private cleanupTempFiles(): void {
    this.tempAudioFiles.forEach((file) => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
        }
      } catch (error) {
        logger.log('清理临时文件失败:', error)
      }
    })
    this.tempAudioFiles = []
  }

  /**
   * 检查是否正在播放
   */
  isSpeaking(): boolean {
    return this.isCurrentlySpeaking
  }

  /**
   * 获取腾讯TTS可用音色列表
   */
  getTencentVoices() {
    return this.tencentTTS.getVoiceOptions()
  }

  /**
   * 获取火山TTS可用音色列表
   */
  getVolcanoVoices() {
    return this.volcanoTTS.getVoiceOptions()
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
