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

// --- TEMALAR ---
const temalar = {
    'Meyveler': ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍒', '🍑', '🥝', '🥥'],
    'Araçlar': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐'],
    'Minecraft': ['🧱', '⛏️', '🗡️', '🛡️', '🍖', '💎', '🌿', '🏹', '📦', '🧟'],
    'Sprunki': ['🎵', '🎶', '🎧', '🎤', '🎹', '🎸', '🎷', '🎺', '🎻', '🥁']
};

function ekranDegistir(id) {
    document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
    document.getElementById(id).classList.add('aktif');
}

// --- 1. ADIM: GİRİŞ KONTROLÜ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('tema-selam').innerText = `Selam, ${user.displayName.toUpperCase()}`;
        ekranDegistir('tema-ekrani'); // Girişten sonra direkt TEMA ekranına
    } else { 
        ekranDegistir('login-ekrani'); 
    }
});

// --- 2. ADIM: TEMA SEÇİMİ VE LOBİYE KAYIT ---
function temaSec(tema) {
    secilenTema = tema;
    document.getElementById('kullanici-bilgisi').innerText = `Selam, ${currentUser.displayName}`;
    
    // Firebase'e temasıyla birlikte kaydet
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

// --- 3. ADIM: LOBİ VE DAVETLER ---
function lobiDinle() {
    db.collection("onlineUsers").where("status", "==", "lobi").onSnapshot(snap => {
        const liste = document.getElementById('kullanici-listesi');
        liste.innerHTML = "";
        
        // Gemini Bot Seçeneği
        const botDiv = document.createElement('div');
        botDiv.className = "kullanici-item";
        botDiv.style.background = "rgba(243, 156, 18, 0.1)";
        botDiv.innerHTML = `<span>🤖 Gemini (Bot)</span><button onclick="alert('Bot maçı hazırlanıyor!')" class="btn-davet">Oyna</button>`;
        liste.appendChild(botDiv);

        snap.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                const div = document.createElement('div');
                div.className = "kullanici-item";
                div.innerHTML = `
                    <span>${doc.data().displayName} (${doc.data().selectedTheme})</span>
                    <button onclick="davetEt('${doc.id}', '${doc.data().displayName}')" class="btn-davet">Oyna</button>
                `;
                liste.appendChild(div);
            }
        });
    });
}

async function davetEt(rakipId, rakipAd) {
    const matchId = `match_${Date.now()}`;
    const semboller = temalar[secilenTema]; // Seçilen temayı kullan
    await db.collection("matches").doc(matchId).set({
        gameId: matchId,
        symbols: [...semboller, ...semboller].sort(() => Math.random() - 0.5),
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

// --- 4. ADIM: OYUN MOTORU (196 SATIRA TAMAMLAYAN KISIM) ---
function maçaKatil(matchId) {
    currentMatchId = matchId;
    db.collection("onlineUsers").doc(currentUser.uid).update({ status: "oyunda" });
    ekranDegistir('oyun-ekrani');
    
    if (matchUnsubscribe) matchUnsubscribe();
    matchUnsubscribe = db.collection("matches").doc(matchId).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;
        
        const oyunAlani = document.getElementById('oyun-alani');
        if (oyunAlani.children.length === 0) createBoard(data.symbols);

        const kartlar = oyunAlani.getElementsByClassName('kart');
        const openedIndices = (data.openedCards || []).map(c => c.index);
        const matchedIndices = data.matchedCards || [];

        for (let i = 0; i < kartlar.length; i++) {
            if (openedIndices.includes(i) || matchedIndices.includes(i)) {
                kartlar[i].classList.add('acik');
                if (matchedIndices.includes(i)) kartlar[i].classList.add('eslesen');
            } else { kartlar[i].classList.remove('acik'); }
        }

        const isPlayer1 = data.player1.uid === currentUser.uid;
        const siraBende = (isPlayer1 && data.currentPlayer === 1) || (!isPlayer1 && data.currentPlayer === 2);
        
        document.getElementById('oyuncu1-ad').innerText = "Sen";
        document.getElementById('oyuncu1-skor').innerText = isPlayer1 ? data.scores.player1 : data.scores.player2;
        document.getElementById('oyuncu2-ad').innerText = isPlayer1 ? data.player2.displayName : data.player1.displayName;
        document.getElementById('oyuncu2-skor').innerText = isPlayer1 ? data.scores.player2 : data.scores.player1;
        
        if (siraBende) {
            document.getElementById('oyuncu1-kutu').classList.add('sira-bende');
            document.getElementById('oyuncu2-kutu').classList.remove('sira-bende');
            document.getElementById('sira-gosterge').innerText = "Sıra: SENDE";
        } else {
            document.getElementById('oyuncu2-kutu').classList.add('sira-bende');
            document.getElementById('oyuncu1-kutu').classList.remove('sira-bende');
            document.getElementById('sira-gosterge').innerText = "Sıra: RAKİPTE";
        }

        if (data.matchedCards && data.matchedCards.length === 20) {
            const skorun = isPlayer1 ? data.scores.player1 : data.scores.player2;
            const rakipSkor = isPlayer1 ? data.scores.player2 : data.scores.player1;
            let sonuc = (skorun > rakipSkor) ? "yendin" : (skorun < rakipSkor ? "yenildin" : "berabere");
            if (!document.querySelector('.bitis-mesaji')) oyunBitisiniGoster(sonuc);
        }
    });
}

function createBoard(symbols) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    symbols.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'kart'; card.innerHTML = s;
        card.onclick = () => handleCardClick(i, s);
        oyunAlani.appendChild(card);
    });
}

