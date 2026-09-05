const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const game = {
  deck: [],
  balance: 1000,
  bet: 25,
  currentBet: 0,
  dealerHand: [],
  playerHand: [],
  inRound: false,
  roundOver: false,
  dealerRevealed: false,
};

const els = {
  balance: document.getElementById('balance'),
  betValue: document.getElementById('bet-value'),
  dealerCards: document.getElementById('dealer-cards'),
  playerCards: document.getElementById('player-cards'),
  dealerScore: document.getElementById('dealer-score'),
  playerScore: document.getElementById('player-score'),
  message: document.getElementById('message'),
  deal: document.getElementById('deal'),
  playActions: document.getElementById('play-actions'),
  hit: document.getElementById('hit'),
  stand: document.getElementById('stand'),
  double: document.getElementById('double'),
  betLess: document.getElementById('bet-less'),
  betMore: document.getElementById('bet-more'),
  chips: [...document.querySelectorAll('.chip')],
  refill: document.getElementById('refill'),
  rulesOpen: document.getElementById('rules-open'),
  rulesClose: document.getElementById('rules-close'),
  rulesDone: document.getElementById('rules-done'),
  rulesDialog: document.getElementById('rules-dialog'),
  actionHint: document.getElementById('action-hint'),
};

function createDeck() {
  const deck = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({ suit, rank });
    });
  });
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function ensureDeck() {
  if (game.deck.length < 18) {
    game.deck = shuffleDeck(createDeck());
  }
}

function drawCard() {
  ensureDeck();
  return game.deck.pop();
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function getCardValue(card) {
  if (card.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.rank)) return 10;
  return Number(card.rank);
}

