# Vector Space — Template de Portfólio

[English](README.md) | **Português**

Um portfólio open source que transforma seus projetos e experiências em um espaço 3D explorável. Personalize arquivos de conteúdo estruturado mantendo o motor visual, a navegação e o layout dos cases.

![Visão desktop do portfólio genérico, com identidade central e quatro regiões de carreira](docs/assets/overview.png)

O template inclui uma identidade genérica, um projeto de exemplo e uma experiência conectada. Formação e comunidade começam vazias. As imagens de exemplo são SVGs criados localmente, a métrica demonstrativa é fictícia e os contatos ficam desabilitados até serem configurados.

## Comece aqui

| Quero… | Leia |
|---|---|
| Instalar o Node.js e rodar o template | [Primeiros passos](docs/pt-BR/getting-started.md) |
| Adicionar minha identidade, projetos, imagens e experiência | [Monte seu portfólio](docs/pt-BR/build-your-portfolio.md) |
| Consultar um campo, tipo de bloco ou configuração | [Referência de conteúdo](docs/pt-BR/content-reference.md) |
| Entender ou contribuir com o motor | [Arquitetura](docs/pt-BR/architecture.md) |
| Resolver um problema de instalação, conteúdo ou renderização | [Solução de problemas](docs/pt-BR/troubleshooting.md) |

Cada guia tem um seletor de idioma que leva à página equivalente. O idioma da documentação é independente dos idiomas configurados no portfólio.

## Início rápido

Com Node.js 24 LTS, npm e Git instalados:

```bash
git clone https://github.com/Marlon-Souza16/portifolio.git my-portfolio
cd my-portfolio
npm install
npm run dev
```

Abra [localhost:3000/pt](http://localhost:3000/pt) ou [localhost:3000/en](http://localhost:3000/en). Se você clonou seu próprio fork, use a URL dele. Ainda não tem Node.js? Siga [Primeiros passos](docs/pt-BR/getting-started.md).

## O que você pode personalizar

A maioria das alterações fica em três lugares:

| Local | Finalidade |
|---|---|
| `src/content/` | Identidade, itens, clusters, traduções e registro de conteúdo |
| `public/assets/` | Imagens, diagramas e arquivos de currículo |
| `portfolio.config.ts` | Idiomas disponíveis, idioma padrão e marca do motor |

O motor oferece sinais semânticos compartilhados entre órbitas e cases, conexões entre itens, capas opcionais, galerias com várias imagens e cinco tipos de bloco editorial. O conteúdo é validado antes da renderização. A interface inclui navegação por teclado, movimento reduzido, layouts responsivos e uma alternativa HTML quando o WebGL está indisponível.

A aplicação usa Next.js, React, TypeScript, Three.js, React Three Fiber, Drei, next-intl, Zustand e Zod. Você não precisa conhecer essas bibliotecas para editar o conteúdo de exemplo.

## Comandos úteis

| Comando | Finalidade |
|---|---|
| `npm run dev` | Iniciar o servidor de desenvolvimento local |
| `npm run typecheck` | Verificar o TypeScript |
| `npm test` | Executar os testes; exige um shell compatível com POSIX |
| `npm run build` | Validar o conteúdo ativo e gerar o build de produção |
| `npm start` | Servir o build de produção localmente, depois de gerá-lo |

Para a primeira personalização, comece pelo [tutorial guiado](docs/pt-BR/build-your-portfolio.md). Ele também explica os testes que verificam intencionalmente os exemplos do template. Publicar é opcional; [Primeiros passos](docs/pt-BR/getting-started.md#opcional-publicar-depois) aponta para a documentação da Vercel quando você quiser avançar.

## Contribuindo

Leia o [guia de arquitetura](docs/pt-BR/architecture.md) antes de alterar o motor. Mantenha a personalização de conteúdo independente da renderização, verifique a navegação afetada e atualize os dois idiomas ao alterar a documentação. Use os comandos npm acima; este repositório não tem um comando separado de lint.

## Licença

[MIT](LICENSE). Você pode usar, modificar e distribuir o template, inclusive comercialmente, preservando os avisos de copyright e licença exigidos. As dependências mantêm suas respectivas licenças.

### Otimização de imagens e texturas

Execute `npm run optimize:images` após adicionar imagens raster. O pipeline preserva
os originais e gera variantes para a cena e o foco. Consulte o
[guia de desempenho de imagens (inglês)](docs/en/image-performance.md).
