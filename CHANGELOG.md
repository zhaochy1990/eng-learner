# Changelog

All notable changes to this project will be documented in this file.

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
