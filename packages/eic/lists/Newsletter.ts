import { list, graphql } from '@keystone-6/core'
import {
  text,
  relationship,
  checkbox,
  timestamp,
  virtual,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'
import envVariables from '../environment-variables'

const { allowRoles, admin, moderator, editor } = utils.accessControl

// 網站 URL（從環境變數讀取）
const WEB_URL_BASE = envVariables.webUrlBase

// 預設圖片路徑常數
const DEFAULT_POST_IMAGE_PATH = `${WEB_URL_BASE}/post-default.png`
const DEFAULT_NEWS_IMAGE_PATH = `${WEB_URL_BASE}/news-default.jpg`

// Poll 投票選項預設 icon（由上到下 1-5）
const POLL_ICON_URLS = [
  'https://storage.googleapis.com/statics-e-info-dev/images/2428db5d-403b-4ddd-9417-3be366c13f4d.png',
  'https://storage.googleapis.com/statics-e-info-dev/images/051b3ea6-0082-4e1a-acbb-09bd51b074dc.png',
  'https://storage.googleapis.com/statics-e-info-dev/images/ac3ac606-6526-44ff-9346-ac0f15977e9f.png',
  'https://storage.googleapis.com/statics-e-info-dev/images/007655a9-6cf4-4c8a-9d60-59426617a736.png',
  'https://storage.googleapis.com/statics-e-info-dev/images/013185b7-d5ea-4de4-aeac-feca2e9cfcc7.png',
]

// 格式化日期為 "YYYY年MM月DD日" 格式（活動、徵才用）
const formatDate = (dateString: string | null): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

// 格式化日期為 "YYYY/MM/DD" 格式（電子報 header 用）
const formatDateHeader = (dateString: string | null): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

const CONFIGS_JSON_URL = `${envVariables.images.gcsBaseUrl}/json/configs.json`

/**
 * 從 configs.json 獲取電子報訂閱人數
 * 尋找 id 為 2、name 為 "電子報訂閱人數" 的 content 欄位
 */
const fetchSubscriberCount = async (): Promise<string> => {
  try {
    const response = await fetch(CONFIGS_JSON_URL)
    if (!response.ok) return '—'
    const json = await response.json()
    const items = json?.items
    if (!Array.isArray(items)) return '—'
    const item = items.find(
      (i: { id?: number | string; name?: string }) =>
        String(i?.id) === '2' && i?.name === '電子報訂閱人數'
    )
    return typeof item?.content === 'string' ? item.content : '—'
  } catch (error) {
    console.error('無法讀取電子報訂閱人數:', error)
    return '—'
  }
}

// 根據 category 決定預設圖片
const getDefaultImage = (category: any): string => {
  // Use different default image for "編輯直送" category
  const isEditorCategory = category?.slug === 'editorpick'
  return isEditorCategory ? DEFAULT_NEWS_IMAGE_PATH : DEFAULT_POST_IMAGE_PATH
}

// 從 contentApiData 提取純文字並截取指定字數
const extractTextFromContent = (
  contentApiData: any,
  maxLength = 50
): string => {
  if (!contentApiData || !contentApiData.blocks) {
    return ''
  }

  // 將所有 block 的文字串接起來
  let text = contentApiData.blocks
    .map((block: any) => block.text || '')
    .join('')
    .trim()

  // 截取前 N 字
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...'
  }

  return text
}

const READING_RANKING_JSON_URL = `${envVariables.images.gcsBaseUrl}/ga/reading_ranking.json`

/**
 * 從 GCS JSON 檔案獲取閱讀排名資料
 *
 * 預期的 JSON 格式（由 GA cronjob 產生）：
 * {
 *   "generated_at": "2026-02-12T00:10:15.507596",
 *   "period": {"start_date": "2026-02-05", "end_date": "2026-02-12"},
 *   "top_articles": [
 *     { "rank": 1, "post_id": "242946", "page_views": 1000, "article": {...} },
 *     { "rank": 2, "post_id": "242943", "page_views": 800, "article": {...} },
 *     { "rank": 3, "post_id": "242937", "page_views": 600, "article": {...} }
 *   ]
 * }
 *
 * @returns Promise<string[] | null> - 文章 ID 陣列（依 rank 排序），若取得失敗則返回 null
 */
