import {Composition} from 'remotion';
import {Cena1, cena1Schema} from './Cena1';

export const FPS = 30;
export const DURACAO_CENA1 = 6 * FPS;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Cena1"
      component={Cena1}
      durationInFrames={DURACAO_CENA1}
      fps={FPS}
      width={1080}
      height={1920}
      schema={cena1Schema}
      defaultProps={{
        kicker: 'ACADEMIA MENTE EM FORMA',
        frase1: 'NÃO É FOME',
        frase2: 'É EMOÇÃO',
        // Coloque o vídeo em public/ e escreva o nome aqui, ex.: "video-edicao.mp4".
        // Vazio = mostra um espaço reservado no final da cena.
        videoArquivo: '',
      }}
    />
  );
};
