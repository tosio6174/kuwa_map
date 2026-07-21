# 十勝 植生地図（kuwa_map）

十勝地方を対象に、国土地理院の背景地図と環境省の現存植生図を重ねて閲覧する、ビルド不要の静的Web地図です。

表示データ:

- 国土地理院 標準地図
- 国土地理院 全国最新写真（シームレス）
- 環境省 現存植生図2024 北海道ブロック

白・生成り・茶色を基調とした落ち着いたUIで、植生凡例の絞り込み、クワガタ候補プリセット、現在地表示に対応します。

## 主な機能

- 標準地図／航空写真の切替
- 植生オーバーレイのON／OFF
- 植生の透明度変更
- `MAP SETTINGS`パネルの開閉
- ボタン操作による現在地の1回取得
- 現在地マーカーと位置精度円の表示
- 現在表示範囲周辺だけをArcGIS REST APIから取得
- 表示中の凡例ごとの個別ON／OFF
- 凡例名・区分・説明文の検索
- 全表示／全非表示
- 「クワガタ候補」プリセット
- 凡例ごとの簡易説明文
- ポリゴンクリック時の属性・説明表示
- 読込中／成功／注意／失敗／非表示を示す小型ステータスアイコン
- SVG path、fill、fill-opacity、Pane、表示範囲の自己診断

地点検索、天気、クマ情報、地点保存、PWA、Service Worker、永続キャッシュ、オフライン対応は実装していません。

## ファイル構成

```text
kuwa-map/
├── index.html
├── assets/
│   ├── app.js
│   ├── styles.css
│   └── vendor/
│       └── leaflet/
│           ├── leaflet.css
│           ├── leaflet.js
│           ├── LICENSE
│           └── images/
├── README.md
└── .nojekyll
```

`package.json`、`node_modules`、Service Worker、manifest、GitHub Actions、ビルド成果物はありません。

## 使用ライブラリ

- Leaflet 1.9.4
- Leaflet本体は`assets/vendor/leaflet/`へ固定配置
- Leafletのライセンスファイルを同梱
- 実行時にCDNからLeafletを取得しないため、CDN障害や追加のDNS待ちに依存しません

## 使用データ

### 国土地理院 標準地図

```text
https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png
```

### 国土地理院 全国最新写真（シームレス）

```text
https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg
```

### 環境省 現存植生図2024 北海道ブロック

Feature Layer:

```text
https://svr-moej.gisservice.jp/arcgis/rest/services/Hosted/veg2024bk1gdb/FeatureServer/0
```

Query endpoint:

```text
https://svr-moej.gisservice.jp/arcgis/rest/services/Hosted/veg2024bk1gdb/FeatureServer/0/query
```

2026年7月21日にService Metadataを確認した値:

| 項目 | 確認値 |
|---|---|
| Layer ID | `0` |
| Layer name | `veg2024bk1` |
| Geometry Type | `esriGeometryPolygon` |
| 座標参照系 | `102100`（latestWkid `3857`） |
| Query formats | `JSON, geoJSON, PBF` |
| MaxRecordCount | `2000` |
| Pagination | `true` |
| Capabilities | `Query, Extract` |
| Object ID | `fid` |

取得する実フィールド:

| 用途 | 実フィールド名 |
|---|---|
| Object ID | `fid` |
| 凡例コード | `凡例コード` |
| 凡例名 | `凡例名` |
| 植生自然度 | `植生自然度` |
| 植生自然度区分 | `植生自然度区分` |
| 植生区分 | `植生区分` |
| 作成年度 | `作成年度` |

## 植生取得・描画方式

1. Leafletの現在表示範囲をEPSG:4326で取得
2. 画面端の少し外側まで含む余白付きEnvelopeを生成
3. ArcGIS REST APIの`query`へ送信
4. `geometryType=esriGeometryEnvelope`
5. `inSR=4326` / `outSR=4326`
6. `spatialRel=esriSpatialRelIntersects`
7. `returnGeometry=true`
8. 必要な実フィールドだけを`outFields`へ指定
9. `f=geojson`
10. `resultRecordCount=2000`、`resultOffset`でページング
11. GeoJSONを`L.geoJSON`へ渡し、Leaflet SVG Rendererで描画
12. `vegetationPane`のz-indexを`410`へ固定
13. 新しい取得開始時に`AbortController`で古い通信を中断

