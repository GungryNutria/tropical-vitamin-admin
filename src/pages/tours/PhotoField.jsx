import { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonBase, LinearProgress, Typography } from '@mui/material';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import UploadOutlined from '@mui/icons-material/UploadOutlined';
import api, { API_URL } from '../../lib/api';
import { formatFileSize } from '../../lib/format';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 10 * 1024 * 1024;
const FORMATS = 'JPG, PNG, WebP o GIF';
const link = { color: 'primary.main', textDecoration: 'underline', fontSize: 14, fontWeight: 600, borderRadius: '4px', px: 0.5 };

// Vista previa 3:2 (288×192, D-9): la tarjeta de la web la recorta con `cover`.
const PREVIEW = { width: '100%', aspectRatio: '3 / 2', borderRadius: '6px', overflow: 'hidden', bgcolor: 'bg.base' };

const extensionOf = (name) => (name.includes('.') ? name.split('.').pop().toUpperCase() : '');

// Antes de subir (REQ-15): tipo y peso. Devuelve { title, detail } o null si el archivo sirve.
// El API rechaza con 413 un archivo de exactamente 10 MB, así que el límite es estricto (<).
function validate(file) {
  if (!ACCEPT.includes(file.type)) {
    const ext = extensionOf(file.name);
    return { title: ext ? `Ese archivo es ${ext}.` : 'Ese archivo no es una imagen.', detail: `Elige un ${FORMATS}.` };
  }
  if (!(file.size < MAX_BYTES)) {
    return { title: `Esa foto pesa ${formatFileSize(file.size)}. El máximo es 10 MB.`, detail: 'Elige una más ligera.' };
  }
  return null;
}

