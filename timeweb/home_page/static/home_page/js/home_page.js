function scalingFunction(x) {
    // these numbers were not chosen randomly! https://www.desmos.com/calculator/sxvbuzk0ps
    if (x < 0.02) return x * 5 + 0.1;
    return Math.sqrt(1 - Math.pow((x - 1) / 1, 2));
}
function clamp(low, value, high) {
    return Math.min(Math.max(value, low), high)
}
function setMoveLefts() {
    const section_mid = $(".section-block#first").height() / 2;
    $(".assignment-scroller-image").each(function() {
        if ($(this).offset().top + $(this).height() > 0 && $(this).offset().top < $("#second").offset().top) {
            const mid = $(this).offset().top + $(this).height() / 2;
            let linear_factor = 1 - Math.abs(section_mid - mid) / section_mid;
            const scaled_factor = -scalingFunction(linear_factor);
            this.parentElement.style.setProperty("--move-left", scaled_factor * 150 - 100 + "px");
        } else {
            this.parentElement.style.setProperty("--move-left", "0px");
        }
    });
}
$(window).one("load", function() {

    now = 0;
    const last = $(".assignment-scroller-image-extender").last();
    const container = $(".section-block#first .right-section-side").prop("style")
    setInterval(() => {
        container.setProperty("--move-up", now + "px");
        setMoveLefts();
        now -= 1;
        if (last.offset().top + last.height() < $(".section-block#first").offset().top + $(".section-block#first").height()) {
            now = 0;
        }
    }, 20);
    turn_mod = window.getComputedStyle($("#hour-hand")[0]).getPropertyValue("--turns-per-turn");
});
let turns = 0;
$(window).scroll(function() {
    $("#favicon-animated").prop("style").setProperty("--turns", turns);
    turns += 0.05;
    turns %= turn_mod;
});