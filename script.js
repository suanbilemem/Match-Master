const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

// Firebase'i Başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUserName = "";
let myDocId = "";

// --- 🔑 GİRİŞ YÖNETİMİ ---

// Sayfa yüklendiğinde oturumu kontrol et
auth.onAuthStateChanged((user) => {
    if (user) {
        // Giriş yapılmışsa bilgileri al
        currentUserName = user.displayName;
        myDocId = user.uid;
        document.getElementById("welcome-text").innerText = `Merhaba, ${currentUserName.toUpperCase()}`;
        listenForInvites(); // Davetiyeleri dinlemeye başla
    } else {
        // Giriş yapılmamışsa Google Popup aç
        loginWithGoogle();
    }
});

async function loginWithGoogle() {
    try {
        await auth.signInWithPopup(provider);
    } catch (e) {
        console.error("Giriş iptal edildi:", e);
    }
}

async function logout() {
    try {
        // Lobiden kaydı sil ve oturumu kapat
        if (myDocId) await db.collection("online_users").doc(myDocId).delete();
        await auth.signOut();
        location.reload(); 
    } catch (e) { console.error(e); }
}

// --- 📋 LOBİ VE DAVETİYE ---

function toggleDropdown() {
    document.getElementById("theme-menu").classList.toggle("show");
}

async function enterLobby(selectedTheme) {
    if (!myDocId) return loginWithGoogle();

    document.getElementById("home-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "block";
    
    // Firestore'a oyuncuyu ekle
    await db.collection("online_users").doc(myDocId).set({
        displayName: currentUserName,
        theme: selectedTheme,
        status: "online"
    });

    loadPlayers();
}

function loadPlayers() {
    const listDiv = document.getElementById("player-list");
    db.collection("online_users").onSnapshot((snapshot) => {
        listDiv.innerHTML = "";
        snapshot.forEach((doc) => {
            // Kendini listede gösterme
            if (doc.id !== myDocId) {
                const p = doc.data();
                const row = document.createElement("div");
                row.className = "player-row";
                row.innerHTML = `<span>${p.displayName} (${p.theme})</span>
                                 <button class="play-btn" onclick="sendInvite('${doc.id}')">Oyna</button>`;
                listDiv.appendChild(row);
            }
        });
    });
}

// Davet Gönder
async function sendInvite(targetId) {
    await db.collection("invites").doc(targetId).set({
        fromName: currentUserName,
        status: "pending"
    });
    alert("Davet iletildi!");
}

// Gelen Davetleri Dinle
function listenForInvites() {
    db.collection("invites").doc(myDocId).onSnapshot((doc) => {
        if (doc.exists && doc.data().status === "pending") {
            const data = doc.data();
            // Karşı tarafa onay penceresi çıkar
            if (confirm(`${data.fromName} seni oyuna davet ediyor!`)) {
                alert("Oyun Başlıyor!");
            }
            // Davet kutusunu temizle
            db.collection("invites").doc(myDocId).delete();
        }
    });
}

async function goHome() {
    if (myDocId) await db.collection("online_users").doc(myDocId).delete();
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
}