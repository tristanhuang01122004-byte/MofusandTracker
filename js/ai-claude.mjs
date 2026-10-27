// Estimation des calories par Claude (clé API fournie par l'utilisateur, stockée sur le téléphone).
import Anthropic from './vendor/anthropic-sdk.mjs';

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nom: { type: 'string', description: 'Nom court de l\'aliment en français' },
          quantite: { type: 'string', description: 'Quantité estimée, ex. "1 bol (180 g)"' },
          kcal: { type: 'number', description: 'Calories estimées pour cette quantité' },
        },
        required: ['nom', 'quantite', 'kcal'],
        additionalProperties: false,
      },
    },
    remarque: { type: 'string', description: 'Une phrase courte en français (hypothèses faites), ou chaîne vide' },
  },
  required: ['items', 'remarque'],
  additionalProperties: false,
};

const SYSTEM = `Tu aides une personne à suivre ses calories dans une app de suivi.
Elle décrit en français ce qu'elle a mangé. Découpe la description en aliments, estime une quantité réaliste quand elle n'est pas précisée (portions françaises courantes, enseignes de fast-food en France), et donne les calories de chaque aliment.
Cette personne mange souvent des meal prep riz + poulet, du fast-food, des pizzas, du pho, des ramen et de la cuisine asiatique.
Si une quantité est donnée en grammes, sache si c'est cru ou cuit d'après le texte ; par défaut, le riz et les pâtes sont pesés cuits.`;

export async function estimateWithClaude(apiKey, text) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: text }],
  });
  if (response.stop_reason === 'refusal') throw new Error('Claude a refusé cette demande.');
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse incomplète, réessaie avec une description plus courte.');
  const block = response.content.find((b) => b.type === 'text');
  if (!block) throw new Error('Réponse vide.');
  const data = JSON.parse(block.text);
  return {
    items: data.items.map((i) => ({ name: i.nom, qty: i.quantite, kcal: Math.max(0, Math.round(i.kcal)) })),
    note: data.remarque,
  };
}

export function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'Clé API invalide. Vérifie-la dans ⚙️.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'Cette clé API n\'a pas accès au modèle.';
  if (err instanceof Anthropic.RateLimitError) return 'Trop de demandes, réessaie dans un instant.';
  if (err instanceof Anthropic.APIConnectionError) return 'Pas de connexion internet.';
  if (err instanceof Anthropic.APIError) return `Erreur de l'API (${err.status || '?'}).`;
  return err && err.message ? err.message : 'Erreur inconnue.';
}
