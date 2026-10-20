import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Trash2, Heart, Clock, X, UploadCloud, Film } from 'lucide-react';
import { toast } from 'sonner';
import api, { type TrainingVideo } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getVideoMetadata, processAndCompressVideo } from '@/lib/videoCompression';
import { fadeUp, staggerContainer } from '@/lib/animations';

const CATEGORIES = [
  { id: 'all', label: 'TODAS AS TÉCNICAS', icon: '📋', color: '#CC0000' },
  { id: 'passagem', label: 'PASSAGENS DE GUARDA', icon: '🥋', color: '#CC0000' },
  { id: 'raspagem', label: 'RASPAGENS', icon: '🔄', color: '#EAB308' },
  { id: 'finalizacao', label: 'FINALIZAÇÕES', icon: '⚡', color: '#EF4444' },
  { id: 'defesa', label: 'DEFESAS & ESCAPES', icon: '🛡️', color: '#10B981' },
  { id: 'drill', label: 'DRILLS & QUEDAS', icon: '🥊', color: '#0EA5E9' },
  { id: 'rola', label: 'LUTAS / SPARRING', icon: '⚔️', color: '#A855F7' },
];

const BELTS = [
  { id: 'all', label: 'TODAS AS FAIXAS' },
  { id: 'branca', label: 'BRANCA' },
  { id: 'azul', label: 'AZUL' },
  { id: 'roxa', label: 'ROXA' },
  { id: 'marrom', label: 'MARROM' },
  { id: 'preta', label: 'PRETA' },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function TrainingVideosTab() {
  const { user } = useAuth();

  const userRole = (user?.role || '').toLowerCase();
  const beltLower = (user?.belt || '').toLowerCase();

  const isMasterOrProfessor =
    userRole === 'professor' ||
    userRole === 'academy' ||
    userRole === 'admin' ||
    (user as any)?.role === 'superadmin' ||
    userRole === 'mestre' ||
    user?.isAcademyAdmin === true;

  const isBlackBeltOrAbove =
    beltLower.includes('pret') ||
    beltLower.includes('coral') ||
    beltLower.includes('vermelh') ||
    beltLower.includes('mestre');

  const canUploadVideos = Boolean(isMasterOrProfessor || isBlackBeltOrAbove);

  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [beltFilter, setBeltFilter] = useState('all');
  const [playingVideo, setPlayingVideo] = useState<TrainingVideo | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('passagem');
  const [uploading, setUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStage, setProgressStage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.trainingVideos.list({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        belt: beltFilter !== 'all' ? beltFilter : undefined,
      });
      setVideos(data);
    } catch (err) {
      console.error('Erro ao carregar vídeos:', err);
      toast.error('Erro ao carregar vídeos de treino');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, beltFilter]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Selecione um arquivo de vídeo válido.');
      return;
    }

    try {
      toast.loading('Lendo duração do vídeo...', { id: 'meta-check' });
      const meta = await getVideoMetadata(file);
      toast.dismiss('meta-check');

      if (meta.duration > 120) {
        const mins = Math.floor(meta.duration / 60);
        const secs = Math.round(meta.duration % 60);
        toast.error(`Vídeo muito longo (${mins}m ${secs}s). O limite máximo permitido é de 2 minutos.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setSelectedFile(file);
      setVideoDuration(meta.duration);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(URL.createObjectURL(file));
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    } catch (err: any) {
      toast.dismiss('meta-check');
      toast.error(err?.message || 'Erro ao processar vídeo selecionado.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCloseModal = () => {
    if (uploading) return;
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setIsModalOpen(false);
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(0);
    setTitle('');
    setDescription('');
    setProgressPercent(0);
    setProgressStage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadVideos) {
      toast.error('Apenas professores, academias e faixas-preta para cima podem publicar vídeos.');
      return;
    }
    if (!selectedFile) {
      toast.error('Selecione um vídeo para enviar.');
      return;
    }
    if (!title.trim()) {
      toast.error('Informe um título para o vídeo.');
      return;
    }

    setUploading(true);
    setProgressPercent(5);
    setProgressStage('Iniciando compressão inteligente...');

    try {
      // 1. Valida e comprime o vídeo no cliente com geração de thumbnail
      const { videoFile, thumbnailFile, duration } = await processAndCompressVideo(selectedFile, {
        maxDurationSeconds: 120,
        onProgress: (pct) => {
          setProgressPercent(pct);
          if (pct < 100) {
            setProgressStage(`Otimizando vídeo (${pct}%)...`);
          } else {
            setProgressStage('Enviando para o servidor...');
          }
        },
      });

      // 2. Upload da thumbnail e do vídeo
      setProgressStage('Enviando thumbnail...');
      let thumbnailUrl: string | undefined;
      try {
        if (thumbnailFile && thumbnailFile.size > 0) {
          thumbnailUrl = await api.upload.file(thumbnailFile, 'videos');
        }
      } catch (thumbErr) {
        console.warn('Falha ao subir thumbnail, prosseguindo com vídeo:', thumbErr);
      }

      setProgressStage('Enviando vídeo otimizado...');
      const videoUrl = await api.upload.file(videoFile, 'videos');

      // 3. Salva no banco de dados
      setProgressStage('Finalizando publicação...');
      const created = await api.trainingVideos.create({
        title: title.trim(),
        description: description.trim() || undefined,
        videoUrl,
        thumbnailUrl,
        durationSeconds: duration,
        category,
      });

      setVideos((prev) => [created, ...prev]);
      toast.success('Vídeo de treino publicado com sucesso!');
      handleCloseModal();
    } catch (err: any) {
      console.error('Erro ao enviar vídeo:', err);
      toast.error(err?.message || 'Falha ao processar e enviar o vídeo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Deseja realmente excluir este vídeo de treino?')) return;
    try {
      await api.trainingVideos.delete(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      if (playingVideo?.id === videoId) setPlayingVideo(null);
      toast.success('Vídeo excluído com sucesso.');
    } catch {
      toast.error('Erro ao excluir vídeo.');
    }
  };

  const handleLike = async (videoId: string) => {
    try {
      const res = await api.trainingVideos.toggleLike(videoId);
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, likes: res.likes } : v))
      );
    } catch {
      toast.error('Erro ao registrar curtida.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Botão Novo Vídeo + Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="text-[0.75rem] font-bold text-[#666] font-['Barlow_Condensed'] uppercase tracking-[0.05em]">
            {videos.length} VÍDEO{videos.length !== 1 ? 'S' : ''} DISPONÍVE{videos.length !== 1 ? 'IS' : 'L'}
          </p>
          {canUploadVideos ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#CC0000] hover:bg-[#AA0000] text-white font-['Barlow_Condensed'] font-black text-[0.8rem] uppercase tracking-[0.08em] px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-lg shadow-red-900/20"
            >
              <Plus size={16} strokeWidth={2.5} />
              NOVO VÍDEO (MAX 2 MIN)
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 bg-[#141414] border border-[#2A2A2A] text-[#888] font-['Barlow_Condensed'] text-[0.72rem] font-bold uppercase tracking-[0.05em] px-3 py-1.5 rounded-lg"
              title="Apenas professores, academias e faixas-pretas para cima têm permissão de envio"
            >
              <span className="text-[0.85rem]">🥋</span>
              <span>ENVIO: PROFESSORES, ACADEMIAS E FAIXAS-PRETAS</span>
            </div>
          )}
        </div>

        {/* Categorias Filtros */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className="text-[0.7rem] font-black uppercase tracking-[0.08em] px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all font-['Barlow_Condensed'] flex items-center gap-1.5"
              style={{
                border: `1px solid ${categoryFilter === cat.id ? '#CC0000' : '#2A2A2A'}`,
                background: categoryFilter === cat.id ? '#CC0000' : '#111',
                color: categoryFilter === cat.id ? '#FFF' : '#777',
              }}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filtro por Faixa */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          <span className="text-[0.65rem] font-bold text-[#555] font-['Barlow_Condensed'] uppercase tracking-[0.05em] shrink-0 mr-1">
            FAIXA:
          </span>
          {BELTS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBeltFilter(b.id)}
              className="text-[0.65rem] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 transition-all font-['Barlow_Condensed']"
              style={{
                border: `1px solid ${beltFilter === b.id ? '#CC0000' : '#222'}`,
                background: beltFilter === b.id ? '#2A0505' : '#0E0E0E',
                color: beltFilter === b.id ? '#FF4444' : '#888',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Grid de Vídeos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bjj-skeleton h-48 rounded-xl" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="bjj-card text-center py-12 flex flex-col items-center">
          <Film size={36} className="text-[#444] mb-2" />
          <p className="text-[1rem] font-bold uppercase text-[#555] font-['Barlow_Condensed']">
            NENHUM VÍDEO DE TREINO ENCONTRADO
          </p>
          <p className="text-[0.75rem] text-[#444] mt-1 font-['Barlow'] max-w-sm">
            {canUploadVideos
              ? 'Grave suas técnicas, posições e treinos de até 2 minutos para compartilhar e estudar!'
              : 'Espaço com técnicas e vídeos de treino compartilhados por professores e faixas-pretas.'}
          </p>
          {canUploadVideos ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 bjj-btn-primary !py-2 !px-4 text-[0.75rem]"
            >
              ENVIAR PRIMEIRO VÍDEO
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-1.5 text-[0.75rem] text-[#666] font-['Barlow_Condensed'] uppercase tracking-[0.05em] bg-[#141414] border border-[#222] px-3 py-1.5 rounded-lg">
              <span>🥋</span>
              <span>Envio reservado a professores, academias e faixas-pretas</span>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
        >
          {videos.map((vid) => {
            const isLiked = user?.uid && Array.isArray(vid.likes) && vid.likes.includes(user.uid);
            const likesCount = Array.isArray(vid.likes) ? vid.likes.length : 0;
            const isOwner = user?.uid === vid.userUid;
            const catObj = CATEGORIES.find((c) => c.id === vid.category);

            return (
              <motion.div
                key={vid.id}
                variants={fadeUp}
                className="bjj-card overflow-hidden p-0 flex flex-col group border border-[#222] hover:border-[#333] transition-all"
              >
                {/* Thumbnail / Video Preview Area */}
                <div
                  onClick={() => setPlayingVideo(vid)}
                  className="relative aspect-video bg-[#000] cursor-pointer flex items-center justify-center overflow-hidden"
                >
                  {vid.thumbnailUrl ? (
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#111] flex items-center justify-center">
                      <Film size={36} className="text-[#333]" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
                    <div className="w-12 h-12 rounded-full bg-[#CC0000] text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                      <Play size={20} className="ml-1" fill="white" />
                    </div>
                  </div>

                  {/* Duração Badge */}
                  {vid.durationSeconds > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white font-['Barlow_Condensed'] font-bold text-[0.7rem] px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={11} />
                      {formatDuration(vid.durationSeconds)}
                    </div>
                  )}

                  {/* Categoria Badge */}
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white font-['Barlow_Condensed'] font-bold text-[0.65rem] uppercase px-2 py-0.5 rounded border border-[#333] flex items-center gap-1">
                    <span>{catObj?.icon || '🥋'}</span>
                    {catObj?.label || 'POSIÇÃO'}
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                  <div>
                    <h3
                      onClick={() => setPlayingVideo(vid)}
                      className="font-['Barlow_Condensed'] font-black text-white text-[1.05rem] uppercase leading-tight hover:text-[#CC0000] transition-colors cursor-pointer"
                    >
                      {vid.title}
                    </h3>
                    {vid.description && (
                      <p className="text-[0.75rem] text-[#888] font-['Barlow'] mt-1 line-clamp-2">
                        {vid.description}
                      </p>
                    )}
                  </div>

                  {/* Rodapé do Card: Autor + Likes + Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1E1E1E] text-[0.75rem]">
                    <div className="flex items-center gap-2">
                      {vid.userPhoto ? (
                        <img
                          src={vid.userPhoto}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover border border-[#333]"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#222] text-[#888] font-['Barlow_Condensed'] flex items-center justify-center text-[0.65rem] font-bold">
                          {vid.userName?.[0] || 'A'}
                        </div>
                      )}
                      <div>
                        <p className="font-['Barlow_Condensed'] font-bold text-[#CCC] text-[0.75rem] leading-none">
                          {vid.userName || 'Atleta'}
                        </p>
                        {vid.userBelt && (
                          <span className="text-[0.6rem] text-[#666] font-['Barlow_Condensed'] uppercase">
                            Faixa {vid.userBelt}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleLike(vid.id)}
                        className={`flex items-center gap-1 bg-transparent border-none cursor-pointer transition-colors ${
                          isLiked ? 'text-[#CC0000]' : 'text-[#666] hover:text-[#999]'
                        }`}
                      >
                        <Heart size={15} fill={isLiked ? '#CC0000' : 'none'} />
                        <span className="font-['Barlow_Condensed'] font-bold text-[0.75rem]">
                          {likesCount}
                        </span>
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => handleDelete(vid.id)}
                          title="Excluir vídeo"
                          className="text-[#555] hover:text-[#CC0000] bg-transparent border-none cursor-pointer transition-colors p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Modal de Upload de Vídeo com Compressão */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center px-4 py-3 border-b border-[#222]">
                <h3 className="font-['Barlow_Condensed'] font-black text-white text-[1.1rem] uppercase tracking-[0.05em] flex items-center gap-2">
                  <Film size={18} className="text-[#CC0000]" />
                  PUBLICAR VÍDEO DE TREINO (ATÉ 2 MIN)
                </h3>
                <button
                  onClick={handleCloseModal}
                  disabled={uploading}
                  className="text-[#666] hover:text-white bg-transparent border-none cursor-pointer p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5 overflow-y-auto">
                {!canUploadVideos && (
                  <div className="bg-[#1A0505] border border-[#551010] text-[#FF9999] rounded-lg p-3 text-[0.8rem] flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Apenas professores, academias e faixas-preta para cima podem publicar vídeos de treino.</span>
                  </div>
                )}
                {/* Seletor / Preview do Vídeo */}
                {!videoPreviewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#333] hover:border-[#CC0000] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#0A0A0A] transition-colors"
                  >
                    <UploadCloud size={36} className="text-[#666] mb-2" />
                    <p className="font-['Barlow_Condensed'] font-bold text-white text-[0.95rem] uppercase">
                      Clique para escolher o vídeo
                    </p>
                    <p className="text-[0.75rem] text-[#666] mt-1 text-center font-['Barlow']">
                      Grave com a câmera ou selecione da galeria.<br />
                      Duração máxima: <strong>2 minutos (120s)</strong>.
                    </p>
                    <span className="mt-3 text-[0.7rem] bg-[#1A1A1A] text-[#AAA] px-2.5 py-1 rounded border border-[#2A2A2A]">
                      Formatos: MP4, MOV, WebM
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-black border border-[#222] aspect-video flex items-center justify-center">
                    <video
                      src={videoPreviewUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-2 bg-black/80 text-white font-['Barlow_Condensed'] font-bold text-[0.75rem] px-2 py-0.5 rounded border border-[#333]">
                      Duração: {formatDuration(videoDuration)}
                    </div>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => {
                          if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                          setSelectedFile(null);
                          setVideoPreviewUrl(null);
                          setVideoDuration(0);
                        }}
                        className="absolute bottom-2 left-2 bg-[#CC0000] text-white font-['Barlow_Condensed'] font-bold text-[0.7rem] uppercase px-2.5 py-1 rounded cursor-pointer"
                      >
                        Trocar vídeo
                      </button>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Campos do Formulário */}
                <div>
                  <label className="block text-[0.75rem] font-bold text-[#888] font-['Barlow_Condensed'] uppercase mb-1">
                    Título da Posição / Treino *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Passagem de guarda toureando / Sparring com Prof. Marcos"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                    className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#CC0000] text-white font-['Barlow_Condensed'] text-[0.9rem] px-3 py-2 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[0.75rem] font-bold text-[#888] font-['Barlow_Condensed'] uppercase mb-1">
                    Categoria da Técnica
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={uploading}
                    className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#CC0000] text-white font-['Barlow_Condensed'] text-[0.9rem] px-3 py-2 rounded-lg outline-none"
                  >
                    <option value="passagem">🥋 Passagem de Guarda</option>
                    <option value="raspagem">🔄 Raspagem</option>
                    <option value="finalizacao">⚡ Finalização</option>
                    <option value="defesa">🛡️ Defesa / Escape</option>
                    <option value="drill">🥊 Drill / Quedas</option>
                    <option value="rola">⚔️ Lutas / Sparring</option>
                    <option value="posicao">📌 Outra Técnica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.75rem] font-bold text-[#888] font-['Barlow_Condensed'] uppercase mb-1">
                    Observações / Detalhes (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Dicas sobre a pegada, ajuste do quadril, tempo ou adversário..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={uploading}
                    className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#CC0000] text-white font-['Barlow'] text-[0.85rem] px-3 py-2 rounded-lg outline-none resize-none"
                  />
                </div>

                {/* Barra de Progresso durante Compressão / Envio */}
                {uploading && (
                  <div className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[0.75rem] font-['Barlow_Condensed']">
                      <span className="text-white font-bold">{progressStage}</span>
                      <span className="text-[#CC0000] font-black">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#222] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#CC0000] h-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[0.65rem] text-[#666] font-['Barlow'] text-center">
                      Economizando dados e reduzindo o peso do arquivo... não feche esta janela.
                    </p>
                  </div>
                )}

                {/* Botões do Rodapé */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[#222]">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={uploading}
                    className="px-4 py-2 rounded-lg bg-[#222] hover:bg-[#2A2A2A] text-[#CCC] font-['Barlow_Condensed'] font-bold text-[0.8rem] uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile || !title.trim() || !canUploadVideos}
                    className="px-5 py-2 rounded-lg bg-[#CC0000] hover:bg-[#AA0000] disabled:bg-[#444] disabled:cursor-not-allowed text-white font-['Barlow_Condensed'] font-black text-[0.8rem] uppercase cursor-pointer transition-colors"
                  >
                    {uploading ? 'Processando...' : 'Publicar Vídeo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Player do Vídeo Otimizado para Mobile */}
      <AnimatePresence>
        {playingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col shadow-2xl max-h-[95vh]"
            >
              {/* Header do Player */}
              <div className="flex justify-between items-center px-4 py-3 bg-[#161616] border-b border-[#222]">
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="bg-[#CC0000] text-white text-[0.6rem] font-['Barlow_Condensed'] font-black uppercase px-2 py-0.5 rounded">
                      {CATEGORIES.find(c => c.id === playingVideo.category)?.label || 'TÉCNICA'}
                    </span>
                    {playingVideo.userBelt && (
                      <span className="bg-[#222] text-[#AAA] text-[0.6rem] font-['Barlow_Condensed'] font-bold uppercase px-2 py-0.5 rounded border border-[#333]">
                        Faixa {playingVideo.userBelt}
                      </span>
                    )}
                  </div>
                  <h3 className="font-['Barlow_Condensed'] font-black text-white text-[1.1rem] uppercase leading-tight line-clamp-1">
                    {playingVideo.title}
                  </h3>
                  <p className="text-[0.7rem] text-[#888] font-['Barlow_Condensed']">
                    Por {playingVideo.userName || 'Atleta'} • {formatDuration(playingVideo.durationSeconds)}
                  </p>
                </div>
                <button
                  onClick={() => setPlayingVideo(null)}
                  aria-label="Fechar player"
                  className="text-[#888] hover:text-white bg-[#222] hover:bg-[#333] border border-[#333] rounded-full p-2 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Video Container Mobile */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={videoPlayerRef}
                  src={playingVideo.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Barra de Controles Mobile: Velocidade / Câmera Lenta */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#141414] border-t border-[#1F1F1F]">
                <span className="text-[0.7rem] font-bold text-[#777] font-['Barlow_Condensed'] uppercase tracking-[0.05em] flex items-center gap-1">
                  ⚡ Velocidade:
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { rate: 0.5, label: '0.5x (Slow-Mo)' },
                    { rate: 0.75, label: '0.75x' },
                    { rate: 1, label: '1x Normal' },
                  ].map((spd) => (
                    <button
                      key={spd.rate}
                      onClick={() => {
                        setPlaybackSpeed(spd.rate);
                        if (videoPlayerRef.current) {
                          videoPlayerRef.current.playbackRate = spd.rate;
                        }
                      }}
                      className="text-[0.68rem] font-['Barlow_Condensed'] font-bold uppercase px-2 py-1 rounded transition-colors"
                      style={{
                        background: playbackSpeed === spd.rate ? '#CC0000' : '#222',
                        color: playbackSpeed === spd.rate ? '#FFF' : '#AAA',
                        border: `1px solid ${playbackSpeed === spd.rate ? '#CC0000' : '#333'}`,
                      }}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição e Anotações da Técnica */}
              {playingVideo.description && (
                <div className="p-3.5 bg-[#0F0F0F] border-t border-[#1C1C1C] overflow-y-auto max-h-32">
                  <p className="text-[0.7rem] font-bold text-[#666] font-['Barlow_Condensed'] uppercase mb-1 tracking-[0.05em]">
                    Anotações Técnicas:
                  </p>
                  <p className="text-[0.8rem] text-[#DDD] font-['Barlow'] whitespace-pre-wrap leading-relaxed">
                    {playingVideo.description}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
