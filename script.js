const firebaseConfig = {
  apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
  authDomain: "match-master-af628.firebaseapp.com",
  databaseURL: "https://match-master-af628-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "match-master-af628",
  storageBucket: "match-master-af628.firebasestorage.app",
  messagingSenderId: "508395504322",
  appId: "1:508395504322:web:93343b6445b24a27b5715b",
  measurementId: "G-ZRJNQGRT7B"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let gameState = {
    mode: null,
    cards: [],
    openCards: [],
    isChecking: false,
    boardLocked: false,
    currentPlayer: 1,
    scores: { player1: 0, player2: 0 },
    playerNames: { player1: 'Sen', player2: 'Rakip' },
    matchedPairs: 0,
    totalPairs: 10
};

const meyveler = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🥝', '🍒', '🍑', '🍋'];

// Auth Kontrolü
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-ekrani').classList.remove('aktif');
        document.getElementById('ana-menu').classList.add('aktif');
        document.getElementById('kullanici-bilgisi').innerText = `Hoş geldin, ${user.displayName}`;
    } else {
        document.getElementById('login-ekrani').classList.add('aktif');
    }
});

function createBoard() {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    const gameSymbols = [...meyveler, ...meyveler].sort(() => Math.random() - 0.5);

    gameSymbols.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">?</div>
                <div class="card-back">${symbol}</div>
            </div>`;
        card.onclick = () => handleCardClick(card, symbol);
        oyunAlani.appendChild(card);
    });
}

function handleCardClick(card, symbol) {
    if (gameState.boardLocked || card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    gameState.openCards.push({card, symbol});

    if (gameState.openCards.length === 2) {
        gameState.boardLocked = true;
        setTimeout(checkMatch, 1000);
    }
}

function checkMatch() {
    const [c1, c2] = gameState.openCards;
    if (c1.symbol === c2.symbol) {
        gameState.matchedPairs++;
    } else {
        c1.card.classList.remove('flipped');
        c2.card.classList.remove('flipped');
    }
    gameState.openCards = [];
    gameState.boardLocked = false;
}

document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('gemini-oyna-btn').onclick = () => {
    document.getElementById('ana-menu').classList.remove('aktif');
    document.getElementById('oyun-ekrani').classList.add('aktif');
    createBoard();
};
document.getElementById('ana-ekran-btn-3').onclick = () => location.reload();