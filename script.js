// 1. FIREBASE YAPILANDIRMASI (Kendi bilgilerini buraya ekle)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 2. TEMA VE OYUN DEĞİŞKENLERİ
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
let bekletmeModu = false;

// 3. GİRİŞ VE LOBİ MANTIĞI
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-ekrani').classList.remove('aktif');
        document.getElementById('lobi-ekrani').classList.add('aktif');
        
        // Selamlama Güncelleme
        document.getElementById('kullanici-bilgisi').innerText = `Merhaba, ${user.displayName}`;
        
        // Kullanıcıyı çevrimiçi yap
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

// Tema Değiştirme Fonksiyonu
function temaAyarla(temaAd) {
    suAnkiSeciliTema = temaAd;
    document.querySelectorAll('.btn-tema').forEach(btn => btn.classList.remove('aktif'));
    if(temaAd === 'meyveler') document.getElementById('btn-meyve').classList.add('aktif');
    if(temaAd === 'minecraft') document.getElementById('btn-mine').classList.add('aktif');
    if(temaAd === 'sprunki') document.getElementById('btn-sprun').classList.add('aktif');
}

// Google Giriş
document.getElementById('google-login-btn').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
};

// Çıkış
document.getElementById('oyundan-cik-btn').onclick = () => {
    db.collection("users").doc(currentUser.uid).update({ online: false });
    auth.signOut();
};

// Çevrimiçi Kullanıcıları Listele
function kullanicilariDinle() {
    db.collection("users").where("online", "==", true)
        .onSnapshot(snapshot => {
            const liste = document.getElementById('kullanici-listesi');
            liste.innerHTML = '';
            snapshot.forEach(doc => {
                if (doc.id !== currentUser.uid) {
                    const u = doc.data();
                    const item = document.createElement('div');
                    item.className = 'kullanici-item';
                    item.innerHTML = `
                        <span>${u.displayName}</span>
                        <button class="btn-davet" onclick="davetEt('${doc.id}', '${u.displayName}')">Oyna</button>
                    `;
                    liste.appendChild(item);
                }
            });
        });
}

// 4. OYUN DAVET MANTIĞI (Tema Burada Belirlenir)
async function davetEt(rakipId, rakipAd) {
    const matchId = `match_${Date.now()}`;
    const secilenSemboller = temalar[suAnkiSeciliTema];

    await db.collection("matches").doc(matchId).set({
        gameId: matchId,
        tema: suAnkiSeciliTema,
        symbols: [...secilenSemboller, ...secilenSemboller].sort(() => Math.random() - 0.5),
        player1: { uid: currentUser.uid, displayName: currentUser.displayName },
        player2: { uid: rakipId, displayName: rakipAd },
        scores: { player1: 0, player2: 0 },
        currentPlayer: 1, // 1: Player1, 2: Player2
        status: "pending",
        openedCards: [],
        matchedCards: []
    });
    maçaKatil(matchId);
}

function davetleriDinle() {
    db.collection("matches")
        .where("player2.uid", "==", currentUser.uid)
        .where("status", "==", "pending")
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const match = doc.data();
                if (confirm(`${match.player1.displayName} seni oyuna davet ediyor! (Tema: ${match.tema})`)) {
                    db.collection("matches").doc(doc.id).update({ status: "active" });
                    maçaKatil(doc.id);
                }
            });
        });
}