function getHandTotal(hand) {
  let total = 0;
  let aces = 0;

  hand.forEach((card) => {
    total += getCardValue(card);
    if (card.rank === 'A') {
      aces += 1;
    }
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && getHandTotal(hand) === 21;
}

function renderBalance() {
  els.balance.textContent = formatNumber(game.balance);
  els.betValue.textContent = formatNumber(game.bet);
  els.refill.hidden = game.balance > 0;
}

function renderChipSelection() {
  els.chips.forEach((chip) => {
    const selected = Number(chip.dataset.bet) === game.bet;
    chip.setAttribute('aria-pressed', String(selected));
  });
}

function updateScores() {
  const dealerTotal = game.dealerHand.length ? getHandTotal(game.dealerHand) : 0;
  const playerTotal = game.playerHand.length ? getHandTotal(game.playerHand) : 0;

  els.dealerScore.textContent = game.dealerRevealed ? String(dealerTotal) : (game.dealerHand.length ? '—' : '—');
  els.playerScore.textContent = game.playerHand.length ? String(playerTotal) : '—';
}

function cardMarkup(card, hidden = false) {
  const cardEl = document.createElement('div');
  const isRed = ['♥', '♦'].includes(card.suit);
  cardEl.className = `card${hidden ? ' card-back' : isRed ? ' red' : ''}`;
  if (!hidden) {
    cardEl.dataset.rank = card.rank;
    cardEl.dataset.suit = card.suit;
    cardEl.innerHTML = `<span>${card.suit}</span>`;
  } else {
    cardEl.setAttribute('role', 'img');
    cardEl.setAttribute('aria-label', 'Face-down card');
    cardEl.innerHTML = '<span>♠</span>';
  }
  return cardEl;
}

function renderCards() {
  els.dealerCards.innerHTML = '';
  if (!game.dealerHand.length) {
    els.dealerCards.innerHTML = '<div class="card card-slot" aria-hidden="true">♠</div><div class="card card-slot" aria-hidden="true">♠</div>';
    return;
  }

  game.dealerHand.forEach((card, index) => {
    const hidden = !game.dealerRevealed && index === 0 && !game.roundOver;
    els.dealerCards.appendChild(cardMarkup(card, hidden));
  });

  els.playerCards.innerHTML = '';
  if (!game.playerHand.length) {
    els.playerCards.innerHTML = '<div class="card card-slot" aria-hidden="true">♠</div><div class="card card-slot" aria-hidden="true">♠</div>';
    return;
  }

  game.playerHand.forEach((card) => {
    els.playerCards.appendChild(cardMarkup(card, false));
  });
}

function setMessage(message, hint = '') {
  els.message.textContent = message;
  els.actionHint.textContent = hint || 'Your seat. Your call.';
}

function setActionVisibility(visible) {
  els.playActions.hidden = !visible;
}

function canDouble() {
  return game.inRound && !game.roundOver && game.playerHand.length === 2 && game.balance >= game.currentBet * 2;
}

function updateControls() {
  const playerCanAct = game.inRound && !game.roundOver;
  setActionVisibility(playerCanAct);
  els.hit.disabled = !playerCanAct;
  els.stand.disabled = !playerCanAct;
  els.double.disabled = !canDouble();
  els.deal.disabled = game.inRound && !game.roundOver;
}

function finishRound() {
  game.roundOver = true;
  game.inRound = false;
  game.dealerRevealed = true;
  renderCards();
  updateScores();
  updateControls();
}

function settleRound() {
  const dealerTotal = getHandTotal(game.dealerHand);
  const playerTotal = getHandTotal(game.playerHand);

  if (playerTotal > 21) {
    setMessage(`Bust. Dealer wins ${formatNumber(game.currentBet)} chips.`, 'The table is waiting for your next bet.');
    game.balance -= game.currentBet;
    renderBalance();
    finishRound();
    return;
  }

  if (dealerTotal > 21) {
    setMessage(`Dealer busts. You win ${formatNumber(game.currentBet)} chips.`, 'Another hand?');
    game.balance += game.currentBet;
    renderBalance();
    finishRound();
    return;
  }

  if (playerTotal > dealerTotal) {
    setMessage(`You win ${formatNumber(game.currentBet)} chips.`, 'Cards are in your favor.');
    game.balance += game.currentBet;
    renderBalance();
    finishRound();
    return;
  }

  if (playerTotal < dealerTotal) {
    setMessage(`Dealer wins ${formatNumber(game.currentBet)} chips.`, 'The house takes the round.');
    game.balance -= game.currentBet;
    renderBalance();
    finishRound();
    return;
  }

  setMessage(`Push. Your bet is returned.`, 'No change to the stack.');
  finishRound();
}

function revealDealerAndResolve() {
  game.dealerRevealed = true;
  while (getHandTotal(game.dealerHand) < 17) {
    game.dealerHand.push(drawCard());
  }
  renderCards();
  updateScores();
  settleRound();
}

function handleBlackjackCheck() {
  if (isBlackjack(game.playerHand) || isBlackjack(game.dealerHand)) {
    game.dealerRevealed = true;
    renderCards();
    updateScores();

    if (isBlackjack(game.playerHand) && isBlackjack(game.dealerHand)) {
      setMessage('Blackjack push. Your bet is returned.', 'The table is tied at 21.');
      finishRound();
      return true;
    }

    if (isBlackjack(game.playerHand)) {
      setMessage('Blackjack! You win 3 to 2.', 'A perfect opening hand.');
      game.balance += Math.round(game.currentBet * 1.5);
      renderBalance();
      finishRound();
      return true;
    }

    if (isBlackjack(game.dealerHand)) {
      setMessage('Dealer blackjack. House wins.', 'The dealer found 21 right away.');
      game.balance -= game.currentBet;
      renderBalance();
      finishRound();
      return true;
    }
  }

  return false;
}

function dealRound() {
  if (game.inRound || (game.balance <= 0 && !game.roundOver)) {
    return;
  }

  if (game.bet > game.balance) {
    setMessage('Not enough chips for that bet.', 'Lower the bet or refill your stack.');
    return;
  }

  game.dealerHand = [];
  game.playerHand = [];
  game.currentBet = game.bet;
  game.inRound = true;
  game.roundOver = false;
  game.dealerRevealed = false;

  game.dealerHand.push(drawCard());
  game.playerHand.push(drawCard());
  game.dealerHand.push(drawCard());
  game.playerHand.push(drawCard());

  renderCards();
  updateScores();
  setMessage('The cards are live. Your move.', 'Hit, stand, or double.');
  updateControls();

  if (handleBlackjackCheck()) {
    return;
  }
}

function hitCard() {
  if (!game.inRound || game.roundOver) return;

  game.playerHand.push(drawCard());
  renderCards();
  updateScores();

  const total = getHandTotal(game.playerHand);
  if (total > 21) {
    setMessage('Bust. Dealer wins.', 'Your hand went over 21.');
    game.balance -= game.currentBet;
    renderBalance();
    finishRound();
    return;
  }

  if (total === 21) {
    setMessage('21! Standing pat.', 'The table is locked in.');
    revealDealerAndResolve();
    return;
  }

  setMessage('Card dealt. The table is yours.', 'Hit, stand, or double.');
  updateControls();
}

function standTurn() {
  if (!game.inRound || game.roundOver) return;
  revealDealerAndResolve();
}

function doubleDown() {
  if (!canDouble()) return;

  game.currentBet *= 2;
  game.playerHand.push(drawCard());
  renderCards();
  updateScores();

  const total = getHandTotal(game.playerHand);
  setMessage(total > 21 ? 'Double down bust. House wins.' : 'Double down complete. Dealer plays out.', total > 21 ? 'The second card pushed you past 21.' : 'The bet is doubled and the hand is locked.');

  if (total > 21) {
    game.balance -= game.currentBet;
    renderBalance();
    finishRound();
    return;
  }

  revealDealerAndResolve();
}

function adjustBet(step) {
  if (game.inRound && !game.roundOver) return;

  const nextValue = Math.min(500, Math.max(5, game.bet + step));
  game.bet = nextValue;
  renderBalance();
  renderChipSelection();
}

function setChipBet(value) {
  if (game.inRound && !game.roundOver) return;
  const nextValue = Math.min(500, Math.max(5, Number(value)));
  game.bet = nextValue;
  renderBalance();
  renderChipSelection();
}

function refillBalance() {
  game.balance = 1000;
  game.bet = Math.min(25, game.balance);
  renderBalance();
  renderChipSelection();
  setMessage('Fresh stack. Place your bet.', 'Choose a wager and deal again.');
  game.dealerHand = [];
  game.playerHand = [];
  game.inRound = false;
  game.roundOver = false;
  game.dealerRevealed = false;
  renderCards();
  updateScores();
  updateControls();
}

function initRules() {
  els.rulesOpen.addEventListener('click', () => {
    els.rulesDialog.showModal();
  });

  els.rulesClose.addEventListener('click', () => {
    els.rulesDialog.close();
  });

  els.rulesDone.addEventListener('click', () => {
    els.rulesDialog.close();
  });
}

function attachHandlers() {
  els.deal.addEventListener('click', dealRound);
  els.hit.addEventListener('click', hitCard);
  els.stand.addEventListener('click', standTurn);
  els.double.addEventListener('click', doubleDown);
  els.refill.addEventListener('click', refillBalance);
  els.betLess.addEventListener('click', () => adjustBet(-5));
  els.betMore.addEventListener('click', () => adjustBet(5));

  els.chips.forEach((chip) => {
    chip.addEventListener('click', () => setChipBet(chip.dataset.bet));
  });
}

function init() {
  game.deck = shuffleDeck(createDeck());
  renderBalance();
  renderChipSelection();
  renderCards();
  updateScores();
  updateControls();
  initRules();
  attachHandlers();
}

init();
