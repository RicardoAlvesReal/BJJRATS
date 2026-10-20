/**
 * BJJRats — Utilitário de Processamento e Compressão de Vídeos no Cliente
 * Valida duração de até 2 minutos (120 segundos), gera thumbnail do frame do vídeo
 * e otimiza o bitrate/resolução para economizar banda e armazenamento no servidor.
 */

export interface VideoMetadata {
  duration: number; // em segundos
  width: number;
  height: number;
}

export interface VideoCompressionOptions {
  maxDurationSeconds?: number;
  maxDimension?: number; // max width ou height (padrão 1280 para 720p)
  videoBitsPerSecond?: number; // padrão 1.5 Mbps
  onProgress?: (percent: number) => void;
}

/**
 * Extrai metadados do arquivo de vídeo (duração, largura, altura)
 */
export function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Tempo limite ao ler informações do vídeo.'));
    }, 15000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      URL.revokeObjectURL(url);
      resolve({ duration, width, height });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Formato de vídeo incompatível ou arquivo corrompido.'));
    };
  });
}

/**
 * Gera uma thumbnail (imagem WebP/JPEG) de um frame do vídeo
 */
export function generateVideoThumbnail(
  file: File,
  targetTimeSeconds = 1,
  maxWidth = 640
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      const seekTime = Math.min(targetTimeSeconds, Math.max(0, (video.duration || 2) - 0.5));
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas não disponível.'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao gerar thumbnail.'));
              return;
            }
            const thumbName = `${file.name.replace(/\.[^/.]+$/, '')}-thumb.webp`;
            resolve(new File([blob], thumbName, { type: 'image/webp' }));
          },
          'image/webp',
          0.82
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao capturar frame do vídeo.'));
    };
  });
}

/**
 * Valida o limite de 2 minutos e comprime o vídeo se necessário
 */
export async function processAndCompressVideo(
  file: File,
  options: VideoCompressionOptions = {}
): Promise<{ videoFile: File; thumbnailFile: File; duration: number }> {
  const {
    maxDurationSeconds = 120, // 2 minutos
    maxDimension = 1280, // 720p HD
    videoBitsPerSecond = 1800000, // 1.8 Mbps
    onProgress,
  } = options;

  onProgress?.(5);

  // 1. Valida duração
  const meta = await getVideoMetadata(file);
  if (meta.duration > maxDurationSeconds) {
    const mins = Math.floor(meta.duration / 60);
    const secs = Math.round(meta.duration % 60);
    const durStr = `${mins}m ${secs}s`;
    throw new Error(
      `O vídeo possui ${durStr}. O limite máximo permitido para vídeos de treino é de 2 minutos (120 segundos).`
    );
  }

  onProgress?.(15);

  // 2. Gera Thumbnail automaticamente
  let thumbnailFile: File;
  try {
    thumbnailFile = await generateVideoThumbnail(file, Math.min(1.5, meta.duration / 2));
  } catch (err) {
    console.warn('[VideoCompress] Falha ao gerar thumbnail automática:', err);
    // Cria thumbnail em branco como fallback
    const dummyBlob = new Blob([], { type: 'image/webp' });
    thumbnailFile = new File([dummyBlob], 'thumb.webp', { type: 'image/webp' });
  }

  onProgress?.(30);

  // Se o arquivo já for relativamente leve (menor que 15MB) ou se o navegador não tiver MediaRecorder
  if (file.size <= 15 * 1024 * 1024 || typeof window === 'undefined' || !window.MediaRecorder) {
    onProgress?.(100);
    return {
      videoFile: file,
      thumbnailFile,
      duration: Math.round(meta.duration),
    };
  }

  // 3. Compressão via Canvas + MediaRecorder
  try {
    const compressed = await compressVideoViaMediaRecorder(file, meta, {
      maxDimension,
      videoBitsPerSecond,
      onProgress: (p) => onProgress?.(30 + Math.round(p * 0.7)),
    });
    return {
      videoFile: compressed,
      thumbnailFile,
      duration: Math.round(meta.duration),
    };
  } catch (compErr) {
    console.warn('[VideoCompress] Fallback para arquivo original:', compErr);
    onProgress?.(100);
    return {
      videoFile: file,
      thumbnailFile,
      duration: Math.round(meta.duration),
    };
  }
}

/**
 * Transcodifica e reduz resolução / bitrate do vídeo usando HTML5 Canvas e MediaRecorder
 */
function compressVideoViaMediaRecorder(
  file: File,
  meta: VideoMetadata,
  options: {
    maxDimension: number;
    videoBitsPerSecond: number;
    onProgress?: (percent: number) => void;
  }
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = false;
    video.playsInline = true;
    video.volume = 1;

    const url = URL.createObjectURL(file);
    video.src = url;

    let targetWidth = meta.width;
    let targetHeight = meta.height;

    if (targetWidth > options.maxDimension || targetHeight > options.maxDimension) {
      const ratio = Math.min(options.maxDimension / targetWidth, options.maxDimension / targetHeight);
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }

    // Força dimensões pares para codecs de vídeo
    targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
    targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      URL.revokeObjectURL(url);
      reject(new Error('Canvas 2D não suportado.'));
      return;
    }

    // Escolhe mimeType suportado
    const mimeTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

    video.oncanplay = () => {
      try {
        const stream = canvas.captureStream(30);

        // Captura áudio do vídeo se disponível
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const source = audioCtx.createMediaElementSource(video);
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(destination);
            // Também conecta ao destination de áudio local se necessário
            destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
          }
        } catch (audioErr) {
          console.warn('[VideoCompress] Áudio não capturado via AudioContext:', audioErr);
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: options.videoBitsPerSecond,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: mimeType });

          // Se a compressão ficou maior que o original, mantém o original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
          const newName = `${file.name.replace(/\.[^/.]+$/, '')}-comp${ext}`;
          resolve(new File([blob], newName, { type: mimeType }));
        };

        recorder.start(250);
        video.play();

        let animFrameId: number;
        const renderLoop = () => {
          if (video.paused || video.ended) {
            cancelAnimationFrame(animFrameId);
            return;
          }
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          if (meta.duration > 0) {
            const pct = Math.min(100, Math.round((video.currentTime / meta.duration) * 100));
            options.onProgress?.(pct);
          }
          animFrameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        video.onended = () => {
          recorder.stop();
        };

        video.onerror = (e) => {
          cancelAnimationFrame(animFrameId);
          URL.revokeObjectURL(url);
          reject(e);
        };
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
  });
}
