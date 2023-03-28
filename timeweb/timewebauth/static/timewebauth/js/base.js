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
        r: 55,
        g: 161,
        b: 164
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
    if (isTouchDevice) return;
    const stretch = 5;
    const min_bezier_diff = 4;
    const max_bezier_diff = 7;
    const precision = 0.001;
    
    const bubble_rights = Array.from(document.querySelectorAll("#circles-background .bubble-right"));
    const original_bezier = parseBezier($("#circles-background .bubble-right").css("--original-animation-timing-function"));
    let bezier_diff = min_bezier_diff;
    let right_bezier = [original_bezier[0] - bezier_diff, original_bezier[1] + bezier_diff];
    $(window).on("resize", function() {
        const slope = (max_bezier_diff - min_bezier_diff)/(515 - 1440);
        bezier_diff = slope * window.innerWidth + (min_bezier_diff - slope * 1440);
        bezier_diff = Math.round(bezier_diff / precision) * precision;
        right_bezier = [original_bezier[0] - bezier_diff, original_bezier[1] + bezier_diff];
    });
    const iter_percent = 1 - Math.exp(-1 / stretch);
    // const left_bezier = [original_bezier[0] + bezier_diff, original_bezier[1] - bezier_diff];
    const current_beziers = new Array(number_of_circles).fill(original_bezier);

    const step = function() {
        // Failed optimization attempt #1:
        // const c1 = window.innerWidth * 0.05 + 40;
        // const c2 = (window.innerWidth * 0.042 + 25) / number_of_circles;
        // const centers = bubble_rights.map((bubble_right, i) => {
        //     const matrix = window.getComputedStyle(bubble_right).transform;
        //     const translateX = +matrix.slice(19, matrix.length - 4);
        //     const width = c1 - i * c2;
        //     return translateX + width / 2;
        // });

        // Failed optimization attempt #2:
        // const observer = new IntersectionObserver(entries => {
        let changed = false;
        const rects = bubble_rights.map(i => i.getBoundingClientRect());
        for (let i = 0; i < number_of_circles; i++) {
            // const rect = entries[i].boundingClientRect;
            const rect = rects[i];
            const current_bezier = current_beziers[i];
            // https://www.desmos.com/calculator/bc7khdfh8l
            const diff_percent = 1.1 / (1 + 19 * Math.exp(26.4 * (Math.abs(rect.x + rect.width / 2 - mouse_x) / window.innerWidth - 0.2)));
            
            const next_bezier = [
                current_bezier[0] + iter_percent * (original_bezier[0] + diff_percent * (right_bezier[0] - original_bezier[0]) - current_bezier[0]),
                current_bezier[1] + iter_percent * (original_bezier[1] + diff_percent * (right_bezier[1] - original_bezier[1]) - current_bezier[1])
            ]
            if (Math.round(next_bezier[0] / precision) !== Math.round(current_bezier[0] / precision) || Math.round(next_bezier[1] / precision) !== Math.round(current_bezier[1] / precision)) {
                bubble_rights[i].style.animationTimingFunction = "cubic-bezier(0.5," + Math.round(next_bezier[0] / precision) * precision + ",0.5," + Math.round(next_bezier[1] / precision) * precision + ")";
                changed = true;
            }
            current_beziers[i] = next_bezier;
        }
        // observer.disconnect();
        // });
        // for (const element of bubble_rights) {
        //     observer.observe(element);
        // }
        if (changed) {
            requestAnimationFrame(step);
        } else {
            mouse_x = undefined;
        }
    }
    function parseBezier(bezier) {
        const raw = bezier.split("(")[1].split(")")[0].split(", ").map(i => Math.round(parseFloat(i) / precision) * precision);
        return [raw[1], raw[3]];
    }

    let mouse_x;
    $("#circles-background").on("mousemove", function(e) {
        if (mouse_x === undefined)
            requestAnimationFrame(step);
        mouse_x = e.pageX;
    }).on("mouseleave", function() {
        mouse_x = Infinity;
    });
});