// Coordonnées uniques de Next Drive (sources : fiche Google, ancien site, registre des entreprises).
// Téléphone confirmé par le client le 2026-10-22 (06 82 71 77 39). À confirmer encore : e-mail et horaires.
export const site = {
  name: 'Next Drive',
  legal: 'JT NEXT DRIVE SAS',
  tagline: 'Voitures d’occasion',
  url: 'https://next-drive.fr',
  phone: '06 82 71 77 39',
  phoneHref: 'tel:+33682717739',
  email: 'savoie@next-drive.fr',
  street: '106 chemin de la Girondière, Bât. 2',
  postal: '73520',
  city: 'Saint-Béron',
  region: 'Savoie',
  geo: { lat: 45.5078651, lng: 5.7180331 },
  mapsUrl: 'https://www.google.com/maps?cid=11611372354840118659',
  // lien « laisser un avis » direct à demander au client (Google Business Profile) ; en attendant : la fiche
  reviewUrl: 'https://www.google.com/maps?cid=11611372354840118659',
  instagram: 'https://www.instagram.com/nextdrive_savoie/',
  linkedin: 'https://www.linkedin.com/in/next-drive-35a28541b/',
  rating: { value: '5,0', count: 43 },
  showroom: '400 m²',
  hours: [
    { days: 'Lundi', time: 'Fermé' },
    { days: 'Mardi – vendredi', time: '10 h – 19 h' },
    { days: 'Samedi', time: '10 h – 18 h' },
    { days: 'Dimanche', time: 'Fermé' },
  ],
  hoursSchema: [
    { dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '10:00', closes: '19:00' },
    { dayOfWeek: ['Saturday'], opens: '10:00', closes: '18:00' },
  ],
  siren: '105 853 923',
  siret: '105 853 923 00016',
  vat: 'FR77105853923',
  capital: '4 000 €',
  president: 'Téo Deloche',
  dg: 'Jérémy Augros',
  founded: 'juin 2026',
};

export const nav = [
  { href: '/', label: 'Accueil' },
  { href: '/stock', label: 'Notre stock' },
  { href: '/vendre', label: 'Vendre ma voiture' },
  { href: '/services', label: 'Services' },
  { href: '/histoire', label: 'Notre histoire' },
  { href: '/affiliation', label: 'Affiliation' },
  { href: '/contact', label: 'Contact' },
];

export const services = [
  { key: 'intermediation', title: 'Intermédiation', media: { video: '/loops/c3' }, page: '/media/marco-polo-showroom',
    text: 'Nous sommes le tiers de confiance entre vendeur et acheteur : visites, essais, négociation et paperasse, tout passe par nous.' },
  { key: 'depot', title: 'Dépôt-vente', media: { video: '/loops/defender' }, page: '/media/rs6-avant',
    text: 'Vous déposez votre voiture dans notre showroom. Nous la préparons, la photographions et la présentons aux acheteurs.' },
  { key: 'paiement', title: 'Paiement sécurisé', media: { img: '/media/bureaux' }, page: '/media/mustang-volant',
    text: 'Les fonds transitent par un compte séquestre. Le vendeur est payé, l’acheteur est protégé : aucun risque de fraude.' },
  { key: 'livraison', title: 'Livraison', media: { video: '/loops/golf' }, page: '/media/marco-polo-route',
    text: 'Vous achetez à distance ? Nous livrons votre voiture partout en France, sans que vous ayez à vous déplacer.' },
  { key: 'garantie', title: 'Garantie mécanique', media: { video: '/loops/moteur' }, page: '/media/defender-roue',
    text: 'Chaque véhicule vendu est couvert par une garantie mécanique de 3 à 48 mois, selon vos besoins.' },
  { key: 'financement', title: 'Financement', media: { img: '/media/rs6-phare' }, page: '/media/mustang-sieges',
    text: 'Crédit auto classique, LOA ou LLD : nous montons votre financement avec nos partenaires.' },
  { key: 'carte-grise', title: 'Carte grise', media: { img: '/media/slk' }, page: '/media/defender-interieur',
    text: 'Habilités par la préfecture, nous faisons l’immatriculation sur place. Vous repartez avec votre voiture, l’esprit léger.' },
];

export const steps = [
  { n: '01', title: 'Estimation gratuite', text: 'Une offre juste, basée sur le marché, en une heure en moyenne.' },
  { n: '02', title: 'Mise en valeur', text: 'Préparation et photos professionnelles dans notre showroom.' },
  { n: '03', title: 'Recherche d’acheteur', text: 'Diffusion de l’annonce, visites et négociation : on gère.' },
  { n: '04', title: 'Paiement sécurisé', text: 'Fonds sur compte séquestre, vous êtes payé sans risque.' },
];

export const pillars = [
  { title: 'Meilleur prix', video: '/loops/bmw-feu',
    text: 'Une estimation fondée sur le marché réel, puis une mise en valeur qui attire les bons acheteurs. Votre voiture part au juste prix.' },
  { title: 'On gère tout', video: '/loops/cockpit',
    text: 'Annonces, appels, visites, essais, négociation, démarches : vous n’avez plus rien à faire, à part signer.' },
  { title: 'Zéro risque', video: '/loops/gti-arriere',
    text: 'Paiement par compte séquestre, acheteurs vérifiés et papiers en règle. La vente est sécurisée de bout en bout.' },
];