const fetchReadingRankFromJson = async (): Promise<string[] | null> => {
  try {
    const response = await fetch(READING_RANKING_JSON_URL)

    if (!response.ok) {
      console.error(
        '無法從 JSON 檔案讀取閱讀排名: HTTP',
        response.status,
        response.statusText
      )
      return null
    }

    const json = await response.json()

    const topArticles = json?.top_articles
    if (!Array.isArray(topArticles)) {
      return null
    }
    if (topArticles.length === 0) {
      return []
    }

    const sorted = [...topArticles].sort(
      (a: { rank?: number }, b: { rank?: number }) =>
        (a.rank ?? 0) - (b.rank ?? 0)
    )

    return sorted
      .map((item: { post_id?: string }) => item.post_id)
      .filter((id: unknown): id is string => typeof id === 'string')
  } catch (error) {
    console.error('無法從 JSON 檔案讀取閱讀排名:', error)
    return null
  }
}

// 生成電子報 HTML（只查詢 IDs，使用並行查詢優化效能）
const generateNewsletterHtml = async (
  context: any,
  title: string,
  sendDate: string | null,
  showMenu: boolean,
  showReadingRank: boolean,
  readerResponseText: string,
  readerResponseTitle: string,
  readerResponseLink: string,
  relatedPostIds: string[],
  focusPostIds: string[],
  adIds: string[],
  eventIds: string[],
  jobIds: string[]
) => {
  const subscriberCount = await fetchSubscriberCount()

  // 使用 Promise.all 並行查詢所有資料，提升效能
  const [relatedPosts, focusPosts, ads, events, jobs] = await Promise.all([
    relatedPostIds.length > 0
      ? context.query.Post.findMany({
          where: { id: { in: relatedPostIds } },
          query: `
          id
          title
          content
          category {
            slug
          }
          heroImage {
            resized {
              w480
              w800
            }
          }
        `,
        })
      : [],
    focusPostIds.length > 0
      ? context.query.Post.findMany({
          where: { id: { in: focusPostIds } },
          query: `
          id
          title
          category {
            slug
          }
          heroImage {
            resized {
              w480
              w800
            }
          }
        `,
        })
      : [],
    adIds.length > 0
      ? context.query.Ad.findMany({
          where: { id: { in: adIds } },
          query: `
          id
          name
          image {
            resized {
              w480
            }
          }
          imageUrl
        `,
        })
      : [],
    eventIds.length > 0
      ? context.query.Event.findMany({
          where: { id: { in: eventIds } },
          query: `
          id
          name
          organizer
          startDate
        `,
        })
      : [],
    jobIds.length > 0
      ? context.query.Job.findMany({
          where: { id: { in: jobIds } },
          query: `
          id
          title
          company
          startDate
        `,
        })
      : [],
  ])

  const headerDate = formatDateHeader(sendDate)
  let html = ''

  // ===== 00-Header =====
  html += '        <!-- ===== 00-Header ===== -->\n'
  html += '        <tr>\n'
  html += '          <td class="subscriber-count" align="center">\n'
  html += `            你現在正與 ${subscriberCount} 人一起閱讀環境新聞\n`
  html += '          </td>\n'
  html += '        </tr>\n'
  html += '        <tr>\n'
  html += '          <td class="header-date" align="center">\n'
  html += `            ${headerDate}\n`
  html += '          </td>\n'
  html += '        </tr>\n'
  html += '        <tr>\n'
  html += '          <td class="header-title-td">\n'
  html += `            <h1 class="header-title">${title}</h1>\n`
  html += '          </td>\n'
  html += '        </tr>\n'
  html += '\n'

  // ===== 01-Content (本期內容) =====
  if (relatedPosts.length > 0) {
    html += '        <!-- ===== 01-Content ===== -->\n'
    html += '        <tr>\n'
    html += '          <td class="toc-title" align="center">\n'
    html += '            本期內容\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '        <tr>\n'
    html += '          <td class="toc-container">\n'
    html +=
      '            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'

    relatedPosts.forEach((post: any, idx: number) => {
      const tocClass =
        idx === relatedPosts.length - 1 ? 'toc-item-last' : 'toc-item'
      html += `              <tr>\n                <td class="${tocClass}">\n                  &middot;&nbsp; ${post.title}\n                </td>\n              </tr>\n`
    })

    html += '            </table>\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '\n'
  }

  // ===== Article sections (相關文章) =====
  if (relatedPosts.length > 0) {
    for (let i = 0; i < relatedPosts.length; i++) {
      const post = relatedPosts[i]
      const postUrl = `${WEB_URL_BASE}/node/${post.id}`
      const imageUrl =
        post.heroImage?.resized?.w800 || getDefaultImage(post.category)
      const excerpt = extractTextFromContent(post.content, 150)

      html += `        <!-- Article ${i + 1} -->\n`
      html += '        <tr>\n'
      html += '          <td class="article-cell">\n'
      html += `            <a href="${postUrl}"><img class="article-img" src="${imageUrl}" alt="新聞圖片" width="560"></a>\n`
      html += `            <h2 class="article-title"><a class="dark-link" href="${postUrl}">${post.title}</a></h2>\n`
      html += '            <p class="article-excerpt">\n'
      html += `              ${excerpt}<a href="${postUrl}" class="read-more-inline">閱讀更多</a>\n`
      html += '            </p>\n'
      html += '          </td>\n'
      html += '        </tr>\n'
      html += '\n'
    }
  }

  // ===== 02-Highlight (焦點話題) =====
  if (focusPosts.length > 0) {
    html += '        <!-- ===== 02-Highlight (焦點話題) ===== -->\n'
    html += '        <tr>\n'
    html += '          <td class="section-header" align="center">\n'
    html += '            焦點話題\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '        <tr>\n'
    html += '          <td class="card-section">\n'

    focusPosts.forEach((post: any, idx: number) => {
      const postUrl = `${WEB_URL_BASE}/node/${post.id}`
      const imageUrl =
        post.heroImage?.resized?.w480 || getDefaultImage(post.category)
      const borderClass = idx < focusPosts.length - 1 ? 'card-row-border' : ''
      html += `            <!-- Highlight ${idx + 1} -->\n`
      html += `            <table class="${borderClass}" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n`
      html += '              <tr>\n'
      html +=
        '                <td class="card-thumb-td" width="120" valign="top">\n'
      html += `                  <a href="${postUrl}"><img class="card-thumb" src="${imageUrl}" alt="縮圖" width="120" height="120"></a>\n`
      html += '                </td>\n'
      html += '                <td class="card-content-td" valign="top">\n'
      html +=
        '                  <table class="card-content-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
      html += '                    <tr>\n'
      html += '                      <td class="card-title" valign="top">\n'
      html += `                        <a class="dark-link" href="${postUrl}">${post.title}</a>\n`
      html += '                      </td>\n'
      html += '                    </tr>\n'
      html += '                    <tr>\n'
      html +=
        '                      <td class="card-read-more" valign="bottom" align="right">\n'
      html += `                        <a class="read-more-link" href="${postUrl}">閱讀更多</a>\n`
      html += '                      </td>\n'
      html += '                    </tr>\n'
      html += '                  </table>\n'
      html += '                </td>\n'
      html += '              </tr>\n'
      html += '            </table>\n'
    })

    html += '          </td>\n'
    html += '        </tr>\n'
    html += '\n'
  }

  // ===== 03-Ranking (閱讀排名) =====
  if (showReadingRank) {
    let readingRankData: any[] = []
    try {
      const rankingPostIds = await fetchReadingRankFromJson()
      if (rankingPostIds && rankingPostIds.length > 0) {
        const posts = await context.query.Post.findMany({
          where: { id: { in: rankingPostIds } },
          query: `
          id
          title
          category { slug }
          heroImage { resized { w480 } }
        `,
        })
        if (posts && posts.length > 0) {
          const orderedPosts = rankingPostIds
            .map((id) => posts.find((p: any) => Number(p.id) === Number(id)))
            .filter((p) => p !== undefined)
          readingRankData = orderedPosts.map((post: any, index: number) => ({
            rank: index + 1,
            title: post.title,
            link: `${WEB_URL_BASE}/node/${post.id}`,
            image:
              post.heroImage?.resized?.w480 || getDefaultImage(post.category),
          }))
        }
      }
    } catch (error) {
      console.error('查詢閱讀排名文章時發生錯誤:', error)
    }

    if (readingRankData.length > 0) {
      html += '        <!-- ===== 03-Ranking (閱讀排名) ===== -->\n'
      html += '        <tr>\n'
      html += '          <td class="section-header" align="center">\n'
      html += '            閱讀排名\n'
      html += '          </td>\n'
      html += '        </tr>\n'
      html += '        <tr>\n'
      html += '          <td class="card-section">\n'

      readingRankData.forEach((item: any, idx: number) => {
        html += `            <!-- Ranking ${idx + 1} -->\n`
        html +=
          '            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        html += '              <tr>\n'
        html +=
          '                <td class="ranking-thumb-td" width="120" valign="top">\n'
        html += `                  <a href="${item.link}"><img class="card-thumb" src="${item.image}" alt="縮圖" width="120" height="120"></a>\n`
        html += '                </td>\n'
        html += `                <td class="ranking-number" width="50" valign="top" align="center">\n                  ${item.rank}\n                </td>\n`
        html += '                <td class="ranking-content-td" valign="top">\n'
        html +=
          '                  <table class="card-content-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        html += '                    <tr>\n'
        html += '                      <td class="card-title" valign="top">\n'
        html += `                        <a class="dark-link" href="${item.link}">${item.title}</a>\n`
        html += '                      </td>\n'
        html += '                    </tr>\n'
        html += '                    <tr>\n'
        html +=
          '                      <td class="card-read-more" valign="bottom" align="right">\n'
        html += `                        <a class="read-more-link" href="${item.link}">閱讀更多</a>\n`
        html += '                      </td>\n'
        html += '                    </tr>\n'
        html += '                  </table>\n'
        html += '                </td>\n'
        html += '              </tr>\n'
        html += '            </table>\n'
      })

      html += '          </td>\n'
      html += '        </tr>\n'
      html += '\n'
    }
  }

  // ===== Ads (廣告) =====
  const adsWithImage = ads.filter((ad: any) => ad.image?.resized?.w480)
  if (adsWithImage.length > 0) {
    html += '        <!-- Ads -->\n'
    html += '        <tr>\n'
    html += '          <td class="ads-cell" align="center">\n'
    html +=
      '            <table role="presentation" cellpadding="0" cellspacing="0" border="0">\n'

    adsWithImage.forEach((ad: any, idx: number) => {
      const adImageUrl = ad.image.resized.w480
      const adUrl = ad.imageUrl || '#'
      const tdClass = idx === 0 ? 'ad-spacer' : ''
      html += `              <tr>\n                <td class="${tdClass}" align="center">\n`
      html += `                  <a href="${adUrl}"><img class="ad-img" src="${adImageUrl}" alt="${
        ad.name || '廣告'
      }" width="480"></a>\n`
      html += '                </td>\n              </tr>\n'
    })

    html += '            </table>\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '\n'
  }

  // ===== 04-Events (近期活動) =====
  if (events.length > 0) {
    html += '        <!-- ===== 04-Events (近期活動) ===== -->\n'
    html += '        <tr>\n'
    html += '          <td class="section-header" align="center">\n'
    html += '            近期活動\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '        <tr>\n'
    html += '          <td class="card-section">\n'
    html +=
      '            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'

    events.forEach((event: any, idx: number) => {
      const eventDate = formatDate(event.startDate)
      const eventUrl = `${WEB_URL_BASE}/event/${event.id}`
      const listClass =
        idx === events.length - 1 ? 'list-item-last' : 'list-item'
      html += `              <tr>\n                <td class="${listClass}">\n`
      html += `                  <div class="list-date">${eventDate}</div>\n`
      html += `                  <div class="list-title"><a class="muted-link" href="${eventUrl}">${event.name}</a></div>\n`
      html += `                  <div class="list-org">${
        event.organizer || ''
      }</div>\n`
      html += '                </td>\n              </tr>\n'
    })

    html += '            </table>\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '\n'
  }

  // ===== 05-Jobs (環境徵才) =====
  if (jobs.length > 0) {
    html += '        <!-- ===== 05-Jobs (環境徵才) ===== -->\n'
    html += '        <tr>\n'
    html += '          <td class="section-header" align="center">\n'
    html += '            環境徵才\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '        <tr>\n'
    html += '          <td class="card-section">\n'
    html +=
      '            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'

    jobs.forEach((job: any, idx: number) => {
      const jobDate = formatDate(job.startDate)
      const jobUrl = `${WEB_URL_BASE}/job/${job.id}`
      const listClass =
        idx === jobs.length - 1 ? 'list-item-last' : 'list-item-dark'
      html += `              <tr>\n                <td class="${listClass}">\n`
      html += `                  <div class="list-date">${jobDate}</div>\n`
      html += `                  <div class="list-title"><a class="muted-link" href="${jobUrl}">${job.title}</a></div>\n`
      html += `                  <div class="list-org">${
        job.company || ''
      }</div>\n`
      html += '                </td>\n              </tr>\n'
    })

    html += '            </table>\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '\n'
  }

  // ===== 06-Comment (推薦讀者回應) =====
  if (readerResponseText || readerResponseTitle) {
    html += '        <!-- ===== 06-Comment (推薦讀者回應) ===== -->\n'
    html += '        <tr>\n'
    html += '          <td class="section-header" align="center">\n'
    html += '            推薦讀者回應\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '        <tr>\n'
    html += '          <td class="comment-cell">\n'

    if (readerResponseText) {
      html += '            <p class="comment-quote">\n'
      html += `              ${readerResponseText}\n`
      html += '            </p>\n'
    }
    if (readerResponseTitle) {
      html += '            <p class="comment-source">\n'
      html += `              ${readerResponseTitle}\n`
      html += '            </p>\n'
    }
    if (readerResponseLink) {
      html += '            <p class="comment-read-more">\n'
      html += `              <a href="${readerResponseLink}">閱讀全文</a>\n`
      html += '            </p>\n'
    }

    html += '          </td>\n'
    html += '        </tr>\n'
    html += '\n'
  }

  return html
}

