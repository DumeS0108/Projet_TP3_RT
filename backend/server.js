require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const net = require('net');

const app = express();
const HTTP_PORT = 3000;
const TCP_PORT = 4000;

app.use(cors());
app.use(express.json());

// --- CONFIGURATION BDD (Sur la VM) ---
const db = mysql.createConnection({
    host: '172.29.19.53',      // Local par rapport à la VM
    user: 'root',           // UTILISATEUR MYSQL (Souvent 'root')
    password: 'root', // METS TON MOT DE PASSE ICI
    database: 'projet_iot_db'
});

db.connect(err => {
    if (err) console.error('Erreur connexion BDD:', err);
    else console.log('Connecté à MySQL sur la VM');
});

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

// Écoute sur 0.0.0.0 pour être accessible depuis ton PC Windows
tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`Serveur TCP prêt sur 172.29.19.53:${TCP_PORT}`);
});

// --- API WEB (HTTP) ---

// Inscription
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Utilisateur créé' });
    });
});

// Connexion
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Inconnu' });
        
        bcrypt.compare(password, results[0].password, (err, isMatch) => {
            if (isMatch) res.json({ message: 'Login OK', userId: results[0].id });
            else res.status(401).json({ error: 'Mauvais mot de passe' });
        });
    });
});

// Réception coordonnées depuis le Web -> Envoi vers C++
app.post('/api/send-coords', (req, res) => {
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

// Écoute sur 0.0.0.0
app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`API Web prête sur http://172.29.19.53:${HTTP_PORT}`);
});