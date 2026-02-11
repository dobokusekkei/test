import React from 'react'
import ReactDOM from 'react-dom/client'
// ↓ ファイル名が app.jsx (小文字) なら ./app.jsx、App.jsx (大文字) なら ./App.jsx にする
import App from './app.jsx' 
import './index.css' // もしCSSファイルを作っていたらimport。なければこの行は削除。

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
