// Configuration de l'URL de ton serveur (VM Debian)
const API_URL = "http://172.29.19.53:3000"; 

// Initialisation de la carte Leaflet
const map = L.map('map').setView([46.2276, 2.2137], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = null;

// Gestion du clic sur la carte
map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    
    // Récupération du token JWT stocké dans le localStorage lors du login
    const token = localStorage.getItem('token');

    // Si aucun token n'est trouvé, on redirige vers le login à la racine
    if (!token) {
        alert("Session absente. Veuillez vous connecter.");
        window.location.href = "../index.html"; 
        return;
    }

    // Mise à jour visuelle du marqueur et de l'affichage des coordonnées
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);

    document.getElementById('current-coords').innerHTML = 
        `Latitude: ${lat.toFixed(5)}<br>Longitude: ${lng.toFixed(5)}`;

    try {
        // Envoi des coordonnées au serveur avec le token d'autorisation
        const response = await fetch(`${API_URL}/api/send-coords`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Transmission du token au "Gardien"
            },
            body: JSON.stringify({ lat, lng })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('server-status').innerText = "🟢 WiFi Relay OK";
            console.log("Coordonnées relayées au matériel.");
        } else if (response.status === 401 || response.status === 403) {
            // Si le token est invalide ou expiré
            document.getElementById('server-status').innerText = "🔐 Session expirée";
            alert("Votre session a expiré. Redirection vers la page de connexion.");
            localStorage.removeItem('token');
            window.location.href = "../index.html"; // Remonte à la racine
        } else {
            document.getElementById('server-status').innerText = "⚠️ Erreur: " + (data.error || "Inconnue");
        }
    } catch (err) {
        document.getElementById('server-status').innerText = "🔴 Serveur Injoignable";
        console.error("Erreur de communication:", err);
    }
});