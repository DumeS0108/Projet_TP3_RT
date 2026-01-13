require ('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const net = require('net');

const app = express();
const port = process.env.PORT || 3000;
const TCP_PORT = process.env.TCP_PORT || 4000;

app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) console.error('Erreur connexion BDD:', err);
    else console.log('Connecté à MySQL');
});

//Partie 1 : TCP Server
let hardwareSocket = null;

const tcpServer = net.createServer(socket => {
    console.log('Appareil connecté via TCP' + socket.remoteAddress);
    hardwareSocket = socket;

    socket.on('data', data => {
        console.log('Reçu du C++ : ', data.toString());
    });

    socket.on('close', () => {
        console.log('Client C++ déconnecté');
        hardwareSocket = null;
    });

    socket.on('error', err => {
        console.error('Erreur socket TCP :', err.message);
    });
});

//Partie 2 : Api Web
//Route d'inscription utilisateur (sécurisée avec hashage de mot de passe)
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
    db.query(sql, [email, hash], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Utilisateur créé' });
    });
});

// Route Connexion
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    
    db.query(sql, [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Utilisateur inconnu' });
        
        const user = results[0];
        // Comparaison du MDP clair avec le Hash en BDD
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (isMatch) res.json({ message: 'Connexion réussie', userId: user.id });
            else res.status(401).json({ error: 'Mauvais mot de passe' });
        });
    });
});

//Route : Envoi coordonnées :
app.post('api/send-coords', (req, res) => {
    const{lat,lng} = req.body;
    db.query('INSERT INTO logs_position (latitude, longitude) VALUES (?, ?)', [lat, lng]);
    if (hardwareSocket) {
        const message = `Post:${lat},${lng}\n`;
        hardwareSocket.write(message);
        res.json({ message: 'Envoyé au matériel' });
    } else {
        res.status(503).json({ error: 'Matériel non connecté' });
    }
});

//Démarrage des serveurs
app.listen(port, () => {
    console.log(`Serveur web démarré sur le port ${port}`);
});
    