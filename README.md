# 壬生の隊務札

新選組ファン向けの隊務パズルゲームです。ビルド不要の静的PWAなので、GitHub Pagesのリポジトリ直下公開でそのまま動きます。

## 遊び方

`index.html` をブラウザで開くか、ローカルサーバーでこのフォルダを配信してください。

開始画面の「始める」からプレイします。

隊士札と隊務札を1枚ずつ選び、信用が尽きる前に高い評定を狙います。士気で隊士を鍛錬し、名声で道具を使えます。隊務札を放置すると信用が下がり、信用が0になると終了します。

GitHub Pagesでは、リポジトリの Settings > Pages から `main` ブランチの root を公開元にします。

## Firebaseランキング

トップ画面でFirebase Firestoreの上位ランキングを確認でき、結果画面からスコアを投稿できます。結果画面では全体リストではなく、投稿前に「投稿した場合の順位」、投稿後に自分の今回の順位だけを表示します。ランキングは舞台と難易度ごとに分かれます。

結果画面の `Xでポスト` から、今回の点数・順位・舞台・難易度・三項目の得点を、遊んでみたくなる招待文として共有できます。スマホではOSの共有シートを優先して開くため、Xアプリが入っていればアプリ側で投稿できます。共有シートが使えない環境ではXの投稿画面を開きます。

この作業環境では `firebase-config.js` を Firebase プロジェクト `shinsengumi-game` に接続済みです。別プロジェクトへ差し替える場合は、`firebase-config.example.js` を参考に `firebase-config.js` の値を置き換えてください。ランキングを一時的に止めたい場合は `enabled` を `false` にします。

Firestoreには `leaderboard_scores` コレクションを使います。公開前に `firestore.rules` の内容をFirebaseコンソールまたはFirebase CLIで適用してください。ランキング取得用に、`recordKey` 昇順、`total` 降順、`createdAt` 昇順の複合インデックスが必要です。

公開クライアントからの投稿なので、初版のランキングは娯楽用です。厳密な不正対策が必要な場合は、App CheckやCloud Functionsでサーバー側採点を追加してください。

## ファイル

- `index.html`: 画面構成
- `styles.css`: レスポンシブ表示
- `game.js`: ゲーム処理
- `share-native.js`: スマホ共有シート優先のXポスト補助
- `firebase-config.js`: Firebase接続設定
- `firebase-leaderboard.js`: Firestoreランキング処理
- `firestore.rules`: ランキング用Firestoreルール
- `manifest.webmanifest`: PWA設定
- `sw.js`: オフライン用キャッシュ
- `assets/`: アイコン、カード画像、ショップバナー
