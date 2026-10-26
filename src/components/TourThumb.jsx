import { useState } from 'react';
import { Box } from '@mui/material';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import { API_URL } from '../lib/api';

// Miniatura 64x44. Sin foto o foto que no carga (REQ-8): marco neutro, nunca una imagen rota.
// img = valor de tour.img ("/uploads/<archivo>"); la imagen sale del proxy de la API.
export default function TourThumb({ img, width = 64, height = 44 }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const src = img ? `${API_URL}/upload/${img.split('/').pop()}` : null;
  const failed = !!src && failedSrc === src;
  const box = {
    width,
    height,
    flexShrink: 0,
    borderRadius: '4px',
    overflow: 'hidden',
    bgcolor: 'bg.raised',
    display: 'grid',
    placeItems: 'center',
  };

  if (!src || failed) {
    const Icon = failed ? BrokenImageOutlined : ImageOutlined;
    return (
      <Box sx={box} data-testid="tour-thumb-neutral">
        <Icon sx={{ color: 'tertiary', fontSize: 20 }} aria-hidden />
      </Box>
    );
  }
  return (
    <Box sx={box}>
      <img src={src} alt="" width={width} height={height} style={{ objectFit: 'cover' }} onError={() => setFailedSrc(src)} />
    </Box>
  );
}
