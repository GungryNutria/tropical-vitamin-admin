import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import api, { errorMessage } from '../../lib/api';
import { activeLanguages, isProtectedLanguage, textsByLanguage } from '../../lib/catalog';
import { plural } from '../../lib/langLabel';
import { useToasts } from '../../lib/useToasts';
import { useIsMobile } from '../../lib/useIsMobile';
import { numeric } from '../../theme';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import PageHeader from '../../components/PageHeader';
import { ErrorState, SkeletonRows } from '../../components/States';
import LanguagePanel from './LanguagePanel';

const get = (url) => async () => (await api.get(url)).data;

function StatusChip({ active }) {
  return active ? (
    <Chip size="small" icon={<Check />} label="Activo" sx={{ bgcolor: 'statusBg.success', color: 'success.main' }} />
  ) : (
    <Chip size="small" label="Inactivo" sx={{ bgcolor: 'neutral.chip', color: 'text.secondary' }} />
  );
}

export default function LanguageList() {
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const mobile = useIsMobile();
  const languagesQ = useQuery({ queryKey: ['languages'], queryFn: get('/languages') });
  const toursQ = useQuery({ queryKey: ['tours'], queryFn: get('/tours/all') });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: get('/categories') });
  const queries = [languagesQ, toursQ, categoriesQ];
  const loading = queries.some((q) => q.isLoading);
  const failed = !loading && queries.some((q) => q.isError);
  const ready = !loading && !failed;

  const [panel, setPanel] = useState(null); // { language } (null = nuevo)
  const [removing, setRemoving] = useState(null);


  async function remove(language) {
    setRemoving(null);
    try {
      await api.delete(`/languages/${language.id}`);
      toasts.success(`Idioma «${language.name}» eliminado`);
      ['languages', 'tours', 'categories'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    } catch (err) {
      // 409 LANGUAGE_PROTECTED: el mensaje de la API ya lo explica; el aviso persiste hasta cerrarlo.
      toasts.error(
        errorMessage(err),
        err.response?.status === 409 ? {} : { action: { label: 'Reintentar', onClick: () => remove(language) } },
      );
    }
  }

  const languages = ready ? languagesQ.data : [];
  const tours = ready ? toursQ.data : [];
  const categories = ready ? categoriesQ.data : [];
  const counts = (l) => textsByLanguage(l.id, tours, categories);

  let body;
  if (loading) body = <SkeletonRows count={4} />;
  else if (failed) body = <ErrorState title="No pudimos cargar los idiomas." onRetry={() => queries.forEach((q) => q.isError && q.refetch())} />;
  else {
    const actions = (l) => (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
        {isProtectedLanguage(l) && <Chip size="small" label="Protegido" sx={{ bgcolor: 'neutral.chip', color: 'text.secondary', mr: 0.5 }} />}
        <IconButton aria-label={`Editar «${l.name}»`} onClick={() => setPanel({ language: l })}><EditOutlined /></IconButton>
        {!isProtectedLanguage(l) && <IconButton aria-label={`Eliminar «${l.name}»`} onClick={() => setRemoving(l)}><DeleteOutline /></IconButton>}
      </Box>
    );
    const toursText = (l) => `${counts(l).tours} de ${tours.length}`;
    const categoriesText = (l) => `${counts(l).categories} de ${categories.length}`;
    body = (
      <DataTable
        label="Idiomas"
        mobile={mobile}
        rows={languages}
        getKey={(l) => l.id}
        onRowClick={(l) => setPanel({ language: l })}
        columns={[
          { key: 'name', label: 'Idioma', width: 240, render: (l) => <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{l.name}</Typography> },
          { key: 'code', label: 'Código', width: 160, render: (l) => <Typography variant="body2" color="text.secondary">{l.code}</Typography> },
          { key: 'status', label: 'Estado', width: 160, render: (l) => <StatusChip active={l.isActive} /> },
          { key: 'tours', label: 'Textos de tours', align: 'right', render: (l) => <Typography sx={{ fontSize: 14, ...numeric }}>{toursText(l)}</Typography> },
          { key: 'categories', label: 'Textos de categorías', align: 'right', render: (l) => <Typography sx={{ fontSize: 14, ...numeric }}>{categoriesText(l)}</Typography> },
          { key: 'actions', label: 'Acciones', srOnly: true, width: 210, render: actions },
        ]}
        renderCard={(l) => (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{l.name}</Typography>
                <Typography variant="body2" color="text.secondary">{l.code}</Typography>
                <StatusChip active={l.isActive} />
              </Box>
              {actions(l)}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={numeric}>
              Textos de tours: {toursText(l)} · de categorías: {categoriesText(l)}
            </Typography>
          </Box>
        )}
      />
    );
  }

  const subtitle = ready ? `${languages.length} ${plural(languages.length, 'idioma', 'idiomas')} · ${activeLanguages(languages).length} ${plural(activeLanguages(languages).length, 'activo', 'activos')}` : null;
  const removeCounts = removing ? counts(removing) : null;

  return (
    <Box>
      <PageHeader title="Idiomas" subtitle={subtitle} action={ready ? { label: 'Nuevo idioma', mobileLabel: 'Nuevo', onClick: () => setPanel({ language: null }) } : null} />
      {body}
      {ready && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Español e inglés los usa la web: no se pueden eliminar ni cambiar su código.</Typography>}

      {panel && ready && (
        <LanguagePanel
          key={panel.language?.id ?? 'nuevo'}
          language={panel.language}
          languages={languages}
          tours={tours}
          categories={categories}
          onClose={() => setPanel(null)}
          onSaved={() => setPanel(null)}
        />
      )}

      {removing && removeCounts && (
        <ConfirmDialog open title={`¿Eliminar el idioma «${removing.name}»?`} confirmLabel="Eliminar idioma" destructive onConfirm={() => remove(removing)} onClose={() => setRemoving(null)}>
          <span style={{ display: 'block' }}>
            Se borrarán para siempre {removeCounts.tours} {plural(removeCounts.tours, 'texto', 'textos')} de tours y {removeCounts.categories} de categorías en {removing.name}.
          </span>
          <span style={{ display: 'block' }}>Esta acción no se puede deshacer.</span>
        </ConfirmDialog>
      )}
    </Box>
  );
}
