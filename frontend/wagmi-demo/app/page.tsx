'use client';

import Image from 'next/image';
import Link from 'next/link';

import '../files/nuxt-ui.css';
import '../files/octopus.css';

export default function HomePage() {
    return (
        <main className="min-h-screen bg-gray-100 text-gray-800 font-sans">
            <div className="container mx-auto px-4 py-10">
                <header className="flex justify-center items-center py-6">
                    <div className="logo">
                        <Image src="/favicon.svg" alt="Octopus AI Logo" width={60} height={60} />
                    </div>
                </header>

                <section className="flex flex-wrap justify-between items-center bg-white p-10 rounded-xl shadow-md mt-12 gap-10">
                    <div className="flex-1 min-w-[300px] max-w-xl space-y-6">
                        <h1 className="text-4xl md:text-5xl font-bold text-blue-600">Octopus AI</h1>
                        <p className="text-lg">
                            Octopus AI is a platform that helps you manage your business and make better decisions.
                            Leveraging the power of AI, we analyze your data to provide actionable insights and drive success.
                        </p>
                        <Link href="/home" className="inline-block bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-800 transition">
                            Get Started
                        </Link>
                    </div>

                    <div className="flex-1 min-w-[300px] text-center relative">
                        <Image
                            src="https://art.pixilart.com/e1224c0b2b3026f.gif"
                            alt="Octopus AI Illustration"
                            width={500}
                            height={300}
                            className="rounded-lg mx-auto"
                        />
                        <div id="octowrap" className="">
                            {Array.from({ length: 14 }).map((_, i) => (
                                <div key={i} className="bubble w-4 h-4 bg-blue-200 rounded-full m-1 animate-ping"></div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
