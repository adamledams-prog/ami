// Variables globales
const dialogueText = document.getElementById('dialogue-text');
const demoContainer = document.getElementById('demo-container');
const btnContinuer = document.getElementById('btn-continuer');

let currentCharIndex = 0;
let currentText = '';
let isTyping = false;
let tutorielSkipped = false;

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
                    
                    // Afficher le bouton continuer après 0.5 secondes (réduit)
                    setTimeout(() => {
                        btnContinuer.style.display = 'block';
                    }, 500);
                }, 300);
            });
        }, 500);
    });
}

// Fonction pour passer le tutoriel
function skipTutoriel() {
    if (tutorielSkipped) return;
    tutorielSkipped = true;
    window.location.href = 'index.html';
}

// Gestion du bouton continuer
btnContinuer.addEventListener('click', () => {
    skipTutoriel();
});

// Démarrage au chargement
window.addEventListener('DOMContentLoaded', () => {
    // Afficher immédiatement le bouton continuer
    btnContinuer.style.display = 'block';
    btnContinuer.textContent = 'Passer ⏭️';
    
    setTimeout(() => {
        startTutoMobile();
    }, 100);
    
    // Permettre de passer avec un tap n'importe où
    document.addEventListener('click', (e) => {
        if (e.target !== btnContinuer && !tutorielSkipped) {
            skipTutoriel();
        }
    });
});
