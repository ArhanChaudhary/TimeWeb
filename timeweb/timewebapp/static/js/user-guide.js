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
    const table_of_contents_major_category_template = $("#table-of-contents-major-category-template").html();
    const table_of_contents_minor_category_template = $("#table-of-contents-minor-category-template").html();
    $(".major-category").reverse().each(function() {
        const $major_category = $(this);

        const major_category_li = $(table_of_contents_major_category_template);
        major_category_li.find("a").attr("href", `#${$major_category.attr("id")}`).text($major_category.text());

        $major_category.siblings("details").each(function() {
            const $minor_category = $(this).find(".minor-category");

            const minor_category_li = $(table_of_contents_minor_category_template);
            minor_category_li.find("a").attr("href", `#${$minor_category.attr("id")}`).text($minor_category.text());
            major_category_li.find("ul").append(minor_category_li);
        });
        $("#table-of-contents-container #category-table-of-contents").after(major_category_li);
    });

    $(".label-question").each(function() {
        const $label_question = $(this);

        const minor_category_li = $(table_of_contents_minor_category_template);
        minor_category_li.find("a").attr("href", `#${$label_question.attr("id")}`).text($label_question.find(".label-title").text());

        $("#table-of-contents-container #category-user-guide-labels").append(minor_category_li);
    });

    $(".label-note").each(function() {
        const $label_note = $(this);

        const minor_category_li = $(table_of_contents_minor_category_template);
        minor_category_li.find("a").attr("href", `#${$label_note.attr("id")}`).text($label_note.find(".label-title").text());

        $("#table-of-contents-container #category-user-guide-notes").append(minor_category_li);
    });
});