$(function() {
    function shuffle(o) {
        for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };

    $("#form-wrapper form").submit(function() {
        $("#submit-button").attr("disabled", true);
    });

    let number_of_circles = $("#circles-background .circle").length;
    $("#circles-background")[0].style.setProperty("--highest-circle-number", number_of_circles - 1);

    let vws = new Array(number_of_circles);
    for (let i = 0; i < number_of_circles; i++) {
        vws[i] = Math.floor(i / (number_of_circles - 1) * 96) + 2;
    }
    vws = shuffle(vws);

    let front_color = {
        r: 93,
        g: 198,
        b: 201
    };
    // let back_color = {r: 49, g: 75, b: 110}; (actual bottom color of the logo)
    let back_color = {
        r: 71,
        g: 137,
        b: 156
    };

    $("#circles-background .circle").each(function(i) {
        let background_gradient_factor = 1 - i / (number_of_circles - 1);
        $(this).css("background", `rgb(${front_color.r + background_gradient_factor * (back_color.r - front_color.r)}, ${front_color.g + background_gradient_factor * (back_color.g - front_color.g)}, ${front_color.b + background_gradient_factor * (back_color.b - front_color.b)})`);
        this.style.setProperty("--circle-number", i);
        this.style.setProperty("--random-stagger", `${Math.floor(Math.random()*11-5)}s`);
        this.style.setProperty("--x", `calc(-${100-vws[i]}% + ${vws[i]}vw)`);
    });

    if (localStorage.getItem("low-detail-mode")) {
        $("#circles-background").css("filter", "none");
    } else {
        // Let's wait for a half a second to give the browser some time to adjust
        setTimeout(function() {
            var get_frames = true;
            var judgement_time = 1000;
            var framerate_threshold = 45;
            var frames = 0;

            function requestAnimFrame() {
                if (!get_frames) return;

                frames++;
                requestAnimationFrame(requestAnimFrame);
            }
            requestAnimationFrame(requestAnimFrame);
            setTimeout(function() {
                if (frames < framerate_threshold * judgement_time/1000) {
                    $("#circles-background").css("filter", "none");
                    localStorage.setItem("low-detail-mode", true);
                }
                get_frames = false;
            }, judgement_time);
        }, 500);
    }
});