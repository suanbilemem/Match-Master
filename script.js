const firebaseConfig = {
    apiKey: "AIzaSyCyMupvmvSTwriPzjtN1xfp36SaJ470Xjc",
    authDomain: "match-master-af628.firebaseapp.com",
    databaseURL: "https://match-master-af628-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "match-master-af628",
    storageBucket: "match-master-af628.firebasestorage.app",
    messagingSenderId: "508395504322",
    appId: "1:508395504322:web:93343b6445b24a27b5715b"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUserName = "KEREM GÖNEÇ"; 
let myKey = currentUserName.replace(/\s+/g, '_');

// Dropdown aç/kapat
function toggleDropdown() {
    document.getElementById("theme-menu").classList.toggle("show");
}

// Lobiye giriş
function enterLobby(theme) {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "block";

    // Firebase'e "Buradayım" kaydı at (Tema bilgisiyle birlikte)
    database.ref('players/' + myKey).set({
        name: currentUserName,
        currentTheme: theme,
        status: "online"
    });

    // Bağlantı kesilirse sil
    database.ref('players/' + myKey).onDisconnect().remove();

    // Tüm oyuncuları dinle (Lobi ayrımı yok)
    loadPlayers();
}

function loadPlayers() {
    const listDiv = document.getElementById("player-list");

    database.ref('players').on('value', (snapshot) => {
        listDiv.innerHTML = "";
        let foundOthers = false;

        snapshot.forEach((child) => {
            const player = child.val();
            // Kendimi listede gösterme
            if (player.name !== currentUserName) {
                const row = document.createElement("div");
                row.className = "player-row";
                row.innerHTML = `
                    <span>${player.name} (${player.currentTheme})</span>
                    <button class="play-btn" onclick="alert('Davet gönderildi!')">Oyna</button>
                `;
                listDiv.appendChild(row);
                foundOthers = true;
            }
        });

        if (!foundOthers) {
            listDiv.innerHTML = "<p style='font-size:12px; color:#888;'>Kimse yok...</p>";
        }
    });
}

// Geri Dön
function goHome() {
    database.ref('players/' + myKey).remove();
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
    document.getElementById("theme-menu").classList.remove("show");
}