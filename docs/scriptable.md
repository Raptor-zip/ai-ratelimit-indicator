# iPhoneで見る（Scriptable + Tailscale）

PC側の既存キャッシュをTailscale ServeのHTTPS経由で読み、Scriptableのホーム画面
ウィジェットに表示します。MacやApple Developer Programは不要です。

## PC側のセットアップ

GNOMEインジケーターをインストール済みで、`ai-usage.timer` が動いているPCで実行します。

```bash
./scripts/install-scriptable.sh
```

インストーラーが表示した `https://<PCのMagicDNS名>:8445/` を、Tailscale接続中の
iPhoneのSafariで開きます。

- APIは `127.0.0.1:8766` のみで待ち受け、Tailscale ServeがHTTPSを終端します。
- Serveの本人情報を確認し、このPCの所有者と同じTailscaleアカウントだけ許可します。
  他アカウントで共有された端末・タグ付き端末は対象外です。
- 使用率・リセット時刻・最終成功時刻・固定のエラー種別だけを配信します。
  認証トークン、アカウントID、認証ファイル名、自由文のエラーは配信しません。
- `ai-usage-api.service` がログイン時に起動します。既存の取得タイマーを使うため、
  ウィジェットからのアクセスで各AIのAPIを追加で呼び出すことはありません。
- 8445は専用です。既存の別サービスが使っている場合はインストールを停止します。

## iPhone側のセットアップ

1. App Storeから [Scriptable](https://scriptable.app/) をインストールします。
2. 上記のセットアップページの「スクリプトをコピー」を押します。
3. Scriptableで「＋」を押し、コピーしたコードを貼り付けます。
4. スクリプト名を `AI Usage` にして、▶で一度実行します。中サイズのプレビューが出ます。
5. ホーム画面を長押しし、Scriptableの**小サイズ（2×2）か中サイズ**ウィジェットを追加します。
6. ウィジェットを長押し →「ウィジェットを編集」→ Scriptに `AI Usage` を指定します。

コード内の接続先URLはセットアップページで自動設定されるため、書き換え不要です。
`.js` ファイルを保存して移す場合も、同じページのリンクから取得してください。
リポジトリの `scriptable/AI-Usage.js` を直接コピーする場合は、冒頭の `BASE_URL` を
自分のHTTPS URL（末尾の `/` なし）に書き換えてください。

## サイズ・表示対象

| サイズ | 表示内容 |
|---|---|
| 小（2×2） | 先頭の2件を縦に表示。通常はClaude・Codexの5時間枠・週間枠。1件指定時は拡大表示 |
| 中 | 最大4件を2列に表示 |
| 大 | 最大6件と各AIの追加スコープ（最大2件） |

ウィジェットの設定の **Parameter** で対象と順序を指定できます。

| Parameter | 動作 |
|---|---|
| 空欄 | Claude → Codex → Kimi → AGY → Kimi (2) → Kimi (3) |
| `codex` | Codexだけ |
| `codex,claude` | Codex、Claudeの順 |
| `kimi2` | Kimiの2つ目のスロット |

キャッシュのないAIや未ログインのAIは表示しません。取得できていない枠は `--%`、
リセットを過ぎた枠は `更新待ち` になります。

Kimi（追加アカウントを含む）・AGYは、取得成功から15分以内で、5時間枠か週間枠に
有効な使用率がある場合だけ表示します。両方 `--%`、取得エラー、期限を過ぎたデータだけの
場合はセルごと隠します。0%は有効なデータとして表示します。
Claude・Codexは取得エラー時も状態を表示します。

数値は**使用率**です。その横の符号付き数値はGNOME版と同じ
「使用率 − 現在の理想使用率」（パーセントポイント）です。
マイナスは余裕、プラスは理想ペースより多く使用しています。
バーの白線が理想使用率です。リセット時刻が不明ならペース差は `--` です。

## 更新・接続失敗

- PCの元データは既存タイマーで約2分ごとに取得します。
- ウィジェットは5分後以降の更新を要求しますが、実際の更新時刻はiOSが決めます。
  1〜2分単位の常時更新は保証できません。
- タップするとScriptableを開いて最新のPCキャッシュを読み、プレビューを表示します。
  Parameterの選択とウィジェットサイズも引き継ぎます。
- 通信失敗時はiPhoneに保存した前回データと `接続失敗` を表示します。
  保存データがなければ接続確認の案内を表示します。
- フッターの取得時刻は、表示対象のうち**最も古い最終成功時刻**です。
  接続確認時刻やAPIの応答時刻ではありません。
- 15分以上取得できていないAIは `古いデータ`、トークン期限切れは `要ログイン` と表示します。
  PC側で対象のAI CLIを起動してログイン状態を更新してください。
- PCの停止・スリープ中、iPhoneのTailscale切断中は最新データを取得できません。

## 状態確認・停止

```bash
systemctl --user status ai-usage-api.service ai-usage.timer
journalctl --user -u ai-usage-api.service -n 30
tailscale serve status
```

HTTPS URLの `/api/usage` をSafariで開くとJSONで接続確認できます。
ローカルの `http://127.0.0.1:8766` はTailscaleの本人情報がないため403になります。

PC側の追加機能を削除する場合:

```bash
./scripts/install-scriptable.sh uninstall
```

ウィジェットとScriptableスクリプトはiPhoneから削除してください。

参考: [Scriptableの更新仕様](https://docs.scriptable.app/listwidget/#refreshafterdate)、
[Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)。
