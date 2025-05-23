from flask import Flask, render_template, redirect, request, jsonify, session
from flask_socketio import SocketIO, join_room, send
import random
import string
import eventlet
import os
from werkzeug.middleware.proxy_fix import ProxyFix
# --------------------------- #
#        Game Models          #
# --------------------------- #

class Deck:
    def __init__(self):
        self.cards = self.generate_deck()

    def generate_deck(self):
        colors = ['red', 'yellow', 'green', 'blue']
        values = ['0'] + [str(i) for i in range(1, 10)] * 2 + ['skip', 'reverse', 'draw_two'] * 2
        wild_cards = [{'color':'black','value':'wild', 'isWild': True},{'color':'black','value':'wild_draw_four', 'isWild': True}] * 4
        deck = [{'color':color,'value':value, 'isWild': False} for color in colors for value in values] + wild_cards
        random.shuffle(deck)
        return deck

    def draw_card(self):
        return self.cards.pop() if self.cards else None

    def reset_deck(self):
        self.cards = self.generate_deck()


class Player:
    def __init__(self, username):
        self.username = username
        self.id = self.generate_random_id(32)
        self.avatar = random.choice(avatars)
        self.hand = []
        self.room = None
        self.points = 0

    def __repr__(self):
        return f"Player({self.username})"

    def to_json(self):
        return {
            "username": self.username,
            "id": self.id,
            'avatar': self.avatar,
            "room": self.room,
            "cards_left": len(self.hand),
            "points": self.points
        }

    @staticmethod
    def from_json(data):
        if not data:
            return None
        username = data.get('username')
        player_id = data.get('id')
        if not username or not player_id:
            raise ValueError("Username and ID are required")
        player = Player(username)
        player.id = player_id
        player.room = data.get('room')
        return player

    def generate_random_id(self, length=8):
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


class Game:
    def __init__(self, room):
        self.room = room
        self.deck = Deck()
        self.current_turn = 0
        self.direction = 1  # 1 for clockwise, -1 for counter-clockwise
        self.played_cards = []
        self.round_draw_amount = 0
        self.round_active = False
        self.rounds_played = {}

    def start_game(self):
        self.room.game_started = True
        self.deck.reset_deck()
        self.current_turn = 0
        self.direction = 1
        for player in self.room.players:
            player.hand.clear()
        self.deal_cards(7)  # Deal 7 cards to each player
        self.round_active = True

    def current_player(self):
        if self.room.players:
            return self.room.players[self.current_turn]
        return None

    def next_turn(self):
        if self.room.players:
            self.current_turn = (self.current_turn + self.direction) % len(self.room.players)
            self.round_draw_amount = 0
            return self.current_player()
        return None
    def deal_first_card(self, next_player=None):
        first_card = self.deck.draw_card()
        if first_card.get('value') in ['draw_two', 'reverse']:
            if next_player is None:
                    next_player = self.next_turn()
            if first_card.get('value') == 'draw_two':
                for _ in range(2):
                    drawn_card = self.deck.draw_card()
                    if drawn_card:
                        next_player.hand.append(drawn_card)
                    else:
                        break
            elif first_card.get('value') == 'reverse':
                self.direction *= -1
            return first_card
        elif first_card.get('isWild'):
            if first_card.get('value') == 'wild_draw_four':
                if next_player is None:
                    next_player = self.next_turn()
                for _ in range(4):
                    drawn_card = self.deck.draw_card()
                    if drawn_card:
                        next_player.hand.append(drawn_card)
                    else:
                        break
            return self.deal_first_card(next_player)
        else:
            return first_card

    def deal_cards(self, num_cards):
        for i in range(num_cards):
            for player in self.room.players:
                card = self.deck.draw_card()
                if card:
                    player.hand.append(card)
                else:
                    break
        socketio.emit('update_hand', room=self.room.name)
        first_card = self.deal_first_card()
        self.played_cards.append(first_card)
        socketio.emit('card_played', {'player': 'start', 'card': first_card}, room=self.room.name)
        next_player = self.next_turn()
        if next_player:
            socketio.emit('next_turn', {'player': next_player.id}, room=self.room.name)
    def suhffle_new_deck(self):
        new_deck = self.played_cards[:-1]
        self.played_cards = [self.played_cards[-1]]
        new_deck = [{'color': card['color'], 'value': card['value'], 'isWild': card['isWild']} for card in new_deck]
        random.shuffle(new_deck)
        self.deck.cards = new_deck + self.deck.cards
    def to_json(self):
        return {
            "room": self.room.name,
            "current_turn": self.current_turn,
            "direction": self.direction,
            "played_cards": self.played_cards,
            "round_draw_amount": self.round_draw_amount,
            "round_active": self.round_active,
            "rounds_played": self.rounds_played,
        }
    def start_new_round(self):
        self.deck.reset_deck()
        self.current_turn = 0
        self.direction = 1
        for player in self.room.players:
            player.hand.clear()
        self.deal_cards(7)
        self.round_active = True

    def end_round(self):
        self.played_cards.clear()
        self.round_draw_amount = 0
        self.deck.reset_deck()
        current_round = len(self.rounds_played) + 1
        self.rounds_played[current_round] = {}
        for player in self.room.players:
            total_points = 0
            if len(player.hand) > 0:
                for card in player.hand:
                    if card['value'].isdigit():
                        total_points += int(card['value'])
                    elif card['value'] in ['skip', 'reverse', 'draw_two']:
                        total_points += 20
                    elif card['value'] == 'wild':
                        total_points += 50
                    elif card['value'] == 'wild_draw_four':
                        total_points += 75
            player.hand.clear()
            self.rounds_played[current_round][player.id] = total_points
            player.points += total_points
        self.round_active = False

        #self.start_new_round()



