// Variables globales
const dialogueElement = document.getElementById('dialogue-text');
const nomContainer = document.getElementById('nom-container');
const nomInput = document.getElementById('nom-input');
const validerBtn = document.getElementById('valider-btn');

let currentText = '';
let isTyping = false;

// Messages du tutoriel
const messages = [
    "Bonjour je suis Pixi. Je vais te guider dans ce jeu.",
    "On commence par choisir ton nom :"
];

// Fonction pour écrire le texte lettre par lettre
function typeWriter(text, callback) {
    isTyping = true;
    currentText = '';
    dialogueElement.textContent = '';
    
    let index = 0;
    const interval = setInterval(() => {
        if (index < text.length) {
            currentText += text[index];
            dialogueElement.textContent = currentText;
            index++;
        } else {
            clearInterval(interval);
            isTyping = false;
            
            // Retirer le curseur clignotant à la fin
            setTimeout(() => {
                dialogueElement.style.removeProperty('--show-cursor');
            }, 100);
            
            if (callback) {
                callback();
            }
        }
    }, 50); // 0.05s par lettre = 50ms
}

// Démarrer le tutoriel
function startTutoriel() {
    // Premier message
    typeWriter(messages[0], () => {
        // Attendre 2 secondes après la fin du premier message
        setTimeout(() => {
            // Deuxième message
            typeWriter(messages[1], () => {
                // Attendre 2 secondes puis afficher l'input
                setTimeout(() => {
                    nomContainer.style.display = 'flex';
                    nomInput.focus();
                }, 2000);
            });
        }, 2000);
    });
}

// Gestion du bouton valider
validerBtn.addEventListener('click', validerNom);

// Valider avec la touche Entrée
nomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        validerNom();
    }
});

function validerNom() {
    const nom = nomInput.value.trim();
    
    if (nom === '') {
        // Animation d'erreur
        nomInput.style.borderColor = 'red';
        nomInput.placeholder = 'Entre un nom !';
        setTimeout(() => {
            nomInput.style.borderColor = 'white';
        }, 500);
        return;
    }
    
    // Sauvegarder le nom dans localStorage
    localStorage.setItem('nomJoueur', nom);
    
    // Marquer que le tutoriel est fait
    localStorage.setItem('tutorielFait', 'true');
    
    // NE PAS définir 'aVuProfil' pour activer le mode blur sur index
    localStorage.removeItem('aVuProfil');
    
    // Cacher l'input
    nomContainer.style.display = 'none';
    
    // Message pour choisir l'appareil
    const messageChoix = `Super ${nom} ! Tu joues sur ordinateur 💻 ou téléphone 📱 ?`;
    typeWriter(messageChoix, () => {
        // Afficher les boutons de choix après 500ms
        setTimeout(() => {
            document.getElementById('choix-appareil-container').style.display = 'flex';
        }, 500);
    });
}

// Gestion du choix de l'appareil
document.getElementById('btn-ordinateur').addEventListener('click', () => {
    // Sauvegarder le choix
    localStorage.setItem('typeAppareil', 'ordinateur');
    
    // Cacher les boutons avec animation
    const choixContainer = document.getElementById('choix-appareil-container');
    choixContainer.style.opacity = '0';
    choixContainer.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        choixContainer.style.display = 'none';
        
        // Message de confirmation
        const messageOrdi = "Excellent choix ! 💻 Je vais te montrer comment dominer avec le clavier et la souris !";
        typeWriter(messageOrdi, () => {
            setTimeout(() => {
                window.location.href = 'ordi.html';
            }, 1800);
        });
    }, 300);
});

document.getElementById('btn-telephone').addEventListener('click', () => {
    // Sauvegarder le choix
    localStorage.setItem('typeAppareil', 'telephone');
    
    // Cacher les boutons avec animation
    const choixContainer = document.getElementById('choix-appareil-container');
    choixContainer.style.opacity = '0';
    choixContainer.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        choixContainer.style.display = 'none';
        
        // Message de confirmation
        const messageTel = "Excellent choix ! 📱 Je vais te montrer comment devenir un champion du tactile !";
        typeWriter(messageTel, () => {
            setTimeout(() => {
                window.location.href = 'telephone.html';
            }, 1800);
        });
    }, 300);
});

// Démarrer au chargement de la page (toujours afficher le tuto pour voir l'évolution)
window.addEventListener('DOMContentLoaded', () => {
    // Petit délai pour l'animation d'entrée
    setTimeout(() => {
        startTutoriel();
    }, 500);
});