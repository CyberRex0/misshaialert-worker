# ミス廃アラート works with Cloudflare Workers

## 設定方法
### 1. リポジトリをクローン
[CyberRex0/misshaialert-worker](https://github.com/CyberRex0/misshaialert-worker) をクローンします。

### 2. 依存パッケージをインストール
`pnpm i` で依存パッケージを入れます。

### 3. KVを作成
[Cloudflare Dashboard](https://dash.cloudflare.com/)に行き、デプロイしたいアカウントを選択し、Workers & Pages→KVを選択します。

Create a namespaceをクリックして、好きな名前を入力し、Addをクリックして作成します。

作成後NamespaceのリストにIDが表示されますので、これを使用します。

### 4. wrangler.tomlを編集
wrangler.tomlを開き、`kv_namespaces` のコメントアウトを解除します。

`id` に先ほど作成したKVのIDを貼り付けます。

```toml
# binding = "KV" は変更しないこと
kv_namespaces = [
    { binding = "KV", id = "作成したKVのID" }
]
```

さらに、下の行にMisskeyの設定があります。

```toml
[vars]
MISSKEY_HOST = "投稿先サーバーのドメイン"
MISSKEY_TOKEN = "設定で作成したトークン"
POST_VISIBILITY = "home" # public (パブリック), home (ホーム), followers (フォロワーのみ), specified (DM)
POST_TAGS = ["misshaialert"] # 投稿時に使用するタグ。複数指定可。#は書かない。misshaialertはミュート使用者のために推奨
```

投稿する時間も変更することができます。初期状態は 0:10 JST (15:00 UTC)です。<br>
書式はLinuxのcronと同じです。また、時間はUTCとして解釈されるため、日本で使用する場合は投稿したい時間から 9時間 引いたものを入力してください。 

```toml
# 日本時間 0:00 (15:00 UTC)に実行
crons = [ "0 15 * * *" ]
```

### 5. Cloudflareにデプロイ

まず最初に`pnpm wrangler login` を実行して、Cloudflareにログインします。

```
$ pnpm wrangler login                                                                                  
 ⛅️ wrangler 3.17.1
-------------------
Attempting to login via OAuth...
Opening a link in your default browser: https://dash.cloudflare.com/oauth2/auth...
```

自動的にブラウザが開き、Allow Wrangler to make changes to your Cloudflare account?というページが表示されるので下の Allow をクリックして承認します。

You have granted authorization to Wrangler! と表示されればOKです。以降、ログイン操作をする必要はありません。


次に、 `pnpm wrangler deploy` を実行します。<br>
チームアカウントなど複数ある場合は選択するように求められますので、個人であれば個人用のアカウントを選択します。

```
$ pnpm wrangler deploy
⛅️ wrangler 3.17.1
-------------------
✔ Select an account › 9mail@gmail.com's Account
Your worker has access to the following bindings:
- KV Namespaces:
  - KV: 0d7bc81ac3ba365498dfee9a01acbe994836287
- Vars:
  - MISSKEY_HOST: "HOST"
  - MISSKEY_TOKEN: "TOKEN"
  - POST_VISIBILITY: "home"
  - POST_TAGS: [
  "misshaialert"
]
Total Upload: 2.55 KiB / gzip: 1.01 KiB
Uploaded misshaialert-worker (3.69 sec)
Published misshaialert-worker (3.35 sec)
  https://misshaialert-worker.noogai.workers.dev
  schedule: 10 15 * * *
Current Deployment ID: 1ca1e-65cb-46e8-97af-00000000000
```

# Copyright
&copy; 2023 CyberRex<br>
MIT License