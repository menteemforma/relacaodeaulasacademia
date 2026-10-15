import {loadFont} from '@remotion/fonts';
import {interpolatePath} from '@remotion/paths';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {useLayoutEffect} from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Montserrat (fonte variável) embutida em public/fonts: renderiza sem internet
const fontFamily = 'Montserrat';
loadFont({family: fontFamily, url: staticFile('fonts/montserrat-latin.woff2'), weight: '100 900'});
loadFont({
  family: fontFamily,
  url: staticFile('fonts/montserrat-latin-ext.woff2'),
  weight: '100 900',
  unicodeRange: 'U+0100-024F, U+1E00-1EFF',
});

// Paleta azul da cena
const AZUL_NOITE = '#020722';
const AZUL_PROFUNDO = '#06145C';
const AZUL_REAL = '#1440FF';
const AZUL_ELETRICO = '#2F7BFF';
const CIANO = '#5FD8FF';

/*
 * Roteiro sincronizado com a fala (frames a 30 fps; tempos do Whisper):
 *   0,34s "medicação"  · 0,80s "reduz"  · 2,40s "food noise"
 *   3,40s "urgência"   · 4,82s "fome"   · 5,14s "isso é maravilhoso"
 *   6,24s "Mas eu preciso te perguntar..."  -> a cena se abre e revela o vídeo
 */
export type Linha = {texto: string; inicio: number; destaque?: boolean; tamanho?: number};
export type Frase = {linhas: Linha[]; saida?: number};

export const ROTEIRO_PADRAO: Frase[] = [
  {linhas: [{texto: 'A MEDICAÇÃO', inicio: 6}], saida: 22},
  {
    linhas: [
      {texto: 'REDUZ O', inicio: 26, tamanho: 96},
      {texto: 'FOOD NOISE', inicio: 66, destaque: true},
    ],
    saida: 90,
  },
  {
    linhas: [
      {texto: 'A URGÊNCIA', inicio: 100},
      {texto: 'E A FOME', inicio: 136, destaque: true},
    ],
    saida: 148,
  },
  {
    linhas: [
      {texto: 'ISSO É', inicio: 154, tamanho: 96},
      {texto: 'MARAVILHOSO', inicio: 162, destaque: true, tamanho: 104},
    ],
  },
];

// Momentos-chave
const T_MORPH_INICIO = 150; // "isso é maravilhoso": a cápsula vira cérebro
const T_MORPH_FIM = 176;
export const T_ABERTURA = 184; // "Mas..." (6,24s): a cena se abre
export const DURACAO_CENA1 = 204;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ---------------------------------- Fundo --------------------------------- */

