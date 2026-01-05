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

let currentUser = null, currentMatchId = null, matchUnsubscribe = null;
let secilenTema = "Meyveler";

const temalar = {
    'Meyveler': ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍒', '🍑', '🥝', '🥥'],
    'Araçlar': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐'],
    'Minecraft': ['💎', '🛡️', '🍖', '🌿', '🛡️', '🧟', '⛏️', '🏹', '📦', '⚔️'],
    'Pokémon': [
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/52.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png'
    ]
};

function ekranDegistir(id) {
    document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
    document.getElementById(id).classList.add('aktif');
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('tema-selam').innerText = `Selam, ${user.displayName.toUpperCase()}`;
        ekranDegistir('tema-ekrani');
    } else {
        ekranDegistir('login-ekrani');
    }
});

function temaSec(tema) {
    secilenTema = tema;
    db.collection("onlineUsers").doc(currentUser.uid).set({ 
        displayName: currentUser.displayName, 
        status: "lobi", 
        uid: currentUser.uid,
        selectedTheme: tema 
    });
    lobiDinle();
    davetleriDinle();
    ekranDegistir('lobi-ekrani');
}

function lobiDinle() {
    db.collection("onlineUsers").where("status", "==", "lobi").onSnapshot(snap => {
        const liste = document.getElementById('kullanici-listesi');
        liste.innerHTML = "";
        snap.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                const div = document.createElement('div');
                div.className = "kullanici-item";
                div.innerHTML = `<span>${doc.data().displayName} (${doc.data().selectedTheme})</span>
                                 <button onclick="davetEt('${doc.id}', '${doc.data().displayName}')" class="btn-primary" style="padding:5px 10px;">Oyna</button>`;
                liste.appendChild(div);
            }
        });
    });
}

async function davetEt(rakipId, rakipAd) {
    const matchId = `match_${Date.now()}`;
    const semboller = temalar[secilenTema];
    const karisik = [...semboller, ...semboller].sort(() => Math.random() - 0.5);
    await db.collection("matches").doc(matchId).set({
        gameId: matchId,
        symbols: karisik,
        player1: { uid: currentUser.uid, displayName: currentUser.displayName },
        player2: { uid: rakipId, displayName: rakipAd },
        scores: { player1: 0, player2: 0 },
        currentPlayer: 1,
        status: "pending",
        openedCards: [],
        matchedCards: []
    });
    maçaKatil(matchId);
}

function davetleriDinle() {
    db.collection("matches").where("player2.uid", "==", currentUser.uid).where("status", "==", "pending")
    .onSnapshot(snap => {
        snap.forEach(doc => {
            if (confirm(`${doc.data().player1.displayName} seni maça davet ediyor!`)) {
                db.collection("matches").doc(doc.id).update({ status: "active" });
                maçaKatil(doc.id);
            }
        });
    });
}

function maçaKatil(matchId) {
    currentMatchId = matchId;
    db.collection("onlineUsers").doc(currentUser.uid).update({ status: "oyunda" });
    ekranDegistir('oyun-ekrani');
    if (matchUnsubscribe) matchUnsubscribe();
    matchUnsubscribe = db.collection("matches").doc(matchId).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;
        
        if (document.getElementById('oyun-alani').children.length === 0) createBoard(data.symbols);
        
        const kartlar = document.getElementsByClassName('kart');
        const openedIndices = (data.openedCards || []).map(c => c.index);
        const matchedIndices = data.matchedCards || [];

        for (let i = 0; i < kartlar.length; i++) {
            if (openedIndices.includes(i) || matchedIndices.includes(i)) {
                kartlar[i].classList.add('acik');
                if (matchedIndices.includes(i)) kartlar[i].classList.add('eslesen');
            } else {
                kartlar[i].classList.remove('acik');
            }
        }

        const isP1 = data.player1.uid === currentUser.uid;
        document.getElementById('oyuncu1-skor').innerText = isP1 ? data.scores.player1 : data.scores.player2;
        document.getElementById('oyuncu2-skor').innerText = isP1 ? data.scores.player2 : data.scores.player1;
        document.getElementById('oyuncu2-ad').innerText = isP1 ? data.player2.displayName : data.player1.displayName;
        
        const siraBende = (isP1 && data.currentPlayer === 1) || (!isP1 && data.currentPlayer === 2);
        document.getElementById('sira-gosterge').innerText = siraBende ? "Sıra: SENDE" : "Sıra: RAKİPTE";

        if (data.matchedCards.length === 20) oyunBitisiniGoster(isP1, data.scores);
    });
}

function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    symbols.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'kart';
        if (s.startsWith('http')) {
            card.innerHTML = `<img src="${s}">`;
        } else {
            card.innerHTML = `<span>${s}</span>`;
        }
        card.onclick = () => handleCardClick(i, s);
        oyunAlani.appendChild(card);
    });
}

async function handleCardClick(index, symbol) {
    const docRef = db.collection("matches").doc(currentMatchId);
    const data = (await docRef.get()).data();
    const isP1 = data.player1.uid === currentUser.uid;
    const siraBende = (isP1 && data.currentPlayer === 1) || (!isP1 && data.currentPlayer === 2);

    if (!siraBende || data.openedCards.length >= 2 || data.matchedCards.includes(index)) return;

    const newOpened = [...data.openedCards, { index, symbol }];
    await docRef.update({ openedCards: newOpened });

    if (newOpened.length === 2) {
        if (newOpened[0].symbol === newOpened[1].symbol) {
            const pKey = isP1 ? "player1" : "player2";
            await docRef.update({
                [`scores.${pKey}`]: data.scores[pKey] + 1,
                matchedCards: [...data.matchedCards, newOpened[0].index, newOpened[1].index],
                openedCards: []
            });
        } else {
            setTimeout(() => {
                docRef.update({ currentPlayer: data.currentPlayer === 1 ? 2 : 1, openedCards: [] });
            }, 1000);
        }
    }
}

function oyunBitisiniGoster(isP1, scores) {
    const s1 = isP1 ? scores.player1 : scores.player2;
    const s2 = isP1 ? scores.player2 : scores.player1;
    const mesaj = s1 > s2 ? "Tebrikler, Kazandın! 🏆" : (s1 < s2 ? "Maalesef, Yenildin. 😢" : "Berabere! 🤝");
    if (s1 > s2) confetti({ particleCount: 150, spread: 70 });
    alert(mesaj);
    location.reload();
}

// YENİ BUTON FONKSİYONLARI (image_d1cd88, image_d1d0b1)
document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('auth-cikis-btn').onclick = () => auth.signOut();
document.getElementById('ana-ekran-git-btn').onclick = () => ekranDegistir('tema-ekrani');
document.getElementById('lobiye-don-btn').onclick = () => location.reload();