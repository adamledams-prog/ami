// Variables globales
const dialogueText = document.getElementById('dialogue-text');
const demoContainer = document.getElementById('demo-container');
const btnContinuer = document.getElementById('btn-continuer');

let currentCharIndex = 0;
let currentText = '';
let isTyping = false;

// Animation typeWriter
function typeWriter(text, callback) {
    if (isTyping) return;
    
    isTyping = true;
    currentText = text;
    currentCharIndex = 0;
    dialogueText.textContent = '';
    
    function type() {
        if (currentCharIndex < currentText.length) {
            dialogueText.textContent += currentText.charAt(currentCharIndex);
            currentCharIndex++;
            setTimeout(type, 40);
        } else {
            isTyping = false;
            if (callback) callback();
        }
    }
    
    type();
}

// Démarrage du tutoriel mobile
function startTutoMobile() {
    const nomJoueur = localStorage.getItem('nomJoueur') || 'Joueur';
    
    // Message de bienvenue
    const message1 = `Bienvenue ${nomJoueur} ! Mode MOBILE activé 📱`;
    typeWriter(message1, () => {
        setTimeout(() => {
            // Deuxième message expliquant les commandes
            const message2 = "Touche l'écran comme un pro ! Regarde bien ces commandes : 👇";
            typeWriter(message2, () => {
                setTimeout(() => {
                    // Afficher la démo
                    demoContainer.style.display = 'flex';
                    
                    // Afficher le bouton continuer après 2.5 secondes
                    setTimeout(() => {
                        btnContinuer.style.display = 'block';
                    }, 2500);
                }, 1200);
            });
        }, 1800);
    });
}

// Gestion du bouton continuer
btnContinuer.addEventListener('click', () => {
    const messageFinal = "C'est parti ! Que le meilleur gagne ! 🏆";
    btnContinuer.style.display = 'none';
    demoContainer.style.display = 'none';
    
    typeWriter(messageFinal, () => {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    });
});

// Démarrage au chargement
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        startTutoMobile();
    }, 500);
});
