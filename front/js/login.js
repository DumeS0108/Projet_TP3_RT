// Fonction de connexion
async function doLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgBox = document.getElementById('status-msg');

    // Reset du message
    msgBox.className = "";
    msgBox.innerText = "Vérification en cours...";

    try {
        // On utilise un chemin relatif '/api/login' (plus robuste que l'IP en dur)
        const res = await fetch('/api/login', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // 1. On stocke le TOKEN reçu
            localStorage.setItem('token', data.token);
            
            // 2. Feedback visuel
            msgBox.className = "success";
            msgBox.innerText = "✅ Connexion réussie ! Redirection...";
            
            // 3. Redirection vers le dossier front
            setTimeout(() => window.location.href = "front/api.html", 1000);
        } else {
            msgBox.className = "error";
            msgBox.innerText = "❌ " + (data.error || "Identifiants invalides");
        }
    } catch (err) {
        console.error(err);
        msgBox.className = "error";
        msgBox.innerText = "❌ Serveur injoignable";
    }
}

// Sécurité : Si on a déjà un token, on redirige direct vers la carte
if (localStorage.getItem('token')) {
    window.location.href = "front/api.html";
}