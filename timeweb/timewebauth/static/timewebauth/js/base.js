$(function() {
    $("input[id*='password']").each(function() {
        $(this).wrap("<div class=\"password-field-container\"></div>");
        if ($(this).hasClass("add-input-margin")) {
            $(this).parent().addClass("add-input-margin");
            $(this).removeClass("add-input-margin");
        }
        $(this).after($($("#password-widget-icons").html()));
    });
    $(".password-image").click(function() {
        $(".password-image").toggle();
        $("input[id*='password']").attr("type") === "text" ? $("input[id*='password']").attr("type", "password") : $("input[id*='password']").attr("type", "text");
    });
});

$(window).one("load", function() {
    function shuffle(o) {
        for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };

    $("#form-wrapper form").submit(function() {
        $(".submit-button").attr("disabled", true);
    });

    let number_of_circles = $("#circles-background .bubble-up").length;
    $("#circles-background").css("--highest-circle-number", number_of_circles - 1);

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
        r: 41,
        g: 81,
        b: 97,
    };

    $("#circles-background .bubble-up").each(function(i) {
        let background_gradient_factor = 1 - i / (number_of_circles - 1);
        $(this).find(".bubble-right").css("background", `rgb(${front_color.r + background_gradient_factor * (back_color.r - front_color.r)}, ${front_color.g + background_gradient_factor * (back_color.g - front_color.g)}, ${front_color.b + background_gradient_factor * (back_color.b - front_color.b)})`);
        this.style.setProperty("--circle-number", i);
        this.style.setProperty("--random-delay", `${Math.floor(Math.random()*11-5)}s`);
        this.style.setProperty("--random-x", `${Math.random()*6+5}vw`);
        this.style.setProperty("--x", `calc(${vws[i]-100}% + ${vws[i]}vw)`);
    });

    if (sessionStorage.getItem("low-detail-mode")) {
        $("#circles-background").css("filter", "none");
    } else {
        $("#circles-background .bubble-right").first().on("animationstart", function() {
            var get_frames = true;
            var judgement_time = 250;
            var framerate_threshold = 55;
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
    const stretch = 5;
    const bezier_diff = 3;
    const fps = 60;

    const iter_percent = 1 - Math.exp(-1 / stretch);
    const original_bezier = parseBezier($("#circles-background .bubble-right").css("--original-animation-timing-function").trim());
    const right_bezier = [...original_bezier];
    right_bezier[1] -= bezier_diff;
    right_bezier[3] += bezier_diff;
    // const left_bezier = [...original_bezier];
    // left_bezier[1] += bezier_diff;
    // left_bezier[3] -= bezier_diff;
    const current_beziers = new Array(number_of_circles).fill(original_bezier);

    let fpsInterval = 1000 / fps;
    let then = performance.now();
    $("#circles-background").on("mousemove", function(e) {
        const now = performance.now();
        const elapsed = now - then;
        if (elapsed <= fpsInterval) return;
        then = now - (elapsed % fpsInterval);

        const mouse_x = e.pageX;
        const direction = "right";
        $("#circles-background .bubble-right").each(function(i) {
            const rect = this.getBoundingClientRect();
            const circle_width = rect.width;
            const circle_x = rect.x
            const circle_avg_x = circle_x + circle_width / 2;

            const current_bezier = current_beziers[i];

            let abs_diff = Math.abs(circle_avg_x - mouse_x);
            let diff_percent = diffSmoothingFunction(abs_diff / window.innerWidth);
            
            let new_bezier;
            if (direction === "right")
                new_bezier = right_bezier;
            else if (direction === "left")
                new_bezier = left_bezier;
            new_bezier = new_bezier.map((x, i) => current_bezier[i] + iter_percent * (original_bezier[i] + diff_percent * (x - original_bezier[i]) - current_bezier[i]));
            // check if new bezier is different from old bezier
            if (new_bezier.some((x, i) => Math.abs(x - current_bezier[i]) > 0.001)) {
                current_beziers[i] = new_bezier;
                $(this).css("animation-timing-function", constructBezier(new_bezier));
            }
        });
    });

    // requestAnimationFrame(mousePositionStep);
    // function mousePositionStep() {
    //     requestAnimationFrame(mousePositionStep);
    //     const now = performance.now();
    //     const elapsed = now - then;
    //     if (elapsed <= fpsInterval) return;
    //     then = now - (elapsed % fpsInterval);

        
    // }
});
function diffSmoothingFunction(x) {
    return 1.1 / (1 + 19 * Math.exp(26.4 * (x - 0.2)));
}
function parseBezier(bezier) {
    return bezier.slice(13, bezier.length - 1).split(",").map(Number);
}
function constructBezier(bezier) {
    return `cubic-bezier(${bezier[0]}, ${bezier[1]}, ${bezier[2]}, ${bezier[3]})`;
}