import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Button, Chip, IconButton, Link, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import api, { errorMessage } from '../../lib/api';
import { categoryHasPendingTranslations, categoryLanguageStatus } from '../../lib/catalog';
import { joinList, plural } from '../../lib/langLabel';
import { useToasts } from '../../lib/useToasts';
import { useIsMobile } from '../../lib/useIsMobile';
import { numeric } from '../../theme';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import LangChips from '../../components/LangChips';
import PageHeader from '../../components/PageHeader';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/States';
import CategoryPanel from './CategoryPanel';

const get = (url) => async () => (await api.get(url)).data;

// Nombre y descripción visibles: los del español, o los datos internos si falta la traducción.
function labels(category, languages) {
  const es = languages.find((l) => l.code === 'es');
  const t = category.translations?.find((x) => x.languageId === es?.id);
  return { name: t?.name?.trim() || category.adminName, description: t?.description?.trim() || category.description };
}

export default function CategoryList() {
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const mobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const pendingOnly = params.get('pendientes') === '1';

  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: get('/categories') });
  const languagesQ = useQuery({ queryKey: ['languages'], queryFn: get('/languages') });
  const queries = [categoriesQ, languagesQ];
  const loading = queries.some((q) => q.isLoading);
  const failed = !loading && queries.some((q) => q.isError);

  const [panel, setPanel] = useState(null); // { category } (null = nueva)
  const [removing, setRemoving] = useState(null); // { category, blockedCount? }
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    if (highlightId == null) return undefined;
    const timer = setTimeout(() => setHighlightId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const closePanel = () => setPanel(null);
  const saved = (id) => {
    setPanel(null);
    setHighlightId(id);
  };

  async function remove(category) {
    const { name } = labels(category, languagesQ.data);
    setRemoving(null);
    try {
      await api.delete(`/categories/${category.id}`);
      toasts.success(`Categoría «${name}» eliminada`);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      // Datos viejos en pantalla: la API dice cuántos tours tiene (D-1) y se refresca la lista.
      if (err.response?.status === 409 && err.response.data?.code === 'CATEGORY_HAS_TOURS') {
        setRemoving({ category, blockedCount: err.response.data.tourCount });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        return;
      }
      toasts.error(`No pudimos eliminar «${name}». ${errorMessage(err)}`, { action: { label: 'Reintentar', onClick: () => remove(category) } });
    }
  }

  const askRemove = (category) => setRemoving({ category, blockedCount: category._count?.tours > 0 ? category._count.tours : 0 });

  const ready = !loading && !failed;
  const all = ready ? categoriesQ.data : [];
  const languages = ready ? languagesQ.data : [];
  const rows = pendingOnly ? all.filter((c) => categoryHasPendingTranslations(c, languages)) : all;
  const clearFilter = () => setParams({}, { replace: true });

  let body;
  if (loading) body = <SkeletonRows count={8} />;
  else if (failed) body = <ErrorState title="No pudimos cargar las categorías." onRetry={() => queries.forEach((q) => q.isError && q.refetch())} />;
  else if (all.length === 0) {
    body = <EmptyState icon={null} title="Aún no hay categorías." description="Crea la primera para organizar tus tours." action={{ label: 'Crear la primera', onClick: () => setPanel({ category: null }) }} />;
  } else if (rows.length === 0) {
    body = <EmptyState icon={null} title="Ninguna categoría tiene pendientes." description="Todas tienen su nombre y descripción en los idiomas activos." action={{ label: 'Quitar filtros', variant: 'outlined', onClick: clearFilter }} />;
  } else {
    const actions = (c) => {
      const { name } = labels(c, languages);
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <IconButton aria-label={`Editar «${name}»`} onClick={() => setPanel({ category: c })}><EditOutlined /></IconButton>
          <IconButton aria-label={`Eliminar «${name}»`} onClick={() => askRemove(c)}><DeleteOutline /></IconButton>
        </Box>
      );
    };
    const nameCell = (c) => {
      const { name } = labels(c, languages);
      return (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, lineHeight: '20px' }}>{name}</Typography>
          <Typography noWrap variant="caption" color="text.secondary" component="p">{c.adminName}</Typography>
        </Box>
      );
    };
    body = (
      <DataTable
        label="Categorías"
        mobile={mobile}
        rows={rows}
        getKey={(c) => c.id}
        highlightId={highlightId}
        onRowClick={(c) => setPanel({ category: c })}
        columns={[
          { key: 'name', label: 'Categoría', width: 240, render: nameCell },
          { key: 'description', label: 'Descripción', render: (c) => <Typography noWrap variant="body2" color="text.secondary" title={labels(c, languages).description}>{labels(c, languages).description}</Typography> },
          { key: 'tours', label: 'Tours', width: 80, align: 'right', render: (c) => <Typography sx={{ fontSize: 14, ...numeric }}>{c._count?.tours ?? 0}</Typography> },
          { key: 'languages', label: 'Idiomas', width: 200, render: (c) => <Box sx={{ pl: 2 }}><LangChips status={categoryLanguageStatus(c, languages)} highlighted={highlightId === c.id} /></Box> },
          { key: 'actions', label: 'Acciones', srOnly: true, width: 112, render: actions },
        ]}
        renderCard={(c) => (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                {nameCell(c)}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{labels(c, languages).description}</Typography>
              </Box>
              {actions(c)}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={numeric}>{c._count?.tours ?? 0} {plural(c._count?.tours ?? 0, 'tour', 'tours')}</Typography>
              <LangChips status={categoryLanguageStatus(c, languages)} highlighted={highlightId === c.id} />
            </Box>
          </Box>
        )}
      />
    );
  }

  const count = ready && all.length > 0 ? (pendingOnly ? `${rows.length} de ${all.length} categorías` : `${all.length} ${plural(all.length, 'categoría', 'categorías')}`) : null;
  const header = <PageHeader title="Categorías" subtitle={count} action={ready && all.length > 0 ? { label: 'Nueva categoría', mobileLabel: 'Nueva', onClick: () => setPanel({ category: null }) } : null} />;

  const removed = removing?.category;
  const removedName = removed && languages.length ? labels(removed, languages).name : removed?.adminName;
  const translated = removed ? joinList((removed.translations || []).map((t) => t.language?.name || languages.find((l) => l.id === t.languageId)?.name).filter(Boolean)) : '';

  return (
    <Box>
      {header}
      {pendingOnly && ready && all.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip variant="outlined" label="Con pendientes" onClick={clearFilter} onDelete={clearFilter} deleteIcon={<Close />} aria-label="Quitar filtro Con pendientes" sx={{ height: 28, borderColor: 'border.control' }} />
          <Button variant="text" onClick={clearFilter}>Quitar filtros</Button>
        </Box>
      )}
      {body}

      {panel && ready && (
        <CategoryPanel key={panel.category?.id ?? 'nueva'} category={panel.category} categories={all} languages={languages} onClose={closePanel} onSaved={saved} />
      )}

      {removed && removing.blockedCount > 0 && (
        <ConfirmDialog open title={`No se puede eliminar «${removedName}»`} cancelLabel="Entendido" onClose={() => setRemoving(null)}>
          <span style={{ display: 'block' }}>
            «{removedName}» tiene {removing.blockedCount} {plural(removing.blockedCount, 'tour', 'tours')}. Muévelos a otra categoría antes de eliminarla.
          </span>
          <span style={{ display: 'block' }}>Así no se borra ningún tour por accidente.</span>
          <Link component={RouterLink} to={`/tours?categoria=${removed.id}`} sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>
            Ver {removing.blockedCount === 1 ? 'su tour' : `sus ${removing.blockedCount} tours`}
          </Link>
        </ConfirmDialog>
      )}
      {removed && !removing.blockedCount && (
        <ConfirmDialog open title={`¿Eliminar la categoría «${removedName}»?`} confirmLabel="Eliminar" destructive onConfirm={() => remove(removed)} onClose={() => setRemoving(null)}>
          <span style={{ display: 'block' }}>Esta categoría no tiene tours.{translated ? ` Se borrará con sus traducciones (${translated}).` : ''}</span>
          <span style={{ display: 'block' }}>Esta acción no se puede deshacer.</span>
        </ConfirmDialog>
      )}
    </Box>
  );
}
