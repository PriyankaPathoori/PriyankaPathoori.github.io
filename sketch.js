let myVideo = null;

function setup() {
    createCanvas(400,400);

    button = createButton('start', [50]);
    button.position(19, 19);
    button.mousePressed(changeBG);

    button1 = createButton('watch', [50]);
    button1.position(89, 19);
    button1.mousePressed(changeBG1);

    let constraints = {audio: true, video: true};
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
        image(myVideo,0,0,width/2,height);
        text("My Video", 10, 10);
    }

    if (watchVideo && otherVideo != null) {
        image(otherVideo,width/2,0,width/2,height);
        text("Their Video", width/2+10, 10);
    }
}