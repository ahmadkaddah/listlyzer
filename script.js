
const API_KEY = 'AIzaSyBnAw9wDqw5wsxtw3CymsTJCuy2x4h48Wc';

const playlistUrlInput = document.getElementById('playlist-url');
const analyzeBtn = document.getElementById('analyze-btn');
const loader = document.getElementById('loader');
const results = document.getElementById('results');
const totalDurationEl = document.getElementById('total-duration');
const speed125El = document.getElementById('speed-1-25');
const speed15El = document.getElementById('speed-1-5');
const speed175El = document.getElementById('speed-1-75');
const speed2El = document.getElementById('speed-2');
const totalViewsEl = document.getElementById('total-views');
const playlistHeaderEl = document.getElementById('playlist-header');
const videoListEl = document.getElementById('video-list');

analyzeBtn.addEventListener('click', analyzePlaylist);

function extractPlaylistId(url) {
    const regex = /[?&]list=([^&]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) return '00:00:00';

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTimeFromSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatViewCount(count) {
    return parseInt(count).toLocaleString('ar-EG');
}

function durationToSeconds(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) return 0;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    return hours * 3600 + minutes * 60 + seconds;
}

async function analyzePlaylist() {
    const playlistUrl = playlistUrlInput.value.trim();
    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
        showError('الرجاء إدخال رابط قائمة تشغيل صالح من يوتيوب');
        return;
    }

    loader.style.display = 'flex';
    results.style.display = 'none';

    try {
        const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`);
        const playlistData = await playlistResponse.json();

        if (!playlistData.items || playlistData.items.length === 0) {
            throw new Error('قائمة التشغيل غير موجودة أو خاصة');
        }

        const playlistInfo = playlistData.items[0].snippet;

        let videos = [];
        let nextPageToken = '';
        let totalDurationSeconds = 0;
        let totalViews = 0;

        do {
            const videosResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${API_KEY}`);
            const videosData = await videosResponse.json();

            if (!videosData.items || videosData.items.length === 0) {
                break;
            }

            const videoIds = videosData.items.map(item => item.snippet.resourceId.videoId).join(',');

            const videoDetailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${API_KEY}`);
            const videoDetailsData = await videoDetailsResponse.json();

            const combinedVideos = videosData.items.map(item => {
                const videoId = item.snippet.resourceId.videoId;
                const videoDetails = videoDetailsData.items.find(detail => detail.id === videoId);

                if (!videoDetails) return null;

                const durationSeconds = durationToSeconds(videoDetails.contentDetails.duration);
                totalDurationSeconds += durationSeconds;

                const viewCount = parseInt(videoDetails.statistics.viewCount || 0);
                totalViews += viewCount;

                return {
                    id: videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.medium.url,
                    position: item.snippet.position,
                    duration: videoDetails.contentDetails.duration,
                    durationFormatted: formatDuration(videoDetails.contentDetails.duration),
                    durationSeconds: durationSeconds,
                    viewCount: viewCount,
                    viewCountFormatted: formatViewCount(viewCount)
                };
            }).filter(video => video !== null);

            videos = [...videos, ...combinedVideos];
            nextPageToken = videosData.nextPageToken || '';

        } while (nextPageToken);

        updateUI(totalDurationSeconds, totalViews, playlistInfo, videos);

    } catch (error) {
        console.error('Error analyzing playlist:', error);
        showError(`حدث خطأ أثناء تحليل قائمة التشغيل: ${error.message}`);
    } finally {
        loader.style.display = 'none';
    }
}

playlistUrlInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        analyzeBtn.click();
    }
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;

    const main = document.querySelector('main');
    const existingError = main.querySelector('.error-message');

    if (existingError) {
        main.removeChild(existingError);
    }

    main.insertBefore(errorDiv, loader);

    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.classList.add('fade-out');
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    main.removeChild(errorDiv);
                }
            }, 500);
        }
    }, 5000);
}

function updateUI(totalDurationSeconds, totalViews, playlistInfo, videos) {
    totalDurationEl.textContent = formatTimeFromSeconds(totalDurationSeconds);

    const duration125 = totalDurationSeconds / 1.25;
    const duration15 = totalDurationSeconds / 1.5;
    const duration175 = totalDurationSeconds / 1.75;
    const duration2 = totalDurationSeconds / 2;

    speed125El.textContent = formatTimeFromSeconds(duration125);
    speed15El.textContent = formatTimeFromSeconds(duration15);
    speed175El.textContent = formatTimeFromSeconds(duration175);
    speed2El.textContent = formatTimeFromSeconds(duration2);

    totalViewsEl.textContent = formatViewCount(totalViews);

    playlistHeaderEl.innerHTML = `
        <img src="${playlistInfo.thumbnails.medium.url}" alt="${playlistInfo.title}" class="playlist-thumbnail">
        <div class="playlist-details">
            <h4>${playlistInfo.title}</h4>
            <p>${playlistInfo.channelTitle}</p>
            <p>${videos.length} فيديو</p>
        </div>
    `;

    videoListEl.innerHTML = '';
    videos.sort((a, b) => a.position - b.position).forEach((video, index) => {
        const videoElement = document.createElement('div');
        videoElement.className = 'video-item';
        videoElement.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
            <div class="video-details">
                <h4>${index + 1}. ${video.title}</h4>
                <p>المشاهدات: ${video.viewCountFormatted}</p>
                <p class="video-duration">المدة: ${video.durationFormatted}</p>
            </div>
        `;
        videoListEl.appendChild(videoElement);
    });

    results.style.opacity = '0';
    results.style.display = 'block';

    setTimeout(() => {
        results.style.transition = 'opacity 0.5s ease-in-out';
        results.style.opacity = '1';
    }, 100);
}

