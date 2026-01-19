const { contextBridge } = require('electron');

// Espone funzionalità sicure al renderer (React)
contextBridge.exposeInMainWorld('electron', {
  // Puoi aggiungere qui funzioni se necessario in futuro
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});