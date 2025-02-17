const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let sessions = {};

// Middleware pour servir les fichiers statiques (ex. index.html, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Route pour servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Spécifie le chemin de ton index.html
});

// WebSocket pour gérer les sessions en temps réel
wss.on('connection', (ws) => {
    console.log('Un client est connecté');
    
    let userRole = '';  
    let currentSessionCode = '';

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'createSession') {
            const sessionCode = generateRandomCode();
            sessions[sessionCode] = { host: ws, guest: null };  // Stocke l'hôte
            userRole = 'host';  // L'utilisateur est l'hôte
            currentSessionCode = sessionCode;
            ws.send(JSON.stringify({ type: 'sessionCreated', code: sessionCode }));
        } else if (parsedMessage.type === 'joinSession') {
            const { sessionCode } = parsedMessage;
            if (sessions[sessionCode] && !sessions[sessionCode].guest) {
                sessions[sessionCode].guest = ws;
                userRole = 'guest';  // L'utilisateur est l'invité
                currentSessionCode = sessionCode;
                sessions[sessionCode].host.send(JSON.stringify({ type: 'guestJoined' }));
                ws.send(JSON.stringify({ type: 'joinedSession', code: sessionCode }));
            } else {
                ws.send(JSON.stringify({ type: 'sessionInvalid' }));
            }
        } else if (parsedMessage.type === 'sendMessage') {
            const { sessionCode, text } = parsedMessage;
            if (sessions[sessionCode]) {
                const roleMessage = { type: 'message', text, role: userRole };  // Inclure le rôle dans le message
                if (userRole === 'host') {
                    sessions[sessionCode].guest && sessions[sessionCode].guest.send(JSON.stringify(roleMessage));
                } else if (userRole === 'guest') {
                    sessions[sessionCode].host.send(JSON.stringify(roleMessage));
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Client déconnecté');
        for (const sessionCode in sessions) {
            if (sessions[sessionCode].host === ws || sessions[sessionCode].guest === ws) {
                delete sessions[sessionCode];
                break;
            }
        }
    });
});

// Génération de code aléatoire pour la session
function generateRandomCode() {
    return Math.random().toString(36).substr(2, 8);
}

// Démarrer le serveur HTTP avec WebSocket
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