// 5. OYUN MOTORU
function maçaKatil(matchId) {
    currentMatchId = matchId;
    document.getElementById('lobi-ekrani').classList.remove('aktif');
    document.getElementById('oyun-ekrani').classList.add('aktif');
    
    db.collection("matches").doc(matchId).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;
        
        // Skor ve İsim Güncelleme
        document.getElementById('oyuncu1-ad').innerText = data.player1.displayName;
        document.getElementById('oyuncu2-ad').innerText = data.player2.displayName;
        document.getElementById('oyuncu1-skor').innerText = data.scores.player1;
        document.getElementById('oyuncu2-skor').innerText = data.scores.player2;

        // Sıra Göstergesi ve Parlama
        const siraBende = (data.currentPlayer === 1 && currentUser.uid === data.player1.uid) || 
                         (data.currentPlayer === 2 && currentUser.uid === data.player2.uid);
        
        document.getElementById('sira-gosterge').innerText = siraBende ? "Senin Sıran!" : "Rakip Bekleniyor...";
        document.getElementById('oyuncu1-kutu').className = data.currentPlayer === 1 ? 'skor-kart sira-bende' : 'skor-kart';
        document.getElementById('oyuncu2-kutu').className = data.currentPlayer === 2 ? 'skor-kart sira-bende' : 'skor-kart';

        createBoard(data.symbols, data.openedCards, data.matchedCards, siraBende);
        
        // Oyun Bitiş Kontrolü
        if (data.matchedCards.length === data.symbols.length) {
            oyunuBitir(data);
        }
    });
}

function createBoard(symbols, opened, matched, siraBende) {
    const oyunAlani = document.getElementById('oyun-alani');
    oyunAlani.innerHTML = '';
    
    symbols.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'kart';
        if (opened.includes(i) || matched.includes(i)) {
            card.classList.add('acik');
            if (matched.includes(i)) card.classList.add('eslesen');
            
            // Resim mi Emoji mi kontrolü
            if (s.startsWith('http')) {
                card.innerHTML = `<img src="${s}" alt="kart">`;
            } else {
                card.innerHTML = s;
            }
        }
        
        card.onclick = () => {
            if (siraBende && !opened.includes(i) && !matched.includes(i) && acikKartlar.length < 2) {
                kartAc(i, s);
            }
        };
        oyunAlani.appendChild(card);
    });
}

async function kartAc(index, sembol) {
    const matchRef = db.collection("matches").doc(currentMatchId);
    acikKartlar.push({ index, sembol });
    
    await matchRef.update({ openedCards: firebase.firestore.FieldValue.arrayUnion(index) });

    if (acikKartlar.length === 2) {
        setTimeout(() => kontrolEt(), 1000);
    }
}

async function kontrolEt() {
    const matchRef = db.collection("matches").doc(currentMatchId);
    const doc = await matchRef.get();
    const data = doc.data();
    
    const [k1, k2] = acikKartlar;
    
    if (k1.sembol === k2.sembol) {
        // Eşleşme Bildirimi
        const turn = data.currentPlayer === 1 ? "player1" : "player2";
        await matchRef.update({
            matchedCards: firebase.firestore.FieldValue.arrayUnion(k1.index, k2.index),
            [`scores.${turn}`]: data.scores[turn] + 1,
            openedCards: []
        });
    } else {
        // Sıra Değiştir
        await matchRef.update({
            currentPlayer: data.currentPlayer === 1 ? 2 : 1,
            openedCards: []
        });
    }
    acikKartlar = [];
}

function oyunuBitir(data) {
    let sonuc = "";
    const p1Skor = data.scores.player1;
    const p2Skor = data.scores.player2;
    
    if (p1Skor === p2Skor) sonuc = "Berabere!";
    else if (currentUser.uid === data.player1.uid) {
        sonuc = p1Skor > p2Skor ? "KAZANDIN! 🎉" : "KAYBETTİN...";
    } else {
        sonuc = p2Skor > p1Skor ? "KAZANDIN! 🎉" : "KAYBETTİN...";
    }

    if (sonuc.includes("KAZANDIN")) confetti();

    const bitisDiv = document.createElement('div');
    bitisDiv.className = 'bitis-mesaji';
    bitisDiv.innerHTML = `
        <h2>Oyun Bitti!</h2>
        <p style="font-size: 1.5rem; margin: 15px 0;">${sonuc}</p>
        <p>${data.player1.displayName}: ${p1Skor} - ${data.player2.displayName}: ${p2Skor}</p>
        <button onclick="location.reload()" class="btn btn-primary">Lobiye Dön</button>
    `;
    document.body.appendChild(bitisDiv);
}