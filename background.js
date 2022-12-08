modifyHeader('Access-Control-Allow-Origin', `*`, 'https://bsaber.com/*')
modifyHeader('Access-Control-Allow-Origin', `*`, 'https://cdn.beatsaver.com/*')
modifyHeader('Content-Security-Policy', `*`, 'https://cdn.beatsaver.com/*')
modifyHeader('Content-Security-Policy', '*', 'https://music.yandex.ru/*')

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

chrome.extension.onMessage.addListener((songName, sender, sendResponse) => {
  ;(async () => {
    const resp = await fetch('https://bsaber.com/?s=' + songName)
    const respText = await resp.text()

    const parser = new DOMParser()
    const root = parser.parseFromString(respText, 'text/html')

    const articles = [...root.getElementsByTagName('article')]
      .filter(el => el.getElementsByClassName('post-stat').length > 0)
      .map(el => ({
        title: el.querySelector('a[rel=bookmark]').title,
        url: el.querySelector('a[rel=bookmark]').href,
        likes: Number(
          el
            .getElementsByClassName('post-stat')[1]
            .innerText.replace(/\\n/g, '')
            .trim()
        ),
        dislikes: Number(
          el
            .getElementsByClassName('post-stat')[2]
            .innerText.replace(/\\n/g, '')
            .trim()
        ),
      }))
    sendResponse(articles)
  })()
  return true
})