async function handleCardClick(index, symbol) {
    const docRef = db.collection("matches").doc(currentMatchId);
    const data = (await docRef.get()).data();
    const isPlayer1 = data.player1.uid === currentUser.uid;
    const siraBende = (isPlayer1 && data.currentPlayer === 1) || (!isPlayer1 && data.currentPlayer === 2);

    if (!siraBende || (data.openedCards || []).length >= 2 || data.matchedCards.includes(index)) return;

    const newOpened = [...(data.openedCards || []), { index, symbol }];
    await docRef.update({ openedCards: newOpened });

    if (newOpened.length === 2) {
        const [c1, c2] = newOpened;
        if (c1.symbol === c2.symbol) {
            const playerKey = isPlayer1 ? "player1" : "player2";
            await docRef.update({
                [`scores.${playerKey}`]: data.scores[playerKey] + 1,
                matchedCards: [...(data.matchedCards || []), c1.index, c2.index],
                openedCards: []
            });
        } else {
            setTimeout(async () => {
                await docRef.update({ currentPlayer: data.currentPlayer === 1 ? 2 : 1, openedCards: [] });
            }, 1000);
        }
    }
}

function oyunBitisiniGoster(sonuc) {
    if (document.querySelector('.bitis-mesaji')) return;
    const bitisDiv = document.createElement('div');
    bitisDiv.className = 'bitis-mesaji'; // CSS'teki o tam orta ekran
    
    let emoji = (sonuc === "yendin") ? "🏆" : (sonuc === "yenildin" ? "😢" : "😊");
    let mesaj = (sonuc === "yendin") ? "TEBRİKLER!" : (sonuc === "yenildin" ? "YENİLDİNİZ" : "BERABERE");
    
    if (sonuc === "yendin") confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    bitisDiv.innerHTML = `
        <div style="font-size: 5rem; margin-bottom: 10px;">${emoji}</div>
        <h2 style="color: white; margin-bottom: 20px;">${mesaj}</h2>
        <button onclick="location.reload()" class="btn btn-primary" style="width: 100%;">Lobiye Dön</button>
    `;
    document.body.appendChild(bitisDiv);
}

document.getElementById('google-login-btn').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('oyundan-cik-btn').onclick = () => auth.signOut();
document.getElementById('ana-ekran-btn').onclick = () => location.reload();