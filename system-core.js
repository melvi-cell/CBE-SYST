/*
====================================================
LEARNPRO SYSTEM CORE
Version: 1.0
Purpose:
- Speed up Firebase loading
- Cache frequently used data
- Reduce duplicate reads
- Persist data locally
====================================================
*/

class SystemCore {

    constructor() {

        this.memoryCache = {};
        this.loadingRequests = {};

        this.storagePrefix = "learnpro_";
        this.cacheExpiryMinutes = 15;
    }

    /*
    ==========================================
    GET COLLECTION DATA
    ==========================================
    */
    async getCollection(collectionName) {

        // Memory cache
        if (this.memoryCache[collectionName]) {
            console.log(`Loaded ${collectionName} from memory`);
            return this.memoryCache[collectionName];
        }

        // Local storage cache
        const cachedData = localStorage.getItem(
            this.storagePrefix + collectionName
        );

        const cacheTime = localStorage.getItem(
            this.storagePrefix + collectionName + "_time"
        );

        if (cachedData && cacheTime) {

            const age =
                (Date.now() - Number(cacheTime))
                / 1000 / 60;

            if (age < this.cacheExpiryMinutes) {

                const parsed = JSON.parse(cachedData);

                this.memoryCache[collectionName] = parsed;

                console.log(
                    `Loaded ${collectionName} from local cache`
                );

                return parsed;
            }
        }

        // Prevent duplicate Firebase calls
        if (this.loadingRequests[collectionName]) {
            return this.loadingRequests[collectionName];
        }

        console.log(
            `Downloading ${collectionName} from Firebase`
        );

        this.loadingRequests[collectionName] =
            firebase.firestore()
            .collection(collectionName)
            .get()
            .then(snapshot => {

                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                this.memoryCache[collectionName] = data;

                localStorage.setItem(
                    this.storagePrefix + collectionName,
                    JSON.stringify(data)
                );

                localStorage.setItem(
                    this.storagePrefix + collectionName + "_time",
                    Date.now()
                );

                delete this.loadingRequests[
                    collectionName
                ];

                return data;
            });

        return this.loadingRequests[collectionName];
    }

    /*
    ==========================================
    GET SINGLE DOCUMENT
    ==========================================
    */
    async getDocument(collectionName, docId) {

        const key =
            collectionName + "_" + docId;

        if (this.memoryCache[key]) {
            return this.memoryCache[key];
        }

        const doc = await firebase
            .firestore()
            .collection(collectionName)
            .doc(docId)
            .get();

        if (!doc.exists) {
            return null;
        }

        const data = {
            id: doc.id,
            ...doc.data()
        };

        this.memoryCache[key] = data;

        return data;
    }

    /*
    ==========================================
    CLEAR ONE CACHE
    ==========================================
    */
    clear(collectionName) {

        delete this.memoryCache[
            collectionName
        ];

        localStorage.removeItem(
            this.storagePrefix + collectionName
        );

        localStorage.removeItem(
            this.storagePrefix + collectionName + "_time"
        );

        console.log(
            `${collectionName} cache cleared`
        );
    }

    /*
    ==========================================
    CLEAR ALL CACHE
    ==========================================
    */
    clearAll() {

        Object.keys(localStorage)
            .forEach(key => {

                if (
                    key.startsWith(
                        this.storagePrefix
                    )
                ) {
                    localStorage.removeItem(key);
                }
            });

        this.memoryCache = {};

        console.log("All cache cleared");
    }

    /*
    ==========================================
    REFRESH COLLECTION
    ==========================================
    */
    async refresh(collectionName) {

        this.clear(collectionName);

        return await this.getCollection(
            collectionName
        );
    }

    /*
    ==========================================
    USER PROFILE CACHE
    ==========================================
    */
    saveUserProfile(profile) {

        localStorage.setItem(
            "learnpro_profile",
            JSON.stringify(profile)
        );
    }

    getUserProfile() {

        const data =
            localStorage.getItem(
                "learnpro_profile"
            );

        return data
            ? JSON.parse(data)
            : null;
    }
}

window.SystemCore = new SystemCore();

/*
==========================================
ENABLE FIRESTORE CACHE
==========================================
*/

try {

    firebase.firestore()
        .enablePersistence({
            synchronizeTabs: true
        });

} catch (e) {

    console.log(
        "Persistence already enabled",
        e
    );
}