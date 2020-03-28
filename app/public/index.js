// type Card {suit: int, value: int}
// players.state {hand: [Card], tricks: int, score: int}
// state.dealer int
// state.numSuits int
// state.deck [Card]
// state.lead ?Card
// state.trump Card
// state.staging ?Card

const NUM_RANKS = 11;
const TRICKS_PER_ROUND = 13;

$(document).ready(function() {
	$("#start_over").click(prepare);
});

function prepare() {
	state.currentPlayer = myIndex;
	state.dealer = -1;
	state.numSuits = Number.parseInt($("#num_suits").val());
	state.staging = null;
	for (var i = 0; i < state.players.length; i++) {
		state.players[i].state = newState();
	}
	deal();
	sendState("prepare");
}

function deal() {
	state.dealer = (state.dealer + 1) % state.players.length;
	state.lead = null;
	state.deck = buildDeck();
	for (var i = 0; i < state.players.length; i++) {
		Object.assign(state.players[i].state, {
			hand: dealHand(),
			tricks: 0
		});
	}
	state.trump = state.deck.shift();
}

function buildDeck() {
	var deck = [];
	for (var i = 0; i < state.numSuits; i++) {
		for (var j = 1; j <= NUM_RANKS; j++) {
			deck.push({ suit: i, value: j });
		}
	}
	shuffleArray(deck);
	return deck;
}

function dealHand() {
	var hand = [];
	for (var i = 0; i < TRICKS_PER_ROUND; i++) {
		hand.push(state.deck.shift());
	}
	hand = sortHand(hand);
	return hand;
}

function sortHand(hand) {
	hand.sort(function(a, b) {
		return getSortPosition(a) - getSortPosition(b);
	});
	return hand;
}

function getText(card) {
	return card.value + "/" + card.suit;
}

function getSortPosition(card) {
	return card.suit * NUM_RANKS + card.value;
}

function newState() {
	var playerState = {
		score: 0
	};
	return playerState;
}

function setNumSuits() {
	$("#num_suits").val(state.numSuits);
}

function setHand() {
	$("#hand").empty();
	var hand = me().state.hand;
	for (var i = 0; i < hand.length; i++) {
		var card = hand[i];
		var text = getText(card);
		$("<div>")
			.attr("data-index", i)
			.text(text)
			.addClass("card")
			.addClass("bubble")
			.addClass("inline")
			.appendTo("#hand");
	}
	if (isMyTurn()) {
		$(".card")
			.addClass("hover_pointer")
			.click(play);
	}
}

function setPlayers() {
	$("#players_state").empty();
	for (var i = 0; i < state.players.length; i++) {
		var player = state.players[i];
		$("<div>")
			.attr("data-index", i)
			.addClass("player_state")
			.addClass("bubble")
			.addClass("inline")
			.append($("<p>").text(player.name))
			.append($("<p>").text("score: " + player.state.score))
			.append($("<p>").text("tricks: " + player.state.tricks))
			.appendTo("#players_state");
	}
}

function play(cardDOM) {
	var index = $(cardDOM).attr("data-index");
	var card = me().state.hand[index];
	if (state.staging !== null) {
		handlePre(card);
		card = state.staging;
		state.staging = null;
	} else if (state.lead !== null && state.lead.value === 11) {
		if (cantPlay(card, state.lead.suit))
			return alert("cant play that card");
	}
	me().state.hand.splice(index, 1)[0];
	var duringMessage = handleDuring(card);
	if (duringMessage !== null) {
		state.staging = card;
		return sendState(duringMessage);
	}
	var text = getText(card);
	if (state.lead === null) {
		state.lead = card;
		advanceTurn();
		sendState(`lead with ${text}`);
	} else {
		var winner;
		if (wins(card)) {
			winner = me();
			advanceTurn();
		} else {
			winner = state.players[state.currentPlayer];
		}
		winner.state.tricks++;
		handlePost(card, winner);
		var message = `played ${text}`;
		if (me().state.hand.length === 0) {
			message = `${message} - new hand`;
			scoreFromTricks();
			deal();
		}
		sendState(message);
	}
}

function cantPlay(card, suit) {
	if (card.suit === suit && card.value === 1) {
		return false;
	}
	var hand = me().state.hand;
	for (var i = 0; i < hand.length; i++) {
		var handCard = hand[i];
		if (handCard.suit === suit) {
			if (card.suit !== suit || handCard.value > card.value) return true;
		}
	}
	return false;
}

function handlePre(card) {
	if (state.staging.value === 5) {
		state.deck.unshift(card);
	} else if (state.staging.value === 3) {
		state.trump = card;
	}
}

function handleDuring(card) {
	if (card.value === 5) {
		var hand = me().state.hand;
		hand.shift(state.deck.shift());
		sortHand(hand);
		return "draws a card";
	}
	if (card.value === 3) {
		var hand = me().state.hand;
		hand.shift(state.trump);
		sortHand(hand);
		return "swaps trump";
	}
	return null;
}

function handlePost(card, winner) {
	if (card.value === 1) {
		if (winner !== me()) {
			advanceTurn();
		}
	} else if (state.lead.value === 1) {
		if (winner === me()) {
			advanceTurn();
		}
	}
	if (card.value === 7) winner.state.score++;
	if (state.lead.value === 7) winner.state.score++;
	state.lead = null;
}

function wins(card) {
	if (card.suit === state.lead.suit) {
		return card.value > state.lead.value;
	} else {
		if (card.value === 9) {
			if (state.lead.value !== 9) {
				if (state.lead.suit === state.trump.suit) {
					return card.value > state.lead.value;
				} else {
					return true;
				}
			}
		} else if (state.lead.value === 9) {
			if (card.value < state.lead.value) {
				return false;
			}
		}
		return card.suit === state.trump.suit;
	}
}

function scoreFromTricks() {
	for (var i = 0; i < state.players.length; i++) {
		var playerState = state.players[i].state;
		if (playerState.tricks === 0) {
			playerState.score += 6;
		} else if (playerState.tricks === 1) {
			playerState.score += 6;
		} else if (playerState.tricks === 2) {
			playerState.score += 6;
		} else if (playerState.tricks === 3) {
			playerState.score += 6;
		} else if (playerState.tricks === 4) {
			playerState.score += 1;
		} else if (playerState.tricks === 5) {
			playerState.score += 2;
		} else if (playerState.tricks === 6) {
			playerState.score += 3;
		} else if (playerState.tricks === 7) {
			playerState.score += 6;
		} else if (playerState.tricks === 8) {
			playerState.score += 6;
		} else if (playerState.tricks === 9) {
			playerState.score += 6;
		}
	}
}

function update() {
	setNumSuits();
	setHand();
	setPlayers();
	setTrump();
	setLead();
}

function setTrump() {
	var text = getText(state.trump);
	$("#trump").text(text);
}

function setLead() {
	if (state.lead === null) return;
	var text = getText(state.lead);
	$("#lead").text(text);
}
