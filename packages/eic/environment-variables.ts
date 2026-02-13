const {
  IS_UI_DISABLED,
  ACCESS_CONTROL_STRATEGY,
  PREVIEW_SERVER_ORIGIN,
  PREVIEW_SERVER_PATH,
  DATABASE_PROVIDER,
  DATABASE_URL,
  SESSION_SECRET,
  SESSION_MAX_AGE,
  GCS_BUCKET,
  FILES_BASE_URL,
  FILES_STORAGE_PATH,
  IMAGES_BASE_URL,
  IMAGES_STORAGE_PATH,
  MEMORY_CACHE_TTL,
  MEMORY_CACHE_SIZE,
  GCS_BASE_URL,
  INVALID_CDN_CACHE_SERVER_URL,
  INVALIDATE_CDN_PROJECT_ID,
  INVALIDATE_CDN_URL_MAP_NAME,
  INVALIDATE_CDN_ROUTE_PREFIX_CONFIG,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  WEB_URL_BASE,
} = process.env

const parseRoutePrefixConfig = () => {
  if (!INVALIDATE_CDN_ROUTE_PREFIX_CONFIG) {
    return undefined
  }
  try {
    return JSON.parse(INVALIDATE_CDN_ROUTE_PREFIX_CONFIG)
  } catch (error) {
    console.error(
      '[invalidate-cdn-cache] invalid INVALIDATE_CDN_ROUTE_PREFIX_CONFIG',
      error
    )
    return undefined
  }
}

enum DatabaseProvider {
  Sqlite = 'sqlite',
  Postgres = 'postgresql',
}

export default {
  isUIDisabled: IS_UI_DISABLED === 'true',
  memoryCacheTtl: Number.isNaN(Number(MEMORY_CACHE_TTL))
    ? 300_000
    : Number(MEMORY_CACHE_TTL),
  memoryCacheSize: Number.isNaN(Number(MEMORY_CACHE_SIZE))
    ? 300
    : Number(MEMORY_CACHE_SIZE),
  accessControlStrategy: ACCESS_CONTROL_STRATEGY || 'cms', // the value could be one of 'cms', 'gql' or 'preview'
  previewServer: {
    origin: PREVIEW_SERVER_ORIGIN || 'http://localhost:3001',
    path: PREVIEW_SERVER_PATH || '/preview-server',
  },
  database: {
    provider:
      DATABASE_PROVIDER === 'sqlite'
        ? DatabaseProvider.Sqlite
        : DatabaseProvider.Postgres,
    url: DATABASE_URL || 'postgres://00000000@localhost:5432/eic',
  },
  session: {
    secret:
      SESSION_SECRET ||
      'default_session_secret_and_it_should_be_more_than_32_characters',
    maxAge:
      (typeof SESSION_MAX_AGE === 'string' && parseInt(SESSION_MAX_AGE)) ||
      60 * 60 * 24 * 1, // 1 days
  },
  gcs: {
    bucket: GCS_BUCKET || 'statics-e-info-dev',
  },
  files: {
    baseUrl: FILES_BASE_URL || '/files',
    storagePath: FILES_STORAGE_PATH || 'public/files',
  },
  images: {
    baseUrl: IMAGES_BASE_URL || '/images',
    gcsBaseUrl:
      GCS_BASE_URL || 'https://storage.googleapis.com/statics-e-info-dev',
    storagePath: IMAGES_STORAGE_PATH || 'public/images',
  },
  invalidateCDNCacheServerURL: INVALID_CDN_CACHE_SERVER_URL,
  invalidateCDNCache: {
    projectId: INVALIDATE_CDN_PROJECT_ID || '',
    urlMapName: INVALIDATE_CDN_URL_MAP_NAME || '',
    routePrefixConfig: parseRoutePrefixConfig(),
  },
  ai: {
    gemini: {
      apiKey: GEMINI_API_KEY || '',
      model: GEMINI_MODEL || 'gemini-2.5-flash',
    },
  },
  webUrlBase:
    WEB_URL_BASE || 'https://eic-web-dev-1090198686704.asia-east1.run.app',
}
