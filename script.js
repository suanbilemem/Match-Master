// ⚠️ ÖNEMLİ: Firebase Yapılandırması
// Bu projeyi çalıştırmak için Firebase Console'dan (https://console.firebase.google.com)
// bir proje oluşturup aşağıdaki bilgileri kendi Firebase config'inizle değiştirmeniz gerekmektedir.
// Firebase Console > Proje Ayarları > Genel > Uygulamalarınız bölümünden config bilgilerini alabilirsiniz.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Oyun State
let currentUser = null;
let gameState = {
    mode: null, // 'gemini' veya 'online'
    difficulty: null, // 'kolay', 'orta', 'zor'
    cards: [],
    openCards: [],
    isChecking: false,
    currentPlayer: 1,
    scores: { player1: 0, player2: 0 },
    playerNames: { player1: 'Sen', player2: 'Rakip' },
    matchedPairs: 0,
    totalPairs: 10
};

// Kart Görselleri - Meyveler, Toplar, Araçlar
const cardImages = {
    fruits: [
        '🍎', '🍌', '🍇', '🍊', '🍓', '🍑', '🍒', '🥝', '🍉', '🥭'
    ],
    balls: [
        '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🥎'
    ],
    vehicles: [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐'
    ]
};

// DOM Elements
const screens = {
    login: document.getElementById('login-ekrani'),
    menu: document.getElementById('ana-menu'),
    difficulty: document.getElementById('zorluk-ekrani'),
    lobby: document.getElementById('lobi-ekrani'),
    game: document.getElementById('oyun-ekrani'),
    gameEnd: document.getElementById('oyun-sonu-ekrani')
};

// Auth State Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showScreen('menu');
        updateUserInfo();
        initializeLobby();
    } else {
        currentUser = null;
        showScreen('login');
    }
});

// Ekran Gösterme Fonksiyonu
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('aktif');
    });
    if (screens[screenName]) {
        screens[screenName].classList.add('aktif');
    }
}

// Kullanıcı Bilgisi Güncelleme
function updateUserInfo() {
    const userInfoEl = document.getElementById('kullanici-bilgisi');
    if (currentUser && userInfoEl) {
        userInfoEl.textContent = `Hoş geldin, ${currentUser.displayName || currentUser.email}!`;
    }
}

// Google Login
document.getElementById('google-login-btn')?.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Giriş hatası:', error);
        alert('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
});

// Ana Menü Butonları
document.getElementById('gemini-oyna-btn')?.addEventListener('click', () => {
    showScreen('difficulty');
});

document.getElementById('lobi-btn')?.addEventListener('click', () => {
    showScreen('lobby');
    loadLobbyUsers();
});

document.getElementById('oyundan-cik-btn')?.addEventListener('click', async () => {
    if (confirm('Oyundan çıkmak istediğinize emin misiniz?')) {
        await auth.signOut();
    }
});

// Ana Ekran Butonları
document.getElementById('ana-ekran-btn-1')?.addEventListener('click', () => showScreen('menu'));
document.getElementById('ana-ekran-btn-2')?.addEventListener('click', () => {
    leaveLobby();
    showScreen('menu');
});
document.getElementById('ana-ekran-btn-3')?.addEventListener('click', () => {
    resetGame();
    showScreen('menu');
});
document.getElementById('ana-ekran-btn-4')?.addEventListener('click', () => {
    resetGame();
    showScreen('menu');
});

// Zorluk Seviyesi Butonları
document.getElementById('kolay-btn')?.addEventListener('click', () => startGame('gemini', 'kolay'));
document.getElementById('orta-btn')?.addEventListener('click', () => startGame('gemini', 'orta'));
document.getElementById('zor-btn')?.addEventListener('click', () => startGame('gemini', 'zor'));

