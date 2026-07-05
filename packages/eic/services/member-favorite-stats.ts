import type { KeystoneContext } from '@keystone-6/core/types'
import { GraphQLError } from 'graphql'
// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const favoriteQueryAccess = allowRoles(admin, moderator, editor)

async function canQueryMemberFavoriteStats(context: KeystoneContext) {
  return favoriteQueryAccess({
    session: context.session,
    context,
    listKey: 'Favorite',
    operation: 'query',
  })
}

export type MemberFavoriteSectionStats = {
  sectionId: string
  sectionName: string | null
  sectionSlug: string | null
  count: number
  postIds: string[]
}

export type MemberFavoriteStats = {
  total: number
  sections: MemberFavoriteSectionStats[]
}

const emptyMemberFavoriteStats = (): MemberFavoriteStats => ({
  total: 0,
  sections: [],
})

type SectionStatsRow = {
  sectionId: number
  sectionName: string | null
  sectionSlug: string | null
  count: number | bigint
  postIds: Array<number | bigint> | null
}

function toPostIds(postIds: SectionStatsRow['postIds']): string[] {
  if (!postIds) return []
  return postIds.map((id) => String(id))
}

export async function getMemberFavoriteStats(
  context: KeystoneContext,
  memberIdInput: string | number
): Promise<MemberFavoriteStats> {
  if (!(await canQueryMemberFavoriteStats(context))) {
    return emptyMemberFavoriteStats()
  }

  const memberId = Number(memberIdInput)
  if (!Number.isFinite(memberId)) {
    throw new GraphQLError('會員 id 無效', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  const member = await context.prisma.Member.findUnique({
    where: { id: memberId },
    select: { id: true },
  })

  if (!member) {
    throw new GraphQLError('找不到會員', { extensions: { code: 'NOT_FOUND' } })
  }

  const rows = (await context.prisma.$queryRaw`
    SELECT
      p."section" AS "sectionId",
      s.name AS "sectionName",
      s.slug AS "sectionSlug",
      COUNT(p.id)::int AS count,
      array_agg(p.id ORDER BY f."createdAt" DESC) AS "postIds"
    FROM "Favorite" f
    JOIN "Post" p ON p.id = f.post
    JOIN "Section" s ON s.id = p."section"
    WHERE f.member = ${memberId}
      AND p.state = 'published'
      AND p."section" IS NOT NULL
    GROUP BY p."section", s.id, s.name, s.slug, s."sortOrder"
    ORDER BY s."sortOrder" ASC
  `) as SectionStatsRow[]

  const sections: MemberFavoriteSectionStats[] = rows.map((row) => ({
    sectionId: String(row.sectionId),
    sectionName: row.sectionName,
    sectionSlug: row.sectionSlug,
    count: Number(row.count),
    postIds: toPostIds(row.postIds),
  }))

  const total = sections.reduce((sum, section) => sum + section.count, 0)

  return { total, sections }
}