植生取得はズーム12以上です。1ページ2,000件、最大6ページ、最大12,000 Featureで停止します。上限へ達した場合は警告状態となり、拡大を促します。

## 高速化の仕組み

### 1. Leafletレイヤーの再利用

取得したGeoJSONからLeafletレイヤーを一度だけ生成し、凡例フィルターでは既存レイヤーを`addLayer` / `removeLayer`するだけにしています。

- フィルター操作のたびに全GeoJSONを再解析しない
- ポップアップやスタイルを毎回作り直さない
- 透明度変更も既存レイヤーのスタイルだけを更新

### 2. 余白付き先読み

現在の画面範囲より少し広い範囲を取得します。

- 通常端末: 画面範囲の18%を外側へ追加
- 低負荷端末: 12%を追加
- 取得済み範囲内の小さな移動ではAPI通信を行わない

### 3. 4件のメモリ内LRUキャッシュ

直近4範囲のGeoJSONをメモリ内だけに保持します。

- 一度見た範囲へ戻ったときはAPIへ再通信しない
- ページ再読み込みで消える一時キャッシュ
- Service Worker、IndexedDB、オフラインキャッシュは不使用

### 4. ズーム別の形状軽量化

ArcGIS Queryへ次を指定します。

- `maxAllowableOffset`: 現在ズームと端末性能から算出
- `geometryPrecision`: ズーム13以下は小数5桁、14以上は小数6桁
- `returnZ=false`
- `returnM=false`

画面上で識別できない細かな頂点を減らし、通信量、JSON解析量、SVG pathの複雑さを抑えます。

### 5. 端末性能別の描画設定

`navigator.hardwareConcurrency`、利用可能な場合は`navigator.deviceMemory`、ポインター種別を参考に低負荷端末を判定します。

低負荷端末では次を軽くします。

- SVG Rendererのpadding
- GeoJSONの`smoothFactor`
- ArcGIS形状一般化の強さ
- タイルの保持枚数
- ズームアニメーション

### 6. 地図イベントと通信制御

- `moveend`後のみ植生更新を判定
- 220msデバウンス
- 移動開始時に不要になった通信を中断
- 凡例検索は90msデバウンス
- 地図タイルは`updateWhenIdle=true`
- ズーム中のタイル再取得を抑制
- Retina向け二重密度タイル要求を無効化

### 7. UI描画の軽量化

- 高負荷な背景ぼかしを不使用
- 凡例項目へ`content-visibility: auto`
- 凡例リストへCSS containment
- モバイルでは`MAP SETTINGS`と凡例を初期状態で閉じる
- Leaflet本体をローカル配布

## `MAP SETTINGS`の開閉

パネル上部の`MAP SETTINGS`を押すと、背景地図、植生、透明度の操作部分を開閉できます。

- PC・横長画面: 初期状態は展開
- 幅700px以下のスマートフォン: 初期状態は折りたたみ
- `aria-expanded`と`hidden`を同期
- 折りたたみ中も地図操作を妨げない小型表示

## 現在地表示

画面左側の照準ボタンを押したときだけ、現在地を1回取得します。常時追跡は行いません。

- Leafletの`map.locate()`を使用
- `watch=false`
- `setView=true`
- 最大ズーム15
- タイムアウト12秒
- 30秒以内の位置情報キャッシュを許容
- 現在地を茶色の点で表示
- 推定精度を半透明の円で表示
- 成功・取得中・失敗をボタンの色とアイコンで表示

位置情報はブラウザの許可が必要です。GitHub PagesのHTTPSまたは`localhost`で利用してください。拒否、取得不能、タイムアウト時はボタンのツールチップへ原因を表示します。

## 凡例フィルター

APIから取得したFeatureを凡例コード単位で集計し、地図上の凡例を作成します。

- 各凡例のチェックを外すと、対応する既存Leafletレイヤーだけを地図から除外
- チェックを戻すと、同じレイヤーを再追加
- フィルター操作だけではAPIへ再通信しない
- 「全表示」で全凡例を表示
- 「全非表示」で全ポリゴンを非表示
- 検索欄は凡例一覧を絞り込むだけで、地図フィルター状態は変更しない
- 地図移動後に新しいデータを取得した場合も、選択中のプリセットを再適用

