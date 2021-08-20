document.addEventListener("DOMContentLoaded", function() {
    const label_icon_template = $("#label-icon-template").html();
    $(".label-question, .label-note").each(function() {
        const label_icon = $(label_icon_template);
        if ($(this).hasClass("label-question")) {
            label_icon.find(".label-icon").attr("src", "/static/images/status-icons/question-mark.png");
        } else if ($(this).hasClass("label-note")) {
            label_icon.find(".label-icon").attr("src", "/static/images/status-icons/exclamation-mark.png");
        }
        $(this).append(label_icon);
    });
});