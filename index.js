const dgram = require('dgram'); 
const dnsPacket = require('dns-packet');

const server = dgram.createSocket('udp4'); 

const db = {
    'www.google.com': '1.2.3.4',
    'www.example.com': '5.6.7.8'
};

server.on('message', (msg, rinfo) => {
    try {
        const request = dnsPacket.decode(msg);
        const nameOfRequest = request.questions[0]?.name; 

        console.log(`DNS request for ${nameOfRequest} from ${rinfo.address}`);

        const responseIP = db[nameOfRequest] || '8.8.8.8'; 

        const response = dnsPacket.encode({
            type: 'response',
            id: request.id,
            flags: dnsPacket.AUTHORITATIVE_ANSWER, 
            questions: request.questions,
            answers: [{
                name: nameOfRequest,
                type: 'A',
                class: 'IN',
                ttl: 300,
                data: responseIP
            }]
        });

        server.send(response, rinfo.port, rinfo.address, (err) => {
            if (err) console.error('Error sending response:', err);
            else console.log(`Resolved ${nameOfRequest} to ${responseIP}`);
            
            
            console.log('-'.repeat(50)); 
        });
    } catch (error) {
        console.error('Error processing DNS request:', error);
        console.log('-'.repeat(50)); // Keep separators even on errors
    }
});

server.bind(53, () => {
    console.log('Server is running on port 53');
    console.log('-'.repeat(50)); // Print an initial separator line
});
