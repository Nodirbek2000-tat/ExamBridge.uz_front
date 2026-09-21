import MediaLibraryPage from './MediaLibraryPage'

// Shadowing shelf — accepts both audio and video
export default function StudyShadowingPage() {
  return (
    <MediaLibraryPage
      section="shadowing"
      title="Shadowing"
      subtitle="Tinglang va takrorlang — matn media bilan birga harakatlanadi. So'z ustiga bosib o'sha joyga o'ting."
      basePath="/study/shadowing"
      emptyText="Hozircha media yo'q"
      emptyHint="Admin panel → Study Tools → Shadowing orqali audio yoki video yuklang."
    />
  )
}
