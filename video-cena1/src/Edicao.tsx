import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  AZUL_ELETRICO,
  AZUL_NOITE,
  AZUL_PROFUNDO,
  AZUL_REAL,
  CIANO,
  Cena1,
  DURACAO_CENA1,
  Frase,
  LinhaAnimada,
  ROTEIRO_PADRAO,
  fontFamily,
} from './Cena1';
import {PALAVRAS} from './legendas';

export const FPS = 30;
const f = (segundos: number) => Math.round(segundos * FPS);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const DURACAO_VIDEO_S = 78.13;
export const DURACAO_TOTAL_S = 80.5; // vídeo + cartela final "VOCÊ."

/* ============================== MAPA DA EDIÇÃO ============================= */
// Todos os tempos em segundos, tirados da fala (transcrição com Whisper).

// Câmera: cada "plano" tem um zoom inicial e final. A troca de plano é um
// corte seco de zoom (jump cut) com um flash azul rápido.
type Plano = {de: number; ate: number; z0: number; z1: number; tremor?: boolean};
const PLANOS: Plano[] = [
  {de: 0, ate: 7.4, z0: 1.0, z1: 1.04},
  {de: 7.4, ate: 9.9, z0: 1.12, z1: 1.18}, // "você aprendeu a atravessar a frustração"
  {de: 9.9, ate: 14.3, z0: 1.0, z1: 1.06},
  {de: 14.3, ate: 17.9, z0: 1.1, z1: 1.18},
  {de: 17.9, ate: 22.5, z0: 1.0, z1: 1.06},
  {de: 22.5, ate: 26.75, z0: 1.08, z1: 1.14},
  {de: 26.75, ate: 31.0, z0: 1.0, z1: 1.05},
  {de: 31.0, ate: 32.65, z0: 1.12, z1: 1.16},
  {de: 32.65, ate: 34.2, z0: 1.32, z1: 1.38, tremor: true}, // "fiz besteira, estraguei tudo"
  {de: 34.2, ate: 41.4, z0: 1.0, z1: 1.08},
  {de: 41.4, ate: 44.8, z0: 1.15, z1: 1.25}, // "anestesia da vida"
  {de: 44.8, ate: 54.0, z0: 1.0, z1: 1.04}, // (tela dividida em 46,5–54)
  {de: 54.0, ate: 57.5, z0: 1.05, z1: 1.1},
  {de: 57.5, ate: 64.4, z0: 1.12, z1: 1.22},
  {de: 64.4, ate: 69.3, z0: 1.0, z1: 1.08},
  {de: 69.3, ate: 73.4, z0: 1.0, z1: 1.0}, // clímax em tela cheia azul
  {de: 73.4, ate: 77.6, z0: 1.08, z1: 1.16},
  {de: 77.6, ate: 99, z0: 1.35, z1: 1.42}, // "Você."
];

// Frases de efeito que reforçam a fala (aparecem acima da legenda)
type Efeito = {de: number; ate: number; linhas: {texto: string; atraso?: number; destaque?: boolean; tamanho?: number}[]; tremor?: boolean};
const EFEITOS: Efeito[] = [
  {de: 8.6, ate: 9.9, linhas: [{texto: 'FRUSTRAÇÃO', destaque: true}]},
  {de: 10.6, ate: 12.3, linhas: [{texto: 'ANSIEDADE', destaque: true}]},
  {de: 12.95, ate: 14.25, linhas: [{texto: 'O GATILHO'}]},
  {de: 18.7, ate: 22.4, linhas: [{texto: 'E SEM O', tamanho: 84}, {texto: 'REMÉDIO?', atraso: 1.4, destaque: true}]},
  {de: 23.1, ate: 24.6, linhas: [{texto: 'NOVO', tamanho: 84}, {texto: 'REPERTÓRIO', atraso: 0.3, destaque: true}]},
  {de: 25.4, ate: 26.75, linhas: [{texto: 'SACIEDADE', destaque: true}]},
  {de: 27.9, ate: 30.9, linhas: [{texto: 'VOLTAR', tamanho: 84}, {texto: 'AO PLANO', atraso: 0.3, destaque: true}]},
  {de: 32.65, ate: 34.15, linhas: [{texto: '"ESTRAGUEI', tamanho: 92}, {texto: 'TUDO"', atraso: 0.8, destaque: true}], tremor: true},
  {de: 37.6, ate: 39.3, linhas: [{texto: 'A MAIOR', tamanho: 84}, {texto: 'DOSE', atraso: 0.35, destaque: true}]},
  {de: 43.4, ate: 44.75, linhas: [{texto: 'ANESTESIA', destaque: true}, {texto: 'DA VIDA', atraso: 0.6, tamanho: 84}]},
  {de: 45.5, ate: 46.45, linhas: [{texto: 'UMA GRANDE', tamanho: 80}, {texto: 'VERDADE', atraso: 0.35, destaque: true}]},
  {de: 55.9, ate: 57.4, linhas: [{texto: 'FOME', tamanho: 84}, {texto: 'AVASSALADORA', atraso: 0.3, destaque: true, tamanho: 92}]},
  {de: 64.9, ate: 67.0, linhas: [{texto: 'PRECISO', tamanho: 84}, {texto: 'COMER...', atraso: 0.6, destaque: true}]},
  {de: 73.5, ate: 77.5, linhas: [{texto: 'O REPERTÓRIO', tamanho: 84}, {texto: 'É SEU', atraso: 3.3, destaque: true}]},
];

