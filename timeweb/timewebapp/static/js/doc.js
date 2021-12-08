document.addEventListener("DOMContentLoaded", function() {
    const LABEL_ICON_TEMPLATE = $("#label-icon-template").html();
    $(".label-question").each(function() {
        $(this).append($(LABEL_ICON_TEMPLATE));
    });
    const TABLE_OF_CONTENTS_MAJOR_CATEGORY_TEMPLATE = $("#table-of-contents-major-category-template").html();
    const TABLE_OF_CONTENTS_MINOR_CATEGORY_TEMPLATE = $("#table-of-contents-minor-category-template").html();
    // https://stackoverflow.com/questions/16302483/event-to-detect-when-positionsticky-is-triggered
    const observer = new IntersectionObserver( 
        ([e]) => {
            $(".ignoreSticky").removeClass("ignoreSticky");
            $(e.target).toggleClass('isSticky', e.intersectionRatio < 1).addClass('ignoreSticky');
        },
        {threshold: [1]}
    );

    const number_major_categories = $(".major-category").length;
    $(".major-category").reverse().each(function() {
        const $major_category = $(this);
        $major_category.attr("number-major-categories", number_major_categories);

        const major_category_li = $(TABLE_OF_CONTENTS_MAJOR_CATEGORY_TEMPLATE);
        let minor_categories = $major_category.siblings("details");
        if ($major_category.attr("id"))
            minor_categories = minor_categories.add($major_category);
        //     major_category_li.find("a").attr("href", `#${$major_category.attr("id")}`);
        //     major_category_li.find("a").text($major_category.text());
        // } else {
        //     major_category_li.find("a").remove();
            major_category_li.find("span").text($major_category.text());
        // }
        

        minor_categories.each(function() {
            let $minor_category = $(this).find(".minor-category");
            if (!$minor_category.length)
                $minor_category = $minor_category.add($major_category);

            const minor_category_li = $(TABLE_OF_CONTENTS_MINOR_CATEGORY_TEMPLATE);
            minor_category_li.find("a").attr("href", `#${$minor_category.attr("id")}`).text($minor_category.text());
            major_category_li.find("ul").append(minor_category_li);
        });
        $("#table-of-contents-container #category-table-of-contents").after(major_category_li);
        observer.observe($major_category[0]);
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