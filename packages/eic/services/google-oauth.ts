import crypto from 'crypto'
import bcryptjs from 'bcryptjs'
import * as cookie from 'cookie'
import Iron from '@hapi/iron'
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library'
import { graphql } from '@keystone-6/core'
import type {
  BaseItem,
  BaseKeystoneTypeInfo,
  KeystoneConfig,
  KeystoneContext,
  SessionStrategy,
} from '@keystone-6/core/types'
import type express from 'express'
import appConfig from '../config'

export const OAUTH_STATE_COOKIE_NAME = 'eic-google-oauth-state'
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const GOOGLE_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
])

export type SealedOAuthState = {
  state: string
  nonce: string
  codeVerifier: string
  returnTo: string
  issuedAt: number
}

export type VerifiedGoogleIdentity = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture?: string
}

export type CmsAuthenticatedUser = {
  id: number
  name: string
  email: string
  role: string
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length || bufA.length === 0) {
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

export function sanitizeReturnTo(rawFrom: unknown): string {
  if (typeof rawFrom !== 'string') {
    return '/'
  }
  const trimmed = rawFrom.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('/signin') ||
    trimmed.startsWith('/init') ||
    trimmed.startsWith('/api/auth')
  ) {
    return '/'
  }
  return trimmed
}

export function computePkceCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url')
}

export function createOAuthStatePayload(rawFrom?: unknown): SealedOAuthState {
  return {
    state: crypto.randomBytes(32).toString('base64url'),
    nonce: crypto.randomBytes(32).toString('base64url'),
    codeVerifier: crypto.randomBytes(32).toString('base64url'),
    returnTo: sanitizeReturnTo(rawFrom),
    issuedAt: Date.now(),
  }
}

export async function sealOAuthState(
  payload: SealedOAuthState,
  secret: string
): Promise<string> {
  return Iron.seal(payload, secret, {
    ...Iron.defaults,
    ttl: OAUTH_STATE_TTL_MS,
  })
}

export async function unsealOAuthState(
  sealed: string,
  secret: string
): Promise<SealedOAuthState | null> {
  if (!sealed || typeof sealed !== 'string') {
    return null
  }
  try {
    const unsealed = (await Iron.unseal(sealed, secret, {
      ...Iron.defaults,
      ttl: OAUTH_STATE_TTL_MS,
    })) as Partial<SealedOAuthState>
    if (
      !unsealed ||
      typeof unsealed.state !== 'string' ||
      typeof unsealed.nonce !== 'string' ||
      typeof unsealed.codeVerifier !== 'string' ||
      typeof unsealed.issuedAt !== 'number'
    ) {
      return null
    }
    if (Date.now() - unsealed.issuedAt > OAUTH_STATE_TTL_MS) {
      return null
    }
    return {
      state: unsealed.state,
      nonce: unsealed.nonce,
      codeVerifier: unsealed.codeVerifier,
      returnTo: sanitizeReturnTo(unsealed.returnTo),
      issuedAt: unsealed.issuedAt,
    }
  } catch {
    return null
  }
}

export function resolveRedirectUri(req: express.Request): string {
  const configured = appConfig.googleOAuth.redirectUri
  if (configured) {
    return configured
  }
  const forwardedProto = (req.headers['x-forwarded-proto'] as string)
    ?.split(',')[0]
    ?.trim()
  const protocol =
    forwardedProto ||
    (process.env.NODE_ENV === 'production' ? 'https' : req.protocol || 'http')
  const forwardedHost = (req.headers['x-forwarded-host'] as string)
    ?.split(',')[0]
    ?.trim()
  const host = forwardedHost || req.get('host') || 'localhost:3000'
  return `${protocol}://${host}/api/auth/google/callback`
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    appConfig.googleOAuth.clientId && appConfig.googleOAuth.clientSecret
  )
}

export function createOAuth2Client(redirectUri: string): OAuth2Client {
  return new OAuth2Client(
    appConfig.googleOAuth.clientId,
    appConfig.googleOAuth.clientSecret,
    redirectUri
  )
}

