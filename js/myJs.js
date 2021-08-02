// PMSM/HD 20200805

const  markerMaxReturned = 1; // maximum number of markers allowed in the result array
const  markerMinSideSize = 14; // minimum size of marker side allowed (default 10)
const  maxAllowedPercentDiffBetweenSides = 40;
const  warpSize = 49; // increase to get more accuracy (default 49)
const  epsilon = 0.05; // (default 0.05)
const  markerValidForMs = 3000; // visibility after valid detection.
const  markerAcceptedAfterConsecutiveReadings = 2;
const  minAngleChangeToRotateArrow = 5; // minimun angle change to correct arrow angle
const  imageProcessingRateToCanvasMs = 250; // image processing rate in milliseconds

var canvas = document.getElementById('canvasId');
var ctx    = canvas.getContext('2d');
var video  = document.getElementById('videoId');
var buttonCamera = document.getElementById('buttonCameraId');
var messageMarkerNumber = document.getElementById('messageMarkerNumber');
messageMarkerNumber.innerHTML = "";

var divContainer = document.getElementById('divContainerId');
var divLandscapeMessage = document.getElementById('divLandscapeMessageId');
divLandscapeMessage.style.display  = "none";

var imageArrow = document.getElementById("imageArrowId");
imageArrow.src = "images/arrow.png";
imageArrow.style.display  = "none";

var imageArrowWidth = imageArrow.width;
var imageArrowHeight = imageArrow.height;

setTimeout(function () {
  imageArrowWidth = imageArrow.width;
  imageArrowHeight = imageArrow.height;
}, 500);



function resize_canvas(element)
{
  var w = element.offsetWidth;
  var h = element.offsetHeight;
  var cv = document.getElementById("canvasId");
  cv.width = w;
  cv.height =h;
}


// button camera on click
document.querySelector("#buttonCameraId").addEventListener('click', e => buttonCameraClick(e));

var videoStream ;
var detector = null;
async function buttonCameraClick(e) {

  if (e.target.innerText != "Stop") {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      detector = null;
      handleSuccess(videoStream);
      buttonCamera.style.background='red';
      e.target.innerText = "Stop";  
    } catch (error) {
      alert("No available devices detected!");
    }
  }
  else {
    //stopBothVideoAndAudio(videoStream);
    stopStreamedVideo(video); // stop video
    
     // clear canvas (delayed)  
    setTimeout(function () {
      var ctx    = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, imageProcessingRateToCanvasMs + 10);
  
    
    buttonCamera.style.background='green';
    e.target.innerText = "Start camera";
    // hide arrow
    if (imageArrow.style.display  != "none") {
      imageArrow.style.display  = "none";
      messageMarkerNumber.innerHTML = "";
    }
    //drawDefaultMessageOncanvas();
  }

  setAllObjectsPositionOnCanvas();
 
}


window.addEventListener('load', (event) => {
  setAllObjectsPositionOnCanvas();
  setTimeout(function () {setAllObjectsPositionOnCanvas()} , 100); // execute after x ms
  //drawDefaultMessageOncanvas();
});


/*function drawDefaultMessageOncanvas() {
  setTimeout(function () {
    var ctx    = canvas.getContext('2d');
    //drawTextOnCanvasCenteredOn(ctx, "This text was drawn on canvas", canvas.width / 2, canvas.height / 2, "CourierNew", "bold", 14, "maroon");
    drawTextOnCanvasCenteredOn(ctx, "Start to read SR markers", canvas.width / 2, canvas.height / 2, "CourierNew", "bold", 14, "maroon");    
  }, 1000);
  
}*/



// detect orientation change (in conjunction with resize event)
var lastOrientation = getOrientation();
orientationChanged();
function getOrientation() {
  if (window.matchMedia("(orientation: portrait)").matches) {
    return "portrait";
  }
  if (window.matchMedia("(orientation: landscape)").matches) {
    return "landscape";
  }
  return "";
}



function orientationChanged() {
  //alert("Orientation now is: " + lastOrientation);
  if (lastOrientation == "landscape") {
    markerLastKnown = {marker: null, detectionTime: null, consecutiveReadings: 0};
    markerLastAccepted = {marker: null, detectionTime: null};
    imageArrow.style.display  = "none";
    messageMarkerNumber.innerHTML = "";

    // process other after (to preserve imageArrow)
    //setTimeout(function () {
      divContainer.style.display  = "none";
      divLandscapeMessage.style.display  = "block";
    //}, imageProcessingRateToCanvasMs + 10);

  }
  else {
    divLandscapeMessage.style.display  = "none";
    divContainer.style.display  = "inline";
  }
}



