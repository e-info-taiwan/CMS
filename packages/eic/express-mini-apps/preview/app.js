import express from 'express'

import { createProxyMiddleware } from 'http-proxy-middleware'

// Cloud Run ID token cache — shared by every preview proxy. Refreshed in the
// background so `onProxyReq` can attach it synchronously (http-proxy-middleware
// v2's hook is sync).
let idTokenCache = { value: '', exp: 0 }
let idTokenPrefetchStarted = false

/**
 * @param {string} audience
 * @returns {Promise<void>}
 */
async function refreshIdToken(audience) {
  try {
    const r = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(
        audience
      )}`,
      { headers: { 'Metadata-Flavor': 'Google' } }
    )
    if (!r.ok) return
    const token = (await r.text()).trim()
    // ID tokens live 1h; refresh well before expiry.
    idTokenCache = { value: token, exp: Date.now() + 55 * 60 * 1000 }
  } catch {
    // Local dev / metadata unavailable — leave cache empty; requests will
    // proxy without Authorization header, which is fine when the target
    // still allows unauthenticated access.
  }
}

/**
 * @param {string} audience
 * @returns {void}
 */
function ensureIdTokenPrefetch(audience) {
  if (idTokenPrefetchStarted) return
  idTokenPrefetchStarted = true
  refreshIdToken(audience)
  const timer = setInterval(() => refreshIdToken(audience), 50 * 60 * 1000)
  // In Node the timer has .unref(); in browser typings it doesn't. Guard.
  if (typeof (/** @type {any} */ (timer)).unref === 'function') {
    ;(/** @type {any} */ (timer)).unref()
  }
}

/**
 * @param {{ setHeader: (name: string, value: string) => void }} proxyReq
 * @returns {void}
 */
function attachIdTokenHeader(proxyReq) {
  if (idTokenCache.value && Date.now() < idTokenCache.exp) {
    proxyReq.setHeader('authorization', `Bearer ${idTokenCache.value}`)
  }
}

/**
 *  @typedef {import('@keystone-6/core/types').KeystoneContext} KeystoneContext
 *
 *  @typedef {Object} PreviewServerConfig
 *  @property {string} origin
 *  @property {string} path
 *
 *  @param {Object} opts
 *  @param {PreviewServerConfig} opts.previewServer
 *  @param {KeystoneContext} opts.keystoneContext
 *  @returns {express.Router}
 */
export function createPreviewMiniApp({ previewServer, keystoneContext }) {
  const router = express.Router()

  // Audience = target Cloud Run service root URL (no path).
  const previewAudience = new URL(previewServer.origin).origin
  ensureIdTokenPrefetch(previewAudience)

  /**
   *  Check if the request is sent by an authenticated user
   *  @param {express.Request} req
   *  @param {express.Response} res
   *  @param {express.NextFunction} next
   */
  const authenticationMw = async (req, res, next) => {
    const context = await keystoneContext.withRequest(req, res)
    // User has been logged in
    if (context?.session?.data?.role) {
      return next()
    }

    // Otherwise, redirect them to login page
    res.redirect('/signin')
  }

  const previewProxyMiddleware = createProxyMiddleware({
    target: previewServer.origin,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (!previewServer?.path) return path
      return path.replace(new RegExp(`^${previewServer.path}`), '')
    },
    onProxyReq: attachIdTokenHeader,
    onProxyRes: (proxyRes) => {
      // The response from preview nuxt server might be with Cache-Control header.
      // However, we don't want to get cached responses for `draft` posts.
      // Therefore, we do not cache html response intentionlly by overwritting the Cache-Control header.
      proxyRes.headers['cache-control'] = 'no-store'
    },
  })

  const previewAssetProxyMiddleware = createProxyMiddleware({
    target: previewServer.origin,
    changeOrigin: true,
    onProxyReq: attachIdTokenHeader,
  })

  // proxy preview server traffic to subdirectory to prevent path collision between CMS and preview server
  router.get(
    '/images-next/*',
    createProxyMiddleware({
      target: previewServer.origin,
      changeOrigin: true,
      onProxyReq: attachIdTokenHeader,
    })
  )

  // Only proxy preview assets when the request comes from preview pages.
  // This avoids breaking CMS Admin UI assets under /_next.
  router.use('/_next', (req, res, next) => {
    const referer = req.headers.referer || ''
    if (referer.includes(previewServer.path)) {
      return previewAssetProxyMiddleware(req, res, next)
    }
    return next()
  })

  router.use('/lib/public', previewAssetProxyMiddleware)

  router.get(
    `${previewServer.path}/images-next/*`,
    createProxyMiddleware({
      target: previewServer.origin,
      changeOrigin: true,
      pathRewrite: (path) => {
        if (!previewServer?.path) return path
        return path.replace(new RegExp(`^${previewServer.path}`), '')
      },
      onProxyReq: attachIdTokenHeader,
    })
  )

  router.get(
    `${previewServer.path}/*`,
    authenticationMw,
    previewProxyMiddleware
  )

  router.use(
    `${previewServer.path}/_next/*`,
    createProxyMiddleware({
      target: previewServer.origin,
      changeOrigin: true,
      pathRewrite: (path) => {
        if (!previewServer?.path) return path
        return path.replace(new RegExp(`^${previewServer.path}`), '')
      },
      onProxyReq: attachIdTokenHeader,
    })
  )

  return router
}
