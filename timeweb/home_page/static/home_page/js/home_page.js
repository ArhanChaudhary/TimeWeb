function getFirstSectionMid() {
    return $("#first").height() / 2 + 50;
}
function setMoveLefts() {
    section_mid = getFirstSectionMid();
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
    console.log(most_left);
    debugger;
    if (window.getComputedStyle(most_left).getPropertyValue("--move-left") ==="0px")debugger;
    const mid = $(most_left).offset().top + $(most_left).height() / 2;
    section_mid = getFirstSectionMid();

    let move_up = $(most_left).find(".assignment-scroller-image").outerHeight(true);
    move_up -= section_mid - mid;
    move_up += (Math.random() * 0.5 + 0.5) * 100 - 50;
    setTimeout(() => {
        if (window.getComputedStyle(most_left).getPropertyValue("--move-left") === "0px") debugger;
        console.log(window.getComputedStyle(most_left).getPropertyValue("--move-left"));
        $(".assignment-scroller-image-extender").each(function() {
            $(this).toggleClass("hover", $(this).prev().is(most_left));
        });
    }, 400);
    $("#first-right").animate({
        textIndent: "-=" + move_up,
    }, {
        duration: 1000,
        step: function(now) {
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
    section_mid = getFirstSectionMid();
    setMoveLefts();
    scrollDown();
    setInterval(scrollDown, 2000);
});