// Tela dividida: você em cima, a "grande verdade" embaixo
const DIVIDIDA = {de: 46.45, ate: 54.0};
const VERDADE = [
  {texto: 'FOME FISIOLÓGICA', t: 46.6},
  {texto: 'COMER EMOCIONAL', t: 48.96},
  {texto: 'HÁBITOS', t: 51.12},
  {texto: 'COMPULSÃO', t: 53.0},
];

// Gatilhos emocionais em "chips"
const CHIPS = {de: 57.9, ate: 62.7};
const GATILHOS = [
  {texto: 'NOTÍCIA RUIM', t: 57.98, x: -170, y: -140, rot: -6},
  {texto: 'BRIGA', t: 58.86, x: 230, y: -60, rot: 5},
  {texto: 'ESTRESSE', t: 59.6, x: -210, y: 30, rot: 4},
  {texto: 'VULNERÁVEL', t: 60.34, x: 170, y: 120, rot: -5},
  {texto: 'DOENÇA', t: 62.04, x: -60, y: 220, rot: 3},
];

// Clímax: "a caneta diminui o impulso, mas não constrói a pessoa"
const CLIMAX = {de: 69.25, ate: 73.45};
const local = (t: number) => f(t - CLIMAX.de);
const ROTEIRO_CLIMAX: Frase[] = [
  {
    linhas: [
      {texto: 'A CANETA', inicio: local(69.88), tamanho: 100},
      {texto: 'DIMINUI O', inicio: local(70.36), tamanho: 100},
      {texto: 'IMPULSO', inicio: local(71.16), destaque: true, tamanho: 112},
    ],
    saida: local(71.5),
  },
  {
    linhas: [
      {texto: 'MAS NÃO', inicio: local(71.64), tamanho: 100},
      {texto: 'CONSTRÓI', inicio: local(72.12), tamanho: 100},
      {texto: 'A PESSOA', inicio: local(72.68), destaque: true, tamanho: 112},
    ],
  },
];

// Cartela final
const FINAL = {de: 77.75};

// Momentos sem legenda (a tela já mostra o texto)
const SEM_LEGENDA: [number, number][] = [
  [0, DURACAO_CENA1 / FPS],
  [DIVIDIDA.de - 0.1, DIVIDIDA.ate],
  [CHIPS.de - 0.1, CHIPS.ate],
  [CLIMAX.de, CLIMAX.ate],
  [FINAL.de, 999],
];

/* ============================ CÂMERA NO VÍDEO ============================== */

const planoAtual = (t: number) => PLANOS.find((p) => t >= p.de && t < p.ate) ?? PLANOS[PLANOS.length - 1];

