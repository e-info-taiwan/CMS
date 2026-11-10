/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-var-requires */
/* eslint-env jest, node */
// @ts-nocheck

const ORIGINAL_ENV = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...ORIGINAL_ENV,
    SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long!!',
    GOOGLE_OAUTH_CLIENT_ID: 'expected-client-id.apps.googleusercontent.com',
    GOOGLE_OAUTH_CLIENT_SECRET: 'expected-client-secret',
    GOOGLE_OAUTH_REDIRECT_URI:
      'https://cms.e-info.org.tw/api/auth/google/callback',
  }
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

test('sanitizeReturnTo allows valid internal paths and blocks open redirects or auth loops', () => {
  const { sanitizeReturnTo } = require('./google-oauth')

  expect(sanitizeReturnTo('/posts')).toBe('/posts')
  expect(sanitizeReturnTo('/users?page=2')).toBe('/users?page=2')
  expect(sanitizeReturnTo('https://evil.example.com')).toBe('/')
  expect(sanitizeReturnTo('//evil.example.com')).toBe('/')
  expect(sanitizeReturnTo('/\\evil.example.com')).toBe('/')
  expect(sanitizeReturnTo('/signin?from=/posts')).toBe('/')
  expect(sanitizeReturnTo('/api/auth/google/start')).toBe('/')
  expect(sanitizeReturnTo(undefined)).toBe('/')
})

test('sealOAuthState and unsealOAuthState verify integrity and reject cracker-forged state tokens', async () => {
  const {
    createOAuthStatePayload,
    sealOAuthState,
    unsealOAuthState,
  } = require('./google-oauth')

  const serverSecret = 'server-only-secret-at-least-32-characters-long-12345'
  const crackerSecret = 'cracker-own-secret-at-least-32-characters-long-99999'

  const statePayload = createOAuthStatePayload('/posts/123')
  const sealed = await sealOAuthState(statePayload, serverSecret)

  const unsealed = await unsealOAuthState(sealed, serverSecret)
  expect(unsealed).toEqual(statePayload)

  // Cracker-created token sealed with a different secret must be rejected
  const crackerToken = await sealOAuthState(statePayload, crackerSecret)
  const forgedResult = await unsealOAuthState(crackerToken, serverSecret)
  expect(forgedResult).toBeNull()
})

test('exchangeAndVerifyGoogleCode accepts valid Google ID token and rejects forged aud, nonce, or unverified email', async () => {
  const {
    createOAuthStatePayload,
    exchangeAndVerifyGoogleCode,
  } = require('./google-oauth')

  const statePayload = createOAuthStatePayload('/posts')
  const expectedClientId = 'expected-client-id.apps.googleusercontent.com'
  const validExp = Math.floor(Date.now() / 1000) + 3600

  const createMockOAuthClient = (payloadOverrides = {}) => ({
    getToken: jest.fn().mockResolvedValue({
      tokens: { id_token: 'signed-google-id-token' },
    }),
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({
        iss: 'https://accounts.google.com',
        aud: expectedClientId,
        sub: 'google-sub-123',
        email: 'Editor.User@gmail.com',
        email_verified: true,
        name: 'Editor User',
        nonce: statePayload.nonce,
        exp: validExp,
        ...payloadOverrides,
      }),
    }),
  })

  const validClient = createMockOAuthClient()
  const identity = await exchangeAndVerifyGoogleCode({
    oauth2Client: validClient,
    code: 'auth-code-from-google',
    redirectUri: 'https://cms.e-info.org.tw/api/auth/google/callback',
    expectedClientId,
    statePayload,
  })

  expect(validClient.getToken).toHaveBeenCalledWith({
    code: 'auth-code-from-google',
    codeVerifier: statePayload.codeVerifier,
    redirect_uri: 'https://cms.e-info.org.tw/api/auth/google/callback',
  })
  expect(identity).toEqual({
    sub: 'google-sub-123',
    email: 'editor.user@gmail.com',
    emailVerified: true,
    name: 'Editor User',
    picture: undefined,
  })

  // Cracker token from a different OAuth client_id (audience mismatch)
  await expect(
    exchangeAndVerifyGoogleCode({
      oauth2Client: createMockOAuthClient({
        aud: 'cracker-app-client-id.apps.googleusercontent.com',
      }),
      code: 'auth-code',
      redirectUri: 'https://cms.e-info.org.tw/api/auth/google/callback',
      expectedClientId,
      statePayload,
    })
  ).rejects.toThrow('Google ID token audience mismatch')

  // Replay / substituted token with wrong nonce
  await expect(
    exchangeAndVerifyGoogleCode({
      oauth2Client: createMockOAuthClient({
        nonce: 'forged-nonce-value',
      }),
      code: 'auth-code',
      redirectUri: 'https://cms.e-info.org.tw/api/auth/google/callback',
      expectedClientId,
      statePayload,
    })
  ).rejects.toThrow('Google ID token nonce mismatch')

  // Unverified email
  await expect(
    exchangeAndVerifyGoogleCode({
      oauth2Client: createMockOAuthClient({
        email_verified: false,
      }),
      code: 'auth-code',
      redirectUri: 'https://cms.e-info.org.tw/api/auth/google/callback',
      expectedClientId,
      statePayload,
    })
  ).rejects.toThrow('Google account email is not verified')
})

