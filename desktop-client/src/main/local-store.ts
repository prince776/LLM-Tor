import Store from 'electron-store'

const store = new Store()

export function getStore(): Store {
  return store
}