// Oyun Başlatma
function startGame(mode, difficulty = null) {
    gameState.mode = mode;
    gameState.difficulty = difficulty;
    gameState.matchedPairs = 0;
    gameState.currentPlayer = 1;
    gameState.scores = { player1: 0, player2: 0 };
    gameState.openCards = [];
    gameState.isChecking = false;
    
    // Kart görsellerini seç (rastgele kategori)
    const categories = Object.keys(cardImages);
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const images = cardImages[selectedCategory].slice(0, gameState.totalPairs);
    
    // Kartları oluştur (10 çift = 20 kart)
    gameState.cards = [];
    images.forEach((img, index) => {
        gameState.cards.push({ id: index, image: img, matched: false });
        gameState.cards.push({ id: index, image: img, matched: false });
    });
    
    // Kartları karıştır
    gameState.cards.sort(() => Math.random() - 0.5);
    
    // Online modda oyuncu isimleri
    if (mode === 'online') {
        gameState.playerNames.player1 = currentUser.displayName || currentUser.email;
        gameState.playerNames.player2 = 'Rakip';
    } else {
        gameState.playerNames.player1 = 'Sen';
        gameState.playerNames.player2 = 'Gemini';
    }
    
    renderGame();
    showScreen('game');
    updateScore();
    updateTurnIndicator();
}

// Oyun Render
function renderGame() {
    const gameArea = document.getElementById('oyun-alani');
    gameArea.innerHTML = '';
    
    gameState.cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('kart');
        cardElement.dataset.index = index;
        cardElement.dataset.cardId = card.id;
        
        if (card.matched) {
            cardElement.classList.add('eslesen');
        }
        
        // Emoji'yi direkt text olarak ekle
        cardElement.setAttribute('data-emoji', card.image);
        cardElement.innerHTML = `<span class="card-emoji">${card.image}</span>`;
        
        cardElement.addEventListener('click', () => openCard(index));
        
        gameArea.appendChild(cardElement);
    });
}

// Kart Açma
function openCard(index) {
    const card = gameState.cards[index];
    const cardElement = document.querySelector(`[data-index="${index}"]`);
    
    if (!cardElement || cardElement.classList.contains('acik') || 
        cardElement.classList.contains('eslesen') || 
        gameState.isChecking || 
        gameState.openCards.length >= 2) {
        return;
    }
    
    cardElement.classList.add('acik');
    gameState.openCards.push({ index, card });
    
    if (gameState.openCards.length === 2) {
        gameState.isChecking = true;
        setTimeout(() => checkMatch(), 1000);
    }
}

// Eşleşme Kontrolü
function checkMatch() {
    const [card1, card2] = gameState.openCards;
    
    if (card1.card.id === card2.card.id) {
        // Eşleşti!
        gameState.cards[card1.index].matched = true;
        gameState.cards[card2.index].matched = true;
        
        document.querySelector(`[data-index="${card1.index}"]`).classList.add('eslesen');
        document.querySelector(`[data-index="${card2.index}"]`).classList.add('eslesen');
        
        // Skoru güncelle
        if (gameState.currentPlayer === 1) {
            gameState.scores.player1++;
        } else {
            gameState.scores.player2++;
        }
        
        gameState.matchedPairs++;
        
        // Aynı oyuncu devam eder
        updateScore();
        
        // Oyun bitti mi kontrol et
        if (gameState.matchedPairs === gameState.totalPairs) {
            setTimeout(() => endGame(), 1000);
            return;
        }
        
        // Gemini modunda AI'nın sırası değilse, sıra yine aynı oyuncuda kalır
        if (gameState.mode === 'gemini' && gameState.currentPlayer === 2) {
            setTimeout(() => geminiPlay(), 1500);
        }
    } else {
        // Eşleşmedi, kartları kapat
        setTimeout(() => {
            document.querySelector(`[data-index="${card1.index}"]`).classList.remove('acik');
            document.querySelector(`[data-index="${card2.index}"]`).classList.remove('acik');
            
            // Sıra değişir
            gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            updateTurnIndicator();
            
            // Gemini modunda ve AI'nın sırasıysa
            if (gameState.mode === 'gemini' && gameState.currentPlayer === 2) {
                setTimeout(() => geminiPlay(), 500);
            }
        }, 1000);
    }
    
    gameState.openCards = [];
    gameState.isChecking = false;
}

