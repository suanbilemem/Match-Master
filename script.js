// 1. Firebase Yapılandırması
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
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Global Değişkenler
let currentUserName = "";
let myDocId = "";

// --- 🔑 OTURUM VE GİRİŞ İŞLEMLERİ ---

// Google ile Giriş
async function loginWithGoogle() {
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error("Giriş hatası:", error);
        alert("Giriş yapılamadı!");
    }
}

// Çıkış Yap (Hem lobiden hem hesaptan)
async function logout() {
    try {
        // Eğer lobide kayıtlıysa Firestore'dan sil
        if (myDocId) {
            await db.collection("online_users").doc(myDocId).delete();
        }
        await auth.signOut();
        location.reload(); // Sayfayı sıfırla
    } catch (error) {
        console.error("Çıkış hatası:", error);
    }
}

// Oturum Takibi (Kullanıcı giriş yaptı mı kontrol eder)
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUserName = user.displayName;
        myDocId = user.uid; //
        document.querySelector("h1").innerText = `Merhaba, ${currentUserName.toUpperCase()}`; //
    } else {
        // Eğer giriş yapılmamışsa giriş ekranına yönlendirilebilir
        console.log("Oturum kapalı");
    }
});

// --- 📋 TEMA VE LOBİ MANTIĞI ---

// Dropdown Menü Aç/Kapat
function toggleDropdown() {
    document.getElementById("theme-menu").classList.toggle("show"); //
}

// Lobiye Giriş (Tek lobi, herkes birbirini görür)
async function enterLobby(selectedTheme) {
    if (!auth.currentUser) {
        alert("Önce giriş yapmalısın!");
        return loginWithGoogle();
    }

    document.getElementById("home-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "block"; //
    
    // Firestore'a online kaydı bırak
    try {
        await db.collection("online_users").doc(myDocId).set({
            displayName: currentUserName,
            theme: selectedTheme,
            status: "online",
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Lobi kaydı başarısız:", e);
    }

    loadPlayers();
}

// Oyuncuları Listeleme
function loadPlayers() {
    const listDiv = document.getElementById("player-list");

    db.collection("online_users").onSnapshot((snapshot) => {
        listDiv.innerHTML = "";
        let foundOthers = false;

        snapshot.forEach((doc) => {
            const player = doc.data();
            // Kendini listede gösterme
            if (doc.id !== myDocId) {
                const row = document.createElement("div");
                row.className = "player-row";
                row.innerHTML = `
                    <span>${player.displayName} (${player.theme})</span>
                    <button class="play-btn" onclick="invite('${doc.id}')">Oyna</button>
                `;
                listDiv.appendChild(row);
                foundOthers = true;
            }
        });

        if (!foundOthers) {
            listDiv.innerHTML = "<p style='font-size:12px; color:#888;'>Şu an kimse yok...</p>"; //
        }
    });
}

// Ana Ekrana Geri Dön (Lobiden çıkış)
async function goHome() {
    if (myDocId) {
        await db.collection("online_users").doc(myDocId).delete();
    }
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
    document.getElementById("theme-menu").classList.remove("show");
}

// Basit Davet Fonksiyonu
function invite(targetId) {
    alert("Davet gönderildi: " + targetId);
}