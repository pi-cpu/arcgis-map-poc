# arcgis-map-poc

ArcGIS × Salesforce Experience Cloud 連携PoC用の、GitHub Pagesで公開する地図アプリ。
HTML/CSS/JavaScriptとArcGIS Maps SDK for JavaScriptのCDNのみで構成し、ビルド工程を持たない。
Salesforce固有情報・APIキー・顧客情報はこのリポジトリにコミットしない。

## 構成

```
index.html          エントリーポイント
css/style.css        スタイル
js/config.js          許可する親オリジンの一覧(公開情報のみ。秘密情報は書かない)
js/validation.js       メッセージ契約の検証ロジック(ブラウザ/Node両対応)
js/app.js             ArcGIS Maps SDK連携本体
sample-data/           Hosted Feature Layer登録用サンプル地点(GeoJSON、個人情報なし)
tests/validation.test.js  検証ロジックの単体テスト(Node標準テストランナー)
```

## セットアップ手順

### 1. ArcGISアカウント作成

1. https://location.arcgis.com/ からArcGIS Location Platformの無料アカウントを作成する。
2. 組織にサインインし、ArcGIS Online の Content 画面にアクセスできることを確認する。

### 2. Hosted Feature Layerの作成

1. ArcGIS Online にサインインし、Content > Add Item > Add from file から `sample-data/sample-locations.geojson` をアップロードする。
2. インポート時にPoint型のHosted Feature Layerとして公開する。
3. GeoJSONからは「Feature layer (ホスト)」として公開する。GeoJSONアイテムのままではFeatureServer URLが得られない。
4. レイヤーに `feature_key`(一意)、`name`、`address`、`phone`、`website` の各フィールドが存在することを確認する。
5. 公開後、レイヤーのFeatureServer URL(例: `https://services1.arcgis.com/xxxx/arcgis/rest/services/sample_locations/FeatureServer/0`)を控える。末尾のレイヤー番号まで含める。
6. レイヤーの共有範囲は所有者のみ（非公開）にし、組織全体または全員へ共有しない。地図アプリからの参照はAPIキーのItem accessだけで許可する。
7. `js/app.js` は `FeatureLayer` の `outFields` を `feature_key` / `name` / `address` / `phone` / `website` の5項目に限定している。これを省くと `hitTest` が返すグラフィックに描画用の項目しか含まれず、地点属性を読み取れない。

### 3. APIキーの作成・制限

従来のAPIキー(legacy API keys)は2026-06-27に廃止されており、現在は **API key credentials** を作成する。

1. ArcGIS Location Platform の API keys 画面で、種別 **Public application** の API key credential を新規作成する。
2. **従量課金(Premium content / pay-as-you-go)は有効化しない。** 無料枠のみで運用する。支払い方法を登録しなければ、枠超過時はサービスが停止する。
3. Item access に、手順2で作成したHosted Feature Layerを追加する(1キーあたり最大100アイテム)。
4. Privileges は、基本地図表示(Basemaps)とFeature Serviceの参照のみに限定する。編集権限は付与しない。
5. Referrer URLs に GitHub Pages のオリジン(例: `https://<github-user>.github.io`)を設定する。`https://` スキームは必須で、パスの指定は推奨されない。
6. **トークンの生成は最後に行う。** 発行されるトークンにはその時点のitem accessが埋め込まれるため、item accessやprivilegeを変更したら必ず再生成する。
7. 発行されたトークンはこのリポジトリへコミットせず、Salesforce側の `ArcGIS_PoC_Settings__c` カスタム設定にのみ登録する。

> トークンは300文字を超える(実測305文字)。Salesforceのカスタム設定のテキスト項目は255文字が上限のため、`API_Key__c` と `API_Key_Part2__c` に分割して登録する。詳細は `arcgis-experience-poc/README.md` を参照。
>
> なお、リファラー制限付きのトークンはブラウザのアドレスバーから直接叩くと必ず `498 Invalid token` を返す。これはキーの不正を意味しないため、疎通確認の材料にはならない。

### 4. このリポジトリの設定

1. `js/config.js` の `allowedParentOrigins` に、Salesforce Experience Cloud(LWR)サイトの実際のドメインを追加する(プレビュー用ドメインと公開後の本番ドメインが異なる場合は両方追加する)。
2. `index.html` の ArcGIS Maps SDK バージョン(`4.30`)は、必要に応じて最新の安定版に更新する。

### 5. GitHub Pagesでの公開(要ユーザー承認)

公開リポジトリの作成・push・GitHub Pages公開は、実施前に対象と差分をユーザーへ提示し、承認を得てから行う。

