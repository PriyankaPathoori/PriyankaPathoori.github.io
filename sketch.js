let myVideo = null;
let video;
let watchVideo = false;
let webcamCanvas;
let videoRenderCanvas;
let videoRenderCanvasCtx;
let bodyPixCanvas;
let bodyPixCanvasCtx;
var previousSegmentationComplete = true;


 // An object to configure parameters to set for the bodypix model.
 // See github docs for explanations.
 const bodyPixProperties = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 4
  };

  // An object to configure parameters for detection. I have raised
  // the segmentation threshold to 90% confidence to reduce the
  // number of false positives.
  const segmentationProperties = {
    flipHorizontal: false,
    internalResolution: 'high',
    segmentationThreshold: 0.9,
    scoreThreshold: 0.2
  };

  // Let's load the model with our parameters defined above.
 // Before we can use bodypix class we must wait for it to finish
 // loading. Machine Learning models can be large and take a moment to
 // get everything needed to run.
 var modelHasLoaded = false;
 var model = undefined;

 model = bodyPix.load(bodyPixProperties).then(function (loadedModel) {
   model = loadedModel;
   modelHasLoaded = true;
   if (!previousSegmentationComplete) {
       previousSegmentationComplete = true;
       predictWebcam();
   }
 });

function setup() {
    // createCanvas(windowWidth, windowHeight);

    button = createButton('start', [50]);
    button.position(19, 19);
    button.mousePressed(changeBG);

    button1 = createButton('watch', [50]);
    button1.position(89, 19);
    button1.mousePressed(changeBG1);

    let constraints = {audio: false, video: {facingMode: 'environment'}};
    myVideo = createCapture(constraints,
        function(stream) {
            let p5lm = new p5LiveMedia(this, "CAPTURE", stream, "jZQ64AMJc")
            p5lm.on('stream', gotStream);
        }
    );

    myVideo.elt.muted = true;

    video = document.querySelector('video');
    video.addEventListener('loadedmetadata', function() {
        // Update widths and heights once video is successfully played otherwise
        // it will have width and height of zero initially causing classification
        // to fail.



// We will create a tempory canvas to render to store frames from
// the web cam stream for classification.
        videoRenderCanvas = document.createElement('canvas');
        videoRenderCanvasCtx = videoRenderCanvas.getContext('2d');

// Lets create a canvas to render our findings to the DOM.
        webcamCanvas = document.createElement('canvas');
        webcamCanvas.setAttribute('class', 'overlay');
        webcamCanvas.setAttribute('id', 'findings');
        document.querySelector('main').appendChild(webcamCanvas);


// Create a canvas to render ML findings from to manipulate.
        bodyPixCanvas = document.createElement('canvas');
        bodyPixCanvas.setAttribute('class', 'overlay');
        bodyPixCanvas.setAttribute('id', 'manipulated');
        bodyPixCanvasCtx = bodyPixCanvas.getContext('2d');
        bodyPixCanvasCtx.fillStyle = '#FF0000';


        document.querySelector('main').appendChild(bodyPixCanvas);

        webcamCanvas.width = 500;
        webcamCanvas.height = 500;
        videoRenderCanvas.width = 500;
        videoRenderCanvas.height = 500;
        bodyPixCanvas.width = 500;
        bodyPixCanvas.height = 500;
//         // let webcamCanvasCtx = webcamCanvas.getContext('2d');
//         // webcamCanvasCtx.drawImage(video, 0, 0);
    });
//
//     // video.srcObject = stream;
//
    video.addEventListener('loadeddata', predictWebcam);
}
let startVideo = false;
function changeBG() {
    startVideo = true;
}

function changeBG1() {
    watchVideo = true;
    enableCam();
}


let otherVideo;
function gotStream(stream, id) {
    otherVideo = stream;
    //otherVideo.id and id are the same and unique identifier
}

function draw() {
    if (startVideo && myVideo != null) {
        image(myVideo, 10, 10,width - 20,height);
        text("My Video", 10, 10);
    }

    if (watchVideo && otherVideo != null) {
        image(otherVideo,10, 10,width - 20,height);
        text("Their Video", width/2+10, 10);
    }
}

// Render returned segmentation data to a given canvas context.
function processSegmentation(canvas, segmentation) {
    console.log('into processing');

    var ctx = canvas.getContext('2d');
    // Get data from our overlay canvas which is attempting to estimate background.
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;

    // Get data from the live webcam view which has all data.
    var liveData = videoRenderCanvasCtx.getImageData(0, 0, canvas.width, canvas.height);
    var dataL = liveData.data;

    var minX = 100000;
    var minY = 100000;
    var maxX = 0;
    var maxY = 0;

    var foundBody = false;

    // Go through pixels and figure out bounding box of body pixels.
    for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
            let n = y * canvas.width + x;
            // Human pixel found. Update bounds.
            if (segmentation.data[n] !== 0) {
                if(x < minX) {
                    minX = x;
                }

                if(y < minY) {
                    minY = y;
                }

                if(x > maxX) {
                    maxX = x;
                }

                if(y > maxY) {
                    maxY = y;
                }
                foundBody = true;
            }
        }
    }

    // Calculate dimensions of bounding box.
    var width = maxX - minX;
    var height = maxY - minY;

    // Define scale factor to use to allow for false negatives around this region.
    var scale = 1.3;

    //  Define scaled dimensions.
    var newWidth = width * scale;
    var newHeight = height * scale;

    // Caculate the offset to place new bounding box so scaled from center of current bounding box.
    var offsetX = (newWidth - width) / 2;
    var offsetY = (newHeight - height) / 2;

    var newXMin = minX - offsetX;
    var newYMin = minY - offsetY;


    // Now loop through update backgound understanding with new data
    // if not inside a bounding box.
    for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
            // If outside bounding box and we found a body, update background of body.
            if (foundBody && (x < newXMin || x > newXMin + newWidth) || ( y < newYMin || y > newYMin + newHeight)) {
                // Convert xy co-ords to array offset.
                let n = y * canvas.width + x;

                data[n * 4] = dataL[n * 4];
                data[n * 4 + 1] = dataL[n * 4 + 1];
                data[n * 4 + 2] = dataL[n * 4 + 2];
                data[n * 4 + 3] = 255;

            } else if (!foundBody) {
                // No body found at all, update all pixels.
                let n = y * canvas.width + x;
                data[n * 4] = dataL[n * 4];
                data[n * 4 + 1] = dataL[n * 4 + 1];
                data[n * 4 + 2] = dataL[n * 4 + 2];
                data[n * 4 + 3] = 255;
            }
        }
    }

    ctx.putImageData(imageData , 0, 0);
}

function predictWebcam() {
    if (previousSegmentationComplete && watchVideo) {
        // Copy the video frame from webcam to a tempory canvas in memory only (not in the DOM).
        videoRenderCanvasCtx.drawImage(video, 0, 0);
        previousSegmentationComplete = false;
        if (model.segmentPerson) {
            // Now classify the canvas image we have available.
            model.segmentPerson(videoRenderCanvas, segmentationProperties).then(function (segmentation) {
                processSegmentation(webcamCanvas, segmentation);
                previousSegmentationComplete = true;
            });
    }
    }

    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
}

// Enable the live webcam view and start classification.
function enableCam() {
    if (!modelHasLoaded) {
        return;
    }


}


