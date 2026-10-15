import {AbsoluteFill, Composition, OffthreadVideo, Sequence, staticFile} from 'remotion';
import {Cena1, Cena1Props, DURACAO_CENA1, ROTEIRO_PADRAO} from './Cena1';

export const FPS = 30;

const propsCena1: Cena1Props = {
  kicker: 'ACADEMIA MENTE EM FORMA',
  roteiro: ROTEIRO_PADRAO,
};

type VideoCompletoProps = Cena1Props & {
  // Arquivo dentro de public/. O áudio do vídeo toca desde o primeiro quadro.
  videoArquivo: string;
  duracaoSegundos: number;
};

const VideoCompleto: React.FC<VideoCompletoProps> = ({videoArquivo, ...cena}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#020722'}}>
      <OffthreadVideo src={staticFile(videoArquivo)} />
      <Sequence durationInFrames={DURACAO_CENA1}>
        <Cena1 {...cena} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Só a abertura (fundo transparente no final, onde entra o vídeo) */}
      <Composition
        id="Cena1"
        component={Cena1}
        durationInFrames={DURACAO_CENA1}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={propsCena1}
      />
      {/* Abertura + vídeo gravado completo */}
      <Composition
        id="VideoCompleto"
        component={VideoCompleto}
        durationInFrames={Math.round(78.13 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{...propsCena1, videoArquivo: 'video-edicao.mp4', duracaoSegundos: 78.13}}
        calculateMetadata={({props}) => ({
          durationInFrames: Math.round(props.duracaoSegundos * FPS),
        })}
      />
    </>
  );
};
