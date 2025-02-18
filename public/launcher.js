let socket;
let sessionCode;
let userRole = '';

// const socketUrl = "http://localhost:3000";  // En développement local
const socketUrl = "wss://neuro-c3fo.onrender.com";  // Sur Render/Vercel

function startHost() {
    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'createSession' }));
        userRole = 'host';
        addMessage("La session a bien été créée, en attente d'un invité.", 'host');
    };

    socket.onmessage = (event) => { // côté hôte
        const data = JSON.parse(event.data);
        if (data.type === 'sessionCreated') {
            sessionCode = data.code;
            addMessage("La session a été créée avec le code : " + sessionCode, 'host');
            
            // Afficher le code à rejoindre dans l'interface
            const joinMessage = `Code de session à rejoindre : <strong>${sessionCode}</strong>`;
            document.getElementById('session-code').innerHTML = joinMessage;
            displayChatBox();
        } else if (data.type === 'guestJoined') {
            addMessage("Un invité a rejoint la session", 'host');
        } else if (data.type === 'message') {
            if (data.role !== undefined) {
                addMessage(data.text, data.role);
            }
        }
    };
}

function joinSession() {
    const enteredCode = prompt("Entrez le code de la session de l'hôte");
    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'joinSession', sessionCode: enteredCode }));
        userRole = 'guest';
    };

    socket.onmessage = (event) => {  // côté invité
        const data = JSON.parse(event.data);

        if (data.type === 'sessionInvalid') {
            alert("Code de session invalide.");
        } else if (data.type === 'joinedSession') {
            sessionCode = data.code;
            addMessage("Vous avez rejoint la session avec succès!", 'guest');
            displayChatBox()
            $('#session-code').innerHTML = `Vous êtes dans la session avec le code : <strong>${sessionCode}</strong>`;
            
            // Informer l'hôte que l'invité a rejoint
            socket.send(JSON.stringify({ type: 'guestJoined', sessionCode: sessionCode }));
        } else if (data.type === 'message') {
            if (data.role !== undefined) {
                addMessage(data.text, data.role);  // Réception du message
            }
        }
    };
}

// Fonction pour envoyer un message dans le chat
function sendMessage() {
    const msg = $("#message").val();
    if (socket && msg && sessionCode) {
        socket.send(JSON.stringify({
            type: 'sendMessage',
            sessionCode,
            text: msg,
            role: userRole
        }));
        addMessage(msg, userRole);  // Affiche immédiatement le message localement
    }
}

// Fonction pour afficher les messages dans le chat
function addMessage(text, role) {
    if (text !== undefined) {
        const chat = document.getElementById("chat");
        const messageElement = document.createElement("p");
        messageElement.textContent = `${role === 'host' ? 'Host' : 'Guest'}: ${text}`;
        messageElement.classList.add(role);
        chat.appendChild(messageElement);
        chat.scrollTop = chat.scrollHeight;
    }
}

function displayChatBox() {
    $('#landing-page').addClass('cache');
    $('#chat-container').css('display','block');
    $('#chat').css('display','block');
    $('#message').css('display','block');
}
