require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const net = require('net');
const path = require('path');
const jwt = require('jsonwebtoken');

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

// --- MIDDLEWARE DE SÉCURITÉ ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: "Accès refusé. Token manquant." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token invalide ou expiré." });
        req.user = user;
        next();
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

// Connexion
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu' });
        bcrypt.compare(password, results[0].password, (err, isMatch) => {
            if (isMatch) {
                const token = jwt.sign(
                    { id: results[0].id, email: results[0].email }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '2h' }
                );
                res.json({ message: 'Login OK', token: token });
            } 
            else res.status(401).json({ error: 'Mauvais mot de passe' });
        });
    });
});

// --- ROUTE MODIFIÉE : Envoi coordonnées + Récupération Ville ---
app.post('/api/send-coords', authenticateToken, async (req, res) => {
    const { lat, lng } = req.body;
    let city = "Inconnu";

    try {
        // 1. Appel API OpenStreetMap (Reverse Geocoding)
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Projet_IOT_Student_App' } // Header obligatoire pour OSM
        });
        const data = await response.json();

        // 2. Extraction du nom de la ville
        if (data && data.address) {
            city = data.address.city || data.address.town || data.address.village || data.address.hamlet || "Inconnu";
        }
    } catch (error) {
        console.error("Erreur Geocoding:", error.message);
    }

    // 3. Sauvegarde en BDD avec la ville
    // ATTENTION : Assure-toi d'avoir ajouté la colonne 'city' dans ta table MySQL !
    // Si ta table n'a pas encore la colonne city, utilise l'ancienne requête.
    const sql = 'INSERT INTO logs_position (latitude, longitude, city) VALUES (?, ?, ?)';
    
    db.query(sql, [lat, lng, city], (err) => {
        if (err) console.error("Erreur SQL:", err.message);
    });

    // 4. Envoi au C++ (Format : POS:Lat;Lng;Ville)
    if (hardwareSocket) {
        const message = `POS:${lat};${lng};${city}\n`;
        hardwareSocket.write(message);
        console.log('Relayé au C++ ->', message);
    }

    // 5. Réponse au Front
    res.json({ status: 'Envoyé au matériel', city: city });
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`API Web prête sur http://172.29.19.53:${HTTP_PORT}`);
});