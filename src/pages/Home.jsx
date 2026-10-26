import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Skeleton, Typography } from '@mui/material';
import ChevronRight from '@mui/icons-material/ChevronRight';
import api from '../lib/api';
import { activeLanguages, categoryHasPendingTranslations, categoryLanguageStatus, hasNoPhoto, hasPendingTexts, tourLanguageStatus } from '../lib/catalog';
import { joinList, langLabel, plural } from '../lib/langLabel';
import { numeric } from '../theme';
import Banner from '../components/Banner';
import PageHeader from '../components/PageHeader';

const get = (url) => async () => (await api.get(url)).data;

// Idiomas activos a los que les falta algo en al menos uno de los registros.
const missingLanguages = (items, statusOf, languages) => {
  const names = new Map();
  items.forEach((item) => statusOf(item, languages).forEach((s) => !s.complete && names.set(s.language.id, langLabel(s.language))));
  return joinList([...names.values()]);
};

function PendingRow({ count, label, detail, linkLabel, to }) {
  return (
    <Box
      component="li"
      sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 3, px: 3, py: 2, borderBottom: '1px solid', borderColor: 'border.subtle', '&:last-child': { borderBottom: 0 }, '&:hover': { bgcolor: 'bg.raised' } }}
    >
      <Typography component="span" sx={{ width: 56, fontSize: 32, lineHeight: '40px', fontWeight: 600, color: 'text.primary', ...numeric }}>
        {count}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" component="p" sx={{ color: 'text.primary', fontSize: 15 }}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{detail}</Typography>
      </Box>
      {/* Enlace estirado: toda la fila es clicable; el subrayado solo va bajo el texto. */}
      <Box
        component={RouterLink}
        to={to}
        aria-label={`${linkLabel}: ${count} ${label}`}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontWeight: 600, fontSize: 14, textDecoration: 'none', '&::after': { content: '""', position: 'absolute', inset: 0 } }}
      >
        <span style={{ textDecoration: 'underline' }}>{linkLabel}</span>
        <ChevronRight fontSize="small" aria-hidden />
      </Box>
    </Box>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const toursQ = useQuery({ queryKey: ['tours'], queryFn: get('/tours/all') });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: get('/categories') });
  const languagesQ = useQuery({ queryKey: ['languages'], queryFn: get('/languages') });
  const queries = [toursQ, categoriesQ, languagesQ];
  const loading = queries.some((q) => q.isLoading);
  const failed = !loading && queries.some((q) => q.isError);

  let subtitle = null;
  let content;
  if (loading) {
    subtitle = <Skeleton width={260} />;
    content = (
      <Box aria-busy="true" aria-label="Cargando">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={64} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  } else if (failed) {
    content = (
      <Banner title="No pudimos cargar los pendientes." action={{ label: 'Reintentar', onClick: () => queries.forEach((q) => q.isError && q.refetch()) }}>
        Revisa tu conexión e intenta de nuevo.
      </Banner>
    );
  } else {
    const tours = toursQ.data;
    const categories = categoriesQ.data;
    const languages = languagesQ.data;
    const nActive = activeLanguages(languages).length;
    subtitle = `${tours.length} ${plural(tours.length, 'tour', 'tours')} · ${categories.length} ${plural(categories.length, 'categoría', 'categorías')} · ${nActive} ${plural(nActive, 'idioma activo', 'idiomas activos')}`;

    const noPhoto = tours.filter(hasNoPhoto).length;
    const pendingTours = tours.filter((t) => hasPendingTexts(t, languages));
    const pendingCategories = categories.filter((c) => categoryHasPendingTranslations(c, languages));
    const inactive = tours.filter((t) => !t.isActive).length;
    const rows = [];
    if (noPhoto) {
      rows.push({
        key: 'foto',
        count: noPhoto,
        label: plural(noPhoto, 'tour sin foto', 'tours sin foto'),
        detail: plural(noPhoto, 'No tiene imagen en la lista ni en la web.', 'No tienen imagen en la lista ni en la web.'),
        linkLabel: 'Ver tours',
        to: '/tours?pendientes=foto',
      });
    }
    if (pendingTours.length) {
      const n = pendingTours.length;
      rows.push({
        key: 'textos',
        count: n,
        label: plural(n, 'tour con textos incompletos', 'tours con textos incompletos'),
        detail: `${plural(n, 'Le falta', 'Les falta')} el título o la descripción en ${missingLanguages(pendingTours, tourLanguageStatus, languages)}.`,
        linkLabel: 'Ver tours',
        to: '/tours?pendientes=textos',
      });
    }
    if (pendingCategories.length) {
      const n = pendingCategories.length;
      rows.push({
        key: 'categorias',
        count: n,
        label: plural(n, 'categoría con traducciones pendientes', 'categorías con traducciones pendientes'),
        detail: `${plural(n, 'Le falta', 'Les falta')} el nombre o la descripción en ${missingLanguages(pendingCategories, categoryLanguageStatus, languages)}.`,
        linkLabel: 'Ver categorías',
        to: '/categories?pendientes=1',
      });
    }

    // D-10: los tours inactivos son un dato informativo, no un pendiente.
    const inactiveLine = inactive > 0 && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {inactive} {plural(inactive, 'tour inactivo', 'tours inactivos')} · No se {plural(inactive, 'muestra', 'muestran')} en la web ·{' '}
        <Box component={RouterLink} to="/tours?estado=inactivos" sx={{ color: 'primary.main', fontWeight: 600 }}>Ver tours</Box>
      </Typography>
    );

    content = rows.length ? (
      <>
        <Box component="ul" aria-labelledby="pendientes-titulo" sx={{ listStyle: 'none', m: 0, p: 0, border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px', bgcolor: 'background.paper', overflow: 'hidden' }}>
          {rows.map(({ key, ...row }) => <PendingRow key={key} {...row} />)}
        </Box>
        {inactiveLine}
      </>
    ) : (
      <>
        <Box sx={{ textAlign: 'center', py: 6, px: 3, border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px' }}>
          <Typography variant="h2" component="p">Todo al día</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Todo el catálogo tiene foto y textos en todos los idiomas activos.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/tours')} sx={{ mt: 2 }}>Ver los tours</Button>
        </Box>
        {inactiveLine}
      </>
    );
  }

  return (
    <Box>
      <PageHeader title="Inicio" subtitle={subtitle} action={{ label: 'Nuevo tour', mobileLabel: 'Nuevo', to: '/tours/new' }} />
      <Typography id="pendientes-titulo" variant="h2" component="h2" sx={{ mb: 1.5, mt: 4 }}>Pendientes del catálogo</Typography>
      {content}
    </Box>
  );
}