1. このディレクトリの内容を公開GitHubリポジトリ `arcgis-map-poc` へpushする。
2. リポジトリの Settings > Pages で公開元をルート(`/`)に設定する。
3. 公開URLをSalesforce側の `ArcGIS_PoC_Settings__c.Map_App_URL__c` に登録する。

## Salesforce設定値登録(要点)

Salesforce側の詳細手順は `arcgis-experience-poc/README.md` を参照。このアプリに関連する値は以下の4点。

| 項目 | 設定先 | 値の例 |
| --- | --- | --- |
| API_Key__c / API_Key_Part2__c | ArcGIS_PoC_Settings__c | 手順3で発行したトークンを255文字で分割した前半／後半 |
| Layer_URL__c | ArcGIS_PoC_Settings__c | 手順2で控えたFeatureServer URL |
| Map_App_URL__c | ArcGIS_PoC_Settings__c | 手順5で公開したGitHub Pages URL |
| Allowed_Map_Origin__c | ArcGIS_PoC_Settings__c | GitHub Pagesのオリジン(例: `https://<github-user>.github.io`) |

## メッセージ契約

| 送信元→送信先 | type | version | 主なペイロード |
| --- | --- | --- | --- |
| iframe → LWC | `arcgis-map-ready` | 1 | なし |
| LWC → iframe | `arcgis-map-config` | 1 | `apiKey`, `layerUrl`, `nonce` |
| iframe → LWC | `arcgis-feature-selected` | 1 | `nonce`, `feature`(featureKey/name/address/phone/website/latitude/longitude) |
| iframe → LWC | `arcgis-map-error` | 1 | `code`(非機密のエラーコードのみ) |

すべての送受信で、親オリジンの厳密な検証(`js/config.js` の許可リストとの完全一致)を行い、ワイルドカード `*` は使用しない。

## テスト

```bash
node --test tests/validation.test.js
```

検証ロジック(メッセージ契約の型・長さ・オリジン・緯度経度範囲チェック)はNode標準テストランナーで自動テストする。
ArcGIS Maps SDKを用いた実際の初期化・レイヤー表示・地点選択・APIキー無効時の挙動は、実際のAPIキーとHosted Feature Layerを用いたブラウザでの手動確認(またはE2E)が必要。以下を確認すること。

- [ ] 初期化: 正しい設定で地図が表示される
- [ ] レイヤー表示: Hosted Feature Layerの地点がマップ上に表示される
- [ ] 地点選択: 地点をクリックすると `arcgis-feature-selected` が送信される
- [ ] 設定不足: `arcgis-map-config` が届かない場合、8秒後に `CONFIG_MISSING` を通知し、地図を初期化しない
- [ ] 許可されていない親オリジン: 許可リストにないオリジンからのメッセージを無視する
- [ ] 無効なnonce: 空文字・型不正・過剰に長いnonceを含む設定メッセージを拒否する

いずれもLWR側のiframeに `sandbox` 属性を付けずに確認する。`sandbox` を付けるとプラットフォームが `allow-same-origin` を除去し、iframeが不透明オリジンとなって `event.origin` が `"null"` になるため、オリジン完全一致検証もArcGISのリファラー制限も構造的に通過できない。

## 障害時の確認手順

| 事象 | 確認手順 |
| --- | --- |
| GitHub Pages停止 | GitHub リポジトリの Settings > Pages でビルド状態を確認する。iframe内に読み込みエラーが表示される。 |
| APIキー無効化 | `view.when()` の失敗コールバックが発火し `API_KEY_INVALID` を通知する。ArcGIS Location Platform コンソールでキーの状態を確認する。 |
| ArcGIS無料枠停止(従量課金未達で停止) | ArcGIS Location Platform のUsage画面でクレジット残量を確認する。従量課金は有効化しない方針のため、枠超過時はサービスが停止する想定。 |
| Feature Layer停止 | `featureLayer.load()` の失敗で `LAYER_UNAVAILABLE` を通知する。ArcGIS OnlineでレイヤーのShare設定・削除有無を確認する。 |
| CSP不備 | ブラウザのDevToolsコンソールでCSP違反ログを確認する。SalesforceのTrusted URL設定(frame-src)を確認する。 |
| 地点をクリックしても項目を読み取れない(`UNKNOWN`) | `FeatureLayer` の `outFields` 指定を確認する。未指定だと `hitTest` のグラフィックに属性が含まれない。 |
| 地図は出るがレイヤーだけ出ない(`LAYER_UNAVAILABLE`) | APIキーのitem accessにレイヤーが含まれているか、トークンがitem access変更後に再生成されているか、Salesforce側でトークンが255文字で切れていないかを順に確認する。 |

## 対象外

標準Salesforce Mapsコネクタ、Click2Create、Accountへの直接登録、ゲスト利用、地点編集、ルート検索、オフライン対応。
