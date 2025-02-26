import React, { useState, useRef, useEffect } from "react";
import { parseBlob } from "music-metadata-browser";

const loadPlaylist = async () => {
  try {
    // Get all MP3 files from the public/songs directory
    const audioContext = require.context("../public/songs", false, /\.mp3$/);
    const audioFiles = audioContext.keys().map((key) => key.replace("./", ""));

    const playlist = await Promise.all(
      audioFiles.map(async (file) => {
        try {
          const title = file.replace(".mp3", "");
          const src = `/songs/${file}`;
          const cover = await extractCover(src);
          return {
            title,
            src,
            cover: cover || "/assets/default.jpg", // Fallback cover
          };
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
          return {
            title: file.replace(".mp3", ""),
            src: `/songs/${file}`,
            cover: "/assets/default.jpg", // Fallback cover
          };
        }
      })
    );
    return playlist;
  } catch (error) {
    console.error("Error loading playlist:", error);
    return [];
  }
};

// Helper function to extract cover art from audio metadata
const extractCover = async (src) => {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Failed to fetch audio file");

    const arrayBuffer = await response.arrayBuffer();
    const metadata = await parseBlob(new Blob([arrayBuffer]));

    console.log("Metadata for file:", src, metadata); // Debugging

    // Check if cover art exists in metadata
    if (metadata.common?.picture?.[0]) {
      const picture = metadata.common.picture[0];
      console.log("Cover art found:", picture); // Debugging

      // Log the picture format and data
      console.log("Picture format:", picture.format);
      console.log("Picture data length:", picture.data.length);

      const base64String = arrayBufferToBase64(picture.data);
      return `data:${picture.format};base64,${base64String}`;
    } else {
      console.log("No cover art found in metadata"); // Debugging
    }
  } catch (error) {
    console.error("Error extracting cover art:", error);
  }
  return null;
};
// Helper function to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};
function App() {
  const audioRef = useRef(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredIndices, setFilteredIndices] = useState([]);

  useEffect(() => {
    const fetchPlaylist = async () => {
      const loadedPlaylist = await loadPlaylist();
      setPlaylist(loadedPlaylist);
    };
    fetchPlaylist();
  }, []);
  
  useEffect(() => {
    const filtered = playlist
      .map((song, index) => ({ song, index }))
      .filter(({ song }) =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    setFilteredIndices(filtered.map(item => item.index));
  }, [searchQuery, playlist]);

  

  const playAudio = () => {
    setIsPlaying(true);
    audioRef.current.play();
  };

  const pauseAudio = () => {
    setIsPlaying(false);
    audioRef.current.pause();
  };

  const togglePlayPause = () => {
    isPlaying ? pauseAudio() : playAudio();
  };

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % playlist.length);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    setCurrentIndex((currentIndex - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  const handleSongClick = (filteredIndex) => {
    const originalIndex = filteredIndices[filteredIndex];
    setCurrentIndex(originalIndex);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    const { currentTime, duration } = audioRef.current;
    setProgress((currentTime / duration) * 100);
    setCurrentTime(formatTime(currentTime));
    setDuration(formatTime(duration));
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  useEffect(() => {
    if (isPlaying) {
      playAudio();
    }
  }, [currentIndex]);

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
      audioRef.current.volume = 0;
    } else {
      setVolume(1);
      audioRef.current.volume = 1;
    }
  };

  if (playlist.length === 0) {
    return <div className="text-white">Loading songs...</div>;
  }
  

  const filteredPlaylist = playlist.filter((song) =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-900  text-white">
      {/* Sidebar for Song List */}
      <div className="w-1/4 bg-gray-600 p-4 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Library</h2>
        {filteredIndices.map((originalIndex, filteredIndex) => {
          const song = playlist[originalIndex];
          return (
            <div
              key={originalIndex}
              onClick={() => handleSongClick(filteredIndex)}
              className={`p-2 cursor-pointer rounded ${
                originalIndex === currentIndex ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
            >
              {song.title}
            </div>
        );})}
      </div>

      {/* Main Player UI */}
      <div className="flex flex-col items-center justify-center flex-1 p-4 py-2">
        <input
          type="text"
          placeholder="Search songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
        />
        <h1 className="text-3xl font-bold text-blue-400">A4 Blend</h1>
        <h3 className="text-xs mb-6">Interactive Music Player</h3>
        <img
          src={playlist[currentIndex]?.cover}
          alt="Album Cover"
          className="w-64 h-64 mb-2 rounded shadow-lg object-cover"
          onError={(e) => {
            console.error("Error loading cover art:", e.target.src); // Debugging
            e.target.src = "/assets/default.png"; // Fallback if image fails to load
          }}
        />
        <h2 className="text-xl mb-2 capitalize">{playlist[currentIndex].title}</h2>

        <audio
          ref={audioRef}
          src={playlist[currentIndex].src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNext}
        />

        <div className="flex w-200 justify-baseline ml-76">
          <button onClick={toggleMute}>
            {volume > 0 ? (
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* SVG for volume on */}
                <g strokeWidth="0"></g>
                <g strokeLinecap="round" strokeLinejoin="round"></g>
                <g>
                  <path
                    d="M16.0004 9.00009C16.6281 9.83575 17 10.8745 17 12.0001C17 13.1257 16.6281 14.1644 16.0004 15.0001M18 5.29177C19.8412 6.93973 21 9.33459 21 12.0001C21 14.6656 19.8412 17.0604 18 18.7084M4.6 9.00009H5.5012C6.05213 9.00009 6.32759 9.00009 6.58285 8.93141C6.80903 8.87056 7.02275 8.77046 7.21429 8.63566C7.43047 8.48353 7.60681 8.27191 7.95951 7.84868L10.5854 4.69758C11.0211 4.17476 11.2389 3.91335 11.4292 3.88614C11.594 3.86258 11.7597 3.92258 11.8712 4.04617C12 4.18889 12 4.52917 12 5.20973V18.7904C12 19.471 12 19.8113 11.8712 19.954C11.7597 20.0776 11.594 20.1376 11.4292 20.114C11.239 20.0868 11.0211 19.8254 10.5854 19.3026L7.95951 16.1515C7.60681 15.7283 7.43047 15.5166 7.21429 15.3645C7.02275 15.2297 6.80903 15.1296 6.58285 15.0688C6.32759 15.0001 6.05213 15.0001 5.5012 15.0001H4.6C4.03995 15.0001 3.75992 15.0001 3.54601 14.8911C3.35785 14.7952 3.20487 14.6422 3.10899 14.4541C3 14.2402 3 13.9601 3 13.4001V10.6001C3 10.04 3 9.76001 3.10899 9.54609C3.20487 9.35793 3.35785 9.20495 3.54601 9.10908C3.75992 9.00009 4.03995 9.00009 4.6 9.00009Z"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </g>
              </svg>
            ) : (
              <svg
                width="20px"
                height="20px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                stroke="#ffffff"
                strokeWidth="0.00024"
              >
                <g strokeWidth="0"></g>
                <g strokeLinecap="round" strokeLinejoin="round"></g>
                <g>
                  <path d="M9 9H11V15H9V9Z" fill="#ffffff"></path>
                  <path d="M15 15H13V9H15V15Z" fill="#ffffff"></path>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    fill="#ffffff"
                  ></path>
                </g>
              </svg>
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-30 ml-2"
          />
        </div>

        <div className="flex items-center justify-center w-full my-4">
          <span>{currentTime}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="flex w-full mx-2"
          />
          <span>{duration}</span>
        </div>

        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            onClick={handlePrevious}
          >
            <svg
              width="23px"
              height="20px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              transform="matrix(-1, 0, 0, 1, 0, 0)"
            >
              <g strokeWidth="0"></g>
              <g strokeLinecap="round" strokeLinejoin="round"></g>
              <g>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.60439 4.23093C4.94586 3.73136 4 4.20105 4 5.02762V18.9724C4 19.799 4.94586 20.2686 5.60439 19.7691L14.7952 12.7967C15.3227 12.3965 15.3227 11.6035 14.7952 11.2033L5.60439 4.23093ZM2 5.02762C2 2.54789 4.83758 1.13883 6.81316 2.63755L16.004 9.60993C17.5865 10.8104 17.5865 13.1896 16.004 14.3901L6.81316 21.3625C4.83758 22.8612 2 21.4521 2 18.9724V5.02762Z"
                  fill="#ffffff"
                ></path>
                <path
                  d="M20 3C20 2.44772 20.4477 2 21 2C21.5523 2 22 2.44772 22 3V21C22 21.5523 21.5523 22 21 22C20.4477 22 20 21.5523 20 21V3Z"
                  fill="#ffffff"
                ></path>
              </g>
            </svg>
          </button>

          <button
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 focus:outline-none flex items-center justify-center"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <svg
                width="30px"
                height="30px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                stroke="#ffffff"
                strokeWidth="0.00024"
              >
                <g strokeWidth="0"></g>
                <g strokeLinecap="round" strokeLinejoin="round"></g>
                <g>
                  <path d="M9 9H11V15H9V9Z" fill="#ffffff"></path>
                  <path d="M15 15H13V9H15V15Z" fill="#ffffff"></path>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    fill="#ffffff"
                  ></path>
                </g>
              </svg>
            ) : (
              <svg
                width="30px"
                height="30px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                ></circle>
                <path
                  d="M15.4137 10.941C16.1954 11.4026 16.1954 12.5974 15.4137 13.059L10.6935 15.8458C9.93371 16.2944 9 15.7105 9 14.7868V9.21316C9 8.28947 9.93371 7.70561 10.6935 8.15419L15.4137 10.941Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                ></path>
              </svg>
            )}
          </button>

          <button
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            onClick={handleNext}
          >
            <svg
              width="23px"
              height="20px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              transform="matrix(1, 0, 0, 1, 0, 0)"
            >
              <g strokeWidth="0"></g>
              <g strokeLinecap="round" strokeLinejoin="round"></g>
              <g>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.60439 4.23093C4.94586 3.73136 4 4.20105 4 5.02762V18.9724C4 19.799 4.94586 20.2686 5.60439 19.7691L14.7952 12.7967C15.3227 12.3965 15.3227 11.6035 14.7952 11.2033L5.60439 4.23093ZM2 5.02762C2 2.54789 4.83758 1.13883 6.81316 2.63755L16.004 9.60993C17.5865 10.8104 17.5865 13.1896 16.004 14.3901L6.81316 21.3625C4.83758 22.8612 2 21.4521 2 18.9724V5.02762Z"
                  fill="#ffffff"
                ></path>
                <path
                  d="M20 3C20 2.44772 20.4477 2 21 2C21.5523 2 22 2.44772 22 3V21C22 21.5523 21.5523 22 21 22C20.4477 22 20 21.5523 20 21V3Z"
                  fill="#ffffff"
                ></path>
              </g>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
