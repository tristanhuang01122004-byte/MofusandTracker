// Chats costumés (dessins originaux en SVG, inspirés de l'univers "chat en costume").
// Chaque rang débloque un nouveau chat, de plus en plus rare.

const RARITIES = {
  commun: { label: 'Commun', color: '#9fb3c8' },
  rare: { label: 'Rare', color: '#5aa9e6' },
  epique: { label: 'Épique', color: '#a57be0' },
  legendaire: { label: 'Légendaire', color: '#f0a33b' },
  mythique: { label: 'Mythique', color: '#ef6fa6' },
};

const RANKS = [
  { xp: 0,    rank: 'Plancton',            cat: 'Minou Tout Doux',      rarity: 'commun',     costume: 'none',    hood: '#ffffff',
    quote: 'Chaque grand requin a commencé tout petit. On y va ensemble !' },
  { xp: 60,   rank: 'Crevette',            cat: 'Chat Grenouille',      rarity: 'commun',     costume: 'frog',    hood: '#8fd18a',
    quote: 'Croâ ! Un repas noté, c\'est un bond de plus vers ton objectif.' },
  { xp: 150,  rank: 'Poisson-clown',       cat: 'Chat Ourson',          rarity: 'commun',     costume: 'bear',    hood: '#c89b74',
    quote: 'Câlin d\'ourson pour ta régularité. Continue comme ça !' },
  { xp: 300,  rank: 'Méduse',              cat: 'Chat Requin Bleu',     rarity: 'rare',       costume: 'shark',   hood: '#8ec5ef',
    quote: 'Nom nom… pas trop de nom nom quand même ! Tu gères.' },
  { xp: 480,  rank: 'Tortue de mer',       cat: 'Chat Abeille',         rarity: 'rare',       costume: 'bee',     hood: '#ffd45c',
    quote: 'Bzzz ! Occupé(e) comme une abeille : tes pas explosent.' },
  { xp: 700,  rank: 'Dauphin',             cat: 'Chat Lapin Rose',      rarity: 'rare',       costume: 'bunny',   hood: '#f9c6d6',
    quote: 'Hop hop hop ! Tu progresses à vitesse lapin.' },
  { xp: 1000, rank: 'Pieuvre',             cat: 'Chat Dino',            rarity: 'epique',     costume: 'dino',    hood: '#7ccf9e',
    quote: 'RAWR ! Ta discipline est préhistorique… dans le bon sens.' },
  { xp: 1350, rank: 'Raie manta',          cat: 'Chat Pieuvre',         rarity: 'epique',     costume: 'octopus', hood: '#b69be8',
    quote: 'Huit bras pour t\'applaudir. Quelle série !' },
  { xp: 1800, rank: 'Requin bleu',         cat: 'Chat Requin de Nuit',  rarity: 'epique',     costume: 'shark',   hood: '#3d5a86',
    quote: 'Même la nuit, le requin veille sur tes objectifs.' },
  { xp: 2400, rank: 'Grand requin blanc',  cat: 'Chat Licorne',         rarity: 'legendaire', costume: 'unicorn', hood: '#fdfbff',
    quote: 'Tu es officiellement une légende. Magique ✨' },
  { xp: 3100, rank: 'Orque',               cat: 'Chat Dragon',          rarity: 'legendaire', costume: 'dragon',  hood: '#ef7d6b',
    quote: 'Le feu de ta motivation ne s\'éteint jamais.' },
  { xp: 4000, rank: 'Mégalodon',           cat: 'Chat Requin Doré',     rarity: 'mythique',   costume: 'shark',   hood: '#f3c64d', crown: true,
    quote: 'Or massif. Tu fais partie de l\'élite des océans.' },
  { xp: 5000, rank: 'Légende des Abysses', cat: 'Roi Requin Cosmique',  rarity: 'mythique',   costume: 'shark',   hood: '#2b2f6b', crown: true, cosmic: true,
    quote: 'Tu as tout débloqué. Le roi des mers, c\'est toi. 👑' },
];

