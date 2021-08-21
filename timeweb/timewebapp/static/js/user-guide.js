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
    $(".major-category").each(function(index) {
        const $major_category = $(this);
        $major_category.attr("id", `major-${index+1}`);
        const major_category_li = $(`<ul><li><a href="#${$major_category.attr("id")}">${$major_category.text()}</a></li><ul></ul></ul>`);
        $major_category.siblings().each(function(index) {
            const $minor_category = $(this).find(".minor-category");
            $minor_category.attr("id", `${$major_category.attr("id")}-minor-${index+1}`);
            major_category_li.find("ul").append(`<li><a href="#${$minor_category.attr("id")}">${$minor_category.text()}</a></li>`);
        });
        $("#table-of-contents-container").append(major_category_li);
    });
});