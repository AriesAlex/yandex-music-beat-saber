modifyHeader('Access-Control-Allow-Origin', `*`, 'https://bsaber.com/*')
modifyHeader('Access-Control-Allow-Origin', `*`, 'https://cdn.beatsaver.com/*')
modifyHeader(
  'Content-Security-Policy',
  `default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; `,
  'https://cdn.beatsaver.com/*'
)
modifyHeader(
  'Content-Security-Policy',
  `default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; `,
  'https://music.yandex.ru/*'
)

function modifyHeader(name, value, url) {
  chrome.webRequest.onHeadersReceived.addListener(
    details => {
      const responseHeaders = details.responseHeaders

      const header = responseHeaders.find(header => header.name == name)
      if (header) header.value = value
      else responseHeaders.push({ name, value })

      return { responseHeaders }
    },
    { urls: [url] },
    ['responseHeaders', 'extraHeaders', 'blocking']
  )
}