## クワガタ候補プリセット

現在の表示範囲に含まれる凡例のうち、次の文字を含む植生を参考候補として表示します。

主な樹種候補:

- ミズナラ
- コナラ
- カシワ
- クヌギ
- ハルニレ
- ヤナギ類
- ハンノキ

補助的な森林環境候補:

- ヤチダモ
- 落葉広葉樹林
- 広葉樹二次林
- 河畔林
- 湿性林
- ブナ林

耕作地、市街地、造成地、裸地、水域、牧草地などは候補から除外します。

このプリセットは、植生名と植生区分による**探索候補の絞り込み**です。クワガタの生息、樹液の有無、樹齢、枯死木、林内環境、立入可能性を保証しません。現地確認と土地管理者のルール確認が必要です。

## 凡例の説明文

凡例の説明文は、取得した次の属性と、アプリ内の植生キーワード別テンプレートから生成します。

- 凡例名
- 植生区分
- 植生自然度区分

ミズナラ、カシワ、ハルニレ、ヤチダモ、ヤナギ、カラマツ、湿原、耕作地など主要な植生には個別説明を用意し、それ以外は実際の凡例名と属性から簡易要約を生成します。

これは環境省が配布する凡例解説全文の転載ではありません。現地の細かな樹種構成や林況を断定するものでもありません。

## 配色

### UI

- 白、生成り、薄い茶色を基調
- 不透明に近い軽量カードと控えめな影
- 茶色のアクセント、トグル、ボタン
- PC、iPhone縦、スマートフォン横で地図を全面表示
- `100vh`と`100dvh`を併記
- `env(safe-area-inset-*)`でノッチとホームインジケーターを考慮

### 植生ポリゴン

- 凡例コードを優先し、なければ凡例名を色キーに使用
- 固定ハッシュから色相を算出
- 彩度と明度に下限を設定
- 最終色は必ず`#RRGGBB`
- 同じ凡例は再取得後も同じ色
- 境界線は塗り色を暗くしたHEX色

## ステータス表示

画面左上の小さなアイコンだけで植生処理の状態を示します。

| 状態 | 表示 |
|---|---|
| 読込中 | 回転リング |
| 成功 | 緑のチェック |
| 注意・ズーム不足・データなし | 茶橙の感嘆符 |
| 通信・解析・描画失敗 | 赤い× |
| オーバーレイ／フィルター非表示 | 斜線付きの目 |

通常時にFeature件数や「取得成功」等の文章パネルは表示しません。詳細診断は開発者コンソールへ出力します。

## ポップアップの安全性

API属性を`innerHTML`へ挿入していません。DOM APIと`textContent`だけで組み立て、欠損値は「情報なし」と表示します。

## 自己診断

実データ取得後に次を自動確認します。

- Polygon / MultiPolygonが含まれる
- Leaflet Layerが追加された
- `vegetationPane`内にSVGがある
- SVG内にpathがある
- pathのfillが`none` / `transparent`ではない
- pathのfill-opacityが0ではない
- Paneが非表示ではない
- 地図範囲と植生レイヤー範囲が交差する

フィルター操作時は既存レイヤーの再利用を優先し、ネットワーク取得時より軽い診断に抑えます。フィルターによって全凡例を非表示にした場合は、pathが0でもエラーとは判定しません。

開発者コンソールにはQuery URL、HTTP Status、content-type、Feature件数、Geometry Type内訳、Leaflet Layer数、SVG path数、キャッシュ利用、通信中断、エラー詳細を出力します。

## ローカル起動

`file://`で直接開かず、プロジェクトフォルダでHTTPサーバーを起動します。

```powershell
cd kuwa-map
python -m http.server 8000
```

ブラウザ:

```text
http://localhost:8000/
```

`localhost`はブラウザ上で安全なコンテキストとして扱われるため、位置情報を許可すれば現在地ボタンも利用できます。

## GitHub Pages公開

1. GitHubのリポジトリ`tosio6174/kuwa_map`を開く
2. `Settings` → `Pages`
3. `Build and deployment`のSourceを`Deploy from a branch`
4. Branchを`main`、フォルダを`/(root)`
5. 保存