async function analyzePlaylist() {
    const playlistUrl = playlistUrlInput.value.trim();
    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
        showError('الرجاء إدخال رابط قائمة تشغيل صالح من يوتيوب');
        return;
    }

    loader.style.display = 'flex';
    results.style.display = 'none';

    try {
        const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`);
        const playlistData = await playlistResponse.json();

        if (!playlistData.items || playlistData.items.length === 0) {
            throw new Error('قائمة التشغيل غير موجودة أو خاصة');
        }

        const playlistInfo = playlistData.items[0].snippet;

        let videos = [];
        let nextPageToken = '';
        let totalDurationSeconds = 0;
        let totalViews = 0;

        do {
            const videosResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${API_KEY}`);
            const videosData = await videosResponse.json();

            if (!videosData.items || videosData.items.length === 0) {
                break;
            }

            const videoIds = videosData.items.map(item => item.snippet.resourceId.videoId).join(',');

            const videoDetailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${API_KEY}`);
            const videoDetailsData = await videoDetailsResponse.json();

            const combinedVideos = videosData.items.map(item => {
                const videoId = item.snippet.resourceId.videoId;
                const videoDetails = videoDetailsData.items.find(detail => detail.id === videoId);

                if (!videoDetails) return null;

                const durationSeconds = durationToSeconds(videoDetails.contentDetails.duration);
                totalDurationSeconds += durationSeconds;

                const viewCount = parseInt(videoDetails.statistics.viewCount || 0);
                totalViews += viewCount;

                return {
                    id: videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.medium.url,
                    position: item.snippet.position,
                    duration: videoDetails.contentDetails.duration,
                    durationFormatted: formatDuration(videoDetails.contentDetails.duration),
                    durationSeconds: durationSeconds,
                    viewCount: viewCount,
                    viewCountFormatted: formatViewCount(viewCount)
                };
            }).filter(video => video !== null);

            videos = [...videos, ...combinedVideos];
            nextPageToken = videosData.nextPageToken || '';

        } while (nextPageToken);

        updateUI(totalDurationSeconds, totalViews, playlistInfo, videos);

    } catch (error) {
        console.error('Error analyzing playlist:', error);
        showError(`حدث خطأ أثناء تحليل قائمة التشغيل: ${error.message}`);
    } finally {
        loader.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeToggleBtn.querySelector('i');
    const themeText = themeToggleBtn.querySelector('span');

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        themeText.textContent = 'الوضع الفاتح';
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');

        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            themeText.textContent = 'الوضع الفاتح';
        } else {
            localStorage.setItem('theme', 'light');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            themeText.textContent = 'الوضع المظلم';
        }
    });
});