class Room:
    def __init__(self, name):
        self.name = name
        self.players = []
        self.game_started = False
        self.game = Game(self)

    def add_player(self, player):
        if player not in self.players:
            self.players.append(player)

    def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)

    def to_json(self):
        return {
            "name": self.name,
            "players": [player.to_json() for player in self.players],
            "game_started": self.game_started,
            "game": self.game.to_json()
        }


# --------------------------- #
#        Flask Setup          #
# --------------------------- #

eventlet.monkey_patch()

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)
app.config['SECRET_KEY'] = 'jciehgevuiosgmlcp89p98w0pmhv89p3w'

socketio = SocketIO(app, manage_session=True, async_mode='eventlet', logger=True, engineio_logger=True)
#socketio = SocketIO(app, manage_session=True)

rooms = {}    # name -> Room
players = {}  # id -> Player

avatars = ["https://i.ibb.co/0VXMN8Y6/duck-avatar.jpg", "https://i.ibb.co/RThHm9f2/cat-avatar.jpg", "https://i.ibb.co/v451VKnC/pig-avatar.jpg", "https://i.ibb.co/m5hVnq0x/bear-avatar.jpg", "https://i.ibb.co/Kp5pjCrw/hippo-avatar.jpg", "https://i.ibb.co/0RLLps00/panda-avatar.jpg"]


# --------------------------- #
#     Session Helpers         #
# --------------------------- #

def get_current_player():
    player_id = session.get('player_id')
    return players.get(player_id)

def set_current_player(player: Player):
    session['player_id'] = player.id
    players[player.id] = player


# --------------------------- #
#         SocketIO            #
# --------------------------- #

@socketio.on('create_room')
def handle_create_room(data):
    room_name = data.get('room_name')
    if room_name and room_name not in rooms:
        room = Room(room_name)
        rooms[room_name] = room
        socketio.emit('room_created', room.to_json())
    else:
        socketio.emit('error', {'message': 'Room name is required or already exists'})

@socketio.on('join')
def on_join(data):
    player = get_current_player()
    room_name = data.get('room')
    if not player or not room_name or room_name not in rooms:
        socketio.emit('error', {'message': 'Invalid join request'})
        return

    join_room(room_name)
    room = rooms[room_name]
    room.add_player(player)
    player.room = room.name  # Save room name in player
    players[player.id] = player  # Update player info
    socketio.emit('player_join_room', room.to_json(), to=room_name)
    send(f"{player.username} has joined room {room_name}", to=room_name)

@socketio.on('play_card')
def handle_play_card(data):
    player = get_current_player()
    if not player or not player.room or player.room not in rooms:
        socketio.emit('error', {'message': 'Invalid player or room'})
        return False
    room = rooms[player.room]
    cards = data.get('cards')
    if not cards or not isinstance(cards, list):
        socketio.emit('error', {'message': 'Invalid card selection 1'})
        return False
    if any(not any(card['color'] == hand_card['color'] and card['value'] == hand_card['value'] for hand_card in player.hand) for card in cards):
        socketio.emit('error', {'message': 'Invalid card selection 2'})
        return False
    if player.id != room.game.current_player().id:
        socketio.emit('error', {'message': 'Not your turn'})
        return False

    # Validate the sequence of selected cards
    canPlay = True
    play_regular_turn = True
    card = cards[0]
    if not (card.get('isWild') or 
                card.get('color') == room.game.played_cards[-1].get('color') or 
                card.get('value') == room.game.played_cards[-1].get('value') or 
                (room.game.played_cards[-1].get('isWild') and card.get('color') == room.game.played_cards[-1].get('wildColor'))) or (len(player.hand) == 1 and card.get('isWild')):
            canPlay = False
    if not canPlay:
        return False


    if cards[0].get('value') in ['draw_two', 'wild_draw_four']:
        next_player = room.game.next_turn()
    for card in cards:
        if card.get('value') == 'reverse':
            room.game.direction *= -1
        elif card.get('value') == 'draw_two':
            for _ in range(2):
                drawn_card = room.game.deck.draw_card()
                if drawn_card:
                    next_player.hand.append(drawn_card)
                else:
                    break
        elif card.get('value') == 'skip':
            next_player = room.game.next_turn()
            play_regular_turn = False
        elif card.get('value') == 'wild_draw_four':
            for _ in range(4):
                drawn_card = room.game.deck.draw_card()
                if drawn_card:
                    next_player.hand.append(drawn_card)
                else:
                    break
        for hand_card in player.hand:
            if hand_card['color'] == card['color'] and hand_card['value'] == card['value']:
                player.hand.remove(hand_card)
                break
        if card.get('isWild'):
            card['wildColor'] = card.get('selectedColor')
        room.game.played_cards.append(card)
        socketio.emit('card_played', {'player': player.username, 'card': card}, room=room.name)


    socketio.emit('update_hand', room=room.name)

    if len(player.hand) == 0:
        socketio.emit('round_over', {'winner': player.username}, room=room.name)
        room.game.end_round()
        return True

    if play_regular_turn:
        next_player = room.game.next_turn()
        if next_player:
            socketio.emit('next_turn', {'player': next_player.id}, room=room.name)
    return True

    
