# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2](https://github.com/zhaochy1990/eng-learner/compare/v0.2.1...v0.2.2) (2026-02-24)


### Features

* add novel article type with chapter navigation ([399a375](https://github.com/zhaochy1990/eng-learner/commit/399a37552bec494f07910c6336541d132ef0f00b))
* **api:** add PUT endpoint for updating article metadata ([#24](https://github.com/zhaochy1990/eng-learner/issues/24)) ([9b68e32](https://github.com/zhaochy1990/eng-learner/commit/9b68e32a7c231bef9a6d058a0c0a36c816ee0f9f))
* **frontend:** show exam vocabulary tags in dictionary popover ([#22](https://github.com/zhaochy1990/eng-learner/issues/22)) ([4bc036b](https://github.com/zhaochy1990/eng-learner/commit/4bc036b59b1cc10f11a28a18b9a4207b14937ba2))


### Bug Fixes

* **api:** enforce faithful translation without added content ([#23](https://github.com/zhaochy1990/eng-learner/issues/23)) ([acbc147](https://github.com/zhaochy1990/eng-learner/commit/acbc14745961fd84af9a99f819c03bfe9fbc904b))
* **frontend:** auto-redirect to login on token invalidation ([#19](https://github.com/zhaochy1990/eng-learner/issues/19)) ([93b9335](https://github.com/zhaochy1990/eng-learner/commit/93b9335262320d4c1fa2786327a90d87364026b7))
* **frontend:** hide scrollbar in vocabulary sidebar ([#20](https://github.com/zhaochy1990/eng-learner/issues/20)) ([47cdbb2](https://github.com/zhaochy1990/eng-learner/commit/47cdbb2b716851516b72f9848f4e3413e5be3c8c))
* **frontend:** use articles data for dashboard reading progress ([#25](https://github.com/zhaochy1990/eng-learner/issues/25)) ([9f4de15](https://github.com/zhaochy1990/eng-learner/commit/9f4de15a98b35dd90d37fdf45610e4d8bc2d1071))
* **frontend:** use sentence count for reading progress on dashboard ([#21](https://github.com/zhaochy1990/eng-learner/issues/21)) ([bfa4251](https://github.com/zhaochy1990/eng-learner/commit/bfa4251cffdd21767eac5c0d301e016f5146b0e0))


### Refactoring

* **frontend:** remove redundant articleType prop from ArticleReader ([39c8aa0](https://github.com/zhaochy1990/eng-learner/commit/39c8aa034f846b69633b6005f725aa0c09a8ed0a))

## [0.2.1](https://github.com/zhaochy1990/eng-learner/compare/v0.2.0...v0.2.1) (2026-02-19)


### Features

* fix progress tracking, show vocab counts, translate titles ([#16](https://github.com/zhaochy1990/eng-learner/issues/16)) ([25cdd21](https://github.com/zhaochy1990/eng-learner/commit/25cdd21a2eff9ff8cc5ca6dd76bf268d9063fefc))


### Bug Fixes

* **api:** re-translate articles with missing title translation ([#18](https://github.com/zhaochy1990/eng-learner/issues/18)) ([c5a63c6](https://github.com/zhaochy1990/eng-learner/commit/c5a63c6e402e8ce866d9a01fcd0e525657dc5cfa))
* **api:** resolve inflected words to base form via ECDICT exchange field ([10f4167](https://github.com/zhaochy1990/eng-learner/commit/10f4167c6b7b7aff2fad2ab801bef00d12f3d02a))
* **frontend:** match inflected word forms for highlighting and sidebar ([#17](https://github.com/zhaochy1990/eng-learner/issues/17)) ([6783e60](https://github.com/zhaochy1990/eng-learner/commit/6783e601d9ad18b50833ad21f8d2ed93fe3a44f3))

## [0.2.0](https://github.com/zhaochy1990/eng-learner/compare/v0.1.3...v0.2.0) (2026-02-19)


### Features

* **frontend:** add pronunciation button and tweak sidebar sizing ([#15](https://github.com/zhaochy1990/eng-learner/issues/15)) ([7c0b57b](https://github.com/zhaochy1990/eng-learner/commit/7c0b57b422311791350fa3626c974e2e51af6351))
* **frontend:** add vocabulary sidebar to article reading page ([#13](https://github.com/zhaochy1990/eng-learner/issues/13)) ([ef91b15](https://github.com/zhaochy1990/eng-learner/commit/ef91b15bebca0fbf388a8d3dbad24fe64424d354))
* **frontend:** make review card fullscreen and make article title clickable ([#14](https://github.com/zhaochy1990/eng-learner/issues/14)) ([f231ce3](https://github.com/zhaochy1990/eng-learner/commit/f231ce3939d38a3680d1f8abf4955b1a7a578dd7))

## [0.1.3](https://github.com/zhaochy1990/eng-learner/compare/v0.1.2...v0.1.3) (2026-02-19)


### Features

* add paragraph-aligned Chinese translation for articles ([00f6c40](https://github.com/zhaochy1990/eng-learner/commit/00f6c401f9b5a05d3e5b81a264300d6ca8f4c08e))
* **frontend:** add admin-only Refresh TTS and Delete buttons ([f9ce3c4](https://github.com/zhaochy1990/eng-learner/commit/f9ce3c4054ce21c9e9d4b0e5dad9214320ba3331))


### Bug Fixes

* **ci:** fix node -p quoting in version extraction step ([0b5a849](https://github.com/zhaochy1990/eng-learner/commit/0b5a8494ef0345799817d4c1c0f39dcb0a072ec7))
* **frontend:** add password validation rules to registration form ([#11](https://github.com/zhaochy1990/eng-learner/issues/11)) ([bb20718](https://github.com/zhaochy1990/eng-learner/commit/bb2071873fc20e7a1d0591cb7ba8cc494c2eb170))
* **frontend:** fix Refresh TTS button doing nothing on click ([8cd0814](https://github.com/zhaochy1990/eng-learner/commit/8cd0814436d27b0957a6a9c6df17e31e19cb7f62))
* **frontend:** fix review card content overflow on long text ([1bfc1eb](https://github.com/zhaochy1990/eng-learner/commit/1bfc1ebb3c9809cb90125af39ac1065d3dae148d))


### Refactoring

* **frontend:** remove settings UI from ArticleReader component ([b10c5b2](https://github.com/zhaochy1990/eng-learner/commit/b10c5b2ada77d18c56fdc987c3717e1da907b5bc))

## [0.1.2](https://github.com/zhaochy1990/eng-learner/compare/v0.1.1...v0.1.2) (2026-02-19)

## [0.1.1](https://github.com/zhaochy1990/eng-learner/compare/v0.1.0...v0.1.1) (2026-02-19)


### Features

* add RBAC to restrict article create/delete to admin role ([#7](https://github.com/zhaochy1990/eng-learner/issues/7)) ([bfbe070](https://github.com/zhaochy1990/eng-learner/commit/bfbe0701ea16b155856941f14943a8acf94babc1))
* add user authentication via external auth service ([f1743af](https://github.com/zhaochy1990/eng-learner/commit/f1743afc3d01db54b6bfcf2eb018bf8218639b53)), closes [#4](https://github.com/zhaochy1990/eng-learner/issues/4)
* add user authentication via external auth service ([b4fb62c](https://github.com/zhaochy1990/eng-learner/commit/b4fb62c0dda18c9aadd91d4758eecfb7b1b5a2a2))
* **api:** migrate from SQLite to MSSQL ([38e6645](https://github.com/zhaochy1990/eng-learner/commit/38e664506347800ef1762887e8e370228b8fb4dd))
* **api:** support Azure managed identity for SQL authentication ([ba82141](https://github.com/zhaochy1990/eng-learner/commit/ba82141b1c34702c247e0babcef9835806f69cd3))
* **frontend:** make article title words clickable for dictionary lookup ([f7983c3](https://github.com/zhaochy1990/eng-learner/commit/f7983c33046f64a06202774408b35f26266ce410))
* **infra:** add Azure Bicep infrastructure and CD pipeline ([98d0b12](https://github.com/zhaochy1990/eng-learner/commit/98d0b129ab4b5acbc0a34d21cd4b797aeeaca3dd))
* replace Bing Search with RSS feed crawler ([42d4812](https://github.com/zhaochy1990/eng-learner/commit/42d481200a3b25b2a7988baed69e47888bd8775b))


### Bug Fixes

* **api:** download ECDICT dictionary in Docker build stage ([a109e36](https://github.com/zhaochy1990/eng-learner/commit/a109e368fbbfa3379f44b9b3d068a55397a1d022))
* **frontend:** add Secure/SameSite to logged_in cookie, add auth tests ([15f7f05](https://github.com/zhaochy1990/eng-learner/commit/15f7f05b4bfa30e18d256e7d612e8195004a1fee))
* **frontend:** externalize msedge-tts to fix TTS in standalone build ([44eeb5a](https://github.com/zhaochy1990/eng-learner/commit/44eeb5a54aa73fa19ace2a070dac8e805c52d433))
* **frontend:** replace @travisvn/edge-tts with msedge-tts for TTS ([14ddf0a](https://github.com/zhaochy1990/eng-learner/commit/14ddf0af8c4095cb83a2f283b27527cbe31bb561))
* **frontend:** use OUTPUT_FORMAT enum and Uint8Array in TTS route ([c0747f5](https://github.com/zhaochy1990/eng-learner/commit/c0747f5fd85d36d0519c058afaf614832e13bf3b))


### Refactoring

* move test files to tests/ directories and fix CI errors ([36ff964](https://github.com/zhaochy1990/eng-learner/commit/36ff9641f48daa61b3ec8d8e0197a8381754ebee))

## 0.1.0 (2026-02-18)
