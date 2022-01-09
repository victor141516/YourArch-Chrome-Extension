window.addEventListener('load', () => {
  const urlEl = document.getElementById('url')
  const saveEl = document.getElementById('save')
  const confirmEl = document.getElementById('confirm')

  chrome.storage.local.get(['backendUrl'], (items) => {
    urlEl.value = items?.backendUrl ?? 'https://yourarch-ingestor.viti.site'
  })

  saveEl.addEventListener('click', () => {
    chrome.storage.local.set({backendUrl: urlEl.value}, () => {
      confirmEl.style.display = 'unset'
      setTimeout(() => {
        confirmEl.style.display = 'none'
      }, 1500)
    })
  })
})