let pieces = 0;

document.getElementById('valider').addEventListener('click', function() {
    const nom = document.getElementById('nom').value;
    if (nom.trim() !== '') {
        // Enlever les espaces et afficher le nom
        const nomSansEspaces = nom.trim();
        document.getElementById('nom-affiche').textContent = nomSansEspaces;
        
        // Sauvegarder dans localStorage
        localStorage.setItem('nomJoueur', nomSansEspaces);
        
        // Appliquer la couleur sauvegardée
        const couleurSauvee = localStorage.getItem('couleurNom');
        if (couleurSauvee) {
            document.getElementById('nom-affiche').style.background = couleurSauvee;
        }
        
        // Cacher le champ et le bouton
        document.getElementById('nom').style.display = 'none';
        document.getElementById('valider').style.display = 'none';
        
        // Afficher le nom
        document.getElementById('nom-affiche').style.display = 'block';
    }
});

// Cliquer sur le nom pour le modifier
document.getElementById('nom-affiche').addEventListener('click', function() {
    // Réafficher le champ et le bouton
    document.getElementById('nom').style.display = 'block';
    document.getElementById('valider').style.display = 'block';
    document.getElementById('nom').value = this.textContent;
    
    // Cacher le nom affiché
    this.style.display = 'none';
    
    // Focus sur le champ
    document.getElementById('nom').focus();
});

// Charger le nom et la couleur au démarrage
window.addEventListener('DOMContentLoaded', function() {
    const nomStocke = localStorage.getItem('nomJoueur');
    const couleurSauvee = localStorage.getItem('couleurNom');
    
    if (nomStocke && document.getElementById('nom-affiche')) {
        document.getElementById('nom-affiche').textContent = nomStocke;
        document.getElementById('nom-affiche').style.display = 'block';
        document.getElementById('nom').style.display = 'none';
        document.getElementById('valider').style.display = 'none';
        
        if (couleurSauvee) {
            document.getElementById('nom-affiche').style.background = couleurSauvee;
        }
    }
});

// Gestion des boutons du menu
const menuBtns = document.querySelectorAll('.menu-btn');
menuBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (this.textContent === 'Profil') {
            window.location.href = 'profil.html';
        }
    });
});