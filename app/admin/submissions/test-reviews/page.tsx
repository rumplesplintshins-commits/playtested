"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function AdminTestReviewsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/submissions?tab=playtests" + window.location.hash); }, [router]);
  return <main className="min-h-screen bg-[#090b0a] p-6 text-white"><Link href="/admin/submissions?tab=playtests">Open Playtest reviews</Link></main>;
}
