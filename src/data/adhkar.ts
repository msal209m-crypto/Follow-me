export interface Adhkar {
  id: string;
  text: string;
  count: number;
  description?: string;
}

export const POST_PRAYER_ADHKAR: Adhkar[] = [
  { id: 'adhkar-1', text: 'أستغفر الله', count: 3, description: 'يُقال ثلاثاً' },
  { id: 'adhkar-2', text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام', count: 1 },
  { id: 'adhkar-3', text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', count: 1 },
  { id: 'adhkar-4', text: 'اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد', count: 1 },
  { id: 'adhkar-5', text: 'سبحان الله', count: 33 },
  { id: 'adhkar-6', text: 'الحمد لله', count: 33 },
  { id: 'adhkar-7', text: 'الله أكبر', count: 33 },
];
