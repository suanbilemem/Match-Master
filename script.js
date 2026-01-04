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

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Oyun State
let currentUser = null;
let selectedTheme = 'fruits'; // Varsayılan tema: 'fruits', 'sprunki', 'vehicles', 'balls'
let gameState = {
    mode: null, // 'gemini' veya 'online'
    difficulty: null, // 'kolay', 'orta', 'zor'
    theme: 'fruits', // Oyun teması
    cards: [],
    openCards: [],
    isChecking: false,
    boardLocked: false, // Kart açma kilidi
    currentPlayer: 1,
    scores: { player1: 0, player2: 0 },
    playerNames: { player1: 'Sen', player2: 'Rakip' },
    matchedPairs: 0,
    totalPairs: 8,
    gameId: null, // Online oyun için Firestore match ID
    playerNumber: null, // Online oyunda hangi oyuncu olduğumuz (1 veya 2)
    matchUnsubscribe: null // Match dinleme listener'ı
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
        // initializeLobby artık kullanılmıyor, lobiye girildiğinde joinLobby çağrılacak
    } else {
        currentUser = null;
        // Çıkış yapıldığında lobiden ayrıl
        leaveLobby();
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
    joinLobby();
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
    gameState.boardLocked = false; // Oyun başladığında kilidi aç
    
    // Kart görsellerini seç (rastgele kategori)
    const categories = Object.keys(cardImages);
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const images = cardImages[selectedCategory].slice(0, gameState.totalPairs);
    
    // Kartları oluştur (8 çift = 16 kart)
    gameState.cards = [];
    images.forEach((img, index) => {
        gameState.cards.push({ id: index, image: img, matched: false });
        gameState.cards.push({ id: index, image: img, matched: false });
    });
    
    // Online modda kartları Firestore'dan senkronize et, değilse karıştır
    if (mode === 'online' && gameState.gameId) {
        // Online oyunda kartlar Firestore'dan gelecek veya initializeGameInFirestore ile oluşturulacak
        // Burada sadece bekliyoruz, kartlar startOnlineGame içinde ayarlanacak
    } else {
        // Gemini modunda kartları karıştır
        gameState.cards.sort(() => Math.random() - 0.5);
    }
    
    // Online modda oyuncu isimleri (gemini modunda varsayılan isimler)
    if (mode !== 'online') {
        gameState.playerNames.player1 = 'Sen';
        gameState.playerNames.player2 = 'Gemini';
        // Gemini modunda hemen render et
        renderGame();
        showScreen('game');
        updateScore();
        updateTurnIndicator();
    }
    // Online modda playerNames ve render startOnlineGame tarafından yapılacak
    
    // Online modda Firestore'u dinle (kartlar hazır olduktan sonra)
    if (mode === 'online' && gameState.gameId) {
        // listenToMatchUpdates startOnlineGame içinde çağrılacak
    }
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
function openCard(index, isRemoteMove = false) {
    // Online modda sıra kontrolü
    if (gameState.mode === 'online' && !isRemoteMove) {
        // Sırası olmayan oyuncu kart açamaz
        if (gameState.currentPlayer !== gameState.playerNumber) {
            return;
        }
    }
    
    // Kart açma kilidi kontrolü - eğer kilitliyse hiçbir şey yapma
    if (gameState.boardLocked) {
        return;
    }
    
    const card = gameState.cards[index];
    const cardElement = document.querySelector(`[data-index="${index}"]`);
    
    // Kart zaten açık, eşleşmiş, kontrol ediliyor veya 2 kart açıksa işlem yapma
    if (!cardElement || cardElement.classList.contains('acik') || 
        cardElement.classList.contains('eslesen') || 
        gameState.isChecking || 
        gameState.openCards.length >= 2) {
        return;
    }
    
    cardElement.classList.add('acik');
    gameState.openCards.push({ index, card });
    
    // Online modda Firestore'a yaz
    if (gameState.mode === 'online' && gameState.gameId && !isRemoteMove) {
        updateFirestoreCardState(index, 'open');
    }
    
    // İki kart seçildiğinde ekranı kilitle
    if (gameState.openCards.length === 2) {
        gameState.boardLocked = true; // Ekranı kilitle
        gameState.isChecking = true;
        
        // Online modda Firestore'a eşleşme kontrolü için bilgi gönder
        if (gameState.mode === 'online' && gameState.gameId && !isRemoteMove) {
            checkMatchOnline();
        } else {
            setTimeout(() => checkMatch(), 1000);
        }
    }
}

// Eşleşme Kontrolü
function checkMatch(isRemoteMove = false) {
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
        
        // Online modda Firestore'a yaz
        if (gameState.mode === 'online' && gameState.gameId && !isRemoteMove) {
            updateFirestoreMatchState(card1.index, card2.index, true);
        }
        
        // Aynı oyuncu devam eder
        updateScore();
        
        // Oyun bitti mi kontrol et
        if (gameState.matchedPairs === gameState.totalPairs) {
            gameState.openCards = [];
            gameState.isChecking = false;
            gameState.boardLocked = false; // Kilidi aç
            
            // Online modda oyun sonunu Firestore'a yaz
            if (gameState.mode === 'online' && gameState.gameId && !isRemoteMove) {
                endGameOnline();
            } else {
                setTimeout(() => endGame(), 1000);
            }
            return;
        }
        
        // İşlem bitti, kilidi aç
        gameState.openCards = [];
        gameState.isChecking = false;
        gameState.boardLocked = false; // Kilidi aç - sonraki hamleye izin ver
        
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
            
            // Online modda Firestore'a sıra değişikliğini yaz
            if (gameState.mode === 'online' && gameState.gameId && !isRemoteMove) {
                updateFirestoreTurn();
            }
            
            // İşlem bitti, kilidi aç
            gameState.openCards = [];
            gameState.isChecking = false;
            gameState.boardLocked = false; // Kilidi aç - sonraki hamleye izin ver
            
            // Gemini modunda ve AI'nın sırasıysa
            if (gameState.mode === 'gemini' && gameState.currentPlayer === 2) {
                setTimeout(() => geminiPlay(), 500);
            }
        }, 1000);
    }
}

