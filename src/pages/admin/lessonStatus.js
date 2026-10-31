/** A job is writing or recording this lesson, so it must not be changed meanwhile. */
export const isLessonBusy = (lesson) => ['GENERATING', 'VOICING'].includes(lesson?.status)
