'use client'

import { useEffect, useState } from "react"

const categories = [
    { id: 'drums', name: 'Drums' },
    { id: 'bass', name: 'Bass' },
    { id: 'tonal', name: 'Tonal' },
    { id: 'sfxs', name: 'Sfxs' },
    { id: 'vocals', name: 'Vocals' },
    { id: 'ambiences', name: 'Ambiences' },
]

export default function Sidebar() {
    const [currentPack, setCurrentPack] = useState('')
    const [currentCategory, setCurrentCategory] = useState('')
    const [packs, setPacks] = useState<any[]>([])

    useEffect(() => {
        // Safe to read window.location on the client inside useEffect
        const params = new URLSearchParams(window.location.search)
        setCurrentPack(params.get('pack') || '')
        setCurrentCategory(params.get('category') || '')

        fetch('/samples/packs')
            .then(res => res.json())
            .then(data => setPacks(data || []))
            .catch(err => console.error("Error loading packs in sidebar", err))
    }, [])

    const isAllSamplesActive = !currentPack && !currentCategory;

    return (
        <aside id="default-sidebar" className="dark fixed left-0 w-1/5 h-screen transition-transform -translate-x-full sm:translate-x-0 shadow-lg border-r-[0.5px] border-gray-600 z-40" aria-label="Sidebar" aria-hidden="true">
            <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 pt-20">
                <ul className="space-y-4 font-medium">
                    <li>
                        <a href="/samples" className={`flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group ${isAllSamplesActive ? 'text-sky-400 font-semibold border-l-2 border-sky-500 pl-2' : 'text-gray-900 dark:text-white'}`}>
                            <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
                                <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z"></path>
                            </svg>
                            <span className="flex-1 ms-3 whitespace-nowrap">All Samples</span>
                        </a>
                    </li>
                    <li>
                        <div className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white group border-b border-gray-800 pb-2">
                            <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                            </svg>
                            <span className="flex-1 ms-3 font-semibold">Categories</span>
                        </div>
                        <ul className="pl-4 mt-2 space-y-1 text-sm">
                            {categories.map(cat => (
                                <li key={cat.id}>
                                    <a href={`/samples?category=${cat.id}`} className={`flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 truncate capitalize ${currentCategory === cat.id ? 'bg-gray-800/60 text-sky-400 font-semibold border-l-2 border-sky-500 pl-2' : 'text-gray-400'}`} title={cat.name}>
                                        {cat.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </li>
                    <li>
                        <div className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white group border-b border-gray-800 pb-2">
                            <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="m17.418 3.623-.018-.008a6.713 6.713 0 0 0-2.4-.569V2h1a1 1 0 1 0 0-2h-2a1 1 0 0 0-1 1v2H9.89A6.977 6.977 0 0 1 12 8v5h-2V8A5 5 0 1 0 0 8v6a1 1 0 0 0 1 1h8v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4h6a1 1 0 0 0 1-1V8a5 5 0 0 0-2.582-4.377ZM6 12H4a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2Z"></path>
                            </svg>
                            <span className="flex-1 ms-3 font-semibold">Packs</span>
                        </div>
                        <ul className="pl-4 mt-2 space-y-1 text-sm max-h-[70vh] overflow-y-auto pr-1">
                            {packs.length === 0 ? (
                                <li className="text-gray-500 text-xs py-2">No packs found</li>
                            ) : (
                                packs.map(pack => (
                                    <li key={pack.id}>
                                        <a href={`/samples?pack=${encodeURIComponent(pack.name)}`} className={`flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 truncate ${currentPack === pack.name ? 'bg-gray-800/60 text-sky-400 font-semibold border-l-2 border-sky-500 pl-2' : 'text-gray-400'}`} title={pack.name}>
                                            {pack.name}
                                        </a>
                                    </li>
                                ))
                            )}
                        </ul>
                    </li>
                </ul>
            </div>
        </aside>
    )
}