function Notice({ title, detail, children }) {
  return (
    <Box role="alert" sx={{ mt: 1.5, p: 1.5, bgcolor: 'statusBg.danger', border: '1px solid', borderColor: 'error.main', borderRadius: '6px' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <ErrorOutline sx={{ color: 'error.main', fontSize: 20 }} aria-hidden />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
          {detail && <Typography variant="caption" color="text.secondary" component="p">{detail}</Typography>}
        </Box>
      </Box>
      {children}
    </Box>
  );
}

function Preview({ img }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const src = `${API_URL}/upload/${img.split('/').pop()}`;
  if (failedSrc === src) {
    return (
      <Box sx={{ ...PREVIEW, display: 'grid', placeItems: 'center', bgcolor: 'bg.raised' }} data-testid="photo-preview-neutral">
        <BrokenImageOutlined sx={{ color: 'tertiary', fontSize: 32 }} aria-hidden />
      </Box>
    );
  }
  return (
    <Box sx={PREVIEW}>
      <img src={src} alt="Vista previa de la foto" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setFailedSrc(src)} />
    </Box>
  );
}

/**
 * Foto del tour (REQ-15 a REQ-18). `value` es el `img` del formulario; la foto subida solo viaja
 * al API cuando el tour se guarda (REQ-18, D-5): aquí solo se sube el archivo, sin `name`, y se
 * devuelve la url con onChange. `savedValue` es la foto ya guardada, para saber si es nueva.
 */
export default function PhotoField({ value, savedValue, onChange, onUploadingChange }) {
  const inputRef = useRef(null);
  const controllerRef = useRef(null);
  const lastFileRef = useRef(null);
  const [upload, setUpload] = useState(null); // { name, progress }
  const [problem, setProblem] = useState(null); // { kind: 'invalid' | 'failed', title, detail }
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState(null); // { name, size } de la última subida correcta

  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = async (file) => {
    lastFileRef.current = file;
    const controller = new AbortController();
    controllerRef.current = controller;
    setProblem(null);
    setUpload({ name: file.name, progress: 0 });
    onUploadingChange(true);
    try {
      const formData = new FormData();
      formData.append('file', file); // sin `name`: el API asigna un nombre único
      const { data } = await api.post('/upload', formData, {
        signal: controller.signal,
        onUploadProgress: (e) => e.total && setUpload({ name: file.name, progress: Math.round((e.loaded / e.total) * 100) }),
      });
      setMeta({ name: file.name, size: file.size });
      onChange(data.url);
    } catch (err) {
      if (controller.signal.aborted) return;
      const tooBig = err?.response?.status === 413;
      setProblem({
        kind: 'failed',
        title: 'No se pudo subir la foto.',
        detail: `${tooBig ? 'La foto pesa más de 10 MB. ' : ''}${value ? 'Se conserva la foto anterior.' : 'Intenta de nuevo o elige otra.'}`,
      });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setUpload(null);
        onUploadingChange(false);
      }
    }
  };

  const choose = (file) => {
    if (!file) return;
    const invalid = validate(file);
    if (invalid) {
      setProblem({ kind: 'invalid', ...invalid });
      return;
    }
    start(file);
  };

  const cancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setUpload(null);
    onUploadingChange(false);
  };

  const pick = () => inputRef.current?.click();

  const isNew = !!value && value !== savedValue;
  const input = (
    <input
      ref={inputRef}
      type="file"
      hidden
      accept={ACCEPT.join(',')}
      aria-label="Elegir foto"
      onChange={(e) => {
        choose(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  const dropProps = {
    onDragOver: (e) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      choose(e.dataTransfer.files?.[0]);
    },
  };

  const zoneSx = (borderColor) => ({
    aspectRatio: '3 / 2',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    textAlign: 'center',
    border: '1px dashed',
    borderColor,
    borderRadius: '6px',
    bgcolor: 'bg.base',
    px: 2,
  });

  let body;
  if (upload) {
    body = (
      <Box sx={{ ...zoneSx('border.subtle'), borderStyle: 'solid' }} aria-live="polite">
        <ImageOutlined sx={{ color: 'text.secondary', fontSize: 32 }} aria-hidden />
        <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: '100%' }} noWrap>{upload.name}</Typography>
        <LinearProgress
          variant="determinate"
          value={upload.progress}
          aria-label="Avance de la subida"
          sx={{ width: '100%', height: 6, borderRadius: 3, bgcolor: 'neutral.chip', '& .MuiLinearProgress-bar': { bgcolor: 'text.primary' } }}
        />
        <Typography variant="caption" color="text.secondary">Subiendo… {upload.progress} %</Typography>
        <ButtonBase onClick={cancel} sx={link}>Cancelar</ButtonBase>
      </Box>
    );
  } else if (value) {
    body = (
      <>
        <Preview img={value} />
        <Button variant="outlined" onClick={pick} startIcon={<UploadOutlined />} sx={{ width: '100%', mt: 1.5 }}>
          Cambiar foto
        </Button>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          {isNew && meta ? `${meta.name} · ${formatFileSize(meta.size)}` : value.split('/').pop()}
        </Typography>
        {isNew && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
            Foto nueva. La web la mostrará cuando guardes.
          </Typography>
        )}
      </>
    );
  } else {
    body = (
      <Box
        {...dropProps}
        sx={{ ...zoneSx(problem?.kind === 'invalid' ? 'error.main' : dragging ? 'primary.main' : 'border.control'), bgcolor: dragging ? 'bg.raised' : 'bg.base' }}
      >
        <UploadOutlined sx={{ color: 'text.secondary', fontSize: 28 }} aria-hidden />
        <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>Arrastra una foto aquí</Typography>
        <Typography variant="caption" color="text.secondary">o elige un archivo</Typography>
        <Button variant="outlined" onClick={pick} sx={{ mt: 1 }}>Elegir archivo</Button>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{FORMATS} · hasta 10 MB</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {input}
      {body}
      {problem && !upload && (
        <Notice title={problem.title} detail={problem.detail}>
          {problem.kind === 'failed' && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button variant="outlined" sx={{ flex: 1 }} onClick={() => start(lastFileRef.current)}>Reintentar</Button>
              <Button variant="outlined" sx={{ flex: 1 }} onClick={pick}>Elegir otra</Button>
            </Box>
          )}
        </Notice>
      )}
      {(upload || !value) && (
        <Box sx={{ mt: 1.5, color: 'tertiary' }}>
          <Typography variant="caption" component="p" sx={{ color: 'inherit' }}>
            {upload ? 'Espera a que termine para guardar.' : 'Se muestra en la tarjeta del tour, en la web.'}
          </Typography>
          {!upload && (
            <Typography variant="caption" component="p" sx={{ color: 'inherit' }}>
              Usa una foto horizontal (3:2 o más ancha). La web la recorta para llenar la tarjeta.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
