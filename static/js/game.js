var socket = io();

socket.on('connect', function() {
    console.log('Connected to the server');
    const roomName = localStorage.getItem('currentRoom');
    if (roomName) {
        socket.emit('join', { room: roomName });
        console.log(`Rejoined room: ${roomName}`);
        rejoinRoom();
    }
    socket.emit('my event', { data: 'I\'m connected!' });
});


socket.on('message', (message) => {
    console.log('Received message:', message);
});


socket.on('error', (data) => {
    console.error('Error:', data.message);
    alert(data.message); // Display the error message to the user
});

function rejoinRoom() {
    getHandCards();
    (async () => {
        const roomData = await getRoomData();
        console.log(roomData);
        if (roomData) {
            createPlayers(roomData.players)
            if(roomData.game_started) {
                const startButton = document.getElementById('start-game');
                startButton.style.display = 'none';
            }
            roomData.game.played_cards.forEach(card => {
                createPlayedCard(card);
            });
        } else {
            console.log('Failed to get room data');
        }
    })();

    fetch('/get_turn', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch turn: ' + response.statusText);
        }
        return response.json();
    }).then(data => {
        const drawCardButton = document.getElementById('draw-card-button');
        const playCardButton = document.getElementById('play-card-button');
        if (data.hasOwnProperty('my_turn') && data.my_turn) {
            drawCardButton.disabled = false;
            playCardButton.disabled = false;
        } else {
            drawCardButton.disabled = true;
            playCardButton.disabled = true;
        }

    }).catch(error => {
        console.error('Error:', error);
    });
}

