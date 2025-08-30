# TransGo

TransGo 是一个专业的 VS Code 翻译插件，支持中英文互译、语音朗读、转驼峰命名等功能，现已全面支持主流 AI 翻译服务。

![插件演示](https://i-blog.csdnimg.cn/direct/6c65e6fbff5f434ba8e3f20b58604dbf.gif#pic_center)

## 目录

- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [OpenAI 系列](#openai系列)
- [Anthropic Claude](#anthropic-claude)
- [国产大模型](#国产大模型)
  - [DeepSeek](#deepseek)
  - [阿里通义千问](#阿里通义千问)
  - [百度文心一言](#百度文心一言)
  - [智谱 ChatGLM](#智谱chatglm)
  - [月之暗面 Kimi](#月之暗面kimi)
  - [字节豆包](#字节豆包)
  - [腾讯混元](#腾讯混元)
- [其他兼容服务](#其他兼容服务)
- [提示词优化](#提示词优化)
- [使用技巧](#使用技巧)
- [故障排除](#故障排除)
- [常见问题](#常见问题)

## 快速开始

1. **安装插件**: 在 VS Code 扩展市场搜索"TransGo"或"中英文翻译"并安装
2. **打开翻译面板**: 点击右侧活动栏的翻译图标或使用命令 `Ctrl+Shift+P` → `打开翻译`
3. **配置 AI 服务**: 点击设置按钮 ⚙️，选择"AI 翻译"并添加配置
4. **开始翻译**: 输入文本，按回车键或点击翻译按钮即可

> **提示**: 如果您不想配置 AI 服务，插件默认使用 Google 翻译（需要科学上网）

## 配置说明

选择 `百度翻译` 或 `有道翻译` 需要配置 `Key` 和 `密钥` 点击 ⚙️ 打开配置。

官网申请免费的 API Key 和密钥 完全够个人使用

- [百度翻译](https://fanyi-api.baidu.com/)
- [有道翻译](https://ai.youdao.com/)
- [腾讯翻译](https://console.cloud.tencent.com/cam/capi)

在 TransGo 中配置 AI 翻译服务非常简单，只需在翻译面板点击设置按钮 ⚙️，然后选择"AI 翻译"即可添加新配置。

### 配置字段说明

| 字段           | 说明                             | 是否必填 | 示例                                   |
| -------------- | -------------------------------- | -------- | -------------------------------------- |
| **配置名称**   | 自定义的配置名称，便于识别和管理 | ✅       | `ChatGPT 4.0`, `Claude Sonnet`         |
| **厂商标识**   | 服务提供商标识，用于内部区分     | ✅       | `openai`, `anthropic`, `deepseek`      |
| **Base URL**   | API 基础地址，不要以斜杠结尾     | ✅       | `https://api.openai.com`               |
| **API Key**    | API 访问密钥，请妥善保管         | ✅       | `sk-proj-xxxxx...`                     |
| **模型名称**   | 要使用的具体模型名称             | ✅       | `gpt-4o`, `claude-3-5-sonnet-20241022` |
| **翻译提示词** | 自定义提示词，支持`{text}`占位符 | ❌       | 见各服务的推荐提示词                   |

### 配置管理

- **多配置支持**: 可同时配置多个 AI 翻译服务，随时切换
- **配置切换**: 在翻译面板下拉菜单中选择不同的配置
- **配置编辑**: 点击配置列表中的编辑按钮修改配置
- **配置删除**: 点击删除按钮移除不需要的配置
- **自动保存**: 所有配置自动保存到 VS Code 设置中

---

## OpenAI 系列

### ChatGPT 官方

| 配置项       | 值                                                   |
| ------------ | ---------------------------------------------------- |
| **配置名称** | `ChatGPT 4.0`                                        |
| **厂商标识** | `openai`                                             |
| **Base URL** | `https://api.openai.com`                             |
| **API Key**  | `sk-proj-xxxxx...`                                   |
| **模型名称** | `gpt-4o` / `gpt-4o-mini` / `gpt-4` / `gpt-3.5-turbo` |

**获取 API Key 步骤**:

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登录或注册 OpenAI 账号
3. 点击"Create new secret key"创建新的 API 密钥
4. 复制并保存密钥（只显示一次）
5. 绑定支付方式（需要付费使用）

**模型选择建议**:

- `gpt-4o`: 最新最强模型，质量最高，价格适中
- `gpt-4o-mini`: 轻量版本，速度快，价格低廉
- `gpt-4`: 经典版本，质量稳定但价格较高
- `gpt-3.5-turbo`: 性价比版本，速度快价格低

**推荐提示词**:

```
You are a professional translator. Please translate the following text accurately while maintaining the original tone and style.

Rules:
- If the text is Chinese, translate it to English
- If the text is English, translate it to Chinese
- Only return the translated text without any explanations
- Keep the original formatting and punctuation

Text to translate: {text}
```

### Azure OpenAI

| 配置项       | 值                                       |
| ------------ | ---------------------------------------- |
| **配置名称** | `Azure GPT-4`                            |
| **厂商标识** | `azure-openai`                           |
| **Base URL** | `https://your-resource.openai.azure.com` |
| **API Key**  | Azure 订阅的 API Key                     |
| **模型名称** | 您在 Azure 中部署的模型名称              |

**配置说明**:

- Base URL 格式: `https://your-resource-name.openai.azure.com`
- 模型名称需要使用您在 Azure 中创建的部署名称，不是模型名称
- API Key 可在 Azure 门户的 OpenAI 资源中找到

### 第三方 OpenAI 兼容服务

许多第三方服务提供 OpenAI 兼容的 API 接口，配置方法类似：

| 服务商          | Base URL 示例                           | 说明               |
| --------------- | --------------------------------------- | ------------------ |
| **OpenRouter**  | `https://openrouter.ai/api/v1`          | 聚合多种模型的服务 |
| **Together AI** | `https://api.together.xyz/v1`           | 开源模型托管服务   |
| **Groq**        | `https://api.groq.com/openai/v1`        | 高速推理服务       |
| **Anyscale**    | `https://api.endpoints.anyscale.com/v1` | Ray 生态的推理服务 |

配置时请参考对应服务商的文档获取正确的 Base URL 和 API Key。

---

## Anthropic Claude

### Claude 官方

| 配置项       | 值                           |
| ------------ | ---------------------------- |
| **配置名称** | `Claude 3.5 Sonnet`          |
| **厂商标识** | `anthropic`                  |
| **Base URL** | `https://api.anthropic.com`  |
| **API Key**  | `sk-ant-xxxxx...`            |
| **模型名称** | `claude-3-5-sonnet-20241022` |

**可用模型对比**:

| 模型名称                     | 特点                   | 适用场景           | 相对成本 |
| ---------------------------- | ---------------------- | ------------------ | -------- |
| `claude-3-5-sonnet-20241022` | 最新最强，推理能力卓越 | 专业翻译、技术文档 | 中等     |
| `claude-3-5-haiku-20241022`  | 速度极快，成本最低     | 日常翻译、批量处理 | 低       |
| `claude-3-opus-20240229`     | 质量最高，最为谨慎     | 重要文档、创意内容 | 高       |

**获取 API Key 步骤**:

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 注册账号并完成邮箱验证
3. 进入 API Keys 页面
4. 点击"Create Key"创建新密钥
5. 充值账户余额（按使用量付费）

**推荐提示词**:

```
I am a professional translation assistant. Please translate the following text with high accuracy:

Translation Rules:
- Chinese text → English translation
- English text → Chinese translation
- Maintain original meaning, tone, and style
- Preserve technical terms and proper nouns
- Return only the translation result

Text: {text}
```

---

## 国产大模型

### DeepSeek

| 配置项       | 值                                 |
| ------------ | ---------------------------------- |
| **配置名称** | `DeepSeek Chat`                    |
| **厂商标识** | `deepseek`                         |
| **Base URL** | `https://api.deepseek.com`         |
| **API Key**  | `sk-xxxxx...`                      |
| **模型名称** | `deepseek-chat` / `deepseek-coder` |

**模型选择**:

- `deepseek-chat`: 通用对话模型，适合日常翻译
- `deepseek-coder`: 代码专用模型，适合技术文档和代码注释翻译

**获取 API Key 步骤**:

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 使用手机号注册并完成验证
3. 进入控制台，点击"API 密钥"
4. 创建新的 API 密钥
5. 新用户有 500 万 tokens 免费额度

**价格优势**: DeepSeek 是目前最具性价比的 AI 翻译服务之一，新用户免费额度充足

**推荐提示词**:

```
作为专业翻译助手，请准确翻译以下内容：

翻译规则：
- 中文内容翻译为英文
- 英文内容翻译为中文
- 保持原文的语义、语调和格式
- 专业术语保持准确性
- 仅返回翻译结果，无需解释

待翻译内容：{text}
```

### 阿里通义千问

| 配置项       | 值                                                  |
| ------------ | --------------------------------------------------- |
| **配置名称** | `通义千问 Max`                                      |
| **厂商标识** | `alibaba`                                           |
| **Base URL** | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| **API Key**  | `sk-xxxxx...`                                       |
| **模型名称** | `qwen-max` / `qwen-plus` / `qwen-turbo`             |

**模型对比**:

| 模型         | 特点     | 翻译质量   | 响应速度 | 成本 |
| ------------ | -------- | ---------- | -------- | ---- |
| `qwen-max`   | 能力最强 | ⭐⭐⭐⭐⭐ | 较慢     | 高   |
| `qwen-plus`  | 均衡版本 | ⭐⭐⭐⭐   | 中等     | 中   |
| `qwen-turbo` | 高速版本 | ⭐⭐⭐     | 很快     | 低   |

**获取 API Key 步骤**:

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 使用阿里云账号登录（没有则先注册）
3. 开通 DashScope 服务
4. 在 API-KEY 管理页面创建密钥
5. 新用户有一定的免费调用额度

**推荐提示词**:

```
你是一个专业的中英文翻译专家，请按照以下要求翻译文本：

要求：
1. 中文翻译为英文，英文翻译为中文
2. 翻译要准确、自然、符合目标语言习惯
3. 保持原文的语气和风格
4. 专业术语要精确翻译
5. 只输出翻译结果，不要任何解释

请翻译：{text}
```

### 百度文心一言

| 配置项       | 值                                                 |
| ------------ | -------------------------------------------------- |
| **配置名称** | `文心一言 4.0`                                     |
| **厂商标识** | `baidu`                                            |
| **Base URL** | `https://aip.baidubce.com`                         |
| **API Key**  | 您的 Access Token                                  |
| **模型名称** | `ernie-4.0-8k` / `ernie-3.5-8k` / `ernie-speed-8k` |

**⚠️ 重要提醒**: 百度文心一言的 API 格式与标准 OpenAI 格式不完全兼容，可能需要特殊适配。建议优先使用其他兼容服务。

**获取 API Key 步骤**:

1. 访问 [百度智能云控制台](https://console.bce.baidu.com/)
2. 开通文心一言服务
3. 创建应用，获得 API Key 和 Secret Key
4. 使用 API Key 和 Secret Key 生成 Access Token
5. 将 Access Token 作为 API Key 使用

**Access Token 获取方法**:

```bash
curl -i -k 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=[API_KEY]&client_secret=[SECRET_KEY]'
```

**模型特点**:

- `ernie-4.0-8k`: 最新版本，能力最强
- `ernie-3.5-8k`: 稳定版本，性价比高
- `ernie-speed-8k`: 快速版本，响应迅速

### 智谱 ChatGLM

| 配置项       | 值                                      |
| ------------ | --------------------------------------- |
| **配置名称** | `ChatGLM 4`                             |
| **厂商标识** | `zhipu`                                 |
| **Base URL** | `https://open.bigmodel.cn/api/paas/v4`  |
| **API Key**  | `xxxxx.xxxxx...` (注意格式不同)         |
| **模型名称** | `glm-4` / `glm-4-flash` / `glm-3-turbo` |

**模型推荐**:

- `glm-4`: 最新版本，推理能力强，适合复杂翻译
- `glm-4-flash`: 快速版本，响应迅速，性价比高
- `glm-3-turbo`: 经济版本，基础翻译够用

**获取 API Key 步骤**:

1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 注册账号并完成实名认证
3. 进入工作台，点击"API 管理"
4. 创建 API Key（格式类似：`xxxxx.xxxxxxx`）
5. 新用户赠送一定 tokens，用完后按量付费

**推荐提示词**:

```
你是专业的翻译助手，请按以下要求进行翻译：

1. 如果输入是中文，请翻译为英文
2. 如果输入是英文，请翻译为中文
3. 翻译要准确、流畅、符合语言习惯
4. 保持原文的语气和专业术语
5. 只返回翻译结果，不需要额外说明

需要翻译的文本：{text}
```

### 月之暗面 Kimi

| 配置项       | 值                                                        |
| ------------ | --------------------------------------------------------- |
| **配置名称** | `Kimi Chat`                                               |
| **厂商标识** | `moonshot`                                                |
| **Base URL** | `https://api.moonshot.cn`                                 |
| **API Key**  | `sk-xxxxx...`                                             |
| **模型名称** | `moonshot-v1-8k` / `moonshot-v1-32k` / `moonshot-v1-128k` |

**模型选择指南**:

- `moonshot-v1-8k`: 标准版本，适合普通翻译任务
- `moonshot-v1-32k`: 长文本版本，适合翻译长篇文档
- `moonshot-v1-128k`: 超长文本版本，适合翻译书籍章节

**获取 API Key 步骤**:

1. 访问 [月之暗面开放平台](https://platform.moonshot.cn/)
2. 注册账号并登录
3. 在 API 密钥页面创建新密钥
4. 新用户有一定的免费额度
5. 支持多种付费方式

**特色功能**: Kimi 以长文本处理见长，适合翻译长篇内容

**推荐提示词**:

```
作为专业的中英文翻译专家，请严格按照以下规则进行翻译：

翻译规则：
- 中文 → 英文：翻译为地道的英文表达
- 英文 → 中文：翻译为自然流畅的中文
- 保持原文的语气、风格和格式
- 技术术语要准确无误
- 仅输出翻译结果

原文：{text}
```

### 字节豆包

| 配置项       | 值                                         |
| ------------ | ------------------------------------------ |
| **配置名称** | `豆包大模型`                               |
| **厂商标识** | `bytedance`                                |
| **Base URL** | `https://ark.cn-beijing.volces.com/api/v3` |
| **API Key**  | 您的 API Key                               |
| **模型名称** | 根据接入点确定（如：`ep-xxxxxxxxx`）       |

**获取方式**:

1. 访问 [火山方舟](https://console.volcengine.com/ark/)
2. 注册并完成企业认证
3. 申请豆包大模型使用权限
4. 创建推理接入点，获取模型 endpoint
5. 在 API 密钥管理中创建密钥

**注意事项**:

- 豆包模型需要企业认证才能使用
- 模型名称是推理接入点的 endpoint ID
- 价格相对较低，适合批量翻译

### 腾讯混元

| 配置项       | 值                                                  |
| ------------ | --------------------------------------------------- |
| **配置名称** | `腾讯混元`                                          |
| **厂商标识** | `tencent`                                           |
| **Base URL** | `https://hunyuan.tencentcloudapi.com`               |
| **API Key**  | 腾讯云 API 密钥                                     |
| **模型名称** | `hunyuan-lite` / `hunyuan-standard` / `hunyuan-pro` |

**获取方式**:

1. 访问 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 开通混元大模型服务
3. 在访问管理中创建 API 密钥
4. 获取 SecretId 和 SecretKey

**模型选择**:

- `hunyuan-lite`: 轻量版，速度快成本低
- `hunyuan-standard`: 标准版，平衡性能和成本
- `hunyuan-pro`: 专业版，能力最强

**⚠️ API 兼容性**: 腾讯混元的 API 格式可能与标准 OpenAI 格式有差异，建议测试后使用。

---

## 其他兼容服务

### OpenRouter（推荐）

OpenRouter 是一个优秀的 AI 模型聚合服务，提供多种模型的统一访问接口：

| 配置项       | 值                                                                            |
| ------------ | ----------------------------------------------------------------------------- |
| **配置名称** | `OpenRouter GPT-4o`                                                           |
| **厂商标识** | `openrouter`                                                                  |
| **Base URL** | `https://openrouter.ai/api/v1`                                                |
| **API Key**  | `sk-or-xxxxx...`                                                              |
| **模型名称** | `openai/gpt-4o` / `anthropic/claude-3.5-sonnet` / `meta-llama/llama-3.1-405b` |

**可用模型示例**:

- `openai/gpt-4o`: OpenAI GPT-4o
- `anthropic/claude-3.5-sonnet`: Anthropic Claude 3.5 Sonnet
- `google/gemini-pro-1.5`: Google Gemini Pro
- `meta-llama/llama-3.1-405b`: Meta Llama 3.1 405B
- `mistralai/mistral-large`: Mistral Large

**优势**:

- 一个 API Key 访问多种模型
- 价格透明，通常比官方便宜
- 支持多种开源和闭源模型
- 无需多个账号管理

### 本地部署模型

如果您有本地 GPU 资源，可以使用 Ollama、LM Studio 等工具部署本地模型：

#### Ollama 配置示例

| 配置项       | 值                                           |
| ------------ | -------------------------------------------- |
| **配置名称** | `本地Llama3.1`                               |
| **厂商标识** | `local`                                      |
| **Base URL** | `http://localhost:11434`                     |
| **API Key**  | `not-required`（可留空）                     |
| **模型名称** | `llama3.1:8b` / `qwen2:7b` / `codellama:13b` |

**Ollama 安装和使用**:

```bash
# 安装Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 启动API服务器
ollama serve

# 拉取模型
ollama pull llama3.1:8b
ollama pull qwen2:7b
```

#### LM Studio 配置示例

| 配置项       | 值                      |
| ------------ | ----------------------- |
| **配置名称** | `LM Studio本地`         |
| **厂商标识** | `local`                 |
| **Base URL** | `http://localhost:1234` |
| **API Key**  | `not-required`          |
| **模型名称** | 下载的模型名称          |

**本地部署优势**:

- 数据完全本地化，隐私安全
- 无使用次数和费用限制
- 可离线使用
- 可定制化程度高

### 其他第三方服务

| 服务名称        | Base URL                                | 特点                   |
| --------------- | --------------------------------------- | ---------------------- |
| **Together AI** | `https://api.together.xyz/v1`           | 专注开源模型托管       |
| **Groq**        | `https://api.groq.com/openai/v1`        | 超高速推理，免费额度大 |
| **Anyscale**    | `https://api.endpoints.anyscale.com/v1` | Ray 生态推理服务       |
| **Perplexity**  | `https://api.perplexity.ai`             | 集成搜索的 AI 服务     |
| **Cohere**      | `https://api.cohere.ai/v1`              | 企业级 AI 服务         |

**配置说明**: 以上服务均兼容 OpenAI API 格式，配置方法相同，只需修改 Base URL 和 API Key。

---

## 使用技巧

### 选择翻译服务的建议

**按使用场景选择**:

- 🏢 **商务文档**: OpenAI GPT-4o、Claude 3.5 Sonnet
- 💻 **技术文档**: DeepSeek Coder、CodeLlama
- 📚 **日常学习**: DeepSeek Chat、Qwen Turbo
- 🚀 **批量翻译**: Groq (速度快)、本地模型 (无限制)
- 🔒 **隐私要求**: 本地部署模型 (Ollama、LM Studio)

**按预算选择**:

- 💰 **免费/低成本**: DeepSeek、Groq、本地模型
- 💵 **中等成本**: 通义千问、Kimi、GPT-4o-mini
- 💸 **高质量不计成本**: GPT-4、Claude 3.5 Sonnet

### 提升翻译质量的技巧

1. **文本预处理**:

   - 清理多余的空格和换行
   - 修正明显的拼写错误
   - 分段翻译长文本

2. **上下文补充**:

   - 在提示词中说明文本类型（技术文档、营销文案等）
   - 提供专业术语的背景信息

3. **结果验证**:
   - 对重要内容进行人工校对
   - 使用不同服务交叉验证
   - 注意专业术语的一致性

### 快捷操作

- **编辑器右键翻译**: 选中文本后右键选择"翻译选中文本"
- **编辑器顶部按钮**: 点击编辑器标题栏的翻译图标
- **命令面板**: `Ctrl+Shift+P` 搜索"翻译"相关命令
- **快速切换服务**: 在翻译面板的下拉菜单中切换不同配置

## 故障排除

### 常见错误及解决方案

#### 🔑 API Key 相关错误

**错误信息**: `API认证失败` / `401 Unauthorized`
**解决方案**:

1. 检查 API Key 是否正确复制（注意首尾空格）
2. 确认 API Key 是否过期或被撤销
3. 验证账户是否有足够余额
4. 检查 API Key 权限设置

#### 🌐 网络连接错误

**错误信息**: `网络请求失败` / `timeout`
**解决方案**:

1. 检查网络连接是否正常
2. 确认 Base URL 是否正确（不要以斜杠结尾）
3. 尝试切换网络或使用代理
4. 检查防火墙设置

#### 📊 配额限制错误

**错误信息**: `请求过于频繁` / `429 Too Many Requests`
**解决方案**:

1. 降低翻译频率，适当延迟
2. 检查账户的调用配额
3. 考虑升级付费计划
4. 切换到其他服务提供商

#### 🤖 模型名称错误

**错误信息**: `模型不存在` / `404 Not Found`
**解决方案**:

1. 确认模型名称拼写正确
2. 查看服务商文档获取最新模型列表
3. 检查模型是否已下线或更名
4. 尝试使用默认推荐模型

### 调试技巧

1. **查看 VS Code 控制台**:

   - 按 `F12` 打开开发者工具
   - 查看 Console 标签的错误信息

2. **检查网络请求**:

   - 在控制台查看详细的 API 调用日志
   - 确认请求参数是否正确

3. **测试 API 连通性**:
   - 使用 curl 命令测试 API 是否可访问
   - 验证 API Key 的有效性

### 性能优化

1. **减少延迟**:

   - 选择地理位置较近的服务
   - 使用 CDN 加速的 API 服务

2. **提升质量**:
   - 优化提示词设置
   - 选择更强大的模型
   - 适当增加温度参数

---

## 提示词优化

提示词是影响翻译质量的关键因素。TransGo 支持在配置中自定义提示词，使用`{text}`作为占位符。

### 通用翻译提示词

#### 基础版本

```
请将以下文本准确翻译，保持原意和语调。中文翻译为英文，英文翻译为中文。只返回翻译结果：

{text}
```

#### 增强版本

```
你是一位经验丰富的专业翻译，请按照以下要求进行翻译：

要求：
- 中文→英文，英文→中文
- 保持原文的语义、语调和风格
- 确保翻译自然流畅，符合目标语言习惯
- 仅返回翻译结果，无需解释

原文：{text}
```

### 专业场景提示词

#### 技术文档翻译

```
作为专业的技术文档翻译专家，请翻译以下内容：

翻译规则：
- 保持技术术语的准确性和一致性
- 代码片段保持原样
- 注释和说明文字进行翻译
- API名称和参数名保持英文
- 中文→英文，英文→中文

需要翻译的内容：{text}
```

#### 商务文档翻译

```
请以商务翻译的标准翻译以下内容：

要求：
- 使用正式和专业的语调
- 保持商务术语的准确性
- 符合商务沟通的表达习惯
- 中文译英文，英文译中文

内容：{text}
```

#### 学术论文翻译

```
作为学术翻译专家，请翻译以下学术内容：

规范：
- 保持学术写作的严谨性
- 专业术语翻译准确
- 保持逻辑结构清晰
- 符合学术表达规范
- 中英互译

文本：{text}
```

#### 创意内容翻译

```
请翻译以下创意内容，注重表达的生动性：

要求：
- 保持原文的创意性和表达风格
- 注意语言的生动性和感染力
- 保持修辞手法的效果
- 适当本土化表达
- 中文↔英文互译

原文：{text}
```

#### 代码注释翻译

```
请翻译以下代码注释，保持技术准确性：

规则：
- 保持技术术语准确
- 代码逻辑说明要清晰
- 变量名、函数名保持英文
- 注释风格保持一致
- 中英互译

注释内容：{text}
```

### 提示词优化技巧

1. **明确翻译方向**: 虽然插件会自动识别语言，但在提示词中明确说明更保险
2. **设定翻译标准**: 指定正式/非正式、技术/通用等风格要求
3. **保持术语一致**: 对专业词汇提供翻译要求
4. **格式保持**: 说明是否需要保持原文格式、标点等
5. **避免过长**: 提示词过长可能影响效果，保持简洁明确

## 常见问题

### 服务选择相关

**Q: 如何选择合适的 AI 翻译服务？**

A: 建议根据以下维度选择：

| 维度         | 推荐服务                  | 说明                     |
| ------------ | ------------------------- | ------------------------ |
| **翻译质量** | GPT-4o、Claude 3.5 Sonnet | 准确性和流畅度最高       |
| **性价比**   | DeepSeek、通义千问 Turbo  | 质量好且价格低廉         |
| **响应速度** | Groq、GPT-4o-mini         | 推理速度快，适合实时翻译 |
| **隐私安全** | 本地模型                  | 数据不出本地，最安全     |
| **免费额度** | DeepSeek、智谱 GLM        | 新用户免费额度较多       |

**Q: 国产 AI 与国外 AI 有什么区别？**

A: 主要区别：

- **中文理解**: 国产 AI 对中文语境理解更深入
- **价格**: 国产 AI 通常更便宜，免费额度更多
- **访问性**: 国产 AI 无需翻墙，访问更稳定
- **模型能力**: 顶级国外模型（GPT-4、Claude）能力仍然领先

### 配置相关

**Q: 提示词中的{text}是什么？**

A: `{text}`是待翻译文本的占位符：

- 如果提示词包含`{text}`，插件会将其替换为实际文本
- 如果不包含`{text}`，文本会自动附加到提示词末尾
- 建议在提示词中明确使用`{text}`以获得更好的控制

**Q: 为什么有些服务配置后无法使用？**

A: 可能的原因：

1. **API 格式不兼容**: 有些服务（如百度文心一言）API 格式特殊
2. **认证方式不同**: 某些服务需要特殊的认证流程
3. **地区限制**: 部分服务对特定地区有访问限制
4. **版本问题**: 某些新模型可能需要 API 版本升级

**Q: 可以同时配置多个服务吗？**

A: 当然可以！建议配置策略：

- **主力服务**: 高质量模型用于重要翻译
- **备用服务**: 性价比高的模型用于日常翻译
- **专用服务**: 针对特定场景（如技术文档）的专用模型
- **本地服务**: 处理敏感内容时使用

### 使用相关

**Q: 如何提高翻译质量？**

A: 优化建议：

1. **选择合适模型**: 重要内容使用顶级模型
2. **优化提示词**: 针对具体场景定制提示词
3. **文本预处理**: 清理格式，修正明显错误
4. **分段翻译**: 长文本分段处理，保持上下文
5. **人工校对**: 重要内容建议人工检查

**Q: 翻译速度慢怎么办？**

A: 解决方案：

- 选择响应更快的模型（如 GPT-4o-mini、Groq）
- 检查网络连接，考虑使用代理
- 避免在网络高峰期使用
- 分段翻译长文本

**Q: 如何确保翻译数据安全？**

A: 安全措施：

1. **选择可信服务商**: 使用知名厂商的服务
2. **本地部署**: 敏感内容使用本地模型
3. **数据脱敏**: 翻译前移除敏感信息
4. **定期轮换**: 定期更换 API Key
5. **访问控制**: 合理设置 API Key 权限

### 故障排除

**Q: 出现"API 认证失败"错误？**

A: 检查步骤：

1. API Key 是否正确复制（注意空格）
2. API Key 是否过期或被撤销
3. 账户余额是否充足
4. API Key 权限是否正确设置

**Q: 翻译请求总是超时？**

A: 解决方法：

1. 检查网络连接稳定性
2. 确认 Base URL 拼写正确
3. 尝试缩短翻译文本长度
4. 切换到响应更快的服务

**Q: 模型返回空结果或格式错误？**

A: 排查思路：

1. 检查模型名称是否正确
2. 确认提示词格式是否合理
3. 查看控制台错误信息
4. 尝试简化提示词测试

### 成本优化

**Q: 如何控制 AI 翻译成本？**

A: 省钱技巧：

1. **免费服务优先**: 充分利用各服务的免费额度
2. **模型降级**: 日常翻译使用较小模型
3. **批量处理**: 合并短文本一次翻译
4. **混合策略**: 重要内容高质量模型，其他用经济模型
5. **本地部署**: 大量翻译需求可考虑自建服务

**Q: 各服务的大概费用如何？**

A: 成本参考（仅供参考，以官方为准）：

- **OpenAI**: $0.01-0.06/1K tokens
- **Claude**: $0.003-0.015/1K tokens
- **DeepSeek**: ¥0.001/1K tokens（极低）
- **通义千问**: ¥0.008-0.12/1K tokens
- **智谱 GLM**: ¥0.005-0.1/1K tokens

---

## 配置模板

为方便用户快速上手，以下提供了一些经过优化的配置模板，可直接使用或作为参考进行定制。

### 🏆 高质量翻译配置

**OpenAI GPT-4o（推荐）**

```
配置名称: ChatGPT 4o 专业翻译
厂商标识: openai
Base URL: https://api.openai.com
模型名称: gpt-4o
提示词: You are a professional translator with expertise in both Chinese and English. Please translate the following text with high accuracy while maintaining the original tone, style, and formatting.

Rules:
- Chinese text → English translation
- English text → Chinese translation
- Preserve technical terms and proper nouns
- Maintain original formatting and structure
- Only return the translated text

Text: {text}
```

**Anthropic Claude（备选）**

```
配置名称: Claude 3.5 Sonnet 翻译
厂商标识: anthropic
Base URL: https://api.anthropic.com
模型名称: claude-3-5-sonnet-20241022
提示词: I am a professional translation assistant. Please translate the following text accurately:

Translation Rules:
- Chinese → English, English → Chinese
- Maintain original meaning, tone, and style
- Preserve technical terms and formatting
- Return only the translation result

Text: {text}
```

### 💰 经济实用配置

**DeepSeek（超高性价比）**

```
配置名称: DeepSeek 经济翻译
厂商标识: deepseek
Base URL: https://api.deepseek.com
模型名称: deepseek-chat
提示词: 作为专业翻译助手，请准确翻译以下内容：

翻译要求：
- 中文→英文，英文→中文
- 保持原文的含义和语调
- 确保翻译自然流畅
- 仅返回翻译结果

原文：{text}
```

**通义千问（国产优选）**

```
配置名称: 通义千问 Turbo
厂商标识: alibaba
Base URL: https://dashscope.aliyuncs.com/compatible-mode
模型名称: qwen-turbo
提示词: 你是专业的中英文翻译专家，请按要求翻译：

要求：
1. 中文译英文，英文译中文
2. 保持原文语义和风格
3. 翻译要地道自然
4. 只返回翻译结果

待翻译文本：{text}
```

### 🛠️ 技术文档专用配置

**技术翻译（代码友好）**

```
配置名称: 技术文档翻译专家
厂商标识: deepseek
Base URL: https://api.deepseek.com
模型名称: deepseek-coder
提示词: 作为技术文档翻译专家，请翻译以下技术内容：

翻译规则：
- 保持技术术语的准确性和一致性
- API名称、函数名、变量名保持英文
- 代码片段保持原样不翻译
- 注释和说明文字进行翻译
- 中英文互译，保持技术准确性

技术内容：{text}
```

### ⚡ 高速翻译配置

**Groq（超快速度）**

```
配置名称: Groq 闪电翻译
厂商标识: groq
Base URL: https://api.groq.com/openai/v1
模型名称: llama-3.1-70b-versatile
提示词: Translate quickly and accurately. Chinese to English, English to Chinese. Return only translation:

{text}
```

### 🔒 隐私安全配置（未测试）

**本地 Ollama**

```
配置名称: 本地隐私翻译
厂商标识: local
Base URL: http://localhost:11434
模型名称: qwen2:7b
提示词: 请翻译以下文本，中英互译，只返回翻译结果：

{text}
```

---

## 版本更新记录

### v1.0.4

- ✅ 新增 AI 大模型翻译

### v1.0.3

- ✅ 新增腾讯翻译

### v1.0.2

- ✅ 对上次翻译结果进行缓存，下次打开自动加载
- ✅ 优化交互界面，由左侧侧边栏改为右侧活动栏，减少对主工作区的干扰

### v1.0.1

- ✅ 修复密钥配置缓存

### v1.0.0

- ✅ 发布初始版本

---

## 获取帮助

### 🔗 相关链接

- **GitHub 仓库**: [https://github.com/tsinghua-lau/TransGo](https://github.com/tsinghua-lau/TransGo)
- **VS Code 扩展市场**: 搜索"TransGo"或"中英文翻译"
- **问题反馈**: [GitHub Issues](https://github.com/tsinghua-lau/TransGo/issues)

### 📚 学习资源

- **VS Code 开发文档**: [https://code.visualstudio.com/api](https://code.visualstudio.com/api)
- **各 AI 服务官方文档**: 请参考本文档中提供的官方链接
- **翻译技巧**: 建议学习基础的翻译理论，提升翻译质量

---

## 许可证

本项目基于 MIT 许可证开源，允许自由使用、修改和分发，请标注来源。

---

> 💡 **提示**: 本文档会持续更新，建议收藏 GitHub 链接以获取最新信息。如果您觉得 TransGo 好用，请在 GitHub 给个 ⭐ 支持一下！

---

_感谢使用 TransGo，让翻译更简单！_ 🚀
