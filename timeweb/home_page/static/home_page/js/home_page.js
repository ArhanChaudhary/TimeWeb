function getFirstSectionMid() {
    let a = $("#first").height() / 2 + parseFloat($("#first-right").css("border-spacing")) - 40; // pretends like the property is negative
    console.log(a, $("#first").height() / 2);
    return a;
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
    const section_mid = getFirstSectionMid();

    let move_up = $(most_left).find(".assignment-scroller-image").outerHeight(true);
    let org = move_up;
    move_up -= section_mid - mid;
    // move_up += Math.random() * 140 - 70; // this doesnt work as intended completely, work on this
    if (move_up < org /* allow for some leeway */) {
        move_up = org;
    }
    setTimeout(() => {
        $(".assignment-scroller-image-extender").each(function() {
            $(this).toggleClass("hover", $(this).prev().is(most_left));
        });
    }, 200);
    $("#first-right").animate({
        textIndent: "-=" + move_up,
        borderSpacing: (() => {
            if (Math.random() < 0.5) {
                var vertical_offset = Math.random() * 20 - 40
            } else {
                var vertical_offset = Math.random() * 20 + 30
            }
            return vertical_offset + 40;
        })(),
    }, {
        duration: 500,
        step: function(now, e) {
            if (e.prop === "borderSpacing") return;
            this.style.setProperty("--move-up", now + "px");
            setMoveLefts();
        },
        complete: function() {
            const last = $(".assignment-scroller-image-extender").last();
            if (last.offset().top + last.height() < $("#first").offset().top + $("#first").height()) {
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