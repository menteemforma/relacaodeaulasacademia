import {Composition} from 'remotion';
import {Cena1, Cena1Props, DURACAO_CENA1, ROTEIRO_PADRAO} from './Cena1';
import {DURACAO_TOTAL_S, Edicao, EdicaoProps, FPS} from './Edicao';

const propsCena1: Cena1Props = {
  kicker: 'ACADEMIA MENTE EM FORMA',
  roteiro: ROTEIRO_PADRAO,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vídeo editado completo: abertura, legendas, frases de efeito, câmera, clímax e final */}
      <Composition
        id="Edicao"
        component={Edicao}
        durationInFrames={Math.round(DURACAO_TOTAL_S * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{videoArquivo: 'video-edicao.mp4'} satisfies EdicaoProps}
      />
      {/* Só a abertura */}
      <Composition
        id="Cena1"
        component={Cena1}
        durationInFrames={DURACAO_CENA1}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={propsCena1}
      />
    </>
  );
};
