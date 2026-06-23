"use client"

import { useEffect, useRef, useState } from "react";
import { Duration } from "@/components/durations";

import { CiPlay1, CiPause1 } from "react-icons/ci";
import { VscMute, VscUnmute } from "react-icons/vsc";
import { ImLoop } from "react-icons/im";
import { IoPlaySkipBack, IoPlaySkipForward, IoDownloadOutline, IoSettingsOutline } from "react-icons/io5";
import { AudioFile } from "./player";
import { capitalizeStr } from '@/lib/utils';

const ScrollablePlayerTitle = ({ 
    title, 
    author, 
    replaceUnderscores, 
    scrollLongNames
}: { 
    title: string; 
    author: string; 
    replaceUnderscores: boolean; 
    scrollLongNames: boolean; 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [scrollAmount, setScrollAmount] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    let displayName = title ? title : 'None';
    if (replaceUnderscores) {
        displayName = displayName.replace(/_/g, " ");
    }
    displayName = capitalizeStr(displayName);

    useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.getBoundingClientRect().width;
                const textWidth = textRef.current.scrollWidth;
                if (textWidth > containerWidth) {
                    setScrollAmount(textWidth - containerWidth + 12); // padding offset
                } else {
                    setScrollAmount(0);
                }
            }
        };

        checkScroll();

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
            const observer = new ResizeObserver(checkScroll);
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, [title, replaceUnderscores, scrollLongNames]);

    const style = (scrollLongNames && scrollAmount > 0) ? {
        transform: isHovered ? `translateX(-${scrollAmount}px)` : "translateX(0px)",
        transition: "transform 3s ease-in-out",
    } : {};

    return (
        <div 
            ref={containerRef} 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex flex-col max-w-[180px] sm:max-w-[220px] overflow-hidden whitespace-nowrap cursor-default shrink-0 pr-2"
        >
            <span 
                ref={textRef}
                style={style}
                className={`font-semibold text-sm text-white inline-block ${
                    (scrollLongNames && scrollAmount > 0 && isHovered)
                        ? "overflow-visible max-w-none"
                        : "truncate max-w-full"
                }`}
            >
                {displayName}
            </span>
            <span className="text-xs text-gray-400 truncate max-w-full">{author}</span>
        </div>
    );
};


type Props = {
  playerRef: any;
  audio: AudioFile
  playing: boolean;
  loop: boolean;
  volume: number;
  muted: boolean;
  progress: number;
  duration: number;

  handlePlay: () => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  handlePause: () => void;
  handleVolumeChange: (newVolume: number) => void;
  handleSkip: (direction: string) => void;

  replaceUnderscores: boolean;
  setReplaceUnderscores: (val: boolean) => void;
  scrollLongNames: boolean;
  setScrollLongNames: (val: boolean) => void;
};