// Attach the drawCard function to a button
const drawCardButton = document.getElementById('draw-card-button');
if (drawCardButton) {
    drawCardButton.addEventListener('click', () => {
        fetch('/draw_card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to draw a card: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.card) {
                console.log('You drew:', data.card);
                handCards.push(data.card);
                updateHandCards(handCards);
            } else {
                alert(data.error || 'An error occurred');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
}

function startGame() {
    fetch('/start_game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to start game: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data) {
            console.log('Game started successfully!');
            handCards = []
            clearHandCards();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
document.getElementById('start-game').addEventListener('click', startGame);

socket.on('on_game_start', (data) => {
    const startButton = document.getElementById('start-game');
    startButton.style.display = 'none';
});


let handCards = [];


socket.on('update_hand', () => {
    getHandCards();
});


function getHandCards() {
    fetch('/get_hand', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch hand: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.hand) {
            console.log('Updated hand:', data.hand);
            handCards = data.hand;
            updateHandCards(handCards);
        } else {
            alert(data.error || 'An error occurred while updating the hand');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


async function getRoomData() {
    try {
        const response = await fetch('/get_room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch hand: ' + response.statusText);
        }

        const data = await response.json();

        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}


function updateHandCards(cards){
    const handCardContainer = document.getElementById('hand-cards');
    clearHandCards();
    cards.forEach(card => {
        const cardElement = createCardElement(card);
        handCardContainer.appendChild(cardElement);
    });
}
const colors = {'red': '#c40c00', 'blue': '#1254ab', 'green': '#328a10', 'yellow':'#e7d004', 'black':'#000000'};
const valueImages = {
    'skip': {'center': 'https://i.ibb.co/C5gFNZhf/unos-skip-image.png', 'bottom': 'https://i.ibb.co/C5gFNZhf/unos-skip-image.png', 'top': 'https://i.ibb.co/C5gFNZhf/unos-skip-image.png'},
    'draw_two': {'center': 'https://i.ibb.co/ymXCM9td/uno-plus-2.png', 'bottom': 'https://i.ibb.co/Xfy2sqrt/uno-plus-2-corners.png', 'top': 'https://i.ibb.co/Xfy2sqrt/uno-plus-2-corners.png'},
    'reverse': {'center': 'https://i.ibb.co/3yvn1cXz/uno-reverse.png', 'bottom': 'https://i.ibb.co/3yvn1cXz/uno-reverse.png', 'top': 'https://i.ibb.co/3yvn1cXz/uno-reverse.png'},
    'wild': {'center': '','bottom': '', 'top':''},
    'wild_draw_four': {'center': '','bottom': '', 'top':''},
    '0': {'center': 'https://i.ibb.co/HfyPTRnJ/uno-0.png','bottom': 'https://i.ibb.co/HfyPTRnJ/uno-0.png', 'top':'https://i.ibb.co/HfyPTRnJ/uno-0.png'},
    '1': {'center': 'https://i.ibb.co/VWsY4J1F/uno-1.png', 'bottom': 'https://i.ibb.co/VWsY4J1F/uno-1.png', 'top':'https://i.ibb.co/VWsY4J1F/uno-1.png'},
    '2': {'center': 'https://i.ibb.co/LXy5wNXJ/uno-2.png','bottom': 'https://i.ibb.co/LXy5wNXJ/uno-2.png', 'top':'https://i.ibb.co/LXy5wNXJ/uno-2.png'},
    '3': {'center': 'https://i.ibb.co/9zKmqjT/uno-3.png','bottom': 'https://i.ibb.co/9zKmqjT/uno-3.png', 'top':'https://i.ibb.co/9zKmqjT/uno-3.png'},
    '4': {'center': 'https://i.ibb.co/RpwVxVjK/uno-4.png','bottom': 'https://i.ibb.co/RpwVxVjK/uno-4.png', 'top':'https://i.ibb.co/RpwVxVjK/uno-4.png'},
    '5': {'center': 'https://i.ibb.co/N2Rf9b0C/uno-5.png','bottom': 'https://i.ibb.co/N2Rf9b0C/uno-5.png', 'top':'https://i.ibb.co/N2Rf9b0C/uno-5.png'},
    '6': {'center': 'https://i.ibb.co/yn5TWxm7/uno-6.png','bottom': 'https://i.ibb.co/yn5TWxm7/uno-6.png', 'top':'https://i.ibb.co/yn5TWxm7/uno-6.png'},
    '7': {'center': 'https://i.ibb.co/BVvQTcw6/uno-7.png','bottom': 'https://i.ibb.co/BVvQTcw6/uno-7.png', 'top':'https://i.ibb.co/BVvQTcw6/uno-7.png'},
    '8': {'center': 'https://i.ibb.co/GfN6wntj/uno-8.png','bottom': 'https://i.ibb.co/GfN6wntj/uno-8.png', 'top':'https://i.ibb.co/GfN6wntj/uno-8.png'},
    '9': {'center': 'https://i.ibb.co/qYcmp1Wx/uno-9.png','bottom': 'https://i.ibb.co/qYcmp1Wx/uno-9.png', 'top':'https://i.ibb.co/qYcmp1Wx/uno-9.png'}
}
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.style.backgroundColor = colors[card.color]

    const cardValueImage = document.createElement('img');
    cardValueImage.src = valueImages[card.value].center
    cardValueImage.className = 'center-value';
    cardElement.appendChild(cardValueImage);

    const cardValueTopImage = document.createElement('img');
    cardValueTopImage.src = valueImages[card.value].top
    cardValueTopImage.className = 'top-left-value';
    cardElement.appendChild(cardValueTopImage);

    const cardValueBottomImage = document.createElement('img');
    cardValueBottomImage.src = valueImages[card.value].bottom
    cardValueBottomImage.className = 'bottom-right-value';
    cardElement.appendChild(cardValueBottomImage);


    if (card.isWild) {
        cardElement.classList.add('wild-card');
        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker';
        ['red', 'blue', 'green', 'yellow'].forEach(color => {
            const radioButton = document.createElement('input');
            radioButton.type = 'radio';
            radioButton.name = `wild-card-color-${card.value}`;
            radioButton.value = color;
            radioButton.id = `color-${color}-${card.value}`;

            const label = document.createElement('label');
            label.htmlFor = `color-${color}-${card.value}`;
            label.textContent = color;
            label.style.color = color;

            colorPicker.appendChild(radioButton);
            colorPicker.appendChild(label);
        });

        let selectedColor = null;
        colorPicker.addEventListener('change', (event) => {
            selectedColor = event.target.value;
            console.log('Selected color for wild card:', selectedColor);
            card.selectedColor = selectedColor; // Store the selected color in the card object
        });

        cardElement.appendChild(colorPicker);
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'card-checkbox';
    //checkbox.style.visibility = 'hidden';
    cardElement.appendChild(checkbox);

    cardElement.setAttribute('data-value-card', JSON.stringify(card));
    
    function selected(checkbox){
        const selectedCards = handCards.filter(c => c.isSelected);
        if (checkbox.checked) {
            if (selectedCards.length === 0 || selectedCards.every(c => c.value === card.value)) {
                card.isSelected = true;
                card.selectionOrder = selectedCards.length + 1; // Track the order of selection
                console.log('Card selected:', card);
                cardElement.classList.add("selected-card")
            } else {
                card.isSelected = false;
                checkbox.checked = false;
                console.log('Card selection invalid, already selected:', selectedCards);
                console.log('HandCards:', handCards);
            }
        } else {
            card.isSelected = false;
            delete card.selectionOrder; // Remove the selection order when deselected
            console.log('Card deselected:', card);
            cardElement.classList.remove("selected-card")

            // Recalculate the selection order for remaining selected cards
            let order = 1;
            handCards.filter(c => c.isSelected).forEach(c => {
                c.selectionOrder = order++;
            });
        }
    }
    cardElement.addEventListener('click', (event) => {
        if(event.target == cardElement){
            checkbox.checked = !checkbox.checked
            selected(checkbox);
        }
    });

    checkbox.addEventListener('change', (event) => {
        selected(event.target);
    });

    return cardElement;
}

document.getElementById('play-card-button').addEventListener('click', function() {
    console.log(handCards);
    let selectedCards = handCards.filter(card => card.isSelected);
    if (selectedCards.length > 0) {
        const selectedOrder = selectedCards.sort((a, b) => a.selectionOrder - b.selectionOrder);
        console.log('Selected cards in order:', selectedOrder);

        socket.emit('play_card', { cards: selectedCards }, (response) => {
            if (response) {
                handCards = handCards.filter(card => !card.isSelected);
                updateHandCards(handCards);
            } else {
                console.error('Invalid move');
            }
        });
    } else {
        console.error('No cards selected');
    }
});

function clearHandCards() {
    const handCardContainer = document.getElementById('hand-cards');
    while (handCardContainer.firstChild) {
        handCardContainer.removeChild(handCardContainer.firstChild);
    }
}


function createPlayedCard(card){
    const playedCardContainer = document.getElementById('top-card');
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.style.backgroundColor = colors[card.color]

    const cardValueImage = document.createElement('img');
    cardValueImage.src = valueImages[card.value].center
    cardValueImage.className = 'center-value';
    cardElement.appendChild(cardValueImage);

    const cardValueTopImage = document.createElement('img');
    cardValueTopImage.src = valueImages[card.value].top
    cardValueTopImage.className = 'top-left-value';
    cardElement.appendChild(cardValueTopImage);

    const cardValueBottomImage = document.createElement('img');
    cardValueBottomImage.src = valueImages[card.value].bottom
    cardValueBottomImage.className = 'bottom-right-value';
    cardElement.appendChild(cardValueBottomImage);

    function getRandomOffset(range) {
        return Math.floor(Math.random() * (range * 2 + 1)) - range;
    }

    const offsetX = getRandomOffset(20);
    const offsetY = getRandomOffset(5);
    cardElement.style.position = "absolute";
    cardElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;


    playedCardContainer.appendChild(cardElement);
}

socket.on('card_played', (data) => {
    console.log('Card played:', data.card);
    createPlayedCard(data.card);
})

socket.on('next_turn', (data) => {
    const playerContainer = document.getElementById('player-container')
    const playerBodys = Array.from(playerContainer.children);

    playerBodys.forEach(playerBody =>{
        console.log(playerBody.dataset.id == data.player);
        if(playerBody.dataset.id == data.player){
            playerBody.classList.add('player-turn');
        }
        else{
            playerBody.classList.remove('player-turn');
        }
    });
    (async () => {
        const roomData = await getRoomData();
        console.log(roomData);
        if (roomData) {
            createPlayers(roomData.players)
        } else {
            console.log('Failed to get room data');
        }
    })();
    fetch('/get_turn', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch turn: ' + response.statusText);
        }
        return response.json();
    }).then(data => {
        const drawCardButton = document.getElementById('draw-card-button');
        const playCardButton = document.getElementById('play-card-button');
        if (data.hasOwnProperty('my_turn') && data.my_turn) {
            drawCardButton.disabled = false;
            playCardButton.disabled = false;
        } else {
            drawCardButton.disabled = true;
            playCardButton.disabled = true;
        }
        const playerContainer = document.getElementById('player-container')
        const playerBodys = Array.from(playerContainer.children);

        playerBodys.forEach(playerBody =>{
            console.log(playerBody.dataset.id == data.player);
            if(playerBody.dataset.id == data.player){
                playerBody.style.backgroundColor = 'green';
            }
        });
    }).catch(error => {
        console.error('Error:', error);
    });
    
})

async function getPlayerData() {
    try {
        const response = await fetch('/get_player', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch hand: ' + response.statusText);
        }

        const data = await response.json();

        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function rotatePlayers(players, clientId) {
    const index = players.findIndex(player => player.id === clientId);
    if (index === -1) return players; // Client not found, return original
    return players.slice(index).concat(players.slice(0, index));
}


const offsets = {
    1: '0.25turn',
    2: '-0.25turn',
    3: '-0.085turn',
    4: '-1.0turn',
};

function createPlayers(players){
    clearPlayers();
    let rotatedPlayers = players;
    const total = players.length;
    const offset = offsets[total] || '0.5turn';
    (async () => {
        const playerData = await getPlayerData();
        console.log("test: ",playerData);
        if (playerData) {
            rotatedPlayers = rotatePlayers(players, playerData.id);

            const playerContainer = document.getElementById("player-container");
            playerContainer.style.setProperty('--total', total);
            rotatedPlayers.forEach((player, i) => {
                const playerBody = document.createElement("div");
                playerBody.dataset.id = player.id;
                playerBody.style.setProperty('--r-offset', offset);
                playerBody.classList.add('player-body')
                playerBody.style.setProperty('--i', i+1);
                const playerImage = document.createElement("img")
                const playerName = document.createElement("span")
                playerName.classList.add("name-tag");

                const playerElement = document.createElement("div");

                const playerCardAmountImage = document.createElement("img");
                playerCardAmountImage.src = "https://i.ibb.co/KcvmBbgc/uno-back-face.png"
                playerCardAmountImage.classList.add("card-amount-image");

                const playerCardAmountImage2 = document.createElement("img");
                playerCardAmountImage2.src = "https://i.ibb.co/KcvmBbgc/uno-back-face.png"
                playerCardAmountImage2.classList.add("card-amount-image");
                playerCardAmountImage2.style.transform = "translate(50%,12%) rotateZ(27deg)";
                playerCardAmountImage2.style.zIndex = "1";

                const playerCardAmount = document.createElement("span")
                playerCardAmount.textContent = player.cards_left;
                playerCardAmount.classList.add("card-amount");

                playerImage.src = player.avatar;
                playerImage.classList.add("avatar");
                playerName.textContent = player.username;



                playerElement.appendChild(playerCardAmountImage);
                playerElement.appendChild(playerCardAmountImage2);
                playerElement.appendChild(playerImage);
                playerElement.appendChild(playerCardAmount);
                playerElement.appendChild(playerName);

                playerBody.appendChild(playerElement);
                playerContainer.appendChild(playerBody);
            })
        } else {
            console.log('Failed to get player data');
        }
    })();


    

}

function clearPlayers(){
    const playerContainer = document.getElementById("player-container");
    while (playerContainer.firstChild) {
        playerContainer.removeChild(playerContainer.firstChild);
    }
}

socket.on("player_join_room", (room) => {
    createPlayers(room.players);
})

