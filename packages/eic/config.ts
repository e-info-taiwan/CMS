import envVar from './environment-variables'

const withPreviewPoolTimeout = (url: string) => {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('pool_timeout', '20')
    return parsed.toString()
  } catch (error) {
    return url
  }
}

const database: { provider: 'postgresql' | 'sqlite'; url: string } = {
  provider: envVar.database.provider,
  url:
    envVar.accessControlStrategy === 'preview' &&
    envVar.database.provider === 'postgresql'
      ? withPreviewPoolTimeout(envVar.database.url)
      : envVar.database.url,
}

const session: { secret: string; maxAge: number } = {
  secret: envVar.session.secret,
  maxAge: envVar.session.maxAge,
}

const storage = {
  gcpUrlBase: `https://storage.googleapis.com/${envVar.gcs.bucket}/`,
  webUrlBase: `https://storage.googleapis.com/${envVar.gcs.bucket}/`,
  bucket: envVar.gcs.bucket,
  filename: 'original',
}

const googleCloudStorage = {
  origin: 'https://storage.googleapis.com',
  bucket: envVar.gcs.bucket,
}

const files = {
  baseUrl: envVar.files.baseUrl,
  storagePath: envVar.files.storagePath,
}

const images = {
  baseUrl: envVar.images.baseUrl,
  gcsBaseUrl: envVar.images.gcsBaseUrl,
  storagePath: envVar.images.storagePath,
}

export default {
  database,
  session,
  storage,
  googleCloudStorage,
  files,
  images,
}