export const PlayerControls = ({
    playerRef,
    audio,
    loop,
    playing,
    volume,
    muted,
    progress,
    duration,
    handlePlay,
    toggleLoop,
    handlePause,
    handleVolumeChange,
    toggleMute,
    handleSkip,
    replaceUnderscores,
    setReplaceUnderscores,
    scrollLongNames,
    setScrollLongNames,
}: Props) => {
    const [played, setPlayed] = useState<number>(0);
    const [seeking, setSeeking] = useState<boolean>(false);
    const requestId = useRef<number>()

    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        };
        if (showSettings) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showSettings]);

    const togglePlayAndPause = () => {
        if (playing) {
        handlePause();
        } else {
        handlePlay();
        }
    };

    const handleSeekMouseDown = (e: any) => {
        setSeeking(true);
    };
    
    const handleSeekChange = (e: any) => {
        setPlayed(parseFloat(e.target.value));
    };
    
    const handleSeekMouseUp = (e: any) => {
        setPlayed(parseFloat(e.target.value))
        playerRef.current?.howler.seek(parseFloat(e.target.value));
        
        setSeeking(false);
    };

    const handleProgress = () => {
        if (playerRef.current?.howler && playerRef.current.howler.playing()) {
            const currentSeek = playerRef.current.howler.seek();
            if (typeof currentSeek === 'number') {
                setPlayed(currentSeek);
            }
        }
        if (playing && !seeking) {
            requestId.current = requestAnimationFrame(handleProgress);
        }
    };
    const handleChangeInVolume =  (e: React.ChangeEvent<HTMLInputElement>) => {
        handleVolumeChange(Number(e.target.value));
    };

    const skipFwd = () => {
        handleSkip('fwd')
    }
    const skipBwd = () => {
        handleSkip('bwd')
    }

    useEffect(() => {
        if (progress == 1) {
            if (loop == false) {
                setPlayed(0)
            }
        }
    }, [progress]);

    useEffect(() => {
        if (playing && !seeking) {
            requestId.current = requestAnimationFrame(handleProgress)
        }
        return () => {
            cancelAnimationFrame(requestId.current)
        }
    },[playing, seeking])

    const params = new URLSearchParams()
    if (audio) {
        params.set('file', audio.fileName || audio.title)
        params.set('pack', audio.packName || audio.author)
        params.set('category', audio.category || '')
    }
    const downloadUrl = audio ? `/samples/download?` + params.toString() : '#';

    return (
    <div className="bg-gray-950/95 backdrop-blur border border-gray-800 text-white rounded-xl px-6 py-2 shadow-2xl w-full">
        <div className="flex items-center justify-between gap-6 h-16">
            {/* Left Side: Thumbnail & Title */}
            <div className="flex items-center gap-3 min-w-[240px] max-w-[35%] shrink-0">
                {audio?.thumbnail ? (
                    <div className="relative size-10 shrink-0 rounded-md overflow-hidden border border-gray-800">
                        <img className="object-cover w-full h-full" src={audio.thumbnail} alt="cover" />
                    </div>
                ) : (
                    <div className="size-10 shrink-0 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-500">None</div>
                )}
                
                <ScrollablePlayerTitle 
                    title={audio ? audio.title : 'None'}
                    author={audio ? audio.author : ''}
                    replaceUnderscores={replaceUnderscores}
                    scrollLongNames={scrollLongNames}
                />

                {audio && (
                    <a
                        href={downloadUrl}
                        className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-800 shrink-0"
                        title="Download sample"
                    >
                        <IoDownloadOutline className="size-4" />
                    </a>
                )}
            </div>

            {/* Center: Controls & Progress Bar */}
            <div className="flex-grow max-w-xl flex flex-col items-center justify-center gap-1">
                {/* Controls */}
                <div className="flex items-center gap-4">
                    <button className="text-gray-400 hover:text-white transition-colors" onClick={toggleLoop} title="Loop">
                        <ImLoop className={loop ? "text-sky-400" : "text-gray-400"} />
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors" onClick={skipBwd}>
                        <IoPlaySkipBack className="size-4" />
                    </button>
                    <button className="size-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform" onClick={togglePlayAndPause}>
                        {playing ? <CiPause1 className="text-black size-4 stroke-[1.5]" /> : <CiPlay1 className="text-black size-4 stroke-[1.5] ml-[1px]" />}
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors" onClick={skipFwd}>
                        <IoPlaySkipForward className="size-4" />
                    </button>
                </div>

                {/* Progress Slider */}
                <div className="w-full flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="w-8 text-right"><Duration seconds={played} /></span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        step="any"
                        value={played}
                        onMouseDown={handleSeekMouseDown}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        className="flex-grow h-1.5 rounded-lg appearance-none bg-gray-800 accent-sky-500 cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:scale-125 active:[&::-webkit-slider-thumb]:scale-150 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150 hover:[&::-moz-range-thumb]:scale-125 active:[&::-moz-range-thumb]:scale-150"
                    />
                    <span className="w-8 text-left"><Duration seconds={duration} /></span>
                </div>
            </div>

            {/* Right Side: Volume Control & Settings */}
            <div className="flex items-center gap-2.5 min-w-[180px] max-w-[25%] justify-end shrink-0 relative">
                <button className="text-gray-400 hover:text-white transition-colors" onClick={toggleMute}>
                    {muted ? <VscMute className="size-4" /> : <VscUnmute className="size-4" />}
                </button>
                <input
                    type="range"
                    className="w-20 h-1.5 rounded-lg bg-gray-800 accent-sky-500 cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:scale-125 active:[&::-webkit-slider-thumb]:scale-150 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150 hover:[&::-moz-range-thumb]:scale-125 active:[&::-moz-range-thumb]:scale-150"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volume}
                    onChange={handleChangeInVolume}
                />
                
                <button 
                    className={`transition-all p-1.5 rounded-full hover:bg-gray-800 shrink-0 hover:rotate-45 duration-300 ${showSettings ? 'text-sky-400' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setShowSettings(!showSettings)}
                    title="Player settings"
                >
                    <IoSettingsOutline className="size-4" />
                </button>

                {showSettings && (
                    <div 
                        ref={settingsRef}
                        className="absolute bottom-12 right-0 bg-gray-950 border border-gray-800 text-white rounded-xl p-4 shadow-2xl z-50 w-56 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                        <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider border-b border-gray-950 pb-2 select-none">Options</h4>
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center justify-between cursor-pointer group text-xs text-gray-300 hover:text-white select-none">
                                <span>Replace Underscores</span>
                                <input 
                                    type="checkbox" 
                                    checked={replaceUnderscores}
                                    onChange={(e) => setReplaceUnderscores(e.target.checked)}
                                    className="rounded border-gray-700 bg-gray-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-gray-950 cursor-pointer size-3.5"
                                />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer group text-xs text-gray-300 hover:text-white select-none">
                                <span>Scroll Long Names</span>
                                <input 
                                    type="checkbox" 
                                    checked={scrollLongNames}
                                    onChange={(e) => setScrollLongNames(e.target.checked)}
                                    className="rounded border-gray-700 bg-gray-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-gray-950 cursor-pointer size-3.5"
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
