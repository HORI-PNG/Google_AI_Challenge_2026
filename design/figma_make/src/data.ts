export const scores = [
  { label: "気分", value: 72, key: "mood" },
  { label: "元気", value: 55, key: "energy" },
  { label: "集中しやすさ", value: 80, key: "focus" },
  { label: "ストレス", value: 30, key: "stress", note: "低いほど良い" },
] as const;

export const chartData = [
  { day: "月", mood: 52, energy: 60, focus: 48, stress: 62 },
  { day: "火", mood: 65, energy: 55, focus: 70, stress: 48 },
  { day: "水", mood: null, energy: null, focus: null, stress: null },
  { day: "木", mood: 58, energy: 48, focus: 65, stress: 55 },
  { day: "金", mood: 72, energy: 55, focus: 80, stress: 30 },
  { day: "土", mood: 78, energy: 70, focus: 74, stress: 28 },
  { day: "日", mood: 68, energy: 64, focus: 69, stress: 38 },
];

export const events = [
  "授業",
  "テスト勉強",
  "宿題・課題",
  "塾",
  "部活",
  "研究",
  "バイト",
  "友だちと過ごした",
  "家族と過ごした",
  "家でのんびり",
  "その他",
];
