import {
    Sheet,
    SheetTrigger,
    SheetContent,
  } from "@/components/ui/sheet"

export default function Header() {
    return(
        <header className="fixed top-0 left-0 z-50 w-full">
            <nav className="bg-white border-gray-200 px-4 lg:px-6 py-1 dark:bg-gray-900 drop-shadow h-16">
                <div className="flex flex-wrap justify-between items-center">
                    <Sheet>
                      <SheetTrigger asChild className="flex justify-start items-center sm:hidden">
                        <button type="button" className=" p-2 mr-3 text-gray-600 rounded cursor-pointer inline hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700">
                            <span className="sr-only">Open sidebar</span>
                            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h14"/>
                            </svg>
                        </button>
                        
                        
                      </SheetTrigger>
                      <SheetContent side="left" className="flex flex-col">
                        <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pt-4">
                            <ul className="space-y-2 font-medium">
                                <li>
                                    <a href="/sample" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                                    <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
                                        <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z"></path>
                                    </svg>
                                    <span className="flex-1 ms-3 whitespace-nowrap">Sample</span>
                                    <span className="inline-flex items-center justify-center px-2 ms-3 text-sm font-medium text-gray-800 bg-gray-100 rounded-full dark:bg-blue-900 dark:text-gray-300">New!</span>
                                    </a>
                                </li>
                                <li >
                                    <a href="/" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 bg-gray-900 group grayscale pointer-events-none" >
                                    <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 22 21">
                                        <path d="M16.975 11H10V4.025a1 1 0 0 0-1.066-.998 8.5 8.5 0 1 0 9.039 9.039.999.999 0 0 0-1-1.066h.002Z"></path>
                                        <path d="M12.5 0c-.157 0-.311.01-.565.027A1 1 0 0 0 11 1.02V10h8.975a1 1 0 0 0 1-.935c.013-.188.028-.374.028-.565A8.51 8.51 0 0 0 12.5 0Z"></path>
                                    </svg>
                                    <span className="flex-1 ms-3 whitespace-nowrap">Home</span>
                                    <span className="inline-flex items-center justify-center h-3 p-3 ms-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-gray-900 dark:text-blue-300 truncate">Coming Soon</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="/packs/" className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 bg-gray-900 group grayscale pointer-events-none" >
                                    <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="m17.418 3.623-.018-.008a6.713 6.713 0 0 0-2.4-.569V2h1a1 1 0 1 0 0-2h-2a1 1 0 0 0-1 1v2H9.89A6.977 6.977 0 0 1 12 8v5h-2V8A5 5 0 1 0 0 8v6a1 1 0 0 0 1 1h8v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4h6a1 1 0 0 0 1-1V8a5 5 0 0 0-2.582-4.377ZM6 12H4a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2Z"></path>
                                    </svg>
                                    <span className="flex-1 ms-3 whitespace-nowrap">Packs</span>
                                    <span className="inline-flex items-center justify-center  h-3 p-3 ms-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-gray-900 dark:text-blue-300 text-ellipsis truncate">Coming Soon</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                      </SheetContent>
                    </Sheet>
                    <a href="/samples" className="flex mr-4 items-center">
                        <img src="/logo.png" alt="LoopShare" style={{ height: "52px", minHeight: "52px", width: "auto" }} className="object-contain" />
                    </a>


                </div>
            </nav>
        </header>
   
    )
}