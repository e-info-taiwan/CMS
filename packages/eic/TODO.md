# TODO

## EIC 向量功能 Feature Toggle（2026-04-29）

### 已完成

- [x] 新增環境變數開關：`FEATURE_TOGGLE_PHOTO_VECTOR`、`FEATURE_TOGGLE_TAG_VECTOR`、`FEATURE_TOGGLE_POST_VECTOR`（預設關閉）
- [x] `Tag`：將向量相似比對與 embedding 更新 hooks 以 feature toggle 控制，關閉時不執行
- [x] `Post`：將 `titleEmbedding` 更新 hook 以 feature toggle 控制，關閉時不執行
- [x] `RssArticle`：將 `titleEmbedding` 更新 hook 以 feature toggle 控制，關閉時不執行
- [x] `Photo`：將 `possibleDuplicates` 欄位在 feature toggle 關閉時隱藏
- [x] `Post`：將 `aiTagSuggestionButton`、`titleSimilarPosts` 在 feature toggle 關閉時隱藏
- [x] `keystone` GraphQL：
  - [x] `similarPhotos` 在 `photoVector` 關閉時回傳空陣列
  - [x] `similarRssArticlesByPostTitle` 在 `postVector` 關閉時回傳空陣列
  - [x] `suggestPostTagsWithAi` 在 `postVector/tagVector` 關閉時停用
- [x] service 層保險：
  - [x] `ai-post-tags-suggestion` 新增 toggle 檢查
  - [x] `post-title-similarity` 新增 toggle 檢查

### 後續待辦（可選）

- [ ] 補上 `.env` 範例與說明（何時開啟各項 toggle）
- [ ] 規劃分階段啟用策略（先 `tagVector` 再 `postVector`，最後 `photoVector`）
