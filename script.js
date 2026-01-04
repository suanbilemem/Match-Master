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
let currentLobbyId = null;
let gameState = {
    mode: 'local',
    cards: [],
    openCards: [],
    boardLocked: false,
    currentPlayerId: null,
    scores: { player1: 0, player2: 0 },
    playerNames: { player1: 'Sen', player2: 'Rakip' }
};

const meyveler = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🥝', '🍒', '🍑', '🍋'];

// --- AUTH ---
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

// --- OYUN TAHTASI ---
function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    
    symbols.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card'; // Başlangıçta kapalı
        card.dataset.index = index;
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">?</div>
                <div class="card-back">${symbol}</div>
            </div>`;
        card.onclick = () => handleCardClick(index, symbol);
        oyunAlani.appendChild(card);
    });
    
    gameState.openCards = [];
    gameState.boardLocked = false;
}

// --- TIKLAMA MANTIĞI ---
async function handleCardClick(index, symbol) {
    if (gameState.boardLocked) return;
    if (gameState.mode === 'online' && gameState.currentPlayerId !== currentUser.uid) return;

    const cardElements = document.querySelectorAll('.card');
    const card = cardElements[index];
    if (card.classList.contains('flipped')) return;

    card.classList.add('flipped');
    gameState.openCards.push({index, symbol});

    if (gameState.mode === 'online') {
        await db.collection("lobbies").doc(currentLobbyId).update({
            lastFlipped: { index, symbol, userId: currentUser.uid },
            openCardsCount: gameState.openCards.length
        });
    }

    if (gameState.openCards.length === 2) {
        gameState.boardLocked = true;
        setTimeout(checkMatch, 1000);
    }
}

// --- EŞLEŞME KONTROLÜ ---
async function checkMatch() {
    const [c1, c2] = gameState.openCards;
    const cardElements = document.querySelectorAll('.card');

    if (c1.symbol === c2.symbol) {
        if (gameState.mode === 'online') {
            const newScores = {...gameState.scores};
            newScores[currentUser.uid] = (newScores[currentUser.uid] || 0) + 1;
            await db.collection("lobbies").doc(currentLobbyId).update({ scores: newScores });
        } else {
            gameState.scores.player1++; // Basit local skor
        }
    } else {
        cardElements[c1.index].classList.remove('flipped');
        cardElements[c2.index].classList.remove('flipped');
        
        if (gameState.mode === 'online') {
            const lobbyDoc = await db.collection("lobbies").doc(currentLobbyId).get();
            const nextPlayer = lobbyDoc.data().players.find(id => id !== currentUser.uid);
            await db.collection("lobbies").doc(currentLobbyId).update({ currentTurn: nextPlayer });
        }
    }
    
    gameState.openCards = [];
    gameState.boardLocked = false;
}

// --- MODLAR ---
document.getElementById('gemini-oyna-btn').onclick = () => {
    gameState.mode = 'local';
    document.querySelector('.score-box:nth-child(1) h3').innerText = currentUser.displayName;
    document.querySelector('.score-box:nth-child(2) h3').innerText = 'Gemini';
    document.getElementById('ana-menu').classList.remove('aktif');
    document.getElementById('oyun-ekrani').classList.add('aktif');
    createBoard([...meyveler, ...meyveler].sort(() => Math.random() - 0.5));
};

document.getElementById('lobi-btn').onclick = async () => {
    gameState.mode = 'online';
    currentLobbyId = "oda1"; 
    const gameSymbols = [...meyveler, ...meyveler].sort(() => Math.random() - 0.5);
    
    const lobbyRef = db.collection("lobbies").doc(currentLobbyId);
    await lobbyRef.set({
        symbols: gameSymbols,
        players: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        playerNames: { [currentUser.uid]: currentUser.displayName },
        currentTurn: currentUser.uid,
        scores: { [currentUser.uid]: 0 }
    }, { merge: true });

    listenLobby(currentLobbyId);
    document.getElementById('ana-menu').classList.remove('aktif');
    document.getElementById('oyun-ekrani').classList.add('aktif');
};

// --- SENKRONİZASYON ---
function listenLobby(lobbyId) {
    db.collection("lobbies").doc(lobbyId).onSnapshot((doc) => {
        const data = doc.data();
        if (!data) return;

        if (document.querySelectorAll('.card').length === 0) createBoard(data.symbols);

        // İsim ve Skor Güncelleme
        const ids = Object.keys(data.playerNames);
        if (ids[0]) {
            document.querySelector('.score-box:nth-child(1) h3').innerText = data.playerNames[ids[0]];
            document.getElementById('score-1').innerText = data.scores[ids[0]] || 0;
        }
        if (ids[1]) {
            document.querySelector('.score-box:nth-child(2) h3').innerText = data.playerNames[ids[1]];
            document.getElementById('score-2').innerText = data.scores[ids[1]] || 0;
        }

        gameState.currentPlayerId = data.currentTurn;
        document.getElementById('sira-bilgisi').innerText = `Sıra: ${data.playerNames[data.currentTurn] || '...'}`;

        // Rakip kart açtıysa senin ekranında da açılsın
        if (data.lastFlipped && data.lastFlipped.userId !== currentUser.uid) {
            const card = document.querySelectorAll('.card')[data.lastFlipped.index];
            if (card) card.classList.add('flipped');
        }
    });
}

document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('ana-ekran-btn-3').onclick = () => location.reload();