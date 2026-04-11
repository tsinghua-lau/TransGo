import { logger } from './logger'
import * as https from 'https'

export interface VolcanoTTSVoice {
  value: string
  label: string
  language: string
}

export interface VolcanoTTSConfig {
  appId: string
  accessKey: string
  resourceId: string
  speaker: string
}

export class VolcanoTTSService {
  private static instance: VolcanoTTSService
  private config: VolcanoTTSConfig | null = null

  private readonly VOICE_OPTIONS: VolcanoTTSVoice[] = [
    // 通用场景
    { value: 'zh_female_vv_uranus_bigtts', label: 'Vivi 2.0 · 通用女声', language: 'zh' },
    { value: 'zh_female_xiaohe_uranus_bigtts', label: '小何 2.0 · 通用女声', language: 'zh' },
    { value: 'zh_male_m191_uranus_bigtts', label: '云舟 2.0 · 通用男声', language: 'zh' },
    { value: 'zh_male_taocheng_uranus_bigtts', label: '小天 2.0 · 通用男声', language: 'zh' },
    { value: 'zh_male_liufei_uranus_bigtts', label: '刘飞 2.0 · 通用男声', language: 'zh' },
    { value: 'zh_male_sophie_uranus_bigtts', label: '魅力苏菲 2.0 · 通用男声', language: 'zh' },
    { value: 'zh_female_qingxinnvsheng_uranus_bigtts', label: '清新女声 2.0', language: 'zh' },
    { value: 'zh_female_tianmeixiaoyuan_uranus_bigtts', label: '甜美小源 2.0', language: 'zh' },
    { value: 'zh_female_tianmeitaozi_uranus_bigtts', label: '甜美桃子 2.0', language: 'zh' },
    { value: 'zh_female_shuangkuaisisi_uranus_bigtts', label: '爽快思思 2.0', language: 'zh' },
    { value: 'zh_female_linjianvhai_uranus_bigtts', label: '邻家女孩 2.0', language: 'zh' },
    { value: 'zh_female_meilinvyou_uranus_bigtts', label: '魅力女友 2.0', language: 'zh' },
    { value: 'zh_female_liuchangnv_uranus_bigtts', label: '流畅女声 2.0', language: 'zh' },
    { value: 'zh_female_kefunvsheng_uranus_bigtts', label: '暖阳女声 2.0 · 客服', language: 'zh' },
    // 角色扮演
    { value: 'zh_female_cancan_uranus_bigtts', label: '知性灿灿 2.0', language: 'zh' },
    { value: 'zh_female_sajiaoxuemei_uranus_bigtts', label: '撒娇学妹 2.0', language: 'zh' },
    // 视频配音
    { value: 'zh_female_peiqi_uranus_bigtts', label: '佩奇猪 2.0', language: 'zh' },
    { value: 'zh_male_shaonianzixin_uranus_bigtts', label: '少年梓辛/Brayan 2.0', language: 'zh' },
    { value: 'zh_male_sunwukong_uranus_bigtts', label: '猴哥 2.0', language: 'zh' },
    { value: 'zh_male_dayi_uranus_bigtts', label: '大壹 2.0 · 配音', language: 'zh' },
    { value: 'zh_female_mizai_uranus_bigtts', label: '黑猫侦探社咪仔 2.0', language: 'zh' },
    { value: 'zh_female_jitangnv_uranus_bigtts', label: '鸡汤女 2.0', language: 'zh' },
    { value: 'zh_male_ruyayichen_uranus_bigtts', label: '儒雅逸辰 2.0', language: 'zh' },
    // 教育 / 有声阅读
    { value: 'zh_female_yingyujiaoxue_uranus_bigtts', label: 'Tina老师 2.0 · 中英', language: 'zh' },
    { value: 'zh_female_xiaoxue_uranus_bigtts', label: '儿童绘本 2.0', language: 'zh' },
    // 多语种英文
    { value: 'en_male_tim_uranus_bigtts', label: 'Tim · 美式英文男声', language: 'en' },
    { value: 'en_female_dacey_uranus_bigtts', label: 'Dacey · 美式英文女声', language: 'en' },
    { value: 'en_female_stokie_uranus_bigtts', label: 'Stokie · 美式英文女声', language: 'en' },
    // Saturn 角色扮演
    { value: 'saturn_zh_female_keainvsheng_tob', label: '可爱女生', language: 'zh' },
    { value: 'saturn_zh_female_tiaopigongzhu_tob', label: '调皮公主', language: 'zh' },
    { value: 'saturn_zh_male_shuanglangshaonian_tob', label: '爽朗少年', language: 'zh' },
    { value: 'saturn_zh_male_tiancaitongzhuo_tob', label: '天才同桌', language: 'zh' },
    { value: 'saturn_zh_female_cancan_tob', label: '知性灿灿', language: 'zh' },
    // Saturn 客服场景
    { value: 'saturn_zh_female_qingyingduoduo_cs_tob', label: '轻盈朵朵 2.0 · 客服', language: 'zh' },
    { value: 'saturn_zh_female_wenwanshanshan_cs_tob', label: '温婉珊珊 2.0 · 客服', language: 'zh' },
    { value: 'saturn_zh_female_reqingaina_cs_tob', label: '热情艾娜 2.0 · 客服', language: 'zh' },
  ]

  private constructor() {}

