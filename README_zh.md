# Apri Video Translate

一个简单的 Chromium Manifest V3 字幕翻译扩展。它会检测视频页面当前显示的字幕，使用免费的非官方 Google Translate 接口翻译，并显示双语字幕浮层。

默认目标语言是印尼语 / Bahasa Indonesia (`id`)。

## 功能

- 默认将已有字幕翻译成印尼语。
- 默认双语显示：译文在上，原文在下。
- 支持 YouTube、Udemy，以及带有 HTML5 text tracks 或常见字幕容器的通用视频页面。
- 使用 `chrome.storage.local` 缓存翻译结果，缓存键包含源语言、目标语言和原始字幕文本。
- 对字幕检测加入 debounce，避免每次 DOM 变化都请求翻译。
- Popup 只保留启用开关、目标语言、双语模式、字幕位置和清空缓存。

## 重要限制

本扩展只翻译页面上已经存在的字幕/ captions。它不会从音频生成字幕，也不包含语音识别功能。

## 翻译接口

扩展使用：

```text
https://translate.googleapis.com/translate_a/single
```

不需要付费 API、API Key、账号登录或后端服务。

如果翻译请求失败或超时，扩展会回退显示原文，避免影响页面播放。

## 支持网站

- YouTube
- Udemy
- 通用 HTML5 视频页面：字幕需要通过 text tracks 或常见字幕容器暴露在页面中

`src/pages/content/index.ts` 中的 adapter 结构保持简单，后续可以继续添加 Coursera、edX、LinkedIn Learning、Vimeo 等站点。

## Popup 控件

- 启用 / 禁用扩展
- 目标语言选择
- 双语模式开关
- 字幕位置：底部 / 顶部
- 清空翻译缓存

## 开发

安装依赖：

```bash
npm install
```

启动开发构建：

```bash
npm start
```

生成生产构建：

```bash
npm run build
```

未打包扩展会生成在 `build/` 目录。

## 在 Chrome 或 Edge 中加载

1. 运行 `npm run build`。
2. 在 Chrome 打开 `chrome://extensions`，或在 Microsoft Edge 打开 `edge://extensions`。
3. 打开开发者模式。
4. 点击加载已解压的扩展。
5. 选择 `build/` 目录。
6. 打开视频页面，启用网站字幕，然后在工具栏 popup 中开启扩展。

显示示例：

```text
Hari ini kita akan membangun layanan autentikasi yang mudah dikembangkan.
What we're going to build today is a scalable authentication service.
```
