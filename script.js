// 1. Firebase Yapılandırması (Senin Bilgilerin)
const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

// 2. Firebase Başlatma (Firestore için güncellendi)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Firestore kullanımı

let currentUserName = "KEREM GÖNEÇ"; 
let myDocId = "HMtOT3ALWwxt96ZMxv9FyWneUOr1"; // Firebase panelindeki UID'n

// Dropdown aç/kapat
function toggleDropdown() {
    document.getElementById("theme-menu").classList.toggle("show");
}

// Lobiye giriş ve Firestore'a yazma
async function enterLobby(selectedTheme) {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "block";
    
    // Firestore'da 'online_users' koleksiyonuna kendini ekle
    try {
        await db.collection("online_users").doc(myDocId).set({
            displayName: currentUserName,
            theme: selectedTheme,
            status: "online",
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Lobiye giriş yapıldı:", selectedTheme);
    } catch (error) {
        console.error("Giriş hatası:", error);
    }

    loadPlayersFirestore();
}

// Tüm oyuncuları Firestore'dan anlık çekme
function loadPlayersFirestore() {
    const listDiv = document.getElementById("player-list");

    // 'online_users' koleksiyonundaki herkesi dinle (Tek lobi)
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
            listDiv.innerHTML = "<p style='font-size:12px; color:#888;'>Şu an başka kimse yok...</p>";
        }
    });
}

// Ana Ekran - Lobiden Ayrılma
async function goHome() {
    // Firestore'dan kaydını sil
    await db.collection("online_users").doc(myDocId).delete();
    
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
    document.getElementById("theme-menu").classList.remove("show");
}