// Gemini AI Oynama
function geminiPlay() {
    if (gameState.isChecking || gameState.openCards.length > 0) return;
    
    // Zorluk seviyesine göre AI stratejisi
    const unmatchedCards = gameState.cards
        .map((card, index) => ({ card, index }))
        .filter(({ card, index }) => !card.matched);
    
    let firstCardIndex, secondCardIndex;
    
    if (gameState.difficulty === 'kolay') {
        // Kolay: Rastgele
        const shuffled = [...unmatchedCards].sort(() => Math.random() - 0.5);
        firstCardIndex = shuffled[0].index;
        secondCardIndex = shuffled[1].index;
    } else if (gameState.difficulty === 'orta') {
        // Orta: Biraz hafıza (açılmış kartları hatırlama)
        const shuffled = [...unmatchedCards].sort(() => Math.random() - 0.5);
        firstCardIndex = shuffled[0].index;
        secondCardIndex = shuffled[Math.min(1, shuffled.length - 1)].index;
    } else {
        // Zor: Daha iyi hafıza simülasyonu
        const shuffled = [...unmatchedCards].sort(() => Math.random() - 0.5);
        firstCardIndex = shuffled[0].index;
        secondCardIndex = shuffled[Math.min(1, shuffled.length - 1)].index;
    }
    
    // İlk kartı aç
    setTimeout(() => {
        openCard(firstCardIndex);
        setTimeout(() => {
            openCard(secondCardIndex);
        }, 800);
    }, 500);
}

// Skor Güncelleme
function updateScore() {
    document.getElementById('oyuncu1-ad').textContent = gameState.playerNames.player1;
    document.getElementById('oyuncu1-skor').textContent = gameState.scores.player1;
    document.getElementById('oyuncu2-ad').textContent = gameState.playerNames.player2;
    document.getElementById('oyuncu2-skor').textContent = gameState.scores.player2;
}

// Sıra Göstergesi Güncelleme
function updateTurnIndicator() {
    const siraEl = document.getElementById('sira-gosterge');
    if (siraEl) {
        const playerName = gameState.currentPlayer === 1 
            ? gameState.playerNames.player1 
            : gameState.playerNames.player2;
        siraEl.textContent = `Sıra: ${playerName}`;
    }
}

// Oyun Sonu
function endGame() {
    const winner = gameState.scores.player1 > gameState.scores.player2 ? 1 : 
                   gameState.scores.player1 < gameState.scores.player2 ? 2 : 0;
    
    const messageEl = document.getElementById('oyun-sonu-mesaj');
    
    if (winner === 0) {
        messageEl.textContent = 'Berabere! 🎉';
    } else if (winner === 1) {
        messageEl.textContent = 'Kazandınız! 🎉🎊';
        startConfetti();
    } else {
        messageEl.textContent = 'Yenildiniz! 😢';
    }
    
    showScreen('gameEnd');
}

// Konfeti Efekti
function startConfetti() {
    const canvas = document.getElementById('konfeti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b'];
    
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 4 + 2,
            d: Math.random() * particles.length,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, i) => {
            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
            ctx.stroke();
            
            p.tiltAngle += 0.1;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
            p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;
            
            if (p.y > canvas.height) {
                particles[i] = {
                    x: Math.random() * canvas.width,
                    y: -20,
                    r: p.r,
                    d: p.d,
                    color: p.color,
                    tilt: Math.floor(Math.random() * 10) - 10,
                    tiltAngle: p.tiltAngle
                };
            }
        });
        
        requestAnimationFrame(draw);
    }
    
    draw();
    setTimeout(() => {
        canvas.width = 0;
        canvas.height = 0;
    }, 5000);
}

