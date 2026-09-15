# Vector Space — Portfolio Template

**English** | [Português](README.pt-BR.md)

An open-source portfolio that turns your projects and experience into an explorable 3D space. Customize structured content files while keeping the visual engine, navigation and case-study layout.

![Desktop view of the generic portfolio, with a central identity and four career regions](docs/assets/overview.png)

The starter includes a generic identity, one example project and one connected experience. Education and community regions start empty. Example images are locally authored SVGs, the demonstration metric is fictional, and contact actions stay disabled until you configure them.

## Start here

| I want to… | Read |
|---|---|
| Install Node.js and run the template | [Getting started](docs/en/getting-started.md) |
| Add my identity, projects, images and experience | [Build your portfolio](docs/en/build-your-portfolio.md) |
| Look up a field, block type or configuration option | [Content reference](docs/en/content-reference.md) |
| Understand or contribute to the engine | [Architecture](docs/en/architecture.md) |
| Fix an installation, content or rendering issue | [Troubleshooting](docs/en/troubleshooting.md) |

Each guide has a language switch linking to the equivalent page. Documentation language is independent of the languages configured in your portfolio.

## Quick start

With Node.js 24 LTS, npm and Git installed:

```bash
git clone https://github.com/Marlon-Souza16/portifolio.git my-portfolio
cd my-portfolio
npm install
npm run dev
```

Open [localhost:3000/en](http://localhost:3000/en) or [localhost:3000/pt](http://localhost:3000/pt). If you cloned your own fork, use its repository URL instead. New to Node.js? Follow [Getting started](docs/en/getting-started.md) first.

## What you can customize

Most personalizations stay in three places:

| Location | Purpose |
|---|---|
| `src/content/` | Identity, entries, clusters, translations and the content registry |
| `public/assets/` | Images, diagrams and resume files |
| `portfolio.config.ts` | Available languages, default language and engine branding |

The engine supports semantic signals shared between orbits and cases, connections between entries, optional covers, multiple gallery images and five editorial block types. Content is validated before rendering. The interface includes keyboard navigation, reduced motion, responsive layouts and an HTML fallback when WebGL is unavailable.

The application uses Next.js, React, TypeScript, Three.js, React Three Fiber, Drei, next-intl, Zustand and Zod. You do not need to understand these libraries to edit the example content.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run the local development server |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run the test suite; requires a POSIX-compatible shell |
| `npm run build` | Validate active content and create a production build |
| `npm start` | Serve the production build locally, after building |

For your first customization, begin with the [guided tutorial](docs/en/build-your-portfolio.md). It also explains the tests that intentionally check the starter fixtures. Publishing is optional; [Getting started](docs/en/getting-started.md#optional-publish-later) points to Vercel's documentation when you are ready.

## Contributing

Read the [architecture guide](docs/en/architecture.md) before changing engine behavior. Keep content customization independent of rendering code, verify affected navigation and update both language versions when changing documentation. Use the existing npm commands above; there is no separate lint command in this repository.

## License

[MIT](LICENSE). Use, modify and distribute the template, including commercially, while retaining the required copyright and license notices. Dependencies retain their respective licenses.

### Image and texture optimization

Run `npm run optimize:images` after adding raster assets. The reusable pipeline
preserves originals and generates contextual scene/focus variants.
See [image performance](docs/en/image-performance.md) for sizes, formats, fallbacks
and production profiling instructions.
