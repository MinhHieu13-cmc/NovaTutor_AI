'use client';

import { useState, useEffect } from 'react';
import { courseService, type Course, type CourseDocument } from '@/services/courseService';
import { authService } from '@/services/authService';

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const user = authService.getUser();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getTeacherCourses();
      setCourses(data);
    } catch (error: any) {
      console.error('Failed to load courses:', error);
      alert('Failed to load courses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (courseId: string) => {
    try {
      const docs = await courseService.getCourseDocuments(courseId);
      setDocuments(docs);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    loadDocuments(course.id);
  };

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await courseService.createCourse({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        subject: formData.get('subject') as string,
      });
      alert('Course created successfully!');
      setShowCreateModal(false);
      await loadCourses();
    } catch (error: any) {
      alert('Failed to create course: ' + error.message);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourse || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    try {
      setUploading(true);
      await courseService.uploadDocument(selectedCourse.id, file);
      alert('Document uploaded and processing started!');
      await loadDocuments(selectedCourse.id);
    } catch (error: any) {
      alert('Failed to upload document: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      await courseService.deleteCourse(courseId);
      alert('Course deleted successfully!');
      setSelectedCourse(null);
      await loadCourses();
    } catch (error: any) {
      alert('Failed to delete course: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👨‍🏫 Teacher Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.full_name}!
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ➕ Create Course
              </button>
              <button
                onClick={() => authService.logout()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Courses List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">My Courses ({courses.length})</h2>
              {courses.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">
                  No courses yet. Create your first course!
                </p>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedCourse?.id === course.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900">{course.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{course.subject}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Course Details */}
          <div className="lg:col-span-2">
            {selectedCourse ? (
              <div className="space-y-6">
                {/* Course Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedCourse.name}
                      </h2>
                      <p className="text-gray-600 mt-2">{selectedCourse.description}</p>
                      <span className="inline-block mt-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {selectedCourse.subject}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCourse(selectedCourse.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Voice Configuration</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Voice:</span>
                        <span className="ml-2 font-medium">
                          {typeof selectedCourse.voice_config === 'string'
                            ? JSON.parse(selectedCourse.voice_config).voice_name
                            : selectedCourse.voice_config.voice_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Language:</span>
                        <span className="ml-2 font-medium">
                          {typeof selectedCourse.voice_config === 'string'
                            ? JSON.parse(selectedCourse.voice_config).language
                            : selectedCourse.voice_config.language}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">
                      📚 Course Materials ({documents.length})
                    </h3>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleUploadDocument}
                        className="hidden"
                        disabled={uploading}
                      />
                      <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
                        {uploading ? '⏳ Uploading...' : '📤 Upload PDF'}
                      </span>
                    </label>
                  </div>

                  {documents.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-600">No materials uploaded yet.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Upload PDFs to enable AI-powered tutoring
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">📄</span>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {doc.document_name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600 text-lg">
                  Select a course to view details and manage materials
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Create New Course</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Advanced Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the course"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

