// Fonction d'inscription
async function doRegister() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgBox = document.getElementById('status-msg');

    msgBox.innerText = "Création du compte...";

    try {
        // CORRECTION : Port 3000 obligatoire
        const res = await fetch('http://172.29.19.53:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            msgBox.className = "success";
            msgBox.innerText = "✅ Compte créé avec succès !";
            // On renvoie l'utilisateur vers le login (racine)
            setTimeout(() => window.location.href = "../index.html", 1500);
        } else {
            msgBox.className = "error";
            msgBox.innerText = "❌ " + (data.error || "Erreur d'inscription");
        }
    } catch (err) {
        console.error(err);
        msgBox.className = "error";
        msgBox.innerText = "❌ Erreur réseau";
    }
}