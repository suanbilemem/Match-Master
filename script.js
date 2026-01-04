* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d); color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }

.ekran { display: none; width: 100%; min-height: 100vh; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
.ekran.aktif { display: flex; }

.login-container, .menu-container { background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(15px); padding: 40px; border-radius: 20px; text-align: center; width: 100%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }

.liste-alani { background: rgba(255, 255, 255, 0.1); border-radius: 12px; margin: 20px 0; max-height: 300px; overflow-y: auto; padding: 10px; }

.kullanici-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.15); padding: 12px; margin-bottom: 8px; border-radius: 8px; transition: 0.3s; }
.kullanici-item:hover { background: rgba(255, 255, 255, 0.25); }

.btn { padding: 12px 25px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; font-size: 1rem; transition: 0.3s; width: 100%; }
.btn-primary { background: #fff; color: #b21f1f; }
.btn-secondary { background: rgba(255, 255, 255, 0.2); color: white; margin-top: 15px; }
.btn-davet { background: #38ef7d; color: #111; padding: 5px 15px; border-radius: 5px; border: none; cursor: pointer; font-weight: bold; }

.oyun-alani { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
.kart { width: 70px; height: 70px; background: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; font-size: 2rem; }
.kart::after { content: '?'; position: absolute; background: #222; width: 100%; height: 100%; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; transition: 0.3s; }
.kart.acik::after, .kart.eslesen::after { opacity: 0; pointer-events: none; }
.kart.eslesen { background: #38ef7d; box-shadow: 0 0 15px #38ef7d; }

.oyun-ust-bilgi { width: 100%; max-width: 500px; margin-bottom: 20px; }
.skor-alani { display: flex; justify-content: space-between; gap: 10px; }
.skor-kart { background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; flex: 1; text-align: center; }
#sira-gosterge { text-align: center; margin-top: 10px; font-weight: bold; font-size: 1.2rem; color: #fdbb2d; }