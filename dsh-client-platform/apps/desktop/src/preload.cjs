const { contextBridge, ipcRenderer } = require('electron');

const invoke = (name) => (...args) => ipcRenderer.invoke(`dsh:${name}`, ...args);

contextBridge.exposeInMainWorld('dsh', Object.freeze({
  getStartupError: invoke('getStartupError'),
  retryStartup: invoke('retryStartup'),
  getStatus: invoke('getStatus'),
  getAgents: invoke('getAgents'),
  refreshAgents: invoke('refreshAgents'),
  getRuns: invoke('getRuns'),
  getRunDetail: invoke('getRunDetail'),
  getRunArtifacts: invoke('getRunArtifacts'),
  getArtifactContent: invoke('getArtifactContent'),
  recordHumanInput: invoke('recordHumanInput'),
  consentRun: invoke('consentRun'),
  cancelRun: invoke('cancelRun'),
  resumeRun: invoke('resumeRun'),
  getAgentSettings: invoke('getAgentSettings'),
  saveAgentSettings: invoke('saveAgentSettings'),
  preflight: invoke('preflight'),
  startRun: invoke('startRun'),
  pairCloud: invoke('pairCloud'),
  getCloudState: invoke('getCloudState'),
  getHumanInputSyncSetting: invoke('getHumanInputSyncSetting'),
  setHumanInputSyncEnabled: invoke('setHumanInputSyncEnabled'),
  syncNow: invoke('syncNow'),
  uploadReviewBundle: invoke('uploadReviewBundle'),
  chatMessage: invoke('chatMessage'),
  closeChatSession: invoke('closeChatSession'),
  chooseWorkspace: invoke('chooseWorkspace'),
  discoverWorkspaceOptions: invoke('discoverWorkspaceOptions'),
  pickLocalWorkspace: invoke('pickLocalWorkspace'),
  configureWorkspace: invoke('configureWorkspace'),
  probeWorkspace: invoke('probeWorkspace'),
  getWorkspace: invoke('getWorkspace'),
  onStartupErrorChanged(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('dsh:startupErrorChanged', listener);
    return () => ipcRenderer.removeListener('dsh:startupErrorChanged', listener);
  },
  onWorkspaceChanged(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('dsh:workspaceChanged', listener);
    return () => ipcRenderer.removeListener('dsh:workspaceChanged', listener);
  },
  onCloudStateChanged(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('dsh:cloudStateChanged', listener);
    return () => ipcRenderer.removeListener('dsh:cloudStateChanged', listener);
  },
  onWorkspaceProbeChanged(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = () => callback();
    ipcRenderer.on('dsh:workspaceProbeChanged', listener);
    return () => ipcRenderer.removeListener('dsh:workspaceProbeChanged', listener);
  },
}));
