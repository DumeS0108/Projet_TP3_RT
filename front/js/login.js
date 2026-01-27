/**
 * Gère l'authentification de l'utilisateur
 */
async function doLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgBox = document.getElementById('status-msg');

    msgBox.className = "";
    msgBox.innerText = "Vérification en cours...";

    try {
        // Envoi des identifiants au serveur Node.js (Port 3000)
        const res = await fetch('http://172.29.19.53:3000/api/login', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Sauvegarde du Token JWT et redirection vers l'interface
            localStorage.setItem('token', data.token);
            msgBox.className = "success";
            msgBox.innerText = "✅ Connexion réussie ! Redirection...";
            setTimeout(() => window.location.href = "front/api.html", 1000);
        } else {
            msgBox.className = "error";
            msgBox.innerText = "❌ " + (data.error || "Identifiants invalides");
        }
    } catch (err) {
        console.error(err);
        msgBox.className = "error";
        msgBox.innerText = "❌ Serveur Node.js injoignable";
    }
}

// Sécurité : redirection automatique si un token valide existe déjà
if (localStorage.getItem('token')) {
    window.location.href = "front/api.html";
}