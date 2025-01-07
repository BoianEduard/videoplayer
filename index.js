const playlistDef = [
    {
        name:"Austria",
        src:"media/video1.mp4"
    },
    {
        name:"USA",
        src:"media/video2.mp4"
    },
    {
        name:"Ocean",
        src:"media/video3.mp4"
    },
    {
        name:"San Francisco",
        src:"media/video4.mp4"
    },
    {
        name:"Mountains",
        src:"media/video5.mp4"
    },
];


// ----------------- VARIABLES -----------------

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");
const preview = document.getElementById('previewCanvas');
const ptx = preview.getContext('2d');

const playlistContainer = document.getElementById("playlist");
const playlist = JSON.parse(localStorage.getItem('videoPlaylist')) || playlistDef; // if no playlist is already stored get the default one

const videoPlayer = document.getElementById("videoPlayer");
const previewVideo = document.getElementById('previewVideo');
videoPlayer.volume = parseFloat(localStorage.getItem("volume")) || 0; // sound off by default

let currentVideo = parseInt(localStorage.getItem("currentVideo")) || 0;
if (isNaN(currentVideo) || currentVideo < 0 || currentVideo >= playlist.length) {
    currentVideo = 0; // revert to first video if invalid
} // this validation is needed to avvoid errors that appear from the NaN value instead of 0 as returned index sometimes

let fromIdx = null;  // use later for drag drop

// ----------------- EVENT LISTENERS-----------------

document.addEventListener("DOMContentLoaded", () => { //on page load
    upsertPlaylist();
    playVideo(currentVideo);  // execute these 2 on page load
    previewVideo.src = videoPlayer.src;
});


videoPlayer.addEventListener("play", drawFrame);

videoPlayer.addEventListener("loadedmetadata", () => { // on video load
    canvas.width = videoPlayer.videoWidth;
    canvas.height = videoPlayer.videoHeight

    preview.width = 200;  
    preview.height = 100; 
});

videoPlayer.addEventListener("ended", () => {
    currentVideo = (currentVideo +1) % playlist.length;  // revert to first if last
    playVideo(currentVideo);
});


canvas.addEventListener("mousemove", (e) => {
    const canvasDim = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasDim.width;
    const scaleY = canvas.height / canvasDim.height;

    const x = (e.clientX - canvasDim.left) * scaleX;
    const y = (e.clientY - canvasDim.top) * scaleY;

    const ctrlY = canvas.height - 50;
    const pbY = ctrlY - 20;

    if (y >= pbY - 10 && y <= pbY) {
        preview.style.display = 'block'; 
        
        preview.style.left = `${e.clientX - canvasDim.left - preview.width/2}px`;

        const newTime = (x / canvas.width) * videoPlayer.duration;
        previewVideo.currentTime = newTime;
        ptx.clearRect(0, 0, preview.width, preview.height);
        ptx.drawImage(previewVideo, 0, 0, preview.width, preview.height);

        }  else {
        preview.style.display = 'none'; 
    } 
});

// seeked fires after seeking event ie after the user has moved the cursor to the new positio
previewVideo.addEventListener('seeked', () => {
        ptx.clearRect(0, 0, preview.width, preview.height);
        ptx.drawImage(previewVideo, 0, 0, preview.width, preview.height);
});

// on mouse leave clear the preview just in case
canvas.addEventListener("mouseleave", () => {
    preview.style.display = 'none';
    ptx.clearRect(0, 0, preview.width, preview.height);
});

