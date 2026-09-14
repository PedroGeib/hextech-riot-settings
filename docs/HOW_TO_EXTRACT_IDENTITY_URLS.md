# Como popular o manifest de Bandeiras e Molduras

Este app não baixa, não distribui e não replica assets do League of
Legends. A seção **Personalizar Identidade** lê o arquivo
`renderer/assets/lol-profile/identity-cdn.json` na primeira vez que a
aba é aberta e usa as URLs que você mesmo adicionou lá.

O passo a passo abaixo é genérico: você abre o client do LoL com
DevTools, navega até a tela de identidade, copia as URLs dos assets
visíveis, e cola no manifest local.

---

## 1. Habilitar DevTools no client do LoL

O client do LoL é Electron, então a chave é a mesma usada em outros
apps Electron. Crie (ou edite) o arquivo
`C:\Riot Games\League of Legends\Config\game.cfg` e ajuste:

```ini
[General]
EnableDeveloperConsole=1
```

Reinicie o client. Agora `F12` (ou `Ctrl+Shift+I`) abre o DevTools em
qualquer tela do client.

> Observação: o LoL reinicia o client silenciosamente quando você
> altera `game.cfg`. Salve o que estiver fazendo antes.

## 2. Abrir a tela de identidade

No client, clique no seu ícone de invocador → **Personalizar
Identidade**. A tela abre com as abas **Ícones / Molduras / Emblemas /
Títulos / Bandeiras**.

## 3. Capturar as URLs pelo DevTools

1. Abra o DevTools (`F12`).
2. Vá na aba **Network** e filtre por `Img` (ou `png|dds|webp`).
3. Na tela do LoL, clique na aba **Molduras** — vai aparecer uma
   enxurrada de requests. Cada moldura é uma request de imagem.
4. Clique com o botão direito numa linha de imagem → **Copy →
   Copy link address**.
5. Repita para **Bandeiras**.

Os hosts mais comuns são domínios da Riot (CommunityDragon,
`lolstatic-*`, `*.akamaihd.net`). Esses domínios já estão liberados na
CSP do `index.html`.

## 4. Preencher o manifest

Edite `renderer/assets/lol-profile/identity-cdn.json`:

```json
{
  "version": 1,
  "bandeiras": [
    {
      "id": "LMS_2024_AUTOGRAPHED",
      "name": "Bandeira Hall of Legends 2024: Edição Autografada",
      "subtitle": "Exclusivo",
      "url": "https://...",
      "unlocked": true
    }
  ],
  "molduras": [
    {
      "id": "FRAME_PLATINA",
      "name": "Moldura Platina",
      "subtitle": "Solo/Duo",
      "url": "https://...",
      "unlocked": true
    }
  ]
}
```

Campos:

- `id` — string única que identifica o item (use a referência que o
  client expõe, ou um slug seu).
- `name` — texto que aparece no card.
- `subtitle` — opcional, linha secundária (rank, evento, etc.).
- `url` — URL absoluta do asset. Sem URL, o card mostra um placeholder.
- `unlocked` — `false` para itens bloqueados (ícone de cadeado). Se
  omitir, o item é tratado como desbloqueado.

## 5. Recarregar a UI

Volte no app e troque de aba (Molduras → Bandeiras) ou role a página
até a seção aparecer. O loader usa `IntersectionObserver`: a primeira
vez que a seção entra na viewport, o manifest é lido e cacheado em
memória até a próxima reload.

## Dicas

- O cache é só em memória (não persiste). Para atualizar, basta
  salvar o JSON e dar reload no app.
- O `<img>` usa `loading="lazy"` e `decoding="async"`, então o app
  não bloqueia esperando as imagens.
- Se uma imagem falhar, o card mostra apenas o placeholder (sem
  quebrar o grid).
- Você pode misturar bandeiras e molduras de tiers/regiões
  diferentes no mesmo manifest — o filtro de busca e o
  "Exibir desabilitadas" funcionam para todas.

## Limitações

- O app não valida nem normaliza URLs. Cole o link completo.
- Não há fallback offline — sem internet, os `<img>` não carregam.
- Sem CDN pré-baixado: o app é leve, mas precisa de rede na primeira
  vez que cada URL é requisitada.
