(function() {
    var canvas = document.getElementById("canv");
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
            ctx.strokeStyle = "crimson";
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
