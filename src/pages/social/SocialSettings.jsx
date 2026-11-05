import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, CircularProgress, Link, Switch, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import api from '../../lib/api';
import { NETWORKS, checkUrl, errorText, normalizeWhatsapp } from '../../lib/socialRules';
import { useIsStacked } from '../../lib/useIsMobile';
import { useToasts } from '../../lib/useToasts';
import useUnsavedGuard from '../../lib/useUnsavedGuard';
import { numeric } from '../../theme';
import Banner from '../../components/Banner';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorSummary from '../../components/ErrorSummary';
import FormField from '../../components/FormField';
import PageHeader from '../../components/PageHeader';
import { ErrorState, SkeletonRows } from '../../components/States';

const DESCRIPTION = 'Estos enlaces aparecen en el pie de página y en Contacto de la web. Solo se muestran las redes con enlace y con "Mostrar en la web" encendido.';
const WHATSAPP_HELP = 'Número con lada del país, sin el 1 de celular. Ej. 52 984 168 1263. Es el número de todos los botones de WhatsApp de la web.';
const HELP = {
  facebook: 'Pega el enlace de tu página, por ejemplo facebook.com/tu-pagina.',
  instagram: 'Pega el enlace de tu página, por ejemplo instagram.com/tu-pagina.',
  linkedin: 'Pega el enlace de tu página, por ejemplo linkedin.com/company/tu-pagina.',
};
const PLACEHOLDER = { facebook: 'facebook.com/tu-pagina', instagram: 'instagram.com/tu-pagina', linkedin: 'linkedin.com/company/tu-pagina' };
const TEXT_FIELDS = [...NETWORKS.map((n) => `${n.key}Url`), 'whatsappNumber'];
const SAVE_ERROR = 'No se pudieron guardar los cambios. Revisa tu conexión e intenta de nuevo.';

const divider = { mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'border.subtle' };

// 529841681263 -> "52 984 168 1263" (lada del país + 3, 3 y 4 dígitos).
const formatWhatsapp = (digits) => (digits.length > 10 ? `${digits.slice(0, -10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}` : digits);

const toForm = (data) => ({
  ...Object.fromEntries(NETWORKS.flatMap(({ key }) => [[`${key}Url`, data[`${key}Url`] ?? ''], [`${key}Visible`, !!data[`${key}Visible`]]])),
  whatsappNumber: formatWhatsapp(data.whatsappNumber ?? ''),
});

// { campo: código } de los 4 campos de texto.
function validate(form) {
  const found = {};
  NETWORKS.forEach(({ key }) => {
    const { error } = checkUrl(key, form[`${key}Url`]);
    if (error) found[`${key}Url`] = error;
  });
  const { error } = normalizeWhatsapp(form.whatsappNumber);
  if (error) found.whatsappNumber = error;
  return found;
}

const networkOf = (field) => field.replace('Url', '');

function OpenLink({ label, href }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="always"
      aria-label={`Abrir ${label} en una pestaña nueva`}
      // Área de toque de 40 px (44 a 390) sin mover la línea de ayuda.
      sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, color: 'primary.main', fontSize: 14, fontWeight: 600, minHeight: { xs: 44, md: 40 }, my: { xs: 0, md: '-11px' } }}
    >
      Abrir
    </Link>
  );
}

// Ayuda a la izquierda y "Abrir" a la derecha (debajo a 390).
function HelpWithOpen({ text, open }) {
  return (
    <Box component="span" sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'flex-start', gap: { xs: 0, md: 2 } }}>
      <span>{text}</span>
      {open}
    </Box>
  );
}

