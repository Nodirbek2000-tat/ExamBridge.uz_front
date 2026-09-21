import { Mic2 } from 'lucide-react'
import StudyPlaceholder from './StudyPlaceholder'

export default function SpeakingSamplesPage() {
  return (
    <StudyPlaceholder
      title="Speaking Samples"
      subtitle="Yuqori ball olgan javoblarni tinglang — audio, transkript va ibora tahlili bilan."
      icon={Mic2}
      from="#8B5CF6"
      to="#6D28D9"
      points={[
        'Part 1 · 2 · 3 uchun namunali javoblar',
        'Audio + transkript sinxron ko‘rinadi',
        'Band 7 va Band 9 javoblari solishtiriladi',
        'Ishlatilgan iboralar va ularning ma’nosi',
      ]}
    />
  )
}
