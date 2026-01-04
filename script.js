const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    databaseURL: "https://match-master-af628-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null, currentLobbyId = null, lobbyUnsubscribe = null;
let openCards = [];
const meyveler = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍒', '🍑'];

function ekranDegistir(id) {
    document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
    document.getElementById(id).classList.add('aktif');
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('kullanici-bilgisi').innerText = `Selam, ${user.displayName}`;
        ekranDegistir('lobi-ekrani');
        db.collection("onlineUsers").doc(user.uid).set({ name: user.displayName, status: "lobi", lastSeen: Date.now() });
        lobiDinle();
        davetleriDinle();
    } else {
        ekranDegistir('login-ekrani');
    }
});

function lobiDinle() {
    db.collection("onlineUsers").where("status", "==", "lobi").onSnapshot(snap => {
        const liste = document.getElementById('kullanici-listesi');
        liste.innerHTML = "";
        snap.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                const div = document.createElement('div');
                div.className = "kullanici-item";
                div.innerHTML = `<span>${doc.data().name}</span><button onclick="davetEt('${doc.id}')" class="btn-davet">Davet</button>`;
                liste.appendChild(div);
            }
        });
    });
}

async function davetEt(rakipId) {
    const odaId = `oda_${currentUser.uid}_${rakipId}`;
    await db.collection("lobbies").doc(odaId).set({
        symbols: [...meyveler, ...meyveler].sort(() => Math.random() - 0.5),
        oyuncular: [currentUser.uid, rakipId],
        playerNames: { [currentUser.uid]: currentUser.displayName },
        scores: { [currentUser.uid]: 0, [rakipId]: 0 },
        currentTurn: currentUser.uid,
        status: "bekliyor",
        davetEden: currentUser.displayName,
        davetEdilenId: rakipId
    });
    odaKatil(odaId);
}

function davetleriDinle() {
    db.collection("lobbies").where("davetEdilenId", "==", currentUser.uid).where("status", "==", "bekliyor").onSnapshot(snap => {
        snap.forEach(doc => {
            if (confirm(`${doc.data().davetEden} seni maça davet ediyor! Katılmak ister misin?`)) {
                db.collection("lobbies").doc(doc.id).update({ 
                    status: "aktif",
                    [`playerNames.${currentUser.uid}`]: currentUser.displayName 
                });
                odaKatil(doc.id);
            }
        });
    });
}

function odaKatil(odaId) {
    currentLobbyId = odaId;
    db.collection("onlineUsers").doc(currentUser.uid).update({ status: "oyunda" });
    ekranDegistir('oyun-ekrani');
    
    if (lobbyUnsubscribe) lobbyUnsubscribe();
    lobbyUnsubscribe = db.collection("lobbies").doc(odaId).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;
        if (document.getElementById('oyun-alani').children.length === 0) createBoard(data.symbols);
        
        const rakipId = data.oyuncular.find(id => id !== currentUser.uid);
        document.getElementById('oyuncu1-skor').innerText = data.scores[currentUser.uid] || 0;
        document.getElementById('oyuncu2-ad').innerText = data.playerNames[rakipId] || "Rakip";
        document.getElementById('oyuncu2-skor').innerText = data.scores[rakipId] || 0;
        document.getElementById('sira-gosterge').innerText = data.currentTurn === currentUser.uid ? "Sıra: Sende" : "Sıra: Rakipte";
    });
}

function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    symbols.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'kart';
        card.innerHTML = s;
        card.onclick = () => handleCardClick(i, s, card);
        oyunAlani.appendChild(card);
    });
}

async function handleCardClick(index, symbol, cardElement) {
    const doc = await db.collection("lobbies").doc(currentLobbyId).get();
    const data = doc.data();
    if (data.currentTurn !== currentUser.uid || cardElement.classList.contains('acik')) return;

    cardElement.classList.add('acik');
    openCards.push({ index, symbol, cardElement });

    if (openCards.length === 2) {
        const [c1, c2] = openCards;
        if (c1.symbol === c2.symbol) {
            const newScore = (data.scores[currentUser.uid] || 0) + 1;
            await db.collection("lobbies").doc(currentLobbyId).update({ [`scores.${currentUser.uid}`]: newScore });
            c1.cardElement.classList.add('eslesen');
            c2.cardElement.classList.add('eslesen');
        } else {
            const rakipId = data.oyuncular.find(id => id !== currentUser.uid);
            setTimeout(() => {
                c1.cardElement.classList.remove('acik');
                c2.cardElement.classList.remove('acik');
                db.collection("lobbies").doc(currentLobbyId).update({ currentTurn: rakipId });
            }, 1000);
        }
        openCards = [];
    }
}

document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('oyundan-cik-btn').onclick = () => auth.signOut();
document.getElementById('ana-ekran-btn').onclick = () => location.reload();