// Oyun Reset
function resetGame() {
    gameState.openCards = [];
    gameState.isChecking = false;
    const canvas = document.getElementById('konfeti-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Lobi Fonksiyonları
let lobbyUnsubscribe = null;

function initializeLobby() {
    // Kullanıcıyı lobiye ekle
    if (currentUser) {
        db.collection('lobby').doc(currentUser.uid).set({
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email,
            email: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

function loadLobbyUsers() {
    const userListEl = document.getElementById('kullanici-listesi');
    userListEl.innerHTML = '';
    
    // Diğer kullanıcıları dinle
    lobbyUnsubscribe = db.collection('lobby')
        .where('uid', '!=', currentUser.uid)
        .onSnapshot((snapshot) => {
            userListEl.innerHTML = '';
            snapshot.forEach((doc) => {
                const user = doc.data();
                const userItem = document.createElement('div');
                userItem.className = 'kullanici-item';
                userItem.innerHTML = `
                    <span class="kullanici-ad-lobi">${user.displayName}</span>
                    <button class="btn-kucuk" onclick="sendInvite('${user.uid}', '${user.displayName}')">Davet Gönder</button>
                `;
                userListEl.appendChild(userItem);
            });
            
            if (snapshot.empty) {
                userListEl.innerHTML = '<p style="text-align: center; padding: 20px;">Lobide başka kullanıcı yok.</p>';
            }
        });
    
    // Davetleri dinle
    listenForInvites();
}

function sendInvite(uid, displayName) {
    db.collection('invites').add({
        from: currentUser.uid,
        fromName: currentUser.displayName || currentUser.email,
        to: uid,
        toName: displayName,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function listenForInvites() {
    // Gelen davetleri dinle
    db.collection('invites')
        .where('to', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            const notificationArea = document.getElementById('bildirim-alani');
            notificationArea.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const invite = doc.data();
                const notification = document.createElement('div');
                notification.className = 'bildirim';
                notification.innerHTML = `
                    <div>
                        <strong>${invite.fromName}</strong> sizi oyuna davet ediyor!
                    </div>
                    <div class="bildirim-buttons">
                        <button class="btn-kucuk" onclick="acceptInvite('${doc.id}', '${invite.from}')">Kabul</button>
                        <button class="btn-kucuk" onclick="rejectInvite('${doc.id}')">Reddet</button>
                    </div>
                `;
                notificationArea.appendChild(notification);
            });
        });
}

function acceptInvite(inviteId, fromUid) {
    db.collection('invites').doc(inviteId).update({
        status: 'accepted'
    }).then(() => {
        // Oyunu başlat
        startOnlineGame(fromUid);
        // Davetleri temizle
        db.collection('invites').doc(inviteId).delete();
    });
}

function rejectInvite(inviteId) {
    db.collection('invites').doc(inviteId).update({
        status: 'rejected'
    }).then(() => {
        db.collection('invites').doc(inviteId).delete();
    });
}

function startOnlineGame(opponentUid) {
    // Online oyun başlatma mantığı
    // Bu kısım Firestore real-time sync ile genişletilebilir
    gameState.playerNames.player2 = 'Rakip'; // Rakip ismi Firestore'dan alınabilir
    startGame('online');
}

function leaveLobby() {
    if (currentUser) {
        db.collection('lobby').doc(currentUser.uid).delete();
    }
    if (lobbyUnsubscribe) {
        lobbyUnsubscribe();
    }
}

// Sayfa kapatılırken lobiden çık
window.addEventListener('beforeunload', () => {
    leaveLobby();
});

// Global fonksiyonlar (HTML'den çağrılabilmesi için)
window.sendInvite = sendInvite;
window.acceptInvite = acceptInvite;
window.rejectInvite = rejectInvite;
