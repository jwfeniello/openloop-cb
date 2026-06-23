"use client"

import React, { useEffect, useRef, useState } from 'react'
import ReactHowler from 'react-howler'

// components/AudioPlayer.tsx

import { PlayerControls } from "@/components/playercontrols";

type AudioProps = {
    audio: AudioFile;
    playing: boolean;
    setPlaying: (playing: boolean) => void;
    progress: number;
    setProgress: (progress: number) => void;
    onFwd: () => void;
    onBwd: () => void;
    //onLike: () => void; //TO BE IMPLEMENTED
    replaceUnderscores: boolean;
    setReplaceUnderscores: (val: boolean) => void;
    scrollLongNames: boolean;
    setScrollLongNames: (val: boolean) => void;
}

export type AudioFile = {
    id: number;
    dbId?: number;
    url: string;
    title: string;
    author: string;
    thumbnail: string;
    category?: string;
    packName?: string;
    fileName?: string;
}

const AudioPlayerInstance = React.memo(({
    src,
    playing,
    volume,
    mute,
    loop,
    onLoad,
    onEnd,
    onStop,
    onPause,
    playerRef
}: any) => {
    return (
        <ReactHowler
            ref={playerRef}
            src={src}
            playing={playing}
            volume={volume}
            mute={mute}
            loop={loop}
            onLoad={onLoad}
            onEnd={onEnd}
            onStop={onStop}
            onPause={onPause}
        />
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.src === nextProps.src &&
        prevProps.playing === nextProps.playing &&
        prevProps.volume === nextProps.volume &&
        prevProps.mute === nextProps.mute &&
        prevProps.loop === nextProps.loop
    );
});
AudioPlayerInstance.displayName = "AudioPlayerInstance";

export const Player = ({
    audio,
    playing,
    setPlaying,
    progress,
    setProgress,
    onFwd,
    onBwd,
    replaceUnderscores,
    setReplaceUnderscores,
    scrollLongNames,
    setScrollLongNames,
}: AudioProps) => {
    const playerRef = useRef<ReactHowler | null>(null);
    

    const [muted, setMuted] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0.5);
    const [loop, setLoop] = useState<boolean>(false);
    const [duration, setDuration] = useState<number>(0);

    const endedRef = useRef(false);
    const prevAudioRef = useRef<AudioFile | null>(null);
    const playingRef = useRef(playing);

    // Synchronously track state updates
    playingRef.current = playing;

    if (prevAudioRef.current?.url !== audio?.url) {
        prevAudioRef.current = audio;
        endedRef.current = false;
    }

    if (!playing) {
        endedRef.current = false;
    }

    // event handlers for custom controls

    const handlePlay = () => {
        endedRef.current = false;
        playingRef.current = true;
        setPlaying(true);
        setProgress(0);
    };

    const handlePause = () => {
        playingRef.current = false;
        setPlaying(false);
    };

    const handleEnd = () => {
        endedRef.current = true;
        playingRef.current = false;
        setPlaying(false);
        setProgress(1);
        if (playerRef.current) {
            const howlerInstance = playerRef.current.howler;
            setTimeout(() => {
                howlerInstance.stop();
            }, 0);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
    };

    const toggleMute = () => {
        setMuted((prevMuted) => !prevMuted);
    };

    const handleLoad = () => {
        handleDuration(playerRef.current.howler.duration())
    };

    const handleDuration = (duration: number) => {
        setDuration(duration);
    };

    const toggleLoop = () => {
        setLoop((prevLoop) => !prevLoop);
    };
    
    const handleSkipTrack = (direction: string) => {
        if (direction == 'fwd') {
            onFwd()
        } else {
            onBwd()
        }
        
    };

    const requestId = useRef<any>();
    const prevSeekRef = useRef<number>(0);

    useEffect(() => {
        const updateProgress = () => {
            if (playerRef.current?.howler && playerRef.current.howler.playing()) {
                const currentSeek = playerRef.current.howler.seek();
                const dur = playerRef.current.howler.duration();
                if (typeof currentSeek === 'number' && dur > 0) {
                    // Prevent resetting progress back to 0 if the seek is reset upon track end
                    if (currentSeek < prevSeekRef.current && !loop && currentSeek === 0) {
                        return;
                    }
                    prevSeekRef.current = currentSeek;
                    setProgress(currentSeek / dur);
                }
            }
            if (playingRef.current) {
                requestId.current = requestAnimationFrame(updateProgress);
            }
        };

        if (playing) {
            requestId.current = requestAnimationFrame(updateProgress);
        } else {
            cancelAnimationFrame(requestId.current);
        }
        return () => {
            cancelAnimationFrame(requestId.current);
        };
    }, [playing, loop, setProgress]);

    useEffect(() => {
        prevSeekRef.current = 0;
        handlePlay()
    }, [audio])

    useEffect(() => {
        if (playing) {
            setProgress(0);
            prevSeekRef.current = 0;
        }
    }, [playing]);
    return (
        <div className='w-full'>
            <AudioPlayerInstance
                playerRef={playerRef}
                src={audio ? audio.url : 'none'}
                playing={playing && !endedRef.current && progress !== 1}
                volume={volume}
                mute={muted}
                loop={loop}
                onLoad={handleLoad}
                onEnd={handleEnd}
                onStop={handlePause}
                onPause={handlePause}
            />
            <div className="shadow">
            
            <PlayerControls
                playerRef={playerRef}
                audio={audio? audio : null}
                playing={playing && !endedRef.current}
                volume={volume}
                muted={muted}
                progress={progress}
                duration={duration}
                loop={loop}
                // event handler props
                toggleMute={toggleMute}
                handlePlay={handlePlay}
                toggleLoop={toggleLoop}
                handlePause={handlePause}
                handleVolumeChange={handleVolumeChange}
                handleSkip={handleSkipTrack}
                // settings props
                replaceUnderscores={replaceUnderscores}
                setReplaceUnderscores={setReplaceUnderscores}
                scrollLongNames={scrollLongNames}
                setScrollLongNames={setScrollLongNames}
            />
            </div>
        </div>
    )
}
