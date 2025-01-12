const playlistDef = [
    {
        name:"Austria",
        src:"./media/video1.mp4"
    },
    {
        name:"USA",
        src:"./media/video2.mp4"
    },
    {
        name:"Ocean",
        src:"./media/video3.mp4"
    },
    {
        name:"San Francisco",
        src:"./media/video4.mp4"
    },
    {
        name:"Mountains",
        src:"./media/video5.mp4"
    },
    {
        name:"audiotest",
        src:"./media/video6.mp4"
    },
];



// ----------------- VARIABLES -----------------

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d",{willReadFrequently: true});  // set the context to read frequently
const preview = document.getElementById('previewCanvas');
const ptx = preview.getContext('2d',{willReadFrequently: true}); // we do this because "Multiple readback operations using getImageData are faster"


const playlist = document.getElementById("playlist");
let playlistVid = [];
let currentVideo = 0;

const videoPlayer = document.getElementById("videoPlayer");
const previewVideo = document.getElementById('previewVideo');

// ----------------- EVENT       LISTENERS -----------------

document.addEventListener("DOMContentLoaded", () =>
{
    playlistVid = JSON.parse(localStorage.getItem('videoPlaylist')) || [];
    if (playlistVid.length === 0) {
        playlistVid = playlistDef; // GET DEFAULT if empty
        localStorage.setItem('videoPlaylist', JSON.stringify(playlistVid));
    }

    videoPlayer.volume = parseFloat(localStorage.getItem("volume")) || 0;
    videoPlayer.currentTime = parseFloat(localStorage.getItem("currentTime")) || 0;

    currentVideo = parseInt(localStorage.getItem("currentVideo")) || 0;
    if (isNaN(currentVideo) || currentVideo < 0 || currentVideo >= playlistVid.length) {
        currentVideo = 0;
    }
    upsertPlaylist();

    if (playlistVid.length > 0) {
        playVideo(currentVideo);
        videoPlayer.pause();  // pause on reload or first load
    } else {
        videoPlayer.src = ''; 
    }
});

window.addEventListener("beforeunload", () => {
    localStorage.setItem("currentTime",videoPlayer.currentTime)
});

videoPlayer.addEventListener("loadedmetadata", () => { // on video load
    canvas.width = videoPlayer.videoWidth;
    canvas.height = videoPlayer.videoHeight

    preview.width = 200;  
    preview.height = 100; 
});


videoPlayer.addEventListener("play", drawFrame(ctx,videoPlayer));


videoPlayer.addEventListener("ended", () => {
    currentVideo = (currentVideo +1) % playlistVid.length;  // revert to first if last
    playVideo(currentVideo);
});


canvas.addEventListener("dblclick", () => {
    if (!document.fullscreenElement){
        canvas.requestFullscreen()
} else {
        document.exitFullscreen();
    }
});


canvas.addEventListener("mousemove", (e) => {
    previewVideo.src = videoPlayer.src;
    const canvasDim = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasDim.width;
    const scaleY = canvas.height / canvasDim.height;

    const mouseX = (e.clientX - canvasDim.left) * scaleX;
    const mouseY = (e.clientY -canvasDim.top) * scaleY; // get y mouse coord

    const ctrlY = canvas.height - 50;
    const pbY = ctrlY - 20;

    if (( mouseY>= pbY - 8) && (mouseY <= pbY + 3) && (mouseX <= canvas.width)) {  
        preview.style.display = 'block'; 

        
        const previewX = canvasDim.left; // place left 
        const previewY = canvasDim.top;  // top 
       
       preview.style.left = `${previewX}px`; 
       preview.style.top = `${previewY}px`;


        const newTime = (mouseX/canvas.width) * videoPlayer.duration;
        previewVideo.currentTime = newTime;
        drawFrame(ptx,previewVideo);
        }  else {
        preview.style.display = 'none'; // if it is not over the progress bar, hide the preview
    } 
});


// seeked fires after seeking event ie after the user has moved the cursor to the new positio
previewVideo.addEventListener('seeked', () => {
        ptx.clearRect(0,0, preview.width, preview.height);
        ptx.drawImage(previewVideo, 0,0, preview.width,preview.height); 
});


// on mouse leave clear the preview just in case
canvas.addEventListener("mouseleave", () => {
    preview.style.display = 'none'; // just in case on mouseleave hide the preview again
    ptx.clearRect(0, 0, preview.width, preview.height);
}); 