# --------------------------- #
#         HTTP Routes         #
# --------------------------- #

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_user', methods=['POST'])
def create_user():
    username = request.form.get('username')
    if not username:
        return redirect('/')
    player = Player(username)
    set_current_player(player)
    return redirect('/rooms')

@app.route('/rooms')
def rooms_list():
    player = get_current_player()
    if not player:
        return redirect('/')
    return render_template('rooms.html', player=player.to_json())

@app.route('/get_rooms')
def get_rooms():
    return jsonify({'rooms': [room.to_json() for room in rooms.values()]})

@app.route('/data')
def debug():
    player = get_current_player()
    return jsonify(player.to_json()) if player else jsonify({'error': 'No player in session'})
@app.route('/room_data')
def room_debug():
    player = get_current_player()
    if player and player.room and player.room in rooms:
        room = rooms[player.room]
        return jsonify(room.to_json())
    return jsonify({'error': 'No room in session'})

@app.route('/game')
def game():
    player = get_current_player()
    if player:
        return render_template('game.html', player=player.to_json())
    return redirect('/')


# --------------------------- #
#      Game Logic Routes      #
# --------------------------- #

@app.route('/draw_card', methods=['POST'])
def draw_card():
    player = get_current_player()
    if not player or not player.room or player.room not in rooms:
        return jsonify({'error': 'Invalid player or room'}), 403


    room = rooms[player.room]

    if player.id != room.game.current_player().id:
        return jsonify({'error': 'Not your turn'}), 403

    if room.game.round_draw_amount >= 3:
        next_player = room.game.next_turn()
        if next_player:
            socketio.emit('next_turn', {'player': next_player.id}, room=room.name)
        return jsonify({'error': 'You can only draw 3 cards in a row'}), 403


    room.game.suhffle_new_deck() if len(room.game.deck.cards) < 10 else None

    card = room.game.deck.draw_card()
    player.hand.append(card) if card else None
    room.game.round_draw_amount += 1

    return jsonify({'card': card}) if card else jsonify({'error': 'Deck is empty'})

@app.route('/start_game', methods=['POST'])
def start_game():
    player = get_current_player()
    if not player or not player.room or player.room not in rooms:
        return jsonify({'error': 'Invalid player or room'}), 403

    room = rooms[player.room]
    if room.game_started:
        return jsonify({'error': 'Game already started'}), 400

    room.game.start_game()
    socketio.emit('on_game_start', {'start': True}, room=room.name)
    return jsonify({'message': 'Game started'}), 200

@app.route('/next_round', methods=['POST'])
def handle_next_round():
    player = get_current_player()
    if not player or not player.room or player.room not in rooms:
        return jsonify({'error': 'Invalid player or room'}), 403

    room = rooms[player.room]
    if room.game.round_active:
        return jsonify({'error': 'Round is still active'}), 400
        return False
    
    room.game.start_new_round()
    socketio.emit('next_round', {'start': True}, room=room.name)
    return jsonify({'message': 'round started'}), 200

@app.route('/get_hand', methods=['POST'])
def get_hand():
    player = get_current_player()
    if not player or not player.room or player.room not in rooms:
        return jsonify({'error': 'Invalid player or room'}), 403

    room = rooms[player.room]
    hand = [card for card in player.hand]
    return jsonify({'hand': hand})

@app.route('/get_room', methods=['POST'])
def get_room():
    player = get_current_player()
    if not player or not player.room or player.room not in rooms:
        return jsonify({'error': 'Invalid player or room'}), 403

    room = rooms[player.room]
    return jsonify(room.to_json())

@app.route('/get_player', methods=['POST'])
def get_player():
    player = get_current_player()
    if not player:
        return jsonify({'error': 'Invalid player or room'}), 403

    return jsonify(player.to_json())

@app.route('/get_turn', methods=['POST'])
def get_turn():
    player = get_current_player()
    if not player or not player.room or player.room not in rooms:
        return jsonify({'error': 'Invalid player or room'}), 403

    room = rooms[player.room]
    return jsonify({'current_turn_player': room.game.current_player().id, 'my_turn': player.id == room.game.current_player().id})


# --------------------------- #
#           Run App           #
# --------------------------- #

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=os.environ.get("PORT", 5000))
    #socketio.run(app, debug=True)
