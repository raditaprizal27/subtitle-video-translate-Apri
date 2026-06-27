import React from 'react'
import './index.scss'
import { Card } from 'antd'

const Options: React.FC = () => {
  return (
    <div className="OptionsContainer">
      <Card className="Card" title="Apri Video Translate" bordered={false}>
        <p>
          This extension translates existing captions on video pages and shows a
          bilingual overlay. Settings live in the toolbar popup.
        </p>
        <p>
          Default target language is Indonesian. No API key, account, backend
          server, or paid translation API is required.
        </p>
      </Card>

      <Card className="Card" title="Supported Caption Sources" bordered={false}>
        <p>YouTube captions, Udemy captions, and common HTML5 video text tracks.</p>
        <p>
          The extension only translates subtitles that already exist on the page.
          It does not generate subtitles from audio.
        </p>
      </Card>
    </div>
  )
}

export default Options
