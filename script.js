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

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Oyun State
let currentUser = null;
let currentTheme = 'klasik';
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
    totalPairs: 8, // 16 kart için 8 çift
    gameId: null,
    player1Id: null,
    player2Id: null
};

const cardImagesSets = {
    klasik: ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🥝', '🍒'],
    sprunki: [
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png'
    ]
};

// Auth Durumu
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-ekrani').classList.remove('aktif');
        document.getElementById('ana-menu').classList.add('aktif');
        document.getElementById('kullanici-bilgisi').innerText = `Hoş geldin, ${user.displayName || user.email}`;
        joinLobby();
    } else {
        currentUser = null;
        document.getElementById('login-ekrani').classList.add('aktif');
        document.getElementById('ana-menu').classList.remove('aktif');
    }
});

// Tema Seçimi
document.getElementById('tema-sec-btn')?.addEventListener('click', () => {
    currentTheme = currentTheme === 'klasik' ? 'sprunki' : 'klasik';
    document.getElementById('tema-sec-btn').innerText = `TEMA: ${currentTheme.toUpperCase()}`;
});

// Kartları Oluştur
function createBoard() {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    
    // Temaya göre sembolleri hazırla
    const symbols = [...cardImagesSets[currentTheme]];
    const gameSymbols = [...symbols, ...symbols].sort(() => Math.random() - 0.5);

    gameSymbols.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.dataset.symbol = symbol;
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">?</div>
                <div class="card-back">${currentTheme === 'sprunki' ? `<img src="${symbol}" width="50">` : symbol}</div>
            </div>
        `;
        
        card.addEventListener('click', () => handleCardClick(card, index));
        oyunAlani.appendChild(card);
    });
}

// Sıra Kontrolü ve Tıklama
async function handleCardClick(cardElement, index) {
    if (gameState.mode === 'online') {
        const isMyTurn = (gameState.currentPlayer === 1 && currentUser.uid === gameState.player1Id) || 
                         (gameState.currentPlayer === 2 && currentUser.uid === gameState.player2Id);
        if (!isMyTurn || gameState.boardLocked) return;
    }

    if (gameState.isChecking || cardElement.classList.contains('flipped')) return;

    cardElement.classList.add('flipped');
    gameState.openCards.push({ element: cardElement, index: index, symbol: cardElement.dataset.symbol });

    if (gameState.openCards.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    gameState.isChecking = true;
    const [card1, card2] = gameState.openCards;

    if (card1.symbol === card2.symbol) {
        gameState.matchedPairs++;
        if (gameState.currentPlayer === 1) gameState.scores.player1++;
        else gameState.scores.player2++;
        
        updateUI();
        gameState.openCards = [];
        gameState.isChecking = false;
        
        if (gameState.matchedPairs === gameState.totalPairs) endGame();
    } else {
        setTimeout(() => {
            card1.element.classList.remove('flipped');
            card2.element.classList.remove('flipped');
            gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            updateUI();
            gameState.openCards = [];
            gameState.isChecking = false;
        }, 1000);
    }
}

function updateUI() {
    document.getElementById('oyuncu1-skor').innerText = gameState.scores.player1;
    document.getElementById('oyuncu2-skor').innerText = gameState.scores.player2;
    
    const display = document.getElementById('sira-gosterge');
    const isMyTurn = (gameState.currentPlayer === 1 && currentUser.uid === gameState.player1Id) || 
                     (gameState.currentPlayer === 2 && currentUser.uid === gameState.player2Id);
    
    if (display) display.innerText = isMyTurn ? "Sıra: Sizde" : "Sıra: Rakipte";
}

// Lobi ve Oyun Başlatma (Basitleştirilmiş)
function startGame(mode) {
    gameState.mode = mode;
    gameState.matchedPairs = 0;
    gameState.scores = { player1: 0, player2: 0 };
    gameState.currentPlayer = 1;
    
    document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
    document.getElementById('oyun-ekrani').classList.add('aktif');
    createBoard();
    updateUI();
}

// Diğer buton dinleyicileri...
document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('gemini-oyna-btn').onclick = () => startGame('gemini');
document.getElementById('ana-ekran-btn-3').onclick = () => location.reload();