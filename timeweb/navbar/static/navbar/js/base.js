document.addEventListener("DOMContentLoaded", function() {
    const href_scroll_margin = 75;
    $(".label-question").each(function() {
        $(this).append($($("#label-icon-template").html()));
    });

    $(".major-category").reverse().each(function() {
        const major_category = $(this);
        const major_category_dropdown = $($("#table-of-contents-major-category-template").html());
        let minor_categories = major_category.siblings(".minor-category");

        if (major_category.hasClass("dont-create-dropdown")) {
            const major_category_href_element = major_category.siblings().filter(function() {
                return !!$(this).attr("id");
            }).first();
            const minor_category_li = $($("#table-of-contents-minor-category-template").html());
            minor_category_li.find("a").attr("href", `#${major_category_href_element.attr("id")}`).text(major_category.text());
            major_category_href_element.css("scroll-margin-top", href_scroll_margin);
            $("#table-of-contents-container #category-table-of-contents").after(minor_category_li);
        } else if (!minor_categories.length) {
            major_category_dropdown.find("span").text(major_category.text());
            const minor_category_href_element = major_category.siblings().filter(function() {
                return !!$(this).attr("id");
            }).first();
            minor_category_href_element.css("scroll-margin-top", href_scroll_margin);

            const minor_category_li = $($("#table-of-contents-minor-category-template").html());
            minor_category_li.find("a").attr("href", `#${minor_category_href_element.attr("id")}`)
                .text(major_category.text())
            major_category_dropdown.find("ul").append(minor_category_li);
            $("#table-of-contents-container #category-table-of-contents").after(major_category_dropdown);
        } else {
            major_category_dropdown.find("span").text(major_category.text());
            minor_categories.each(function() {
                $(this).css("scroll-margin-top", href_scroll_margin);
                const minor_category_li = $($("#table-of-contents-minor-category-template").html());
                minor_category_li.find("a").attr("href", `#${$(this).attr("id")}`)
                    .text($(this).text())
                major_category_dropdown.find("ul").append(minor_category_li);
            });
            $("#table-of-contents-container #category-table-of-contents").after(major_category_dropdown);
        }
    });
    $(".minor-minor-category[id]").css("scroll-margin-top", href_scroll_margin);
    $("#table-of-contents-container").click(function(e) {
        if ($(e.target).is("a"))
            $("#table-of-contents-container").removeClass("active");
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
        const label_question = $(this);

        const minor_category_li = $($("#table-of-contents-minor-category-template").html());
        minor_category_li.find("a").attr("href", `#${label_question.attr("id")}`)
            .text(label_question.find(".label-title").text());
        label_question.css("scroll-margin-top", href_scroll_margin);

        $("#table-of-contents-container #category-important-labels ~ ul").append(minor_category_li);
    });

    $(".major-category ~ * img, .major-category ~ img").each(function() {
        if ($(this).parents(".label-icon-container").length) return;
        if ($(this).parent().is("picture"))
            $(this).parent().wrap("<div class=\"img-positioner\">");
        else
            $(this).wrap("<div class=\"img-positioner\">");
    });
});
$(window).one("load", function() {
    const scroll_position = sessionStorage.getItem("navbar_scroll");
    if (!scroll_position) return;
    $("#doc-container").scrollTop(scroll_position);
    sessionStorage.removeItem("navbar_scroll");
});
window.addEventListener("beforeunload", function() {
    sessionStorage.setItem("navbar_scroll", $("#doc-container").scrollTop());
});