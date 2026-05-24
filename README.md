# TransGo - AI 翻译 & 悬浮翻译

**TransGo** 是 VS Code 中功能强大的 AI 中英文翻译插件，支持侧边栏对话翻译、鼠标悬浮翻译、选中文本一键翻译、语音朗读（火山引擎豆包 TTS 高质量语音）、驼峰/下划线命名转换。

现已全面支持 **DeepSeek**（性价比高，新用户免费额度）、ChatGPT、Claude、Kimi、通义千问等大模型，同时兼容传统引擎。API 密钥采用**系统级加密存储**，安全可靠。

![TransGo 演示](https://github.com/tsinghua-lau/TransGo/blob/master/preview.gif?raw=true)

> ![提示](https://img.shields.io/badge/Tip-提示-blue?style=flat-square)
> 如果升级后无法使用，重新安装即可。
> 选择 AI 翻译时注意翻译提示词的编写，建议使用"**你是专业的中英文翻译，请准确翻译以下内容。中文翻译为英文，英文翻译为中文，只返回翻译结果：{text}**" 提示词。

> ![安全](https://img.shields.io/badge/Security-安全-green?style=flat-square)  
> **v1.1.2+ 安全更新**: 所有 API 密钥现在使用加密保存，不再以明文形式保存在 settings.json 中。首次升级会自动迁移现有密钥。

![GitHub 演示](https://github.com/tsinghua-lau/TransGo/blob/master/preview.gif?raw=true)

默认使用 `Google翻译` 无需配置即可翻译（需要科学上网）

`Cursor`中首次使用点击右上角`⋯`选择`Configure Icon Visibility`勾选`快速翻译`即可显示翻译图标

## 功能特点

- 🎨 VSCode 右侧边栏交互不影响主工作区交互
- 🔄 自动识别中英文并进行相互翻译
- 🎯 悬浮翻译（鼠标悬停显示翻译结果）
- 🔊 真实语音朗读
- 🐫 翻译结果大小驼峰转换
- 🌐 支持多种翻译服务：Google、百度、有道、腾讯、AI 大模型
- 🔊 支持多种语音朗读：系统语音、腾讯云 TTS、**火山引擎豆包 TTS**
- 🤖 自定义配置 AI 大模型翻译提示词，多样化翻译
- ✨ 简洁美观的界面设计，可视化的配置操作
- ⚡️ 快捷键翻译快速响应，流畅体验
- 🔒 安全存储：API 密钥使用系统级加密存储（v1.1.2+）

## 目录

- [快速使用](#快速使用)
- [版本更新](#版本更新)
- [传统翻译配置](#传统翻译服务)
- [AI 翻译配置](#ai-翻译配置)
- [腾讯云 TTS 语音配置](#腾讯云-tts-语音服务配置)
- [火山引擎 TTS 语音配置](#火山引擎-tts-语音服务配置)
- [常用配置模板](#常用配置模板)
- [安全性说明](#安全性说明)
- [常见问题](#常见问题)

## 快速使用

- 点击右上角的翻译图标
- 在侧边栏中输入要翻译的文本
- 点击"翻译"按钮或使用快捷键 `Enter`

## 版本更新

### v1.1.8

- ✅ 新增翻译源/语音服务连通性测试

### v1.1.7

- ✅ 新增主题配置，支持跟随 VSCode 主题自动切换浅色/深色模式

### v1.1.6

- ✅ Marketplace 元数据优化

### v1.1.5

- ✅ 修复播放音频时错误提示问题

### v1.1.4

- ✅ 新增火山引擎豆包 TTS 语音服务支持（Seed-TTS 2.0）
- ✅ 内置 37 个火山语音音色（通用、角色扮演、客服、英文等）

### v1.1.3

- ✅ 优化悬浮翻译界面
- ✅ 修复翻译不准相关问题
- ✅ 新增悬浮翻译播放功能
- ✅ 新增悬浮翻译替换功能
- ✅ 新增快捷键翻译并替换功能

### v1.1.2

- ✅ 悬浮翻译支持 AI 翻译服务
- ✅ 自动迁移旧版本密钥到安全存储
- ✅ 安全更新：API 密钥使用系统级加密存储，防止泄露

### v1.1.1

- ✅ 新增腾讯云 TTS 语音服务支持

### v1.1.0

- ✅ 修复翻译不全问题

### v1.0.9

- ✅ 修复 bug，提升稳定性

### v1.0.7

- ✅ 修复 bug，提升稳定性

### v1.0.6

- ✅ 新增鼠标悬停翻译

### v1.0.5

- ✅ 文档精简
- ✅ Base URL 配置改为完整地址

### v1.0.4

- ✅ 新增 AI 大模型翻译支持
- ✅ 优化 Base URL 配置逻辑

### v1.0.3

- ✅ 新增腾讯翻译

### v1.0.2

- ✅ 翻译结果缓存，自动加载上次结果
- ✅ 界面优化，改为右侧活动栏

### v1.0.1

- ✅ 修复密钥配置缓存

### v1.0.0

- ✅ 发布初始版本

---

### 快捷操作

- **编辑器右键**: 选中文本后右键选择"翻译选中文本"
- **编辑器顶部**: 点击编辑器标题栏的翻译图标
- **命令面板**: `Ctrl+Shift+P` → `打开翻译`
- **悬浮翻译**: 鼠标悬停在文本上显示翻译结果（需在设置中开启）
- **快捷键翻译并替换**: 选中文本后使用快捷键 windows: `Ctrl+Alt+T` macOS: `Cmd+Alt+T` 进行翻译并替换原文
- **配置快捷键**: 设置 → 键盘快捷方式 → 搜索 `translate` 自定义快捷键:
  - `translate.openTranslatePanel`: 打开翻译面板
  - `translate.translateAndReplace`: 翻译并替换选中文本
  - `translate.translateSelection`: 翻译选中文本
  - ...

## 传统翻译服务

> ![提示](https://img.shields.io/badge/Tip-提示-blue?style=flat-square)  
> 正常使用情况下提供的免费翻译额度完全够日常使用。

选择翻译服务打开官网获取 API Key：

- [百度翻译](https://fanyi-api.baidu.com/) - 需要配置 APPID 和密钥
- [有道翻译](https://ai.youdao.com/) - 需要配置 AppKey 和 AppSecret
- [腾讯翻译](https://console.cloud.tencent.com/cam/capi) - 需要配置 SecretId 和 SecretKey

## 腾讯云 TTS 语音服务配置

1. 注册并登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 页面，创建并获取 `SecretId` 和 `SecretKey`
3. [领取基础/精品音色免费额度](https://console.cloud.tencent.com/tts/resourcebundle) 800 万字符
4. 在插件设置中找到 `腾讯云 TTS 配置`，填写获取的密钥
5. 选择合适的音色，保存配置
6. 在翻译面板中输入文本，点击朗读按钮即可听到语音

## 火山引擎 TTS 语音服务配置

火山引擎豆包语音（Seed-TTS）提供高质量、高自然度的中英文语音合成服务。

### 获取密钥

1. 注册并登录 [火山引擎控制台](https://console.volcengine.com/)
2. 进入 [语音技术 · 语音合成](https://console.volcengine.com/speech/service/tts) 页面，开通服务
3. 选择菜单豆包语音合成模型 2.0，选择应用名称，在页面·服务接口认证信息中复制：APP ID、
   Access Token

> 💡 **App ID** 和 **Access Token** 分别对应插件设置中的 `App ID` 和 `Access Key` 字段。

### 配置步骤

1. 在插件设置中将"语音服务"切换为 **火山语音**
2. 填写 `App ID` 和 `Access Token`
3. `Resource ID` 填写模型资源 ID，推荐使用 `seed-tts-2.0`（默认已填）
4. 在音色列表中选择合适的音色
5. 输入框失焦后自动保存，点击朗读按钮即可听到语音

### ⚠️ 音色选择注意事项

> ![警告](https://img.shields.io/badge/Warning-注意-orange?style=flat-square)  
> **必须根据翻译内容的语言选择对应音色，否则可能导致朗读报错或无声音！**

| 翻译语言     | 推荐音色                                                  | 说明           |
| ------------ | --------------------------------------------------------- | -------------- |
| **中文内容** | Vivi 2.0、小何 2.0、云舟 2.0 等 `zh_` 开头音色            | 支持中文合成   |
| **英文内容** | Tim、Dacey、Stokie 等 `en_` 开头音色                      | 仅支持英文合成 |
| **中英混合** | `Tina老师 2.0`（`zh_female_yingyujiaoxue_uranus_bigtts`） | 同时支持中英文 |

- `zh_` 开头音色仅支持中文，传入英文文本会报错
- `en_` 开头音色仅支持英文，传入中文文本会报错
- `saturn_` 开头音色为角色扮演 / 客服专用，支持中文

## AI 翻译配置

### 配置步骤

1. 点击翻译面板的设置按钮 ⚙️
2. 选择"AI 翻译"
3. 点击"添加配置"
4. 填写配置信息

### 配置字段说明

| 字段           | 说明                       | 示例                                         |
| -------------- | -------------------------- | -------------------------------------------- |
| **配置名称**   | 自定义名称，便于识别       | `ChatGPT 4.0`                                |
| **厂商标识**   | 服务提供商标识             | `openai`                                     |
| **Base URL**   | **完整的 API 端点地址**    | `https://api.openai.com/v1/chat/completions` |
| **API Key**    | API 访问密钥               | `sk-proj-xxxxx...`                           |
| **模型名称**   | 具体模型名称               | `gpt-4o`                                     |
| **翻译提示词** | 可选，支持 `{text}` 占位符 | 见下方推荐提示词                             |

⚠️ **重要变更**: Base URL 现在需要填写完整的 API 端点地址，系统不会自动拼接路径。

### 主流服务配置

#### DeepSeek（推荐性价比）

```
Base URL: https://api.deepseek.com/v1/chat/completions
模型: deepseek-chat / deepseek-coder
```

#### 月之暗面 Kimi

```
Base URL: https://api.moonshot.cn/v1/chat/completions
模型: moonshot-v1-8k / moonshot-v1-32k
```

#### OpenAI 系列

```
Base URL: https://api.openai.com/v1/chat/completions
模型: gpt-4o / gpt-4o-mini / gpt-4
```

#### 阿里通义千问

```
Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
模型: qwen-max / qwen-plus / qwen-turbo
```

#### Anthropic Claude

```
Base URL: https://api.anthropic.com/v1/chat/completions
模型: claude-3-5-sonnet-20241022
```

#### 智谱 ChatGLM

```
Base URL: https://open.bigmodel.cn/api/paas/v4/chat/completions
模型: glm-4 / glm-4-flash
```

#### 第三方服务

```
OpenRouter: https://openrouter.ai/api/v1/chat/completions
Groq: https://api.groq.com/openai/v1/chat/completions
本地 Ollama: http://localhost:11434/v1/chat/completions
```

### 推荐提示词

#### 通用翻译

```
你是专业的中英文翻译，请准确翻译以下内容。中文翻译为英文，英文翻译为中文，只返回翻译结果：

{text}
```

#### 技术文档

```
作为技术翻译专家，请翻译以下技术内容，保持术语准确性，代码保持原样：

{text}
```

## 常用配置模板

### 高质量翻译（推荐）

### 性价比翻译（推荐）

**DeepSeek（新用户 500 万 tokens 免费）**

```
配置名称: DeepSeek 经济翻译
厂商标识: deepseek
Base URL: https://api.deepseek.com/v1/chat/completions
模型名称: deepseek-chat
```

**ChatGPT 4.0**

```
配置名称: ChatGPT 4.0 专业翻译
厂商标识: openai
Base URL: https://api.openai.com/v1/chat/completions
模型名称: gpt-4o
```

**Claude 3.5 Sonnet**

```
配置名称: Claude 3.5 Sonnet
厂商标识: anthropic
Base URL: https://api.anthropic.com/v1/chat/completions
模型名称: claude-3-5-sonnet-20241022
```

**通义千问**

```
配置名称: 通义千问 Plus
厂商标识: alibaba
Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
模型名称: qwen-plus
```

### 技术文档翻译

**DeepSeek Coder**

```
配置名称: 代码翻译专家
厂商标识: deepseek
Base URL: https://api.deepseek.com/v1/chat/completions
模型名称: deepseek-coder
提示词: 你是专业的中英文翻译，请准确翻译以下内容。中文翻译为英文，英文翻译为中文，只返回翻译结果：{text}
```

## 安全性说明

**v1.1.2+ 安全增强**

TransGo 安全存储所有敏感信息：

- ✅ **系统级加密**: 使用操作系统的安全存储机制

  - Windows: Windows 凭据管理器
  - macOS: Keychain
  - Linux: Secret Service API (libsecret)

- ✅ **防止泄露**: 密钥不会出现在以下位置

  - settings.json 文件
  - Git 版本控制
  - VSCode 设置同步
  - 备份文件

- ✅ **自动迁移**: 从旧版本升级时自动迁移密钥到安全存储

**非敏感配置** (仍保存在 settings.json):

- 服务商 ID (appid, secretid)
- API 地址 (baseUrl)
- 模型名称等

## 常见问题

### 配置相关

**Q: 如何获取 API Key？**

A: 访问对应服务商官网注册并申请：

- OpenAI: https://platform.openai.com/api-keys
- DeepSeek: https://platform.deepseek.com/
- 通义千问: https://bailian.console.aliyun.com/

**Q: Base URL 应该怎么填写？**

A: **必须填写完整的 API 端点地址，包含路径**：

- ✅ 正确：`https://api.openai.com/v1/chat/completions`
- ❌ 错误：`https://api.openai.com`

**Q: 哪个服务最划算？**

A: 推荐顺序：

1. **DeepSeek** - 新用户 500 万 tokens 免费，极低价格
2. **通义千问** - 国产服务，价格便宜，中文理解好
3. **GPT-4o-mini** - OpenAI 轻量版，性价比高

### 使用相关

**Q: 火山语音提示"错误"或无声音怎么办？**

A: 常见原因及解决方法：

- **音色语言不匹配**：`zh_` 开头音色只能合成中文，`en_` 开头音色只能合成英文。请根据实际翻译语言切换音色，或选择 `Tina老师 2.0` 音色（支持中英双语）
- **App ID / Access Key 填写有误**：重新检查火山引擎控制台的密钥，注意区分大小写
- **服务未开通**：确认已在 [火山引擎控制台](https://console.volcengine.com/speech/service/tts) 开通语音合成服务
- **Resource ID 填写错误**：默认填 `seed-tts-2.0`，如控制台分配了其他资源 ID 请对应修改

**Q: 如何获取火山引擎 App ID 和 Access Key？**

A: 访问 [火山引擎访问密钥管理](https://console.volcengine.com/iam/keymanage/) 页面，创建密钥后即可获取 `Access Key ID`（App ID）和 `Secret Access Key`（Access Key）。

A: 常见错误解决方案：

- `401 Unauthorized` - 检查 API Key 是否正确
- `404 Not Found` - 检查 Base URL 和模型名称
- `429 Too Many Requests` - 请求过频，稍后重试

**Q: 如何保证数据安全？**

A: 建议：

- 选择信誉良好的服务商
- 敏感内容使用本地模型
- 定期更换 API Key

## 获取帮助

- **GitHub**: [https://github.com/tsinghua-lau/TransGo](https://github.com/tsinghua-lau/TransGo)
- **问题反馈**: [GitHub Issues](https://github.com/tsinghua-lau/TransGo/issues)

> 💡 如果觉得插件好用，请给个 ⭐ 支持一下！

---

_感谢使用 TransGo，让翻译更简单！_ 🚀
