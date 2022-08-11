document.addEventListener("DOMContentLoaded", function() {
    $(".label-question").each(function() {
        $(this).append($($("#label-icon-template").html()));
    });

    $(".major-category").reverse().each(function() {
        const $major_category = $(this);
        const major_category_li = $($("#table-of-contents-major-category-template").html());
        let minor_categories = $major_category.siblings("details");

        if ($major_category.attr("id") && !$major_category.hasClass("create-dropdown")) {
            const minor_category_li = $($("#table-of-contents-minor-category-template").html());
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

                const minor_category_li = $($("#table-of-contents-minor-category-template").html());
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

        const minor_category_li = $($("#table-of-contents-minor-category-template").html());
        minor_category_li.find("a").attr("href", `#${$label_question.attr("id")}`).text($label_question.find(".label-title").text());

        $("#table-of-contents-container #category-doc-labels").append(minor_category_li);
    });

    $("details > img").each(function() {
        if (!$(this).parents(".label-icon-container").length)
        $(this).wrap("<div class=\"img-ignore-padding-container\">");
    });
});