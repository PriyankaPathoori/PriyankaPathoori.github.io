let myVideo = null;

function setup() {
    createCanvas(windowWidth, windowHeight);

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
}
let startVideo = false;
function changeBG() {
    startVideo = true;
}
let watchVideo = false;
function changeBG1() {
    watchVideo = true;
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
