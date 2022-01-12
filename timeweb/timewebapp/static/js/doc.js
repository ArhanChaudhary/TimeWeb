document.addEventListener("DOMContentLoaded", function() {
    const LABEL_ICON_TEMPLATE = $("#label-icon-template").html();
    $(".label-question").each(function() {
        $(this).append($(LABEL_ICON_TEMPLATE));
    });
    const TABLE_OF_CONTENTS_MAJOR_CATEGORY_TEMPLATE = $("#table-of-contents-major-category-template").html();
    const TABLE_OF_CONTENTS_MINOR_CATEGORY_TEMPLATE = $("#table-of-contents-minor-category-template").html();

    $(".major-category").reverse().each(function() {
        const $major_category = $(this);
        const major_category_li = $(TABLE_OF_CONTENTS_MAJOR_CATEGORY_TEMPLATE);
        let minor_categories = $major_category.siblings("details");

        if ($major_category.attr("id") && !$major_category.hasClass("create-dropdown")) {
            const minor_category_li = $(TABLE_OF_CONTENTS_MINOR_CATEGORY_TEMPLATE);
            minor_category_li.find("a").attr("href", `#${$major_category.attr("id")}`).text($major_category.text());
            $("#table-of-contents-container #category-table-of-contents").after(minor_category_li);
        } else {
            if (!minor_categories.length)
                minor_categories = minor_categories.add($major_category);
            major_category_li.find("span").text($major_category.text());

            minor_categories.each(function() {
                let $minor_category = $(this).find(".minor-category");
                if (!$minor_category.length)
                    $minor_category = $minor_category.add($major_category);

                const minor_category_li = $(TABLE_OF_CONTENTS_MINOR_CATEGORY_TEMPLATE);
                minor_category_li.find("a").attr("href", `#${$minor_category.attr("id")}`).text($minor_category.text());
                major_category_li.find("ul").append(minor_category_li);
            });
            $("#table-of-contents-container #category-table-of-contents").after(major_category_li);
        }
    });

    $("#doc-container").scroll(function() {
        $(".major-category").each(function() {
            $(this).toggleClass("isSticky", $(this).position().top === 0);
        });
        $(".major-category.isSticky").last().removeClass("isSticky");
    });

    $(".label-question").each(function() {
        const $label_question = $(this);

        const minor_category_li = $(TABLE_OF_CONTENTS_MINOR_CATEGORY_TEMPLATE);
        minor_category_li.find("a").attr("href", `#${$label_question.attr("id")}`).text($label_question.find(".label-title").text());

        $("#table-of-contents-container #category-doc-labels").append(minor_category_li);
    });
});
// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}