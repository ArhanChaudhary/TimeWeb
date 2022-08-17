function scalingFunction(x) {
    // these numbers were not chosen randomly! https://www.desmos.com/calculator/sxvbuzk0ps
    if (x < 0.02) return x * 5 + 0.1;
    return Math.sqrt(1 - Math.pow((x - 1) / 1, 2));
}
function clamp(low, value, high) {
    return Math.min(Math.max(value, low), high)
}
scaled_horizontal_factor = 0;
function setMoveLefts() {
    const section_mid = $(".section-block#first").height() / 2;
    $(".assignment-scroller-image").each(function() {
        if ($(this).offset().top + $(this).height() > 0 && $(this).offset().top < $("#second").offset().top) {
            const mid = $(this).offset().top + $(this).height() / 2;
            let linear_factor = 1 - Math.abs(section_mid - mid) / section_mid;
            if (linear_factor < 0.5) {
                var opacity = linear_factor * 1.2 + 0.3;
            } else {
                var opacity = 1;
            }
            $(this).css("opacity", opacity);
            const scaled_factor = -scalingFunction(linear_factor);
            this.parentElement.style.setProperty("--move-left", scaled_factor * scaled_horizontal_factor - 200 + "px");
        } else {
            this.parentElement.style.setProperty("--move-left", "0px");
        }
    });
}
$(window).one("load", function() {

    const last = $(".assignment-scroller-image-extender").last();
    const container = $(".section-block#first .right-section-side").prop("style");
    setMoveLefts();
    $(".section-block#first .right-section-side").addClass("animate");
    let now = 0;
    let diff = 7;
    let diff_diff = 0.07;
    let scaled_horizontal_factor_diff = 4.6;
    a = new Date();
    setInterval(() => {
        container.setProperty("--move-up", now + "px");
        setMoveLefts();
        now -= diff;
        if (diff > 1.5) {
            diff -= diff_diff;
            diff_diff -= 0.0003;
        }
        if (scaled_horizontal_factor < 150) {
            scaled_horizontal_factor += scaled_horizontal_factor_diff;
            if (scaled_horizontal_factor_diff > 0.2)
                scaled_horizontal_factor_diff -= 0.08;
        }
        if (last.offset().top + last.height() < $(".section-block#first").offset().top + $(".section-block#first").height()) {
            now = 0;
        }
    }, 30);
    turn_mod = window.getComputedStyle($("#hour-hand")[0]).getPropertyValue("--turns-per-turn");
});
let turns = 0;
$(window).scroll(function() {
    $("#favicon-animated").prop("style").setProperty("--turns", turns);
    turns += 0.05;
    turns %= turn_mod;
});