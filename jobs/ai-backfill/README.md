# AI 回填 Cloud Run Jobs

部署狀態（2026-09-23）：兩個映像、Cloud Run Job、專用 service account 與
DB Secret 已建立。標籤已通過 prod check 與 50 筆 apply 試跑；
正式 DB 的五個待套用 migrations 也已透過獨立 migration Job 成功完成。
映像 digest、build ID 與執行紀錄記錄在 `preparation.json`。

這兩個 Job 只在手動執行時運作。部署腳本不執行 Job，也不執行 migration。
預設 `BACKFILL_MODE=check`：只查 DB 結構／覆蓋率，不寫入業務資料、不呼叫 AI。

| Job | 工作 | 資源 |
| --- | --- | --- |
| `eic-tag-embedding-backfill-prod` | 補 `Tag.textEmbedding3Small`，Vertex `gemini-embedding-001`、1536 維 | 1 CPU / 512 MiB |
| `eic-photo-ai-backfill-prod` | 補 Photo 的 pHash、512 維 CLIP vector、Vision 建議標籤 | 2 CPU / 4 GiB |

Project：`mimetic-sweep-456508-k4`；region：`asia-east1`。
兩個 Job 都設定 tasks=1、parallelism=1、task timeout=3600 秒、task retries=0。
應用程式會提前停止領取新資料；成功欄位立即寫回，每次最多 50 筆。
同類 Job 以 DB advisory lock 阻止重疊執行；標籤與圖片可分別執行。

## 上線前置條件

標籤所需 `Tag.textEmbedding3Small vector(1536)` 已存在於 prod。
圖片 apply 需要以下 CMS migrations；prod 已完成，其他環境的 check
會在缺少欄位時失敗並列出原因：

- `20260609140000_add_photo_image_label_suggestions`
- `20260610014500_add_photo_image_vector_status`
- `20260610021500_make_photo_image_label_fail_reason_nullable`

Job 不需要先部署新版 CMS UI，也不會替你執行這些 migrations。
`Photo.tags` 與 `PostVector` 是新版 CMS 的其他需求，不是上述回填 Job 的寫入目標。

## 手動檢查

以下指令執行已部署的唯讀 check 模式：

```bash
gcloud run jobs execute eic-tag-embedding-backfill-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 --async

gcloud run jobs execute eic-photo-ai-backfill-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 --async
```

## 確認 migration 完成後，先試跑 50 筆

以下是實際寫入操作。使用 execution override，Job 的預設仍保留 check。

```bash
gcloud run jobs execute eic-tag-embedding-backfill-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 \
  --update-env-vars=BACKFILL_MODE=apply,BACKFILL_MAX_ITEMS=50 --async

gcloud run jobs execute eic-photo-ai-backfill-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 \
  --update-env-vars=BACKFILL_MODE=apply,BACKFILL_MAX_ITEMS=50 --async
```

確認結果、單筆耗時與 API quota 後，可以將 `BACKFILL_MAX_ITEMS` 提高到 500。
重複手動 execute 會跳過已完成的欄位。每批的完成不表示整個圖庫已完成。
執行結果與 logs 中會記錄 processed、failed、next cursor；有失敗時 exit code 為非零。
不要只因 Job process 成功，就判定已經完成全庫回填。

持續失敗的資料先依 ID 修復。可用 `BACKFILL_START_ID`（不含）與
`BACKFILL_END_ID`（含）限定範圍，避免一直重試同一批失敗列；範圍外的失敗
仍需追蹤。暫時性錯誤每次 execution 內最多嘗試 3 次，並非跨 execution 的永久次數上限。

取消可從 Cloud Run execution 頁進行；SIGTERM 會中止後續工作。
已完成的欄位會保留，下一次補剩餘項目。請勿把 tasks 調高：目前的 Job
刻意只支援一個 worker，若需平行處理應先改用可分工的 claim/lease 工作表。

圖片 Job 不呼叫一般上傳處理路徑，不重新產生縮圖、不上傳 GCS，不重算
legacy `possibleDuplicates`，也不自動把 Vision 候選連結為正式 `Photo.tags`。
pHash 用原圖計算並沿用線上的 EXIF 方向／w480 縮放規則；pHash 已存在時，
向量／Vision 優先讀 w480，沒有 w480 才讀原圖。

## 執行身分與憑證

專用 service account：`eic-ai-backfill@mimetic-sweep-456508-k4.iam.gserviceaccount.com`。
具有 Vertex AI 使用、Service Usage、Cloud SQL Client，以及正式圖片 bucket 的唯讀權限。
沒有授予 GCS 寫入權限或 Pub/Sub 訂閱權限。
Job 透過 default VPC / asia-east1 default subnet 連正式 DB。

`DATABASE_URL` 引用 Secret Manager `eic-ai-backfill-prod-database-url` 的固定版本。
部署腳本首次從既有 prod CMS 取得 DB 連線值，只在記憶體與 stdin 間傳遞至 Secret Manager。
不將帳密寫入原始碼、暫存檔或命令列。
DB 使用既有 CMS 帳號；更細的 DB 欄位權限可另行建立專用資料庫角色。
正式 DB 密碼輪替後，需更新 secret version 與兩個 Job 的引用版本。

## 重建與部署

標籤使用此目錄的 `Dockerfile`、`cloudbuild.yaml`。圖片使用相鄰
`image-processor-go` repo 的 `Dockerfile.backfill`、`cloudbuild.backfill.yaml`、
`.gcloudignore.backfill`。這兩份 build 設定只產生映像，不部署線上服務。

取得兩個映像的 immutable digest 後，執行：

```bash
python3 jobs/ai-backfill/deploy.py \
  --tag-image='asia-east1-docker.pkg.dev/mimetic-sweep-456508-k4/cloud-run-source-deploy/eic-tag-embedding-backfill@sha256:TAG_DIGEST' \
  --photo-image='asia-east1-docker.pkg.dev/mimetic-sweep-456508-k4/cloud-run-source-deploy/eic-photo-ai-backfill@sha256:PHOTO_DIGEST'
```

部署腳本只管理這兩個專用 Job 的環境，會將模式重設為 check，不執行回填。

## 驗證

```bash
node --test jobs/ai-backfill/tag-job.test.js
```

`tag-job.integration.test.js` 只接受 localhost 的 `eic_backfill_test` DB，
透過 `BACKFILL_TEST_DATABASE_URL` 啟用，驗證 pgvector 寫入、鎖、改名競態與續跑。
圖片測試在 image-processor-go repo 執行 `go test ./...`。
測試使用模擬 AI 回應；真正的 Vertex／Vision／CLIP 產出仍需在 50 筆試跑驗收。
