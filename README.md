# Web Photo Organizer

このプロジェクトは、写真を整理するためのWebアプリケーションです。指定されたフォルダからファイルを取得し、指定されたパターンに従って新しいフォルダに移動します。
写真以外のファイルも操作可能です。

このツールはローカル環境でのみ動作する想定で作成しています。

## セットアップ

### 必要なツール

- Node.js (バージョン14以上)
- npm (Node.jsに含まれています)
- exiftool (メタデータの取得に使用)

### 準備

1. Node.jsのインストール

    ### macOSの場合
    Homebrewのインストール
    ```sh
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
    Node.jsとnpmのインストール
    ```sh
    brew install node
    ```

    ### Windowsの場合
    [Node.jsのダウンロードページ](https://nodejs.org/ja/download/)  
    ・Windows インストーラー (.msi)でインストール

    ### Linuxの場合
    ```sh
    sudo apt update
    sudo apt install nodejs npm
    ```

2. `exiftool` をインストールします。以下のコマンドを使用してインストールできます。

    ### macOSの場合
    ```sh
    brew install exiftool
    ```

    ### Windowsの場合
    [ExifToolのダウンロードページ](https://exiftool.org/index.html)  
    ・zipファイルを解凍し、ファイル名を`exiftool.exe`に変更する  
    ・配置先にパスを通す

    ### Linuxの場合
    ```sh
    sudo apt update
    sudo apt -y install libimage-exiftool-perl
    ```

### インストール

1. リポジトリをクローンします。

    ```sh
    git clone https://github.com/pottama/web-photo-organizer.git
    cd web-photo-organizer
    ```

2. 依存関係をインストールします。

    ```sh
    npm install
    ```

## 使用方法

1. アプリケーションを起動します。

    ```sh
    npm start
    ```

2. ブラウザで `http://localhost:3000` にアクセスします。

3. フォームにソースフォルダ、デスティネーションフォルダ、および出力パターンを入力します。

    - **Source Folder**: 写真が保存されているフォルダのパス
    - **Destination Folder**: 写真を移動するフォルダのパス
    - **Output Folder Pattern**: 写真を整理するためのフォルダパターン（例: `<CM>/<YYYY>/<MM>/<DD>`）
    - **File Name Pattern**: ファイル名のパターン（例: `P<YYYY><MM><DD><HH><II><SS>-<SN2>`）
    - **ExifTool Using**（Options）: ExifToolをしない場合はチェックを外す
    - **File Extension**（Options）: 移動するファイルの拡張子（例: `jpg, jpeg, png`）
    - **Max File Count**（Options）: 最大ファイル数
    - **Delete Empty Folders**（Options）: 移動後に空となったフォルダを削除しない場合はチェックを外す

    ※Output Folder Pattern は空の場合、Destination Folderに出力されます。  
    ※ExifTool を使用しない場合、`<CM>`（カメラモデル）は`Unknown`となります。  
    ※File Extension は空の場合、全拡張子が対象となります。  
    ※`.`から始まるファイルは処理対象外となります。

4. `Preview` ボタンをクリックして、移動するファイルのリストを表示します。

5. `Skip` チェックボックスは、ファイルを除外する場合にチェックします。

6. `Move Files` ボタンをクリックして、ファイルを移動します。

## フォルダパターンの説明

フォルダパターンは下記の変数を使用してカスタマイズできます。  
ExifToolを使用しファイルから下記を取得します。  

※Exif情報が取得できない場合はファイルの作成日になります。

- `<CM>`: カメラモデル（取得不可の場合は`Unknown`となる）
- `<YYYY>`: 年（撮影日、作成日）
- `<MM>`: 月（撮影日、作成日）
- `<DD>`: 日（撮影日、作成日）
- `<HH>`: 時（撮影日、作成日）
- `<II>`: 分（撮影日、作成日）
- `<SS>`: 秒（撮影日、作成日）

同一ファイル名の場合に連番を付加します。
- `<SN2>`: 2桁の連番（ファイル名パターンのみ）
- `<SN3>`: 3桁の連番（ファイル名パターンのみ）

フォルダの区切りには `/` を使用します。使用できる文字は英数字、`-`、および `_` です。

## ディレクトリ構造

```
web-photo-organizer/
├── public/
│   └── styles/
│       └── style.css
├── src/
│   ├── controllers/
│   │   └── fileController.js
│   ├── routes/
│   │   └── fileRoutes.js
│   ├── utils/
│   │   └── metadata.js
│   ├── views/
│   │   ├── error.ejs
│   │   ├── fileListView.ejs
│   │   ├── index.ejs
│   │   ├── moveComplete.ejs
│   │   └── readme.ejs
│   └── app.js
├── package.json
└── README.md
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。