const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    databaseURL: "https://match-master-af628-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

// Firebase Başlatma
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentLobbyId = null;
let lobbyUnsubscribe = null; 

let gameState = {
    mode: 'local', // 'local' veya 'online'
    openCards: [],
    boardLocked: false,
    scores: {},
    currentPlayerId: null
};

const meyveler = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍒', '🍑'];

// --- EKRAN YÖNETİMİ ---
function ekranDegistir(id) {
    document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
    const hedef = document.getElementById(id);
    if (hedef) hedef.classList.add('aktif');
}

// --- KULLANICI TAKİBİ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        ekranDegistir('ana-menu');
        document.getElementById('kullanici-bilgisi').innerText = `Hoş geldin, ${user.displayName}`;
    } else {
        ekranDegistir('login-ekrani');
    }
});

// --- TAHTA OLUŞTURMA (Senin CSS yapına göre) ---
function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    gameState.openCards = [];
    gameState.boardLocked = false;
    
    symbols.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'kart'; // Senin CSS sınıfın
        card.innerHTML = `<span class="card-emoji">${s}</span>`;
        card.onclick = () => handleCardClick(i, s, card);
        oyunAlani.appendChild(card);
    });
}

// --- KART TIKLAMA ---
function handleCardClick(index, symbol, cardElement) {
    if (gameState.boardLocked) return;
    if (cardElement.classList.contains('acik') || cardElement.classList.contains('eslesen')) return;

    // MOD: GEMINI (YEREL)
    if (gameState.mode === 'local') {
        cardElement.classList.add('acik');
        gameState.openCards.push({index, symbol, cardElement});
        
        if (gameState.openCards.length === 2) {
            gameState.boardLocked = true;
            setTimeout(checkMatchLocal, 1000);
        }
    } 
    // MOD: LOBİ (ONLINE)
    else if (gameState.mode === 'online') {
        if (gameState.currentPlayerId !== currentUser.uid) return;
        
        db.collection("lobbies").doc(currentLobbyId).update({
            lastAction: { index, symbol, userId: currentUser.uid, time: Date.now() }
        });
    }
}

// --- GEMINI MANTIĞI ---
function checkMatchLocal() {
    const [c1, c2] = gameState.openCards;
    if (c1.symbol === c2.symbol) {
        c1.cardElement.classList.add('eslesen');
        c2.cardElement.classList.add('eslesen');
        gameState.scores.p1 = (gameState.scores.p1 || 0) + 1;
        document.getElementById('oyuncu1-skor').innerText = gameState.scores.p1;
    } else {
        c1.cardElement.classList.remove('acik');
        c2.cardElement.classList.remove('acik');
    }
    gameState.openCards = [];
    gameState.boardLocked = false;
}

// --- LOBİ DİNLEME ---
function listenLobby(lobbyId) {
    if (lobbyUnsubscribe) lobbyUnsubscribe();
    
    lobbyUnsubscribe = db.collection("lobbies").doc(lobbyId).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;

        if (document.getElementById('oyun-alani').children.length === 0) {
            createBoard(data.symbols);
        }

        if (data.lastAction) {
            const card = document.getElementById('oyun-alani').children[data.lastAction.index];
            if (card && !card.classList.contains('acik')) {
                card.classList.add('acik');
                gameState.openCards.push({ ...data.lastAction, cardElement: card });
            }
        }

        gameState.currentPlayerId = data.currentTurn;
        document.getElementById('sira-gosterge').innerText = `Sıra: ${data.playerNames[data.currentTurn] || '...'}`;
        
        const ids = Object.keys(data.playerNames);
        document.getElementById('oyuncu1-ad').innerText = data.playerNames[ids[0]] || "Oyuncu 1";
        document.getElementById('oyuncu1-skor').innerText = data.scores[ids[0]] || 0;
        if(ids[1]) {
            document.getElementById('oyuncu2-ad').innerText = data.playerNames[ids[1]] || "Oyuncu 2";
            document.getElementById('oyuncu2-skor').innerText = data.scores[ids[1]] || 0;
        }

        if (gameState.openCards.length === 2) {
            gameState.boardLocked = true;
            setTimeout(() => checkMatchOnline(data), 1000);
        }
    });
}

async function checkMatchOnline(data) {
    const [c1, c2] = gameState.openCards;
    if (gameState.currentPlayerId === currentUser.uid) {
        if (c1.symbol === c2.symbol) {
            let newScores = {...data.scores};
            newScores[currentUser.uid]++;
            await db.collection("lobbies").doc(currentLobbyId).update({ scores: newScores, lastAction: null });
        } else {
            const next = Object.keys(data.playerNames).find(id => id !== currentUser.uid);
            await db.collection("lobbies").doc(currentLobbyId).update({ currentTurn: next, lastAction: null });
        }
    } else {
        if (c1.symbol !== c2.symbol) {
            c1.cardElement.classList.remove('acik');
            c2.cardElement.classList.remove('acik');
        } else {
            c1.cardElement.classList.add('eslesen');
            c2.cardElement.classList.add('eslesen');
        }
    }
    gameState.openCards = [];
    gameState.boardLocked = false;
}

// --- BUTONLAR ---
document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

document.getElementById('gemini-oyna-btn').onclick = () => {
    if (lobbyUnsubscribe) lobbyUnsubscribe();
    gameState.mode = 'local';
    gameState.scores = { p1: 0, p2: 0 };
    document.getElementById('oyuncu1-ad').innerText = "Sen";
    document.getElementById('oyuncu2-ad').innerText = "Gemini";
    document.getElementById('oyuncu1-skor').innerText = "0";
    document.getElementById('oyuncu2-skor').innerText = "0";
    ekranDegistir('oyun-ekrani');
    createBoard([...meyveler, ...meyveler].sort(() => Math.random() - 0.5));
};

document.getElementById('lobi-btn').onclick = async () => {
    gameState.mode = 'online';
    currentLobbyId = "oda1";
    ekranDegistir('oyun-ekrani');
    
    await db.collection("lobbies").doc(currentLobbyId).set({
        symbols: [...meyveler, ...meyveler].sort(() => Math.random() - 0.5),
        playerNames: { [currentUser.uid]: currentUser.displayName },
        scores: { [currentUser.uid]: 0 },
        currentTurn: currentUser.uid,
        lastAction: null
    }, { merge: true });

    listenLobby(currentLobbyId);
};

// Tüm "Ana Ekran" butonları için tek tetikleyici
document.querySelectorAll('[id^="ana-ekran-btn-"]').forEach(btn => {
    btn.onclick = () => location.reload();
});

document.getElementById('oyundan-cik-btn').onclick = () => auth.signOut();