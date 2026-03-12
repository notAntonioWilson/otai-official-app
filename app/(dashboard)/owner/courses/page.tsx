"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen, Plus, X, Pencil, Trash2, ChevronDown, ChevronRight,
  ChevronUp, Loader2, Check, AlertCircle, Play, FileText,
  Users, GripVertical,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  target_role: string;
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

interface ProgressEntry {
  user_id: string;
  lesson_id: string;
  completed: boolean;
  display_name: string | null;
}

type TargetRole = "sales_rep" | "marketing";

export default function OwnerCourses() {
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<TargetRole>("sales_rep");
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);

  // Expanded states
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [parentCourseId, setParentCourseId] = useState("");
  const [parentModuleId, setParentModuleId] = useState("");

  const [courseForm, setCourseForm] = useState({ title: "", description: "" });
  const [moduleForm, setModuleForm] = useState({ title: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", content_type: "text", text_content: "", video_url: "" });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const { data: c } = await supabase.from("courses").select("*").order("display_order");
    setCourses(c || []);

    const { data: m } = await supabase.from("course_modules").select("*").order("display_order");
    setModules(m || []);

    const { data: l } = await supabase.from("course_lessons").select("*").order("display_order");
    setLessons(l || []);

    // Get progress with user names
    const { data: p } = await supabase
      .from("course_progress")
      .select("user_id, lesson_id, completed");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("role", ["sales_rep", "marketing"]);

    const nameMap: Record<string, string> = {};
    (profiles || []).forEach((pr) => { nameMap[pr.id] = pr.display_name || pr.id; });

    setProgress((p || []).map((pp) => ({ ...pp, display_name: nameMap[pp.user_id] || pp.user_id })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const roleCourses = courses.filter((c) => c.target_role === activeRole);

  // --- COURSE CRUD ---
  const openAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({ title: "", description: "" });
    setShowCourseModal(true);
    setError("");
  };

  const openEditCourse = (c: Course) => {
    setEditingCourse(c);
    setCourseForm({ title: c.title, description: c.description || "" });
    setShowCourseModal(true);
    setError("");
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) { setError("Title required."); return; }
    setSaving(true);
    const supabase = createClient();

    if (editingCourse) {
      const { error: err } = await supabase.from("courses").update({
        title: courseForm.title.trim(),
        description: courseForm.description || null,
      }).eq("id", editingCourse.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const maxOrder = roleCourses.reduce((m, c) => Math.max(m, c.display_order), 0);
      const { error: err } = await supabase.from("courses").insert({
        title: courseForm.title.trim(),
        description: courseForm.description || null,
        target_role: activeRole,
        display_order: maxOrder + 1,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowCourseModal(false);
    setSuccess(editingCourse ? "Course updated." : "Course created.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const deleteCourse = async (id: string) => {
    const supabase = createClient();
    // Cascade: lessons → modules → course
    const courseMods = modules.filter((m) => m.course_id === id);
    const modIds = courseMods.map((m) => m.id);
    if (modIds.length > 0) {
      await supabase.from("course_lessons").delete().in("module_id", modIds);
      await supabase.from("course_modules").delete().in("id", modIds);
    }
    await supabase.from("courses").delete().eq("id", id);
    setSuccess("Course deleted.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  // --- MODULE CRUD ---
  const openAddModule = (courseId: string) => {
    setEditingModule(null);
    setParentCourseId(courseId);
    setModuleForm({ title: "" });
    setShowModuleModal(true);
    setError("");
  };

  const openEditModule = (m: Module) => {
    setEditingModule(m);
    setParentCourseId(m.course_id);
    setModuleForm({ title: m.title });
    setShowModuleModal(true);
    setError("");
  };

  const saveModule = async () => {
    if (!moduleForm.title.trim()) { setError("Title required."); return; }
    setSaving(true);
    const supabase = createClient();

    if (editingModule) {
      const { error: err } = await supabase.from("course_modules").update({
        title: moduleForm.title.trim(),
      }).eq("id", editingModule.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const existing = modules.filter((m) => m.course_id === parentCourseId);
      const maxOrder = existing.reduce((mx, m) => Math.max(mx, m.display_order), 0);
      const { error: err } = await supabase.from("course_modules").insert({
        course_id: parentCourseId,
        title: moduleForm.title.trim(),
        display_order: maxOrder + 1,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModuleModal(false);
    setSuccess(editingModule ? "Module updated." : "Module created.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const deleteModule = async (id: string) => {
    const supabase = createClient();
    await supabase.from("course_lessons").delete().eq("module_id", id);
    await supabase.from("course_modules").delete().eq("id", id);
    setSuccess("Module deleted.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  // --- LESSON CRUD ---
  const openAddLesson = (moduleId: string) => {
    setEditingLesson(null);
    setParentModuleId(moduleId);
    setLessonForm({ title: "", content_type: "text", text_content: "", video_url: "" });
    setShowLessonModal(true);
    setError("");
  };

  const openEditLesson = (l: Lesson) => {
    setEditingLesson(l);
    setParentModuleId(l.module_id);
    setLessonForm({
      title: l.title,
      content_type: l.content_type,
      text_content: l.text_content || "",
      video_url: l.video_url || "",
    });
    setShowLessonModal(true);
    setError("");
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) { setError("Title required."); return; }
    setSaving(true);
    const supabase = createClient();

    const payload = {
      title: lessonForm.title.trim(),
      content_type: lessonForm.content_type,
      text_content: lessonForm.text_content || null,
      video_url: lessonForm.video_url || null,
    };

    if (editingLesson) {
      const { error: err } = await supabase.from("course_lessons").update(payload).eq("id", editingLesson.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const existing = lessons.filter((l) => l.module_id === parentModuleId);
      const maxOrder = existing.reduce((mx, l) => Math.max(mx, l.display_order), 0);
      const { error: err } = await supabase.from("course_lessons").insert({
        ...payload,
        module_id: parentModuleId,
        display_order: maxOrder + 1,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowLessonModal(false);
    setSuccess(editingLesson ? "Lesson updated." : "Lesson created.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  const deleteLesson = async (id: string) => {
    const supabase = createClient();
    await supabase.from("course_progress").delete().eq("lesson_id", id);
    await supabase.from("course_lessons").delete().eq("id", id);
    setSuccess("Lesson deleted.");
    setTimeout(() => setSuccess(""), 3000);
    loadData();
  };

  // Progress helpers
  const getLessonCompletions = (lessonId: string) =>
    progress.filter((p) => p.lesson_id === lessonId && p.completed);

  if (loading) {
    return <div className="text-otai-text-secondary">Loading courses...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen size={24} className="text-otai-purple" />
          Course Management
        </h1>
        <button onClick={openAddCourse}
          className="flex items-center gap-2 px-4 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Course
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-4 p-3 bg-otai-green/10 border border-otai-green/30 rounded-lg flex items-center gap-2 text-otai-green text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Role Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => { setActiveRole("sales_rep"); setExpandedCourse(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeRole === "sales_rep" ? "bg-otai-purple text-white" : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"}`}>
          Sales Rep Courses
        </button>
        <button onClick={() => { setActiveRole("marketing"); setExpandedCourse(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeRole === "marketing" ? "bg-otai-purple text-white" : "bg-otai-dark border border-otai-border text-otai-text-secondary hover:text-white"}`}>
          Marketing Courses
        </button>
      </div>

      {/* Course List */}
      {roleCourses.length === 0 ? (
        <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
          <BookOpen size={48} className="text-otai-text-muted mx-auto mb-4" />
          <p className="text-otai-text-secondary">No courses for {activeRole === "sales_rep" ? "Sales Reps" : "Marketing"}.</p>
          <p className="text-otai-text-muted text-sm mt-1">Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roleCourses.sort((a, b) => a.display_order - b.display_order).map((course) => {
            const isExpanded = expandedCourse === course.id;
            const courseMods = modules.filter((m) => m.course_id === course.id).sort((a, b) => a.display_order - b.display_order);
            const courseModIds = courseMods.map((m) => m.id);
            const courseLessons = lessons.filter((l) => courseModIds.includes(l.module_id));

            return (
              <div key={course.id} className="bg-otai-dark border border-otai-border rounded-xl overflow-hidden">
                {/* Course Header */}
                <div className="flex items-center justify-between p-4">
                  <button onClick={() => setExpandedCourse(isExpanded ? null : course.id)} className="flex items-center gap-3 flex-1 text-left">
                    {isExpanded ? <ChevronDown size={16} className="text-otai-purple" /> : <ChevronRight size={16} className="text-otai-text-muted" />}
                    <div>
                      <span className="text-white font-medium">{course.title}</span>
                      <span className="text-otai-text-muted text-xs ml-2">{courseMods.length} modules · {courseLessons.length} lessons</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditCourse(course)} className="p-2 text-otai-text-muted hover:text-white rounded"><Pencil size={13} /></button>
                    <button onClick={() => deleteCourse(course.id)} className="p-2 text-otai-text-muted hover:text-otai-red rounded"><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Expanded: Modules + Lessons */}
                {isExpanded && (
                  <div className="border-t border-otai-border">
                    {courseMods.map((mod) => {
                      const modExpanded = expandedModule === mod.id;
                      const modLessons = lessons.filter((l) => l.module_id === mod.id).sort((a, b) => a.display_order - b.display_order);

                      return (
                        <div key={mod.id} className="border-b border-otai-border last:border-b-0">
                          {/* Module row */}
                          <div className="flex items-center justify-between px-4 py-3 pl-10 bg-white/[0.01]">
                            <button onClick={() => setExpandedModule(modExpanded ? null : mod.id)} className="flex items-center gap-2 flex-1 text-left">
                              {modExpanded ? <ChevronDown size={14} className="text-otai-purple" /> : <ChevronRight size={14} className="text-otai-text-muted" />}
                              <span className="text-white text-sm">{mod.title}</span>
                              <span className="text-otai-text-muted text-xs">({modLessons.length})</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openAddLesson(mod.id)} className="p-1.5 text-otai-text-muted hover:text-otai-green rounded" title="Add lesson"><Plus size={12} /></button>
                              <button onClick={() => openEditModule(mod)} className="p-1.5 text-otai-text-muted hover:text-white rounded"><Pencil size={12} /></button>
                              <button onClick={() => deleteModule(mod.id)} className="p-1.5 text-otai-text-muted hover:text-otai-red rounded"><Trash2 size={12} /></button>
                            </div>
                          </div>

                          {/* Lessons */}
                          {modExpanded && modLessons.map((lesson) => {
                            const completions = getLessonCompletions(lesson.id);
                            return (
                              <div key={lesson.id} className="flex items-center justify-between px-4 py-2.5 pl-16 hover:bg-white/[0.01]">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {lesson.video_url ? <Play size={12} className="text-otai-purple shrink-0" /> : <FileText size={12} className="text-otai-text-muted shrink-0" />}
                                  <span className="text-otai-text-secondary text-sm truncate">{lesson.title}</span>
                                  {completions.length > 0 && (
                                    <span className="text-[10px] text-otai-green flex items-center gap-0.5 shrink-0">
                                      <Users size={9} /> {completions.length}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEditLesson(lesson)} className="p-1.5 text-otai-text-muted hover:text-white rounded"><Pencil size={11} /></button>
                                  <button onClick={() => deleteLesson(lesson.id)} className="p-1.5 text-otai-text-muted hover:text-otai-red rounded"><Trash2 size={11} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Add Module button */}
                    <button
                      onClick={() => openAddModule(course.id)}
                      className="w-full px-4 py-3 pl-10 text-left text-xs text-otai-purple hover:bg-otai-purple/5 transition-colors flex items-center gap-2"
                    >
                      <Plus size={12} /> Add Module
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============ COURSE MODAL ============ */}
      {showCourseModal && (
        <Modal onClose={() => setShowCourseModal(false)} title={editingCourse ? "Edit Course" : "Add Course"} error={error}>
          <div className="space-y-4">
            <InputField label="Title *" value={courseForm.title} onChange={(v) => setCourseForm({ ...courseForm, title: v })} />
            <div>
              <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Description</label>
              <textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                rows={3} className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none" />
            </div>
          </div>
          <ModalFooter onCancel={() => setShowCourseModal(false)} onSave={saveCourse} saving={saving} label={editingCourse ? "Update" : "Create"} />
        </Modal>
      )}

      {/* ============ MODULE MODAL ============ */}
      {showModuleModal && (
        <Modal onClose={() => setShowModuleModal(false)} title={editingModule ? "Edit Module" : "Add Module"} error={error}>
          <InputField label="Module Title *" value={moduleForm.title} onChange={(v) => setModuleForm({ title: v })} />
          <ModalFooter onCancel={() => setShowModuleModal(false)} onSave={saveModule} saving={saving} label={editingModule ? "Update" : "Create"} />
        </Modal>
      )}

      {/* ============ LESSON MODAL ============ */}
      {showLessonModal && (
        <Modal onClose={() => setShowLessonModal(false)} title={editingLesson ? "Edit Lesson" : "Add Lesson"} error={error}>
          <div className="space-y-4">
            <InputField label="Lesson Title *" value={lessonForm.title} onChange={(v) => setLessonForm({ ...lessonForm, title: v })} />

            <div>
              <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Content Type</label>
              <div className="grid grid-cols-3 gap-2">
                {["text", "video", "both"].map((t) => (
                  <button key={t} type="button" onClick={() => setLessonForm({ ...lessonForm, content_type: t })}
                    className={`px-3 py-2 rounded-lg text-xs border capitalize transition-colors ${
                      lessonForm.content_type === t ? "border-otai-purple bg-otai-purple/10 text-otai-purple" : "border-otai-border text-otai-text-secondary"
                    }`}>{t}</button>
                ))}
              </div>
            </div>

            {(lessonForm.content_type === "video" || lessonForm.content_type === "both") && (
              <InputField label="Video URL" value={lessonForm.video_url}
                onChange={(v) => setLessonForm({ ...lessonForm, video_url: v })} placeholder="YouTube or Vimeo embed URL" />
            )}

            {(lessonForm.content_type === "text" || lessonForm.content_type === "both") && (
              <div>
                <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">Text Content</label>
                <textarea value={lessonForm.text_content} onChange={(e) => setLessonForm({ ...lessonForm, text_content: e.target.value })}
                  rows={5} className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple resize-none" />
              </div>
            )}
          </div>
          <ModalFooter onCancel={() => setShowLessonModal(false)} onSave={saveLesson} saving={saving} label={editingLesson ? "Update" : "Create"} />
        </Modal>
      )}
    </div>
  );
}

// === Reusable pieces ===
function Modal({ children, onClose, title, error }: { children: React.ReactNode; onClose: () => void; title: string; error: string }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-otai-dark border border-otai-border rounded-2xl w-full max-w-md p-6 z-10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-otai-text-muted hover:text-white"><X size={20} /></button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-otai-red/10 border border-otai-red/30 rounded-lg flex items-center gap-2 text-otai-red text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onSave, saving, label }: { onCancel: () => void; onSave: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-otai-border">
      <button onClick={onCancel} className="px-4 py-2 text-sm text-otai-text-secondary hover:text-white transition-colors">Cancel</button>
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-otai-purple hover:bg-otai-purple-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
        {saving && <Loader2 size={14} className="animate-spin" />}{label}
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-otai-text-muted uppercase tracking-wide mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-black border border-otai-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-otai-purple" />
    </div>
  );
}
