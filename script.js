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

// Firebase başlatma (Compat versiyonu)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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
function ekranDegistir(ekranId) {
    document.querySelectorAll('.ekran').forEach(ekran => {
        ekran.classList.remove('aktif');
        ekran.style.display = 'none';
    });
    const hedef = document.getElementById(ekranId);
    if (hedef) {
        hedef.classList.add('aktif');
        hedef.style.display = 'flex'; // Seninki flex olabilir, block da deneyebilirsin
    }
}

// --- AUTH TAKİBİ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        ekranDegistir('ana-menu');
        document.getElementById('kullanici-bilgisi').innerText = `Hoş geldin, ${user.displayName}`;
    } else {
        ekranDegistir('login-ekrani');
    }
});

// --- TAHTA OLUŞTURMA ---
function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    if (!oyunAlani) return;
    
    oyunAlani.innerHTML = '';
    gameState.openCards = [];
    gameState.boardLocked = false;
    
    symbols.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">?</div>
                <div class="card-back">${symbol}</div>
            </div>`;
        card.onclick = () => handleCardClick(index, symbol, card);
        oyunAlani.appendChild(card);
    });
}

// --- TIKLAMA ---
function handleCardClick(index, symbol, cardElement) {
    if (gameState.boardLocked || cardElement.classList.contains('flipped')) return;

    cardElement.classList.add('flipped');
    gameState.openCards.push({index, symbol, cardElement});

    if (gameState.openCards.length === 2) {
        gameState.boardLocked = true;
        setTimeout(checkMatch, 1000);
    }
}

function checkMatch() {
    const [c1, c2] = gameState.openCards;
    if (c1.symbol === c2.symbol) {
        gameState.scores.p1 = (gameState.scores.p1 || 0) + 1;
        document.getElementById('oyuncu1-skor').innerText = gameState.scores.p1;
    } else {
        c1.cardElement.classList.remove('flipped');
        c2.cardElement.classList.remove('flipped');
    }
    gameState.openCards = [];
    gameState.boardLocked = false;
}

// --- BUTONLAR ---
document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

document.getElementById('gemini-oyna-btn').onclick = () => {
    gameState.mode = 'local';
    gameState.scores = { p1: 0, p2: 0 };
    document.getElementById('oyuncu1-ad').innerText = "Sen";
    document.getElementById('oyuncu2-ad').innerText = "Gemini";
    document.getElementById('oyuncu1-skor').innerText = "0";
    document.getElementById('oyuncu2-skor').innerText = "0";
    ekranDegistir('oyun-ekrani');
    createBoard([...meyveler, ...meyveler].sort(() => Math.random() - 0.5));
};

document.getElementById('ana-ekran-btn-3').onclick = () => location.reload();