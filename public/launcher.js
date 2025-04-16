let socket;
let sessionCode;
let userRole = '';
let hostUsername = '';
let guestUsername = '';


// const socketUrl = "http://localhost:3000";  // En développement local
const socketUrl = "wss://neuro-c3fo.onrender.com";  // Sur Render


function startHost() {
    hostUsername = prompt("Entrez votre nom d'utilisateur (Hôte)");
    if (!hostUsername) {
        hostUsername = "Hôte";
    }

    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'createSession', username: hostUsername}));
        userRole = 'host';
        addMessage("La session a bien été créée, en attente d'un invité.", 'system');
    };

    socket.onmessage = (event) => { // côté hôte
        const data = JSON.parse(event.data);
        if (data.type === 'sessionCreated') {
            sessionCode = data.code;
            addMessage("La session a été créé avec le code : <br><strong>" + sessionCode +"</strong> <span class='si--copy-line'></span>", 'system');
            
            displayChatBox();
        } else if (data.type === 'guestJoined') {
            addMessage(`${data.username} a rejoint la session`, 'system');
        } else if (data.type === 'message') {
            if (data.role !== undefined) {
                addMessage(data.text, data.role, data.username);
            }
        }
        else  if (data.type === 'sessionClosed') {
            socket.close();
            addMessage(`l'invité à quitter la session.`, 'system');
            displayLauncher();
        }
    };

    window.addEventListener("beforeunload", () => {
        socket.send(JSON.stringify({ type: "disconnect" }));
        socket.close();
    });
}

function joinSession() {
    guestUsername = prompt("Entrez votre nom d'utilisateur (Invité)");
    if (!guestUsername) {
        guestUsername = "Invité";
    }

    const enteredCode = prompt("Entrez le code de la session de l'hôte");
    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'joinSession', username: guestUsername, sessionCode: enteredCode }));
        userRole = 'guest';
    };

    socket.onmessage = (event) => {  // côté invité
        const data = JSON.parse(event.data);
        
        if (data.type === 'sessionInvalid') {
            alert("Code de session invalide.");
        } else if (data.type === 'joinedSession') {
            sessionCode = data.code;
            addMessage("Vous avez rejoint la session avec succès!", 'system');
            displayChatBox()
            $('#session-code').innerHTML = `Vous êtes dans la session avec le code : <strong>${sessionCode}</strong>`;
            
            socket.send(JSON.stringify({ type: 'guestJoined', sessionCode: sessionCode }));
        } else if (data.type === 'message') {
            if (data.role !== undefined) {
                addMessage(data.text, data.role, data.username);
            }
        }
        else  if (data.type === 'sessionClosed') {
            socket.close();
            addMessage("l'hôte à quitter la session.", 'host');
            displayLauncher();
        }
    };

    window.addEventListener("beforeunload", () => {
        socket.send(JSON.stringify({ type: "disconnect" }))
        socket.close();
    });
}

function sendMessage() {
    const msg = $("#message").val();
    if (socket && msg && sessionCode) {
        socket.send(JSON.stringify({
            type: 'sendMessage',
            sessionCode,
            text: msg,
            role: userRole,
            username: userRole === 'host' ? hostUsername : guestUsername
        }));
        addMessage(msg, userRole, userRole === 'host' ? hostUsername : guestUsername);
        $('#message').val('')
    }
}

function addMessage(text, role, username) {
    if (text !== undefined) {
        const chat = $("#chat");
        let messageElement = $("<p>")
            .text(`${username} : ${text}`)
            .addClass(role);
        if(role == 'host'){
            messageElement = `<p class="${role}">
                                <span class="foundation--crown"></span>
                                ${username} : ${text}
                              </p>`;
        }
        else if (role == 'system'){
            messageElement = `<p class="${role}">
                                <span class="tdesign--system-messages-filled"></span>
                                Système : ${text}
                              </p>`;
        }
        chat.append(messageElement);
        chat.scrollTop(chat[0].scrollHeight);
    }
}


function displayChatBox() {
    $('#landing-page').addClass('cache');
    $('h1').addClass('cache');
    $('.main-container').removeClass('cache')
    $('#chat-container').removeClass('cache');
}

function displayLauncher() {
    displayAlert()
    setTimeout(() => {
        $('#landing-page').removeClass('cache');
        $('.main-container').addClass('cache')
        $('#chat-container').addClass('cache');
    }, 3000);
}

function displayAlert(){
    $("body").prepend(`
        <div id="popupAlert" class="popup-alert">
            <span id="popupMessage">L'autre joueur a quitté la session !</span>
            <button id="closePopup">&times;</button>
        </div>
    `);

    $("#closePopup").click(function () {
        $("#popupAlert").fadeOut(300, function () {
            $(this).remove();
        });
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        if($("#message").val().lenght != ""){
            sendMessage();
        }
    }
});

$(document).on('click', '.si--copy-line', function () {
    const textToCopy = $(this).siblings('strong').text();
    navigator.clipboard.writeText(textToCopy)
});