async function doLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgBox = document.getElementById('status-msg');

    msgBox.className = "";
    msgBox.innerText = "Vérification en cours...";

    try {
        // CORRECTION IMPORTANTE : On vise le port 3000 explicitement
        const res = await fetch('http://172.29.19.53:3000/api/login', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            msgBox.className = "success";
            msgBox.innerText = "✅ Connexion réussie ! Redirection...";
            // On redirige vers api.html (chemin relatif depuis index.html)
            setTimeout(() => window.location.href = "front/api.html", 1000);
        } else {
            msgBox.className = "error";
            msgBox.innerText = "❌ " + (data.error || "Identifiants invalides");
        }
    } catch (err) {
        console.error(err);
        msgBox.className = "error";
        msgBox.innerText = "❌ Serveur Node.js injoignable (Port 3000 ?)";
    }
}

// Vérification auto si déjà connecté
if (localStorage.getItem('token')) {
    window.location.href = "front/api.html";
}