canvas.addEventListener("click", (e) => {

    const canvasDim = canvas.getBoundingClientRect(); // canvas size

    //canvas scale
    const scaleX = canvas.width / canvasDim.width;     
    const scaleY = canvas.height / canvasDim.height; 

    //mouse coordinates relative to canvas
    const mouseX = (e.clientX - canvasDim.left) * scaleX;  
    const mouseY = (e.clientY - canvasDim.top) * scaleY;    

    const ctrlY = canvas.height - 50; // get control Y
    const pbY = ctrlY - 20; // get progress bar Y
    const buttonSize = 40; 

    //progress bar
    if ((mouseY >= pbY - 10) && (mouseY <= pbY)) {  
        const newTime = (mouseX / canvas.width) * videoPlayer.duration;
        videoPlayer.currentTime = newTime;
    }

    // play pause button
    if ((mouseX >= 20) && (mouseX <= 20 + buttonSize) && (mouseY >= ctrlY && mouseY <= ctrlY + buttonSize)) { //check for play/pause
        if (videoPlayer.paused) {
            videoPlayer.play();
        } else {
            videoPlayer.pause();
        }
    }

    //prev button
    if ((mouseX >= 70) && (mouseX <= 70 + buttonSize)&& (mouseY>= ctrlY) && (mouseY <= ctrlY+ buttonSize)) { //check for prevbtn
        currentVideo = (currentVideo - 1 + playlist.length) % playlist.length; // go to last if first -> shorter than ifelse
        playVideo(currentVideo);
    }

    //next button
    if ((mouseX >= 120 && mouseX <= 120 + buttonSize) &&  (mouseY >= ctrlY) && (mouseY <= ctrlY + buttonSize)) {
        playVideo((currentVideo + 1) % playlist.length);
    }

    //volume control
    if ((mouseX >= canvas.width -60) && (mouseX <= canvas.width - 20) && (mouseY >= ctrlY) && (mouseY<= ctrlY +buttonSize)) {
        videoPlayer.volume = (ctrlY + buttonSize-mouseY) / buttonSize;
        localStorage.setItem("volume", videoPlayer.volume);
    }
});


dropZone.addEventListener("click", () => {
    fileInput.click();
});

// For the click-to-upload
fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault(); // so the drop event can be triggered
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files); 
});

function handleFiles(files) {
    for (let file of files) {
        const reader = new FileReader(); // if i just use the URL.createOBJECTURL it does not persist across sessions.
        reader.onload = function(e) { // when the file is loaded 
            playlist.push({
                name: file.name,
                src: e.target.result  //set the src to the video's encoding using a Base64 string 
            });
            upsertPlaylist();
        };
        reader.readAsDataURL(file); // read the file as a Base64 string
    }
}


// ----------------- Video/Playlist functions -----------------


function upsertPlaylist() {
    playlistContainer.innerHTML = "";

    // First update localStorage to ensure persistence
    localStorage.setItem('videoPlaylist', JSON.stringify(playlist));

    // Then update the UI
    playlist.forEach((video, index) => {
        const newVideo = addVideo(video, index);
        playlistContainer.appendChild(newVideo);
    });

    localStorage.setItem('videoPlaylist', JSON.stringify(playlist));
}

function addVideo(vid,index) {
    const newVideo = document.createElement("div");
    newVideo.className = "video-item";
    newVideo.textContent = vid.name
    newVideo.dataset.index = index; //store the new video's index

    newVideo.addEventListener("click", () => {
        playVideo(index);
    });

    newVideo.draggable = true;
    newVideo.addEventListener("dragstart", dragStart);
    newVideo.addEventListener("dragover",dragOver);
    newVideo.addEventListener("drop",dragDrop);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "  X";
    deleteButton.className = "delete-btn";
    deleteButton.addEventListener("click", (e) => {
        e.stopPropagation(); 
        removeVideo(parseInt(newVideo.dataset.index));
    });
    

    newVideo.appendChild(deleteButton);

    return newVideo;
}

function playVideo(index) {
    currentVideo = index;
    localStorage.setItem("currentVideo",currentVideo);
    videoPlayer.src = playlist[currentVideo].src;
    videoPlayer.play();
    isPlaying = true;
}


function removeVideo(index) {
      // Remove from playlist array
      playlist.splice(index, 1);

      // Handle currently playing video
      if (playlist.length === 0) {
          // If playlist is empty
          videoPlayer.src = '';
          currentVideo = 0;
      } else {
          // If we removed the current video or a video before it
          if (index <= currentVideo) {
              currentVideo = Math.max(0, currentVideo - 1);
              playVideo(currentVideo);
          }
      }
  
      // Update localStorage for both playlist and currentVideo
      localStorage.setItem("currentVideo", currentVideo);
      localStorage.setItem('videoPlaylist', JSON.stringify(playlist));
      
      // Update UI last
      upsertPlaylist();
}


// ----------------- Drag and Drop functions -----------------


function dragStart(e) {
    fromIdx = parseInt(e.target.dataset.index);
    e.dataTransfer.setData("text", fromIdx); //store index of the video being dragged
}

function dragOver(e) {
    e.preventDefault(); // needed to allow drop
}

function dragDrop(e) {
    e.preventDefault(); // needed to allow drop
    const toIdx = parseInt(e.target.dataset.index);

    const tmp = playlist[fromIdx];
    playlist[fromIdx] = playlist[toIdx];
    playlist[toIdx] = tmp;
    upsertPlaylist();

    playVideo(currentVideo); // play the video at the new index

    e.dataTransfer.clearData();
}