export function buildGoogleAuthorizationUrl(
  oauth2Client: OAuth2Client,
  statePayload: SealedOAuthState
): string {
  const codeChallenge = computePkceCodeChallenge(statePayload.codeVerifier)
  return oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state: statePayload.state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    // Include OIDC nonce to bind the issued ID token to this specific login request
    ...({ nonce: statePayload.nonce } as Record<string, string>),
  })
}

export async function exchangeAndVerifyGoogleCode({
  oauth2Client,
  code,
  redirectUri,
  expectedClientId,
  statePayload,
}: {
  oauth2Client: OAuth2Client
  code: string
  redirectUri: string
  expectedClientId: string
  statePayload: SealedOAuthState
}): Promise<VerifiedGoogleIdentity> {
  const { tokens } = await oauth2Client.getToken({
    code,
    codeVerifier: statePayload.codeVerifier,
    redirect_uri: redirectUri,
  })

  if (!tokens || typeof tokens.id_token !== 'string' || !tokens.id_token) {
    throw new Error('Missing id_token from Google token response')
  }

  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: expectedClientId,
  })

  const payload = ticket.getPayload()
  if (!payload) {
    throw new Error('Empty Google ID token payload')
  }

  const audMatches = Array.isArray(payload.aud)
    ? payload.aud.includes(expectedClientId)
    : payload.aud === expectedClientId
  if (!audMatches) {
    throw new Error('Google ID token audience mismatch')
  }

  if (!payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) {
    throw new Error('Google ID token issuer mismatch')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) {
    throw new Error('Google ID token has expired')
  }

  if (
    typeof payload.nonce !== 'string' ||
    !timingSafeEqualString(payload.nonce, statePayload.nonce)
  ) {
    throw new Error('Google ID token nonce mismatch')
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Google ID token missing subject')
  }

  const email =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  if (!email || payload.email_verified !== true) {
    const unverifiedError = new Error('Google account email is not verified')
    ;(unverifiedError as Error & { code?: string }).code = 'UNVERIFIED_EMAIL'
    throw unverifiedError
  }

  return {
    sub: payload.sub,
    email,
    emailVerified: true,
    name: (payload.name || email.split('@')[0] || 'User').trim(),
    picture: payload.picture,
  }
}

type PrismaUserDelegate = {
  findFirst: (
    args: Record<string, unknown>
  ) => Promise<CmsAuthenticatedUser | null>
  findUnique: (
    args: Record<string, unknown>
  ) => Promise<CmsAuthenticatedUser | null>
  count: () => Promise<number>
  create: (args: Record<string, unknown>) => Promise<CmsAuthenticatedUser>
}

type PrismaClientWithUser = {
  user: PrismaUserDelegate
  $transaction?: <T>(fn: (tx: PrismaClientWithUser) => Promise<T>) => Promise<T>
}

async function findUserByEmailCaseInsensitive(
  prismaUserDelegate: PrismaUserDelegate,
  normalizedEmail: string
): Promise<CmsAuthenticatedUser | null> {
  try {
    const matched = await prismaUserDelegate.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })
    if (matched) {
      return matched
    }
  } catch {
    // Fallback for SQLite or environments where mode: 'insensitive' is unsupported
  }

  const exactMatch = await prismaUserDelegate.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })
  return exactMatch || null
}

