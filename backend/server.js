require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const net = require('net');
const path = require('path');
const jwt = require('jsonwebtoken'); // <--- AJOUT : Pour gérer les tokens

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const TCP_PORT = process.env.TCP_PORT || 4000;

app.use(cors());
app.use(express.json());

// --- GESTION DES FICHIERS STATIQUES ---
app.use('/front', express.static(path.join(__dirname, '../front')));
app.use(express.static(path.join(__dirname, '../')));

// --- CONFIGURATION BDD ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) console.error('Erreur connexion BDD:', err);
    else console.log('Connecté à MySQL sur la VM');
});

// --- MIDDLEWARE DE SÉCURITÉ (Le Gardien) --- <--- AJOUT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // On récupère le token après "Bearer "
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: "Accès refusé. Token manquant." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token invalide ou expiré." });
        req.user = user; // On stocke les infos du user pour la suite
        next(); // On laisse passer
    });
}

// --- SERVEUR TCP (Pour le C++) ---
let hardwareSocket = null;

const tcpServer = net.createServer((socket) => {
    console.log('C++ Connecté depuis : ' + socket.remoteAddress);
    hardwareSocket = socket;

    socket.on('data', (data) => {
        console.log('Reçu du C++ :', data.toString());
    });

    socket.on('close', () => {
        console.log('C++ déconnecté');
        hardwareSocket = null;
    });

    socket.on('error', (err) => {
        console.error('Erreur TCP:', err.message);
    });
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`Serveur TCP prêt sur 172.29.19.53:${TCP_PORT}`);
});

// --- API WEB (HTTP) ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Inscription
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const hash = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Utilisateur créé' });
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Connexion (Génération du Token)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu' });
        
        bcrypt.compare(password, results[0].password, (err, isMatch) => {
            if (isMatch) {
                // <--- MODIFICATION : On génère le token ici
                const token = jwt.sign(
                    { id: results[0].id, email: results[0].email }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '2h' }
                );
                // On renvoie le token au Front
                res.json({ message: 'Login OK', token: token });
            } 
            else res.status(401).json({ error: 'Mauvais mot de passe' });
        });
    });
});

// Réception coordonnées (PROTÉGÉE PAR TOKEN)
// On ajoute 'authenticateToken' avant la fonction
app.post('/api/send-coords', authenticateToken, (req, res) => { // <--- AJOUT du gardien
    const { lat, lng } = req.body;
    
    // 1. Sauvegarde BDD
    db.query('INSERT INTO logs_position (latitude, longitude) VALUES (?, ?)', [lat, lng]);

    // 2. Envoi TCP
    if (hardwareSocket) {
        const message = `POS:${lat};${lng}\n`;
        hardwareSocket.write(message);
        console.log('Relayé au C++ ->', message);
        res.json({ status: 'Envoyé au matériel' });
    } else {
        res.status(503).json({ error: 'Aucun matériel C++ connecté' });
    }
});

// Lancement du serveur HTTP
app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`API Web prête sur http://172.29.19.53:${HTTP_PORT}`);
});