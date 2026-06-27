type SubtitlePosition = 'bottom' | 'top'

interface ExtensionSettings {
  enabled: boolean
  targetLanguage: string
  sourceLanguage: string
  bilingualMode: boolean
  subtitlePosition: SubtitlePosition
}

interface SubtitleAdapter {
  name: string
  matches: () => boolean
  getSubtitleText: () => string
  getPlayerElement?: () => HTMLElement | null
  nativeCaptionSelectors?: string[]
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  targetLanguage: 'id',
  sourceLanguage: 'auto',
  bilingualMode: true,
  subtitlePosition: 'bottom',
}

const OVERLAY_ID = 'yakuu-lite-subtitle-overlay'
const HIDE_STYLE_ID = 'yakuu-lite-hide-native-captions'
const DETECTION_DEBOUNCE_MS = 400
const POLL_INTERVAL_MS = 1000

const normalizeSubtitleText = (text: string): string =>
  text.replace(/\s+/g, ' ').trim()

const uniqueText = (texts: string[]): string =>
  texts
    .map(normalizeSubtitleText)
    .filter(Boolean)
    .filter((text, index, arr) => arr.indexOf(text) === index)
    .join(' ')

const readTextFromSelectors = (selectors: string[]): string => {
  const texts = selectors.flatMap((selector) => {
    try {
      return Array.from(document.querySelectorAll(selector)).map(
        (element) => element.textContent || '',
      )
    } catch (error) {
      console.warn(`Invalid subtitle selector "${selector}"`, error)
      return []
    }
  })

  return uniqueText(texts)
}

const isDisplayedElement = (element: Element): boolean => {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  )
}

const readVisibleTextFromSelectors = (selectors: string[]): string => {
  const texts = selectors.flatMap((selector) => {
    try {
      return Array.from(document.querySelectorAll(selector))
        .filter(isDisplayedElement)
        .map((element) => element.textContent || '')
    } catch (error) {
      console.warn(`Invalid subtitle selector "${selector}"`, error)
      return []
    }
  })

  return uniqueText(texts)
}

const findLargestVisibleVideo = (): HTMLVideoElement | null => {
  const videos = Array.from(document.querySelectorAll('video'))

  return videos.reduce<HTMLVideoElement | null>((largest, video) => {
    const rect = video.getBoundingClientRect()
    const area = rect.width * rect.height
    const largestArea = largest
      ? largest.getBoundingClientRect().width *
        largest.getBoundingClientRect().height
      : 0

    if (rect.width < 160 || rect.height < 90 || area <= largestArea) {
      return largest
    }

    return video
  }, null)
}

const findFirstElement = (selectors: string[]): HTMLElement | null => {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement) {
      return element
    }
  }

  return null
}

const getActiveCueText = (): string => {
  const cueTexts: string[] = []

  Array.from(document.querySelectorAll('video')).forEach((video) => {
    Array.from(video.textTracks || []).forEach((track) => {
      const isSubtitleTrack =
        track.kind === 'subtitles' || track.kind === 'captions'

      if (!isSubtitleTrack || track.mode === 'disabled') {
        return
      }

      Array.from(track.activeCues || []).forEach((cue) => {
        const textCue = cue as any
        const cueText = textCue.text || textCue.getCueAsHTML?.().textContent
        if (cueText) {
          cueTexts.push(cueText)
        }
      })
    })
  })

  return uniqueText(cueTexts)
}

// Site adapters return only the currently visible caption text.
// Add new learning/video sites here without changing translation or rendering.
const youtubeAdapter: SubtitleAdapter = {
  name: 'YouTube',
  matches: () =>
    /(^|\.)youtube\.com$/.test(window.location.hostname) ||
    /(^|\.)youtube-nocookie\.com$/.test(window.location.hostname),
  getSubtitleText: () =>
    readVisibleTextFromSelectors(['.ytp-caption-segment']) ||
    readVisibleTextFromSelectors(['.caption-window .captions-text']),
  getPlayerElement: () =>
    findFirstElement(['#movie_player', '.html5-video-player']) ||
    findLargestVisibleVideo(),
  nativeCaptionSelectors: ['.ytp-caption-window-container'],
}

const udemyAdapter: SubtitleAdapter = {
  name: 'Udemy',
  matches: () => /(^|\.)udemy\.com$/.test(window.location.hostname),
  getSubtitleText: () =>
    readTextFromSelectors([
      '[data-purpose="captions-cue-text"]',
      '[class*="captions-display--captions-cue-text"]',
      '.captions-display--captions-container--V2D7q',
    ]),
  getPlayerElement: () =>
    findFirstElement([
      '[data-purpose="video-player"]',
      '[class*="video-player--video-player"]',
      '[class*="video-player--container"]',
    ]) || findLargestVisibleVideo(),
  nativeCaptionSelectors: [
    '[data-purpose="captions-cue-text"]',
    '[class*="captions-display--captions-cue-text"]',
  ],
}

