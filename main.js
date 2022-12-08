const config = {
  showLoading: true,
  autoUpdateCache: false,
  autoUpdateCacheIntervalInDays: 30,
}

async function fetchArticles(songName) {
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
  return articles
}
function isSongInfoOutdated(lsKey) {
  if (!config.autoUpdateCache) return false
  const song = JSON.parse(localStorage[lsKey])
  const difference = new Date() - new Date(song.timestamp)
  const dayInMs = 86400000
  return difference >= dayInMs * config.autoUpdateCacheIntervalInDays
}
async function processSong(songEl) {
  const songName = songEl.getElementsByClassName('d-track__name')[0].title

  const bsEl = document.createElement('div')
  const container = songEl.getElementsByClassName(
    'd-track__overflowable-column'
  )[0]
  container.insertBefore(bsEl, container.children[1])
  if (config.showLoading) bsEl.innerHTML = '<div class="bsLoading">=/=</div>'

  const lsKey = 'beatsaber_cache_' + songName
  if (!localStorage[lsKey] || isSongInfoOutdated(lsKey))
    localStorage[lsKey] = JSON.stringify({
      articles: await fetchArticles(songName),
      timestamp: new Date(),
    })
  const song = JSON.parse(localStorage[lsKey])

  if (song.articles.length == 0) {
    bsEl.innerHTML = `<div class="beatsaber"></div>`
    return
  }
  bsEl.innerHTML = `
    <div class="beatsaber">
      <div class="bsButton">${song.articles.length}</div>
      <div class="bsPopup"></div>
    </div>
  `
  const bsPopup = songEl.getElementsByClassName('bsPopup')[0]
  for (const article of song.articles) {
    bsPopup.innerHTML += `
    <a class="bsArticle" href="${article.url}">
      <div class="title">${article.title}</div>
      <div class="scores">
        <div class="likes">${article.likes}</div>
        <div class="dislikes">${article.dislikes}</div>
      </div>
    </a>
    `
  }
}

async function loop() {
  const songElements = [...document.getElementsByClassName('d-track__name')]
    .map(el => el.parentElement.parentElement.parentElement)
    .filter(el => !el.outerHTML.includes('beatsaber'))

  if (songElements.length > 0) await processSong(songElements[0])
  if (songElements.length > 1) loop()
  else setTimeout(loop, 1500)
}
loop()

const styles = `
<style>
.beatsaber {
  position: relative;
}
.beatsaber .bsButton {
  width: 56px;
  height: 24px;
  background: linear-gradient(to bottom right, #d50403, #009acf);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.beatsaber .bsPopup {
  cursor: initial;
  position: absolute;
  top: 0;
  right: 150px;
  opacity: 0;
  padding: 15px;
  pointer-events: none;
  border-radius: 4px;
  background-color: #121212;
  transition: .25s opacity;
  max-height: 200px;
  overflow-y: scroll;
  z-index: 10;
  box-shadow: 2px  2px 5px 1px #009acf,
             -2px -2px 5px 1px #d50403,
              0px  0px 3px 3px rgba(0, 0, 0, .1);
  -ms-overflow-style: none;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  gap: 15px;
  font-size: 16px;
}
.beatsaber .bsPopup::-webkit-scrollbar {
  display: none;
}
.beatsaber .bsPopup .bsArticle {
  width: 100%;
  display: flex;
  cursor: pointer;
  text-decoration: none;
  color: white;
  transition: .25s transform;
  transform: scale(1);
}
.beatsaber .bsPopup .bsArticle:hover {
  transform: scale(.95);
}
.beatsaber .bsPopup .bsArticle .title {
  margin-right: 15px;
  text-align: center;
  width: 100%;
}
.beatsaber .bsPopup .bsArticle .scores {
  display: flex;
  gap: 5px;
}
.beatsaber .bsPopup .bsArticle .scores .likes {
  text-shadow: 0px 0px 5px #009acf;
}
.beatsaber .bsPopup .bsArticle .scores .dislikes {
  text-shadow: 0px 0px 5px #d50403;
}
.beatsaber:hover .bsPopup {
  opacity: 1;
  pointer-events: initial;
}
.bsLoading {
  background-image: linear-gradient(to right, #d50403, #009acf);
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
`

let styleSheet = document.createElement('style')
styleSheet.type = 'text/css'
styleSheet.innerText = styles
document.head.appendChild(styleSheet)