window.addEventListener('resize', function(event){
  
  var orientation = getOrientation();
  if (lastOrientation != orientation) {
    lastOrientation = orientation; 
    orientationChanged();
  }

  setAllObjectsPositionOnCanvas();
  //setTimeout(function () {setAllObjectsPositionOnCanvas()}, 50);
});



window.addEventListener("scroll", function(event){
  setAllObjectsPositionOnCanvas();
});



function setAllObjectsPositionOnCanvas() {

  centerDomObjectOnContainer(buttonCamera, video, 50, 90);

  centerDomObjectOnContainer(messageMarkerNumber, video, 50, 2);

  if (imageArrow.style.display  != "none") {
    centerDomObjectOnContainer(imageArrow, video, 50, 50, 50);
  }

}



// center using absolute position. If contaiver is a canvas, the DOM object to center on should have a z-index higher (to be usable)
// object must be repositioned on window resize and scroll (see resize and scroll events above)
function centerDomObjectOnContainer(domObjectToCenter, container, leftDistPercent, topDistPercent, adjustSizeToContainerPercentage) {
  var containerRect = container.getBoundingClientRect();
  var objectRect = domObjectToCenter.getBoundingClientRect();
  //alert(JSON.stringify(objectRect));
  if (leftDistPercent == null) leftDistPercent = 0;
  if (topDistPercent == null) topDistPercent = 0;
  var cwidth = containerRect.right - containerRect.left;
  var cheight = containerRect.bottom - containerRect.top;
  // adjust size to container (if adjustSizeToContainerPercentage defined)
  if (adjustSizeToContainerPercentage != null && adjustSizeToContainerPercentage != 0) {
    var wscale = cwidth / objectRect.width;
    var hscale = cheight / objectRect.height;
    var globalScale = adjustSizeToContainerPercentage / 100;
    //alert("Global scale: " + globalScale);
    var newWidth = objectRect.width * wscale *  globalScale;
    var newHeight = objectRect.height * hscale *  globalScale;
    if (newWidth < 1) newWidth = 1;
    if (newHeight < 1) newHeight = 1;
    domObjectToCenter.width = newWidth;
    domObjectToCenter.height = newHeight;
    objectRect = domObjectToCenter.getBoundingClientRect();
  }
  domObjectToCenter.style.position = "fixed";
  domObjectToCenter.style.zindex = "2"; // ignored
  
  // center
  var cLeft = containerRect.left + (cwidth * (leftDistPercent/100)) - (objectRect.width / 2);
  var cTop = containerRect.top + (cheight * (topDistPercent/100)) - (objectRect.height / 2);

  if (cLeft != null && cTop != null) {
    //alert("cLeft: " + cLeft + "\ncTop: " + cTop + "\containerRect.left: " + containerRect.top + "\ncontainerRect.left: " + containerRect.top);

    // check limits
    if (cLeft < containerRect.left) cLeft = containerRect.left;
    if (cTop < containerRect.top) cTop = containerRect.top;
    if ((cLeft + objectRect.width) > containerRect.right) cLeft = cLeft - ((cLeft + objectRect.width) - containerRect.right);
    if ((cTop + objectRect.height) > containerRect.bottom) cTop = cTop - ((cTop + objectRect.height) - containerRect.bottom);
  
    domObjectToCenter.style.left = cLeft + "px";
    domObjectToCenter.style.top = cTop + "px";
  }
}



function drawTextOnCanvasCenteredOn(ctx, text, left, top, font, fontStyle, fontSize, fontColor) {
  ctx.font = fontStyle + ' ' + fontSize + 'px ' +  font;
  ctx.fillStyle = fontColor;
  var newLeft = left - (ctx.measureText(text).width / 2);
  var newTop = top - (fontSize / 2);
  ctx.fillText(text, newLeft, newTop); 
}



function drawRectangle(context2D, x, y, width, height, color, lineWidth) {
  // draw rectangle
  context2D.lineWidth = "" + lineWidth;
  context2D.strokeStyle = color;
  context2D.strokeRect(x, y, width, height);
}


// my canvas / video code

// set canvas size = video size when known
video.addEventListener('loadedmetadata', function() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});



// video start playing
video.addEventListener('play', function () {
  
  setAllObjectsPositionOnCanvas();
  
    var $this = this; //cache
    (function loop() {
        if (!$this.paused && !$this.ended) {
            // continue processing (if not in landscape mode)
            if (lastOrientation != "landscape") {
              // copy camera image to canvas
              //if ($this != null && $tfis.length > 0) alert(JSON.stringify($this));
              ctx.drawImage($this, 0, 0);
              // check for markers
              setTimeout(function () {
                findMarkers(ctx.getImageData(0, 0, canvas.width, canvas.height));
              }, 1);              
            }        
            // continue loop
            setTimeout(loop, imageProcessingRateToCanvasMs); // set loop rate
        }
    })();
}, 0);




