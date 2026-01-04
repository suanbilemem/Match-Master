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
    openCards: [],
    boardLocked: false,
    currentPlayerId: null,
    scores: {},
    playerNames: {}
};

const meyveler = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍒', '🍑'];

// --- EKRAN YÖNETİMİ ---
function ekranDegistir(hedefEkranId) {
    document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
    document.getElementById(hedefEkranId).classList.add('aktif');
}

// --- AUTH ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        ekranDegistir('ana-menu');
        document.getElementById('kullanici-bilgisi').innerText = `Hoş geldin, ${user.displayName}`;
    } else {
        ekranDegistir('login-ekrani');
    }
});

// --- TAHTA KURULUMU ---
function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    gameState.openCards = [];
    gameState.boardLocked = false;
    
    symbols.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">?</div>
                <div class="card-back">${symbol}</div>
            </div>`;
        card.onclick = () => handleCardClick(index, symbol);
        oyunAlani.appendChild(card);
    });
}

// --- TIKLAMA VE SENKRONİZASYON ---
async function handleCardClick(index, symbol) {
    if (gameState.boardLocked) return;
    if (gameState.mode === 'online' && gameState.currentPlayerId !== currentUser.uid) return;

    const cards = document.querySelectorAll('.card');
    if (cards[index].classList.contains('flipped')) return;

    cards[index].classList.add('flipped');
    gameState.openCards.push({index, symbol});

    if (gameState.mode === 'online') {
        await db.collection("lobbies").doc(currentLobbyId).update({
            lastAction: { index, symbol, userId: currentUser.uid, time: Date.now() }
        });
    }

    if (gameState.openCards.length === 2) {
        gameState.boardLocked = true;
        setTimeout(checkMatch, 1000);
    }
}

async function checkMatch() {
    const [c1, c2] = gameState.openCards;
    const cards = document.querySelectorAll('.card');

    if (c1.symbol === c2.symbol) {
        if (gameState.mode === 'online') {
            let newScores = {...gameState.scores};
            newScores[currentUser.uid] = (newScores[currentUser.uid] || 0) + 1;
            await db.collection("lobbies").doc(currentLobbyId).update({ scores: newScores });
        } else {
            gameState.scores['local-p1'] = (gameState.scores['local-p1'] || 0) + 1;
            document.getElementById('oyuncu1-skor').innerText = gameState.scores['local-p1'];
        }
    } else {
        cards[c1.index].classList.remove('flipped');
        cards[c2.index].classList.remove('flipped');
        
        if (gameState.mode === 'online') {
            const doc = await db.collection("lobbies").doc(currentLobbyId).get();
            const next = doc.data().players.find(id => id !== currentUser.uid);
            await db.collection("lobbies").doc(currentLobbyId).update({ currentTurn: next });
        }
    }
    gameState.openCards = [];
    gameState.boardLocked = false;
}

// --- BUTON OLAYLARI ---
document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

document.getElementById('gemini-oyna-btn').onclick = () => {
    gameState.mode = 'local';
    document.getElementById('oyuncu1-ad').innerText = "Sen";
    document.getElementById('oyuncu2-ad').innerText = "Gemini";
    ekranDegistir('oyun-ekrani');
    createBoard([...meyveler, ...meyveler].sort(() => Math.random() - 0.5));
};

document.getElementById('lobi-btn').onclick = async () => {
    gameState.mode = 'online';
    currentLobbyId = "oda1";
    const lobbyRef = db.collection("lobbies").doc(currentLobbyId);
    
    await lobbyRef.set({
        symbols: [...meyveler, ...meyveler].sort(() => Math.random() - 0.5),
        players: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        playerNames: { [currentUser.uid]: currentUser.displayName },
        currentTurn: currentUser.uid,
        scores: { [currentUser.uid]: 0 },
        lastAction: null
    }, { merge: true });

    listenLobby(currentLobbyId);
    ekranDegistir('oyun-ekrani');
};

function listenLobby(lobbyId) {
    db.collection("lobbies").doc(lobbyId).onSnapshot((doc) => {
        const data = doc.data();
        if (!data) return;

        if (document.querySelectorAll('.card').length === 0) createBoard(data.symbols);

        gameState.scores = data.scores;
        gameState.currentPlayerId = data.currentTurn;

        const ids = Object.keys(data.playerNames);
        document.getElementById('oyuncu1-ad').innerText = data.playerNames[ids[0]] || "Bekleniyor...";
        document.getElementById('oyuncu1-skor').innerText = data.scores[ids[0]] || 0;
        
        if (ids[1]) {
            document.getElementById('oyuncu2-ad').innerText = data.playerNames[ids[1]];
            document.getElementById('oyuncu2-skor').innerText = data.scores[ids[1]] || 0;
        }

        document.getElementById('sira-gosterge').innerText = `Sıra: ${data.playerNames[data.currentTurn] || '...'}`;

        if (data.lastAction && data.lastAction.userId !== currentUser.uid) {
            const card = document.querySelectorAll('.card')[data.lastAction.index];
            if (card) card.classList.add('flipped');
        }
    });
}

// Ana ekrana dönüş butonları
document.querySelectorAll('[id^="ana-ekran-btn-"]').forEach(btn => {
    btn.onclick = () => location.reload();
});