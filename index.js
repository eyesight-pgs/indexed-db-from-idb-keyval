class IdbStore {
	constructor(dbName = 'default_database', storeName = 'default_store') {
		this.storeName = storeName;
		this._dbp = new Promise((resolve, reject) => {
			const openreq = indexedDB.open(dbName, 1);
			openreq.onerror = () => reject(openreq.error);
			openreq.onsuccess = () => resolve(openreq.result);
			// First time setup: create an empty object store
			openreq.onupgradeneeded = () => {
				openreq.result.createObjectStore(storeName);
			};
		});
	}
	_withIDBStore(type, callback) {
		return this._dbp.then(db => new Promise((resolve, reject) => {
			const transaction = db.transaction(this.storeName, type);
			transaction.oncomplete = () => resolve();
			transaction.onabort = transaction.onerror = () => reject(transaction.error);
			callback(transaction.objectStore(this.storeName));
		}));
	}
}
let store;
function getDefaultStore() {
	if (!store)
		store = new IdbStore();
	return store;
}
function idbGet(key, store = getDefaultStore()) {
	let req;
	return store._withIDBStore('readonly', store => {
		req = store.get(key);
	}).then(() => req.result);
}
function idbSet(key, value, store = getDefaultStore()) {
	return store._withIDBStore('readwrite', store => {
		store.put(value, key);
	});
}
function idbDel(key, store = getDefaultStore()) {
	return store._withIDBStore('readwrite', store => {
		store.delete(key);
	});
}
function idbClear(store = getDefaultStore()) {
	return store._withIDBStore('readwrite', store => {
		store.clear();
	});
}
function idbKeys(store = getDefaultStore()) {
	const keys = [];
	return store._withIDBStore('readonly', store => {
		// This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
		// And openKeyCursor isn't supported by Safari.
		(store.openKeyCursor || store.openCursor).call(store).onsuccess = function () {
			if (!this.result)
				return;
			keys.push(this.result.key);
			this.result.continue();
		};
	}).then(() => keys);
}

export { IdbStore, idbGet, idbSet, idbDel, idbClear, idbKeys };