// find markers
var markerLastKnown = {marker: null, detectionTime: null, consecutiveReadings: 0};
var markerLastAccepted = {marker: null, detectionTime: null};
var angleBeforeChange = 0.0;

function findMarkers(imageData) {
  var newMarkerFound = false;

  if (detector == null) {
    detector = new SR.Detector();
  }
  var markers = detector.detect(imageData, markerMaxReturned, markerMinSideSize, maxAllowedPercentDiffBetweenSides, epsilon, warpSize); 
  
  if (markers.length > 0) {
    
    if (markerLastKnown.marker != null && markers[0].id == markerLastKnown.marker.id) {
      markerLastKnown.consecutiveReadings++;  
    }
    else {
      markerLastKnown.consecutiveReadings = 1;
    }

    markerLastKnown.marker =  markers[0];
    markerLastKnown.detectionTime = new Date(); 

    if (markerLastKnown.consecutiveReadings >= markerAcceptedAfterConsecutiveReadings) {
      if (markerLastKnown.consecutiveReadings == markerAcceptedAfterConsecutiveReadings) {

        newMarkerFound = true; 
        angleBeforeChange =  markerLastKnown.marker.angle;

      }   

      markerLastAccepted.marker = markerLastKnown.marker;
      markerLastAccepted.detectionTime = markerLastKnown.detectionTime;
    }
    else {
      markerLastAccepted.marker = null;
      markerLastAccepted.detectionTime = null;
    }

    //alert(JSON.stringify(markers));

  }
  else {
    var now = new Date();
    //if (!(markerLastAccepted.detectionTime != null && (now - markerLastAccepted.detectionTime) <= markerValidForMs)) {
    if ((markerLastAccepted.detectionTime != null && (now - markerLastAccepted.detectionTime) > markerValidForMs)) {
      markerLastKnown.consecutiveReadings = 0;
      markerLastAccepted.marker =  null;
      markerLastAccepted.detectionTime = null; 
    }
  }

  if (markerLastAccepted.detectionTime != null) {
    markers = [];
    markers.push(markerLastAccepted.marker);
  }
  
  // draw last accepted marker position
  if (markerLastAccepted.marker != null) {
    var s = "";
    if (markerLastAccepted.marker.borderWhite) { s = "(I) ";}
    //drawTextOnCanvasCenteredOn(ctx, s + markerLastAccepted.marker.id + " (" + markerLastAccepted.marker.angle + ")", canvas.width / 2, 25, "arial", '', 14, "red");
    //drawTextOnCanvasCenteredOn(ctx, s + markerLastAccepted.marker.id, canvas.width / 2, 40, "arial", '', 24, "red");
    messageMarkerNumber.innerHTML = markerLastAccepted.marker.id;
    //drawCorners(ctx, markers);
    //drawId(ctx, markers);
    
    // change arrow angle (if needed)
    if (Math.abs(markerLastAccepted.marker.angle - angleBeforeChange) > minAngleChangeToRotateArrow) {
      imageArrow.style.transform = "rotate(" + markerLastAccepted.marker.angle + "deg)";

      angleBeforeChange = markerLastAccepted.marker.angle;

      setAllObjectsPositionOnCanvas();

    }

  }
  else {
    // hide arrow image
    imageArrow.style.display  = "none";
    messageMarkerNumber.innerHTML = "";
  }


  // new marker found
  if (newMarkerFound) {
    newMarkerFound = false;  
    newMarkerDetected(markerLastKnown.marker);
  }

  /*setTimeout(function () {
    alert(JSON.stringify(markers));
  }, 10);*/
 
}







// executed when a new marker is detected
function newMarkerDetected(marker) {

  // show arrow
  if (imageArrow.style.display  == "none") {
    imageArrow.width = imageArrowWidth;
    imageArrow.height = imageArrowHeight;
    imageArrow.style.display  = "inline";
    imageArrow.style.transformOrigin = "center center";
    imageArrow.style.webkitTransformOrigin = "center center";
    //transform-origin:center center; -ms-transform-origin:center center; -webkit-transform-origin: center center; 
    // -moz-transform-origin:center center;  -o-transform-origin:center center;

    // rotate arrow image
    imageArrow.style.transform = "rotate(" + marker.angle + "deg)";

    // align to canvas
    setAllObjectsPositionOnCanvas();
    //setTimeout(function () {setAllObjectsPositionOnCanvas()} , 200); 

    // play sound
    playSound("click");

  } 

}



