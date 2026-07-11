# scripts

브랜드 에셋(로고/아이콘/OG) 생성 스크립트. **로고 마크의 단일 소스** — 벡터가 스크립트 안에 인라인돼 있고, PNG는 여기서 `sharp`로 래스터한 산출물이다. **PNG를 직접 편집하지 말 것.** 로고를 바꾸려면 스크립트의 `motif`/팔레트만 고쳐 재실행한다.

## 실행

```bash
pnpm gen:icons   # public/app-icon-{128,192,512} · -maskable-512 · apple-touch-icon.png · app/favicon.ico
pnpm gen:og      # app/opengraph-image.png · app/twitter-image.png (1200×630)
pnpm gen:assets  # 위 둘 다
```

## 로고 마크

라임 그라디언트(`#84cc16`→`#4d7c0f`) 2단 바운스 궤적 + 도트(`#65a30d`), 순백(`#ffffff`) 라운드 타일 배지. 512 좌표계로 그려 각 사이즈로 다운스케일한다. 두 스크립트의 `motif`는 동일하게 유지할 것(로고 일관성).

의존성: `sharp`(SVG→PNG), `png-to-ico`(favicon.ico) — 둘 다 `devDependencies`.
