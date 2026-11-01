import React, { useEffect, useMemo, useState } from 'react'
import { Box, Center, H1, Stack, Text, useTheme } from '@keystone-ui/core'
import { Button } from '@keystone-ui/button'
import { Notice } from '@keystone-ui/notice'
import { useRawKeystone } from '@keystone-6/core/admin-ui/context'
import { Head, useRouter } from '@keystone-6/core/admin-ui/router'

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized:
    '此 Google 帳號（Email）尚未被加入 CMS 的 User 名單中，請聯繫管理員新增帳號與角色權限。',
  unverified_email: '此 Google 帳號的 Email 尚未通過 Google 驗證，無法登入。',
  invalid_state:
    '登入驗證狀態已失效或過期（可能因停留過久或重複操作），請重新點擊登入。',
  oauth_not_configured:
    '系統尚未設定 Google OAuth 環境變數（GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET）。',
  oauth_failed: 'Google OAuth 驗證失敗，請再試一次。',
}

function sanitizeFromPath(rawFrom: unknown): string {
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

export default function SigninPage() {
  const { colors, shadow } = useTheme()
  const router = useRouter()
  const rawKeystone = useRawKeystone()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const redirectTarget = useMemo(
    () => sanitizeFromPath(router.query.from),
    [router.query.from]
  )

  const errorMessage = useMemo(() => {
    const rawError =
      typeof router.query.error === 'string' ? router.query.error : ''
    if (!rawError) {
      return null
    }
    return ERROR_MESSAGES[rawError] || ERROR_MESSAGES.oauth_failed
  }, [router.query.error])

  useEffect(() => {
    if (rawKeystone.authenticatedItem.state === 'authenticated') {
      router.replace(redirectTarget)
    }
  }, [rawKeystone.authenticatedItem.state, redirectTarget, router])

  const handleGoogleSignIn = () => {
    setIsRedirecting(true)
    const params = new URLSearchParams()
    if (redirectTarget && redirectTarget !== '/') {
      params.set('from', redirectTarget)
    }
    const query = params.toString()
    window.location.assign(
      query ? `/api/auth/google/start?${query}` : '/api/auth/google/start'
    )
  }

  return (
    <div>
      <Head>
        <title>Keystone - Sign in</title>
      </Head>
      <Center
        style={{
          minWidth: '100vw',
          minHeight: '100vh',
          backgroundColor: colors.backgroundMuted,
        }}
        rounding="medium"
      >
        <Box
          style={{
            background: colors.background,
            width: '100%',
            maxWidth: 520,
            boxShadow: shadow.s100,
          }}
          margin="medium"
          padding="xlarge"
          rounding="medium"
        >
          <Stack gap="xlarge">
            <Stack gap="small">
              <H1>Sign In</H1>
              <Text color="neutral600" size="small">
                請使用已設定於 CMS User 名單中的 Google (Gmail) 帳號登入
              </Text>
            </Stack>

            {errorMessage && (
              <Notice title="登入失敗" tone="negative">
                {errorMessage}
              </Notice>
            )}

            <Button
              weight="bold"
              tone="active"
              isLoading={isRedirecting}
              onClick={handleGoogleSignIn}
            >
              使用 Google 帳號登入
            </Button>
          </Stack>
        </Box>
      </Center>
    </div>
  )
}