  static getInstance(): VolcanoTTSService {
    if (!VolcanoTTSService.instance) {
      VolcanoTTSService.instance = new VolcanoTTSService()
    }
    return VolcanoTTSService.instance
  }

  setConfig(config: VolcanoTTSConfig): void {
    this.config = config
    logger.log('[VolcanoTTS] 配置已更新:', { appId: config.appId, resourceId: config.resourceId, speaker: config.speaker })
  }

  getVoiceOptions(): VolcanoTTSVoice[] {
    return this.VOICE_OPTIONS
  }

  getDefaultSpeakerByLanguage(language: 'zh' | 'en'): string {
    return language === 'en' ? 'en_female_dacey_uranus_bigtts' : 'zh_female_vv_uranus_bigtts'
  }

  getConfiguredSpeaker(): string | undefined {
    return this.config?.speaker
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.appId.length > 0 && this.config.accessKey.length > 0
  }

  /**
   * 文本转语音（SSE 流式，Node.js https 实现）
   * 收集所有音频 chunks 合并为完整 MP3 Buffer 返回
   */
  async textToSpeech(text: string, speaker?: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error('火山语音服务未配置，请先配置 App ID 和 Access Key')
    }

    if (!text || !text.trim()) {
      throw new Error('文本不能为空')
    }

    const config = this.config!
    const finalSpeaker = speaker || config.speaker || this.getDefaultSpeakerByLanguage('zh')

    const payload = JSON.stringify({
      user: {
        uid: `transgo-${Date.now()}`,
      },
      req_params: {
        text: text,
        speaker: finalSpeaker,
        audio_params: {
          format: 'mp3',
          sample_rate: 24000,
        },
        speech_rate: -10,
      },
    })

    logger.log('[VolcanoTTS] 开始请求 TTS，speaker:', finalSpeaker, '文本长度:', text.length)

    return new Promise<Buffer>((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: 'openspeech.bytedance.com',
        path: '/api/v3/tts/unidirectional/sse',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-App-Id': config.appId,
          'X-Api-Access-Key': config.accessKey,
          'X-Api-Resource-Id': config.resourceId || 'seed-tts-2.0',
          'Content-Length': Buffer.byteLength(payload),
        },
      }

      const audioChunks: Buffer[] = []
      let rawBuffer = ''
      let rejected = false

      const req = https.request(options, (res) => {
        logger.log('[VolcanoTTS] 收到响应，状态码:', res.statusCode)

        if (res.statusCode !== 200) {
          reject(new Error(`火山TTS HTTP错误: ${res.statusCode}`))
          return
        }

        res.setEncoding('utf-8')

        res.on('data', (chunk: string) => {
          rawBuffer += chunk

          // SSE 格式：每个事件以两个换行符结尾
          // 事件格式：
          //   event: <number>\n
          //   data: {"code":0,"message":"","data":"<base64>"}\n\n
          const events = rawBuffer.split('\n\n')
          rawBuffer = events.pop() || '' // 最后一段可能不完整，留到下次

          for (const event of events) {
            if (!event.trim() || rejected) continue

            const dataLine = event.split('\n').find((line) => line.startsWith('data:'))
            if (!dataLine) continue

            const jsonStr = dataLine.slice('data:'.length).trim()
            if (!jsonStr) continue

            try {
              const parsed = JSON.parse(jsonStr)
              logger.log('[VolcanoTTS] SSE data, code:', parsed.code, 'data长度:', parsed.data?.length ?? 0)

              // code=0：音频数据帧；code=20000000：流结束标记（OK），两者均为正常
              const SUCCESS_CODES = [0, 20000000]
              if (!SUCCESS_CODES.includes(parsed.code)) {
                rejected = true
                reject(new Error(`火山TTS 错误 code=${parsed.code}: ${parsed.message || '未知错误'}`))
                return
              }

              // data 有内容时才是音频帧，空字符串是结束标记，跳过
              if (parsed.data) {
                const buf = Buffer.from(parsed.data, 'base64')
                audioChunks.push(buf)
                logger.log('[VolcanoTTS] 收到音频 chunk，大小:', buf.length, '字节，累计 chunks:', audioChunks.length)
              } else if (parsed.code === 20000000) {
                logger.log('[VolcanoTTS] 收到结束标记（code=20000000, OK）')
              }
            } catch (parseErr) {
              logger.warn('[VolcanoTTS] SSE data JSON 解析失败，跳过:', jsonStr.slice(0, 100))
            }
          }
        })

        res.on('end', () => {
          if (rejected) return

          if (audioChunks.length === 0) {
            reject(new Error('火山TTS 未返回任何音频数据'))
            return
          }

          const audioBuffer = Buffer.concat(audioChunks)
          logger.log('[VolcanoTTS] 音频合并完成，总大小:', audioBuffer.length, '字节，共', audioChunks.length, '个 chunks')
          resolve(audioBuffer)
        })

        res.on('error', (err) => {
          logger.error('[VolcanoTTS] 响应流错误:', err.message)
          reject(new Error(`火山TTS 响应错误: ${err.message}`))
        })
      })

      req.on('error', (err) => {
        logger.error('[VolcanoTTS] 请求错误:', err.message)
        reject(new Error(`火山TTS 请求失败: ${err.message}`))
      })

      req.write(payload)
      req.end()
    })
  }
}