// Online modda eşleşme kontrolü (Firestore'a yazma ile)
function checkMatchOnline() {
    const [card1, card2] = gameState.openCards;
    
    // Firestore'a açılan kartları ve eşleşme kontrolünü yaz
    db.collection('matches').doc(gameState.gameId).update({
        openCards: [
            { index: card1.index, cardId: card1.card.id },
            { index: card2.index, cardId: card2.card.id }
        ],
        isChecking: true,
        lastMoveBy: gameState.playerNumber,
        lastMoveTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // Firestore güncellemesi tamamlandıktan sonra lokal kontrolü yap
        setTimeout(() => checkMatch(), 1000);
    }).catch((error) => {
        console.error('Firestore güncelleme hatası:', error);
        // Hata olsa bile lokal kontrolü yap
        setTimeout(() => checkMatch(), 1000);
    });
}

// Firestore'a kart durumunu güncelle
function updateFirestoreCardState(index, state) {
    if (!gameState.gameId) return;
    
    db.collection('matches').doc(gameState.gameId).update({
        [`cards.${index}.state`]: state,
        lastMoveBy: gameState.playerNumber,
        lastMoveTime: firebase.firestore.FieldValue.serverTimestamp()
    }).catch((error) => {
        console.error('Kart durumu güncelleme hatası:', error);
    });
}

