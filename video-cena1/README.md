# Cena 1 — Remotion (azul em gradiente)

Abertura vertical 1080×1920, 6 s, 30 fps:

- **Texto que se mexe:** "NÃO É FOME" entra letra por letra em 3D e sai voando; "É EMOÇÃO" entra com brilho ciano.
- **Forma virando outra:** um círculo (o prato) se transforma em coração (a emoção) no momento da troca de frase.
- **Câmera em movimento:** a câmera 3D orbita e se aproxima, a camada de texto inclina junto e a grade do chão avança.
- **Imagens 3D:** toro, icosaedro, esferas e nó em vidro azul (three.js).
- **Final:** um portal se abre e revela o seu vídeo.

## Como usar no Mac

```bash
cd video-cena1
npm install
npm run dev        # abre o Remotion Studio no navegador
npm run render     # gera out/cena1.mp4
```

No Studio, os textos (`kicker`, `frase1`, `frase2`) podem ser editados no painel lateral.

## Colocar o seu vídeo no final

1. Copie o vídeo para `video-cena1/public/` (ex.: `public/video-edicao.mov`).
2. Em `src/Root.tsx`, preencha `videoArquivo: 'video-edicao.mov'`.

Os vídeos em `public/` ficam fora do Git (`.gitignore`), porque são pesados.

## Onde ajustar

Tudo está em `src/Cena1.tsx`:

- Cores: constantes `AZUL_*` e `CIANO` no topo.
- Tempo: `T_SAIDA_FRASE1`, `T_ENTRADA_FRASE2`, `T_PORTAL` (em frames; 30 = 1 segundo).
- Formas do morph: `CIRCULO` e `CORACAO` (caminhos SVG com 4 curvas cada).