// ----------------- Drawing functions -----------------


function drawFrame() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const selectedEffect = document.getElementById("effectSelect").value;
    applyEffect(selectedEffect);
    drawControls(); 
    requestAnimationFrame(drawFrame);
}

function drawControls() {
    const ctrlY = canvas.height-50; // move buttons down
    const pbY = ctrlY -20; // put progress bar above buttons
    
    drawProgressbar(ctx, canvas.width, pbY);
    drawPlayPauseButton(ctx, ctrlY);
    drawPrevNextButton(ctx, ctrlY);
    drawVolume(ctx, canvas.width, ctrlY);
}



function drawPlayPauseButton(ctx, ctrlY) {
    const buttonX = 20;
    const buttonSize = 40;

    ctx.fillStyle = "white";
    ctx.fillRect(buttonX, ctrlY, buttonSize, buttonSize);

    ctx.fillStyle = "black";
    if (videoPlayer.paused) {
        ctx.beginPath();
        ctx.moveTo(buttonX + 10, ctrlY + 10);
        ctx.lineTo(buttonX + 10, ctrlY + 30);
        ctx.lineTo(buttonX + 30, ctrlY + 20);
        ctx.fill();
    } else {
        ctx.fillRect(buttonX + 10, ctrlY + 10, 10, 20);
        ctx.fillRect(buttonX + 25, ctrlY + 10, 10, 20);
    }
}

function drawPrevNextButton(ctx, ctrlY) {
    const buttonSize = 40;

    //this is prevBtn
    ctx.fillStyle = "white";
    ctx.fillRect(70, ctrlY, buttonSize, buttonSize);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(100,ctrlY + 10);
    ctx.lineTo(80,ctrlY + 20);
    ctx.lineTo(100, ctrlY + 30);
    ctx.fill();

    //this is nextBtn
    ctx.fillStyle = "white";
    ctx.fillRect(120, ctrlY, buttonSize, buttonSize);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(130,ctrlY + 10);
    ctx.lineTo(150, ctrlY + 20);
    ctx.lineTo(130, ctrlY + 30);
    ctx.fill();
}

function drawVolume(ctx, width, ctrlY) {
    const volumeX = width - 60;
    const buttonSize = 40;

    ctx.fillStyle = "white";
    ctx.fillRect(volumeX, ctrlY, 40, buttonSize);

    const volumeLevel = videoPlayer.volume;
    ctx.fillStyle = "black";

    const volumeHeight = volumeLevel * buttonSize;
    ctx.fillRect(volumeX + 10, ctrlY +(buttonSize-volumeHeight),20, volumeHeight);
}

function drawProgressbar(ctx, width, pbY) {
    const pbH =10;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, pbY-pbH, width, pbH);

    const progress = videoPlayer.currentTime /videoPlayer.duration || 0;
    ctx.fillStyle = "white";
    ctx.fillRect(0, pbY -pbH, width*progress, pbH);
}


// ----------------- EFFECTS REQUIREMENT  -----------------


function applyEffect(effect) {
        switch (effect) {
            case "pixelate":
                pixelEffect();
                break;
            case "colorShift":
                colorShiftEffect();
                break;
            case "wave":
                waveEffect();
                break;
            default:
                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
        }
    }    




function pixelEffect() {
    const pixelSize = 10;

    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y += pixelSize) {
        for (let x = 0; x < canvas.width; x += pixelSize) {
            const index = (y * canvas.width + x) * 4;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];

            for (let dy = 0; dy < pixelSize; dy++) {
                for (let dx = 0; dx < pixelSize; dx++) {
                    const offset = ((y + dy) * canvas.width + (x + dx)) * 4;
                    data[offset] = red;
                    data[offset + 1] = green;
                    data[offset + 2] = blue;
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function waveEffect() {
    const amp = 20; 
    const freq = 0.05; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        const offset = Math.sin(y * freq) * amp;
        ctx.drawImage(
            videoPlayer,
            0,
            y,
            canvas.width,
            1,
            offset,
            y,
            canvas.width,
            1
        );
    }
}


function colorShiftEffect() {
    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] += 50; // R
        data[i + 1] += 50; // G
        data[i + 2] += 50; // B
    }

    ctx.putImageData(imageData, 0, 0);
}
