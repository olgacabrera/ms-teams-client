const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const atob = require('atob')

const details = {}

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      enableRemoteModule: false,
      devTools: true
    }
  })
  // console.log("Sanity Check #1");
  // Clear cache to force login screen (to get id_token)
  win.webContents.session.clearCache()
  win.webContents.session.clearAuthCache()
  win.webContents.session.clearStorageData()

  // Pretend to be standard Chrome browser (otherwise, MS Teams will run Electron-specific code and fail to start)
  win.webContents.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Safari/537.36'

  win.loadURL('https://teams.microsoft.com')

  //console.log("Sanity Check #2: Loaded Teams?");

  win.webContents.on('will-redirect', (_, url) => {
    
    const match = url.match(/go#id_token=([^&]+)/) // ---> http://www.cplusplus.com/reference/regex/
    console.log("this is match");
    console.log(match);
    
    if (match) {
      details.idToken = match[1]
      details.oid = JSON.parse(atob(match[1].split('.')[1])).oid //atob decoding specific format ---> https://developer.mozilla.org/en-US/docs/Web/API/atob
      console.log(atob(match[1].split('.')[1])); //curious to see what's printed
      console.log("idToken printed is ");
      console.log(details.idToken);
      console.log("oid printed is ");
      console.log(details.oid);
    }
  })

  win.webContents.on('did-stop-loading', () => {
    // Grab local storage from browser
    win.webContents.executeJavaScript('window.localStorage').then((result) => {
      // oid is required to retrieve most tokens
      if (!details.oid) return

      // grab tokens
      let token

      token = result[`ts.${details.oid}.auth.skype.token`]
      if (!token) return
      details.authSkype = JSON.parse(token)

      token = result[`ts.${details.oid}.cache.token.https://chatsvcagg.teams.microsoft.com`]
      if (!token) return
      details.chatSvcAggToken = JSON.parse(token)

      // add more required tokens here...

      // write credentials to file and exit
      // this implementation should be changed soon, but for reverse engineering, this is fine
      console.log("Details: ");
      console.log(details);
      fs.writeFileSync('ms-teams-credentials.local.json', JSON.stringify(details))
      console.log("Wrote To File");
      process.exit(0)
    })
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
