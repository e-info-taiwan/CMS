import { list } from '@keystone-6/core'
import {
  text,
  relationship,
  checkbox,
  timestamp,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

// 格式化日期為 "YYYY年MM月DD日" 格式
const formatDate = (dateString: string | null): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
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
          brief
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
      const imageUrl =
        post.heroImage?.resized?.w800 ||
        'https://placehold.co/560x320/e8e8e8/666666?text=新聞圖片'

      html += `    <!-- Article ${i + 1} -->\n`
      html += '    <div class="article-section">\n'
      html += `      <img src="${imageUrl}" alt="新聞圖片" class="article-image">\n`
      html += `      <h2 class="article-title">${post.title}</h2>\n`

      if (post.brief) {
        html += '      <p class="article-content">\n'
        html += `        ${post.brief}\n`
        html += '      </p>\n'
      }

      html += `      <div class="read-more"><a href="https://e-info.org.tw/node/${post.id}">閱讀更多</a></div>\n`
      html += '    </div>\n\n'
    }
  }

  // ===== 02-Highlight (焦點話題) =====
  if (focusPosts.length > 0) {
    html += '    <!-- ===== 02-Highlight (焦點話題) ===== -->\n'
    html += '    <div class="green-header">焦點話題</div>\n'
    html += '    \n'

    for (const post of focusPosts) {
      const imageUrl =
        post.heroImage?.resized?.w480 ||
        'https://placehold.co/120x120/d0d0d0/666666?text=Image'

      html += '    <div class="highlight-item">\n'
      html += `      <img src="${imageUrl}" alt="縮圖" class="highlight-thumb">\n`
      html += '      <div class="highlight-content">\n'
      html += `        <div class="highlight-title">${post.title}</div>\n`
      html += `        <div class="read-more"><a href="https://e-info.org.tw/node/${post.id}">閱讀更多</a></div>\n`
      html += '      </div>\n'
      html += '    </div>\n'
      html += '    \n'
    }
  }

  // ===== 03-Ranking (閱讀排名) =====
  // 注意：閱讀排名的資料需要從其他來源取得，這裡預留位置
  if (showReadingRank) {
    html += '    <!-- ===== 03-Ranking (閱讀排名) ===== -->\n'
    html += '    <div class="green-header">閱讀排名</div>\n'
    html += '    \n'
    html += '    <!-- 閱讀排名資料需要從其他來源取得 -->\n\n'
  }

  // ===== Ads (廣告) =====
  html += '    <!-- Ads -->\n'
  html += '    <div class="ads-section">\n'

  if (ads.length > 0) {
    for (const ad of ads) {
      const adImageUrl =
        ad.image?.resized?.w480 ||
        'https://placehold.co/280x280/e8e8e8/666666?text=廣告'
      const adUrl = ad.imageUrl || '#'

      html += `      <a href="${adUrl}" class="ad-link"><img src="${adImageUrl}" alt="${
        ad.name || '廣告'
      }" class="ad-image"></a>\n`
    }
  } else {
    html += '      <div class="ad-placeholder"><span>廣告</span></div>\n'
    html += '      <div class="ad-placeholder"><span>廣告</span></div>\n'
  }

  html += '    </div>\n\n'

  // ===== 04-Events (近期活動) =====
  if (events.length > 0) {
    html += '    <!-- ===== 04-Events (近期活動) ===== -->\n'
    html += '    <div class="green-header">近期活動</div>\n'
    html += '    \n'

    for (const event of events) {
      const eventDate = formatDate(event.startDate)

      html += '    <div class="event-item">\n'
      html += `      <div class="event-date">${eventDate}</div>\n`
      html += `      <div class="event-title">${event.name}</div>\n`
      html += `      <div class="event-org">${event.organizer || ''}</div>\n`
      html += '    </div>\n'
      html += '    \n'
    }
  }

  // ===== 05-Jobs (環境徵才) =====
  if (jobs.length > 0) {
    html += '    <!-- ===== 05-Jobs (環境徵才) ===== -->\n'
    html += '    <div class="green-header">環境徵才</div>\n'
    html += '    \n'

    for (const job of jobs) {
      const jobDate = formatDate(job.startDate)

      html += '    <div class="job-item">\n'
      html += `      <div class="job-date">${jobDate}</div>\n`
      html += `      <div class="job-title">${job.title}</div>\n`
      html += `      <div class="job-org">${job.company || ''}</div>\n`
      html += '    </div>\n'
      html += '    \n'
    }
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
      label: '顯示相關文章',
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
      ref: 'Poll',
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
        itemView: { fieldMode: 'read' },
      },
    }),
    beautifiedHtml: text({
      label: '原始碼美化版',
      ui: {
        displayMode: 'textarea',
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
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

      // 如果用戶手動設置了 standardHtml，不要覆蓋
      if (resolvedData.standardHtml !== undefined) {
        return resolvedData
      }

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

        // 生成 HTML
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
      } catch (error) {
        console.error('生成電子報 HTML 時發生錯誤:', error)
      }

      return resolvedData
    },
  },
})

export default utils.addTrackingFields(listConfigurations)
