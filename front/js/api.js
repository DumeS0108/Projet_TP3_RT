// PROTECTION DE LA ROUTE
// Vérifie la présence du token avant d'afficher la page
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = "../index.html";
    throw new Error("Redirection: Token manquant");
}

const API_URL = "http://172.29.19.53:3000";
let marker = null;
let map = null;

// INITIALISATION DE L'INTERFACE (Leaflet)
document.addEventListener('DOMContentLoaded', () => {
    // Configuration de la carte centrée sur la France lors du chargement
    map = L.map('map').setView([46.2276, 2.2137], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Écoute les d'événements
    map.on('click', handleMapClick);

    const btnLogout = document.getElementById('logout-btn');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }

    // Ajustement de l'affichage après le chargement
    document.body.style.display = "flex";
    setTimeout(() => { map.invalidateSize(); }, 200);
});

// DÉCONNEXION ET NETTOYAGE

function logout() {
    localStorage.removeItem('token');
    window.location.href = "../index.html";
}


// Capture le clic sur la carte et synchronise avec le serveur/matériel
 
async function handleMapClick(e) {
    const { lat, lng } = e.latlng;

    // Mise à jour visuelle immédiate du marqueur
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);

    document.getElementById('current-coords').innerHTML = 
        `Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}<br><em>Recherche ville...</em>`;

    try {
        // Envoi des coordonnées au serveur pour traitement
        const response = await fetch(`${API_URL}/api/send-coords`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Authentification requise
            },
            body: JSON.stringify({ lat, lng })
        });

        const data = await response.json();

        if (response.ok) {
            // Affichage du retour serveur 
            document.getElementById('server-status').innerText = "🟢 WiFi Relay OK";
            document.getElementById('current-coords').innerHTML = 
                `Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}<br><strong>📍 ${data.city}</strong>`;
                 
        } else if (response.status === 401 || response.status === 403) {
            alert("Session expirée.");
            logout();
        } else {
            document.getElementById('server-status').innerText = "⚠️ Erreur: " + (data.error || "Inconnue");
        }
    } catch (err) {
        // Gestion de l'absence du serveur 
        document.getElementById('server-status').innerText = "🔴 Serveur Injoignable";
        console.error(err);
    }
}