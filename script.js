const oyunAlani = document.getElementById('oyun-alani');
const kartlar = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8];

// Kartları karıştırma (Shuffle)
kartlar.sort(() => Math.random() - 0.5);

// Açık kartları takip etme
let acikKartlar = [];
let kontrolEdiliyor = false;

// Kartları ekrana basma
function oyunuBaslat() {
    kartlar.forEach(sayi => {
        const kart = document.createElement('div');
        kart.classList.add('kart');
        kart.dataset.deger = sayi;
        kart.innerText = sayi;
        
        kart.addEventListener('click', () => {
            kartAc(kart);
        });
        
        oyunAlani.appendChild(kart);
    });
}

// Kart açma fonksiyonu
function kartAc(kart) {
    // Eğer kart zaten açık, eşleşen veya kontrol ediliyor ise işlem yapma
    if (kart.classList.contains('acik') || 
        kart.classList.contains('eslesen') || 
        kontrolEdiliyor) {
        return;
    }
    
    // Kartı aç
    kart.classList.add('acik');
    acikKartlar.push(kart);
    
    // İki kart açıldığında eşleşme kontrolü yap
    if (acikKartlar.length === 2) {
        kontrolEdiliyor = true;
        setTimeout(() => {
            eslesmeKontrolEt();
        }, 500); // Kısa bir gecikme ile kontrol et (kullanıcı kartları görebilsin)
    }
}

// Eşleşme kontrolü fonksiyonu
function eslesmeKontrolEt() {
    const [kart1, kart2] = acikKartlar;
    const deger1 = kart1.dataset.deger;
    const deger2 = kart2.dataset.deger;
    
    if (deger1 === deger2) {
        // Kartlar eşleşti
        kart1.classList.add('eslesen');
        kart2.classList.add('eslesen');
        console.log('Kartlar eşleşti!');
    } else {
        // Kartlar eşleşmedi, kartları kapat
        setTimeout(() => {
            kart1.classList.remove('acik');
            kart2.classList.remove('acik');
        }, 1000); // 1 saniye göster sonra kapat
    }
    
    // Açık kartları temizle
    acikKartlar = [];
    kontrolEdiliyor = false;
}

oyunuBaslat();