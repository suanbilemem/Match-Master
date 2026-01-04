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
    mode: 'local', // 'local' veya 'online'
    cards: [],
    openCards: [],
    boardLocked: false,
    currentPlayerId: null, // Sıradaki oyuncunun ID'si
    scores: {},
    playerNames: {}
};

const meyveler = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🥝', '🍒', '🍑', '🍋'];

// --- AUTH VE GİRİŞ ---
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

document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

// --- OYUN TAHTASI OLUŞTURMA ---
function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    
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

// --- KART TIKLAMA (SENKRONİZE) ---
async function handleCardClick(index, symbol) {
    // Sıra kontrolü: Eğer online oyunsa ve sıra bende değilse tıklatmaz
    if (gameState.mode === 'online' && gameState.currentPlayerId !== currentUser.uid) return;
    if (gameState.boardLocked) return;

    const cardElements = document.querySelectorAll('.card');
    const card = cardElements[index];

    if (card.classList.contains('flipped')) return;

    // Kartı çevir ve Firebase'e bildir
    card.classList.add('flipped');
    gameState.openCards.push({index, symbol});

    if (gameState.mode === 'online') {
        await db.collection("lobbies").doc(currentLobbyId).update({
            lastAction: { type: 'flip', index, userId: currentUser.uid },
            openCards: gameState.openCards
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
        // Puan ekle ve Firebase'e yaz
        if (gameState.mode === 'online') {
            const newScores = {...gameState.scores};
            newScores[currentUser.uid] = (newScores[currentUser.uid] || 0) + 1;
            await db.collection("lobbies").doc(currentLobbyId).update({
                scores: newScores,
                openCards: []
            });
        }
    } else {
        // Kartları kapat ve sırayı değiştir
        cardElements[c1.index].classList.remove('flipped');
        cardElements[c2.index].classList.remove('flipped');
        
        if (gameState.mode === 'online') {
            // Sırayı diğer oyuncuya devret
            const lobbyDoc = await db.collection("lobbies").doc(currentLobbyId).get();
            const players = lobbyDoc.data().players;
            const nextPlayer = players.find(id => id !== currentUser.uid);
            
            await db.collection("lobbies").doc(currentLobbyId).update({
                currentTurn: nextPlayer,
                openCards: []
            });
        }
    }
    
    gameState.openCards = [];
    gameState.boardLocked = false;
}

// --- LOBİ SİSTEMİ (ONLINE OYUN) ---
document.getElementById('lobi-btn').onclick = async () => {
    gameState.mode = 'online';
    const gameSymbols = [...meyveler, ...meyveler].sort(() => Math.random() - 0.5);
    
    // Basit bir lobi oluşturma (Test için sabit 'oda1')
    currentLobbyId = "oda1"; 
    const lobbyRef = db.collection("lobbies").doc(currentLobbyId);

    await lobbyRef.set({
        symbols: gameSymbols,
        players: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        playerNames: { [currentUser.uid]: currentUser.displayName },
        currentTurn: currentUser.uid,
        scores: { [currentUser.uid]: 0 },
        openCards: []
    }, { merge: true });

    listenLobby(currentLobbyId);
    
    document.getElementById('ana-menu').classList.remove('aktif');
    document.getElementById('oyun-ekrani').classList.add('aktif');
};

// --- CANLI DİNLEME (onSnapshot) ---
function listenLobby(lobbyId) {
    db.collection("lobbies").doc(lobbyId).onSnapshot((doc) => {
        const data = doc.data();
        if (!data) return;

        // Tahtayı ilk kez kur
        if (document.querySelectorAll('.card').length === 0) {
            createBoard(data.symbols);
        }

        // Skorları ve Sırayı Güncelle
        gameState.scores = data.scores;
        gameState.currentPlayerId = data.currentTurn;
        
        // UI Güncelleme (Skor tabelası)
        // Burada senin HTML'indeki ID'lere göre güncelleme yapmalısın
        console.log("Sıra kimde:", data.currentTurn);
    });
}

document.getElementById('gemini-oyna-btn').onclick = () => {
    gameState.mode = 'local';
    document.getElementById('ana-menu').classList.remove('aktif');
    document.getElementById('oyun-ekrani').classList.add('aktif');
    createBoard([...meyveler, ...meyveler].sort(() => Math.random() - 0.5));
};

document.getElementById('ana-ekran-btn-3').onclick = () => location.reload();