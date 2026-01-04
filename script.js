// 1. Firebase Yapılandırması (Senin Bilgilerin)
const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    databaseURL: "https://match-master-af628-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

// 2. Firebase Başlatma
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Değişkenler
let currentUserName = "KEREM GÖNEÇ"; // Bu normalde giriş ekranından gelmeli
let currentTheme = "";

// --- MENÜ KONTROLLERİ ---

function toggleDropdown() {
    document.getElementById("dropdown-menu").classList.toggle("show");
}

// Lobiye Giriş ve Oyuncuyu Firebase'e Ekleme
function enterLobby(theme) {
    currentTheme = theme;
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "block";
    document.getElementById("lobby-title").innerText = theme + " Lobisi";
    
    // Oyuncuyu bu temada aktif olarak işaretle
    const playerRef = database.ref('players/' + currentUserName.replace(/\s+/g, '_'));
    playerRef.set({
        name: currentUserName,
        status: "online",
        theme: theme,
        lastSeen: Date.now()
    });

    // Oyuncu sekmeyi kapattığında Firebase'den silinsin
    playerRef.onDisconnect().remove();

    loadPlayers(theme);
}

// Ana Ekran Butonu - Çıkış ve Ekran Değiştirme
function goHome() {
    // Lobiden ayrılırken Firebase'den kaydı sil
    database.ref('players/' + currentUserName.replace(/\s+/g, '_')).remove();

    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
    document.getElementById("dropdown-menu").classList.remove("show");
}

// --- OYUNCU LİSTESİ YÖNETİMİ ---

function loadPlayers(theme) {
    const listDiv = document.getElementById("player-list");

    // Sadece seçilen temadaki "online" oyuncuları dinle
    database.ref('players').orderByChild('theme').equalTo(theme).on('value', (snapshot) => {
        listDiv.innerHTML = "";
        let count = 0;

        snapshot.forEach((childSnapshot) => {
            const playerData = childSnapshot.val();
            
            // Kendini listede gösterme
            if (playerData.name !== currentUserName) {
                const row = document.createElement("div");
                row.className = "player-row";
                row.innerHTML = `
                    <span>${playerData.name}</span>
                    <button class="play-btn" onclick="invitePlayer('${childSnapshot.key}')">Oyna</button>
                `;
                listDiv.appendChild(row);
                count++;
            }
        });

        if (count === 0) {
            listDiv.innerHTML = "<p style='color: #ddd; font-size: 14px;'>Şu an kimse yok...</p>";
        }
    });
}

// Davet Gönderme Fonksiyonu
function invitePlayer(playerKey) {
    const targetRef = database.ref('invites/' + playerKey);
    targetRef.set({
        from: currentUserName,
        type: "challenge",
        timestamp: Date.now()
    }).then(() => {
        alert("Davet başarıyla gönderildi! Rakibin cevabı bekleniyor...");
    });
}

// --- DAVETLERİ DİNLEME (Gelen İstekler) ---

function listenForInvites() {
    const myKey = currentUserName.replace(/\s+/g, '_');
    database.ref('invites/' + myKey).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const invite = snapshot.val();
            const accept = confirm(`${invite.from} seni maça davet ediyor! Kabul ediyor musun?`);
            
            if (accept) {
                alert("Oyun Başlıyor! (Oyun sayfasına yönlendiriliyorsunuz...)");
                // Buraya oyun sayfasının linkini ekleyebilirsin
            }
            // İstek işlendikten sonra daveti sil
            database.ref('invites/' + myKey).remove();
        }
    });
}

// Sayfa açıldığında davetleri dinlemeye başla
listenForInvites();