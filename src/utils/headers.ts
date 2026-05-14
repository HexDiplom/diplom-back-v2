type MutableHeaders = Record<string, string | number | string[] | undefined>

export function appendHeadersPreservingSetCookie(target: MutableHeaders, source: Headers) {
  source.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      target[key] = value
    }
  })

  const setCookies = getSetCookieValues(source)
  if (setCookies.length === 0) return

  const current = target['set-cookie']
  target['set-cookie'] = [
    ...(Array.isArray(current) ? current : current === undefined ? [] : [String(current)]),
    ...setCookies,
  ]
}

function getSetCookieValues(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
  if (getSetCookie) return getSetCookie.call(headers)

  const setCookie = headers.get('set-cookie')
  return setCookie ? [setCookie] : []
}
