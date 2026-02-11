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

// 格式化日期為 "YYYY年MM月DD日" 格式
const formatDate = (dateString: string | null): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

// 根據 category 決定預設圖片
const getDefaultImage = (category: any): string => {
  // Use different default image for "編輯直送" category
  const isEditorCategory = category?.slug === 'editor'
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

  let html = ''

  // ===== 01-Content (本期內容) =====
  // 只要有相關文章就顯示本期內容（不受 showMenu 限制）
  if (relatedPosts.length > 0) {
    html += '    <!-- ===== 01-Content ===== -->\n'
    html += '    <div class="section-header">\n'
    html += '      本期內容\n'
    html += '    </div>\n'
    html += '    \n'
    html += '    <div class="toc-list">\n'

    for (const post of relatedPosts) {
      html += `      <div class="toc-item">${post.title}</div>\n`
    }

    html += '    </div>\n\n'
  }

  // ===== Article sections (相關文章) =====
  if (relatedPosts.length > 0) {
    for (let i = 0; i < relatedPosts.length; i++) {
      const post = relatedPosts[i]
      const postUrl = `${WEB_URL_BASE}/node/${post.id}`
      const imageUrl =
        post.heroImage?.resized?.w800 || getDefaultImage(post.category)

      html += `    <!-- Article ${i + 1} -->\n`
      html += '    <div class="article-section">\n'
      html += `      <a href="${postUrl}"><img src="${imageUrl}" alt="新聞圖片" class="article-image"></a>\n`
      html += `      <h2 class="article-title"><a href="${postUrl}">${post.title}</a></h2>\n`

      // 從內文提取前 150 字作為摘要
      const excerpt = extractTextFromContent(post.content, 150)
      html += '      <p class="article-content">\n'
      html += `        ${excerpt}<a href="${postUrl}" class="read-more">閱讀更多</a>\n`
      html += '      </p>\n'
      html += '    </div>\n\n'
    }
  }

  // ===== 02-Highlight (焦點話題) =====
  if (focusPosts.length > 0) {
    html += '    <!-- ===== 02-Highlight (焦點話題) ===== -->\n'
    html += '    <div class="green-header">焦點話題</div>\n'
    html += '    \n'
    html += '    <div class="highlight-list">\n'

    for (const post of focusPosts) {
      const postUrl = `${WEB_URL_BASE}/node/${post.id}`
      const imageUrl =
        post.heroImage?.resized?.w480 || getDefaultImage(post.category)

      html += '      <div class="highlight-item">\n'
      html += `        <a href="${postUrl}"><img src="${imageUrl}" alt="縮圖" class="highlight-thumb"></a>\n`
      html += '        <div class="highlight-content">\n'
      html += `          <div class="highlight-title"><a href="${postUrl}">${post.title}</a></div>\n`
      html += `          <div class="read-more"><a href="${postUrl}">閱讀更多</a></div>\n`
      html += '        </div>\n'
      html += '      </div>\n'
      html += '    \n'
    }

    html += '    </div>\n\n'
  }

  // ===== 03-Ranking (閱讀排名) =====
  if (showReadingRank) {
    // 從資料庫查詢指定的 3 篇文章作為閱讀排名
    let readingRankData: any[] = []

    try {
      const rankingPostIds = await fetchReadingRankFromJson()

      if (rankingPostIds && rankingPostIds.length > 0) {
        const posts = await context.query.Post.findMany({
          where: {
            id: { in: rankingPostIds },
          },
          query: `
          id
          title
          category {
            slug
          }
          heroImage {
            resized {
              w480
            }
          }
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
      // 發生錯誤時不產生閱讀排名
    }

    // 只有在有資料時才產生閱讀排名 HTML
    if (readingRankData.length > 0) {
      html += '    <!-- ===== 03-Ranking (閱讀排名) ===== -->\n'
      html += '    <div class="green-header">閱讀排名</div>\n'
      html += '    \n'
      html += '    <div class="ranking-list">\n'

      for (const item of readingRankData) {
        html += '      <div class="ranking-item">\n'
        html += `        <a href="${item.link}"><img src="${item.image}" alt="縮圖" class="ranking-thumb"></a>\n`
        html += `        <div class="ranking-number">${item.rank}</div>\n`
        html += '        <div class="ranking-content">\n'
        html += `          <div class="ranking-title"><a href="${item.link}">${item.title}</a></div>\n`
        html += `          <div class="read-more"><a href="${item.link}">閱讀更多</a></div>\n`
        html += '        </div>\n'
        html += '      </div>\n'
        html += '    \n'
      }

      html += '    </div>\n\n'
    }
  }

  // ===== Ads (廣告) =====

  if (ads.length > 0) {
    html += '    <!-- Ads -->\n'
    html += '    <div class="ads-section">\n'
    for (const ad of ads) {
      const adImageUrl = ad.image?.resized?.w480 || getDefaultImage(null)
      const adUrl = ad.imageUrl || '#'

      html += `      <a href="${adUrl}" class="ad-link"><img src="${adImageUrl}" alt="${
        ad.name || '廣告'
      }" class="ad-image"></a>\n`
    }

    html += '    </div>\n\n'
  }

  // ===== 04-Events (近期活動) =====
  if (events.length > 0) {
    html += '    <!-- ===== 04-Events (近期活動) ===== -->\n'
    html += '    <div class="green-header">近期活動</div>\n'
    html += '    \n'
    html += '    <div class="event-list">\n'

    for (const event of events) {
      const eventDate = formatDate(event.startDate)
      const eventUrl = `${WEB_URL_BASE}/event/${event.id}`

      html += '      <div class="event-item">\n'
      html += `        <div class="event-date">${eventDate}</div>\n`
      html += `        <div class="event-title"><a href="${eventUrl}">${event.name}</a></div>\n`
      html += `        <div class="event-org">${event.organizer || ''}</div>\n`
      html += '      </div>\n'
      html += '    \n'
    }

    html += '    </div>\n\n'
  }

  // ===== 05-Jobs (環境徵才) =====
  if (jobs.length > 0) {
    html += '    <!-- ===== 05-Jobs (環境徵才) ===== -->\n'
    html += '    <div class="green-header">環境徵才</div>\n'
    html += '    \n'
    html += '    <div class="job-list">\n'

    for (const job of jobs) {
      const jobDate = formatDate(job.startDate)
      const jobUrl = `${WEB_URL_BASE}/job/${job.id}`

      html += '      <div class="job-item">\n'
      html += `        <div class="job-date">${jobDate}</div>\n`
      html += `        <div class="job-title"><a href="${jobUrl}">${job.title}</a></div>\n`
      html += `        <div class="job-org">${job.company || ''}</div>\n`
      html += '      </div>\n'
      html += '    \n'
    }

    html += '    </div>\n\n'
  }

  // ===== 06-Comment (推薦讀者回應) =====
  if (readerResponseText || readerResponseTitle) {
    html += '    <!-- ===== 06-Comment (推薦讀者回應) ===== -->\n'
    html += '    <div class="green-header">推薦讀者回應</div>\n'
    html += '    \n'
    html += '    <div class="comment-section">\n'

    if (readerResponseText) {
      html += '      <p class="comment-quote">\n'
      html += `        ${readerResponseText}\n`
      html += '      </p>\n'
    }

    if (readerResponseTitle) {
      html += '      <p class="comment-source">\n'
      html += `        ${readerResponseTitle}\n`
      html += '      </p>\n'
    }

    if (readerResponseLink) {
      html += '      <div class="comment-link">\n'
      html += `        <a href="${readerResponseLink}">閱讀全文</a>\n`
      html += '      </div>\n'
    }

    html += '    </div>\n\n'
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

  // 如果沒有關聯 poll，返回空字串
  if (!pollId) {
    return html
  }

  try {
    // 查詢 poll 資料
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
        option1Image {
          resized {
            w480
          }
        }
        option2Image {
          resized {
            w480
          }
        }
        option3Image {
          resized {
            w480
          }
        }
        option4Image {
          resized {
            w480
          }
        }
        option5Image {
          resized {
            w480
          }
        }
      `,
    })

    if (!poll) {
      return html
    }

    // 生成 poll HTML
    html += '    <!-- ===== 08-Poll (心情互動) ===== -->\n'
    html += '    <div class="poll-section">\n'
    html += '      <div class="poll-title">心情互動</div>\n'

    if (poll.content) {
      html += `      <!-- ${poll.content} -->\n`
      html += `      <div class="poll-subtitle">${poll.content}</div>\n`
    } else {
      html +=
        '      <div class="poll-subtitle">留下今天看完電子報的心情</div>\n'
    }

    html += '\n'
    html += '      <div class="poll-options">\n'

    // 生成 5 個選項
    const options = [
      { num: 1, text: poll.option1, image: poll.option1Image },
      { num: 2, text: poll.option2, image: poll.option2Image },
      { num: 3, text: poll.option3, image: poll.option3Image },
      { num: 4, text: poll.option4, image: poll.option4Image },
      { num: 5, text: poll.option5, image: poll.option5Image },
    ]

    for (const option of options) {
      if (!option.text) continue // 跳過空選項

      const voteUrl = `${WEB_URL_BASE}/newsletter/${newsletterId}?vote=${option.num}&utm_source=email`
      const imageUrl =
        option.image?.resized?.w480 || POLL_ICON_URLS[option.num - 1]

      html += `        <!-- href: ${voteUrl} -->\n`
      html += `        <a href="${voteUrl}" class="poll-option-link">\n`
      html += '          <div class="poll-option">\n'
      html += '            <div class="poll-radio"></div>\n'
      html += '            <div class="poll-bar-container">\n'
      html += '              <div class="poll-bar" style="width: 15%;"></div>\n'
      html +=
        '              <div class="poll-option-content" style="left: 15%;">\n'
      html += `                <!-- option${option.num}ImageUrl -->\n`
      html += `                <img src="${imageUrl}" alt="" class="poll-image">\n`
      html += `                <span class="poll-text">${option.text}</span>\n`
      html += '              </div>\n'
      html += '            </div>\n'
      html += '          </div>\n'
      html += '        </a>\n'
      html += '\n'
    }

    html += '      </div>\n'
    html += '    </div>\n\n'
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
