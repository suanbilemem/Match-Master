// 1. FIREBASE YAPILANDIRMASI (Daha önce çalışan anahtarların)
const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    databaseURL: "https://match-master-af628-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 2. TEMA VERİLERİ (Minecraft ve Sprunki Linkleri Yenilendi)
const temalar = {
    meyveler: ['🍎', '🍌', '🍓', '🍇', '🍉', '🍍', '🍒', '🍑', '🥝', '🥥'],
    minecraft: [
        'https://img.icons8.com/color/96/minecraft-main-character.png',
        'https://img.icons8.com/color/96/minecraft-creeper.png',
        'https://img.icons8.com/color/96/minecraft-skeleton.png',
        'https://img.icons8.com/color/96/minecraft-zombie.png',
        'https://img.icons8.com/color/96/minecraft-diamond.png',
        'https://img.icons8.com/color/96/minecraft-tnt.png',
        'https://img.icons8.com/color/96/minecraft-grass-cube.png',
        'https://img.icons8.com/color/96/minecraft-pig.png',
        'https://img.icons8.com/color/96/minecraft-egg.png',
        'https://img.icons8.com/color/144/minecraft-pickaxe.png'
    ],
    sprunki: [
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun1',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun2',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun3',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun4',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun5',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun6',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun7',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun8',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun9',
        'https://api.dicebear.com/7.x/bottts/svg?seed=sprun10'
    ]
};

let currentUser = null;
let currentMatchId = null;
let suAnkiSeciliTema = 'meyveler';
let acikKartlar = [];

// 3. GİRİŞ VE LOBİ YÖNETİMİ
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-ekrani').classList.remove('aktif');
        document.getElementById('lobi-ekrani').classList.add('aktif');
        document.getElementById('kullanici-bilgisi').innerText = `Merhaba, ${user.displayName}`;
        
        db.collection("users").doc(user.uid).set({
            displayName: user.displayName,
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        kullanicilariDinle();
        davetleriDinle();
    } else {
        document.getElementById('lobi-ekrani').classList.remove('aktif');
        document.getElementById('login-ekrani').classList.add('aktif');
    }
});

function temaAyarla(temaAd) {
    suAnkiSeciliTema = temaAd;
    document.querySelectorAll('.btn-tema').forEach(btn => btn.classList.remove('aktif'));
    document.getElementById(`btn-${temaAd === 'meyveler' ? 'meyve' : temaAd === 'minecraft' ? 'mine' : 'sprun'}`).classList.add('aktif');
}

// Google Giriş Butonu (Senin hatayı çözen kısım)
const loginBtn = document.getElementById('google-login-btn');
if (loginBtn) {
    loginBtn.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider);
    };
}

// 4. DAVET VE OYUN KURULUŞU
async function davetEt(rakipId, rakipAd) {
    const matchId = `match_${Date.now()}`;
    const semboller = temalar[suAnkiSeciliTema];

    await db.collection("matches").doc(matchId).set({
        gameId: matchId,
        tema: suAnkiSeciliTema,
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
            const m = doc.data();
            if (confirm(`${m.player1.displayName} seni ${m.tema} temasıyla oyuna çağırıyor!`)) {
                db.collection("matches").doc(doc.id).update({ status: "active" });
                maçaKatil(doc.id);
            }
        });
    });
}

function maçaKatil(id) {
    currentMatchId = id;
    document.getElementById('lobi-ekrani').classList.remove('aktif');
    document.getElementById('oyun-ekrani').classList.add('aktif');
    
    db.collection("matches").doc(id).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;
        
        const siraBende = (data.currentPlayer === 1 && currentUser.uid === data.player1.uid) || 
                         (data.currentPlayer === 2 && currentUser.uid === data.player2.uid);
        
        document.getElementById('sira-gosterge').innerText = siraBende ? "Senin Sıran!" : "Rakip Bekleniyor...";
        
        // KARTLARI OLUŞTURMA (Link Kontrolü Burada)
        const oyunAlani = document.getElementById('oyun-alani');
        oyunAlani.innerHTML = '';
        data.symbols.forEach((s, i) => {
            const card = document.createElement('div');
            card.className = 'kart';
            if (data.openedCards.includes(i) || data.matchedCards.includes(i)) {
                card.classList.add('acik');
                card.innerHTML = s.startsWith('http') ? `<img src="${s}" style="width:85%;">` : s;
            }
            card.onclick = () => {
                if (siraBende && !data.openedCards.includes(i) && !data.matchedCards.includes(i) && acikKartlar.length < 2) {
                    kartAc(i, s);
                }
            };
            oyunAlani.appendChild(card);
        });
    });
}

async function kartAc(index, sembol) {
    acikKartlar.push({ index, sembol });
    await db.collection("matches").doc(currentMatchId).update({ 
        openedCards: firebase.firestore.FieldValue.arrayUnion(index) 
    });
    if (acikKartlar.length === 2) setTimeout(kontrolEt, 1000);
}

async function kontrolEt() {
    const matchRef = db.collection("matches").doc(currentMatchId);
    const snap = await matchRef.get();
    const data = snap.data();
    const [k1, k2] = acikKartlar;

    if (k1.sembol === k2.sembol) {
        const turn = data.currentPlayer === 1 ? "player1" : "player2";
        await matchRef.update({
            matchedCards: firebase.firestore.FieldValue.arrayUnion(k1.index, k2.index),
            [`scores.${turn}`]: data.scores[turn] + 1,
            openedCards: []
        });
    } else {
        await matchRef.update({ currentPlayer: data.currentPlayer === 1 ? 2 : 1, openedCards: [] });
    }
    acikKartlar = [];
}

// Diğer listeleme ve çıkış fonksiyonları...
function kullanicilariDinle() {
    db.collection("users").where("online", "==", true).onSnapshot(snap => {
        const liste = document.getElementById('kullanici-listesi');
        liste.innerHTML = '';
        snap.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                const u = doc.data();
                liste.innerHTML += `<div class="kullanici-item"><span>${u.displayName}</span><button onclick="davetEt('${doc.id}', '${u.displayName}')">Oyna</button></div>`;
            }
        });
    });
}