const Fundo: React.FC = () => {
  const frame = useCurrentFrame();
  const angulo = interpolate(frame, [0, DURACAO_CENA1], [160, 215]);
  const brilhoX = 50 + Math.sin(frame / 28) * 22;
  const brilhoY = 38 + Math.cos(frame / 34) * 12;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angulo}deg, ${AZUL_NOITE} 0%, ${AZUL_PROFUNDO} 45%, ${AZUL_REAL} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${brilhoX}% ${brilhoY}%, ${AZUL_ELETRICO}AA 0%, transparent 45%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${100 - brilhoX}% ${88 - brilhoY / 3}%, ${CIANO}55 0%, transparent 40%)`,
        }}
      />
      <GradeEmPerspectiva />
    </AbsoluteFill>
  );
};

// Grade no chão que "anda" para dar sensação de câmera avançando
const GradeEmPerspectiva: React.FC = () => {
  const frame = useCurrentFrame();
  const deslocamento = (frame * 6) % 120;
  return (
    <AbsoluteFill style={{perspective: 900, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: '-50%',
          width: '200%',
          height: 1400,
          bottom: -500,
          transform: 'rotateX(72deg)',
          backgroundImage: `linear-gradient(${CIANO}33 2px, transparent 2px), linear-gradient(90deg, ${CIANO}33 2px, transparent 2px)`,
          backgroundSize: '120px 120px',
          backgroundPosition: `0 ${deslocamento}px`,
          maskImage: 'linear-gradient(to top, black 10%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 80%)',
        }}
      />
    </AbsoluteFill>
  );
};

/* -------------------------------- Cena 3D --------------------------------- */

// A câmera orbita e se aproxima dos objetos ao longo da cena
const CameraEmMovimento: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const angulo = interpolate(frame, [0, DURACAO_CENA1], [-0.55, 0.45], {
    easing: Easing.inOut(Easing.cubic),
  });
  const distancia = interpolate(frame, [0, DURACAO_CENA1], [11, 7.2], {
    easing: Easing.inOut(Easing.cubic),
  });
  const altura = interpolate(frame, [0, DURACAO_CENA1], [2.4, -0.4]);

  // useLayoutEffect + invalidate: a câmera é posicionada ANTES do quadro ser desenhado
  useLayoutEffect(() => {
    camera.position.set(
      Math.sin(angulo) * distancia,
      altura,
      Math.cos(angulo) * distancia,
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, invalidate, angulo, distancia, altura]);

  return null;
};

type ObjetoProps = {
  posicao: [number, number, number];
  escala: number;
  cor: string;
  forma: 'torus' | 'icosa' | 'esfera' | 'capsula';
  fase: number;
};

const Objeto3D: React.FC<ObjetoProps> = ({posicao, escala, cor, forma, fase}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrada = spring({frame: frame - fase * 4, fps, config: {damping: 14}});
  const flutua = Math.sin((frame + fase * 20) / 18) * 0.25;
  const rot = frame / 40 + fase;

  return (
    <mesh
      position={[posicao[0], posicao[1] + flutua, posicao[2]]}
      rotation={[rot, rot * 1.3, forma === 'capsula' ? 0.8 : 0]}
      scale={escala * entrada}
    >
      {forma === 'torus' && <torusGeometry args={[1, 0.38, 48, 96]} />}
      {forma === 'icosa' && <icosahedronGeometry args={[1, 0]} />}
      {forma === 'esfera' && <sphereGeometry args={[1, 64, 64]} />}
      {forma === 'capsula' && <capsuleGeometry args={[0.5, 1.2, 16, 48]} />}
      <meshPhysicalMaterial
        color={cor}
        emissive={AZUL_PROFUNDO}
        emissiveIntensity={0.35}
        metalness={0.25}
        roughness={0.12}
        clearcoat={1}
        clearcoatRoughness={0.05}
        flatShading={forma === 'icosa'}
      />
    </mesh>
  );
};

const Cena3D: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{fov: 42, near: 0.1, far: 100}}>
      <CameraEmMovimento />
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 6, 8]} intensity={320} color="#ffffff" />
      <pointLight position={[-7, -3, 4]} intensity={260} color={CIANO} />
      <pointLight position={[0, -6, -6]} intensity={200} color={AZUL_REAL} />
      <Objeto3D forma="capsula" posicao={[-1.35, 3.1, -1]} escala={0.8} cor={AZUL_ELETRICO} fase={0} />
      <Objeto3D forma="icosa" posicao={[1.45, 2.5, 0.5]} escala={0.6} cor={CIANO} fase={1} />
      <Objeto3D forma="esfera" posicao={[1.35, -3.0, -0.5]} escala={0.55} cor={AZUL_REAL} fase={2} />
      <Objeto3D forma="capsula" posicao={[-1.3, -2.8, 0.6]} escala={0.7} cor={CIANO} fase={3} />
      <Objeto3D forma="torus" posicao={[-2.1, 0.7, -3]} escala={0.3} cor={CIANO} fase={4} />
      <Objeto3D forma="icosa" posicao={[2.2, -0.5, -3.5]} escala={0.35} cor={AZUL_ELETRICO} fase={5} />
    </ThreeCanvas>
  );
};

/* --------------------------- Forma virando outra -------------------------- */

// Cápsula de remédio (a medicação) que se transforma em cérebro (a mente).
const CAPSULA =
  'M60,70 L140,70 C156.6,70 170,83.4 170,100 C170,116.6 156.6,130 140,130 L60,130 C43.4,130 30,116.6 30,100 C30,83.4 43.4,70 60,70 Z';
const CEREBRO =
  'M100,40 C112,26 136,28 144,42 C162,40 176,56 170,72 C184,82 184,104 170,112 C176,130 160,146 142,142 C134,158 110,160 100,148 C90,160 66,158 58,142 C40,146 24,130 30,112 C16,104 16,82 30,72 C24,56 38,40 56,42 C64,28 88,26 100,40 Z';
// Detalhes internos: divisão da cápsula e sulcos do cérebro
const DIVISAO_CAPSULA = 'M100,70 L100,130';
const SULCOS_CEREBRO =
  'M100,44 C92,70 108,100 100,146 M66,70 C78,74 82,88 74,98 M134,70 C122,74 118,88 126,98 M58,116 C70,112 80,118 82,128 M142,116 C130,112 120,118 118,128';

const FormaMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const entrada = spring({frame: frame - 2, fps, config: {damping: 12}});
  const morph = interpolate(frame, [T_MORPH_INICIO, T_MORPH_FIM], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const caminho = interpolatePath(morph, CAPSULA, CEREBRO);
  const pulso = 1 + Math.sin(frame / 5) * 0.03 * morph;
  // A cápsula fica inclinada; no morph ela dá uma volta completa e assenta
  const inclinacao = interpolate(frame, [0, T_MORPH_INICIO, T_MORPH_FIM], [-35, -20, 0], clamp);
  const giroY = interpolate(frame, [T_MORPH_INICIO, T_MORPH_FIM], [0, 360], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const comprimentoTraco = interpolate(frame, [2, 30], [0, 1], clamp);

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <svg
        viewBox="0 0 200 200"
        width={780}
        height={780}
        style={{
          transform: `translateY(-30px) scale(${entrada * pulso}) rotateY(${giroY}deg) rotate(${inclinacao}deg)`,
          filter: `drop-shadow(0 0 30px ${CIANO}) drop-shadow(0 0 70px ${AZUL_ELETRICO})`,
          overflow: 'visible',
        }}
      >
        <defs>
          <linearGradient id="tracoAzul" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor={CIANO} />
            <stop offset="100%" stopColor={AZUL_REAL} />
          </linearGradient>
          <radialGradient id="preenchimento" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={AZUL_ELETRICO} stopOpacity={0.55} />
            <stop offset="100%" stopColor={AZUL_PROFUNDO} stopOpacity={0.15} />
          </radialGradient>
        </defs>
        <path
          d={caminho}
          fill="url(#preenchimento)"
          stroke="url(#tracoAzul)"
          strokeWidth={3.2}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - comprimentoTraco}
        />
        <path
          d={DIVISAO_CAPSULA}
          stroke="url(#tracoAzul)"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={Math.max(0, comprimentoTraco * (1 - morph * 3))}
        />
        <path
          d={SULCOS_CEREBRO}
          fill="none"
          stroke="url(#tracoAzul)"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={interpolate(morph, [0.7, 1], [0, 0.9], clamp)}
        />
      </svg>
    </AbsoluteFill>
  );
};

/* ----------------------------- Texto que se mexe -------------------------- */

const LinhaAnimada: React.FC<Linha & {saida?: number}> = ({
  texto,
  inicio,
  saida,
  destaque,
  tamanho = 112,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', perspective: 1000}}>
      {texto.split('').map((letra, i) => {
        const s = spring({
          frame: frame - inicio - i * 1.5,
          fps,
          config: {damping: 11, stiffness: 130, mass: 0.6},
        });
        const out =
          saida === undefined
            ? 0
            : interpolate(frame, [saida + i * 0.8, saida + 9 + i * 0.8], [0, 1], {
                ...clamp,
                easing: Easing.in(Easing.cubic),
              });
        const rotX = interpolate(s, [0, 1], [-95, 0]) + out * 80;
        const y = interpolate(s, [0, 1], [110, 0]) - out * 160;
        const z = interpolate(s, [0, 1], [-400, 0]) + out * 500;
        const blur = interpolate(s, [0, 1], [14, 0], clamp) + out * 18;
        const opacidade = Math.min(1, s * 1.4) * (1 - out);
        // Ondulação contínua depois que a letra entra
        const onda = Math.sin((frame - i * 3) / 9) * 5 * s * (1 - out);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              fontFamily,
              fontWeight: 900,
              fontSize: tamanho,
              letterSpacing: -2,
              lineHeight: 1.08,
              color: '#FFFFFF',
              backgroundImage: destaque
                ? `linear-gradient(180deg, #FFFFFF 15%, ${CIANO} 100%)`
                : undefined,
              WebkitBackgroundClip: destaque ? 'text' : undefined,
              WebkitTextFillColor: destaque ? 'transparent' : undefined,
              textShadow: destaque ? undefined : `0 0 40px ${AZUL_ELETRICO}`,
              filter: `blur(${blur}px)${destaque ? ` drop-shadow(0 0 28px ${CIANO}AA)` : ''}`,
              opacity: opacidade,
              transform: `translate3d(0, ${y + onda}px, ${z}px) rotateX(${rotX}deg)`,
            }}
          >
            {letra}
          </span>
        );
      })}
    </div>
  );
};

