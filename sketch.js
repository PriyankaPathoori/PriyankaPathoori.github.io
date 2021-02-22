function setup() {
    createCanvas(100, 100);

    video = createCapture(VIDEO);
    video.size(200, 200);
}

function draw() {
    image(video, 0, 0);
    // background(220);
}