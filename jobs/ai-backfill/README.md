# AI 回填 Cloud Run Jobs

**資源清理（2026-09-23）：本次 6 個一次性 Cloud Run Jobs 已全部刪除，包含 migration
與暫停的圖片標籤 Job。回填資料及執行結果保留，正式 Cloud Run services 不受影響。**
`retired-job-configurations.json` 保存映像、資源及 Secret 參照，不含憑證值；
清理紀錄在 `preparation.json`。以下 execute 指令均為歷史／重建後的操作範例，
必須先重建對應 Job 才可執行，圖片標籤仍需依使用者新的恢復指示處理。

**最新狀態（2026-09-23）：既有 CLIP 匯入已完成，今年缺漏 CLIP 已補 744 張，
今年 13,134 張有可處理檔案的圖片均已有向量。pHash 恢復 8 個 task 並掃完全部分區，
已有 115,615 張，剩餘 35 張來源例外。今年圖片標籤 apply 尚未啟動，維持暫停，
不得依下方範例自行恢復。prod 圖片 AI 編輯欄位、列表、搜尋／篩選／排序入口與報題建議
已部署隱藏，並完成正式頁面驗證。**

正式 DB 五個 migrations 已成功完成，Tag 的 4,353 筆有效名稱向量已補齊
（另 1 筆空白名稱不處理）。本次沿用 lab CLIP 向量，另只重算今年缺少的 CLIP。
映像 digest、build ID 與執行紀錄記錄在 `preparation.json`。
`reports/2026-09-23-phash.json` 的最終例外為 18 張來源不存在、17 張解碼失敗；
另 20 張超大原圖已在有界的高記憶體重試中補齊。pHash execution 因來源例外回傳非零，
成功資料均保留，不能視為全量成功。`reports/2026-09-23-clip.json` 保留四批歷程，最後已無缺漏。

Job 程式預設 `BACKFILL_MODE=check`，只查 DB、不寫業務資料、不呼叫 AI。

| Job | 工作 | 並行設定 |
| --- | --- | --- |
| `eic-tag-embedding-backfill-prod` | Tag 向量，Vertex `gemini-embedding-001`、1536 維 | 1 task |
| `eic-photo-vector-import-prod` | 沿用 `image_vector_lab` 的 512 維 CLIP 向量 | 1 task |
| `eic-photo-phash-backfill-prod` | 全圖庫缺少的 pHash，不呼叫 CLIP／Vision | 固定 8 tasks |
| `eic-photo-clip-backfill-prod` | 今年缺少的 CLIP 向量，不回填 pHash、不呼叫 Vision | 1 task |
| `eic-photo-ai-backfill-prod` | 暫停：今年缺少的向量／Vision 建議標籤，不回填 pHash | 1 task |

Project：`mimetic-sweep-456508-k4`；region：`asia-east1`。
向量匯入完成後才執行今年 CLIP 專用回填，已存在的向量不重算；原 AI Job 維持暫停。
pHash 依 `Photo.id % 8` 分區，8 個 task 無重疊，可與向量匯入並行；同區重複
execution 由 DB advisory lock 阻擋。AI／向量匯入另共用一把鎖，禁止重疊。
相片 all-fields 模式會同時取得兩類鎖。

## 沿用既有 lab 向量

`photo-vector-import.js` 僅唯讀 `image_vector_lab.vector_lab_images`。
只接收 `clip-ViT-B-32`、512 維且成功的結果，以 `imageFile_id` 與格式匹配 prod。
寫入前讀 GCS metadata 核對來源版本：有 generation 時必須一致；舊資料 generation=0
時，現有物件必須早於 lab seed 的 `created_at`，確保沒有被替換。
來源不存在／變更或無法匹配的資料跳過並計數。
正式 DB 只在檔案身分未變且 `imageVector IS NULL` 時更新向量與向量狀態。
不修改 lab、pHash、標籤或編輯時間。check 只核對 DB 匹配，不讀向量 payload／GCS。

```bash
gcloud run jobs execute eic-photo-vector-import-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 \
  --update-env-vars=BACKFILL_MODE=apply --async
```

## 全圖庫 pHash

一次 execution 固定 8 個分區，逐筆保存，只補空白 pHash；不改寫既有值。
使用原圖與線上一致的 EXIF／w480／pHash 演算法，沒有產生 GCS 縮圖或自動標籤。

```bash
gcloud run jobs execute eic-photo-phash-backfill-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 \
  --update-env-vars=BACKFILL_MODE=apply,BACKFILL_MAX_ITEMS=200000,BACKFILL_MAX_SECONDS=84600 \
  --task-timeout=24h --async
```

每個分區最多 23.5 小時，Cloud Run task 上限 24 小時；依 summary／剩餘量判斷完成，
不因 execution 成功就宣稱全量已完成。檔案不存在或損壞會記錄 ID，其他圖片繼續。

