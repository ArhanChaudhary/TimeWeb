document.addEventListener("DOMContentLoaded", function() {
    const href_scroll_margin = 75;
    $(".label-question").each(function() {
        $(this).append($($("#label-icon-template").html()));
    });

    $(".major-category").reverse().each(function() {
        const $major_category = $(this);
        const major_category_li = $($("#table-of-contents-major-category-template").html());
        let minor_categories = $major_category.siblings("details");

        if ($major_category.hasClass("dont-create-dropdown")) {
            const $major_category_href_element = $major_category.siblings().filter(function() {
                return !!$(this).attr("id");
            }).first();
            const minor_category_li = $($("#table-of-contents-minor-category-template").html());
            minor_category_li.find("a").attr("href", `#${$major_category_href_element.attr("id")}`).text($major_category.text());
            $major_category_href_element.css("scroll-margin-top", href_scroll_margin);
            $("#table-of-contents-container #category-table-of-contents").after(minor_category_li);
        } else {
            if (!minor_categories.length)
                minor_categories = minor_categories.add($major_category);
            major_category_li.find("span").text($major_category.text());

            minor_categories.each(function() {
                let $minor_category = $(this).find(".minor-category");
                let $minor_category_href_element = $minor_category;
                if (!$minor_category.length) {
                    $minor_category = $minor_category.add($major_category);
                    $minor_category_href_element = $minor_category.siblings().filter(function() {
                        return !!$(this).attr("id");
                    }).first();
                }
                $minor_category_href_element.css("scroll-margin-top", href_scroll_margin);

                const minor_category_li = $($("#table-of-contents-minor-category-template").html());
                minor_category_li.find("a").attr("href", `#${$minor_category_href_element.attr("id")}`)
                    .text($minor_category.text())
                major_category_li.find("ul").append(minor_category_li);
            });
            $("#table-of-contents-container #category-table-of-contents").after(major_category_li);
        }
    });

    $("#doc-container").scroll(function() {
        let min;
        $(".major-category").each(function() {
            const top = $(this).position().top;
            if (min === undefined || top < min)
                min = top;
        });
        $(".major-category").each(function() {
            $(this).toggleClass("isSticky", $(this).position().top === min);
        });
        $(".major-category.isSticky").last().removeClass("isSticky");
    });

    $(".label-question").each(function() {
        const $label_question = $(this);

        const minor_category_li = $($("#table-of-contents-minor-category-template").html());
        minor_category_li.find("a").attr("href", `#${$label_question.attr("id")}`)
            .text($label_question.find(".label-title").text());
        $label_question.css("scroll-margin-top", href_scroll_margin);

        $("#table-of-contents-container #category-doc-labels").append(minor_category_li);
    });

    $("details > img").each(function() {
        if (!$(this).parents(".label-icon-container").length)
        $(this).wrap("<div class=\"img-ignore-padding-container\">");
    });
});