import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Switch, Typography } from '@mui/material';
import api, { errorMessage } from '../../lib/api';
import { isDuplicateLanguageCode, isProtectedLanguage, normalizeLanguageCode } from '../../lib/catalog';
import { plural } from '../../lib/langLabel';
import { useToasts } from '../../lib/useToasts';
import Banner from '../../components/Banner';
import ErrorSummary from '../../components/ErrorSummary';
import FormField from '../../components/FormField';
import SidePanel from '../../components/SidePanel';

const blank = (v) => !String(v ?? '').trim();

// Un tour o categoría queda pendiente en el idioma si no tiene el texto completo (misma regla que catalog.js).
const pendingIn = (items, languageId, fields) =>
  items.filter((item) => {
    const t = item.translations?.find((x) => x.languageId === languageId);
    return !t || fields.some((f) => blank(t[f]));
  }).length;

// Crear y editar un idioma. `language` = null para crear (nace apagado: un idioma activo vuelve obligatorio su texto
// en todos los tours y categorías). `tours` y `categories` calculan el aviso de activar.
export default function LanguagePanel({ language, languages, tours, categories, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const protectedLang = !!language && isProtectedLanguage(language);
  const initial = { code: language?.code ?? '', name: language?.name ?? '', isActive: language?.isActive ?? false };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const alertRef = useRef(null);
  const dirty = Object.keys(initial).some((k) => initial[k] !== form[k]);
  const focusAlert = () => setTimeout(() => alertRef.current?.focus(), 0);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  async function save() {
    const found = [];
    const code = normalizeLanguageCode(form.code);
    if (!code) found.push({ id: 'lang-code', message: 'Escribe el código del idioma.' });
    else if (isDuplicateLanguageCode(code, languages, language?.id)) found.push({ id: 'lang-code', message: `Ya existe un idioma con el código «${code}».` });
    if (blank(form.name)) found.push({ id: 'lang-name', message: 'Escribe el nombre del idioma.' });
    setErrors(Object.fromEntries(found.map((e) => [e.id, e.message])));
    setFailure(null);
    if (found.length) {
      focusAlert();
      return;
    }
    setSaving(true);
    // Al editar solo se envía isActive si cambió: un PATCH con isActive en es/en sin cambio da 409.
    const body = { code, name: form.name.trim() };
    if (!language || form.isActive !== language.isActive) body.isActive = form.isActive;
    try {
      if (language) await api.patch(`/languages/${language.id}`, body);
      else await api.post('/languages', body);
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toasts.success(`Idioma «${body.name}» guardado`);
      onSaved(body.name);
    } catch (err) {
      setFailure(errorMessage(err, { duplicateHint: true }));
      focusAlert();
    } finally {
      setSaving(false);
    }
  }

  const wasActive = !!language?.isActive;
  const turningOff = wasActive && !form.isActive;
  const turningOn = !wasActive && form.isActive;
  const pendingTours = turningOn ? pendingIn(tours, language?.id, ['title', 'description']) : 0;
  const pendingCategories = turningOn ? pendingIn(categories, language?.id, ['name', 'description']) : 0;
  const shownName = form.name.trim() || 'este idioma';

  return (
    <SidePanel open title={language ? 'Editar idioma' : 'Nuevo idioma'} onClose={onClose} onSave={save} saving={saving} dirty={dirty} name={language?.name}>
      <ErrorSummary errors={Object.entries(errors).map(([id, label]) => ({ id, label }))} wrapperRef={alertRef} />
      {failure && (
        <Box ref={alertRef} tabIndex={-1} sx={{ outline: 'none', mb: 3 }}>
          <Banner title="No se guardó" action={{ label: 'Reintentar', onClick: save }}>{failure}</Banner>
        </Box>
      )}
      {protectedLang && (
        <Typography id="lang-protected" variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Lo usa la web: no se puede desactivar ni cambiar su código.
        </Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <FormField
          id="lang-code"
          label="Código"
          required
          value={form.code}
          disabled={protectedLang}
          onChange={(e) => set('code', e.target.value)}
          error={errors['lang-code']}
          help={protectedLang ? 'Lo usa la web; no se puede cambiar.' : '2 letras, p. ej. fr'}
        />
        <FormField id="lang-name" label="Nombre" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors['lang-name']} help="Como lo verá el equipo. Ej.: Français" />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, p: 2, bgcolor: 'bg.base', border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px' }}>
          <Box>
            <Typography id="lang-active-title" variant="subtitle2" component="p" sx={{ color: 'text.primary', fontSize: 15 }}>Idioma activo</Typography>
            <Typography id="lang-active-help" variant="body2" color="text.secondary">
              Al activar un idioma, cada tour y categoría necesita su texto en él.
            </Typography>
          </Box>
          <Switch
            checked={form.isActive}
            disabled={protectedLang}
            onChange={(e) => set('isActive', e.target.checked)}
            slotProps={{ input: { id: 'lang-active', role: 'switch', 'aria-labelledby': 'lang-active-title', 'aria-describedby': protectedLang ? 'lang-protected' : 'lang-active-help' } }}
          />
        </Box>
        {/* Consecuencia real antes de guardar (REQ-27, AC-24); inline, sin segundo diálogo. */}
        {turningOff && (
          <Banner severity="warning" title="La web no cambia; este idioma deja de contar como pendiente.">
            Ya no es obligatorio al guardar un tour o una categoría. Sus textos se conservan.
          </Banner>
        )}
        {turningOn && (
          <Banner
            severity="warning"
            title={`Al activarlo, ${pendingTours} ${plural(pendingTours, 'tour', 'tours')} y ${pendingCategories} ${plural(pendingCategories, 'categoría', 'categorías')} ${plural(pendingTours + pendingCategories, 'queda pendiente', 'quedan pendientes')} en ${shownName}.`}
          >
            No podrás guardar un tour o una categoría sin su texto en {shownName}.
          </Banner>
        )}
      </Box>
    </SidePanel>
  );
}
