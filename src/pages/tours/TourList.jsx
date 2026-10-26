import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Select,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import Search from '@mui/icons-material/Search';
import api from '../../lib/api';
import { formatDuration, formatPrice } from '../../lib/format';
import { hasNoPhoto, hasPendingTexts, tourLanguageStatus } from '../../lib/catalog';
import { useToasts } from '../../lib/useToasts';
import { useIsMobile } from '../../lib/useIsMobile';
import { numeric } from '../../theme';
import FormField from '../../components/FormField';
import LangChips from '../../components/LangChips';
import TourThumb from '../../components/TourThumb';
import { EmptyState, ErrorState } from '../../components/States';

const fetchTours = async () => (await api.get('/tours/all')).data;
const fetchCategories = async () => (await api.get('/categories')).data;
const fetchLanguages = async () => (await api.get('/languages')).data;

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const STATES = { activos: 'Activos', inactivos: 'Inactivos' };
const PENDING_CHIPS = { 1: 'Con pendientes', foto: 'Pendientes: sin foto', textos: 'Pendientes: textos' };

// Anchos de columna (handoff R1 sección 3, tabla de 1144): foto, tour, categoría, duración, precio, idiomas, activo.
const COLS = [92, null, 168, 80, 120, 252, 72];
const cell = { p: 0, height: 52, borderBottom: '1px solid', borderColor: 'border.subtle', verticalAlign: 'middle' };
const headCell = { p: 0, height: 40, fontSize: 13, fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'border.subtle' };
const srOnly = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

