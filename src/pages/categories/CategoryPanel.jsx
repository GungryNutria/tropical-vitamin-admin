import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Chip, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import api, { errorMessage } from '../../lib/api';
import { activeLanguages, isDuplicateAdminName, orderLanguages } from '../../lib/catalog';
import { joinList, langLabel } from '../../lib/langLabel';
import { useToasts } from '../../lib/useToasts';
import Banner from '../../components/Banner';
import ErrorSummary from '../../components/ErrorSummary';
import FormField from '../../components/FormField';
import SidePanel from '../../components/SidePanel';

const blank = (v) => !String(v ?? '').trim();
const sameText = (a, b) => (a?.name ?? '') === (b?.name ?? '') && (a?.description ?? '') === (b?.description ?? '');

// Estado de una parte del guardado (D-2): saved | failed; sin valor = aún no se intentó.
function PartChip({ state, fallback }) {
  if (state === 'saved') return <Chip size="small" icon={<Check />} label="Guardado" sx={{ bgcolor: 'statusBg.success', color: 'success.main' }} />;
  if (state === 'failed') return <Chip size="small" label="No se guardó" sx={{ bgcolor: 'statusBg.danger', color: 'error.main' }} />;
  return fallback || null;
}

const textChip = (complete) => (
  <Chip size="small" label={complete ? 'Completo' : 'Pendiente'} sx={complete ? { bgcolor: 'neutral.chip' } : { bgcolor: 'statusBg.warning', color: 'warning.main' }} />
);

