放課後CAMERA PWA

同梱物
- index.html
- styles.css
- app.js
- manifest.webmanifest
- sw.js
- icons/

使い方
1. ZIPを展開
2. フォルダごと静的ホスティングへ配置
   - Cloudflare Pages
   - GitHub Pages
   - Netlify
   など
3. HTTPSで開く
4. 必要ならブラウザの「インストール」でPWA化

注意
- カメラ機能は secure context が必要です。HTTPS / localhost / file:// の安全な文脈で動作します。HTTP配信では getUserMedia が使えません。
- Web Share API によるファイル共有はブラウザ差があり、一部環境では使えません。
- この試作は「このアプリで開く用」のデータを JSON ベースの .revecam として保存します。アプリ名は放課後CAMERAです。

主な機能
- カメラ撮影 / 画像読み込み
- パステル文字
- スタンプ
- フィルター
- 完成画像のPNG保存
- アプリ専用データ(.revecam)の保存
- .revecam を開いてスクラッチ表示


v8:
- 外カメラ / 内カメラ切替を追加
- スマホ向けに下固定ショートカットを追加
