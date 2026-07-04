# CLAUDE.md

This file provides guidance for AI assistants (Claude Code) working in this repository.

## Repository purpose

This is a minimal static website hosted via **GitHub Pages**, built with **Jekyll**. The
content ("První lekce" — Czech for "First lesson") indicates this is an introductory /
teaching repo for the basics of web development (HTML). Expect it to grow lesson by
lesson as plain HTML/CSS/JS files rather than a JS framework or build tooling.

## Repository structure

```
.
├── _config.yml    # Jekyll config — sets the theme (jekyll-theme-leap-day)
└── index.html     # Site homepage, plain HTML
```

There is no build step, package manager, dependency manifest, or test suite in this
repo. It is served as-is by GitHub Pages using Jekyll and the configured theme.

## Development workflow

- Edits are plain HTML/CSS files at the repo root (or new files/folders added as
  lessons progress). There is no compilation step required.
- `_config.yml` controls Jekyll/GitHub Pages settings (currently just `theme:
  jekyll-theme-leap-day`). Change the theme name here if the site design changes.
- To preview locally (if Jekyll/Ruby is available):
  ```
  bundle exec jekyll serve
  ```
  Since there's no `Gemfile` yet, GitHub Pages defaults are used; a local preview may
  require installing the `github-pages` gem or simply opening `index.html` directly in
  a browser (note: Jekyll templating/theme layout won't render outside GitHub Pages).
- There is no CI/CD configured beyond GitHub Pages' automatic build-and-deploy on push
  to the default branch.

## Conventions

- Content language is Czech (`lang="cs"` in `index.html`); keep new lesson content
  consistent with this unless told otherwise.
- Keep additions simple and dependency-free, matching the current beginner/tutorial
  scope of the repo — avoid introducing build tooling (bundlers, frameworks, package
  managers) unless explicitly requested.
- This repo is intentionally minimal; don't add scaffolding (tests, linters, CI
  configs) speculatively — only add what a given task actually requires.

## Notes for future updates

This file should be kept in sync as the repository grows. If lesson files, folders, a
`Gemfile`, or other structure are added, update the "Repository structure" and
"Development workflow" sections above to reflect the current state.
