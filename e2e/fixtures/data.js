// Datos simulados del catálogo: 39 tours, 9 categorías; idiomas es y en activos, fr inactivo (REQ-27).

export const languages = [
  { id: 1, code: 'es', name: 'Español', isActive: true },
  { id: 2, code: 'en', name: 'English', isActive: true },
  { id: 3, code: 'fr', name: 'Français', isActive: false },
];

const categoryNames = [
  ['naturaleza', 'Naturaleza', 'Nature'],
  ['acuaticos', 'Acuáticos', 'Aquatic'],
  ['arqueologicos', 'Arqueológicos', 'Archaeological'],
  ['islas', 'Islas', 'Islands'],
  ['parques', 'Parques', 'Parks'],
  ['vida-nocturna', 'Vida nocturna', 'Nightlife'],
  ['vida-silvestre', 'Vida silvestre', 'Wildlife'],
  ['aventura', 'Aventura', 'Adventure'],
  ['aventura-extrema', 'Aventura extrema', 'Extreme adventure'],
];

export const categories = categoryNames.map(([adminName, es, en], i) => ({
  id: i + 1,
  adminName,
  description: `Tours de ${es.toLowerCase()}`,
  _count: { tours: 0 },
  translations: [
    { languageId: 1, name: es, description: `Tours de ${es.toLowerCase()}`, language: languages[0] },
    { languageId: 2, name: en, description: `${en} tours`, language: languages[1] },
  ],
}));

export const tours = Array.from({ length: 39 }, (_, i) => {
  const id = i + 1;
  const category = categories[i % categories.length];
  return {
    id,
    adminTitle: `tour-${id}`,
    price: 1000,
    location: 'Cancún, México',
    duration: 150 + (i % 4) * 30,
    img: `/uploads/tour-${id}.jpg`,
    images: [{ id, tourId: id, filename: `tour-${id}.jpg`, position: 0 }], // portada = images[0] (spec 006)
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    category: { id: category.id, adminName: category.adminName },
    translations: [
      { languageId: 1, title: `Tour ${id}`, description: `Descripción del tour ${id}`, language: languages[0] },
      { languageId: 2, title: `Tour ${id} EN`, description: `Tour ${id} description`, language: languages[1] },
    ],
  };
});

categories.forEach((c) => {
  c._count.tours = tours.filter((t) => t.category.id === c.id).length;
});

export const user = { id: 1, email: 'admin@tropical-vitamin.com' };

// Redes sociales (spec 007): Facebook visible, Instagram guardada y oculta, LinkedIn vacía. Datos de ejemplo, no de la clienta.
export const social = {
  facebookUrl: 'https://www.facebook.com/ejemplo',
  facebookVisible: true,
  instagramUrl: 'https://www.instagram.com/ejemplo',
  instagramVisible: false,
  linkedinUrl: null,
  linkedinVisible: false,
  whatsappNumber: '529841681263',
  updatedAt: '2026-11-05T12:00:00.000Z',
};