// 生成 Poll（心情互動）區塊 HTML
const generatePollHtml = async (
  context: any,
  newsletterId: string | number,
  pollId: string | number | null
) => {
  let html = ''

  if (!pollId) return html

  try {
    const poll = await context.query.Poll.findOne({
      where: { id: String(pollId) },
      query: `
        id
        content
        option1
        option2
        option3
        option4
        option5
        option1Image { resized { w480 } }
        option2Image { resized { w480 } }
        option3Image { resized { w480 } }
        option4Image { resized { w480 } }
        option5Image { resized { w480 } }
      `,
    })

    if (!poll) return html

    const pollDesc = poll.content || '留下今天看完電子報的心情'
    html += '        <!-- ===== 07-Poll (心情互動) ===== -->\n'
    html += '        <tr>\n'
    html += '          <td class="poll-cell">\n'
    html += '            <div class="poll-title">心情互動</div>\n'
    if (poll.content) {
      html += `            <!-- ${poll.content} -->\n`
    }
    html += `            <div class="poll-desc">${pollDesc}</div>\n`
    html += '\n'
    html +=
      '            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'

    const options = [
      { num: 1, text: poll.option1, image: poll.option1Image },
      { num: 2, text: poll.option2, image: poll.option2Image },
      { num: 3, text: poll.option3, image: poll.option3Image },
      { num: 4, text: poll.option4, image: poll.option4Image },
      { num: 5, text: poll.option5, image: poll.option5Image },
    ]

    for (const option of options) {
      if (!option.text) continue

      const voteUrl = `${WEB_URL_BASE}/newsletter/${newsletterId}?vote=${option.num}&utm_source=email`
      const imageUrl =
        option.image?.resized?.w480 || POLL_ICON_URLS[option.num - 1]
      const tdClass = option.num < 5 ? 'poll-option' : ''

      html += `              <!-- Option ${option.num} -->\n`
      html += `              <tr>\n                <td class="${tdClass}">\n`
      html += `                  <a class="poll-vote-link" href="${voteUrl}">\n`
      html +=
        '                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
      html += '                      <tr>\n'
      html +=
        '                        <td class="poll-radio-td" width="32" valign="middle">\n'
      if (option.num === 1) {
        html += '                          <!--[if mso]>\n'
        html +=
          '                          <v:oval style="width:20px;height:20px" strokecolor="#A0A0A2" strokeweight="2pt" fillcolor="#ffffff">\n'
        html += '                            <v:fill color="#ffffff"/>\n'
        html += '                          </v:oval>\n'
        html += '                          <![endif]-->\n'
      }
      html += '                          <!--[if !mso]><!-->\n'
      html += '                          <div class="poll-radio"></div>\n'
      html += '                          <!--<![endif]-->\n'
      html += '                        </td>\n'
      html += '                        <td valign="middle">\n'
      html +=
        '                          <table class="poll-bar-bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
      html += '                            <tr>\n'
      html +=
        '                              <td class="poll-bar-fill" width="0%">&nbsp;</td>\n'
      html += '                              <td class="poll-bar-label">\n'
      html += `                                <img class="poll-emoji" src="${imageUrl}" alt="" width="20" height="20">\n`
      html += `                                <span class="poll-text">${option.text}</span>\n`
      html += '                              </td>\n'
      html += '                            </tr>\n'
      html += '                          </table>\n'
      html += '                        </td>\n'
      html += '                      </tr>\n'
      html += '                    </table>\n'
      html += '                  </a>\n'
      html += '                </td>\n'
      html += '              </tr>\n'
    }

    html += '            </table>\n'
    html += '          </td>\n'
    html += '        </tr>\n'
    html += '\n'
  } catch (error) {
    console.error('生成 Poll HTML 時發生錯誤:', error)
  }

  return html
}

