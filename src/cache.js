let cache = {};

function getCachedRecord(domain) {
    if (cache[domain]) {
        const { data, expiry } = cache[domain];
        if (expiry > Date.now()) return data;
    }
    return null;
}

function setCache(domain, data, ttl) {
    cache[domain] = {
        data,
        expiry: Date.now() + ttl * 1000
    };
}

module.exports = { getCachedRecord, setCache };
