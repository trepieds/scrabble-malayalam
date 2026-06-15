# 🎲 സ്ക്രാബിൾ — Scrabble Malayalam en ligne

## Lancer le serveur

```bash
cd scrabble-malayalam-online
npm install
node server.js
```

Le serveur démarre sur http://localhost:3000

## Jouer avec un ami

### Sur le même réseau Wi-Fi (le plus simple)
1. Lancez `node server.js` sur votre ordinateur
2. Trouvez votre IP locale :
   - **Mac/Linux** : `ip addr | grep "inet " | grep -v 127` ou `hostname -I`
   - **Windows** : `ipconfig` → cherchez "Adresse IPv4"
3. Votre ami ouvre `http://VOTRE_IP:3000` dans son navigateur
4. Vous créez une partie → envoyez le code → votre ami rejoint !

### Depuis n'importe où sur internet (avec ngrok)
1. Installez ngrok : https://ngrok.com/download
2. Lancez le serveur : `node server.js`
3. Dans un autre terminal : `ngrok http 3000`
4. Partagez l'URL https://xxx.ngrok.io à votre ami

## Règles
- Plateau 15×15 avec cases spéciales
- 7 lettres par joueur
- 🟥 3M = mot × 3 · 🟧 2M = mot × 2
- 🟦 3L = lettre × 3 · 🟩 2L = lettre × 2
- Le premier mot doit couvrir la case ⭐ centrale
