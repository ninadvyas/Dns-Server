const dns = require('dns');

function resolveDomainRecursively(domain, callback) {
    dns.resolve(domain, (err, addresses) => {
        if (err) callback(err, null);
        else callback(null, addresses);
    });
}

module.exports = { resolveDomainRecursively };