プロジェクト内のローカル参照は`./assets/...`だけなので、GitHub Pagesのサブディレクトリ配下でも読み込めます。

## 既存リポジトリを置き換えるgitコマンド

ローカルの対象フォルダに残したいファイルがないことを確認してから実行してください。

```powershell
cd C:\path\to\kuwa-map

Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
git init
git branch -M main
git remote add origin https://github.com/tosio6174/kuwa_map.git

git add index.html assets README.md .nojekyll
git commit -m "Add current location and optimize map performance"
git push -u --force origin main
```

`--force`は既存mainを置き換えます。共同作業者がいるリポジトリでは使用しないでください。

## テスト結果

### 静的検査

- JavaScript構文確認（`node --check`）
- HTML内の重複IDがないことを確認
- 必要なDOM IDの存在確認
- Leafletのローカルファイルと画像資産の存在確認
- プロジェクト内参照が相対パスであることを確認
- `package.json`、PWA、Service Worker、GitHub Actionsがないことを確認
- `viewport-fit=cover`、`100dvh`、safe-area指定を確認
- 本番コードへテスト用API URLが混入していないことを確認

### Playwright実描画・操作テスト

Leaflet 1.9.4、Polygon / MultiPolygon形式のモックGeoJSON、モック位置情報を使い、実際のSVG path生成と操作を検証しました。

| 画面 | 初期表示 | クワガタ絞込 | 設定初期状態 | 現在地 | 小移動 | 大移動 | 元の範囲へ復帰 | JSエラー |
|---|---:|---:|---|---|---|---|---|---|
| PC 1440×900 | 3 path | 2 path | 展開 | 成功 | 再通信なし | 1回取得 | キャッシュ再利用 | なし |
| iPhone相当 390×844 | 3 path | 2 path | 折りたたみ | 成功 | 再通信なし | 1回取得 | キャッシュ再利用 | なし |
| スマートフォン横 844×390 | 3 path | 2 path | 展開 | 成功 | 再通信なし | 1回取得 | キャッシュ再利用 | なし |

テスト環境内でのアプリ準備完了時間:

| 画面 | 準備完了 | クワガタ絞込 |
|---|---:|---:|
| PC 1440×900 | 約1,015ms | 約177ms |
| iPhone相当 390×844 | 約476ms | 約117ms |
| スマートフォン横 844×390 | 約418ms | 約64ms |

この時間はモック通信・テスト環境固有の参考値であり、実際の環境省API、国土地理院タイル、端末性能、通信回線によって変わります。

### 公開後に確認する項目

成果物生成環境では外部サイトへのブラウザ接続が制限されたため、環境省FeatureServerと国土地理院タイルを同時に読み込むライブ画面テストは実施できていません。

公開後、次を確認してください。

- 初期読込後に左上アイコンが緑のチェックになる
- 色付き植生ポリゴンが標準地図上で見える
- 航空写真へ切り替えても植生が見える
- クワガタ候補プリセットで凡例とポリゴンが絞られる
- 現在地ボタンでブラウザの許可画面が出る
- 許可後に現在地マーカーと精度円が表示される
- iPhone / Android実機で設定・凡例の開閉とスクロールができる

## 残っている制約

- クワガタ候補は植生名による参考判定であり、生息予測モデルではない
- 凡例の説明は簡易要約であり、環境省公式解説全文ではない
- 現在地はブラウザと端末が返す推定位置で、GPS精度を保証しない
- ユーザーが位置情報を拒否した場合、現在地は表示できない
- FeatureServerまたは国土地理院タイルが停止・仕様変更した場合は表示できない
- 1回の表示範囲で最大12,000 Feature。到達時は拡大が必要
- SVG描画を維持しているため、極端に多数の複雑なポリゴンでは端末負荷が上がる
- 形状一般化により、表示ズームでは不要な微細頂点を省略する
- メモリキャッシュは最大4範囲で、ページを閉じると消える
- GitHub Pagesは静的配信のため、API障害をサーバー側で代理取得して回避できない

## 参考ドキュメント

- Leaflet Reference: `https://leafletjs.com/reference.html`
- ArcGIS REST Query: `https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/`
- MDN Geolocation API: `https://developer.mozilla.org/docs/Web/API/Geolocation_API`