const VideoComCamera: React.FC<{videoArquivo: string}> = ({videoArquivo}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const p = planoAtual(t);

  const progresso = interpolate(t, [p.de, p.ate], [0, 1], clamp);
  let zoom = interpolate(progresso, [0, 1], [p.z0, p.z1], {easing: Easing.inOut(Easing.sin)});
  // "Câmera na mão": balanço leve e contínuo
  let rot = Math.sin(frame / 37) * 0.6;
  let x = Math.sin(frame / 53) * 6;
  let y = Math.cos(frame / 47) * 6;
  if (p.tremor) {
    x += Math.sin(frame * 2.1) * 9;
    y += Math.cos(frame * 1.7) * 7;
    rot += Math.sin(frame * 1.3) * 0.8;
  }

  // Tela dividida: o vídeo vira um cartão 3D na metade de cima
  const entra = spring({frame: frame - f(DIVIDIDA.de), fps, config: {damping: 16}});
  const sai = spring({frame: frame - f(DIVIDIDA.ate), fps, config: {damping: 16}});
  const cartao = t < DIVIDIDA.de ? 0 : Math.max(0, entra - sai);
  const escalaCartao = interpolate(cartao, [0, 1], [1, 0.56]);
  const subir = interpolate(cartao, [0, 1], [0, -440]);
  const raio = interpolate(cartao, [0, 1], [0, 64]);
  const giroY = Math.sin(frame / 24) * 7 * cartao;
  const giroX = 6 * cartao;
  zoom = interpolate(cartao, [0, 1], [zoom, 1.0]);

  return (
    <AbsoluteFill style={{perspective: 1800}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: raio,
          transform: `translateY(${subir}px) scale(${escalaCartao}) rotateX(${giroX}deg) rotateY(${giroY}deg)`,
          boxShadow: cartao > 0.01 ? `0 0 ${90 * cartao}px ${CIANO}AA, 0 0 0 ${8 * cartao}px ${CIANO}` : undefined,
        }}
      >
        <OffthreadVideo
          src={staticFile(videoArquivo)}
          style={{
            width,
            height,
            transformOrigin: '50% 35%',
            transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${zoom})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// Flash azul rápido em cada corte de zoom
const FlashDeCorte: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const corte = PLANOS.map((p) => p.de).filter((d) => d > 1).find((d) => t >= d && t < d + 0.2);
  if (corte === undefined) return null;
  const o = interpolate(t - corte, [0, 0.2], [0.45, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, #FFFFFF 0%, ${CIANO} 35%, ${AZUL_REAL} 100%)`,
        mixBlendMode: 'screen',
        opacity: o,
      }}
    />
  );
};

