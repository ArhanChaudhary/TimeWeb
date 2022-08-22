function scalingFunction(x) {
    // these numbers were not chosen randomly! https://www.desmos.com/calculator/sxvbuzk0ps
    if (x < 0.02) return x * 5 + 0.1;
    return Math.sqrt(1 - Math.pow((x - 1) / 1, 2));
}
function clamp(low, value, high) {
    return Math.min(Math.max(value, low), high)
}
scaled_horizontal_factor = 0;
now = 0;
function setMoveLefts() {
    const section_mid = $(".section-block#first").height() / 2 + 85 * isMobile;
    $(".assignment-scroller-image").each(function() {
        let in_view = $(this).offset().top + $(this).height() > 0 && $(this).offset().top < $("#second").offset().top;
        if (!in_view) return;

        let mid = $(this).offset().top + $(this).height() / 2;
        let linear_factor = 1 - Math.abs(section_mid - mid) / ($(".section-block#first").height() / 2 - 175 * isMobile);
        if (linear_factor < 0) {
            var opacity = linear_factor * 3 + 0.3;
        } else if (linear_factor < 0.5) {
            var opacity = linear_factor * 1.4 + 0.3;
        } else {
            var opacity = 1;
        }
        $(this.parentElement).css(opacity < 0 ? {
            opacity: 0,
        } : {
            opacity: opacity,
            "--move-left": `${-scalingFunction(linear_factor) * scaled_horizontal_factor}px`,
        });
    });
}
position_stop = false;
needs_restarting = false;
velocity_scroll_amount = 0;
$(window).one("load", function() {
    const last = $(".assignment-scroller-image-extender").last();
    const container = $(".section-block#first .right-section-side");
    setMoveLefts();
    $(".section-block#first .right-section-side").addClass("animate");
    let diff = 0;
    let diff_diff = 0.07;
    let scaled_horizontal_factor_diff = 4.6;
    step = () => {
        if (position_stop) {
            needs_restarting = true;
            return;
        }
        container.prop("style").setProperty("--move-up", now + "px");
        setMoveLefts();
        now -= diff;
        if (velocity_scroll_amount < 0) {
            now += velocity_scroll_amount;
            velocity_scroll_amount += 0.25;
        }
        if (diff < 1.5) {
            diff += diff_diff;
            diff_diff += 0.0003;
        }
        if (scaled_horizontal_factor < 150) {
            scaled_horizontal_factor += scaled_horizontal_factor_diff;
            if (scaled_horizontal_factor_diff > 0.2)
                scaled_horizontal_factor_diff -= 0.08;
        }
        if (last.offset().top + last.height() < $(".section-block#first").offset().top + $(".section-block#first").height()) {
            container.css("transition", "none");
            now = 0;
            container.prop("style").setProperty("--move-up", now + "px");
            container[0].offsetHeight;
            container.css("transition", "");
        }
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    $(window).trigger("resize");
});
let turns = 0;
$(function() {
    turn_mod = window.getComputedStyle($("#hour-hand")[0]).getPropertyValue("--turns-per-turn");
});
let old_position;
let old_time;
let old_velocity;
$(window).scroll(function(e) {
    const new_position = document.documentElement.scrollTop;
    const new_time = e.originalEvent.timeStamp;
    const new_velocity = (new_position - old_position) / (new_time - old_time);

    // there are cases when, if you scroll really fast, the velocity is still something like -1 because
    // the scroll event can happen right before you reach the top and then again right after when you hit the top,
    // giving the false illusion of a slow velocity
    
    // store the past velocity to fix this
    const min_velocity = Math.min(old_velocity, new_velocity);
    if (new_position === 0 && min_velocity < 0) {
        velocity_scroll_amount += Math.max(-20, min_velocity * 2);
    }

    let first_section_height = $(".section-block#first").height();
    position_stop = new_position >= first_section_height;
    if (new_position < first_section_height && old_position >= first_section_height) {
        position_stop = false;
    }

    if (!position_stop && needs_restarting) {
        needs_restarting = false;
        requestAnimationFrame(step);
    }

    old_position = new_position;
    old_time = new_time;
    old_velocity = new_velocity;

    
    $("#favicon-animated").prop("style").setProperty("--turns", turns);
    turns += 0.05;
    turns %= turn_mod;
});
let old_window_width = window.innerWidth;
isMobile = false;
$(window).on("resize", function() {
    if (window.innerWidth < 1100) {
        // isMobile = true;
    }
});
