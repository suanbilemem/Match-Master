const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUserName = "";
let myDocId = "";

// --- 🔑 GİRİŞ VE ÇIKIŞ YÖNETİMİ ---

auth.onAuthStateChanged((user) => {
    const welcomeTitle = document.getElementById("welcome-text");
    const themeBtn = document.querySelector(".dropbtn");

    if (user) {
        // GİRİŞ YAPILMIŞSA
        currentUserName = user.displayName;
        myDocId = user.uid;
        welcomeTitle.innerText = `Merhaba, ${currentUserName.toUpperCase()}`;
        themeBtn.style.display = "block"; // Temalar butonunu göster
        listenForInvites(); 
    } else {
        // GİRİŞ YAPILMAMIŞSA
        welcomeTitle.innerText = "Match Master'a Hoş Geldin";
        themeBtn.style.display = "none"; // Giriş yapmadan tema seçtirme
        console.log("Oturum kapalı.");
    }
});

// ÇIKIŞ YAP (Butona tıklandığında çalışır)
async function logout() {
    try {
        // 1. Önce online listesinden sil
        if (myDocId) {
            await db.collection("online_users").doc(myDocId).delete();
        }
        // 2. Firebase oturumunu kapat
        await auth.signOut();
        alert("Başarıyla çıkış yapıldı.");
        // 3. Sayfayı en temiz haline döndür
        window.location.href = window.location.pathname; 
    } catch (e) {
        console.error("Çıkış hatası:", e);
    }
}

// GİRİŞ YAP (Butona tıklandığında çalışır - Tarayıcı engellemez)
async function loginWithGoogle() {
    try {
        await auth.signInWithPopup(provider);
    } catch (e) {
        alert("Giriş penceresi engellendi veya kapatıldı. Lütfen tekrar deneyin.");
    }
}

// --- 📋 LOBİ VE DAVETİYE ---

function toggleDropdown() {
    // Eğer giriş yoksa önce giriş yaptır
    if (!auth.currentUser) {
        loginWithGoogle();
    } else {
        document.getElementById("theme-menu").classList.toggle("show");
    }
}

async function enterLobby(selectedTheme) {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "block";
    
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

async function sendInvite(targetId) {
    await db.collection("invites").doc(targetId).set({
        fromName: currentUserName,
        status: "pending"
    });
    alert("Davet iletildi!");
}

function listenForInvites() {
    db.collection("invites").doc(myDocId).onSnapshot((doc) => {
        if (doc.exists && doc.data().status === "pending") {
            const data = doc.data();
            if (confirm(`${data.fromName} seni oyuna davet ediyor!`)) {
                alert("Oyun Başlıyor!");
            }
            db.collection("invites").doc(myDocId).delete();
        }
    });
}

async function goHome() {
    if (myDocId) await db.collection("online_users").doc(myDocId).delete();
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
}