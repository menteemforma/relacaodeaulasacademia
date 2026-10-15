# Cena 1 — Remotion (azul em gradiente)

Abertura vertical 1080×1920 sincronizada com a fala do vídeo *"VIDEO EDIÇÃO"*
(medicação × repertório emocional). Dura 6,8 s e se abre para o vídeo gravado.

| Tempo | Fala | Na tela |
|---|---|---|
| 0,3 s | "Se a medicação…" | **A MEDICAÇÃO** |
| 0,8 s | "…reduz drasticamente o seu food noise…" | **REDUZ O / FOOD NOISE** |
| 3,4 s | "…a sua urgência por comer e a sua fome…" | **A URGÊNCIA / E A FOME** |
| 5,1 s | "…isso é maravilhoso." | **ISSO É / MARAVILHOSO** + a cápsula vira cérebro |
| 6,2 s | "Mas eu preciso te perguntar…" | a cena se abre num círculo de luz e revela o vídeo |

Elementos:

- **Texto que se mexe:** cada letra entra girando em 3D e sai voando.
- **Forma virando outra:** cápsula de remédio → cérebro (a caneta não constrói a pessoa).
- **Câmera em movimento:** câmera 3D orbitando e se aproximando; a camada de texto inclina junto.
- **Imagens 3D:** cápsulas, esferas e poliedros em vidro azul (three.js).
- O áudio original toca desde o primeiro quadro.

## Como usar no Mac

```bash
cd video-cena1
npm install
# coloque o vídeo em public/video-edicao.mp4 (fica fora do Git por ser pesado)
npm run dev                                          # Remotion Studio
npx remotion render VideoCompleto out/video-final.mp4  # vídeo completo
npx remotion render Cena1 out/cena1.mp4              # só a abertura
```

## Onde ajustar

- `src/Cena1.tsx` → `ROTEIRO_PADRAO`: textos e o frame em que cada linha entra (30 frames = 1 s).
- `T_MORPH_INICIO`, `T_MORPH_FIM`, `T_ABERTURA`: morph e abertura.
- Cores: constantes `AZUL_*` e `CIANO`.
- `src/Root.tsx` → `videoArquivo` e `duracaoSegundos` do vídeo gravado.
