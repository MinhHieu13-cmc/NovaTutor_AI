"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authService, type User } from "@/services/authService";

const navItems = ["Explore", "Online Degrees", "Certificates", "Careers"];

const companies = ["Google", "IBM", "Meta", "Amazon", "Microsoft", "Salesforce"];

const featuredCourses = [
  {
    title: "Google Data Analytics Professional Certificate",
    provider: "Google",
    rating: "4.8",
    students: "1.2M learners",
    level: "Beginner",
  },
  {
    title: "AI For Everyone",
    provider: "DeepLearning.AI",
    rating: "4.7",
    students: "980K learners",
    level: "Beginner",
  },
  {
    title: "Full-Stack Web Development",
    provider: "Meta",
    rating: "4.9",
    students: "640K learners",
    level: "Intermediate",
  },
  {
    title: "Project Management Foundations",
    provider: "IBM",
    rating: "4.8",
    students: "530K learners",
    level: "Intermediate",
  },
];

const categories = [
  "Data Science",
  "AI & Machine Learning",
  "Programming",
  "Business",
  "Marketing",
  "Design",
];

const testimonials = [
  {
    name: "Lina M.",
    role: "Product Designer",
    text: "The guided path helped me switch careers in under 8 months.",
  },
  {
    name: "Arun K.",
    role: "Software Engineer",
    text: "The projects are practical and easy to fit into my weekly routine.",
  },
  {
    name: "Sophie T.",
    role: "Business Analyst",
    text: "Clear lessons, trusted instructors, and great certificate quality.",
  },
];

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(authService.getUser());
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 md:px-6">
          <Link href="/" className="text-xl font-bold text-[#2A73FF]">
            NovaTutor
          </Link>

          <div className="hidden flex-1 md:block">
            <input
              type="text"
              placeholder="Search for courses, skills, universities"
              className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm outline-none transition focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <nav className="hidden items-center gap-5 text-sm text-slate-700 lg:flex">
            {navItems.map((item) => (
              <a key={item} href="#" className="transition hover:text-[#2A73FF]">
                {item}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {currentUser ? (
              <details className="relative">
                <summary className="list-none cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {currentUser.full_name}
                </summary>
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-md">
                  <Link
                    href={currentUser.role === "teacher" ? "/teacher" : "/student"}
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      authService.logout(false);
                      setCurrentUser(null);
                    }}
                    className="w-full rounded-lg px-2 py-2 text-left text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </details>
            ) : (
              <>
                <Link href="/auth?mode=login" className="rounded-lg px-3 py-2 text-sm font-medium text-[#2A73FF] transition hover:bg-blue-50">
                  Sign In
                </Link>
                <Link href="/auth?mode=register" className="rounded-lg bg-[#2A73FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                  Join for Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-[#2A73FF]">
            Learn from top universities and companies
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">Learn without limits</h1>
          <p className="mb-7 text-lg text-slate-600">
            Build new skills with flexible online courses, certificates, and guided projects designed for real careers.
          </p>
          <div className="mb-6 flex flex-wrap gap-3">
            <Link href="/auth?mode=register" className="rounded-xl bg-[#2A73FF] px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
              Join for Free
            </Link>
            <a href="#courses" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50">
              Explore Courses
            </a>
          </div>
          <input
            type="text"
            placeholder="Search courses, skills, topics"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-slate-500">Students</p>
              <p className="mt-1 text-2xl font-bold">2M+</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-slate-500">Courses</p>
              <p className="mt-1 text-2xl font-bold">7,500+</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-slate-500">Partners</p>
              <p className="mt-1 text-2xl font-bold">300+</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-slate-500">Career Tracks</p>
              <p className="mt-1 text-2xl font-bold">120+</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
          <p className="mb-4 text-center text-sm font-medium text-slate-600">Trusted by teams at</p>
          <div className="grid grid-cols-2 gap-4 text-center text-sm font-semibold text-slate-600 md:grid-cols-6">
            {companies.map((company) => (
              <div key={company} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="courses" className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6">
        <div className="mb-7 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Featured Courses</h2>
          <a href="#" className="text-sm font-medium text-[#2A73FF]">View all</a>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {featuredCourses.map((course) => (
            <article key={course.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 h-28 rounded-xl bg-slate-100" />
              <h3 className="mb-2 text-sm font-semibold leading-6">{course.title}</h3>
              <p className="text-sm text-slate-500">{course.provider}</p>
              <p className="mt-2 text-sm">{course.rating} ★</p>
              <p className="text-sm text-slate-500">{course.students}</p>
              <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#2A73FF]">{course.level}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Browse Categories</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((category) => (
            <div key={category} className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm font-medium shadow-sm transition hover:border-[#2A73FF] hover:text-[#2A73FF]">
              {category}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Career Certificates</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {["Google UX Design", "IBM Data Science"].map((program) => (
            <div key={program} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Professional Certificate</p>
              <h3 className="mt-2 text-xl font-semibold">{program}</h3>
              <p className="mt-2 text-slate-600">Job-ready program with hands-on projects and career support.</p>
              <a href="#" className="mt-4 inline-block text-sm font-semibold text-[#2A73FF]">View Programs</a>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-2 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Learning Path</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {["Beginner", "Intermediate", "Advanced"].map((step, index) => (
            <div key={step} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2A73FF]">Step {index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{step}</h3>
              <p className="mt-2 text-sm text-slate-600">Structured projects and assessments to unlock the next stage.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6">
        <h2 className="mb-6 text-2xl font-bold">Testimonials</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm text-amber-500">★★★★★</p>
              <p className="text-sm text-slate-700">"{item.text}"</p>
              <p className="mt-4 text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-slate-500">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 md:px-6">
        <div className="rounded-3xl bg-[#2A73FF] px-6 py-10 text-center text-white shadow-sm">
          <h2 className="text-3xl font-bold">Start learning today</h2>
          <p className="mt-2 text-blue-100">Join millions of learners building skills with flexible online education.</p>
          <Link href="/auth?mode=register" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-[#2A73FF] transition hover:bg-blue-50">
            Join for Free
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm text-slate-600 md:grid-cols-5 md:px-6">
          <div>
            <p className="mb-3 font-semibold text-slate-900">Coursera</p>
            <p>About</p>
            <p>What We Offer</p>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-900">Community</p>
            <p>Learners</p>
            <p>Partners</p>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-900">More</p>
            <p>Press</p>
            <p>Investors</p>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-900">Mobile App</p>
            <p>iOS App</p>
            <p>Android App</p>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-900">Follow Us</p>
            <p>LinkedIn</p>
            <p>YouTube</p>
          </div>
        </div>
        <p className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">© 2026 NovaTutor, Inc. All rights reserved.</p>
      </footer>
    </main>
  );
}
