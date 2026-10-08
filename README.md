# 日々是衒学 — 毎日の広報投稿

公開GitHubリポジトリ＋GitHub Actions（標準Ubuntuランナー）＋Buffer Freeで実行する構成。
毎日のコラムを日本時間で撮影し、「きょうの衒学　見出し」を画像付きで予約する。
構文チェックと設定ファイルの検査済み。この作業環境ではブラウザのダウンロードに失敗し、実画像の撮影は未検証。
現在は設定前。Buffer/Xの実投稿は未検証。初期状態では画像確認のみで、投稿しない。

## 初回設定
1. 広報用Xアカウントを作り、Buffer Freeにそのアカウントを接続する。
2. このフォルダの内容を専用の**公開**GitHubリポジトリに入れる。
   `.github/workflows/daily.yml` も必ず入れる。サイト本体のソースは不要。
3. BufferのAPI設定から個人APIキーを作る。キーはチャットに貼らない。
4. GitHubの Settings → Secrets and variables → Actions → Secrets に
   `BUFFER_API_KEY` を登録する。
5. 手元で `npm ci` 後、環境変数 BUFFER_API_KEY を設定して `npm run channels` を実行する。
   表示されたXチャンネルの id を、GitHub Actionsの Variables に
   `BUFFER_CHANNEL_ID` として登録する。複数のXがあれば広報用を選ぶ。
6. GitHub Actions → Daily column → Run workflow を、publishをオフにして実行する。
   column-previewをダウンロードし、画像とpost.jsonを確認する。
7. publishをオンにして1回実行する。約5分後に投稿予定がBufferに作成される。
   **Bufferで予定の作成とXで実際の公開を両方確認する。**
8. 確認できたら、GitHub ActionsのVariablesに `AUTO_POST=true` を登録する。
   翌日から日次運用。失敗通知はGitHubの通知設定でActionsのメール通知を有効にする。

## 時刻と運用
- 起動予定は毎日07:50 JST。実行から5分後にBufferで公開予約する。
- Actionsの時刻には遅延があり、定刻保証はない。
- 画像・投稿記録は公開リポジトリのposts/YYYY-MM-DD/に保存する。
- APIキーはSecretsのみに保管する。リポジトリには書かない。
- `AUTO_POST=false` で毎日の投稿を停止できる。
- 外部サービスの無料枠・仕様が変われば調整が必要。
- 日本語フォントを待ってから撮影する。外部フォント取得が失敗すると代替フォントになる。

## 二重投稿と失敗
投稿要求の前にstate.jsonを保存してpushする。同じ日付のstate.jsonがあれば再投稿しない。
APIの応答が不明な場合も自動再送しない。Bufferのキュー／送信済みを確認し、
その日の投稿が存在しないと確定した場合だけ、state.jsonを削除して再実行する。
Bufferの予約成功はXへの送信成功とは別。連携切れなどの送信失敗はBufferで確認する。
初版は投稿要求の自動再試行／送信後の継続監視は実装していない。
GitHub Actionsの失敗通知とBuffer通知を利用する。

## 手元で画像を試す
Node.js 24以上で `npm ci` → `npx playwright install --with-deps chromium` → `npm run preview`。
preview/に画像と投稿文が生成される。手元のプレビューではXに投稿されない。

## 公式資料
- https://buffer.com/pricing
- https://developers.buffer.com/guides/posts-and-scheduling
- https://developers.buffer.com/examples/create-image-post
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
