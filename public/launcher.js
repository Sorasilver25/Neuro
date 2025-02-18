let socket;
let sessionCode;
let userRole = '';

// const socketUrl = "http://localhost:3000";  // En développement local
const socketUrl = "wss://neuro-c3fo.onrender.com";  // Sur Render


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
            
            displayChatBox();
        } else if (data.type === 'guestJoined') {
            addMessage("Un invité a rejoint la session", 'host');
        } else if (data.type === 'message') {
            if (data.role !== undefined) {
                addMessage(data.text, data.role);
            }
        }
        else  if (data.type === 'sessionClosed') {
            socket.close();
            addMessage("l'invité à quitter la session.", 'guest');
            displayLauncher();
        }
    };

    window.addEventListener("beforeunload", () => {
        socket.send(JSON.stringify({ type: "disconnect" }));
        socket.close();
    });
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
            
            socket.send(JSON.stringify({ type: 'guestJoined', sessionCode: sessionCode }));
        } else if (data.type === 'message') {
            if (data.role !== undefined) {
                addMessage(data.text, data.role);
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
            role: userRole
        }));
        addMessage(msg, userRole);
    }
}

function addMessage(text, role) {
    if (text !== undefined) {
        const chat = $("#chat");
        const messageElement = $("<p>")
            .text(`${role === 'host' ? 'Host' : 'Guest'}: ${text}`)
            .addClass(role);
        chat.append(messageElement);
        chat.scrollTop(chat[0].scrollHeight);
        $('#message').val('')
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