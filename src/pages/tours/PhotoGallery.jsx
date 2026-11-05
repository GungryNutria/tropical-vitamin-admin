import { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonBase, Chip, LinearProgress, Menu, MenuItem, Typography } from '@mui/material';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import DragIndicator from '@mui/icons-material/DragIndicator';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import UploadOutlined from '@mui/icons-material/UploadOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import api, { API_URL } from '../../lib/api';
import { useIsMobile } from '../../lib/useIsMobile';
import { numeric } from '../../theme';
import ConfirmDialog from '../../components/ConfirmDialog';

const MAX_PHOTOS = 8;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 10 * 1024 * 1024;
const FORMATS = 'JPG, PNG, WebP o GIF';
const link = { color: 'primary.main', textDecoration: 'underline', fontSize: 14, fontWeight: 600, borderRadius: '4px', px: 0.5, minHeight: { xs: 44, md: 0 }, minWidth: { xs: 44, md: 0 } };
const srOnly = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };
const overlayButton = { bgcolor: 'bg.base', '&:hover': { bgcolor: 'bg.raised' } };

const extensionOf = (name) => (name.includes('.') ? name.split('.').pop().toUpperCase() : '');
const photoUrl = (filename) => `${API_URL}/upload/${filename.split('/').pop()}`;

// Antes de subir: tipo y peso. Devuelve { title, detail } o null si el archivo sirve.
// El API rechaza con 413 un archivo de exactamente 10 MB, así que el límite es estricto (<).
function validate(file) {
  if (!ACCEPT.includes(file.type)) {
    const ext = extensionOf(file.name);
    return { title: ext ? `Ese archivo es ${ext}.` : 'Ese archivo no es una imagen.', detail: `Elige un ${FORMATS}.` };
  }
  if (!(file.size < MAX_BYTES)) {
    return { title: 'Esa foto pesa más de 10 MB.', detail: 'Elige una más ligera.' };
  }
  return null;
}

// Vista previa 3:2 de la portada (288×192): la tarjeta de la web la recorta con `cover`.
const PREVIEW = { width: '100%', aspectRatio: '3 / 2', borderRadius: '6px', overflow: 'hidden', bgcolor: 'bg.base' };

export function CoverPreview({ filename }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!filename) {
    return (
      <Box sx={{ ...PREVIEW, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, textAlign: 'center', px: 2, border: '1px solid', borderColor: 'border.subtle' }}>
        <ImageOutlined sx={{ color: 'tertiary', fontSize: 32 }} aria-hidden />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Sin foto</Typography>
        <Typography variant="caption" color="text.secondary">Agrega fotos en Fotos del tour.</Typography>
      </Box>
    );
  }
  const src = photoUrl(filename);
  if (failedSrc === src) {
    return (
      <Box sx={{ ...PREVIEW, display: 'grid', placeItems: 'center', bgcolor: 'bg.raised' }} data-testid="photo-preview-neutral">
        <BrokenImageOutlined sx={{ color: 'tertiary', fontSize: 32 }} aria-hidden />
      </Box>
    );
  }
  return (
    <Box sx={PREVIEW}>
      <img src={src} alt="Portada del tour" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setFailedSrc(src)} />
    </Box>
  );
}

function PhotoImage({ filename }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const src = photoUrl(filename);
  if (failedSrc === src) {
    return (
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }} data-testid="photo-tile-neutral">
        <BrokenImageOutlined sx={{ color: 'tertiary', fontSize: 32 }} aria-hidden />
      </Box>
    );
  }
  return <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setFailedSrc(src)} />;
}

const tileSx = { position: 'relative', listStyle: 'none', aspectRatio: '3 / 2', borderRadius: '8px', overflow: 'hidden', bgcolor: 'bg.raised' };