function NetworkBlock({ net, index, form, error, notice, onUrl, onBlur, onVisible }) {
  const { key, label } = net;
  const url = form[`${key}Url`];
  const visible = form[`${key}Visible`];
  const hasUrl = url.trim() !== '';
  const { value: valid } = checkUrl(key, url);
  const shown = hasUrl && visible;
  const status = !hasUrl ? 'Oculta: sin enlace' : shown ? 'Se muestra' : 'Oculta';
  const noteId = `social-${key}-switch-note`;
  const helpId = `social-${key}-switch-help`;
  const switchId = `social-${key}-visible`;
  const describedBy = notice ? noteId : !hasUrl ? helpId : undefined;

  return (
    <Box sx={index > 0 ? divider : undefined}>
      <FormField
        id={`social-${key}Url`}
        label={label}
        value={url}
        onChange={(e) => onUrl(key, e.target.value)}
        onBlur={() => onBlur(`${key}Url`)}
        placeholder={PLACEHOLDER[key]}
        error={error}
        help={<HelpWithOpen text={HELP[key]} open={valid && !error ? <OpenLink label={label} href={valid} /> : null} />}
        slotProps={{ htmlInput: { inputMode: 'url', autoComplete: 'off', maxLength: 300 } }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5, minHeight: { xs: 44, md: 40 }, mt: 1 }}>
        <Switch
          id={switchId}
          checked={shown}
          disabled={!hasUrl}
          onChange={(e) => onVisible(key, e.target.checked)}
          slotProps={{ input: { role: 'switch', 'aria-label': `Mostrar ${label} en la web`, 'aria-describedby': describedBy } }}
        />
        <Typography component="label" htmlFor={switchId} sx={{ display: 'flex', alignItems: 'center', minHeight: { xs: 44, md: 40 }, fontSize: 15, lineHeight: '24px', fontWeight: 500, color: hasUrl ? 'text.primary' : 'text.disabled', cursor: hasUrl ? 'pointer' : 'default' }}>
          Mostrar en la web
        </Typography>
        <Box sx={{ ml: { md: 'auto' }, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: shown ? 'success.main' : 'tertiary' }} />
          <Typography variant="caption" sx={{ color: shown ? 'text.primary' : 'text.secondary' }}>{status}</Typography>
        </Box>
      </Box>
      <Box id={noteId} aria-live="polite" sx={{ ml: '52px' }}>
        {notice && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'warning.main' }}>
            <ErrorOutline sx={{ fontSize: 16 }} aria-hidden />
            <Typography variant="caption" sx={{ color: 'inherit' }}>Se apagó porque no hay enlace.</Typography>
          </Box>
        )}
      </Box>
      {!hasUrl && !notice && (
        <Typography id={helpId} variant="caption" sx={{ display: 'block', ml: '52px', color: 'tertiary' }}>Agrega el enlace para poder mostrarla.</Typography>
      )}
    </Box>
  );
}

