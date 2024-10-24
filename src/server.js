const dns = require('native-dns');
const fs = require('fs');
const path = require('path');
const server = dns.createServer();
const records = require('./config/records.json');
const dnsForwarder = '8.8.8.8'; 
const logFilePath = path.join(__dirname, 'dns.log');

function logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;
    fs.appendFileSync(logFilePath, logEntry, { encoding: 'utf8' });
}

server.on('request', (request, response) => {
    const question = request.question[0];
    const domainName = question.name;

    logMessage(`Received query for domain: ${domainName}, Type: ${dns.consts.QTYPE_TO_NAME[question.type]}`);

    const record = records[domainName];
    if (record) {
        switch (question.type) {
            case dns.consts.NAME_TO_QTYPE.A:
                if (record.A) {
                    response.answer.push(dns.A({
                        name: domainName,
                        address: record.A,
                        ttl: record.ttl || 300,
                    }));
                    logMessage(`Responding with local A record for ${domainName}: ${record.A}`);
                }
                break;

            case dns.consts.NAME_TO_QTYPE.AAAA:
                if (record.AAAA) {
                    response.answer.push(dns.AAAA({
                        name: domainName,
                        address: record.AAAA,
                        ttl: record.ttl || 300,
                    }));
                    logMessage(`Responding with local AAAA record for ${domainName}: ${record.AAAA}`);
                }
                break;

            case dns.consts.NAME_TO_QTYPE.CNAME:
                if (record.CNAME) {
                    response.answer.push(dns.CNAME({
                        name: domainName,
                        data: record.CNAME,
                        ttl: record.ttl || 300,
                    }));
                    logMessage(`Responding with local CNAME record for ${domainName}: ${record.CNAME}`);
                }
                break;

            case dns.consts.NAME_TO_QTYPE.MX:
                if (record.MX) {
                    record.MX.forEach(mxRecord => {
                        response.answer.push(dns.MX({
                            name: domainName,
                            exchange: mxRecord.exchange,
                            priority: mxRecord.priority,
                            ttl: record.ttl || 300,
                        }));
                        logMessage(`Responding with local MX record for ${domainName}: ${mxRecord.exchange}`);
                    });
                }
                break;

            case dns.consts.NAME_TO_QTYPE.NS:
                if (record.NS) {
                    record.NS.forEach(nsRecord => {
                        response.answer.push(dns.NS({
                            name: domainName,
                            data: nsRecord,
                            ttl: record.ttl || 300,
                        }));
                        logMessage(`Responding with local NS record for ${domainName}: ${nsRecord}`);
                    });
                }
                break;

            case dns.consts.NAME_TO_QTYPE.TXT:
                if (record.TXT) {
                    record.TXT.forEach(txtRecord => {
                        response.answer.push(dns.TXT({
                            name: domainName,
                            data: txtRecord,
                            ttl: record.ttl || 300,
                        }));
                        logMessage(`Responding with local TXT record for ${domainName}: ${txtRecord}`);
                    });
                }
                break;

            case dns.consts.NAME_TO_QTYPE.PTR:
                if (record.PTR) {
                    response.answer.push(dns.PTR({
                        name: domainName,
                        data: record.PTR,
                        ttl: record.ttl || 300,
                    }));
                    logMessage(`Responding with local PTR record for ${domainName}: ${record.PTR}`);
                }
                break;

            case dns.consts.NAME_TO_QTYPE.SRV:
                if (record.SRV) {
                    record.SRV.forEach(srvRecord => {
                        response.answer.push(dns.SRV({
                            name: domainName,
                            port: srvRecord.port,
                            target: srvRecord.target,
                            priority: srvRecord.priority,
                            weight: srvRecord.weight,
                            ttl: record.ttl || 300,
                        }));
                        logMessage(`Responding with local SRV record for ${domainName}: ${srvRecord.target}`);
                    });
                }
                break;

            default:
                response.header.rcode = dns.consts.NAME_TO_RCODE.NOTIMP;
        }

        response.send();
    } else {
        logMessage(`Domain ${domainName} not found locally, forwarding query to ${dnsForwarder}`);

        const forwardRequest = dns.Request({
            question: request.question[0], 
            server: { address: dnsForwarder, port: 53, type: 'udp' },
            timeout: 5000,
        });

        forwardRequest.on('message', (err, forwardResponse) => {
            if (err) {
                console.error('Error forwarding request:', err);
                return;
            }
            logMessage(`Received response from upstream DNS server for ${domainName}`);
            forwardResponse.answer.forEach(answer => {
                response.answer.push(answer);
            });

            response.send();
        });

        forwardRequest.on('timeout', () => {
            logMessage(`Timeout occurred while forwarding request for ${domainName}`);
        });

        forwardRequest.send();
    }
});

server.on('error', (err) => {
    console.error('Server error:', err);
    logMessage(`Server error: ${err.message}`);
});

server.on('listening', () => {
    console.log('DNS server is listening');
    logMessage('DNS server started and listening on port 53');
});

server.serve(53); 
