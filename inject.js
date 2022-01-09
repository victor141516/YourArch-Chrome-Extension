const HISTORY_URL = 'https://www.youtube.com/feed/history'
const INTERVAL = 3600_000
const IFRAME_ID = 'the-yourarch-iframe'

async function getBackendUrl() {
  return new Promise(res => {
    chrome.storage.local.get(['backendUrl'], (items) => {
      res(items?.backendUrl ?? 'https://yourarch-ingestor.viti.site')
    })
  })
}

function injectHistoryIframe() {
  if (window.location.href === HISTORY_URL) return
  const iframe = document.createElement('iframe')
  iframe.id = IFRAME_ID
  iframe.style.height = '50vh'
  iframe.style.position = 'absolute'
  iframe.src = HISTORY_URL
  document.body.insertBefore(iframe, document.body.childNodes[0])
}

function removeIframe() {
  document.getElementById(IFRAME_ID)?.remove()
}

function scrapeHistory() {
  return Array.from(document.querySelectorAll('ytd-video-renderer')).map(e => {
    const videoTitle = e.querySelector('#video-title > yt-formatted-string').textContent
    const videoId = e.querySelector('#video-title').href.replace('https://www.youtube.com/watch?v=', '').split('&')[0]
    const channelId = e.querySelector('#channel-name #text a').href.replace('https://www.youtube.com', '')
    return { videoTitle, videoId, channelId }
  })
}

/**
 * 
 * @param {{videoTitle: string, videoId: any, channelId: any}[]} items 
 */
async function sendItemsToBackend(items) {
  return fetch(`${await getBackendUrl()}/api/items`, {
    mode: 'cors',
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(items)
  })
}

/**
 * 
 * @returns {Promise<number>}
 */
 async function getLastCheck() {
  return new Promise(res => {
    chrome.storage.local.get(['lastCheck'], (items) => {
      res(items?.lastCheck ?? 0)
    })
  })
}

/**
 * 
 * @returns {Promise<void>}
 */
 async function setLastCheck() {
  return new Promise(res => {
    chrome.storage.local.set({lastCheck: new Date().getTime()}, () => res())
  })
}

function waitForLoadHistory() {
  return new Promise(res => {
    let prevHeight = 0
    const loopId = setInterval(()=> {
      const newHeight = document.querySelector('ytd-app').clientHeight
      if (prevHeight !==newHeight) {
        prevHeight = newHeight
      } else {
        clearInterval(loopId)
        res()
      }
    }, 2000)
  })
}


(async () => {
  if (window.location.href === HISTORY_URL) {
    // This will be executed in the iframe
    window.addEventListener('load', async () => {
      await waitForLoadHistory()
      await sendItemsToBackend(scrapeHistory())
      await setLastCheck()
      parent.window.postMessage('removetheiframe', '*');
    })
  } else {
    // This will be executed in the main frame to create a iframe containing the history 
    const lastCheck = await getLastCheck()
    console.log('YourArch: Last check:', lastCheck)
    if (lastCheck + INTERVAL - 1000 < new Date().getTime()) {
      injectHistoryIframe()
      window.addEventListener('message', ({data}) => {
        if (data === 'removetheiframe') removeIframe()
      }, {capture: false});

    } else console.log('YourArch: Too soon to scrape again')
  }
})()
