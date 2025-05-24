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

socket.on('round_over', (data) => {
    console.log('Round over:', data);
    const next_round_button = document.getElementById('next-round');
    next_round_button.style.display = 'block';

    const winnerNotification = document.createElement('div');
    winnerNotification.id = 'winner-notification';
    winnerNotification.textContent = `Round Winner: ${data.winner}`;
    winnerNotification.style.position = 'absolute';
    winnerNotification.style.top = '50%';
    winnerNotification.style.left = '50%';
    winnerNotification.style.transform = 'translate(-50%, -50%)';
    winnerNotification.style.fontSize = '4rem';
    winnerNotification.style.fontWeight = 'bold';
    winnerNotification.style.color = 'white';
    winnerNotification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    winnerNotification.style.padding = '20px';
    winnerNotification.style.borderRadius = '10px';
    winnerNotification.style.opacity = '1';
    winnerNotification.style.transition = 'opacity 2s';
    winnerNotification.style.zIndex = '1000';

    document.body.appendChild(winnerNotification);

    setTimeout(() => {
        winnerNotification.style.opacity = '0';
        setTimeout(() => {
            winnerNotification.remove();
        }, 2000);
    }, 3000);
});



function rejoinRoom() {
    getHandCards();
    (async () => {
        const roomData = await getRoomData();
        console.log(roomData);
        if (roomData) {
            createPlayers(roomData.players)
            if(lastRoundPlayedCards.length <= 0){
                const playedCardsInfoButton = document.getElementById('played-cards-info-button');
                playedCardsInfoButton.style.display = 'none';
            }

            if(roomData.game_started) {
                const startButton = document.getElementById('start-game');
                startButton.style.display = 'none';
                const gameSettings = document.getElementById('game-settings');
                gameSettings.style.display = 'none';
            }
            roomData.game.played_cards.forEach(card => {
                createPlayedCard(card);
            });
            if(!roomData.game.round_active && roomData.game_started){
                const next_round_button = document.getElementById('next-round');
                next_round_button.style.display = 'block';
            }
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
    const points_to_lose = document.getElementById('points-to-lose').value;
    const deck_size = document.getElementById('deck-size').value;
    fetch('/start_game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'            
        },
        body: JSON.stringify({
            'points_to_lose': points_to_lose,
            'deck_size': deck_size
        })
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
document.getElementById('next-round').addEventListener('click', nextRound);

function nextRound() {
    const nextRoundButton = document.getElementById('next-round');
    nextRoundButton.style.display = 'none';
    fetch('/next_round', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to start round: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data) {
            console.log('Round started successfully!');
            handCards = []
            clearHandCards();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

socket.on('on_game_start', (data) => {
    const startButton = document.getElementById('start-game');
    startButton.style.display = 'none';
    const gameSettings = document.getElementById('game-settings');
    gameSettings.style.display = 'none';
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
    const cardWidth = cards.length*2.75;
    const totalWidth = cards.length * cardWidth; // Adjust 50 based on the card width and spacing
    const offset = totalWidth / 2;

    cards.forEach((card, index) => {
        const cardElement = createCardElement(card);
        cardElement.style.transform = `translate(calc(${offset}px - ${index * cardWidth}px), 0%)`;
        cardElement.style.zIndex = cards.length - index;
        handCardContainer.appendChild(cardElement);
    });
}
const colors = {'red': '#c40c00', 'blue': '#1254ab', 'green': '#328a10', 'yellow':'#e7d004', 'black':'#000000'};
const valueImages = {
    'skip': {'center': 'https://i.ibb.co/C5gFNZhf/unos-skip-image.png', 'bottom': 'https://i.ibb.co/C5gFNZhf/unos-skip-image.png', 'top': 'https://i.ibb.co/C5gFNZhf/unos-skip-image.png'},
    'draw_two': {'center': 'https://i.ibb.co/ymXCM9td/uno-plus-2.png', 'bottom': 'https://i.ibb.co/Xfy2sqrt/uno-plus-2-corners.png', 'top': 'https://i.ibb.co/Xfy2sqrt/uno-plus-2-corners.png'},
    'reverse': {'center': 'https://i.ibb.co/3yvn1cXz/uno-reverse.png', 'bottom': 'https://i.ibb.co/3yvn1cXz/uno-reverse.png', 'top': 'https://i.ibb.co/3yvn1cXz/uno-reverse.png'},
    'wild': {'center': 'https://i.ibb.co/chJLCJSm/wild-card.png','bottom': 'https://i.ibb.co/chJLCJSm/wild-card.png', 'top':'https://i.ibb.co/chJLCJSm/wild-card.png'},
    'wild_draw_four': {'center': 'https://i.ibb.co/tT2MFs10/4.png','bottom': 'https://i.ibb.co/D3gpqm4/4-corner.png', 'top':'https://i.ibb.co/D3gpqm4/4-corner.png'},
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
        cardValueImage.style.width = 90 + '%';
        if(card.value == 'wild_draw_four'){
            cardValueBottomImage.style.width = 25 + '%';
            cardValueTopImage.style.width = 25 + '%';
        }
        else {
            cardValueBottomImage.style.width = 20 + '%';
            cardValueTopImage.style.width = 20 + '%';
        }
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
                const currentTransform = cardElement.style.transform || '';
                cardElement.style.transform = `${currentTransform} translate(0px, -80px)`;
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
            const currentTransform = cardElement.style.transform || '';
                cardElement.style.transform = `${currentTransform} translate(0px, 80px)`;

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

        // Check if any wild card is selected without a color
        const invalidWildCard = selectedOrder.find(card => card.isWild && !card.selectedColor);
        if (invalidWildCard) {
            console.error('Cannot play a wild card without selecting a color');
            alert('Please select a color for the wild card before playing.');
            return;
        }

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

    if(card.isWild) {
    
        cardValueImage.style.width = 90 + '%';
        if(card.value == 'wild_draw_four'){
            cardValueBottomImage.style.width = 25 + '%';
            cardValueTopImage.style.width = 25 + '%';
        }
        else {
            cardValueBottomImage.style.width = 20 + '%';
            cardValueTopImage.style.width = 20 + '%';
        }
    }

    function getRandomOffset(range) {
        return Math.floor(Math.random() * (range * 2 + 1)) - range;
    }

    const offsetX = getRandomOffset(20);
    const offsetY = getRandomOffset(5);
    cardElement.style.position = "absolute";
    cardElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;


    playedCardContainer.appendChild(cardElement);
}

let roundCards = [];

socket.on('card_played', (data) => {
    console.log('Card played:', data.card);
    createPlayedCard(data.card);
    roundCards.push(data.card);
    if(data.card.isWild){
        const wildColorNotification = document.createElement('div');
        wildColorNotification.textContent = `Wild Color: ${data.card.selectedColor.toUpperCase()}`;
        wildColorNotification.style.position = 'absolute';
        wildColorNotification.style.top = '50%';
        wildColorNotification.style.left = '50%';
        wildColorNotification.style.transform = 'translate(-50%, -50%)';
        wildColorNotification.style.fontSize = '3rem';
        wildColorNotification.style.fontWeight = 'bold';
        wildColorNotification.style.color = colors[data.card.selectedColor];
        wildColorNotification.style.opacity = '1';
        wildColorNotification.style.transition = 'opacity 2s, transform 2s';
        document.body.appendChild(wildColorNotification);

        setTimeout(() => {
            wildColorNotification.style.opacity = '0';
            wildColorNotification.style.transform = 'translate(-50%, -70%)';
            setTimeout(() => {
                wildColorNotification.remove();
            }, 2000);
        }, 1000);
    }
})
let lastRoundPlayedCards = [];
socket.on('next_turn', (data) => {
    lastRoundPlayedCards = roundCards;
    roundCards = [];    
    const playerCardsInfoButton = document.getElementById('played-cards-info-button');
    playerCardsInfoButton.style.display = 'block';
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
            roomData.players.forEach(player => {
            updatePlayerData(player.id, player);
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

function createPlayers(players) {
    clearPlayers();
    let rotatedPlayers = players;
    const total = players.length;
    const offset = offsets[total] || '0.5turn';
    (async () => {
        const playerData = await getPlayerData();
        if (playerData) {
            rotatedPlayers = rotatePlayers(players, playerData.id);

            const playerContainer = document.getElementById("player-container");
            playerContainer.style.setProperty('--total', total);
            rotatedPlayers.forEach((player, i) => {
                // Check if player with same id already exists
                if (playerContainer.querySelector(`.player-body[data-id="${player.id}"]`)) {
                    return; // Skip creating this player
                }
                const playerBody = document.createElement("div");
                playerBody.dataset.id = player.id;
                playerBody.style.setProperty('--r-offset', offset);
                playerBody.classList.add('player-body');
                playerBody.style.setProperty('--i', i + 1);
                const playerImage = document.createElement("img");
                const playerName = document.createElement("span");
                const playerAvatarContainer = document.createElement("div");
                const playerAvatarOverlay = document.createElement("div");
                playerAvatarOverlay.classList.add("avatar-overlay");
                playerName.classList.add("name-tag");

                const playerElement = document.createElement("div");
                //playerElement.style.transform = `scale(${Math.min(window.innerHeight / 100, 1)}) translate(-50%)`;

                const playerCardAmountImage = document.createElement("img");
                playerCardAmountImage.src = "https://i.ibb.co/KcvmBbgc/uno-back-face.png";
                playerCardAmountImage.classList.add("card-amount-image");

                const playerCardAmountImage2 = document.createElement("img");
                playerCardAmountImage2.src = "https://i.ibb.co/KcvmBbgc/uno-back-face.png";
                playerCardAmountImage2.classList.add("card-amount-image");
                playerCardAmountImage2.style.transform = "translate(50%,12%) rotateZ(27deg)";
                playerCardAmountImage2.style.zIndex = "1";

                const playerCardAmount = document.createElement("span");
                playerCardAmount.textContent = player.cards_left;
                playerCardAmount.classList.add("card-amount");

                playerImage.src = player.avatar;
                playerImage.style.width = '100%';
                playerImage.style.height = '100%';
                playerImage.style.borderRadius = '20px';
                playerAvatarContainer.classList.add("avatar");
                //playerImage.classList.add("avatar");
                playerName.textContent = player.username;
                playerAvatarContainer.appendChild(playerAvatarOverlay);
                playerAvatarContainer.appendChild(playerImage);
                playerElement.appendChild(playerCardAmountImage);
                playerElement.appendChild(playerCardAmountImage2);
                playerElement.appendChild(playerAvatarContainer);
                //playerElement.appendChild(playerImage);
                playerAvatarContainer.appendChild(playerCardAmount);
                playerElement.appendChild(playerName);

                playerBody.appendChild(playerElement);
                playerContainer.appendChild(playerBody);
            });
        } else {
            console.log('Failed to get player data');
        }
    })();
}

function updatePlayerData(playerId, updatedData) {
    const playerBody = document.querySelector(`.player-body[data-id="${playerId}"]`);
    if (playerBody) {
        const playerCardAmount = playerBody.querySelector(".card-amount");
        const playerName = playerBody.querySelector(".name-tag");
        const playerImage = playerBody.querySelector(".avatar");

        if (updatedData.cards_left !== undefined) {
            playerCardAmount.textContent = updatedData.cards_left;
        }
        if (updatedData.username !== undefined) {
            playerName.textContent = updatedData.username;
        }
        if (updatedData.avatar !== undefined) {
            playerImage.src = updatedData.avatar;
        }
    } else {
        console.log(`Player with ID ${playerId} not found.`);
    }
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


document.getElementById('sidebar-button').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');

    const sidebarContent = document.getElementById('sidebar-content');
    if(sidebar.style.transform == 'translateX(100%)'){
        sidebar.style.transform = 'translateX(0%)';
        while (sidebarContent.firstChild) {
            sidebarContent.removeChild(sidebarContent.firstChild);
        }
        (async () => {
            const roomData = await getRoomData();
            if (roomData) {
                sidebarContent.appendChild(calculateSidebarTable(roomData));
            } else {
                console.log('Failed to get room data');
            }
        })();
    }
    else{
        sidebar.style.transform = 'translateX(100%)';
    }
});

function calculateSidebarTable(roomData){
    const sidebarContent = document.getElementById('sidebar-content');
    const playerTable = document.createElement('table');
    playerTable.classList.add('player-score-table');
    const headerRow = document.createElement('tr');

    const pointsRow = document.createElement('tr');
   
    const rounds = Object.keys(roomData.game.rounds_played);
    const players = Object.keys(roomData.game.rounds_played[rounds[0]] || {});

    // Create header row
    const roundHeader = document.createElement('th');
    roundHeader.textContent = 'Round';
    headerRow.appendChild(roundHeader);

    players.forEach(playerId => {
        const playerHeader = document.createElement('th');
        const player = roomData.players.find(p => p.id === playerId);
        playerHeader.textContent = player ? player.username : `Player ${playerId}`;
        headerRow.appendChild(playerHeader);
    });

    // Create rows for each round
    // Add total score row before player names
    const totalScoreRow = document.createElement('tr');
    const totalScoreHeader = document.createElement('td');
    totalScoreHeader.textContent = 'Total Score';
    totalScoreRow.appendChild(totalScoreHeader);

    players.forEach(playerId => {
        const totalScoreCell = document.createElement('td');
        const totalScore = rounds.reduce((sum, round) => {
            return sum + (roomData.game.rounds_played[round][playerId] || 0);
        }, 0);
        totalScoreCell.textContent = totalScore;
        
        const maxScore = roomData.game.points_to_lose; // Adjust this value based on the expected maximum score
            const percentage = totalScore / maxScore;
            let red, green;

            if (percentage <= 0.5) {
                // Transition from green to yellow
                red = Math.floor(percentage * 2 * 255);
                green = 255;
            } else {
                // Transition from yellow to red
                red = 255;
                green = Math.floor((1 - percentage) * 2 * 255);
            }

        totalScoreCell.style.backgroundColor = `rgb(${red}, ${green}, 0)`;
        totalScoreRow.appendChild(totalScoreCell);
    });
    
    playerTable.appendChild(headerRow)
    playerTable.appendChild(totalScoreRow);
    

    // Add rows for each round
    rounds.forEach(round => {
        const roundRow = document.createElement('tr');
        const roundCell = document.createElement('td');
        roundCell.textContent = `Round ${round}`;
        roundRow.appendChild(roundCell);

        players.forEach(playerId => {
            const scoreCell = document.createElement('td');
            const score = roomData.game.rounds_played[round][playerId] || 0;
            scoreCell.textContent = score;

            // Calculate color based on score
            const maxScore = roomData.game.points_to_lose / 4; // Adjust this value based on the expected maximum score
            const percentage = score / maxScore;
            let red, green;

            if (percentage <= 0.5) {
                // Transition from green to yellow
                red = Math.floor(percentage * 2 * 255);
                green = 255;
            } else {
                // Transition from yellow to red
                red = 255;
                green = Math.floor((1 - percentage) * 2 * 255);
            }

            scoreCell.style.backgroundColor = `rgb(${red}, ${green}, 0)`;

            roundRow.appendChild(scoreCell);
        });

        playerTable.appendChild(roundRow);
    });

    

    return playerTable;
    
}



socket.on('game_over', (data) => {
    const winnerNotification = document.getElementById('winner-notification');
    if (winnerNotification) {
        winnerNotification.remove();
    }
    const winnerSign = document.createElement('div');
    winnerSign.textContent = `Winner: ${data.winner}`;
    winnerSign.style.position = 'absolute';
    winnerSign.style.top = '50%';
    winnerSign.style.left = '50%';
    winnerSign.style.transform = 'translate(-50%, -50%)';
    winnerSign.style.fontSize = '5rem';
    winnerSign.style.fontWeight = 'bold';
    winnerSign.style.color = 'gold';
    winnerSign.style.textShadow = '0 0 20px gold, 0 0 30px orange, 0 0 40px red';
    winnerSign.style.animation = 'float 3s ease-in-out infinite, fadeOut 5s forwards';
    winnerSign.style.zIndex = '1000';

    document.body.appendChild(winnerSign);

    setTimeout(() => {
        winnerSign.remove();
    }, 5000);

    // Add keyframes for animations
    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
    @keyframes float {
        0%, 100% { transform: translate(-50%, -50%) translateY(0); }
        50% { transform: translate(-50%, -50%) translateY(-20px); }
    }`, styleSheet.cssRules.length);

    styleSheet.insertRule(`
    @keyframes fadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
    }`, styleSheet.cssRules.length);

    const startButton = document.getElementById('start-game');
    startButton.style.display = 'block';
    const nextRoundButton = document.getElementById('next-round');
    nextRoundButton.style.display = 'none';
    const gameSettings = document.getElementById('game-settings');
    gameSettings.style.display = 'block';

});


function createDisplayCard(card){
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

    if(card.isWild) {
    
        cardValueImage.style.width = 90 + '%';
        if(card.value == 'wild_draw_four'){
            cardValueBottomImage.style.width = 25 + '%';
            cardValueTopImage.style.width = 25 + '%';
        }
        else {
            cardValueBottomImage.style.width = 20 + '%';
            cardValueTopImage.style.width = 20 + '%';
        }
    }

    return cardElement
}

document.getElementById('played-cards-info-button').addEventListener('click', function() {
    const playedCardsInfo = document.getElementById('played-cards-info');
    const playedCardsInfoButton = document.getElementById('played-cards-info-button');
    if (playedCardsInfo.style.display === 'none' && lastRoundPlayedCards.length > 0) {
        playedCardsInfo.style.display = 'flex';
        playedCardsInfoButton.style.borderRadius = '20px 0px 0px 20px';
        lastRoundPlayedCards.forEach(card => {
            const cardElement = createDisplayCard(card);
            cardElement.style.transform = 'translate(0, 0) scale(0.5)';
            cardElement.style.zIndex = '10';
            playedCardsInfo.appendChild(cardElement);
        });
    }
    else if (playedCardsInfo.style.display === 'flex') {
        playedCardsInfo.style.display = 'none';
        playedCardsInfoButton.style.borderRadius = '20px';
        while (playedCardsInfo.firstChild) {
            playedCardsInfo.removeChild(playedCardsInfo.firstChild);
        }
    }
});
        
socket.on('next_round' , (data) => {
    const next_round_button = document.getElementById('next-round');
    next_round_button.style.display = 'none';
});