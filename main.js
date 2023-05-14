const config = {
  showLoading: true,
  autoUpdateCache: false,
  autoUpdateCacheIntervalInDays: 30,
  sortSongsBy: 'rating', // default, rating
}

const audioPlayer = new Audio()
let audioEndedTimer = null
let lastPreviewBtn = null
let isPlaying = false

async function fetchArticles(songName) {
  console.debug('[YS<=>BS] Fetching', songName)
  const resp = await fetch('https://bsaber.com/?s=' + songName)
  const respText = await resp.text()

  const parser = new DOMParser()
  const root = parser.parseFromString(respText, 'text/html')

  const articles = [...root.getElementsByTagName('article')]
    .filter(el => el.getElementsByClassName('post-stat').length > 0)
    .map(el => ({
      title: el.querySelector('.entry-title').children[0].title,
      pageUrl: el.querySelector('.entry-title').children[0].href,
      imageUrl: el.querySelector('img')?.getAttribute('data-original'),
      previewUrl: el
        .querySelector('a.-listen')
        .getAttribute('onclick')
        .slice(68, -2),
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
  const songName = songEl
    .getElementsByClassName('d-track__name')[0]
    .children[0].textContent.trim()

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
    <div class="beatsaber" ondblclick='event.stopPropagation()' onclick='event.stopPropagation()'>
      <div class="bsButton">${song.articles.length}</div>
      <div class="bsPopup"></div>
    </div>
  `
  const bsPopup = songEl.getElementsByClassName('bsPopup')[0]
  if (config.sortSongsBy == 'rating')
    song.articles.sort((songA, songB) => {
      const songAPoints = songA.likes - songA.dislikes
      const songBPoints = songB.likes - songB.dislikes
      return songBPoints - songAPoints
    })
  for (const article of song.articles) {
    const bsArticle = document.createElement('div')
    bsPopup.appendChild(bsArticle)
    bsArticle.innerHTML = `
    <div class="bsArticle">
      <div class="image" style="background-image: url(${article.imageUrl})"></div>
      <div class="preview d-icon_play"></div>
      <a class="title" href="${article.pageUrl}" target="_blank">${article.title}</a>
      <div class="scores">
        <div class="likes">${article.likes}</div>
        <div class="dislikes">${article.dislikes}</div>
      </div>
    </div>
    `
    const previewBtn = bsArticle.getElementsByClassName('preview')[0]
    previewBtn.onclick = () => {
      if (lastPreviewBtn) lastPreviewBtn.className = 'preview d-icon_play'
      previewBtn.className = 'preview d-icon_pause'
      if (lastPreviewBtn == previewBtn && isPlaying) {
        previewBtn.className = 'preview d-icon_play'
        isPlaying = false
        lastPreviewBtn = previewBtn
        audioPlayer.pause()
        return
      }
      audioPlayer.src = article.previewUrl
      audioPlayer.play()
      isPlaying = true
      if (audioEndedTimer) clearTimeout(audioEndedTimer)
      audioEndedTimer = setTimeout(() => {
        if (isPlaying) previewBtn.click()
      }, 10000)
      lastPreviewBtn = previewBtn
      return
    }
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
  color: #f4f4f4;
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
  max-width: 800px;
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
  align-items: center;
}
.beatsaber .bsPopup .bsArticle .preview {
  cursor: pointer;
  min-height: 24px;
  min-width:  24px;
  width:      24px;
  height:     24px;
}
.beatsaber .bsPopup .bsArticle .image {
  min-height: 32px;
  min-width:  32px;
  width:      32px;
  height:     32px;
  background-position: center;
  background-size: cover;
  display: none;
  margin-right: 5px;
}
.beatsaber .bsPopup .bsArticle .title {
  width: 100%;
  color: inherit;
  margin: 0 15px;
  text-align: center;
  text-decoration: none;
  transition: .25s transform;
  transform: scale(1);
  cursor: pointer;
  overflow: hidden;
}
.beatsaber .bsPopup .bsArticle .title:hover {
  transform: scale(.95);
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
.beatsaber:hover .bsPopup .image {
  display: block;
}
.theme-white .beatsaber .bsPopup {
  background-color: #f6f5f3;
}
.theme-white .beatsaber .bsPopup .bsArticle .scores {
  font-weight: 700;
  color: #fff;
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