// Identidade azul durante todo o vídeo + fundo escuro para a legenda
const Vinheta: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill
      style={{background: `linear-gradient(to top, ${AZUL_NOITE}E6 0%, ${AZUL_PROFUNDO}66 22%, transparent 42%)`}}
    />
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 0% 0%, ${AZUL_ELETRICO}55 0%, transparent 35%), radial-gradient(circle at 100% 100%, ${CIANO}33 0%, transparent 30%)`,
        mixBlendMode: 'screen',
      }}
    />
  </AbsoluteFill>
);

/* ================================ LEGENDAS ================================ */

type Pagina = {de: number; ate: number; palavras: [string, number, number][]};

// Agrupa as palavras em "páginas" curtas (até 3 palavras / 18 letras)
const montarPaginas = (): Pagina[] => {
  const paginas: Pagina[] = [];
  let atual: [string, number, number][] = [];
  const fechar = () => {
    if (atual.length) paginas.push({de: atual[0][1], ate: atual[atual.length - 1][2], palavras: atual});
    atual = [];
  };
  PALAVRAS.forEach((p, i) => {
    const anterior = atual[atual.length - 1];
    const letras = atual.reduce((n, w) => n + w[0].length + 1, 0) + p[0].length;
    if (anterior && (atual.length >= 3 || letras > 18 || p[1] - anterior[2] > 0.35)) fechar();
    atual.push(p);
    if (/[.,?!]$/.test(p[0]) || i === PALAVRAS.length - 1) fechar();
  });
  // Cada página fica na tela até a próxima começar (sem "piscar")
  return paginas.map((pg, i) => ({...pg, ate: Math.min(paginas[i + 1]?.de ?? pg.ate + 0.4, pg.ate + 0.6)}));
};
const PAGINAS = montarPaginas();

const Legenda: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (SEM_LEGENDA.some(([a, b]) => t >= a && t < b)) return null;
  const pagina = PAGINAS.find((pg) => t >= pg.de && t < pg.ate);
  if (!pagina) return null;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 330}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 34px', maxWidth: 980}}>
        {pagina.palavras.map(([texto, ini, fim], i) => {
          const falada = t >= ini;
          const ativa = t >= ini && t < fim + 0.05;
          const pop = spring({frame: frame - f(ini), fps, config: {damping: 12, stiffness: 220}});
          return (
            <span
              key={i}
              style={{
                fontFamily,
                fontWeight: 900,
                fontSize: 74,
                lineHeight: 1.15,
                textTransform: 'uppercase',
                color: ativa ? CIANO : '#FFFFFF',
                opacity: falada ? 1 : 0.55,
                transform: `scale(${falada ? 0.9 + pop * 0.1 : 0.9})`,
                textShadow: `0 4px 0 ${AZUL_NOITE}, 0 0 18px ${AZUL_NOITE}, 0 0 34px ${ativa ? CIANO : AZUL_ELETRICO}88`,
                WebkitTextStroke: `2px ${AZUL_NOITE}`,
                display: 'inline-block',
              }}
            >
              {texto.replace(/[,]$/, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ============================ FRASES DE EFEITO ============================ */

const FraseDeEfeito: React.FC<{efeito: Efeito}> = ({efeito}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duracao = f(efeito.ate - efeito.de);
  const barra = spring({frame, fps, config: {damping: 15}});
  const sai = interpolate(frame, [duracao - 8, duracao], [1, 0], clamp);
  const tremor = efeito.tremor ? Math.sin(frame * 2.3) * 6 : 0;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', top: 330}}>
      {/* Faixa de luz azul atrás da frase */}
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 230,
          borderRadius: 40,
          background: `linear-gradient(90deg, transparent, ${AZUL_REAL}CC 20%, ${AZUL_ELETRICO}CC 50%, ${AZUL_REAL}CC 80%, transparent)`,
          filter: 'blur(24px)',
          transform: `scaleX(${barra})`,
          opacity: 0.8 * sai,
        }}
      />
      <div style={{transform: `translateX(${tremor}px)`, opacity: sai, perspective: 1000}}>
        {efeito.linhas.map((l, i) => (
          <LinhaAnimada
            key={i}
            texto={l.texto}
            inicio={f(l.atraso ?? 0)}
            destaque={l.destaque}
            tamanho={l.tamanho ?? 104}
            saida={duracao - 10}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ===================== TELA DIVIDIDA: A GRANDE VERDADE ==================== */

const FundoAzul: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${170 + Math.sin(frame / 40) * 15}deg, ${AZUL_NOITE} 0%, ${AZUL_PROFUNDO} 50%, ${AZUL_REAL} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${50 + Math.sin(frame / 30) * 25}% 75%, ${CIANO}44 0%, transparent 45%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const GrandeVerdade: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duracao = f(DIVIDIDA.ate - DIVIDIDA.de);
  const sai = interpolate(frame, [duracao - 8, duracao], [1, 0], clamp);
  const titulo = spring({frame: frame - f(47.58 - DIVIDIDA.de), fps, config: {damping: 14}});

  return (
    <AbsoluteFill style={{opacity: sai}}>
      <div
        style={{
          position: 'absolute',
          top: 1090,
          width: '100%',
          textAlign: 'center',
          fontFamily,
          fontWeight: 600,
          fontSize: 36,
          letterSpacing: 8,
          color: CIANO,
          opacity: titulo,
          transform: `translateY(${(1 - titulo) * 30}px)`,
        }}
      >
        NÃO SÃO A MESMA COISA
      </div>
      {VERDADE.map((item, i) => {
        const s = spring({frame: frame - f(item.t - DIVIDIDA.de), fps, config: {damping: 13}});
        return (
          <div
            key={item.texto}
            style={{
              position: 'absolute',
              top: 1170 + i * 140,
              left: 90,
              right: 90,
              height: 112,
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              padding: '0 28px',
              borderRadius: 28,
              background: `linear-gradient(90deg, ${AZUL_ELETRICO}55, ${AZUL_PROFUNDO}22)`,
              border: `2px solid ${CIANO}77`,
              boxShadow: `0 0 40px ${AZUL_ELETRICO}55`,
              opacity: s,
              transform: `translateX(${(1 - s) * 500}px) rotateY(${(1 - s) * -40}deg)`,
              filter: `blur(${(1 - s) * 10}px)`,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                background: CIANO,
                color: AZUL_NOITE,
                fontFamily,
                fontWeight: 900,
                fontSize: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{fontFamily, fontWeight: 900, fontSize: 60, color: '#FFFFFF', letterSpacing: -1}}>
              {item.texto}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ========================= GATILHOS EM "CHIPS" ============================ */

const Gatilhos: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duracao = f(CHIPS.ate - CHIPS.de);
  // No final, os chips são "sugados" para o centro e somem
  const suga = interpolate(frame, [duracao - 12, duracao], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', top: 420}}>
      {GATILHOS.map((g) => {
        const s = spring({frame: frame - f(g.t - CHIPS.de), fps, config: {damping: 10, stiffness: 160}});
        const flutua = Math.sin((frame + g.x) / 14) * 8;
        return (
          <div
            key={g.texto}
            style={{
              position: 'absolute',
              transform: `translate(${g.x * (1 - suga)}px, ${(g.y + flutua) * (1 - suga)}px) rotate(${g.rot}deg) scale(${s * (1 - suga * 0.7)})`,
              opacity: Math.min(1, s * 1.5) * (1 - suga),
              padding: '18px 34px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${AZUL_ELETRICO}, ${AZUL_REAL})`,
              border: `3px solid ${CIANO}`,
              boxShadow: `0 10px 40px ${AZUL_NOITE}AA, 0 0 30px ${CIANO}88`,
              fontFamily,
              fontWeight: 900,
              fontSize: 52,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
            }}
          >
            {g.texto}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ================================= EDIÇÃO ================================= */

