import axios from 'axios'
import * as CryptoJS from 'crypto-js'

export interface TencentTTSVoice {
  value: number
  label: string
  language: string
}

export interface TencentTTSConfig {
  secretId: string
  secretKey: string
  voiceType: number
}

export class TencentTTSService {
  private static instance: TencentTTSService
  private config: TencentTTSConfig | null = null

  private readonly VOICE_OPTIONS: TencentTTSVoice[] = [
    { value: 101030, label: '智柯 · 通用男声', language: 'zh' },
    { value: 101055, label: '智付 · 通用女声', language: 'zh' },
    { value: 101013, label: '智辉 · 新闻男声', language: 'zh' },
    { value: 101019, label: '智彤 · 粤语女声', language: 'zh' },
    { value: 101054, label: '智友 · 通用男声', language: 'zh' },
    { value: 101027, label: '智梅 · 通用女声', language: 'zh' },
    { value: 101026, label: '智希 · 通用女声', language: 'zh' },
    { value: 101004, label: '智云 · 通用男声', language: 'zh' },
    { value: 101015, label: '智萌 · 男童声', language: 'zh' },
    { value: 101011, label: '智燕 · 新闻女声', language: 'zh' },
    { value: 101001, label: '智瑜 · 情感女声', language: 'zh' },
    { value: 101021, label: '智瑞 · 新闻男声', language: 'zh' },
    { value: 101016, label: '智甜 · 女童声', language: 'zh' },
    { value: 301037, label: '爱小静 · 对话女声', language: 'zh' },
    { value: 101050, label: 'WeJack · 英文男声(仅英文|不支持中文)', language: 'en' },
  ]

  private constructor() {}

  static getInstance(): TencentTTSService {
    if (!TencentTTSService.instance) {
      TencentTTSService.instance = new TencentTTSService()
    }
    return TencentTTSService.instance
  }

  /**
   * 设置腾讯TTS配置
   */
  setConfig(config: TencentTTSConfig): void {
    this.config = config
  }

  /**
   * 获取可用的音色列表
   */
  getVoiceOptions(): TencentTTSVoice[] {
    return this.VOICE_OPTIONS
  }

  /**
   * 根据语言获取默认音色
   */
  getDefaultVoiceByLanguage(language: 'zh' | 'en'): number {
    if (language === 'en') {
      return 101050 // WeJack · 英文男声
    } else {
      return 101001 // 智瑜 · 情感女声
    }
  }

  /**
   * 获取配置的音色类型
   */
  getConfiguredVoiceType(): number | undefined {
    return this.config?.voiceType
  }

  /**
   * 检查配置是否完整
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.secretId.length > 0 && this.config.secretKey.length > 0
  }

  /**
   * 文本转语音
   * @param text 要合成的文本
   * @param voiceType 音色类型，如果不提供则使用配置中的默认值
   * @returns Base64编码的MP3音频数据
   */
  async textToSpeech(text: string, voiceType?: number): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('腾讯TTS服务未配置，请先配置SecretId和SecretKey')
    }

    if (!text || !text.trim()) {
      throw new Error('文本不能为空')
    }

    const config = this.config!
    const finalVoiceType = voiceType || config.voiceType

    const service = 'tts'
    const host = 'tts.tencentcloudapi.com'
    const region = 'ap-guangzhou'
    const action = 'TextToVoice'
    const version = '2019-08-23'
    const timestamp = Math.floor(Date.now() / 1000)

    const payload = {
      Text: text,
      SessionId: Date.now().toString(),
      VoiceType: finalVoiceType,
      Codec: 'mp3',
      Speed: 0,
      Volume: 5,
    }

    const date = new Date(timestamp * 1000).toISOString().slice(0, 10)

    // 1️⃣ 规范请求
    const hashedPayload = CryptoJS.SHA256(JSON.stringify(payload)).toString()
    const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${host}\n\n` + `content-type;host\n${hashedPayload}`

    // 2️⃣ 待签名字符串
    const credentialScope = `${date}/${service}/tc3_request`
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n` + CryptoJS.SHA256(canonicalRequest).toString()

    // 3️⃣ 计算签名
    const kDate = CryptoJS.HmacSHA256(date, 'TC3' + config.secretKey)
    const kService = CryptoJS.HmacSHA256(service, kDate)
    const kSigning = CryptoJS.HmacSHA256('tc3_request', kService)
    const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString()

    const authorization = `TC3-HMAC-SHA256 Credential=${config.secretId}/${credentialScope}, ` + `SignedHeaders=content-type;host, Signature=${signature}`

    // 4️⃣ 发送请求
    try {
      const response = await axios.post(`https://${host}`, payload, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: authorization,
          'X-TC-Action': action,
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Version': version,
          'X-TC-Region': region,
        },
      })

      const data = response.data

      if (!data.Response || !data.Response.Audio) {
        const errorMsg = data.Response?.Error?.Message || '语音合成失败'
        throw new Error(`腾讯TTS错误: ${errorMsg}`)
      }

      return data.Response.Audio
    } catch (error: any) {
      if (error.response) {
        const errorMsg = error.response.data?.Response?.Error?.Message || error.message
        throw new Error(`腾讯TTS请求失败: ${errorMsg}`)
      }
      throw new Error(`腾讯TTS错误: ${error.message}`)
    }
  }

  /**
   * Base64转Buffer（用于播放）
   */
  base64ToBuffer(base64: string): Buffer {
    return Buffer.from(base64, 'base64')
  }
}