export async function findOrBootstrapCmsUser(
  context: KeystoneContext,
  googleIdentity: VerifiedGoogleIdentity
): Promise<CmsAuthenticatedUser | null> {
  const sudoPrisma = context.sudo().prisma as unknown as PrismaClientWithUser
  const normalizedEmail = googleIdentity.email.trim().toLowerCase()

  const existingUser = await findUserByEmailCaseInsensitive(
    sudoPrisma.user,
    normalizedEmail
  )
  if (existingUser) {
    return existingUser
  }

  const bootstrapFirstUser = async (
    tx: PrismaClientWithUser
  ): Promise<CmsAuthenticatedUser | null> => {
    const count = await tx.user.count()
    if (count > 0) {
      return null
    }
    const randomPasswordHash = await bcryptjs.hash(
      crypto.randomBytes(32).toString('hex'),
      10
    )
    return tx.user.create({
      data: {
        name: googleIdentity.name || normalizedEmail.split('@')[0] || 'Admin',
        email: normalizedEmail,
        password: randomPasswordHash,
        role: 'admin',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })
  }

  if (typeof sudoPrisma.$transaction === 'function') {
    return sudoPrisma.$transaction(async (tx: PrismaClientWithUser) =>
      bootstrapFirstUser(tx)
    )
  }

  return bootstrapFirstUser(sudoPrisma)
}

function getClientIp(req: express.Request): string {
  const forwarded = (req.headers['x-forwarded-for'] as string)
    ?.split(',')[0]
    ?.trim()
  const realIp = (req.headers['x-real-ip'] as string)?.trim()
  const rawIp = forwarded || realIp || req.socket?.remoteAddress || 'unknown'
  if (rawIp === '::1' || rawIp === '::ffff:127.0.0.1') {
    return '127.0.0.1'
  }
  return rawIp
}

function appendSetCookieHeader(res: express.Response, newCookie: string) {
  const existing = res.getHeader('Set-Cookie')
  if (!existing) {
    res.setHeader('Set-Cookie', newCookie)
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing.map(String), newCookie])
  } else {
    res.setHeader('Set-Cookie', [String(existing), newCookie])
  }
}

function buildSigninErrorRedirect(
  errorCode: string,
  returnTo?: string
): string {
  const params = new URLSearchParams({ error: errorCode })
  const safeFrom = sanitizeReturnTo(returnTo)
  if (safeFrom && safeFrom !== '/') {
    params.set('from', safeFrom)
  }
  return `/signin?${params.toString()}`
}

