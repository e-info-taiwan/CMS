# @mirrormedia/lilith-eic

## Preface
此Repo
- 使用[KeystoneJS 6](https://keystonejs.com/docs)來產生CMS服務。
- 串接 Cloud Build 產生 Docker image 和部署到 Cloud Run 上。

cloud builds:
- []()

cloud runs:
- []()

## Environment Variables
關於 lilith-readr 中使用到哪些環境變數，可以至 [`environment-variables.ts`](https://github.com/mirror-media/Lilith/blob/main/packages/readr/environment-variables.ts) 查看。

### CDN cache invalidation
本專案支援兩種 CDN 失效方式，擇一設定即可：

1) **HTTP invalidation server**（既有方式）
- `INVALID_CDN_CACHE_SERVER_URL`：例如 `https://invalidate-cdn.example.com`
- 由 CMS 在寫入後呼叫 `${INVALID_CDN_CACHE_SERVER_URL}/post` 等路由

2) **直接呼叫 GCP URL map invalidation**（新增）
- `INVALIDATE_CDN_PROJECT_ID`：GCP project id
- `INVALIDATE_CDN_URL_MAP_NAME`：URL map 名稱（例如 `eic-web-url-map`）
- `INVALIDATE_CDN_ROUTE_PREFIX_CONFIG`：JSON 字串，路由前綴設定，例如：
```
{"post":"/post","ampPost":"/amp/post","event":"/event","infoGraph":"/infographic","poll":"/poll","timeline":"/timeline","newsletter":"/newsletter","topic":"/topic"}
```
- 需確保執行環境已具備 `@google-cloud/compute` 需要的授權（例如 Cloud Run service account 權限）

> 若 `INVALID_CDN_CACHE_SERVER_URL` 有設定，會優先使用 HTTP invalidation；否則改用 GCP URL map invalidation。

## Getting started on local environment
### Start postgres instance
在起 lilith-readr 服務前，需要在 local 端先起 postgres database。
而我們可以透過 [Docker](https://docs.docker.com/) 快速起 postgres database。
在電腦上安裝 Docker 的方式，可以參考 [Docker 安裝文件](https://docs.docker.com/engine/install/)。
安裝 Docker 後，可以執行以下 command 來產生 local 端需要的 postgres 服務。
```
docker run -p 5433:5432 --name lilith-readr -e POSTGRES_PASSWORD=passwd -e POSTGRES_USER=account -e POSTGRES_DB=lilith-readr -d postgres
```

註：
`POSTGRES_PASSWORD`, `POSTGRES_USER` 和 `POSTGRES_DB` 都可更動。
只是要注意，改了後，在起 lilith-readr 的服務時，也要更改傳入的 `DATABASE_URL` 環境變數。

### Install dependencies
我們透過 yarn 來安裝相關套件。
```
yarn install
```

### Start dev instance
確定 postgres 服務起來和相關套件安裝完畢後，可以執行以下 command 來起 lilith-readr 服務
```
yarn dev
// or
npm run dev
```

如果你的 database 的設定與上述不同，
可以透過 `DATABASE_URL` 環境變數傳入。
```
DATABASE_URL=postgres://anotherAccount:anotherPasswd@localhost:5433/anotherDatabase yarn dev
// or
DATABASE_URL=postgres://anotherAccount:anotherPasswd@localhost:5433/anotherDatabase npm run dev
```

成功將服務起來後，使用瀏覽器打開 [http://localhost:3000](http://localhost:3000)，便可以開始使用 CMS 服務。

### GraphQL playground
起 lilith-readr CMS 服務後，我們可以透過 [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql) 來使用 GraphQL playground。

### Start GraphQL API server only
我們也可以單獨把 lilith-readr 當作 GraphQL API server 使用。
透過傳入 `IS_UI_DISABLED` 環境變數，我們可以把 CMS WEB UI 的部分關閉，只留下 GraphQL endpoint `/api/graphql`。
```
IS_UI_DISABLED=true npm run dev
```

### Access control
透過 `npm run dev` 起服務時，預設是起 CMS 的服務，所以我們必須是登入的狀態下，才能使用 GraphQL endpoint `http://localhost:3000/api/graphql`。
若是在登出的狀態下，我們是無法使用 GraphQL API 的。

除了 `cms` 權限控管模式，我們可以使用 `ACCESS_CONTROL_STRATEGY` 環境變數來切換不同的 GraphQL API 權限控管的模式。
例如：
```
ACCESS_CONTROL_STRATEGY=gql npm run dev
```
切換成 `gql` 模式後，GraphQL API server 就不會檢查使用者是否處於登入的狀態（意即 GraphQL API server 會處理所有的 requests）。
注意：`gql` 模式的使用上，需要搭配「不允許外部網路的限制」來部署程式碼，以免門戶大開。

## How we upload images
請見[圖片上傳與 resize — 以 openwarehouse-k6 為例](https://paper.dropbox.com/doc/resize-openwarehouse-k6---BgSS7fZlve8ejXyx8NAwLQ0eAg-nEMMAMYOoMLvaaI2bcyBf)。

### Troubleshootings
#### Q1: 我在 `packages/*` 資料夾底下跑 `yarn install` 時，在 `yarn postinstall` 階段發生錯誤。

A1: 如果錯誤訊息與 `@mirrormedia/lilith-core` 有關，可以嘗試先到 `packages/core` 底下，執行
  1. `yarn build`
  2. `yarn install`

確保 local 端有 `@mirrormedia-/lilith-core` 相關的檔案可以讓 `packages/*` 載入。

## Patch

### 目前使用 patch-package 讓 keystone admin UI (keystone-6/core 5.2.0) 可以在手機版進行編輯，該功能已在 keystone-6/core 5.5.1 新增，日後更新 keystone 板上時可移除。