// Un solo lugar para crear y editar (REQ-20). Guarda por partes y reintenta solo lo fallido (REQ-21, AC-20).
// `category` = null para crear. Las traducciones existentes vienen en category.translations.
export default function CategoryPanel({ category, categories, languages: unorderedLanguages, onClose, onSaved }) {
  const languages = useMemo(() => orderLanguages(unorderedLanguages), [unorderedLanguages]);
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const active = activeLanguages(languages);
  const activeIds = new Set(active.map((l) => l.id));

  const initial = {
    adminName: category?.adminName ?? '',
    description: category?.description ?? '',
    texts: Object.fromEntries(
      languages.map((l) => {
        const t = category?.translations?.find((x) => x.languageId === l.id);
        return [l.id, { name: t?.name ?? '', description: t?.description ?? '' }];
      }),
    ),
  };
  const [form, setForm] = useState(initial);
  // Lo último guardado en la API (base para saber qué cambió) y el id (se conoce tras crear).
  const [base, setBase] = useState({
    id: category?.id ?? null,
    data: category ? { adminName: initial.adminName, description: initial.description } : null,
    texts: Object.fromEntries((category?.translations ?? []).map((t) => [t.languageId, { name: t.name, description: t.description }])),
  });
  const [parts, setParts] = useState({});
  const [errors, setErrors] = useState({});
  const [partial, setPartial] = useState(null);
  const [saving, setSaving] = useState(false);
  const alertRef = useRef(null);

  const dataChanged = !base.data || base.data.adminName !== form.adminName || base.data.description !== form.description;
  const textChanged = (id) => {
    const now = form.texts[id];
    const was = base.texts[id];
    return was ? !sameText(was, now) : !blank(now.name) || !blank(now.description);
  };
  // Una categoría nueva solo cuenta como "con cambios" si ya se escribió algo.
  const dataDirty = base.data ? dataChanged : !blank(form.adminName) || !blank(form.description);
  const dirty = dataDirty || languages.some((l) => textChanged(l.id)) || Object.values(parts).includes('failed');

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setText = (id, field, value) => setForm((f) => ({ ...f, texts: { ...f.texts, [id]: { ...f.texts[id], [field]: value } } }));

  function validate() {
    const found = [];
    if (blank(form.adminName)) found.push({ id: 'cat-adminName', label: 'Nombre admin', message: 'Escribe el nombre admin.' });
    else if (isDuplicateAdminName(form.adminName, categories, base.id)) found.push({ id: 'cat-adminName', label: 'Nombre admin', message: 'Ya existe una categoría con ese nombre.' });
    if (blank(form.description)) found.push({ id: 'cat-description', label: 'Descripción interna', message: 'Escribe la descripción interna.' });
    active.forEach((l) => {
      if (blank(form.texts[l.id].name)) found.push({ id: `cat-name-${l.id}`, label: `Nombre visible (${l.name})`, message: `Escribe el nombre en ${langLabel(l)}.` });
      if (blank(form.texts[l.id].description)) found.push({ id: `cat-desc-${l.id}`, label: `Descripción visible (${l.name})`, message: `Escribe la descripción en ${langLabel(l)}.` });
    });
    return found;
  }

  const focusAlert = () => setTimeout(() => alertRef.current?.focus(), 0);

  async function save() {
    const b = { id: base.id, data: base.data, texts: { ...base.texts } };
    const found = validate();
    setErrors(Object.fromEntries(found.map((e) => [e.id, e.message])));
    setPartial(null);
    if (found.length) {
      focusAlert();
      return;
    }
    setSaving(true);
    const next = { ...parts };
    const failures = [];
    const savedNames = [];
    const body = { adminName: form.adminName.trim(), description: form.description.trim() };

    // 1. Datos. Si falla, no se envían traducciones (no hay id o los datos no son válidos).
    let dataOk = true;
    if (dataChanged || parts.data === 'failed') {
      try {
        if (b.id) await api.patch(`/categories/${b.id}`, body);
        else b.id = (await api.post('/categories', body)).data.id;
        b.data = { adminName: form.adminName, description: form.description };
        next.data = 'saved';
        savedNames.push('los datos');
      } catch (err) {
        dataOk = false;
        next.data = 'failed';
        failures.push({ name: 'los datos', reason: errorMessage(err, { duplicateHint: true }) });
      }
    }

    // 2. Una petición por idioma con cambios (o que falló antes), en el orden de `languages`.
    if (dataOk) {
      for (const l of languages) {
        if (!textChanged(l.id) && parts[l.id] !== 'failed') continue;
        const text = { name: form.texts[l.id].name.trim(), description: form.texts[l.id].description.trim() };
        try {
          if (b.texts[l.id]) await api.patch(`/categories/${b.id}/translations/${l.id}`, text);
          else await api.post(`/categories/${b.id}/translations`, { languageId: l.id, ...text });
          b.texts[l.id] = { name: form.texts[l.id].name, description: form.texts[l.id].description };
          next[l.id] = 'saved';
          savedNames.push(l.name);
        } catch (err) {
          next[l.id] = 'failed';
          failures.push({ name: l.name, reason: errorMessage(err, { duplicateHint: true }) });
        }
      }
    }

    setParts(next);
    setBase(b);
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    if (failures.length) {
      setPartial({ savedNames, failures });
      focusAlert();
      return;
    }
    toasts.success(`Categoría «${form.texts[languages.find((l) => l.code === 'es')?.id]?.name || form.adminName}» guardada`);
    onSaved(b.id);
  }

  const summary = Object.entries(errors).map(([id, message]) => ({ id, label: message }));
  const first = languages.find((l) => l.code === 'es');
  const title = category ? 'Editar categoría' : 'Nueva categoría';

  return (
    <SidePanel open title={title} onClose={onClose} onSave={save} saving={saving} dirty={dirty} name={form.texts[first?.id]?.name || form.adminName}>
      <ErrorSummary errors={summary} wrapperRef={alertRef} />
      {partial && (
        <Box ref={alertRef} tabIndex={-1} sx={{ outline: 'none', mb: 3 }}>
          <Banner title={partial.savedNames.length ? 'No se guardó todo' : 'No se guardó'} action={{ label: 'Reintentar', onClick: save }}>
            {partial.savedNames.length > 0 && <span style={{ display: 'block' }}>Se guardaron {joinList(partial.savedNames)}.</span>}
            {partial.failures.map((f) => (
              <span key={f.name} style={{ display: 'block' }}>No se guardó {f.name}: {f.reason}</span>
            ))}
          </Banner>
        </Box>
      )}

      <Box component="section" aria-labelledby="cat-datos" sx={{ display: 'grid', gap: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography id="cat-datos" variant="h2" component="h3">Datos</Typography>
          <PartChip state={parts.data} />
        </Box>
        <FormField
          id="cat-adminName"
          label="Nombre admin"
          required
          value={form.adminName}
          onChange={(e) => setField('adminName', e.target.value)}
          error={errors['cat-adminName']}
          help="Solo lo ves tú en el admin. Ej.: snorkel-tours"
        />
        <FormField
          id="cat-description"
          label="Descripción interna"
          required
          multiline
          minRows={2}
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          error={errors['cat-description']}
        />
      </Box>

      <Box component="section" aria-labelledby="cat-traducciones" sx={{ display: 'grid', gap: 2.5, mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'border.subtle' }}>
        <Box>
          <Typography id="cat-traducciones" variant="h2" component="h3">Traducciones</Typography>
          <Typography variant="body2" color="text.secondary">Obligatorias en todos los idiomas activos.</Typography>
        </Box>
        {languages.map((l) => {
          const text = form.texts[l.id];
          const required = activeIds.has(l.id);
          const complete = !blank(text.name) && !blank(text.description);
          const chip = <PartChip state={parts[l.id]} fallback={required ? textChip(complete) : <Chip size="small" label="Opcional" sx={{ bgcolor: 'neutral.chip' }} />} />;
          return (
            <Box key={l.id} sx={{ display: 'grid', gap: 2.5 }}>
              <FormField
                id={`cat-name-${l.id}`}
                label={`Nombre visible (${l.name})`}
                required={required}
                counter={chip}
                value={text.name}
                onChange={(e) => setText(l.id, 'name', e.target.value)}
                error={errors[`cat-name-${l.id}`]}
              />
              <FormField
                id={`cat-desc-${l.id}`}
                label={`Descripción visible (${l.name})`}
                required={required}
                multiline
                minRows={2}
                value={text.description}
                onChange={(e) => setText(l.id, 'description', e.target.value)}
                error={errors[`cat-desc-${l.id}`]}
              />
            </Box>
          );
        })}
      </Box>
    </SidePanel>
  );
}