function catSVG(def, size) {
  const s = size || 120;
  const hood = def.hood;
  const dark = shade(hood, -0.25);
  const cx = 60, cy = 70;
  let back = '', front = '', top = '';
  const face = '#fffaf5';

  // Oreilles de chat (seulement sans costume)
  if (def.costume === 'none') {
    back += `<path d="M28 52 L32 18 L56 40 Z" fill="${face}" stroke="#e6ded6" stroke-width="2" stroke-linejoin="round"/>
             <path d="M92 52 L88 18 L64 40 Z" fill="${face}" stroke="#e6ded6" stroke-width="2" stroke-linejoin="round"/>
             <path d="M34 42 L36 26 L48 38 Z" fill="#f7b6c2"/><path d="M86 42 L84 26 L72 38 Z" fill="#f7b6c2"/>`;
  }

  if (def.costume === 'shark') {
    top += `<path d="M52 26 Q66 -2 78 22 Q70 24 64 30 Z" fill="${hood}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  if (def.costume === 'frog') {
    top += `<circle cx="38" cy="30" r="13" fill="${hood}" stroke="${dark}" stroke-width="2"/><circle cx="82" cy="30" r="13" fill="${hood}" stroke="${dark}" stroke-width="2"/>
            <circle cx="38" cy="29" r="7" fill="#fff"/><circle cx="82" cy="29" r="7" fill="#fff"/><circle cx="39" cy="30" r="3.5" fill="#333"/><circle cx="81" cy="30" r="3.5" fill="#333"/>`;
  }
  if (def.costume === 'bear') {
    top += `<circle cx="28" cy="32" r="12" fill="${hood}" stroke="${dark}" stroke-width="2"/><circle cx="92" cy="32" r="12" fill="${hood}" stroke="${dark}" stroke-width="2"/>
            <circle cx="28" cy="32" r="6" fill="${shade(hood, 0.3)}"/><circle cx="92" cy="32" r="6" fill="${shade(hood, 0.3)}"/>`;
  }
  if (def.costume === 'bee') {
    top += `<path d="M48 26 Q42 10 34 8" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="34" cy="8" r="4" fill="#333"/>
            <path d="M72 26 Q78 10 86 8" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="86" cy="8" r="4" fill="#333"/>`;
    back += `<ellipse cx="12" cy="56" rx="12" ry="18" fill="#e8f6ff" stroke="#bcdcf2" stroke-width="2" transform="rotate(-25 12 56)"/>
             <ellipse cx="108" cy="56" rx="12" ry="18" fill="#e8f6ff" stroke="#bcdcf2" stroke-width="2" transform="rotate(25 108 56)"/>`;
  }
  if (def.costume === 'bunny') {
    top += `<ellipse cx="44" cy="14" rx="10" ry="24" fill="${hood}" stroke="${dark}" stroke-width="2" transform="rotate(-12 44 14)"/>
            <ellipse cx="76" cy="14" rx="10" ry="24" fill="${hood}" stroke="${dark}" stroke-width="2" transform="rotate(12 76 14)"/>
            <ellipse cx="44" cy="16" rx="4.5" ry="16" fill="#fff" opacity=".7" transform="rotate(-12 44 16)"/>
            <ellipse cx="76" cy="16" rx="4.5" ry="16" fill="#fff" opacity=".7" transform="rotate(12 76 16)"/>`;
  }
  if (def.costume === 'dino') {
    const spikes = [[36, 30], [50, 22], [64, 20], [78, 24], [90, 34]];
    top += spikes.map(([x, y]) => `<path d="M${x - 7} ${y + 8} L${x} ${y - 8} L${x + 7} ${y + 8} Z" fill="#ffd166" stroke="#d9a93a" stroke-width="1.5" stroke-linejoin="round"/>`).join('');
  }
  if (def.costume === 'octopus') {
    back += [16, 30, 90, 104].map((x) => `<circle cx="${x}" cy="102" r="9" fill="${hood}" stroke="${dark}" stroke-width="2"/>`).join('');
  }
  if (def.costume === 'unicorn') {
    top += `<path d="M53 26 L60 -2 L67 26 Z" fill="#ffd970" stroke="#e0b240" stroke-width="2" stroke-linejoin="round"/>
            <path d="M56 16 L64 12 M55 22 L65 18" stroke="#e0b240" stroke-width="1.5"/>
            <circle cx="30" cy="36" r="8" fill="#f9b4d0"/><circle cx="24" cy="50" r="7" fill="#b5d8ff"/><circle cx="90" cy="36" r="8" fill="#c7b5ff"/><circle cx="96" cy="50" r="7" fill="#b8f0d0"/>`;
  }
  if (def.costume === 'dragon') {
    top += `<path d="M40 30 Q30 10 22 8 Q34 18 34 34 Z" fill="#ffe8a8" stroke="#d9b45a" stroke-width="2"/>
            <path d="M80 30 Q90 10 98 8 Q86 18 86 34 Z" fill="#ffe8a8" stroke="#d9b45a" stroke-width="2"/>`;
    back += `<path d="M14 60 L0 40 L6 62 L-2 70 L14 72 Z" fill="${dark}"/><path d="M106 60 L120 40 L114 62 L122 70 L106 72 Z" fill="${dark}"/>`;
  }

  // Capuche
  if (def.costume !== 'none') {
    back += `<ellipse cx="${cx}" cy="66" rx="48" ry="44" fill="${hood}" stroke="${dark}" stroke-width="2.5"/>`;
    if (def.costume === 'octopus') {
      back += `<circle cx="36" cy="40" r="4" fill="${shade(hood, 0.3)}"/><circle cx="86" cy="44" r="5" fill="${shade(hood, 0.3)}"/><circle cx="76" cy="30" r="3" fill="${shade(hood, 0.3)}"/>`;
    }
    if (def.costume === 'bee') {
      back += `<path d="M16 50 Q60 34 104 50" stroke="#3a3a3a" stroke-width="7" fill="none" opacity=".85"/>`;
    }
    if (def.cosmic) {
      const stars = [[26, 44], [94, 40], [40, 28], [84, 92], [20, 80], [100, 74], [70, 26]];
      back += stars.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.6 : 2.4}" fill="#fff" opacity=".9"/>`).join('');
    }
  }

  // Visage
  const fr = def.costume === 'none' ? { rx: 38, ry: 32 } : { rx: 32, ry: 26 };
  front += `<ellipse cx="${cx}" cy="${cy + 4}" rx="${fr.rx}" ry="${fr.ry}" fill="${face}" ${def.costume === 'none' ? 'stroke="#e6ded6" stroke-width="2"' : ''}/>`;

  // Dents de requin
  if (def.costume === 'shark' || def.costume === 'dino' || def.costume === 'dragon') {
    let teeth = '';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * (1.12 + (0.76 * i) / n);
      const a1 = Math.PI * (1.12 + (0.76 * (i + 1)) / n);
      const am = (a0 + a1) / 2;
      const p = (a) => [cx + (fr.rx + 1) * Math.cos(a), cy + 4 + (fr.ry + 1) * Math.sin(a)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      const tx = cx + (fr.rx - 8) * Math.cos(am), ty = cy + 4 + (fr.ry - 8) * Math.sin(am);
      teeth += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="#fff" stroke="#d8dee6" stroke-width="1" stroke-linejoin="round"/>`;
    }
    front += teeth;
  }

  // Yeux, bouche, joues
  const ey = cy + 6;
  front += `<ellipse cx="${cx - 12}" cy="${ey}" rx="3.6" ry="4.4" fill="#2b2b33"/><ellipse cx="${cx + 12}" cy="${ey}" rx="3.6" ry="4.4" fill="#2b2b33"/>
            <circle cx="${cx - 11}" cy="${ey - 1.6}" r="1.2" fill="#fff"/><circle cx="${cx + 13}" cy="${ey - 1.6}" r="1.2" fill="#fff"/>
            <ellipse cx="${cx - 21}" cy="${ey + 8}" rx="5" ry="3" fill="#f7b6c2" opacity=".85"/><ellipse cx="${cx + 21}" cy="${ey + 8}" rx="5" ry="3" fill="#f7b6c2" opacity=".85"/>
            <path d="M${cx - 5} ${ey + 7} Q${cx - 2.5} ${ey + 10.5} ${cx} ${ey + 7} Q${cx + 2.5} ${ey + 10.5} ${cx + 5} ${ey + 7}" stroke="#2b2b33" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <path d="M${cx - 30} ${ey + 3} L${cx - 22} ${ey + 4} M${cx - 30} ${ey + 8} L${cx - 22} ${ey + 7}" stroke="#c9bfb6" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M${cx + 30} ${ey + 3} L${cx + 22} ${ey + 4} M${cx + 30} ${ey + 8} L${cx + 22} ${ey + 7}" stroke="#c9bfb6" stroke-width="1.2" stroke-linecap="round"/>`;

  // Pattes
  front += `<ellipse cx="${cx - 14}" cy="108" rx="9" ry="6" fill="${face}" stroke="#e6ded6" stroke-width="1.5"/><ellipse cx="${cx + 14}" cy="108" rx="9" ry="6" fill="${face}" stroke="#e6ded6" stroke-width="1.5"/>`;

  if (def.crown) {
    top += `<path d="M42 22 L46 4 L54 16 L60 0 L66 16 L74 4 L78 22 Z" fill="#ffd54a" stroke="#d4a017" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="60" cy="14" r="2.6" fill="#ef6fa6"/><circle cx="48" cy="17" r="2" fill="#5aa9e6"/><circle cx="72" cy="17" r="2" fill="#5aa9e6"/>`;
  }
  if (def.rarity === 'mythique' || def.rarity === 'legendaire') {
    front += `<path d="M104 18 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#ffe27a"/><path d="M14 94 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z" fill="#ffe27a"/>`;
  }

  return `<svg viewBox="-4 -4 128 128" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${back}${top}${front}</svg>`;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
