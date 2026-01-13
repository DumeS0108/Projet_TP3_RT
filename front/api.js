// CONFIGURATION - IP de ta VM Debian
const API_URL = "http://172.29.19.53:3000";

// Initialisation de la carte Leaflet
const map = L.map('map').setView([46.2276, 2.2137], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = null;

// Fonction pour ajouter un message dans la console du dashboard
function addLog(message, type = '') {
    const container = document.getElementById('log-container');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const now = new Date().toLocaleTimeString();
    entry.innerText = `[${now}] ${message}`;
    container.prepend(entry);
}

// Gestion du clic sur la carte
map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    
    // Mise à jour ou création du marqueur visuel
    if (marker) {
        marker.setLatLng(e.latlng);
    } else {
        marker = L.marker(e.latlng).addTo(map);
    }

    // Mise à jour de l'affichage texte des coordonnées
    document.getElementById('current-coords').innerText = 
        `Lat: ${lat.toFixed(4)} | Lng: ${lng.toFixed(4)}`;

    addLog(`Envoi vers matériel...`);

    // Envoi des données vers l'API Node.js
    try {
        const response = await fetch(`${API_URL}/api/send-coords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
        });

        const result = await response.json();

        if (response.ok) {
            addLog("Relayé au C++ avec succès", "log-success");
            document.getElementById('server-status').innerText = "🟢 Connecté";
        } else {
            // Affiche l'erreur renvoyée par le serveur (ex: C++ déconnecté)
            addLog(`Erreur: ${result.error}`, "log-error");
        }
    } catch (error) {
        addLog("Serveur Node.js injoignable", "log-error");
        document.getElementById('server-status').innerText = "🔴 Erreur Réseau";
    }
});