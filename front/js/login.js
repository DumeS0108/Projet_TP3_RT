async function doLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const msgBox = document.getElementById('status-msg');

            msgBox.className = "";
            msgBox.innerText = "Vérification en cours...";

            try {
                const res = await fetch('http://172.29.19.53:3000/api/login', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

                const data = await res.json();

                if (res.ok) {
                    // On stocke le TOKEN JWT reçu du serveur
                    localStorage.setItem('token', data.token);
                    msgBox.className = "success";
                    msgBox.innerText = "✅ Connexion réussie ! Redirection...";
                    setTimeout(() => window.location.href = "front/api.html", 1000);
                } else {
                    msgBox.className = "error";
                    msgBox.innerText = "❌ " + (data.error || "Identifiants invalides");
                }
            } catch (err) {
                msgBox.className = "error";
                msgBox.innerText = "❌ Serveur injoignable";
            }
        }
        
if (localStorage.getItem('token')) {
    window.location.href = "front/api.html";
}