# scripts

브랜드 에셋(로고/아이콘/OG) 생성 스크립트. **로고 마크의 단일 소스** — 벡터가 스크립트 안에 인라인돼 있고, PNG는 여기서 `sharp`로 래스터한 산출물이다. **PNG를 직접 편집하지 말 것.** 로고를 바꾸려면 스크립트의 `motif`/팔레트만 고쳐 재실행한다.

## 실행

```bash
pnpm gen:icons   # public/app-icon-{128,192,512} · -maskable-512 · apple-touch-icon.png · app/favicon.ico
pnpm gen:og      # app/opengraph-image.png · app/twitter-image.png (1200×630)
pnpm gen:splash  # public/splash/*.png (iOS 스플래시 21종) + lib/constants/splash.ts
pnpm gen:assets  # 위 셋 다
```

## 로고 마크

라임 그라디언트(`#84cc16`→`#4d7c0f`) 2단 바운스 궤적 + 도트(`#65a30d`), 순백(`#ffffff`) 라운드 타일 배지. 512 좌표계로 그려 각 사이즈로 다운스케일한다. 세 스크립트의 `motif`는 동일하게 유지할 것(로고 일관성).

## 스플래시 (iOS 전용)

`gen-splash.mjs`는 PNG 21종과 함께 **`lib/constants/splash.ts`도 생성**한다(`layout.tsx`의 `appleWebApp.startupImage`가 import). 둘 다 산출물이니 직접 편집하지 말 것. 기기를 추가/제거하려면 스크립트의 `DEVICES` 배열만 고쳐 재실행한다 — 기기별 뷰포트(pt)와 DPR이 미디어쿼리와 **정확히** 일치해야 iOS가 이미지를 띄운다.

레이아웃(평면 배경 + 중앙 배지 + 이름 한 줄)은 **Android(Chrome)가 manifest로 합성하는 스플래시와 같아 보이도록** 맞춘 것이다. Android는 이미지를 지정할 수 없어 반대 방향 통일이 불가능하니, 장식을 더하려면 두 플랫폼이 갈린다는 걸 감수해야 한다.

의존성: `sharp`(SVG→PNG), `png-to-ico`(favicon.ico) — 둘 다 `devDependencies`.
