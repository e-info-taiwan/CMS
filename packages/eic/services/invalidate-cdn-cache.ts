import { v1 } from '@google-cloud/compute'

export type RoutePrefixConfig = {
  post: string
  ampPost?: string
  external?: string
  ampExternal?: string
  event?: string
  infoGraph?: string
  poll?: string
  timeline?: string
  newsletter?: string
  topic?: string
}

type InvalidateCdnConfig = {
  projectId: string
  urlMapName: string
  routePrefixConfig: RoutePrefixConfig
}

const computeClient = new v1.UrlMapsClient()

const buildPath = (routePrefix: string, itemId?: string | number) => {
  if (typeof itemId === 'undefined') {
    return routePrefix
  }
  return `${routePrefix}/${itemId}`
}

const invalidateByPath = async (config: InvalidateCdnConfig, path: string) => {
  return computeClient.invalidateCache({
    project: config.projectId,
    urlMap: config.urlMapName,
    cacheInvalidationRuleResource: {
      path,
    },
  })
}

export const invalidateByRoutes = async (
  config: InvalidateCdnConfig,
  routes: (string | undefined)[],
  itemId?: string | number
) => {
  const paths = routes
    .filter(Boolean)
    .map((route) => buildPath(route as string, itemId))

  for (const path of paths) {
    await invalidateByPath(config, path)
  }
}

export const invalidatePostCdnCache = async (
  config: InvalidateCdnConfig,
  itemId?: string | number
) => {
  await invalidateByRoutes(
    config,
    [config.routePrefixConfig.post, config.routePrefixConfig.ampPost],
    itemId
  )
}