canvas.addEventListener("click", (e) => {

    const canvasDim = canvas.getBoundingClientRect(); // canvas size

    //canvas "scale" -ratio of canvas size to actual video size
    const scaleX = canvas.width/ canvasDim.width;     
    const scaleY = canvas.height / canvasDim.height; 
    //mouse coordinates relative to canvas
    const mouseX = (e.clientX-canvasDim.left)* scaleX;  
    const mouseY = (e.clientY -canvasDim.top) * scaleY;    

    const ctrlY = canvas.height - 50; // get approximate control Y coord of buttons and volum
    const pbY = ctrlY - 20; // get progress bar Y coord
    const btnSize = 40; 

    //progress bar
    if (( mouseY>= pbY - 8) && (mouseY <= pbY + 3) && (mouseX <= canvas.width)) {  
        const newTime = (mouseX/canvas.width) * videoPlayer.duration; //calculate the new time by canvas size and mouse position relative to video player
        videoPlayer.currentTime = newTime;
    }

    // play pause button
    if ((mouseX >= 20) && (mouseX <= 20 + btnSize) &&(mouseY >= ctrlY && mouseY <= ctrlY+btnSize)) { //check for play/pause
        if (videoPlayer.paused) {
            videoPlayer.play();
        } else {
            videoPlayer.pause(); }
    }
    //prev button
    if ((mouseX >= 70)&& (mouseX <= 70 +btnSize) && (mouseY>= ctrlY) && (mouseY <=ctrlY+btnSize)) {
        currentVideo =(currentVideo - 1+ playlistVid.length) % playlistVid.length; // go to last if first -> shorter than ifelse
        playVideo(currentVideo);
    }

    //next button
    if ((mouseX >= 120 && mouseX <= 120 + btnSize) &&  (mouseY>=ctrlY) && (mouseY <= ctrlY+btnSize)) {
        playVideo((currentVideo + 1) % playlistVid.length);
    }

     //mute btn 
     if ((mouseX >= canvas.width - 135) && (mouseX <= canvas.width - 70) && (mouseY >= ctrlY) && (mouseY <=ctrlY+btnSize)) {
     videoPlayer.muted = !videoPlayer.muted;
    }
    //volume control
    if ((mouseX >= canvas.width -60) && (mouseX <= canvas.width - 20) && (mouseY >= ctrlY) && (mouseY<= ctrlY+btnSize)) {
        const volume =(ctrlY+btnSize-mouseY) / btnSize; // set volume
        videoPlayer.muted = false;
        videoPlayer.volume = volume
        localStorage.setItem("volume", videoPlayer.volume);
    }
});


dropZone.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    saveEncoding(e.target.files); // after the click the files should also be saved
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault(); // so the drop event can be triggered
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    saveEncoding(e.dataTransfer.files); 
});



function saveEncoding(files) {
    for (let file of files) {
        const reader = new FileReader(); // if i just use the URL.createOBJECTURL it does not persist across sessions.
        reader.onload = function(e) { //hen the file is loaded 
            playlistVid.push({
                name: file.name,
                src: e.target.result  //set the src to the video's encoding using a Base64 string 
            });
             upsertPlaylist();
    };
        reader.readAsDataURL(file); // read the file as a Base64 string
    }
}



// ----------------- Video/playlistVid functions -----------------



function upsertPlaylist(){
    playlist.innerHTML = "";
    playlistVid.forEach((video, index) => {
        const newVideo = addVideo(video, index);
        playlist.appendChild(newVideo);
    });
    localStorage.setItem('videoPlaylist', JSON.stringify(playlistVid));
}

