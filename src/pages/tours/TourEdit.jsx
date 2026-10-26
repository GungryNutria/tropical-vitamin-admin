import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, ButtonBase, Chip, CircularProgress, Link, MenuItem, Skeleton, Switch, Tab, Tabs, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Check from '@mui/icons-material/Check';
import ChevronRight from '@mui/icons-material/ChevronRight';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import api, { errorMessage } from '../../lib/api';
import { formatDuration } from '../../lib/format';
import { activeLanguages } from '../../lib/catalog';
import { useToasts } from '../../lib/useToasts';
import useUnsavedGuard from '../../lib/useUnsavedGuard';
import Banner from '../../components/Banner';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormField from '../../components/FormField';
import { ErrorState, NotFound } from '../../components/States';
import PhotoField from './PhotoField';

const ID_RE = /^[1-9]\d*$/;

const fetchTour = async (id) => (await api.get(`/tours/${id}`)).data;
const fetchCategories = async () => (await api.get('/categories')).data;
const fetchLanguages = async () => (await api.get('/languages')).data;

const blank = (v) => !String(v ?? '').trim();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

// "en inglés", "en español"; para otros idiomas, el nombre tal cual.
const inLanguage = (language) => ({ es: 'en español', en: 'en inglés' })[language.code] || `en ${language.name}`;

function initialForm(tour, languages) {
  const translations = {};
  languages.forEach((l) => {
    const t = tour?.translations?.find((x) => x.languageId === l.id);
    translations[l.id] = { title: t?.title ?? '', description: t?.description ?? '' };
  });
  return {
    adminTitle: tour?.adminTitle ?? '',
    categoryId: tour ? String(tour.categoryId ?? tour.category?.id ?? '') : '',
    location: tour?.location ?? '',
    duration: tour ? String(tour.duration ?? '') : '',
    price: tour ? String(tour.price ?? '') : '',
    img: tour?.img ?? '',
    isActive: tour ? !!tour.isActive : false, // un tour nuevo nace oculto (D1)
    translations,
  };
}

const durationMinutes = (value) => (/^\d+$/.test(value.trim()) && Number(value) >= 1 ? Number(value) : null);

// Errores en orden de lectura: Datos generales y luego cada idioma activo (los inactivos no validan, REQ-27).
function validate(form, languages) {
  const errors = [];
  const add = (id, label, message, language) => errors.push({ id, label, message, languageId: language?.id });
  if (blank(form.adminTitle)) add('tour-adminTitle', 'Nombre admin', 'Escribe el nombre admin.');
  if (!form.categoryId) add('tour-categoryId', 'Categoría', 'Elige una categoría.');
  if (blank(form.location)) add('tour-location', 'Ubicación', 'Escribe la ubicación.');
  if (blank(form.duration)) add('tour-duration', 'Duración', 'Escribe la duración en minutos.');
  else if (!durationMinutes(form.duration)) add('tour-duration', 'Duración', 'Escribe minutos en número entero, 1 o más.');
  if (blank(form.price)) add('tour-price', 'Precio', 'Escribe el precio.');
  else if (!(Number(form.price) >= 0)) add('tour-price', 'Precio', 'Escribe un precio de 0 o más.');
  activeLanguages(languages).forEach((l) => {
    const t = form.translations[l.id];
    if (blank(t.title)) add(`tour-title-${l.id}`, `Título (${l.name})`, `Escribe el título ${inLanguage(l)}.`, l);
    if (blank(t.description)) add(`tour-description-${l.id}`, `Descripción (${l.name})`, `Escribe la descripción ${inLanguage(l)}.`, l);
  });
  return errors;
}

function Crumbs({ current }) {
  return (
    <Box component="nav" aria-label="Ruta" sx={{ display: 'flex', gap: 1.5, fontSize: 13, lineHeight: '18px', color: 'text.secondary' }}>
      <Link component={RouterLink} to="/tours" underline="hover" color="inherit">Tours</Link>
      {current && (
        <>
          <span aria-hidden>/</span>
          <Typography component="span" variant="caption" aria-current="page" sx={{ color: 'text.primary' }}>{current}</Typography>
        </>
      )}
    </Box>
  );
}

