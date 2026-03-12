"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen, ChevronRight, ChevronDown, Play, FileText,
  CheckCircle2, Circle, ArrowLeft, Info,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  display_order: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  video_url: string | null;
  display_order: number;
}

interface Progress {
  lesson_id: string;
  completed: boolean;
}

export default function MarketingCourses() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: coursesData } = await supabase
      .from("courses")
      .select("*")
      .eq("target_role", "marketing")
      .order("display_order");

    setCourses(coursesData || []);

    if (coursesData && coursesData.length > 0) {
      const courseIds = coursesData.map((c) => c.id);

      const { data: modulesData } = await supabase
        .from("course_modules")
        .select("*")
        .in("course_id", courseIds)
        .order("display_order");

      setModules(modulesData || []);

      if (modulesData && modulesData.length > 0) {
        const moduleIds = modulesData.map((m) => m.id);

        const { data: lessonsData } = await supabase
          .from("course_lessons")
          .select("*")
          .in("module_id", moduleIds)
          .order("display_order");

        setLessons(lessonsData || []);
      }

      const { data: progressData } = await supabase
        .from("course_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id);

      setProgress(progressData || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isLessonCompleted = (lessonId: string) =>
    progress.some((p) => p.lesson_id === lessonId && p.completed);

  const markComplete = async (lessonId: string) => {
    if (isLessonCompleted(lessonId)) return;
    const supabase = createClient();
    await supabase.from("course_progress").upsert(
      { user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" }
    );
    setProgress((prev) => [...prev, { lesson_id: lessonId, completed: true }]);
  };

  const getCourseProgress = (courseId: string) => {
    const courseModules = modules.filter((m) => m.course_id === courseId);
    const moduleIds = courseModules.map((m) => m.id);
    const courseLessons = lessons.filter((l) => moduleIds.includes(l.module_id));
    if (courseLessons.length === 0) return 0;
    const completed = courseLessons.filter((l) => isLessonCompleted(l.id)).length;
    return Math.round((completed / courseLessons.length) * 100);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const openLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    markComplete(lesson.id);
  };

  if (loading) {
    return <div className="text-otai-text-secondary">Loading courses...</div>;
  }

  // === LESSON VIEW ===
  if (selectedLesson) {
    const parentModule = modules.find((m) => m.id === selectedLesson.module_id);
    const alreadyCompleted = isLessonCompleted(selectedLesson.id);

    return (
      <div>
        <button
          onClick={() => setSelectedLesson(null)}
          className="flex items-center gap-2 text-otai-text-secondary hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to {selectedCourse?.title || "course"}
        </button>

        <h1 className="text-2xl font-bold text-white mb-2">{selectedLesson.title}</h1>
        {parentModule && (
          <p className="text-otai-text-muted text-sm mb-6">{parentModule.title}</p>
        )}

        {alreadyCompleted && (
          <div className="flex items-center gap-2 mb-4 text-xs text-otai-green">
            <CheckCircle2 size={14} />
            <span>You&apos;ve completed this lesson.</span>
          </div>
        )}

        {selectedLesson.video_url && (
          <div className="bg-otai-dark border border-otai-border rounded-xl overflow-hidden mb-6">
            <div className="aspect-video">
              <iframe
                src={selectedLesson.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {selectedLesson.text_content && (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-6">
            <div className="text-otai-text-secondary leading-relaxed whitespace-pre-wrap">
              {selectedLesson.text_content}
            </div>
          </div>
        )}
      </div>
    );
  }

  // === COURSE VIEW ===
  if (selectedCourse) {
    const courseModules = modules
      .filter((m) => m.course_id === selectedCourse.id)
      .sort((a, b) => a.display_order - b.display_order);

    const pct = getCourseProgress(selectedCourse.id);

    return (
      <div>
        <button
          onClick={() => setSelectedCourse(null)}
          className="flex items-center gap-2 text-otai-text-secondary hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> All Courses
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{selectedCourse.title}</h1>
          {selectedCourse.description && (
            <p className="text-otai-text-secondary text-sm mt-1">{selectedCourse.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-otai-border rounded-full overflow-hidden">
              <div className="h-full bg-otai-purple rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-otai-text-muted font-medium">{pct}%</span>
          </div>
        </div>

        {courseModules.length === 0 ? (
          <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
            <Info size={40} className="text-otai-text-muted mx-auto mb-3" />
            <p className="text-otai-text-secondary text-sm">No modules yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courseModules.map((mod) => {
              const modLessons = lessons.filter((l) => l.module_id === mod.id).sort((a, b) => a.display_order - b.display_order);
              const isExpanded = expandedModules.has(mod.id);
              const completedCount = modLessons.filter((l) => isLessonCompleted(l.id)).length;

              return (
                <div key={mod.id} className="bg-otai-dark border border-otai-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown size={16} className="text-otai-purple" /> : <ChevronRight size={16} className="text-otai-text-muted" />}
                      <span className="text-white font-medium text-sm">{mod.title}</span>
                    </div>
                    <span className="text-xs text-otai-text-muted">{completedCount}/{modLessons.length} complete</span>
                  </button>

                  {isExpanded && modLessons.length > 0 && (
                    <div className="border-t border-otai-border divide-y divide-otai-border">
                      {modLessons.map((lesson) => {
                        const done = isLessonCompleted(lesson.id);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => openLesson(lesson)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                          >
                            {done ? <CheckCircle2 size={16} className="text-otai-green shrink-0" /> : <Circle size={16} className="text-otai-text-muted shrink-0" />}
                            <span className={`text-sm flex-1 ${done ? "text-otai-text-muted" : "text-white"}`}>{lesson.title}</span>
                            {lesson.video_url && <Play size={12} className="text-otai-purple shrink-0" />}
                            {lesson.content_type === "text" && <FileText size={12} className="text-otai-text-muted shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // === COURSE LIST ===
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen size={24} className="text-otai-purple" />
          Courses
        </h1>
        <p className="text-otai-text-secondary text-sm mt-1">Your training library</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <BookOpen size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No courses available yet.</p>
          <p className="text-otai-text-muted text-sm mt-1">Courses will appear here when your manager adds them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const pct = getCourseProgress(course.id);
            const courseModuleCount = modules.filter((m) => m.course_id === course.id).length;
            const courseModuleIds = modules.filter((m) => m.course_id === course.id).map((m) => m.id);
            const courseLessonCount = lessons.filter((l) => courseModuleIds.includes(l.module_id)).length;

            return (
              <button
                key={course.id}
                onClick={() => {
                  setSelectedCourse(course);
                  const mods = modules.filter((m) => m.course_id === course.id);
                  setExpandedModules(new Set(mods.map((m) => m.id)));
                }}
                className="w-full bg-otai-dark border border-otai-border rounded-xl p-5 hover:border-otai-purple/40 transition-colors text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{course.title}</h3>
                    {course.description && <p className="text-otai-text-muted text-sm mt-1 line-clamp-2">{course.description}</p>}
                    <p className="text-otai-text-muted text-xs mt-2">
                      {courseModuleCount} module{courseModuleCount !== 1 ? "s" : ""} · {courseLessonCount} lesson{courseLessonCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${pct === 100 ? "text-otai-green" : "text-otai-purple"}`}>{pct}%</span>
                    <ChevronRight size={16} className="text-otai-text-muted" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-otai-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-otai-green" : "bg-otai-purple"}`} style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
