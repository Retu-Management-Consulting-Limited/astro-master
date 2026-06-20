// 占星 / 产品术语表 — zh ↔ ru 共享单一真相源。
//
// 为什么存在：俄译散落在 8 个并行任务里，同一个术语（如「上升」「刑相」「本命盘」）
// 若各自翻一遍会漂移成多种说法。所有任务的 ru 译文引用这里，保证术语一致
// （宪法 §8 底线：不编造、不夸大；这里只收录占星学/产品领域的标准对应词）。
//
// 注：值是「领域标准俄语术语」，非营销文案。营销/语气润色留子项目 D 的母语复核。
// 用法：在某任务的 ru JSON 里需要术语时，引用 `TERMS.natalChart` 等而非临时翻译；
// 跑插值时也可直接 import 取词。

/** 十大行星 + 主要轴点（zh UI 标签 → ru）。key 用英文天体名便于代码引用。 */
export const PLANETS: Record<string, { zh: string; ru: string }> = {
  Sun: { zh: "太阳", ru: "Солнце" },
  Moon: { zh: "月亮", ru: "Луна" },
  Mercury: { zh: "水星", ru: "Меркурий" },
  Venus: { zh: "金星", ru: "Венера" },
  Mars: { zh: "火星", ru: "Марс" },
  Jupiter: { zh: "木星", ru: "Юпитер" },
  Saturn: { zh: "土星", ru: "Сатурн" },
  Uranus: { zh: "天王星", ru: "Уран" },
  Neptune: { zh: "海王星", ru: "Нептун" },
  Pluto: { zh: "冥王星", ru: "Плутон" },
  // 轴点 / 敏感点
  Ascendant: { zh: "上升", ru: "Асцендент" },
  Descendant: { zh: "下降", ru: "Десцендент" },
  Midheaven: { zh: "天顶", ru: "Середина неба" },
  ImumCoeli: { zh: "天底", ru: "Надир" },
  NorthNode: { zh: "北交点", ru: "Северный узел" },
  SouthNode: { zh: "南交点", ru: "Южный узел" },
  Chiron: { zh: "凯龙星", ru: "Хирон" },
  Lilith: { zh: "莉莉丝", ru: "Лилит" },
};

/** 黄道十二星座。key = 0..11 索引对应 chart.ts 的 SIGNS_ZH 顺序（白羊起）。 */
export const SIGNS: Record<string, { zh: string; ru: string }> = {
  Aries: { zh: "白羊", ru: "Овен" },
  Taurus: { zh: "金牛", ru: "Телец" },
  Gemini: { zh: "双子", ru: "Близнецы" },
  Cancer: { zh: "巨蟹", ru: "Рак" },
  Leo: { zh: "狮子", ru: "Лев" },
  Virgo: { zh: "处女", ru: "Дева" },
  Libra: { zh: "天秤", ru: "Весы" },
  Scorpio: { zh: "天蝎", ru: "Скорпион" },
  Sagittarius: { zh: "射手", ru: "Стрелец" },
  Capricorn: { zh: "摩羯", ru: "Козерог" },
  Aquarius: { zh: "水瓶", ru: "Водолей" },
  Pisces: { zh: "双鱼", ru: "Рыбы" },
};

/** 十二宫位（序数）。key = 宫位号 1..12。 */
export const HOUSES: Record<string, { zh: string; ru: string }> = {
  "1": { zh: "第一宫", ru: "Первый дом" },
  "2": { zh: "第二宫", ru: "Второй дом" },
  "3": { zh: "第三宫", ru: "Третий дом" },
  "4": { zh: "第四宫", ru: "Четвёртый дом" },
  "5": { zh: "第五宫", ru: "Пятый дом" },
  "6": { zh: "第六宫", ru: "Шестой дом" },
  "7": { zh: "第七宫", ru: "Седьмой дом" },
  "8": { zh: "第八宫", ru: "Восьмой дом" },
  "9": { zh: "第九宫", ru: "Девятый дом" },
  "10": { zh: "第十宫", ru: "Десятый дом" },
  "11": { zh: "第十一宫", ru: "Одиннадцатый дом" },
  "12": { zh: "第十二宫", ru: "Двенадцатый дом" },
};

/** 主要相位（与 chart.ts 的 AspectType 对齐 + 常见次相位）。 */
export const ASPECTS: Record<string, { zh: string; ru: string }> = {
  conjunction: { zh: "合相", ru: "Соединение" },
  sextile: { zh: "六分相", ru: "Секстиль" },
  square: { zh: "刑相", ru: "Квадратура" },
  trine: { zh: "拱相", ru: "Тригон" },
  opposition: { zh: "对分相", ru: "Оппозиция" },
  quincunx: { zh: "梅花相", ru: "Квинконс" },
  semisextile: { zh: "半六分相", ru: "Полусекстиль" },
};