const card = { p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px' };
const gridSx = {
  display: 'grid',
  gap: '24px 48px',
  alignItems: 'start',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 720px) 320px' },
};

function FormSkeleton() {
  const bar = (w, h = 40) => <Skeleton variant="rounded" width={w} height={h} sx={{ mb: 1.5 }} />;
  return (
    <Box aria-busy="true" aria-label="Cargando el tour" sx={gridSx}>
      <Box sx={{ gridColumn: { lg: 1 } }}>
        {bar(120, 14)}
        {bar(260, 28)}
      </Box>
      <Box sx={{ gridColumn: { lg: 1 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={card}>{bar(180, 16)}{bar('100%')}{bar('100%')}{bar('100%')}</Box>
        <Box sx={card}>{bar(180, 16)}{bar(200, 24)}{bar('100%')}{bar('100%', 112)}</Box>
      </Box>
      <Box sx={{ gridColumn: { lg: 2 }, gridRow: { lg: '2 / span 2' } }}>
        <Box sx={card}>{bar(60, 16)}{bar('100%', 192)}{bar('100%')}</Box>
        <Box sx={{ ...card, mt: 2 }}>{bar('100%', 32)}</Box>
        <Button variant="contained" disabled fullWidth sx={{ mt: 2 }}>Guardar</Button>
      </Box>
    </Box>
  );
}

function TabStatus({ language, complete, errorCount }) {
  if (errorCount > 0) {
    return <Chip size="small" label={plural(errorCount, 'error', 'errores')} sx={{ ml: 1, bgcolor: 'statusBg.danger', color: 'error.main' }} />;
  }
  if (!language.isActive) return null;
  if (complete) {
    return (
      <>
        <Check sx={{ ml: 0.75, fontSize: 18, color: 'success.main' }} aria-hidden />
        <span style={srOnly}> (completo)</span>
      </>
    );
  }
  return <Chip size="small" label="Pendiente" sx={{ ml: 1, bgcolor: 'statusBg.warning', color: 'warning.main' }} />;
}

function TourForm({ tour, categories, languages, savedFlag }) {
  const isNew = !tour;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toasts = useToasts();

  const esId = languages.find((l) => l.code === 'es')?.id;
  const categoryLabel = (c) => c.translations?.find((t) => t.languageId === esId)?.name || c.adminName;

  const [baseline, setBaseline] = useState(() => initialForm(tour, languages));
  const [form, setForm] = useState(baseline);
  const [activeLang, setActiveLang] = useState(languages.find((l) => l.isActive)?.id ?? languages[0]?.id);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [justSaved, setJustSaved] = useState(!!savedFlag);
  const [uploading, setUploading] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const blocker = useUnsavedGuard(dirty);

  // Tras crear un tour: confirmación en la página de edición del tour nuevo (REQ-9).
  const toastedRef = useRef(false);
  useEffect(() => {
    if (!savedFlag || toastedRef.current) return;
    toastedRef.current = true;
    toasts.success('Cambios guardados');
    navigate(location.pathname, { replace: true, state: null });
  }, [savedFlag, toasts, navigate, location.pathname]);

  // Navegar a /tours/<id> solo cuando el formulario ya quedó limpio (si no, el aviso de salida lo frenaría).
  useEffect(() => {
    if (createdId && !dirty) navigate(`/tours/${createdId}`, { replace: true, state: { saved: true } });
  }, [createdId, dirty, navigate]);

  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.id)?.focus();
  }, [focusRequest]);

  const errors = useMemo(() => validate(form, languages), [form, languages]);
  const shown = submitted ? errors : [];
  const errorOf = (id) => shown.find((e) => e.id === id)?.message;

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const setText = (languageId, field, value) =>
    setForm((f) => ({ ...f, translations: { ...f.translations, [languageId]: { ...f.translations[languageId], [field]: value } } }));

  const goTo = (error) => {
    if (error.languageId) setActiveLang(error.languageId);
    setFocusRequest({ id: error.id });
  };

  const save = useMutation({
    mutationFn: async ({ payload }) => {
      const { data } = isNew ? await api.post('/tours', payload) : await api.patch(`/tours/${tour.id}`, payload);
      return data;
    },
    onSuccess: (data, { snapshot }) => {
      setBaseline(snapshot);
      setSaveError(null);
      setJustSaved(true);
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (isNew) setCreatedId(data?.id);
      else toasts.success('Cambios guardados');
    },
    onError: (err) => setSaveError(errorMessage(err)),
  });

  const handleSave = () => {
    if (save.isPending || uploading) return;
    setSubmitted(true);
    setSaveError(null);
    if (errors.length) {
      goTo(errors[0]);
      return;
    }
    const translations = languages
      .filter((l) => {
        const t = form.translations[l.id];
        return l.isActive || tour?.translations?.some((x) => x.languageId === l.id) || !blank(t.title) || !blank(t.description);
      })
      .map((l) => ({ languageId: l.id, ...form.translations[l.id] }));
    save.mutate({
      snapshot: form,
      payload: {
        adminTitle: form.adminTitle,
        price: Number(form.price),
        location: form.location,
        duration: durationMinutes(form.duration),
        img: form.img || null,
        isActive: form.isActive,
        categoryId: Number(form.categoryId),
        translations,
      },
    });
  };

  const title = (esId && baseline.translations[esId]?.title.trim()) || baseline.adminTitle.trim() || 'Nuevo tour';
  const minutes = durationMinutes(form.duration);

  let railNote = null;
  if (uploading) railNote = <Typography variant="caption" color="text.secondary">Esperando la foto</Typography>;
  else if (dirty) {
    railNote = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
        <Typography variant="caption" color="text.secondary">Cambios sin guardar</Typography>
      </Box>
    );
  } else if (justSaved) {
    railNote = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'success.main' }}>
        <Check sx={{ fontSize: 16 }} aria-hidden />
        <Typography variant="caption" sx={{ color: 'inherit' }}>Guardado hace un momento</Typography>
      </Box>
    );
  }

  return (
    <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); handleSave(); }} sx={gridSx}>
      <Box sx={{ gridColumn: { lg: 1 }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Crumbs current={title} />
          <Typography variant="h1" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>{title}</Typography>
        </Box>
        <Link
          component={RouterLink}
          to="/tours"
          underline="always"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'primary.main', fontSize: 14, fontWeight: 600, flexShrink: 0, mt: 0.5 }}
        >
          <ArrowBack sx={{ fontSize: 18 }} aria-hidden />
          Volver a la lista
        </Link>
      </Box>

      <Box sx={{ gridColumn: { lg: 1 }, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        {shown.length > 0 ? (
          <Banner severity="error" title={`Revisa ${plural(shown.length, 'campo', 'campos')}`}>
            <span>Corrige lo marcado para guardar. No se guardó nada todavía.</span>
            <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 0.5, p: 0 }}>
              {shown.map((e) => (
                <li key={e.id}>
                  <ButtonBase
                    onClick={() => goTo(e)}
                    sx={{ gap: 0.5, color: 'primary.main', textDecoration: 'underline', fontSize: 14, borderRadius: '4px', textAlign: 'left' }}
                  >
                    <ChevronRight sx={{ fontSize: 16 }} aria-hidden />
                    {e.label}
                  </ButtonBase>
                </li>
              ))}
            </Box>
          </Banner>
        ) : (
          saveError && <Banner severity="error" title="No se pudo guardar el tour" action={{ label: 'Reintentar', onClick: handleSave }}>{saveError}</Banner>
        )}

        <Box component="section" aria-labelledby="general-title" sx={card}>
          <Typography id="general-title" variant="h2" component="h2" sx={{ mb: 2 }}>Datos generales</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <FormField
              sx={{ gridColumn: { sm: '1 / -1' } }}
              id="tour-adminTitle"
              label="Nombre admin"
              required
              value={form.adminTitle}
              onChange={(e) => setField('adminTitle', e.target.value)}
              help="Solo lo ves tú en el admin. Ej.: snorkel-buceo"
              error={errorOf('tour-adminTitle')}
            />
            <FormField
              id="tour-categoryId"
              label="Categoría"
              required
              select
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              error={errorOf('tour-categoryId')}
              slotProps={{
                select: {
                  displayEmpty: true,
                  IconComponent: KeyboardArrowDown,
                  SelectDisplayProps: { id: 'tour-categoryId' },
                  renderValue: (v) => (v ? categoryLabel(categories.find((c) => String(c.id) === v) || { adminName: v }) : <span style={{ opacity: 0.7 }}>Elige una categoría</span>),
                },
              }}
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>{categoryLabel(c)}</MenuItem>
              ))}
            </FormField>
            <FormField
              id="tour-location"
              label="Ubicación"
              required
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
              help="Ej.: Cancún, México"
              error={errorOf('tour-location')}
            />
            <FormField
              id="tour-duration"
              label="Duración"
              required
              suffix="min"
              value={form.duration}
              onChange={(e) => setField('duration', e.target.value)}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              help={minutes ? `= ${formatDuration(minutes)}` : 'Escribe los minutos. Ej.: 150 = 2 h 30 min'}
              error={errorOf('tour-duration')}
            />
            <FormField
              id="tour-price"
              label="Precio"
              required
              prefix="$"
              suffix="MXN"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              help="En pesos mexicanos."
              error={errorOf('tour-price')}
            />
          </Box>
        </Box>

        <Box component="section" aria-labelledby="texts-title" sx={{ ...card, pb: 4 }}>
          <Typography id="texts-title" variant="h2" component="h2" sx={{ mb: 2 }}>Textos por idioma</Typography>
          <Tabs value={activeLang} onChange={(_, v) => setActiveLang(v)} aria-label="Idiomas" sx={{ borderBottom: '1px solid', borderColor: 'border.subtle', mb: 3 }}>
            {languages.map((l) => {
              const t = form.translations[l.id];
              const complete = !blank(t.title) && !blank(t.description);
              const errorCount = shown.filter((e) => e.languageId === l.id).length;
              return (
                <Tab
                  key={l.id}
                  value={l.id}
                  id={`lang-tab-${l.id}`}
                  aria-controls={`lang-panel-${l.id}`}
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      {l.name}
                      <TabStatus language={l} complete={complete} errorCount={errorCount} />
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
          {languages.map((l) => {
            const t = form.translations[l.id];
            return (
              <Box
                key={l.id}
                role="tabpanel"
                id={`lang-panel-${l.id}`}
                aria-labelledby={`lang-tab-${l.id}`}
                hidden={activeLang !== l.id}
                sx={{ display: activeLang === l.id ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}
              >
                <FormField
                  id={`tour-title-${l.id}`}
                  label={`Título (${l.name})`}
                  required
                  counter={plural(t.title.length, 'carácter', 'caracteres')}
                  value={t.title}
                  onChange={(e) => setText(l.id, 'title', e.target.value)}
                  help="Es lo que ven los viajeros en la web."
                  error={errorOf(`tour-title-${l.id}`)}
                />
                <FormField
                  id={`tour-description-${l.id}`}
                  label={`Descripción (${l.name})`}
                  required
                  multiline
                  minRows={4}
                  counter={plural(t.description.length, 'carácter', 'caracteres')}
                  value={t.description}
                  onChange={(e) => setText(l.id, 'description', e.target.value)}
                  help="Cuenta qué incluye y qué vivirá el viajero."
                  error={errorOf(`tour-description-${l.id}`)}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        component="aside"
        aria-label="Foto, visibilidad y guardado"
        sx={{ gridColumn: { lg: 2 }, gridRow: { lg: '2 / span 2' }, position: { lg: 'sticky' }, top: 32, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Box component="section" aria-labelledby="photo-title" sx={{ ...card, p: '15px' }}>
          <Typography id="photo-title" variant="h2" component="h2" sx={{ mb: 1.5 }}>Foto</Typography>
          <PhotoField value={form.img} savedValue={baseline.img} onChange={(url) => setField('img', url)} onUploadingChange={setUploading} />
        </Box>

        <Box component="label" htmlFor="tour-isActive" sx={{ ...card, p: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, cursor: 'pointer' }}>
          <Box>
            <Typography id="active-title" variant="subtitle2" component="span" sx={{ display: 'block', color: 'text.primary', fontSize: 15, fontWeight: 600 }}>Visible en la web</Typography>
            <Typography id="active-help" variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
              {form.isActive ? 'Los viajeros ven este tour.' : 'Oculto: los viajeros no lo ven.'}
            </Typography>
          </Box>
          <Switch
            checked={form.isActive}
            onChange={(e) => setField('isActive', e.target.checked)}
            slotProps={{ input: { id: 'tour-isActive', role: 'switch', 'aria-labelledby': 'active-title', 'aria-describedby': 'active-help' } }}
          />
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={uploading}
          aria-busy={save.isPending || undefined}
          aria-describedby="save-note"
          sx={{ minHeight: 44 }}
        >
          {save.isPending ? (
            <>
              <CircularProgress size={18} thickness={5} color="inherit" sx={{ mr: 1 }} aria-hidden />
              Guardando…
            </>
          ) : (
            'Guardar'
          )}
        </Button>
        <Box id="save-note" sx={{ display: 'flex', justifyContent: 'center', minHeight: 18 }} role="status">
          {railNote}
        </Box>
      </Box>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="¿Salir sin guardar?"
        cancelLabel="Seguir editando"
        confirmLabel="Salir y descartar"
        destructive
        safePrimary
        onConfirm={() => blocker.proceed()}
        onClose={() => blocker.reset()}
      >
        <span style={{ display: 'block' }}>Tienes cambios sin guardar en «{title}».</span>
        <span style={{ display: 'block' }}>Si sales ahora, se pierden.</span>
      </ConfirmDialog>
    </Box>
  );
}

export default function TourEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const isNew = id === undefined;
  const validId = isNew || ID_RE.test(id);

  // gcTime 0: al volver a un tour siempre se pide fresco; el formulario se llena una sola vez con lo que llega.
  const tourQ = useQuery({
    queryKey: ['tour', id],
    queryFn: () => fetchTour(id),
    enabled: !isNew && validId,
    gcTime: 0,
    retry: (count, err) => err?.response?.status !== 404 && count < 1,
  });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const languagesQ = useQuery({ queryKey: ['languages'], queryFn: fetchLanguages });

  const notFound = (
    <Box>
      <Crumbs />
      <Box sx={{ mt: 3 }}>
        <NotFound
          title="Este tour no existe o se eliminó."
          description="Puede que el enlace esté incompleto o que alguien lo haya borrado."
          action={{ label: 'Ir a la lista', onClick: () => navigate('/tours') }}
        />
      </Box>
    </Box>
  );

  if (!validId) return notFound;
  if (tourQ.error?.response?.status === 404) return notFound;

  const failed = [tourQ, categoriesQ, languagesQ].filter((q) => q.isError);
  if (failed.length) {
    return (
      <ErrorState
        title="No pudimos cargar el tour."
        description="Revisa tu conexión e intenta de nuevo."
        onRetry={() => failed.forEach((q) => q.refetch())}
      />
    );
  }
  if ((!isNew && tourQ.isPending) || categoriesQ.isPending || languagesQ.isPending) return <FormSkeleton />;
  if (!isNew && !tourQ.data) return notFound; // el API responde 200 con cuerpo vacío si el id no existe

  return (
    <TourForm
      key={id ?? 'new'}
      tour={isNew ? null : tourQ.data}
      categories={categoriesQ.data}
      languages={languagesQ.data}
      savedFlag={!!state?.saved}
    />
  );
}