function SocialForm({ data }) {
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const stacked = useIsStacked(); // bajo 1200 px Guardar pasa a la barra inferior fija
  const [baseline, setBaseline] = useState(() => toForm(data));
  const [form, setForm] = useState(baseline);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [notices, setNotices] = useState({});
  const [saveError, setSaveError] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [focusSummary, setFocusSummary] = useState(0);
  const summaryRef = useRef(null);
  const saveErrorRef = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const blocker = useUnsavedGuard(dirty);

  // Los avisos suben sobre la barra inferior (88 px + 8 de aire).
  useEffect(() => {
    if (!stacked) return undefined;
    document.documentElement.style.setProperty('--toast-bottom', '96px');
    return () => document.documentElement.style.removeProperty('--toast-bottom');
  }, [stacked]);

  useEffect(() => {
    if (focusSummary) summaryRef.current?.focus();
  }, [focusSummary]);

  useEffect(() => {
    if (saveError) saveErrorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [saveError]);

  const clientErrors = validate(form);
  const shownErrors = {};
  TEXT_FIELDS.forEach((name) => {
    const code = serverErrors[name] || (submitted || touched[name] ? clientErrors[name] : null);
    if (code) shownErrors[name] = code;
  });
  const errorOf = (name) => (shownErrors[name] ? errorText(shownErrors[name], networkOf(name)) : undefined);
  const summary = submitted
    ? TEXT_FIELDS.filter((name) => shownErrors[name]).map((name) => ({ id: `social-${name}`, label: NETWORKS.find((n) => n.key === networkOf(name))?.label ?? 'WhatsApp' }))
    : [];

  const clearServerError = (name) => setServerErrors((s) => (name in s ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== name)) : s));

  const setUrl = (key, value) => {
    const hasText = value.trim() !== '';
    const turnsOff = !hasText && form[`${key}Visible`];
    setForm((f) => ({ ...f, [`${key}Url`]: value, ...(turnsOff && { [`${key}Visible`]: false }) }));
    // El aviso solo aparece al borrar el enlace con la red encendida y se va al escribir de nuevo.
    if (turnsOff || hasText) setNotices((n) => ({ ...n, [key]: turnsOff }));
    clearServerError(`${key}Url`);
  };

  const setVisible = (key, value) => setForm((f) => ({ ...f, [`${key}Visible`]: value }));

  // Al salir del campo se valida y, si el enlace es bueno, se completa (https://, www.).
  const blurField = (name) => {
    setTouched((t) => ({ ...t, [name]: true }));
    if (name !== 'whatsappNumber') {
      const { value } = checkUrl(networkOf(name), form[name]);
      if (value && value !== form[name]) setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const save = useMutation({
    mutationFn: async ({ payload }) => (await api.put('/social', payload)).data,
    onSuccess: (saved, { snapshot }) => {
      const next = toForm(saved);
      setBaseline(next);
      // Lo escrito mientras se guardaba no se pisa.
      setForm((f) => (JSON.stringify(f) === JSON.stringify(snapshot) ? next : f));
      setNotices({});
      setServerErrors({});
      setSaveError(false);
      setJustSaved(true);
      queryClient.setQueryData(['social-admin'], saved);
      toasts.success('Cambios guardados');
    },
    onError: (err) => {
      const body = err.response?.data;
      if (err.response?.status === 400 && body?.code === 'INVALID_SOCIAL_SETTINGS' && body.fields) {
        const fields = Object.fromEntries(Object.entries(body.fields).filter(([name]) => TEXT_FIELDS.includes(name)));
        if (Object.keys(fields).length) {
          setServerErrors(fields);
          setFocusSummary((n) => n + 1);
          return;
        }
      }
      setSaveError(true);
    },
  });

  const handleSave = () => {
    if (save.isPending) return;
    setSubmitted(true);
    setSaveError(false);
    setServerErrors({});
    if (Object.keys(clientErrors).length) {
      setFocusSummary((n) => n + 1);
      return;
    }
    const payload = { whatsappNumber: normalizeWhatsapp(form.whatsappNumber).value };
    NETWORKS.forEach(({ key }) => {
      const { value } = checkUrl(key, form[`${key}Url`]);
      payload[`${key}Url`] = value;
      payload[`${key}Visible`] = !!value && form[`${key}Visible`];
    });
    save.mutate({ payload, snapshot: form });
  };

  const whatsapp = normalizeWhatsapp(form.whatsappNumber);
  const whatsappOk = !whatsapp.error && !errorOf('whatsappNumber');
  const allBlank = NETWORKS.every(({ key }) => form[`${key}Url`].trim() === '');

  let note = null;
  if (dirty) {
    note = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
        <Typography variant="caption" color="text.secondary">Cambios sin guardar</Typography>
      </Box>
    );
  } else if (justSaved) {
    note = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'success.main' }}>
        <Check sx={{ fontSize: 16 }} aria-hidden />
        <Typography variant="caption" sx={{ color: 'inherit' }}>Guardado hace un momento</Typography>
      </Box>
    );
  } else if (stacked) {
    note = <Typography variant="caption" color="text.secondary">Sin cambios</Typography>;
  }

  const saveButton = (
    <Button type="submit" variant="contained" fullWidth disabled={save.isPending} aria-busy={save.isPending || undefined} aria-describedby="social-save-note">
      {save.isPending ? (
        <>
          <CircularProgress size={18} thickness={5} color="inherit" sx={{ mr: 1 }} aria-hidden />
          Guardando…
        </>
      ) : (
        'Guardar'
      )}
    </Button>
  );
  const saveNote = (
    <Box id="social-save-note" role="status" sx={{ display: 'flex', justifyContent: 'center', minHeight: 18 }}>
      {note}
    </Box>
  );

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      sx={{ display: 'grid', gridTemplateColumns: stacked ? 'minmax(0, 1fr)' : 'minmax(0, 720px) 320px', gap: 6, alignItems: 'start', ...(stacked && { maxWidth: 720, pb: '96px' }) }}
    >
      <Box sx={{ minWidth: 0 }}>
        <ErrorSummary errors={summary} wrapperRef={summaryRef} detail="Corrige lo marcado para guardar. No se guardó nada todavía." />
        {saveError && (
          <Box ref={saveErrorRef} sx={{ mb: 3 }}>
            <Banner action={{ label: 'Reintentar', onClick: handleSave }}>{SAVE_ERROR}</Banner>
          </Box>
        )}
        <Box sx={{ bgcolor: 'bg.surface', border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px', p: { xs: 2, md: 3 } }}>
          {allBlank && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'text.secondary' }}>
              <InfoOutlined sx={{ fontSize: 18 }} aria-hidden />
              <Typography variant="body2" sx={{ color: 'inherit' }}>Las redes sin enlace no se muestran en la web.</Typography>
            </Box>
          )}
          {NETWORKS.map((net, index) => (
            <NetworkBlock
              key={net.key}
              net={net}
              index={index}
              form={form}
              error={errorOf(`${net.key}Url`)}
              notice={!!notices[net.key]}
              onUrl={setUrl}
              onBlur={blurField}
              onVisible={setVisible}
            />
          ))}
          <Box sx={divider}>
            <FormField
              id="social-whatsappNumber"
              label="WhatsApp"
              required
              counter="Obligatorio"
              value={form.whatsappNumber}
              onChange={(e) => {
                setForm((f) => ({ ...f, whatsappNumber: e.target.value }));
                clearServerError('whatsappNumber');
              }}
              onBlur={() => blurField('whatsappNumber')}
              error={errorOf('whatsappNumber')}
              help={<HelpWithOpen text={WHATSAPP_HELP} open={whatsappOk ? <OpenLink label="WhatsApp" href={`https://wa.me/${whatsapp.value}`} /> : null} />}
              slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'off', maxLength: 30 } }}
            />
            {errorOf('whatsappNumber') && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'tertiary' }}>{WHATSAPP_HELP}</Typography>
            )}
            {whatsappOk && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'tertiary' }}>
                Vista previa del enlace:{' '}
                <Box component="span" sx={{ color: 'text.primary', ...numeric }}>wa.me/{whatsapp.value}</Box>
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {!stacked && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {saveButton}
          {saveNote}
        </Box>
      )}
      {stacked && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: { xs: 0, md: 232 },
            right: 0,
            height: 88,
            zIndex: (t) => t.zIndex.appBar,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '6px',
            px: 2,
            bgcolor: 'bg.surface',
            borderTop: '1px solid',
            borderColor: 'border.subtle',
          }}
        >
          {saveNote}
          {saveButton}
        </Box>
      )}

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
        <span style={{ display: 'block' }}>Tienes cambios sin guardar en «Redes sociales».</span>
        <span style={{ display: 'block' }}>Si sales ahora, se pierden.</span>
      </ConfirmDialog>
    </Box>
  );
}

export default function SocialSettings() {
  const socialQ = useQuery({ queryKey: ['social-admin'], queryFn: async () => (await api.get('/social/admin')).data });

  let body;
  if (socialQ.isLoading) {
    body = (
      <Box sx={{ maxWidth: 720, bgcolor: 'bg.surface', border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px', p: { xs: 2, md: 3 } }}>
        <SkeletonRows count={4} height={72} />
      </Box>
    );
  } else if (socialQ.isError) {
    body = <ErrorState onRetry={() => socialQ.refetch()} />;
  } else {
    body = <SocialForm data={socialQ.data} />;
  }

  return (
    <>
      <PageHeader title="Redes sociales" subtitle={DESCRIPTION} />
      {body}
    </>
  );
}