function ToursTable({ busy, children }) {
  return (
    <Box
      aria-busy={busy ? 'true' : undefined}
      sx={{ border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px', bgcolor: 'background.paper', overflow: 'hidden' }}
    >
      <Table sx={{ tableLayout: 'fixed', width: '100%' }} aria-label="Tours">
        <colgroup>
          {COLS.map((w, i) => (
            <col key={i} style={w ? { width: w } : undefined} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell scope="col" sx={{ ...headCell, position: 'relative' }}><Box component="span" sx={srOnly}>Foto</Box></TableCell>
            <TableCell scope="col" sx={headCell}>Tour</TableCell>
            <TableCell scope="col" sx={headCell}>Categoría</TableCell>
            <TableCell scope="col" align="right" sx={headCell}>Duración</TableCell>
            <TableCell scope="col" align="right" sx={headCell}>Precio</TableCell>
            <TableCell scope="col" sx={{ ...headCell, pl: '40px' }}>Idiomas</TableCell>
            <TableCell scope="col" sx={headCell}>Activo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </Box>
  );
}

function SkeletonTable() {
  return (
    <ToursTable busy>
      {Array.from({ length: 8 }, (_, i) => (
        <TableRow key={i}>
          <TableCell sx={{ ...cell, pl: '16px' }}><Skeleton variant="rounded" width={64} height={44} /></TableCell>
          <TableCell sx={cell}>
            <Skeleton variant="rounded" width={180} height={10} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width={110} height={8} />
          </TableCell>
          <TableCell sx={cell}><Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: 999 }} /></TableCell>
          <TableCell sx={cell} align="right"><Skeleton variant="rounded" width={40} height={10} sx={{ ml: 'auto' }} /></TableCell>
          <TableCell sx={cell} align="right"><Skeleton variant="rounded" width={76} height={10} sx={{ ml: 'auto' }} /></TableCell>
          <TableCell sx={{ ...cell, pl: '40px' }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Skeleton variant="rounded" width={44} height={24} sx={{ borderRadius: 999 }} />
              <Skeleton variant="rounded" width={44} height={24} sx={{ borderRadius: 999 }} />
            </Box>
          </TableCell>
          <TableCell sx={cell}><Skeleton variant="rounded" width={40} height={24} sx={{ borderRadius: 999 }} /></TableCell>
        </TableRow>
      ))}
    </ToursTable>
  );
}

function TourRow({ row, onToggle }) {
  const { tour, title, categoryName, languagesStatus } = row;
  return (
    <TableRow
      sx={{
        position: 'relative',
        '&:hover': { bgcolor: 'bg.raised' },
        '&:last-child td': { borderBottom: 0 },
      }}
    >
      <TableCell sx={{ ...cell, pl: '16px' }}>
        <TourThumb img={tour.img} />
      </TableCell>
      <TableCell sx={{ ...cell, pr: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Tooltip title={title} describeChild placement="top-start">
            <Link
              component={RouterLink}
              to={`/tours/${tour.id}`}
              underline="none"
              color="text.primary"
              sx={{
                fontSize: 14,
                lineHeight: '20px',
                fontWeight: 600,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                // Toda la fila es el área clicable: el enlace se estira sobre ella.
                '&::after': { content: '""', position: 'absolute', inset: 0 },
                '&:focus-visible': { outline: 'none' },
                '&:focus-visible::after': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
              }}
            >
              {title}
            </Link>
          </Tooltip>
          {hasNoPhoto(tour) && (
            <Chip
              size="small"
              icon={<ImageOutlined />}
              label="Sin foto"
              sx={{ flexShrink: 0, bgcolor: 'statusBg.warning', color: 'warning.main', '& .MuiChip-icon': { color: 'warning.main' } }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" title={tour.adminTitle} noWrap sx={{ display: 'block' }}>
          {tour.adminTitle}
        </Typography>
      </TableCell>
      <TableCell sx={{ ...cell, pr: 2 }}>
        <Chip size="small" label={categoryName} title={categoryName} sx={{ maxWidth: '100%', bgcolor: 'neutral.chip', fontWeight: 400 }} />
      </TableCell>
      <TableCell align="right" sx={{ ...cell, ...numeric, fontSize: 14 }}>{formatDuration(tour.duration)}</TableCell>
      <TableCell align="right" sx={{ ...cell, ...numeric, fontSize: 14 }}>{formatPrice(tour.price)}</TableCell>
      <TableCell sx={{ ...cell, pl: '40px' }}>
        <LangChips status={languagesStatus} />
      </TableCell>
      <TableCell sx={{ ...cell, position: 'relative', zIndex: 1 }}>
        <Switch
          checked={!!tour.isActive}
          onChange={(e) => onToggle(tour, title, e.target.checked)}
          slotProps={{ input: { role: 'switch', 'aria-label': `Mostrar «${title}» en la web` } }}
        />
      </TableCell>
    </TableRow>
  );
}

const clamp1 = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

function SkeletonList() {
  return (
    <Box component="ul" aria-busy="true" aria-label="Cargando los tours" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <Box component="li" key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 76, borderBottom: '1px solid', borderColor: 'border.subtle' }}>
          <Skeleton variant="rounded" width={56} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rounded" width={150} height={10} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width={90} height={8} />
          </Box>
          <Skeleton variant="rounded" width={40} height={24} sx={{ borderRadius: 999 }} />
        </Box>
      ))}
    </Box>
  );
}

// Fila compacta de 390 (E4.2): foto 56x40, título, categoría y solo lo que falta ("EN falta", "Sin foto").
function MobileRow({ row, onToggle }) {
  const { tour, title, categoryName, languagesStatus } = row;
  const missing = languagesStatus.filter((s) => !s.complete);
  return (
    <Box
      component="li"
      sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 76, py: 1, borderBottom: '1px solid', borderColor: 'border.subtle' }}
    >
      <TourThumb img={tour.img} width={56} height={40} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          component={RouterLink}
          to={`/tours/${tour.id}`}
          underline="none"
          color="text.primary"
          sx={{
            display: 'block',
            fontSize: 16,
            lineHeight: '24px',
            fontWeight: 600,
            ...clamp1,
            '&::after': { content: '""', position: 'absolute', inset: 0 },
            '&:focus-visible': { outline: 'none' },
            '&:focus-visible::after': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
          }}
        >
          {title}
        </Link>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0, maxWidth: '100%' }}>{categoryName}</Typography>
          {missing.map(({ language }) => (
            <Chip key={language.id} size="small" label={`${language.code.toUpperCase()} falta`} sx={{ bgcolor: 'statusBg.warning', color: 'warning.main' }} />
          ))}
          {hasNoPhoto(tour) && (
            <Chip
              size="small"
              icon={<ImageOutlined />}
              label="Sin foto"
              sx={{ bgcolor: 'statusBg.warning', color: 'warning.main', '& .MuiChip-icon': { color: 'warning.main' } }}
            />
          )}
        </Box>
      </Box>
      {/* La etiqueta es el área táctil: 48x44, por encima del enlace estirado. */}
      <Box component="label" sx={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', width: 48, height: 44, overflow: 'hidden', cursor: 'pointer' }}>
        <Switch
          checked={!!tour.isActive}
          onChange={(e) => onToggle(tour, title, e.target.checked)}
          slotProps={{ input: { role: 'switch', 'aria-label': `Mostrar «${title}» en la web` } }}
        />
      </Box>
    </Box>
  );
}

// Hoja inferior de filtros (E4.3): se aplican al instante; "Ver N tours" solo la cierra.
function FiltersSheet({ open, onClose, categories, categoriaId, estado, pendientes, update, onClear, count }) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: 'bg.surface', backgroundImage: 'none', borderRadius: '12px 12px 0 0', px: 2, pb: 2, maxHeight: '90vh' }, 'aria-label': 'Filtros' } }}
    >
      <Box aria-hidden sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'border.control', mx: 'auto', mt: 1.25, mb: 0.5 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h3" component="h2">Filtros</Typography>
        <IconButton aria-label="Cerrar filtros" edge="end" onClick={onClose}><Close /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <FormField
          id="filtro-categoria"
          label="Categoría"
          select
          value={categoriaId}
          onChange={(e) => update({ categoria: e.target.value })}
          slotProps={{ select: { displayEmpty: true, IconComponent: KeyboardArrowDown, SelectDisplayProps: { id: 'filtro-categoria' }, renderValue: (v) => (v ? categories.find((c) => String(c.id) === v)?.label : 'Todas las categorías') } }}
        >
          <MenuItem value="">Todas las categorías</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>{c.label}</MenuItem>
          ))}
        </FormField>
        <FormField
          id="filtro-estado"
          label="Estado"
          select
          value={estado}
          onChange={(e) => update({ estado: e.target.value })}
          slotProps={{ select: { displayEmpty: true, IconComponent: KeyboardArrowDown, SelectDisplayProps: { id: 'filtro-estado' }, renderValue: (v) => STATES[v] || 'Todos' } }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="activos">Activos</MenuItem>
          <MenuItem value="inactivos">Inactivos</MenuItem>
        </FormField>
        <Box
          component="label"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, px: 2, bgcolor: 'bg.base', border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px', cursor: 'pointer' }}
        >
          <Typography component="span" variant="subtitle2" sx={{ color: 'text.primary', fontSize: 15 }}>Con pendientes</Typography>
          <Switch
            checked={pendientes !== ''}
            onChange={(e) => update({ pendientes: e.target.checked ? '1' : '' })}
            slotProps={{ input: { role: 'switch' } }}
          />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
        <Button variant="outlined" onClick={onClear} sx={{ flex: 1 }}>Quitar filtros</Button>
        <Button variant="contained" onClick={onClose} sx={{ flex: 1.2 }}>Ver {count} {count === 1 ? 'tour' : 'tours'}</Button>
      </Box>
    </Drawer>
  );
}

