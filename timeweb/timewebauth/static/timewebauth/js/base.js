$(window).one("load", function() {
    function shuffle(o) {
        for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };

    $("#form-wrapper form").submit(function() {
        $("#submit-button").attr("disabled", true);
    });

    let number_of_circles = $("#circles-background .circle").length;
    $("#circles-background").prop("style").setProperty("--highest-circle-number", number_of_circles - 1);

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

    const initial_sin_percentage = -0.5;
    for (let i = 0; i < 1.01; i += 0.01) {
        $("#circles-background").prop("style").setProperty(`--${Math.round(i*100)}`, Math.sin((i + initial_sin_percentage)*Math.PI));
    }
    $("#circles-background .circle").each(function(i) {
        let background_gradient_factor = 1 - i / (number_of_circles - 1);
        $(this).css("background", `rgb(${front_color.r + background_gradient_factor * (back_color.r - front_color.r)}, ${front_color.g + background_gradient_factor * (back_color.g - front_color.g)}, ${front_color.b + background_gradient_factor * (back_color.b - front_color.b)})`);
        this.style.setProperty("--circle-number", i);
        this.style.setProperty("--random-delay", `${Math.floor(Math.random()*11-5)}s`);
        this.style.setProperty("--random-x", `${Math.random()*6+5}vw`);
        this.style.setProperty("--x", `calc(${vws[i]-100}% + ${vws[i]}vw)`);
    });

    if (sessionStorage.getItem("low-detail-mode")) {
        $("#circles-background").css("filter", "none");
    } else {
        $("#circles-background .circle").first().on("animationstart", function() {
            var get_frames = true;
            var judgement_time = 250;
            var framerate_threshold = 45;
            var frames = 0;

            function requestNextFrame() {
                if (!get_frames) return;

                frames++;
                requestAnimationFrame(requestNextFrame);
            }
            requestAnimationFrame(requestNextFrame);
            setTimeout(function() {
                if (frames < framerate_threshold * judgement_time/1000) {
                    console.log(`Low detail mode activated at ${frames/judgement_time*1000} fps`);
                    $("#circles-background").css("filter", "none");
                    sessionStorage.setItem("low-detail-mode", true);
                } else {
                    console.log(`Low detail mode skipped activating at ${frames/judgement_time*1000} fps`);
                }
                get_frames = false;
            }, judgement_time);
        });
    }
});