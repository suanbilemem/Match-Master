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

// --- GİRİŞ VE ÇIKIŞ ---

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUserName = user.displayName;
        myDocId = user.uid; //
        document.querySelector("h1").innerText = `Merhaba, ${currentUserName.toUpperCase()}`;
        listenForInvites(); // Kullanıcı girince davetiyeleri dinlemeye başla
    }
});

async function logout() {
    try {
        if (myDocId) await db.collection("online_users").doc(myDocId).delete();
        await auth.signOut();
        location.reload(); 
    } catch (e) { console.error(e); }
}

// --- LOBİ ---

function toggleDropdown() {
    document.getElementById("theme-menu").classList.toggle("show");
}

async function enterLobby(selectedTheme) {
    if (!myDocId) { await auth.signInWithPopup(provider); return; }

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

// --- DAVETİYE SİSTEMİ ---

async function sendInvite(targetId) {
    // Firestore'da 'invites' koleksiyonuna kayıt atar
    await db.collection("invites").doc(targetId).set({
        fromName: currentUserName,
        status: "pending"
    });
    alert("Davet iletildi!"); //
}

function listenForInvites() {
    // Sana gelen bir davet var mı diye sürekli bakar
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