const genericHtml5Adapter: SubtitleAdapter = {
  name: 'Generic HTML5',
  matches: () => true,
  getSubtitleText: () =>
    getActiveCueText() ||
    readTextFromSelectors([
      '.vjs-text-track-display',
      '.plyr__captions',
      '.jw-text-track-display',
      '.mejs__captions-layer',
    ]),
  getPlayerElement: () => findLargestVisibleVideo(),
  nativeCaptionSelectors: [
    '.vjs-text-track-display',
    '.plyr__captions',
    '.jw-text-track-display',
    '.mejs__captions-layer',
  ],
}

const ADAPTERS = [youtubeAdapter, udemyAdapter, genericHtml5Adapter]

class SubtitleTranslationController {
  private settings: ExtensionSettings = DEFAULT_SETTINGS
  private overlay: HTMLElement | null = null
  private observer: MutationObserver | null = null
  private pollIntervalId: number | null = null
  private debounceTimerId: number | null = null
  private activeAdapter: SubtitleAdapter = genericHtml5Adapter
  private lastOriginalText = ''
  private lastRenderedOriginal = ''
  private lastRenderedTranslation = ''
  private requestCounter = 0
  private inFlightText: string | null = null

  public async start() {
    this.settings = await this.getSettings()
    this.activeAdapter =
      ADAPTERS.find((adapter) => adapter.matches()) || genericHtml5Adapter

    this.injectOverlayStyles()
    this.applyNativeCaptionVisibility()
    this.registerViewportListeners()
    this.observePage()
    this.scheduleSubtitleCheck()
  }

