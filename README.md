# TransGo

TransGo 是一个免费专业的翻译插件，支持对话翻译、悬浮翻译、语音朗读、转驼峰命名等功能，现已全面支持主流 AI 翻译服务。

> ![提示](https://img.shields.io/badge/Tip-提示-blue?style=flat-square)  
> 如果升级后无法使用，卸载重新安装即可。
> 悬浮翻译功能需要在设置中开启。

![GitHub 演示](https://github.com/tsinghua-lau/TransGo/blob/master/preview.gif?raw=true)

默认使用 `Google翻译` 无需配置即可翻译（需要科学上网）

## 功能特点

- VSCode 右侧边栏交互不影响主工作区交互

- 自动识别中英文并进行相互翻译
- 悬浮翻译（鼠标悬停显示翻译结果）
- 翻译语音朗读
- 翻译结果大小驼峰转换
- 支持多种翻译服务：Google、百度、有道、腾讯、AI 大模型
- 自定义配置 AI 大模型翻译提示词，多样化翻译
- 简洁美观的界面设计

## 目录

- [安装使用](#安装使用)
- [传统翻译配置](#传统翻译服务)
- [AI 翻译配置](#ai-翻译配置)
- [常用配置模板](#常用配置模板)
- [常见问题](#常见问题)
- [版本更新](#版本更新)

## 安装使用

- 点击右侧边栏的翻译图标
- 在侧边栏中输入要翻译的文本
- 点击"翻译"按钮或使用快捷键 `Enter`

### 快捷操作

- **编辑器右键**: 选中文本后右键选择"翻译选中文本"
- **编辑器顶部**: 点击编辑器标题栏的翻译图标
- **命令面板**: `Ctrl+Shift+P` → `打开翻译`

## 传统翻译服务

> ![提示](https://img.shields.io/badge/Tip-提示-blue?style=flat-square)  
> 正常使用情况下提供的免费翻译额度完全够日常使用。

选择翻译服务打开官网获取 API Key：

- [百度翻译](https://fanyi-api.baidu.com/) - 需要配置 APPID 和密钥
- [有道翻译](https://ai.youdao.com/) - 需要配置 AppKey 和 AppSecret
- [腾讯翻译](https://console.cloud.tencent.com/cam/capi) - 需要配置 SecretId 和 SecretKey

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

#### OpenAI 系列

```
Base URL: https://api.openai.com/v1/chat/completions
模型: gpt-4o / gpt-4o-mini / gpt-4
```

#### DeepSeek（推荐性价比）

```
Base URL: https://api.deepseek.com/v1/chat/completions
模型: deepseek-chat / deepseek-coder
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

#### 月之暗面 Kimi

```
Base URL: https://api.moonshot.cn/v1/chat/completions
模型: moonshot-v1-8k / moonshot-v1-32k
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

### 性价比翻译（推荐）

**DeepSeek（新用户 500 万 tokens 免费）**

```
配置名称: DeepSeek 经济翻译
厂商标识: deepseek
Base URL: https://api.deepseek.com/v1/chat/completions
模型名称: deepseek-chat
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
提示词: 作为技术翻译专家，请翻译技术内容，保持术语准确，代码保持原样：{text}
```

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

**Q: 翻译质量不好怎么办？**

A: 优化建议：

- 使用更强的模型（如 GPT-4o、Claude）
- 自定义提示词
- 分段翻译长文本

**Q: 出现错误怎么解决？**

A: 常见错误解决方案：

- `401 Unauthorized` - 检查 API Key 是否正确
- `404 Not Found` - 检查 Base URL 和模型名称
- `429 Too Many Requests` - 请求过频，稍后重试

**Q: 如何保证数据安全？**

A: 建议：

- 选择信誉良好的服务商
- 敏感内容使用本地模型
- 定期更换 API Key

## 版本更新

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

## 获取帮助

- **GitHub**: [https://github.com/tsinghua-lau/TransGo](https://github.com/tsinghua-lau/TransGo)
- **问题反馈**: [GitHub Issues](https://github.com/tsinghua-lau/TransGo/issues)

> 💡 如果觉得插件好用，请给个 ⭐ 支持一下！

---

_感谢使用 TransGo，让翻译更简单！_ 🚀
