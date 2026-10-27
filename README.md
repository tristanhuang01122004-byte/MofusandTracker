# 🦈 MofuTrack — calories, poids & pas, semaine par semaine

Web app pour iPhone, installable sur l'écran d'accueil. Elle marche hors-ligne et **toutes les données restent sur ton téléphone**.

- 🏠 **Accueil dans l'ordre** : calories du jour → objectif de calories **de la semaine** (que tu fixes toi-même) avec ce qu'il reste et le budget par jour restant → pesée du jour et poids → courbe du poids de la semaine → calories de la semaine → pas du jour (saisie) et pas de la semaine
- 📈 **Onglet Graphes** : poids, calories et pas superposés (3 couleurs), semaine par semaine ou sur 4 semaines, avec résumé et tableau jour par jour
- 🍚 **Onglet Manger** : riz, poulet et meal prep en premier ; tout le reste (fast-food, pizza, pho, ramen, asiatique, supermarché… 400 aliments) apparaît quand tu tapes dans la recherche
- 🤖 **IA** : écris « un bol de riz, 150 g de poulet et un coca » → calories détaillées, modifiables, puis ajoutées au journal. Hors ligne avec la base d'aliments ; avec Claude si tu mets ta clé API Anthropic dans ⚙️
- 🧍 **Profil** : BMR (Mifflin-St Jeor) et dépense estimée, pour t'aider à choisir ton objectif de la semaine
- 🎨 **Couleur qui change chaque semaine** (Sakura, Matcha, Lavande, Pêche, Citron, Menthe, Corail), ou une couleur fixe au choix
- 📝 **Notes** libres, avec recherche
- 🐾 **Rangs d'évolution** : de *Plancton* à *Légende des Abysses*, avec 40 mofusand à débloquer, de plus en plus rares (Commun → Rare → Épique → Légendaire → Mythique), une échelle des rangs, le prochain mofusand à débloquer et ta série de jours
- 💾 Export et import d'une sauvegarde JSON

---

## 1. Mettre l'app en ligne (GitHub Pages, une seule fois)

1. Sur GitHub, ouvre le dépôt **MofusandTracker** → **Settings** → **Pages**.
2. Dans *Build and deployment* : **Source = Deploy from a branch**, branche **`main`**, dossier **/ (root)** → **Save**. (Le workflow `.github/workflows/pages.yml` republie aussi l'app à chaque modification.)
3. Attends 1 à 2 minutes. L'adresse de l'app sera :
   **https://tristanhuang01122004-byte.github.io/MofusandTracker/**

> Si le dépôt est privé, GitHub Pages demande un compte GitHub Pro. Sinon, passe le dépôt en public (les données restent quand même sur ton téléphone, elles ne sont jamais envoyées sur GitHub).

## 2. Installer l'app sur l'iPhone

1. Ouvre l'adresse ci-dessus dans **Safari**.
2. Touche le bouton **Partager** (carré avec une flèche) → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvre **MofuTrack** depuis son icône de requin 🦈, puis ⚙️ → remplis ton profil.

## 3. (Optionnel) Importer ses pas avec Raccourcis

Tu peux simplement taper tes pas dans la carte « 👣 Mes pas » de l'accueil. Pour les importer depuis Santé :

On crée un raccourci qui lit tes pas du jour dans Santé et les copie. L'app n'a ensuite qu'à les coller.

1. Ouvre l'app **Raccourcis** → onglet **Raccourcis** → **+** en haut à droite. Renomme-le **MofuPas**.
2. **Ajouter une action** → cherche **« Rechercher des échantillons de santé »** → ajoute-la.
3. Règle l'action :
   - **Type** : *Nombre de pas*
   - Filtre : **Date de début** *est aujourd'hui*
   - Touche **Afficher plus** : **Regrouper par** = *Jour*, **Unité** = *pas*. Tu obtiens le total du jour, sans compter deux fois l'iPhone et l'Apple Watch.
4. *(Optionnel, pour les calories brûlées)* Ajoute une 2ᵉ action **« Rechercher des échantillons de santé »** : Type = *Énergie active*, même filtre, Regrouper par = *Jour*, Unité = *kcal*.
5. Ajoute l'action **« Texte »** et écris `pas=`, puis touche **Variable** → le 1ᵉʳ *Échantillons de santé*.
   Si tu as fait l'étape 4, ajoute `;kcal=` puis la variable du 2ᵉ *Échantillons de santé*.
   Tu dois obtenir un texte du genre : `pas=10432;kcal=385`
6. Ajoute l'action **« Copier dans le presse-papiers »**.
7. *(Optionnel)* Ajoute **« Afficher une notification »** avec le texte « Pas copiés, ouvre MofuTrack 🦈 ».
8. Touche **▶︎** pour tester. La 1ʳᵉ fois, autorise l'accès à **Santé**.
9. Ouvre **MofuTrack** → carte « 👣 Mes pas » → **📋 Importer** → touche **Coller** quand iOS le demande. ✅

**Pour aller plus vite :**
- **Widget** Raccourcis sur l'écran d'accueil, à côté de l'icône MofuTrack
- **Siri** : « Dis Siri, MofuPas »
- **Toucher le dos** : Réglages → Accessibilité → Toucher → Toucher le dos → Toucher deux fois → *MofuPas*
- **Automatique** : Raccourcis → **Automatisation** → **+** → *Heure de la journée* (ex. 21:30) → *Exécuter immédiatement* → *MofuPas*

**Variante « lien » (si tu utilises l'app dans Safari, sans l'icône) :** à la place des étapes 6 et 7, mets l'action **URL** `https://tristanhuang01122004-byte.github.io/MofusandTracker/?pas=[variable pas]&kcal=[variable kcal]`, puis l'action **Ouvrir les URL**. L'import se fait tout seul à l'ouverture.
⚠️ Sur iPhone, l'app de l'écran d'accueil a une mémoire séparée de Safari. Si tu utilises l'icône, reste sur la méthode « Importer ».

## 4. Les rangs et la collection de mofusand 🐾

13 rangs d'évolution (Plancton → Crevette → Poisson-clown → Méduse → Tortue de mer → Dauphin → Pieuvre → Raie manta → Requin bleu → Grand requin blanc → Orque → Mégalodon → Légende des Abysses) et **40 mofusand à collectionner**, de 0 à 5 000 XP :

- **Commun** (10) : avocat, canapé chips, grenouille, thé vert, pain de mie, tournesol, chou chinois, pomme, sucette, couverture rose
- **Rare** (10) : chou à la crème, fraise, cerises, ananas, pastèque, bubble tea, couette bleue, lapin, abeille, canard
- **Épique** (10) : parfait matcha, tortue, pingouin, pieuvre, dino, sapin, fraise géante, capuche bleue, sushi crevette, super-héros
- **Légendaire** (7) : intello, frappé, requin-baleine, requin & phoque, requin sieste, poisson-lune, chef pâtissier
- **Mythique** (3) : requin roulé, requin anneau, requin légendaire 🦈

Touche un mofusand débloqué pour en faire ton **compagnon** (il apparaît en haut de l'écran et sur l'accueil).

**Gagner de l'XP (par jour) :** repas noté +10 · 2 repas ou plus +5 · à ±10 % de l'objectif +15 · objectif de pas +20 (+10 à 1,5×) · pesée +10 · note +3 · série de 7 jours +10/jour.
Un mofusand débloqué le reste pour toujours.

---

Les calories sont des moyennes indicatives (tables Ciqual et étiquettes des enseignes). Illustrations mofusand © juno, utilisées pour un usage personnel : fan app non officielle et non commerciale.