const listConfigurations = list({
  fields: {
    title: text({
      label: '電子報標題',
      validation: { isRequired: true },
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '首圖',
    }),
    sendDate: timestamp({
      label: '發送日期',
      validation: { isRequired: true },
    }),
    showMenu: checkbox({
      label: '顯示相關文章標題',
      defaultValue: false,
    }),
    showReadingRank: checkbox({
      label: '顯示閱讀排名',
      defaultValue: false,
    }),
    focusPosts: relationship({
      ref: 'Post',
      many: true,
      label: '焦點話題',
    }),
    relatedPosts: relationship({
      ref: 'Post',
      many: true,
      label: '相關文章',
    }),
    ads: relationship({
      ref: 'Ad',
      many: true,
      label: '廣告',
    }),
    events: relationship({
      ref: 'Event',
      many: true,
      label: '相關活動',
    }),
    jobs: relationship({
      ref: 'Job',
      many: true,
      label: '相關徵才',
    }),
    poll: relationship({
      ref: 'Poll.newsletters',
      label: '閱讀心情',
    }),
    readerResponseTitle: text({
      label: '讀者回應標題',
    }),
    readerResponseLink: text({
      label: '推薦讀者回應連結',
    }),
    originalUrl: text({
      label: '原始網址',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
    readerResponseText: text({
      label: '推薦讀者回應文字',
      ui: {
        displayMode: 'textarea',
      },
    }),
    standardHtml: text({
      label: '原始碼標準版',
      ui: {
        displayMode: 'textarea',
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
    beautifiedHtml: text({
      label: '原始碼美化版',
      ui: {
        displayMode: 'textarea',
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
    // Virtual field: 標準版 HTML + Poll（僅用於 CMS 顯示，不存入資料庫）
    standardHtmlWithPoll: virtual({
      label: '原始碼標準版',
      field: graphql.field({
        type: graphql.String,
        async resolve(item: Record<string, unknown>, args, context) {
          try {
            const standardHtml = (item.standardHtml as string) || ''
            if (!item.pollId) {
              return standardHtml
            }
            const pollHtml = await generatePollHtml(
              context,
              String(item.id),
              item.pollId as number
            )
            return standardHtml + pollHtml
          } catch (error) {
            console.error('生成 standardHtmlWithPoll 時發生錯誤:', error)
            return (item.standardHtml as string) || ''
          }
        },
      }),
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
        listView: { fieldMode: 'hidden' },
      },
    }),
    // Virtual field: 美化版 HTML + Poll（僅用於 CMS 顯示，不存入資料庫）
    beautifiedHtmlWithPoll: virtual({
      label: '原始碼美化版',
      field: graphql.field({
        type: graphql.String,
        async resolve(item: Record<string, unknown>, args, context) {
          try {
            const beautifiedHtml = (item.beautifiedHtml as string) || ''
            if (!item.pollId) {
              return beautifiedHtml
            }
            const pollHtml = await generatePollHtml(
              context,
              String(item.id),
              item.pollId as number
            )
            return beautifiedHtml + pollHtml
          } catch (error) {
            console.error('生成 beautifiedHtmlWithPoll 時發生錯誤:', error)
            return (item.beautifiedHtml as string) || ''
          }
        },
      }),
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
        listView: { fieldMode: 'hidden' },
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['title', 'sendDate', 'showMenu', 'showReadingRank'],
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
  hooks: {
    resolveInput: async ({ operation, resolvedData, item, context }) => {
      // 只對非 migrated（沒有 originalUrl）的 newsletter 生成 HTML
      const originalUrl = resolvedData.originalUrl ?? item?.originalUrl

      // 如果是 migrated 的電子報，不生成 HTML
      if (originalUrl) {
        return resolvedData
      }

      // 自動生成 HTML（用戶無法在 UI 編輯這些欄位）
      try {
        // 取得現有資料（用於 update 操作）
        let existingData: any = null
        if (operation === 'update' && item?.id) {
          existingData = await context.query.Newsletter.findOne({
            where: { id: String(item.id) },
            query: `
              title
              sendDate
              showMenu
              showReadingRank
              readerResponseText
              readerResponseTitle
              readerResponseLink
              relatedPosts { id }
              focusPosts { id }
              ads { id }
              events { id }
              jobs { id }
            `,
          })
        }

        const title = resolvedData.title ?? existingData?.title ?? '電子報'
        const sendDate = resolvedData.sendDate ?? existingData?.sendDate ?? null

        // 合併 resolvedData 和 existingData
        const showMenu =
          resolvedData.showMenu ?? existingData?.showMenu ?? false
        const showReadingRank =
          resolvedData.showReadingRank ?? existingData?.showReadingRank ?? false
        const readerResponseText =
          resolvedData.readerResponseText ??
          existingData?.readerResponseText ??
          ''
        const readerResponseTitle =
          resolvedData.readerResponseTitle ??
          existingData?.readerResponseTitle ??
          ''
        const readerResponseLink =
          resolvedData.readerResponseLink ??
          existingData?.readerResponseLink ??
          ''

        // 處理 relationship 的 connect/disconnect
        const getIds = (
          resolved: any,
          existing: any[],
          key: string
        ): string[] => {
          if (resolved?.[key]?.connect) {
            return resolved[key].connect.map((item: any) => item.id)
          } else if (resolved?.[key]?.set) {
            return resolved[key].set.map((item: any) => item.id)
          } else if (existing) {
            return existing.map((item: any) => item.id)
          }
          return []
        }

        const relatedPostIds = getIds(
          resolvedData,
          existingData?.relatedPosts,
          'relatedPosts'
        )
        const focusPostIds = getIds(
          resolvedData,
          existingData?.focusPosts,
          'focusPosts'
        )
        const adIds = getIds(resolvedData, existingData?.ads, 'ads')
        const eventIds = getIds(resolvedData, existingData?.events, 'events')
        const jobIds = getIds(resolvedData, existingData?.jobs, 'jobs')

        // 生成電子報 HTML（一般版與大字版內容結構相同，共用同一份 HTML）
        const html = await generateNewsletterHtml(
          context,
          title,
          sendDate ?? null,
          showMenu,
          showReadingRank,
          readerResponseText,
          readerResponseTitle,
          readerResponseLink,
          relatedPostIds,
          focusPostIds,
          adIds,
          eventIds,
          jobIds
        )

        // 將生成的 HTML 設置到 resolvedData
        resolvedData.standardHtml = html
        resolvedData.beautifiedHtml = html
      } catch (error) {
        console.error('生成電子報 HTML 時發生錯誤:', error)
      }

      return resolvedData
    },
  },
})

export default utils.addTrackingFields(listConfigurations)