export type EdicaoProps = {videoArquivo: string};

export const Edicao: React.FC<EdicaoProps> = ({videoArquivo}) => {
  return (
    <AbsoluteFill style={{backgroundColor: AZUL_NOITE}}>
      {/* Fundo azul que aparece por trás do cartão na tela dividida */}
      <Sequence from={f(DIVIDIDA.de)} durationInFrames={f(DIVIDIDA.ate - DIVIDIDA.de) + 20}>
        <FundoAzul />
      </Sequence>

      <Sequence durationInFrames={f(DURACAO_VIDEO_S)}>
        <VideoComCamera videoArquivo={videoArquivo} />
      </Sequence>
      <Vinheta />
      <FlashDeCorte />

      {EFEITOS.map((e) => (
        <Sequence key={e.de} from={f(e.de)} durationInFrames={f(e.ate - e.de)}>
          <FraseDeEfeito efeito={e} />
        </Sequence>
      ))}

      <Sequence from={f(DIVIDIDA.de)} durationInFrames={f(DIVIDIDA.ate - DIVIDIDA.de)}>
        <GrandeVerdade />
      </Sequence>

      <Sequence from={f(CHIPS.de)} durationInFrames={f(CHIPS.ate - CHIPS.de)}>
        <Gatilhos />
      </Sequence>

      <Legenda />

      {/* Abertura: cena 1 */}
      <Sequence durationInFrames={DURACAO_CENA1}>
        <Cena1 kicker="ACADEMIA MENTE EM FORMA" roteiro={ROTEIRO_PADRAO} />
      </Sequence>

      {/* Clímax em tela cheia azul */}
      <Sequence from={f(CLIMAX.de)} durationInFrames={f(CLIMAX.ate - CLIMAX.de) + 20}>
        <Cena1
          kicker=""
          roteiro={ROTEIRO_CLIMAX}
          entraEmCirculo
          abertura={f(CLIMAX.ate - CLIMAX.de) - 6}
          morphInicio={local(71.64)}
          morphFim={local(72.5)}
        />
      </Sequence>

      {/* Cartela final */}
      <Sequence from={f(FINAL.de)}>
        <Cena1
          kicker="ACADEMIA MENTE EM FORMA"
          roteiro={[{linhas: [{texto: 'VOCÊ.', inicio: 4, destaque: true, tamanho: 220}]}]}
          entraEmCirculo
          abertura={9999}
          morphInicio={14}
          morphFim={40}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
