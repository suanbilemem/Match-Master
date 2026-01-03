const oyunAlani = document.getElementById('oyun-alani');
const kartlar = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8];

// Kartları karıştırma (Shuffle)
kartlar.sort(() => Math.random() - 0.5);

// Kartları ekrana basma
function oyunuBaslat() {
    kartlar.forEach(sayi => {
        const kart = document.createElement('div');
        kart.classList.add('kart');
        kart.dataset.deger = sayi;
        kart.innerText = sayi;
        
        kart.addEventListener('click', () => {
            kart.classList.add('acik');
            console.log("Karta tıklandı: " + sayi);
        });
        
        oyunAlani.appendChild(kart);
    });
}

oyunuBaslat();