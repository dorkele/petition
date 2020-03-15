// A js file to load on petition page
// allows users to draw their signature
// puts the data url from the canvas into the value of a hidden form field
(function() {
    var canvas = document.getElementById("canv"); /////////////zasto ovo ne funkcionira s jquery?? ako sve bude radilo u vanilla js probati prebaciti u jquery
    var ctx = canvas.getContext("2d");

    var start = {
        x: 0,
        y: 0
    };

    function startPosition(e) {
        start.x = e.clientX - canvas.offsetLeft;
        start.y = e.clientY - canvas.offsetTop;
    }

    canvas.addEventListener("mousedown", startPosition);

    canvas.addEventListener("mousemove", function draw(e) {
        if (e.buttons !== 1) {
            return;
        } else {
            ctx.beginPath();
            ctx.strokeStyle = "violet";
            ctx.lineWidth = 2;

            ctx.moveTo(start.x, start.y);
            startPosition(e);
            ctx.lineTo(start.x, start.y);
            ctx.stroke();
        }
    });

    var canvInput = document.getElementById("canv-input");

    canvas.addEventListener("mouseup", function() {
        canvInput.value = canvas.toDataURL();
    });
})();
