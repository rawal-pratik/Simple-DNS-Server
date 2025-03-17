const dgram = require('dgram');
const dnsPacket = require('dns-packet');

const server = dgram.createSocket('udp4');

const db = {
    'www.google.com': { type: 'A', data: '1.2.3.4' },
    'www.example.com': { type: 'A', data: '5.6.7.8' },
    'alias.example.com': { type: 'CNAME', data: 'www.example.com' },
    'ns1.example.com': { type: 'NS', data: 'ns1.dnsserver.com' },
    'example.com': { type: 'NS', data: 'ns1.example.com' },
};

server.on('message', (msg, rinfo) => {
    try {
        const request = dnsPacket.decode(msg);
        const question = request.questions[0];

        console.log(`DNS request for ${question.name} (Type: ${question.type}) from ${rinfo.address}`);

        let answers = [];

        if (db[question.name] && db[question.name].type === question.type) {
            answers.push({
                name: question.name,
                type: db[question.name].type,
                class: 'IN',
                ttl: 300,
                data: db[question.name].data
            });
        } else if (question.type === 'A' && db[question.name] && db[question.name].type === 'CNAME') {
            // If an A record is requested but a CNAME exists, return the CNAME first
            answers.push({
                name: question.name,
                type: 'CNAME',
                class: 'IN',
                ttl: 300,
                data: db[question.name].data
            });

            // Then, add the actual A record for the CNAME
            if (db[db[question.name].data] && db[db[question.name].data].type === 'A') {
                answers.push({
                    name: db[question.name].data,
                    type: 'A',
                    class: 'IN',
                    ttl: 300,
                    data: db[db[question.name].data].data
                });
            }
        }

        if (answers.length === 0) {
            console.log(`No record found for ${question.name}`);
        }

        const response = dnsPacket.encode({
            type: 'response',
            id: request.id,
            flags: dnsPacket.AUTHORITATIVE_ANSWER,
            questions: request.questions,
            answers
        });

        server.send(response, rinfo.port, rinfo.address, (err) => {
            if (err) console.error('Error sending response:', err);
            else console.log(`Resolved ${question.name} → ${answers.map(a => a.data).join(', ')}`);
            
            console.log('-'.repeat(50));
        });

    } catch (error) {
        console.error('Error processing DNS request:', error);
        console.log('-'.repeat(50));
    }
});

server.bind(53, () => {
    console.log('Server is running on port 53');
    console.log('-'.repeat(50));
});