export default function TourList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const [params, setParams] = useSearchParams();
  const mobile = useIsMobile();
  const { topbarSlot } = useOutletContext();
  const [sheetOpen, setSheetOpen] = useState(false);

  const toursQ = useQuery({ queryKey: ['tours'], queryFn: fetchTours });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const languagesQ = useQuery({ queryKey: ['languages'], queryFn: fetchLanguages });
  const queries = [toursQ, categoriesQ, languagesQ];
  const loading = queries.some((q) => q.isLoading);
  const failed = !loading && queries.some((q) => q.isError);
  const ready = !loading && !failed;

  // Filtros en la URL. El texto se muestra desde un borrador mientras la URL lo alcanza (escribir no espera al router).
  const urlQ = params.get('q') ?? '';
  const [draft, setDraft] = useState(null);
  if (draft !== null && draft === urlQ) setDraft(null);
  const q = draft ?? urlQ;

  // Se parte de la URL actual (no del render): dos cambios seguidos no se pisan.
  const update = (changes) => {
    const next = new URLSearchParams(window.location.search);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const categories = useMemo(() => categoriesQ.data || [], [categoriesQ.data]);
  const languages = useMemo(() => languagesQ.data || [], [languagesQ.data]);
  const esId = languages.find((l) => l.code === 'es')?.id;

  const rows = useMemo(
    () =>
      (toursQ.data || []).map((tour) => {
        const title = tour.translations?.find((t) => t.languageId === esId)?.title?.trim() || tour.adminTitle;
        const category = categories.find((c) => c.id === (tour.category?.id ?? tour.categoryId));
        const categoryName =
          category?.translations?.find((t) => t.languageId === esId)?.name?.trim() ||
          tour.category?.adminName ||
          'Sin categoría';
        return { tour, title, categoryName, languagesStatus: tourLanguageStatus(tour, languages) };
      }),
    [toursQ.data, categories, languages, esId],
  );

  const categoriaId = categories.some((c) => String(c.id) === params.get('categoria')) ? params.get('categoria') : '';
  const estado = STATES[params.get('estado')] ? params.get('estado') : '';
  const pendientes = PENDING_CHIPS[params.get('pendientes')] ? params.get('pendientes') : '';
  const search = q.trim();

  const visible = useMemo(() => {
    const needle = norm(search);
    return rows.filter(({ tour, title }) => {
      if (needle && !norm(title).includes(needle) && !norm(tour.adminTitle).includes(needle)) return false;
      if (categoriaId && String(tour.category?.id ?? tour.categoryId) !== categoriaId) return false;
      if (estado === 'activos' && !tour.isActive) return false;
      if (estado === 'inactivos' && tour.isActive) return false;
      if (pendientes === 'foto' && !hasNoPhoto(tour)) return false;
      if (pendientes === 'textos' && !hasPendingTexts(tour, languages)) return false;
      if (pendientes === '1' && !hasNoPhoto(tour) && !hasPendingTexts(tour, languages)) return false;
      return true;
    });
  }, [rows, search, categoriaId, estado, pendientes, languages]);

  // Chips quitables. En 390 la búsqueda ya se ve en su campo, así que no lleva chip; "Con pendientes" encendido con un
  // subfiltro (foto/textos) se muestra como ese subfiltro, y quitarlo deja "Con pendientes" en modo general.
  const categoryLabel = (id) =>
    rows.find((r) => String(r.tour.category?.id ?? r.tour.categoryId) === id)?.categoryName ||
    categories.find((c) => String(c.id) === id)?.adminName;
  const chips = [];
  if (search && !mobile) chips.push({ key: 'q', label: `Búsqueda: ${search}`, remove: () => changeSearch('') });
  if (categoriaId) {
    const name = categoryLabel(categoriaId);
    chips.push({ key: 'categoria', label: mobile ? name : `Categoría: ${name}`, remove: () => update({ categoria: '' }) });
  }
  if (estado) chips.push({ key: 'estado', label: `Estado: ${STATES[estado]}`, remove: () => update({ estado: '' }) });
  if (pendientes) {
    chips.push({ key: 'pendientes', label: PENDING_CHIPS[pendientes], remove: () => update({ pendientes: pendientes === '1' ? '' : '1' }) });
  }
  const filterCount = [categoriaId, estado, pendientes].filter(Boolean).length;

  function changeSearch(value) {
    setDraft(value);
    update({ q: value });
  }

  const clearFilters = () => {
    setDraft(null);
    setParams({}, { replace: true });
  };

  // Interruptor: guarda en el acto (optimista); si falla, vuelve y ofrece Reintentar; si sale bien, avisa con Deshacer (5 s).
  const patchCache = (id, isActive) =>
    queryClient.setQueryData(['tours'], (old) => (old || []).map((t) => (t.id === id ? { ...t, isActive } : t)));

  async function setActive(tour, title, isActive, { announce = true } = {}) {
    const previous = !isActive;
    patchCache(tour.id, isActive);
    try {
      await api.patch(`/tours/${tour.id}`, { isActive });
      if (announce) {
        toasts.success(isActive ? `«${title}» ya se muestra en la web` : `«${title}» ya no se muestra en la web`, {
          action: { label: 'Deshacer', onClick: () => setActive(tour, title, previous, { announce: false }) },
        });
      }
    } catch {
      patchCache(tour.id, previous);
      toasts.error(`No pudimos cambiar «${title}».`, {
        action: { label: 'Reintentar', onClick: () => setActive(tour, title, isActive, { announce }) },
      });
    }
  }

  const retry = () => queries.filter((x) => x.isError).forEach((x) => x.refetch());
  const empty = ready && rows.length === 0;
  const filtering = !!search || filterCount > 0;
  const total = rows.length;
  const controlsDisabled = !ready;
  const countText = ready ? (filtering ? `${visible.length} de ${total} tours` : `${total} ${total === 1 ? 'tour' : 'tours'}`) : null;

  // 390: el primario "Nuevo" va en la barra superior (portal), no en el encabezado de la vista.
  let newButton = null;
  if (!empty) {
    newButton = mobile ? (
      topbarSlot && createPortal(<Button component={RouterLink} to="/tours/new" variant="contained">Nuevo</Button>, topbarSlot)
    ) : (
      <Button component={RouterLink} to="/tours/new" variant="contained">Nuevo tour</Button>
    );
  }

  const header = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: mobile ? 0 : 3 }}>
      <Typography variant="h1" component="h1" sx={mobile ? srOnly : undefined}>Tours</Typography>
      {newButton}
    </Box>
  );

  if (empty) {
    return (
      <Box>
        {header}
        <EmptyState
          title="Aún no hay tours."
          description="Crea el primero y aparecerá en la web cuando lo actives."
          action={{ label: 'Crear el primero', onClick: () => navigate('/tours/new') }}
        />
      </Box>
    );
  }

  const searchField = (
    <TextField
      value={q}
      onChange={(e) => changeSearch(e.target.value)}
      disabled={controlsDisabled}
      placeholder="Buscar por título o nombre admin"
      sx={{ width: mobile ? '100%' : 360, '& .MuiOutlinedInput-input': { pl: 0 } }}
      slotProps={{
        htmlInput: { 'aria-label': 'Buscar por título o nombre admin' },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'tertiary' }} aria-hidden />
            </InputAdornment>
          ),
        },
      }}
    />
  );

  const counter = (
    <Box role="status" aria-live="polite" sx={{ ...(!mobile && { ml: 'auto' }), ...numeric, fontSize: 14, color: 'text.secondary' }}>
      {loading ? <Skeleton variant="rounded" width={76} height={16} /> : countText}
    </Box>
  );

  const chipRow = ready && chips.length > 0 && (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: mobile ? 1 : 2 }}>
      {chips.map((c) => (
        <Chip
          key={c.key}
          variant="outlined"
          label={c.label}
          onClick={c.remove}
          onDelete={c.remove}
          deleteIcon={<Close />}
          aria-label={`Quitar filtro ${c.label}`}
          sx={{
            height: mobile ? 36 : 28,
            borderColor: 'border.control',
            fontWeight: mobile ? 600 : 400,
            maxWidth: mobile ? '100%' : 320,
            // 390: la X mide 44x44 (se sale del chip sin agrandarlo).
            ...(mobile && { '& .MuiChip-deleteIcon': { boxSizing: 'content-box', width: 24, height: 24, p: '10px', m: '-4px -12px -4px -6px' } }),
          }}
        />
      ))}
      <Link
        component="button"
        type="button"
        underline="always"
        color="primary.main"
        onClick={clearFilters}
        sx={{ fontSize: 14, fontWeight: 600, ...(mobile && { minHeight: 44, px: 1 }) }}
      >
        Quitar filtros
      </Link>
    </Box>
  );

  const states = (
    <>
      {loading && (mobile ? <SkeletonList /> : <SkeletonTable />)}
      {failed && (
        <ErrorState title="No pudimos cargar los tours." description="Revisa tu conexión e intenta de nuevo." onRetry={retry} />
      )}
      {ready && visible.length === 0 && (
        <EmptyState
          icon={<Search sx={{ color: 'tertiary', fontSize: 32 }} aria-hidden />}
          title={search ? `Ningún tour coincide con «${search}».` : 'Ningún tour coincide con los filtros.'}
          description={search ? 'Revisa la ortografía o prueba con menos palabras.' : 'Prueba con otros filtros o quítalos todos.'}
          action={{ label: 'Quitar filtros', onClick: clearFilters, variant: 'outlined' }}
        />
      )}
      {ready && visible.length > 0 && mobile && (
        <Box component="ul" aria-label="Tours" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {visible.map((row) => (
            <MobileRow key={row.tour.id} row={row} onToggle={setActive} />
          ))}
        </Box>
      )}
      {ready && visible.length > 0 && !mobile && (
        <ToursTable>
          {visible.map((row) => (
            <TourRow key={row.tour.id} row={row} onToggle={setActive} />
          ))}
        </ToursTable>
      )}
    </>
  );

  if (mobile) {
    return (
      <Box>
        {header}
        <Box sx={{ mb: 1.5 }}>{searchField}</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Button variant="outlined" disabled={controlsDisabled} onClick={() => setSheetOpen(true)} sx={{ minWidth: 112 }}>
            {filterCount > 0 ? `Filtros (${filterCount})` : 'Filtros'}
          </Button>
          {counter}
        </Box>
        {chipRow}
        {states}
        <FiltersSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          categories={categories.map((c) => ({ id: c.id, label: c.translations?.find((t) => t.languageId === esId)?.name || c.adminName }))}
          categoriaId={categoriaId}
          estado={estado}
          pendientes={pendientes}
          update={update}
          onClear={clearFilters}
          count={visible.length}
        />
      </Box>
    );
  }

  return (
    <Box>
      {header}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: chips.length ? 1.5 : 2 }}>
        {searchField}
        <Select
          value={categoriaId}
          onChange={(e) => update({ categoria: e.target.value })}
          disabled={controlsDisabled}
          displayEmpty
          IconComponent={KeyboardArrowDown}
          inputProps={{ 'aria-label': 'Categoría' }}
          sx={{ width: 220 }}
        >
          <MenuItem value="">Todas las categorías</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>
              {c.translations?.find((t) => t.languageId === esId)?.name || c.adminName}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={estado}
          onChange={(e) => update({ estado: e.target.value })}
          disabled={controlsDisabled}
          displayEmpty
          IconComponent={KeyboardArrowDown}
          inputProps={{ 'aria-label': 'Estado' }}
          renderValue={(v) => `Estado: ${STATES[v] || 'Todos'}`}
          sx={{ width: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="activos">Activos</MenuItem>
          <MenuItem value="inactivos">Inactivos</MenuItem>
        </Select>
        <Button
          variant="outlined"
          aria-pressed={pendientes !== ''}
          disabled={controlsDisabled}
          startIcon={pendientes !== '' ? <Check /> : null}
          onClick={() => update({ pendientes: pendientes !== '' ? '' : '1' })}
          sx={{ width: 168, ...(pendientes !== '' && { bgcolor: 'neutral.chip', color: 'text.primary' }) }}
        >
          Con pendientes
        </Button>
        {counter}
      </Box>

      {chipRow}
      {states}
    </Box>
  );
}