export function registerGoogleOAuthRoutes(
  app: express.Express,
  commonContext: KeystoneContext
) {
  const isProd = process.env.NODE_ENV === 'production'

  app.get('/api/auth/google/start', async (req, res) => {
    const returnTo = sanitizeReturnTo(req.query.from)

    if (!isGoogleOAuthConfigured()) {
      res.redirect(buildSigninErrorRedirect('oauth_not_configured', returnTo))
      return
    }

    try {
      const statePayload = createOAuthStatePayload(returnTo)
      const sealedState = await sealOAuthState(
        statePayload,
        appConfig.session.secret
      )
      const redirectUri = resolveRedirectUri(req)
      const oauth2Client = createOAuth2Client(redirectUri)
      const authorizationUrl = buildGoogleAuthorizationUrl(
        oauth2Client,
        statePayload
      )

      const stateCookie = cookie.serialize(
        OAUTH_STATE_COOKIE_NAME,
        sealedState,
        {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/api/auth/google',
          maxAge: Math.floor(OAUTH_STATE_TTL_MS / 1000),
        }
      )

      res.setHeader('Cache-Control', 'no-store, max-age=0')
      res.setHeader('Set-Cookie', stateCookie)
      res.redirect(authorizationUrl)
    } catch (error) {
      console.error('[Google OAuth] Failed to initiate OAuth flow:', error)
      res.redirect(buildSigninErrorRedirect('oauth_failed', returnTo))
    }
  })

  app.get('/api/auth/google/callback', async (req, res) => {
    const clearStateCookie = cookie.serialize(OAUTH_STATE_COOKIE_NAME, '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/auth/google',
      maxAge: 0,
      expires: new Date(0),
    })

    res.setHeader('Cache-Control', 'no-store, max-age=0')

    if (!isGoogleOAuthConfigured()) {
      appendSetCookieHeader(res, clearStateCookie)
      res.redirect(buildSigninErrorRedirect('oauth_not_configured'))
      return
    }

    const cookies = cookie.parse(req.headers.cookie || '')
    const rawSealedState = cookies[OAUTH_STATE_COOKIE_NAME] || ''
    const statePayload = await unsealOAuthState(
      rawSealedState,
      appConfig.session.secret
    )

    const queryState =
      typeof req.query.state === 'string' ? req.query.state : ''
    const queryCode = typeof req.query.code === 'string' ? req.query.code : ''
    const queryError =
      typeof req.query.error === 'string' ? req.query.error : ''

    if (
      !statePayload ||
      !timingSafeEqualString(queryState, statePayload.state)
    ) {
      console.warn('[登入日誌] Google OAuth 登入失敗:', {
        timestamp: new Date().toISOString(),
        reason: 'invalid_state',
        ipAddress: getClientIp(req),
      })
      appendSetCookieHeader(res, clearStateCookie)
      res.redirect(
        buildSigninErrorRedirect('invalid_state', statePayload?.returnTo)
      )
      return
    }

    if (queryError || !queryCode) {
      console.warn('[登入日誌] Google OAuth 登入失敗:', {
        timestamp: new Date().toISOString(),
        reason: queryError || 'missing_code',
        ipAddress: getClientIp(req),
      })
      appendSetCookieHeader(res, clearStateCookie)
      res.redirect(
        buildSigninErrorRedirect('oauth_failed', statePayload.returnTo)
      )
      return
    }

    try {
      const redirectUri = resolveRedirectUri(req)
      const oauth2Client = createOAuth2Client(redirectUri)

      const googleIdentity = await exchangeAndVerifyGoogleCode({
        oauth2Client,
        code: queryCode,
        redirectUri,
        expectedClientId: appConfig.googleOAuth.clientId,
        statePayload,
      })

      const reqContext = await commonContext.withRequest(req, res)
      const cmsUser = await findOrBootstrapCmsUser(reqContext, googleIdentity)

      if (!cmsUser || !cmsUser.role) {
        console.warn('[登入日誌] Google OAuth 登入失敗:', {
          timestamp: new Date().toISOString(),
          reason: 'user_not_in_allowlist',
          email: googleIdentity.email,
          ipAddress: getClientIp(req),
        })
        appendSetCookieHeader(res, clearStateCookie)
        res.redirect(
          buildSigninErrorRedirect('unauthorized', statePayload.returnTo)
        )
        return
      }

      if (!reqContext.sessionStrategy) {
        throw new Error('No sessionStrategy configured on Keystone context')
      }

      await reqContext.sessionStrategy.start({
        data: {
          listKey: 'User',
          itemId: String(cmsUser.id),
          email: cmsUser.email.trim().toLowerCase(),
          authProvider: 'google',
          issuedAt: Date.now(),
        },
        context: reqContext,
      })

      appendSetCookieHeader(res, clearStateCookie)

      console.log('[登入日誌]', {
        timestamp: new Date().toISOString(),
        userId: cmsUser.id,
        email: cmsUser.email,
        name: cmsUser.name,
        role: cmsUser.role,
        authMethod: 'google-oauth',
        ipAddress: getClientIp(req),
      })

      res.redirect(statePayload.returnTo || '/')
    } catch (error: unknown) {
      const errObj = error as { code?: string; message?: string } | undefined
      const errorCode =
        errObj?.code === 'UNVERIFIED_EMAIL'
          ? 'unverified_email'
          : 'oauth_failed'
      console.warn('[登入日誌] Google OAuth 登入失敗:', {
        timestamp: new Date().toISOString(),
        reason: errObj?.message || errorCode,
        ipAddress: getClientIp(req),
      })
      appendSetCookieHeader(res, clearStateCookie)
      res.redirect(buildSigninErrorRedirect(errorCode, statePayload.returnTo))
    }
  })
}

export type GoogleSessionData = {
  id: string
  name: string
  email: string
  role: string
}