const Kicker: React.FC<{texto: string}> = ({texto}) => {
  const frame = useCurrentFrame();
  const largura = interpolate(frame, [4, 26], [0, 100], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 210,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        opacity: interpolate(frame, [4, 16], [0, 1], clamp),
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 500,
          fontSize: 34,
          letterSpacing: 10,
          color: CIANO,
          padding: '14px 30px',
          border: `2px solid ${CIANO}66`,
          borderRadius: 999,
          background: `${AZUL_NOITE}88`,
          clipPath: `inset(0 ${(100 - largura) / 2}% 0 ${(100 - largura) / 2}% round 999px)`,
        }}
      >
        {texto}
      </div>
    </div>
  );
};

/* ---------------------------------- Cena ---------------------------------- */

export type Cena1Props = {kicker: string; roteiro: Frase[]};

/**
 * Camada de abertura. No fim ela se abre num círculo luminoso e deixa
 * transparente o que estiver por baixo (o vídeo gravado, em VideoCompleto).
 */
export const Cena1: React.FC<Cena1Props> = ({kicker, roteiro}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();

  // Câmera "de mão": a camada 2D também se move em 3D, junto com a cena
  const camRotX = interpolate(frame, [0, DURACAO_CENA1], [14, -4], {easing: Easing.inOut(Easing.cubic)});
  const camRotY = interpolate(frame, [0, DURACAO_CENA1], [-10, 8], {easing: Easing.inOut(Easing.cubic)});
  const camZoom = interpolate(frame, [0, DURACAO_CENA1], [1.18, 1], {easing: Easing.out(Easing.cubic)});
  const tremor = Math.sin(frame / 6) * 3;

  // Abertura: um buraco circular cresce do centro e revela o vídeo
  const abre = spring({frame: frame - T_ABERTURA, fps, config: {damping: 18, mass: 0.8}});
  const raio = frame < T_ABERTURA ? 0 : abre * height * 1.15;
  const mascara =
    raio > 0
      ? `radial-gradient(circle at 50% 48%, transparent ${raio}px, black ${raio + 2}px)`
      : undefined;
  // Na abertura, a cena dá um "mergulho" para dentro do buraco
  const mergulho = 1 + abre * 0.6;

  const fraseAtual = roteiro.findIndex((f, i) => {
    const proxima = roteiro[i + 1];
    return !proxima || frame < proxima.linhas[0].inicio;
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{maskImage: mascara, WebkitMaskImage: mascara}}>
        <AbsoluteFill style={{transform: `scale(${mergulho})`}}>
          <Fundo />
          <Cena3D />
          <AbsoluteFill style={{perspective: 1600}}>
            <AbsoluteFill
              style={{
                transform: `scale(${camZoom}) rotateX(${camRotX}deg) rotateY(${camRotY}deg) translateY(${tremor}px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <FormaMorph />
              <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
                {roteiro[fraseAtual]?.linhas.map((linha, i) => (
                  <LinhaAnimada
                    key={`${fraseAtual}-${i}`}
                    {...linha}
                    saida={roteiro[fraseAtual].saida}
                  />
                ))}
              </AbsoluteFill>
            </AbsoluteFill>
          </AbsoluteFill>
          <Kicker texto={kicker} />
        </AbsoluteFill>
      </AbsoluteFill>
      {/* Anel de luz na borda da abertura */}
      {raio > 0 && abre < 0.98 ? (
        <div
          style={{
            position: 'absolute',
            left: `calc(50% - ${raio}px)`,
            top: `calc(48% - ${raio}px)`,
            width: raio * 2,
            height: raio * 2,
            borderRadius: '50%',
            border: `6px solid ${CIANO}`,
            boxShadow: `0 0 60px ${CIANO}, inset 0 0 60px ${AZUL_ELETRICO}`,
            opacity: 1 - abre,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
