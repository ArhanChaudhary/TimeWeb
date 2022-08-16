function getFirstSectionMid() {
    return $(".section-block#first").height() / 2 + 10;
}
function setMoveLefts() {
    const section_mid = getFirstSectionMid();
    $(".assignment-scroller-image").each(function() {
        if ($(this).offset().top + $(this).height() > 0 && $(this).offset().top < $("#second").offset().top) {
            const mid = $(this).offset().top + $(this).height() / 2;
            const scaled_factor = Math.abs(section_mid - mid) / section_mid - 1;
            this.parentElement.style.setProperty("--move-left", Math.min(0, scaled_factor * 90) + "px");
            // $(this).css("margin-left", factor * 10);
        } else {
            this.parentElement.style.setProperty("--move-left", "0px");
        }
    });
}
function scrollDown() {
    if ($("#second")[0].getBoundingClientRect().y < 0) return;

    const most_left = $(".assignment-scroller-image-extender").toArray().reduce((prev, current) => parseFloat(window.getComputedStyle(current).getPropertyValue("--move-left")) < parseFloat(window.getComputedStyle(prev).getPropertyValue("--move-left")) ? current : prev);
    const mid = $(most_left).offset().top + $(most_left).height() / 2;

    let move_up = $(most_left).find(".assignment-scroller-image").outerHeight(true);
    // correction (centering the image)
    move_up += mid - getFirstSectionMid();
    setTimeout(() => {
        $(".assignment-scroller-image-extender").each(function() {
            $(this).toggleClass("hover", $(this).prev().is(most_left));
        });
    }, 200);
    $(".section-block#first .right-section-side").animate({
        textIndent: "-=" + move_up,
    }, {
        duration: 500,
        step: function(now) {
            this.style.setProperty("--move-up", now + "px");
            setMoveLefts();
        },
        complete: function() {
            const last = $(".assignment-scroller-image-extender").last();
            if (last.offset().top + last.height() < $(".section-block#first").offset().top + $(".section-block#first").height()) {
                $(this).css("text-indent", "0px");
                this.style.setProperty("--move-up", "0px");
                setMoveLefts();
            }
        }
    });
}
$(window).one("load", function() {
    setMoveLefts();
    scrollDown();
    setInterval(scrollDown, 2000);
});
let turns = 0;
let turn_mod = window.getComputedStyle($("#hour-hand")[0]).getPropertyValue("--turns-per-turn");
$(window).scroll(function() {
    $("#favicon-animated").prop("style").setProperty("--turns", turns);
    turns += 0.05;
    turns %= turn_mod;
});