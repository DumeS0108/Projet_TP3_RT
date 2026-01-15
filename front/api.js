const API_URL = "http://172.29.19.53:3000"; // IP de VM
const map = L.map('map').setView([46.2276, 2.2137], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let marker = null;

map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);

    document.getElementById('current-coords').innerHTML = 
        `Latitude: ${lat.toFixed(5)}<br>Longitude: ${lng.toFixed(5)}`;

    try {
        const response = await fetch(`${API_URL}/api/send-coords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
        });

        if (response.ok) {
            document.getElementById('server-status').innerText = "🟢 WiFi Relay OK";
            console.log("Coordonnées envoyées au serveur Node.");
        } else {
            document.getElementById('server-status').innerText = "⚠️ Erreur C++ (TCP)";
        }
    } catch (err) {
        document.getElementById('server-status').innerText = "🔴 Serveur Injoignable";
    }
});