// see sounds to play in index.html (ex.: <audio id="click" src="sounds/click.mp3"></audio>)
function playSound(soundToPlay) {
    document.getElementById(soundToPlay).play();
}


function drawCorners(context, markers){
  var corners, corner, i, j;

  context.lineWidth = "" + 3;

  for (i = 0; i !== markers.length; ++ i){
    corners = markers[i].corners;
    
    context.strokeStyle = "blue";
    context.beginPath();
    
    for (j = 0; j !== corners.length; ++ j){
      corner = corners[j];
      context.moveTo(corner.x, corner.y);
      corner = corners[(j + 1) % corners.length];
      context.lineTo(corner.x, corner.y);
    }

    context.stroke();
    context.closePath();
    
    context.strokeStyle = "green";
    context.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
    
  }
}


function drawId(context, markers){
  var corners, corner, x, y, i, j;
  
  context.strokeStyle = "red";
  context.lineWidth = 1;
  
  for (i = 0; i !== markers.length; ++ i){
    corners = markers[i].corners;
    
    x = Infinity;
    y = Infinity;
    
    for (j = 0; j !== corners.length; ++ j){
      corner = corners[j];
      
      x = Math.min(x, corner.x);
      y = Math.min(y, corner.y);
    }

    context.strokeText(markers[i].id, x, y)
  }
}


// imported video code (adapted by me to work on safari, etc,)
/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
//'use strict';

// Put variables in global scope to make them available to the browser console.
const constraints = window.constraints = {
  audio: false,
  //video: {width: 640, height: 480},
  //video:{facingMode:{exact:"environment"}}
  video:{facingMode:"environment"}
  //video:{facingMode:"user"}
};

function handleSuccess(stream) {
  const video = document.querySelector('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  window.stream = stream; // make variable available to browser console
  video.srcObject = stream;
  video.onloadedmetadata = function (e) {
    video.play();
  };

}

function handleError(error) {
  if (error.name === 'ConstraintNotSatisfiedError') {
    const v = constraints.video;
    errorMsg('The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.');
  } else if (error.name === 'PermissionDeniedError') {
    errorMsg('Permissions have not been granted to use your camera and ' +
      'microphone, you need to allow the page access to your devices in ' +
      'order for the demo to work.');
  }
  errorMsg('getUserMedia error: ${error.name}', error);
}

function errorMsg(msg, error) {
  const errorElement = document.querySelector('#errorMsg');
  errorElement.innerHTML += '<p>${msg}</p>';
  if (typeof error !== 'undefined') {
    console.error(error);
  }
}

/* Not working well on edge chromium
// stop both mic and camera
function stopBothVideoAndAudio(stream) {
  stream.getTracks().forEach(function(track) {
    //track.stop();  
    if (track.readyState == 'live') {
          track.stop();
      }
  });
}*/


function stopStreamedVideo(videoElem) {
  const stream = videoElem.srcObject;
  const tracks = stream.getTracks();
  tracks.forEach(function(track) {
    track.stop();
  });
  videoElem.srcObject = null;
}

// stop only camera
function stopVideoOnly(stream) {
  stream.getTracks().forEach(function(track) {
      if (track.readyState == 'live' && track.kind === 'video') {
          track.stop();
      }
  });
}

// stop only mic
function stopAudioOnly(stream) {
  stream.getTracks().forEach(function(track) {
      if (track.readyState == 'live' && track.kind === 'audio') {
          track.stop();
      }
  });
}



function markerHtmlTableCreation(containerId, markerData) {
  const cellSideSize = 50;
  var container = document.getElementById(containerId);
  container.innerHTML = "";
  
  var label = document.createElement('label');

  if (markerData.success) {
    var table = document.createElement('table');
    table.cellspacing = 0;
    table.cellpadding = 0;
    table.style.border = '4px solid black';
    table.style.borderCollapse = "collapse";
    for (var row = 0; row < markerData.markerArray.length; row++) {
      var tableRow = table.insertRow();
      tableRow.height = cellSideSize;
      tableRow.style.border = "none";
      for (var col = 0; col < markerData.markerArray[0].length; col++) {
        var tableCell = tableRow.insertCell();
        tableCell.width = cellSideSize;
        tableCell.height = cellSideSize;
        tableCell.style.border = "none";
        var bkColor = markerData.markerArray[row][col] == "0" ? "white" : "black";
        tableCell.style.backgroundColor = bkColor;
      }
    }
    label.innerText = markerData.markerNumber + " " + (markerData.whiteBorder ? "White" : "Black");
    label.appendChild(table);
  }
  else {
    label.innerText = "Invalid marker data (" + markerData.markerNumber + ")";
  }
  
  container.appendChild(label);
  container.appendChild(document.createElement('br'));
}

