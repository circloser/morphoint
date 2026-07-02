"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Lang = "ko" | "en";

// Flat key → per-language string. {var} placeholders are interpolated by t().
const MESSAGES: Record<Lang, Record<string, string>> = {
  ko: {
    "nav.capture": "촬영",
    "nav.premium": "프리미엄",
    "hero.title": "변하는 순간을\n자연스러운 영상으로",
    "hero.sub":
      "아기의 성장, 같은 장소의 변화, 자라는 식물 — 사진을 올리면 공통 지점을 맞춰 부드럽게 이어 드려요. 모든 처리는 내 폰 안에서.",

    "step.photos": "사진",
    "step.align": "정렬",
    "step.video": "영상",

    "upload.mode": "정렬 방식",
    "upload.mode.face": "얼굴 자동",
    "upload.mode.face.desc": "눈·코·입을 찾아 자동 정렬",
    "upload.mode.manual": "기준점 수동",
    "upload.mode.manual.desc": "장소·식물 등 두 점 직접 지정",
    "upload.count": "사진 {n}장",
    "upload.freeLimit": "무료 {n}장까지",
    "upload.empty.title": "사진을 여러 장 선택하세요",
    "upload.empty.sub": "촬영 날짜순으로 자동 정렬돼요",
    "upload.autoSorted": "📅 촬영 날짜순 자동 정렬됨",
    "upload.add": "추가",
    "upload.limitBanner":
      "무료 버전은 {n}장까지예요. 더 많은 사진은 프리미엄에서 풀려요.",
    "upload.del": "삭제",
    "upload.movePrev": "앞으로",
    "upload.moveNext": "뒤로",
    "upload.needMore": "사진 2장 이상 필요해요",
    "upload.next": "다음 — 정렬",

    "align.warming": "AI 모델 준비 중… (최초 1회만 받아요)",
    "align.detecting": "눈 위치를 찾는 중… ({done}/{total}장)",
    "align.allDone": "모든 사진이 정렬됐어요. 미리보기를 확인하세요.",
    "align.someFailed":
      "{n}장은 얼굴을 못 찾았어요. 탭해서 두 눈을 직접 찍어주세요.",
    "align.manualHint":
      "각 사진을 탭해 같은 두 기준점을 찍어주세요. (예: 양쪽 모서리)",
    "align.aligned": "정렬됨",
    "align.needAnchor": "기준점 필요",
    "align.next": "다음 — 영상 만들기",
    "align.needN": "{n}장 더 정렬해주세요",

    "anchor.step": "기준점 {n}/2 — 사진을 탭하세요",
    "anchor.done": "두 기준점 설정 완료",
    "anchor.close": "완료",
    "anchor.help":
      "같은 두 지점을 모든 사진에서 똑같이 찍어주세요. 얼굴이면 양쪽 눈동자, 장소·식물이면 변하지 않는 두 모서리를 추천해요.",

    "gen.speed": "속도",
    "gen.speed.slow": "느리게",
    "gen.speed.normal": "보통",
    "gen.speed.fast": "빠르게",
    "gen.transition": "전환 효과",
    "tr.dissolve": "디졸브",
    "tr.fade": "페이드",
    "tr.slide": "슬라이드",
    "tr.cut": "컷(전환없음)",
    "gen.format": "형식",
    "fmt.mp4": "MP4 (영상)",
    "fmt.gif": "GIF (움짤)",
    "gen.aspect": "비율",
    "asp.1:1": "정사각형",
    "asp.4:5": "세로 4:5",
    "asp.9:16": "세로 9:16",
    "gen.aspect.note": "세로형(릴스·쇼츠·틱톡)은 프리미엄에서 풀려요.",
    "gen.quality": "화질",
    "gen.music": "배경 음악",
    "music.add": "내 음악 넣기",
    "music.add.desc": "MP4에 좋아하는 곡을 입혀요 (프리미엄)",
    "music.gifNote": "GIF에는 소리가 없어요. MP4를 선택하면 음악을 넣을 수 있어요.",
    "music.pick": "+ 음악 파일 선택",
    "gen.options": "옵션",
    "opt.pingpong": "왕복 재생",
    "opt.pingpong.desc": "끝까지 갔다가 처음으로 부드럽게 (루프에 좋아요)",
    "opt.normalize": "밝기 자동 보정",
    "opt.normalize.desc": "사진마다 다른 밝기를 맞춰 깜빡임을 줄여요",
    "opt.dates": "촬영 날짜 표시",
    "opt.dates.desc": "각 사진의 촬영 시기를 영상에 넣어요",
    "opt.watermark": "워터마크 제거",
    "opt.watermark.on": "프리미엄 사용 중",
    "opt.watermark.off": "프리미엄에서 풀려요",
    "premium.chip": "🔒 프리미엄",
    "gen.make": "영상 만들기",
    "gen.rendering": "장면을 엮는 중…",
    "gen.encoding": "영상으로 굽는 중…",
    "gen.privacy": "기기 안에서 처리돼요. 사진은 어디에도 올라가지 않아요.",
    "gen.done": "완성됐어요 ✦",
    "gen.save": "저장",
    "gen.share": "공유",
    "gen.again": "설정 바꿔서 다시 만들기",
    "gen.error": "알 수 없는 오류가 발생했어요.",

    "share.make": "공유 링크 만들기",
    "share.makeDesc":
      "링크로 누구에게나 보낼 수 있어요. 완성 영상만 업로드되고 원본 사진은 올라가지 않아요.",
    "share.namePh": "보내는 사람 (선택, 예: 엄마)",
    "share.making": "링크 만드는 중…",
    "share.makeBtn": "🔗 공유 링크 만들기",
    "share.ready": "공유 링크가 준비됐어요 ✦",
    "share.copy": "복사",
    "share.copied": "복사됨",
    "share.shareBtn": "링크 공유",
    "share.fail": "공유 링크를 만들지 못했어요.",

    "cap.title": "촬영 보조",
    "cap.guide": "가이드",
    "cap.guidePhoto": "가이드 사진",
    "cap.save": "저장",
    "cap.error":
      "카메라를 열 수 없어요. 브라우저 권한을 허용했는지 확인해주세요. (카메라는 https 또는 localhost에서만 동작해요)",
    "cap.help": "찍은 사진이 다음 가이드로 겹쳐져요. 같은 구도로 이어 찍어보세요.",

    "up.title": "Morphoint 프리미엄",
    "up.price": "월 $1 — 가볍게, 더 멋지게 만드세요.",
    "up.perk1": "사진 무제한 업로드",
    "up.perk2": "워터마크 제거",
    "up.perk3": "1080p 고화질 출력",
    "up.perk4": "광고 없는 깔끔한 화면",
    "up.start": "프리미엄 시작하기",
    "up.note": "결제 연동은 준비 중이에요. 지금은 체험으로 바로 켜집니다.",
    "up.later": "나중에",

    "ad.label": "광고 영역 · 프리미엄에서 사라져요",
  },
  en: {
    "nav.capture": "Capture",
    "nav.premium": "Premium",
    "hero.title": "Turn changing moments\ninto a smooth video",
    "hero.sub":
      "A baby growing up, a place over time, a plant sprouting — upload your photos and we align a common point to weave them together smoothly. Everything runs on your device.",

    "step.photos": "Photos",
    "step.align": "Align",
    "step.video": "Video",

    "upload.mode": "Alignment",
    "upload.mode.face": "Auto face",
    "upload.mode.face.desc": "Finds the eyes and aligns automatically",
    "upload.mode.manual": "Manual points",
    "upload.mode.manual.desc": "Pick two reference points (places, plants…)",
    "upload.count": "{n} photos",
    "upload.freeLimit": "Up to {n} free",
    "upload.empty.title": "Pick several photos",
    "upload.empty.sub": "Auto-ordered by the date taken",
    "upload.autoSorted": "📅 Auto-sorted by date taken",
    "upload.add": "Add",
    "upload.limitBanner":
      "The free version allows up to {n} photos. More are unlocked with Premium.",
    "upload.del": "Delete",
    "upload.movePrev": "Move earlier",
    "upload.moveNext": "Move later",
    "upload.needMore": "Add at least 2 photos",
    "upload.next": "Next — Align",

    "align.warming": "Preparing the AI model… (one-time download)",
    "align.detecting": "Finding eye positions… ({done}/{total})",
    "align.allDone": "All photos aligned. Check the preview.",
    "align.someFailed":
      "Couldn’t find a face in {n}. Tap to mark the two eyes yourself.",
    "align.manualHint":
      "Tap each photo to mark the same two reference points (e.g. two corners).",
    "align.aligned": "Aligned",
    "align.needAnchor": "Needs points",
    "align.next": "Next — Make video",
    "align.needN": "Align {n} more",

    "anchor.step": "Point {n}/2 — tap the photo",
    "anchor.done": "Both points set",
    "anchor.close": "Done",
    "anchor.help":
      "Mark the same two points on every photo. For faces use the two pupils; for places/plants use two fixed corners.",

    "gen.speed": "Speed",
    "gen.speed.slow": "Slow",
    "gen.speed.normal": "Normal",
    "gen.speed.fast": "Fast",
    "gen.transition": "Transition",
    "tr.dissolve": "Dissolve",
    "tr.fade": "Fade",
    "tr.slide": "Slide",
    "tr.cut": "Cut (none)",
    "gen.format": "Format",
    "fmt.mp4": "MP4 (video)",
    "fmt.gif": "GIF",
    "gen.aspect": "Ratio",
    "asp.1:1": "Square",
    "asp.4:5": "Portrait 4:5",
    "asp.9:16": "Portrait 9:16",
    "gen.aspect.note": "Portrait (Reels/Shorts/TikTok) is unlocked with Premium.",
    "gen.quality": "Quality",
    "gen.music": "Music",
    "music.add": "Add my music",
    "music.add.desc": "Lay your favorite track over an MP4 (Premium)",
    "music.gifNote": "GIFs have no sound. Choose MP4 to add music.",
    "music.pick": "+ Choose audio file",
    "gen.options": "Options",
    "opt.pingpong": "Ping-pong",
    "opt.pingpong.desc": "Play to the end, then smoothly back (great for loops)",
    "opt.normalize": "Brightness match",
    "opt.normalize.desc": "Evens out exposure differences to reduce flicker",
    "opt.dates": "Show dates",
    "opt.dates.desc": "Overlay when each photo was taken",
    "opt.watermark": "Remove watermark",
    "opt.watermark.on": "Premium active",
    "opt.watermark.off": "Unlocked with Premium",
    "premium.chip": "🔒 Premium",
    "gen.make": "Make video",
    "gen.rendering": "Weaving the frames…",
    "gen.encoding": "Encoding the video…",
    "gen.privacy": "Processed on your device. Photos are never uploaded.",
    "gen.done": "Done ✦",
    "gen.save": "Save",
    "gen.share": "Share",
    "gen.again": "Change settings & remake",
    "gen.error": "Something went wrong.",

    "share.make": "Create share link",
    "share.makeDesc":
      "Send the link to anyone. Only the finished video is uploaded — never your source photos.",
    "share.namePh": "From (optional, e.g. Mom)",
    "share.making": "Creating link…",
    "share.makeBtn": "🔗 Create share link",
    "share.ready": "Your link is ready ✦",
    "share.copy": "Copy",
    "share.copied": "Copied",
    "share.shareBtn": "Share link",
    "share.fail": "Couldn’t create the share link.",

    "cap.title": "Capture guide",
    "cap.guide": "Guide",
    "cap.guidePhoto": "Guide photo",
    "cap.save": "Save",
    "cap.error":
      "Couldn’t open the camera. Check that you allowed permission. (Camera only works on https or localhost.)",
    "cap.help": "Each shot becomes the next guide. Keep the same framing.",

    "up.title": "Morphoint Premium",
    "up.price": "$1/mo — make it lighter and nicer.",
    "up.perk1": "Unlimited photo uploads",
    "up.perk2": "Remove watermark",
    "up.perk3": "1080p high quality",
    "up.perk4": "A clean, ad-free screen",
    "up.start": "Start Premium",
    "up.note": "Payments are coming soon. For now it turns on instantly as a trial.",
    "up.later": "Later",

    "ad.label": "Ad space · gone with Premium",
  },
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx | null>(null);
const STORAGE_KEY = "morphoint.lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    const initial: Lang =
      saved === "ko" || saved === "en"
        ? saved
        : navigator.language?.toLowerCase().startsWith("ko")
          ? "ko"
          : "en";
    setLangState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = MESSAGES[lang][key] ?? MESSAGES.ko[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within LangProvider");
  return ctx;
}