## 今年 CLIP 專用回填

獨立 Job `eic-photo-clip-backfill-prod` 使用 Go `BACKFILL_FIELDS=vector`，
`ENABLE_IMAGE_VECTOR=true`、`ENABLE_IMAGE_LABEL=false`，不寫 pHash 或圖片標籤。
日期範圍為台北 2026 年，1 task / 2 CPU / 4 GiB / 1 小時，預設 check。
其 service account、VPC、bucket 與 DB secret 沿用其他圖片 Job，映像 digest 見 `preparation.json`。

```bash
gcloud run jobs execute eic-photo-clip-backfill-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 \
  --update-env-vars=BACKFILL_MODE=apply,BACKFILL_MAX_ITEMS=20000 --async
```

本次 check 找到 744 張；試跑補 46 張，完整批次補 692 張，兩次大檔補算再補 5 + 1 張，
目前已全部補齊。大檔 execution 使用 8 GiB 與 1.8 億像素上限；v6 Job 映像將讀取上限
調為 64 MiB。Job 預設仍為 check、6,000 萬像素，pHash / CLIP 記憶體已恢復 2 / 4 GiB。

## 上線前置條件

標籤所需 `Tag.textEmbedding3Small vector(1536)` 已存在於 prod。
圖片 apply 需要以下 CMS migrations；prod 已完成，其他環境的 check
會在缺少欄位時失敗並列出原因：

- `20260609140000_add_photo_image_label_suggestions`
- `20260610014500_add_photo_image_vector_status`
- `20260610021500_make_photo_image_label_fail_reason_nullable`

Job 不需要先部署新版 CMS UI，也不會替你執行這些 migrations。
`Photo.tags` 與 `PostVector` 是新版 CMS 的其他需求，不是上述回填 Job 的寫入目標。

## 暫停的圖片標籤／AI Job：2026 年上傳

使用者指定先回填今年上傳的圖片，依 `Photo.createdAt` 篩選台北時區
2026-01-01（含）至 2027-01-01（不含），對應 UTC
`2025-12-31T16:00:00Z` 至 `2026-12-31T16:00:00Z`。
日期條件由部署腳本寫入 AI Job 預設環境；沒有建立時間的資料不列入。
此年度約 13,134 張有可處理的檔案資料，ID 與日期不完全同序，不能只用 ID 範圍替代。

v3 圖片映像支援以下長批次；預設 check／50 筆／1 小時仍不變：

```bash
gcloud run jobs execute eic-photo-ai-backfill-prod \
  --project=mimetic-sweep-456508-k4 --region=asia-east1 \
  --update-env-vars=BACKFILL_MODE=apply,BACKFILL_MAX_ITEMS=20000,BACKFILL_MAX_SECONDS=25200 \
  --task-timeout=8h --async
```

單 worker 逐批處理、逐筆保存，應用程式最多跑 7 小時；總量仍以日期範圍為界。
若到達時間上限而尚未完成，可重跑同一指令，只會補缺少的欄位。

## 手動檢查

以下為重建 Job 後使用的唯讀 check 模式範例：

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
已完成的欄位會保留，下一次補剩餘項目。AI Job 維持一個 worker；pHash Job 固定 8 個分區，不可改變 tasks 數。

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

部署腳本管理 Tag、pHash、AI 三個專用 Job 的環境，會將模式重設為 check，不執行回填。

## 驗證

```bash
node --test jobs/ai-backfill/tag-job.test.js jobs/ai-backfill/photo-vector-import.test.js
```

`tag-job.integration.test.js` 只接受 localhost 的 `eic_backfill_test` DB，
透過 `BACKFILL_TEST_DATABASE_URL` 啟用，驗證 pgvector 寫入、鎖、改名競態與續跑。
圖片測試在 image-processor-go repo 執行 `go test ./...`。
測試使用模擬 AI 回應；真正的 Vertex／Vision／CLIP 產出仍需在 50 筆試跑驗收。

向量匯入 Job 另以 `cloudbuild.import.yaml` / `Dockerfile.import` 建置，然後執行：

```bash
python3 jobs/ai-backfill/deploy-vector-import.py \
  --image='asia-east1-docker.pkg.dev/mimetic-sweep-456508-k4/cloud-run-source-deploy/eic-photo-vector-import@sha256:IMPORT_DIGEST'
```

該 Job 使用同一專用 backfill service account，另有 lab password secret 的唯讀存取，
透過 Cloud SQL socket 連 lab、VPC 連 prod；lab 帳密只留在 Secret Manager。
`photo-vector-import.integration.test.js` 驗證真實 pgvector、來源版本改變、
編輯更換圖片、既有向量保護、唯讀 check 與重疊鎖；測試 DB 僅允許 localhost。
