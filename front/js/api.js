// --- 1. SÉCURITÉ IMMÉDIATE ---
// On vérifie le token avant même de charger le reste
const token = localStorage.getItem('token');

if (!token) {
    // Pas de token ? On dégage direct.
    window.location.href = "../index.html";
    // On lance une erreur volontaire pour stopper l'exécution du reste du script
    throw new Error("Redirection: Token manquant");
}

// --- 2. CONFIGURATION ---
const API_URL = ""; 
let marker = null;
let map = null;

// --- 3. INITIALISATION (Une fois le HTML chargé) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Initialisation de la carte Leaflet
    map = L.map('map').setView([46.2276, 2.2137], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // B. Écouteur sur le clic de la carte
    map.on('click', handleMapClick);

    // C. Écouteur sur le bouton de déconnexion
    const btnLogout = document.getElementById('logout-btn');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }

    // D. GESTION DE L'AFFICHAGE (Correction bug "Carte Grise")
    // Maintenant que tout est prêt, on affiche la page
    document.body.style.display = "flex";
    
    // On dit à Leaflet de recalculer sa taille car le conteneur vient d'apparaître
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
});

// --- 4. FONCTIONS LOGIQUES ---

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('token');
    window.location.href = "../index.html";
}

// Fonction appelée lors du clic sur la carte
async function handleMapClick(e) {
    const { lat, lng } = e.latlng;

    // Mise à jour marqueur
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);

    // Mise à jour texte
    document.getElementById('current-coords').innerHTML = 
        `Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`;

    // Envoi au serveur
    try {
        const response = await fetch(`${API_URL}/api/send-coords`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // On réutilise le token vérifié en haut
            },
            body: JSON.stringify({ lat, lng })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('server-status').innerText = "🟢 WiFi Relay OK";
        } else if (response.status === 401 || response.status === 403) {
            alert("Session expirée.");
            logout(); // On appelle la fonction de déconnexion
        } else {
            document.getElementById('server-status').innerText = "⚠️ Erreur: " + (data.error || "Inconnue");
        }
    } catch (err) {
        document.getElementById('server-status').innerText = "🔴 Serveur Injoignable";
        console.error(err);
    }
}