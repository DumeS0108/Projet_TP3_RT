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

// Accès aux fichiers du front et ressources statiques
app.use('/front', express.static(path.join(__dirname, '../front')));
app.use(express.static(path.join(__dirname, '../')));

// Connexion à la base de données MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) console.error('Erreur lors de la connexion BDD:', err);
    else console.log('Base de données connectée sur la VM');
});

// Vérification du jeton JWT pour sécuriser les routes
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

// Gestion du serveur TCP pour la communication avec le client C++
let hardwareSocket = null;

const tcpServer = net.createServer((socket) => {
    console.log('Client C++ détecté à : ' + socket.remoteAddress);
    hardwareSocket = socket;

    socket.on('data', (data) => {
        console.log('Message reçu du C++ :', data.toString());
    });

    socket.on('close', () => {
        console.log('Le client C++ s\'est déconnecté');
        hardwareSocket = null;
    });

    socket.on('error', (err) => {
        console.error('Problème sur le flux TCP:', err.message);
    });
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`Le canal TCP est ouvert sur le port ${TCP_PORT}`);
});

// Routes de l'API Web 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Enregistrement d'un nouvel utilisateur
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Compte créé avec succès' });
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur interne lors de l'inscription" });
    }
});

// Authentification et génération du token
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Identifiants incorrects' });
        
        bcrypt.compare(password, results[0].password, (err, isMatch) => {
            if (isMatch) {
                const token = jwt.sign(
                    { id: results[0].id, email: results[0].email }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '2h' }
                );
                res.json({ message: 'Connexion réussie', token: token });
            } 
            else res.status(401).json({ error: 'Mot de passe invalide' });
        });
    });
});

// Réception des coordonnées, conversion en ville et transfert au matériel
app.post('/api/send-coords', authenticateToken, async (req, res) => {
    const { lat, lng } = req.body;
    let city = "Inconnu";

    try {
        // On interroge OpenStreetMap pour obtenir le nom de la ville
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Projet_IOT_Student_App' }
        });
        const data = await response.json();

        if (data && data.address) {
            city = data.address.city || data.address.town || data.address.village || data.address.hamlet || "Inconnu";
        }
    } catch (error) {
        console.error("Échec de la récupération de la ville:", error.message);
    }

    // On garde en base de données
    const sql = 'INSERT INTO logs_position (latitude, longitude, city) VALUES (?, ?, ?)';
    db.query(sql, [lat, lng, city], (err) => {
        if (err) console.error("Erreur d'insertion SQL:", err.message);
    });

    // Si le matériel est connecté, on lui transmet les données formatées
    if (hardwareSocket) {
        const message = `POS:${lat};${lng};${city}\n`;
        hardwareSocket.write(message);
        console.log('Données transmises au C++ ->', message);
    }

    res.json({ status: 'Localisation envoyée au matériel', city: city });
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`Interface Web disponible sur le port ${HTTP_PORT}`);
});