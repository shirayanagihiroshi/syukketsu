# 出欠管理サービス
## 概要

出欠管理をするシングルページアプリケーションである。


「シングルページWebアプリケーション
――Node.js、MongoDBを活用したJavaScript SPA」
Michael S. Mikowski、Josh C. Powell　著、佐藤 直生　監訳、木下 哲也　訳

を参考に作ってあり、サーバ側では認証、データの保持をする。その他の処理は主にクライアントのブラウザで行う。

## 環境
サーバ側はnode.jsとmongodbが必要。クライアントはブラウザで該当URLにアクセスすれば良い。mongodがあらかじめ動いている必要があり、DBにある程度の情報が登録されている必要がある。

### バージョン
- node.js : ~~v12.18.3~~ v20.19.4
- mongodb : ~~v4.4.2~~ v8.0.12

## 実行
- サーバ側 : このリポジトリをcloneし、`npm install`そして、`node app.js`
する。ただし、`lib/keys.js`にあるhttpsの鍵、mongodbのユーザは相応に変更が必要。

## ユーザ情報の準備
エクセルシートに記入->マクロで`**.json`出力->
`node readyData.js`で`**.json`の内容をDBに登録の流れである。

- 先生 : `data2DB/productionDataUser.xlsm`に先生のID,名前,ユーザ種別,パスワード(マクロで割り振れる)を記入し、出力マクロを実行で、`data2DB/user.json`が出力される。
- クラス : `data2DB/productionDataClass.xlsm`に学年、クラス、担任、生徒のリストを記入し、出力マクロを実行で、`data2DB/class.json`が出力される。
- クラス混合の授業用の名簿 : `data2DB/productionDataGoudouMeibo.xlsm`に合同名簿ID、学年、クラス、出席番号のリストを記入し、出力マクロを実行で、`data2DB/goudouMeibo.json`が出力される。

## カレンダーの準備
ユーザ情報を設定後にシステムを動かし、教務部教員としてログインして、日課の入力(教務)メニューより設定をする。基本的に出欠情報は登校日でないと入力できない。

### 設計
別ファイル参照。
