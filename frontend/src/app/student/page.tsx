'use client';

import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { courseService, type Course } from '@/services/courseService';
import { authService } from '@/services/authService';
import ChatInterface from '@/components/chat/ChatInterface';
import { NovaAvatarView } from '@/components/NovaAvatarView';

export default function StudentDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-courses' | 'available' | 'chat'>('my-courses');
  const user = authService.getUser();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const [myCourses, available] = await Promise.all([
        courseService.getStudentCourses(),
        courseService.getAvailableCourses(),
      ]);
      setCourses(myCourses);
      setAvailableCourses(available.filter(
        c => !myCourses.some(mc => mc.id === c.id)
      ));
    } catch (error: any) {
      console.error('Failed to load courses:', error);
      alert('Failed to load courses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      await courseService.enrollInCourse(courseId);
      alert('Successfully enrolled!');
      await loadCourses();
    } catch (error: any) {
      alert('Failed to enroll: ' + error.message);
    }
  };

  const handleStartChat = (course: Course) => {
    setSelectedCourse(course);
    setActiveTab('chat');
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
                👨‍🎓 Student Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.full_name}!
              </p>
            </div>
            <button
              onClick={() => authService.logout()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-courses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📚 My Courses ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 Available Courses ({availableCourses.length})
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💬 Chat with Nova
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Courses Tab */}
        {activeTab === 'my-courses' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
            {courses.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">
                  You haven't enrolled in any courses yet.
                </p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {course.subject}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {course.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {course.description}
                    </p>
                    <button
                      onClick={() => handleStartChat(course)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Start Learning 🚀
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Available Courses Tab */}
        {activeTab === 'available' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Available Courses</h2>
            {availableCourses.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">
                  All courses are already enrolled or no courses available.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                        {course.subject}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {course.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {course.description}
                    </p>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Enroll Now ✨
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-4 sticky top-4">
                <h3 className="text-lg font-bold mb-4 text-center">
                  🤖 Nova Avatar
                </h3>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Canvas camera={{ position: [0, 1.70, 1.2], fov: 35 }}>
                    <Suspense fallback={null}>
                      <Environment preset="city" />
                      <ambientLight intensity={0.5} />
                      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                      <NovaAvatarView
                        blendshapes={{}}
                        currentEmotion="neutral"
                        isSpeaking={false}
                      />
                      <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
                      <OrbitControls
                        target={[0, 1.70, 0]}
                        enableZoom={false}
                        enablePan={false}
                      />
                    </Suspense>
                  </Canvas>
                </div>
                {selectedCourse && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900">
                      Current Course:
                    </p>
                    <p className="text-sm text-blue-700">{selectedCourse.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="lg:col-span-2">
              <div className="h-[600px]">
                <ChatInterface
                  courseId={selectedCourse?.id}
                  courseName={selectedCourse?.name}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