export function withGoogleSessionData(
  _sessionStrategy: SessionStrategy<Record<string, unknown>>
): SessionStrategy<{
  listKey: string
  itemId: string
  data: GoogleSessionData
}> {
  const { get, ...sessionStrategy } = _sessionStrategy
  const maxAgeMs = appConfig.session.maxAge * 1000

  return {
    ...sessionStrategy,
    get: async ({ context }) => {
      if (!context?.req) {
        return
      }

      // Prevent external Bearer token injection: only accept the HttpOnly
      // session cookie issued by the server-side Google OAuth callback.
      const originalAuthHeader = context.req.headers.authorization
      if (originalAuthHeader) {
        delete context.req.headers.authorization
      }

      let rawSession: Record<string, unknown> | undefined
      try {
        rawSession = await get({ context })
      } finally {
        if (originalAuthHeader) {
          context.req.headers.authorization = originalAuthHeader
        }
      }

      if (
        !rawSession ||
        rawSession.authProvider !== 'google' ||
        rawSession.listKey !== 'User' ||
        !rawSession.itemId ||
        typeof rawSession.email !== 'string' ||
        typeof rawSession.issuedAt !== 'number'
      ) {
        return
      }

      if (Date.now() - rawSession.issuedAt > maxAgeMs) {
        return
      }

      const numericId = Number(rawSession.itemId)
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return
      }

      try {
        const sudoPrisma = context.sudo()
          .prisma as unknown as PrismaClientWithUser
        const user = await sudoPrisma.user.findUnique({
          where: { id: numericId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })

        if (!user || !user.email || !user.role) {
          return
        }

        if (
          user.email.trim().toLowerCase() !==
          rawSession.email.trim().toLowerCase()
        ) {
          return
        }

        return {
          listKey: 'User',
          itemId: String(user.id),
          data: {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        }
      } catch {
        return
      }
    },
  }
}

export function withGoogleAuth<TypeInfo extends BaseKeystoneTypeInfo>(
  keystoneConfig: KeystoneConfig<TypeInfo>
): KeystoneConfig<TypeInfo> {
  if (!keystoneConfig.session) {
    throw new TypeError('Missing .session configuration')
  }

  let { ui } = keystoneConfig
  if (!ui?.isDisabled) {
    const {
      isAccessAllowed = (context: KeystoneContext) =>
        Boolean(context.session?.data),
      pageMiddleware,
      publicPages = [],
    } = ui || {}

    ui = {
      ...ui,
      publicPages: Array.from(new Set([...publicPages, '/signin'])),
      isAccessAllowed: async (context: KeystoneContext) => {
        return isAccessAllowed(context)
      },
      pageMiddleware: async (args) => {
        const { context, wasAccessAllowed } = args
        const reqUrl = context.req?.url || '/'
        const { pathname } = new URL(reqUrl, 'http://_')

        if (pathname === '/signin' && context.session?.data) {
          return { kind: 'redirect', to: '/' }
        }

        if (!wasAccessAllowed && pathname !== '/signin') {
          if (pathname === '/') {
            return { kind: 'redirect', to: '/signin' }
          }
          return {
            kind: 'redirect',
            to: `/signin?from=${encodeURIComponent(reqUrl)}`,
          }
        }

        return pageMiddleware?.(args)
      },
    }
  }

  const session = withGoogleSessionData(keystoneConfig.session)
  const existingExtendGraphqlSchema = keystoneConfig.extendGraphqlSchema
  const existingExtendExpressApp = keystoneConfig.server?.extendExpressApp

  const authExtendGraphqlSchema = graphql.extend((base) => ({
    query: {
      authenticatedItem: graphql.field({
        type: graphql.union({
          name: 'AuthenticatedItem',
          types: [base.object('User') as graphql.ObjectType<BaseItem>],
          resolveType: (_root, context) => context.session?.listKey,
        }),
        resolve(_root, _args, context) {
          const { session, db } = context
          if (
            (typeof session?.itemId === 'string' ||
              typeof session?.itemId === 'number') &&
            session.listKey === 'User'
          ) {
            const targetDb =
              typeof context.sudo === 'function' ? context.sudo().db : db
            return targetDb.User.findOne({
              where: { id: String(session.itemId) },
            })
          }
          return null
        },
      }),
    },
  }))

  return {
    ...keystoneConfig,
    ui,
    session,
    extendGraphqlSchema: (schema) => {
      const schemaWithAuth = authExtendGraphqlSchema(schema)
      return existingExtendGraphqlSchema
        ? existingExtendGraphqlSchema(schemaWithAuth)
        : schemaWithAuth
    },
    server: {
      ...keystoneConfig.server,
      extendExpressApp: async (app, context) => {
        registerGoogleOAuthRoutes(app, context)
        if (existingExtendExpressApp) {
          await existingExtendExpressApp(app, context)
        }
      },
    },
  }
}
