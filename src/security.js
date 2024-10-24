let requestCounts = {};
const RATE_LIMIT = 100; 
const ALLOWED_IPS = ['127.0.0.1', '192.168.1.100'];

function rateLimiter(clientIP) {
    if (!requestCounts[clientIP]) {
        requestCounts[clientIP] = 0;
    }
    requestCounts[clientIP]++;

    setTimeout(() => {
        requestCounts[clientIP]--;
    }, 60000);

    return requestCounts[clientIP] <= RATE_LIMIT;
}

function allowAccess(clientIP) {
    return ALLOWED_IPS.includes(clientIP);
}

module.exports = { rateLimiter, allowAccess };