test('findOrBootstrapCmsUser reuses existing User role, blocks unlisted emails when users exist, and bootstraps first admin when empty', async () => {
  const { findOrBootstrapCmsUser } = require('./google-oauth')

  // 1) Existing user in User list keeps their existing role
  const existingUserContext = {
    sudo: () => ({
      prisma: {
        user: {
          findFirst: jest.fn().mockResolvedValue({
            id: 7,
            name: '既有主編',
            email: 'editor@gmail.com',
            role: 'moderator',
          }),
          findUnique: jest.fn(),
          count: jest.fn().mockResolvedValue(3),
          create: jest.fn(),
        },
      },
    }),
  }

  const matched = await findOrBootstrapCmsUser(existingUserContext, {
    sub: 'sub-1',
    email: 'editor@gmail.com',
    emailVerified: true,
    name: 'Google Name',
  })
  expect(matched).toEqual({
    id: 7,
    name: '既有主編',
    email: 'editor@gmail.com',
    role: 'moderator',
  })

  // 2) Unlisted email when User table is non-empty -> rejected (null)
  const unlistedContext = {
    sudo: () => ({
      prisma: {
        user: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(2),
          create: jest.fn(),
        },
      },
    }),
  }

  const rejected = await findOrBootstrapCmsUser(unlistedContext, {
    sub: 'sub-2',
    email: 'stranger@gmail.com',
    emailVerified: true,
    name: 'Stranger',
  })
  expect(rejected).toBeNull()

  // 3) Empty User table (count === 0) -> first login creates initial admin
  const createFirstAdmin = jest.fn().mockResolvedValue({
    id: 1,
    name: 'First Admin',
    email: 'first.admin@gmail.com',
    role: 'admin',
  })
  const emptyDbContext = {
    sudo: () => ({
      prisma: {
        user: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
          create: createFirstAdmin,
        },
      },
    }),
  }

  const bootstrapped = await findOrBootstrapCmsUser(emptyDbContext, {
    sub: 'sub-3',
    email: 'first.admin@gmail.com',
    emailVerified: true,
    name: 'First Admin',
  })
  expect(createFirstAdmin).toHaveBeenCalledTimes(1)
  expect(bootstrapped).toEqual({
    id: 1,
    name: 'First Admin',
    email: 'first.admin@gmail.com',
    role: 'admin',
  })
})

test('withGoogleSessionData strips Bearer header, rejects non-Google sessions, and validates live User record', async () => {
  const { withGoogleSessionData } = require('./google-oauth')

  let seenAuthHeader = 'not-checked'
  const baseSessionStrategy = {
    start: jest.fn(),
    end: jest.fn(),
    get: jest.fn().mockImplementation(async ({ context }) => {
      seenAuthHeader = context.req.headers.authorization
      return context.__mockUnsealedSession
    }),
  }

  const wrappedSession = withGoogleSessionData(baseSessionStrategy)

  const createContext = (mockUnsealedSession, dbUser) => ({
    __mockUnsealedSession: mockUnsealedSession,
    req: {
      headers: {
        authorization: 'Bearer cracker-forged-token',
        cookie: 'keystonejs-session=sealed-cookie',
      },
    },
    sudo: () => ({
      prisma: {
        user: {
          findUnique: jest.fn().mockResolvedValue(dbUser),
        },
      },
    }),
  })

  // Valid Google session matching live DB User
  const validCtx = createContext(
    {
      listKey: 'User',
      itemId: '5',
      email: 'volunteer@gmail.com',
      authProvider: 'google',
      issuedAt: Date.now(),
    },
    {
      id: 5,
      name: '志工 A',
      email: 'volunteer@gmail.com',
      role: 'contributor',
    }
  )

  const session = await wrappedSession.get({ context: validCtx })
  expect(seenAuthHeader).toBeUndefined()
  expect(session).toEqual({
    listKey: 'User',
    itemId: '5',
    data: {
      id: '5',
      name: '志工 A',
      email: 'volunteer@gmail.com',
      role: 'contributor',
    },
  })

  // Legacy password session without authProvider === 'google' must be rejected
  const legacyCtx = createContext(
    {
      listKey: 'User',
      itemId: '5',
    },
    {
      id: 5,
      name: '志工 A',
      email: 'volunteer@gmail.com',
      role: 'contributor',
    }
  )
  expect(await wrappedSession.get({ context: legacyCtx })).toBeUndefined()

  // Mismatched email between token and DB User must be rejected
  const mismatchedEmailCtx = createContext(
    {
      listKey: 'User',
      itemId: '5',
      email: 'attacker@gmail.com',
      authProvider: 'google',
      issuedAt: Date.now(),
    },
    {
      id: 5,
      name: '志工 A',
      email: 'volunteer@gmail.com',
      role: 'contributor',
    }
  )
  expect(
    await wrappedSession.get({ context: mismatchedEmailCtx })
  ).toBeUndefined()
})
