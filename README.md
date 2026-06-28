# Morphoint — 시간을 엮는 도구

변화하는 사진들을 **공통 지점(눈·코·입 또는 직접 찍은 기준점)에 맞춰** 자연스럽게 이어주는 모바일 웹앱입니다.
아기의 성장, 같은 장소의 변화, 자라는 식물 — 사진 여러 장을 올리면 부드러운 MP4/GIF 영상으로 만들어 줍니다.

> **모든 처리는 사용자의 기기(브라우저) 안에서** 이뤄집니다. 사진은 서버에 업로드되지 않습니다 → 개인정보 안전 + 서버 비용 0원.

## 핵심 기능

- **얼굴 자동 정렬** — MediaPipe로 두 눈동자를 찾아 같은 위치로 자동 정렬
- **수동 기준점 정렬** — 장소·식물 등은 변하지 않는 두 점을 직접 탭해서 정렬
- **부드러운 전환 영상** — 사진 사이를 크로스페이드로 이어 MP4(H.264) 또는 GIF로 출력 (ffmpeg.wasm)
- **워터마크** — 무료본에 `✦ Morphoint` 워터마크(바이럴 유입), 프리미엄에서 제거
- **촬영 보조 카메라** (`/capture`) — 이전 사진을 반투명으로 겹쳐 같은 구도로 이어 찍기
- **수익화 UI** — 광고 자리 + 무료 5장 제한 / 프리미엄 해제 (결제 연동은 다음 단계)
- **익명 사용 통계** — 이미지 없이 생성 이벤트만 `/api/track`으로 기록 (Vercel 로그에서 확인)

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · MediaPipe Tasks Vision · ffmpeg.wasm

## 로컬 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

> 카메라(`/capture`)는 `https` 또는 `localhost`에서만 동작합니다.

## 빌드

```bash
npm run build
npm start
```

## 배포 (무료 호스팅 · Vercel 권장)

별도 서버·DB가 필요 없는 앱이라 Vercel 무료 플랜에 그대로 올라갑니다.

**방법 A — Vercel CLI (가장 빠름, git 불필요)**

```bash
npm i -g vercel
vercel        # 안내에 따라 로그인 → 프로젝트 생성
vercel --prod # 운영 배포
```

**방법 B — GitHub 연동**

1. 이 폴더를 GitHub 저장소에 푸시
2. [vercel.com](https://vercel.com) → New Project → 저장소 선택 → Deploy (설정 그대로)

### 참고

- **HEIC(아이폰 기본 포맷)**: iOS Safari에서는 디코딩되지만, 데스크톱 크롬에서는 안 될 수 있어요. 아이폰 설정에서 "가장 호환성 높게(JPEG)"로 찍으면 안전합니다.
- **인코딩 속도**: 화질·장수가 많을수록 기기에서 굽는 시간이 늘어납니다. 기본 720p는 대부분의 폰에서 수십 초 내 완료, 무거우면 480p를 권하세요.
- 광고 차단을 피하려고 **단일 스레드 ffmpeg**를 사용해 cross-origin isolation 헤더가 필요 없습니다 (AdSense 등과 호환).

## 프로젝트 구조

```
app/            라우트 (/, /capture, /api/track, manifest, icon)
components/     UI (업로드·정렬·생성 단계, 카메라, 업그레이드 시트 등)
lib/            엔진 (정렬 수학, MediaPipe 얼굴 정렬, 프레임 합성, ffmpeg 인코딩)
```

## 다음 단계 (상용화)

- [ ] 결제 연동 (Stripe/토스페이먼츠) → `lib/premium.ts`의 잠금 해제를 실제 구독 검증으로 교체
- [ ] AdSense/쿠팡 광고 유닛을 `components/AdSlot.tsx`에 삽입
- [ ] PNG 앱 아이콘(192/512) 추가로 설치형 PWA 완성도 ↑
- [ ] (선택) 고급 AI 모핑 모드 — GPU 서버가 필요해 프리미엄 유료 기능으로 확장 권장