/** 占星 + 产品通用术语。供 UI 文案译文引用，保证跨任务一致。 */
export const TERMS: Record<string, { zh: string; ru: string }> = {
  // 占星核心
  natalChart: { zh: "本命盘", ru: "Натальная карта" },
  birthChart: { zh: "星盘", ru: "Карта рождения" },
  horoscope: { zh: "星座运势", ru: "Гороскоп" },
  zodiac: { zh: "黄道十二宫", ru: "Зодиак" },
  zodiacSign: { zh: "星座", ru: "Знак зодиака" },
  retrograde: { zh: "逆行", ru: "Ретроградность" },
  transit: { zh: "行运", ru: "Транзит" },
  progression: { zh: "推运", ru: "Прогрессия" },
  aspect: { zh: "相位", ru: "Аспект" },
  house: { zh: "宫位", ru: "Дом" },
  element: { zh: "元素", ru: "Стихия" },
  fire: { zh: "火象", ru: "Огонь" },
  earth: { zh: "土象", ru: "Земля" },
  air: { zh: "风象", ru: "Воздух" },
  water: { zh: "水象", ru: "Вода" },
  synastry: { zh: "合盘", ru: "Синастрия" },
  composite: { zh: "组合盘", ru: "Композитная карта" },
  compatibility: { zh: "契合度", ru: "Совместимость" },
  // 出生信息
  birthDate: { zh: "出生日期", ru: "Дата рождения" },
  birthTime: { zh: "出生时间", ru: "Время рождения" },
  birthPlace: { zh: "出生地点", ru: "Место рождения" },
  timeZone: { zh: "时区", ru: "Часовой пояс" },
  // 产品 / 领域
  reading: { zh: "解读", ru: "Прочтение" },
  destiny: { zh: "命运", ru: "Судьба" },
  fortune: { zh: "运势", ru: "Удача" },
  wealth: { zh: "财运", ru: "Финансовая удача" },
  loveLife: { zh: "感情", ru: "Любовь" },
  career: { zh: "事业", ru: "Карьера" },
  health: { zh: "健康", ru: "Здоровье" },
  bodyMind: { zh: "身心", ru: "Тело и разум" },
  today: { zh: "今日", ru: "Сегодня" },
  // 通用 UI 名词
  nickname: { zh: "昵称", ru: "Псевдоним" },
  settings: { zh: "设置", ru: "Настройки" },
  profile: { zh: "我的", ru: "Профиль" },
  share: { zh: "分享", ru: "Поделиться" },
  invite: { zh: "邀请", ru: "Приглашение" },
  history: { zh: "历史", ru: "История" },
  calibration: { zh: "校准", ru: "Калибровка" },
  feedback: { zh: "反馈", ru: "Обратная связь" },
  notification: { zh: "提醒", ru: "Уведомление" },
  // 品牌（不译）
  molly: { zh: "Molly", ru: "Molly" },
};

// ── 显示层映射 helper ────────────────────────────────────────────────────────
// chart 把 sign/planet 存成 zh 字符串（见 chart.ts），.tsx 直接渲染时对 ru 用户
// 会冒中文。这里按 zh 名反查 ru，在【显示处】映射（locale=zh 原样返回，不改存储）。

function zhToRu(table: Record<string, { zh: string; ru: string }>): Record<string, string> {
  const m: Record<string, string> = {};
  for (const v of Object.values(table)) m[v.zh] = v.ru;
  return m;
}
const SIGN_ZH_RU = zhToRu(SIGNS);
const PLANET_ZH_RU = zhToRu(PLANETS);

/** 把 chart 存的中文星座名按 locale 映射到显示名（未知值原样回退）。 */
export function signLabel(zhSign: string | undefined, locale: string): string {
  if (!zhSign) return zhSign ?? "";
  return locale === "ru" ? (SIGN_ZH_RU[zhSign] ?? zhSign) : zhSign;
}
/** 把中文天体名按 locale 映射到显示名（未知值原样回退）。 */
export function planetLabel(zhPlanet: string | undefined, locale: string): string {
  if (!zhPlanet) return zhPlanet ?? "";
  return locale === "ru" ? (PLANET_ZH_RU[zhPlanet] ?? zhPlanet) : zhPlanet;
}

/** 扁平词数（用于守护断言 ~90 词阈值）。 */
export const GLOSSARY_SIZE =
  Object.keys(PLANETS).length +
  Object.keys(SIGNS).length +
  Object.keys(HOUSES).length +
  Object.keys(ASPECTS).length +
  Object.keys(TERMS).length;
