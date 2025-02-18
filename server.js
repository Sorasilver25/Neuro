const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let sessions = {};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

wss.on('connection', (ws) => {
    console.log('Un client est connecté');

    let userRole = '';
    // let currentSessionCode = '';
    let username = '';

    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'createSession') {
            const sessionCode = generateRandomCode();
            sessions[sessionCode] = { host: ws, guest: null, hostUsername: parsedMessage.username };
            userRole = 'host';
            username = parsedMessage.username;
            currentSessionCode = sessionCode;
            ws.send(JSON.stringify({ type: 'sessionCreated', code: sessionCode }));
        } else if (parsedMessage.type === 'joinSession') {
            const { sessionCode, username } = parsedMessage;
            if (sessions[sessionCode] && !sessions[sessionCode].guest) {
                sessions[sessionCode].guest = ws;
                sessions[sessionCode].guestUsername = username;
                userRole = 'guest';
                currentSessionCode = sessionCode;
                sessions[sessionCode].host.send(JSON.stringify({ type: 'guestJoined', username }));
                ws.send(JSON.stringify({ type: 'joinedSession', code: sessionCode }));
            } else {
                ws.send(JSON.stringify({ type: 'sessionInvalid' }));
            }
        } else if (parsedMessage.type === 'sendMessage') {
            const { sessionCode, text, role, username } = parsedMessage;
            if (sessions[sessionCode]) {
                let senderUsername = username;

                if (role === 'guest') {
                    senderUsername = sessions[sessionCode].guestUsername || username;
                } else if (role === 'host') {
                    senderUsername = sessions[sessionCode].hostUsername || username;
                }
                const roleMessage = { 
                    type: 'message', 
                    text, 
                    role, 
                    username: senderUsername
                };
                
                if (role === 'host') {
                    sessions[sessionCode].guest?.send(JSON.stringify(roleMessage));
                } else if (role === 'guest') {
                    sessions[sessionCode].host?.send(JSON.stringify(roleMessage));
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Client déconnecté');
        closeSession(ws);
    });
});

function closeSession(ws) {
    for (const sessionCode in sessions) {
        const session = sessions[sessionCode];

        if (session.host === ws) {
            session.guest?.send(JSON.stringify({ type: 'sessionClosed' }));
            delete sessions[sessionCode];
            break;
        } else if (session.guest === ws) {
            session.host?.send(JSON.stringify({ type: 'sessionClosed' }));
            delete sessions[sessionCode];
            break;
        }
    }
}

setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 5000);

function generateRandomCode() {
    return Math.random().toString(36).substr(2, 8);
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