// Firestore'a eşleşme durumunu güncelle
function updateFirestoreMatchState(index1, index2, matched) {
    if (!gameState.gameId) return;
    
    const updates = {
        [`cards.${index1}.matched`]: matched,
        [`cards.${index2}.matched`]: matched,
        [`cards.${index1}.state`]: matched ? 'matched' : 'closed',
        [`cards.${index2}.state`]: matched ? 'matched' : 'closed',
        openCards: [],
        isChecking: false,
        lastMoveBy: gameState.playerNumber,
        lastMoveTime: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (matched) {
        // Eşleşme oldu, skoru güncelle
        const scoreField = gameState.currentPlayer === 1 ? 'scores.player1' : 'scores.player2';
        updates[scoreField] = firebase.firestore.FieldValue.increment(1);
        updates.matchedPairs = firebase.firestore.FieldValue.increment(1);
    }
    
    db.collection('matches').doc(gameState.gameId).update(updates).catch((error) => {
        console.error('Eşleşme durumu güncelleme hatası:', error);
    });
}

// Firestore'a sıra değişikliğini güncelle
function updateFirestoreTurn() {
    if (!gameState.gameId) return;
    
    const nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    
    db.collection('matches').doc(gameState.gameId).update({
        currentPlayer: nextPlayer,
        openCards: [],
        isChecking: false,
        lastMoveBy: gameState.playerNumber,
        lastMoveTime: firebase.firestore.FieldValue.serverTimestamp()
    }).catch((error) => {
        console.error('Sıra güncelleme hatası:', error);
    });
}

// Online oyun sonu
function endGameOnline() {
    if (!gameState.gameId) return;
    
    const winner = gameState.scores.player1 > gameState.scores.player2 ? 1 : 
                   gameState.scores.player1 < gameState.scores.player2 ? 2 : 0;
    
    db.collection('matches').doc(gameState.gameId).update({
        status: 'finished',
        winner: winner,
        finishedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        setTimeout(() => endGame(), 1000);
    }).catch((error) => {
        console.error('Oyun sonu güncelleme hatası:', error);
        setTimeout(() => endGame(), 1000);
    });
}

// Gemini AI Oynama
function geminiPlay() {
    if (gameState.isChecking || gameState.openCards.length > 0 || gameState.boardLocked) return;
    
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
        
        // Online modda sırası olmayan oyuncu için görsel geri bildirim
        if (gameState.mode === 'online') {
            const isMyTurn = gameState.currentPlayer === gameState.playerNumber;
            const oyunAlani = document.getElementById('oyun-alani');
            if (oyunAlani) {
                if (isMyTurn) {
                    oyunAlani.style.pointerEvents = 'auto';
                    oyunAlani.style.opacity = '1';
                } else {
                    oyunAlani.style.pointerEvents = 'none';
                    oyunAlani.style.opacity = '0.6';
                }
            }
        }
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
    gameState.boardLocked = false; // Reset sırasında kilidi aç
    
    // Online modda listener'ı temizle
    if (gameState.matchUnsubscribe) {
        gameState.matchUnsubscribe();
        gameState.matchUnsubscribe = null;
    }
    
    gameState.gameId = null;
    gameState.playerNumber = null;
    
    const canvas = document.getElementById('konfeti-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Lobi Fonksiyonları
let lobbyUnsubscribe = null;
let onlineUsersUnsubscribe = null;
let sentInvitesUnsubscribe = null;
let matchesUnsubscribe = null;

function initializeLobby() {
    // Bu fonksiyon artık sadece auth state değiştiğinde çağrılıyor
    // Lobiye girildiğinde kullanıcı eklenmesi loadLobbyUsers() içinde yapılacak
}

// Lobiye katılma - online_users koleksiyonuna ekle
function joinLobby() {
    if (!currentUser) return;
    
    try {
        db.collection('online_users').doc(currentUser.uid).set({
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email,
            email: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch((error) => {
            console.error('Lobiye katılma hatası:', error);
        });
    } catch (error) {
        console.error('Lobiye katılma hatası:', error);
    }
}

// Lobiden ayrılma - online_users koleksiyonundan sil
function leaveLobby() {
    if (!currentUser) return;
    
    try {
        db.collection('online_users').doc(currentUser.uid).delete()
            .catch((error) => {
                console.error('Lobiden ayrılma hatası:', error);
            });
    } catch (error) {
        console.error('Lobiden ayrılma hatası:', error);
    }
    
    // Listener'ları temizle
    if (lobbyUnsubscribe) {
        lobbyUnsubscribe();
        lobbyUnsubscribe = null;
    }
    if (onlineUsersUnsubscribe) {
        onlineUsersUnsubscribe();
        onlineUsersUnsubscribe = null;
    }
    if (sentInvitesUnsubscribe) {
        sentInvitesUnsubscribe();
        sentInvitesUnsubscribe = null;
    }
    if (matchesUnsubscribe) {
        matchesUnsubscribe();
        matchesUnsubscribe = null;
    }
}

function loadLobbyUsers() {
    const userListEl = document.getElementById('kullanici-listesi');
    if (!userListEl) return;
    
    userListEl.innerHTML = '<p style="text-align: center; padding: 20px;">Yükleniyor...</p>';
    
    // Önce kullanıcıyı ekle
    joinLobby();
    
    // Diğer kullanıcıları canlı olarak dinle
    try {
        onlineUsersUnsubscribe = db.collection('online_users')
            .where('uid', '!=', currentUser.uid)
            .onSnapshot((snapshot) => {
                userListEl.innerHTML = '';
                
                // Sadece diğer kullanıcıları listele (kendi kullanıcısı gösterilmez)
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
                    const emptyMsg = document.createElement('p');
                    emptyMsg.style.textAlign = 'center';
                    emptyMsg.style.padding = '20px';
                    emptyMsg.textContent = 'Lobide başka kullanıcı yok.';
                    userListEl.appendChild(emptyMsg);
                }
            }, (error) => {
                console.error('Kullanıcı listesi dinleme hatası:', error);
                userListEl.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff6b6b;">Kullanıcı listesi yüklenirken hata oluştu.</p>';
            });
    } catch (error) {
        console.error('Kullanıcı listesi yükleme hatası:', error);
        userListEl.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff6b6b;">Kullanıcı listesi yüklenirken hata oluştu.</p>';
    }
    
    // Davetleri dinle (gelen ve gönderilen)
    listenForInvites();
    listenForSentInvites();
}

function sendInvite(uid, displayName) {
    try {
        db.collection('invites').add({
            from: currentUser.uid,
            fromName: currentUser.displayName || currentUser.email,
            to: uid,
            toName: displayName,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch((error) => {
            console.error('Davet gönderme hatası:', error);
            alert('Davet gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
        });
    } catch (error) {
        console.error('Davet gönderme hatası:', error);
        alert('Davet gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
}

function listenForInvites() {
    if (!currentUser) return;
    
    try {
        // Gelen davetleri dinle
        db.collection('invites')
            .where('to', '==', currentUser.uid)
            .where('status', '==', 'pending')
            .onSnapshot((snapshot) => {
                const notificationArea = document.getElementById('bildirim-alani');
                if (!notificationArea) return;
                
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
            }, (error) => {
                console.error('Davet dinleme hatası:', error);
            });
    } catch (error) {
        console.error('Davet dinleme hatası:', error);
    }
}

function listenForSentInvites() {
    if (!currentUser) return;
    
    try {
        // Gönderilen davetleri dinle - kabul edildiğinde oyunu başlat
        sentInvitesUnsubscribe = db.collection('invites')
            .where('from', '==', currentUser.uid)
            .where('status', '==', 'accepted')
            .onSnapshot((snapshot) => {
                snapshot.forEach((doc) => {
                    const invite = doc.data();
                    
                    // Match'i bul (oyunculara göre)
                    db.collection('matches')
                        .where('player1.uid', '==', currentUser.uid)
                        .where('player2.uid', '==', invite.to)
                        .where('status', '==', 'active')
                        .limit(1)
                        .get()
                        .then((matchSnapshot) => {
                            if (!matchSnapshot.empty) {
                                const matchDoc = matchSnapshot.docs[0];
                                const match = matchDoc.data();
                                
                                // Lobiden ayrıl (oyun başladığı için)
                                leaveLobby();
                                
                                // Oyunu başlat
                                startOnlineGame(invite.to, invite.toName, match.gameId);
                                
                                // Daveti temizle
                                db.collection('invites').doc(doc.id).delete().catch((error) => {
                                    console.error('Davet silme hatası:', error);
                                });
                            }
                        })
                        .catch((error) => {
                            console.error('Match arama hatası:', error);
                        });
                });
            }, (error) => {
                console.error('Gönderilen davet dinleme hatası:', error);
            });
    } catch (error) {
        console.error('Gönderilen davet dinleme hatası:', error);
    }
}

function acceptInvite(inviteId, fromUid) {
    if (!currentUser) return;
    
    try {
        // Önce davet bilgisini al
        db.collection('invites').doc(inviteId).get().then((inviteDoc) => {
            if (!inviteDoc.exists) {
                alert('Davet bulunamadı.');
                return;
            }
            
            const invite = inviteDoc.data();
            
            // Davet durumunu 'accepted' olarak güncelle
            db.collection('invites').doc(inviteId).update({
                status: 'accepted'
            }).then(() => {
                // Matches koleksiyonunda yeni bir oyun oluştur
                const gameId = db.collection('matches').doc().id;
                
                db.collection('matches').doc(gameId).set({
                    gameId: gameId,
                    player1: {
                        uid: invite.from,
                        displayName: invite.fromName
                    },
                    player2: {
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || currentUser.email
                    },
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    currentPlayer: 1,
                    scores: { player1: 0, player2: 0 },
                    cards: [],
                    openCards: [],
                    isChecking: false,
                    matchedPairs: 0,
                    totalPairs: 8
                }).then(() => {
                    // Lobiden ayrıl (oyun başladığı için)
                    leaveLobby();
                    
                    // Oyunu başlat
                    startOnlineGame(fromUid, invite.fromName, gameId);
                    
                    // Daveti temizle
                    db.collection('invites').doc(inviteId).delete().catch((error) => {
                        console.error('Davet silme hatası:', error);
                    });
                }).catch((error) => {
                    console.error('Oyun oluşturma hatası:', error);
                    alert('Oyun oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
                });
            }).catch((error) => {
                console.error('Davet kabul hatası:', error);
                alert('Davet kabul edilirken bir hata oluştu. Lütfen tekrar deneyin.');
            });
        }).catch((error) => {
            console.error('Davet bilgisi alma hatası:', error);
            alert('Davet bilgisi alınırken bir hata oluştu.');
        });
    } catch (error) {
        console.error('Davet kabul hatası:', error);
        alert('Davet kabul edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
}

function rejectInvite(inviteId) {
    try {
        db.collection('invites').doc(inviteId).update({
            status: 'rejected'
        }).then(() => {
            db.collection('invites').doc(inviteId).delete().catch((error) => {
                console.error('Davet silme hatası:', error);
            });
        }).catch((error) => {
            console.error('Davet reddetme hatası:', error);
        });
    } catch (error) {
        console.error('Davet reddetme hatası:', error);
    }
}

function startOnlineGame(opponentUid, opponentName = 'Rakip', gameId = null) {
    // Online oyun başlatma mantığı
    if (!gameId) {
        console.error('GameId bulunamadı!');
        return;
    }
    
    gameState.gameId = gameId;
    
    // Match belgesini al ve oyuncu numarasını belirle
    db.collection('matches').doc(gameId).get().then((doc) => {
        if (!doc.exists) {
            console.error('Match bulunamadı!');
            return;
        }
        
        const match = doc.data();
        
        // Hangi oyuncu olduğumuzu belirle
        if (match.player1.uid === currentUser.uid) {
            gameState.playerNumber = 1;
            gameState.playerNames.player1 = currentUser.displayName || currentUser.email;
            gameState.playerNames.player2 = match.player2.displayName || 'Rakip';
        } else {
            gameState.playerNumber = 2;
            gameState.playerNames.player1 = match.player1.displayName || 'Rakip';
            gameState.playerNames.player2 = currentUser.displayName || currentUser.email;
        }
        
        // Oyunu başlat
        startGame('online');
        
        // İlk başlatmada kartları Firestore'a kaydet (sadece player1)
        if (!match.cards || match.cards.length === 0) {
            initializeGameInFirestore();
        } else {
            // Kartlar zaten varsa, Firestore'dan senkronize et
            if (match.cards && match.cards.length > 0) {
                gameState.cards = match.cards.map(card => ({
                    id: card.id,
                    image: card.image,
                    matched: card.matched || false
                }));
            }
        }
        
        // Ekranı göster ve render et
        renderGame();
        showScreen('game');
        updateScore();
        updateTurnIndicator();
        
        // Firestore'u dinle
        listenToMatchUpdates();
    }).catch((error) => {
        console.error('Match bilgisi alma hatası:', error);
    });
}

// Firestore'da oyunu başlat (kartları kaydet)
function initializeGameInFirestore() {
    if (!gameState.gameId) return;
    
    // Sadece player1 kartları başlatır (çift başlatmayı önlemek için)
    if (gameState.playerNumber !== 1) {
        // Player2 ise kartları Firestore'dan bekle
        return;
    }
    
    // Kart görsellerini seç (rastgele kategori)
    const categories = Object.keys(cardImages);
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const images = cardImages[selectedCategory].slice(0, gameState.totalPairs);
    
    // Kartları oluştur
    const cards = [];
    images.forEach((img, index) => {
        cards.push({ id: index, image: img, matched: false, state: 'closed' });
        cards.push({ id: index, image: img, matched: false, state: 'closed' });
    });
    
    // Kartları karıştır
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    
    // Firestore'a kaydet
    db.collection('matches').doc(gameState.gameId).update({
        cards: shuffledCards.map((card, index) => ({
            id: card.id,
            image: card.image,
            matched: false,
            state: 'closed',
            index: index
        })),
        totalPairs: gameState.totalPairs,
        matchedPairs: 0
    }).then(() => {
        // Kartları lokal state'e de ekle
        gameState.cards = shuffledCards;
        // Render et (eğer ekran gösteriliyorsa)
        if (screens.game.classList.contains('aktif')) {
            renderGame();
        }
    }).catch((error) => {
        console.error('Oyun başlatma hatası:', error);
    });
}


// Match güncellemelerini dinle
let lastProcessedMoveTime = null;

function listenToMatchUpdates() {
    if (!gameState.gameId || gameState.mode !== 'online') return;
    
    // Önceki listener'ı temizle
    if (gameState.matchUnsubscribe) {
        gameState.matchUnsubscribe();
    }
    
    gameState.matchUnsubscribe = db.collection('matches').doc(gameState.gameId)
        .onSnapshot((doc) => {
            if (!doc.exists) return;
            
            const match = doc.data();
            
            // Sıra güncellemesi
            if (match.currentPlayer && match.currentPlayer !== gameState.currentPlayer) {
                gameState.currentPlayer = match.currentPlayer;
                updateTurnIndicator();
            }
            
            // Skor güncellemesi
            if (match.scores) {
                gameState.scores = match.scores;
                updateScore();
            }
            
            // Eşleşen çift sayısı
            if (match.matchedPairs !== undefined) {
                gameState.matchedPairs = match.matchedPairs;
            }
            
            // Kart durumlarını senkronize et
            if (match.cards && match.cards.length > 0) {
                match.cards.forEach((card, index) => {
                    if (card.matched && !gameState.cards[index].matched) {
                        gameState.cards[index].matched = true;
                        const cardElement = document.querySelector(`[data-index="${index}"]`);
                        if (cardElement) {
                            cardElement.classList.add('eslesen');
                            cardElement.classList.remove('acik');
                        }
                    }
                });
            }
            
            // Sadece diğer oyuncunun hamlelerini işle
            if (match.lastMoveBy && match.lastMoveBy !== gameState.playerNumber && match.lastMoveTime) {
                // Aynı hamleyi tekrar işleme
                const moveTime = match.lastMoveTime.toMillis ? match.lastMoveTime.toMillis() : match.lastMoveTime;
                if (lastProcessedMoveTime && moveTime <= lastProcessedMoveTime) {
                    return;
                }
                lastProcessedMoveTime = moveTime;
                
                // Açılan kartları kontrol et
                if (match.openCards && match.openCards.length === 2 && gameState.openCards.length < 2) {
                    const [card1, card2] = match.openCards;
                    
                    // İlk kartı aç
                    if (gameState.openCards.length === 0) {
                        const cardElement1 = document.querySelector(`[data-index="${card1.index}"]`);
                        if (cardElement1 && !cardElement1.classList.contains('acik') && !cardElement1.classList.contains('eslesen')) {
                            cardElement1.classList.add('acik');
                            gameState.openCards.push({ index: card1.index, card: gameState.cards[card1.index] });
                        }
                    }
                    
                    // İkinci kartı aç
                    setTimeout(() => {
                        if (gameState.openCards.length === 1) {
                            const cardElement2 = document.querySelector(`[data-index="${card2.index}"]`);
                            if (cardElement2 && !cardElement2.classList.contains('acik') && !cardElement2.classList.contains('eslesen')) {
                                cardElement2.classList.add('acik');
                                gameState.openCards.push({ index: card2.index, card: gameState.cards[card2.index] });
                                
                                // Eşleşme kontrolü
                                gameState.boardLocked = true;
                                gameState.isChecking = true;
                                setTimeout(() => {
                                    checkMatch(true);
                                }, 1000);
                            }
                        }
                    }, 500);
                }
            }
            
            // Açık kartları kapat (eşleşme olmadıysa)
            if (match.openCards && match.openCards.length === 0 && gameState.openCards.length > 0 && !match.isChecking) {
                gameState.openCards.forEach(({ index }) => {
                    const cardElement = document.querySelector(`[data-index="${index}"]`);
                    if (cardElement && !cardElement.classList.contains('eslesen')) {
                        cardElement.classList.remove('acik');
                    }
                });
                gameState.openCards = [];
                gameState.isChecking = false;
                gameState.boardLocked = false;
            }
            
            // Oyun sonu kontrolü
            if (match.status === 'finished') {
                setTimeout(() => endGame(), 1000);
            }
        }, (error) => {
            console.error('Match dinleme hatası:', error);
        });
}

// leaveLobby fonksiyonu yukarıda güncellendi

// Sayfa kapatılırken veya kullanıcı çıkış yaparken lobiden çık
window.addEventListener('beforeunload', () => {
    leaveLobby();
});

// Sayfa görünürlüğü değiştiğinde (sekme değiştiğinde) kontrol et
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Sayfa gizlendiğinde lobiden çıkabilir (opsiyonel)
        // leaveLobby();
    }
});

// Global fonksiyonlar (HTML'den çağrılabilmesi için)
window.sendInvite = sendInvite;
window.acceptInvite = acceptInvite;
window.rejectInvite = rejectInvite;
