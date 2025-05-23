var socket = io();

socket.on('connect', function() {
    console.log('Connected to the server');
    socket.emit('my event', { data: 'I\'m connected!' });
});


fetch('get_rooms').then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
}).then(data => {
    console.log('Rooms fetched:', data.rooms);
    const roomList = document.getElementById('room-list');
    data.rooms.forEach(room => {
        const listItem = document.createElement('li');
        const roomButton = document.createElement('button');
        roomButton.className = 'room-button';
        roomButton.textContent = room.name;
        const playerCount = document.createElement('span');
        playerCount.textContent = ` (${room.players.length}/4)`;
        roomButton.appendChild(playerCount);
        roomButton.disabled = room.players.length >= 4 || room.game_started;
        roomButton.addEventListener('click', () => {
            socket.emit('join', { room: room.name });
            localStorage.setItem('currentRoom', room.name);
            console.log(window.location.origin);
            window.location.replace(window.location.origin + '/game');
        });
        listItem.appendChild(roomButton);
        roomList.appendChild(listItem);
    });
}).catch(error => {
    console.error('Error fetching rooms:', error);
});



document.getElementById('create-room-button').addEventListener('click', () => {
    console.log('Create room button clicked');
    const roomName = document.getElementById('room-name').value;
    if (roomName) {
        socket.emit('create_room', { room_name: roomName});
    }
});

socket.on('room_created', (room) => {
    const roomList = document.getElementById('room-list');
    const listItem = document.createElement('li');
    const roomButton = document.createElement('button');
    roomButton.className = 'room-button';
    roomButton.textContent = room.name;

    const playerCount = document.createElement('span');
    playerCount.textContent = ` (${room.players.length}/4)`;
    roomButton.appendChild(playerCount);
    roomButton.addEventListener('click', () => {
        socket.emit('join', { room: room.name });
        localStorage.setItem('currentRoom', room.name);
        console.log(window.location.origin);
        window.location.replace(window.location.origin + '/game');
    });
    listItem.appendChild(roomButton);
    roomList.appendChild(listItem);
});

socket.on('error', (data) => {
    alert(data.message);
});


socket.on('message', (message) => {
    console.log('Received message:', message);
});
