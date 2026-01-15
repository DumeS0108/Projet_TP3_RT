// --- 1. SÉCURITÉ IMMÉDIATE ---
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = "../index.html";
    throw new Error("Redirection: Token manquant");
}

// --- 2. CONFIGURATION ---
const API_URL = "http://172.29.19.53:3000";
let marker = null;
let map = null;

// --- 3. INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([46.2276, 2.2137], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', handleMapClick);

    const btnLogout = document.getElementById('logout-btn');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }

    document.body.style.display = "flex";
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
});

// --- 4. FONCTIONS LOGIQUES ---

function logout() {
    localStorage.removeItem('token');
    window.location.href = "../index.html";
}

async function handleMapClick(e) {
    const { lat, lng } = e.latlng;

    // Mise à jour marqueur
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);

    // Feedback immédiat (en attendant la réponse du serveur)
    document.getElementById('current-coords').innerHTML = 
        `Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}<br><em>Recherche ville...</em>`;

    // Envoi au serveur
    try {
        const response = await fetch(`${API_URL}/api/send-coords`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ lat, lng })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('server-status').innerText = "🟢 WiFi Relay OK";
            
            // --- MISE À JOUR : Affichage de la ville reçue ---
            document.getElementById('current-coords').innerHTML = 
                `Lat: ${lat.toFixed(5)}<br>
                 Lng: ${lng.toFixed(5)}<br>
                 <strong>📍 ${data.city}</strong>`;
                 
        } else if (response.status === 401 || response.status === 403) {
            alert("Session expirée.");
            logout();
        } else {
            document.getElementById('server-status').innerText = "⚠️ Erreur: " + (data.error || "Inconnue");
        }
    } catch (err) {
        document.getElementById('server-status').innerText = "🔴 Serveur Injoignable";
        console.error(err);
    }
}