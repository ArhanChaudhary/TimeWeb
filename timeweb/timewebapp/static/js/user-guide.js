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
    $(".major-category").reverse().each(function(index) {
        const $major_category = $(this);
        $major_category.attr("id", `major-${index+1}`);

        const major_category_li = $(table_of_contents_major_category_template);
        major_category_li.find("a").attr("href", `#${$major_category.attr("id")}`).text($major_category.text());

        $major_category.siblings().each(function(index) {
            const $minor_category = $(this).find(".minor-category");
            $minor_category.attr("id", `${$major_category.attr("id")}-minor-${index+1}`);

            const minor_category_li = $(table_of_contents_minor_category_template);
            minor_category_li.find("a").attr("href", `#${$minor_category.attr("id")}`).text($minor_category.text());
            major_category_li.find("ul").append(minor_category_li);
        });
        $("#table-of-contents-container #category-table-of-contents").after(major_category_li);
    });

    $(".label-question").reverse().each(function(index) {
        const $label_question = $(this);
        $label_question.attr("id", `question-${index+1}`);

        const minor_category_li = $(table_of_contents_minor_category_template);
        minor_category_li.find("a").attr("href", `#${$label_question.attr("id")}`).text($label_question.find(".label-title").text());

        $("#table-of-contents-container #category-user-guide-labels").append(minor_category_li);
    });

    (".label-note").reverse().each(function(index) {
        const $label_note = $(this);
        $label_note.attr("id", `note-${index+1}`);

        const minor_category_li = $(table_of_contents_minor_category_template);
        minor_category_li.find("a").attr("href", `#${$label_note.attr("id")}`).text($label_note.find(".label-title").text());

        $("#table-of-contents-container #category-user-guide-notes").append(minor_category_li);
    });
});