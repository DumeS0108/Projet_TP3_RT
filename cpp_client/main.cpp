#include <iostream>
#include <cstring>      // Pour memset
#include <sys/socket.h> // Spécifique Linux
#include <arpa/inet.h>  // Spécifique Linux
#include <unistd.h>     // Pour close()

int main() {
    int sock = 0;
    struct sockaddr_in serv_addr;
    char buffer[1024] = {0};

    // 1. Création du socket
    if ((sock = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        std::cout << "\n Erreur de création du socket \n";
        return -1;
    }

    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(4000); // Port du serveur Node.js

    // 2. Adresse IP du serveur
    if(inet_pton(AF_INET, "127.0.0.1", &serv_addr.sin_addr) <= 0) {
        std::cout << "\n Adresse invalide ou non supportée \n";
        return -1;
    }

    std::cout << "Tentative de connexion au serveur Node..." << std::endl;

    // 3. Connexion
    if (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) {
        std::cout << "\n Connexion échouée. Le serveur Node est-il lancé ? \n";
        return -1;
    }

    std::cout << "Connecté au serveur Node.js ! En attente d'ordres..." << std::endl;

    // 4. Boucle de lecture
    while(true) {
        memset(buffer, 0, 1024); // On nettoie le buffer
        int valread = read(sock, buffer, 1024);
        
        if (valread > 0) {
            std::cout << "Reçu du serveur : " << buffer << std::endl;
        } else if (valread == 0) {
            std::cout << "Serveur déconnecté." << std::endl;
            break;
        } else {
            break;
        }
    }

    close(sock);
    return 0;
}