function PendingTile({ item, full, onRemove, onRetry }) {
  if (item.status === 'uploading') {
    return (
      <Box component="li" sx={{ ...tileSx, minHeight: { xs: 136, md: 0 }, aspectRatio: { xs: 'auto', md: '3 / 2' }, bgcolor: 'bg.base', border: '1px solid', borderColor: 'border.subtle', p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{item.name}</Typography>
        <LinearProgress
          variant="determinate"
          value={item.progress}
          aria-label={`Avance de la subida de ${item.name}`}
          sx={{ height: 6, borderRadius: 3, bgcolor: 'neutral.chip', '& .MuiLinearProgress-bar': { bgcolor: 'text.primary' } }}
        />
        <Typography variant="caption" color="text.secondary" sx={numeric}>Subiendo… {item.progress} %</Typography>
      </Box>
    );
  }
  return (
    <Box component="li" sx={{ ...tileSx, minHeight: { xs: 136, md: 0 }, aspectRatio: { xs: 'auto', md: '3 / 2' }, bgcolor: 'statusBg.danger', border: '1px solid', borderColor: 'error.main' }}>
      <Box role="alert" sx={{ height: '100%', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
          <ErrorOutline sx={{ color: 'error.main', fontSize: 20, flexShrink: 0 }} aria-hidden />
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{item.name}</Typography>
        </Box>
        <Typography variant="caption" component="p">{item.title} {item.detail}</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 'auto' }}>
          {item.status === 'failed' && (
            <ButtonBase onClick={onRetry} disabled={full} sx={{ ...link, '&.Mui-disabled': { color: 'text.disabled' } }}>Reintentar</ButtonBase>
          )}
          <ButtonBase onClick={onRemove} sx={link} aria-label={`Quitar ${item.name}`}>Quitar</ButtonBase>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Fotos del tour (REQ-13 a REQ-18). `value` es la lista de nombres de archivo del formulario, en orden
 * (la primera es la portada). Reordenar y quitar llaman a `onChange(siguiente)`; cada subida terminada llama a
 * `onAdd(nombre)` (las subidas corren en paralelo y terminan en cualquier orden). Las casillas que suben,
 * rechazadas o con error de red viven aquí y no forman parte de `value`. Nada llega al API hasta que se
 * guarda el tour (REQ-19): aquí solo se suben archivos, sin `name`, para que cada uno tenga nombre único.
 */
export default function PhotoGallery({ value, onChange, onAdd, onUploadingChange }) {
  const inputRef = useRef(null);
  const addRef = useRef(null);
  const focusRef = useRef(null);
  const controllers = useRef(new Map());
  const nextId = useRef(0);
  const [pending, setPending] = useState([]); // { id, file, name, status: 'uploading' | 'invalid' | 'failed', progress, title, detail }
  const [overflow, setOverflow] = useState(null); // { fit, dropped }
  const [announcement, setAnnouncement] = useState('');
  const [menu, setMenu] = useState(null); // { index, anchor }
  const [removing, setRemoving] = useState(null); // índice de la foto que se pide eliminar
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [dropping, setDropping] = useState(false);
  const mobile = useIsMobile();
  const canDrag = useMediaQuery('(min-width: 1200px) and (pointer: fine)', { noSsr: true });

  const uploading = pending.filter((p) => p.status === 'uploading').length;
  const used = value.length + uploading;
  const full = used >= MAX_PHOTOS;
  const room = MAX_PHOTOS - used;

  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((c) => c.abort());
  }, []);

  useEffect(() => {
    onUploadingChange(uploading > 0);
  }, [uploading, onUploadingChange]);

  // El foco sigue a la foto movida (o va a la siguiente si se eliminó): se pide en el gesto y se cumple al pintar.
  useEffect(() => {
    const target = focusRef.current;
    if (!target) return;
    focusRef.current = null;
    (target === 'add' ? addRef.current : document.getElementById(`photo-actions-${target}`))?.focus();
  }, [value]);

  const patch = (id, changes) => setPending((list) => list.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  const drop = (id) => setPending((list) => list.filter((p) => p.id !== id));

  const start = async (id, file) => {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    patch(id, { status: 'uploading', progress: 0 });
    try {
      const formData = new FormData();
      formData.append('file', file); // sin `name`: el API asigna un nombre único
      const { data } = await api.post('/upload', formData, {
        signal: controller.signal,
        onUploadProgress: (e) => e.total && patch(id, { progress: Math.round((e.loaded / e.total) * 100) }),
      });
      drop(id);
      onAdd(String(data.url).split('/').pop());
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err?.response?.status === 413) patch(id, { status: 'invalid', title: 'Esa foto pesa más de 10 MB.', detail: 'Elige una más ligera.' });
      else patch(id, { status: 'failed', title: 'No se pudo subir.', detail: '' });
    } finally {
      controllers.current.delete(id);
    }
  };

  // Cada archivo se valida por separado; los que no caben se descartan y se avisa cuántos (REQ-15, REQ-16).
  const choose = (files) => {
    if (!files.length) return;
    let slots = room;
    let dropped = 0;
    const added = [];
    files.forEach((file) => {
      const invalid = validate(file);
      if (invalid) {
        added.push({ id: ++nextId.current, file, name: file.name, status: 'invalid', progress: 0, ...invalid });
      } else if (slots > 0) {
        slots -= 1;
        added.push({ id: ++nextId.current, file, name: file.name, status: 'uploading', progress: 0 });
      } else {
        dropped += 1;
      }
    });
    setOverflow(dropped > 0 ? { fit: Math.max(room, 0), dropped } : null);
    setPending((list) => [...list, ...added]);
    added.filter((p) => p.status === 'uploading').forEach((p) => start(p.id, p.file));
  };

  const pick = () => inputRef.current?.click();

  const announceMove = (position) => setAnnouncement(`Foto movida a la posición ${position} de ${value.length}.`);

  const move = (from, to) => {
    if (to < 0 || to >= value.length || to === from) return;
    const next = [...value];
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    focusRef.current = photo;
    onChange(next);
    announceMove(to + 1);
  };

  const confirmRemove = () => {
    const index = removing;
    setRemoving(null);
    const next = value.filter((_, i) => i !== index);
    focusRef.current = next[index] ?? next[index - 1] ?? 'add';
    onChange(next);
    setAnnouncement(`Foto eliminada. Quedan ${next.length} de ${MAX_PHOTOS}.`);
  };

  const cancelRemove = () => {
    const name = value[removing];
    setRemoving(null);
    setTimeout(() => document.getElementById(`photo-actions-${name}`)?.focus(), 0);
  };

  const dropFiles = {
    onDragOver: (e) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      setDropping(true);
    },
    onDragLeave: () => setDropping(false),
    onDrop: (e) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      setDropping(false);
      if (!full) choose(Array.from(e.dataTransfer.files));
    },
  };

  const empty = value.length === 0 && pending.length === 0;
  const addButton = (
    <Button ref={addRef} variant="outlined" onClick={pick} disabled={full} aria-describedby={full ? 'gallery-full' : undefined} sx={{ flexShrink: 0 }}>
      Agregar fotos
    </Button>
  );
  const zoneBorder = dropping ? 'primary.main' : 'border.control';

  let footer;
  if (empty) {
    footer = (
      <Box
        {...(canDrag ? dropFiles : {})}
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center', py: 4, px: 2, border: '1px dashed', borderColor: zoneBorder, borderRadius: '8px', bgcolor: dropping ? 'bg.raised' : 'bg.base' }}
      >
        <UploadOutlined sx={{ color: 'text.secondary', fontSize: 28 }} aria-hidden />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Este tour no tiene fotos.</Typography>
        {addButton}
        <Typography variant="caption" color="text.secondary">{FORMATS} · menos de 10 MB cada una</Typography>
      </Box>
    );
  } else if (full) {
    footer = (
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' } }}>
        {addButton}
        <Typography id="gallery-full" variant="caption" color="text.secondary">Llegaste al máximo de {MAX_PHOTOS} fotos. Elimina una para agregar otra.</Typography>
      </Box>
    );
  } else if (canDrag) {
    footer = (
      <Box
        {...dropFiles}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, border: '1px dashed', borderColor: zoneBorder, borderRadius: '8px', bgcolor: dropping ? 'bg.raised' : 'bg.base' }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Suelta aquí tus fotos o elige archivos</Typography>
          <Typography variant="caption" color="text.secondary">{FORMATS} · menos de 10 MB cada una</Typography>
        </Box>
        {addButton}
      </Box>
    );
  } else {
    footer = (
      <Box>
        <Button ref={addRef} variant="outlined" onClick={pick} fullWidth>Agregar fotos</Button>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>{FORMATS} · menos de 10 MB cada una</Typography>
      </Box>
    );
  }

  const photoLabel = (index) => `Foto ${index + 1} de ${value.length}${index === 0 ? ', portada' : ''}`;
  const menuIndex = menu?.index;

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ACCEPT.join(',')}
        aria-label="Elegir fotos"
        onChange={(e) => {
          choose(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography id="photos-title" variant="h2" component="h2">Fotos del tour</Typography>
        <Typography variant="caption" color="text.secondary" sx={numeric} role="status">
          {value.length} de {MAX_PHOTOS} fotos · Recomendado: 5 o 6
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 3 }}>
        La primera es la portada: es la que se ve en la tarjeta de la web. {canDrag ? 'Arrastra o usa Acciones' : 'Usa Acciones'} para cambiar el orden.
      </Typography>

      {(value.length > 0 || pending.length > 0) && (
        <Box
          component="ul"
          aria-labelledby="photos-title"
          sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: { xs: '12px', md: '16px' }, m: 0, mb: 2, p: 0, listStyle: 'none' }}
        >
          {value.map((filename, index) => (
            <Box
              component="li"
              key={filename}
              id={`photo-tile-${filename}`}
              tabIndex={0}
              aria-label={photoLabel(index)}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              sx={{
                ...tileSx,
                opacity: dragIndex === index ? 0.5 : 1,
                outline: dragIndex !== null && overIndex === index && dragIndex !== index ? '2px solid' : undefined,
                outlineColor: 'primary.main',
              }}
            >
              <PhotoImage filename={filename} />
              <Box sx={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {canDrag ? (
                  <Box
                    draggable
                    aria-hidden
                    data-testid="photo-handle"
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(index));
                      e.dataTransfer.setDragImage(e.currentTarget.closest('li'), 20, 20);
                      setDragIndex(index);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    sx={{ ...overlayButton, width: 40, height: 40, display: 'grid', placeItems: 'center', border: '1px solid', borderColor: 'border.control', borderRadius: '6px', cursor: 'grab', color: 'text.primary' }}
                  >
                    <DragIndicator fontSize="small" />
                  </Box>
                ) : (
                  <span />
                )}
                <Button
                  id={`photo-actions-${filename}`}
                  variant="outlined"
                  aria-label={`Acciones de la foto ${index + 1}`}
                  aria-haspopup="menu"
                  aria-expanded={menuIndex === index ? 'true' : undefined}
                  onClick={(e) => setMenu({ index, anchor: e.currentTarget })}
                  endIcon={mobile ? undefined : <KeyboardArrowDown />}
                  sx={{ ...overlayButton, ...(mobile && { minWidth: 44, width: 44, p: 0 }) }}
                >
                  {mobile ? <MoreHoriz aria-hidden /> : 'Acciones'}
                </Button>
              </Box>
              {index === 0 && (
                <Chip size="small" label="Portada" sx={{ position: 'absolute', left: 8, bottom: 8, bgcolor: 'text.primary', color: 'bg.base' }} />
              )}
            </Box>
          ))}
          {pending.map((item) => (
            <PendingTile
              key={item.id}
              item={item}
              full={full}
              onRemove={() => {
                controllers.current.get(item.id)?.abort();
                drop(item.id);
              }}
              onRetry={() => start(item.id, item.file)}
            />
          ))}
        </Box>
      )}

      {overflow && (
        <Typography variant="caption" component="p" role="status" sx={{ mb: 1.5, color: 'warning.main' }}>
          Solo caben {overflow.fit} {overflow.fit === 1 ? 'foto más' : 'fotos más'}; {overflow.dropped} no se {overflow.dropped === 1 ? 'agregó' : 'agregaron'}.
        </Typography>
      )}
      {footer}
      <Box role="status" aria-live="polite" sx={srOnly}>{announcement}</Box>

      <Menu
        open={!!menu}
        anchorEl={menu?.anchor}
        onClose={() => setMenu(null)}
        slotProps={{ list: { 'aria-label': menu ? `Acciones de la foto ${menu.index + 1}` : undefined } }}
      >
        <MenuItem disabled={menuIndex === 0} onClick={() => { setMenu(null); move(menuIndex, 0); }}>Hacer portada</MenuItem>
        <MenuItem disabled={menuIndex === 0} onClick={() => { setMenu(null); move(menuIndex, menuIndex - 1); }}>Mover antes</MenuItem>
        <MenuItem disabled={menuIndex === value.length - 1} onClick={() => { setMenu(null); move(menuIndex, menuIndex + 1); }}>Mover después</MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { setRemoving(menuIndex); setMenu(null); }}>Eliminar</MenuItem>
      </Menu>

      <ConfirmDialog
        open={removing !== null}
        title="¿Eliminar esta foto?"
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmRemove}
        onClose={cancelRemove}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {removing !== null && value[removing] && (
            <Box sx={{ width: 96, flexShrink: 0, aspectRatio: '3 / 2', borderRadius: '4px', overflow: 'hidden', position: 'relative', bgcolor: 'bg.base' }}>
              <PhotoImage filename={value[removing]} />
            </Box>
          )}
          <Box>
            <span style={{ display: 'block' }}>Se quita del tour al guardar.</span>
            {removing === 0 && value.length > 1 && (
              <span style={{ display: 'block' }}>Es la portada: la siguiente foto pasará a ser portada.</span>
            )}
          </Box>
        </Box>
      </ConfirmDialog>
    </Box>
  );
}
