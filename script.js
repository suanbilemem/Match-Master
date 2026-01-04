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

auth.onAuthStateChanged(async (user) => {
    if (user) { 
        currentUser = user; 
        ekranDegistir('ana-menu'); 
        document.getElementById('kullanici-bilgisi').innerText = `Selam, ${user.displayName}`;
        // Uygulama açıldığında online kaydını yap
        await db.collection("onlineUsers").doc(user.uid).set({
            name: user.displayName,
            status: "lobi",
            lastSeen: Date.now()
        }, { merge: true });
    } else { ekranDegistir('login-ekrani'); }
});

// --- LOBİ VE DAVET SİSTEMİ ---
document.getElementById('lobi-btn').onclick = () => {
    ekranDegistir('lobi-ekrani');
    onlineOyunculariListele();
    gelenDavetleriDinle();
};

function onlineOyunculariListele() {
    db.collection("onlineUsers").where("status", "==", "lobi").onSnapshot(snapshot => {
        const liste = document.getElementById('kullanici-listesi');
        liste.innerHTML = "";
        snapshot.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                const user = doc.data();
                const div = document.createElement('div');
                div.style = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.1); padding:10px; margin-bottom:5px; border-radius:8px;";
                div.innerHTML = `<span>${user.name}</span><button class="btn btn-primary" style="padding:5px 10px; font-size:12px;" onclick="davetEt('${doc.id}')">Davet Et</button>`;
                liste.appendChild(div);
            }
        });
        if (liste.innerHTML === "") liste.innerHTML = "<p>Şu an kimse yok...</p>";
    });
}

async function davetEt(rakipId) {
    const odaId = `oda_${currentUser.uid}_${rakipId}`;
    await db.collection("lobbies").doc(odaId).set({
        symbols: [...meyveler, ...meyveler].sort(() => Math.random() - 0.5),
        playerNames: { [currentUser.uid]: currentUser.displayName },
        scores: { [currentUser.uid]: 0 },
        currentTurn: currentUser.uid,
        status: "davet_bekliyor",
        davetEdilen: rakipId,
        davetEdenAd: currentUser.displayName
    });
    currentLobbyId = odaId;
    alert("Davet gönderildi, rakip bekleniyor...");
    odaDinle(odaId); // Davet eden de odayı dinlemeye başlar
}

function gelenDavetleriDinle() {
    db.collection("lobbies")
        .where("davetEdilen", "==", currentUser.uid)
        .where("status", "==", "davet_bekliyor")
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                if (confirm(`${data.davetEdenAd} seni oyuna çağırıyor! Katılmak ister misin?`)) {
                    db.collection("lobbies").doc(doc.id).update({
                        status: "aktif",
                        [`playerNames.${currentUser.uid}`]: currentUser.displayName,
                        [`scores.${currentUser.uid}`]: 0
                    });
                    currentLobbyId = doc.id;
                    odaDinle(doc.id);
                }
            });
        });
}

function odaDinle(odaId) {
    if (lobbyUnsubscribe) lobbyUnsubscribe();
    lobbyUnsubscribe = db.collection("lobbies").doc(odaId).onSnapshot(doc => {
        const data = doc.data();
        if (data && data.status === "aktif") {
            gameState.mode = 'online';
            ekranDegistir('oyun-ekrani');
            createBoard(data.symbols);
            // Burada online oyun mantığı devam eder...
        }
    });
}

// --- OYUN TAHTASI VE KARTLAR ---
function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    symbols.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'kart';
        card.innerHTML = `<span class="card-emoji">${s}</span>`;
        card.onclick = () => handleCardClick(i, s, card);
        oyunAlani.appendChild(card);
    });
}

function handleCardClick(index, symbol, cardElement) {
    if (gameState.boardLocked || cardElement.classList.contains('acik') || cardElement.classList.contains('eslesen')) return;
    
    cardElement.classList.add('acik');
    gameState.openCards.push({index, symbol, cardElement});
    
    if (gameState.openCards.length === 2) {
        gameState.boardLocked = true;
        setTimeout(checkMatch, 1000);
    }
}

function checkMatch() {
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
            gameState.boardLocked = false;
        }, 500);
    }
    gameState.openCards = [];
}

// --- BUTONLAR ---
document.getElementById('gemini-oyna-btn').onclick = () => {
    gameState.mode = 'local';
    gameState.scores = {p1:0, p2:0};
    ekranDegistir('oyun-ekrani');
    createBoard([...meyveler, ...meyveler].sort(() => Math.random() - 0.5));
};

document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('ana-ekran-btn-2').onclick = () => location.reload();
document.getElementById('ana-ekran-btn-3').onclick = () => location.reload();