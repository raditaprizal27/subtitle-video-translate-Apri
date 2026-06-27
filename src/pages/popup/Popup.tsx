import React, { useEffect, useState } from 'react'
import Icon128 from '../../utils/images/icon-128.png'
import './index.scss'
import { Avatar, Button, Divider, Select, Switch, message } from 'antd'

type SubtitlePosition = 'bottom' | 'top'

interface PopupSettings {
  enabled: boolean
  targetLanguage: string
  bilingualMode: boolean
  subtitlePosition: SubtitlePosition
}

const DEFAULT_SETTINGS: PopupSettings = {
  enabled: true,
  targetLanguage: 'id',
  bilingualMode: true,
  subtitlePosition: 'bottom',
}

const LANGUAGE_OPTIONS = [
  { label: 'Indonesian / Bahasa Indonesia', value: 'id' },
  { label: 'English', value: 'en' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese Simplified', value: 'zh-CN' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
]

const saveSetting = (key: keyof PopupSettings, value: unknown) => {
  chrome.storage.local.set({ [key]: value })
}

const Popup = () => {
  const [settings, setSettings] = useState<PopupSettings>(DEFAULT_SETTINGS)
  const [clearingCache, setClearingCache] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(stored as PopupSettings),
      })
    })
  }, [])

  const updateSetting = <K extends keyof PopupSettings>(
    key: K,
    value: PopupSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
    saveSetting(key, value)
  }

  const clearCache = () => {
    setClearingCache(true)
    chrome.runtime.sendMessage({ type: 'CLEAR_TRANSLATION_CACHE' }, (res) => {
      setClearingCache(false)

      if (chrome.runtime.lastError || !res?.ok) {
        message.error('Could not clear translation cache')
        return
      }

      message.success('Translation cache cleared')
    })
  }

  return (
    <div className="popup">
      <div className="popupHeader">
        <Avatar src={Icon128} size={32} />
        <div>
          <div className="brand">Apri Video Translate</div>
          <div className="subtitle">Subtitle translator</div>
        </div>
      </div>

      <Divider className="divider" />

      <div className="row">
        <div>
          <div className="label">Extension</div>
          <div className="hint">Translate visible captions automatically</div>
        </div>
        <Switch
          checked={settings.enabled}
          onChange={(checked) => updateSetting('enabled', checked)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="target-language">
          Target language
        </label>
        <Select
          id="target-language"
          className="select"
          value={settings.targetLanguage}
          options={LANGUAGE_OPTIONS}
          onChange={(value) => updateSetting('targetLanguage', value)}
        />
      </div>

      <div className="row">
        <div>
          <div className="label">Bilingual mode</div>
          <div className="hint">Translation first, original second</div>
        </div>
        <Switch
          checked={settings.bilingualMode}
          onChange={(checked) => updateSetting('bilingualMode', checked)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="subtitle-position">
          Subtitle position
        </label>
        <Select
          id="subtitle-position"
          className="select"
          value={settings.subtitlePosition}
          options={[
            { label: 'Bottom', value: 'bottom' },
            { label: 'Top', value: 'top' },
          ]}
          onChange={(value) => updateSetting('subtitlePosition', value)}
        />
      </div>

      <Button
        block
        className="clearButton"
        loading={clearingCache}
        onClick={clearCache}
      >
        Clear translation cache
      </Button>
    </div>
  )
}

export default Popup
