// Collection de mofusand à débloquer (images dans assets/cats/).
// Chaque chat se débloque à un palier d'XP, du plus commun au plus rare.

const RARITIES = {
  commun: { label: 'Commun', color: '#9fb3c8' },
  rare: { label: 'Rare', color: '#5aa9e6' },
  epique: { label: 'Épique', color: '#a57be0' },
  legendaire: { label: 'Légendaire', color: '#f0a33b' },
  mythique: { label: 'Mythique', color: '#ef6fa6' },
};

// Rangs d'évolution (du plancton au roi des abysses)
const RANKS = [
  { xp: 0, rank: 'Plancton' },
  { xp: 60, rank: 'Crevette' },
  { xp: 150, rank: 'Poisson-clown' },
  { xp: 300, rank: 'Méduse' },
  { xp: 480, rank: 'Tortue de mer' },
  { xp: 700, rank: 'Dauphin' },
  { xp: 1000, rank: 'Pieuvre' },
  { xp: 1350, rank: 'Raie manta' },
  { xp: 1800, rank: 'Requin bleu' },
  { xp: 2400, rank: 'Grand requin blanc' },
  { xp: 3100, rank: 'Orque' },
  { xp: 4000, rank: 'Mégalodon' },
  { xp: 5000, rank: 'Légende des Abysses' },
];

// [nom, rareté, citation] — l'image est assets/cats/<index>.webp
const CAT_LIST = [
  ['Mofu Avocat', 'commun', 'On commence doucement, comme un bon guacamole 🥑'],
  ['Mofu Canapé Chips', 'commun', 'Les chips c\'est bien… marcher c\'est mieux 😼'],
  ['Mofu Grenouille', 'commun', 'Croâ ! Un repas noté, c\'est un bond vers ton objectif.'],
  ['Mofu Thé Vert', 'commun', 'Un petit bain de matcha pour fêter ça 🍵'],
  ['Mofu Pain de Mie', 'commun', 'Tu es sur la bonne tranche !'],
  ['Mofu Tournesol', 'commun', 'Toujours tourné vers le soleil (et tes objectifs) 🌻'],
  ['Mofu Chou Chinois', 'commun', 'Les légumes, c\'est la vie 🥬'],
  ['Mofu Pomme', 'commun', 'Une pomme par jour… et une pesée par matin 🍎'],
  ['Mofu Sucette', 'commun', 'Une petite douceur de temps en temps, c\'est permis 🍭'],
  ['Mofu Couverture Rose', 'commun', 'Bien au chaud, prêt pour une nouvelle journée.'],
  ['Mofu Chou à la Crème', 'rare', 'Doux dehors, déterminé dedans.'],
  ['Mofu Fraise', 'rare', 'Tu mérites bien une fraise 🍓'],
  ['Mofu Cerises', 'rare', 'On fait la paire, toi et ta motivation 🍒'],
  ['Mofu Ananas', 'rare', 'Tropical et plein d\'énergie 🍍'],
  ['Mofu Pastèque', 'rare', 'Rafraîchissant comme ta régularité 🍉'],
  ['Mofu Bubble Tea', 'rare', 'Slurp ! Tu gères.'],
  ['Mofu Couette Bleue', 'rare', 'Même en mode sieste, tu progresses 💤'],
  ['Mofu Lapin', 'rare', 'Hop hop hop ! Vitesse lapin 🐰'],
  ['Mofu Abeille', 'rare', 'Bzzz ! Occupé(e) comme une abeille 🐝'],
  ['Mofu Canard', 'rare', 'Coin coin, on continue !'],
  ['Mofu Parfait Matcha', 'epique', 'Un dessert épique pour un effort épique.'],
  ['Mofu Tortue', 'epique', 'Lentement mais sûrement 🐢'],
  ['Mofu Pingouin', 'epique', 'Cool comme la banquise 🐧'],
  ['Mofu Pieuvre', 'epique', 'Huit bras pour t\'applaudir 🐙'],
  ['Mofu Dino', 'epique', 'RAWR ! Ta discipline est préhistorique 🦖'],
  ['Mofu Sapin', 'epique', 'C\'est Noël avant l\'heure 🎄'],
  ['Mofu Fraise Géante', 'epique', 'Câlin géant pour ta série !'],
  ['Mofu Capuche Bleue', 'epique', 'Paré(e) pour toutes les aventures.'],
  ['Mofu Sushi Crevette', 'epique', 'Frais comme un sushi 🍣'],
  ['Mofu Super-Héros', 'epique', 'Tu es officiellement un(e) super-héros ⚡'],
  ['Mofu Intello', 'legendaire', 'J\'ai lu toutes tes stats. Impressionnant 🤓'],
  ['Mofu Frappé', 'legendaire', 'Un frappé bien mérité ☕'],
  ['Mofu Requin-Baleine', 'legendaire', 'Le plus grand poisson… et le plus heureux 🦈'],
  ['Mofu Requin & Phoque', 'legendaire', 'Le requin et son meilleur ami te félicitent.'],
  ['Mofu Requin Sieste', 'legendaire', 'Un requin qui se repose, c\'est un requin qui a tout donné.'],
  ['Mofu Poisson-Lune', 'legendaire', 'Rare comme un poisson-lune 🐡'],
  ['Mofu Chef Pâtissier', 'legendaire', 'Le chef approuve ta recette du succès 👨‍🍳'],
  ['Mofu Requin Roulé', 'mythique', 'Tu fais partie de l\'élite des océans.'],
  ['Mofu Requin Anneau', 'mythique', 'Presque au sommet des abysses…'],
  ['Mofu Requin Légendaire', 'mythique', 'Tu as tout débloqué. Le roi des mers, c\'est toi 👑🦈'],
];

// Paliers d'XP croissants : de 0 à 5000 XP
const CATS = CAT_LIST.map(([name, rarity, quote], i) => ({
  id: i,
  name,
  rarity,
  quote,
  img: `assets/cats/${String(i).padStart(2, '0')}.webp`,
  xp: i === 0 ? 0 : Math.round((5000 * Math.pow(i / (CAT_LIST.length - 1), 1.6)) / 10) * 10,
}));

function catImg(cat, size, extraClass) {
  return `<img class="mofu ${extraClass || ''}" src="${cat.img}" alt="${cat.name}" style="width:${size}px;height:${size}px" loading="lazy" draggable="false">`;
}
