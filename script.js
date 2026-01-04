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

// --- 🔑 OTURUM YÖNETİMİ ---

auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById("login-btn");
    const themeSection = document.getElementById("theme-section");
    const welcomeText = document.getElementById("welcome-text");
    const subText = document.getElementById("sub-text");

    if (user) {
        // Giriş Yapılmışsa
        currentUserName = user.displayName;
        myDocId = user.uid; //
        welcomeText.innerText = `Merhaba, ${currentUserName.toUpperCase()}`;
        subText.innerText = "Bir tema seç ve rakibini davet et";
        
        loginBtn.style.display = "none";
        themeSection.style.display = "block";
        listenForInvites(); 
    } else {
        // Giriş Yapılmamışsa
        welcomeText.innerText = "Match Master";
        subText.innerText = "Devam etmek için giriş yapın";
        
        loginBtn.style.display = "block"; // Giriş butonunu göster
        themeSection.style.display = "none"; // Temaları gizle
    }
});

async function loginWithGoogle() {
    try {
        await auth.signInWithPopup(provider);
    } catch (e) {
        alert("Giriş penceresi engellendi. Lütfen adres çubuğundaki engel işaretine tıklayıp izin verin."); //
    }
}

async function logout() {
    try {
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