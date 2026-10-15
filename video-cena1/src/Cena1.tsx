import {loadFont} from '@remotion/fonts';
import {interpolatePath} from '@remotion/paths';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {useLayoutEffect} from 'react';
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {z} from 'zod';

// Montserrat (fonte variável) embutida em public/fonts: renderiza sem internet
const fontFamily = 'Montserrat';
loadFont({family: fontFamily, url: staticFile('fonts/montserrat-latin.woff2'), weight: '100 900'});
loadFont({
  family: fontFamily,
  url: staticFile('fonts/montserrat-latin-ext.woff2'),
  weight: '100 900',
  unicodeRange: 'U+0100-024F, U+1E00-1EFF',
});

export const cena1Schema = z.object({
  kicker: z.string(),
  frase1: z.string(),
  frase2: z.string(),
  videoArquivo: z.string(),
});

// Paleta azul da cena
const AZUL_NOITE = '#020722';
const AZUL_PROFUNDO = '#06145C';
const AZUL_REAL = '#1440FF';
const AZUL_ELETRICO = '#2F7BFF';
const CIANO = '#5FD8FF';

// Momentos-chave (frames a 30 fps)
const T_SAIDA_FRASE1 = 78;
const T_ENTRADA_FRASE2 = 96;
const T_PORTAL = 148;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ---------------------------------- Fundo --------------------------------- */

const Fundo: React.FC = () => {
  const frame = useCurrentFrame();
  const angulo = interpolate(frame, [0, 180], [160, 215]);
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
  const angulo = interpolate(frame, [0, 180], [-0.55, 0.45], {
    easing: Easing.inOut(Easing.cubic),
  });
  const distancia = interpolate(frame, [0, 180], [11, 7.2], {
    easing: Easing.inOut(Easing.cubic),
  });
  const altura = interpolate(frame, [0, 180], [2.4, -0.4]);

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
  forma: 'torus' | 'icosa' | 'esfera' | 'knot';
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
      rotation={[rot, rot * 1.3, 0]}
      scale={escala * entrada}
    >
      {forma === 'torus' && <torusGeometry args={[1, 0.38, 48, 96]} />}
      {forma === 'icosa' && <icosahedronGeometry args={[1, 0]} />}
      {forma === 'esfera' && <sphereGeometry args={[1, 64, 64]} />}
      {forma === 'knot' && <torusKnotGeometry args={[0.8, 0.26, 160, 24]} />}
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
      <Objeto3D forma="torus" posicao={[-1.35, 3.1, -1]} escala={0.75} cor={AZUL_ELETRICO} fase={0} />
      <Objeto3D forma="icosa" posicao={[1.45, 2.5, 0.5]} escala={0.6} cor={CIANO} fase={1} />
      <Objeto3D forma="esfera" posicao={[1.35, -3.0, -0.5]} escala={0.55} cor={AZUL_REAL} fase={2} />
      <Objeto3D forma="knot" posicao={[-1.3, -2.8, 0.6]} escala={0.65} cor={AZUL_ELETRICO} fase={3} />
      <Objeto3D forma="esfera" posicao={[-2.1, 0.7, -3]} escala={0.3} cor={CIANO} fase={4} />
      <Objeto3D forma="icosa" posicao={[2.2, -0.5, -3.5]} escala={0.35} cor={AZUL_ELETRICO} fase={5} />
    </ThreeCanvas>
  );
};

/* --------------------------- Forma virando outra -------------------------- */

// Círculo (o "prato") que se transforma em coração (a emoção).
// Os dois caminhos têm 4 curvas cada, então o morph fica suave.
const CIRCULO =
  'M100,20 C144.18,20 180,55.82 180,100 C180,144.18 144.18,180 100,180 C55.82,180 20,144.18 20,100 C20,55.82 55.82,20 100,20 Z';
const CORACAO =
  'M100,62 C112,30 150,22 172,45 C195,70 180,112 100,178 C20,112 5,70 28,45 C50,22 88,30 100,62 Z';

const FormaMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const entrada = spring({frame: frame - 4, fps, config: {damping: 12}});
  const morph = interpolate(frame, [T_SAIDA_FRASE1, T_ENTRADA_FRASE2 + 10], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const caminho = interpolatePath(morph, CIRCULO, CORACAO);
  const pulso = 1 + Math.sin(frame / 5) * 0.025 * morph;
  const giro = interpolate(frame, [0, T_SAIDA_FRASE1, T_ENTRADA_FRASE2 + 10], [-25, 0, 360], clamp);
  const sumir = interpolate(frame, [T_PORTAL - 6, T_PORTAL + 10], [1, 0], clamp);
  const comprimentoTraco = interpolate(frame, [4, 40], [0, 1], clamp);

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <svg
        viewBox="0 0 200 200"
        width={760}
        height={760}
        style={{
          transform: `translateY(-40px) scale(${entrada * pulso}) rotateY(${giro}deg)`,
          opacity: sumir,
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
      </svg>
    </AbsoluteFill>
  );
};

/* ----------------------------- Texto que se mexe -------------------------- */

const FraseAnimada: React.FC<{
  texto: string;
  inicio: number;
  saida?: number;
  destaque?: boolean;
}> = ({texto, inicio, saida, destaque}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const letras = texto.split('');

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'nowrap',
        perspective: 1000,
      }}
    >
      {letras.map((letra, i) => {
        const s = spring({
          frame: frame - inicio - i * 2,
          fps,
          config: {damping: 11, stiffness: 120, mass: 0.7},
        });
        const out =
          saida === undefined
            ? 0
            : interpolate(frame, [saida + i * 1.2, saida + 12 + i * 1.2], [0, 1], {
                ...clamp,
                easing: Easing.in(Easing.cubic),
              });
        const rotX = interpolate(s, [0, 1], [-95, 0]) + out * 80;
        const y = interpolate(s, [0, 1], [120, 0]) - out * 160;
        const z = interpolate(s, [0, 1], [-400, 0]) + out * 500;
        const blur = interpolate(s, [0, 1], [14, 0], clamp) + out * 18;
        const opacidade = Math.min(1, s * 1.4) * (1 - out);
        // Ondulação contínua depois que a letra entra
        const onda = Math.sin((frame - i * 3) / 9) * 6 * s * (1 - out);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              fontFamily,
              fontWeight: 900,
              fontSize: 128,
              letterSpacing: -2,
              lineHeight: 1.05,
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
  const largura = interpolate(frame, [6, 30], [0, 100], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const opacidade = interpolate(frame, [6, 20, T_PORTAL - 4, T_PORTAL + 6], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top: 210,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        opacity: opacidade,
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

/* ------------------------- Portal para o vídeo real ----------------------- */

const Portal: React.FC<{videoArquivo: string}> = ({videoArquivo}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const p = spring({frame: frame - T_PORTAL, fps, config: {damping: 16, mass: 0.9}});
  if (frame < T_PORTAL) return null;

  const w = interpolate(p, [0, 1], [0, width]);
  const h = interpolate(p, [0, 1], [0, height]);
  const raio = interpolate(p, [0, 1], [400, 0]);
  const giro = interpolate(p, [0, 1], [25, 0]);

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', perspective: 1400}}>
      <div
        style={{
          width: w,
          height: h,
          borderRadius: raio,
          overflow: 'hidden',
          transform: `rotateY(${giro}deg)`,
          boxShadow: `0 0 80px ${CIANO}`,
          background: `linear-gradient(180deg, ${AZUL_PROFUNDO}, ${AZUL_NOITE})`,
        }}
      >
        {videoArquivo ? (
          <OffthreadVideo
            src={staticFile(videoArquivo)}
            style={{width, height, objectFit: 'cover'}}
          />
        ) : (
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width,
              height,
              fontFamily,
              fontWeight: 800,
              fontSize: 48,
              color: `${CIANO}AA`,
              letterSpacing: 6,
            }}
          >
            SEU VÍDEO AQUI
          </AbsoluteFill>
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------- Cena ---------------------------------- */

export const Cena1: React.FC<z.infer<typeof cena1Schema>> = ({
  kicker,
  frase1,
  frase2,
  videoArquivo,
}) => {
  const frame = useCurrentFrame();

  // Câmera "de mão": a camada 2D também se move em 3D, junto com a cena
  const camRotX = interpolate(frame, [0, 180], [14, -4], {easing: Easing.inOut(Easing.cubic)});
  const camRotY = interpolate(frame, [0, 180], [-10, 8], {easing: Easing.inOut(Easing.cubic)});
  const camZoom = interpolate(frame, [0, 180], [1.18, 1], {easing: Easing.out(Easing.cubic)});
  const tremor = Math.sin(frame / 6) * 3;
  const sumirTexto = interpolate(frame, [T_PORTAL - 4, T_PORTAL + 8], [1, 0], clamp);

  return (
    <AbsoluteFill style={{backgroundColor: AZUL_NOITE}}>
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
          <AbsoluteFill
            style={{alignItems: 'center', justifyContent: 'center', opacity: sumirTexto}}
          >
            {frame < T_ENTRADA_FRASE2 + 4 ? (
              <FraseAnimada texto={frase1} inicio={10} saida={T_SAIDA_FRASE1} />
            ) : (
              <FraseAnimada texto={frase2} inicio={T_ENTRADA_FRASE2} destaque />
            )}
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
      <Kicker texto={kicker} />
      <Portal videoArquivo={videoArquivo} />
    </AbsoluteFill>
  );
};