function addVideo(vid,index) {
    const newVideo = document.createElement("div");
    newVideo.className ="videoElem";
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

function playVideo(index){
    currentVideo = index;
    localStorage.setItem("currentVideo",currentVideo);
    videoPlayer.src = playlistVid[currentVideo].src;
    videoPlayer.play();
    isPlaying = true;
}


function removeVideo(index) {
      playlistVid.splice(index, 1);
      if (playlistVid.length === 0) {
          videoPlayer.src = '';
          currentVideo = 0;
      } else {
          if (index <= currentVideo) {
              currentVideo = Math.max(0, currentVideo - 1);
              playVideo(currentVideo);
          }
      }
        localStorage.setItem("currentVideo", currentVideo);
      localStorage.setItem('videoPlaylist', JSON.stringify(playlistVid));
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

    const tmp = playlistVid[fromIdx];
    playlistVid[fromIdx] = playlistVid[toIdx];
    playlistVid[toIdx] = tmp;
    upsertPlaylist();

    playVideo(currentVideo); // play the video at the new index

    e.dataTransfer.clearData();
}



// ----------------- Drawing functions -----------------


function drawFrame(context,videosrc) {
    const selectedEffect = document.getElementById("effectSelect").value || "none";
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    applyEffect(selectedEffect,context,videosrc);
    drawControls(); 
    requestAnimationFrame(() => drawFrame(context,videosrc));
}

function drawControls() {
    const ctrlY = canvas.height-50; //y coordinates for prev next volume mute - should be in line
    const pbY = ctrlY -20; // progress bar y (it should be above the buttons)
    
    drawProgressbar(ctx, canvas.width, pbY);
    drawPlayPauseButton(ctx, ctrlY);
    drawPrevNextButton(ctx, ctrlY);
    drawVolume(ctx, canvas.width, ctrlY);
    drawMuteButton(ctx,canvas.width,ctrlY);
}

function drawMuteButton(ctx, width, ctrlY) {
    const muteX = width - 130;
    const btnSize = 60;

    ctx.fillStyle = "white";
    ctx.fillRect(muteX, ctrlY, btnSize, btnSize- 20);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(muteX,ctrlY, btnSize, btnSize-20);
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = videoPlayer.muted ? "Unmute" : "Mute"; 
    ctx.fillText(text, muteX+30, ctrlY+20);
    
}

function drawPlayPauseButton(ctx, ctrlY) {
    const btnX = 20;
    const btnSize = 40;

    ctx.fillStyle = "white";
    ctx.fillRect(btnX, ctrlY, btnSize, btnSize);
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = videoPlayer.paused ? "Start" : "Stop"; 
    ctx.fillText(text, btnX+20, ctrlY + 20);
}

function drawPrevNextButton(ctx, ctrlY) {
    const btnSize = 40;

    //this is prevBtn
    ctx.fillStyle = "white";
    ctx.fillRect(70, ctrlY, btnSize, btnSize);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(100,ctrlY +10);
    ctx.lineTo(80,ctrlY+ 20);
    ctx.lineTo(100, ctrlY + 30);
    ctx.fill();

    //this is nextBtn
    ctx.fillStyle = "white";
    ctx.fillRect(120, ctrlY, btnSize, btnSize);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(130,ctrlY + 10);
    ctx.lineTo(150, ctrlY + 20);
    ctx.lineTo(130, ctrlY + 30);
    ctx.fill();
}

function drawVolume(ctx, width, ctrlY) {
    const volumeX = width - 45;
    const btnSize = 40;

    ctx.fillStyle = "white";
    ctx.fillRect(volumeX, ctrlY, 40, btnSize);

    const volumeLevel = videoPlayer.volume;
    ctx.fillStyle = "black";

    const volumeHeight = volumeLevel * btnSize;
    ctx.fillRect(volumeX + 10, ctrlY +(btnSize-volumeHeight),20, volumeHeight);
}

function drawProgressbar(ctx, width, pbY) {
    const pbH =10;

    ctx.fillStyle = "rgba(0,0,0,0.5)"; //transparent 
    ctx.fillRect(0, pbY-pbH, width, pbH);

    const progress = videoPlayer.currentTime/ videoPlayer.duration ||0; // get percentage of video for drawing
    ctx.fillStyle = "white";
    ctx.fillRect(0, pbY -pbH, width*progress, pbH);
}


// ----------------- EFFECTS REQUIREMENT  -----------------


function applyEffect(effect,context,videosrc){
    if (effect === "pixelate") {
        pixelEffect(context);
    } else if (effect === "colorShift") {
        invertEffect(context);
    } else if (effect === "hue") {
        hueEffect(context);
    } else {
        context.drawImage(videosrc, 0, 0, context.canvas.width, context.canvas.height); // no effect
    }
}
  


function pixelEffect(context){
    const pixelSize = 5; // Size of each "pixel"

    const scaledWidth = context.canvas.width / pixelSize;
    const scaledHeight = context.canvas.height / pixelSize;

    context.drawImage(videoPlayer, 0, 0, scaledWidth, scaledHeight);
    context.imageSmoothingEnabled = false; 
    context.drawImage(canvas, 0, 0, scaledWidth, scaledHeight, 0, 0, context.canvas.width, context.canvas.height);
}

function hueEffect(context) {
    context.drawImage(videoPlayer, 0, 0, context.canvas.width, context.canvas.height);
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Rotate RGB values
        const r = data[i];
        data[i] = data[i + 1];     // R becomes G
        data[i + 1] = data[i + 2]; // G becomes B
        data[i + 2] = r;           // B becomes R
}
    context.putImageData(imageData, 0, 0);
}


function invertEffect(context) {
    context.drawImage(videoPlayer, 0, 0, context.canvas.width, context.canvas.height);
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];         // Invert R
        data[i + 1] = 255 - data[i + 1]; // Invert G
        data[i + 2] = 255 - data[i + 2]; // Invert B
    }
    context.putImageData(imageData, 0, 0);
}
