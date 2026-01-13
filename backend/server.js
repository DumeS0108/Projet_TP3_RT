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

