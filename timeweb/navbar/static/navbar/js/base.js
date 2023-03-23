document.addEventListener("DOMContentLoaded", function() {
    const href_scroll_margin = 75;
    $(".label-question").each(function() {
        $(this).append($($("#label-icon-template").html()));
    });

    let add_expand_all = false;
    $(".major-category").reverse().each(function() {
        const major_category = $(this);
        let major_category_dropdown = $($("#table-of-contents-major-category-template").html());

        const minor_categories = major_category.siblings(".minor-category");

        if (major_category.hasClass("dont-create-dropdown")) {
            const major_category_href_element = major_category.siblings().filter(function() {
                return !!$(this).attr("id");
            }).first();
            const minor_category_li = $($("#table-of-contents-minor-category-template").html());

            minor_category_li.attr("href", `#${major_category_href_element.attr("id")}`)
                .children().text(major_category.text());
            major_category_href_element.css("scroll-margin-top", href_scroll_margin);

            $("#table-of-contents-container #category-table-of-contents").after(minor_category_li);
        } else if (!minor_categories.length) {
            major_category_dropdown.find("summary").text(major_category.text());

            const minor_category_href_element = major_category.siblings().filter(function() {
                return !!$(this).attr("id");
            }).first();
            minor_category_href_element.css("scroll-margin-top", href_scroll_margin);

            const minor_category_li = $($("#table-of-contents-minor-category-template").html());
            minor_category_li.attr("href", `#${minor_category_href_element.attr("id")}`)
                .children().text(major_category.text())
            major_category_dropdown.find("ul").append(minor_category_li);

            add_expand_all = true;
            $("#table-of-contents-container #category-table-of-contents").after(major_category_dropdown);
        } else {
            major_category_dropdown.find("summary").text(major_category.text());
            major_category_dropdown.attr("data-wrap-around-how-to", major_category.attr("data-wrap-around-how-to"));

            minor_categories.each(function() {
                $(this).css("scroll-margin-top", href_scroll_margin);
                const minor_category_li = $($("#table-of-contents-minor-category-template").html());
                minor_category_li.attr("href", `#${$(this).attr("id")}`)
                    .children().text($(this).text())
                major_category_dropdown.find("ul").append(minor_category_li);
            });

            add_expand_all = true;
            $("#table-of-contents-container #category-table-of-contents").after(major_category_dropdown);
        }

        const faq_category_dropdown = $($("#table-of-contents-major-category-template").html());
        faq_category_dropdown.find("summary").text(major_category.text());

        const faqs = major_category.siblings(".label-question");
        if (!faqs.length) return;

        faqs.each(function() {
            const faq = $(this);
            faq.css("scroll-margin-top", href_scroll_margin);

            const faq_li = $($("#table-of-contents-minor-category-template").html());
            faq_li.attr("href", `#${faq.attr("id")}`)
                .children().text(faq.find(".label-title").text());

            faq_category_dropdown.find("ul").append(faq_li);
        });

        add_expand_all = true;
        $("#table-of-contents-container #category-important-labels").after(faq_category_dropdown);
    });
    {
        const major_category_dropdown = $("<details>");
        major_category_dropdown.addClass("table-of-contents-item");
        major_category_dropdown.attr("id", "how-to-wrapper");

        $("#table-of-contents-container details.table-of-contents-item[data-wrap-around-how-to]").wrapAll(major_category_dropdown);
        $("<summary>").text("How to").prependTo($("#how-to-wrapper"));
    }

    {
        const last_faq = $(".label-question").last().filter(function() {
            return $(this).hasClass("add-to-end");
        });
        if (last_faq.length) {
            const faq_li = $($("#table-of-contents-minor-category-template").html());
            faq_li.addClass("table-of-contents-header")
                .attr("href", `#${last_faq.attr("id")}`)
                .html(last_faq.find(".label-title").text());
            $("#table-of-contents-container").append(faq_li);
        }
    }
    if (add_expand_all) {
        const expand_all_button = $("<a>");
        expand_all_button.attr("href", "#")
            .addClass("expand-all-button")
            .html("Expand all");
        expand_all_button.click(function(e) {
            e.preventDefault();
            if (expand_all_button.html() === "Expand all") {
                $("#table-of-contents-container details.table-of-contents-item").prop("open", true);
                expand_all_button.html("Collapse all");
            } else {
                $("#table-of-contents-container details.table-of-contents-item").prop("open", false);
                expand_all_button.html("Expand all");
            }
        });
        $("#table-of-contents-container").append(expand_all_button);
    }

    $(".minor-minor-category[id]").css("scroll-margin-top", href_scroll_margin);
    $("#table-of-contents-container").click(function(e) {
        const a = $(e.target).closest("a").filter(function() {
            return $(this).attr("href") !== "#";
        });
        if (a.length)
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