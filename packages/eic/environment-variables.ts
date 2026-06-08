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
  DATA_SERVICES_ORIGIN,
  DATA_SERVICES_TAG_EMBEDDING_PATH,
  TAG_VERTEX_PROJECT,
  TAG_VERTEX_LOCATION,
  TAG_VERTEX_EMBEDDING_MODEL,
  TAG_VERTEX_EMBEDDING_DIMENSION,
  TAG_SIMILARITY_CHECK_ENABLED,
  TAG_SIMILARITY_DISTANCE_THRESHOLD,
  TAG_SIMILARITY_CHECK_LIMIT,
  POST_TITLE_SIMILARITY_MAX_DISTANCE,
  POST_TITLE_SIMILARITY_RESULT_LIMIT,
  POST_IDEA_SUGGESTION_MAX_DISTANCE,
  POST_IDEA_SUGGESTION_CANDIDATE_LIMIT,
  POST_IDEA_SUGGESTION_RESULT_LIMIT,
  POST_IDEA_SUGGESTION_STRONG_DISTANCE,
  POST_IDEA_SUGGESTION_WEAK_RESULT_LIMIT,
  POST_IDEA_SUGGESTION_MAX_RESULTS,
  PHOTO_SIMILARITY_MAX_DISTANCE,
  PHOTO_SIMILARITY_RESULT_LIMIT,
  FEATURE_TOGGLE_PHOTO_VECTOR,
  FEATURE_TOGGLE_TAG_VECTOR,
  FEATURE_TOGGLE_POST_VECTOR,
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

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
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
  accessControlStrategy: ACCESS_CONTROL_STRATEGY || 'cms', // the value could be one of 'cms', 'gql', 'preview' or 'restricted'
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
  dataServices: {
    origin: DATA_SERVICES_ORIGIN || '',
    tagEmbeddingPath: DATA_SERVICES_TAG_EMBEDDING_PATH || '/embeddings',
  },
  tagEmbedding: {
    vertex: {
      project: TAG_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '',
      location:
        TAG_VERTEX_LOCATION ||
        process.env.GOOGLE_CLOUD_LOCATION ||
        'us-central1',
      model: TAG_VERTEX_EMBEDDING_MODEL || 'gemini-embedding-001',
      outputDimensionality: numberFromEnv(TAG_VERTEX_EMBEDDING_DIMENSION, 1536),
    },
    similarityCheck: {
      enabled: TAG_SIMILARITY_CHECK_ENABLED === 'true',
      distanceThreshold: numberFromEnv(TAG_SIMILARITY_DISTANCE_THRESHOLD, 0.08),
      limit: numberFromEnv(TAG_SIMILARITY_CHECK_LIMIT, 5),
    },
  },
  postTitleSimilarity: {
    maxDistance: numberFromEnv(POST_TITLE_SIMILARITY_MAX_DISTANCE, 0.28),
    resultLimit: numberFromEnv(POST_TITLE_SIMILARITY_RESULT_LIMIT, 8),
  },
  postIdeaSuggestion: {
    maxDistance: numberFromEnv(POST_IDEA_SUGGESTION_MAX_DISTANCE, 0.62),
    candidateLimit: numberFromEnv(POST_IDEA_SUGGESTION_CANDIDATE_LIMIT, 50),
    resultLimit: numberFromEnv(POST_IDEA_SUGGESTION_RESULT_LIMIT, 10),
    // 相關／不相關分流：distance <= strongDistance 視為「較相關」（時間軸與完整清單主區，
    // 上限 maxResults）；strongDistance < distance <= maxDistance 視為「較不相關」，
    // 另以收折區呈現（上限 weakResultLimit）。
    strongDistance: numberFromEnv(POST_IDEA_SUGGESTION_STRONG_DISTANCE, 0.45),
    weakResultLimit: numberFromEnv(POST_IDEA_SUGGESTION_WEAK_RESULT_LIMIT, 5),
    maxResults: numberFromEnv(POST_IDEA_SUGGESTION_MAX_RESULTS, 30),
  },
  photoSimilarity: {
    maxDistance: numberFromEnv(PHOTO_SIMILARITY_MAX_DISTANCE, 0.22),
    resultLimit: numberFromEnv(PHOTO_SIMILARITY_RESULT_LIMIT, 10),
  },
  featureToggle: {
    photoVector: FEATURE_TOGGLE_PHOTO_VECTOR === 'true',
    tagVector: FEATURE_TOGGLE_TAG_VECTOR === 'true',
    postVector: FEATURE_TOGGLE_POST_VECTOR === 'true',
  },
  webUrlBase:
    WEB_URL_BASE || 'https://eic-web-dev-1090198686704.asia-east1.run.app',
}
