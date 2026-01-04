// Firebase Ayarları (Senin bilgilerini korudum)
const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    databaseURL: "https://match-master-af628-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null, currentLobbyId = null, lobbyUnsubscribe = null;
let gameState = { mode: 'local', openCards: [], boardLocked: false, scores: {p1:0, p2:0} };
const meyveler = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍒', '🍑'];

function ekranDegistir(id) {
    document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
    document.getElementById(id).classList.add('aktif');
}

auth.onAuthStateChanged(user => {
    if (user) { 
        currentUser = user; 
        ekranDegistir('ana-menu'); 
        document.getElementById('kullanici-bilgisi').innerText = `Selam, ${user.displayName}`; 
    } else { ekranDegistir('login-ekrani'); }
});

// --- OYUN TAHTASI ---
function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = ''; 
    gameState.openCards = [];
    gameState.boardLocked = false;
    symbols.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'kart';
        card.innerHTML = `<span class="card-emoji">${s}</span>`;
        card.onclick = () => handleCardClick(i, s, card);
        oyunAlani.appendChild(card);
    });
}

// --- KART TIKLAMA ---
function handleCardClick(index, symbol, cardElement) {
    if (gameState.boardLocked || cardElement.classList.contains('acik') || cardElement.classList.contains('eslesen')) return;

    if (gameState.mode === 'local') {
        cardElement.classList.add('acik');
        gameState.openCards.push({index, symbol, cardElement});
        if (gameState.openCards.length === 2) { 
            gameState.boardLocked = true; 
            setTimeout(checkMatchLocal, 1000); 
        }
    } else {
        // Online modda sadece senin sıransa tıklayabilirsin
        if (gameState.currentPlayerId !== currentUser.uid) return;
        db.collection("lobbies").doc(currentLobbyId).update({ 
            lastAction: { index, symbol, userId: currentUser.uid, time: Date.now() } 
        });
    }
}

// --- GEMINI (BOT) MANTIĞI ---
function checkMatchLocal() {
    const [c1, c2] = gameState.openCards;
    if (c1.symbol === c2.symbol) { 
        c1.cardElement.classList.add('eslesen'); 
        c2.cardElement.classList.add('eslesen'); 
        gameState.scores.p1++;
        document.getElementById('oyuncu1-skor').innerText = gameState.scores.p1;
        gameState.boardLocked = false;
    } else { 
        setTimeout(() => {
            c1.cardElement.classList.remove('acik'); 
            c2.cardElement.classList.remove('acik');
            // Sırayı Gemini'ye devret
            document.getElementById('sira-gosterge').innerText = "Sıra: Gemini";
            setTimeout(geminiHamleYap, 1000);
        }, 500);
    }
    gameState.openCards = [];
}

function geminiHamleYap() {
    const kapaliKartlar = Array.from(document.getElementById('oyun-alani').children)
                               .filter(k => !k.classList.contains('acik') && !k.classList.contains('eslesen'));
    if (kapaliKartlar.length < 2) return;

    const s1 = kapaliKartlar[Math.floor(Math.random() * kapaliKartlar.length)];
    s1.classList.add('acik');

    setTimeout(() => {
        const kalanlar = kapaliKartlar.filter(k => k !== s1);
        const s2 = kalanlar[Math.floor(Math.random() * kalanlar.length)];
        s2.classList.add('acik');

        setTimeout(() => {
            if (s1.innerText === s2.innerText) {
                s1.classList.add('eslesen'); s2.classList.add('eslesen');
                gameState.scores.p2++;
                document.getElementById('oyuncu2-skor').innerText = gameState.scores.p2;
                setTimeout(geminiHamleYap, 1000);
            } else {
                s1.classList.remove('acik'); s2.classList.remove('acik');
                document.getElementById('sira-gosterge').innerText = "Sıra: Sen";
                gameState.boardLocked = false;
            }
        }, 1000);
    }, 1000);
}

// --- ONLINE LOBİ SİSTEMİ (Gerçekçi Yapı) ---
document.getElementById('lobi-btn').onclick = () => {
    ekranDegistir('lobi-ekrani');
    kullanicilariListele();
};

function kullanicilariListele() {
    const listeAlani = document.getElementById('kullanici-listesi');
    // Burada tüm online kullanıcıları çekip "Davet Et" butonu göstermelisin
    // Şimdilik test için seni bir odaya beklemeye alıyoruz
    listeAlani.innerHTML = "<p>Rakip aranıyor... (Oda oluşturuldu)</p>";
    currentLobbyId = "oda_" + currentUser.uid;
    
    db.collection("lobbies").doc(currentLobbyId).set({
        symbols: [...meyveler, ...meyveler].sort(() => Math.random() - 0.5),
        playerNames: { [currentUser.uid]: currentUser.displayName },
        scores: { [currentUser.uid]: 0 },
        currentTurn: currentUser.uid,
        status: "waiting"
    });
    
    // Odaya birinin girmesini bekle
    db.collection("lobbies").doc(currentLobbyId).onSnapshot(doc => {
        if(Object.keys(doc.data().playerNames).length > 1) {
            gameState.mode = 'online';
            ekranDegistir('oyun-ekrani');
            listenLobby(currentLobbyId);
        }
    });
}

// Diğer buton olayları
document.getElementById('gemini-oyna-btn').onclick = () => {
    gameState.mode = 'local';
    gameState.scores = {p1:0, p2:0};
    document.getElementById('oyuncu2-ad').innerText = "Gemini";
    ekranDegistir('oyun-ekrani');
    createBoard([...meyveler, ...meyveler].sort(() => Math.random() - 0.5));
};

document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.querySelectorAll('[id^="ana-ekran-btn-"]').forEach(btn => btn.onclick = () => location.reload());