  private async getSettings(): Promise<ExtensionSettings> {
    return new Promise((resolve) => {
      chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
        resolve({
          ...DEFAULT_SETTINGS,
          ...(stored as ExtensionSettings),
        })
      })
    })
  }

  private observePage() {
    this.observer?.disconnect()
    this.observer = new MutationObserver(() => {
      this.scheduleSubtitleCheck()
    })

    if (document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    if (this.pollIntervalId !== null) {
      window.clearInterval(this.pollIntervalId)
    }

    this.pollIntervalId = window.setInterval(
      () => this.scheduleSubtitleCheck(),
      POLL_INTERVAL_MS,
    )
  }

  private registerViewportListeners() {
    window.addEventListener('resize', () => this.updateOverlayPlacement())
    window.addEventListener('scroll', () => this.updateOverlayPlacement(), true)
  }

  private scheduleSubtitleCheck() {
    if (this.debounceTimerId !== null) {
      window.clearTimeout(this.debounceTimerId)
    }

    this.debounceTimerId = window.setTimeout(() => {
      this.checkAndTranslateSubtitle()
    }, DETECTION_DEBOUNCE_MS)
  }

  private async checkAndTranslateSubtitle() {
    if (!this.settings.enabled) {
      this.removeOverlay()
      this.removeNativeCaptionHideStyle()
      return
    }

    const originalText = normalizeSubtitleText(
      this.activeAdapter.getSubtitleText(),
    )

    if (!originalText) {
      this.hideOverlay()
      return
    }

    if (
      originalText === this.lastOriginalText ||
      originalText === this.inFlightText
    ) {
      this.updateOverlayPlacement()
      return
    }

    this.lastOriginalText = originalText
    this.inFlightText = originalText

    const requestId = ++this.requestCounter

    try {
      const response = await this.translate(originalText)

      if (requestId !== this.requestCounter) {
        return
      }

      if (response.type === 'TRANSLATED_TEXT') {
        this.renderSubtitle(
          originalText,
          response.translatedText || originalText,
          Boolean(response.fallback),
        )
      }
    } catch (error) {
      console.warn('Subtitle translation failed:', error)
      this.renderSubtitle(originalText, originalText, true)
    } finally {
      if (this.inFlightText === originalText) {
        this.inFlightText = null
      }
    }
  }

  private translate(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'TRANSLATE_TEXT',
          text,
          targetLanguage: this.settings.targetLanguage,
          sourceLanguage: this.settings.sourceLanguage,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            return
          }

          resolve(response)
        },
      )
    })
  }

  private renderSubtitle(
    originalText: string,
    translatedText: string,
    fallback: boolean,
  ) {
    const safeTranslation = normalizeSubtitleText(translatedText)
    const shouldShowTranslation =
      !fallback && safeTranslation && safeTranslation !== originalText

    if (
      originalText === this.lastRenderedOriginal &&
      safeTranslation === this.lastRenderedTranslation
    ) {
      return
    }

    const overlay = this.getOverlay()
    overlay.className = `yakuu-lite-subtitle ${this.settings.subtitlePosition}`
    overlay.textContent = ''
    overlay.style.display = 'flex'

    if (this.settings.bilingualMode && shouldShowTranslation) {
      overlay.appendChild(this.createLine(safeTranslation, 'translation'))
      overlay.appendChild(this.createLine(originalText, 'original'))
    } else {
      overlay.appendChild(
        this.createLine(shouldShowTranslation ? safeTranslation : originalText),
      )
    }

    this.lastRenderedOriginal = originalText
    this.lastRenderedTranslation = safeTranslation
    this.updateOverlayPlacement()
  }

  private createLine(text: string, className = ''): HTMLElement {
    const line = document.createElement('div')
    line.className = className
    line.textContent = text
    return line
  }

  private getOverlay(): HTMLElement {
    if (this.overlay && document.body.contains(this.overlay)) {
      return this.overlay
    }

    this.overlay =
      document.getElementById(OVERLAY_ID) || document.createElement('div')
    this.overlay.id = OVERLAY_ID

    if (!document.body.contains(this.overlay)) {
      document.body.appendChild(this.overlay)
    }

    return this.overlay
  }

  private getPlayerRect(): DOMRect {
    const playerElement =
      this.activeAdapter.getPlayerElement?.() || findLargestVisibleVideo()
    const rect = playerElement?.getBoundingClientRect()

    if (rect && rect.width >= 160 && rect.height >= 90) {
      return rect
    }

    return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  }

  private updateOverlayPlacement() {
    if (!this.overlay || this.overlay.style.display === 'none') {
      return
    }

    const rect = this.getPlayerRect()
    const width = Math.min(rect.width * 0.72, 860)
    const centerX = rect.left + rect.width / 2
    const fontSize = Math.max(14, Math.min(22, rect.width / 62))
    const bottomGap = Math.max(48, Math.min(88, rect.height * 0.1))
    const topGap = Math.max(42, Math.min(80, rect.height * 0.1))

    this.overlay.style.left = `${centerX}px`
    this.overlay.style.width = `${width}px`
    this.overlay.style.fontSize = `${fontSize}px`
    this.overlay.style.transform = 'translateX(-50%)'
    this.overlay.style.bottom = ''
    this.overlay.style.top = ''

    if (this.settings.subtitlePosition === 'top') {
      this.overlay.style.top = `${Math.max(8, rect.top + topGap)}px`
      return
    }

    const overlayHeight = this.overlay.offsetHeight || 72
    const top = Math.max(
      rect.top + 8,
      rect.bottom - bottomGap - overlayHeight,
    )
    this.overlay.style.top = `${top}px`
  }

  private hideOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'none'
    }
  }

  private removeOverlay() {
    this.overlay?.remove()
    this.overlay = null
    this.lastRenderedOriginal = ''
    this.lastRenderedTranslation = ''
  }

  private injectOverlayStyles() {
    if (document.getElementById('yakuu-lite-subtitle-style')) {
      return
    }

    const style = document.createElement('style')
    style.id = 'yakuu-lite-subtitle-style'
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        z-index: 2147483647;
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 0 12px;
        color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 650;
        line-height: 1.28;
        text-align: center;
        text-shadow:
          0 2px 2px rgba(0, 0, 0, 0.95),
          0 0 4px rgba(0, 0, 0, 0.95),
          0 0 8px rgba(0, 0, 0, 0.88);
        pointer-events: none;
        box-sizing: border-box;
      }

      #${OVERLAY_ID} > div {
        max-width: 100%;
        padding: 0 6px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.26);
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
      }

      #${OVERLAY_ID}.bottom {
        justify-content: flex-end;
      }

      #${OVERLAY_ID}.top {
        justify-content: flex-start;
      }

      #${OVERLAY_ID} .translation {
        color: #fff176;
        -webkit-line-clamp: 2;
      }

      #${OVERLAY_ID} .original {
        color: #ffffff;
        font-size: 0.72em;
        font-weight: 600;
        opacity: 0.9;
        -webkit-line-clamp: 1;
      }

      @media (max-width: 640px) {
        #${OVERLAY_ID} {
          padding: 0 8px;
        }
      }
    `
    document.head.appendChild(style)
  }

  private applyNativeCaptionVisibility() {
    this.removeNativeCaptionHideStyle()

    if (!this.settings.enabled) {
      return
    }

    const selectors = this.activeAdapter.nativeCaptionSelectors || []
    const style = document.createElement('style')
    style.id = HIDE_STYLE_ID
    style.textContent = `
      ${selectors.join(',\n')} {
        opacity: 0 !important;
      }

      video::cue {
        color: transparent !important;
        background-color: transparent !important;
        text-shadow: none !important;
      }
    `
    document.head.appendChild(style)
  }

  private removeNativeCaptionHideStyle() {
    document.getElementById(HIDE_STYLE_ID)?.remove()
  }

  public async handleSettingsChanged(
    changes: Record<string, chrome.storage.StorageChange>,
  ) {
    const changedKeys = Object.keys(changes)
    const settingsChanged = changedKeys.some((key) =>
      [
        'enabled',
        'targetLanguage',
        'sourceLanguage',
        'bilingualMode',
        'subtitlePosition',
      ].includes(key),
    )

    if (!settingsChanged) {
      return
    }

    this.settings = await this.getSettings()
    this.applyNativeCaptionVisibility()
    this.lastOriginalText = ''
    this.lastRenderedOriginal = ''
    this.lastRenderedTranslation = ''
    this.scheduleSubtitleCheck()
  }
}

const controller = new SubtitleTranslationController()

const startWhenReady = () => {
  if (document.body) {
    controller.start()
    return
  }

  document.addEventListener('DOMContentLoaded', () => controller.start(), {
    once: true,
  })
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    controller.handleSettingsChanged(changes)
  }
})

startWhenReady()
