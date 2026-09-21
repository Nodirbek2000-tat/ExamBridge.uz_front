import MediaLibraryPage from './MediaLibraryPage'

// Podcasts shelf — video only
export default function PodcastsPage() {
  return (
    <MediaLibraryPage
      section="podcast"
      title="Podcasts"
      subtitle="Videoni tomosha qiling — matn pastda video bilan birga harakatlanadi."
      basePath="/study/podcasts"
      emptyText="Hozircha video yo'q"
      emptyHint="Admin panel → Study Tools → Podcasts orqali video yuklang."
    />
  )
}
