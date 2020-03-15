// A js file to load on petition page
// allows users to draw their signature
// puts the data url from the canvas into the value of a hidden form field
(function() {
    var canvas = document.getElementById("canv"); /////////////zasto ovo ne funkcionira s jquery?? ako sve bude radilo u vanilla js probati prebaciti u jquery
    var ctx = canvas.getContext("2d");

    var startPos = {
        x: 0,
        y: 0
    };
    /////////////ove funkcije ispod mozda promijeniti u promises umjesto callbacka - ako je moguce????
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mousedown", startPosition);
    canvas.addEventListener("mouseenter", startPosition);

    function startPosition(e) {
        startPos.x = e.clientX - canvas.offsetLeft;
        startPos.y = e.clientY - canvas.offsetTop;
    }

    function draw(e) {
        if (e.buttons !== 1) {
            return;
        } else {
            ctx.beginPath();
            ctx.strokeStyle = "violet";
            ctx.lineWidth = 2;

            ctx.moveTo(startPos.x, startPos.y);
            startPosition(e);
            ctx.lineTo(startPos.x, startPos.y);
            ctx.stroke();
        }
    }

    var canvInput = document.getElementById("canv-input");
    var canvasInput = "";

    canvas.addEventListener("mouseup", function() {
        canvInput.value = canvas.toDataURL();
        canvasInput += canvInput.value;
        return canvasInput;
    });
    console.log(canvasInput);
})();
